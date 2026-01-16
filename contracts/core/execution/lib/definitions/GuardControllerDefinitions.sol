// SPDX-License-Identifier: MPL-2.0
pragma solidity ^0.8.25;

import "../../../base/lib/StateAbstraction.sol";
import "../../../../interfaces/IDefinition.sol";

/**
 * @title GuardControllerDefinitions
 * @dev Library containing predefined definitions for GuardController initialization
 * This library holds static data that can be used to initialize GuardController contracts
 * without increasing the main contract size
 * 
 * This library implements the IDefinition interface and provides both function schema definitions
 * and role permissions for GuardController's public execution functions.
 * 
 * Key Features:
 * - Registers all 6 GuardController public execution functions
 * - Defines role permissions for OWNER_ROLE, BROADCASTER_ROLE, and RECOVERY_ROLE
 * - Supports time-delay and meta-transaction workflows
 * - Matches StateAbstractionDefinitions pattern for consistency
 * 
 * Role Permissions:
 * - OWNER_ROLE: Can sign/request time-delay and meta-transaction operations (6 permissions)
 * - BROADCASTER_ROLE: Can execute meta-transaction operations (3 permissions)
 * - RECOVERY_ROLE: Can execute time-delay operations for recovery scenarios (3 permissions)
 * 
 * @notice This definition provides complete initialization data including both function schemas
 * and role permissions, matching the StateAbstractionDefinitions pattern.
 * @custom:security-contact security@particlecrypto.com
 */
