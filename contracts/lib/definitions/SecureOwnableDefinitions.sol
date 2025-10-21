// SPDX-License-Identifier: MPL-2.0
pragma solidity ^0.8.25;

import "../StateAbstraction.sol";
import "../../interfaces/IDefinition.sol";

/**
 * @title SecureOwnableDefinitions
 * @dev Library containing predefined definitions for SecureOwnable initialization
 * This library holds static data that can be used to initialize SecureOwnable contracts
 * without increasing the main contract size
 * 
 * This library implements the IDefinition interface from StateAbstraction
 * and provides a direct initialization function for SecureOwnable contracts
 */
library SecureOwnableDefinitions {
    
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
    
    // Use the structs from StateAbstraction
    // These are now defined in the main library
    
    /**
     * @dev Returns predefined function schemas
     * @return Array of function schema definitions
     */
    function getFunctionSchemas() public pure returns (StateAbstraction.FunctionSchema[] memory) {
        StateAbstraction.FunctionSchema[] memory schemas = new StateAbstraction.FunctionSchema[](12);
        
        // Meta-transaction function schemas
        StateAbstraction.TxAction[] memory metaApproveActions = new StateAbstraction.TxAction[](2);
        metaApproveActions[0] = StateAbstraction.TxAction.EXECUTE_META_APPROVE;
        metaApproveActions[1] = StateAbstraction.TxAction.SIGN_META_APPROVE;
        
        StateAbstraction.TxAction[] memory metaCancelActions = new StateAbstraction.TxAction[](2);
        metaCancelActions[0] = StateAbstraction.TxAction.EXECUTE_META_CANCEL;
        metaCancelActions[1] = StateAbstraction.TxAction.SIGN_META_CANCEL;
        
        StateAbstraction.TxAction[] memory metaRequestApproveActions = new StateAbstraction.TxAction[](2);
        metaRequestApproveActions[0] = StateAbstraction.TxAction.SIGN_META_REQUEST_AND_APPROVE;
        metaRequestApproveActions[1] = StateAbstraction.TxAction.EXECUTE_META_REQUEST_AND_APPROVE;
        
        // Time-delayed functions
        StateAbstraction.TxAction[] memory timeDelayRequestActions = new StateAbstraction.TxAction[](1);
        timeDelayRequestActions[0] = StateAbstraction.TxAction.EXECUTE_TIME_DELAY_REQUEST;
        
        StateAbstraction.TxAction[] memory timeDelayApproveActions = new StateAbstraction.TxAction[](1);
        timeDelayApproveActions[0] = StateAbstraction.TxAction.EXECUTE_TIME_DELAY_APPROVE;
        
        StateAbstraction.TxAction[] memory timeDelayCancelActions = new StateAbstraction.TxAction[](1);
        timeDelayCancelActions[0] = StateAbstraction.TxAction.EXECUTE_TIME_DELAY_CANCEL;
        
        // Meta-transaction functions
        schemas[0] = StateAbstraction.FunctionSchema({
            functionName: "transferOwnershipApprovalWithMetaTx",
            functionSelector: TRANSFER_OWNERSHIP_APPROVE_META_SELECTOR,
            operationType: OWNERSHIP_TRANSFER,
            operationName: "OWNERSHIP_TRANSFER",
            supportedActions: metaApproveActions,
            isProtected: true
        });
        
        schemas[1] = StateAbstraction.FunctionSchema({
            functionName: "transferOwnershipCancellationWithMetaTx",
            functionSelector: TRANSFER_OWNERSHIP_CANCEL_META_SELECTOR,
            operationType: OWNERSHIP_TRANSFER,
            operationName: "OWNERSHIP_TRANSFER",
            supportedActions: metaCancelActions,
            isProtected: true
        });
        
        schemas[2] = StateAbstraction.FunctionSchema({
            functionName: "updateBroadcasterApprovalWithMetaTx",
            functionSelector: UPDATE_BROADCASTER_APPROVE_META_SELECTOR,
            operationType: BROADCASTER_UPDATE,
            operationName: "BROADCASTER_UPDATE",
            supportedActions: metaApproveActions,
            isProtected: true
        });
        
        schemas[3] = StateAbstraction.FunctionSchema({
            functionName: "updateBroadcasterCancellationWithMetaTx",
            functionSelector: UPDATE_BROADCASTER_CANCEL_META_SELECTOR,
            operationType: BROADCASTER_UPDATE,
            operationName: "BROADCASTER_UPDATE",
            supportedActions: metaCancelActions,
            isProtected: true
        });
        
        schemas[4] = StateAbstraction.FunctionSchema({
            functionName: "updateRecoveryRequestAndApprove",
            functionSelector: UPDATE_RECOVERY_META_SELECTOR,
            operationType: RECOVERY_UPDATE,
            operationName: "RECOVERY_UPDATE",
            supportedActions: metaRequestApproveActions,
            isProtected: true
        });
        
        schemas[5] = StateAbstraction.FunctionSchema({
            functionName: "updateTimeLockRequestAndApprove",
            functionSelector: UPDATE_TIMELOCK_META_SELECTOR,
            operationType: TIMELOCK_UPDATE,
            operationName: "TIMELOCK_UPDATE",
            supportedActions: metaRequestApproveActions,
            isProtected: true
        });
        
        // Time-delayed functions
        schemas[6] = StateAbstraction.FunctionSchema({
            functionName: "transferOwnershipRequest",
            functionSelector: TRANSFER_OWNERSHIP_REQUEST_SELECTOR,
            operationType: OWNERSHIP_TRANSFER,
            operationName: "OWNERSHIP_TRANSFER",
            supportedActions: timeDelayRequestActions,
            isProtected: true
        });
        
        schemas[7] = StateAbstraction.FunctionSchema({
            functionName: "transferOwnershipDelayedApproval",
            functionSelector: TRANSFER_OWNERSHIP_DELAYED_APPROVAL_SELECTOR,
            operationType: OWNERSHIP_TRANSFER,
            operationName: "OWNERSHIP_TRANSFER",
            supportedActions: timeDelayApproveActions,
            isProtected: true
        });
        
        schemas[8] = StateAbstraction.FunctionSchema({
            functionName: "transferOwnershipCancellation",
            functionSelector: TRANSFER_OWNERSHIP_CANCELLATION_SELECTOR,
            operationType: OWNERSHIP_TRANSFER,
            operationName: "OWNERSHIP_TRANSFER",
            supportedActions: timeDelayCancelActions,
            isProtected: true
        });
        
        schemas[9] = StateAbstraction.FunctionSchema({
            functionName: "updateBroadcasterRequest",
            functionSelector: UPDATE_BROADCASTER_REQUEST_SELECTOR,
            operationType: BROADCASTER_UPDATE,
            operationName: "BROADCASTER_UPDATE",
            supportedActions: timeDelayRequestActions,
            isProtected: true
        });
        
        schemas[10] = StateAbstraction.FunctionSchema({
            functionName: "updateBroadcasterDelayedApproval",
            functionSelector: UPDATE_BROADCASTER_DELAYED_APPROVAL_SELECTOR,
            operationType: BROADCASTER_UPDATE,
            operationName: "BROADCASTER_UPDATE",
            supportedActions: timeDelayApproveActions,
            isProtected: true
        });
        
        schemas[11] = StateAbstraction.FunctionSchema({
            functionName: "updateBroadcasterCancellation",
            functionSelector: UPDATE_BROADCASTER_CANCELLATION_SELECTOR,
            operationType: BROADCASTER_UPDATE,
            operationName: "BROADCASTER_UPDATE",
            supportedActions: timeDelayCancelActions,
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
        roleHashes = new bytes32[](19);
        functionPermissions = new StateAbstraction.FunctionPermission[](19);
        
        // Broadcaster role permissions (6 entries)
        StateAbstraction.TxAction[] memory broadcasterMetaApproveActions = new StateAbstraction.TxAction[](1);
        broadcasterMetaApproveActions[0] = StateAbstraction.TxAction.EXECUTE_META_APPROVE;
        
        StateAbstraction.TxAction[] memory broadcasterMetaCancelActions = new StateAbstraction.TxAction[](1);
        broadcasterMetaCancelActions[0] = StateAbstraction.TxAction.EXECUTE_META_CANCEL;
        
        StateAbstraction.TxAction[] memory broadcasterMetaRequestApproveActions = new StateAbstraction.TxAction[](1);
        broadcasterMetaRequestApproveActions[0] = StateAbstraction.TxAction.EXECUTE_META_REQUEST_AND_APPROVE;
        
        // Broadcaster: Transfer Ownership Approve Meta
        roleHashes[0] = StateAbstraction.BROADCASTER_ROLE;
        functionPermissions[0] = StateAbstraction.FunctionPermission({
            functionSelector: TRANSFER_OWNERSHIP_APPROVE_META_SELECTOR,
            grantedActions: broadcasterMetaApproveActions
        });
        
        // Broadcaster: Transfer Ownership Cancel Meta
        roleHashes[1] = StateAbstraction.BROADCASTER_ROLE;
        functionPermissions[1] = StateAbstraction.FunctionPermission({
            functionSelector: TRANSFER_OWNERSHIP_CANCEL_META_SELECTOR,
            grantedActions: broadcasterMetaCancelActions
        });
        
        // Broadcaster: Update Broadcaster Approve Meta
        roleHashes[2] = StateAbstraction.BROADCASTER_ROLE;
        functionPermissions[2] = StateAbstraction.FunctionPermission({
            functionSelector: UPDATE_BROADCASTER_APPROVE_META_SELECTOR,
            grantedActions: broadcasterMetaApproveActions
        });
        
        // Broadcaster: Update Broadcaster Cancel Meta
        roleHashes[3] = StateAbstraction.BROADCASTER_ROLE;
        functionPermissions[3] = StateAbstraction.FunctionPermission({
            functionSelector: UPDATE_BROADCASTER_CANCEL_META_SELECTOR,
            grantedActions: broadcasterMetaCancelActions
        });
        
        // Broadcaster: Update Recovery Meta
        roleHashes[4] = StateAbstraction.BROADCASTER_ROLE;
        functionPermissions[4] = StateAbstraction.FunctionPermission({
            functionSelector: UPDATE_RECOVERY_META_SELECTOR,
            grantedActions: broadcasterMetaRequestApproveActions
        });
        
        // Broadcaster: Update Timelock Meta
        roleHashes[5] = StateAbstraction.BROADCASTER_ROLE;
        functionPermissions[5] = StateAbstraction.FunctionPermission({
            functionSelector: UPDATE_TIMELOCK_META_SELECTOR,
            grantedActions: broadcasterMetaRequestApproveActions
        });
        
        // Owner role permissions (10 entries)
        StateAbstraction.TxAction[] memory ownerTimeDelayRequestActions = new StateAbstraction.TxAction[](1);
        ownerTimeDelayRequestActions[0] = StateAbstraction.TxAction.EXECUTE_TIME_DELAY_REQUEST;
        
        StateAbstraction.TxAction[] memory ownerTimeDelayApproveActions = new StateAbstraction.TxAction[](1);
        ownerTimeDelayApproveActions[0] = StateAbstraction.TxAction.EXECUTE_TIME_DELAY_APPROVE;
        
        StateAbstraction.TxAction[] memory ownerTimeDelayCancelActions = new StateAbstraction.TxAction[](1);
        ownerTimeDelayCancelActions[0] = StateAbstraction.TxAction.EXECUTE_TIME_DELAY_CANCEL;

        StateAbstraction.TxAction[] memory ownerMetaApproveActions = new StateAbstraction.TxAction[](1);
        ownerMetaApproveActions[0] = StateAbstraction.TxAction.SIGN_META_APPROVE;

        StateAbstraction.TxAction[] memory ownerMetaCancelActions = new StateAbstraction.TxAction[](1);
        ownerMetaCancelActions[0] = StateAbstraction.TxAction.SIGN_META_CANCEL;

        StateAbstraction.TxAction[] memory ownerMetaRequestApproveActions = new StateAbstraction.TxAction[](1);
        ownerMetaRequestApproveActions[0] = StateAbstraction.TxAction.SIGN_META_REQUEST_AND_APPROVE;
        
        // Owner: Transfer Ownership Delayed Approval
        roleHashes[6] = StateAbstraction.OWNER_ROLE;
        functionPermissions[6] = StateAbstraction.FunctionPermission({
            functionSelector: TRANSFER_OWNERSHIP_DELAYED_APPROVAL_SELECTOR,
            grantedActions: ownerTimeDelayApproveActions
        });

        // Owner: Transfer Ownership Approve Meta
        roleHashes[7] = StateAbstraction.OWNER_ROLE;
        functionPermissions[7] = StateAbstraction.FunctionPermission({
            functionSelector: TRANSFER_OWNERSHIP_APPROVE_META_SELECTOR,
            grantedActions: ownerMetaApproveActions
        });

        // Owner: Transfer Ownership Cancel Meta
        roleHashes[8] = StateAbstraction.OWNER_ROLE;
        functionPermissions[8] = StateAbstraction.FunctionPermission({
            functionSelector: TRANSFER_OWNERSHIP_CANCEL_META_SELECTOR,
            grantedActions: ownerMetaCancelActions
        });
        
        // Owner: Update Broadcaster Request
        roleHashes[9] = StateAbstraction.OWNER_ROLE;
        functionPermissions[9] = StateAbstraction.FunctionPermission({
            functionSelector: UPDATE_BROADCASTER_REQUEST_SELECTOR,
            grantedActions: ownerTimeDelayRequestActions
        });
        
        // Owner: Update Broadcaster Delayed Approval
        roleHashes[10] = StateAbstraction.OWNER_ROLE;
        functionPermissions[10] = StateAbstraction.FunctionPermission({
            functionSelector: UPDATE_BROADCASTER_DELAYED_APPROVAL_SELECTOR,
            grantedActions: ownerTimeDelayApproveActions
        });
        
        // Owner: Update Broadcaster Cancellation
        roleHashes[11] = StateAbstraction.OWNER_ROLE;
        functionPermissions[11] = StateAbstraction.FunctionPermission({
            functionSelector: UPDATE_BROADCASTER_CANCELLATION_SELECTOR,
            grantedActions: ownerTimeDelayCancelActions
        });
        
        // Owner: Update Broadcaster Approve Meta
        roleHashes[12] = StateAbstraction.OWNER_ROLE;
        functionPermissions[12] = StateAbstraction.FunctionPermission({
            functionSelector: UPDATE_BROADCASTER_APPROVE_META_SELECTOR,
            grantedActions: ownerMetaApproveActions
        });
              
        // Owner: Update Broadcaster Cancel Meta
        roleHashes[13] = StateAbstraction.OWNER_ROLE;
        functionPermissions[13] = StateAbstraction.FunctionPermission({
            functionSelector: UPDATE_BROADCASTER_CANCEL_META_SELECTOR,
            grantedActions: ownerMetaCancelActions
        });
         
        // Owner: Update Recovery Meta
        roleHashes[14] = StateAbstraction.OWNER_ROLE;
        functionPermissions[14] = StateAbstraction.FunctionPermission({
            functionSelector: UPDATE_RECOVERY_META_SELECTOR,
            grantedActions: ownerMetaRequestApproveActions
        });

        // Owner: Update Timelock Meta
        roleHashes[15] = StateAbstraction.OWNER_ROLE;
        functionPermissions[15] = StateAbstraction.FunctionPermission({
            functionSelector: UPDATE_TIMELOCK_META_SELECTOR,
            grantedActions: ownerMetaRequestApproveActions
        });
        
        // Recovery role permissions (3 entries)
        StateAbstraction.TxAction[] memory recoveryTimeDelayRequestActions = new StateAbstraction.TxAction[](1);
        recoveryTimeDelayRequestActions[0] = StateAbstraction.TxAction.EXECUTE_TIME_DELAY_REQUEST;
        
        StateAbstraction.TxAction[] memory recoveryTimeDelayApproveActions = new StateAbstraction.TxAction[](1);
        recoveryTimeDelayApproveActions[0] = StateAbstraction.TxAction.EXECUTE_TIME_DELAY_APPROVE;
        
        StateAbstraction.TxAction[] memory recoveryTimeDelayCancelActions = new StateAbstraction.TxAction[](1);
        recoveryTimeDelayCancelActions[0] = StateAbstraction.TxAction.EXECUTE_TIME_DELAY_CANCEL;
        
        // Recovery: Transfer Ownership Request
        roleHashes[16] = StateAbstraction.RECOVERY_ROLE;
        functionPermissions[16] = StateAbstraction.FunctionPermission({
            functionSelector: TRANSFER_OWNERSHIP_REQUEST_SELECTOR,
            grantedActions: recoveryTimeDelayRequestActions
        });
        
        // Recovery: Transfer Ownership Delayed Approval
        roleHashes[17] = StateAbstraction.RECOVERY_ROLE;
        functionPermissions[17] = StateAbstraction.FunctionPermission({
            functionSelector: TRANSFER_OWNERSHIP_DELAYED_APPROVAL_SELECTOR,
            grantedActions: recoveryTimeDelayApproveActions
        });
        
        // Recovery: Transfer Ownership Cancellation
        roleHashes[18] = StateAbstraction.RECOVERY_ROLE;
        functionPermissions[18] = StateAbstraction.FunctionPermission({
            functionSelector: TRANSFER_OWNERSHIP_CANCELLATION_SELECTOR,
            grantedActions: recoveryTimeDelayCancelActions
        });
        
        return IDefinition.RolePermission({
            roleHashes: roleHashes,
            functionPermissions: functionPermissions
        });
    }

}
