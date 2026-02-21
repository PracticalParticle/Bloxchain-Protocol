/**
 * GuardControllerDefinitions
 * Calls the deployed GuardControllerDefinitions contract for specs and encoding.
 * Single source of truth: action names, formats, and encoding come from the contract.
 * @see contracts/core/execution/lib/definitions/GuardControllerDefinitions.sol
 * @see scripts/sanity/guard-controller/base-test.cjs createGuardConfigBatchMetaTx (actionsArray = [actionType, data] per element)
 */

import { type Abi, type Address, type Hex, type PublicClient, encodeAbiParameters, parseAbiParameters, bytesToHex } from 'viem';
import GuardControllerDefinitionsAbi from '../../abi/GuardControllerDefinitions.abi.json';
import type { GuardConfigAction } from '../../types/core.execution.index';
import type { TxAction } from '../../types/lib.index';

const ABI = GuardControllerDefinitionsAbi as Abi;

/**
 * Selector for guardConfigBatchExecutionParams(IGuardController.GuardConfigAction[]).
 * Solidity uses the full type name in the signature, so the selector is 0xf87332aa, not (uint8,bytes)[].
 * Verify with: forge inspect GuardControllerDefinitions methodIdentifiers
 */
const GUARD_CONFIG_BATCH_EXECUTION_PARAMS_SELECTOR = '0xf87332aa';

/** Normalize bytes to ABI Hex (0x-prefixed); empty -> '0x'. */
function normalizeData(data: Hex | Uint8Array | undefined | null): Hex {
  if (data === undefined || data === null) return '0x';
  if (typeof data === 'string') return data.startsWith('0x') ? (data as Hex) : (`0x${data}` as Hex);
  return bytesToHex(data as Uint8Array) as Hex;
}

/**
 * Builds execution params for executeGuardConfigBatch((uint8,bytes)[]) by calling the definition contract.
 * Requires the GuardControllerDefinitions contract to be deployed at definitionAddress; throws on failure.
 */
export async function guardConfigBatchExecutionParams(
  client: PublicClient,
  definitionAddress: Address,
  actions: GuardConfigAction[]
): Promise<Hex> {
  const actionsTuple = actions.map((a) => ({
    actionType: Number(a.actionType),
    data: normalizeData(a.data)
  }));

  const paramsEncoded = encodeAbiParameters(
    parseAbiParameters('(uint8 actionType, bytes data)[]'),
    [actionsTuple]
  );
  const calldata = (GUARD_CONFIG_BATCH_EXECUTION_PARAMS_SELECTOR + paramsEncoded.slice(2)) as Hex;

  const result = await client.call({
    to: definitionAddress,
    data: calldata
  });

  if (!result.data) {
    throw new Error('No data');
  }
  return result.data;
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
