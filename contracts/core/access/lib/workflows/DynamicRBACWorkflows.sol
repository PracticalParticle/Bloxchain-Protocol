// SPDX-License-Identifier: MPL-2.0
pragma solidity ^0.8.25;

import "../../../base/lib/StateAbstraction.sol";
import "../../../../interfaces/IWorkflow.sol";

/**
 * @title DynamicRBACWorkflows
 * @dev Library containing predefined workflow definitions for DynamicRBAC operations
 * This library holds static workflow data that can be used to understand and execute
 * DynamicRBAC operations without increasing the main contract size
 * 
 * This library implements the IWorkflow interface and provides comprehensive
 * workflow information for all DynamicRBAC operations
 */
library DynamicRBACWorkflows {
    
    // Operation Type Constants
    bytes32 public constant ROLE_EDITING_TOGGLE = keccak256("ROLE_EDITING_TOGGLE");
    
    // Meta-transaction Function Selectors
    bytes4 public constant ROLE_EDITING_TOGGLE_META_SELECTOR = bytes4(keccak256("updateRoleEditingToggleRequestAndApprove(((uint256,uint256,uint8,(address,address,uint256,uint256,bytes32,uint8,bytes),bytes32,bytes,(address,uint256,address,uint256)),(uint256,uint256,address,bytes4,uint8,uint256,uint256,address),bytes32,bytes,bytes))"));
    
    /**
     * @dev Returns all operation workflows
     * @return Array of operation workflow definitions
     */
    function getOperationWorkflows() public pure returns (IWorkflow.OperationWorkflow[] memory) {
        IWorkflow.OperationWorkflow[] memory workflows = new IWorkflow.OperationWorkflow[](1);
        
        // Role Editing Toggle Workflow
        IWorkflow.WorkflowPath[] memory roleTogglePaths = new IWorkflow.WorkflowPath[](1);
        
        // Meta-transaction path for role editing toggle
        IWorkflow.WorkflowStep[] memory metaTxSteps = new IWorkflow.WorkflowStep[](2);
        
        // Step 1: Sign meta-transaction (off-chain)
        string[] memory ownerRoles = new string[](1);
        ownerRoles[0] = "OWNER";
        
        metaTxSteps[0] = IWorkflow.WorkflowStep({
            functionName: "signRoleEditingToggleRequestAndApprove",
            functionSelector: bytes4(0), // No selector for off-chain
            action: StateAbstraction.TxAction.SIGN_META_REQUEST_AND_APPROVE,
            roles: ownerRoles,
            description: "Owner signs meta-transaction to toggle role editing",
            isOffChain: true,
            phaseType: "SIGNING"
        });
        
        // Step 2: Execute meta-transaction (on-chain)
        string[] memory broadcasterRoles = new string[](1);
        broadcasterRoles[0] = "BROADCASTER";
        
        metaTxSteps[1] = IWorkflow.WorkflowStep({
            functionName: "updateRoleEditingToggleRequestAndApprove",
            functionSelector: ROLE_EDITING_TOGGLE_META_SELECTOR,
            action: StateAbstraction.TxAction.EXECUTE_META_REQUEST_AND_APPROVE,
            roles: broadcasterRoles,
            description: "Broadcaster executes meta-transaction to toggle role editing",
            isOffChain: false,
            phaseType: "EXECUTION"
        });
        
        roleTogglePaths[0] = IWorkflow.WorkflowPath({
            name: "Meta-Transaction Role Toggle",
            description: "Toggle role editing using meta-transaction (owner signs, broadcaster executes)",
            steps: metaTxSteps,
            workflowType: 1, // META_TX_ONLY
            estimatedTimeSec: 300, // 5 minutes
            requiresSignature: true,
            hasOffChainPhase: true
        });
        
        string[] memory supportedRoles = new string[](2);
        supportedRoles[0] = "OWNER";
        supportedRoles[1] = "BROADCASTER";
        
        workflows[0] = IWorkflow.OperationWorkflow({
            operationType: ROLE_EDITING_TOGGLE,
            operationName: "Role Editing Toggle",
            paths: roleTogglePaths,
            supportedRoles: supportedRoles
        });
        
        return workflows;
    }
    
    /**
     * @dev Returns workflow information for a specific operation type
     * @param operationType The operation type hash to get workflow for
     * @return OperationWorkflow struct containing workflow information for the operation
     */
    function getWorkflowForOperation(bytes32 operationType) public pure returns (IWorkflow.OperationWorkflow memory) {
        if (operationType == ROLE_EDITING_TOGGLE) {
            IWorkflow.OperationWorkflow[] memory workflows = getOperationWorkflows();
            return workflows[0];
        }
        
        // Return empty workflow for unknown operation types
        IWorkflow.WorkflowPath[] memory emptyPaths = new IWorkflow.WorkflowPath[](0);
        string[] memory emptyRoles = new string[](0);
        
        return IWorkflow.OperationWorkflow({
            operationType: operationType,
            operationName: "",
            paths: emptyPaths,
            supportedRoles: emptyRoles
        });
    }
    
    /**
     * @dev Returns all available workflow paths
     * @return Array of workflow path definitions
     */
    function getWorkflowPaths() public pure returns (IWorkflow.WorkflowPath[] memory) {
        IWorkflow.OperationWorkflow[] memory workflows = getOperationWorkflows();
        IWorkflow.WorkflowPath[] memory allPaths = new IWorkflow.WorkflowPath[](1);
        
        // Extract paths from workflows
        allPaths[0] = workflows[0].paths[0];
        
        return allPaths;
    }
}
