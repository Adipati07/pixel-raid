require("dotenv").config();

/**
 * Hardhat config for Pixel Raid hackathon project.
 * Default path: /root/pixel-raid/blockchain/hardhat.config.js
 *
 * Usage:
 *   npx hardhat compile                                  # compile contracts → artifacts/
 *   npx hardhat run scripts/deploy-v2.js --network bscTestnet   # deploy to BSC testnet
 *
 * Network config:
 *   - bscTestnet: real BSC testnet (chainId 97)
 *   - hardhat:    in-memory local, for tests
 *
 * Credentials sourced from .env via dotenv.
 *   - PRIVATE_KEY  (REQUIRED for deploy)
 *   - BSC_TESTNET_RPC (optional; default uses publicnode)
 *   - V2_BASE_URI  (metadata host prefix; default = pixel.brebross.xyz)
 */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: true,
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    bscTestnet: {
      url: process.env.BSC_TESTNET_RPC || "https://bsc-testnet-rpc.publicnode.com",
      chainId: 97,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
  etherscan: {
    apiKey: {
      bscTestnet: process.env.BSCSCAN_API_KEY || "",
    },
  },
  paths: {
    sources: require("path").resolve(__dirname, "../contracts"),
    root: require("path").resolve(__dirname, "./"),
    artifacts: require("path").resolve(__dirname, "./artifacts"),
    cache: require("path").resolve(__dirname, "./cache"),
  },
};
