/**
 * GuardControllerDefinitions contract ABI — the published artifact, reachable without transcription.
 *
 * ```ts
 * import { guardControllerDefinitionsAbi } from '@bloxchain/sdk/abi/GuardControllerDefinitions';
 * ```
 *
 * The same bytes are also reachable as raw JSON via
 * `@bloxchain/sdk/abi/GuardControllerDefinitions.abi.json`, and from the typed barrel
 * `@bloxchain/sdk/abi`.
 */
import type { Abi } from 'viem';
import abiJson from '../abi/GuardControllerDefinitions.abi.json' with { type: 'json' };

/** GuardControllerDefinitions contract ABI (full, as published in `abi/GuardControllerDefinitions.abi.json`). */
export const guardControllerDefinitionsAbi = abiJson as Abi;

/** GuardControllerDefinitions ABI entries for custom errors only (for viem `decodeErrorResult`). */
export const guardControllerDefinitionsErrorAbi = guardControllerDefinitionsAbi.filter(
  (item): item is Extract<Abi[number], { type: 'error' }> => item.type === 'error'
);

/** GuardControllerDefinitions ABI entries for events only (for viem `decodeEventLog` / `parseEventLogs`). */
export const guardControllerDefinitionsEventAbi = guardControllerDefinitionsAbi.filter(
  (item): item is Extract<Abi[number], { type: 'event' }> => item.type === 'event'
);

export default guardControllerDefinitionsAbi;
