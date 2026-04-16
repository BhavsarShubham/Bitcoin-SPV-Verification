# Bitcoin SPV Verification on Rootstock

A smart contract implementation for verifying Bitcoin transactions on Rootstock (RSK) using SPV (Simplified Payment Verification) — without trusting a centralized intermediary.

---

## Project Overview

This project allows Solidity smart contracts to verify Bitcoin transactions on Rootstock by:

- Parsing Bitcoin block headers (80 bytes)
- Validating Bitcoin Proof-of-Work
- Verifying Merkle proofs for transaction inclusion
- Leveraging Rootstock's Bitcoin merge-mining security model

**Key Contract:**
- `BitcoinSPV` — A unified contract that parses Bitcoin block headers, validates PoW, and verifies Merkle proofs for transaction inclusion

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

Copy the `.env.example` file to `.env` and add your private key:

```bash
cp .env.example .env
```

Then edit `.env` and add your private key:

```
PRIVATE_KEY=your_private_key_here
```

> ⚠️ Never commit `.env` to version control. The `.env` file is listed in `.gitignore` to prevent accidental secret leaks.

### 2. Get Testnet Funds

Grab test RBTC from the [Rootstock Testnet Faucet](https://faucet.rootstock.io/).

### 3. Deploy

```bash
npx hardhat run scripts/deploy.ts --network rootstockTestnet
```

The script will output the deployed contract address and additional guidance.

---

## Commands Reference

| Command | Description |
|---------|-------------|
| `npm run compile` | Compile Solidity contracts |
| `npm run test` | Run all tests |
| `npm run node` | Start local development blockchain |
| `npx hardhat verify <address> --network rootstockTestnet` | Verify contract on block explorer |

---

## Tutorial & Learning Resources

This repository includes comprehensive documentation explaining Bitcoin SPV, merge-mining, and Merkle proofs:

- **[TUTORIAL.md](./TUTORIAL.md)** — Step-by-step guide covering:
  - Bitcoin block structure and parsing
  - Proof-of-Work validation
  - Merkle proofs and transaction verification
  - How merge-mining secures Rootstock
  - Practical examples and code walkthroughs

Start with [TUTORIAL.md](./TUTORIAL.md) if you're new to Bitcoin SPV.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `Cannot find module 'hardhat'` | Run `npm install` |
| `Private key not found` | Ensure `.env` exists with `PRIVATE_KEY` set |
| Tests fail with compilation errors | Run `npm run compile` first |
| Deployment fails with insufficient funds | Get test RBTC from the faucet |