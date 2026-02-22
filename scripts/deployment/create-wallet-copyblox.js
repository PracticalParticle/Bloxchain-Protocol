/**
 * Interactive script: create a new wallet (clone) via CopyBlox.
 * Uses the deployer key from .env.deployment. Prompts for:
 *   - Network (default from DEPLOY_NETWORK_NAME or sepolia)
 *   - Choice: basic wallet (AccountBlox clone) or custom blox (user provides implementation address)
 *   - Initialization: initialOwner, broadcaster, recovery, timeLockPeriodSec
 * Then calls CopyBlox.cloneBlox(...) and prints the new clone address.
 *
 * Usage (from repo root):
 *   node scripts/deployment/create-wallet-copyblox.js
 *   npm run create-wallet
 * Non-interactive (defaults): CREATE_WALLET_USE_DEFAULTS=1 node scripts/deployment/create-wallet-copyblox.js
 * Ensure .env.deployment has DEPLOY_RPC_URL, DEPLOY_PRIVATE_KEY, and optionally DEPLOY_NETWORK_NAME.
 */

import { createInterface } from "readline";
import { config } from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, "..", "..");
const ENV_DEPLOYMENT = path.join(ROOT_DIR, ".env.deployment");
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

config({ path: ENV_DEPLOYMENT });

function question(rl, prompt, defaultValue = "") {
  const p = defaultValue !== "" ? `${prompt} [${defaultValue}]: ` : `${prompt}: `;
  return new Promise((resolve) => rl.question(p, (answer) => resolve((answer && answer.trim()) || defaultValue)));
}

function isAddress(s) {
  return /^0x[a-fA-F0-9]{40}$/.test(s);
}

