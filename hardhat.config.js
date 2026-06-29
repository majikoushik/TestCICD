require('dotenv').config();
require('@nomicfoundation/hardhat-toolbox');

const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || '0x' + '0'.repeat(64);

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: '0.8.20',
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },

  networks: {
    // Local development
    hardhat: {},

    // Polygon Amoy testnet (replaces Mumbai)
    amoy: {
      url: process.env.POLYGON_RPC_URL || 'https://rpc-amoy.polygon.technology',
      accounts: [PRIVATE_KEY],
      chainId: 80002,
    },

    // Polygon Mainnet (production — use with caution)
    polygon: {
      url: process.env.POLYGON_MAINNET_RPC_URL || 'https://polygon-rpc.com',
      accounts: [PRIVATE_KEY],
      chainId: 137,
    },
  },

  etherscan: {
    apiKey: {
      polygon:      process.env.POLYGONSCAN_API_KEY || '',
      polygonAmoy:  process.env.POLYGONSCAN_API_KEY || '',
    },
    customChains: [
      {
        network: 'polygonAmoy',
        chainId: 80002,
        urls: {
          apiURL:     'https://api-amoy.polygonscan.com/api',
          browserURL: 'https://amoy.polygonscan.com',
        },
      },
    ],
  },
};
