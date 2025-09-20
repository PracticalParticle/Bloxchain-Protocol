require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-web3");
require("solidity-docgen");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.24",
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