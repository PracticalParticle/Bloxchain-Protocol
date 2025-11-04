import { Hex } from 'viem';
import { TxAction } from '../../../../types/lib.index';
import { OperationWorkflow, WorkflowPath } from '../../core/workflow-types';
import { WorkflowType, PhaseType } from '../../core/constants';
import { OPERATION_TYPES, FUNCTION_SELECTORS } from '../../../../types/core.access.index';
import { buildWorkflow } from '../../core/workflow-builder';

/**
 * SecureOwnable workflow definitions
 * These match the workflows defined in SecureOwnableWorkflows.sol
 */

/**
 * Get all operation workflows for SecureOwnable
 */
export function getSecureOwnableWorkflows(): OperationWorkflow[] {
  return [
    getOwnershipTransferWorkflow(),
    getBroadcasterUpdateWorkflow(),
    getRecoveryUpdateWorkflow(),
    getTimeLockUpdateWorkflow()
  ];
}

/**
 * Get workflow for a specific SecureOwnable operation type
 */
export function getSecureOwnableWorkflowForOperation(operationType: Hex): OperationWorkflow | undefined {
  const workflows = getSecureOwnableWorkflows();
  return workflows.find(w => w.operationType === operationType);
}

/**
 * Ownership Transfer Workflow
 */
