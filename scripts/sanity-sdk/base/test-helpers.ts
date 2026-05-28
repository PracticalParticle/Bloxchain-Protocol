/**
 * Test Helper Utilities
 * Common utilities for SDK testing
 */

import { Address, Hex } from 'viem';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Get contract address from Truffle build artifacts
 */
export async function getContractAddressFromArtifacts(
  contractName: string
): Promise<Address | null> {
  try {
    const buildDir = path.join(__dirname, '../../../build/contracts');
    const artifactPath = path.join(buildDir, `${contractName}.json`);

    if (!fs.existsSync(artifactPath)) {
      throw new Error(`Artifact not found: ${artifactPath}`);
    }

    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

    if (!artifact.networks || Object.keys(artifact.networks).length === 0) {
      throw new Error(`No deployment networks found in ${contractName} artifact`);
    }

    // Get the most recent deployment (highest network ID)
    const networkIds = Object.keys(artifact.networks)
      .map((id) => parseInt(id))
      .sort((a, b) => b - a);
    const latestNetworkId = networkIds[0];
    const networkData = artifact.networks[latestNetworkId.toString()];

    if (!networkData.address) {
      throw new Error(
        `No address found for ${contractName} on network ${latestNetworkId}`
      );
    }

    console.log(
      `📋 Found ${contractName} at ${networkData.address} on network ${latestNetworkId}`
    );
    return networkData.address as Address;
  } catch (error) {
    console.error(`❌ Error reading ${contractName} artifact:`, error);
    return null;
  }
}

/**
 * Get definition library address.
 * Prefer deployed-addresses.json (development) so that after a Hardhat redeploy we use the new addresses.
 * Fall back to Truffle artifacts (e.g. after truffle migrate).
 * This avoids VM revert when artifacts point to an old/stale address on a redeployed chain.
 */
export async function getDefinitionAddress(contractName: string): Promise<Address> {
  const deployedPath = path.join(__dirname, '../../../deployed-addresses.json');
  if (fs.existsSync(deployedPath)) {
    const deployed = JSON.parse(fs.readFileSync(deployedPath, 'utf8'));
    const networkName = process.env.NETWORK_NAME || process.env.GUARDIAN_NETWORK || 'remote_evm';
    const network = deployed[networkName];
    if (network && network[contractName]?.address) {
      console.log(
        `📋 Using ${contractName} from deployed-addresses.json (${networkName}): ${network[contractName].address}`
      );
      return network[contractName].address as Address;
    }
  }

  const fromArtifacts = await getContractAddressFromArtifacts(contractName);
  if (fromArtifacts) return fromArtifacts;

  throw new Error(
    `Definition contract address not found for ${contractName}. ` +
    `Run deploy (truffle migrate or hardhat deploy-foundation-libraries) and ensure deployed-addresses.json or build/contracts has the address.`
  );
}

/**
 * Get a deployed contract address from deployed-addresses.json for current network.
 */
export function getDeployedAddress(contractName: string): Address | null {
  const deployedPath = path.join(__dirname, '../../../deployed-addresses.json');
  if (!fs.existsSync(deployedPath)) {
    return null;
  }

  try {
    const deployed = JSON.parse(fs.readFileSync(deployedPath, 'utf8'));
    const networkName = process.env.NETWORK_NAME || process.env.GUARDIAN_NETWORK || 'remote_evm';
    const address = deployed?.[networkName]?.[contractName]?.address;
    if (typeof address === 'string' && address.startsWith('0x')) {
      return address as Address;
    }
  } catch {
    // ignore parse/read errors and fall through to null
  }

  return null;
}

/**
 * Advance blockchain time (for local Ganache)
 */
export async function advanceBlockchainTime(
  publicClient: any,
  seconds: number
): Promise<boolean> {
  try {
    console.log(`⏰ ADVANCING BLOCKCHAIN TIME BY ${seconds} SECONDS`);

    // Get initial blockchain time
    const block = await publicClient.getBlock({ blockTag: 'latest' });
    const initialTime = block.timestamp; // Keep as BigInt
    const targetTime = initialTime + BigInt(seconds);

    console.log(`  🕐 Initial blockchain time: ${new Date(Number(initialTime) * 1000).toLocaleString()}`);
    console.log(`  🎯 Target blockchain time: ${new Date(Number(targetTime) * 1000).toLocaleString()}`);

    // Try to use evm_increaseTime if available (Ganache/Hardhat)
    try {
      await publicClient.request({
        method: 'evm_increaseTime',
        params: [seconds],
      });
      await publicClient.request({ method: 'evm_mine' });

      // Verify time advanced
      const newBlock = await publicClient.getBlock({ blockTag: 'latest' });
      const newTime = newBlock.timestamp; // Keep as BigInt
      console.log(`  🕐 Final blockchain time: ${new Date(Number(newTime) * 1000).toLocaleString()}`);
      console.log(`  ✅ Blockchain time advancement completed`);
      console.log(`  📈 Time advanced by ${Number(newTime - initialTime)} seconds`);

      return true;
    } catch (evmError) {
      // Fallback to transaction-based advancement
      console.log(`  🔄 evm_increaseTime not available, using transaction-based advancement...`);
      
      // This would require sending transactions, similar to sanity tests
      // For now, just log a warning
      console.log(`  ⚠️  Time advancement may not work on this network`);
      return false;
    }
  } catch (error) {
    console.log(`  ❌ Failed to advance blockchain time: ${error}`);
    return false;
  }
}

/**
 * Wait for transaction receipt
 */
export async function waitForTransaction(
  publicClient: any,
  hash: Hex
): Promise<void> {
  await publicClient.waitForTransactionReceipt({ hash });
}

// Note: createLocalChain removed - chain is now created inline in BaseSDKTest to avoid type issues

/**
 * Get operation type name from hash
 */
export function getOperationName(operationType: Hex): string {
  const operationMap: Record<string, string> = {
    '0xb23d8fa2f62c8a954db45521d1249908693b29ffd3d2dab6348898c4198996b2':
      'OWNERSHIP_TRANSFER',
    '0xae23396f8eb008d2f5f9673f91ccf20bf248201a6e0dbeaf46c421777ad8dc5b':
      'BROADCASTER_UPDATE',
    '0x032398090b003ba6aff30213cf16b7307ece6fbd6d969286006538a576526983':
      'RECOVERY_UPDATE',
    '0x06e0fdee0e8a4d2e629ae3d26c7bc6342072096facbcbe06d204d6051d97c50f':
      'TIMELOCK_UPDATE',
  };
  return operationMap[operationType.toLowerCase()] || 'UNKNOWN';
}

/**
 * Get status name from status number
 */
export function getStatusName(status: number): string {
  const statusMap: Record<number, string> = {
    0: 'UNDEFINED',
    1: 'PENDING',
    2: 'EXECUTING',
    3: 'PROCESSING_PAYMENT',
    4: 'CANCELLED',
    5: 'COMPLETED',
    6: 'FAILED',
  };
  return statusMap[status] || 'UNKNOWN';
}

