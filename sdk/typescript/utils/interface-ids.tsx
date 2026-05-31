import { Hex, keccak256, toBytes } from 'viem';
import { ENGINE_BLOX_META_TX_PARAMS, metaTxHandlerSignature } from '../types/meta-tx-signatures.js';

/**
 * ERC-165 interface ID: XOR of all function selectors in an interface.
 * Must match Solidity `type(Interface).interfaceId`.
 */
function calculateInterfaceId(signatures: string[]): Hex {
  if (signatures.length === 0) {
    return '0x00000000' as Hex;
  }

  let interfaceId = 0n;
  for (const sig of signatures) {
    interfaceId ^= BigInt(keccak256(toBytes(sig)).slice(0, 10));
  }

  return `0x${interfaceId.toString(16).padStart(8, '0')}` as Hex;
}

/**
 * Interface IDs for component detection (aligned with current `I*` interfaces under contracts/core).
 */
export const INTERFACE_IDS = {
  IBaseStateMachine: calculateInterfaceId([
    'createMetaTxParams(address,bytes4,uint8,uint256,uint256,address)',
    `generateUnsignedMetaTransactionForNew(address,address,uint256,uint256,bytes32,bytes4,bytes,${ENGINE_BLOX_META_TX_PARAMS})`,
    `generateUnsignedMetaTransactionForExisting(uint256,${ENGINE_BLOX_META_TX_PARAMS})`,
    'getTransactionHistory(uint256,uint256)',
    'getTransaction(uint256)',
    'getPendingTransactions()',
    'hasRole(bytes32,address)',
    'getFunctionSchema(bytes4)',
    'getActiveRolePermissions(bytes32)',
    'getSignerNonce(address)',
    'getSupportedOperationTypes()',
    'getSupportedRoles()',
    'getSupportedFunctions()',
    'getTimeLockPeriodSec()',
    'initialized()',
  ]),

  ISecureOwnable: calculateInterfaceId([
    'transferOwnershipRequest()',
    'transferOwnershipDelayedApproval(uint256)',
    metaTxHandlerSignature('transferOwnershipApprovalWithMetaTx'),
    'transferOwnershipCancellation(uint256)',
    metaTxHandlerSignature('transferOwnershipCancellationWithMetaTx'),
    'updateBroadcasterRequest(address,address)',
    'updateBroadcasterDelayedApproval(uint256)',
    metaTxHandlerSignature('updateBroadcasterApprovalWithMetaTx'),
    'updateBroadcasterCancellation(uint256)',
    metaTxHandlerSignature('updateBroadcasterCancellationWithMetaTx'),
    metaTxHandlerSignature('updateRecoveryRequestAndApprove'),
    metaTxHandlerSignature('updateTimeLockRequestAndApprove'),
  ]),

  /** Batch-only RBAC (`IRuntimeRBAC.sol`). */
  IRuntimeRBAC: calculateInterfaceId([
    metaTxHandlerSignature('roleConfigBatchRequestAndApprove'),
  ]),

  IGuardController: calculateInterfaceId([
    'initialize(address,address,address,uint256,address)',
    'executeWithTimeLock(address,uint256,bytes4,bytes,uint256,bytes32)',
    'executeWithPayment(address,uint256,bytes4,bytes,uint256,bytes32,(address,uint256,address,uint256))',
    'approveTimeLockExecution(uint256)',
    'cancelTimeLockExecution(uint256)',
    metaTxHandlerSignature('approveTimeLockExecutionWithMetaTx'),
    metaTxHandlerSignature('cancelTimeLockExecutionWithMetaTx'),
    metaTxHandlerSignature('requestAndApproveExecution'),
  ]),
} as const;

export async function supportsInterface(
  contract: { supportsInterface: (interfaceId: Hex) => Promise<boolean> },
  interfaceId: Hex
): Promise<boolean> {
  return contract.supportsInterface(interfaceId);
}

export const ComponentDetection = {
  async isBaseStateMachine(contract: {
    supportsInterface: (interfaceId: Hex) => Promise<boolean>;
  }): Promise<boolean> {
    return supportsInterface(contract, INTERFACE_IDS.IBaseStateMachine);
  },

  async isSecureOwnable(contract: {
    supportsInterface: (interfaceId: Hex) => Promise<boolean>;
  }): Promise<boolean> {
    return supportsInterface(contract, INTERFACE_IDS.ISecureOwnable);
  },

  async hasSecureOwnableFeatures(contract: { transferOwnershipRequest?: unknown }): Promise<boolean> {
    return typeof contract.transferOwnershipRequest === 'function';
  },

  async isRuntimeRBAC(contract: {
    supportsInterface: (interfaceId: Hex) => Promise<boolean>;
  }): Promise<boolean> {
    return supportsInterface(contract, INTERFACE_IDS.IRuntimeRBAC);
  },

  async isGuardController(contract: {
    supportsInterface: (interfaceId: Hex) => Promise<boolean>;
  }): Promise<boolean> {
    return supportsInterface(contract, INTERFACE_IDS.IGuardController);
  },
};

export default INTERFACE_IDS;
