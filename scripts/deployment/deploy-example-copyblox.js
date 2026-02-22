/**
 * Hardhat deployment script: Example contracts (CopyBlox only).
 * Deploys CopyBlox (linked to EngineBlox) and initializes it.
 * Requires foundation libraries (at least EngineBlox) and optionally AccountBlox to be
 * already deployed on the same network; reads addresses from deployed-addresses.json.
 *
 * Aligns with migrations/3_deploy_example_contracts.cjs (CopyBlox step).
 * Uses viem (Hardhat 3 default) for deployment.
 *
 * Output: Merges CopyBlox address into deployed-addresses.json under the network key.
 *
 * Usage:
 *   Ensure foundation is deployed first: npx hardhat run scripts/deployment/deploy-foundation-libraries.js --network sepolia
 *   Then: npx hardhat run scripts/deployment/deploy-example-copyblox.js --network sepolia
 */

import { network } from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, "..", "..");
const ADDRESSES_FILE = path.join(ROOT_DIR, "deployed-addresses.json");

const COPYBLOX_ARTIFACT_PATH = path.join(
  ROOT_DIR,
  "artifacts",
  "contracts",
  "examples",
  "applications",
  "CopyBlox",
  "CopyBlox.sol",
  "CopyBlox.json"
);

/**
 * Link library addresses into contract bytecode using artifact linkReferences.
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
      "Ensure the Hardhat viem toolbox is configured. " +
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

  console.log(`\n🚀 Deploying example (CopyBlox) on ${networkName} (viem)`);
  console.log(`📋 Deployer: ${deployerAddress}\n`);

  // Load existing deployed addresses for this network (need EngineBlox)
  if (!fs.existsSync(ADDRESSES_FILE)) {
    throw new Error(
      `No deployed-addresses.json found at ${ADDRESSES_FILE}. Deploy foundation first (deploy-foundation-libraries.js).`
    );
  }
  const existing = JSON.parse(fs.readFileSync(ADDRESSES_FILE, "utf8"));
  const networkAddresses = existing[networkName];
  if (!networkAddresses?.EngineBlox?.address) {
    throw new Error(
      `EngineBlox not found for network "${networkName}" in deployed-addresses.json. Deploy foundation first.`
    );
  }
  const engineBloxAddress = networkAddresses.EngineBlox.address;

  // Deploy CopyBlox (links only EngineBlox)
  console.log(`📦 Deploying CopyBlox (linked to EngineBlox)...`);
  if (!fs.existsSync(COPYBLOX_ARTIFACT_PATH)) {
    throw new Error(
      `CopyBlox artifact not found at ${COPYBLOX_ARTIFACT_PATH}. Run "npx hardhat compile".`
    );
  }
  const copyBloxArtifact = JSON.parse(fs.readFileSync(COPYBLOX_ARTIFACT_PATH, "utf8"));
  const linkedBytecode = linkBytecode(
    copyBloxArtifact.bytecode,
    copyBloxArtifact.linkReferences,
    { EngineBlox: engineBloxAddress }
  );
  const { deployContract } = await import("viem/actions");
  const copyBloxHash = await deployContract(walletClient, {
    abi: copyBloxArtifact.abi,
    bytecode: linkedBytecode,
    account: deployerAccount,
    args: [],
  });
  const copyBloxReceipt = await waitForTransactionReceipt(publicClient, { hash: copyBloxHash });
  const copyBloxAddress = copyBloxReceipt.contractAddress;
  if (!copyBloxAddress) {
    throw new Error(`CopyBlox deployment tx ${copyBloxHash} did not return contractAddress.`);
  }
  console.log(`   ✅ CopyBlox: ${copyBloxAddress}`);

  // Initialize CopyBlox (dev-friendly: same address for owner/broadcaster/recovery, 1s timelock)
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
  console.log(`🔧 Initializing CopyBlox (deployer as owner/broadcaster/recovery, 1s timelock)...`);
  console.warn(`   ⚠️  Dev config: role separation disabled and short timelock. For production use distinct roles and a longer timeLockPeriodSec.`);
  const initHash = await walletClient.writeContract({
    address: copyBloxAddress,
    abi: copyBloxArtifact.abi,
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
  console.log(`   ✅ CopyBlox initialized (tx: ${initHash})`);

  const now = new Date().toISOString();
  const addresses = { [networkName]: { CopyBlox: { address: copyBloxAddress, deployedAt: now } } };
  const existingReread = JSON.parse(fs.readFileSync(ADDRESSES_FILE, "utf8"));
  existingReread[networkName] = { ...(existingReread[networkName] || {}), ...addresses[networkName] };
  fs.writeFileSync(ADDRESSES_FILE, JSON.stringify(existingReread, null, 2));

  console.log("\n🎉 Example (CopyBlox) deployment complete.");
  console.log(`   CopyBlox: ${copyBloxAddress}`);
  console.log(`\n💾 Addresses saved to: ${path.resolve(ADDRESSES_FILE)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
