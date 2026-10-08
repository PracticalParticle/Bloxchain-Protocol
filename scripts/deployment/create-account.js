/**
 * Create a governed account on a supported network.
 *
 * Default path: BasicFactory → BasicAccount, using the shared addresses in
 * official-deployed-addresses.json. The deployer key is the owner (the factory requires it).
 * Choose a new address on every call (cloneBlox) or a deterministic address
 * (cloneBloxDeterministic). Time-lock is 1 to 90 days.
 * CREATE_ACCOUNT_DETERMINISTIC=1 selects the deterministic mint when defaults are on.
 * CREATE_ACCOUNT_INDEX and CREATE_ACCOUNT_SALT set that mint (default index 0, salt zero).
 *
 * Experimental path (Sepolia only): CopyBlox clones the 1-second AccountBlox template.
 * Set CREATE_ACCOUNT_EXPERIMENTAL=1. The guided menu does not offer it.
 *
 * Guided (`npm run create-account`):
 *   Pick a network by number. Chain id comes from official-deployed-addresses.json.
 *   A built-in public RPC is used when one is known. DEPLOY_RPC_URL overrides it only
 *   when that URL is the same chain.
 *   Recommended key source: DEPLOY_PRIVATE_KEY in gitignored .env.deployment.
 *   Typing a key at the prompt is warned: shell history can keep it.
 *   https://bloxchain.app is the path that never sees the key.
 *
 * Developer, non-interactive:
 *   CREATE_ACCOUNT_USE_DEFAULTS=1 npm run create-account
 *   Requires DEPLOY_PRIVATE_KEY, DEPLOY_RPC_URL, and DEPLOY_NETWORK_NAME.
 *   Optional: BLOX_BROADCASTER_ADDRESS, BLOX_RECOVERY_ADDRESS, BLOX_TIMELOCK_SECONDS,
 *   CREATE_ACCOUNT_DETERMINISTIC, CREATE_ACCOUNT_INDEX, CREATE_ACCOUNT_SALT,
 *   CREATE_ACCOUNT_EXPERIMENTAL (Sepolia only; hidden from the guided menu).
 *   Older CREATE_WALLET_* names are still accepted.
 */

import { createInterface } from "readline";
import { config } from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createPublicClient, createWalletClient, decodeEventLog, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { waitForTransactionReceipt } from "viem/actions";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, "..", "..");
const ENV_DEPLOYMENT = path.join(ROOT_DIR, ".env.deployment");
const OFFICIAL_FILE = path.join(ROOT_DIR, "official-deployed-addresses.json");
const BASIC_FACTORY_ABI = JSON.parse(
  fs.readFileSync(path.join(ROOT_DIR, "abi", "BasicFactory.abi.json"), "utf8")
);
const COPYBLOX_ABI = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, "abi", "CopyBlox.abi.json"), "utf8"));

const DAY = 86400n;
const MAX_TIMELOCK = 90n * DAY;
const SEPOLIA_KEY = "sepolia";
const ZERO_SALT = `0x${"00".repeat(32)}`;

/** Display order. A network is a mainnet and its testnet where one is declared. */
const MAINNETS = [
  ["mainnet", "Ethereum"],
  ["base", "Base"],
  ["optimism", "Optimism"],
  ["arbitrum", "Arbitrum One"],
  ["polygon", "Polygon PoS"],
  ["bsc", "BNB Smart Chain"],
  ["avalanche", "Avalanche C-Chain"],
  ["arc", "Arc"],
  ["robinhood", "Robinhood"],
];

const TESTNETS = [
  ["sepolia", "Sepolia"],
  ["base-sepolia", "Base Sepolia"],
  ["optimism-sepolia", "Optimism Sepolia"],
  ["arbitrum-sepolia", "Arbitrum Sepolia"],
  ["arc-testnet", "Arc Testnet"],
  ["robinhood-testnet", "Robinhood Testnet"],
];

/** Public endpoints for the guided path. Networks absent here ask for a URL. */
const PUBLIC_RPC = {
  mainnet: "https://ethereum-rpc.publicnode.com",
  sepolia: "https://ethereum-sepolia-rpc.publicnode.com",
  base: "https://mainnet.base.org",
  "base-sepolia": "https://sepolia.base.org",
  optimism: "https://mainnet.optimism.io",
  "optimism-sepolia": "https://sepolia.optimism.io",
  arbitrum: "https://arb1.arbitrum.io/rpc",
  "arbitrum-sepolia": "https://sepolia-rollup.arbitrum.io/rpc",
  polygon: "https://polygon-bor-rpc.publicnode.com",
  bsc: "https://bsc-dataseed.binance.org",
  avalanche: "https://api.avax.network/ext/bc/C/rpc",
};

