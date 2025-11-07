import { TxAction, TxStatus } from '../../../types/lib.index';
import { ActionTransition } from './workflow-types';

/**
 * Transition mapping utility
 * Maps TxStatus + TxAction to function names and expected status transitions
 * Based on StateAbstraction.sol implementation
 */

/**
 * Base transition map from StateAbstraction.sol
 * This represents all possible transitions (internal StateAbstraction functions)
 * Individual workflows will override with their actual entry functions
 */
export const BASE_TRANSITION_MAP: Record<TxStatus, ActionTransition[]> = {
  [TxStatus.UNDEFINED]: [
    {
      action: TxAction.EXECUTE_TIME_DELAY_REQUEST,
      functionName: undefined, // Only populated if active in workflow
      functionSelector: undefined,
      fromStatus: TxStatus.UNDEFINED,
      toStatus: TxStatus.PENDING,
      description: 'Create a new time-locked transaction request',
      isActive: false, // Base reference, not active by default
      baseFunctionName: 'txRequest'
    },
    {
      action: TxAction.EXECUTE_META_REQUEST_AND_APPROVE,
      functionName: undefined,
      functionSelector: undefined,
      fromStatus: TxStatus.UNDEFINED,
      toStatus: [TxStatus.COMPLETED, TxStatus.FAILED], 
      description: 'Create and immediately approve a transaction via meta-transaction',
      isActive: false,
      baseFunctionName: 'requestAndApprove'
    }
  ],
  [TxStatus.PENDING]: [
    {
      action: TxAction.EXECUTE_TIME_DELAY_APPROVE,
      functionName: undefined,
      functionSelector: undefined,
      fromStatus: TxStatus.PENDING,
      toStatus: [TxStatus.COMPLETED, TxStatus.FAILED], // Execution can succeed or fail
      description: 'Approve a pending transaction after time delay expires',
      isActive: false,
      baseFunctionName: 'txDelayedApproval'
    },
    {
      action: TxAction.EXECUTE_TIME_DELAY_CANCEL,
      functionName: undefined,
      functionSelector: undefined,
      fromStatus: TxStatus.PENDING,
      toStatus: TxStatus.CANCELLED,
      description: 'Cancel a pending transaction',
      isActive: false,
      baseFunctionName: 'txCancellation'
    },
    {
      action: TxAction.EXECUTE_META_APPROVE,
      functionName: undefined,
      functionSelector: undefined,
      fromStatus: TxStatus.PENDING,
      toStatus: [TxStatus.COMPLETED, TxStatus.FAILED], // Execution can succeed or fail
      description: 'Approve a pending transaction via meta-transaction',
      isActive: false,
      baseFunctionName: 'txApprovalWithMetaTx'
    },
    {
      action: TxAction.EXECUTE_META_CANCEL,
      functionName: undefined,
      functionSelector: undefined,
      fromStatus: TxStatus.PENDING,
      toStatus: TxStatus.CANCELLED,
      description: 'Cancel a pending transaction via meta-transaction',
      isActive: false,
      baseFunctionName: 'txCancellationWithMetaTx'
    }
  ],
  [TxStatus.CANCELLED]: [], // Final state, no transitions
  [TxStatus.COMPLETED]: [], // Final state, no transitions
  [TxStatus.FAILED]: [], // Final state, no transitions
  [TxStatus.REJECTED]: [] // Final state, no transitions
};

/**
 * Off-chain actions that don't change status
 */
export const OFF_CHAIN_ACTIONS: TxAction[] = [
  TxAction.SIGN_META_REQUEST_AND_APPROVE,
  TxAction.SIGN_META_APPROVE,
  TxAction.SIGN_META_CANCEL
];

/**
 * Get the function name for a specific action from a status
 * @param currentStatus Current transaction status
 * @param action Action to perform
 * @returns Function name or undefined if transition is not valid
 */
export function getFunctionForAction(
  currentStatus: TxStatus,
  action: TxAction
): string | undefined {
  // Off-chain actions don't have on-chain functions
  if (OFF_CHAIN_ACTIONS.includes(action)) {
    return undefined;
  }

  const transitions = BASE_TRANSITION_MAP[currentStatus].filter(t => t.isActive);
  if (transitions.length === 0) {
    return undefined;
  }
  const transition = transitions.find(t => t.action === action);
  return transition?.functionName;
}

/**
 * Get all available actions from a status
 * @param currentStatus Current transaction status
 * @returns Array of available actions
 */
export function getAvailableActions(currentStatus: TxStatus): TxAction[] {
  const transitions = BASE_TRANSITION_MAP[currentStatus].filter(t => t.isActive);
  if (transitions.length === 0) {
    return [];
  }
  return transitions.map(t => t.action);
}

