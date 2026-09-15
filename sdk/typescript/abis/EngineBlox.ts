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
import abiJson from '../abi/EngineBlox.abi.json' with { type: 'json' };

/** EngineBlox contract ABI (full, as published in `abi/EngineBlox.abi.json`). */
export const engineBloxAbi = abiJson as readonly unknown[];

/** EngineBlox ABI entries for custom errors only (for viem `decodeErrorResult`). */
export const engineBloxErrorAbi = (engineBloxAbi as Array<{ type?: string }>).filter(
  (item) => item.type === 'error'
);

/** EngineBlox ABI entries for events only (for viem `decodeEventLog` / `parseEventLogs`). */
export const engineBloxEventAbi = (engineBloxAbi as Array<{ type?: string }>).filter(
  (item) => item.type === 'event'
);

export default engineBloxAbi;
