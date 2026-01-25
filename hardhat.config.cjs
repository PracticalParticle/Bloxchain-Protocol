/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
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
  libraries: {
    TokenInventoryLib: "0x0000000000000000000000000000000000000000" // Placeholder address
  }
};
