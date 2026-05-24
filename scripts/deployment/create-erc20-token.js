/**
 * Interactive script: deploy a new BasicERC20 token.
 * Uses the deployer key from .env.deployment. Prompts for:
 *   - Network (default from DEPLOY_NETWORK_NAME or sepolia)
 *   - Token config: name, symbol, totalSupply
 *   - Minter address (defaults to AccountBlox from deployed-addresses.json when available)
 *   - Owner address (DEFAULT_ADMIN_ROLE recipient; deployer can renounce admin after handover)
 *
 * Usage (from repo root):
 *   node scripts/deployment/create-erc20-token.js
 *   npm run create-erc20
 *
 * Non-interactive (defaults):
 *   CREATE_ERC20_USE_DEFAULTS=1 node scripts/deployment/create-erc20-token.js
 *
 * Ensure .env.deployment has DEPLOY_RPC_URL, DEPLOY_PRIVATE_KEY, and optionally
 * DEPLOY_NETWORK_NAME and DEPLOY_CHAIN_ID.
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
const BASIC_ERC20_ARTIFACT_PATH = path.join(
  ROOT_DIR,
  "artifacts",
  "contracts",
  "examples",
  "extra",
  "BasicERC20.sol",
  "BasicERC20.json"
);

config({ path: ENV_DEPLOYMENT });

function question(rl, prompt, defaultValue = "") {
  const p = defaultValue !== "" ? `${prompt} [${defaultValue}]: ` : `${prompt}: `;
  return new Promise((resolve) => rl.question(p, (answer) => resolve((answer && answer.trim()) || defaultValue)));
}

function isAddress(s) {
  return /^0x[a-fA-F0-9]{40}$/.test(s);
}

function isYes(value) {
  const v = `${value ?? ""}`.trim().toLowerCase();
  return v === "y" || v === "yes" || v === "1" || v === "true";
}

function parseUnits(value, decimals = 18) {
  const input = `${value ?? ""}`.trim();
  if (!/^\d+(\.\d+)?$/.test(input)) {
    throw new Error(`Invalid numeric amount: "${value}"`);
  }

  const [whole, frac = ""] = input.split(".");
  if (frac.length > decimals) {
    throw new Error(`Too many decimal places. Max supported decimals: ${decimals}`);
  }

  const wholePart = BigInt(whole || "0") * 10n ** BigInt(decimals);
  const fracPart = frac.length > 0 ? BigInt(frac.padEnd(decimals, "0")) : 0n;
  return wholePart + fracPart;
}

async function main() {
  const useDefaults =
    process.env.CREATE_ERC20_USE_DEFAULTS === "1" || process.env.CREATE_ERC20_USE_DEFAULTS === "true";
  const rl = useDefaults ? null : createInterface({ input: process.stdin, output: process.stdout });
  const ask = async (prompt, defaultValue) => (rl ? question(rl, prompt, defaultValue) : Promise.resolve(defaultValue));

  console.log("\n🪙 Deploy a new BasicERC20 token\n");

  if (!process.env.DEPLOY_PRIVATE_KEY || !process.env.DEPLOY_RPC_URL) {
    console.error("Missing DEPLOY_PRIVATE_KEY or DEPLOY_RPC_URL in .env.deployment.");
    if (rl) rl.close();
    process.exit(1);
  }

  const defaultNetwork = process.env.DEPLOY_NETWORK_NAME || "sepolia";
  let accountBloxFromFile = "";
  if (fs.existsSync(ADDRESSES_FILE)) {
    try {
      const addresses = JSON.parse(fs.readFileSync(ADDRESSES_FILE, "utf8"));
      accountBloxFromFile = addresses?.[defaultNetwork]?.AccountBlox?.address || "";
    } catch {
      accountBloxFromFile = "";
    }
  }

  const network = await ask("Network name (used only for defaults display)", defaultNetwork);
  if (!accountBloxFromFile && fs.existsSync(ADDRESSES_FILE)) {
    try {
      const addresses = JSON.parse(fs.readFileSync(ADDRESSES_FILE, "utf8"));
      accountBloxFromFile = addresses?.[network]?.AccountBlox?.address || "";
    } catch {
      accountBloxFromFile = "";
    }
  }

  const chainId = parseInt(process.env.DEPLOY_CHAIN_ID || "11155111", 10);
  const rpc = process.env.DEPLOY_RPC_URL;
  const pk = process.env.DEPLOY_PRIVATE_KEY.startsWith("0x")
    ? process.env.DEPLOY_PRIVATE_KEY
    : `0x${process.env.DEPLOY_PRIVATE_KEY}`;

  const { createWalletClient, createPublicClient, http } = await import("viem");
  const { privateKeyToAccount } = await import("viem/accounts");
  const { waitForTransactionReceipt, deployContract } = await import("viem/actions");
  const chain =
    chainId === 11155111
      ? (await import("viem/chains")).sepolia
      : {
          id: chainId,
          name: "Custom",
          nativeCurrency: { decimals: 18, name: "Ether", symbol: "ETH" },
          rpcUrls: { default: { http: [rpc] } },
        };
  const deployerAccount = privateKeyToAccount(pk);
  const walletClient = createWalletClient({ account: deployerAccount, chain, transport: http(rpc) });
  const publicClient = createPublicClient({ chain, transport: http(rpc) });

  const deployerAddr = deployerAccount.address;
  const tokenName = await ask("Token name", "Basic Token");
  const tokenSymbol = await ask("Token symbol", "BASIC");
  const totalSupplyHuman = await ask("Total supply (human units, 18 decimals)", "1000000");
  const ownerAddress = await ask("Owner/admin address", deployerAddr);
  const defaultMinter = isAddress(accountBloxFromFile) ? accountBloxFromFile : deployerAddr;
  const minterAddress = await ask("Minter address (AccountBlox recommended)", defaultMinter);
  const transferSupplyAnswer = await ask("Transfer initial supply to owner? (y/n)", "y");
  const renounceAdminAnswer = await ask("Renounce deployer admin after owner setup? (y/n)", "y");

  if (!tokenName || !tokenSymbol) {
    console.error("Token name and symbol are required.");
    if (rl) rl.close();
    process.exit(1);
  }

  if (!isAddress(minterAddress)) {
    console.error("Invalid minter address.");
    if (rl) rl.close();
    process.exit(1);
  }
  if (!isAddress(ownerAddress)) {
    console.error("Invalid owner/admin address.");
    if (rl) rl.close();
    process.exit(1);
  }

  let totalSupply;
  try {
    totalSupply = parseUnits(totalSupplyHuman, 18);
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    if (rl) rl.close();
    process.exit(1);
  }

  if (totalSupply <= 0n) {
    console.error("Total supply must be greater than zero.");
    if (rl) rl.close();
    process.exit(1);
  }

  if (rl) rl.close();

  if (!fs.existsSync(BASIC_ERC20_ARTIFACT_PATH)) {
    throw new Error(`BasicERC20 artifact not found at ${BASIC_ERC20_ARTIFACT_PATH}. Run "npx hardhat compile".`);
  }

  const basicErc20Artifact = JSON.parse(fs.readFileSync(BASIC_ERC20_ARTIFACT_PATH, "utf8"));

  console.log("\n📤 Deploying BasicERC20...");
  const hash = await deployContract(walletClient, {
    abi: basicErc20Artifact.abi,
    bytecode: basicErc20Artifact.bytecode,
    account: deployerAccount,
    args: [tokenName, tokenSymbol, totalSupply, minterAddress],
  });
  console.log(`   Tx hash: ${hash}`);

  const receipt = await waitForTransactionReceipt(publicClient, { hash });
  const tokenAddress = receipt.contractAddress;
  if (!tokenAddress) {
    throw new Error(`Deployment transaction ${hash} did not return contractAddress.`);
  }

  const transferSupplyToOwner = isYes(transferSupplyAnswer);
  const renounceDeployerAdmin = isYes(renounceAdminAnswer);
  const defaultAdminRole = "0x0000000000000000000000000000000000000000000000000000000000000000";

  if (ownerAddress.toLowerCase() !== deployerAddr.toLowerCase()) {
    console.log("\n🔧 Configuring owner/admin role...");
    const grantAdminHash = await walletClient.writeContract({
      address: tokenAddress,
      abi: basicErc20Artifact.abi,
      functionName: "grantRole",
      args: [defaultAdminRole, ownerAddress],
      account: deployerAccount,
    });
    await waitForTransactionReceipt(publicClient, { hash: grantAdminHash });
    console.log(`   ✅ Granted DEFAULT_ADMIN_ROLE to owner (tx: ${grantAdminHash})`);

    if (transferSupplyToOwner) {
      const transferHash = await walletClient.writeContract({
        address: tokenAddress,
        abi: basicErc20Artifact.abi,
        functionName: "transfer",
        args: [ownerAddress, totalSupply],
        account: deployerAccount,
      });
      await waitForTransactionReceipt(publicClient, { hash: transferHash });
      console.log(`   ✅ Transferred initial supply to owner (tx: ${transferHash})`);
    }

    if (renounceDeployerAdmin) {
      const renounceHash = await walletClient.writeContract({
        address: tokenAddress,
        abi: basicErc20Artifact.abi,
        functionName: "renounceRole",
        args: [defaultAdminRole, deployerAddr],
        account: deployerAccount,
      });
      await waitForTransactionReceipt(publicClient, { hash: renounceHash });
      console.log(`   ✅ Deployer renounced DEFAULT_ADMIN_ROLE (tx: ${renounceHash})`);
    }
  } else if (transferSupplyToOwner) {
    console.log("\nℹ️ Owner equals deployer, initial supply already belongs to owner.");
  }

  console.log("\n✅ BasicERC20 deployed:");
  console.log(`   Network: ${network}`);
  console.log(`   Address: ${tokenAddress}`);
  console.log(`   Name: ${tokenName}`);
  console.log(`   Symbol: ${tokenSymbol}`);
  console.log(`   Total Supply (raw): ${totalSupply.toString()}`);
  console.log(`   Minter: ${minterAddress}`);
  console.log(`   Owner/Admin: ${ownerAddress}`);
  console.log(`   Transfer supply to owner: ${transferSupplyToOwner ? "yes" : "no"}`);
  console.log(`   Renounce deployer admin: ${renounceDeployerAdmin ? "yes" : "no"}`);
  if (chainId === 11155111) {
    console.log(`   Explorer: https://sepolia.etherscan.io/address/${tokenAddress}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
