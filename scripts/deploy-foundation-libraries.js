/**
 * Hardhat deployment script: Foundation libraries (production / public network).
 * Deploys: EngineBlox, SecureOwnableDefinitions, RuntimeRBACDefinitions, GuardControllerDefinitions.
 * Aligns with migrations/1_deploy_foundation_libraries.cjs and foundry.toml compiler config.
 * Uses viem (Hardhat 3 default) for deployment.
 *
 * Output: Writes deployed addresses to deployed-addresses.json (merged by network).
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
  if (!viem) {
    throw new Error(
      "Deployment requires Hardhat viem (conn.viem). " +
      "Ensure the Hardhat viem toolbox is configured and the network is connected. " +
      "Install it with: npm install --save-dev @nomicfoundation/hardhat-toolbox-viem"
    );
  }

  const wallet = await viem.getWalletClient();
  const deployerAddress = wallet?.account ? wallet.account.address : "N/A";
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
    try {
      existing = JSON.parse(fs.readFileSync(ADDRESSES_FILE, "utf8"));
    } catch (e) {
      console.warn(`⚠️ ${ADDRESSES_FILE} exists but is not valid JSON; using empty object. Error:`, e?.message ?? e);
    }
  }
  for (const net of Object.keys(addresses)) {
    existing[net] = { ...(existing[net] || {}), ...addresses[net] };
  }
  fs.writeFileSync(ADDRESSES_FILE, JSON.stringify(existing, null, 2));

  console.log("\n🎉 Foundation libraries deployment complete.");
  console.log("📋 Deployed addresses (logged to deployed-addresses.json):");
  for (const [name, addr] of Object.entries(deployed)) {
    console.log(`   ${name}: ${addr}`);
  }
  console.log(`\n💾 All deployed addresses saved to: ${path.resolve(ADDRESSES_FILE)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
