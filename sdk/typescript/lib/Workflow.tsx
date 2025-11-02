import { PublicClient, WalletClient, Address, Chain, Hex } from 'viem';
import { 
  IWorkflow, 
  WorkflowConfig
} from '../interfaces/workflow.index';
import { 
  OperationWorkflow, 
  WorkflowPath 
} from '../types/workflow.index';

// Import the ABI
import IWorkflowABI from '../../../abi/IWorkflow.abi.json';

/**
 * Workflow class for interacting with any workflow library
 * that implements the IWorkflow interface
 * 
 * This class provides type-safe access to contract workflows including:
 * - Operation workflows and their execution paths
 * - Workflow steps and role requirements
 * - Workflow type information and timing
 * 
 * @example
 * ```typescript
 * const workflow = new Workflow(
 *   publicClient,
 *   walletClient,
 *   '0x1234...',
 *   chain
 * );
 * 
 * // Get all operation workflows
 * const workflows = await workflow.getOperationWorkflows();
 * 
 * // Get workflow for specific operation
 * const workflow = await workflow.getWorkflowForOperation('0xabcd...');
 * ```
 */
export class Workflow implements IWorkflow {
  protected client: PublicClient;
  protected walletClient: WalletClient | undefined;
  protected contractAddress: Address;
  protected chain: Chain;
  protected config: WorkflowConfig;
  protected workflowAddress?: Address;

  constructor(
    client: PublicClient,
    walletClient: WalletClient | undefined,
    contractAddress: Address,
    chain: Chain,
    config?: Partial<WorkflowConfig>
  ) {
    this.client = client;
    this.walletClient = walletClient;
    this.contractAddress = contractAddress;
    this.chain = chain;
    this.config = {
      contractAddress,
      chainId: chain.id,
      ...config
    };
    // Optional dedicated workflow library address (if deployed separately)
    this.workflowAddress = (config as any)?.workflowAddress as Address | undefined;
  }

  /**
   * Returns all operation workflows
   * @returns Array of operation workflow definitions
   */
  async getOperationWorkflows(): Promise<OperationWorkflow[]> {
    try {
      const result = await this.client.readContract({
        address: this.workflowAddress ?? this.contractAddress,
        abi: IWorkflowABI,
        functionName: 'getOperationWorkflows'
      }) as any[];

      return result.map((workflow: any) => ({
        operationType: workflow.operationType as Hex,
        operationName: workflow.operationName as string,
        paths: workflow.paths.map((path: any) => ({
          name: path.name as string,
          description: path.description as string,
          steps: path.steps.map((step: any) => ({
            functionName: step.functionName as string,
            functionSelector: step.functionSelector as Hex,
            action: step.action as number,
            roles: step.roles as string[],
            description: step.description as string,
            isOffChain: step.isOffChain as boolean,
            phaseType: step.phaseType as string
          })),
          workflowType: path.workflowType as number,
          estimatedTimeSec: BigInt(path.estimatedTimeSec),
          requiresSignature: path.requiresSignature as boolean,
          hasOffChainPhase: path.hasOffChainPhase as boolean
        })),
        supportedRoles: workflow.supportedRoles as string[]
      }));
    } catch (error) {
      throw new Error(`Failed to get operation workflows: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Returns workflow information for a specific operation type
   * @param operationType The operation type hash to get workflow for
   * @returns OperationWorkflow struct containing workflow information for the operation
   */
  async getWorkflowForOperation(operationType: Hex): Promise<OperationWorkflow> {
    try {
      const result = await this.client.readContract({
        address: this.workflowAddress ?? this.contractAddress,
        abi: IWorkflowABI,
        functionName: 'getWorkflowForOperation',
        args: [operationType]
      }) as any;

      return {
        operationType: result.operationType as Hex,
        operationName: result.operationName as string,
        paths: result.paths.map((path: any) => ({
          name: path.name as string,
          description: path.description as string,
          steps: path.steps.map((step: any) => ({
            functionName: step.functionName as string,
            functionSelector: step.functionSelector as Hex,
            action: step.action as number,
            roles: step.roles as string[],
            description: step.description as string,
            isOffChain: step.isOffChain as boolean,
            phaseType: step.phaseType as string
          })),
          workflowType: path.workflowType as number,
          estimatedTimeSec: BigInt(path.estimatedTimeSec),
          requiresSignature: path.requiresSignature as boolean,
          hasOffChainPhase: path.hasOffChainPhase as boolean
        })),
        supportedRoles: result.supportedRoles as string[]
      };
    } catch (error) {
      throw new Error(`Failed to get workflow for operation ${operationType}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Returns all available workflow paths
   * @returns Array of workflow path definitions
   */
  async getWorkflowPaths(): Promise<WorkflowPath[]> {
    try {
      const result = await this.client.readContract({
        address: this.workflowAddress ?? this.contractAddress,
        abi: IWorkflowABI,
        functionName: 'getWorkflowPaths'
      }) as any[];

      return result.map((path: any) => ({
        name: path.name as string,
        description: path.description as string,
        steps: path.steps.map((step: any) => ({
          functionName: step.functionName as string,
          functionSelector: step.functionSelector as Hex,
          action: step.action as number,
          roles: step.roles as string[],
          description: step.description as string,
          isOffChain: step.isOffChain as boolean,
          phaseType: step.phaseType as string
        })),
        workflowType: path.workflowType as number,
        estimatedTimeSec: BigInt(path.estimatedTimeSec),
        requiresSignature: path.requiresSignature as boolean,
        hasOffChainPhase: path.hasOffChainPhase as boolean
      }));
    } catch (error) {
      throw new Error(`Failed to get workflow paths: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Utility method to get workflow by operation name
   * @param operationName The name of the operation to find workflow for
   * @returns The workflow if found, undefined otherwise
   */
  async getWorkflowByOperationName(operationName: string): Promise<OperationWorkflow | undefined> {
    const workflows = await this.getOperationWorkflows();
    return workflows.find(workflow => workflow.operationName === operationName);
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
   * @returns Array of workflow steps that are executed off-chain
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
   * Get contract configuration
   * @returns The current contract configuration
   */
  getConfig(): WorkflowConfig {
    return { ...this.config };
  }

  /**
   * Update contract configuration
   * @param config Partial configuration to update
   */
  updateConfig(config: Partial<WorkflowConfig>): void {
    this.config = { ...this.config, ...config };
    if ((config as any)?.workflowAddress) {
      this.workflowAddress = (config as any).workflowAddress as Address;
    }
  }

  /**
   * Returns function selectors for steps in a workflow that match a TxAction
   */
  async getFunctionSelectorsForAction(operationType: Hex, action: number): Promise<Hex[]> {
    const wf = await this.getWorkflowForOperation(operationType);
    const selectors: Hex[] = [];
    for (const path of wf.paths) {
      for (const step of path.steps) {
        if (Number(step.action) === Number(action) && step.functionSelector && (step.functionSelector as string) !== '0x00000000') {
          selectors.push(step.functionSelector as Hex);
        }
      }
    }
    return selectors;
  }
}