function getOwnershipTransferWorkflow(): OperationWorkflow {
  const paths: WorkflowPath[] = [
    // Time-Delay Only Workflow
    {
      name: "Time-Delay Only",
      description: "Traditional two-phase operation with mandatory waiting period",
      steps: [
        {
          functionName: "transferOwnershipRequest",
          functionSelector: FUNCTION_SELECTORS.TRANSFER_OWNERSHIP_REQUEST_SELECTOR,
          action: TxAction.EXECUTE_TIME_DELAY_REQUEST,
          roles: ["RECOVERY"],
          description: "Recovery creates ownership transfer request",
          isOffChain: false,
          phaseType: PhaseType.EXECUTION
        },
        {
          functionName: "transferOwnershipDelayedApproval",
          functionSelector: FUNCTION_SELECTORS.TRANSFER_OWNERSHIP_DELAYED_APPROVAL_SELECTOR,
          action: TxAction.EXECUTE_TIME_DELAY_APPROVE,
          roles: ["OWNER", "RECOVERY"],
          description: "Owner or Recovery approves after time delay",
          isOffChain: false,
          phaseType: PhaseType.EXECUTION
        }
      ],
      workflowType: WorkflowType.TIME_DELAY_ONLY,
      estimatedTimeSec: BigInt(86400), // 24 hours
      requiresSignature: false,
      hasOffChainPhase: false
    },
    // Meta-Transaction Approval Workflow
    {
      name: "Meta-Transaction Approval",
      description: "Owner signs approval off-chain, Broadcaster executes on-chain",
      steps: [
        {
          functionName: "transferOwnershipRequest",
          functionSelector: FUNCTION_SELECTORS.TRANSFER_OWNERSHIP_REQUEST_SELECTOR,
          action: TxAction.EXECUTE_TIME_DELAY_REQUEST,
          roles: ["RECOVERY"],
          description: "Recovery creates ownership transfer request",
          isOffChain: false,
          phaseType: PhaseType.EXECUTION
        },
        {
          functionName: "signTransferOwnershipApproval",
          functionSelector: '0x00000000' as Hex,
          action: TxAction.SIGN_META_APPROVE,
          roles: ["OWNER"],
          description: "Owner signs approval off-chain",
          isOffChain: true,
          phaseType: PhaseType.SIGNING
        },
        {
          functionName: "transferOwnershipApprovalWithMetaTx",
          functionSelector: FUNCTION_SELECTORS.TRANSFER_OWNERSHIP_APPROVE_META_SELECTOR,
          action: TxAction.EXECUTE_META_APPROVE,
          roles: ["BROADCASTER"],
          description: "Broadcaster executes signed approval",
          isOffChain: false,
          phaseType: PhaseType.EXECUTION
        }
      ],
      workflowType: WorkflowType.HYBRID,
      estimatedTimeSec: BigInt(0), // Immediate execution after signing
      requiresSignature: true,
      hasOffChainPhase: true
    },
    // Meta-Transaction Cancellation Workflow
    {
      name: "Meta-Transaction Cancellation",
      description: "Owner signs cancellation off-chain, Broadcaster executes on-chain",
      steps: [
        {
          functionName: "transferOwnershipRequest",
          functionSelector: FUNCTION_SELECTORS.TRANSFER_OWNERSHIP_REQUEST_SELECTOR,
          action: TxAction.EXECUTE_TIME_DELAY_REQUEST,
          roles: ["RECOVERY"],
          description: "Recovery creates ownership transfer request",
          isOffChain: false,
          phaseType: PhaseType.EXECUTION
        },
        {
          functionName: "signTransferOwnershipCancellation",
          functionSelector: '0x00000000' as Hex,
          action: TxAction.SIGN_META_CANCEL,
          roles: ["OWNER"],
          description: "Owner signs cancellation off-chain",
          isOffChain: true,
          phaseType: PhaseType.SIGNING
        },
        {
          functionName: "transferOwnershipCancellationWithMetaTx",
          functionSelector: FUNCTION_SELECTORS.TRANSFER_OWNERSHIP_CANCEL_META_SELECTOR,
          action: TxAction.EXECUTE_META_CANCEL,
          roles: ["BROADCASTER"],
          description: "Broadcaster executes signed cancellation",
          isOffChain: false,
          phaseType: PhaseType.EXECUTION
        }
      ],
      workflowType: WorkflowType.HYBRID,
      estimatedTimeSec: BigInt(0),
      requiresSignature: true,
      hasOffChainPhase: true
    },
    // Time-Delay Cancellation Workflow
    {
      name: "Time-Delay Cancellation",
      description: "Cancel pending ownership transfer request after timelock",
      steps: [
        {
          functionName: "transferOwnershipRequest",
          functionSelector: FUNCTION_SELECTORS.TRANSFER_OWNERSHIP_REQUEST_SELECTOR,
          action: TxAction.EXECUTE_TIME_DELAY_REQUEST,
          roles: ["RECOVERY"],
          description: "Recovery creates ownership transfer request",
          isOffChain: false,
          phaseType: PhaseType.EXECUTION
        },
        {
          functionName: "transferOwnershipCancellation",
          functionSelector: FUNCTION_SELECTORS.TRANSFER_OWNERSHIP_CANCELLATION_SELECTOR,
          action: TxAction.EXECUTE_TIME_DELAY_CANCEL,
          roles: ["RECOVERY"],
          description: "Recovery cancels pending request",
          isOffChain: false,
          phaseType: PhaseType.EXECUTION
        }
      ],
      workflowType: WorkflowType.TIME_DELAY_ONLY,
      estimatedTimeSec: BigInt(0), // Immediate (no timelock for cancellation)
      requiresSignature: false,
      hasOffChainPhase: false
    }
  ];

  return buildWorkflow({
    operationType: OPERATION_TYPES.OWNERSHIP_TRANSFER,
    operationName: "OWNERSHIP_TRANSFER",
    paths,
    supportedRoles: ["OWNER", "BROADCASTER", "RECOVERY"]
  });
}

/**
 * Broadcaster Update Workflow
 */
