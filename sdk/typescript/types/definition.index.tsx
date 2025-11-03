import { Hex } from 'viem';
// import { TxAction } from './lib.index';

/**
 * TypeScript types for IDefinition interface
 * These types correspond to the Solidity structs in IDefinition.sol
 * 
 * Note: Workflow-related types have been moved to workflow.index.tsx
 */

/**
 * Function permission structure matching StateAbstraction.FunctionPermission
 */
export interface FunctionPermission {
  functionSelector: Hex;
  grantedActionsBitmap: number; // uint16 - bitmap for TxAction enum
}

/**
 * Function schema structure matching StateAbstraction.FunctionSchema
 */
export interface FunctionSchema {
  functionName: string;
  functionSelector: Hex;
  operationType: Hex;
  operationName: string;
  supportedActionsBitmap: number; // uint16 - bitmap for TxAction enum
  isProtected: boolean;
}

/**
 * Role permission structure containing role hashes and their function permissions
 */
export interface RolePermission {
  roleHashes: Hex[];
  functionPermissions: FunctionPermission[];
}

// Note: IDefinition interface does not provide getOperationTypes()
// Operation types can be derived from function schemas or queried from BaseStateMachine
