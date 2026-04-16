import { ethers } from "hardhat";

/**
 * Deployment script for BitcoinSPV contract
 * 
 * This script deploys the BitcoinSPV contract to Rootstock Testnet.
 * It requires a trusted block hash to bootstrap the chain validation.
 * 
 * Usage: npx hardhat run scripts/deploy.ts --network rootstockTestnet
 */

async function main() {
  console.log("Starting BitcoinSPV contract deployment...\n");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying contracts with account: ${deployer.address}`);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Account balance: ${ethers.formatEther(balance)} ETH\n`);

  // Use Bitcoin's genesis block hash as the trusted starting point
  // Bitcoin Genesis block: 000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1fb51d1c9db
  // In little-endian (as Bitcoin uses): db1c1d51fbf1b372c1a6a246ae63f74f934e1e8365e15a089c68d61900000000
  const trustedBlockHash = "0xdb1c1d51fbf1b372c1a6a246ae63f74f934e1e8365e15a089c68d61900000000";
  
  console.log(`Deploying BitcoinSPV with trusted block hash: ${trustedBlockHash}\n`);

  // Deploy the contract
  const BitcoinSPV = await ethers.getContractFactory("BitcoinSPV");
  const bitcoinSPV = await BitcoinSPV.deploy(trustedBlockHash);
  
  await bitcoinSPV.waitForDeployment();
  const deployedAddress = await bitcoinSPV.getAddress();

  console.log(`✓ BitcoinSPV deployed to: ${deployedAddress}\n`);

  // Log deployment information
  console.log("Deployment Summary:");
  console.log("===================");
  console.log(`Contract Address: ${deployedAddress}`);
  console.log(`Deployer Address: ${deployer.address}`);
  console.log(`Network: Rootstock Testnet (ChainID: 31)`);
  console.log(`Trusted Block Hash: ${trustedBlockHash}\n`);

  console.log("Next Steps:");
  console.log("===========");
  console.log("1. Save the contract address for later use");
  console.log("2. Verify the contract on the block explorer (optional):");
  console.log(`   npx hardhat verify ${deployedAddress} "${trustedBlockHash}" --network rootstockTestnet`);
  console.log("3. Interact with the contract using the deployed address\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
