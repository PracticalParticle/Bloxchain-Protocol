/**
 * GuardControllerDefinitions
 * Calls the deployed GuardControllerDefinitions contract for specs and encoding.
 * Single source of truth: action names, formats, and encoding come from the contract.
 * @see contracts/core/execution/lib/definitions/GuardControllerDefinitions.sol
 * @see scripts/sanity/guard-controller/base-test.cjs createGuardConfigBatchMetaTx (actionsArray = [actionType, data] per element)
 */

import { type Abi, type Address, type Hex, type PublicClient, bytesToHex, encodeAbiParameters, parseAbiParameters } from 'viem';
import GuardControllerDefinitionsAbi from '../../abi/GuardControllerDefinitions.abi.json';
import type { GuardConfigAction } from '../../types/core.execution.index';
import type { TxAction } from '../../types/lib.index';

const ABI = GuardControllerDefinitionsAbi as Abi;

/** Normalize bytes to ABI Hex (0x-prefixed); empty -> '0x'. */
function normalizeData(data: Hex | Uint8Array | undefined | null): Hex {
  if (data === undefined || data === null) return '0x';
  if (typeof data === 'string') return data.startsWith('0x') ? (data as Hex) : (`0x${data}` as Hex);
  return bytesToHex(data as Uint8Array) as Hex;
}

/**
 * Builds execution params for executeGuardConfigBatch((uint8,bytes)[]).
 * Encoding matches GuardControllerDefinitions.sol guardConfigBatchExecutionParams (abi.encode(actions)).
 * Same format as scripts/sanity (direct contract tests); single source of truth in this module.
 */
export function guardConfigBatchExecutionParams(
  _client: PublicClient,
  _definitionAddress: Address,
  actions: GuardConfigAction[]
): Hex {
  const actionsTuple = actions.map((a) => ({
    actionType: Number(a.actionType),
    data: normalizeData(a.data)
  }));
  return encodeAbiParameters(
    parseAbiParameters('(uint8 actionType, bytes data)[]'),
    [actionsTuple]
  ) as Hex;
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
 * Encodes data for ADD_TARGET_TO_WHITELIST. Matches GuardControllerDefinitions.sol encodeAddTargetToWhitelist (abi.encode(functionSelector, target)).
 */
export function encodeAddTargetToWhitelist(
  _client: PublicClient,
  _definitionAddress: Address,
  functionSelector: Hex,
  target: Address
): Hex {
  return encodeAbiParameters(parseAbiParameters('bytes4, address'), [functionSelector, target]) as Hex;
}

/**
 * Encodes data for REMOVE_TARGET_FROM_WHITELIST. Matches GuardControllerDefinitions.sol encodeRemoveTargetFromWhitelist (abi.encode(functionSelector, target)).
 */
export function encodeRemoveTargetFromWhitelist(
  _client: PublicClient,
  _definitionAddress: Address,
  functionSelector: Hex,
  target: Address
): Hex {
  return encodeAbiParameters(parseAbiParameters('bytes4, address'), [functionSelector, target]) as Hex;
}

/**
 * Encodes data for REGISTER_FUNCTION. Matches GuardControllerDefinitions.sol encodeRegisterFunction (abi.encode(functionSignature, operationName, supportedActions)).
 * supportedActions: array of TxAction enum values (e.g. TxAction.EXECUTE_TIME_DELAY_REQUEST).
 */
export function encodeRegisterFunction(
  _client: PublicClient,
  _definitionAddress: Address,
  functionSignature: string,
  operationName: string,
  supportedActions: TxAction[]
): Hex {
  return encodeAbiParameters(parseAbiParameters('string, string, uint8[]'), [
    functionSignature,
    operationName,
    supportedActions.map((a) => Number(a))
  ]) as Hex;
}

/**
 * Encodes data for UNREGISTER_FUNCTION. Matches GuardControllerDefinitions.sol encodeUnregisterFunction (abi.encode(functionSelector, safeRemoval)).
 */
export function encodeUnregisterFunction(
  _client: PublicClient,
  _definitionAddress: Address,
  functionSelector: Hex,
  safeRemoval: boolean
): Hex {
  return encodeAbiParameters(parseAbiParameters('bytes4, bool'), [functionSelector, safeRemoval]) as Hex;
}
