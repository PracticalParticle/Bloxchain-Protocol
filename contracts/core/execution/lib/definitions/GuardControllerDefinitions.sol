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
 * This library implements the IDefinition interface and provides function schema definitions
 * for GuardController's public execution functions. It does NOT include role permissions,
 * allowing contracts to manage roles dynamically via DynamicRBAC or other mechanisms.
 * 
 * Key Features:
 * - Registers all 6 GuardController public execution functions
 * - Function schemas only (no role permissions)
 * - Supports time-delay and meta-transaction workflows
 * - Modular design - roles can be added separately via DynamicRBAC
 * 
 * @notice This definition only registers functions. Role permissions must be configured
 * separately via DynamicRBAC or other role management systems.
 * @custom:security-contact security@particlecrypto.com
 */
library GuardControllerDefinitions {
    
    // Operation Type Constants
    bytes32 public constant CONTROLLER_OPERATION = keccak256("CONTROLLER_OPERATION");
    
    // Function Selector Constants
    // GuardController: executeWithTimeLock(address,uint256,bytes4,bytes,uint256,bytes32)
    bytes4 public constant EXECUTE_WITH_TIMELOCK_SELECTOR = bytes4(keccak256("executeWithTimeLock(address,uint256,bytes4,bytes,uint256,bytes32)"));
    
    // GuardController: approveTimeLockExecution(uint256,bytes32)
    bytes4 public constant APPROVE_TIMELOCK_EXECUTION_SELECTOR = bytes4(keccak256("approveTimeLockExecution(uint256,bytes32)"));
    
    // GuardController: cancelTimeLockExecution(uint256,bytes32)
    bytes4 public constant CANCEL_TIMELOCK_EXECUTION_SELECTOR = bytes4(keccak256("cancelTimeLockExecution(uint256,bytes32)"));
    
    // GuardController: approveTimeLockExecutionWithMetaTx(...)
    bytes4 public constant APPROVE_TIMELOCK_EXECUTION_META_SELECTOR = bytes4(keccak256("approveTimeLockExecutionWithMetaTx((uint256,uint256,uint8,(address,address,uint256,uint256,bytes32,bytes4,bytes),bytes32,bytes,(address,uint256,address,uint256)),(uint256,uint256,address,bytes4,uint8,uint256,uint256,address),bytes32,bytes,bytes),bytes32,bytes4)"));
    
    // GuardController: cancelTimeLockExecutionWithMetaTx(...)
    bytes4 public constant CANCEL_TIMELOCK_EXECUTION_META_SELECTOR = bytes4(keccak256("cancelTimeLockExecutionWithMetaTx((uint256,uint256,uint8,(address,address,uint256,uint256,bytes32,bytes4,bytes),bytes32,bytes,(address,uint256,address,uint256)),(uint256,uint256,address,bytes4,uint8,uint256,uint256,address),bytes32,bytes,bytes),bytes32,bytes4)"));
    
    // GuardController: requestAndApproveExecution(...)
    bytes4 public constant REQUEST_AND_APPROVE_EXECUTION_SELECTOR = bytes4(keccak256("requestAndApproveExecution((uint256,uint256,uint8,(address,address,uint256,uint256,bytes32,bytes4,bytes),bytes32,bytes,(address,uint256,address,uint256)),(uint256,uint256,address,bytes4,uint8,uint256,uint256,address),bytes32,bytes,bytes),bytes4)"));
    
    /**
     * @dev Returns predefined function schemas for GuardController execution functions
     * @return Array of function schema definitions
     * 
     * Function schemas define:
     * - GuardController public execution functions (for BaseStateMachine layer validation)
     * - What operation types they belong to (CONTROLLER_OPERATION)
     * - What actions are supported (time-delay request/approve/cancel, meta-tx approve/cancel/request-and-approve)
     * - Whether they are protected (false - can be modified dynamically if needed)
     * 
     * Permission System:
     * - These schemas enable BaseStateMachine._validateCallingFunctionPermission to check
     *   if callers have permission to call these GuardController functions
     * - Role permissions must be configured separately via DynamicRBAC or other mechanisms
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
        // Used by BaseStateMachine._requestTransaction via _validateCallingFunctionPermission
        schemas[0] = StateAbstraction.FunctionSchema({
            functionName: "executeWithTimeLock",
            functionSelector: EXECUTE_WITH_TIMELOCK_SELECTOR,
            operationType: CONTROLLER_OPERATION,
            operationName: "CONTROLLER_OPERATION",
            supportedActionsBitmap: StateAbstraction.createBitmapFromActions(timeDelayRequestActions),
            isProtected: false
        });
        
        // Schema 1: GuardController.approveTimeLockExecution
        // Used by BaseStateMachine._approveTransaction via _validateCallingFunctionPermission
        schemas[1] = StateAbstraction.FunctionSchema({
            functionName: "approveTimeLockExecution",
            functionSelector: APPROVE_TIMELOCK_EXECUTION_SELECTOR,
            operationType: CONTROLLER_OPERATION,
            operationName: "CONTROLLER_OPERATION",
            supportedActionsBitmap: StateAbstraction.createBitmapFromActions(timeDelayApproveActions),
            isProtected: false
        });
        
        // Schema 2: GuardController.cancelTimeLockExecution
        // Used by BaseStateMachine._cancelTransaction via _validateCallingFunctionPermission
        schemas[2] = StateAbstraction.FunctionSchema({
            functionName: "cancelTimeLockExecution",
            functionSelector: CANCEL_TIMELOCK_EXECUTION_SELECTOR,
            operationType: CONTROLLER_OPERATION,
            operationName: "CONTROLLER_OPERATION",
            supportedActionsBitmap: StateAbstraction.createBitmapFromActions(timeDelayCancelActions),
            isProtected: false
        });
        
        // Schema 3: GuardController.approveTimeLockExecutionWithMetaTx
        // Used by BaseStateMachine._approveTransactionWithMetaTx via _validateCallingFunctionPermission
        schemas[3] = StateAbstraction.FunctionSchema({
            functionName: "approveTimeLockExecutionWithMetaTx",
            functionSelector: APPROVE_TIMELOCK_EXECUTION_META_SELECTOR,
            operationType: CONTROLLER_OPERATION,
            operationName: "CONTROLLER_OPERATION",
            supportedActionsBitmap: StateAbstraction.createBitmapFromActions(metaTxApproveActions),
            isProtected: false
        });
        
        // Schema 4: GuardController.cancelTimeLockExecutionWithMetaTx
        // Used by BaseStateMachine._cancelTransactionWithMetaTx via _validateCallingFunctionPermission
        schemas[4] = StateAbstraction.FunctionSchema({
            functionName: "cancelTimeLockExecutionWithMetaTx",
            functionSelector: CANCEL_TIMELOCK_EXECUTION_META_SELECTOR,
            operationType: CONTROLLER_OPERATION,
            operationName: "CONTROLLER_OPERATION",
            supportedActionsBitmap: StateAbstraction.createBitmapFromActions(metaTxCancelActions),
            isProtected: false
        });
        
        // Schema 5: GuardController.requestAndApproveExecution
        // Used by BaseStateMachine._requestAndApproveTransaction via _validateCallingFunctionPermission
        schemas[5] = StateAbstraction.FunctionSchema({
            functionName: "requestAndApproveExecution",
            functionSelector: REQUEST_AND_APPROVE_EXECUTION_SELECTOR,
            operationType: CONTROLLER_OPERATION,
            operationName: "CONTROLLER_OPERATION",
            supportedActionsBitmap: StateAbstraction.createBitmapFromActions(metaTxRequestApproveActions),
            isProtected: false
        });
        
        return schemas;
    }
    
    /**
     * @dev Returns empty role permissions (no roles defined)
     * @return RolePermission struct with empty arrays
     * @notice This definition only registers functions. Role permissions must be configured
     * separately via DynamicRBAC or other role management systems.
     */
    function getRolePermissions() public pure returns (IDefinition.RolePermission memory) {
        bytes32[] memory roleHashes = new bytes32[](0);
        StateAbstraction.FunctionPermission[] memory functionPermissions = new StateAbstraction.FunctionPermission[](0);
        
        return IDefinition.RolePermission({
            roleHashes: roleHashes,
            functionPermissions: functionPermissions
        });
    }
}

