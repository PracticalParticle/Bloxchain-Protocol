import { Hex } from 'viem';
import { TxAction, TxStatus } from '../../../types/lib.index';
import { OperationWorkflow, WorkflowTransitionMap, ActionTransition, WorkflowPath, WorkflowStep } from './workflow-types';
import { BASE_TRANSITION_MAP, getBaseFunctionName, getExpectedNextStatus, isFinalStatus } from './transition-map';

/**
 * Simulate workflow path execution to determine status transitions
 * @param path Workflow path to simulate
 * @returns Array of status transitions from the path
 */
function simulatePathExecution(path: WorkflowPath): Array<{
  fromStatus: TxStatus;
  toStatus: TxStatus;
  action: TxAction;
  step: WorkflowStep;
}> {
  const transitions: Array<{
    fromStatus: TxStatus;
    toStatus: TxStatus;
    action: TxAction;
    step: WorkflowStep;
  }> = [];

  let currentStatus = TxStatus.UNDEFINED;

  for (const step of path.steps) {
    // Skip off-chain steps (they don't change status)
    if (step.isOffChain) {
      continue;
    }

    // Get expected next status for this action
    const nextStatus = getExpectedNextStatus(currentStatus, step.action);
    const nextStatusValue = Array.isArray(nextStatus) ? nextStatus[0] : nextStatus;

    transitions.push({
      fromStatus: currentStatus,
      toStatus: nextStatusValue,
      action: step.action,
      step
    });

    // Update current status for next iteration
    currentStatus = nextStatusValue;

    // If we reached a final status, stop
    if (isFinalStatus(currentStatus)) {
      break;
    }
  }

  return transitions;
}

/**
 * Generate a transition map from a workflow
 * Marks transitions as active if they exist in workflow paths
 * @param workflow Workflow to generate transition map for (without transitionMap)
 * @returns Complete transition map for the workflow
 */
export function generateTransitionMapFromWorkflow(
  workflow: Omit<OperationWorkflow, 'transitionMap'>
): WorkflowTransitionMap {
  // Initialize transitions map with all statuses
  const transitions: Record<TxStatus, ActionTransition[]> = {
    [TxStatus.UNDEFINED]: [],
    [TxStatus.PENDING]: [],
    [TxStatus.CANCELLED]: [],
    [TxStatus.COMPLETED]: [],
    [TxStatus.FAILED]: [],
    [TxStatus.REJECTED]: []
  };

  // Track active transitions: Map<`${status}-${action}`, { functionName, selector }>
  const activeTransitions = new Map<string, { functionName: string; selector: Hex; description: string }>();

  // Extract all transitions from workflow paths
  workflow.paths.forEach(path => {
    const pathTransitions = simulatePathExecution(path);
    
    pathTransitions.forEach(({ fromStatus, toStatus, action, step }) => {
      const key = `${fromStatus}-${action}`;
      
      // Mark this transition as active
      if (!activeTransitions.has(key)) {
        activeTransitions.set(key, {
          functionName: step.functionName,
          selector: step.functionSelector,
          description: step.description
        });
      }
    });
  });

  // Build transitions map: add active transitions first
  activeTransitions.forEach(({ functionName, selector, description }, key) => {
    const [statusStr, actionStr] = key.split('-');
    const status = Number(statusStr) as TxStatus;
    const action = Number(actionStr) as TxAction;

    // Get base transition for reference
    const baseTransition = BASE_TRANSITION_MAP[status]?.find(t => t.action === action);
    
    // Determine toStatus
    let toStatus: TxStatus | TxStatus[];
    if (baseTransition) {
      toStatus = baseTransition.toStatus;
    } else {
      // Fallback: try to get from expected next status
      toStatus = getExpectedNextStatus(status, action);
    }

    transitions[status].push({
      action,
      functionName,
      functionSelector: selector,
      fromStatus: status,
      toStatus,
      description,
      isActive: true,
      baseFunctionName: getBaseFunctionName(action)
    });
  });

  // Add inactive base transitions for reference/documentation
  Object.entries(BASE_TRANSITION_MAP).forEach(([statusStr, baseTransitions]) => {
    const status = Number(statusStr) as TxStatus;
    
    baseTransitions.forEach(baseTransition => {
      const key = `${status}-${baseTransition.action}`;
      
      // Only add if not already active
      if (!activeTransitions.has(key)) {
        transitions[status].push({
          ...baseTransition,
          isActive: false,
          // functionName and functionSelector remain undefined (not active)
          baseFunctionName: baseTransition.baseFunctionName || getBaseFunctionName(baseTransition.action)
        });
      }
    });
  });

  // Sort transitions by action for consistency
  Object.keys(transitions).forEach(statusStr => {
    const status = Number(statusStr) as TxStatus;
    transitions[status].sort((a, b) => a.action - b.action);
  });

  return {
    operationType: workflow.operationType,
    operationName: workflow.operationName,
    transitions
  };
}

/**
 * Create a custom workflow at runtime
 * Useful for custom contracts like SimpleVault, SimpleRWA20
 * @param operationType Operation type hash
 * @param operationName Operation name
 * @param paths Workflow paths
 * @param supportedRoles Supported roles
 * @returns Complete workflow with transition map
 */
export function createCustomWorkflow(
  operationType: Hex,
  operationName: string,
  paths: WorkflowPath[],
  supportedRoles: string[]
): OperationWorkflow {
  const workflow = {
    operationType,
    operationName,
    paths,
    supportedRoles
  };

  // Generate transition map from workflow
  const transitionMap = generateTransitionMapFromWorkflow(workflow);

  return {
    ...workflow,
    transitionMap
  };
}

