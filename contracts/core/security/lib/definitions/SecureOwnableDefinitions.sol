// SPDX-License-Identifier: MPL-2.0
pragma solidity ^0.8.25;

import "../../../base/lib/StateAbstraction.sol";
import "../../../../interfaces/IDefinition.sol";

/**
 * @title SecureOwnableDefinitions
 * @dev Library containing predefined definitions for SecureOwnable initialization
 * This library holds static data that can be used to initialize SecureOwnable contracts
 * without increasing the main contract size
 * 
 * This library implements the IDefinition interface from StateAbstraction
 * and provides a direct initialization function for SecureOwnable contracts
 * 
 * Permission Model:
 * - Handler Functions (triggering functions): Permissions checked via msg.sig in BaseStateMachine
 *   - Time-delay handler functions: Checked with EXECUTE_TIME_DELAY_* actions
 *   - Meta-transaction handler functions: Checked with EXECUTE_META_* actions
 * - Execution Functions (target functions): Permissions checked in StateAbstraction library
 *   - For time-delay: EXECUTE_TIME_DELAY_APPROVE/CANCEL actions
 *   - For meta-transactions: EXECUTE_META_* and SIGN_META_* actions (both handler and execution)
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
    
    // Time Delay Function Selectors (Handler Functions - checked via msg.sig)
    bytes4 public constant TRANSFER_OWNERSHIP_REQUEST_SELECTOR = bytes4(keccak256("transferOwnershipRequest()"));
    bytes4 public constant TRANSFER_OWNERSHIP_DELAYED_APPROVAL_SELECTOR = bytes4(keccak256("transferOwnershipDelayedApproval(uint256)"));
    bytes4 public constant TRANSFER_OWNERSHIP_CANCELLATION_SELECTOR = bytes4(keccak256("transferOwnershipCancellation(uint256)"));
    bytes4 public constant UPDATE_BROADCASTER_REQUEST_SELECTOR = bytes4(keccak256("updateBroadcasterRequest(address)"));
    bytes4 public constant UPDATE_BROADCASTER_DELAYED_APPROVAL_SELECTOR = bytes4(keccak256("updateBroadcasterDelayedApproval(uint256)"));
    bytes4 public constant UPDATE_BROADCASTER_CANCELLATION_SELECTOR = bytes4(keccak256("updateBroadcasterCancellation(uint256)"));
    
    // Meta-transaction Function Selectors (Handler Functions - checked via msg.sig)
    // Note: Solidity function selector calculation for struct parameters uses 2 opening parentheses: ((tuple))
    // Verified: This format produces selector 0x458102e4 which matches the actual function selector
    bytes4 public constant TRANSFER_OWNERSHIP_APPROVE_META_SELECTOR = bytes4(keccak256("transferOwnershipApprovalWithMetaTx(((uint256,uint256,uint8,(address,address,uint256,uint256,bytes32,bytes4,bytes),bytes32,bytes,(address,uint256,address,uint256)),(uint256,uint256,address,bytes4,uint8,uint256,uint256,address),bytes32,bytes,bytes))"));
    bytes4 public constant TRANSFER_OWNERSHIP_CANCEL_META_SELECTOR = bytes4(keccak256("transferOwnershipCancellationWithMetaTx(((uint256,uint256,uint8,(address,address,uint256,uint256,bytes32,bytes4,bytes),bytes32,bytes,(address,uint256,address,uint256)),(uint256,uint256,address,bytes4,uint8,uint256,uint256,address),bytes32,bytes,bytes))"));
    bytes4 public constant UPDATE_BROADCASTER_APPROVE_META_SELECTOR = bytes4(keccak256("updateBroadcasterApprovalWithMetaTx(((uint256,uint256,uint8,(address,address,uint256,uint256,bytes32,bytes4,bytes),bytes32,bytes,(address,uint256,address,uint256)),(uint256,uint256,address,bytes4,uint8,uint256,uint256,address),bytes32,bytes,bytes))"));
    bytes4 public constant UPDATE_BROADCASTER_CANCEL_META_SELECTOR = bytes4(keccak256("updateBroadcasterCancellationWithMetaTx(((uint256,uint256,uint8,(address,address,uint256,uint256,bytes32,bytes4,bytes),bytes32,bytes,(address,uint256,address,uint256)),(uint256,uint256,address,bytes4,uint8,uint256,uint256,address),bytes32,bytes,bytes))"));
    bytes4 public constant UPDATE_RECOVERY_META_SELECTOR = bytes4(keccak256("updateRecoveryRequestAndApprove(((uint256,uint256,uint8,(address,address,uint256,uint256,bytes32,bytes4,bytes),bytes32,bytes,(address,uint256,address,uint256)),(uint256,uint256,address,bytes4,uint8,uint256,uint256,address),bytes32,bytes,bytes))"));
    bytes4 public constant UPDATE_TIMELOCK_META_SELECTOR = bytes4(keccak256("updateTimeLockRequestAndApprove(((uint256,uint256,uint8,(address,address,uint256,uint256,bytes32,bytes4,bytes),bytes32,bytes,(address,uint256,address,uint256)),(uint256,uint256,address,bytes4,uint8,uint256,uint256,address),bytes32,bytes,bytes))"));
    
    /**
     * @dev Returns predefined function schemas
     * @return Array of function schema definitions
     */
    function getFunctionSchemas() public pure returns (StateAbstraction.FunctionSchema[] memory) {
        StateAbstraction.FunctionSchema[] memory schemas = new StateAbstraction.FunctionSchema[](16);
        
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
        
        // Execution selector actions (for meta-transactions and time-delay)
        // These execution selectors support both approve and cancel actions for both meta-tx and time-delay
        // Also support request action for time-delay (needed for txRequest permission check)
        StateAbstraction.TxAction[] memory executionApproveCancelActions = new StateAbstraction.TxAction[](7);
        executionApproveCancelActions[0] = StateAbstraction.TxAction.EXECUTE_META_APPROVE;
        executionApproveCancelActions[1] = StateAbstraction.TxAction.SIGN_META_APPROVE;
        executionApproveCancelActions[2] = StateAbstraction.TxAction.EXECUTE_META_CANCEL;
        executionApproveCancelActions[3] = StateAbstraction.TxAction.SIGN_META_CANCEL;
        executionApproveCancelActions[4] = StateAbstraction.TxAction.EXECUTE_TIME_DELAY_REQUEST;
        executionApproveCancelActions[5] = StateAbstraction.TxAction.EXECUTE_TIME_DELAY_APPROVE;
        executionApproveCancelActions[6] = StateAbstraction.TxAction.EXECUTE_TIME_DELAY_CANCEL;
        
        StateAbstraction.TxAction[] memory executionMetaRequestApproveActions = new StateAbstraction.TxAction[](2);
        executionMetaRequestApproveActions[0] = StateAbstraction.TxAction.SIGN_META_REQUEST_AND_APPROVE;
        executionMetaRequestApproveActions[1] = StateAbstraction.TxAction.EXECUTE_META_REQUEST_AND_APPROVE;
        
        // Meta-transaction functions
        schemas[0] = StateAbstraction.FunctionSchema({
            functionName: "transferOwnershipApprovalWithMetaTx",
            functionSelector: TRANSFER_OWNERSHIP_APPROVE_META_SELECTOR,
            operationType: OWNERSHIP_TRANSFER,
            operationName: "OWNERSHIP_TRANSFER",
            supportedActionsBitmap: StateAbstraction.createBitmapFromActions(metaApproveActions),
            isProtected: true
        });
        
        schemas[1] = StateAbstraction.FunctionSchema({
            functionName: "transferOwnershipCancellationWithMetaTx",
            functionSelector: TRANSFER_OWNERSHIP_CANCEL_META_SELECTOR,
            operationType: OWNERSHIP_TRANSFER,
            operationName: "OWNERSHIP_TRANSFER",
            supportedActionsBitmap: StateAbstraction.createBitmapFromActions(metaCancelActions),
            isProtected: true
        });
        
        schemas[2] = StateAbstraction.FunctionSchema({
            functionName: "updateBroadcasterApprovalWithMetaTx",
            functionSelector: UPDATE_BROADCASTER_APPROVE_META_SELECTOR,
            operationType: BROADCASTER_UPDATE,
            operationName: "BROADCASTER_UPDATE",
            supportedActionsBitmap: StateAbstraction.createBitmapFromActions(metaApproveActions),
            isProtected: true
        });
        
        schemas[3] = StateAbstraction.FunctionSchema({
            functionName: "updateBroadcasterCancellationWithMetaTx",
            functionSelector: UPDATE_BROADCASTER_CANCEL_META_SELECTOR,
            operationType: BROADCASTER_UPDATE,
            operationName: "BROADCASTER_UPDATE",
            supportedActionsBitmap: StateAbstraction.createBitmapFromActions(metaCancelActions),
            isProtected: true
        });
        
        schemas[4] = StateAbstraction.FunctionSchema({
            functionName: "updateRecoveryRequestAndApprove",
            functionSelector: UPDATE_RECOVERY_META_SELECTOR,
            operationType: RECOVERY_UPDATE,
            operationName: "RECOVERY_UPDATE",
            supportedActionsBitmap: StateAbstraction.createBitmapFromActions(metaRequestApproveActions),
            isProtected: true
        });
        
        schemas[5] = StateAbstraction.FunctionSchema({
            functionName: "updateTimeLockRequestAndApprove",
            functionSelector: UPDATE_TIMELOCK_META_SELECTOR,
            operationType: TIMELOCK_UPDATE,
            operationName: "TIMELOCK_UPDATE",
            supportedActionsBitmap: StateAbstraction.createBitmapFromActions(metaRequestApproveActions),
            isProtected: true
        });
        
        // Time-delayed functions
        schemas[6] = StateAbstraction.FunctionSchema({
            functionName: "transferOwnershipRequest",
            functionSelector: TRANSFER_OWNERSHIP_REQUEST_SELECTOR,
            operationType: OWNERSHIP_TRANSFER,
            operationName: "OWNERSHIP_TRANSFER",
            supportedActionsBitmap: StateAbstraction.createBitmapFromActions(timeDelayRequestActions),
            isProtected: true
        });
        
        schemas[7] = StateAbstraction.FunctionSchema({
            functionName: "transferOwnershipDelayedApproval",
            functionSelector: TRANSFER_OWNERSHIP_DELAYED_APPROVAL_SELECTOR,
            operationType: OWNERSHIP_TRANSFER,
            operationName: "OWNERSHIP_TRANSFER",
            supportedActionsBitmap: StateAbstraction.createBitmapFromActions(timeDelayApproveActions),
            isProtected: true
        });
        
        schemas[8] = StateAbstraction.FunctionSchema({
            functionName: "transferOwnershipCancellation",
            functionSelector: TRANSFER_OWNERSHIP_CANCELLATION_SELECTOR,
            operationType: OWNERSHIP_TRANSFER,
            operationName: "OWNERSHIP_TRANSFER",
            supportedActionsBitmap: StateAbstraction.createBitmapFromActions(timeDelayCancelActions),
            isProtected: true
        });
        
        schemas[9] = StateAbstraction.FunctionSchema({
            functionName: "updateBroadcasterRequest",
            functionSelector: UPDATE_BROADCASTER_REQUEST_SELECTOR,
            operationType: BROADCASTER_UPDATE,
            operationName: "BROADCASTER_UPDATE",
            supportedActionsBitmap: StateAbstraction.createBitmapFromActions(timeDelayRequestActions),
            isProtected: true
        });
        
        schemas[10] = StateAbstraction.FunctionSchema({
            functionName: "updateBroadcasterDelayedApproval",
            functionSelector: UPDATE_BROADCASTER_DELAYED_APPROVAL_SELECTOR,
            operationType: BROADCASTER_UPDATE,
            operationName: "BROADCASTER_UPDATE",
            supportedActionsBitmap: StateAbstraction.createBitmapFromActions(timeDelayApproveActions),
            isProtected: true
        });
        
        schemas[11] = StateAbstraction.FunctionSchema({
            functionName: "updateBroadcasterCancellation",
            functionSelector: UPDATE_BROADCASTER_CANCELLATION_SELECTOR,
            operationType: BROADCASTER_UPDATE,
            operationName: "BROADCASTER_UPDATE",
            supportedActionsBitmap: StateAbstraction.createBitmapFromActions(timeDelayCancelActions),
            isProtected: true
        });
        
        // Execution selector schemas (required for meta-transaction dual-permission model)
        schemas[12] = StateAbstraction.FunctionSchema({
            functionName: "executeTransferOwnership",
            functionSelector: TRANSFER_OWNERSHIP_SELECTOR,
            operationType: OWNERSHIP_TRANSFER,
            operationName: "OWNERSHIP_TRANSFER",
            supportedActionsBitmap: StateAbstraction.createBitmapFromActions(executionApproveCancelActions),
            isProtected: true
        });
        
        schemas[13] = StateAbstraction.FunctionSchema({
            functionName: "executeBroadcasterUpdate",
            functionSelector: UPDATE_BROADCASTER_SELECTOR,
            operationType: BROADCASTER_UPDATE,
            operationName: "BROADCASTER_UPDATE",
            supportedActionsBitmap: StateAbstraction.createBitmapFromActions(executionApproveCancelActions),
            isProtected: true
        });
        
        schemas[14] = StateAbstraction.FunctionSchema({
            functionName: "executeRecoveryUpdate",
            functionSelector: UPDATE_RECOVERY_SELECTOR,
            operationType: RECOVERY_UPDATE,
            operationName: "RECOVERY_UPDATE",
            supportedActionsBitmap: StateAbstraction.createBitmapFromActions(executionMetaRequestApproveActions),
            isProtected: true
        });
        
        schemas[15] = StateAbstraction.FunctionSchema({
            functionName: "executeTimeLockUpdate",
            functionSelector: UPDATE_TIMELOCK_SELECTOR,
            operationType: TIMELOCK_UPDATE,
            operationName: "TIMELOCK_UPDATE",
            supportedActionsBitmap: StateAbstraction.createBitmapFromActions(executionMetaRequestApproveActions),
            isProtected: true
        });
        
        return schemas;
    }
    
    /**
     * @dev Returns predefined role hashes and their corresponding function permissions
     * @return RolePermission struct containing roleHashes and functionPermissions arrays
     */
    function getRolePermissions() public pure returns (IDefinition.RolePermission memory) {
        // Calculate total permissions needed
        // Broadcaster: 6 handler (meta-tx) + 4 execution = 10
        // Owner: 4 handler (time-delay) + 6 handler (meta-tx) + 4 execution = 14
        // Recovery: 3 handler (time-delay) + 1 execution = 4
        // Total: 28 permissions
        bytes32[] memory roleHashes = new bytes32[](28);
        StateAbstraction.FunctionPermission[] memory functionPermissions = new StateAbstraction.FunctionPermission[](28);
        
        uint256 index = 0;
        
        // ============ BROADCASTER ROLE PERMISSIONS ============
        index = _addBroadcasterPermissions(roleHashes, functionPermissions, index);
        
        // ============ OWNER ROLE PERMISSIONS ============
        index = _addOwnerPermissions(roleHashes, functionPermissions, index);
        
        // ============ RECOVERY ROLE PERMISSIONS ============
        index = _addRecoveryPermissions(roleHashes, functionPermissions, index);
        
        return IDefinition.RolePermission({
            roleHashes: roleHashes,
            functionPermissions: functionPermissions
        });
    }
    
    // ============ INTERNAL HELPER FUNCTIONS ============
    
    /**
     * @dev Adds broadcaster role permissions
     * @param roleHashes Array to populate with role hashes
     * @param functionPermissions Array to populate with function permissions
     * @param startIndex Starting index in arrays
     * @return Next available index after adding permissions
     */
    function _addBroadcasterPermissions(
        bytes32[] memory roleHashes,
        StateAbstraction.FunctionPermission[] memory functionPermissions,
        uint256 startIndex
    ) internal pure returns (uint256) {
        uint256 index = startIndex;
        
        // Action arrays for broadcaster
        StateAbstraction.TxAction[] memory broadcasterMetaApproveActions = new StateAbstraction.TxAction[](1);
        broadcasterMetaApproveActions[0] = StateAbstraction.TxAction.EXECUTE_META_APPROVE;
        
        StateAbstraction.TxAction[] memory broadcasterMetaCancelActions = new StateAbstraction.TxAction[](1);
        broadcasterMetaCancelActions[0] = StateAbstraction.TxAction.EXECUTE_META_CANCEL;
        
        StateAbstraction.TxAction[] memory broadcasterMetaRequestApproveActions = new StateAbstraction.TxAction[](1);
        broadcasterMetaRequestApproveActions[0] = StateAbstraction.TxAction.EXECUTE_META_REQUEST_AND_APPROVE;
        
        StateAbstraction.TxAction[] memory broadcasterExecutionApproveCancelActions = new StateAbstraction.TxAction[](2);
        broadcasterExecutionApproveCancelActions[0] = StateAbstraction.TxAction.EXECUTE_META_APPROVE;
        broadcasterExecutionApproveCancelActions[1] = StateAbstraction.TxAction.EXECUTE_META_CANCEL;
        
        StateAbstraction.TxAction[] memory broadcasterExecutionRequestApproveActions = new StateAbstraction.TxAction[](1);
        broadcasterExecutionRequestApproveActions[0] = StateAbstraction.TxAction.EXECUTE_META_REQUEST_AND_APPROVE;
        
        // ============ BROADCASTER: HANDLER FUNCTION PERMISSIONS (Meta-transactions) ============
        // These are checked via msg.sig in BaseStateMachine._validateCallingFunctionPermission
        
        // Transfer Ownership Approve Meta (handler function)
        roleHashes[index] = StateAbstraction.BROADCASTER_ROLE;
        functionPermissions[index] = StateAbstraction.FunctionPermission({
            functionSelector: TRANSFER_OWNERSHIP_APPROVE_META_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(broadcasterMetaApproveActions)
        });
        index++;
        
        // Transfer Ownership Cancel Meta (handler function)
        roleHashes[index] = StateAbstraction.BROADCASTER_ROLE;
        functionPermissions[index] = StateAbstraction.FunctionPermission({
            functionSelector: TRANSFER_OWNERSHIP_CANCEL_META_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(broadcasterMetaCancelActions)
        });
        index++;
        
        // Update Broadcaster Approve Meta (handler function)
        roleHashes[index] = StateAbstraction.BROADCASTER_ROLE;
        functionPermissions[index] = StateAbstraction.FunctionPermission({
            functionSelector: UPDATE_BROADCASTER_APPROVE_META_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(broadcasterMetaApproveActions)
        });
        index++;
        
        // Update Broadcaster Cancel Meta (handler function)
        roleHashes[index] = StateAbstraction.BROADCASTER_ROLE;
        functionPermissions[index] = StateAbstraction.FunctionPermission({
            functionSelector: UPDATE_BROADCASTER_CANCEL_META_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(broadcasterMetaCancelActions)
        });
        index++;
        
        // Update Recovery Meta (handler function)
        roleHashes[index] = StateAbstraction.BROADCASTER_ROLE;
        functionPermissions[index] = StateAbstraction.FunctionPermission({
            functionSelector: UPDATE_RECOVERY_META_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(broadcasterMetaRequestApproveActions)
        });
        index++;
        
        // Update Timelock Meta (handler function)
        roleHashes[index] = StateAbstraction.BROADCASTER_ROLE;
        functionPermissions[index] = StateAbstraction.FunctionPermission({
            functionSelector: UPDATE_TIMELOCK_META_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(broadcasterMetaRequestApproveActions)
        });
        index++;
        
        // ============ BROADCASTER: EXECUTION FUNCTION PERMISSIONS ============
        // These are checked in StateAbstraction library functions
        
        // Transfer Ownership Execution (for approve/cancel meta-tx)
        roleHashes[index] = StateAbstraction.BROADCASTER_ROLE;
        functionPermissions[index] = StateAbstraction.FunctionPermission({
            functionSelector: TRANSFER_OWNERSHIP_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(broadcasterExecutionApproveCancelActions)
        });
        index++;
        
        // Update Broadcaster Execution (for approve/cancel meta-tx)
        roleHashes[index] = StateAbstraction.BROADCASTER_ROLE;
        functionPermissions[index] = StateAbstraction.FunctionPermission({
            functionSelector: UPDATE_BROADCASTER_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(broadcasterExecutionApproveCancelActions)
        });
        index++;
        
        // Update Recovery Execution (for request and approve meta-tx)
        roleHashes[index] = StateAbstraction.BROADCASTER_ROLE;
        functionPermissions[index] = StateAbstraction.FunctionPermission({
            functionSelector: UPDATE_RECOVERY_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(broadcasterExecutionRequestApproveActions)
        });
        index++;
        
        // Update Timelock Execution (for request and approve meta-tx)
        roleHashes[index] = StateAbstraction.BROADCASTER_ROLE;
        functionPermissions[index] = StateAbstraction.FunctionPermission({
            functionSelector: UPDATE_TIMELOCK_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(broadcasterExecutionRequestApproveActions)
        });
        index++;
        
        return index;
    }
    
    /**
     * @dev Adds owner role permissions
     * @param roleHashes Array to populate with role hashes
     * @param functionPermissions Array to populate with function permissions
     * @param startIndex Starting index in arrays
     * @return Next available index after adding permissions
     */
    function _addOwnerPermissions(
        bytes32[] memory roleHashes,
        StateAbstraction.FunctionPermission[] memory functionPermissions,
        uint256 startIndex
    ) internal pure returns (uint256) {
        uint256 index = startIndex;
        
        // Action arrays for owner
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
        
        StateAbstraction.TxAction[] memory ownerExecutionApproveCancelActions = new StateAbstraction.TxAction[](2);
        ownerExecutionApproveCancelActions[0] = StateAbstraction.TxAction.SIGN_META_APPROVE;
        ownerExecutionApproveCancelActions[1] = StateAbstraction.TxAction.SIGN_META_CANCEL;
        
        StateAbstraction.TxAction[] memory ownerExecutionRequestApproveActions = new StateAbstraction.TxAction[](1);
        ownerExecutionRequestApproveActions[0] = StateAbstraction.TxAction.SIGN_META_REQUEST_AND_APPROVE;
        
        StateAbstraction.TxAction[] memory ownerExecutionTimeDelayRequestActions = new StateAbstraction.TxAction[](1);
        ownerExecutionTimeDelayRequestActions[0] = StateAbstraction.TxAction.EXECUTE_TIME_DELAY_REQUEST;
        
        StateAbstraction.TxAction[] memory ownerExecutionTimeDelayApproveActions = new StateAbstraction.TxAction[](1);
        ownerExecutionTimeDelayApproveActions[0] = StateAbstraction.TxAction.EXECUTE_TIME_DELAY_APPROVE;
        
        // ============ OWNER: HANDLER FUNCTION PERMISSIONS (Time-delay) ============
        // These are checked via msg.sig in BaseStateMachine._validateCallingFunctionPermission
        
        // Transfer Ownership Delayed Approval (handler function)
        roleHashes[index] = StateAbstraction.OWNER_ROLE;
        functionPermissions[index] = StateAbstraction.FunctionPermission({
            functionSelector: TRANSFER_OWNERSHIP_DELAYED_APPROVAL_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(ownerTimeDelayApproveActions)
        });
        index++;
        
        // Update Broadcaster Request (handler function)
        roleHashes[index] = StateAbstraction.OWNER_ROLE;
        functionPermissions[index] = StateAbstraction.FunctionPermission({
            functionSelector: UPDATE_BROADCASTER_REQUEST_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(ownerTimeDelayRequestActions)
        });
        index++;
        
        // Update Broadcaster Delayed Approval (handler function)
        roleHashes[index] = StateAbstraction.OWNER_ROLE;
        functionPermissions[index] = StateAbstraction.FunctionPermission({
            functionSelector: UPDATE_BROADCASTER_DELAYED_APPROVAL_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(ownerTimeDelayApproveActions)
        });
        index++;
        
        // Update Broadcaster Cancellation (handler function)
        roleHashes[index] = StateAbstraction.OWNER_ROLE;
        functionPermissions[index] = StateAbstraction.FunctionPermission({
            functionSelector: UPDATE_BROADCASTER_CANCELLATION_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(ownerTimeDelayCancelActions)
        });
        index++;
        
        // ============ OWNER: HANDLER FUNCTION PERMISSIONS (Meta-transactions) ============
        // These are checked via msg.sig in BaseStateMachine._validateCallingFunctionPermission
        // Note: Owner signs meta-transactions, but doesn't execute them (broadcaster executes)
        
        // Transfer Ownership Approve Meta (handler function - for signing)
        roleHashes[index] = StateAbstraction.OWNER_ROLE;
        functionPermissions[index] = StateAbstraction.FunctionPermission({
            functionSelector: TRANSFER_OWNERSHIP_APPROVE_META_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(ownerMetaApproveActions)
        });
        index++;
        
        // Transfer Ownership Cancel Meta (handler function - for signing)
        roleHashes[index] = StateAbstraction.OWNER_ROLE;
        functionPermissions[index] = StateAbstraction.FunctionPermission({
            functionSelector: TRANSFER_OWNERSHIP_CANCEL_META_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(ownerMetaCancelActions)
        });
        index++;
        
        // Update Broadcaster Approve Meta (handler function - for signing)
        roleHashes[index] = StateAbstraction.OWNER_ROLE;
        functionPermissions[index] = StateAbstraction.FunctionPermission({
            functionSelector: UPDATE_BROADCASTER_APPROVE_META_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(ownerMetaApproveActions)
        });
        index++;
              
        // Update Broadcaster Cancel Meta (handler function - for signing)
        roleHashes[index] = StateAbstraction.OWNER_ROLE;
        functionPermissions[index] = StateAbstraction.FunctionPermission({
            functionSelector: UPDATE_BROADCASTER_CANCEL_META_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(ownerMetaCancelActions)
        });
        index++;
         
        // Update Recovery Meta (handler function - for signing)
        roleHashes[index] = StateAbstraction.OWNER_ROLE;
        functionPermissions[index] = StateAbstraction.FunctionPermission({
            functionSelector: UPDATE_RECOVERY_META_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(ownerMetaRequestApproveActions)
        });
        index++;

        // Update Timelock Meta (handler function - for signing)
        roleHashes[index] = StateAbstraction.OWNER_ROLE;
        functionPermissions[index] = StateAbstraction.FunctionPermission({
            functionSelector: UPDATE_TIMELOCK_META_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(ownerMetaRequestApproveActions)
        });
        index++;
        
        // ============ OWNER: EXECUTION FUNCTION PERMISSIONS ============
        // These are checked in StateAbstraction library functions
        
        // Transfer Ownership Execution (for approve/cancel meta-tx - owner signs)
        // Also supports time-delay approve (for transferOwnershipDelayedApproval)
        StateAbstraction.TxAction[] memory ownerTransferOwnershipAllActions = new StateAbstraction.TxAction[](3);
        ownerTransferOwnershipAllActions[0] = StateAbstraction.TxAction.SIGN_META_APPROVE;
        ownerTransferOwnershipAllActions[1] = StateAbstraction.TxAction.SIGN_META_CANCEL;
        ownerTransferOwnershipAllActions[2] = StateAbstraction.TxAction.EXECUTE_TIME_DELAY_APPROVE;
        
        roleHashes[index] = StateAbstraction.OWNER_ROLE;
        functionPermissions[index] = StateAbstraction.FunctionPermission({
            functionSelector: TRANSFER_OWNERSHIP_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(ownerTransferOwnershipAllActions)
        });
        index++;
        
        // Update Broadcaster Execution (for approve/cancel meta-tx and time-delay request/approve/cancel - owner signs)
        // Supports:
        // - SIGN_META_APPROVE, SIGN_META_CANCEL: for meta-transactions
        // - EXECUTE_TIME_DELAY_REQUEST: for updateBroadcasterRequest (checked in txRequest)
        // - EXECUTE_TIME_DELAY_APPROVE: for updateBroadcasterDelayedApproval (checked in txDelayedApproval)
        // - EXECUTE_TIME_DELAY_CANCEL: for updateBroadcasterCancellation (checked in txCancellation)
        StateAbstraction.TxAction[] memory ownerBroadcasterExecutionAllActions = new StateAbstraction.TxAction[](5);
        ownerBroadcasterExecutionAllActions[0] = StateAbstraction.TxAction.SIGN_META_APPROVE;
        ownerBroadcasterExecutionAllActions[1] = StateAbstraction.TxAction.SIGN_META_CANCEL;
        ownerBroadcasterExecutionAllActions[2] = StateAbstraction.TxAction.EXECUTE_TIME_DELAY_REQUEST;
        ownerBroadcasterExecutionAllActions[3] = StateAbstraction.TxAction.EXECUTE_TIME_DELAY_APPROVE;
        ownerBroadcasterExecutionAllActions[4] = StateAbstraction.TxAction.EXECUTE_TIME_DELAY_CANCEL;
        
        roleHashes[index] = StateAbstraction.OWNER_ROLE;
        functionPermissions[index] = StateAbstraction.FunctionPermission({
            functionSelector: UPDATE_BROADCASTER_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(ownerBroadcasterExecutionAllActions)
        });
        index++;
        
        // Update Recovery Execution (for request and approve meta-tx - owner signs)
        roleHashes[index] = StateAbstraction.OWNER_ROLE;
        functionPermissions[index] = StateAbstraction.FunctionPermission({
            functionSelector: UPDATE_RECOVERY_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(ownerExecutionRequestApproveActions)
        });
        index++;
        
        // Update Timelock Execution (for request and approve meta-tx - owner signs)
        roleHashes[index] = StateAbstraction.OWNER_ROLE;
        functionPermissions[index] = StateAbstraction.FunctionPermission({
            functionSelector: UPDATE_TIMELOCK_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(ownerExecutionRequestApproveActions)
        });
        index++;
        
        return index;
    }
    
    /**
     * @dev Adds recovery role permissions
     * @param roleHashes Array to populate with role hashes
     * @param functionPermissions Array to populate with function permissions
     * @param startIndex Starting index in arrays
     * @return Next available index after adding permissions
     */
    function _addRecoveryPermissions(
        bytes32[] memory roleHashes,
        StateAbstraction.FunctionPermission[] memory functionPermissions,
        uint256 startIndex
    ) internal pure returns (uint256) {
        uint256 index = startIndex;
        
        // Action arrays for recovery
        StateAbstraction.TxAction[] memory recoveryTimeDelayRequestActions = new StateAbstraction.TxAction[](1);
        recoveryTimeDelayRequestActions[0] = StateAbstraction.TxAction.EXECUTE_TIME_DELAY_REQUEST;
        
        StateAbstraction.TxAction[] memory recoveryTimeDelayApproveActions = new StateAbstraction.TxAction[](1);
        recoveryTimeDelayApproveActions[0] = StateAbstraction.TxAction.EXECUTE_TIME_DELAY_APPROVE;
        
        StateAbstraction.TxAction[] memory recoveryTimeDelayCancelActions = new StateAbstraction.TxAction[](1);
        recoveryTimeDelayCancelActions[0] = StateAbstraction.TxAction.EXECUTE_TIME_DELAY_CANCEL;
        
        // ============ RECOVERY: HANDLER FUNCTION PERMISSIONS (Time-delay) ============
        // These are checked via msg.sig in BaseStateMachine._validateCallingFunctionPermission
        
        // Transfer Ownership Request (handler function)
        roleHashes[index] = StateAbstraction.RECOVERY_ROLE;
        functionPermissions[index] = StateAbstraction.FunctionPermission({
            functionSelector: TRANSFER_OWNERSHIP_REQUEST_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(recoveryTimeDelayRequestActions)
        });
        index++;
        
        // Transfer Ownership Delayed Approval (handler function)
        roleHashes[index] = StateAbstraction.RECOVERY_ROLE;
        functionPermissions[index] = StateAbstraction.FunctionPermission({
            functionSelector: TRANSFER_OWNERSHIP_DELAYED_APPROVAL_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(recoveryTimeDelayApproveActions)
        });
        index++;
        
        // Transfer Ownership Cancellation (handler function)
        roleHashes[index] = StateAbstraction.RECOVERY_ROLE;
        functionPermissions[index] = StateAbstraction.FunctionPermission({
            functionSelector: TRANSFER_OWNERSHIP_CANCELLATION_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(recoveryTimeDelayCancelActions)
        });
        index++;
        
        // ============ RECOVERY: EXECUTION FUNCTION PERMISSIONS ============
        // These are checked in StateAbstraction library functions
        
        // Transfer Ownership Execution (for time-delay request/approve/cancel)
        // Recovery needs this for:
        // - EXECUTE_TIME_DELAY_REQUEST: when calling transferOwnershipRequest (checked in txRequest)
        // - EXECUTE_TIME_DELAY_APPROVE: when calling transferOwnershipDelayedApproval
        // - EXECUTE_TIME_DELAY_CANCEL: when calling transferOwnershipCancellation
        StateAbstraction.TxAction[] memory recoveryExecutionAllActions = new StateAbstraction.TxAction[](3);
        recoveryExecutionAllActions[0] = StateAbstraction.TxAction.EXECUTE_TIME_DELAY_REQUEST;
        recoveryExecutionAllActions[1] = StateAbstraction.TxAction.EXECUTE_TIME_DELAY_APPROVE;
        recoveryExecutionAllActions[2] = StateAbstraction.TxAction.EXECUTE_TIME_DELAY_CANCEL;
        
        roleHashes[index] = StateAbstraction.RECOVERY_ROLE;
        functionPermissions[index] = StateAbstraction.FunctionPermission({
            functionSelector: TRANSFER_OWNERSHIP_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(recoveryExecutionAllActions)
        });
        index++;
        
        return index;
    }

}
