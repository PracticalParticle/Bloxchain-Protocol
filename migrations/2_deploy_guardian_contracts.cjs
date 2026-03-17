// Migration 2: Deploy Guardian Contracts (AccountBlox only)
require('dotenv').config({ quiet: true });
const AccountBlox = artifacts.require("AccountBlox");
const { saveArtifactNetwork } = require('./helpers/save-artifact-network.cjs');

// Helper function to wait for nonce to sync
async function waitForNonceSync(web3, address, expectedNonce, maxRetries = 10) {
    for (let i = 0; i < maxRetries; i++) {
        const currentNonce = await web3.eth.getTransactionCount(address, 'pending');
        if (currentNonce === expectedNonce) {
            return true;
        }
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    return false;
}

module.exports = async function(deployer, network, accounts) {
    console.log(`🚀 Migration 2: Deploying Guardian Contracts on ${network}`);
    console.log(`📋 Using account: ${accounts[0]}`);
    
    const deployAccountBlox = process.env.DEPLOY_ACCOUNTBLOX !== 'false'; // Default: true
    
    console.log("\n🎯 Deployment Configuration:");
    console.log(`   AccountBlox: ${deployAccountBlox ? '✅ YES' : '❌ NO'}`);
    
    // Get deployed foundation libraries from Migration 1
    console.log("\n📦 Step 1: Linking Foundation Libraries...");
    
    const EngineBlox = artifacts.require("EngineBlox");
    const SecureOwnableDefinitions = artifacts.require("SecureOwnableDefinitions");
    const RuntimeRBACDefinitions = artifacts.require("RuntimeRBACDefinitions");
    const GuardControllerDefinitions = artifacts.require("GuardControllerDefinitions");
    
    // NOTE:
    // Truffle sometimes fails to persist `networks` entries for library-like deployments
    // on certain dev chains. To keep deployments resilient, we "deploy if needed" here.
    let sa, sod, drd, gcd;
    try {
        sa = await EngineBlox.deployed();
    } catch (e) {
        console.log("⚠️  EngineBlox not found in artifacts; deploying now...");
        await deployer.deploy(EngineBlox);
        sa = await EngineBlox.deployed();
    }
    try {
        sod = await SecureOwnableDefinitions.deployed();
    } catch (e) {
        console.log("⚠️  SecureOwnableDefinitions not found in artifacts; deploying now...");
        await deployer.deploy(SecureOwnableDefinitions);
        sod = await SecureOwnableDefinitions.deployed();
    }
    try {
        drd = await RuntimeRBACDefinitions.deployed();
    } catch (e) {
        console.log("⚠️  RuntimeRBACDefinitions not found in artifacts; deploying now...");
        await deployer.deploy(RuntimeRBACDefinitions);
        drd = await RuntimeRBACDefinitions.deployed();
    }
    try {
        gcd = await GuardControllerDefinitions.deployed();
    } catch (e) {
        console.log("⚠️  GuardControllerDefinitions not found in artifacts; deploying now...");
        await deployer.deploy(GuardControllerDefinitions);
        gcd = await GuardControllerDefinitions.deployed();
    }
    
    console.log("✅ Using EngineBlox at:", sa.address);
    console.log("✅ Using SecureOwnableDefinitions at:", sod.address);
    console.log("✅ Using RuntimeRBACDefinitions at:", drd.address);
    console.log("✅ Using GuardControllerDefinitions at:", gcd.address);
    
    // Step 2: Deploy AccountBlox (if enabled)
    let accountBlox = null;
    if (deployAccountBlox) {
        console.log("\n📦 Step 2: Deploying AccountBlox...");
        
        // Link all required libraries to AccountBlox (includes GuardControllerDefinitions)
        await deployer.link(EngineBlox, AccountBlox);
        await deployer.link(SecureOwnableDefinitions, AccountBlox);
        await deployer.link(RuntimeRBACDefinitions, AccountBlox);
        await deployer.link(GuardControllerDefinitions, AccountBlox);
        
        // Deploy AccountBlox
        await deployer.deploy(AccountBlox);
        accountBlox = await AccountBlox.deployed();
        console.log("✅ AccountBlox deployed at:", accountBlox.address);

        // Get web3 from deployed contract instance (available for error handling)
        const web3 = accountBlox.constructor.web3 || global.web3;
        
        // Wait for nonce to sync after deployment
        const currentNonce = await web3.eth.getTransactionCount(accounts[0], 'pending');
        console.log(`   Current account nonce: ${currentNonce}`);
        const synced = await waitForNonceSync(web3, accounts[0], currentNonce);
        if (!synced) {
            console.log(`   ⚠️  Warning: Nonce sync failed after max retries, proceeding anyway`);
        }
        
        // Initialize AccountBlox
        console.log("🔧 Initializing AccountBlox...");
        try {
            const tx = await accountBlox.initialize(
                accounts[0],  // initialOwner
                accounts[1],  // broadcaster 
                accounts[2],  // recovery 
                1,          // timeLockPeriodSec
                "0x0000000000000000000000000000000000000000"  // eventForwarder (none)
            );
            console.log("✅ AccountBlox initialized successfully");
            console.log("   Transaction hash:", tx.tx);

            // Save network info to artifact only after successful initialization
            await saveArtifactNetwork(AccountBlox, accountBlox.address, web3, network);
        } catch (error) {
            console.log("❌ AccountBlox initialization failed:");
            console.log("   Error message:", error.message);
            console.log("   Error reason:", error.reason);
            console.log("   Error data:", error.data);
            console.log("   Full error:", JSON.stringify(error, null, 2));

            // If the provider threw a connection error after broadcasting the tx,
            // it's possible that the contract was actually initialized on-chain.
            // Check the owner() state to detect this and avoid double-initializing.
            let initializedOnChain = false;
            try {
                const currentOwner = await accountBlox.owner();
                if (currentOwner && currentOwner !== "0x0000000000000000000000000000000000000000") {
                    initializedOnChain = true;
                    console.log("⚠️  initialize() reported an error, but owner() is set on-chain:", currentOwner);
                    console.log("   Treating AccountBlox as initialized based on contract state.");
                } else {
                    console.log("   owner() check indicates AccountBlox is not initialized (owner is zero address).");
                }
            } catch (ownerCheckError) {
                console.log("   Additional owner() check failed:", ownerCheckError.message);
            }
            
            if (initializedOnChain) {
                // In this case, persist network info so sanity tests and tooling
                // can still discover the deployed/initialized contract.
                try {
                    await saveArtifactNetwork(AccountBlox, accountBlox.address, web3, network);
                    console.log("✅ Saved AccountBlox network info after owner() state check.");
                } catch (saveError) {
                    console.log("⚠️  Failed to save AccountBlox network info after owner() check:", saveError.message);
                }
            } else {
                // Try to decode the error if it's a revert
                if (error.data) {
                    try {
                        const decodedError = await web3.eth.call({
                            to: accountBlox.address,
                            data: error.data
                        });
                        console.log("   Decoded error data:", decodedError);
                    } catch (decodeError) {
                        console.log("   Could not decode error data:", decodeError.message);
                    }
                }
                
                console.log("⚠️  Contract deployed but not initialized. This must be resolved before using this deployment.");
                // Fail the migration so callers know initialization did not succeed
                throw new Error("AccountBlox initialization failed – migration aborted.");
            }
        }
    } else {
        console.log("\n📦 Step 2: Skipping AccountBlox deployment (disabled)");
    }
    
    console.log("\n🎉 Migration 2 completed successfully!");
    console.log("📋 Guardian Contracts Deployed & Initialized:");
    if (accountBlox) console.log(`   AccountBlox: ${accountBlox.address}`);
    
    // Save deployed addresses to file for auto mode fallback
    const fs = require('fs');
    const path = require('path');
    const addressesFile = path.join(__dirname, '..', 'deployed-addresses.json');
    
    let addresses = {};
    if (fs.existsSync(addressesFile)) {
        addresses = JSON.parse(fs.readFileSync(addressesFile, 'utf8'));
    }
    
    if (!addresses[network]) {
        addresses[network] = {};
    }
    
    if (accountBlox) {
        addresses[network].AccountBlox = {
            address: accountBlox.address,
            deployedAt: new Date().toISOString()
        };
    }
    
    fs.writeFileSync(addressesFile, JSON.stringify(addresses, null, 2));
    console.log(`\n💾 Saved addresses to ${addressesFile}`);
    
    console.log("\n🎯 Complete Deployment Summary:");
    console.log("📚 Foundation Libraries:");
    console.log(`   EngineBlox: ${sa.address}`);
    console.log(`   SecureOwnableDefinitions: ${sod.address}`);
    console.log(`   RuntimeRBACDefinitions: ${drd.address}`);
    console.log("🛡️ Guardian Contracts (Deployed & Initialized):");
    if (accountBlox) console.log(`   AccountBlox: ${accountBlox.address}`);
    
    console.log("\n✅ All contracts deployed and initialized successfully!");
    console.log("🔧 Initialization Parameters:");
    console.log(`   Owner: ${accounts[0]}`);
    console.log(`   Broadcaster: ${accounts[1] || accounts[0]}`);
    console.log(`   Recovery: ${accounts[2] || accounts[0]}`);
    console.log(`   Time Lock Period: 1 second`);
    console.log(`   Event Forwarder: None`);
    
    console.log("\n💡 Usage:");
    console.log("   Deploy AccountBlox (default): truffle migrate");
    console.log("   Skip AccountBlox: DEPLOY_ACCOUNTBLOX=false truffle migrate");
};
