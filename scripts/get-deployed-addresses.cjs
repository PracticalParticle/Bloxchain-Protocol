// SPDX-License-Identifier: MPL-2.0
// Script to display deployed contract addresses from Truffle artifacts and environment variables

const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

/**
 * @dev Extracts deployed contract addresses from Truffle migration artifacts
 */
function getDeployedAddresses() {
  console.log('🔍 Searching for deployed contract addresses...\n');
  
  const buildDir = path.join(__dirname, '../build/contracts');
  const addresses = {};
  
  try {
    // Check if build directory exists
    if (!fs.existsSync(buildDir)) {
      console.log('❌ Build directory not found. Please run "npm run compile:truffle" first.');
      return null;
    }
    
    // Read contract artifacts
    const contractFiles = fs.readdirSync(buildDir);
    
    for (const file of contractFiles) {
      if (file.endsWith('.json')) {
        const contractName = file.replace('.json', '');
        const artifactPath = path.join(buildDir, file);
        
        try {
          const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
          
          // Check if contract has deployed addresses
          if (artifact.networks) {
            for (const [networkId, networkData] of Object.entries(artifact.networks)) {
              if (networkData.address) {
                if (!addresses[networkId]) {
                  addresses[networkId] = {};
                }
                addresses[networkId][contractName] = networkData.address;
              }
            }
          }
        } catch (error) {
          console.warn(`⚠️ Could not read artifact for ${contractName}:`, error.message);
        }
      }
    }
    
    return addresses;
    
  } catch (error) {
    console.error('❌ Error reading contract artifacts:', error.message);
    return null;
  }
}

/**
 * @dev Displays deployed addresses in a formatted way
 */
function displayAddresses(addresses) {
  if (!addresses || Object.keys(addresses).length === 0) {
    console.log('❌ No deployed contracts found.');
    console.log('\n📋 To deploy contracts, run:');
    console.log('   npm run deploy:guardian');
    return;
  }
  
  console.log('✅ Deployed Contract Addresses:\n');
  
  for (const [networkId, contracts] of Object.entries(addresses)) {
    console.log(`🌐 Network ID: ${networkId}`);
    console.log('─'.repeat(50));
    
    // Group contracts by type
    const definitionLibraries = {};
    const guardianContracts = {};
    const exampleContracts = {};
    const tokenContracts = {};
    const integrationContracts = {};
    const otherContracts = {};
    
    for (const [contractName, address] of Object.entries(contracts)) {
      if (contractName.includes('Definitions') || contractName.includes('BaseDefinitionLoader')) {
        definitionLibraries[contractName] = address;
      } else if (
        contractName.includes('Guardian') ||
        contractName.endsWith('Blox')
      ) {
        guardianContracts[contractName] = address;
      } else if (
        contractName.includes('SimpleVault') ||
        contractName.includes('SimpleRWA20') ||
        contractName.includes('Example')
      ) {
        exampleContracts[contractName] = address;
      } else if (
        contractName.includes('BasicERC20') ||
        contractName.includes('ERC20')
      ) {
        tokenContracts[contractName] = address;
      } else if (
        contractName.includes('Safe') ||
        contractName.includes('Integration')
      ) {
        integrationContracts[contractName] = address;
      } else {
        otherContracts[contractName] = address;
      }
    }
    
    // Display definition libraries
    if (Object.keys(definitionLibraries).length > 0) {
      console.log('📚 Definition Libraries:');
      for (const [name, address] of Object.entries(definitionLibraries)) {
        console.log(`   ${name}: ${address}`);
      }
      console.log('');
    }

    // Display Guardian / Blox contracts
    if (Object.keys(guardianContracts).length > 0) {
      console.log('🛡️ Guardian / Blox Contracts:');
      for (const [name, address] of Object.entries(guardianContracts)) {
        console.log(`   ${name}: ${address}`);
      }
      console.log('');
    }
    
    // Display example stateful contracts
    if (Object.keys(exampleContracts).length > 0) {
      console.log('🧪 Example Contracts:');
      for (const [name, address] of Object.entries(exampleContracts)) {
        console.log(`   ${name}: ${address}`);
      }
      console.log('');
    }

    // Display token contracts (ERC20 etc.)
    if (Object.keys(tokenContracts).length > 0) {
      console.log('💰 Token Contracts:');
      for (const [name, address] of Object.entries(tokenContracts)) {
        console.log(`   ${name}: ${address}`);
      }
      console.log('');
    }

    // Display integration contracts
    if (Object.keys(integrationContracts).length > 0) {
      console.log('🔗 Integration Contracts:');
      for (const [name, address] of Object.entries(integrationContracts)) {
        console.log(`   ${name}: ${address}`);
      }
      console.log('');
    }
    
    // Display other contracts
    if (Object.keys(otherContracts).length > 0) {
      console.log('📦 Other Contracts:');
      for (const [name, address] of Object.entries(otherContracts)) {
        console.log(`   ${name}: ${address}`);
      }
      console.log('');
    }
  }
}

