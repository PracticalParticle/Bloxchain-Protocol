/**
 * Hardhat 3 config. Compiler aligned with foundry.toml.
 * For public deployment: copy env.deployment.example to .env.deployment and set DEPLOY_*.
 *
 * Optional — Hardhat deployment (e.g. deploy:hardhat, deploy:hardhat:foundation):
 *   npm install --save-dev @nomicfoundation/hardhat-toolbox-viem
 * Install the toolbox only when you need live deployment; the core library stays clean without it.
 */
import "dotenv/config";
import { config as loadDeploymentEnv } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import { defineConfig, type HardhatUserConfig } from "hardhat/config";

const require = createRequire(import.meta.url);
let hardhatToolboxViem: NonNullable<HardhatUserConfig["plugins"]>[number] | null = null;
let hardhatEthers: NonNullable<HardhatUserConfig["plugins"]>[number] | null = null;
try {
  const m = require("@nomicfoundation/hardhat-toolbox-viem");
  hardhatToolboxViem = (m?.default !== undefined ? m.default : m) as NonNullable<HardhatUserConfig["plugins"]>[number];
} catch {
  // Toolbox not installed; install with: npm install --save-dev @nomicfoundation/hardhat-toolbox-viem
}
try {
  const m = require("@nomicfoundation/hardhat-ethers");
  hardhatEthers = (m?.default !== undefined ? m.default : m) as NonNullable<HardhatUserConfig["plugins"]>[number];
} catch {
  // For blox deploy with library linking: npm install --save-dev @nomicfoundation/hardhat-ethers ethers
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const deployEnvFile = process.env.DEPLOY_ENV_FILE?.trim() || ".env.deployment";
loadDeploymentEnv({ path: path.join(__dirname, deployEnvFile) });

const DEPLOY_RPC = process.env.DEPLOY_RPC_URL;
const DEPLOY_PK = process.env.DEPLOY_PRIVATE_KEY;
const rawChainId = process.env.DEPLOY_CHAIN_ID;
const chainId = (rawChainId != null && String(rawChainId).trim() !== "")
  ? parseInt(String(rawChainId).trim(), 10)
  : 11155111;
if (Number.isNaN(chainId) || chainId <= 0) {
  throw new Error(`Invalid DEPLOY_CHAIN_ID: "${rawChainId}". Must be a positive integer.`);
}
const deployNetworkName = process.env.DEPLOY_NETWORK_NAME?.trim();

// Compiler settings aligned with foundry.toml by default: solc 0.8.35, optimizer 200, via_ir, evm osaka.
// Can be overridden per env-file using DEPLOY_EVM_VERSION (e.g. shanghai for local private chains).
const SOLIDITY_VERSION = "0.8.35";
const OPTIMIZER_RUNS = 200;
const EVM_VERSION = process.env.DEPLOY_EVM_VERSION?.trim() || "osaka";

export default defineConfig({
  plugins: [hardhatToolboxViem, hardhatEthers].filter(Boolean) as HardhatUserConfig["plugins"],
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  solidity: {
    version: SOLIDITY_VERSION,
    settings: {
      optimizer: { enabled: true, runs: OPTIMIZER_RUNS },
      viaIR: true,
      evmVersion: EVM_VERSION,
    },
  },
  networks: {
    hardhat: {
      type: "edr-simulated",
      chainType: "l1",
    },
    ...(DEPLOY_RPC && DEPLOY_PK && deployNetworkName
      ? {
          [deployNetworkName]: {
            type: "http" as const,
            chainType: "l1" as const,
            url: DEPLOY_RPC,
            chainId,
            accounts: [DEPLOY_PK.startsWith("0x") ? DEPLOY_PK : `0x${DEPLOY_PK}`],
          },
        }
      : {}),
  },
});
