// Migration 1: Deploy Core Libraries and Definition Libraries (Foundation)
const SA = artifacts.require("StateAbstraction");
const SAD = artifacts.require("StateAbstractionDefinitions");
const SOD = artifacts.require("SecureOwnableDefinitions");
const DRD = artifacts.require("RuntimeRBACDefinitions");
const GCD = artifacts.require("GuardControllerDefinitions");

module.exports = async function(deployer, network, accounts) {
    console.log(`🚀 Migration 1: Deploying Foundation Libraries on ${network}`);
    console.log(`📋 Using account: ${accounts[0]}`);
    
    // Step 1: Deploy core libraries (no dependencies)
    console.log("\n📦 Step 1: Deploying Core Libraries...");
    
    // Deploy StateAbstraction (core library)
    await deployer.deploy(SA);
    const sa = await SA.deployed();
    console.log("✅ StateAbstraction deployed at:", sa.address);
    
    // Step 2: Deploy definition libraries (depend on core libraries)
    console.log("\n📦 Step 2: Deploying Definition Libraries...");
    
    // Deploy StateAbstractionDefinitions (no linking needed - it's a library)
    await deployer.deploy(SAD);
    const sad = await SAD.deployed();
    console.log("✅ StateAbstractionDefinitions deployed at:", sad.address);
    
    // Deploy SecureOwnableDefinitions (no linking needed - it's a library)
    await deployer.deploy(SOD);
    const sod = await SOD.deployed();
    console.log("✅ SecureOwnableDefinitions deployed at:", sod.address);
    
    // Deploy RuntimeRBACDefinitions (no linking needed - it's a library)
    await deployer.deploy(DRD);
    const drd = await DRD.deployed();
    console.log("✅ RuntimeRBACDefinitions deployed at:", drd.address);
    
    // Deploy GuardControllerDefinitions (no linking needed - it's a library)
    await deployer.deploy(GCD);
    const gcd = await GCD.deployed();
    console.log("✅ GuardControllerDefinitions deployed at:", gcd.address);
    
    console.log("\n🎉 Migration 1 completed successfully!");
    console.log("📋 Foundation Libraries Deployed:");
    console.log(`   StateAbstraction: ${sa.address}`);
    console.log(`   StateAbstractionDefinitions: ${sad.address}`);
    console.log(`   SecureOwnableDefinitions: ${sod.address}`);
    console.log(`   RuntimeRBACDefinitions: ${drd.address}`);
    console.log(`   GuardControllerDefinitions: ${gcd.address}`);
    console.log("\n🎯 Ready for Migration 2: Guardian Contracts");
};
