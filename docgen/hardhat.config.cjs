require("solidity-docgen");
const path = require("path");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.35",
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
    // Root at parent so contracts are "inside" the project; use --config hardhat.config.cjs so this CJS file is loaded
    root: path.resolve(__dirname, ".."),
    sources: path.resolve(__dirname, "../contracts"),
    tests: path.resolve(__dirname, "../test"),
    cache: path.resolve(__dirname, "../cache"),
    artifacts: path.resolve(__dirname, "../artifacts")
  },
  docgen: {
    // Relative to paths.root (repo root); use npm run docgen — not runOnCompile
    outputDir: "docs/_auto_generated_docs_",
    templates: path.resolve(__dirname, "./templates"),
    pages: 'files',
    exclude: ['test/**', 'node_modules/**'],
    theme: 'markdown',
    collapseNewlines: true,
    pageExtension: '.md'
  }
};
