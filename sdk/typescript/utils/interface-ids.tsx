import { Hex, keccak256, toBytes } from 'viem';

/**
 * Utility to calculate ERC165 interface ID from function signatures
 * Interface ID is the XOR of all function selectors (first 4 bytes of keccak256)
 */
function calculateInterfaceId(signatures: string[]): Hex {
  if (signatures.length === 0) {
    return '0x00000000' as Hex;
  }

  let interfaceId = 0n;
  for (const sig of signatures) {
    const selector = keccak256(toBytes(sig)).slice(0, 10) as Hex; // First 4 bytes (10 chars with 0x)
    interfaceId = interfaceId ^ BigInt(selector);
  }

  // Format as 4-byte hex string
  return `0x${interfaceId.toString(16).padStart(8, '0')}` as Hex;
}

/**
 * Interface IDs for component detection
 * These match the interface IDs calculated by Solidity's type(Interface).interfaceId
 * 
 * NOTE: These values are calculated from function signatures and should match
 * the values returned by Solidity's type(Interface).interfaceId.
 * If there are discrepancies, verify against the actual Solidity contract interfaces.
 */

// IBaseStateMachine interface ID
// Calculated from all functions in IBaseStateMachine interface
export const INTERFACE_IDS = {
  // IBaseStateMachine - XOR of all function selectors
  IBaseStateMachine: calculateInterfaceId([
    'createMetaTxParams(address,bytes4,uint8,uint256,uint256,address)',
    'generateUnsignedMetaTransactionForNew(address,address,uint256,uint256,bytes32,bytes4,bytes,(uint256,uint256,address,bytes4,uint256,uint256,address))',
    'generateUnsignedMetaTransactionForExisting(uint256,(uint256,uint256,address,bytes4,uint256,uint256,address))',
    'getTransactionHistory(uint256,uint256)',
    'getTransaction(uint256)',
    'getPendingTransactions()',
    'hasRole(bytes32,address)',
    'isActionSupportedByFunction(bytes4,uint8)',
    'getActiveRolePermissions(bytes32)',
    'getSignerNonce(address)',
    'getSupportedOperationTypes()',
    'getSupportedRoles()',
    'getSupportedFunctions()',
    'getTimeLockPeriodSec()',
    'initialized()'
  ]),

  // ISecureOwnable - XOR of all function selectors in ISecureOwnable interface
  ISecureOwnable: calculateInterfaceId([
    'transferOwnershipRequest()',
    'transferOwnershipDelayedApproval(uint256)',
    'transferOwnershipApprovalWithMetaTx(((uint256,uint256,uint8,(address,address,uint256,uint256,bytes32,bytes4,bytes),bytes32,bytes,(address,uint256,address,uint256)),(uint256,uint256,address,bytes4,uint8,uint256,uint256,address),bytes32,bytes,bytes))',
    'transferOwnershipCancellation(uint256)',
    'transferOwnershipCancellationWithMetaTx(((uint256,uint256,uint8,(address,address,uint256,uint256,bytes32,bytes4,bytes),bytes32,bytes,(address,uint256,address,uint256)),(uint256,uint256,address,bytes4,uint8,uint256,uint256,address),bytes32,bytes,bytes))',
    'updateBroadcasterRequest(address,uint256)',
    'updateBroadcasterDelayedApproval(uint256)',
    'updateBroadcasterApprovalWithMetaTx(((uint256,uint256,uint8,(address,address,uint256,uint256,bytes32,bytes4,bytes),bytes32,bytes,(address,uint256,address,uint256)),(uint256,uint256,address,bytes4,uint8,uint256,uint256,address),bytes32,bytes,bytes))',
    'updateBroadcasterCancellation(uint256)',
    'updateBroadcasterCancellationWithMetaTx(((uint256,uint256,uint8,(address,address,uint256,uint256,bytes32,bytes4,bytes),bytes32,bytes,(address,uint256,address,uint256)),(uint256,uint256,address,bytes4,uint8,uint256,uint256,address),bytes32,bytes,bytes))',
    'updateRecoveryExecutionParams(address)',
    'updateRecoveryRequestAndApprove(((uint256,uint256,uint8,(address,address,uint256,uint256,bytes32,bytes4,bytes),bytes32,bytes,(address,uint256,address,uint256)),(uint256,uint256,address,bytes4,uint8,uint256,uint256,address),bytes32,bytes,bytes))',
    'updateTimeLockExecutionParams(uint256)',
    'updateTimeLockRequestAndApprove(((uint256,uint256,uint8,(address,address,uint256,uint256,bytes32,bytes4,bytes),bytes32,bytes,(address,uint256,address,uint256)),(uint256,uint256,address,bytes4,uint8,uint256,uint256,address),bytes32,bytes,bytes))'
  ]),

  // IRuntimeRBAC - XOR of all function selectors in IRuntimeRBAC interface
  IRuntimeRBAC: calculateInterfaceId([
    'createRole(string,uint256)',
    'updateRole(bytes32,string,uint256)',
    'deleteRole(bytes32)',
    'addWalletToRole(bytes32,address)',
    'revokeWallet(bytes32,address)',
    'replaceWalletInRole(bytes32,address,address)',
    'addFunctionPermissionToRole(bytes32,bytes4,uint8)',
    'removeFunctionPermissionFromRole(bytes32,bytes4)',
    'getRuntimeRoles()',
    'getAllRoles()',
    'getRoleInfo(bytes32)',
    'hasRole(bytes32,address)',
    'getWalletsInRole(bytes32)',
    'getRolePermissions(bytes32)',
    'isRoleProtected(bytes32)',
    'getRoleWalletCount(bytes32)',
    'isRoleAtCapacity(bytes32)'
  ]),

  // IGuardController - XOR of all function selectors in IGuardController interface
  IGuardController: calculateInterfaceId([
    'initialize(address,address,address,uint256,address)',
    'executeWithTimeLock(address,uint256,bytes4,bytes,uint256,bytes32)',
    'approveTimeLockExecution(uint256,bytes32)',
    'cancelTimeLockExecution(uint256,bytes32)',
    'approveTimeLockExecutionWithMetaTx(((uint256,uint256,uint8,(address,address,uint256,uint256,bytes32,bytes4,bytes),bytes32,bytes,(address,uint256,address,uint256)),(uint256,uint256,address,bytes4,uint8,uint256,uint256,address),bytes32,bytes,bytes),bytes32,bytes4)',
    'cancelTimeLockExecutionWithMetaTx(((uint256,uint256,uint8,(address,address,uint256,uint256,bytes32,bytes4,bytes),bytes32,bytes,(address,uint256,address,uint256)),(uint256,uint256,address,bytes4,uint8,uint256,uint256,address),bytes32,bytes,bytes),bytes32,bytes4)',
    'requestAndApproveExecution(((uint256,uint256,uint8,(address,address,uint256,uint256,bytes32,bytes4,bytes),bytes32,bytes,(address,uint256,address,uint256)),(uint256,uint256,address,bytes4,uint8,uint256,uint256,address),bytes32,bytes,bytes),bytes4)'
  ])
} as const;

