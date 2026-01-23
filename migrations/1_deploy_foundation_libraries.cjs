// Migration 1: Deploy Core Libraries and Definition Libraries (Foundation)
const SA = artifacts.require("StateAbstraction");
const SOD = artifacts.require("SecureOwnableDefinitions");
const DRD = artifacts.require("RuntimeRBACDefinitions");
const GCD = artifacts.require("GuardControllerDefinitions");
const { saveArtifactNetwork } = require('./helpers/save-artifact-network.cjs');

module.exports = async function(deployer, network, accounts) {
    console.log(`🚀 Migration 1: Deploying Foundation Libraries on ${network}`);
    console.log(`📋 Using account: ${accounts[0]}`);
    
    // Step 1: Deploy core libraries (no dependencies)
    console.log("\n📦 Step 1: Deploying Core Libraries...");
    
    // Deploy StateAbstraction (core library)
    await deployer.deploy(SA);
    const sa = await SA.deployed();
    console.log("✅ StateAbstraction deployed at:", sa.address);
    
    // Get web3 instance from deployed contract (Truffle makes it available via constructor)
    const web3 = sa.constructor.web3 || global.web3;
    // Save network info to artifact (fixes issue when network_id is "*")
    await saveArtifactNetwork(SA, sa.address, web3, network);
    
    // Step 2: Deploy definition libraries (depend on core libraries)
    console.log("\n📦 Step 2: Deploying Definition Libraries...");
    
    // Deploy SecureOwnableDefinitions (no linking needed - it's a library)
    await deployer.deploy(SOD);
    const sod = await SOD.deployed();
    console.log("✅ SecureOwnableDefinitions deployed at:", sod.address);
    await saveArtifactNetwork(SOD, sod.address, web3, network);
    
    // Deploy RuntimeRBACDefinitions (no linking needed - it's a library)
    await deployer.deploy(DRD);
    const drd = await DRD.deployed();
    console.log("✅ RuntimeRBACDefinitions deployed at:", drd.address);
    await saveArtifactNetwork(DRD, drd.address, web3, network);
    
    // Deploy GuardControllerDefinitions (no linking needed - it's a library)
    await deployer.deploy(GCD);
    const gcd = await GCD.deployed();
    console.log("✅ GuardControllerDefinitions deployed at:", gcd.address);
    await saveArtifactNetwork(GCD, gcd.address, web3, network);
    
    console.log("\n🎉 Migration 1 completed successfully!");
    console.log("📋 Foundation Libraries Deployed:");
    console.log(`   StateAbstraction: ${sa.address}`);
    console.log(`   SecureOwnableDefinitions: ${sod.address}`);
    console.log(`   RuntimeRBACDefinitions: ${drd.address}`);
    console.log(`   GuardControllerDefinitions: ${gcd.address}`);
    
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
    
    addresses[network].StateAbstraction = {
        address: sa.address,
        deployedAt: new Date().toISOString()
    };
    addresses[network].SecureOwnableDefinitions = {
        address: sod.address,
        deployedAt: new Date().toISOString()
    };
    addresses[network].RuntimeRBACDefinitions = {
        address: drd.address,
        deployedAt: new Date().toISOString()
    };
    addresses[network].GuardControllerDefinitions = {
        address: gcd.address,
        deployedAt: new Date().toISOString()
    };
    
    fs.writeFileSync(addressesFile, JSON.stringify(addresses, null, 2));
    console.log(`\n💾 Saved addresses to ${addressesFile}`);
    
    console.log("\n🎯 Ready for Migration 2: Guardian Contracts");
};
