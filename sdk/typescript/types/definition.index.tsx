import { Hex } from 'viem';
// import { TxAction } from './lib.index';

/**
 * TypeScript types for IDefinition interface
 * These types correspond to the Solidity structs in IDefinition.sol
 * 
 * Note: Workflow-related types have been moved to workflow.index.tsx
 */

/**
 * Function permission structure
 */
export interface FunctionPermission {
  functionSelector: Hex;
  allowedRoles: Hex[];
  requiresSignature: boolean;
  isOffChain: boolean;
}

/**
 * Function schema structure
 */
export interface FunctionSchema {
  functionName: string;
  functionSelector: Hex;
  operationType: Hex;
  operationName: string;
  supportedActions: TxAction[];
  isProtected: boolean;
}

/**
 * Role permission structure containing role hashes and their function permissions
 */
export interface RolePermission {
  roleHashes: Hex[];
  functionPermissions: FunctionPermission[];
}

/**
 * Readable operation type (from StateAbstraction)
 */
export interface ReadableOperationType {
  operationType: Hex;
  name: string;
}
