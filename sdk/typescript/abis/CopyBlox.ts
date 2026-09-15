/**
 * CopyBlox contract ABI — the published artifact, reachable without transcription.
 *
 * ```ts
 * import { copyBloxAbi } from '@bloxchain/sdk/abi/CopyBlox';
 * ```
 *
 * The same bytes are also reachable as raw JSON via
 * `@bloxchain/sdk/abi/CopyBlox.abi.json`, and from the typed barrel
 * `@bloxchain/sdk/abi`.
 */
import type { Abi } from 'viem';
import abiJson from '../abi/CopyBlox.abi.json' with { type: 'json' };

/** CopyBlox contract ABI (full, as published in `abi/CopyBlox.abi.json`). */
export const copyBloxAbi = abiJson as Abi;

/** CopyBlox ABI entries for custom errors only (for viem `decodeErrorResult`). */
export const copyBloxErrorAbi = copyBloxAbi.filter(
  (item): item is Extract<Abi[number], { type: 'error' }> => item.type === 'error'
);

/** CopyBlox ABI entries for events only (for viem `decodeEventLog` / `parseEventLogs`). */
export const copyBloxEventAbi = copyBloxAbi.filter(
  (item): item is Extract<Abi[number], { type: 'event' }> => item.type === 'event'
);

export default copyBloxAbi;