config({ path: ENV_DEPLOYMENT });

function envFlag(name) {
  const value = process.env[`CREATE_ACCOUNT_${name}`] || process.env[`CREATE_WALLET_${name}`];
  return value === "1" || value === "true";
}

function envText(name) {
  const current = process.env[`CREATE_ACCOUNT_${name}`];
  if (current !== undefined && current !== "") return current;
  return process.env[`CREATE_WALLET_${name}`];
}

function question(rl, prompt, defaultValue = "") {
  const p = defaultValue !== "" ? `${prompt} [${defaultValue}]: ` : `${prompt}: `;
  return new Promise((resolve) => rl.question(p, (answer) => resolve((answer && answer.trim()) || defaultValue)));
}

function isAddress(s) {
  return /^0x[a-fA-F0-9]{40}$/.test(s);
}

function labelFor(key) {
  const row = [...MAINNETS, ...TESTNETS].find(([networkKey]) => networkKey === key);
  return row ? row[1] : key;
}

function normalizeKey(raw) {
  const text = String(raw || "").trim();
  if (!text || text === "your_deployer_private_key_here") return null;
  const hex = text.startsWith("0x") ? text : `0x${text}`;
  if (!/^0x[0-9a-fA-F]{64}$/.test(hex)) return null;
  return hex;
}

function isYes(raw) {
  const text = String(raw || "").trim().toLowerCase();
  return text === "y" || text === "yes";
}

function parseIndex(raw) {
  const text = String(raw ?? "").trim();
  if (!/^\d+$/.test(text)) return null;
  return BigInt(text);
}

function parseSalt(raw) {
  const text = String(raw ?? "").trim();
  if (!/^0x[0-9a-fA-F]{64}$/.test(text)) return null;
  return text;
}

function chainFor(chainId, name, rpc) {
  return {
    id: chainId,
    name,
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [rpc] } },
  };
}

function gasLimitFor(official, networkKey) {
  const overlay = official.networks[networkKey]?.gas?.BasicFactory?.sendWithGasLimit;
  const catalog = official.catalog?.contracts?.BasicFactory?.gas?.sendWithGasLimit;
  const limit = overlay ?? catalog ?? 16777216;
  return BigInt(limit);
}

function listNetworks(official) {
  const lines = [];
  const keys = [];
  lines.push("Mainnets:");
  for (const [key, label] of MAINNETS) {
    const row = official.networks[key];
    if (!row || row.status !== "official") continue;
    keys.push(key);
    lines.push(`  ${keys.length}) ${label} (${key}, chain ${row.chainId})`);
  }
  lines.push("Testnets:");
  for (const [key, label] of TESTNETS) {
    const row = official.networks[key];
    if (!row || row.status !== "official") continue;
    keys.push(key);
    lines.push(`  ${keys.length}) ${label} (${key}, chain ${row.chainId})`);
  }
  return { keys, text: lines.join("\n") };
}

function resolveNetworkKey(official, answer, keys) {
  const raw = String(answer || "").trim();
  const asIndex = Number(raw);
  if (Number.isInteger(asIndex) && asIndex >= 1 && asIndex <= keys.length) return keys[asIndex - 1];
  if (official.networks[raw]?.status === "official") return raw;
  return null;
}

function cloneFromReceipt(receipt, factory, abi) {
  for (const log of receipt.logs || []) {
    if (log.address?.toLowerCase() !== factory.toLowerCase()) continue;
    try {
      const decoded = decodeEventLog({ abi, data: log.data, topics: log.topics });
      if (decoded.eventName === "BloxCloned" && decoded.args?.clone) return decoded.args.clone;
    } catch {
      /* other logs */
    }
  }
  return null;
}

async function readChainId(url, chainId, name) {
  const client = createPublicClient({ chain: chainFor(chainId, name, url), transport: http(url) });
  return client.getChainId();
}

