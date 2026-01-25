const hardhatToolboxMochaEthers = require("@nomicfoundation/hardhat-toolbox-mocha-ethers");
require("solidity-docgen");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  plugins: [hardhatToolboxMochaEthers],
  solidity: {
    version: "0.8.33",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
      viaIR: true,
      evmVersion: "osaka"
    }
  },
  networks: {
    hardhat: {
      // Configuration for the built-in Hardhat Network
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  docgen: {
    path: './docs',
    clear: true,
    runOnCompile: true,
    templates: './docgen/templates',
    pages: 'files',
    exclude: ['test/**', 'node_modules/**'],
    outputStructure: 'single',
    theme: 'markdown',
    collapseNewlines: true,
    pageExtension: '.md'
  },
  libraries: {
    TokenInventoryLib: "0x0000000000000000000000000000000000000000" // Placeholder address
  }
};
