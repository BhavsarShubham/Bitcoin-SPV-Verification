# Bitcoin SPV Verification on Rootstock - Tutorial

Welcome to the Bitcoin SPV tutorial! This guide walks you through the concepts and implementation of Simplified Payment Verification (SPV) on Rootstock using Solidity.

---

## Table of Contents

1. [Bitcoin Basics](#bitcoin-basics)
2. [Block Structure](#block-structure)
3. [Hashing & Proof of Work](#hashing--proof-of-work)
4. [Merkle Trees & Transaction Verification](#merkle-trees--transaction-verification)
5. [Rootstock Merge-Mining Security](#rootstock-merge-mining-security)
6. [SPV Implementation](#spv-implementation)
7. [Practical Examples](#practical-examples)
8. [Common Pitfalls & Security Considerations](#common-pitfalls--security-considerations)

---

## Bitcoin Basics

Bitcoin is a decentralized ledger where transactions are grouped into **blocks**, and blocks are linked together chronologically using cryptographic hashes. This creates an immutable chain of transactions.

**Key Facts:**
- Bitcoin uses **SHA-256** as its cryptographic hash function
- Bitcoin hashes transactions **twice** (double-SHA256)
- A block is "valid" if it includes a valid Proof-of-Work (difficult computation)
- Blocks are linked by including the hash of the previous block

---

## Block Structure

A Bitcoin **block header** is exactly **80 bytes** and contains:

```
Offset  Size    Field           Description
------  ----    -----           -----------
0       4       version         Protocol version
4       32      prevHash        Hash of previous block
36      32      merkleRoot      Root of transaction Merkle tree
68      4       timestamp       Block creation time (Unix seconds)
72      4       bits            Encoded difficulty target
76      4       nonce           Proof-of-Work value (incremented by miners)
```

**Total: 80 bytes**

### Parsing in Solidity

The `parseHeader()` function in [BitcoinSPV.sol](./contracts/BitcoinSPV.sol) extracts these fields:

```solidity
function parseHeader(bytes memory header) public pure returns (BlockHeader memory) {
    require(header.length == 80, "Invalid header length");
    
    uint32 version = _extractUint32LE(header, 0);       // Little-endian
    bytes32 prevHash = _extractBytes32(header, 4);      // Raw 32 bytes
    bytes32 merkleRoot = _extractBytes32(header, 36);   // Raw 32 bytes
    uint32 timestamp = _extractUint32LE(header, 68);    // Little-endian
    uint32 bits = _extractUint32LE(header, 72);         // Little-endian
    uint32 nonce = _extractUint32LE(header, 76);        // Little-endian
    
    return BlockHeader({...});
}
```

**Key Implementation Detail:** Bitcoin stores some fields in little-endian format, so we extract them with `_extractUint32LE()` to get the correct numeric interpretation.

---

## Hashing & Proof of Work

### Double-SHA256

Bitcoin hashes block headers twice using SHA-256:

```
blockHash = SHA256(SHA256(blockHeader))
```

This is implemented as:

```solidity
function hash256(bytes memory data) public pure returns (bytes32) {
    return sha256(abi.encodePacked(sha256(data)));
}
```

### Proof of Work (PoW)

A block is "valid" if its double-SHA256 hash is **less than or equal to the target**:

```
hash256(blockHeader) ≤ target
```

The **target** is derived from the `bits` field in the header using Bitcoin's difficulty encoding scheme.

### Why PoW is Difficult

To find a valid nonce:
1. Miners repeatedly increment the nonce
2. For each nonce, they hash the block header
3. If the hash ≤ target, they've found a valid block
4. If not, increment nonce and try again

On average, miners must try $2^{target\_bits}$ different nonces. This makes it computationally expensive to create a fake block, but easy to verify it.

### PoW Validation in This Tutorial

```solidity
function checkPoW(bytes memory header, uint256 simplifiedTarget) public pure returns (bool) {
    bytes32 blockHash = hash256(header);
    uint256 blockHashInt = uint256(reverseBytes32(blockHash));
    return blockHashInt <= simplifiedTarget;
}
```

**Important Note:** This simplified implementation accepts the target as a parameter from the caller. This means **anyone could claim MaxUint256 as the target and bypass PoW validation**. In production, the target would be derived from the `bits` field and validated against difficulty adjustment rules. See [Security Considerations](#security-considerations) below.

---

## Merkle Trees & Transaction Verification

### The Problem

A Bitcoin block contains ~2000 transactions. You want to verify that a specific transaction is in the block **without downloading all 2000 transactions**.

### The Solution: Merkle Trees

A **Merkle tree** is a binary tree where:
- Leaf nodes are transaction hashes
- Each parent node is the hash of its two children
- The root (merkleRoot) is included in the block header

```
                    merkleRoot
                   /          \
              hash12           hash34
             /    \           /    \
          hash1  hash2    hash3  hash4
           |      |        |      |
          tx1    tx2      tx3    tx4
```

### Merkle Proof Verification

To prove that `tx2` is in the block, you need:
- The transaction hash (leaf)
- The sibling hash at each level (proof)
- The merkle root (from the block header)

```
To verify tx2:
1. Start with hash(tx2)
2. Combine with its sibling hash1 → hash12
3. Combine hash12 with its sibling hash34 → merkleRoot ✓

Proof = [hash1, hash34]
```

### Implementation

```solidity
function verifyTxInclusion(
    bytes32 txid,
    bytes32 merkleRoot,
    bytes32[] memory proof,
    uint256 index
) public pure returns (bool) {
    bytes32 currentHash = txid;
    
    for (uint256 i = 0; i < proof.length; i++) {
        bytes32 proofElement = proof[i];
        
        if (index % 2 == 0) {
            // currentHash is left, proof is right
            currentHash = hash256(abi.encodePacked(currentHash, proofElement));
        } else {
            // proof is left, currentHash is right
            currentHash = hash256(abi.encodePacked(proofElement, currentHash));
        }
        index = index / 2;
    }
    
    return currentHash == merkleRoot;
}
```

**Key Insight:** With just ~20 hashes (a Merkle proof), you can verify any transaction in any Bitcoin block (which has up to 2000+ transactions). This is the magic of Merkle trees!

---

## Rootstock Merge-Mining Security

### What is Merge-Mining?

**Merge-mining** allows miners to mine multiple blockchains simultaneously without extra computational cost. Rootstock (RSK) uses merge-mining with Bitcoin:

1. Bitcoin miners mine Bitcoin blocks as normal
2. Simultaneously, Bitcoin block data is included in Rootstock blocks
3. The computational work securing Bitcoin **also secures Rootstock**
4. Rootstock gets Bitcoin's $50+ billion mining infrastructure for free

### Why This Matters for SPV

Because Rootstock is merge-mined with Bitcoin:
- A valid Bitcoin block is expensive to create (requires PoW)
- An attacker cannot easily fake Bitcoin blocks on Rootstock
- When a contract verifies a Bitcoin block on Rootstock, it knows that block is real

This is **more secure than a sidechains** that rely on small validator sets.

### Architecture

```
Bitcoin Network
    ↓ (miners create blocks)
    ↓
Bitcoin Block Header (80 bytes)
    ↓ (included in Rootstock merge-mining coinbase)
    ↓
Rootstock Block
    ↓ (verified by merge-mining proof)
    ↓
Smart Contract Verification
    ↓
Application (DEX, Bridge, Oracle, etc.)
```

---

## SPV Implementation

### What Our Contract Does

The [BitcoinSPV.sol](./contracts/BitcoinSPV.sol) contract implements three core functions:

#### 1. **parseHeader()** - Extract block metadata

Parse the 80-byte Bitcoin block header into structured fields:

```solidity
BlockHeader memory block = parseHeader(rawHeader);
// Now you have: version, prevHash, merkleRoot, timestamp, bits, nonce
```

#### 2. **checkPoW()** - Validate Proof of Work

Verify that the block header produces a hash that meets the target:

```solidity
bool isValid = checkPoW(rawHeader, targetDifficulty);
```

⚠️ **In this tutorial**, the target is passed as a parameter. In production, you would extract it from the `bits` field.

#### 3. **verifyTxInclusion()** - Verify transaction in block

Verify that a transaction is included in the block using a Merkle proof:

```solidity
bool isIncluded = verifyTxInclusion(txHash, merkleRoot, proof, index);
```

#### 4. **submitHeader()** - Submit & validate a new block

Orchestrates the full validation:
1. Check the block header length
2. Validate PoW
3. Parse the header
4. Verify chain continuity (previous block is known)
5. Record the block hash

```solidity
submitHeader(rawHeader, targetDifficulty);
// This emits HeaderSubmitted event and stores the block hash
```

---

## Practical Examples

### Example 1: Submit a Bitcoin Block

```solidity
// 1. Get a raw 80-byte block header from Bitcoin
bytes memory blockHeader = hex"0100000000..."; // 80 bytes

// 2. Get the appropriate target (in production, from the bits field)
uint256 target = 0x00000000FFFF0000000000000000000000000000000000000000000000000000;

// 3. Submit it
bitcoinSPV.submitHeader(blockHeader, target);
// Event emitted: HeaderSubmitted(blockHash)
```

### Example 2: Verify a Transaction

```solidity
// 1. Get a transaction hash
bytes32 txHash = keccak256(abi.encodePacked(txData));

// 2. Get the merkle root from a verified block header
bytes32 merkleRoot = knownHeaders[blockHash];

// 3. Build the merkle proof
bytes32[] memory proof = new bytes32[](4);
proof[0] = 0xaaaa...; // sibling at level 0
proof[1] = 0xbbbb...; // sibling at level 1
proof[2] = 0xcccc...; // sibling at level 2
proof[3] = 0xdddd...; // sibling at level 3

// 4. Get the transaction index in the block
uint256 txIndex = 42;

// 5. Verify
bool isIncluded = bitcoinSPV.verifyTxInclusion(txHash, merkleRoot, proof, txIndex);
require(isIncluded, "Transaction not in block");
```

---

## Common Pitfalls & Security Considerations

### 1. **The Simplified Target Problem**

**Issue:** This tutorial accepts the target as a function parameter. An attacker could pass `MaxUint256` and bypass PoW.

**Real Bitcoin:**
- The target is encoded in the `bits` field
- Bitcoin validates that difficulty only changes by max 2x every 2016 blocks
- Invalid difficulty changes are rejected

**For production:**
```solidity
function decodeTarget(uint32 bits) internal pure returns (uint256) {
    uint8 exponent = uint8(bits >> 24);
    uint32 mantissa = bits & 0x00ffffff;
    return uint256(mantissa) << (8 * (exponent - 3));
}
```

### 2. **The Bits Field Isn't Used**

**Current:** We parse `bits` but don't use it to compute the target.

**Why:** Decoding difficulty is complex and requires careful overflow handling. For a tutorial, we simplified by accepting the target as input.

**Real implementation** would extract the target from `bits` and validate its correctness against the previous block's bits.

### 3. **Merkle Tree Transaction Ordering**

**Issue:** Transaction order in the proof matters!

```solidity
// ❌ WRONG - wrong order
hash(hash(tx, sibling1), sibling2)

// ✓ CORRECT - determined by index
if (index % 2 == 0) {
    hash(hash(tx, sibling1), sibling2)
} else {
    hash(hash(sibling1, tx), sibling2)
}
```

The `verifyTxInclusion()` function handles this by checking `index % 2`.

### 4. **Hash Function Endianness**

**Issue:** Bitcoin hashes are interpreted as little-endian numbers.

```solidity
// Raw hash from Bitcoin
bytes32 hash = 0x00000000FFFF...;

// As little-endian number (for comparison)
uint256 hashInt = uint256(reverseBytes32(hash));

// This is done in checkPoW()
```

### 5. **No Difficulty Adjustment Validation**

**Current Implementation:** We don't enforce Bitcoin's difficulty adjustment rules.

**Real Implementation Would:**
- Track the expected bits for the current block
- Reject blocks with unexpected bits
- Handle the 2016-block adjustment period correctly

This is important because it prevents someone from creating fake "easy" blocks.

---

## Next Steps

Now that you understand the concepts:

1. **Deploy the contract:**
   ```bash
   npx hardhat run scripts/deploy.ts --network rootstockTestnet
   ```

2. **Run the tests:**
   ```bash
   npm test
   ```

3. **Modify & experiment:**
   - Try changing the target in `submitHeader()` calls
   - Add your own block headers
   - Implement Merkle proof verification tests

4. **For production:**
   - Implement proper difficulty decoding from the `bits` field
   - Add difficulty adjustment validation
   - Add block reorg detection
   - Consider state expiration (old blocks become stale)

---

## Resources

- [Bitcoin Whitepaper](https://bitcoin.org/en/bitcoin-paper)
- [Bitcoin Developer Reference - Block Headers](https://developer.bitcoin.org/reference/block_chain/block_headers.html)
- [Merkle Trees Explained](https://en.wikipedia.org/wiki/Merkle_tree)
- [Rootstock Official Documentation](https://docs.rootstock.io)
- [Bitcoin-SPV Repository](https://github.com/trezor/btcutils) (Reference implementation)

---

Happy learning! 🚀