/**
 * Get the expected next status(es) for an action from a status
 * @param currentStatus Current transaction status
 * @param action Action to perform
 * @returns Array of possible next statuses, or empty array if invalid
 */
export function getNextStatus(
  currentStatus: TxStatus,
  action: TxAction
): TxStatus[] {
  // Off-chain actions don't change status
  if (OFF_CHAIN_ACTIONS.includes(action)) {
    return [currentStatus];
  }

  const transitions = BASE_TRANSITION_MAP[currentStatus].filter(t => t.isActive);
  if (transitions.length === 0) {
    return [];
  }
  const transition = transitions.find(t => t.action === action);
  
  if (!transition) {
    return [];
  }

  // Handle array or single value
  if (Array.isArray(transition.toStatus)) {
    return transition.toStatus;
  }
  
  return [transition.toStatus];
}

/**
 * Get transition information for an action from a status
 * @param currentStatus Current transaction status
 * @param action Action to perform
 * @returns Transition information or undefined if invalid
 */
export function getTransition(
  currentStatus: TxStatus,
  action: TxAction
): ActionTransition | undefined {
  // Off-chain actions don't have transitions
  if (OFF_CHAIN_ACTIONS.includes(action)) {
    return undefined;
  }

  const transitions = BASE_TRANSITION_MAP[currentStatus].filter(t => t.isActive);
  if (transitions.length === 0) {
    return undefined;
  }
  return transitions.find(t => t.action === action);
}

/**
 * Check if a transition is valid
 * @param currentStatus Current transaction status
 * @param action Action to perform
 * @returns True if transition is valid
 */
export function isValidTransition(
  currentStatus: TxStatus,
  action: TxAction
): boolean {
  // Off-chain actions are always "valid" (they just don't change status)
  if (OFF_CHAIN_ACTIONS.includes(action)) {
    return true;
  }

  const transitions = BASE_TRANSITION_MAP[currentStatus].filter(t => t.isActive);
  if (transitions.length === 0) {
    return false;
  }
  return transitions.some(t => t.action === action);
}

/**
 * Get all possible transitions from a status
 * @param currentStatus Current transaction status
 * @returns Array of all possible transitions (filtered by isActive)
 */
export function getTransitionsFromStatus(
  currentStatus: TxStatus
): ActionTransition[] {
  const transitions = BASE_TRANSITION_MAP[currentStatus] || [];
  return transitions.filter(t => t.isActive);
}

/**
 * Get base function name (StateAbstraction internal function) for an action
 * @param action The action to get base function name for
 * @returns Base function name or undefined
 */
export function getBaseFunctionName(action: TxAction): string | undefined {
  // Map actions to their base StateAbstraction function names
  const actionToBaseFunction: Partial<Record<TxAction, string>> = {
    [TxAction.EXECUTE_TIME_DELAY_REQUEST]: 'txRequest',
    [TxAction.EXECUTE_TIME_DELAY_APPROVE]: 'txDelayedApproval',
    [TxAction.EXECUTE_TIME_DELAY_CANCEL]: 'txCancellation',
    [TxAction.SIGN_META_REQUEST_AND_APPROVE]: 'requestAndApprove', // Off-chain signing
    [TxAction.SIGN_META_APPROVE]: 'txApprovalWithMetaTx', // Off-chain signing
    [TxAction.SIGN_META_CANCEL]: 'txCancellationWithMetaTx', // Off-chain signing
    [TxAction.EXECUTE_META_REQUEST_AND_APPROVE]: 'requestAndApprove',
    [TxAction.EXECUTE_META_APPROVE]: 'txApprovalWithMetaTx',
    [TxAction.EXECUTE_META_CANCEL]: 'txCancellationWithMetaTx'
  };
  
  return actionToBaseFunction[action];
}

/**
 * Get expected next status from current status and action
 * @param currentStatus Current transaction status
 * @param action Action to perform
 * @returns Expected next status or array of possible statuses
 */
export function getExpectedNextStatus(
  currentStatus: TxStatus,
  action: TxAction
): TxStatus | TxStatus[] {
  const transition = getTransition(currentStatus, action);
  if (!transition) {
    // If no transition found, return current status (might be off-chain action)
    return currentStatus;
  }
  return transition.toStatus;
}

/**
 * Check if a status is final (no further transitions possible)
 * @param status Transaction status
 * @returns True if status is final
 */
export function isFinalStatus(status: TxStatus): boolean {
  const finalStatuses: TxStatus[] = [
    TxStatus.CANCELLED,
    TxStatus.COMPLETED,
    TxStatus.FAILED,
    TxStatus.REJECTED
  ];
  return finalStatuses.includes(status);
}

