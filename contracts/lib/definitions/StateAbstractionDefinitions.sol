// SPDX-License-Identifier: MPL-2.0
pragma solidity ^0.8.25;

import "../StateAbstraction.sol";
import "../../interfaces/IDefinition.sol";

/**
 * @title StateAbstractionDefinitions
 * @dev Library containing predefined definitions for StateAbstraction initialization
 * This library holds static data that can be used to initialize StateAbstraction contracts
 * without increasing the main contract size
 * 
 * This library implements the IDefinition interface from StateAbstraction
 * and provides a direct initialization function for StateAbstraction contracts
 */
library StateAbstractionDefinitions {
    
    // Operation Type Constants
    bytes32 public constant SYSTEM_OPERATION = keccak256("SYSTEM_OPERATION");
    
    
    
    /**
     * @dev Returns predefined function schemas based on StateAbstraction.initializeBaseFunctionSchemas
     * @return Array of function schema definitions
     */
    function getFunctionSchemas() public pure returns (StateAbstraction.FunctionSchema[] memory) {
        StateAbstraction.FunctionSchema[] memory schemas = new StateAbstraction.FunctionSchema[](7);
        
        // Time-delay function schemas (matching initializeBaseFunctionSchemas)
        StateAbstraction.TxAction[] memory timeDelayRequestActions = new StateAbstraction.TxAction[](1);
        timeDelayRequestActions[0] = StateAbstraction.TxAction.EXECUTE_TIME_DELAY_REQUEST;
        
        StateAbstraction.TxAction[] memory timeDelayApproveActions = new StateAbstraction.TxAction[](1);
        timeDelayApproveActions[0] = StateAbstraction.TxAction.EXECUTE_TIME_DELAY_APPROVE;
        
        StateAbstraction.TxAction[] memory timeDelayCancelActions = new StateAbstraction.TxAction[](1);
        timeDelayCancelActions[0] = StateAbstraction.TxAction.EXECUTE_TIME_DELAY_CANCEL;
        
        // Meta-transaction function schemas (matching initializeBaseFunctionSchemas)
        StateAbstraction.TxAction[] memory metaTxApproveActions = new StateAbstraction.TxAction[](2);
        metaTxApproveActions[0] = StateAbstraction.TxAction.SIGN_META_APPROVE;
        metaTxApproveActions[1] = StateAbstraction.TxAction.EXECUTE_META_APPROVE;
        
        StateAbstraction.TxAction[] memory metaTxCancelActions = new StateAbstraction.TxAction[](2);
        metaTxCancelActions[0] = StateAbstraction.TxAction.SIGN_META_CANCEL;
        metaTxCancelActions[1] = StateAbstraction.TxAction.EXECUTE_META_CANCEL;
        
        StateAbstraction.TxAction[] memory metaTxRequestApproveActions = new StateAbstraction.TxAction[](2);
        metaTxRequestApproveActions[0] = StateAbstraction.TxAction.SIGN_META_REQUEST_AND_APPROVE;
        metaTxRequestApproveActions[1] = StateAbstraction.TxAction.EXECUTE_META_REQUEST_AND_APPROVE;
        
        // Core MultiPhase functions (matching initializeBaseFunctionSchemas exactly)
        schemas[0] = StateAbstraction.FunctionSchema({
            functionName: "txRequest",
            functionSelector: StateAbstraction.TX_REQUEST_SELECTOR,
            operationType: SYSTEM_OPERATION,
            operationName: "SYSTEM_OPERATION",
            supportedActionsBitmap: StateAbstraction.createBitmapFromActions(timeDelayRequestActions),
            isProtected: true
        });
        
        schemas[1] = StateAbstraction.FunctionSchema({
            functionName: "txDelayedApproval",
            functionSelector: StateAbstraction.TX_DELAYED_APPROVAL_SELECTOR,
            operationType: SYSTEM_OPERATION,
            operationName: "SYSTEM_OPERATION",
            supportedActionsBitmap: StateAbstraction.createBitmapFromActions(timeDelayApproveActions),
            isProtected: true
        });
        
        schemas[2] = StateAbstraction.FunctionSchema({
            functionName: "txCancellation",
            functionSelector: StateAbstraction.TX_CANCELLATION_SELECTOR,
            operationType: SYSTEM_OPERATION,
            operationName: "SYSTEM_OPERATION",
            supportedActionsBitmap: StateAbstraction.createBitmapFromActions(timeDelayCancelActions),
            isProtected: true
        });
        
        schemas[3] = StateAbstraction.FunctionSchema({
            functionName: "txApprovalWithMetaTx",
            functionSelector: StateAbstraction.META_TX_APPROVAL_SELECTOR,
            operationType: SYSTEM_OPERATION,
            operationName: "SYSTEM_OPERATION",
            supportedActionsBitmap: StateAbstraction.createBitmapFromActions(metaTxApproveActions),
            isProtected: true
        });
        
        schemas[4] = StateAbstraction.FunctionSchema({
            functionName: "txCancellationWithMetaTx",
            functionSelector: StateAbstraction.META_TX_CANCELLATION_SELECTOR,
            operationType: SYSTEM_OPERATION,
            operationName: "SYSTEM_OPERATION",
            supportedActionsBitmap: StateAbstraction.createBitmapFromActions(metaTxCancelActions),
            isProtected: true
        });
        
        schemas[5] = StateAbstraction.FunctionSchema({
            functionName: "requestAndApprove",
            functionSelector: StateAbstraction.META_TX_REQUEST_AND_APPROVE_SELECTOR,
            operationType: SYSTEM_OPERATION,
            operationName: "SYSTEM_OPERATION",
            supportedActionsBitmap: StateAbstraction.createBitmapFromActions(metaTxRequestApproveActions),
            isProtected: true
        });
        
        // Payment function schemas
        StateAbstraction.TxAction[] memory updatePaymentActions = new StateAbstraction.TxAction[](1);
        updatePaymentActions[0] = StateAbstraction.TxAction.EXECUTE_UPDATE_PAYMENT;
        
        schemas[6] = StateAbstraction.FunctionSchema({
            functionName: "updatePaymentForTransaction",
            functionSelector: StateAbstraction.UPDATE_PAYMENT_SELECTOR,
            operationType: SYSTEM_OPERATION,
            operationName: "SYSTEM_OPERATION",
            supportedActionsBitmap: StateAbstraction.createBitmapFromActions(updatePaymentActions),
            isProtected: true
        });
        
        return schemas;
    }
    
    /**
     * @dev Returns predefined role hashes and their corresponding function permissions
     * @return RolePermission struct containing roleHashes and functionPermissions arrays
     */
    function getRolePermissions() public pure returns (IDefinition.RolePermission memory) {
        bytes32[] memory roleHashes;
        StateAbstraction.FunctionPermission[] memory functionPermissions;
        roleHashes = new bytes32[](12);
        functionPermissions = new StateAbstraction.FunctionPermission[](12);
        
        // Owner role permissions (6 entries)
        StateAbstraction.TxAction[] memory ownerTxRequestActions = new StateAbstraction.TxAction[](1);
        ownerTxRequestActions[0] = StateAbstraction.TxAction.EXECUTE_TIME_DELAY_REQUEST;
        
        StateAbstraction.TxAction[] memory ownerTxApproveActions = new StateAbstraction.TxAction[](1);
        ownerTxApproveActions[0] = StateAbstraction.TxAction.EXECUTE_TIME_DELAY_APPROVE;
        
        StateAbstraction.TxAction[] memory ownerTxCancelActions = new StateAbstraction.TxAction[](1);
        ownerTxCancelActions[0] = StateAbstraction.TxAction.EXECUTE_TIME_DELAY_CANCEL;
        
        StateAbstraction.TxAction[] memory ownerMetaTxRequestApproveActions = new StateAbstraction.TxAction[](1);
        ownerMetaTxRequestApproveActions[0] = StateAbstraction.TxAction.SIGN_META_REQUEST_AND_APPROVE;
        
        StateAbstraction.TxAction[] memory ownerMetaTxApproveActions = new StateAbstraction.TxAction[](1);
        ownerMetaTxApproveActions[0] = StateAbstraction.TxAction.SIGN_META_APPROVE;
        
        StateAbstraction.TxAction[] memory ownerMetaTxCancelActions = new StateAbstraction.TxAction[](1);
        ownerMetaTxCancelActions[0] = StateAbstraction.TxAction.SIGN_META_CANCEL;
        
        // Owner: TX Request
        roleHashes[0] = StateAbstraction.OWNER_ROLE;
        functionPermissions[0] = StateAbstraction.FunctionPermission({
            functionSelector: StateAbstraction.TX_REQUEST_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(ownerTxRequestActions)
        });
        
        // Owner: TX Delayed Approval
        roleHashes[1] = StateAbstraction.OWNER_ROLE;
        functionPermissions[1] = StateAbstraction.FunctionPermission({
            functionSelector: StateAbstraction.TX_DELAYED_APPROVAL_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(ownerTxApproveActions)
        });
        
        // Owner: TX Cancellation
        roleHashes[2] = StateAbstraction.OWNER_ROLE;
        functionPermissions[2] = StateAbstraction.FunctionPermission({
            functionSelector: StateAbstraction.TX_CANCELLATION_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(ownerTxCancelActions)
        });
        
        // Owner: Meta TX Request and Approve
        roleHashes[3] = StateAbstraction.OWNER_ROLE;
        functionPermissions[3] = StateAbstraction.FunctionPermission({
            functionSelector: StateAbstraction.META_TX_REQUEST_AND_APPROVE_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(ownerMetaTxRequestApproveActions)
        });
        
        // Owner: Meta TX Approval
        roleHashes[4] = StateAbstraction.OWNER_ROLE;
        functionPermissions[4] = StateAbstraction.FunctionPermission({
            functionSelector: StateAbstraction.META_TX_APPROVAL_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(ownerMetaTxApproveActions)
        });
        
        // Owner: Meta TX Cancellation
        roleHashes[5] = StateAbstraction.OWNER_ROLE;
        functionPermissions[5] = StateAbstraction.FunctionPermission({
            functionSelector: StateAbstraction.META_TX_CANCELLATION_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(ownerMetaTxCancelActions)
        });
        
        // Broadcaster role permissions (3 entries)
        StateAbstraction.TxAction[] memory broadcasterMetaTxRequestApproveActions = new StateAbstraction.TxAction[](1);
        broadcasterMetaTxRequestApproveActions[0] = StateAbstraction.TxAction.EXECUTE_META_REQUEST_AND_APPROVE;
        
        StateAbstraction.TxAction[] memory broadcasterMetaTxApproveActions = new StateAbstraction.TxAction[](1);
        broadcasterMetaTxApproveActions[0] = StateAbstraction.TxAction.EXECUTE_META_APPROVE;
        
        StateAbstraction.TxAction[] memory broadcasterMetaTxCancelActions = new StateAbstraction.TxAction[](1);
        broadcasterMetaTxCancelActions[0] = StateAbstraction.TxAction.EXECUTE_META_CANCEL;
        
        // Broadcaster: Meta TX Request and Approve
        roleHashes[6] = StateAbstraction.BROADCASTER_ROLE;
        functionPermissions[6] = StateAbstraction.FunctionPermission({
            functionSelector: StateAbstraction.META_TX_REQUEST_AND_APPROVE_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(broadcasterMetaTxRequestApproveActions)
        });
        
        // Broadcaster: Meta TX Approval
        roleHashes[7] = StateAbstraction.BROADCASTER_ROLE;
        functionPermissions[7] = StateAbstraction.FunctionPermission({
            functionSelector: StateAbstraction.META_TX_APPROVAL_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(broadcasterMetaTxApproveActions)
        });
        
        // Broadcaster: Meta TX Cancellation
        roleHashes[8] = StateAbstraction.BROADCASTER_ROLE;
        functionPermissions[8] = StateAbstraction.FunctionPermission({
            functionSelector: StateAbstraction.META_TX_CANCELLATION_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(broadcasterMetaTxCancelActions)
        });
        
        // Recovery role permissions (3 entries)
        StateAbstraction.TxAction[] memory recoveryTxRequestActions = new StateAbstraction.TxAction[](1);
        recoveryTxRequestActions[0] = StateAbstraction.TxAction.EXECUTE_TIME_DELAY_REQUEST;
        
        StateAbstraction.TxAction[] memory recoveryTxApproveActions = new StateAbstraction.TxAction[](1);
        recoveryTxApproveActions[0] = StateAbstraction.TxAction.EXECUTE_TIME_DELAY_APPROVE;
        
        StateAbstraction.TxAction[] memory recoveryTxCancelActions = new StateAbstraction.TxAction[](1);
        recoveryTxCancelActions[0] = StateAbstraction.TxAction.EXECUTE_TIME_DELAY_CANCEL;
        
        // Recovery: TX Request
        roleHashes[9] = StateAbstraction.RECOVERY_ROLE;
        functionPermissions[9] = StateAbstraction.FunctionPermission({
            functionSelector: StateAbstraction.TX_REQUEST_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(recoveryTxRequestActions)
        });
        
        // Recovery: TX Delayed Approval
        roleHashes[10] = StateAbstraction.RECOVERY_ROLE;
        functionPermissions[10] = StateAbstraction.FunctionPermission({
            functionSelector: StateAbstraction.TX_DELAYED_APPROVAL_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(recoveryTxApproveActions)
        });
        
        // Recovery: TX Cancellation
        roleHashes[11] = StateAbstraction.RECOVERY_ROLE;
        functionPermissions[11] = StateAbstraction.FunctionPermission({
            functionSelector: StateAbstraction.TX_CANCELLATION_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(recoveryTxCancelActions)
        });
        
        return IDefinition.RolePermission({
            roleHashes: roleHashes,
            functionPermissions: functionPermissions
        });
    }
}
