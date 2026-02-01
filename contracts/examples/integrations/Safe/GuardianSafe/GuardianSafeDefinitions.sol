// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import "../../../../core/lib/EngineBlox.sol";
import "../../../../interfaces/IDefinition.sol";

/**
 * @title GuardianSafeDefinitions
 * @dev Library containing predefined definitions for GuardianSafe initialization
 * This library holds static data that can be used to initialize GuardianSafe contracts
 * without increasing the main contract size
 * 
 * This library implements the IDefinition interface from EngineBlox
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
    function getFunctionSchemas() public pure returns (EngineBlox.FunctionSchema[] memory) {
        EngineBlox.FunctionSchema[] memory schemas = new EngineBlox.FunctionSchema[](7);
        
        // Time-delay function schemas
        EngineBlox.TxAction[] memory timeDelayRequestActions = new EngineBlox.TxAction[](1);
        timeDelayRequestActions[0] = EngineBlox.TxAction.EXECUTE_TIME_DELAY_REQUEST;
        
        EngineBlox.TxAction[] memory timeDelayApproveActions = new EngineBlox.TxAction[](1);
        timeDelayApproveActions[0] = EngineBlox.TxAction.EXECUTE_TIME_DELAY_APPROVE;
        
        EngineBlox.TxAction[] memory timeDelayCancelActions = new EngineBlox.TxAction[](1);
        timeDelayCancelActions[0] = EngineBlox.TxAction.EXECUTE_TIME_DELAY_CANCEL;
        
        // Meta-transaction function schemas
        EngineBlox.TxAction[] memory metaTxApproveActions = new EngineBlox.TxAction[](2);
        metaTxApproveActions[0] = EngineBlox.TxAction.SIGN_META_APPROVE;
        metaTxApproveActions[1] = EngineBlox.TxAction.EXECUTE_META_APPROVE;
        
        EngineBlox.TxAction[] memory metaTxCancelActions = new EngineBlox.TxAction[](2);
        metaTxCancelActions[0] = EngineBlox.TxAction.SIGN_META_CANCEL;
        metaTxCancelActions[1] = EngineBlox.TxAction.EXECUTE_META_CANCEL;
        
        EngineBlox.TxAction[] memory metaTxRequestApproveActions = new EngineBlox.TxAction[](2);
        metaTxRequestApproveActions[0] = EngineBlox.TxAction.SIGN_META_REQUEST_AND_APPROVE;
        metaTxRequestApproveActions[1] = EngineBlox.TxAction.EXECUTE_META_REQUEST_AND_APPROVE;
        
        // Prepare handlerForSelectors arrays
        bytes4[] memory execSafeTxHandlerForSelectors = new bytes4[](1);
        execSafeTxHandlerForSelectors[0] = EXEC_SAFE_TX_SELECTOR;
        
        // Time-delay functions
        schemas[0] = EngineBlox.FunctionSchema({
            functionSignature: "requestTransaction((address,uint256,bytes,uint8,uint256,uint256,uint256,address,address,bytes))",
            functionSelector: REQUEST_TX_SELECTOR,
            operationType: EXEC_SAFE_TX,
            operationName: "EXEC_SAFE_TX",
            supportedActionsBitmap: EngineBlox.createBitmapFromActions(timeDelayRequestActions),
            isProtected: true,
            handlerForSelectors: execSafeTxHandlerForSelectors
        });
        
        schemas[1] = EngineBlox.FunctionSchema({
            functionSignature: "approveTransactionAfterDelay(uint256)",
            functionSelector: APPROVE_TX_DELAYED_SELECTOR,
            operationType: EXEC_SAFE_TX,
            operationName: "EXEC_SAFE_TX",
            supportedActionsBitmap: EngineBlox.createBitmapFromActions(timeDelayApproveActions),
            isProtected: true,
            handlerForSelectors: execSafeTxHandlerForSelectors
        });
        
        schemas[2] = EngineBlox.FunctionSchema({
            functionSignature: "cancelTransaction(uint256)",
            functionSelector: CANCEL_TX_SELECTOR,
            operationType: EXEC_SAFE_TX,
            operationName: "EXEC_SAFE_TX",
            supportedActionsBitmap: EngineBlox.createBitmapFromActions(timeDelayCancelActions),
            isProtected: true,
            handlerForSelectors: execSafeTxHandlerForSelectors
        });
        
        // Meta-transaction functions
        schemas[3] = EngineBlox.FunctionSchema({
            functionSignature: "approveTransactionWithMetaTx((uint256,uint256,uint8,(address,address,uint256,uint256,bytes32,bytes4,bytes),bytes32,bytes,(address,uint256,address,uint256)),(uint256,uint256,address,bytes4,uint8,uint256,uint256,address),bytes32,bytes,bytes))",
            functionSelector: APPROVE_TX_META_SELECTOR,
            operationType: EXEC_SAFE_TX,
            operationName: "EXEC_SAFE_TX",
            supportedActionsBitmap: EngineBlox.createBitmapFromActions(metaTxApproveActions),
            isProtected: true,
            handlerForSelectors: execSafeTxHandlerForSelectors
        });
        
        schemas[4] = EngineBlox.FunctionSchema({
            functionSignature: "cancelTransactionWithMetaTx((uint256,uint256,uint8,(address,address,uint256,uint256,bytes32,bytes4,bytes),bytes32,bytes,(address,uint256,address,uint256)),(uint256,uint256,address,bytes4,uint8,uint256,uint256,address),bytes32,bytes,bytes))",
            functionSelector: CANCEL_TX_META_SELECTOR,
            operationType: EXEC_SAFE_TX,
            operationName: "EXEC_SAFE_TX",
            supportedActionsBitmap: EngineBlox.createBitmapFromActions(metaTxCancelActions),
            isProtected: true,
            handlerForSelectors: execSafeTxHandlerForSelectors
        });
        
        schemas[5] = EngineBlox.FunctionSchema({
            functionSignature: "requestAndApproveTransactionWithMetaTx((uint256,uint256,uint8,(address,address,uint256,uint256,bytes32,bytes4,bytes),bytes32,bytes,(address,uint256,address,uint256)),(uint256,uint256,address,bytes4,uint8,uint256,uint256,address),bytes32,bytes,bytes))",
            functionSelector: REQUEST_AND_APPROVE_TX_META_SELECTOR,
            operationType: EXEC_SAFE_TX,
            operationName: "EXEC_SAFE_TX",
            supportedActionsBitmap: EngineBlox.createBitmapFromActions(metaTxRequestApproveActions),
            isProtected: true,
            handlerForSelectors: execSafeTxHandlerForSelectors
        });
        
        // Execution selector schema (for dual-permission model)
        // Supports both time-delay and meta-transaction workflows
        EngineBlox.TxAction[] memory executionActions = new EngineBlox.TxAction[](8);
        executionActions[0] = EngineBlox.TxAction.EXECUTE_TIME_DELAY_REQUEST;
        executionActions[1] = EngineBlox.TxAction.EXECUTE_TIME_DELAY_APPROVE;
        executionActions[2] = EngineBlox.TxAction.SIGN_META_APPROVE;
        executionActions[3] = EngineBlox.TxAction.SIGN_META_CANCEL;
        executionActions[4] = EngineBlox.TxAction.SIGN_META_REQUEST_AND_APPROVE;
        executionActions[5] = EngineBlox.TxAction.EXECUTE_META_APPROVE;
        executionActions[6] = EngineBlox.TxAction.EXECUTE_META_CANCEL;
        executionActions[7] = EngineBlox.TxAction.EXECUTE_META_REQUEST_AND_APPROVE;
        
        bytes4[] memory execSafeTxExecutionHandlerForSelectors = new bytes4[](1);
        execSafeTxExecutionHandlerForSelectors[0] = EXEC_SAFE_TX_SELECTOR;
        
        schemas[6] = EngineBlox.FunctionSchema({
            functionSignature: "executeTransaction(address,uint256,bytes,uint8,uint256,uint256,uint256,address,address,bytes)",
            functionSelector: EXEC_SAFE_TX_SELECTOR,
            operationType: EXEC_SAFE_TX,
            operationName: "EXEC_SAFE_TX",
            supportedActionsBitmap: EngineBlox.createBitmapFromActions(executionActions),
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
        EngineBlox.FunctionPermission[] memory functionPermissions = new EngineBlox.FunctionPermission[](11);
        
        // Owner role permissions for time-delay operations
        EngineBlox.TxAction[] memory ownerTimeDelayRequestActions = new EngineBlox.TxAction[](1);
        ownerTimeDelayRequestActions[0] = EngineBlox.TxAction.EXECUTE_TIME_DELAY_REQUEST;
        
        EngineBlox.TxAction[] memory ownerTimeDelayApproveActions = new EngineBlox.TxAction[](1);
        ownerTimeDelayApproveActions[0] = EngineBlox.TxAction.EXECUTE_TIME_DELAY_APPROVE;
        
        EngineBlox.TxAction[] memory ownerTimeDelayCancelActions = new EngineBlox.TxAction[](1);
        ownerTimeDelayCancelActions[0] = EngineBlox.TxAction.EXECUTE_TIME_DELAY_CANCEL;
        
        // Owner role permissions for meta-transactions (signing)
        EngineBlox.TxAction[] memory ownerMetaApproveActions = new EngineBlox.TxAction[](1);
        ownerMetaApproveActions[0] = EngineBlox.TxAction.SIGN_META_APPROVE;
        
        EngineBlox.TxAction[] memory ownerMetaCancelActions = new EngineBlox.TxAction[](1);
        ownerMetaCancelActions[0] = EngineBlox.TxAction.SIGN_META_CANCEL;
        
        EngineBlox.TxAction[] memory ownerMetaRequestApproveActions = new EngineBlox.TxAction[](1);
        ownerMetaRequestApproveActions[0] = EngineBlox.TxAction.SIGN_META_REQUEST_AND_APPROVE;
        
        // Broadcaster role permissions for meta-transactions (execution)
        EngineBlox.TxAction[] memory broadcasterMetaApproveActions = new EngineBlox.TxAction[](1);
        broadcasterMetaApproveActions[0] = EngineBlox.TxAction.EXECUTE_META_APPROVE;
        
        EngineBlox.TxAction[] memory broadcasterMetaCancelActions = new EngineBlox.TxAction[](1);
        broadcasterMetaCancelActions[0] = EngineBlox.TxAction.EXECUTE_META_CANCEL;
        
        EngineBlox.TxAction[] memory broadcasterMetaRequestApproveActions = new EngineBlox.TxAction[](1);
        broadcasterMetaRequestApproveActions[0] = EngineBlox.TxAction.EXECUTE_META_REQUEST_AND_APPROVE;
        
        // Create reusable handlerForSelectors array
        bytes4[] memory execSafeTxHandlers = new bytes4[](1);
        execSafeTxHandlers[0] = EXEC_SAFE_TX_SELECTOR;
        
        // Owner: Request Transaction
        roleHashes[0] = EngineBlox.OWNER_ROLE;
        functionPermissions[0] = EngineBlox.FunctionPermission({
            functionSelector: REQUEST_TX_SELECTOR,
            grantedActionsBitmap: EngineBlox.createBitmapFromActions(ownerTimeDelayRequestActions),
            handlerForSelectors: execSafeTxHandlers
        });
        
        // Owner: Approve Transaction After Delay
        roleHashes[1] = EngineBlox.OWNER_ROLE;
        functionPermissions[1] = EngineBlox.FunctionPermission({
            functionSelector: APPROVE_TX_DELAYED_SELECTOR,
            grantedActionsBitmap: EngineBlox.createBitmapFromActions(ownerTimeDelayApproveActions),
            handlerForSelectors: execSafeTxHandlers
        });
        
        // Owner: Cancel Transaction
        roleHashes[2] = EngineBlox.OWNER_ROLE;
        functionPermissions[2] = EngineBlox.FunctionPermission({
            functionSelector: CANCEL_TX_SELECTOR,
            grantedActionsBitmap: EngineBlox.createBitmapFromActions(ownerTimeDelayCancelActions),
            handlerForSelectors: execSafeTxHandlers
        });
        
        // Owner: Approve Transaction Meta (signer)
        roleHashes[3] = EngineBlox.OWNER_ROLE;
        functionPermissions[3] = EngineBlox.FunctionPermission({
            functionSelector: APPROVE_TX_META_SELECTOR,
            grantedActionsBitmap: EngineBlox.createBitmapFromActions(ownerMetaApproveActions),
            handlerForSelectors: execSafeTxHandlers
        });
        
        // Owner: Cancel Transaction Meta (signer)
        roleHashes[4] = EngineBlox.OWNER_ROLE;
        functionPermissions[4] = EngineBlox.FunctionPermission({
            functionSelector: CANCEL_TX_META_SELECTOR,
            grantedActionsBitmap: EngineBlox.createBitmapFromActions(ownerMetaCancelActions),
            handlerForSelectors: execSafeTxHandlers
        });
        
        // Owner: Request And Approve Transaction Meta (signer)
        roleHashes[5] = EngineBlox.OWNER_ROLE;
        functionPermissions[5] = EngineBlox.FunctionPermission({
            functionSelector: REQUEST_AND_APPROVE_TX_META_SELECTOR,
            grantedActionsBitmap: EngineBlox.createBitmapFromActions(ownerMetaRequestApproveActions),
            handlerForSelectors: execSafeTxHandlers
        });
        
        // Broadcaster: Approve Transaction Meta (executor)
        roleHashes[6] = EngineBlox.BROADCASTER_ROLE;
        functionPermissions[6] = EngineBlox.FunctionPermission({
            functionSelector: APPROVE_TX_META_SELECTOR,
            grantedActionsBitmap: EngineBlox.createBitmapFromActions(broadcasterMetaApproveActions),
            handlerForSelectors: execSafeTxHandlers
        });
        
        // Broadcaster: Cancel Transaction Meta (executor)
        roleHashes[7] = EngineBlox.BROADCASTER_ROLE;
        functionPermissions[7] = EngineBlox.FunctionPermission({
            functionSelector: CANCEL_TX_META_SELECTOR,
            grantedActionsBitmap: EngineBlox.createBitmapFromActions(broadcasterMetaCancelActions),
            handlerForSelectors: execSafeTxHandlers
        });
        
        // Broadcaster: Request And Approve Transaction Meta (executor)
        roleHashes[8] = EngineBlox.BROADCASTER_ROLE;
        functionPermissions[8] = EngineBlox.FunctionPermission({
            functionSelector: REQUEST_AND_APPROVE_TX_META_SELECTOR,
            grantedActionsBitmap: EngineBlox.createBitmapFromActions(broadcasterMetaRequestApproveActions),
            handlerForSelectors: execSafeTxHandlers
        });
        
        // Owner: Execute Transaction (for time-delay request/approve and meta-tx signing)
        EngineBlox.TxAction[] memory ownerExecutionActions = new EngineBlox.TxAction[](5);
        ownerExecutionActions[0] = EngineBlox.TxAction.EXECUTE_TIME_DELAY_REQUEST;
        ownerExecutionActions[1] = EngineBlox.TxAction.EXECUTE_TIME_DELAY_APPROVE;
        ownerExecutionActions[2] = EngineBlox.TxAction.SIGN_META_APPROVE;
        ownerExecutionActions[3] = EngineBlox.TxAction.SIGN_META_CANCEL;
        ownerExecutionActions[4] = EngineBlox.TxAction.SIGN_META_REQUEST_AND_APPROVE;
        
        roleHashes[9] = EngineBlox.OWNER_ROLE;
        functionPermissions[9] = EngineBlox.FunctionPermission({
            functionSelector: EXEC_SAFE_TX_SELECTOR,
            grantedActionsBitmap: EngineBlox.createBitmapFromActions(ownerExecutionActions),
            handlerForSelectors: execSafeTxHandlers
        });
        
        // Broadcaster: Execute Transaction (for meta-tx execution)
        EngineBlox.TxAction[] memory broadcasterExecutionActions = new EngineBlox.TxAction[](3);
        broadcasterExecutionActions[0] = EngineBlox.TxAction.EXECUTE_META_APPROVE;
        broadcasterExecutionActions[1] = EngineBlox.TxAction.EXECUTE_META_CANCEL;
        broadcasterExecutionActions[2] = EngineBlox.TxAction.EXECUTE_META_REQUEST_AND_APPROVE;
        
        roleHashes[10] = EngineBlox.BROADCASTER_ROLE;
        functionPermissions[10] = EngineBlox.FunctionPermission({
            functionSelector: EXEC_SAFE_TX_SELECTOR,
            grantedActionsBitmap: EngineBlox.createBitmapFromActions(broadcasterExecutionActions),
            handlerForSelectors: execSafeTxHandlers
        });
        
        return IDefinition.RolePermission({
            roleHashes: roleHashes,
            functionPermissions: functionPermissions
        });
    }

    /**
     * @dev ERC165: report support for IDefinition when this library is used at an address
     */
    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == type(IDefinition).interfaceId;
    }
}

