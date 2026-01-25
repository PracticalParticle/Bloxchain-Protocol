// SPDX-License-Identifier: MPL-2.0
pragma solidity 0.8.33;

import "../../../lib/StateAbstraction.sol";
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

    // GuardController: guardConfigBatchRequestAndApprove(...)
    bytes4 public constant GUARD_CONFIG_BATCH_META_SELECTOR = bytes4(
        keccak256(
            "guardConfigBatchRequestAndApprove(((uint256,uint256,uint8,(address,address,uint256,uint256,bytes32,bytes4,bytes),bytes32,bytes,(address,uint256,address,uint256)),(uint256,uint256,address,bytes4,uint8,uint256,uint256,address),bytes32,bytes,bytes))"
        )
    );

    // GuardController: executeGuardConfigBatch((uint8,bytes)[])
    bytes4 public constant GUARD_CONFIG_BATCH_EXECUTE_SELECTOR =
        bytes4(keccak256("executeGuardConfigBatch((uint8,bytes)[])"));
    
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
        StateAbstraction.FunctionSchema[] memory schemas = new StateAbstraction.FunctionSchema[](8);
        
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
        
        // Execution selectors must have self-reference (at least one element pointing to themselves)
        bytes4[] memory executeWithTimeLockHandlerForSelectors = new bytes4[](1);
        executeWithTimeLockHandlerForSelectors[0] = EXECUTE_WITH_TIMELOCK_SELECTOR;
        bytes4[] memory approveTimeLockExecutionHandlerForSelectors = new bytes4[](1);
        approveTimeLockExecutionHandlerForSelectors[0] = APPROVE_TIMELOCK_EXECUTION_SELECTOR;
        bytes4[] memory cancelTimeLockExecutionHandlerForSelectors = new bytes4[](1);
        cancelTimeLockExecutionHandlerForSelectors[0] = CANCEL_TIMELOCK_EXECUTION_SELECTOR;
        bytes4[] memory approveTimeLockExecutionMetaHandlerForSelectors = new bytes4[](1);
        approveTimeLockExecutionMetaHandlerForSelectors[0] = APPROVE_TIMELOCK_EXECUTION_META_SELECTOR;
        bytes4[] memory cancelTimeLockExecutionMetaHandlerForSelectors = new bytes4[](1);
        cancelTimeLockExecutionMetaHandlerForSelectors[0] = CANCEL_TIMELOCK_EXECUTION_META_SELECTOR;
        bytes4[] memory requestAndApproveExecutionHandlerForSelectors = new bytes4[](1);
        requestAndApproveExecutionHandlerForSelectors[0] = REQUEST_AND_APPROVE_EXECUTION_SELECTOR;
        bytes4[] memory guardConfigBatchExecuteHandlerForSelectors = new bytes4[](1);
        guardConfigBatchExecuteHandlerForSelectors[0] = GUARD_CONFIG_BATCH_EXECUTE_SELECTOR;
        
        // Handler selectors point to execution selectors
        bytes4[] memory guardConfigHandlerForSelectors = new bytes4[](1);
        guardConfigHandlerForSelectors[0] = GUARD_CONFIG_BATCH_EXECUTE_SELECTOR;
        
        // Schema 0: GuardController.executeWithTimeLock
        schemas[0] = StateAbstraction.FunctionSchema({
            functionSignature: "executeWithTimeLock(address,bytes4,bytes,uint256,bytes32)",
            functionSelector: EXECUTE_WITH_TIMELOCK_SELECTOR,
            operationType: CONTROLLER_OPERATION,
            operationName: "CONTROLLER_OPERATION",
            supportedActionsBitmap: StateAbstraction.createBitmapFromActions(timeDelayRequestActions),
            isProtected: true,
            handlerForSelectors: executeWithTimeLockHandlerForSelectors
        });
        
        // Schema 1: GuardController.approveTimeLockExecution
        schemas[1] = StateAbstraction.FunctionSchema({
            functionSignature: "approveTimeLockExecution(uint256)",
            functionSelector: APPROVE_TIMELOCK_EXECUTION_SELECTOR,
            operationType: CONTROLLER_OPERATION,
            operationName: "CONTROLLER_OPERATION",
            supportedActionsBitmap: StateAbstraction.createBitmapFromActions(timeDelayApproveActions),
            isProtected: true,
            handlerForSelectors: approveTimeLockExecutionHandlerForSelectors
        });
        
        // Schema 2: GuardController.cancelTimeLockExecution
        schemas[2] = StateAbstraction.FunctionSchema({
            functionSignature: "cancelTimeLockExecution(uint256)",
            functionSelector: CANCEL_TIMELOCK_EXECUTION_SELECTOR,
            operationType: CONTROLLER_OPERATION,
            operationName: "CONTROLLER_OPERATION",
            supportedActionsBitmap: StateAbstraction.createBitmapFromActions(timeDelayCancelActions),
            isProtected: true,
            handlerForSelectors: cancelTimeLockExecutionHandlerForSelectors
        });
        
        // Schema 3: GuardController.approveTimeLockExecutionWithMetaTx
        schemas[3] = StateAbstraction.FunctionSchema({
            functionSignature: "approveTimeLockExecutionWithMetaTx((uint256,uint256,uint8,(address,address,uint256,uint256,bytes32,bytes4,bytes),bytes32,bytes,(address,uint256,address,uint256)),(uint256,uint256,address,bytes4,uint8,uint256,uint256,address),bytes32,bytes,bytes))",
            functionSelector: APPROVE_TIMELOCK_EXECUTION_META_SELECTOR,
            operationType: CONTROLLER_OPERATION,
            operationName: "CONTROLLER_OPERATION",
            supportedActionsBitmap: StateAbstraction.createBitmapFromActions(metaTxApproveActions),
            isProtected: true,
            handlerForSelectors: approveTimeLockExecutionMetaHandlerForSelectors
        });
        
        // Schema 4: GuardController.cancelTimeLockExecutionWithMetaTx
        schemas[4] = StateAbstraction.FunctionSchema({
            functionSignature: "cancelTimeLockExecutionWithMetaTx((uint256,uint256,uint8,(address,address,uint256,uint256,bytes32,bytes4,bytes),bytes32,bytes,(address,uint256,address,uint256)),(uint256,uint256,address,bytes4,uint8,uint256,uint256,address),bytes32,bytes,bytes))",
            functionSelector: CANCEL_TIMELOCK_EXECUTION_META_SELECTOR,
            operationType: CONTROLLER_OPERATION,
            operationName: "CONTROLLER_OPERATION",
            supportedActionsBitmap: StateAbstraction.createBitmapFromActions(metaTxCancelActions),
            isProtected: true,
            handlerForSelectors: cancelTimeLockExecutionMetaHandlerForSelectors
        });
        
        // Schema 5: GuardController.requestAndApproveExecution
        schemas[5] = StateAbstraction.FunctionSchema({
            functionSignature: "requestAndApproveExecution((uint256,uint256,uint8,(address,address,uint256,uint256,bytes32,bytes4,bytes),bytes32,bytes,(address,uint256,address,uint256)),(uint256,uint256,address,bytes4,uint8,uint256,uint256,address),bytes32,bytes,bytes))",
            functionSelector: REQUEST_AND_APPROVE_EXECUTION_SELECTOR,
            operationType: CONTROLLER_OPERATION,
            operationName: "CONTROLLER_OPERATION",
            supportedActionsBitmap: StateAbstraction.createBitmapFromActions(metaTxRequestApproveActions),
            isProtected: true,
            handlerForSelectors: requestAndApproveExecutionHandlerForSelectors
        });

        // Schema 6: GuardController.guardConfigBatchRequestAndApprove
        schemas[6] = StateAbstraction.FunctionSchema({
            functionSignature: "guardConfigBatchRequestAndApprove(((uint256,uint256,uint8,(address,address,uint256,uint256,bytes32,bytes4,bytes),bytes32,bytes,(address,uint256,address,uint256)),(uint256,uint256,address,bytes4,uint8,uint256,uint256,address),bytes32,bytes,bytes))",
            functionSelector: GUARD_CONFIG_BATCH_META_SELECTOR,
            operationType: CONTROLLER_OPERATION,
            operationName: "CONTROLLER_OPERATION",
            supportedActionsBitmap: StateAbstraction.createBitmapFromActions(metaTxRequestApproveActions),
            isProtected: true,
            handlerForSelectors: guardConfigHandlerForSelectors
        });

        // Schema 7: GuardController.executeGuardConfigBatch
        StateAbstraction.TxAction[] memory guardConfigExecutionActions = new StateAbstraction.TxAction[](2);
        guardConfigExecutionActions[0] = StateAbstraction.TxAction.SIGN_META_REQUEST_AND_APPROVE;
        guardConfigExecutionActions[1] = StateAbstraction.TxAction.EXECUTE_META_REQUEST_AND_APPROVE;

        schemas[7] = StateAbstraction.FunctionSchema({
            functionSignature: "executeGuardConfigBatch((uint8,bytes)[])",
            functionSelector: GUARD_CONFIG_BATCH_EXECUTE_SELECTOR,
            operationType: CONTROLLER_OPERATION,
            operationName: "CONTROLLER_OPERATION",
            supportedActionsBitmap: StateAbstraction.createBitmapFromActions(guardConfigExecutionActions),
            isProtected: true,
            handlerForSelectors: guardConfigBatchExecuteHandlerForSelectors
        });

        return schemas;
    }
    
    /**
     * @dev Returns predefined role hashes and their corresponding function permissions
     * @return RolePermission struct containing roleHashes and functionPermissions arrays
     * 
     * Role Permissions:
     * - OWNER_ROLE: Can sign/request time-delay and meta-transaction operations (8 permissions)
     * - BROADCASTER_ROLE: Can execute meta-transaction operations (5 permissions)
     * - RECOVERY_ROLE: Can execute time-delay operations for recovery scenarios (3 permissions)
     * 
     * Total: 16 role permission entries matching StateAbstractionDefinitions pattern
     */
    function getRolePermissions() public pure returns (IDefinition.RolePermission memory) {
        bytes32[] memory roleHashes;
        StateAbstraction.FunctionPermission[] memory functionPermissions;
        roleHashes = new bytes32[](16);
        functionPermissions = new StateAbstraction.FunctionPermission[](16);
        
        // Owner role permissions (8 entries)
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
        bytes4[] memory handlerForSelectors0 = new bytes4[](1);
        handlerForSelectors0[0] = EXECUTE_WITH_TIMELOCK_SELECTOR;
        functionPermissions[0] = StateAbstraction.FunctionPermission({
            functionSelector: EXECUTE_WITH_TIMELOCK_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(ownerTimeLockRequestActions),
            handlerForSelectors: handlerForSelectors0 // Self-reference indicates execution selector
        });
        
        // Owner: Approve TimeLock Execution
        roleHashes[1] = StateAbstraction.OWNER_ROLE;
        bytes4[] memory handlerForSelectors1 = new bytes4[](1);
        handlerForSelectors1[0] = APPROVE_TIMELOCK_EXECUTION_SELECTOR;
        functionPermissions[1] = StateAbstraction.FunctionPermission({
            functionSelector: APPROVE_TIMELOCK_EXECUTION_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(ownerTimeLockApproveActions),
            handlerForSelectors: handlerForSelectors1 // Self-reference indicates execution selector
        });
        
        // Owner: Cancel TimeLock Execution
        roleHashes[2] = StateAbstraction.OWNER_ROLE;
        bytes4[] memory handlerForSelectors2 = new bytes4[](1);
        handlerForSelectors2[0] = CANCEL_TIMELOCK_EXECUTION_SELECTOR;
        functionPermissions[2] = StateAbstraction.FunctionPermission({
            functionSelector: CANCEL_TIMELOCK_EXECUTION_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(ownerTimeLockCancelActions),
            handlerForSelectors: handlerForSelectors2 // Self-reference indicates execution selector
        });
        
        // Owner: Request And Approve Execution (Meta-Tx)
        roleHashes[3] = StateAbstraction.OWNER_ROLE;
        bytes4[] memory handlerForSelectors3 = new bytes4[](1);
        handlerForSelectors3[0] = REQUEST_AND_APPROVE_EXECUTION_SELECTOR;
        functionPermissions[3] = StateAbstraction.FunctionPermission({
            functionSelector: REQUEST_AND_APPROVE_EXECUTION_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(ownerMetaTxRequestApproveActions),
            handlerForSelectors: handlerForSelectors3 // Self-reference indicates execution selector
        });
        
        // Owner: Approve TimeLock Execution With MetaTx
        roleHashes[4] = StateAbstraction.OWNER_ROLE;
        bytes4[] memory handlerForSelectors4 = new bytes4[](1);
        handlerForSelectors4[0] = APPROVE_TIMELOCK_EXECUTION_META_SELECTOR;
        functionPermissions[4] = StateAbstraction.FunctionPermission({
            functionSelector: APPROVE_TIMELOCK_EXECUTION_META_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(ownerMetaTxApproveActions),
            handlerForSelectors: handlerForSelectors4 // Self-reference indicates execution selector
        });
        
        // Owner: Cancel TimeLock Execution With MetaTx
        roleHashes[5] = StateAbstraction.OWNER_ROLE;
        bytes4[] memory handlerForSelectors5 = new bytes4[](1);
        handlerForSelectors5[0] = CANCEL_TIMELOCK_EXECUTION_META_SELECTOR;
        functionPermissions[5] = StateAbstraction.FunctionPermission({
            functionSelector: CANCEL_TIMELOCK_EXECUTION_META_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(ownerMetaTxCancelActions),
            handlerForSelectors: handlerForSelectors5 // Self-reference indicates execution selector
        });

        // Owner: Guard Config Batch (Meta-Tx handler)
        roleHashes[6] = StateAbstraction.OWNER_ROLE;
        bytes4[] memory handlerForSelectors6 = new bytes4[](1);
        handlerForSelectors6[0] = GUARD_CONFIG_BATCH_EXECUTE_SELECTOR;
        functionPermissions[6] = StateAbstraction.FunctionPermission({
            functionSelector: GUARD_CONFIG_BATCH_META_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(ownerMetaTxRequestApproveActions),
            handlerForSelectors: handlerForSelectors6
        });

        // Owner: Guard Config Batch (Execution selector)
        roleHashes[7] = StateAbstraction.OWNER_ROLE;
        functionPermissions[7] = StateAbstraction.FunctionPermission({
            functionSelector: GUARD_CONFIG_BATCH_EXECUTE_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(ownerMetaTxRequestApproveActions),
            handlerForSelectors: handlerForSelectors6 // Self-reference indicates execution selector
        });
        
        // Broadcaster role permissions (5 entries)
        StateAbstraction.TxAction[] memory broadcasterMetaTxRequestApproveActions = new StateAbstraction.TxAction[](1);
        broadcasterMetaTxRequestApproveActions[0] = StateAbstraction.TxAction.EXECUTE_META_REQUEST_AND_APPROVE;
        
        StateAbstraction.TxAction[] memory broadcasterMetaTxApproveActions = new StateAbstraction.TxAction[](1);
        broadcasterMetaTxApproveActions[0] = StateAbstraction.TxAction.EXECUTE_META_APPROVE;
        
        StateAbstraction.TxAction[] memory broadcasterMetaTxCancelActions = new StateAbstraction.TxAction[](1);
        broadcasterMetaTxCancelActions[0] = StateAbstraction.TxAction.EXECUTE_META_CANCEL;
        
        // Broadcaster: Request And Approve Execution (Meta-Tx)
        roleHashes[8] = StateAbstraction.BROADCASTER_ROLE;
        bytes4[] memory handlerForSelectors8 = new bytes4[](1);
        handlerForSelectors8[0] = REQUEST_AND_APPROVE_EXECUTION_SELECTOR;
        functionPermissions[8] = StateAbstraction.FunctionPermission({
            functionSelector: REQUEST_AND_APPROVE_EXECUTION_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(broadcasterMetaTxRequestApproveActions),
            handlerForSelectors: handlerForSelectors8 // Self-reference indicates execution selector
        });
        
        // Broadcaster: Approve TimeLock Execution With MetaTx
        roleHashes[9] = StateAbstraction.BROADCASTER_ROLE;
        functionPermissions[9] = StateAbstraction.FunctionPermission({
            functionSelector: APPROVE_TIMELOCK_EXECUTION_META_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(broadcasterMetaTxApproveActions),
            handlerForSelectors: handlerForSelectors4 // Self-reference indicates execution selector
        });
        
        // Broadcaster: Cancel TimeLock Execution With MetaTx
        roleHashes[10] = StateAbstraction.BROADCASTER_ROLE;
        bytes4[] memory handlerForSelectors10 = new bytes4[](1);
        handlerForSelectors10[0] = CANCEL_TIMELOCK_EXECUTION_META_SELECTOR;
        functionPermissions[10] = StateAbstraction.FunctionPermission({
            functionSelector: CANCEL_TIMELOCK_EXECUTION_META_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(broadcasterMetaTxCancelActions),
            handlerForSelectors: handlerForSelectors10 // Self-reference indicates execution selector
        });

        // Broadcaster: Guard Config Batch (Meta-Tx handler)
        roleHashes[11] = StateAbstraction.BROADCASTER_ROLE;
        functionPermissions[11] = StateAbstraction.FunctionPermission({
            functionSelector: GUARD_CONFIG_BATCH_META_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(broadcasterMetaTxRequestApproveActions),
            handlerForSelectors: handlerForSelectors6
        });

        // Broadcaster: Guard Config Batch (Execution selector)
        roleHashes[12] = StateAbstraction.BROADCASTER_ROLE;
        functionPermissions[12] = StateAbstraction.FunctionPermission({
            functionSelector: GUARD_CONFIG_BATCH_EXECUTE_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(broadcasterMetaTxRequestApproveActions),
            handlerForSelectors: handlerForSelectors6 // Self-reference indicates execution selector
        });
        
        // Recovery role permissions (3 entries)
        StateAbstraction.TxAction[] memory recoveryTimeLockRequestActions = new StateAbstraction.TxAction[](1);
        recoveryTimeLockRequestActions[0] = StateAbstraction.TxAction.EXECUTE_TIME_DELAY_REQUEST;
        
        StateAbstraction.TxAction[] memory recoveryTimeLockApproveActions = new StateAbstraction.TxAction[](1);
        recoveryTimeLockApproveActions[0] = StateAbstraction.TxAction.EXECUTE_TIME_DELAY_APPROVE;
        
        StateAbstraction.TxAction[] memory recoveryTimeLockCancelActions = new StateAbstraction.TxAction[](1);
        recoveryTimeLockCancelActions[0] = StateAbstraction.TxAction.EXECUTE_TIME_DELAY_CANCEL;
        
        // Recovery: Execute With TimeLock
        roleHashes[13] = StateAbstraction.RECOVERY_ROLE;
        functionPermissions[13] = StateAbstraction.FunctionPermission({
            functionSelector: EXECUTE_WITH_TIMELOCK_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(recoveryTimeLockRequestActions),
            handlerForSelectors: handlerForSelectors0 // Self-reference indicates execution selector
        });
        
        // Recovery: Approve TimeLock Execution
        roleHashes[14] = StateAbstraction.RECOVERY_ROLE;
        functionPermissions[14] = StateAbstraction.FunctionPermission({
            functionSelector: APPROVE_TIMELOCK_EXECUTION_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(recoveryTimeLockApproveActions),
            handlerForSelectors: handlerForSelectors1 // Self-reference indicates execution selector
        });
        
        // Recovery: Cancel TimeLock Execution
        roleHashes[15] = StateAbstraction.RECOVERY_ROLE;
        functionPermissions[15] = StateAbstraction.FunctionPermission({
            functionSelector: CANCEL_TIMELOCK_EXECUTION_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(recoveryTimeLockCancelActions),
            handlerForSelectors: handlerForSelectors2 // Self-reference indicates execution selector
        });
        
        return IDefinition.RolePermission({
            roleHashes: roleHashes,
            functionPermissions: functionPermissions
        });
    }
}
