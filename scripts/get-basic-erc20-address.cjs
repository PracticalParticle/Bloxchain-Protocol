/**
 * Script to get the deployed BasicERC20 address
 * Reads from deployed-addresses.json or from Truffle artifacts
 */

const fs = require('fs');
const path = require('path');

function getBasicERC20Address() {
    // Try to read from deployed-addresses.json first
    const addressesFile = path.join(__dirname, '..', 'deployed-addresses.json');
    
    if (fs.existsSync(addressesFile)) {
        try {
            const addresses = JSON.parse(fs.readFileSync(addressesFile, 'utf8'));
            const network = process.env.NETWORK || 'development';
            
            if (addresses[network] && addresses[network].BasicERC20) {
                const info = addresses[network].BasicERC20;
                console.log('📋 BasicERC20 Deployment Information:');
                console.log('='.repeat(60));
                console.log(`   Network: ${network}`);
                console.log(`   Address: ${info.address}`);
                console.log(`   Name: ${info.name}`);
                console.log(`   Symbol: ${info.symbol}`);
                console.log(`   Total Supply: ${info.totalSupply}`);
                console.log(`   Deployed At: ${info.deployedAt}`);
                console.log('='.repeat(60));
                return info.address;
            }
        } catch (error) {
            console.log('⚠️  Could not read deployed-addresses.json, trying Truffle artifacts...');
        }
    }
    
    // Fallback: Try to read from Truffle artifacts
    const artifactsPath = path.join(__dirname, '..', 'build', 'contracts', 'BasicERC20.json');
    
    if (fs.existsSync(artifactsPath)) {
        try {
            const artifact = JSON.parse(fs.readFileSync(artifactsPath, 'utf8'));
            const network = process.env.NETWORK || 'development';
            const networkId = process.env.NETWORK_ID || '1768150199366'; // Default Ganache network ID
            
            if (artifact.networks && artifact.networks[networkId]) {
                const address = artifact.networks[networkId].address;
                console.log('📋 BasicERC20 Address (from Truffle artifacts):');
                console.log('='.repeat(60));
                console.log(`   Network: ${network} (ID: ${networkId})`);
                console.log(`   Address: ${address}`);
                console.log('='.repeat(60));
                return address;
            }
        } catch (error) {
            console.error('❌ Could not read Truffle artifacts:', error.message);
        }
    }
    
    console.error('❌ BasicERC20 address not found!');
    console.error('   Make sure you have deployed the contract first using:');
    console.error('   npm run deploy:basic-erc20');
    console.error('   or');
    console.error('   npx truffle migrate --network development');
    
    return null;
}

// Run if called directly
if (require.main === module) {
    getBasicERC20Address();
}

module.exports = getBasicERC20Address;