library GuardControllerDefinitions {
    
    // Operation Type Constants
    bytes32 public constant CONTROLLER_OPERATION = keccak256("CONTROLLER_OPERATION");
    
    // Function Selector Constants
    // GuardController: executeWithTimeLock(address,bytes4,bytes,uint256,bytes32)
    bytes4 public constant EXECUTE_WITH_TIMELOCK_SELECTOR = bytes4(keccak256("executeWithTimeLock(address,bytes4,bytes,uint256,bytes32)"));
    
    // GuardController: approveTimeLockExecution(uint256)
    bytes4 public constant APPROVE_TIMELOCK_EXECUTION_SELECTOR = bytes4(keccak256("approveTimeLockExecution(uint256)"));
    
    // GuardController: cancelTimeLockExecution(uint256)
    bytes4 public constant CANCEL_TIMELOCK_EXECUTION_SELECTOR = bytes4(keccak256("cancelTimeLockExecution(uint256)"));
    
    // GuardController: approveTimeLockExecutionWithMetaTx(...)
    bytes4 public constant APPROVE_TIMELOCK_EXECUTION_META_SELECTOR = bytes4(keccak256("approveTimeLockExecutionWithMetaTx((uint256,uint256,uint8,(address,address,uint256,uint256,bytes32,bytes4,bytes),bytes32,bytes,(address,uint256,address,uint256)),(uint256,uint256,address,bytes4,uint8,uint256,uint256,address),bytes32,bytes,bytes))"));
    
    // GuardController: cancelTimeLockExecutionWithMetaTx(...)
    bytes4 public constant CANCEL_TIMELOCK_EXECUTION_META_SELECTOR = bytes4(keccak256("cancelTimeLockExecutionWithMetaTx((uint256,uint256,uint8,(address,address,uint256,uint256,bytes32,bytes4,bytes),bytes32,bytes,(address,uint256,address,uint256)),(uint256,uint256,address,bytes4,uint8,uint256,uint256,address),bytes32,bytes,bytes))"));
    
    // GuardController: requestAndApproveExecution(...)
    bytes4 public constant REQUEST_AND_APPROVE_EXECUTION_SELECTOR = bytes4(keccak256("requestAndApproveExecution((uint256,uint256,uint8,(address,address,uint256,uint256,bytes32,bytes4,bytes),bytes32,bytes,(address,uint256,address,uint256)),(uint256,uint256,address,bytes4,uint8,uint256,uint256,address),bytes32,bytes,bytes))"));
    
    /**
     * @dev Returns predefined function schemas for GuardController execution functions
     * @return Array of function schema definitions
     * 
     * Function schemas define:
     * - GuardController public execution functions
     * - What operation types they belong to (CONTROLLER_OPERATION)
     * - What actions are supported (time-delay request/approve/cancel, meta-tx approve/cancel/request-and-approve)
     * - Whether they are protected
     * 
     * Permission System:
     * - These schemas enable StateAbstraction._checkExecutionPermissions to validate
     *   if callers have permission to call these GuardController functions
     * - Role permissions are defined in getRolePermissions() matching StateAbstractionDefinitions pattern
     */
    function getFunctionSchemas() public pure returns (StateAbstraction.FunctionSchema[] memory) {
        StateAbstraction.FunctionSchema[] memory schemas = new StateAbstraction.FunctionSchema[](6);
        
        // ============ TIME-DELAY WORKFLOW ACTIONS ============
        // Request action for executeWithTimeLock
        StateAbstraction.TxAction[] memory timeDelayRequestActions = new StateAbstraction.TxAction[](1);
        timeDelayRequestActions[0] = StateAbstraction.TxAction.EXECUTE_TIME_DELAY_REQUEST;
        
        // Approve action for approveTimeLockExecution
        StateAbstraction.TxAction[] memory timeDelayApproveActions = new StateAbstraction.TxAction[](1);
        timeDelayApproveActions[0] = StateAbstraction.TxAction.EXECUTE_TIME_DELAY_APPROVE;
        
        // Cancel action for cancelTimeLockExecution
        StateAbstraction.TxAction[] memory timeDelayCancelActions = new StateAbstraction.TxAction[](1);
        timeDelayCancelActions[0] = StateAbstraction.TxAction.EXECUTE_TIME_DELAY_CANCEL;
        
        // ============ META-TRANSACTION WORKFLOW ACTIONS ============
        // Approve action for approveTimeLockExecutionWithMetaTx
        StateAbstraction.TxAction[] memory metaTxApproveActions = new StateAbstraction.TxAction[](2);
        metaTxApproveActions[0] = StateAbstraction.TxAction.SIGN_META_APPROVE;
        metaTxApproveActions[1] = StateAbstraction.TxAction.EXECUTE_META_APPROVE;
        
        // Cancel action for cancelTimeLockExecutionWithMetaTx
        StateAbstraction.TxAction[] memory metaTxCancelActions = new StateAbstraction.TxAction[](2);
        metaTxCancelActions[0] = StateAbstraction.TxAction.SIGN_META_CANCEL;
        metaTxCancelActions[1] = StateAbstraction.TxAction.EXECUTE_META_CANCEL;
        
        // Request and approve action for requestAndApproveExecution
        StateAbstraction.TxAction[] memory metaTxRequestApproveActions = new StateAbstraction.TxAction[](2);
        metaTxRequestApproveActions[0] = StateAbstraction.TxAction.SIGN_META_REQUEST_AND_APPROVE;
        metaTxRequestApproveActions[1] = StateAbstraction.TxAction.EXECUTE_META_REQUEST_AND_APPROVE;
        
        // ============ GUARDCONTROLLER FUNCTION SCHEMAS ============
        
        // Schema 0: GuardController.executeWithTimeLock
        schemas[0] = StateAbstraction.FunctionSchema({
            functionSignature: "executeWithTimeLock(address,bytes4,bytes,uint256,bytes32)",
            functionSelector: EXECUTE_WITH_TIMELOCK_SELECTOR,
            operationType: CONTROLLER_OPERATION,
            operationName: "CONTROLLER_OPERATION",
            supportedActionsBitmap: StateAbstraction.createBitmapFromActions(timeDelayRequestActions),
            isProtected: true
        });
        
        // Schema 1: GuardController.approveTimeLockExecution
        schemas[1] = StateAbstraction.FunctionSchema({
            functionSignature: "approveTimeLockExecution(uint256)",
            functionSelector: APPROVE_TIMELOCK_EXECUTION_SELECTOR,
            operationType: CONTROLLER_OPERATION,
            operationName: "CONTROLLER_OPERATION",
            supportedActionsBitmap: StateAbstraction.createBitmapFromActions(timeDelayApproveActions),
            isProtected: true
        });
        
        // Schema 2: GuardController.cancelTimeLockExecution
        schemas[2] = StateAbstraction.FunctionSchema({
            functionSignature: "cancelTimeLockExecution(uint256)",
            functionSelector: CANCEL_TIMELOCK_EXECUTION_SELECTOR,
            operationType: CONTROLLER_OPERATION,
            operationName: "CONTROLLER_OPERATION",
            supportedActionsBitmap: StateAbstraction.createBitmapFromActions(timeDelayCancelActions),
            isProtected: true
        });
        
        // Schema 3: GuardController.approveTimeLockExecutionWithMetaTx
        schemas[3] = StateAbstraction.FunctionSchema({
            functionSignature: "approveTimeLockExecutionWithMetaTx((uint256,uint256,uint8,(address,address,uint256,uint256,bytes32,bytes4,bytes),bytes32,bytes,(address,uint256,address,uint256)),(uint256,uint256,address,bytes4,uint8,uint256,uint256,address),bytes32,bytes,bytes))",
            functionSelector: APPROVE_TIMELOCK_EXECUTION_META_SELECTOR,
            operationType: CONTROLLER_OPERATION,
            operationName: "CONTROLLER_OPERATION",
            supportedActionsBitmap: StateAbstraction.createBitmapFromActions(metaTxApproveActions),
            isProtected: true
        });
        
        // Schema 4: GuardController.cancelTimeLockExecutionWithMetaTx
        schemas[4] = StateAbstraction.FunctionSchema({
            functionSignature: "cancelTimeLockExecutionWithMetaTx((uint256,uint256,uint8,(address,address,uint256,uint256,bytes32,bytes4,bytes),bytes32,bytes,(address,uint256,address,uint256)),(uint256,uint256,address,bytes4,uint8,uint256,uint256,address),bytes32,bytes,bytes))",
            functionSelector: CANCEL_TIMELOCK_EXECUTION_META_SELECTOR,
            operationType: CONTROLLER_OPERATION,
            operationName: "CONTROLLER_OPERATION",
            supportedActionsBitmap: StateAbstraction.createBitmapFromActions(metaTxCancelActions),
            isProtected: true
        });
        
        // Schema 5: GuardController.requestAndApproveExecution
        schemas[5] = StateAbstraction.FunctionSchema({
            functionSignature: "requestAndApproveExecution((uint256,uint256,uint8,(address,address,uint256,uint256,bytes32,bytes4,bytes),bytes32,bytes,(address,uint256,address,uint256)),(uint256,uint256,address,bytes4,uint8,uint256,uint256,address),bytes32,bytes,bytes))",
            functionSelector: REQUEST_AND_APPROVE_EXECUTION_SELECTOR,
            operationType: CONTROLLER_OPERATION,
            operationName: "CONTROLLER_OPERATION",
            supportedActionsBitmap: StateAbstraction.createBitmapFromActions(metaTxRequestApproveActions),
            isProtected: true
        });
        
        return schemas;
    }
    
    /**
     * @dev Returns predefined role hashes and their corresponding function permissions
     * @return RolePermission struct containing roleHashes and functionPermissions arrays
     * 
     * Role Permissions:
     * - OWNER_ROLE: Can sign/request time-delay and meta-transaction operations (6 permissions)
     * - BROADCASTER_ROLE: Can execute meta-transaction operations (3 permissions)
     * - RECOVERY_ROLE: Can execute time-delay operations for recovery scenarios (3 permissions)
     * 
     * Total: 12 role permission entries matching StateAbstractionDefinitions pattern
     */
    function getRolePermissions() public pure returns (IDefinition.RolePermission memory) {
        bytes32[] memory roleHashes;
        StateAbstraction.FunctionPermission[] memory functionPermissions;
        roleHashes = new bytes32[](12);
        functionPermissions = new StateAbstraction.FunctionPermission[](12);
        
        // Owner role permissions (6 entries)
        StateAbstraction.TxAction[] memory ownerTimeLockRequestActions = new StateAbstraction.TxAction[](1);
        ownerTimeLockRequestActions[0] = StateAbstraction.TxAction.EXECUTE_TIME_DELAY_REQUEST;
        
        StateAbstraction.TxAction[] memory ownerTimeLockApproveActions = new StateAbstraction.TxAction[](1);
        ownerTimeLockApproveActions[0] = StateAbstraction.TxAction.EXECUTE_TIME_DELAY_APPROVE;
        
        StateAbstraction.TxAction[] memory ownerTimeLockCancelActions = new StateAbstraction.TxAction[](1);
        ownerTimeLockCancelActions[0] = StateAbstraction.TxAction.EXECUTE_TIME_DELAY_CANCEL;
        
        StateAbstraction.TxAction[] memory ownerMetaTxRequestApproveActions = new StateAbstraction.TxAction[](1);
        ownerMetaTxRequestApproveActions[0] = StateAbstraction.TxAction.SIGN_META_REQUEST_AND_APPROVE;
        
        StateAbstraction.TxAction[] memory ownerMetaTxApproveActions = new StateAbstraction.TxAction[](1);
        ownerMetaTxApproveActions[0] = StateAbstraction.TxAction.SIGN_META_APPROVE;
        
        StateAbstraction.TxAction[] memory ownerMetaTxCancelActions = new StateAbstraction.TxAction[](1);
        ownerMetaTxCancelActions[0] = StateAbstraction.TxAction.SIGN_META_CANCEL;
        
        // Owner: Execute With TimeLock
        roleHashes[0] = StateAbstraction.OWNER_ROLE;
        functionPermissions[0] = StateAbstraction.FunctionPermission({
            functionSelector: EXECUTE_WITH_TIMELOCK_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(ownerTimeLockRequestActions)
        });
        
        // Owner: Approve TimeLock Execution
        roleHashes[1] = StateAbstraction.OWNER_ROLE;
        functionPermissions[1] = StateAbstraction.FunctionPermission({
            functionSelector: APPROVE_TIMELOCK_EXECUTION_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(ownerTimeLockApproveActions)
        });
        
        // Owner: Cancel TimeLock Execution
        roleHashes[2] = StateAbstraction.OWNER_ROLE;
        functionPermissions[2] = StateAbstraction.FunctionPermission({
            functionSelector: CANCEL_TIMELOCK_EXECUTION_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(ownerTimeLockCancelActions)
        });
        
        // Owner: Request And Approve Execution (Meta-Tx)
        roleHashes[3] = StateAbstraction.OWNER_ROLE;
        functionPermissions[3] = StateAbstraction.FunctionPermission({
            functionSelector: REQUEST_AND_APPROVE_EXECUTION_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(ownerMetaTxRequestApproveActions)
        });
        
        // Owner: Approve TimeLock Execution With MetaTx
        roleHashes[4] = StateAbstraction.OWNER_ROLE;
        functionPermissions[4] = StateAbstraction.FunctionPermission({
            functionSelector: APPROVE_TIMELOCK_EXECUTION_META_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(ownerMetaTxApproveActions)
        });
        
        // Owner: Cancel TimeLock Execution With MetaTx
        roleHashes[5] = StateAbstraction.OWNER_ROLE;
        functionPermissions[5] = StateAbstraction.FunctionPermission({
            functionSelector: CANCEL_TIMELOCK_EXECUTION_META_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(ownerMetaTxCancelActions)
        });
        
        // Broadcaster role permissions (3 entries)
        StateAbstraction.TxAction[] memory broadcasterMetaTxRequestApproveActions = new StateAbstraction.TxAction[](1);
        broadcasterMetaTxRequestApproveActions[0] = StateAbstraction.TxAction.EXECUTE_META_REQUEST_AND_APPROVE;
        
        StateAbstraction.TxAction[] memory broadcasterMetaTxApproveActions = new StateAbstraction.TxAction[](1);
        broadcasterMetaTxApproveActions[0] = StateAbstraction.TxAction.EXECUTE_META_APPROVE;
        
        StateAbstraction.TxAction[] memory broadcasterMetaTxCancelActions = new StateAbstraction.TxAction[](1);
        broadcasterMetaTxCancelActions[0] = StateAbstraction.TxAction.EXECUTE_META_CANCEL;
        
        // Broadcaster: Request And Approve Execution (Meta-Tx)
        roleHashes[6] = StateAbstraction.BROADCASTER_ROLE;
        functionPermissions[6] = StateAbstraction.FunctionPermission({
            functionSelector: REQUEST_AND_APPROVE_EXECUTION_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(broadcasterMetaTxRequestApproveActions)
        });
        
        // Broadcaster: Approve TimeLock Execution With MetaTx
        roleHashes[7] = StateAbstraction.BROADCASTER_ROLE;
        functionPermissions[7] = StateAbstraction.FunctionPermission({
            functionSelector: APPROVE_TIMELOCK_EXECUTION_META_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(broadcasterMetaTxApproveActions)
        });
        
        // Broadcaster: Cancel TimeLock Execution With MetaTx
        roleHashes[8] = StateAbstraction.BROADCASTER_ROLE;
        functionPermissions[8] = StateAbstraction.FunctionPermission({
            functionSelector: CANCEL_TIMELOCK_EXECUTION_META_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(broadcasterMetaTxCancelActions)
        });
        
        // Recovery role permissions (3 entries)
        StateAbstraction.TxAction[] memory recoveryTimeLockRequestActions = new StateAbstraction.TxAction[](1);
        recoveryTimeLockRequestActions[0] = StateAbstraction.TxAction.EXECUTE_TIME_DELAY_REQUEST;
        
        StateAbstraction.TxAction[] memory recoveryTimeLockApproveActions = new StateAbstraction.TxAction[](1);
        recoveryTimeLockApproveActions[0] = StateAbstraction.TxAction.EXECUTE_TIME_DELAY_APPROVE;
        
        StateAbstraction.TxAction[] memory recoveryTimeLockCancelActions = new StateAbstraction.TxAction[](1);
        recoveryTimeLockCancelActions[0] = StateAbstraction.TxAction.EXECUTE_TIME_DELAY_CANCEL;
        
        // Recovery: Execute With TimeLock
        roleHashes[9] = StateAbstraction.RECOVERY_ROLE;
        functionPermissions[9] = StateAbstraction.FunctionPermission({
            functionSelector: EXECUTE_WITH_TIMELOCK_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(recoveryTimeLockRequestActions)
        });
        
        // Recovery: Approve TimeLock Execution
        roleHashes[10] = StateAbstraction.RECOVERY_ROLE;
        functionPermissions[10] = StateAbstraction.FunctionPermission({
            functionSelector: APPROVE_TIMELOCK_EXECUTION_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(recoveryTimeLockApproveActions)
        });
        
        // Recovery: Cancel TimeLock Execution
        roleHashes[11] = StateAbstraction.RECOVERY_ROLE;
        functionPermissions[11] = StateAbstraction.FunctionPermission({
            functionSelector: CANCEL_TIMELOCK_EXECUTION_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(recoveryTimeLockCancelActions)
        });
        
        return IDefinition.RolePermission({
            roleHashes: roleHashes,
            functionPermissions: functionPermissions
        });
    }
}
