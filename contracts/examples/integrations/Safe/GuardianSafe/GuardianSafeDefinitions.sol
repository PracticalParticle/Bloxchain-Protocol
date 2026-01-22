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
        StateAbstraction.FunctionSchema[] memory schemas = new StateAbstraction.FunctionSchema[](6);
        
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
        
        return schemas;
    }
    
    /**
     * @dev Returns predefined role hashes and their corresponding function permissions
     * @return RolePermission struct containing roleHashes and functionPermissions arrays
     */
    function getRolePermissions() public pure returns (IDefinition.RolePermission memory) {
        bytes32[] memory roleHashes = new bytes32[](9);
        StateAbstraction.FunctionPermission[] memory functionPermissions = new StateAbstraction.FunctionPermission[](9);
        
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
        
        // Owner: Request Transaction
        roleHashes[0] = StateAbstraction.OWNER_ROLE;
        functionPermissions[0] = StateAbstraction.FunctionPermission({
            functionSelector: REQUEST_TX_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(ownerTimeDelayRequestActions),
            handlerForSelector: EXEC_SAFE_TX_SELECTOR
        });
        
        // Owner: Approve Transaction After Delay
        roleHashes[1] = StateAbstraction.OWNER_ROLE;
        functionPermissions[1] = StateAbstraction.FunctionPermission({
            functionSelector: APPROVE_TX_DELAYED_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(ownerTimeDelayApproveActions),
            handlerForSelector: EXEC_SAFE_TX_SELECTOR
        });
        
        // Owner: Cancel Transaction
        roleHashes[2] = StateAbstraction.OWNER_ROLE;
        functionPermissions[2] = StateAbstraction.FunctionPermission({
            functionSelector: CANCEL_TX_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(ownerTimeDelayCancelActions),
            handlerForSelector: EXEC_SAFE_TX_SELECTOR
        });
        
        // Owner: Approve Transaction Meta (signer)
        roleHashes[3] = StateAbstraction.OWNER_ROLE;
        functionPermissions[3] = StateAbstraction.FunctionPermission({
            functionSelector: APPROVE_TX_META_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(ownerMetaApproveActions),
            handlerForSelector: EXEC_SAFE_TX_SELECTOR
        });
        
        // Owner: Cancel Transaction Meta (signer)
        roleHashes[4] = StateAbstraction.OWNER_ROLE;
        functionPermissions[4] = StateAbstraction.FunctionPermission({
            functionSelector: CANCEL_TX_META_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(ownerMetaCancelActions),
            handlerForSelector: EXEC_SAFE_TX_SELECTOR
        });
        
        // Owner: Request And Approve Transaction Meta (signer)
        roleHashes[5] = StateAbstraction.OWNER_ROLE;
        functionPermissions[5] = StateAbstraction.FunctionPermission({
            functionSelector: REQUEST_AND_APPROVE_TX_META_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(ownerMetaRequestApproveActions),
            handlerForSelector: EXEC_SAFE_TX_SELECTOR
        });
        
        // Broadcaster: Approve Transaction Meta (executor)
        roleHashes[6] = StateAbstraction.BROADCASTER_ROLE;
        functionPermissions[6] = StateAbstraction.FunctionPermission({
            functionSelector: APPROVE_TX_META_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(broadcasterMetaApproveActions),
            handlerForSelector: EXEC_SAFE_TX_SELECTOR
        });
        
        // Broadcaster: Cancel Transaction Meta (executor)
        roleHashes[7] = StateAbstraction.BROADCASTER_ROLE;
        functionPermissions[7] = StateAbstraction.FunctionPermission({
            functionSelector: CANCEL_TX_META_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(broadcasterMetaCancelActions),
            handlerForSelector: EXEC_SAFE_TX_SELECTOR
        });
        
        // Broadcaster: Request And Approve Transaction Meta (executor)
        roleHashes[8] = StateAbstraction.BROADCASTER_ROLE;
        functionPermissions[8] = StateAbstraction.FunctionPermission({
            functionSelector: REQUEST_AND_APPROVE_TX_META_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(broadcasterMetaRequestApproveActions),
            handlerForSelector: EXEC_SAFE_TX_SELECTOR
        });
        
        return IDefinition.RolePermission({
            roleHashes: roleHashes,
            functionPermissions: functionPermissions
        });
    }
}

