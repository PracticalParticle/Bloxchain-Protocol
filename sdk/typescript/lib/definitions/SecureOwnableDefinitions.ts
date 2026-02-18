/**
 * SecureOwnableDefinitions
 * Calls the deployed SecureOwnableDefinitions contract for execution params.
 * Single source of truth: encoding is done by the contract to avoid TypeScript/Solidity drift.
 * @see contracts/core/security/lib/definitions/SecureOwnableDefinitions.sol
 */

import { type Address, type Hex, type PublicClient } from 'viem';
import SecureOwnableDefinitionsAbi from '../../abi/SecureOwnableDefinitions.abi.json';

const ABI = SecureOwnableDefinitionsAbi as readonly unknown[];

/**
 * Builds execution params for executeRecoveryUpdate(address) by calling the definition contract.
 * Equivalent to SecureOwnableDefinitions.updateRecoveryExecutionParams in Solidity.
 * @param client Viem public client
 * @param definitionAddress Deployed SecureOwnableDefinitions library address (e.g. from deployed-addresses.json)
 */
export async function updateRecoveryExecutionParams(
  client: PublicClient,
  definitionAddress: Address,
  newRecoveryAddress: Address
): Promise<Hex> {
  return client.readContract({
    address: definitionAddress,
    abi: ABI,
    functionName: 'updateRecoveryExecutionParams',
    args: [newRecoveryAddress]
  }) as Promise<Hex>;
}

/**
 * Builds execution params for executeTimeLockUpdate(uint256) by calling the definition contract.
 * Equivalent to SecureOwnableDefinitions.updateTimeLockExecutionParams in Solidity.
 * @param client Viem public client
 * @param definitionAddress Deployed SecureOwnableDefinitions library address
 */
export async function updateTimeLockExecutionParams(
  client: PublicClient,
  definitionAddress: Address,
  newTimeLockPeriodSec: bigint
): Promise<Hex> {
  return client.readContract({
    address: definitionAddress,
    abi: ABI,
    functionName: 'updateTimeLockExecutionParams',
    args: [newTimeLockPeriodSec]
  }) as Promise<Hex>;
}