async function main() {
  const useDefaults = envFlag("USE_DEFAULTS");
  const experimental = envFlag("EXPERIMENTAL");
  const rl = useDefaults ? null : createInterface({ input: process.stdin, output: process.stdout });
  const ask = async (prompt, defaultValue) => (rl ? question(rl, prompt, defaultValue) : Promise.resolve(defaultValue));
  const fail = (message) => {
    console.error(message);
    if (rl && !rl.closed) rl.close();
    process.exit(1);
  };

  console.log("\nCreate a governed account\n");
  console.log("Safest: https://bloxchain.app — your wallet confirms, and this script never sees a key.");
  console.log("This command mints a BasicAccount through BasicFactory.\n");

  if (useDefaults && (!process.env.DEPLOY_PRIVATE_KEY || !process.env.DEPLOY_RPC_URL || !process.env.DEPLOY_NETWORK_NAME)) {
    fail("Non-interactive mode needs DEPLOY_PRIVATE_KEY, DEPLOY_RPC_URL, and DEPLOY_NETWORK_NAME in .env.deployment.");
  }
  if (!fs.existsSync(OFFICIAL_FILE)) {
    fail("official-deployed-addresses.json not found.");
  }

  const official = JSON.parse(fs.readFileSync(OFFICIAL_FILE, "utf8"));
  const factoryAddress = official.catalog?.contracts?.BasicFactory?.address;
  const accountAddress = official.catalog?.contracts?.BasicAccount?.address;
  if (!isAddress(factoryAddress) || !isAddress(accountAddress)) {
    fail("Catalog is missing BasicFactory or BasicAccount.");
  }

  const { keys, text } = listNetworks(official);
  const sepoliaNumber = String(Math.max(1, keys.indexOf(SEPOLIA_KEY) + 1));
  const envNetwork = process.env.DEPLOY_NETWORK_NAME || SEPOLIA_KEY;
  const defaultPick = useDefaults ? (keys.includes(envNetwork) ? envNetwork : SEPOLIA_KEY) : sepoliaNumber;
  console.log("Choose a network. The account will live on this chain, and you pay the fee in that chain's coin.");
  console.log("Type a number. Press Enter alone for Sepolia.\n");
  console.log(text);
  const picked = await ask("\nNetwork number", defaultPick);
  const networkKey = resolveNetworkKey(official, picked, keys);
  if (!networkKey) fail(`Unknown network "${picked}". Type one of the numbers above.`);

  const network = official.networks[networkKey];
  const networkLabel = labelFor(networkKey);
  if (experimental && networkKey !== SEPOLIA_KEY) {
    fail("The experimental AccountBlox / CopyBlox path is available on Sepolia only. Set DEPLOY_NETWORK_NAME=sepolia.");
  }

  let rpc = "";
  const envRpc = process.env.DEPLOY_RPC_URL;
  if (envRpc) {
    try {
      const envChainId = await readChainId(envRpc, network.chainId, networkKey);
      if (envChainId === network.chainId) {
        rpc = envRpc;
        console.log(`\nUsing DEPLOY_RPC_URL from .env.deployment for ${networkLabel}.`);
      } else if (useDefaults) {
        fail(`DEPLOY_RPC_URL is chain ${envChainId}. ${networkLabel} is chain ${network.chainId}.`);
      } else {
        console.log(`\nDEPLOY_RPC_URL is a different chain (${envChainId}). It will not be used for ${networkLabel}.`);
      }
    } catch (err) {
      if (useDefaults) fail(`DEPLOY_RPC_URL did not answer: ${err instanceof Error ? err.message : err}`);
      console.log("\nDEPLOY_RPC_URL did not answer. Trying the built-in connection.");
    }
  }
  if (!rpc && PUBLIC_RPC[networkKey]) {
    rpc = PUBLIC_RPC[networkKey];
    console.log(`\nUsing the built-in connection for ${networkLabel}.`);
  }
  if (!rpc && useDefaults) {
    fail(`${networkLabel} needs DEPLOY_RPC_URL in .env.deployment.`);
  }
  if (!rpc) {
    console.log(`\n${networkLabel} has no built-in connection.`);
    console.log("Paste the URL of a node that can submit the transaction on this chain.");
    rpc = await ask("Node URL");
    if (!rpc) fail("A node URL is required for this network.");
  }

  let pk = normalizeKey(process.env.DEPLOY_PRIVATE_KEY);
  if (pk) {
    console.log("\nUsing DEPLOY_PRIVATE_KEY from .env.deployment.");
  } else if (useDefaults) {
    fail("DEPLOY_PRIVATE_KEY in .env.deployment is missing or not a 32-byte hex key.");
  } else {
    console.log("\nThe key pays the fee and becomes the owner of the account.");
    console.log("Recommended: put only DEPLOY_PRIVATE_KEY in .env.deployment (this file is gitignored) and run the command again.");
    console.log("Typing a key here shows it on screen, and the shell can store it in history.");
    console.log("Use a key that holds only the fee for this deployment.");
    console.log("To avoid a raw key entirely, stop and use https://bloxchain.app");
    pk = normalizeKey(await ask("Private key (or press Enter to stop)"));
    if (!pk) {
      console.log("\nStopped. Add DEPLOY_PRIVATE_KEY to .env.deployment, or use https://bloxchain.app");
      if (rl && !rl.closed) rl.close();
      process.exit(0);
    }
  }

  let account;
  try {
    account = privateKeyToAccount(pk);
  } catch (err) {
    fail(`That key could not be read: ${err instanceof Error ? err.message : err}`);
  }

  const chain = chainFor(network.chainId, networkKey, rpc);
  const walletClient = createWalletClient({ account, chain, transport: http(rpc) });
  const publicClient = createPublicClient({ chain, transport: http(rpc) });
  let rpcChainId;
  try {
    rpcChainId = await publicClient.getChainId();
  } catch (err) {
    fail(`The connection did not answer: ${err instanceof Error ? err.message : err}`);
  }
  if (rpcChainId !== network.chainId) {
    fail(`The connection is chain ${rpcChainId}. ${networkLabel} is chain ${network.chainId}.`);
  }

  const broadcasterDefault = process.env.BLOX_BROADCASTER_ADDRESS || account.address;
  const recoveryDefault = process.env.BLOX_RECOVERY_ADDRESS || account.address;
  console.log(`\nNetwork: ${networkLabel} (chain ${network.chainId})`);
  console.log(`Owner: ${account.address}`);

  let hash;
  let target;
  let abi;
  let addressSummary = "";
  const confirmSend = async (broadcaster, recovery) => {
    if (useDefaults) return;
    console.log("\nAbout to send the transaction.");
    console.log(`  Network: ${networkLabel} (chain ${network.chainId})`);
    console.log(`  Owner: ${account.address}`);
    console.log(`  Broadcaster: ${broadcaster}`);
    console.log(`  Recovery: ${recovery}`);
    console.log(`  ${addressSummary}`);
    const answer = await ask("Type yes to send");
    if (!isYes(answer)) {
      console.log("Stopped. Nothing was sent.");
      if (rl && !rl.closed) rl.close();
      process.exit(0);
    }
    if (rl && !rl.closed) rl.close();
  };
  if (experimental) {
    const tools = network.developerTools;
    const copyBlox = tools?.CopyBlox?.address;
    const accountBlox = tools?.AccountBlox?.address;
    if (!isAddress(copyBlox) || !isAddress(accountBlox)) {
      fail("Sepolia experimental addresses are missing from official-deployed-addresses.json.");
    }
    const timeDefault = process.env.BLOX_TIMELOCK_SECONDS || "1";
    console.log("\nExperimental Sepolia path. This AccountBlox template allows a 1-second wait. It is outside the audited core.");
    console.log("Broadcaster: the address allowed to submit operations after they are approved. Press Enter to use the owner.");
    const broadcaster = await ask("Broadcaster address", broadcasterDefault);
    console.log("Recovery: the address that can start an ownership transfer. Press Enter to use the owner.");
    const recovery = await ask("Recovery address", recoveryDefault);
    console.log("Time-lock: how many seconds a direct approval waits. The experimental minimum is 1.");
    const timeLockSecStr = await ask("Time lock (seconds)", timeDefault);
    const timeLockPeriodSec = BigInt(timeLockSecStr || "1");
    if (!isAddress(broadcaster) || !isAddress(recovery)) fail("Broadcaster and recovery must be valid addresses.");
    if (timeLockPeriodSec < 1n) fail("Experimental time-lock must be at least 1 second.");
    addressSummary = `experimental AccountBlox, time-lock ${timeLockPeriodSec} seconds`;
    await confirmSend(broadcaster, recovery);
    target = copyBlox;
    abi = COPYBLOX_ABI;
    const gas = BigInt(tools.CopyBlox.gas?.sendWithGasLimit ?? 16777216);
    console.log("\nCalling CopyBlox.cloneBlox()...");
    hash = await walletClient.writeContract({
      address: copyBlox,
      abi,
      functionName: "cloneBlox",
      args: [accountBlox, account.address, broadcaster, recovery, timeLockPeriodSec],
      account,
      gas,
    });
  } else {
    console.log("\nBroadcaster: the address allowed to submit operations after they are approved. Press Enter to use the owner.");
    const broadcaster = await ask("Broadcaster address", broadcasterDefault);
    console.log("Recovery: the address that can start an ownership transfer. Press Enter to use the owner.");
    const recovery = await ask("Recovery address", recoveryDefault);
    let timeLockPeriodSec;
    if (useDefaults) {
      timeLockPeriodSec = BigInt(process.env.BLOX_TIMELOCK_SECONDS || DAY.toString());
      if (timeLockPeriodSec < DAY || timeLockPeriodSec > MAX_TIMELOCK) {
        fail("BLOX_TIMELOCK_SECONDS must be between 86400 (1 day) and 7776000 (90 days).");
      }
    } else {
      console.log("Time-lock: how many days a direct approval waits before it can complete. Allowed range is 1 to 90. Press Enter for 1 day.");
      const daysRaw = await ask("Time lock (days)", "1");
      const days = Number(String(daysRaw).trim());
      if (!Number.isInteger(days) || days < 1 || days > 90) {
        fail("Enter a whole number of days from 1 to 90.");
      }
      timeLockPeriodSec = BigInt(days) * DAY;
    }
    if (!isAddress(broadcaster) || !isAddress(recovery)) fail("Broadcaster and recovery must be valid addresses.");
    let deterministic = envFlag("DETERMINISTIC");
    if (!useDefaults) {
      console.log("\nAccount address:");
      console.log("  1) New address each time you run this command.");
      console.log("  2) Deterministic address. The same key, index, and salt produce the same address on every supported network.");
      const mode = await ask("Type 1 or 2", deterministic ? "2" : "1");
      deterministic = mode === "2";
    }
    let index = 0n;
    let salt = ZERO_SALT;
    if (deterministic) {
      console.log("Index: 0 is the first account for this key. Use 1, 2, … when that address is already taken.");
      const indexRaw = await ask("Index", envText("INDEX") || "0");
      console.log("Salt: press Enter for 32 zero bytes. Set a different salt only when you need a second series of addresses.");
      const saltRaw = await ask("Salt (bytes32)", envText("SALT") || ZERO_SALT);
      const parsedIndex = parseIndex(indexRaw);
      const parsedSalt = parseSalt(saltRaw);
      if (parsedIndex === null) fail("Index must be a non-negative integer.");
      if (parsedSalt === null) fail("Salt must be a 32-byte hex value (0x and 64 hex characters).");
      index = parsedIndex;
      salt = parsedSalt;
    }
    const dayCount = timeLockPeriodSec / DAY;
    addressSummary = deterministic
      ? `deterministic address, index ${index}, time-lock ${dayCount} day${dayCount === 1n ? "" : "s"}`
      : `new address, time-lock ${dayCount} day${dayCount === 1n ? "" : "s"}`;
    target = factoryAddress;
    abi = BASIC_FACTORY_ABI;
    const gas = gasLimitFor(official, networkKey);
    console.log(`\n   Factory: ${factoryAddress}`);
    console.log(`   BasicAccount implementation: ${accountAddress}`);
    if (deterministic) {
      const predicted = await publicClient.readContract({
        address: factoryAddress,
        abi,
        functionName: "predictClone",
        args: [account.address, account.address, index, salt],
      });
      const existing = await publicClient.getBytecode({ address: predicted });
      console.log(`   Predicted address: ${predicted}`);
      console.log(`   Explorer: ${network.explorer}/address/${predicted}`);
      if (existing && existing !== "0x") {
        fail("That address already has code. Choose another index or salt.");
      }
      addressSummary = `deterministic address ${predicted}, index ${index}, time-lock ${dayCount} day${dayCount === 1n ? "" : "s"}`;
      await confirmSend(broadcaster, recovery);
      console.log("\nCalling BasicFactory.cloneBloxDeterministic()...");
      hash = await walletClient.writeContract({
        address: factoryAddress,
        abi,
        functionName: "cloneBloxDeterministic",
        args: [account.address, broadcaster, recovery, timeLockPeriodSec, index, salt],
        account,
        gas,
      });
    } else {
      await confirmSend(broadcaster, recovery);
      console.log("\nCalling BasicFactory.cloneBlox()...");
      hash = await walletClient.writeContract({
        address: factoryAddress,
        abi,
        functionName: "cloneBlox",
        args: [account.address, broadcaster, recovery, timeLockPeriodSec],
        account,
        gas,
      });
    }
  }

  console.log(`   Tx hash: ${hash}`);
  const receipt = await waitForTransactionReceipt(publicClient, { hash });
  if (receipt.status !== "success") fail("Mint transaction failed.");
  const clone = cloneFromReceipt(receipt, target, abi);
  if (clone) {
    console.log("\nGoverned account deployed:");
    console.log(`   Address: ${clone}`);
    console.log(`   Explorer: ${network.explorer}/address/${clone}`);
  } else {
    console.log("\nMint transaction confirmed. Read the factory BloxCloned log for the account address.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
