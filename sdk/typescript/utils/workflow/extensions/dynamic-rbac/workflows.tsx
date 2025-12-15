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
  return [getRoleConfigBatchWorkflow()];
}

/**
 * Get workflow for a specific DynamicRBAC operation type
 */
export function getDynamicRBACWorkflowForOperation(operationType: Hex): OperationWorkflow | undefined {
  const workflows = getDynamicRBACWorkflows();
  return workflows.find(w => w.operationType === operationType);
}

/**
 * RBAC Configuration Batch Workflow
 */
function getRoleConfigBatchWorkflow(): OperationWorkflow {
  const paths: WorkflowPath[] = [
    // Meta-Transaction RBAC configuration batch
    {
      name: 'Meta-Transaction RBAC Config Batch',
      description: 'Apply a batch of RBAC configuration changes via meta-transaction (owner signs, broadcaster executes)',
      steps: [
        {
          functionName: 'signRoleConfigBatchRequestAndApprove',
          functionSelector: '0x00000000' as Hex,
          action: TxAction.SIGN_META_REQUEST_AND_APPROVE,
          roles: ['OWNER'],
          description: 'Owner signs meta-transaction for RBAC configuration batch',
          isOffChain: true,
          phaseType: PhaseType.SIGNING
        },
        {
          functionName: 'roleConfigBatchRequestAndApprove',
          functionSelector: DYNAMIC_RBAC_FUNCTION_SELECTORS.ROLE_CONFIG_BATCH_META_SELECTOR,
          action: TxAction.EXECUTE_META_REQUEST_AND_APPROVE,
          roles: ['BROADCASTER'],
          description: 'Broadcaster executes RBAC configuration batch',
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
    operationType: DYNAMIC_RBAC_OPERATION_TYPES.ROLE_CONFIG_BATCH,
    operationName: 'ROLE_CONFIG_BATCH',
    paths,
    supportedRoles: ['OWNER', 'BROADCASTER']
  });
}

