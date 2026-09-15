/**
 * EngineBlox contract ABI — the published artifact, reachable without transcription.
 *
 * ```ts
 * import { engineBloxAbi } from '@bloxchain/sdk/abi/EngineBlox';
 * ```
 *
 * The same bytes are also reachable as raw JSON via
 * `@bloxchain/sdk/abi/EngineBlox.abi.json`, and from the typed barrel
 * `@bloxchain/sdk/abi`.
 */
import type { Abi } from 'viem';
import abiJson from '../abi/EngineBlox.abi.json' with { type: 'json' };

/** EngineBlox contract ABI (full, as published in `abi/EngineBlox.abi.json`). */
export const engineBloxAbi = abiJson as Abi;

/** EngineBlox ABI entries for custom errors only (for viem `decodeErrorResult`). */
export const engineBloxErrorAbi = engineBloxAbi.filter(
  (item): item is Extract<Abi[number], { type: 'error' }> => item.type === 'error'
);

/** EngineBlox ABI entries for events only (for viem `decodeEventLog` / `parseEventLogs`). */
export const engineBloxEventAbi = engineBloxAbi.filter(
  (item): item is Extract<Abi[number], { type: 'event' }> => item.type === 'event'
);

export default engineBloxAbi;
