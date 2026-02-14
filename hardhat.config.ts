/**
 * Hardhat 3 config. Compiler aligned with foundry.toml.
 * For public deployment: copy env.deployment.example to .env.deployment and set DEPLOY_*.
 */
import "dotenv/config";
import { config as loadDeploymentEnv } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import hardhatToolboxViem from "@nomicfoundation/hardhat-toolbox-viem";
import { defineConfig } from "hardhat/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadDeploymentEnv({ path: path.join(__dirname, ".env.deployment") });

const DEPLOY_RPC = process.env.DEPLOY_RPC_URL;
const DEPLOY_PK = process.env.DEPLOY_PRIVATE_KEY;
const chainId = parseInt(process.env.DEPLOY_CHAIN_ID ?? "11155111", 10);

// Compiler settings aligned with foundry.toml: solc 0.8.33, optimizer 200, via_ir, evm osaka
const SOLIDITY_VERSION = "0.8.33";
const OPTIMIZER_RUNS = 200;
const EVM_VERSION = "osaka";

export default defineConfig({
  plugins: [hardhatToolboxViem],
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
    ...(DEPLOY_RPC && DEPLOY_PK
      ? {
          sepolia: {
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
