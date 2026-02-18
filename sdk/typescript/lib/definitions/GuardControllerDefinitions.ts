/**
 * GuardControllerDefinitions
 * Calls the deployed GuardControllerDefinitions contract for specs and encoding.
 * Single source of truth: action names, formats, and encoding come from the contract.
 * @see contracts/core/execution/lib/definitions/GuardControllerDefinitions.sol
 * @see scripts/sanity/guard-controller/base-test.cjs createGuardConfigBatchMetaTx (actionsArray = [actionType, data] per element)
 */

import { type Address, type Hex, type PublicClient, encodeFunctionData, encodeAbiParameters, parseAbiParameters, bytesToHex } from 'viem';
import GuardControllerDefinitionsAbi from '../../abi/GuardControllerDefinitions.abi.json';
import type { GuardConfigAction } from '../../types/core.execution.index';
import type { TxAction } from '../../types/lib.index';

const ABI = GuardControllerDefinitionsAbi as readonly unknown[];

/** Normalize bytes to ABI Hex (0x-prefixed); empty -> '0x'. Matches CJS data shape. */
function normalizeData(data: Hex | Uint8Array | undefined): Hex {
  if (data === undefined || data === null) return '0x';
  if (typeof data === 'string') return data.startsWith('0x') ? (data as Hex) : (`0x${data}` as Hex);
  return (bytesToHex(data as Uint8Array) as Hex) || '0x';
}

/** Same encoding as web3.eth.abi.encodeParameter('tuple(uint8,bytes)[]', actionsArray) in direct CJS sanity. */
function encodeGuardConfigBatchLocal(actions: GuardConfigAction[]): Hex {
  const actionsArray = actions.map((a) => ({
    actionType: Number(a.actionType),
    data: normalizeData(a.data)
  }));
  return encodeAbiParameters(
    parseAbiParameters('(uint8 actionType, bytes data)[]'),
    [actionsArray]
  ) as Hex;
}

/**
 * Builds execution params for executeGuardConfigBatch((uint8,bytes)[]) by calling the definition contract.
 * If the contract call reverts (e.g. library not callable via CALL), falls back to local encoding matching direct CJS sanity.
 */
export async function guardConfigBatchExecutionParams(
  client: PublicClient,
  definitionAddress: Address,
  actions: GuardConfigAction[]
): Promise<Hex> {
  const actionsArray: [number, Hex][] = actions.map((a) => [
    Number(a.actionType),
    normalizeData(a.data)
  ]);

  const calldata = encodeFunctionData({
    abi: ABI,
    functionName: 'guardConfigBatchExecutionParams',
    args: [actionsArray]
  });

  try {
    const result = await client.call({
      to: definitionAddress,
      data: calldata
    });

    if (!result.data) {
      throw new Error('No data');
    }
    return result.data;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('revert') || msg.includes('Missing or invalid') || msg.includes('VM Exception') || msg.includes('No data')) {
      return encodeGuardConfigBatchLocal(actions);
    }
    throw err;
  }
}

/**
 * Returns all available GuardConfig action types and their ABI decode formats from the contract.
 * Index i in both arrays corresponds to GuardConfigActionType enum value i.
 */
export async function getGuardConfigActionSpecs(
  client: PublicClient,
  definitionAddress: Address
): Promise<{ actionNames: string[]; formats: string[] }> {
  const result = (await client.readContract({
    address: definitionAddress,
    abi: ABI,
    functionName: 'getGuardConfigActionSpecs'
  })) as [string[], string[]];
  return { actionNames: result[0], formats: result[1] };
}

/**
 * Encodes data for ADD_TARGET_TO_WHITELIST by calling the definition contract.
 */
export async function encodeAddTargetToWhitelist(
  client: PublicClient,
  definitionAddress: Address,
  functionSelector: Hex,
  target: Address
): Promise<Hex> {
  return client.readContract({
    address: definitionAddress,
    abi: ABI,
    functionName: 'encodeAddTargetToWhitelist',
    args: [functionSelector, target]
  }) as Promise<Hex>;
}

/**
 * Encodes data for REMOVE_TARGET_FROM_WHITELIST by calling the definition contract.
 */
export async function encodeRemoveTargetFromWhitelist(
  client: PublicClient,
  definitionAddress: Address,
  functionSelector: Hex,
  target: Address
): Promise<Hex> {
  return client.readContract({
    address: definitionAddress,
    abi: ABI,
    functionName: 'encodeRemoveTargetFromWhitelist',
    args: [functionSelector, target]
  }) as Promise<Hex>;
}

/**
 * Encodes data for REGISTER_FUNCTION by calling the definition contract.
 * supportedActions: array of TxAction enum values (e.g. TxAction.EXECUTE_TIME_DELAY_REQUEST).
 */
export async function encodeRegisterFunction(
  client: PublicClient,
  definitionAddress: Address,
  functionSignature: string,
  operationName: string,
  supportedActions: TxAction[]
): Promise<Hex> {
  return client.readContract({
    address: definitionAddress,
    abi: ABI,
    functionName: 'encodeRegisterFunction',
    args: [functionSignature, operationName, supportedActions.map((a) => Number(a))]
  }) as Promise<Hex>;
}

/**
 * Encodes data for UNREGISTER_FUNCTION by calling the definition contract.
 */
export async function encodeUnregisterFunction(
  client: PublicClient,
  definitionAddress: Address,
  functionSelector: Hex,
  safeRemoval: boolean
): Promise<Hex> {
  return client.readContract({
    address: definitionAddress,
    abi: ABI,
    functionName: 'encodeUnregisterFunction',
    args: [functionSelector, safeRemoval]
  }) as Promise<Hex>;
}