async function main() {
  const useDefaults = process.env.CREATE_WALLET_USE_DEFAULTS === "1" || process.env.CREATE_WALLET_USE_DEFAULTS === "true";
  const rl = useDefaults ? null : createInterface({ input: process.stdin, output: process.stdout });

  const ask = async (prompt, defaultValue) => (rl ? question(rl, prompt, defaultValue) : Promise.resolve(defaultValue));

  console.log("\n🪙 Create a new wallet with CopyBlox\n");
  console.log("This script uses your .env.deployment deployer key to call CopyBlox.cloneBlox().");
  console.log("You can deploy a basic wallet (AccountBlox) or clone any other compatible blox.\n");

  if (!process.env.DEPLOY_PRIVATE_KEY || !process.env.DEPLOY_RPC_URL) {
    console.error("Missing DEPLOY_PRIVATE_KEY or DEPLOY_RPC_URL in .env.deployment.");
    if (rl) rl.close();
    process.exit(1);
  }

  if (!fs.existsSync(ADDRESSES_FILE)) {
    console.error("deployed-addresses.json not found. Deploy foundation and CopyBlox first.");
    if (rl) rl.close();
    process.exit(1);
  }
  const addressesByNetwork = JSON.parse(fs.readFileSync(ADDRESSES_FILE, "utf8"));
  const networkList = Object.keys(addressesByNetwork).filter(
    (n) => addressesByNetwork[n].CopyBlox?.address && addressesByNetwork[n].AccountBlox?.address
  );
  if (networkList.length === 0) {
    console.error("No network in deployed-addresses.json has both CopyBlox and AccountBlox. Deploy them first.");
    if (rl) rl.close();
    process.exit(1);
  }

  const defaultNetwork = process.env.DEPLOY_NETWORK_NAME || "sepolia";
  const networkPrompt = networkList.includes(defaultNetwork)
    ? `Network (${networkList.join(", ")})`
    : `Network (${networkList.join(", ")})`;
  let network = await ask(networkPrompt, defaultNetwork);
  if (!addressesByNetwork[network]) {
    network = networkList[0];
    console.log(`Using network: ${network}`);
  }
  const copyBloxAddress = addressesByNetwork[network].CopyBlox?.address;
  const accountBloxAddress = addressesByNetwork[network].AccountBlox?.address;
  if (!copyBloxAddress || !accountBloxAddress) {
    console.error(`Network "${network}" is missing CopyBlox or AccountBlox in deployed-addresses.json.`);
    if (rl) rl.close();
    process.exit(1);
  }

  console.log("\nChoose what to clone:");
  console.log("  1) Basic wallet (AccountBlox) – recommended for getting started");
  console.log("  2) Custom blox (you provide the implementation contract address)");
  const choice = await ask("Enter 1 or 2", "1");
  let bloxAddress;
  if (choice === "2") {
    bloxAddress = await ask("Blox implementation address (0x...)");
    if (!isAddress(bloxAddress)) {
      console.error("Invalid address.");
      if (rl) rl.close();
      process.exit(1);
    }
  } else {
    bloxAddress = accountBloxAddress;
    console.log(`Using AccountBlox: ${bloxAddress}`);
  }

  const chainId = parseInt(process.env.DEPLOY_CHAIN_ID || "11155111", 10);
  const rpc = process.env.DEPLOY_RPC_URL;
  const pk = process.env.DEPLOY_PRIVATE_KEY.startsWith("0x") ? process.env.DEPLOY_PRIVATE_KEY : `0x${process.env.DEPLOY_PRIVATE_KEY}`;
  const { createWalletClient, createPublicClient, http } = await import("viem");
  const { privateKeyToAccount } = await import("viem/accounts");
  const { waitForTransactionReceipt } = await import("viem/actions");
  const chain =
    chainId === 11155111
      ? (await import("viem/chains")).sepolia
      : { id: chainId, name: "Custom", nativeCurrency: { decimals: 18, name: "Ether", symbol: "ETH" }, rpcUrls: { default: { http: [rpc] } } };
  const deployerAccount = privateKeyToAccount(pk);
  const walletClient = createWalletClient({ account: deployerAccount, chain, transport: http(rpc) });
  const publicClient = createPublicClient({ chain, transport: http(rpc) });
  const deployerAddr = deployerAccount.address;

  if (useDefaults) console.log("Using defaults (CREATE_WALLET_USE_DEFAULTS): owner=broadcaster=recovery=deployer, timeLock=1");
  console.log("\nInitialization parameters (press Enter to use default):");
  const initialOwner = await ask("Initial owner address", deployerAddr);
  const broadcaster = await ask("Broadcaster address", deployerAddr);
  const recovery = await ask("Recovery address", deployerAddr);
  const timeLockSecStr = await ask("Time lock period (seconds)", "1");
  const timeLockPeriodSec = BigInt(timeLockSecStr || "1");

  if (!isAddress(initialOwner) || !isAddress(broadcaster) || !isAddress(recovery)) {
    console.error("Owner, broadcaster, and recovery must be valid 0x... addresses.");
    if (rl) rl.close();
    process.exit(1);
  }

  if (rl) rl.close();

  const copyBloxArtifact = JSON.parse(fs.readFileSync(COPYBLOX_ARTIFACT_PATH, "utf8"));
  const abi = copyBloxArtifact.abi;

  console.log("\n📤 Calling CopyBlox.cloneBlox()...");
  const hash = await walletClient.writeContract({
    address: copyBloxAddress,
    abi,
    functionName: "cloneBlox",
    args: [bloxAddress, initialOwner, broadcaster, recovery, timeLockPeriodSec],
    account: deployerAccount,
  });
  console.log(`   Tx hash: ${hash}`);
  const receipt = await waitForTransactionReceipt(publicClient, { hash });
  const bloxClonedLog = receipt.logs?.find(
    (l) => l.address?.toLowerCase() === copyBloxAddress.toLowerCase() && l.topics?.length === 4
  );
  const topicClone = bloxClonedLog?.topics?.[2];
  const cloneFromTopic = topicClone ? "0x" + (topicClone.length === 66 ? topicClone.slice(26) : topicClone.slice(-40)).toLowerCase() : null;
  if (cloneFromTopic) {
    console.log("\n✅ New wallet (clone) deployed:");
    console.log(`   Address: ${cloneFromTopic}`);
    if (chainId === 11155111) {
      console.log(`   Explorer: https://sepolia.etherscan.io/address/${cloneFromTopic}`);
    }
  } else {
    console.log("\n✅ Clone transaction confirmed. Check CopyBlox.getCloneAtIndex(getCloneCount()-1) for the new address.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