function getBroadcasterUpdateWorkflow(): OperationWorkflow {
  const paths: WorkflowPath[] = [
    // Meta-Transaction Cancellation Workflow
    {
      name: "Meta-Transaction Cancellation",
      description: "Owner signs cancellation off-chain, Broadcaster executes on-chain",
      steps: [
        {
          functionName: "updateBroadcasterRequest",
          functionSelector: FUNCTION_SELECTORS.UPDATE_BROADCASTER_REQUEST_SELECTOR,
          action: TxAction.EXECUTE_TIME_DELAY_REQUEST,
          roles: ["OWNER"],
          description: "Owner creates broadcaster update request",
          isOffChain: false,
          phaseType: PhaseType.EXECUTION
        },
        {
          functionName: "signBroadcasterCancellation",
          functionSelector: '0x00000000' as Hex,
          action: TxAction.SIGN_META_CANCEL,
          roles: ["OWNER"],
          description: "Owner signs cancellation off-chain",
          isOffChain: true,
          phaseType: PhaseType.SIGNING
        },
        {
          functionName: "updateBroadcasterCancellationWithMetaTx",
          functionSelector: FUNCTION_SELECTORS.UPDATE_BROADCASTER_CANCEL_META_SELECTOR,
          action: TxAction.EXECUTE_META_CANCEL,
          roles: ["BROADCASTER"],
          description: "Broadcaster executes signed cancellation",
          isOffChain: false,
          phaseType: PhaseType.EXECUTION
        }
      ],
      workflowType: WorkflowType.HYBRID,
      estimatedTimeSec: BigInt(0),
      requiresSignature: true,
      hasOffChainPhase: true
    },
    // Time-Delay Cancellation Workflow
    {
      name: "Time-Delay Cancellation",
      description: "Cancel pending broadcaster update request after timelock",
      steps: [
        {
          functionName: "updateBroadcasterRequest",
          functionSelector: FUNCTION_SELECTORS.UPDATE_BROADCASTER_REQUEST_SELECTOR,
          action: TxAction.EXECUTE_TIME_DELAY_REQUEST,
          roles: ["OWNER"],
          description: "Owner creates broadcaster update request",
          isOffChain: false,
          phaseType: PhaseType.EXECUTION
        },
        {
          functionName: "updateBroadcasterCancellation",
          functionSelector: FUNCTION_SELECTORS.UPDATE_BROADCASTER_CANCELLATION_SELECTOR,
          action: TxAction.EXECUTE_TIME_DELAY_CANCEL,
          roles: ["OWNER"],
          description: "Owner cancels pending request",
          isOffChain: false,
          phaseType: PhaseType.EXECUTION
        }
      ],
      workflowType: WorkflowType.TIME_DELAY_ONLY,
      estimatedTimeSec: BigInt(0),
      requiresSignature: false,
      hasOffChainPhase: false
    },
    // Meta-Transaction Approval Workflow
    {
      name: "Meta-Transaction Approval",
      description: "Owner signs approval off-chain, Broadcaster executes on-chain",
      steps: [
        {
          functionName: "updateBroadcasterRequest",
          functionSelector: FUNCTION_SELECTORS.UPDATE_BROADCASTER_REQUEST_SELECTOR,
          action: TxAction.EXECUTE_TIME_DELAY_REQUEST,
          roles: ["OWNER"],
          description: "Owner creates broadcaster update request",
          isOffChain: false,
          phaseType: PhaseType.EXECUTION
        },
        {
          functionName: "signBroadcasterApproval",
          functionSelector: '0x00000000' as Hex,
          action: TxAction.SIGN_META_APPROVE,
          roles: ["OWNER"],
          description: "Owner signs approval off-chain",
          isOffChain: true,
          phaseType: PhaseType.SIGNING
        },
        {
          functionName: "updateBroadcasterApprovalWithMetaTx",
          functionSelector: FUNCTION_SELECTORS.UPDATE_BROADCASTER_APPROVE_META_SELECTOR,
          action: TxAction.EXECUTE_META_APPROVE,
          roles: ["BROADCASTER"],
          description: "Broadcaster executes signed approval",
          isOffChain: false,
          phaseType: PhaseType.EXECUTION
        }
      ],
      workflowType: WorkflowType.HYBRID,
      estimatedTimeSec: BigInt(0),
      requiresSignature: true,
      hasOffChainPhase: true
    },
    // Time-Delay Approval Workflow
    {
      name: "Time-Delay Approval",
      description: "Traditional two-phase operation with mandatory waiting period",
      steps: [
        {
          functionName: "updateBroadcasterRequest",
          functionSelector: FUNCTION_SELECTORS.UPDATE_BROADCASTER_REQUEST_SELECTOR,
          action: TxAction.EXECUTE_TIME_DELAY_REQUEST,
          roles: ["OWNER"],
          description: "Owner creates broadcaster update request",
          isOffChain: false,
          phaseType: PhaseType.EXECUTION
        },
        {
          functionName: "updateBroadcasterDelayedApproval",
          functionSelector: FUNCTION_SELECTORS.UPDATE_BROADCASTER_DELAYED_APPROVAL_SELECTOR,
          action: TxAction.EXECUTE_TIME_DELAY_APPROVE,
          roles: ["OWNER"],
          description: "Owner approves after time delay",
          isOffChain: false,
          phaseType: PhaseType.EXECUTION
        }
      ],
      workflowType: WorkflowType.TIME_DELAY_ONLY,
      estimatedTimeSec: BigInt(86400), // 24 hours
      requiresSignature: false,
      hasOffChainPhase: false
    }
  ];

  return buildWorkflow({
    operationType: OPERATION_TYPES.BROADCASTER_UPDATE,
    operationName: "BROADCASTER_UPDATE",
    paths,
    supportedRoles: ["OWNER", "BROADCASTER"]
  });
}

