/**
 * Script: deploy PixelRaidCardsV2 ke BSC testnet.
 *
 * ⚠️  WAIT — Bre/APPROVAL required sebelum eksekusi.
 *     DO NOT run without explicit authorization.
 *     Cost: ~0.005–0.010 tBNB (testnet = $0)
 *
 * Usage:
 *   cd blockchain
 *   npx hardhat run scripts/deploy-v2.js --network bscTestnet
 *
 * What it does:
 *   1. Compile PixelRaidCardsV2.sol
 *   2. Deploy ke BSC testnet (chainId 97)
 *   3. Constructor args: (name="Pixel Raid Cards", symbol="PRC", baseURI=...)
 *   4. Print deployed address
 *   5. Verify owner() = deployer = VPS wallet Bre
 *
 * Post-deploy checklist (UPDATE BREC):
 *   □ Save deployed address to .env: V2_CONTRACT_ADDRESS=0x...
 *   □ Update js/systems/blockchain.js → CONTRACT_ADDRESS=<addr>
 *   □ Submit source to BSCscan for verification:
 *       npx hardhat verify --network bscTestnet <addr> "Pixel Raid Cards" "PRC" "<baseURL>"
 *   □ Mint 1 sample NFT (proof on-chain): use scripts/mint-sample.js
 */
const hre = require("hardhat");

async function main() {
  const BASE_URI = process.env.V2_BASE_URI || "https://pixel.brebross.xyz/metadata/";
  const NAME = "Pixel Raid Cards";
  const SYMBOL = "PRC";

  const [deployer] = await hre.ethers.getSigners();
  const balance = await hre.ethers.provider.getBalance(deployer.address);

  console.log("═══════════════════════════════════════════");
  console.log("Pixel Raid · PixelRaidCardsV2 deploy");
  console.log("═══════════════════════════════════════════");
  console.log(`Network   : ${hre.network.name}`);
  console.log(`Deployer  : ${deployer.address}`);
  console.log(`Balance   : ${hre.ethers.formatEther(balance)} tBNB`);
  console.log(`Base URI  : ${BASE_URI}`);
  console.log();

  if (hre.network.name === "bscTestnet" && balance < hre.ethers.parseEther("0.005")) {
    throw new Error(
      `Insufficient tBNB for deploy (need ~0.005). ` +
      `Got ${hre.ethers.formatEther(balance)}. Fund your wallet first: ` +
      `https://www.bnbchain.org/en/testnet-faucet`
    );
  }

  const V2 = await hre.ethers.getContractFactory("PixelRaidCardsV2");
  console.log("Deploying...");
  const v2 = await V2.deploy(NAME, SYMBOL, BASE_URI);
  await v2.waitForDeployment();
  const addr = await v2.getAddress();

  console.log();
  console.log("═══════════════════════════════════════════");
  console.log(`✓ Deployed at: ${addr}`);
  console.log(`  Owner     : ${await v2.owner()}`);
  console.log(`  Name      : ${await v2.name()}`);
  console.log(`  Symbol    : ${await v2.symbol()}`);
  console.log(`  BaseURI   : ${await v2.getBaseURI()}`);
  console.log("═══════════════════════════════════════════");
  console.log();
  console.log("Next steps:");
  console.log(`1. Verify on BSCscan: https://testnet.bscscan.com/address/${addr}`);
  console.log(`2. Set V2_CONTRACT_ADDRESS=${addr} in .env`);
  console.log(`3. Update js/systems/blockchain.js → CONTRACT_ADDRESS="${addr}"`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
