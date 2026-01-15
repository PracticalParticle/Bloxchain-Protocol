import { Hex } from 'viem';
import { TxStatus, TxAction } from '../../../types/lib.index';
import { 
  OperationWorkflow, 
  WorkflowPath,
  IWorkflow,
  WorkflowTransitionMap,
  ActionTransition
} from './workflow-types';
import { WorkflowRegistry } from './WorkflowRegistry';

/**
 * Workflow class for accessing workflow definitions
 * 
 * This class provides type-safe access to workflow definitions without requiring
 * contract calls. Workflows are now defined as TypeScript utilities.
 * 
 * Workflows can be registered via extensions (e.g., SecureOwnable, RuntimeRBAC)
 * or custom workflows can be added.
 * 
 * @example
 * ```typescript
 * // Create empty workflow (no extensions loaded)
 * const workflow = new Workflow();
 * 
 * // Register an extension
 * workflow.registerExtension(getSecureOwnableExtension());
 * 
 * // Get all operation workflows
 * const workflows = await workflow.getOperationWorkflows();
 * 
 * // Get workflow for specific operation
 * const workflowInfo = await workflow.getWorkflowForOperation('0xabcd...');
 * ```
 */
export class Workflow implements IWorkflow {
  private registry: WorkflowRegistry;

  /**
   * Create a new Workflow instance
   * @param registry Optional WorkflowRegistry instance. If not provided, creates a new one.
   */
  constructor(registry?: WorkflowRegistry) {
    this.registry = registry || new WorkflowRegistry();
  }

  /**
   * Register workflow extension
   * @param workflows Array of workflows to register
   */
  registerExtension(workflows: OperationWorkflow[]): void {
    this.registry.registerWorkflows(workflows);
  }

  /**
   * Returns all operation workflows
   * @returns Array of operation workflow definitions
   */
  async getOperationWorkflows(): Promise<OperationWorkflow[]> {
    return this.registry.getAllWorkflows();
  }
  
  /**
   * Returns workflow information for a specific operation type
   * @param operationType The operation type hash to get workflow for
   * @returns OperationWorkflow struct containing workflow information for the operation
   */
  async getWorkflowForOperation(operationType: Hex): Promise<OperationWorkflow> {
    const workflow = this.registry.getWorkflow(operationType);
    if (!workflow) {
      throw new Error(`Workflow not found for operation type: ${operationType}`);
    }
    return workflow;
  }
  
  /**
   * Returns all available workflow paths
   * @returns Array of workflow path definitions
   */
  async getWorkflowPaths(): Promise<WorkflowPath[]> {
    return this.registry.getAllWorkflowPaths();
  }

  /**
   * Utility method to get workflow by operation name
   * @param operationName The name of the operation to find workflow for
   * @returns The workflow if found, undefined otherwise
   */
  async getWorkflowByOperationName(operationName: string): Promise<OperationWorkflow | undefined> {
    return this.registry.getWorkflowByName(operationName);
  }

  /**
   * Utility method to get all workflow paths for a specific workflow type
   * @param workflowType The workflow type to filter by
   * @returns Array of workflow paths matching the type
   */
  async getWorkflowPathsByType(workflowType: number): Promise<WorkflowPath[]> {
    const allPaths = await this.getWorkflowPaths();
    return allPaths.filter(path => path.workflowType === workflowType);
  }

  /**
   * Utility method to get all off-chain workflow steps
   * @returns Array of workflow paths that have off-chain phases
   */
  async getOffChainSteps(): Promise<WorkflowPath[]> {
    const allPaths = await this.getWorkflowPaths();
    return allPaths.filter(path => path.hasOffChainPhase);
  }

  /**
   * Utility method to get workflow paths that require signatures
   * @returns Array of workflow paths that require signatures
   */
  async getSignatureRequiredPaths(): Promise<WorkflowPath[]> {
    const allPaths = await this.getWorkflowPaths();
    return allPaths.filter(path => path.requiresSignature);
  }

  /**
   * Returns function selectors for steps in a workflow that match a TxAction
   * @param operationType The operation type to get selectors for
   * @param action The action to filter by
   * @returns Array of function selectors
   */
  async getFunctionSelectorsForAction(operationType: Hex, action: number): Promise<Hex[]> {
    const wf = await this.getWorkflowForOperation(operationType);
    return getFunctionSelectorsForActionFromWorkflow(wf, action);
  }

  /**
   * Check if a workflow exists for the given operation type
   * @param operationType The operation type hash
   * @returns True if workflow exists
   */
  hasWorkflow(operationType: Hex): boolean {
    return this.registry.hasWorkflow(operationType);
  }

  /**
   * Get count of registered workflows
   * @returns Number of registered workflows
   */
  getWorkflowCount(): number {
    return this.registry.getWorkflowCount();
  }

  /**
   * Clear all registered workflows
   */
  clear(): void {
    this.registry.clear();
  }

  /**
   * Get transition map for a specific operation type
   * @param operationType The operation type hash
   * @returns Transition map for the operation
   */
  async getTransitionMap(operationType: Hex): Promise<WorkflowTransitionMap> {
    const workflow = await this.getWorkflowForOperation(operationType);
    return workflow.transitionMap;
  }

  /**
   * Get all available transitions from a specific status for an operation
   * @param operationType The operation type hash
   * @param currentStatus Current transaction status
   * @returns Array of available transitions
   */
  async getTransitionsFromStatus(
    operationType: Hex,
    currentStatus: TxStatus
  ): Promise<ActionTransition[]> {
    const transitionMap = await this.getTransitionMap(operationType);
    return transitionMap.transitions[currentStatus] || [];
  }

  /**
   * Get active transitions (isActive: true) for an operation from a status
   * @param operationType The operation type hash
   * @param currentStatus Current transaction status
   * @returns Array of active transitions
   */
  async getActiveTransitions(
    operationType: Hex,
    currentStatus: TxStatus
  ): Promise<ActionTransition[]> {
    const allTransitions = await this.getTransitionsFromStatus(operationType, currentStatus);
    return allTransitions.filter(t => t.isActive);
  }

  /**
   * Get entry function name and selector for a specific action from a status
   * @param operationType The operation type hash
   * @param currentStatus Current transaction status
   * @param action The action to get function for
   * @returns Function name and selector if found, undefined otherwise
   */
  async getEntryFunctionForAction(
    operationType: Hex,
    currentStatus: TxStatus,
    action: TxAction
  ): Promise<{ functionName: string; functionSelector: Hex } | undefined> {
    const transitions = await this.getActiveTransitions(operationType, currentStatus);
    const transition = transitions.find(t => t.action === action);
    
    if (!transition || !transition.functionName || !transition.functionSelector) {
      return undefined;
    }

    return {
      functionName: transition.functionName,
      functionSelector: transition.functionSelector
    };
  }
}

/**
 * Helper function to extract function selectors for an action from a workflow
 */
function getFunctionSelectorsForActionFromWorkflow(workflow: OperationWorkflow, action: number): Hex[] {
  const selectors: Hex[] = [];
  for (const path of workflow.paths) {
    for (const step of path.steps) {
      if (Number(step.action) === Number(action) && 
          step.functionSelector && 
          step.functionSelector !== '0x00000000' && 
          step.functionSelector !== '0x') {
        // Avoid duplicates
        if (!selectors.includes(step.functionSelector)) {
          selectors.push(step.functionSelector as Hex);
        }
      }
    }
  }
  return selectors;
}

