# Bitcoin SPV Tutorial on Rootstock

This is a minimal working tutorial project that demonstrates Bitcoin Simplified Payment Verification (SPV) using Solidity, intended for deployment on Rootstock Testnet.

## Overview
This tutorial project focuses specifically on verifying Bitcoin state without running a full node. A light client (SPV) achieves this by checking proof-of-work and validating transaction inclusion.

### Features
1. **Bitcoin Block Header Parsing**: Extracts fields (`version`, `prevHash`, `merkleRoot`, `timestamp`, `bits`, `nonce`) manually from raw 80-byte header bytes.
2. **Simplified Proof-of-Work**: Allows testing simplified difficulty targets.
3. **Header Continuity**: Ensures newly submitted headers link sequentially backwards to known headers using double-SHA256 (`hash256`).
4. **Merkle Validations**: Implements Merkle Branch verification (sibling hashes path) to verify that a given `txid` is securely stored under a block's `merkleRoot`.

## Quick Start (Hardhat Setup)

### 1. Install Dependencies
```bash
npm install
```

### 2. Compile Contract
```bash
npm run compile
```

### 3. Run Tests
The test suite includes verification of block parsing, connection, simplified PoW, and Merkle Proofs.
```bash
npm run test
```

## Disclaimer
This is built for **educational purposes** and deliberately omits:
- Complex dynamic PoW difficulty retargeting logic based on Bitcoin's 2016-block window.
- Chain reorganization and fork resolution logic.
- Production-grade gas optimizations.
