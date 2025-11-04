import { Hex } from 'viem';
import { OperationWorkflow } from './workflow-types';

/**
 * Registry for managing workflow extensions
 * Allows dynamic registration and lookup of workflows from different modules
 */
export class WorkflowRegistry {
  private workflows: Map<Hex, OperationWorkflow> = new Map();
  private workflowsByName: Map<string, OperationWorkflow> = new Map();

  /**
   * Register workflows from an extension
   * @param workflows Array of workflows to register
   */
  registerWorkflows(workflows: OperationWorkflow[]): void {
    workflows.forEach(wf => {
      this.workflows.set(wf.operationType, wf);
      this.workflowsByName.set(wf.operationName, wf);
    });
  }

  /**
   * Get workflow by operation type
   * @param operationType The operation type hash
   * @returns Workflow if found, undefined otherwise
   */
  getWorkflow(operationType: Hex): OperationWorkflow | undefined {
    return this.workflows.get(operationType);
  }

  /**
   * Get workflow by operation name
   * @param operationName The operation name
   * @returns Workflow if found, undefined otherwise
   */
  getWorkflowByName(operationName: string): OperationWorkflow | undefined {
    return this.workflowsByName.get(operationName);
  }

  /**
   * Get all registered workflows
   * @returns Array of all registered workflows
   */
  getAllWorkflows(): OperationWorkflow[] {
    return Array.from(this.workflows.values());
  }

  /**
   * Get all workflow paths (flattened from all registered workflows)
   * @returns Array of all workflow paths
   */
  getAllWorkflowPaths() {
    const workflows = this.getAllWorkflows();
    return workflows.flatMap(w => w.paths);
  }

  /**
   * Check if a workflow exists for the given operation type
   * @param operationType The operation type hash
   * @returns True if workflow exists
   */
  hasWorkflow(operationType: Hex): boolean {
    return this.workflows.has(operationType);
  }

  /**
   * Clear all registered workflows
   */
  clear(): void {
    this.workflows.clear();
    this.workflowsByName.clear();
  }

  /**
   * Get count of registered workflows
   * @returns Number of registered workflows
   */
  getWorkflowCount(): number {
    return this.workflows.size;
  }
}

