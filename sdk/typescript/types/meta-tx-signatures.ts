/**
 * Canonical ABI type strings for EngineBlox.MetaTransaction in external function signatures.
 * Must match contracts/core/lib/EngineBlox.sol and *Definitions.sol meta-tx handlers.
 */
export const ENGINE_BLOX_META_TRANSACTION_PARAM =
  '((uint256,uint256,uint8,(address,address,uint256,uint256,bytes32,bytes4,bytes),bytes32,bytes32,(address,uint256,address,uint256)),(uint256,uint256,address,bytes4,uint8,uint256,uint256,address),bytes32,bytes,bytes)';

export const ENGINE_BLOX_META_TX_PARAMS =
  '(uint256,uint256,address,bytes4,uint8,uint256,uint256,address)';

/** Build `functionName(EngineBlox.MetaTransaction)` selector string for keccak256 / ERC-165. */
export function metaTxHandlerSignature(functionName: string): string {
  return `${functionName}(${ENGINE_BLOX_META_TRANSACTION_PARAM})`;
}
