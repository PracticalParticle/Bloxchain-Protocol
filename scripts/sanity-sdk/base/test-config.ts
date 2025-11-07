/**
 * Test Configuration
 * Handles environment variable loading and configuration setup
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from project root
dotenv.config({ path: path.join(__dirname, '../../../.env') });

export interface TestConfig {
  testMode: 'auto' | 'manual';
  rpcUrl: string;
  chainId: number;
  contractAddresses: {
    secureBlox?: string;
    dynamicRBAC?: string;
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
 * Get RPC URL from environment variables
 */
export function getRPCUrl(): string {
  if (process.env.RPC_URL) {
    return process.env.RPC_URL;
  }

  if (process.env.REMOTE_HOST) {
    const protocol = process.env.REMOTE_PROTOCOL || 'https';
    const port = process.env.REMOTE_PORT || '8545';
    return `${protocol}://${process.env.REMOTE_HOST}:${port}`;
  }

  // Default to http for localhost
  return 'http://localhost:8545';
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

  return {
    testMode,
    rpcUrl: getRPCUrl(),
    chainId: getChainId(),
    contractAddresses: {
      secureBlox: process.env.SECUREBLOX_ADDRESS,
      dynamicRBAC: process.env.DYNAMICRBAC_ADDRESS,
      guardController: process.env.GUARDCONTROLLER_ADDRESS,
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

