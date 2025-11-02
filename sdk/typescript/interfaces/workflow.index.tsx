import { Address, Hex } from 'viem';
// import { TransactionOptions } from './base.index';
import { 
  OperationWorkflow, 
  WorkflowPath 
} from '../types/workflow.index';

/**
 * TypeScript interface for IWorkflow
 * This interface allows interaction with any workflow library that implements IWorkflow.sol
 */
export interface IWorkflow {
  /**
   * Returns all operation workflows
   * @returns Array of operation workflow definitions
   */
  getOperationWorkflows(): Promise<OperationWorkflow[]>;
  
  /**
   * Returns workflow information for a specific operation type
   * @param operationType The operation type hash to get workflow for
   * @returns OperationWorkflow struct containing workflow information for the operation
   */
  getWorkflowForOperation(operationType: Hex): Promise<OperationWorkflow>;
  
  /**
   * Returns all available workflow paths
   * @returns Array of workflow path definitions
   */
  getWorkflowPaths(): Promise<WorkflowPath[]>;
}

/**
 * Configuration options for Workflow client
 */
export interface WorkflowConfig {
  contractAddress: Address;
  chainId: number;
  rpcUrl?: string;
}

/**
 * Result of workflow method calls
 */
export interface WorkflowResult<T> {
  data: T;
  blockNumber: bigint;
  transactionHash: Hex;
}
