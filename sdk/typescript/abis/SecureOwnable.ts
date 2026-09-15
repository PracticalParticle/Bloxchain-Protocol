/**
 * SecureOwnable contract ABI — the published artifact, reachable without transcription.
 *
 * ```ts
 * import { secureOwnableAbi } from '@bloxchain/sdk/abi/SecureOwnable';
 * ```
 *
 * The same bytes are also reachable as raw JSON via
 * `@bloxchain/sdk/abi/SecureOwnable.abi.json`, and from the typed barrel
 * `@bloxchain/sdk/abi`.
 */
import abiJson from '../abi/SecureOwnable.abi.json' with { type: 'json' };

/** SecureOwnable contract ABI (full, as published in `abi/SecureOwnable.abi.json`). */
export const secureOwnableAbi = abiJson as readonly unknown[];

/** SecureOwnable ABI entries for custom errors only (for viem `decodeErrorResult`). */
export const secureOwnableErrorAbi = (secureOwnableAbi as Array<{ type?: string }>).filter(
  (item) => item.type === 'error'
);

/** SecureOwnable ABI entries for events only (for viem `decodeEventLog` / `parseEventLogs`). */
export const secureOwnableEventAbi = (secureOwnableAbi as Array<{ type?: string }>).filter(
  (item) => item.type === 'event'
);

export default secureOwnableAbi;
