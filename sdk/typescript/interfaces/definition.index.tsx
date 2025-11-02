import { Address, Hex } from 'viem';
// import { TransactionOptions } from './base.index';
import { 
  ReadableOperationType, 
  FunctionSchema, 
  RolePermission
} from '../types/definition.index';

/**
 * TypeScript interface for IDefinition
 * This interface allows interaction with any definition library that implements IDefinition.sol
 * 
 * Note: Workflow-related functions have been moved to the separate IWorkflow interface
 */
export interface IDefinition {
  /**
   * Returns all operation type definitions
   * @returns Array of operation type definitions
   */
  getOperationTypes(): Promise<ReadableOperationType[]>;
  
  /**
   * Returns all function schema definitions
   * @returns Array of function schema definitions
   */
  getFunctionSchemas(): Promise<FunctionSchema[]>;
  
  /**
   * Returns all role hashes and their corresponding function permissions
   * @returns RolePermission struct containing roleHashes and functionPermissions arrays
   */
  getRolePermissions(): Promise<RolePermission>;
}

/**
 * Configuration options for Definitions client
 */
export interface DefinitionsConfig {
  contractAddress: Address;
  chainId: number;
  rpcUrl?: string;
}


/**
 * Result of contract method calls
 */
export interface ContractResult<T> {
  data: T;
  blockNumber: bigint;
  transactionHash: Hex;
}