/**
 * Helper function to check if a contract supports a specific interface
 * @param contract The contract instance (must have supportsInterface method)
 * @param interfaceId The interface ID to check
 * @returns Promise<boolean> indicating if the interface is supported
 */
export async function supportsInterface(
  contract: { supportsInterface: (interfaceId: Hex) => Promise<boolean> },
  interfaceId: Hex
): Promise<boolean> {
  return contract.supportsInterface(interfaceId);
}

/**
 * Helper functions to check for specific component interfaces
 */
export const ComponentDetection = {
  /**
   * Check if contract supports IBaseStateMachine interface
   */
  async isBaseStateMachine(contract: { supportsInterface: (interfaceId: Hex) => Promise<boolean> }): Promise<boolean> {
    return supportsInterface(contract, INTERFACE_IDS.IBaseStateMachine);
  },

  /**
   * Check if contract supports ISecureOwnable interface
   */
  async isSecureOwnable(contract: { supportsInterface: (interfaceId: Hex) => Promise<boolean> }): Promise<boolean> {
    return supportsInterface(contract, INTERFACE_IDS.ISecureOwnable);
  },

  /**
   * Check if contract has SecureOwnable features by checking for specific functions
   */
  async hasSecureOwnableFeatures(contract: any): Promise<boolean> {
    try {
      // Check if transferOwnershipRequest exists
      if (typeof contract.transferOwnershipRequest === 'function') {
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  /**
   * Check if contract supports IRuntimeRBAC interface
   */
  async isRuntimeRBAC(contract: { supportsInterface: (interfaceId: Hex) => Promise<boolean> }): Promise<boolean> {
    return supportsInterface(contract, INTERFACE_IDS.IRuntimeRBAC);
  },

  /**
   * Check if contract supports IGuardController interface
   */
  async isGuardController(contract: { supportsInterface: (interfaceId: Hex) => Promise<boolean> }): Promise<boolean> {
    return supportsInterface(contract, INTERFACE_IDS.IGuardController);
  }
};

export default INTERFACE_IDS;
