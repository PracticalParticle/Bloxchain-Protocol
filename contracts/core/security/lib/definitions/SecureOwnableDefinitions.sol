// SPDX-License-Identifier: MPL-2.0
pragma solidity 0.8.33;

import "../../../lib/EngineBlox.sol";
import "../../../../interfaces/IDefinition.sol";

/**
 * @title SecureOwnableDefinitions
 * @dev Library containing predefined definitions for SecureOwnable initialization
 * This library holds static data that can be used to initialize SecureOwnable contracts
 * without increasing the main contract size
 * 
 * This library implements the IDefinition interface from EngineBlox
 * and provides a direct initialization function for SecureOwnable contracts
 * 
 * Permission Model:
 * - Handler Functions (triggering functions): Permissions checked via msg.sig in BaseStateMachine
 *   - Time-delay handler functions: Checked with EXECUTE_TIME_DELAY_* actions
 *   - Meta-transaction handler functions: Checked with EXECUTE_META_* actions
 * - Execution Functions (target functions): Permissions checked in EngineBlox library
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
    function getFunctionSchemas() public pure returns (EngineBlox.FunctionSchema[] memory) {
        EngineBlox.FunctionSchema[] memory schemas = new EngineBlox.FunctionSchema[](16);
        
        // Meta-transaction function schemas
        EngineBlox.TxAction[] memory metaApproveActions = new EngineBlox.TxAction[](2);
        metaApproveActions[0] = EngineBlox.TxAction.EXECUTE_META_APPROVE;
        metaApproveActions[1] = EngineBlox.TxAction.SIGN_META_APPROVE;
        
        EngineBlox.TxAction[] memory metaCancelActions = new EngineBlox.TxAction[](2);
        metaCancelActions[0] = EngineBlox.TxAction.EXECUTE_META_CANCEL;
        metaCancelActions[1] = EngineBlox.TxAction.SIGN_META_CANCEL;
        
        EngineBlox.TxAction[] memory metaRequestApproveActions = new EngineBlox.TxAction[](2);
        metaRequestApproveActions[0] = EngineBlox.TxAction.SIGN_META_REQUEST_AND_APPROVE;
        metaRequestApproveActions[1] = EngineBlox.TxAction.EXECUTE_META_REQUEST_AND_APPROVE;
        
        // Time-delayed functions
        EngineBlox.TxAction[] memory timeDelayRequestActions = new EngineBlox.TxAction[](1);
        timeDelayRequestActions[0] = EngineBlox.TxAction.EXECUTE_TIME_DELAY_REQUEST;
        
        EngineBlox.TxAction[] memory timeDelayApproveActions = new EngineBlox.TxAction[](1);
        timeDelayApproveActions[0] = EngineBlox.TxAction.EXECUTE_TIME_DELAY_APPROVE;
        
        EngineBlox.TxAction[] memory timeDelayCancelActions = new EngineBlox.TxAction[](1);
        timeDelayCancelActions[0] = EngineBlox.TxAction.EXECUTE_TIME_DELAY_CANCEL;
        
        // Execution selector actions (for meta-transactions and time-delay)
        // These execution selectors support both approve and cancel actions for both meta-tx and time-delay
        // Also support request action for time-delay (needed for txRequest permission check)
        EngineBlox.TxAction[] memory executionApproveCancelActions = new EngineBlox.TxAction[](7);
        executionApproveCancelActions[0] = EngineBlox.TxAction.EXECUTE_META_APPROVE;
        executionApproveCancelActions[1] = EngineBlox.TxAction.SIGN_META_APPROVE;
        executionApproveCancelActions[2] = EngineBlox.TxAction.EXECUTE_META_CANCEL;
        executionApproveCancelActions[3] = EngineBlox.TxAction.SIGN_META_CANCEL;
        executionApproveCancelActions[4] = EngineBlox.TxAction.EXECUTE_TIME_DELAY_REQUEST;
        executionApproveCancelActions[5] = EngineBlox.TxAction.EXECUTE_TIME_DELAY_APPROVE;
        executionApproveCancelActions[6] = EngineBlox.TxAction.EXECUTE_TIME_DELAY_CANCEL;
        
        EngineBlox.TxAction[] memory executionMetaRequestApproveActions = new EngineBlox.TxAction[](2);
        executionMetaRequestApproveActions[0] = EngineBlox.TxAction.SIGN_META_REQUEST_AND_APPROVE;
        executionMetaRequestApproveActions[1] = EngineBlox.TxAction.EXECUTE_META_REQUEST_AND_APPROVE;
        
        // Prepare handlerForSelectors arrays
        // Execution selectors must have self-reference (at least one element pointing to themselves)
        bytes4[] memory transferOwnershipExecutionHandlerForSelectors = new bytes4[](1);
        transferOwnershipExecutionHandlerForSelectors[0] = TRANSFER_OWNERSHIP_SELECTOR;
        bytes4[] memory broadcasterExecutionHandlerForSelectors = new bytes4[](1);
        broadcasterExecutionHandlerForSelectors[0] = UPDATE_BROADCASTER_SELECTOR;
        bytes4[] memory recoveryExecutionHandlerForSelectors = new bytes4[](1);
        recoveryExecutionHandlerForSelectors[0] = UPDATE_RECOVERY_SELECTOR;
        bytes4[] memory timelockExecutionHandlerForSelectors = new bytes4[](1);
        timelockExecutionHandlerForSelectors[0] = UPDATE_TIMELOCK_SELECTOR;
        
        // Handler selectors point to execution selectors
        bytes4[] memory transferOwnershipHandlerForSelectors = new bytes4[](1);
        transferOwnershipHandlerForSelectors[0] = TRANSFER_OWNERSHIP_SELECTOR;
        bytes4[] memory broadcasterHandlerForSelectors = new bytes4[](1);
        broadcasterHandlerForSelectors[0] = UPDATE_BROADCASTER_SELECTOR;
        bytes4[] memory recoveryHandlerForSelectors = new bytes4[](1);
        recoveryHandlerForSelectors[0] = UPDATE_RECOVERY_SELECTOR;
        bytes4[] memory timelockHandlerForSelectors = new bytes4[](1);
        timelockHandlerForSelectors[0] = UPDATE_TIMELOCK_SELECTOR;
        
        // Meta-transaction functions
        schemas[0] = EngineBlox.FunctionSchema({
            functionSignature: "transferOwnershipApprovalWithMetaTx(((uint256,uint256,uint8,(address,address,uint256,uint256,bytes32,bytes4,bytes),bytes32,bytes,(address,uint256,address,uint256)),(uint256,uint256,address,bytes4,uint8,uint256,uint256,address),bytes32,bytes,bytes))",
            functionSelector: TRANSFER_OWNERSHIP_APPROVE_META_SELECTOR,
            operationType: OWNERSHIP_TRANSFER,
            operationName: "OWNERSHIP_TRANSFER",
            supportedActionsBitmap: EngineBlox.createBitmapFromActions(metaApproveActions),
            isProtected: true,
            handlerForSelectors: transferOwnershipHandlerForSelectors
        });
        
        schemas[1] = EngineBlox.FunctionSchema({
            functionSignature: "transferOwnershipCancellationWithMetaTx(((uint256,uint256,uint8,(address,address,uint256,uint256,bytes32,bytes4,bytes),bytes32,bytes,(address,uint256,address,uint256)),(uint256,uint256,address,bytes4,uint8,uint256,uint256,address),bytes32,bytes,bytes))",
            functionSelector: TRANSFER_OWNERSHIP_CANCEL_META_SELECTOR,
            operationType: OWNERSHIP_TRANSFER,
            operationName: "OWNERSHIP_TRANSFER",
            supportedActionsBitmap: EngineBlox.createBitmapFromActions(metaCancelActions),
            isProtected: true,
            handlerForSelectors: transferOwnershipHandlerForSelectors
        });
        
        schemas[2] = EngineBlox.FunctionSchema({
            functionSignature: "updateBroadcasterApprovalWithMetaTx(((uint256,uint256,uint8,(address,address,uint256,uint256,bytes32,bytes4,bytes),bytes32,bytes,(address,uint256,address,uint256)),(uint256,uint256,address,bytes4,uint8,uint256,uint256,address),bytes32,bytes,bytes))",
            functionSelector: UPDATE_BROADCASTER_APPROVE_META_SELECTOR,
            operationType: BROADCASTER_UPDATE,
            operationName: "BROADCASTER_UPDATE",
            supportedActionsBitmap: EngineBlox.createBitmapFromActions(metaApproveActions),
            isProtected: true,
            handlerForSelectors: broadcasterHandlerForSelectors
        });
        
        schemas[3] = EngineBlox.FunctionSchema({
            functionSignature: "updateBroadcasterCancellationWithMetaTx(((uint256,uint256,uint8,(address,address,uint256,uint256,bytes32,bytes4,bytes),bytes32,bytes,(address,uint256,address,uint256)),(uint256,uint256,address,bytes4,uint8,uint256,uint256,address),bytes32,bytes,bytes))",
            functionSelector: UPDATE_BROADCASTER_CANCEL_META_SELECTOR,
            operationType: BROADCASTER_UPDATE,
            operationName: "BROADCASTER_UPDATE",
            supportedActionsBitmap: EngineBlox.createBitmapFromActions(metaCancelActions),
            isProtected: true,
            handlerForSelectors: broadcasterHandlerForSelectors
        });
        
        schemas[4] = EngineBlox.FunctionSchema({
            functionSignature: "updateRecoveryRequestAndApprove(((uint256,uint256,uint8,(address,address,uint256,uint256,bytes32,bytes4,bytes),bytes32,bytes,(address,uint256,address,uint256)),(uint256,uint256,address,bytes4,uint8,uint256,uint256,address),bytes32,bytes,bytes))",
            functionSelector: UPDATE_RECOVERY_META_SELECTOR,
            operationType: RECOVERY_UPDATE,
            operationName: "RECOVERY_UPDATE",
            supportedActionsBitmap: EngineBlox.createBitmapFromActions(metaRequestApproveActions),
            isProtected: true,
            handlerForSelectors: recoveryHandlerForSelectors
        });
        
        schemas[5] = EngineBlox.FunctionSchema({
            functionSignature: "updateTimeLockRequestAndApprove(((uint256,uint256,uint8,(address,address,uint256,uint256,bytes32,bytes4,bytes),bytes32,bytes,(address,uint256,address,uint256)),(uint256,uint256,address,bytes4,uint8,uint256,uint256,address),bytes32,bytes,bytes))",
            functionSelector: UPDATE_TIMELOCK_META_SELECTOR,
            operationType: TIMELOCK_UPDATE,
            operationName: "TIMELOCK_UPDATE",
            supportedActionsBitmap: EngineBlox.createBitmapFromActions(metaRequestApproveActions),
            isProtected: true,
            handlerForSelectors: timelockHandlerForSelectors
        });
        
        // Time-delayed functions
        schemas[6] = EngineBlox.FunctionSchema({
            functionSignature: "transferOwnershipRequest()",
            functionSelector: TRANSFER_OWNERSHIP_REQUEST_SELECTOR,
            operationType: OWNERSHIP_TRANSFER,
            operationName: "OWNERSHIP_TRANSFER",
            supportedActionsBitmap: EngineBlox.createBitmapFromActions(timeDelayRequestActions),
            isProtected: true,
            handlerForSelectors: transferOwnershipHandlerForSelectors
        });
        
        schemas[7] = EngineBlox.FunctionSchema({
            functionSignature: "transferOwnershipDelayedApproval(uint256)",
            functionSelector: TRANSFER_OWNERSHIP_DELAYED_APPROVAL_SELECTOR,
            operationType: OWNERSHIP_TRANSFER,
            operationName: "OWNERSHIP_TRANSFER",
            supportedActionsBitmap: EngineBlox.createBitmapFromActions(timeDelayApproveActions),
            isProtected: true,
            handlerForSelectors: transferOwnershipHandlerForSelectors
        });
        
        schemas[8] = EngineBlox.FunctionSchema({
            functionSignature: "transferOwnershipCancellation(uint256)",
            functionSelector: TRANSFER_OWNERSHIP_CANCELLATION_SELECTOR,
            operationType: OWNERSHIP_TRANSFER,
            operationName: "OWNERSHIP_TRANSFER",
            supportedActionsBitmap: EngineBlox.createBitmapFromActions(timeDelayCancelActions),
            isProtected: true,
            handlerForSelectors: transferOwnershipHandlerForSelectors
        });
        
        schemas[9] = EngineBlox.FunctionSchema({
            functionSignature: "updateBroadcasterRequest(address)",
            functionSelector: UPDATE_BROADCASTER_REQUEST_SELECTOR,
            operationType: BROADCASTER_UPDATE,
            operationName: "BROADCASTER_UPDATE",
            supportedActionsBitmap: EngineBlox.createBitmapFromActions(timeDelayRequestActions),
            isProtected: true,
            handlerForSelectors: broadcasterHandlerForSelectors
        });
        
        schemas[10] = EngineBlox.FunctionSchema({
            functionSignature: "updateBroadcasterDelayedApproval(uint256)",
            functionSelector: UPDATE_BROADCASTER_DELAYED_APPROVAL_SELECTOR,
            operationType: BROADCASTER_UPDATE,
            operationName: "BROADCASTER_UPDATE",
            supportedActionsBitmap: EngineBlox.createBitmapFromActions(timeDelayApproveActions),
            isProtected: true,
            handlerForSelectors: broadcasterHandlerForSelectors
        });
        
        schemas[11] = EngineBlox.FunctionSchema({
            functionSignature: "updateBroadcasterCancellation(uint256)",
            functionSelector: UPDATE_BROADCASTER_CANCELLATION_SELECTOR,
            operationType: BROADCASTER_UPDATE,
            operationName: "BROADCASTER_UPDATE",
            supportedActionsBitmap: EngineBlox.createBitmapFromActions(timeDelayCancelActions),
            isProtected: true,
            handlerForSelectors: broadcasterHandlerForSelectors
        });
        
        // Execution selector schemas (required for meta-transaction dual-permission model)
        // Execution selectors must have self-reference in handlerForSelectors array
        schemas[12] = EngineBlox.FunctionSchema({
            functionSignature: "executeTransferOwnership(address)",
            functionSelector: TRANSFER_OWNERSHIP_SELECTOR,
            operationType: OWNERSHIP_TRANSFER,
            operationName: "OWNERSHIP_TRANSFER",
            supportedActionsBitmap: EngineBlox.createBitmapFromActions(executionApproveCancelActions),
            isProtected: true,
            handlerForSelectors: transferOwnershipExecutionHandlerForSelectors
        });
        
        schemas[13] = EngineBlox.FunctionSchema({
            functionSignature: "executeBroadcasterUpdate(address)",
            functionSelector: UPDATE_BROADCASTER_SELECTOR,
            operationType: BROADCASTER_UPDATE,
            operationName: "BROADCASTER_UPDATE",
            supportedActionsBitmap: EngineBlox.createBitmapFromActions(executionApproveCancelActions),
            isProtected: true,
            handlerForSelectors: broadcasterExecutionHandlerForSelectors
        });
        
        schemas[14] = EngineBlox.FunctionSchema({
            functionSignature: "executeRecoveryUpdate(address)",
            functionSelector: UPDATE_RECOVERY_SELECTOR,
            operationType: RECOVERY_UPDATE,
            operationName: "RECOVERY_UPDATE",
            supportedActionsBitmap: EngineBlox.createBitmapFromActions(executionMetaRequestApproveActions),
            isProtected: true,
            handlerForSelectors: recoveryExecutionHandlerForSelectors
        });
        
        schemas[15] = EngineBlox.FunctionSchema({
            functionSignature: "executeTimeLockUpdate(uint256)",
            functionSelector: UPDATE_TIMELOCK_SELECTOR,
            operationType: TIMELOCK_UPDATE,
            operationName: "TIMELOCK_UPDATE",
            supportedActionsBitmap: EngineBlox.createBitmapFromActions(executionMetaRequestApproveActions),
            isProtected: true,
            handlerForSelectors: timelockExecutionHandlerForSelectors
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
        EngineBlox.FunctionPermission[] memory functionPermissions = new EngineBlox.FunctionPermission[](28);
        
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
        EngineBlox.FunctionPermission[] memory functionPermissions,
        uint256 startIndex
    ) internal pure returns (uint256) {
        uint256 index = startIndex;
        
        // Action arrays for broadcaster
        EngineBlox.TxAction[] memory broadcasterMetaApproveActions = new EngineBlox.TxAction[](1);
        broadcasterMetaApproveActions[0] = EngineBlox.TxAction.EXECUTE_META_APPROVE;
        
        EngineBlox.TxAction[] memory broadcasterMetaCancelActions = new EngineBlox.TxAction[](1);
        broadcasterMetaCancelActions[0] = EngineBlox.TxAction.EXECUTE_META_CANCEL;
        
        EngineBlox.TxAction[] memory broadcasterMetaRequestApproveActions = new EngineBlox.TxAction[](1);
        broadcasterMetaRequestApproveActions[0] = EngineBlox.TxAction.EXECUTE_META_REQUEST_AND_APPROVE;
        
        EngineBlox.TxAction[] memory broadcasterExecutionApproveCancelActions = new EngineBlox.TxAction[](2);
        broadcasterExecutionApproveCancelActions[0] = EngineBlox.TxAction.EXECUTE_META_APPROVE;
        broadcasterExecutionApproveCancelActions[1] = EngineBlox.TxAction.EXECUTE_META_CANCEL;
        
        EngineBlox.TxAction[] memory broadcasterExecutionRequestApproveActions = new EngineBlox.TxAction[](1);
        broadcasterExecutionRequestApproveActions[0] = EngineBlox.TxAction.EXECUTE_META_REQUEST_AND_APPROVE;
        
        // ============ BROADCASTER: HANDLER FUNCTION PERMISSIONS (Meta-transactions) ============
        // These are checked via msg.sig in BaseStateMachine._validateCallingFunctionPermission
        
        // Create reusable handlerForSelectors arrays
        bytes4[] memory transferOwnershipHandlers = new bytes4[](1);
        transferOwnershipHandlers[0] = TRANSFER_OWNERSHIP_SELECTOR;
        bytes4[] memory updateBroadcasterHandlers = new bytes4[](1);
        updateBroadcasterHandlers[0] = UPDATE_BROADCASTER_SELECTOR;
        bytes4[] memory updateRecoveryHandlers = new bytes4[](1);
        updateRecoveryHandlers[0] = UPDATE_RECOVERY_SELECTOR;
        bytes4[] memory updateTimelockHandlers = new bytes4[](1);
        updateTimelockHandlers[0] = UPDATE_TIMELOCK_SELECTOR;
        
        // Transfer Ownership Approve Meta (handler function)
        roleHashes[index] = EngineBlox.BROADCASTER_ROLE;
        functionPermissions[index] = EngineBlox.FunctionPermission({
            functionSelector: TRANSFER_OWNERSHIP_APPROVE_META_SELECTOR,
            grantedActionsBitmap: EngineBlox.createBitmapFromActions(broadcasterMetaApproveActions),
            handlerForSelectors: transferOwnershipHandlers
        });
        index++;
        
        // Transfer Ownership Cancel Meta (handler function)
        roleHashes[index] = EngineBlox.BROADCASTER_ROLE;
        functionPermissions[index] = EngineBlox.FunctionPermission({
            functionSelector: TRANSFER_OWNERSHIP_CANCEL_META_SELECTOR,
            grantedActionsBitmap: EngineBlox.createBitmapFromActions(broadcasterMetaCancelActions),
            handlerForSelectors: transferOwnershipHandlers
        });
        index++;
        
        // Update Broadcaster Approve Meta (handler function)
        roleHashes[index] = EngineBlox.BROADCASTER_ROLE;
        functionPermissions[index] = EngineBlox.FunctionPermission({
            functionSelector: UPDATE_BROADCASTER_APPROVE_META_SELECTOR,
            grantedActionsBitmap: EngineBlox.createBitmapFromActions(broadcasterMetaApproveActions),
            handlerForSelectors: updateBroadcasterHandlers
        });
        index++;
        
        // Update Broadcaster Cancel Meta (handler function)
        roleHashes[index] = EngineBlox.BROADCASTER_ROLE;
        functionPermissions[index] = EngineBlox.FunctionPermission({
            functionSelector: UPDATE_BROADCASTER_CANCEL_META_SELECTOR,
            grantedActionsBitmap: EngineBlox.createBitmapFromActions(broadcasterMetaCancelActions),
            handlerForSelectors: updateBroadcasterHandlers
        });
        index++;
        
        // Update Recovery Meta (handler function)
        roleHashes[index] = EngineBlox.BROADCASTER_ROLE;
        functionPermissions[index] = EngineBlox.FunctionPermission({
            functionSelector: UPDATE_RECOVERY_META_SELECTOR,
            grantedActionsBitmap: EngineBlox.createBitmapFromActions(broadcasterMetaRequestApproveActions),
            handlerForSelectors: updateRecoveryHandlers
        });
        index++;
        
        // Update Timelock Meta (handler function)
        roleHashes[index] = EngineBlox.BROADCASTER_ROLE;
        functionPermissions[index] = EngineBlox.FunctionPermission({
            functionSelector: UPDATE_TIMELOCK_META_SELECTOR,
            grantedActionsBitmap: EngineBlox.createBitmapFromActions(broadcasterMetaRequestApproveActions),
            handlerForSelectors: updateTimelockHandlers
        });
        index++;
        
        // ============ BROADCASTER: EXECUTION FUNCTION PERMISSIONS ============
        // These are checked in EngineBlox library functions
        
        // Transfer Ownership Execution (for approve/cancel meta-tx)
        roleHashes[index] = EngineBlox.BROADCASTER_ROLE;
        functionPermissions[index] = EngineBlox.FunctionPermission({
            functionSelector: TRANSFER_OWNERSHIP_SELECTOR,
            grantedActionsBitmap: EngineBlox.createBitmapFromActions(broadcasterExecutionApproveCancelActions),
            handlerForSelectors: transferOwnershipHandlers // Self-reference indicates execution selector
        });
        index++;
        
        // Update Broadcaster Execution (for approve/cancel meta-tx)
        roleHashes[index] = EngineBlox.BROADCASTER_ROLE;
        functionPermissions[index] = EngineBlox.FunctionPermission({
            functionSelector: UPDATE_BROADCASTER_SELECTOR,
            grantedActionsBitmap: EngineBlox.createBitmapFromActions(broadcasterExecutionApproveCancelActions),
            handlerForSelectors: updateBroadcasterHandlers // Self-reference indicates execution selector
        });
        index++;
        
        // Update Recovery Execution (for request and approve meta-tx)
        roleHashes[index] = EngineBlox.BROADCASTER_ROLE;
        functionPermissions[index] = EngineBlox.FunctionPermission({
            functionSelector: UPDATE_RECOVERY_SELECTOR,
            grantedActionsBitmap: EngineBlox.createBitmapFromActions(broadcasterExecutionRequestApproveActions),
            handlerForSelectors: updateRecoveryHandlers // Self-reference indicates execution selector
        });
        index++;
        
        // Update Timelock Execution (for request and approve meta-tx)
        roleHashes[index] = EngineBlox.BROADCASTER_ROLE;
        functionPermissions[index] = EngineBlox.FunctionPermission({
            functionSelector: UPDATE_TIMELOCK_SELECTOR,
            grantedActionsBitmap: EngineBlox.createBitmapFromActions(broadcasterExecutionRequestApproveActions),
            handlerForSelectors: updateTimelockHandlers // Self-reference indicates execution selector
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
        EngineBlox.FunctionPermission[] memory functionPermissions,
        uint256 startIndex
    ) internal pure returns (uint256) {
        uint256 index = startIndex;
        
        // Action arrays for owner
        EngineBlox.TxAction[] memory ownerTimeDelayRequestActions = new EngineBlox.TxAction[](1);
        ownerTimeDelayRequestActions[0] = EngineBlox.TxAction.EXECUTE_TIME_DELAY_REQUEST;
        
        EngineBlox.TxAction[] memory ownerTimeDelayApproveActions = new EngineBlox.TxAction[](1);
        ownerTimeDelayApproveActions[0] = EngineBlox.TxAction.EXECUTE_TIME_DELAY_APPROVE;
        
        EngineBlox.TxAction[] memory ownerTimeDelayCancelActions = new EngineBlox.TxAction[](1);
        ownerTimeDelayCancelActions[0] = EngineBlox.TxAction.EXECUTE_TIME_DELAY_CANCEL;

        EngineBlox.TxAction[] memory ownerMetaApproveActions = new EngineBlox.TxAction[](1);
        ownerMetaApproveActions[0] = EngineBlox.TxAction.SIGN_META_APPROVE;

        EngineBlox.TxAction[] memory ownerMetaCancelActions = new EngineBlox.TxAction[](1);
        ownerMetaCancelActions[0] = EngineBlox.TxAction.SIGN_META_CANCEL;

        EngineBlox.TxAction[] memory ownerMetaRequestApproveActions = new EngineBlox.TxAction[](1);
        ownerMetaRequestApproveActions[0] = EngineBlox.TxAction.SIGN_META_REQUEST_AND_APPROVE;
        
        EngineBlox.TxAction[] memory ownerExecutionApproveCancelActions = new EngineBlox.TxAction[](2);
        ownerExecutionApproveCancelActions[0] = EngineBlox.TxAction.SIGN_META_APPROVE;
        ownerExecutionApproveCancelActions[1] = EngineBlox.TxAction.SIGN_META_CANCEL;
        
        EngineBlox.TxAction[] memory ownerExecutionRequestApproveActions = new EngineBlox.TxAction[](1);
        ownerExecutionRequestApproveActions[0] = EngineBlox.TxAction.SIGN_META_REQUEST_AND_APPROVE;
        
        EngineBlox.TxAction[] memory ownerExecutionTimeDelayRequestActions = new EngineBlox.TxAction[](1);
        ownerExecutionTimeDelayRequestActions[0] = EngineBlox.TxAction.EXECUTE_TIME_DELAY_REQUEST;
        
        EngineBlox.TxAction[] memory ownerExecutionTimeDelayApproveActions = new EngineBlox.TxAction[](1);
        ownerExecutionTimeDelayApproveActions[0] = EngineBlox.TxAction.EXECUTE_TIME_DELAY_APPROVE;
        
        // Create reusable handlerForSelectors arrays for owner permissions
        bytes4[] memory ownerTransferOwnershipHandlers = new bytes4[](1);
        ownerTransferOwnershipHandlers[0] = TRANSFER_OWNERSHIP_SELECTOR;
        bytes4[] memory ownerUpdateBroadcasterHandlers = new bytes4[](1);
        ownerUpdateBroadcasterHandlers[0] = UPDATE_BROADCASTER_SELECTOR;
        bytes4[] memory ownerUpdateRecoveryHandlers = new bytes4[](1);
        ownerUpdateRecoveryHandlers[0] = UPDATE_RECOVERY_SELECTOR;
        bytes4[] memory ownerUpdateTimelockHandlers = new bytes4[](1);
        ownerUpdateTimelockHandlers[0] = UPDATE_TIMELOCK_SELECTOR;
        
        // ============ OWNER: HANDLER FUNCTION PERMISSIONS (Time-delay) ============
        // These are checked via msg.sig in BaseStateMachine._validateCallingFunctionPermission
        
        // Transfer Ownership Delayed Approval (handler function)
        roleHashes[index] = EngineBlox.OWNER_ROLE;
        functionPermissions[index] = EngineBlox.FunctionPermission({
            functionSelector: TRANSFER_OWNERSHIP_DELAYED_APPROVAL_SELECTOR,
            grantedActionsBitmap: EngineBlox.createBitmapFromActions(ownerTimeDelayApproveActions),
            handlerForSelectors: ownerTransferOwnershipHandlers
        });
        index++;
        
        // Update Broadcaster Request (handler function)
        roleHashes[index] = EngineBlox.OWNER_ROLE;
        functionPermissions[index] = EngineBlox.FunctionPermission({
            functionSelector: UPDATE_BROADCASTER_REQUEST_SELECTOR,
            grantedActionsBitmap: EngineBlox.createBitmapFromActions(ownerTimeDelayRequestActions),
            handlerForSelectors: ownerUpdateBroadcasterHandlers
        });
        index++;
        
        // Update Broadcaster Delayed Approval (handler function)
        roleHashes[index] = EngineBlox.OWNER_ROLE;
        functionPermissions[index] = EngineBlox.FunctionPermission({
            functionSelector: UPDATE_BROADCASTER_DELAYED_APPROVAL_SELECTOR,
            grantedActionsBitmap: EngineBlox.createBitmapFromActions(ownerTimeDelayApproveActions),
            handlerForSelectors: ownerUpdateBroadcasterHandlers
        });
        index++;
        
        // Update Broadcaster Cancellation (handler function)
        roleHashes[index] = EngineBlox.OWNER_ROLE;
        functionPermissions[index] = EngineBlox.FunctionPermission({
            functionSelector: UPDATE_BROADCASTER_CANCELLATION_SELECTOR,
            grantedActionsBitmap: EngineBlox.createBitmapFromActions(ownerTimeDelayCancelActions),
            handlerForSelectors: ownerUpdateBroadcasterHandlers
        });
        index++;
        
        // ============ OWNER: HANDLER FUNCTION PERMISSIONS (Meta-transactions) ============
        // These are checked via msg.sig in BaseStateMachine._validateCallingFunctionPermission
        // Note: Owner signs meta-transactions, but doesn't execute them (broadcaster executes)
        
        // Transfer Ownership Approve Meta (handler function - for signing)
        roleHashes[index] = EngineBlox.OWNER_ROLE;
        functionPermissions[index] = EngineBlox.FunctionPermission({
            functionSelector: TRANSFER_OWNERSHIP_APPROVE_META_SELECTOR,
            grantedActionsBitmap: EngineBlox.createBitmapFromActions(ownerMetaApproveActions),
            handlerForSelectors: ownerTransferOwnershipHandlers
        });
        index++;
        
        // Transfer Ownership Cancel Meta (handler function - for signing)
        roleHashes[index] = EngineBlox.OWNER_ROLE;
        functionPermissions[index] = EngineBlox.FunctionPermission({
            functionSelector: TRANSFER_OWNERSHIP_CANCEL_META_SELECTOR,
            grantedActionsBitmap: EngineBlox.createBitmapFromActions(ownerMetaCancelActions),
            handlerForSelectors: ownerTransferOwnershipHandlers
        });
        index++;
        
        // Update Broadcaster Approve Meta (handler function - for signing)
        roleHashes[index] = EngineBlox.OWNER_ROLE;
        functionPermissions[index] = EngineBlox.FunctionPermission({
            functionSelector: UPDATE_BROADCASTER_APPROVE_META_SELECTOR,
            grantedActionsBitmap: EngineBlox.createBitmapFromActions(ownerMetaApproveActions),
            handlerForSelectors: ownerUpdateBroadcasterHandlers
        });
        index++;
              
        // Update Broadcaster Cancel Meta (handler function - for signing)
        roleHashes[index] = EngineBlox.OWNER_ROLE;
        functionPermissions[index] = EngineBlox.FunctionPermission({
            functionSelector: UPDATE_BROADCASTER_CANCEL_META_SELECTOR,
            grantedActionsBitmap: EngineBlox.createBitmapFromActions(ownerMetaCancelActions),
            handlerForSelectors: ownerUpdateBroadcasterHandlers
        });
        index++;
         
        // Update Recovery Meta (handler function - for signing)
        roleHashes[index] = EngineBlox.OWNER_ROLE;
        functionPermissions[index] = EngineBlox.FunctionPermission({
            functionSelector: UPDATE_RECOVERY_META_SELECTOR,
            grantedActionsBitmap: EngineBlox.createBitmapFromActions(ownerMetaRequestApproveActions),
            handlerForSelectors: ownerUpdateRecoveryHandlers
        });
        index++;

        // Update Timelock Meta (handler function - for signing)
        roleHashes[index] = EngineBlox.OWNER_ROLE;
        functionPermissions[index] = EngineBlox.FunctionPermission({
            functionSelector: UPDATE_TIMELOCK_META_SELECTOR,
            grantedActionsBitmap: EngineBlox.createBitmapFromActions(ownerMetaRequestApproveActions),
            handlerForSelectors: ownerUpdateTimelockHandlers
        });
        index++;
        
        // ============ OWNER: EXECUTION FUNCTION PERMISSIONS ============
        // These are checked in EngineBlox library functions
        
        // Transfer Ownership Execution (for approve/cancel meta-tx - owner signs)
        // Also supports time-delay approve (for transferOwnershipDelayedApproval)
        EngineBlox.TxAction[] memory ownerTransferOwnershipAllActions = new EngineBlox.TxAction[](3);
        ownerTransferOwnershipAllActions[0] = EngineBlox.TxAction.SIGN_META_APPROVE;
        ownerTransferOwnershipAllActions[1] = EngineBlox.TxAction.SIGN_META_CANCEL;
        ownerTransferOwnershipAllActions[2] = EngineBlox.TxAction.EXECUTE_TIME_DELAY_APPROVE;
        
        roleHashes[index] = EngineBlox.OWNER_ROLE;
        functionPermissions[index] = EngineBlox.FunctionPermission({
            functionSelector: TRANSFER_OWNERSHIP_SELECTOR,
            grantedActionsBitmap: EngineBlox.createBitmapFromActions(ownerTransferOwnershipAllActions),
            handlerForSelectors: ownerTransferOwnershipHandlers // Self-reference indicates execution selector
        });
        index++;
        
        // Update Broadcaster Execution (for approve/cancel meta-tx and time-delay request/approve/cancel - owner signs)
        // Supports:
        // - SIGN_META_APPROVE, SIGN_META_CANCEL: for meta-transactions
        // - EXECUTE_TIME_DELAY_REQUEST: for updateBroadcasterRequest (checked in txRequest)
        // - EXECUTE_TIME_DELAY_APPROVE: for updateBroadcasterDelayedApproval (checked in txDelayedApproval)
        // - EXECUTE_TIME_DELAY_CANCEL: for updateBroadcasterCancellation (checked in txCancellation)
        EngineBlox.TxAction[] memory ownerBroadcasterExecutionAllActions = new EngineBlox.TxAction[](5);
        ownerBroadcasterExecutionAllActions[0] = EngineBlox.TxAction.SIGN_META_APPROVE;
        ownerBroadcasterExecutionAllActions[1] = EngineBlox.TxAction.SIGN_META_CANCEL;
        ownerBroadcasterExecutionAllActions[2] = EngineBlox.TxAction.EXECUTE_TIME_DELAY_REQUEST;
        ownerBroadcasterExecutionAllActions[3] = EngineBlox.TxAction.EXECUTE_TIME_DELAY_APPROVE;
        ownerBroadcasterExecutionAllActions[4] = EngineBlox.TxAction.EXECUTE_TIME_DELAY_CANCEL;
        
        roleHashes[index] = EngineBlox.OWNER_ROLE;
        functionPermissions[index] = EngineBlox.FunctionPermission({
            functionSelector: UPDATE_BROADCASTER_SELECTOR,
            grantedActionsBitmap: EngineBlox.createBitmapFromActions(ownerBroadcasterExecutionAllActions),
            handlerForSelectors: ownerUpdateBroadcasterHandlers // Self-reference indicates execution selector
        });
        index++;
        
        // Update Recovery Execution (for request and approve meta-tx - owner signs)
        roleHashes[index] = EngineBlox.OWNER_ROLE;
        functionPermissions[index] = EngineBlox.FunctionPermission({
            functionSelector: UPDATE_RECOVERY_SELECTOR,
            grantedActionsBitmap: EngineBlox.createBitmapFromActions(ownerExecutionRequestApproveActions),
            handlerForSelectors: ownerUpdateRecoveryHandlers // Self-reference indicates execution selector
        });
        index++;
        
        // Update Timelock Execution (for request and approve meta-tx - owner signs)
        roleHashes[index] = EngineBlox.OWNER_ROLE;
        functionPermissions[index] = EngineBlox.FunctionPermission({
            functionSelector: UPDATE_TIMELOCK_SELECTOR,
            grantedActionsBitmap: EngineBlox.createBitmapFromActions(ownerExecutionRequestApproveActions),
            handlerForSelectors: ownerUpdateTimelockHandlers // Self-reference indicates execution selector
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
        EngineBlox.FunctionPermission[] memory functionPermissions,
        uint256 startIndex
    ) internal pure returns (uint256) {
        uint256 index = startIndex;
        
        // Action arrays for recovery
        EngineBlox.TxAction[] memory recoveryTimeDelayRequestActions = new EngineBlox.TxAction[](1);
        recoveryTimeDelayRequestActions[0] = EngineBlox.TxAction.EXECUTE_TIME_DELAY_REQUEST;
        
        EngineBlox.TxAction[] memory recoveryTimeDelayApproveActions = new EngineBlox.TxAction[](1);
        recoveryTimeDelayApproveActions[0] = EngineBlox.TxAction.EXECUTE_TIME_DELAY_APPROVE;
        
        EngineBlox.TxAction[] memory recoveryTimeDelayCancelActions = new EngineBlox.TxAction[](1);
        recoveryTimeDelayCancelActions[0] = EngineBlox.TxAction.EXECUTE_TIME_DELAY_CANCEL;
        
        // Create reusable handlerForSelectors array for recovery permissions
        bytes4[] memory recoveryTransferOwnershipHandlers = new bytes4[](1);
        recoveryTransferOwnershipHandlers[0] = TRANSFER_OWNERSHIP_SELECTOR;
        
        // ============ RECOVERY: HANDLER FUNCTION PERMISSIONS (Time-delay) ============
        // These are checked via msg.sig in BaseStateMachine._validateCallingFunctionPermission
        
        // Transfer Ownership Request (handler function)
        roleHashes[index] = EngineBlox.RECOVERY_ROLE;
        functionPermissions[index] = EngineBlox.FunctionPermission({
            functionSelector: TRANSFER_OWNERSHIP_REQUEST_SELECTOR,
            grantedActionsBitmap: EngineBlox.createBitmapFromActions(recoveryTimeDelayRequestActions),
            handlerForSelectors: recoveryTransferOwnershipHandlers
        });
        index++;
        
        // Transfer Ownership Delayed Approval (handler function)
        roleHashes[index] = EngineBlox.RECOVERY_ROLE;
        functionPermissions[index] = EngineBlox.FunctionPermission({
            functionSelector: TRANSFER_OWNERSHIP_DELAYED_APPROVAL_SELECTOR,
            grantedActionsBitmap: EngineBlox.createBitmapFromActions(recoveryTimeDelayApproveActions),
            handlerForSelectors: recoveryTransferOwnershipHandlers
        });
        index++;
        
        // Transfer Ownership Cancellation (handler function)
        roleHashes[index] = EngineBlox.RECOVERY_ROLE;
        functionPermissions[index] = EngineBlox.FunctionPermission({
            functionSelector: TRANSFER_OWNERSHIP_CANCELLATION_SELECTOR,
            grantedActionsBitmap: EngineBlox.createBitmapFromActions(recoveryTimeDelayCancelActions),
            handlerForSelectors: recoveryTransferOwnershipHandlers
        });
        index++;
        
        // ============ RECOVERY: EXECUTION FUNCTION PERMISSIONS ============
        // These are checked in EngineBlox library functions
        
        // Transfer Ownership Execution (for time-delay request/approve/cancel)
        // Recovery needs this for:
        // - EXECUTE_TIME_DELAY_REQUEST: when calling transferOwnershipRequest (checked in txRequest)
        // - EXECUTE_TIME_DELAY_APPROVE: when calling transferOwnershipDelayedApproval
        // - EXECUTE_TIME_DELAY_CANCEL: when calling transferOwnershipCancellation
        EngineBlox.TxAction[] memory recoveryExecutionAllActions = new EngineBlox.TxAction[](3);
        recoveryExecutionAllActions[0] = EngineBlox.TxAction.EXECUTE_TIME_DELAY_REQUEST;
        recoveryExecutionAllActions[1] = EngineBlox.TxAction.EXECUTE_TIME_DELAY_APPROVE;
        recoveryExecutionAllActions[2] = EngineBlox.TxAction.EXECUTE_TIME_DELAY_CANCEL;
        
        roleHashes[index] = EngineBlox.RECOVERY_ROLE;
        functionPermissions[index] = EngineBlox.FunctionPermission({
            functionSelector: TRANSFER_OWNERSHIP_SELECTOR,
            grantedActionsBitmap: EngineBlox.createBitmapFromActions(recoveryExecutionAllActions),
            handlerForSelectors: recoveryTransferOwnershipHandlers // Self-reference indicates execution selector
        });
        index++;
        
        return index;
    }

}
