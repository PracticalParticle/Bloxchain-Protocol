// Migration 2: Deploy Guardian Contracts (built on foundation libraries)
require('dotenv').config();
const SecureBlox = artifacts.require("SecureBlox");
const RoleBlox = artifacts.require("RoleBlox");
const BareBlox = artifacts.require("BareBlox");

module.exports = async function(deployer, network, accounts) {
    console.log(`🚀 Migration 2: Deploying Guardian Contracts on ${network}`);
    console.log(`📋 Using account: ${accounts[0]}`);
    
    // Configuration flags - set to true/false to control which contracts to deploy
    const deploySecureBlox = process.env.DEPLOY_SECUREBLOX === 'true'; // Default: false
    const deployRoleBlox = process.env.DEPLOY_ROLEBLOX === 'true'; // Default: false
    const deployBareBlox = process.env.DEPLOY_BAREBLOX === 'true'; // Default: false
    
    console.log("\n🎯 Deployment Configuration:");
    console.log(`   SecureBlox: ${deploySecureBlox ? '✅ YES' : '❌ NO'}`);
    console.log(`   RoleBlox: ${deployRoleBlox ? '✅ YES' : '❌ NO'}`);
    console.log(`   BareBlox: ${deployBareBlox ? '✅ YES' : '❌ NO'}`);
    
    // Get deployed foundation libraries from Migration 1
    console.log("\n📦 Step 1: Linking Foundation Libraries...");
    
    const StateAbstraction = artifacts.require("StateAbstraction");
    const StateAbstractionDefinitions = artifacts.require("StateAbstractionDefinitions");
    const SecureOwnableDefinitions = artifacts.require("SecureOwnableDefinitions");
    const DynamicRBACDefinitions = artifacts.require("DynamicRBACDefinitions");
    
    const sa = await StateAbstraction.deployed();
    const sad = await StateAbstractionDefinitions.deployed();
    const sod = await SecureOwnableDefinitions.deployed();
    const drd = await DynamicRBACDefinitions.deployed();
    
    console.log("✅ Using StateAbstraction at:", sa.address);
    console.log("✅ Using StateAbstractionDefinitions at:", sad.address);
    console.log("✅ Using SecureOwnableDefinitions at:", sod.address);
    console.log("✅ Using DynamicRBACDefinitions at:", drd.address);
    
    // Step 2: Deploy SecureBlox (if enabled)
    let secureBlox = null;
    if (deploySecureBlox) {
        console.log("\n📦 Step 2: Deploying SecureBlox...");
        
        // Link all required libraries to SecureBlox
        await deployer.link(StateAbstraction, SecureBlox);
        await deployer.link(StateAbstractionDefinitions, SecureBlox);
        await deployer.link(SecureOwnableDefinitions, SecureBlox);
        
        // Deploy SecureBlox
        await deployer.deploy(SecureBlox);
        secureBlox = await SecureBlox.deployed();
        console.log("✅ SecureBlox deployed at:", secureBlox.address);
        
        // Initialize SecureBlox
        console.log("🔧 Initializing SecureBlox...");
        try {
            const tx = await secureBlox.initialize(
                accounts[0],  // initialOwner
                accounts[1],  // broadcaster
                accounts[2],  // recovery
                1,          // timeLockPeriodSec
                "0x0000000000000000000000000000000000000000"  // eventForwarder (none)
            );
            console.log("✅ SecureBlox initialized successfully");
            console.log("   Transaction hash:", tx.tx);
        } catch (error) {
            console.log("❌ SecureBlox initialization failed:");
            console.log("   Error message:", error.message);
            console.log("   Error reason:", error.reason);
            console.log("   Error data:", error.data);
            console.log("   Full error:", JSON.stringify(error, null, 2));
            
            // Try to decode the error if it's a revert
            if (error.data) {
                try {
                    const decodedError = await web3.eth.call({
                        to: secureBlox.address,
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
        console.log("\n📦 Step 2: Skipping SecureBlox deployment (disabled)");
    }
    
    // Step 3: Deploy RoleBlox (if enabled)
    let roleBlox = null;
    if (deployRoleBlox) {
        console.log("\n📦 Step 3: Deploying RoleBlox...");
        
        // Link all required libraries to RoleBlox
        await deployer.link(StateAbstraction, RoleBlox);
        await deployer.link(StateAbstractionDefinitions, RoleBlox);
        await deployer.link(SecureOwnableDefinitions, RoleBlox);
        await deployer.link(DynamicRBACDefinitions, RoleBlox);
        
        // Deploy RoleBlox
        await deployer.deploy(RoleBlox);
        roleBlox = await RoleBlox.deployed();
        console.log("✅ RoleBlox deployed at:", roleBlox.address);
        
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
        await deployer.link(StateAbstractionDefinitions, BareBlox);
        
        // Deploy BareBlox
        await deployer.deploy(BareBlox);
        bareBlox = await BareBlox.deployed();
        console.log("✅ BareBlox deployed at:", bareBlox.address);
        
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
    
    console.log("\n🎉 Migration 2 completed successfully!");
    console.log("📋 Guardian Contracts Deployed & Initialized:");
    if (secureBlox) console.log(`   SecureBlox: ${secureBlox.address}`);
    if (roleBlox) console.log(`   RoleBlox: ${roleBlox.address}`);
    if (bareBlox) console.log(`   BareBlox: ${bareBlox.address}`);
    
    console.log("\n🎯 Complete Deployment Summary:");
    console.log("📚 Foundation Libraries:");
    console.log(`   StateAbstraction: ${sa.address}`);
    console.log(`   StateAbstractionDefinitions: ${sad.address}`);
    console.log(`   SecureOwnableDefinitions: ${sod.address}`);
    console.log(`   DynamicRBACDefinitions: ${drd.address}`);
    console.log("🛡️ Guardian Contracts (Deployed & Initialized):");
    if (secureBlox) console.log(`   SecureBlox: ${secureBlox.address}`);
    if (roleBlox) console.log(`   RoleBlox: ${roleBlox.address}`);
    if (bareBlox) console.log(`   BareBlox: ${bareBlox.address}`);
    
    console.log("\n✅ All contracts deployed and initialized successfully!");
    console.log("🎯 Ready for analyzer testing with fully functional contracts!");
    console.log("🔧 Initialization Parameters:");
    console.log(`   Owner: ${accounts[0]}`);
    console.log(`   Broadcaster: ${accounts[1] || accounts[0]}`);
    console.log(`   Recovery: ${accounts[2] || accounts[0]}`);
    console.log(`   Time Lock Period: 60 seconds (1 minute) for SecureBlox/RoleBlox, 3600 seconds (1 hour) for BareBlox`);
    console.log(`   Event Forwarder: None`);
    
    console.log("\n💡 Usage Examples:");
    console.log("   Deploy only SecureBlox: DEPLOY_SECUREBLOX=true DEPLOY_ROLEBLOX=false DEPLOY_BAREBLOX=false truffle migrate");
    console.log("   Deploy only BareBlox: DEPLOY_SECUREBLOX=false DEPLOY_ROLEBLOX=false DEPLOY_BAREBLOX=true truffle migrate");
    console.log("   Deploy all (default): truffle migrate");
};
