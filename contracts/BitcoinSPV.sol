// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title BitcoinSPV
 * @dev A minimal working tutorial for Bitcoin Simplified Payment Verification
 */
contract BitcoinSPV {
    struct BlockHeader {
        uint32 version;
        bytes32 prevHash;
        bytes32 merkleRoot;
        uint32 timestamp;
        uint32 bits;
        uint32 nonce;
    }

    mapping(bytes32 => bool) public knownHeaders;
    
    event HeaderSubmitted(bytes32 indexed blockHash);

    // Provide a genesis or trusted block hash to start the chain
    constructor(bytes32 trustedBlockHash) {
        knownHeaders[trustedBlockHash] = true;
    }

    /**
     * @dev Double SHA256 hash (Bitcoin's standard hashing algorithm)
     * For demonstration purposes, we are just returning the raw bytes32
     */
    function hash256(bytes memory data) public pure returns (bytes32) {
        return sha256(abi.encodePacked(sha256(data)));
    }

    /**
     * @dev Reverses bytes32 (useful for endianness conversion)
     * Bitcoin's target comparison often requires Little Endian format interpretation
     */
    function reverseBytes32(bytes32 data) internal pure returns (bytes32) {
        bytes32 result;
        for (uint i = 0; i < 32; i++) {
            result |= bytes32(data[i] & 0xFF) >> ((31 - i) * 8);
        }
        return result;
    }

    /**
     * @dev Parses an 80-byte raw Bitcoin block header
     */
    function parseHeader(bytes memory header) public pure returns (BlockHeader memory) {
        require(header.length == 80, "Invalid header length");
        
        uint32 version = _extractUint32LE(header, 0);
        bytes32 prevHash = _extractBytes32(header, 4);
        bytes32 merkleRoot = _extractBytes32(header, 36);
        uint32 timestamp = _extractUint32LE(header, 68);
        uint32 bits = _extractUint32LE(header, 72);
        uint32 nonce = _extractUint32LE(header, 76);

        return BlockHeader({
            version: version,
            prevHash: prevHash,
            merkleRoot: merkleRoot,
            timestamp: timestamp,
            bits: bits,
            nonce: nonce
        });
    }

    // Helper to read a little-endian uint32
    function _extractUint32LE(bytes memory data, uint256 pos) internal pure returns (uint32) {
        return uint32(uint8(data[pos])) |
               (uint32(uint8(data[pos + 1])) << 8) |
               (uint32(uint8(data[pos + 2])) << 16) |
               (uint32(uint8(data[pos + 3])) << 24);
    }
    
    // Helper to extract exactly 32 bytes without endian swap (how Bitcoin stores hashes)
    function _extractBytes32(bytes memory data, uint256 pos) internal pure returns (bytes32) {
        bytes32 result;
        assembly {
            // Memory layout for bytes: length at 0x00, data starts at 0x20
            result := mload(add(add(data, 0x20), pos))
        }
        return result;
    }

    /**
     * @dev Validates PoW against a highly simplified target
     * NOTE: This is for educational purposes only. It does NOT implement full
     * Bitcoin difficulty adjustment limits.
     */
    function checkPoW(bytes memory header, uint256 simplifiedTarget) public pure returns (bool) {
        bytes32 blockHash = hash256(header);
        
        // Bitcoin compares hash as little-endian uint256 integers
        uint256 blockHashInt = uint256(reverseBytes32(blockHash));
        return blockHashInt <= simplifiedTarget;
    }

    /**
     * @dev Submits a new Bitcoin block header, validating chain continuity and PoW
     */
    function submitHeader(bytes memory header, uint256 simplifiedTarget) public {
        require(header.length == 80, "Invalid header length");
        
        // 1. Simplified PoW check
        require(checkPoW(header, simplifiedTarget), "PoW target not met");

        // 2. Parse header
        BlockHeader memory parsed = parseHeader(header);
        
        // 3. Header continuity check
        require(knownHeaders[parsed.prevHash], "Previous block unknown");
        
        bytes32 blockHash = hash256(header);
        knownHeaders[blockHash] = true;
        
        emit HeaderSubmitted(blockHash);
    }

    /**
     * @dev Verifies that a transaction is included in a block using a Merkle Proof
     * @param txid The double-sha256 hash of the transaction (raw format)
     * @param merkleRoot The merkle root from the verified block header
     * @param proof The array of sibling hashes for the merkle branch
     * @param index The index of the transaction in the block
     */
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
                // currentHash is left child, proofElement is right child
                currentHash = hash256(abi.encodePacked(currentHash, proofElement));
            } else {
                // proofElement is left child, currentHash is right child
                currentHash = hash256(abi.encodePacked(proofElement, currentHash));
            }
            index = index / 2;
        }
        
        return currentHash == merkleRoot;
    }
}
