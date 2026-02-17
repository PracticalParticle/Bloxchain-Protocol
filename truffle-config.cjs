/**
 * Use this file to configure your truffle project. It's seeded with some
 * common settings for different networks and features like migrations,
 * compilation and testing. Uncomment the ones you need or modify
 * them to suit your project as necessary.
 *
 * More information about configuration can be found at:
 *
 * trufflesuite.com/docs/advanced/configuration
 *
 * To deploy via Infura you'll need a wallet provider (like @truffle/hdwallet-provider)
 * to sign your transactions before they're sent to a remote public node. Infura accounts
 * are available for free at: infura.io/register.
 *
 * You'll also need a mnemonic - the twelve word phrase the wallet uses to generate
 * public/private key pairs. If you're publishing your code to GitHub make sure you load this
 * phrase from a file you've .gitignored so it doesn't accidentally become public.
 *
 * ============================================================================
 * TRUFFLE DEPENDENCIES (Optional - for local development only)
 * ============================================================================
 * To use Truffle with this project, install the following dependencies:
 *
 *   npm install --save-dev truffle@^5.11.5 truffle-assertions@^0.9.2 truffle-contract-size@^2.0.1
 *
 * Note: These dependencies are not included in the main package.json to avoid
 * security warnings in the official repository. They are only needed if you
 * want to use Truffle for compilation, testing, or deployment.
 *
 * Additionally, if you're writing Truffle tests, you may also need:
 *
 *   npm install --save-dev @openzeppelin/test-helpers@^0.5.16
 *
 * Note: @openzeppelin/test-helpers is deprecated and pulls in Truffle dependencies.
 * It's been replaced in the main package.json with Hardhat alternatives:
 * @nomicfoundation/hardhat-chai-matchers and @nomicfoundation/hardhat-network-helpers
 * for better security and modern tooling support.
 *
 */

// Load environment variables from .env file
require('dotenv').config();

// Helper function to create provider URL
function getProviderUrl() {
  // If RPC_URL is provided, use it directly
  if (process.env.RPC_URL) {
    return process.env.RPC_URL;
  }
  
  // Determine protocol (default to https for remote, http for local)
  const protocol = process.env.REMOTE_HOST ? (process.env.REMOTE_PROTOCOL || 'https') : 'http';
  const host = process.env.REMOTE_HOST || "127.0.0.1";
  const port = parseInt(process.env.REMOTE_PORT) || 8545;
  
  return `${protocol}://${host}:${port}`;
}

// Helper function to create network configuration
function createNetworkConfig() {
  // Use "*" so Truffle accepts whatever network id the provider returns (Ganache uses dynamic ids).
  // Set REMOTE_NETWORK_ID only if you need to pin a specific chain for non-migrate tooling.
  const config = {
    network_id: "*",
    gas: process.env.REMOTE_GAS ? parseInt(process.env.REMOTE_GAS) : undefined,
    gasPrice: process.env.REMOTE_GAS_PRICE ? parseInt(process.env.REMOTE_GAS_PRICE) : undefined,
    from: process.env.REMOTE_FROM || undefined,
    verbose: false,
    debug: true
  };
  
  // If using custom URL with provider, construct it
  const providerUrl = getProviderUrl();
  
  // Use provider property for custom URLs (supports HTTPS)
  if (providerUrl !== `http://127.0.0.1:8545`) {
    config.provider = () => {
      const Web3 = require('web3');
      const web3 = new Web3(providerUrl);
      // Return the provider object, not the web3 instance
      return web3.currentProvider;
    };
  } else {
    // For localhost, use host/port (defaults to HTTP)
    config.host = process.env.REMOTE_HOST || "127.0.0.1";
    config.port = parseInt(process.env.REMOTE_PORT) || 8545;
  }
  
  return config;
}

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
    // Supports both HTTP and HTTPS based on REMOTE_PROTOCOL or RPC_URL
    development: createNetworkConfig(),
    

    // Useful for testing. The `development` name is special - truffle uses it by default
    // if it's defined here and no other network is specified at the command line.
    // You should run a client (like ganache-cli, geth or parity) in a separate terminal
    // tab if you use this network and you must also set the `host`, `port` and `network_id`
    // options below to some value.
    //
    // development: {
    //  host: "127.0.0.1",     // Localhost (default: none)
    //  port: 8545,            // Standard Ethereum port (default: none)
    //  network_id: "*",       // Any network (default: none)
    // },
    // Another network with more advanced options...
    // advanced: {
    // port: 8777,             // Custom port
    // network_id: 1342,       // Custom network
    // gas: 8500000,           // Gas sent with each transaction (default: ~6700000)
    // gasPrice: 20000000000,  // 20 gwei (in wei) (default: 100 gwei)
    // from: <address>,        // Account to send txs from (default: accounts[0])
    // websocket: true        // Enable EventEmitter interface for web3 (default: false)
    // },
    // Useful for deploying to a public network.
    // NB: It's important to wrap the provider as a function.
    // ropsten: {
    // provider: () => new HDWalletProvider(mnemonic, `https://ropsten.infura.io/v3/YOUR-PROJECT-ID`),
    // network_id: 3,       // Ropsten's id
    // gas: 5500000,        // Ropsten has a lower block limit than mainnet
    // confirmations: 2,    // # of confs to wait between deployments. (default: 0)
    // timeoutBlocks: 200,  // # of blocks before a deployment times out  (minimum/default: 50)
    // skipDryRun: true     // Skip dry run before migrations? (default: false for public nets )
    // },
    // Useful for private networks
    // private: {
    // provider: () => new HDWalletProvider(mnemonic, `https://network.io`),
    // network_id: 2111,   // This network is yours, in the cloud.
    // production: true    // Treats this network as if it was a public net. (default: false)
    // }
  },

  // Set default mocha options here, use special reporters etc.
  mocha: {
    // timeout: 100000
  },

  // Configure your compilers
  compilers: {
    solc: {
      version: "0.8.33",
      // docker: true,        // Use "0.5.1" you've installed locally with docker (default: false)
      settings: {          // See the solidity docs for advice about optimization and evmVersion
       optimizer: {
         enabled: true,
         runs: 200
       },
       viaIR: true,  // Enable IR-based code generator to handle deep stack issues
       evmVersion: "shanghai"  // Compatible with Truffle 5.11.5 (osaka not supported by Truffle)
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

  plugins: ["truffle-contract-size"]
};