/**
 * @dev Displays environment variable configuration and verifies against artifacts
 */
function displayEnvironmentConfig(addresses) {
  console.log('📝 Environment Variable Configuration (Source of Truth):\n');
  
  const envConfig = {
    definitionLibraries: {
      MULTIPHASE_DEFINITIONS_ADDRESS: process.env.MULTIPHASE_DEFINITIONS_ADDRESS || 'Not set',
      SECURE_OWNABLE_DEFINITIONS_ADDRESS: process.env.SECURE_OWNABLE_DEFINITIONS_ADDRESS || 'Not set',
      RUNTIME_RBAC_DEFINITIONS_ADDRESS: process.env.RUNTIME_RBAC_DEFINITIONS_ADDRESS || 'Not set'
    },
    guardianContracts: {
      ACCOUNTBLOX_ADDRESS: process.env.ACCOUNTBLOX_ADDRESS || 'Not set'
    },
    exampleContracts: {
      SIMPLE_VAULT_ADDRESS: process.env.SIMPLE_VAULT_ADDRESS || 'Not set',
      SIMPLE_RWA20_ADDRESS: process.env.SIMPLE_RWA20_ADDRESS || 'Not set'
    },
    network: {
      REMOTE_HOST: process.env.REMOTE_HOST || 'Not set',
      REMOTE_PORT: process.env.REMOTE_PORT || 'Not set',
      REMOTE_NETWORK_ID: process.env.REMOTE_NETWORK_ID || 'Not set'
    }
  };
  
  console.log('📚 Definition Libraries:');
  for (const [key, value] of Object.entries(envConfig.definitionLibraries)) {
    console.log(`   ${key}: ${value}`);
  }
  console.log('');
  
  console.log('🛡️ Guardian Contracts:');
  for (const [key, value] of Object.entries(envConfig.guardianContracts)) {
    console.log(`   ${key}: ${value}`);
  }
  console.log('');
  
  console.log('📦 Example Contracts:');
  for (const [key, value] of Object.entries(envConfig.exampleContracts)) {
    console.log(`   ${key}: ${value}`);
  }
  console.log('');
  
  console.log('🌐 Network Configuration:');
  for (const [key, value] of Object.entries(envConfig.network)) {
    console.log(`   ${key}: ${value}`);
  }
  console.log('');
  
  // Verify addresses against artifacts if available
  if (addresses && Object.keys(addresses).length > 0) {
    console.log('🔍 Verification against Truffle Artifacts:');
    console.log('─'.repeat(50));
    
    const networkIds = Object.keys(addresses).map(id => parseInt(id)).sort((a, b) => b - a);
    const latestNetworkId = networkIds[0];
    const latestContracts = addresses[latestNetworkId.toString()];
    
    if (latestContracts) {
      const verifications = [
        { env: 'ACCOUNTBLOX_ADDRESS', artifact: latestContracts.AccountBlox },
        { env: 'SIMPLE_VAULT_ADDRESS', artifact: latestContracts.SimpleVault },
        { env: 'SIMPLE_RWA20_ADDRESS', artifact: latestContracts.SimpleRWA20 }
      ];
      
      for (const ver of verifications) {
        const envValue = process.env[ver.env];
        const artifactValue = ver.artifact;
        const status = envValue === artifactValue ? '✅' : '⚠️';
        console.log(`${status} ${ver.env}:`);
        console.log(`   .env: ${envValue || 'Not set'}`);
        console.log(`   Artifact: ${artifactValue || 'Not found'}`);
        console.log('');
      }
    }
  }
  
  console.log('📋 Usage in your scripts:');
  console.log('```javascript');
  console.log('require(\'dotenv\').config();');
  console.log('');
  console.log('const accountBloxAddress = process.env.ACCOUNTBLOX_ADDRESS;');
  console.log('const vaultAddress = process.env.SIMPLE_VAULT_ADDRESS;');
  console.log('// etc...');
  console.log('```');
}

/**
 * @dev Main execution
 */
function main() {
  console.log('🚀 Guardian Contract Address Extractor\n');
  
  // Display addresses from Truffle artifacts (if available)
  const addresses = getDeployedAddresses();
  displayAddresses(addresses);
  
  // Display environment variable configuration (source of truth) and verify against artifacts
  displayEnvironmentConfig(addresses);
  
  console.log('\n🎯 Next Steps:');
  console.log('1. Deploy contracts: npm run deploy:truffle');
  console.log('2. Update your .env file with the correct addresses');
  console.log('3. Use environment variables in your scripts');
  console.log('4. Run sanity tests: node scripts/sanity/run-all-sanity-tests.js');
}

// Run the script
main();
