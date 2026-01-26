// SPDX-License-Identifier: MPL-2.0
pragma solidity 0.8.33;

import "../../../lib/EngineBlox.sol";
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
 * - Defines role permissions for OWNER_ROLE and BROADCASTER_ROLE
 * - Supports time-delay and meta-transaction workflows
 * - Matches EngineBloxDefinitions pattern for consistency
 * 
 * Role Permissions:
 * - OWNER_ROLE: Can sign/request time-delay and meta-transaction operations (8 permissions)
 * - BROADCASTER_ROLE: Can execute meta-transaction operations (5 permissions)
 * 
 * @notice This definition provides complete initialization data including both function schemas
 * and role permissions, matching the EngineBloxDefinitions pattern.
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
     * - These schemas enable EngineBlox._checkExecutionPermissions to validate
     *   if callers have permission to call these GuardController functions
     * - Role permissions are defined in getRolePermissions() matching EngineBloxDefinitions pattern
     */
    function getFunctionSchemas() public pure returns (EngineBlox.FunctionSchema[] memory) {
        EngineBlox.FunctionSchema[] memory schemas = new EngineBlox.FunctionSchema[](8);
        
        // ============ TIME-DELAY WORKFLOW ACTIONS ============
        // Request action for executeWithTimeLock
        EngineBlox.TxAction[] memory timeDelayRequestActions = new EngineBlox.TxAction[](1);
        timeDelayRequestActions[0] = EngineBlox.TxAction.EXECUTE_TIME_DELAY_REQUEST;
        
        // Approve action for approveTimeLockExecution
        EngineBlox.TxAction[] memory timeDelayApproveActions = new EngineBlox.TxAction[](1);
        timeDelayApproveActions[0] = EngineBlox.TxAction.EXECUTE_TIME_DELAY_APPROVE;
        
        // Cancel action for cancelTimeLockExecution
        EngineBlox.TxAction[] memory timeDelayCancelActions = new EngineBlox.TxAction[](1);
        timeDelayCancelActions[0] = EngineBlox.TxAction.EXECUTE_TIME_DELAY_CANCEL;
        
        // ============ META-TRANSACTION WORKFLOW ACTIONS ============
        // Approve action for approveTimeLockExecutionWithMetaTx
        EngineBlox.TxAction[] memory metaTxApproveActions = new EngineBlox.TxAction[](2);
        metaTxApproveActions[0] = EngineBlox.TxAction.SIGN_META_APPROVE;
        metaTxApproveActions[1] = EngineBlox.TxAction.EXECUTE_META_APPROVE;
        
        // Cancel action for cancelTimeLockExecutionWithMetaTx
        EngineBlox.TxAction[] memory metaTxCancelActions = new EngineBlox.TxAction[](2);
        metaTxCancelActions[0] = EngineBlox.TxAction.SIGN_META_CANCEL;
        metaTxCancelActions[1] = EngineBlox.TxAction.EXECUTE_META_CANCEL;
        
        // Request and approve action for requestAndApproveExecution
        EngineBlox.TxAction[] memory metaTxRequestApproveActions = new EngineBlox.TxAction[](2);
        metaTxRequestApproveActions[0] = EngineBlox.TxAction.SIGN_META_REQUEST_AND_APPROVE;
        metaTxRequestApproveActions[1] = EngineBlox.TxAction.EXECUTE_META_REQUEST_AND_APPROVE;
        
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
        schemas[0] = EngineBlox.FunctionSchema({
            functionSignature: "executeWithTimeLock(address,bytes4,bytes,uint256,bytes32)",
            functionSelector: EXECUTE_WITH_TIMELOCK_SELECTOR,
            operationType: CONTROLLER_OPERATION,
            operationName: "CONTROLLER_OPERATION",
            supportedActionsBitmap: EngineBlox.createBitmapFromActions(timeDelayRequestActions),
            isProtected: true,
            handlerForSelectors: executeWithTimeLockHandlerForSelectors
        });
        
        // Schema 1: GuardController.approveTimeLockExecution
        schemas[1] = EngineBlox.FunctionSchema({
            functionSignature: "approveTimeLockExecution(uint256)",
            functionSelector: APPROVE_TIMELOCK_EXECUTION_SELECTOR,
            operationType: CONTROLLER_OPERATION,
            operationName: "CONTROLLER_OPERATION",
            supportedActionsBitmap: EngineBlox.createBitmapFromActions(timeDelayApproveActions),
            isProtected: true,
            handlerForSelectors: approveTimeLockExecutionHandlerForSelectors
        });
        
        // Schema 2: GuardController.cancelTimeLockExecution
        schemas[2] = EngineBlox.FunctionSchema({
            functionSignature: "cancelTimeLockExecution(uint256)",
            functionSelector: CANCEL_TIMELOCK_EXECUTION_SELECTOR,
            operationType: CONTROLLER_OPERATION,
            operationName: "CONTROLLER_OPERATION",
            supportedActionsBitmap: EngineBlox.createBitmapFromActions(timeDelayCancelActions),
            isProtected: true,
            handlerForSelectors: cancelTimeLockExecutionHandlerForSelectors
        });
        
        // Schema 3: GuardController.approveTimeLockExecutionWithMetaTx
        schemas[3] = EngineBlox.FunctionSchema({
            functionSignature: "approveTimeLockExecutionWithMetaTx((uint256,uint256,uint8,(address,address,uint256,uint256,bytes32,bytes4,bytes),bytes32,bytes,(address,uint256,address,uint256)),(uint256,uint256,address,bytes4,uint8,uint256,uint256,address),bytes32,bytes,bytes))",
            functionSelector: APPROVE_TIMELOCK_EXECUTION_META_SELECTOR,
            operationType: CONTROLLER_OPERATION,
            operationName: "CONTROLLER_OPERATION",
            supportedActionsBitmap: EngineBlox.createBitmapFromActions(metaTxApproveActions),
            isProtected: true,
            handlerForSelectors: approveTimeLockExecutionMetaHandlerForSelectors
        });
        
        // Schema 4: GuardController.cancelTimeLockExecutionWithMetaTx
        schemas[4] = EngineBlox.FunctionSchema({
            functionSignature: "cancelTimeLockExecutionWithMetaTx((uint256,uint256,uint8,(address,address,uint256,uint256,bytes32,bytes4,bytes),bytes32,bytes,(address,uint256,address,uint256)),(uint256,uint256,address,bytes4,uint8,uint256,uint256,address),bytes32,bytes,bytes))",
            functionSelector: CANCEL_TIMELOCK_EXECUTION_META_SELECTOR,
            operationType: CONTROLLER_OPERATION,
            operationName: "CONTROLLER_OPERATION",
            supportedActionsBitmap: EngineBlox.createBitmapFromActions(metaTxCancelActions),
            isProtected: true,
            handlerForSelectors: cancelTimeLockExecutionMetaHandlerForSelectors
        });
        
        // Schema 5: GuardController.requestAndApproveExecution
        schemas[5] = EngineBlox.FunctionSchema({
            functionSignature: "requestAndApproveExecution((uint256,uint256,uint8,(address,address,uint256,uint256,bytes32,bytes4,bytes),bytes32,bytes,(address,uint256,address,uint256)),(uint256,uint256,address,bytes4,uint8,uint256,uint256,address),bytes32,bytes,bytes))",
            functionSelector: REQUEST_AND_APPROVE_EXECUTION_SELECTOR,
            operationType: CONTROLLER_OPERATION,
            operationName: "CONTROLLER_OPERATION",
            supportedActionsBitmap: EngineBlox.createBitmapFromActions(metaTxRequestApproveActions),
            isProtected: true,
            handlerForSelectors: requestAndApproveExecutionHandlerForSelectors
        });

        // Schema 6: GuardController.guardConfigBatchRequestAndApprove
        schemas[6] = EngineBlox.FunctionSchema({
            functionSignature: "guardConfigBatchRequestAndApprove(((uint256,uint256,uint8,(address,address,uint256,uint256,bytes32,bytes4,bytes),bytes32,bytes,(address,uint256,address,uint256)),(uint256,uint256,address,bytes4,uint8,uint256,uint256,address),bytes32,bytes,bytes))",
            functionSelector: GUARD_CONFIG_BATCH_META_SELECTOR,
            operationType: CONTROLLER_OPERATION,
            operationName: "CONTROLLER_OPERATION",
            supportedActionsBitmap: EngineBlox.createBitmapFromActions(metaTxRequestApproveActions),
            isProtected: true,
            handlerForSelectors: guardConfigHandlerForSelectors
        });

        // Schema 7: GuardController.executeGuardConfigBatch
        EngineBlox.TxAction[] memory guardConfigExecutionActions = new EngineBlox.TxAction[](2);
        guardConfigExecutionActions[0] = EngineBlox.TxAction.SIGN_META_REQUEST_AND_APPROVE;
        guardConfigExecutionActions[1] = EngineBlox.TxAction.EXECUTE_META_REQUEST_AND_APPROVE;

        schemas[7] = EngineBlox.FunctionSchema({
            functionSignature: "executeGuardConfigBatch((uint8,bytes)[])",
            functionSelector: GUARD_CONFIG_BATCH_EXECUTE_SELECTOR,
            operationType: CONTROLLER_OPERATION,
            operationName: "CONTROLLER_OPERATION",
            supportedActionsBitmap: EngineBlox.createBitmapFromActions(guardConfigExecutionActions),
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
     * 
     * Total: 13 role permission entries matching EngineBloxDefinitions pattern
     */
    function getRolePermissions() public pure returns (IDefinition.RolePermission memory) {
        bytes32[] memory roleHashes;
        EngineBlox.FunctionPermission[] memory functionPermissions;
        roleHashes = new bytes32[](13);
        functionPermissions = new EngineBlox.FunctionPermission[](13);
        
        // Owner role permissions (8 entries)
        EngineBlox.TxAction[] memory ownerTimeLockRequestActions = new EngineBlox.TxAction[](1);
        ownerTimeLockRequestActions[0] = EngineBlox.TxAction.EXECUTE_TIME_DELAY_REQUEST;
        
        EngineBlox.TxAction[] memory ownerTimeLockApproveActions = new EngineBlox.TxAction[](1);
        ownerTimeLockApproveActions[0] = EngineBlox.TxAction.EXECUTE_TIME_DELAY_APPROVE;
        
        EngineBlox.TxAction[] memory ownerTimeLockCancelActions = new EngineBlox.TxAction[](1);
        ownerTimeLockCancelActions[0] = EngineBlox.TxAction.EXECUTE_TIME_DELAY_CANCEL;
        
        EngineBlox.TxAction[] memory ownerMetaTxRequestApproveActions = new EngineBlox.TxAction[](1);
        ownerMetaTxRequestApproveActions[0] = EngineBlox.TxAction.SIGN_META_REQUEST_AND_APPROVE;
        
        EngineBlox.TxAction[] memory ownerMetaTxApproveActions = new EngineBlox.TxAction[](1);
        ownerMetaTxApproveActions[0] = EngineBlox.TxAction.SIGN_META_APPROVE;
        
        EngineBlox.TxAction[] memory ownerMetaTxCancelActions = new EngineBlox.TxAction[](1);
        ownerMetaTxCancelActions[0] = EngineBlox.TxAction.SIGN_META_CANCEL;
        
        // Owner: Execute With TimeLock
        roleHashes[0] = EngineBlox.OWNER_ROLE;
        bytes4[] memory handlerForSelectors0 = new bytes4[](1);
        handlerForSelectors0[0] = EXECUTE_WITH_TIMELOCK_SELECTOR;
        functionPermissions[0] = EngineBlox.FunctionPermission({
            functionSelector: EXECUTE_WITH_TIMELOCK_SELECTOR,
            grantedActionsBitmap: EngineBlox.createBitmapFromActions(ownerTimeLockRequestActions),
            handlerForSelectors: handlerForSelectors0 // Self-reference indicates execution selector
        });
        
        // Owner: Approve TimeLock Execution
        roleHashes[1] = EngineBlox.OWNER_ROLE;
        bytes4[] memory handlerForSelectors1 = new bytes4[](1);
        handlerForSelectors1[0] = APPROVE_TIMELOCK_EXECUTION_SELECTOR;
        functionPermissions[1] = EngineBlox.FunctionPermission({
            functionSelector: APPROVE_TIMELOCK_EXECUTION_SELECTOR,
            grantedActionsBitmap: EngineBlox.createBitmapFromActions(ownerTimeLockApproveActions),
            handlerForSelectors: handlerForSelectors1 // Self-reference indicates execution selector
        });
        
        // Owner: Cancel TimeLock Execution
        roleHashes[2] = EngineBlox.OWNER_ROLE;
        bytes4[] memory handlerForSelectors2 = new bytes4[](1);
        handlerForSelectors2[0] = CANCEL_TIMELOCK_EXECUTION_SELECTOR;
        functionPermissions[2] = EngineBlox.FunctionPermission({
            functionSelector: CANCEL_TIMELOCK_EXECUTION_SELECTOR,
            grantedActionsBitmap: EngineBlox.createBitmapFromActions(ownerTimeLockCancelActions),
            handlerForSelectors: handlerForSelectors2 // Self-reference indicates execution selector
        });
        
        // Owner: Request And Approve Execution (Meta-Tx)
        roleHashes[3] = EngineBlox.OWNER_ROLE;
        bytes4[] memory handlerForSelectors3 = new bytes4[](1);
        handlerForSelectors3[0] = REQUEST_AND_APPROVE_EXECUTION_SELECTOR;
        functionPermissions[3] = EngineBlox.FunctionPermission({
            functionSelector: REQUEST_AND_APPROVE_EXECUTION_SELECTOR,
            grantedActionsBitmap: EngineBlox.createBitmapFromActions(ownerMetaTxRequestApproveActions),
            handlerForSelectors: handlerForSelectors3 // Self-reference indicates execution selector
        });
        
        // Owner: Approve TimeLock Execution With MetaTx
        roleHashes[4] = EngineBlox.OWNER_ROLE;
        bytes4[] memory handlerForSelectors4 = new bytes4[](1);
        handlerForSelectors4[0] = APPROVE_TIMELOCK_EXECUTION_META_SELECTOR;
        functionPermissions[4] = EngineBlox.FunctionPermission({
            functionSelector: APPROVE_TIMELOCK_EXECUTION_META_SELECTOR,
            grantedActionsBitmap: EngineBlox.createBitmapFromActions(ownerMetaTxApproveActions),
            handlerForSelectors: handlerForSelectors4 // Self-reference indicates execution selector
        });
        
        // Owner: Cancel TimeLock Execution With MetaTx
        roleHashes[5] = EngineBlox.OWNER_ROLE;
        bytes4[] memory handlerForSelectors5 = new bytes4[](1);
        handlerForSelectors5[0] = CANCEL_TIMELOCK_EXECUTION_META_SELECTOR;
        functionPermissions[5] = EngineBlox.FunctionPermission({
            functionSelector: CANCEL_TIMELOCK_EXECUTION_META_SELECTOR,
            grantedActionsBitmap: EngineBlox.createBitmapFromActions(ownerMetaTxCancelActions),
            handlerForSelectors: handlerForSelectors5 // Self-reference indicates execution selector
        });

        // Owner: Guard Config Batch (Meta-Tx handler)
        roleHashes[6] = EngineBlox.OWNER_ROLE;
        bytes4[] memory handlerForSelectors6 = new bytes4[](1);
        handlerForSelectors6[0] = GUARD_CONFIG_BATCH_EXECUTE_SELECTOR;
        functionPermissions[6] = EngineBlox.FunctionPermission({
            functionSelector: GUARD_CONFIG_BATCH_META_SELECTOR,
            grantedActionsBitmap: EngineBlox.createBitmapFromActions(ownerMetaTxRequestApproveActions),
            handlerForSelectors: handlerForSelectors6
        });

        // Owner: Guard Config Batch (Execution selector)
        roleHashes[7] = EngineBlox.OWNER_ROLE;
        functionPermissions[7] = EngineBlox.FunctionPermission({
            functionSelector: GUARD_CONFIG_BATCH_EXECUTE_SELECTOR,
            grantedActionsBitmap: EngineBlox.createBitmapFromActions(ownerMetaTxRequestApproveActions),
            handlerForSelectors: handlerForSelectors6 // Self-reference indicates execution selector
        });
        
        // Broadcaster role permissions (5 entries)
        EngineBlox.TxAction[] memory broadcasterMetaTxRequestApproveActions = new EngineBlox.TxAction[](1);
        broadcasterMetaTxRequestApproveActions[0] = EngineBlox.TxAction.EXECUTE_META_REQUEST_AND_APPROVE;
        
        EngineBlox.TxAction[] memory broadcasterMetaTxApproveActions = new EngineBlox.TxAction[](1);
        broadcasterMetaTxApproveActions[0] = EngineBlox.TxAction.EXECUTE_META_APPROVE;
        
        EngineBlox.TxAction[] memory broadcasterMetaTxCancelActions = new EngineBlox.TxAction[](1);
        broadcasterMetaTxCancelActions[0] = EngineBlox.TxAction.EXECUTE_META_CANCEL;
        
        // Broadcaster: Request And Approve Execution (Meta-Tx)
        roleHashes[8] = EngineBlox.BROADCASTER_ROLE;
        bytes4[] memory handlerForSelectors8 = new bytes4[](1);
        handlerForSelectors8[0] = REQUEST_AND_APPROVE_EXECUTION_SELECTOR;
        functionPermissions[8] = EngineBlox.FunctionPermission({
            functionSelector: REQUEST_AND_APPROVE_EXECUTION_SELECTOR,
            grantedActionsBitmap: EngineBlox.createBitmapFromActions(broadcasterMetaTxRequestApproveActions),
            handlerForSelectors: handlerForSelectors8 // Self-reference indicates execution selector
        });
        
        // Broadcaster: Approve TimeLock Execution With MetaTx
        roleHashes[9] = EngineBlox.BROADCASTER_ROLE;
        functionPermissions[9] = EngineBlox.FunctionPermission({
            functionSelector: APPROVE_TIMELOCK_EXECUTION_META_SELECTOR,
            grantedActionsBitmap: EngineBlox.createBitmapFromActions(broadcasterMetaTxApproveActions),
            handlerForSelectors: handlerForSelectors4 // Self-reference indicates execution selector
        });
        
        // Broadcaster: Cancel TimeLock Execution With MetaTx
        roleHashes[10] = EngineBlox.BROADCASTER_ROLE;
        bytes4[] memory handlerForSelectors10 = new bytes4[](1);
        handlerForSelectors10[0] = CANCEL_TIMELOCK_EXECUTION_META_SELECTOR;
        functionPermissions[10] = EngineBlox.FunctionPermission({
            functionSelector: CANCEL_TIMELOCK_EXECUTION_META_SELECTOR,
            grantedActionsBitmap: EngineBlox.createBitmapFromActions(broadcasterMetaTxCancelActions),
            handlerForSelectors: handlerForSelectors10 // Self-reference indicates execution selector
        });

        // Broadcaster: Guard Config Batch (Meta-Tx handler)
        roleHashes[11] = EngineBlox.BROADCASTER_ROLE;
        functionPermissions[11] = EngineBlox.FunctionPermission({
            functionSelector: GUARD_CONFIG_BATCH_META_SELECTOR,
            grantedActionsBitmap: EngineBlox.createBitmapFromActions(broadcasterMetaTxRequestApproveActions),
            handlerForSelectors: handlerForSelectors6
        });

        // Broadcaster: Guard Config Batch (Execution selector)
        roleHashes[12] = EngineBlox.BROADCASTER_ROLE;
        functionPermissions[12] = EngineBlox.FunctionPermission({
            functionSelector: GUARD_CONFIG_BATCH_EXECUTE_SELECTOR,
            grantedActionsBitmap: EngineBlox.createBitmapFromActions(broadcasterMetaTxRequestApproveActions),
            handlerForSelectors: handlerForSelectors6 // Self-reference indicates execution selector
        });
        
        return IDefinition.RolePermission({
            roleHashes: roleHashes,
            functionPermissions: functionPermissions
        });
    }
}
