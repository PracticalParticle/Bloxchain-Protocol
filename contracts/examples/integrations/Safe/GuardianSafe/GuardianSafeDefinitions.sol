// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "../../../../core/lib/StateAbstraction.sol";
import "../../../../interfaces/IDefinition.sol";

/**
 * @title GuardianSafeDefinitions
 * @dev Library containing predefined definitions for GuardianSafe initialization
 * This library holds static data that can be used to initialize GuardianSafe contracts
 * without increasing the main contract size
 * 
 * This library implements the IDefinition interface from StateAbstraction
 * and provides a direct initialization function for GuardianSafe contracts
 */
library GuardianSafeDefinitions {
    
    // Operation Type Constants
    bytes32 public constant EXEC_SAFE_TX = keccak256("EXEC_SAFE_TX");
    
    // Function Selector Constants
    bytes4 public constant EXEC_SAFE_TX_SELECTOR = bytes4(keccak256("executeTransaction(address,uint256,bytes,uint8,uint256,uint256,uint256,address,address,bytes)"));
    
    // Time Delay Function Selectors
    bytes4 public constant REQUEST_TX_SELECTOR = bytes4(keccak256("requestTransaction((address,uint256,bytes,uint8,uint256,uint256,uint256,address,address,bytes))"));
    bytes4 public constant APPROVE_TX_DELAYED_SELECTOR = bytes4(keccak256("approveTransactionAfterDelay(uint256)"));
    bytes4 public constant CANCEL_TX_SELECTOR = bytes4(keccak256("cancelTransaction(uint256)"));
    
    // Meta-transaction Function Selectors
    bytes4 public constant APPROVE_TX_META_SELECTOR = bytes4(keccak256("approveTransactionWithMetaTx((uint256,uint256,uint8,(address,address,uint256,uint256,bytes32,bytes4,bytes),bytes32,bytes,(address,uint256,address,uint256)),(uint256,uint256,address,bytes4,uint8,uint256,uint256,address),bytes32,bytes,bytes))"));
    bytes4 public constant CANCEL_TX_META_SELECTOR = bytes4(keccak256("cancelTransactionWithMetaTx((uint256,uint256,uint8,(address,address,uint256,uint256,bytes32,bytes4,bytes),bytes32,bytes,(address,uint256,address,uint256)),(uint256,uint256,address,bytes4,uint8,uint256,uint256,address),bytes32,bytes,bytes))"));
    bytes4 public constant REQUEST_AND_APPROVE_TX_META_SELECTOR = bytes4(keccak256("requestAndApproveTransactionWithMetaTx((uint256,uint256,uint8,(address,address,uint256,uint256,bytes32,bytes4,bytes),bytes32,bytes,(address,uint256,address,uint256)),(uint256,uint256,address,bytes4,uint8,uint256,uint256,address),bytes32,bytes,bytes))"));
    
    /**
     * @dev Returns predefined function schemas
     * @return Array of function schema definitions
     */
    function getFunctionSchemas() public pure returns (StateAbstraction.FunctionSchema[] memory) {
        StateAbstraction.FunctionSchema[] memory schemas = new StateAbstraction.FunctionSchema[](7);
        
        // Time-delay function schemas
        StateAbstraction.TxAction[] memory timeDelayRequestActions = new StateAbstraction.TxAction[](1);
        timeDelayRequestActions[0] = StateAbstraction.TxAction.EXECUTE_TIME_DELAY_REQUEST;
        
        StateAbstraction.TxAction[] memory timeDelayApproveActions = new StateAbstraction.TxAction[](1);
        timeDelayApproveActions[0] = StateAbstraction.TxAction.EXECUTE_TIME_DELAY_APPROVE;
        
        StateAbstraction.TxAction[] memory timeDelayCancelActions = new StateAbstraction.TxAction[](1);
        timeDelayCancelActions[0] = StateAbstraction.TxAction.EXECUTE_TIME_DELAY_CANCEL;
        
        // Meta-transaction function schemas
        StateAbstraction.TxAction[] memory metaTxApproveActions = new StateAbstraction.TxAction[](2);
        metaTxApproveActions[0] = StateAbstraction.TxAction.SIGN_META_APPROVE;
        metaTxApproveActions[1] = StateAbstraction.TxAction.EXECUTE_META_APPROVE;
        
        StateAbstraction.TxAction[] memory metaTxCancelActions = new StateAbstraction.TxAction[](2);
        metaTxCancelActions[0] = StateAbstraction.TxAction.SIGN_META_CANCEL;
        metaTxCancelActions[1] = StateAbstraction.TxAction.EXECUTE_META_CANCEL;
        
        StateAbstraction.TxAction[] memory metaTxRequestApproveActions = new StateAbstraction.TxAction[](2);
        metaTxRequestApproveActions[0] = StateAbstraction.TxAction.SIGN_META_REQUEST_AND_APPROVE;
        metaTxRequestApproveActions[1] = StateAbstraction.TxAction.EXECUTE_META_REQUEST_AND_APPROVE;
        
        // Prepare handlerForSelectors arrays
        bytes4[] memory execSafeTxHandlerForSelectors = new bytes4[](1);
        execSafeTxHandlerForSelectors[0] = EXEC_SAFE_TX_SELECTOR;
        
        // Time-delay functions
        schemas[0] = StateAbstraction.FunctionSchema({
            functionSignature: "requestTransaction((address,uint256,bytes,uint8,uint256,uint256,uint256,address,address,bytes))",
            functionSelector: REQUEST_TX_SELECTOR,
            operationType: EXEC_SAFE_TX,
            operationName: "EXEC_SAFE_TX",
            supportedActionsBitmap: StateAbstraction.createBitmapFromActions(timeDelayRequestActions),
            isProtected: true,
            handlerForSelectors: execSafeTxHandlerForSelectors
        });
        
        schemas[1] = StateAbstraction.FunctionSchema({
            functionSignature: "approveTransactionAfterDelay(uint256)",
            functionSelector: APPROVE_TX_DELAYED_SELECTOR,
            operationType: EXEC_SAFE_TX,
            operationName: "EXEC_SAFE_TX",
            supportedActionsBitmap: StateAbstraction.createBitmapFromActions(timeDelayApproveActions),
            isProtected: true,
            handlerForSelectors: execSafeTxHandlerForSelectors
        });
        
        schemas[2] = StateAbstraction.FunctionSchema({
            functionSignature: "cancelTransaction(uint256)",
            functionSelector: CANCEL_TX_SELECTOR,
            operationType: EXEC_SAFE_TX,
            operationName: "EXEC_SAFE_TX",
            supportedActionsBitmap: StateAbstraction.createBitmapFromActions(timeDelayCancelActions),
            isProtected: true,
            handlerForSelectors: execSafeTxHandlerForSelectors
        });
        
        // Meta-transaction functions
        schemas[3] = StateAbstraction.FunctionSchema({
            functionSignature: "approveTransactionWithMetaTx((uint256,uint256,uint8,(address,address,uint256,uint256,bytes32,bytes4,bytes),bytes32,bytes,(address,uint256,address,uint256)),(uint256,uint256,address,bytes4,uint8,uint256,uint256,address),bytes32,bytes,bytes))",
            functionSelector: APPROVE_TX_META_SELECTOR,
            operationType: EXEC_SAFE_TX,
            operationName: "EXEC_SAFE_TX",
            supportedActionsBitmap: StateAbstraction.createBitmapFromActions(metaTxApproveActions),
            isProtected: true,
            handlerForSelectors: execSafeTxHandlerForSelectors
        });
        
        schemas[4] = StateAbstraction.FunctionSchema({
            functionSignature: "cancelTransactionWithMetaTx((uint256,uint256,uint8,(address,address,uint256,uint256,bytes32,bytes4,bytes),bytes32,bytes,(address,uint256,address,uint256)),(uint256,uint256,address,bytes4,uint8,uint256,uint256,address),bytes32,bytes,bytes))",
            functionSelector: CANCEL_TX_META_SELECTOR,
            operationType: EXEC_SAFE_TX,
            operationName: "EXEC_SAFE_TX",
            supportedActionsBitmap: StateAbstraction.createBitmapFromActions(metaTxCancelActions),
            isProtected: true,
            handlerForSelectors: execSafeTxHandlerForSelectors
        });
        
        schemas[5] = StateAbstraction.FunctionSchema({
            functionSignature: "requestAndApproveTransactionWithMetaTx((uint256,uint256,uint8,(address,address,uint256,uint256,bytes32,bytes4,bytes),bytes32,bytes,(address,uint256,address,uint256)),(uint256,uint256,address,bytes4,uint8,uint256,uint256,address),bytes32,bytes,bytes))",
            functionSelector: REQUEST_AND_APPROVE_TX_META_SELECTOR,
            operationType: EXEC_SAFE_TX,
            operationName: "EXEC_SAFE_TX",
            supportedActionsBitmap: StateAbstraction.createBitmapFromActions(metaTxRequestApproveActions),
            isProtected: true,
            handlerForSelectors: execSafeTxHandlerForSelectors
        });
        
        // Execution selector schema (for dual-permission model)
        // Supports both time-delay and meta-transaction workflows
        StateAbstraction.TxAction[] memory executionActions = new StateAbstraction.TxAction[](5);
        executionActions[0] = StateAbstraction.TxAction.EXECUTE_TIME_DELAY_REQUEST;
        executionActions[1] = StateAbstraction.TxAction.EXECUTE_TIME_DELAY_APPROVE;
        executionActions[2] = StateAbstraction.TxAction.SIGN_META_APPROVE;
        executionActions[3] = StateAbstraction.TxAction.SIGN_META_CANCEL;
        executionActions[4] = StateAbstraction.TxAction.SIGN_META_REQUEST_AND_APPROVE;
        
        bytes4[] memory execSafeTxExecutionHandlerForSelectors = new bytes4[](1);
        execSafeTxExecutionHandlerForSelectors[0] = EXEC_SAFE_TX_SELECTOR;
        
        schemas[6] = StateAbstraction.FunctionSchema({
            functionSignature: "executeTransaction(address,uint256,bytes,uint8,uint256,uint256,uint256,address,address,bytes)",
            functionSelector: EXEC_SAFE_TX_SELECTOR,
            operationType: EXEC_SAFE_TX,
            operationName: "EXEC_SAFE_TX",
            supportedActionsBitmap: StateAbstraction.createBitmapFromActions(executionActions),
            isProtected: true,
            handlerForSelectors: execSafeTxExecutionHandlerForSelectors
        });
        
        return schemas;
    }
    
    /**
     * @dev Returns predefined role hashes and their corresponding function permissions
     * @return RolePermission struct containing roleHashes and functionPermissions arrays
     */
    function getRolePermissions() public pure returns (IDefinition.RolePermission memory) {
        bytes32[] memory roleHashes = new bytes32[](11);
        StateAbstraction.FunctionPermission[] memory functionPermissions = new StateAbstraction.FunctionPermission[](11);
        
        // Owner role permissions for time-delay operations
        StateAbstraction.TxAction[] memory ownerTimeDelayRequestActions = new StateAbstraction.TxAction[](1);
        ownerTimeDelayRequestActions[0] = StateAbstraction.TxAction.EXECUTE_TIME_DELAY_REQUEST;
        
        StateAbstraction.TxAction[] memory ownerTimeDelayApproveActions = new StateAbstraction.TxAction[](1);
        ownerTimeDelayApproveActions[0] = StateAbstraction.TxAction.EXECUTE_TIME_DELAY_APPROVE;
        
        StateAbstraction.TxAction[] memory ownerTimeDelayCancelActions = new StateAbstraction.TxAction[](1);
        ownerTimeDelayCancelActions[0] = StateAbstraction.TxAction.EXECUTE_TIME_DELAY_CANCEL;
        
        // Owner role permissions for meta-transactions (signing)
        StateAbstraction.TxAction[] memory ownerMetaApproveActions = new StateAbstraction.TxAction[](1);
        ownerMetaApproveActions[0] = StateAbstraction.TxAction.SIGN_META_APPROVE;
        
        StateAbstraction.TxAction[] memory ownerMetaCancelActions = new StateAbstraction.TxAction[](1);
        ownerMetaCancelActions[0] = StateAbstraction.TxAction.SIGN_META_CANCEL;
        
        StateAbstraction.TxAction[] memory ownerMetaRequestApproveActions = new StateAbstraction.TxAction[](1);
        ownerMetaRequestApproveActions[0] = StateAbstraction.TxAction.SIGN_META_REQUEST_AND_APPROVE;
        
        // Broadcaster role permissions for meta-transactions (execution)
        StateAbstraction.TxAction[] memory broadcasterMetaApproveActions = new StateAbstraction.TxAction[](1);
        broadcasterMetaApproveActions[0] = StateAbstraction.TxAction.EXECUTE_META_APPROVE;
        
        StateAbstraction.TxAction[] memory broadcasterMetaCancelActions = new StateAbstraction.TxAction[](1);
        broadcasterMetaCancelActions[0] = StateAbstraction.TxAction.EXECUTE_META_CANCEL;
        
        StateAbstraction.TxAction[] memory broadcasterMetaRequestApproveActions = new StateAbstraction.TxAction[](1);
        broadcasterMetaRequestApproveActions[0] = StateAbstraction.TxAction.EXECUTE_META_REQUEST_AND_APPROVE;
        
        // Create reusable handlerForSelectors array
        bytes4[] memory execSafeTxHandlers = new bytes4[](1);
        execSafeTxHandlers[0] = EXEC_SAFE_TX_SELECTOR;
        
        // Owner: Request Transaction
        roleHashes[0] = StateAbstraction.OWNER_ROLE;
        functionPermissions[0] = StateAbstraction.FunctionPermission({
            functionSelector: REQUEST_TX_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(ownerTimeDelayRequestActions),
            handlerForSelectors: execSafeTxHandlers
        });
        
        // Owner: Approve Transaction After Delay
        roleHashes[1] = StateAbstraction.OWNER_ROLE;
        functionPermissions[1] = StateAbstraction.FunctionPermission({
            functionSelector: APPROVE_TX_DELAYED_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(ownerTimeDelayApproveActions),
            handlerForSelectors: execSafeTxHandlers
        });
        
        // Owner: Cancel Transaction
        roleHashes[2] = StateAbstraction.OWNER_ROLE;
        functionPermissions[2] = StateAbstraction.FunctionPermission({
            functionSelector: CANCEL_TX_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(ownerTimeDelayCancelActions),
            handlerForSelectors: execSafeTxHandlers
        });
        
        // Owner: Approve Transaction Meta (signer)
        roleHashes[3] = StateAbstraction.OWNER_ROLE;
        functionPermissions[3] = StateAbstraction.FunctionPermission({
            functionSelector: APPROVE_TX_META_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(ownerMetaApproveActions),
            handlerForSelectors: execSafeTxHandlers
        });
        
        // Owner: Cancel Transaction Meta (signer)
        roleHashes[4] = StateAbstraction.OWNER_ROLE;
        functionPermissions[4] = StateAbstraction.FunctionPermission({
            functionSelector: CANCEL_TX_META_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(ownerMetaCancelActions),
            handlerForSelectors: execSafeTxHandlers
        });
        
        // Owner: Request And Approve Transaction Meta (signer)
        roleHashes[5] = StateAbstraction.OWNER_ROLE;
        functionPermissions[5] = StateAbstraction.FunctionPermission({
            functionSelector: REQUEST_AND_APPROVE_TX_META_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(ownerMetaRequestApproveActions),
            handlerForSelectors: execSafeTxHandlers
        });
        
        // Broadcaster: Approve Transaction Meta (executor)
        roleHashes[6] = StateAbstraction.BROADCASTER_ROLE;
        functionPermissions[6] = StateAbstraction.FunctionPermission({
            functionSelector: APPROVE_TX_META_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(broadcasterMetaApproveActions),
            handlerForSelectors: execSafeTxHandlers
        });
        
        // Broadcaster: Cancel Transaction Meta (executor)
        roleHashes[7] = StateAbstraction.BROADCASTER_ROLE;
        functionPermissions[7] = StateAbstraction.FunctionPermission({
            functionSelector: CANCEL_TX_META_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(broadcasterMetaCancelActions),
            handlerForSelectors: execSafeTxHandlers
        });
        
        // Broadcaster: Request And Approve Transaction Meta (executor)
        roleHashes[8] = StateAbstraction.BROADCASTER_ROLE;
        functionPermissions[8] = StateAbstraction.FunctionPermission({
            functionSelector: REQUEST_AND_APPROVE_TX_META_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(broadcasterMetaRequestApproveActions),
            handlerForSelectors: execSafeTxHandlers
        });
        
        // Owner: Execute Transaction (for time-delay request/approve and meta-tx signing)
        StateAbstraction.TxAction[] memory ownerExecutionActions = new StateAbstraction.TxAction[](5);
        ownerExecutionActions[0] = StateAbstraction.TxAction.EXECUTE_TIME_DELAY_REQUEST;
        ownerExecutionActions[1] = StateAbstraction.TxAction.EXECUTE_TIME_DELAY_APPROVE;
        ownerExecutionActions[2] = StateAbstraction.TxAction.SIGN_META_APPROVE;
        ownerExecutionActions[3] = StateAbstraction.TxAction.SIGN_META_CANCEL;
        ownerExecutionActions[4] = StateAbstraction.TxAction.SIGN_META_REQUEST_AND_APPROVE;
        
        roleHashes[9] = StateAbstraction.OWNER_ROLE;
        functionPermissions[9] = StateAbstraction.FunctionPermission({
            functionSelector: EXEC_SAFE_TX_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(ownerExecutionActions),
            handlerForSelectors: execSafeTxHandlers
        });
        
        // Broadcaster: Execute Transaction (for meta-tx execution)
        StateAbstraction.TxAction[] memory broadcasterExecutionActions = new StateAbstraction.TxAction[](3);
        broadcasterExecutionActions[0] = StateAbstraction.TxAction.EXECUTE_META_APPROVE;
        broadcasterExecutionActions[1] = StateAbstraction.TxAction.EXECUTE_META_CANCEL;
        broadcasterExecutionActions[2] = StateAbstraction.TxAction.EXECUTE_META_REQUEST_AND_APPROVE;
        
        roleHashes[10] = StateAbstraction.BROADCASTER_ROLE;
        functionPermissions[10] = StateAbstraction.FunctionPermission({
            functionSelector: EXEC_SAFE_TX_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(broadcasterExecutionActions),
            handlerForSelectors: execSafeTxHandlers
        });
        
        return IDefinition.RolePermission({
            roleHashes: roleHashes,
            functionPermissions: functionPermissions
        });
    }
}

