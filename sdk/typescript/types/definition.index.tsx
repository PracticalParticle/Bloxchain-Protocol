import { Hex } from 'viem';
import { Uint16Bitmap } from '../utils/bitmap';
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
  grantedActionsBitmap: Uint16Bitmap; // uint16 - bitmap for TxAction enum
  isHandlerSelector: boolean; // true for handler selector permissions (controls who can access), false for execution selector permissions (defines what action is performed)
}

/**
 * Function schema structure matching StateAbstraction.FunctionSchema
 */
export interface FunctionSchema {
  functionSignature: string;
  functionSelector: Hex;
  operationType: Hex;
  operationName: string;
  supportedActionsBitmap: Uint16Bitmap; // uint16 - bitmap for TxAction enum
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
