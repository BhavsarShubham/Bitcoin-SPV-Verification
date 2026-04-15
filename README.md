# Bitcoin SPV Verification on Rootstock

A smart contract implementation for verifying Bitcoin transactions on Rootstock (RSK) using SPV (Simplified Payment Verification) — without trusting a centralized intermediary.

---

## Project Overview

This project allows Solidity smart contracts to verify Bitcoin transactions on Rootstock by:

- Parsing Bitcoin block headers (80 bytes)
- Verifying Merkle proofs for transaction inclusion
- Leveraging Rootstock's Bitcoin merge-mining security model

**Key Contracts:**
- `BitcoinHeaderParser` — Parses raw 80-byte Bitcoin block headers
- `SPV Verification Contract` — Verifies Merkle proofs and confirms transaction inclusion

---

## Prerequisites

- **Node.js** v16 or higher
- **npm** (comes with Node.js)
- **Git**

---

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Compile Contracts

```bash
npm run compile
```

### 3. Run Tests

```bash
npm run test
```

### 4. Start Local Node (Optional)

```bash
npm run node
```

---

## Deploying to Rootstock Testnet

### 1. Configure Environment

Create a `.env` file in the root directory:

```
PRIVATE_KEY=your_private_key_here
```

> ⚠️ Never commit `.env` to version control.

### 2. Get Testnet Funds

Grab test RBTC from the [Rootstock Testnet Faucet](https://faucet.rootstock.io/).

### 3. Deploy

```bash
npx hardhat run scripts/deploy.ts --network rootstockTestnet
```

---

## Commands Reference

| Command | Description |
|---------|-------------|
| `npm run compile` | Compile Solidity contracts |
| `npm run test` | Run all tests |
| `npm run node` | Start local development blockchain |
| `npx hardhat verify <address> --network rootstockTestnet` | Verify contract on block explorer |

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `Cannot find module 'hardhat'` | Run `npm install` |
| `Private key not found` | Ensure `.env` exists with `PRIVATE_KEY` set |
| Tests fail with compilation errors | Run `npm run compile` first |
| Deployment fails with insufficient funds | Get test RBTC from the faucet |