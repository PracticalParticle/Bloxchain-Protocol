// SPDX-License-Identifier: MPL-2.0
pragma solidity ^0.8.25;

import "../../../base/lib/StateAbstraction.sol";
import "../../../../interfaces/IWorkflow.sol";

/**
 * @title SecureOwnableWorkflows
 * @dev Library containing predefined workflow definitions for SecureOwnable operations
 * This library holds static workflow data that can be used to understand and execute
 * SecureOwnable operations without increasing the main contract size
 * 
 * This library implements the IWorkflow interface and provides comprehensive
 * workflow information for all SecureOwnable operations
 */
library SecureOwnableWorkflows {
    
    // Operation Type Constants
    bytes32 public constant OWNERSHIP_TRANSFER = keccak256("OWNERSHIP_TRANSFER");
    bytes32 public constant BROADCASTER_UPDATE = keccak256("BROADCASTER_UPDATE");
    bytes32 public constant RECOVERY_UPDATE = keccak256("RECOVERY_UPDATE");
    bytes32 public constant TIMELOCK_UPDATE = keccak256("TIMELOCK_UPDATE");
    
    // Function Selector Constants
    bytes4 public constant TRANSFER_OWNERSHIP_SELECTOR = bytes4(keccak256("executeTransferOwnership(address)"));
    bytes4 public constant UPDATE_BROADCASTER_SELECTOR = bytes4(keccak256("executeBroadcasterUpdate(address)"));
    bytes4 public constant UPDATE_RECOVERY_SELECTOR = bytes4(keccak256("executeRecoveryUpdate(address)"));
    bytes4 public constant UPDATE_TIMELOCK_SELECTOR = bytes4(keccak256("executeTimeLockUpdate(uint256)"));
    
    // Time Delay Function Selectors
    bytes4 public constant TRANSFER_OWNERSHIP_REQUEST_SELECTOR = bytes4(keccak256("transferOwnershipRequest()"));
    bytes4 public constant TRANSFER_OWNERSHIP_DELAYED_APPROVAL_SELECTOR = bytes4(keccak256("transferOwnershipDelayedApproval(uint256)"));
    bytes4 public constant TRANSFER_OWNERSHIP_CANCELLATION_SELECTOR = bytes4(keccak256("transferOwnershipCancellation(uint256)"));
    bytes4 public constant UPDATE_BROADCASTER_REQUEST_SELECTOR = bytes4(keccak256("updateBroadcasterRequest(address)"));
    bytes4 public constant UPDATE_BROADCASTER_DELAYED_APPROVAL_SELECTOR = bytes4(keccak256("updateBroadcasterDelayedApproval(uint256)"));
    bytes4 public constant UPDATE_BROADCASTER_CANCELLATION_SELECTOR = bytes4(keccak256("updateBroadcasterCancellation(uint256)"));
    
    // Meta-transaction Function Selectors
    bytes4 public constant TRANSFER_OWNERSHIP_APPROVE_META_SELECTOR = bytes4(keccak256("transferOwnershipApprovalWithMetaTx(((uint256,uint256,uint8,(address,address,uint256,uint256,bytes32,uint8,bytes),bytes32,bytes,(address,uint256,address,uint256)),(uint256,uint256,address,bytes4,uint8,uint256,uint256,address),bytes32,bytes,bytes))"));
    bytes4 public constant TRANSFER_OWNERSHIP_CANCEL_META_SELECTOR = bytes4(keccak256("transferOwnershipCancellationWithMetaTx(((uint256,uint256,uint8,(address,address,uint256,uint256,bytes32,uint8,bytes),bytes32,bytes,(address,uint256,address,uint256)),(uint256,uint256,address,bytes4,uint8,uint256,uint256,address),bytes32,bytes,bytes))"));
    bytes4 public constant UPDATE_BROADCASTER_APPROVE_META_SELECTOR = bytes4(keccak256("updateBroadcasterApprovalWithMetaTx(((uint256,uint256,uint8,(address,address,uint256,uint256,bytes32,uint8,bytes),bytes32,bytes,(address,uint256,address,uint256)),(uint256,uint256,address,bytes4,uint8,uint256,uint256,address),bytes32,bytes,bytes))"));
    bytes4 public constant UPDATE_BROADCASTER_CANCEL_META_SELECTOR = bytes4(keccak256("updateBroadcasterCancellationWithMetaTx(((uint256,uint256,uint8,(address,address,uint256,uint256,bytes32,uint8,bytes),bytes32,bytes,(address,uint256,address,uint256)),(uint256,uint256,address,bytes4,uint8,uint256,uint256,address),bytes32,bytes,bytes))"));
    bytes4 public constant UPDATE_RECOVERY_META_SELECTOR = bytes4(keccak256("updateRecoveryRequestAndApprove(((uint256,uint256,uint8,(address,address,uint256,uint256,bytes32,uint8,bytes),bytes32,bytes,(address,uint256,address,uint256)),(uint256,uint256,address,bytes4,uint8,uint256,uint256,address),bytes32,bytes,bytes))"));
    bytes4 public constant UPDATE_TIMELOCK_META_SELECTOR = bytes4(keccak256("updateTimeLockRequestAndApprove(((uint256,uint256,uint8,(address,address,uint256,uint256,bytes32,uint8,bytes),bytes32,bytes,(address,uint256,address,uint256)),(uint256,uint256,address,bytes4,uint8,uint256,uint256,address),bytes32,bytes,bytes))"));
    
    /**
     * @dev Returns complete workflow information for all SecureOwnable operations
     * @return Array of operation workflows with all possible paths
     */
    function getOperationWorkflows() public pure returns (IWorkflow.OperationWorkflow[] memory) {
        IWorkflow.OperationWorkflow[] memory workflows = new IWorkflow.OperationWorkflow[](4);
        
        workflows[0] = getOwnershipTransferWorkflow();
        workflows[1] = getBroadcasterUpdateWorkflow();
        workflows[2] = getRecoveryUpdateWorkflow();
        workflows[3] = getTimeLockUpdateWorkflow();
        
        return workflows;
    }
    
    /**
     * @dev Returns workflow information for a specific operation type
     * @param operationType The operation type to get workflow for
     * @return Complete workflow information for the operation
     */
    function getWorkflowForOperation(bytes32 operationType) public pure returns (IWorkflow.OperationWorkflow memory) {
        if (operationType == OWNERSHIP_TRANSFER) {
            return getOwnershipTransferWorkflow();
        } else if (operationType == BROADCASTER_UPDATE) {
            return getBroadcasterUpdateWorkflow();
        } else if (operationType == RECOVERY_UPDATE) {
            return getRecoveryUpdateWorkflow();
        } else if (operationType == TIMELOCK_UPDATE) {
            return getTimeLockUpdateWorkflow();
        } else {
            revert("Operation type not supported");
        }
    }
    
    /**
     * @dev Returns all available workflow paths for an operation type
     * @param operationType The operation type to get paths for
     * @return Array of workflow paths
     */
    function getWorkflowPaths(bytes32 operationType) public pure returns (IWorkflow.WorkflowPath[] memory) {
        IWorkflow.OperationWorkflow memory workflow = getWorkflowForOperation(operationType);
        return workflow.paths;
    }
    
    /**
     * @dev Returns all available workflow paths (flattened from all operations)
     * @return Array of workflow path definitions
     */
    function getWorkflowPaths() public pure returns (IWorkflow.WorkflowPath[] memory) {
        IWorkflow.OperationWorkflow[] memory workflows = getOperationWorkflows();
        
        // Count total paths
        uint256 totalPaths = 0;
        for (uint256 i = 0; i < workflows.length; i++) {
            totalPaths += workflows[i].paths.length;
        }
        
        // Flatten all paths
        IWorkflow.WorkflowPath[] memory allPaths = new IWorkflow.WorkflowPath[](totalPaths);
        uint256 pathIndex = 0;
        
        for (uint256 i = 0; i < workflows.length; i++) {
            for (uint256 j = 0; j < workflows[i].paths.length; j++) {
                allPaths[pathIndex] = workflows[i].paths[j];
                pathIndex++;
            }
        }
        
        return allPaths;
    }
    
    /**
     * @dev Returns workflow information for OWNERSHIP_TRANSFER operation
     * Based on actual sanity test workflows
     * @return Complete workflow information
     */
    function getOwnershipTransferWorkflow() private pure returns (IWorkflow.OperationWorkflow memory) {
        IWorkflow.WorkflowPath[] memory paths = new IWorkflow.WorkflowPath[](4);
        
        // Time-Delay Only Workflow (from sanity tests)
        IWorkflow.WorkflowStep[] memory timeDelaySteps = new IWorkflow.WorkflowStep[](2);
        string[] memory recoveryRoles = new string[](1);
        recoveryRoles[0] = "RECOVERY";
        timeDelaySteps[0] = IWorkflow.WorkflowStep({
            functionName: "transferOwnershipRequest",
            functionSelector: TRANSFER_OWNERSHIP_REQUEST_SELECTOR, // 0x572be39b
            action: StateAbstraction.TxAction.EXECUTE_TIME_DELAY_REQUEST, // 0
            roles: recoveryRoles,
            description: "Recovery creates ownership transfer request",
            isOffChain: false,
            phaseType: "EXECUTION"
        });
        string[] memory ownerOrRecoveryRoles = new string[](2);
        ownerOrRecoveryRoles[0] = "OWNER";
        ownerOrRecoveryRoles[1] = "RECOVERY";
        timeDelaySteps[1] = IWorkflow.WorkflowStep({
            functionName: "transferOwnershipDelayedApproval",
            functionSelector: TRANSFER_OWNERSHIP_DELAYED_APPROVAL_SELECTOR, // 0x6cd71b38
            action: StateAbstraction.TxAction.EXECUTE_TIME_DELAY_APPROVE, // 1
            roles: ownerOrRecoveryRoles,
            description: "Owner or Recovery approves after time delay",
            isOffChain: false,
            phaseType: "EXECUTION"
        });
        
        paths[0] = IWorkflow.WorkflowPath({
            name: "Time-Delay Only",
            description: "Traditional two-phase operation with mandatory waiting period",
            steps: timeDelaySteps,
            workflowType: 0, // TIME_DELAY_ONLY
            estimatedTimeSec: 86400, // 24 hours
            requiresSignature: false,
            hasOffChainPhase: false
        });
        
        // Meta-Transaction Approval Workflow (from sanity tests) - Enhanced with off-chain signing
        IWorkflow.WorkflowStep[] memory metaTxSteps = new IWorkflow.WorkflowStep[](3); // Changed from 2 to 3
        metaTxSteps[0] = IWorkflow.WorkflowStep({
            functionName: "transferOwnershipRequest",
            functionSelector: TRANSFER_OWNERSHIP_REQUEST_SELECTOR, // 0x572be39b
            action: StateAbstraction.TxAction.EXECUTE_TIME_DELAY_REQUEST, // 0
            roles: recoveryRoles,
            description: "Recovery creates ownership transfer request",
            isOffChain: false,
            phaseType: "EXECUTION"
        });
        string[] memory ownerRoles = new string[](1);
        ownerRoles[0] = "OWNER";
        metaTxSteps[1] = IWorkflow.WorkflowStep({
            functionName: "signTransferOwnershipApproval",
            functionSelector: bytes4(0), // No selector for off-chain
            action: StateAbstraction.TxAction.SIGN_META_APPROVE, // 4
            roles: ownerRoles,
            description: "Owner signs approval off-chain",
            isOffChain: true,
            phaseType: "SIGNING"
        });
        string[] memory broadcasterRoles = new string[](1);
        broadcasterRoles[0] = "BROADCASTER";
        metaTxSteps[2] = IWorkflow.WorkflowStep({
            functionName: "transferOwnershipApprovalWithMetaTx",
            functionSelector: TRANSFER_OWNERSHIP_APPROVE_META_SELECTOR, // 0xb51ff5ce
            action: StateAbstraction.TxAction.EXECUTE_META_APPROVE, // 7
            roles: broadcasterRoles,
            description: "Broadcaster executes signed approval",
            isOffChain: false,
            phaseType: "EXECUTION"
        });
        
        paths[1] = IWorkflow.WorkflowPath({
            name: "Meta-Transaction Approval",
            description: "Owner signs approval off-chain, Broadcaster executes on-chain",
            steps: metaTxSteps,
            workflowType: 2, // HYBRID
            estimatedTimeSec: 0, // Immediate execution after signing
            requiresSignature: true,
            hasOffChainPhase: true
        });
        
        // Meta-Transaction Cancellation Workflow (from sanity tests) - Enhanced with off-chain signing
        IWorkflow.WorkflowStep[] memory metaCancelSteps = new IWorkflow.WorkflowStep[](3); // Changed from 2 to 3
        metaCancelSteps[0] = IWorkflow.WorkflowStep({
            functionName: "transferOwnershipRequest",
            functionSelector: TRANSFER_OWNERSHIP_REQUEST_SELECTOR, // 0x572be39b
            action: StateAbstraction.TxAction.EXECUTE_TIME_DELAY_REQUEST, // 0
            roles: recoveryRoles,
            description: "Recovery creates ownership transfer request",
            isOffChain: false,
            phaseType: "EXECUTION"
        });
        metaCancelSteps[1] = IWorkflow.WorkflowStep({
            functionName: "signTransferOwnershipCancellation",
            functionSelector: bytes4(0), // No selector for off-chain
            action: StateAbstraction.TxAction.SIGN_META_CANCEL, // 5
            roles: ownerRoles,
            description: "Owner signs cancellation off-chain",
            isOffChain: true,
            phaseType: "SIGNING"
        });
        metaCancelSteps[2] = IWorkflow.WorkflowStep({
            functionName: "transferOwnershipCancellationWithMetaTx",
            functionSelector: TRANSFER_OWNERSHIP_CANCEL_META_SELECTOR, // 0x1ef7c2ec
            action: StateAbstraction.TxAction.EXECUTE_META_CANCEL, // 8
            roles: broadcasterRoles,
            description: "Broadcaster executes signed cancellation",
            isOffChain: false,
            phaseType: "EXECUTION"
        });
        
        paths[2] = IWorkflow.WorkflowPath({
            name: "Meta-Transaction Cancellation",
            description: "Owner signs cancellation off-chain, Broadcaster executes on-chain",
            steps: metaCancelSteps,
            workflowType: 2, // HYBRID
            estimatedTimeSec: 0, // Immediate execution after signing
            requiresSignature: true,
            hasOffChainPhase: true
        });
        
        // Time-Delay Cancellation Workflow (from sanity tests)
        IWorkflow.WorkflowStep[] memory timeCancelSteps = new IWorkflow.WorkflowStep[](2);
        timeCancelSteps[0] = IWorkflow.WorkflowStep({
            functionName: "transferOwnershipRequest",
            functionSelector: TRANSFER_OWNERSHIP_REQUEST_SELECTOR, // 0x572be39b
            action: StateAbstraction.TxAction.EXECUTE_TIME_DELAY_REQUEST, // 0
            roles: recoveryRoles,
            description: "Recovery creates ownership transfer request",
            isOffChain: false,
            phaseType: "EXECUTION"
        });
        timeCancelSteps[1] = IWorkflow.WorkflowStep({
            functionName: "transferOwnershipCancellation",
            functionSelector: TRANSFER_OWNERSHIP_CANCELLATION_SELECTOR, // 0x9d8f6f90
            action: StateAbstraction.TxAction.EXECUTE_TIME_DELAY_CANCEL, // 2
            roles: recoveryRoles,
            description: "Recovery cancels pending request",
            isOffChain: false,
            phaseType: "EXECUTION"
        });
        
        paths[3] = IWorkflow.WorkflowPath({
            name: "Time-Delay Cancellation",
            description: "Cancel pending ownership transfer request after timelock",
            steps: timeCancelSteps,
            workflowType: 0, // TIME_DELAY_ONLY
            estimatedTimeSec: 0, // Immediate (no timelock for cancellation)
            requiresSignature: false,
            hasOffChainPhase: false
        });
        
        string[] memory supportedRoles = new string[](3);
        supportedRoles[0] = "OWNER";
        supportedRoles[1] = "BROADCASTER";
        supportedRoles[2] = "RECOVERY";
        
        return IWorkflow.OperationWorkflow({
            operationType: OWNERSHIP_TRANSFER,
            operationName: "OWNERSHIP_TRANSFER",
            paths: paths,
            supportedRoles: supportedRoles
        });
    }
    
    /**
     * @dev Returns workflow information for BROADCASTER_UPDATE operation
     * Based on actual sanity test workflows
     * @return Complete workflow information
     */
    function getBroadcasterUpdateWorkflow() private pure returns (IWorkflow.OperationWorkflow memory) {
        IWorkflow.WorkflowPath[] memory paths = new IWorkflow.WorkflowPath[](4);
        
        // Declare role arrays for reuse
        string[] memory ownerRoles = new string[](1);
        ownerRoles[0] = "OWNER";
        string[] memory broadcasterRoles = new string[](1);
        broadcasterRoles[0] = "BROADCASTER";
        
        // Meta-Transaction Cancellation Workflow (from sanity tests) - Enhanced with off-chain signing
        IWorkflow.WorkflowStep[] memory metaCancelSteps = new IWorkflow.WorkflowStep[](3); // Changed from 2 to 3
        metaCancelSteps[0] = IWorkflow.WorkflowStep({
            functionName: "updateBroadcasterRequest",
            functionSelector: UPDATE_BROADCASTER_REQUEST_SELECTOR, // 0x... (from tests)
            action: StateAbstraction.TxAction.EXECUTE_TIME_DELAY_REQUEST, // 0
            roles: ownerRoles,
            description: "Owner creates broadcaster update request",
            isOffChain: false,
            phaseType: "EXECUTION"
        });
        metaCancelSteps[1] = IWorkflow.WorkflowStep({
            functionName: "signBroadcasterCancellation",
            functionSelector: bytes4(0), // No selector for off-chain
            action: StateAbstraction.TxAction.SIGN_META_CANCEL, // 5
            roles: ownerRoles,
            description: "Owner signs cancellation off-chain",
            isOffChain: true,
            phaseType: "SIGNING"
        });
        metaCancelSteps[2] = IWorkflow.WorkflowStep({
            functionName: "updateBroadcasterCancellationWithMetaTx",
            functionSelector: UPDATE_BROADCASTER_CANCEL_META_SELECTOR, // 0xf1209daa
            action: StateAbstraction.TxAction.EXECUTE_META_CANCEL, // 8
            roles: broadcasterRoles,
            description: "Broadcaster executes signed cancellation",
            isOffChain: false,
            phaseType: "EXECUTION"
        });
        
        paths[0] = IWorkflow.WorkflowPath({
            name: "Meta-Transaction Cancellation",
            description: "Owner signs cancellation off-chain, Broadcaster executes on-chain",
            steps: metaCancelSteps,
            workflowType: 2, // HYBRID
            estimatedTimeSec: 0, // Immediate execution after signing
            requiresSignature: true,
            hasOffChainPhase: true
        });
        
        // Time-Delay Cancellation Workflow (from sanity tests)
        IWorkflow.WorkflowStep[] memory timeCancelSteps = new IWorkflow.WorkflowStep[](2);
        timeCancelSteps[0] = IWorkflow.WorkflowStep({
            functionName: "updateBroadcasterRequest",
            functionSelector: UPDATE_BROADCASTER_REQUEST_SELECTOR, // 0x... (from tests)
            action: StateAbstraction.TxAction.EXECUTE_TIME_DELAY_REQUEST, // 0
            roles: ownerRoles,
            description: "Owner creates broadcaster update request",
            isOffChain: false,
            phaseType: "EXECUTION"
        });
        timeCancelSteps[1] = IWorkflow.WorkflowStep({
            functionName: "updateBroadcasterCancellation",
            functionSelector: UPDATE_BROADCASTER_CANCELLATION_SELECTOR, // 0x62544d90
            action: StateAbstraction.TxAction.EXECUTE_TIME_DELAY_CANCEL, // 2
            roles: ownerRoles,
            description: "Owner cancels pending request",
            isOffChain: false,
            phaseType: "EXECUTION"
        });
        
        paths[1] = IWorkflow.WorkflowPath({
            name: "Time-Delay Cancellation",
            description: "Cancel pending broadcaster update request after timelock",
            steps: timeCancelSteps,
            workflowType: 0, // TIME_DELAY_ONLY
            estimatedTimeSec: 0, // Immediate (no timelock for cancellation)
            requiresSignature: false,
            hasOffChainPhase: false
        });
        
        // Meta-Transaction Approval Workflow (from sanity tests) - Enhanced with off-chain signing
        IWorkflow.WorkflowStep[] memory metaTxSteps = new IWorkflow.WorkflowStep[](3); // Changed from 2 to 3
        metaTxSteps[0] = IWorkflow.WorkflowStep({
            functionName: "updateBroadcasterRequest",
            functionSelector: UPDATE_BROADCASTER_REQUEST_SELECTOR, // 0x... (from tests)
            action: StateAbstraction.TxAction.EXECUTE_TIME_DELAY_REQUEST, // 0
            roles: ownerRoles,
            description: "Owner creates broadcaster update request",
            isOffChain: false,
            phaseType: "EXECUTION"
        });
        metaTxSteps[1] = IWorkflow.WorkflowStep({
            functionName: "signBroadcasterApproval",
            functionSelector: bytes4(0), // No selector for off-chain
            action: StateAbstraction.TxAction.SIGN_META_APPROVE, // 4
            roles: ownerRoles,
            description: "Owner signs approval off-chain",
            isOffChain: true,
            phaseType: "SIGNING"
        });
        metaTxSteps[2] = IWorkflow.WorkflowStep({
            functionName: "updateBroadcasterApprovalWithMetaTx",
            functionSelector: UPDATE_BROADCASTER_APPROVE_META_SELECTOR, // 0xd04d6238
            action: StateAbstraction.TxAction.EXECUTE_META_APPROVE, // 7
            roles: broadcasterRoles,
            description: "Broadcaster executes signed approval",
            isOffChain: false,
            phaseType: "EXECUTION"
        });
        
        paths[2] = IWorkflow.WorkflowPath({
            name: "Meta-Transaction Approval",
            description: "Owner signs approval off-chain, Broadcaster executes on-chain",
            steps: metaTxSteps,
            workflowType: 2, // HYBRID
            estimatedTimeSec: 0, // Immediate execution after signing
            requiresSignature: true,
            hasOffChainPhase: true
        });
        
        // Time-Delay Approval Workflow (from sanity tests)
        IWorkflow.WorkflowStep[] memory timeDelaySteps = new IWorkflow.WorkflowStep[](2);
        timeDelaySteps[0] = IWorkflow.WorkflowStep({
            functionName: "updateBroadcasterRequest",
            functionSelector: UPDATE_BROADCASTER_REQUEST_SELECTOR, // 0x... (from tests)
            action: StateAbstraction.TxAction.EXECUTE_TIME_DELAY_REQUEST, // 0
            roles: ownerRoles,
            description: "Owner creates broadcaster update request",
            isOffChain: false,
            phaseType: "EXECUTION"
        });
        timeDelaySteps[1] = IWorkflow.WorkflowStep({
            functionName: "updateBroadcasterDelayedApproval",
            functionSelector: UPDATE_BROADCASTER_DELAYED_APPROVAL_SELECTOR, // 0xb7d254d6
            action: StateAbstraction.TxAction.EXECUTE_TIME_DELAY_APPROVE, // 1
            roles: ownerRoles,
            description: "Owner approves after time delay",
            isOffChain: false,
            phaseType: "EXECUTION"
        });
        
        paths[3] = IWorkflow.WorkflowPath({
            name: "Time-Delay Approval",
            description: "Traditional two-phase operation with mandatory waiting period",
            steps: timeDelaySteps,
            workflowType: 0, // TIME_DELAY_ONLY
            estimatedTimeSec: 86400, // 24 hours
            requiresSignature: false,
            hasOffChainPhase: false
        });
        
        string[] memory supportedRoles = new string[](2);
        supportedRoles[0] = "OWNER";
        supportedRoles[1] = "BROADCASTER";
        
        return IWorkflow.OperationWorkflow({
            operationType: BROADCASTER_UPDATE,
            operationName: "BROADCASTER_UPDATE",
            paths: paths,
            supportedRoles: supportedRoles
        });
    }
    
    /**
     * @dev Returns workflow information for RECOVERY_UPDATE operation
     * Based on actual sanity test workflows
     * @return Complete workflow information
     */
    function getRecoveryUpdateWorkflow() private pure returns (IWorkflow.OperationWorkflow memory) {
        IWorkflow.WorkflowPath[] memory paths = new IWorkflow.WorkflowPath[](1);
        
        // Declare role arrays for reuse
        string[] memory ownerRoles = new string[](1);
        ownerRoles[0] = "OWNER";
        string[] memory broadcasterRoles = new string[](1);
        broadcasterRoles[0] = "BROADCASTER";
        
        // Single-Phase Meta-Transaction Workflow (from sanity tests) - Enhanced with off-chain signing
        IWorkflow.WorkflowStep[] memory singlePhaseSteps = new IWorkflow.WorkflowStep[](2); // Changed from 1 to 2
        singlePhaseSteps[0] = IWorkflow.WorkflowStep({
            functionName: "signRecoveryRequestAndApprove",
            functionSelector: bytes4(0), // No selector for off-chain
            action: StateAbstraction.TxAction.SIGN_META_REQUEST_AND_APPROVE, // 3
            roles: ownerRoles,
            description: "Owner signs request and approval off-chain",
            isOffChain: true,
            phaseType: "SIGNING"
        });
        singlePhaseSteps[1] = IWorkflow.WorkflowStep({
            functionName: "updateRecoveryRequestAndApprove",
            functionSelector: UPDATE_RECOVERY_META_SELECTOR, // 0x2aa09cf6
            action: StateAbstraction.TxAction.EXECUTE_META_REQUEST_AND_APPROVE, // 6
            roles: broadcasterRoles,
            description: "Broadcaster executes signed request and approval",
            isOffChain: false,
            phaseType: "EXECUTION"
        });
        
        paths[0] = IWorkflow.WorkflowPath({
            name: "Single-Phase Meta-Transaction",
            description: "Owner signs request and approval off-chain, Broadcaster executes on-chain",
            steps: singlePhaseSteps,
            workflowType: 1, // META_TX_ONLY
            estimatedTimeSec: 0, // Immediate execution after signing
            requiresSignature: true,
            hasOffChainPhase: true
        });
        
        string[] memory supportedRoles = new string[](1);
        supportedRoles[0] = "BROADCASTER";
        
        return IWorkflow.OperationWorkflow({
            operationType: RECOVERY_UPDATE,
            operationName: "RECOVERY_UPDATE",
            paths: paths,
            supportedRoles: supportedRoles
        });
    }
    
    /**
     * @dev Returns workflow information for TIMELOCK_UPDATE operation
     * Based on actual sanity test workflows
     * @return Complete workflow information
     */
    function getTimeLockUpdateWorkflow() private pure returns (IWorkflow.OperationWorkflow memory) {
        IWorkflow.WorkflowPath[] memory paths = new IWorkflow.WorkflowPath[](1);
        
        // Declare role arrays for reuse
        string[] memory ownerRoles = new string[](1);
        ownerRoles[0] = "OWNER";
        string[] memory broadcasterRoles = new string[](1);
        broadcasterRoles[0] = "BROADCASTER";
        
        // Single-Phase Meta-Transaction Workflow (from sanity tests) - Enhanced with off-chain signing
        IWorkflow.WorkflowStep[] memory singlePhaseSteps = new IWorkflow.WorkflowStep[](2); // Changed from 1 to 2
        singlePhaseSteps[0] = IWorkflow.WorkflowStep({
            functionName: "signTimeLockRequestAndApprove",
            functionSelector: bytes4(0), // No selector for off-chain
            action: StateAbstraction.TxAction.SIGN_META_REQUEST_AND_APPROVE, // 3
            roles: ownerRoles,
            description: "Owner signs request and approval off-chain",
            isOffChain: true,
            phaseType: "SIGNING"
        });
        singlePhaseSteps[1] = IWorkflow.WorkflowStep({
            functionName: "updateTimeLockRequestAndApprove",
            functionSelector: UPDATE_TIMELOCK_META_SELECTOR, // 0x... (from tests)
            action: StateAbstraction.TxAction.EXECUTE_META_REQUEST_AND_APPROVE, // 6
            roles: broadcasterRoles,
            description: "Broadcaster executes signed request and approval",
            isOffChain: false,
            phaseType: "EXECUTION"
        });
        
        paths[0] = IWorkflow.WorkflowPath({
            name: "Single-Phase Meta-Transaction",
            description: "Owner signs request and approval off-chain, Broadcaster executes on-chain",
            steps: singlePhaseSteps,
            workflowType: 1, // META_TX_ONLY
            estimatedTimeSec: 0, // Immediate execution after signing
            requiresSignature: true,
            hasOffChainPhase: true
        });
        
        string[] memory supportedRoles = new string[](1);
        supportedRoles[0] = "BROADCASTER";
        
        return IWorkflow.OperationWorkflow({
            operationType: TIMELOCK_UPDATE,
            operationName: "TIMELOCK_UPDATE",
            paths: paths,
            supportedRoles: supportedRoles
        });
    }
}
