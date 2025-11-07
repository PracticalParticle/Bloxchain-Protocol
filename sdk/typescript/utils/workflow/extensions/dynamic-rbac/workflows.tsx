import { Hex } from 'viem';
import { TxAction } from '../../../../types/lib.index';
import { OperationWorkflow, WorkflowPath } from '../../core/workflow-types';
import { WorkflowType, PhaseType } from '../../core/constants';
import { DYNAMIC_RBAC_OPERATION_TYPES, DYNAMIC_RBAC_FUNCTION_SELECTORS } from '../../../../types/core.access.index';
import { buildWorkflow } from '../../core/workflow-builder';

/**
 * DynamicRBAC workflow definitions
 * These match the workflows defined in DynamicRBACWorkflows.sol
 */

/**
 * Get all operation workflows for DynamicRBAC
 */
export function getDynamicRBACWorkflows(): OperationWorkflow[] {
  return [
    getRoleEditingToggleWorkflow()
  ];
}

/**
 * Get workflow for a specific DynamicRBAC operation type
 */
export function getDynamicRBACWorkflowForOperation(operationType: Hex): OperationWorkflow | undefined {
  const workflows = getDynamicRBACWorkflows();
  return workflows.find(w => w.operationType === operationType);
}

/**
 * Role Editing Toggle Workflow
 */
function getRoleEditingToggleWorkflow(): OperationWorkflow {
  const paths: WorkflowPath[] = [
    // Meta-Transaction Role Toggle
    {
      name: "Meta-Transaction Role Toggle",
      description: "Toggle role editing using meta-transaction (owner signs, broadcaster executes)",
      steps: [
        {
          functionName: "signRoleEditingToggleRequestAndApprove",
          functionSelector: '0x00000000' as Hex,
          action: TxAction.SIGN_META_REQUEST_AND_APPROVE,
          roles: ["OWNER"],
          description: "Owner signs meta-transaction to toggle role editing",
          isOffChain: true,
          phaseType: PhaseType.SIGNING
        },
        {
          functionName: "updateRoleEditingToggleRequestAndApprove",
          functionSelector: DYNAMIC_RBAC_FUNCTION_SELECTORS.ROLE_EDITING_TOGGLE_META_SELECTOR,
          action: TxAction.EXECUTE_META_REQUEST_AND_APPROVE,
          roles: ["BROADCASTER"],
          description: "Broadcaster executes meta-transaction to toggle role editing",
          isOffChain: false,
          phaseType: PhaseType.EXECUTION
        }
      ],
      workflowType: WorkflowType.META_TX_ONLY,
      estimatedTimeSec: BigInt(300), // 5 minutes
      requiresSignature: true,
      hasOffChainPhase: true
    }
  ];

  return buildWorkflow({
    operationType: DYNAMIC_RBAC_OPERATION_TYPES.ROLE_EDITING_TOGGLE,
    operationName: "ROLE_EDITING_TOGGLE",
    paths,
    supportedRoles: ["OWNER", "BROADCASTER"]
  });
}

