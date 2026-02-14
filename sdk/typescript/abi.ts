/**
 * Re-exports contract ABIs for use by consumers (e.g. error decoding).
 * Import from '@bloxchain/sdk/abi'.
 */

import engineBloxAbiJson from './abi/EngineBlox.abi.json';

/** EngineBlox contract ABI (full). */
export const engineBloxAbi = engineBloxAbiJson as readonly unknown[];

/** EngineBlox ABI entries for custom errors only (for decodeErrorResult). */
export const engineBloxErrorAbi = (engineBloxAbi as Array<{ type?: string }>).filter(
  (item) => item.type === 'error'
);
