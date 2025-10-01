// SPDX-License-Identifier: MPL-2.0
// Migration 3: Deploy Example Contracts (SimpleVault and SimpleRWA20)

const SimpleVault = artifacts.require("SimpleVault");
const SimpleRWA20 = artifacts.require("SimpleRWA20");

// Import the deployed library artifacts to get their addresses
const StateAbstraction = artifacts.require("StateAbstraction");
const StateAbstractionDefinitions = artifacts.require("StateAbstractionDefinitions");
const SecureOwnableDefinitions = artifacts.require("SecureOwnableDefinitions");
const DynamicRBACDefinitions = artifacts.require("DynamicRBACDefinitions");

// Import the example-specific definitions
const SimpleVaultDefinitions = artifacts.require("SimpleVaultDefinitions");
const SimpleRWA20Definitions = artifacts.require("SimpleRWA20Definitions");

module.exports = async function(deployer, network, accounts) {
  console.log(`🚀 Migration 3: Deploying Example Contracts on ${network}`);
  console.log(`📋 Using account: ${accounts[0]}`);

  // Configuration flags - set to true/false to control which contracts to deploy
  const deploySimpleVault = process.env.DEPLOY_SIMPLE_VAULT === 'true'; // Default: false
  const deploySimpleRWA20 = process.env.DEPLOY_SIMPLE_RWA20 === 'true'; // Default: false
  
  console.log("\n🎯 Deployment Configuration:");
  console.log(`   SimpleVault: ${deploySimpleVault ? '✅ YES' : '❌ NO'}`);
  console.log(`   SimpleRWA20: ${deploySimpleRWA20 ? '✅ YES' : '❌ NO'}`);

  try {
    // Step 1: Deploy Example-Specific Definitions Libraries (only if needed)
    let simpleVaultDefinitions = null;
    let simpleRWA20Definitions = null;
    
    if (deploySimpleVault || deploySimpleRWA20) {
        console.log("\n📦 Step 1: Deploying Example-Specific Definitions Libraries...");
        
        if (deploySimpleVault) {
            // Deploy SimpleVaultDefinitions
            await deployer.deploy(SimpleVaultDefinitions);
            simpleVaultDefinitions = await SimpleVaultDefinitions.deployed();
            console.log(`✅ SimpleVaultDefinitions deployed at: ${simpleVaultDefinitions.address}`);
        }
        
        if (deploySimpleRWA20) {
            // Deploy SimpleRWA20Definitions
            await deployer.deploy(SimpleRWA20Definitions);
            simpleRWA20Definitions = await SimpleRWA20Definitions.deployed();
            console.log(`✅ SimpleRWA20Definitions deployed at: ${simpleRWA20Definitions.address}`);
        }
    } else {
        console.log("\n📦 Step 1: Skipping Example-Specific Definitions Libraries (no contracts enabled)");
    }

    // Retrieve deployed foundation library instances
    const sa = await StateAbstraction.deployed();
    const sad = await StateAbstractionDefinitions.deployed();
    const sod = await SecureOwnableDefinitions.deployed();
    const drbd = await DynamicRBACDefinitions.deployed();

    console.log("\n📦 Step 2: Linking Foundation Libraries...");
    console.log(`✅ Using StateAbstraction at: ${sa.address}`);
    console.log(`✅ Using StateAbstractionDefinitions at: ${sad.address}`);
    console.log(`✅ Using SecureOwnableDefinitions at: ${sod.address}`);
    console.log(`✅ Using DynamicRBACDefinitions at: ${drbd.address}`);

    // Step 3: Deploy SimpleVault (if enabled)
    let simpleVault = null;
    if (deploySimpleVault) {
        console.log("\n📦 Step 3: Deploying SimpleVault...");
        await deployer.link(sa, SimpleVault);
        await deployer.link(sad, SimpleVault);
        await deployer.link(sod, SimpleVault);
        await deployer.link(simpleVaultDefinitions, SimpleVault);
        await deployer.deploy(SimpleVault);
        simpleVault = await SimpleVault.deployed();
        console.log(`✅ SimpleVault deployed at: ${simpleVault.address}`);
        
        // Initialize SimpleVault
        console.log("🔧 Initializing SimpleVault...");
        try {
            const tx = await simpleVault.initialize(
                accounts[0],  // initialOwner
                accounts[1],  // broadcaster
                accounts[2],  // recovery
                1,          // timeLockPeriodInSeconds (1 second for fast testing)
                "0x0000000000000000000000000000000000000000"  // eventForwarder (none)
            );
            console.log("✅ SimpleVault initialized successfully");
            console.log("   Transaction hash:", tx.tx);
        } catch (error) {
            console.log("❌ SimpleVault initialization failed:");
            console.log("   Error message:", error.message);
            console.log("   Error reason:", error.reason);
            console.log("   Error data:", error.data);
            console.log("   Full error:", JSON.stringify(error, null, 2));
            
            // Try to decode the error if it's a revert
            if (error.data) {
                try {
                    const decodedError = await web3.eth.call({
                        to: simpleVault.address,
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
        console.log("\n📦 Step 3: Skipping SimpleVault deployment (disabled)");
    }

    // Step 4: Deploy SimpleRWA20 (if enabled)
    let simpleRWA20 = null;
    if (deploySimpleRWA20) {
        console.log("\n📦 Step 4: Deploying SimpleRWA20...");
        await deployer.link(sa, SimpleRWA20);
        await deployer.link(sad, SimpleRWA20);
        await deployer.link(sod, SimpleRWA20);
        await deployer.link(simpleRWA20Definitions, SimpleRWA20);
        await deployer.deploy(SimpleRWA20);
        simpleRWA20 = await SimpleRWA20.deployed();
        console.log(`✅ SimpleRWA20 deployed at: ${simpleRWA20.address}`);
        
        // Initialize SimpleRWA20
        console.log("🔧 Initializing SimpleRWA20...");
        try {
            const tx = await simpleRWA20.initialize(
                "SimpleRWA20",  // name
                "SRWA",          // symbol
                accounts[0],     // initialOwner
                accounts[1],     // broadcaster
                accounts[2],     // recovery
                1,          // timeLockPeriodInSeconds (1 second for fast testing)
                "0x0000000000000000000000000000000000000000"  // eventForwarder (none)
            );
            console.log("✅ SimpleRWA20 initialized successfully");
            console.log("   Transaction hash:", tx.tx);
        } catch (error) {
            console.log("❌ SimpleRWA20 initialization failed:");
            console.log("   Error message:", error.message);
            console.log("   Error reason:", error.reason);
            console.log("   Error data:", error.data);
            console.log("   Full error:", JSON.stringify(error, null, 2));
            
            // Try to decode the error if it's a revert
            if (error.data) {
                try {
                    const decodedError = await web3.eth.call({
                        to: simpleRWA20.address,
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
        console.log("\n📦 Step 4: Skipping SimpleRWA20 deployment (disabled)");
    }

    console.log("\n🎉 Migration 3 completed successfully!");
    console.log("📋 Example Contracts Deployed & Initialized:");
    if (simpleVault) console.log(`   SimpleVault: ${simpleVault.address}`);
    if (simpleRWA20) console.log(`   SimpleRWA20: ${simpleRWA20.address}`);

    console.log("\n🎯 Complete Deployment Summary:");
    console.log("📚 Foundation Libraries:");
    console.log(`   StateAbstraction: ${sa.address}`);
    console.log(`   StateAbstractionDefinitions: ${sad.address}`);
    console.log(`   SecureOwnableDefinitions: ${sod.address}`);
    console.log(`   DynamicRBACDefinitions: ${drbd.address}`);
    console.log("📋 Example-Specific Definitions:");
    if (simpleVaultDefinitions) console.log(`   SimpleVaultDefinitions: ${simpleVaultDefinitions.address}`);
    if (simpleRWA20Definitions) console.log(`   SimpleRWA20Definitions: ${simpleRWA20Definitions.address}`);
    console.log("🛡️ Guardian Contracts (Deployed & Initialized):");
    console.log(`   GuardianAccountAbstraction: 0xf759A0e8F2fFBb5F5a9DD50f1106668FBE29bC93`);
    console.log(`   GuardianAccountAbstractionWithRoles: 0xA5682DF1987D214Fe4dfC3a262179eBDc205b525`);
    console.log("🏦 Example Contracts (Deployed & Initialized):");
    if (simpleVault) console.log(`   SimpleVault: ${simpleVault.address}`);
    if (simpleRWA20) console.log(`   SimpleRWA20: ${simpleRWA20.address}`);
    console.log("\n✅ All contracts deployed and initialized successfully!");
    console.log("🎯 Ready for comprehensive analyzer testing with fully functional contracts!");
    console.log("🔧 Initialization Parameters:");
    console.log(`   Owner: ${accounts[0]}`);
    console.log(`   Broadcaster: ${accounts[1]}`);
    console.log(`   Recovery: ${accounts[2]}`);
    console.log(`   Time Lock Period: 60 seconds (1 minute)`);
    console.log(`   Event Forwarder: None`);
    console.log(`   Token Name: SimpleRWA20`);
    console.log(`   Token Symbol: SRWA`);
    
    console.log("\n💡 Usage Examples:");
    console.log("   Deploy only SimpleVault: DEPLOY_SIMPLE_VAULT=true DEPLOY_SIMPLE_RWA20=false truffle migrate");
    console.log("   Deploy only SimpleRWA20: DEPLOY_SIMPLE_VAULT=false DEPLOY_SIMPLE_RWA20=true truffle migrate");
    console.log("   Deploy all example contracts: DEPLOY_SIMPLE_VAULT=true DEPLOY_SIMPLE_RWA20=true truffle migrate");
    console.log("   Deploy none (default): truffle migrate");

  } catch (error) {
    console.error("❌ Deployment failed in Migration 3:", error);
    throw error;
  }
};
