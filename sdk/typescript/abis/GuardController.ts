/**
 * GuardController contract ABI — the published artifact, reachable without transcription.
 *
 * ```ts
 * import { guardControllerAbi } from '@bloxchain/sdk/abi/GuardController';
 * ```
 *
 * The same bytes are also reachable as raw JSON via
 * `@bloxchain/sdk/abi/GuardController.abi.json`, and from the typed barrel
 * `@bloxchain/sdk/abi`.
 */
import type { Abi } from 'viem';
import abiJson from '../abi/GuardController.abi.json' with { type: 'json' };

/** GuardController contract ABI (full, as published in `abi/GuardController.abi.json`). */
export const guardControllerAbi = abiJson as Abi;

/** GuardController ABI entries for custom errors only (for viem `decodeErrorResult`). */
export const guardControllerErrorAbi = guardControllerAbi.filter(
  (item): item is Extract<Abi[number], { type: 'error' }> => item.type === 'error'
);

/** GuardController ABI entries for events only (for viem `decodeEventLog` / `parseEventLogs`). */
export const guardControllerEventAbi = guardControllerAbi.filter(
  (item): item is Extract<Abi[number], { type: 'event' }> => item.type === 'event'
);

export default guardControllerAbi;
