// Migration 4: Deploy Basic ERC20 Token
const BasicERC20 = artifacts.require("BasicERC20");
const { saveArtifactNetwork } = require('./helpers/save-artifact-network.cjs');
const path = require('path');
const fs = require('fs');

module.exports = async function(deployer, network, accounts) {
    console.log(`🚀 Migration 4: Deploying Basic ERC20 Token on ${network}`);
    console.log(`📋 Using account: ${accounts[0]}`);
    
    // Get web3 instance from artifacts
    const web3 = artifacts.web3;
    
    // Load deployed addresses to use latest AccountBlox as minter (BasicERC20 deploys after AccountBlox)
    const addressesFile = path.join(__dirname, '..', 'deployed-addresses.json');
    let addresses = {};
    if (fs.existsSync(addressesFile)) {
        addresses = JSON.parse(fs.readFileSync(addressesFile, 'utf8'));
    }
    const accountBloxAddress = addresses[network]?.AccountBlox?.address;
    
    // Minter: AccountBlox if available, else env ERC20_MINTER, else deployer
    const minterAddress = accountBloxAddress || process.env.ERC20_MINTER || accounts[0];
    const minterSource = accountBloxAddress ? 'AccountBlox' : (process.env.ERC20_MINTER ? 'ERC20_MINTER' : 'deployer');
    
    // Configuration - can be customized via environment variables
    const tokenName = process.env.ERC20_NAME || "Basic Token";
    const tokenSymbol = process.env.ERC20_SYMBOL || "BASIC";
    const totalSupply = process.env.ERC20_TOTAL_SUPPLY || "1000000000000000000000000"; // 1,000,000 tokens (18 decimals)
    
    console.log("\n🎯 Token Configuration:");
    console.log(`   Name: ${tokenName}`);
    console.log(`   Symbol: ${tokenSymbol}`);
    console.log(`   Total Supply: ${totalSupply} (${(BigInt(totalSupply) / BigInt(10**18)).toString()} tokens with 18 decimals)`);
    console.log(`   Initial Holder: ${accounts[0]}`);
    console.log(`   Minter Address: ${minterAddress} (source: ${minterSource})`);
    
    try {
        console.log("\n📦 Deploying BasicERC20...");
        
        // Deploy the BasicERC20 contract
        await deployer.deploy(
            BasicERC20,
            tokenName,
            tokenSymbol,
            totalSupply,
            minterAddress
        );
        
        const basicERC20 = await BasicERC20.deployed();
        
        // Get web3 from deployed contract instance
        const web3 = basicERC20.constructor.web3 || global.web3;
        // Save network info to artifact (fixes issue when network_id is "*")
        await saveArtifactNetwork(BasicERC20, basicERC20.address, web3, network);
        
        // Verify minter role was granted
        const MINTER_ROLE = await basicERC20.MINTER_ROLE();
        const hasMinterRole = await basicERC20.hasRole(MINTER_ROLE, minterAddress);
        const minter = await basicERC20.minter();
        
        console.log("\n✅ BasicERC20 deployed successfully!");
        console.log("=".repeat(80));
        console.log(`📋 Contract Address: ${basicERC20.address}`);
        console.log(`📋 Token Name: ${tokenName}`);
        console.log(`📋 Token Symbol: ${tokenSymbol}`);
        console.log(`📋 Total Supply: ${totalSupply}`);
        console.log(`📋 Initial Balance: ${await basicERC20.balanceOf(accounts[0])}`);
        console.log(`📋 Minter Address: ${minter}`);
        console.log(`📋 Minter Role Granted: ${hasMinterRole ? '✅ YES' : '❌ NO'}`);
        console.log(`📋 MINTER_ROLE: ${MINTER_ROLE}`);
        console.log("=".repeat(80));
        
        // Save the address to a file for easy access (reload to merge with any concurrent updates)
        if (!addresses[network]) {
            addresses[network] = {};
        }
        addresses[network].BasicERC20 = {
            address: basicERC20.address,
            name: tokenName,
            symbol: tokenSymbol,
            totalSupply: totalSupply,
            minter: minterAddress,
            minterSource: minterSource,
            minterRole: MINTER_ROLE,
            deployedAt: new Date().toISOString()
        };
        
        fs.writeFileSync(addressesFile, JSON.stringify(addresses, null, 2));
        console.log(`\n💾 Saved address to ${addressesFile}`);
        
        return basicERC20;
        
    } catch (error) {
        console.error("\n❌ Deployment failed:");
        console.error(`   Error: ${error.message}`);
        if (error.reason) {
            console.error(`   Reason: ${error.reason}`);
        }
        throw error;
    }
};
