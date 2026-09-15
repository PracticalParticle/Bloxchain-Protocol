/**
 * IDefinition contract ABI — the published artifact, reachable without transcription.
 *
 * ```ts
 * import { iDefinitionAbi } from '@bloxchain/sdk/abi/IDefinition';
 * ```
 *
 * The same bytes are also reachable as raw JSON via
 * `@bloxchain/sdk/abi/IDefinition.abi.json`, and from the typed barrel
 * `@bloxchain/sdk/abi`.
 */
import type { Abi } from 'viem';
import abiJson from '../abi/IDefinition.abi.json' with { type: 'json' };

/** IDefinition contract ABI (full, as published in `abi/IDefinition.abi.json`). */
export const iDefinitionAbi = abiJson as Abi;

/** IDefinition ABI entries for custom errors only (for viem `decodeErrorResult`). */
export const iDefinitionErrorAbi = iDefinitionAbi.filter(
  (item): item is Extract<Abi[number], { type: 'error' }> => item.type === 'error'
);

/** IDefinition ABI entries for events only (for viem `decodeEventLog` / `parseEventLogs`). */
export const iDefinitionEventAbi = iDefinitionAbi.filter(
  (item): item is Extract<Abi[number], { type: 'event' }> => item.type === 'event'
);

export default iDefinitionAbi;
