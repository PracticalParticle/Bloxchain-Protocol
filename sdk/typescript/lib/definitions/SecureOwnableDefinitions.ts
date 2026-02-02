/**
 * SecureOwnableDefinitions
 * Pure helpers for building execution params for SecureOwnable operations.
 * Mirrors SecureOwnableDefinitions.sol; no contract calls.
 */

import { Address, Hex, encodeAbiParameters } from 'viem';

/**
 * Builds execution params for executeRecoveryUpdate(address).
 * Equivalent to SecureOwnableDefinitions.updateRecoveryExecutionParams in Solidity.
 */
export function updateRecoveryExecutionParams(newRecoveryAddress: Address): Hex {
  return encodeAbiParameters(
    [{ name: 'newRecoveryAddress', type: 'address' }],
    [newRecoveryAddress]
  ) as Hex;
}

/**
 * Builds execution params for executeTimeLockUpdate(uint256).
 * Equivalent to SecureOwnableDefinitions.updateTimeLockExecutionParams in Solidity.
 */
export function updateTimeLockExecutionParams(newTimeLockPeriodSec: bigint): Hex {
  return encodeAbiParameters(
    [{ name: 'newTimeLockPeriodSec', type: 'uint256' }],
    [newTimeLockPeriodSec]
  ) as Hex;
}
