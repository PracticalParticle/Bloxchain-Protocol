import hardhatToolboxMochaEthers from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import "solidity-docgen";

/** @type import('hardhat/config').HardhatUserConfig */
export default {
  plugins: [hardhatToolboxMochaEthers],
  solidity: {
    version: "0.8.25",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
      viaIR: true
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
