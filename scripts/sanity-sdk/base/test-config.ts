/**
 * Test Configuration
 * Connection uses only .env (RPC_URL or REMOTE_HOST/REMOTE_PROTOCOL/REMOTE_PORT),
 * matching scripts/sanity behavior. load-env.ts is imported first in each run-tests.ts
 * so .env is loaded before any other code.
 */
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from project root (override: true so .env wins over inherited env e.g. RPC_URL from parent)
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../../.env'), override: true, quiet: true });

export interface TestConfig {
  testMode: 'auto' | 'manual';
  rpcUrl: string;
  chainId: number;
  /** Gas price in Gwei for writes (set SANITY_SDK_GAS_PRICE_GWEI if you see "transaction underpriced"). */
  gasPriceGwei?: number;
  /** RPC request timeout in ms (remote Ganache may need longer). Default 30_000. */
  rpcTimeoutMs: number;
  contractAddresses: {
    /** Single account contract used for all sanity tests (SecureOwnable, RuntimeRBAC, GuardController) */
    accountBlox?: string;
    /** @deprecated Use accountBlox (same as ACCOUNTBLOX_ADDRESS) */
    secureBlox?: string;
    /** @deprecated Use accountBlox (same as ACCOUNTBLOX_ADDRESS) */
    runtimeRBAC?: string;
    /** @deprecated Use accountBlox (same as ACCOUNTBLOX_ADDRESS) */
    guardController?: string;
  };
  privateKeys: {
    wallet1?: string;
    wallet2?: string;
    wallet3?: string;
    wallet4?: string;
    wallet5?: string;
  };
}

/**
 * Get RPC URL from .env only (no localhost fallback).
 * Prefer REMOTE_* when set so .env remote config wins over any inherited RPC_URL (e.g. from parent process).
 */
export function getRPCUrl(): string {
  if (process.env.REMOTE_HOST) {
    const protocol = process.env.REMOTE_PROTOCOL || 'https';
    // Default 8545 for consistency with other sanity scripts (scripts/sanity/*/base-test.cjs). Use REMOTE_PORT=443 for remote HTTPS.
    const port = process.env.REMOTE_PORT || '8545';
    return `${protocol}://${process.env.REMOTE_HOST}:${port}`;
  }
  if (process.env.RPC_URL) {
    return process.env.RPC_URL;
  }
  throw new Error(
    'RPC URL not set. In .env set REMOTE_HOST (and optionally REMOTE_PROTOCOL, REMOTE_PORT) or RPC_URL.'
  );
}

/**
 * Get chain ID from environment variables
 */
export function getChainId(): number {
  if (process.env.REMOTE_NETWORK_ID) {
    return parseInt(process.env.REMOTE_NETWORK_ID);
  }
  if (process.env.CHAIN_ID) {
    return parseInt(process.env.CHAIN_ID);
  }
  // Default to 1337 for local Ganache
  return 1337;
}

/**
 * Get test configuration from environment variables
 */
export function getTestConfig(): TestConfig {
  const testMode = (process.env.TEST_MODE || 'manual') as 'auto' | 'manual';

  const rpcUrl = getRPCUrl();
  let gasPriceGwei: number | undefined;
  if (process.env.SANITY_SDK_GAS_PRICE_GWEI) {
    const parsed = parseInt(process.env.SANITY_SDK_GAS_PRICE_GWEI, 10);
    gasPriceGwei = Number.isNaN(parsed) ? undefined : parsed;
  }
  const rpcTimeoutMs = process.env.SANITY_SDK_RPC_TIMEOUT_MS
    ? parseInt(process.env.SANITY_SDK_RPC_TIMEOUT_MS, 10)
    : 30_000;

  return {
    testMode,
    rpcUrl,
    chainId: getChainId(),
    gasPriceGwei,
    rpcTimeoutMs: Number.isNaN(rpcTimeoutMs) ? 30_000 : rpcTimeoutMs,
    contractAddresses: {
      accountBlox: process.env.ACCOUNTBLOX_ADDRESS,
      secureBlox: process.env.ACCOUNTBLOX_ADDRESS,
      runtimeRBAC: process.env.ACCOUNTBLOX_ADDRESS,
      guardController: process.env.ACCOUNTBLOX_ADDRESS,
    },
    privateKeys: {
      wallet1: process.env.TEST_WALLET_1_PRIVATE_KEY,
      wallet2: process.env.TEST_WALLET_2_PRIVATE_KEY,
      wallet3: process.env.TEST_WALLET_3_PRIVATE_KEY,
      wallet4: process.env.TEST_WALLET_4_PRIVATE_KEY,
      wallet5: process.env.TEST_WALLET_5_PRIVATE_KEY,
    },
  };
}

/**
 * Ganache deterministic private keys (for auto mode)
 */
export const GANACHE_PRIVATE_KEYS = [
  '0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d', // Account 0
  '0x6cbed15c793ce57650b9877cf6fa156fbef513c4e6134f022a85b1ffdd59b2a1', // Account 1
  '0x6370fd033278c143179d81c5526140625662b8daa446c22ee2d73db3707e620c', // Account 2
  '0x646f1ce2fdad0e6deeeb5c7e8e5543bdde65e86029e2fd9fc169899c440a7913', // Account 3
  '0xadd53f9a7e588d003326d1cbf9e4a43c061aadd9bc938c843a79e7b4fd2ad743', // Account 4
];

