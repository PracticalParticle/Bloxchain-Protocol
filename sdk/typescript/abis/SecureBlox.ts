/**
 * SecureBlox contract ABI — the published artifact, reachable without transcription.
 *
 * ```ts
 * import { secureBloxAbi } from '@bloxchain/sdk/abi/SecureBlox';
 * ```
 *
 * The same bytes are also reachable as raw JSON via
 * `@bloxchain/sdk/abi/SecureBlox.abi.json`, and from the typed barrel
 * `@bloxchain/sdk/abi`.
 */
import abiJson from '../abi/SecureBlox.abi.json' with { type: 'json' };

/** SecureBlox contract ABI (full, as published in `abi/SecureBlox.abi.json`). */
export const secureBloxAbi = abiJson as readonly unknown[];

/** SecureBlox ABI entries for custom errors only (for viem `decodeErrorResult`). */
export const secureBloxErrorAbi = (secureBloxAbi as Array<{ type?: string }>).filter(
  (item) => item.type === 'error'
);

/** SecureBlox ABI entries for events only (for viem `decodeEventLog` / `parseEventLogs`). */
export const secureBloxEventAbi = (secureBloxAbi as Array<{ type?: string }>).filter(
  (item) => item.type === 'event'
);

export default secureBloxAbi;
