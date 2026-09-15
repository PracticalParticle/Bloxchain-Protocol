/**
 * SecureOwnableDefinitions contract ABI — the published artifact, reachable without transcription.
 *
 * ```ts
 * import { secureOwnableDefinitionsAbi } from '@bloxchain/sdk/abi/SecureOwnableDefinitions';
 * ```
 *
 * The same bytes are also reachable as raw JSON via
 * `@bloxchain/sdk/abi/SecureOwnableDefinitions.abi.json`, and from the typed barrel
 * `@bloxchain/sdk/abi`.
 */
import abiJson from '../abi/SecureOwnableDefinitions.abi.json' with { type: 'json' };

/** SecureOwnableDefinitions contract ABI (full, as published in `abi/SecureOwnableDefinitions.abi.json`). */
export const secureOwnableDefinitionsAbi = abiJson as readonly unknown[];

/** SecureOwnableDefinitions ABI entries for custom errors only (for viem `decodeErrorResult`). */
export const secureOwnableDefinitionsErrorAbi = (secureOwnableDefinitionsAbi as Array<{ type?: string }>).filter(
  (item) => item.type === 'error'
);

/** SecureOwnableDefinitions ABI entries for events only (for viem `decodeEventLog` / `parseEventLogs`). */
export const secureOwnableDefinitionsEventAbi = (secureOwnableDefinitionsAbi as Array<{ type?: string }>).filter(
  (item) => item.type === 'event'
);

export default secureOwnableDefinitionsAbi;