/**
 * Recovery Update Workflow
 */
function getRecoveryUpdateWorkflow(): OperationWorkflow {
  const paths: WorkflowPath[] = [
    // Single-Phase Meta-Transaction Workflow
    {
      name: "Single-Phase Meta-Transaction",
      description: "Owner signs request and approval off-chain, Broadcaster executes on-chain",
      steps: [
        {
          functionName: "signRecoveryRequestAndApprove",
          functionSelector: '0x00000000' as Hex,
          action: TxAction.SIGN_META_REQUEST_AND_APPROVE,
          roles: ["OWNER"],
          description: "Owner signs request and approval off-chain",
          isOffChain: true,
          phaseType: PhaseType.SIGNING
        },
        {
          functionName: "updateRecoveryRequestAndApprove",
          functionSelector: FUNCTION_SELECTORS.UPDATE_RECOVERY_META_SELECTOR,
          action: TxAction.EXECUTE_META_REQUEST_AND_APPROVE,
          roles: ["BROADCASTER"],
          description: "Broadcaster executes signed request and approval",
          isOffChain: false,
          phaseType: PhaseType.EXECUTION
        }
      ],
      workflowType: WorkflowType.META_TX_ONLY,
      estimatedTimeSec: BigInt(0),
      requiresSignature: true,
      hasOffChainPhase: true
    }
  ];

  return buildWorkflow({
    operationType: OPERATION_TYPES.RECOVERY_UPDATE,
    operationName: "RECOVERY_UPDATE",
    paths,
    supportedRoles: ["BROADCASTER"]
  });
}

/**
 * TimeLock Update Workflow
 */
function getTimeLockUpdateWorkflow(): OperationWorkflow {
  const paths: WorkflowPath[] = [
    // Single-Phase Meta-Transaction Workflow
    {
      name: "Single-Phase Meta-Transaction",
      description: "Owner signs request and approval off-chain, Broadcaster executes on-chain",
      steps: [
        {
          functionName: "signTimeLockRequestAndApprove",
          functionSelector: '0x00000000' as Hex,
          action: TxAction.SIGN_META_REQUEST_AND_APPROVE,
          roles: ["OWNER"],
          description: "Owner signs request and approval off-chain",
          isOffChain: true,
          phaseType: PhaseType.SIGNING
        },
        {
          functionName: "updateTimeLockRequestAndApprove",
          functionSelector: FUNCTION_SELECTORS.UPDATE_TIMELOCK_META_SELECTOR,
          action: TxAction.EXECUTE_META_REQUEST_AND_APPROVE,
          roles: ["BROADCASTER"],
          description: "Broadcaster executes signed request and approval",
          isOffChain: false,
          phaseType: PhaseType.EXECUTION
        }
      ],
      workflowType: WorkflowType.META_TX_ONLY,
      estimatedTimeSec: BigInt(0),
      requiresSignature: true,
      hasOffChainPhase: true
    }
  ];

  return buildWorkflow({
    operationType: OPERATION_TYPES.TIMELOCK_UPDATE,
    operationName: "TIMELOCK_UPDATE",
    paths,
    supportedRoles: ["BROADCASTER"]
  });
}

