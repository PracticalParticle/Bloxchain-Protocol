require("solidity-docgen");
const path = require("path");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.34",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
      viaIR: true,
      evmVersion: "osaka"
    }
  },
  paths: {
    // Reference parent directory's contracts, artifacts, and cache
    root: path.resolve(__dirname, ".."),
    sources: path.resolve(__dirname, "../contracts"),
    tests: path.resolve(__dirname, "../test"),
    cache: path.resolve(__dirname, "../cache"),
    artifacts: path.resolve(__dirname, "../artifacts")
  },
  docgen: {
    path: path.resolve(__dirname, "../docs"),
    clear: true,
    runOnCompile: false, // Don't run automatically - use npm run docgen instead
    templates: path.resolve(__dirname, "./templates"),
    pages: 'files',
    exclude: ['test/**', 'node_modules/**'],
    outputStructure: 'single',
    theme: 'markdown',
    collapseNewlines: true,
    pageExtension: '.md'
  }
};
