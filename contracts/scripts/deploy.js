/**
 * Deploy ClinicToken.sol to Polygon Amoy testnet (or local Hardhat network).
 *
 * Usage:
 *   npx hardhat run contracts/scripts/deploy.js --network amoy
 *
 * After deploy, copy the printed contract address into your .env:
 *   CLINICTOKEN_ADDRESS=0x...
 */

const { ethers } = require('hardhat');

const TOKEN_CAP_CLT = 1_000_000n; // 1 million CLT hard cap
const TOKEN_DECIMALS = 18n;
const CAP_IN_WEI = TOKEN_CAP_CLT * (10n ** TOKEN_DECIMALS);

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Deploying ClinicToken with account:', deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log('Account balance:', ethers.formatEther(balance), 'MATIC');

  const ClinicToken = await ethers.getContractFactory('ClinicToken');
  const token = await ClinicToken.deploy(CAP_IN_WEI);
  await token.waitForDeployment();

  const address = await token.getAddress();
  console.log('\n✅ ClinicToken deployed!');
  console.log('  Contract address:', address);
  console.log('  Token cap:       ', ethers.formatEther(CAP_IN_WEI), 'CLT');
  console.log('  Network:         ', (await ethers.provider.getNetwork()).name);
  console.log('\nAdd to .env:');
  console.log(`  CLINICTOKEN_ADDRESS=${address}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
