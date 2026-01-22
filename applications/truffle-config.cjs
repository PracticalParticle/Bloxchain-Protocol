/**
 * Shared Truffle Configuration for Guardian Protocol Applications
 * 
 * This configuration provides standardized settings for all applications
 * built on the Guardian Protocol framework. It includes proper import
 * remapping to access Guardian core contracts and optimized compiler settings.
 * 
 * Usage:
 * - From applications directory: truffle compile
 * - From individual app directory: truffle compile --config ../truffle-config.js
 * 
 * @author Particle Crypto Security
 * @version 1.0.0
 */

module.exports = {
  /**
   * Networks define how you connect to your ethereum client and let you set the
   * defaults web3 uses to send transactions. If you don't specify one truffle
   * will spin up a development blockchain for you on port 9545 when you
   * run `develop` or `test`. You can ask a truffle command to use a specific
   * network from the command line, e.g
   *
   * $ truffle test --network <network-name>
   */
  networks: {
    // Dynamic development network - automatically adapts based on environment variables
    // Local development: No environment variables set (defaults to localhost)
    // Remote development: Set REMOTE_HOST environment variable
    development: {
      host: process.env.REMOTE_HOST || "127.0.0.1",
      port: parseInt(process.env.REMOTE_PORT) || 8545,
      network_id: process.env.REMOTE_NETWORK_ID || "*",
      gas: process.env.REMOTE_GAS ? parseInt(process.env.REMOTE_GAS) : undefined,
      gasPrice: process.env.REMOTE_GAS_PRICE ? parseInt(process.env.REMOTE_GAS_PRICE) : undefined,
      from: process.env.REMOTE_FROM || undefined,
      // Enable detailed error reporting
      verbose: false,
      // Enable debug mode
      debug: true
    },
    
    // Add more networks as needed for specific applications
    // testnet: {
    //   provider: () => new HDWalletProvider(mnemonic, `https://testnet.infura.io/v3/${infuraKey}`),
    //   network_id: 3,
    //   gas: 5500000,
    //   confirmations: 2,
    //   timeoutBlocks: 200,
    //   skipDryRun: true
    // }
  },

  // Set default mocha options here, use special reporters etc.
  mocha: {
    timeout: 100000, // Increased timeout for application testing
    reporter: 'spec'
  },

  // Configure your compilers
  compilers: {
    solc: {
      version: "0.8.25", // Match Guardian Protocol version
      // docker: true,        // Use "0.5.1" you've installed locally with docker (default: false)
      settings: {          // See the solidity docs for advice about optimization and evmVersion
       optimizer: {
         enabled: true,
         runs: 200 // Higher runs for applications (vs 1 for core Guardian)
       },
       evmVersion: "shanghai"  // Minimum version that supports chainid and OpenZeppelin
      }
    }
  },

  // Truffle DB is currently disabled by default; to enable it, change enabled: false to enabled: true
  //
  // Note: if you migrated your contracts prior to enabling this field in your Truffle project and want
  // those previously migrated contracts available in the .db directory, you will need to run the following:
  // $ truffle migrate --reset --compile-all

  db: {
    enabled: false
  }, 

  plugins: ["truffle-contract-size"],

  /**
   * Contracts Directory
   * Each application should have its own contracts/ folder
   */
  contracts_directory: './contracts',
  
  /**
   * Build Directory
   * Compiled contracts will be placed in build/contracts/
   */
  contracts_build_directory: './build/contracts',
  
  /**
   * Import Remapping
   * Standardized paths to Guardian Protocol core contracts
   * All applications can use these imports to access Guardian functionality
   */
  import_remapping: [
    "@core/=../../contracts/core/",
    "@lib/=../../contracts/lib/",
    "@interfaces/=../../contracts/interfaces/",
    "@utils/=../../contracts/utils/"
  ]
};
