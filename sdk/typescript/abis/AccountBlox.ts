/**
 * AccountBlox contract ABI — the published artifact, reachable without transcription.
 *
 * ```ts
 * import { accountBloxAbi } from '@bloxchain/sdk/abi/AccountBlox';
 * ```
 *
 * The same bytes are also reachable as raw JSON via
 * `@bloxchain/sdk/abi/AccountBlox.abi.json`, and from the typed barrel
 * `@bloxchain/sdk/abi`.
 */
import abiJson from '../abi/AccountBlox.abi.json' with { type: 'json' };

/** AccountBlox contract ABI (full, as published in `abi/AccountBlox.abi.json`). */
export const accountBloxAbi = abiJson as readonly unknown[];

/** AccountBlox ABI entries for custom errors only (for viem `decodeErrorResult`). */
export const accountBloxErrorAbi = (accountBloxAbi as Array<{ type?: string }>).filter(
  (item) => item.type === 'error'
);

/** AccountBlox ABI entries for events only (for viem `decodeEventLog` / `parseEventLogs`). */
export const accountBloxEventAbi = (accountBloxAbi as Array<{ type?: string }>).filter(
  (item) => item.type === 'event'
);

export default accountBloxAbi;
