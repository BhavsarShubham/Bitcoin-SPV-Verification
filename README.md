**# Bitcoin SPV Verification on Rootstock: A Complete Developer Guide

## Introduction

Bringing Bitcoin data on-chain without trusting a centralized intermediary is one of the most powerful capabilities in blockchain development. On Rootstock (RSK), this is made possible through **SPV (Simplified Payment Verification)**—a technique that allows smart contracts to verify Bitcoin transactions efficiently.

This tutorial is a **deep, practical guide** to understanding and implementing Bitcoin SPV verification on Rootstock, including architecture design, Solidity implementation, and gas optimization strategies.

---

## What This Tutorial Teaches

By the end of this guide, you will understand:

* Rootstock’s Bitcoin merge-mining model
* What SPV (Simplified Payment Verification) is
* How SPV works inside smart contracts
* Architecture for Bitcoin verification on Rootstock
* How to write a Bitcoin block header parser in Solidity
* Gas optimization techniques for SPV verification

---
## How to Run This Project

Follow these steps to set up, compile, test, and deploy the Bitcoin SPV smart contract.

### Prerequisites

Before getting started, ensure you have installed:

* **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
* **npm** (comes with Node.js)
* **Git** - [Download here](https://git-scm.com/)
* A code editor (VS Code recommended)

### Installation

1. **Clone the repository** (or navigate to the project directory):
   ```bash
   cd bitcoin-spv-tutorial
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```
   This installs Hardhat, TypeScript, testing libraries, and ethers.js.

### Compilation

Compile the Solidity smart contract to check for syntax errors:

```bash
npm run compile
```

This generates:
* Compiled contract artifacts in `artifacts/`
* TypeChain types in `typechain-types/` (for TypeScript support)

### Testing

Run the test suite to verify the smart contract logic:

```bash
npm run test
```

This executes all tests in the `test/` directory. The output will show:
* Number of tests passed/failed
* Gas usage per function
* Any assertions that fail

### Local Development (Optional)

Start a local Hardhat node for development and debugging:

```bash
npm run node
```

This starts a local blockchain at `http://localhost:8545` that you can interact with.

### Deployment to Rootstock Testnet

To deploy the BitcoinSPV contract to Rootstock Testnet:

1. **Set up your environment variables**:
   
   Create or edit the `.env` file in the root directory:
   ```
   PRIVATE_KEY=your_private_key_here
   ```
   
   ⚠️ **Security Note**: Never commit `.env` to version control. Add it to `.gitignore`.

2. **Get testnet funds**:
   
   Obtain test RBTC from the [Rootstock Testnet Faucet](https://faucet.rootstock.io/)

3. **Create a deployment script** (optional):
   
   Create `scripts/deploy.ts`:
   ```typescript
   import { ethers } from "hardhat";

   async function main() {
     const BitcoinSPV = await ethers.getContractFactory("BitcoinSPV");
     const contract = await BitcoinSPV.deploy();
     await contract.deployed();
     console.log("BitcoinSPV deployed to:", contract.address);
   }

   main().catch((error) => {
     console.error(error);
     process.exitCode = 1;
   });
   ```

4. **Run the deployment script**:
   ```bash
   npx hardhat run scripts/deploy.ts --network rootstockTestnet
   ```

### Verifying Your Setup

After compilation, verify everything worked:

```bash
npm run test
```

If tests pass, your environment is properly configured!

### Common Commands Reference

| Command | Purpose |
|---------|---------|
| `npm run compile` | Compile Solidity contracts |
| `npm run test` | Run all tests |
| `npm run node` | Start local development blockchain |
| `npx hardhat verify <address> --network rootstockTestnet` | Verify contract on block explorer |

### Troubleshooting

**Issue**: "Cannot find module 'hardhat'"
- **Solution**: Run `npm install` to install dependencies

**Issue**: "Private key not found"
- **Solution**: Check that `.env` file exists in the root directory with your `PRIVATE_KEY`

**Issue**: Tests fail with compilation errors
- **Solution**: Run `npm run compile` first, then `npm run test`

**Issue**: Deployment fails with "Insufficient funds"
- **Solution**: Ensure your wallet has test RBTC from the faucet

---
## Understanding Rootstock’s Bitcoin Merge-Mining Model

Rootstock is secured by Bitcoin through **merge mining**.

This means:

* Bitcoin miners also validate Rootstock blocks
* Rootstock inherits Bitcoin’s security
* Smart contracts can rely on Bitcoin data with high confidence

### Why This Matters for SPV

Because Rootstock is anchored to Bitcoin:

* Verifying Bitcoin headers becomes meaningful
* You can trust proof-of-work indirectly
* SPV proofs become usable inside smart contracts

---

## What is SPV (Simplified Payment Verification)?

SPV is a method that allows verification of Bitcoin transactions **without downloading the full blockchain**.

Instead of full validation, SPV uses:

* Block headers
* Merkle proofs
* Transaction hashes

### SPV Flow

```
1. Bitcoin Transaction Occurs
2. Included in a Block
3. Block Header is Stored
4. Merkle Proof Links TX → Block
5. Smart Contract Verifies Proof
```

### Key Idea

You don’t verify everything—you verify **just enough**:

* Block exists
* Transaction is included
* Proof-of-work is valid

---

## Architecture Design for SPV on Rootstock

A typical SPV verification system consists of:

### Components

1. **Header Relay Contract**

   * Stores Bitcoin block headers
   * Validates proof-of-work

2. **SPV Verification Contract**

   * Verifies Merkle proofs
   * Confirms transaction inclusion

3. **Client / Relayer**

   * Submits headers and proofs

---

### Architecture Diagram

```
Relayer → Header Relay → Storage (Headers)
        → SPV Contract → Verification Logic
```

---

## Bitcoin Block Structure (Important for Parsing)

A Bitcoin block header is **80 bytes**:

| Field       | Size |
| ----------- | ---- |
| Version     | 4    |
| Prev Hash   | 32   |
| Merkle Root | 32   |
| Timestamp   | 4    |
| Bits        | 4    |
| Nonce       | 4    |

---

## Writing a Bitcoin Header Parser in Solidity

Parsing raw Bitcoin headers in Solidity is tricky due to byte-level operations.

### Example: Header Parsing

```solidity id="l2c3x1"
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract BitcoinHeaderParser {

    struct BlockHeader {
        uint32 version;
        bytes32 prevBlock;
        bytes32 merkleRoot;
        uint32 timestamp;
        uint32 bits;
        uint32 nonce;
    }

    function parseHeader(bytes memory rawHeader)
        public
        pure
        returns (BlockHeader memory)
    {
        require(rawHeader.length == 80, "Invalid header length");

        BlockHeader memory header;

        assembly {
            header := mload(0x40)

            mstore(header, mload(add(rawHeader, 4)))
            mstore(add(header, 32), mload(add(rawHeader, 36)))
            mstore(add(header, 64), mload(add(rawHeader, 68)))
            mstore(add(header, 96), mload(add(rawHeader, 72)))
            mstore(add(header, 128), mload(add(rawHeader, 76)))
            mstore(add(header, 160), mload(add(rawHeader, 80)))
        }

        return header;
    }
}
```

---

## Verifying Merkle Proofs in Solidity

To prove a transaction is included in a block:

### Inputs:

* Transaction hash
* Merkle proof
* Merkle root

### Concept:

```
hash → combine with sibling → repeat → compare with root
```

### Simplified Example:

```solidity id="l3p9k2"
function verifyMerkleProof(
    bytes32 txHash,
    bytes32[] memory proof,
    bytes32 root
) public pure returns (bool) {

    bytes32 hash = txHash;

    for (uint i = 0; i < proof.length; i++) {
        hash = keccak256(abi.encodePacked(hash, proof[i]));
    }

    return hash == root;
}
```

---

## Proof-of-Work Verification (Simplified)

Bitcoin uses **double SHA-256 hashing**.

To verify:

* Hash the header twice
* Compare with target derived from `bits`

⚠️ Note: Full PoW verification in Solidity is expensive and often simplified.

---

## Gas Optimization Techniques for SPV on Rootstock

Gas efficiency is critical when working with Bitcoin data.

### 1. Store Only Headers (Not Full Blocks)

* Store minimal data
* Avoid unnecessary storage writes

---

### 2. Use `bytes32` Instead of `bytes`

* Fixed-size types are cheaper
* Reduces memory overhead

---

### 3. Batch Header Submission

Instead of:

```
1 header per tx
```

Use:

```
multiple headers per tx
```

---

### 4. Avoid Redundant Hashing

* Cache intermediate hashes
* Reuse computed values

---

### 5. Use Assembly Carefully

* Reduces gas cost
* Avoids unnecessary memory copying

---

### 6. Limit On-Chain Verification Depth

* Verify minimal confirmations
* Avoid deep proof chains

---

## Testing on Rootstock Testnet

To deploy and test:

### Tools:

* Solidity
* Hardhat
* JavaScript
* Rootstock Testnet

### Steps:

1. Deploy Header Relay
2. Submit Bitcoin headers
3. Submit SPV proof
4. Verify transaction

---

## Common Pitfalls

* Incorrect byte parsing (endianness issues)
* Wrong Merkle proof ordering
* Ignoring Bitcoin difficulty adjustments
* High gas costs from naive implementations
* Not validating header chains properly

---

## Best Practices

* Validate header chains, not just individual headers
* Use trusted relayers or incentivized systems
* Combine off-chain + on-chain verification
* Audit all parsing logic carefully
* Test with real Bitcoin data

---

## Real-World Use Cases

* Cross-chain bridges
* BTC-backed tokens
* Payment verification systems
* Trust-minimized oracles

---

## Conclusion

Bitcoin SPV verification on Rootstock unlocks powerful cross-chain capabilities while maintaining decentralization. However, it requires careful design, efficient implementation, and deep understanding of Bitcoin internals.

If implemented correctly, SPV allows you to:

* Trustlessly verify Bitcoin transactions
* Build secure cross-chain applications
* Leverage Bitcoin’s security inside smart contracts

---

## SEO Keywords

Bitcoin SPV Rootstock, RSK SPV verification, Bitcoin header parsing Solidity, Merkle proof smart contract, cross-chain Bitcoin verification, Rootstock smart contracts, SPV tutorial Solidity, Bitcoin block structure parsing

---
# Bitcoin-SPV-Verification**# Bitcoin SPV Verification on Rootstock: A Complete Developer Guide

## Introduction

Bringing Bitcoin data on-chain without trusting a centralized intermediary is one of the most powerful capabilities in blockchain development. On Rootstock (RSK), this is made possible through **SPV (Simplified Payment Verification)**—a technique that allows smart contracts to verify Bitcoin transactions efficiently.

This tutorial is a **deep, practical guide** to understanding and implementing Bitcoin SPV verification on Rootstock, including architecture design, Solidity implementation, and gas optimization strategies.

---

## What This Tutorial Teaches

By the end of this guide, you will understand:

* Rootstock’s Bitcoin merge-mining model
* What SPV (Simplified Payment Verification) is
* How SPV works inside smart contracts
* Architecture for Bitcoin verification on Rootstock
* How to write a Bitcoin block header parser in Solidity
* Gas optimization techniques for SPV verification

---

## Understanding Rootstock’s Bitcoin Merge-Mining Model

Rootstock is secured by Bitcoin through **merge mining**.

This means:

* Bitcoin miners also validate Rootstock blocks
* Rootstock inherits Bitcoin’s security
* Smart contracts can rely on Bitcoin data with high confidence

### Why This Matters for SPV

Because Rootstock is anchored to Bitcoin:

* Verifying Bitcoin headers becomes meaningful
* You can trust proof-of-work indirectly
* SPV proofs become usable inside smart contracts

---

## What is SPV (Simplified Payment Verification)?

SPV is a method that allows verification of Bitcoin transactions **without downloading the full blockchain**.

Instead of full validation, SPV uses:

* Block headers
* Merkle proofs
* Transaction hashes

### SPV Flow

```
1. Bitcoin Transaction Occurs
2. Included in a Block
3. Block Header is Stored
4. Merkle Proof Links TX → Block
5. Smart Contract Verifies Proof
```

### Key Idea

You don’t verify everything—you verify **just enough**:

* Block exists
* Transaction is included
* Proof-of-work is valid

---

## Architecture Design for SPV on Rootstock

A typical SPV verification system consists of:

### Components

1. **Header Relay Contract**

   * Stores Bitcoin block headers
   * Validates proof-of-work

2. **SPV Verification Contract**

   * Verifies Merkle proofs
   * Confirms transaction inclusion

3. **Client / Relayer**

   * Submits headers and proofs

---

### Architecture Diagram

```
Relayer → Header Relay → Storage (Headers)
        → SPV Contract → Verification Logic
```

---

## Bitcoin Block Structure (Important for Parsing)

A Bitcoin block header is **80 bytes**:

| Field       | Size |
| ----------- | ---- |
| Version     | 4    |
| Prev Hash   | 32   |
| Merkle Root | 32   |
| Timestamp   | 4    |
| Bits        | 4    |
| Nonce       | 4    |

---

## Writing a Bitcoin Header Parser in Solidity

Parsing raw Bitcoin headers in Solidity is tricky due to byte-level operations.

### Example: Header Parsing

```solidity id="l2c3x1"
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract BitcoinHeaderParser {

    struct BlockHeader {
        uint32 version;
        bytes32 prevBlock;
        bytes32 merkleRoot;
        uint32 timestamp;
        uint32 bits;
        uint32 nonce;
    }

    function parseHeader(bytes memory rawHeader)
        public
        pure
        returns (BlockHeader memory)
    {
        require(rawHeader.length == 80, "Invalid header length");

        BlockHeader memory header;

        assembly {
            header := mload(0x40)

            mstore(header, mload(add(rawHeader, 4)))
            mstore(add(header, 32), mload(add(rawHeader, 36)))
            mstore(add(header, 64), mload(add(rawHeader, 68)))
            mstore(add(header, 96), mload(add(rawHeader, 72)))
            mstore(add(header, 128), mload(add(rawHeader, 76)))
            mstore(add(header, 160), mload(add(rawHeader, 80)))
        }

        return header;
    }
}
```

---

## Verifying Merkle Proofs in Solidity

To prove a transaction is included in a block:

### Inputs:

* Transaction hash
* Merkle proof
* Merkle root

### Concept:

```
hash → combine with sibling → repeat → compare with root
```

### Simplified Example:

```solidity id="l3p9k2"
function verifyMerkleProof(
    bytes32 txHash,
    bytes32[] memory proof,
    bytes32 root
) public pure returns (bool) {

    bytes32 hash = txHash;

    for (uint i = 0; i < proof.length; i++) {
        hash = keccak256(abi.encodePacked(hash, proof[i]));
    }

    return hash == root;
}
```

---

## Proof-of-Work Verification (Simplified)

Bitcoin uses **double SHA-256 hashing**.

To verify:

* Hash the header twice
* Compare with target derived from `bits`

⚠️ Note: Full PoW verification in Solidity is expensive and often simplified.

---

## Gas Optimization Techniques for SPV on Rootstock

Gas efficiency is critical when working with Bitcoin data.

### 1. Store Only Headers (Not Full Blocks)

* Store minimal data
* Avoid unnecessary storage writes

---

### 2. Use `bytes32` Instead of `bytes`

* Fixed-size types are cheaper
* Reduces memory overhead

---

### 3. Batch Header Submission

Instead of:

```
1 header per tx
```

Use:

```
multiple headers per tx
```

---

### 4. Avoid Redundant Hashing

* Cache intermediate hashes
* Reuse computed values

---

### 5. Use Assembly Carefully

* Reduces gas cost
* Avoids unnecessary memory copying

---

### 6. Limit On-Chain Verification Depth

* Verify minimal confirmations
* Avoid deep proof chains

---

## Testing on Rootstock Testnet

To deploy and test:

### Tools:

* Solidity
* Hardhat
* JavaScript
* Rootstock Testnet

### Steps:

1. Deploy Header Relay
2. Submit Bitcoin headers
3. Submit SPV proof
4. Verify transaction

---

## Common Pitfalls

* Incorrect byte parsing (endianness issues)
* Wrong Merkle proof ordering
* Ignoring Bitcoin difficulty adjustments
* High gas costs from naive implementations
* Not validating header chains properly

---

## Best Practices

* Validate header chains, not just individual headers
* Use trusted relayers or incentivized systems
* Combine off-chain + on-chain verification
* Audit all parsing logic carefully
* Test with real Bitcoin data

---

## Real-World Use Cases

* Cross-chain bridges
* BTC-backed tokens
* Payment verification systems
* Trust-minimized oracles

---

## Conclusion

Bitcoin SPV verification on Rootstock unlocks powerful cross-chain capabilities while maintaining decentralization. However, it requires careful design, efficient implementation, and deep understanding of Bitcoin internals.

If implemented correctly, SPV allows you to:

* Trustlessly verify Bitcoin transactions
* Build secure cross-chain applications
* Leverage Bitcoin’s security inside smart contracts

---

## SEO Keywords

Bitcoin SPV Rootstock, RSK SPV verification, Bitcoin header parsing Solidity, Merkle proof smart contract, cross-chain Bitcoin verification, Rootstock smart contracts, SPV tutorial Solidity, Bitcoin block structure parsing

---
