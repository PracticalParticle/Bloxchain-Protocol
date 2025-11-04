import { Hex } from 'viem';
import { TxAction, TxStatus } from '../../../types/lib.index';
import { WorkflowType, PhaseType } from './constants';

/**
 * Core workflow types for utilities
 * These types are used throughout the workflow system
 */

/**
 * Single step in a workflow
 */
export interface WorkflowStep {
  functionName: string;
  functionSelector: Hex;
  action: TxAction;
  roles: string[];
  description: string;
  isOffChain: boolean;
  phaseType: PhaseType | string; // Support both PhaseType and string for compatibility
}

/**
 * Complete workflow path
 */
export interface WorkflowPath {
  name: string;
  description: string;
  steps: WorkflowStep[];
  workflowType: WorkflowType | number; // Support both WorkflowType and number for compatibility
  estimatedTimeSec: bigint;
  requiresSignature: boolean;
  hasOffChainPhase: boolean;
}

/**
 * Complete operation workflow
 */
export interface OperationWorkflow {
  operationType: Hex;
  operationName: string;
  paths: WorkflowPath[];
  supportedRoles: string[];
  transitionMap: WorkflowTransitionMap;
}

/**
 * Workflow interface for the Workflow class
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
 * Transition mapping for a specific action from a status
 */
export interface ActionTransition {
  action: TxAction;
  functionName?: string; // Only populated if isActive
  functionSelector?: Hex; // Only populated if isActive
  fromStatus: TxStatus;
  toStatus: TxStatus | TxStatus[]; // Can transition to multiple statuses (COMPLETED or FAILED)
  description: string;
  isActive: boolean; // True if this transition is used in the workflow
  baseFunctionName?: string; // Reference: internal StateAbstraction function name
}

/**
 * Complete transition map for a workflow operation
 */
export interface WorkflowTransitionMap {
  operationType: Hex;
  operationName: string;
  transitions: Record<TxStatus, ActionTransition[]>;
}

/**
 * Workflow builder options
 */
export interface WorkflowBuilderOptions {
  operationType: Hex;
  operationName: string;
  paths: WorkflowPath[];
  supportedRoles: string[];
  generateTransitionMap?: boolean; // Auto-generate transition map (default: true)
}

/**
 * Workflow validation result
 */
export interface WorkflowValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

