/**
 * Hardhat deployment script: Foundation libraries (production / public network).
 * Deploys: EngineBlox, SecureOwnableDefinitions, RuntimeRBACDefinitions, GuardControllerDefinitions, AccountBlox.
 * Aligns with migrations/1_deploy_foundation_libraries.cjs, 2_deploy_guardian_contracts.cjs and foundry.toml compiler config.
 * Uses viem (Hardhat 3 default) for deployment.
 *
 * AccountBlox is deployed after the four libraries and linked to them, then initialized with the deployer as owner/broadcaster/recovery so the implementation cannot be taken by others (safe for use as clone source).
 *
 * Output: Writes deployed addresses to deployed-addresses.json (merged by network).
 *
 * Usage:
 *   Copy env.deployment.example to .env.deployment and set DEPLOY_RPC_URL, DEPLOY_PRIVATE_KEY.
 *   npx hardhat run scripts/deployment/deploy-foundation-libraries.js --network sepolia
 */

import { network } from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, "..", "..");
const ADDRESSES_FILE = path.join(ROOT_DIR, "deployed-addresses.json");

const FOUNDATION_LIBRARIES = [
  "EngineBlox",
  "SecureOwnableDefinitions",
  "RuntimeRBACDefinitions",
  "GuardControllerDefinitions",
];

const ACCOUNTBLOX_ARTIFACT_PATH = path.join(
  ROOT_DIR,
  "artifacts",
  "contracts",
  "examples",
  "templates",
  "AccountBlox.sol",
  "AccountBlox.json"
);

/**
 * Link library addresses into contract bytecode using artifact linkReferences.
 * @param {string} bytecode - Hex bytecode (with or without 0x)
 * @param {{ [source: string]: { [lib: string]: Array<{ start: number, length: number }> } }} linkReferences
 * @param {{ [name: string]: string }} libraryAddresses - Map of library contract name to deployed address
 * @returns {string} Linked bytecode (with 0x prefix)
 */
function linkBytecode(bytecode, linkReferences, libraryAddresses) {
  let code = bytecode.replace(/^0x/, "");
  for (const [, libs] of Object.entries(linkReferences || {})) {
    for (const [libName, refs] of Object.entries(libs)) {
      const addr = libraryAddresses[libName];
      if (!addr) throw new Error(`Missing library address for ${libName}`);
      const addrHex = addr.replace(/^0x/, "").toLowerCase().padStart(40, "0").slice(-40);
      for (const { start, length } of refs) {
        const startChar = start * 2;
        const endChar = startChar + length * 2;
        code = code.slice(0, startChar) + addrHex + code.slice(endChar);
      }
    }
  }
  return "0x" + code;
}

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

  let walletClient = await viem.getWalletClient();
  let deployerAccount = walletClient?.account;
  let publicClient = await viem.getPublicClient?.() ?? null;
  if (!deployerAccount) {
    const pk = process.env.DEPLOY_PRIVATE_KEY;
    const rpc = process.env.DEPLOY_RPC_URL;
    if (!pk || !rpc) {
      throw new Error(
        "Wallet client has no account. Set DEPLOY_PRIVATE_KEY and DEPLOY_RPC_URL in .env.deployment for HTTP networks."
      );
    }
    const { createWalletClient, createPublicClient, http } = await import("viem");
    const { privateKeyToAccount } = await import("viem/accounts");
    const chainId = parseInt(process.env.DEPLOY_CHAIN_ID || "11155111", 10);
    const chain =
      chainId === 11155111
        ? (await import("viem/chains")).sepolia
        : { id: chainId, name: "Custom", nativeCurrency: { decimals: 18, name: "Ether", symbol: "ETH" }, rpcUrls: { default: { http: [rpc] } } };
    deployerAccount = privateKeyToAccount(pk.startsWith("0x") ? pk : `0x${pk}`);
    walletClient = createWalletClient({ account: deployerAccount, chain, transport: http(rpc) });
    publicClient = createPublicClient({ chain, transport: http(rpc) });
  }
  if (!publicClient) {
    const rpc = process.env.DEPLOY_RPC_URL;
    const chainId = parseInt(process.env.DEPLOY_CHAIN_ID || "11155111", 10);
    const chain = chainId === 11155111 ? (await import("viem/chains")).sepolia : { id: chainId, name: "Custom", nativeCurrency: { decimals: 18, name: "Ether", symbol: "ETH" }, rpcUrls: { default: { http: [rpc] } } };
    const { createPublicClient, http } = await import("viem");
    publicClient = createPublicClient({ chain, transport: http(rpc || "http://127.0.0.1:8545") });
  }
  const { waitForTransactionReceipt } = await import("viem/actions");
  const deployerAddress = deployerAccount.address;
  console.log(`\n🚀 Deploying Foundation Libraries on ${networkName} (viem)`);
  console.log(`📋 Deployer: ${deployerAddress}\n`);

  const addresses = {};
  const deployed = {};

  for (const contractName of FOUNDATION_LIBRARIES) {
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

  // Deploy AccountBlox with libraries linked
  console.log(`📦 Deploying AccountBlox (linked to foundation libraries)...`);
  if (!fs.existsSync(ACCOUNTBLOX_ARTIFACT_PATH)) {
    throw new Error(
      `AccountBlox artifact not found at ${ACCOUNTBLOX_ARTIFACT_PATH}. Run "npx hardhat compile".`
    );
  }
  const accountBloxArtifact = JSON.parse(fs.readFileSync(ACCOUNTBLOX_ARTIFACT_PATH, "utf8"));
  const linkedBytecode = linkBytecode(
    accountBloxArtifact.bytecode,
    accountBloxArtifact.linkReferences,
    deployed
  );
  const { deployContract } = await import("viem/actions");
  const accountBloxHash = await deployContract(walletClient, {
    abi: accountBloxArtifact.abi,
    bytecode: linkedBytecode,
    account: deployerAccount,
    args: [],
  });
  const accountBloxReceipt = await waitForTransactionReceipt(publicClient, { hash: accountBloxHash });
  const accountBloxAddress = accountBloxReceipt.contractAddress;
  if (!accountBloxAddress) {
    throw new Error(`AccountBlox deployment tx ${accountBloxHash} did not return contractAddress.`);
  }
  deployed.AccountBlox = accountBloxAddress;
  console.log(`   ✅ AccountBlox: ${accountBloxAddress}`);

  // Save deployed addresses before initialization so a failed init does not lose them
  const now = new Date().toISOString();
  const networkKey = networkName;
  const addresses = {};
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
  console.log(`   💾 Deployed addresses saved (pre-init)`);

  // Initialize the implementation so it cannot be taken by others (one-shot initializer)
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
  console.log(`🔧 Initializing AccountBlox (deployer as owner/broadcaster/recovery)...`);
  const initHash = await walletClient.writeContract({
    address: accountBloxAddress,
    abi: accountBloxArtifact.abi,
    functionName: "initialize",
    args: [
      deployerAccount.address, // initialOwner
      deployerAccount.address, // broadcaster
      deployerAccount.address, // recovery
      1n, // timeLockPeriodSec
      ZERO_ADDRESS, // eventForwarder (none)
    ],
    account: deployerAccount,
  });
  await waitForTransactionReceipt(publicClient, { hash: initHash });
  console.log(`   ✅ AccountBlox initialized (tx: ${initHash})`);

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
