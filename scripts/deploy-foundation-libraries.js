/**
 * Hardhat deployment script: Foundation libraries (production / public network).
 * Deploys: EngineBlox, SecureOwnableDefinitions, RuntimeRBACDefinitions, GuardControllerDefinitions.
 * Aligns with migrations/1_deploy_foundation_libraries.cjs and foundry.toml compiler config.
 * Uses viem (Hardhat 3 default); fallback to ethers if available.
 *
 * Usage:
 *   Copy env.deployment.example to .env.deployment and set DEPLOY_RPC_URL, DEPLOY_PRIVATE_KEY.
 *   npx hardhat run scripts/deploy-foundation-libraries.js --network sepolia
 */

import { network } from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, "..");
const ADDRESSES_FILE = path.join(ROOT_DIR, "deployed-addresses.json");

const FOUNDATION_CONTRACTS = [
  "EngineBlox",
  "SecureOwnableDefinitions",
  "RuntimeRBACDefinitions",
  "GuardControllerDefinitions",
];

async function main() {
  const conn = await network.connect();
  const { networkName } = conn;
  const viem = conn.viem;
  const ethers = conn.ethers;

  let deployerAddress = "N/A";
  if (viem) {
    const wallet = await viem.getWalletClient();
    if (wallet?.account) deployerAddress = wallet.account.address;
    console.log(`\n🚀 Deploying Foundation Libraries on ${networkName} (viem)`);
    console.log(`📋 Deployer: ${deployerAddress}\n`);

    const addresses = {};
    const deployed = {};

    for (const contractName of FOUNDATION_CONTRACTS) {
      console.log(`📦 Deploying ${contractName}...`);
      const lib = await viem.deployContract(contractName);
      if (!lib) {
        throw new Error(`deployContract("${contractName}") returned undefined. Run "npx hardhat compile" and ensure the contract artifact exists.`);
      }
      const addr = lib.address ?? lib.contractAddress;
      if (!addr) {
        throw new Error(`deployContract("${contractName}") returned contract with no address. Keys: ${Object.keys(lib).join(", ")}`);
      }
      deployed[contractName] = addr;
      console.log(`   ✅ ${contractName}: ${addr}`);
    }

    const now = new Date().toISOString();
    const networkKey = networkName;
    for (const [name, address] of Object.entries(deployed)) {
      if (!addresses[networkKey]) addresses[networkKey] = {};
      addresses[networkKey][name] = { address, deployedAt: now };
    }

    let existing = {};
    if (fs.existsSync(ADDRESSES_FILE)) {
      existing = JSON.parse(fs.readFileSync(ADDRESSES_FILE, "utf8"));
    }
    for (const net of Object.keys(addresses)) {
      existing[net] = { ...(existing[net] || {}), ...addresses[net] };
    }
    fs.writeFileSync(ADDRESSES_FILE, JSON.stringify(existing, null, 2));

    console.log("\n🎉 Foundation libraries deployment complete.");
    console.log("📋 Addresses:");
    for (const [name, addr] of Object.entries(deployed)) {
      console.log(`   ${name}: ${addr}`);
    }
    console.log(`\n💾 Saved to ${ADDRESSES_FILE}`);
    return;
  }

  if (ethers && typeof ethers.getSigners === "function") {
    const deployer = (await ethers.getSigners())[0];
    deployerAddress = await deployer.getAddress();
  }
  console.log(`\n🚀 Deploying Foundation Libraries on ${networkName}`);
  console.log(`📋 Deployer: ${deployerAddress}\n`);

  const addresses = {};
  const deployed = {};

  for (const contractName of FOUNDATION_CONTRACTS) {
    console.log(`📦 Deploying ${contractName}...`);
    const lib = await ethers.deployContract(contractName);
    await lib.waitForDeployment();
    const addr = await lib.getAddress();
    deployed[contractName] = addr;
    console.log(`   ✅ ${contractName}: ${addr}`);
  }

  const now = new Date().toISOString();
  const networkKey = networkName;

  for (const [name, address] of Object.entries(deployed)) {
    if (!addresses[networkKey]) addresses[networkKey] = {};
    addresses[networkKey][name] = { address, deployedAt: now };
  }

  let existing = {};
  if (fs.existsSync(ADDRESSES_FILE)) {
    existing = JSON.parse(fs.readFileSync(ADDRESSES_FILE, "utf8"));
  }
  for (const net of Object.keys(addresses)) {
    existing[net] = { ...(existing[net] || {}), ...addresses[net] };
  }
  fs.writeFileSync(ADDRESSES_FILE, JSON.stringify(existing, null, 2));

  console.log("\n🎉 Foundation libraries deployment complete.");
  console.log("📋 Addresses:");
  for (const [name, addr] of Object.entries(deployed)) {
    console.log(`   ${name}: ${addr}`);
  }
  console.log(`\n💾 Saved to ${ADDRESSES_FILE}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
