// SPDX-License-Identifier: MPL-2.0
pragma solidity ^0.8.25;

import "../core/base/lib/StateAbstraction.sol";

/**
 * @dev Interface for workflow contracts that provide operation workflow definitions
 * 
 * This interface allows contracts to dynamically load their workflow configuration from external
 * workflow contracts, enabling modular and extensible workflow management.
 * 
 * Workflow contracts should implement this interface to provide:
 * - Workflow step definitions (individual steps in a workflow)
 * - Workflow path definitions (complete execution paths)
 * - Operation workflow definitions (workflows for specific operations)
 */
interface IWorkflow {
    /**
     * @dev Struct representing a single step in a workflow
     * @param functionName Name of the function to execute
     * @param functionSelector Function selector (bytes4)
     * @param action The transaction action type
     * @param roles Array of roles that can execute this step
     * @param description Human-readable description of the step
     * @param isOffChain Whether this step is executed off-chain
     * @param phaseType Type of phase ("SIGNING" or "EXECUTION")
     */
    struct WorkflowStep {
        string functionName;
        bytes4 functionSelector;
        StateAbstraction.TxAction action;
        string[] roles;
        string description;
        bool isOffChain;
        string phaseType;
    }

    /**
     * @dev Struct representing a complete workflow path
     * @param name Name of the workflow path
     * @param description Human-readable description of the path
     * @param steps Array of steps in this workflow path
     * @param workflowType Type of workflow (0=TIME_DELAY_ONLY, 1=META_TX_ONLY, 2=HYBRID)
     * @param estimatedTimeSec Estimated time to complete in seconds
     * @param requiresSignature Whether this path requires signature
     * @param hasOffChainPhase Whether this path has off-chain steps
     */
    struct WorkflowPath {
        string name;
        string description;
        WorkflowStep[] steps;
        uint8 workflowType;
        uint256 estimatedTimeSec;
        bool requiresSignature;
        bool hasOffChainPhase;
    }

    /**
     * @dev Struct representing a complete operation workflow
     * @param operationType The operation type hash
     * @param operationName Human-readable name of the operation
     * @param paths Array of available workflow paths for this operation
     * @param supportedRoles Array of roles that can execute this operation
     */
    struct OperationWorkflow {
        bytes32 operationType;
        string operationName;
        WorkflowPath[] paths;
        string[] supportedRoles;
    }
    
    /**
     * @dev Returns all operation workflows
     * @return Array of operation workflow definitions
     */
    function getOperationWorkflows() external pure returns (OperationWorkflow[] memory);
    
    /**
     * @dev Returns workflow information for a specific operation type
     * @param operationType The operation type hash to get workflow for
     * @return OperationWorkflow struct containing workflow information for the operation
     */
    function getWorkflowForOperation(bytes32 operationType) external pure returns (OperationWorkflow memory);
    
    /**
     * @dev Returns all available workflow paths
     * @return Array of workflow path definitions
     */
    function getWorkflowPaths() external pure returns (WorkflowPath[] memory);
}
