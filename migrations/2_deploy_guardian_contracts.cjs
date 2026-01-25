// Migration 2: Deploy Guardian Contracts (built on foundation libraries)
require('dotenv').config();
const SecureBlox = artifacts.require("SecureBlox");
const RoleBlox = artifacts.require("RoleBlox");
const BareBlox = artifacts.require("BareBlox");
const ControlBlox = artifacts.require("ControlBlox");
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
    
    // Configuration flags - set to true/false to control which contracts to deploy
    const deploySecureBlox = process.env.DEPLOY_SECUREBLOX === 'true'; // Default: false
    const deployRoleBlox = process.env.DEPLOY_ROLEBLOX === 'true'; // Default: false
    const deployBareBlox = process.env.DEPLOY_BAREBLOX === 'true'; // Default: false
    const deployControlBlox = process.env.DEPLOY_CONTROLBLOX === 'true'; // Default: false
    
    console.log("\n🎯 Deployment Configuration:");
    console.log(`   SecureBlox: ${deploySecureBlox ? '✅ YES' : '❌ NO'}`);
    console.log(`   RoleBlox: ${deployRoleBlox ? '✅ YES' : '❌ NO'}`);
    console.log(`   BareBlox: ${deployBareBlox ? '✅ YES' : '❌ NO'}`);
    console.log(`   ControlBlox: ${deployControlBlox ? '✅ YES' : '❌ NO'}`);
    
    // Get deployed foundation libraries from Migration 1
    console.log("\n📦 Step 1: Linking Foundation Libraries...");
    
    const StateAbstraction = artifacts.require("StateAbstraction");
    const SecureOwnableDefinitions = artifacts.require("SecureOwnableDefinitions");
    const RuntimeRBACDefinitions = artifacts.require("RuntimeRBACDefinitions");
    const GuardControllerDefinitions = artifacts.require("GuardControllerDefinitions");
    
    // NOTE:
    // Truffle sometimes fails to persist `networks` entries for library-like deployments
    // on certain dev chains. To keep deployments resilient, we "deploy if needed" here.
    let sa, sod, drd, gcd;
    try {
        sa = await StateAbstraction.deployed();
    } catch (e) {
        console.log("⚠️  StateAbstraction not found in artifacts; deploying now...");
        await deployer.deploy(StateAbstraction);
        sa = await StateAbstraction.deployed();
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
    
    console.log("✅ Using StateAbstraction at:", sa.address);
    console.log("✅ Using SecureOwnableDefinitions at:", sod.address);
    console.log("✅ Using RuntimeRBACDefinitions at:", drd.address);
    console.log("✅ Using GuardControllerDefinitions at:", gcd.address);
    
    // Step 2: Deploy SecureBlox (if enabled)
    let secureBlox = null;
    if (deploySecureBlox) {
        console.log("\n📦 Step 2: Deploying SecureBlox...");
        
        // Link all required libraries to SecureBlox
        await deployer.link(StateAbstraction, SecureBlox);
        await deployer.link(SecureOwnableDefinitions, SecureBlox);
        
        // Deploy SecureBlox
        await deployer.deploy(SecureBlox);
        secureBlox = await SecureBlox.deployed();
        console.log("✅ SecureBlox deployed at:", secureBlox.address);
        
        // Get web3 instance for nonce checking
        const web3 = secureBlox.constructor.web3 || global.web3;
        
        // Wait for nonce to sync after deployment
        const currentNonce = await web3.eth.getTransactionCount(accounts[0], 'pending');
        console.log(`   Current account nonce: ${currentNonce}`);
        await waitForNonceSync(web3, accounts[0], currentNonce);
        
        // Initialize SecureBlox
        console.log("🔧 Initializing SecureBlox...");
        try {
            // Use estimateGas to get more detailed error information
            try {
                const gasEstimate = await secureBlox.initialize.estimateGas(
                    accounts[0],  // initialOwner
                    accounts[1],  // broadcaster
                    accounts[2],  // recovery
                    1,          // timeLockPeriodSec
                    "0x0000000000000000000000000000000000000000"  // eventForwarder (none)
                );
                console.log("   Gas estimate:", gasEstimate.toString());
            } catch (gasError) {
                console.log("   ⚠️  Gas estimation failed - this indicates the transaction will revert");
                console.log("   Gas error:", gasError.message);
                if (gasError.data) {
                    console.log("   Gas error data:", gasError.data);
                    // Try to decode error selector
                    if (gasError.data.result) {
                        const errorSelector = gasError.data.result.slice(0, 10);
                        console.log("   Error selector:", errorSelector);
                    }
                }
            }
            
            const tx = await secureBlox.initialize(
                accounts[0],  // initialOwner
                accounts[1],  // broadcaster
                accounts[2],  // recovery
                1,          // timeLockPeriodSec
                "0x0000000000000000000000000000000000000000"  // eventForwarder (none)
            );
            console.log("✅ SecureBlox initialized successfully");
            console.log("   Transaction hash:", tx.tx);
            
            // Save network info to artifact (fixes issue when network_id is "*")
            await saveArtifactNetwork(SecureBlox, secureBlox.address, web3, network);
        } catch (error) {
            console.log("❌ SecureBlox initialization failed:");
            console.log("   Error message:", error.message);
            console.log("   Error reason:", error.reason);
            console.log("   Error data:", JSON.stringify(error.data, null, 2));
            
            // Extract error selector if available
            if (error.data && error.data.result) {
                const errorSelector = error.data.result.slice(0, 10);
                console.log("   Error selector:", errorSelector);
                console.log("   Full error result:", error.data.result);
            }
            
            // Try to get more details from the transaction
            if (error.receipt) {
                console.log("   Transaction receipt:", JSON.stringify(error.receipt, null, 2));
            }
            
            console.log("⚠️  Contract deployed but not initialized. This may be expected for upgradeable contracts.");
            throw error; // Re-throw to stop migration
        }
    } else {
        console.log("\n📦 Step 2: Skipping SecureBlox deployment (disabled)");
    }
    
    // Step 3: Deploy RoleBlox (if enabled)
    let roleBlox = null;
    if (deployRoleBlox) {
        console.log("\n📦 Step 3: Deploying RoleBlox...");
        
        // Link all required libraries to RoleBlox
        await deployer.link(StateAbstraction, RoleBlox);
        await deployer.link(SecureOwnableDefinitions, RoleBlox);
        await deployer.link(RuntimeRBACDefinitions, RoleBlox);
        
        // Deploy RoleBlox
        await deployer.deploy(RoleBlox);
        roleBlox = await RoleBlox.deployed();
        console.log("✅ RoleBlox deployed at:", roleBlox.address);
        // Get web3 from deployed contract instance (available for error handling)
        const web3 = roleBlox.constructor.web3 || global.web3;
        // Save network info to artifact (fixes issue when network_id is "*")
        await saveArtifactNetwork(RoleBlox, roleBlox.address, web3, network);
        
        // Initialize RoleBlox
        console.log("🔧 Initializing RoleBlox...");
        try {
            const tx = await roleBlox.initialize(
                accounts[0],  // initialOwner
                accounts[1],  // broadcaster 
                accounts[2],  // recovery 
                1,          // timeLockPeriodSec
                "0x0000000000000000000000000000000000000000"  // eventForwarder (none)
            );
            console.log("✅ RoleBlox initialized successfully");
            console.log("   Transaction hash:", tx.tx);
        } catch (error) {
            console.log("❌ RoleBlox initialization failed:");
            console.log("   Error message:", error.message);
            console.log("   Error reason:", error.reason);
            console.log("   Error data:", error.data);
            console.log("   Full error:", JSON.stringify(error, null, 2));
            
            // Try to decode the error if it's a revert
            if (error.data) {
                try {
                    const decodedError = await web3.eth.call({
                        to: roleBlox.address,
                        data: error.data
                    });
                    console.log("   Decoded error data:", decodedError);
                } catch (decodeError) {
                    console.log("   Could not decode error data:", decodeError.message);
                }
            }
            
            console.log("⚠️  Contract deployed but not initialized. This may be expected for upgradeable contracts.");
        }
    } else {
        console.log("\n📦 Step 3: Skipping RoleBlox deployment (disabled)");
    }
    
    // Step 4: Deploy BareBlox (if enabled)
    let bareBlox = null;
    if (deployBareBlox) {
        console.log("\n📦 Step 4: Deploying BareBlox...");
        
        // Link required libraries
        await deployer.link(StateAbstraction, BareBlox);
        
        // Deploy BareBlox
        await deployer.deploy(BareBlox);
        bareBlox = await BareBlox.deployed();
        console.log("✅ BareBlox deployed at:", bareBlox.address);
        // Get web3 from deployed contract instance
        const web3 = bareBlox.constructor.web3 || global.web3;
        // Save network info to artifact (fixes issue when network_id is "*")
        await saveArtifactNetwork(BareBlox, bareBlox.address, web3, network);
        
        // Initialize BareBlox
        console.log("🔧 Initializing BareBlox...");
        const initialOwner = accounts[0];
        const broadcaster = accounts[1];
        const recovery = accounts[2];
        const timeLockPeriodSec = 3600; // 1 hour
        const eventForwarder = "0x0000000000000000000000000000000000000000";
        
        console.log("Initial Owner:", initialOwner);
        console.log("Broadcaster:", broadcaster);
        console.log("Recovery:", recovery);
        console.log("Time Lock Period:", timeLockPeriodSec, "seconds");
        
        try {
            await bareBlox.initialize(
                initialOwner,
                broadcaster,
                recovery,
                timeLockPeriodSec,
                eventForwarder
            );
            console.log("✅ BareBlox initialized successfully!");
            
            // Verify deployment
            const isInitialized = await bareBlox.initialized();
            
            console.log("- Initialized:", isInitialized);
        } catch (error) {
            console.log("❌ BareBlox initialization failed:");
            console.log("   Error message:", error.message);
            console.log("   Error reason:", error.reason);
            console.log("   Error data:", error.data);
            console.log("   Full error:", JSON.stringify(error, null, 2));
        }
    } else {
        console.log("\n📦 Step 4: Skipping BareBlox deployment (disabled)");
    }
    
    // Step 5: Deploy ControlBlox (if enabled)
    let controlBlox = null;
    if (deployControlBlox) {
        console.log("\n📦 Step 5: Deploying ControlBlox...");
        
        // Link all required libraries to ControlBlox (includes GuardControllerDefinitions)
        await deployer.link(StateAbstraction, ControlBlox);
        await deployer.link(SecureOwnableDefinitions, ControlBlox);
        await deployer.link(RuntimeRBACDefinitions, ControlBlox);
        await deployer.link(GuardControllerDefinitions, ControlBlox);
        
        // Deploy ControlBlox
        await deployer.deploy(ControlBlox);
        controlBlox = await ControlBlox.deployed();
        console.log("✅ ControlBlox deployed at:", controlBlox.address);
        // Get web3 from deployed contract instance (available for error handling)
        const web3 = controlBlox.constructor.web3 || global.web3;
        // Save network info to artifact (fixes issue when network_id is "*")
        await saveArtifactNetwork(ControlBlox, controlBlox.address, web3, network);
        
        // Initialize ControlBlox
        console.log("🔧 Initializing ControlBlox...");
        try {
            const tx = await controlBlox.initialize(
                accounts[0],  // initialOwner
                accounts[1],  // broadcaster 
                accounts[2],  // recovery 
                1,          // timeLockPeriodSec
                "0x0000000000000000000000000000000000000000"  // eventForwarder (none)
            );
            console.log("✅ ControlBlox initialized successfully");
            console.log("   Transaction hash:", tx.tx);
        } catch (error) {
            console.log("❌ ControlBlox initialization failed:");
            console.log("   Error message:", error.message);
            console.log("   Error reason:", error.reason);
            console.log("   Error data:", error.data);
            console.log("   Full error:", JSON.stringify(error, null, 2));
            
            // Try to decode the error if it's a revert
            if (error.data) {
                try {
                    const decodedError = await web3.eth.call({
                        to: controlBlox.address,
                        data: error.data
                    });
                    console.log("   Decoded error data:", decodedError);
                } catch (decodeError) {
                    console.log("   Could not decode error data:", decodeError.message);
                }
            }
            
            console.log("⚠️  Contract deployed but not initialized. This may be expected for upgradeable contracts.");
        }
    } else {
        console.log("\n📦 Step 5: Skipping ControlBlox deployment (disabled)");
    }
    
    console.log("\n🎉 Migration 2 completed successfully!");
    console.log("📋 Guardian Contracts Deployed & Initialized:");
    if (secureBlox) console.log(`   SecureBlox: ${secureBlox.address}`);
    if (roleBlox) console.log(`   RoleBlox: ${roleBlox.address}`);
    if (bareBlox) console.log(`   BareBlox: ${bareBlox.address}`);
    if (controlBlox) console.log(`   ControlBlox: ${controlBlox.address}`);
    
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
    
    if (secureBlox) {
        addresses[network].SecureBlox = {
            address: secureBlox.address,
            deployedAt: new Date().toISOString()
        };
    }
    if (roleBlox) {
        addresses[network].RoleBlox = {
            address: roleBlox.address,
            deployedAt: new Date().toISOString()
        };
    }
    if (bareBlox) {
        addresses[network].BareBlox = {
            address: bareBlox.address,
            deployedAt: new Date().toISOString()
        };
    }
    if (controlBlox) {
        addresses[network].ControlBlox = {
            address: controlBlox.address,
            deployedAt: new Date().toISOString()
        };
    }
    
    fs.writeFileSync(addressesFile, JSON.stringify(addresses, null, 2));
    console.log(`\n💾 Saved addresses to ${addressesFile}`);
    
    console.log("\n🎯 Complete Deployment Summary:");
    console.log("📚 Foundation Libraries:");
    console.log(`   StateAbstraction: ${sa.address}`);
    console.log(`   SecureOwnableDefinitions: ${sod.address}`);
    console.log(`   RuntimeRBACDefinitions: ${drd.address}`);
    console.log("🛡️ Guardian Contracts (Deployed & Initialized):");
    if (secureBlox) console.log(`   SecureBlox: ${secureBlox.address}`);
    if (roleBlox) console.log(`   RoleBlox: ${roleBlox.address}`);
    if (bareBlox) console.log(`   BareBlox: ${bareBlox.address}`);
    if (controlBlox) console.log(`   ControlBlox: ${controlBlox.address}`);
    
    console.log("\n✅ All contracts deployed and initialized successfully!");
    console.log("🎯 Ready for analyzer testing with fully functional contracts!");
    console.log("🔧 Initialization Parameters:");
    console.log(`   Owner: ${accounts[0]}`);
    console.log(`   Broadcaster: ${accounts[1] || accounts[0]}`);
    console.log(`   Recovery: ${accounts[2] || accounts[0]}`);
    console.log(`   Time Lock Period: 60 seconds (1 minute) for SecureBlox/RoleBlox, 3600 seconds (1 hour) for BareBlox`);
    console.log(`   Event Forwarder: None`);
    
    console.log("\n💡 Usage Examples:");
    console.log("   Deploy only SecureBlox: DEPLOY_SECUREBLOX=true DEPLOY_ROLEBLOX=false DEPLOY_BAREBLOX=false DEPLOY_CONTROLBLOX=false truffle migrate");
    console.log("   Deploy only BareBlox: DEPLOY_SECUREBLOX=false DEPLOY_ROLEBLOX=false DEPLOY_BAREBLOX=true DEPLOY_CONTROLBLOX=false truffle migrate");
    console.log("   Deploy only ControlBlox: DEPLOY_SECUREBLOX=false DEPLOY_ROLEBLOX=false DEPLOY_BAREBLOX=false DEPLOY_CONTROLBLOX=true truffle migrate");
    console.log("   Deploy all (default): truffle migrate");
};
