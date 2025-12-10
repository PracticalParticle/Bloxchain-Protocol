// SPDX-License-Identifier: MPL-2.0
pragma solidity ^0.8.25;

import "../base/BaseStateMachine.sol";
import "../../utils/SharedValidation.sol";

/**
 * @title GuardController
 * @dev Lightweight controller for generic contract delegation with full StateAbstraction workflows
 * 
 * This contract provides a complete solution for delegating control to external addresses.
 * It extends BaseStateMachine for core state machine functionality and supports all StateAbstraction
 * execution patterns including time-locked transactions, meta-transactions, and payment management.
 * 
 * Key Features:
 * - Core state machine functionality from BaseStateMachine
 * - Function schema query support (functionSchemaExists)
 * - Full StateAbstraction workflow support (STANDARD, RAW, NONE execution types)
 * - Meta-transaction support for delegated approvals and cancellations
 * - Payment management for native tokens and ERC20 tokens
 * - Role-based access control with action-level permissions
 * - No target authorization list - relies on target contract's access control
 * 
 * Usage Flow:
 * 1. Deploy GuardController (or combine with DynamicRBAC/SecureOwnable for role management)
 * 2. Function schemas should be registered via definitions or DynamicRBAC if combined
 * 3. Create roles and assign function permissions with action bitmaps (via DynamicRBAC if combined)
 * 4. Assign wallets to roles (via DynamicRBAC if combined)
 * 5. Execute operations via time-lock workflows based on action permissions
 * 6. Target contract validates access (ownership/role-based)
 * 
 * Workflows Available:
 * - Standard execution: function selector + params
 * - Time-locked approval: request + approve workflow
 * - Meta-transaction workflows: signed approvals/cancellations
 * 
 * @notice This contract is modular and can be combined with DynamicRBAC and SecureOwnable
 * @custom:security-contact security@particlecrypto.com
 */
abstract contract GuardController is BaseStateMachine {
    using StateAbstraction for StateAbstraction.SecureOperationState;

    // ============ EXECUTION FUNCTIONS ============
    
    /**
     * @dev Requests a time-locked standard execution via StateAbstraction workflow
     * @param target The address of the target contract
     * @param functionSelector The function selector to execute
     * @param params The encoded parameters for the function
     * @param gasLimit The gas limit for execution
     * @param operationType The operation type hash
     * @return txId The transaction ID for the requested operation
     * @notice Creates a time-locked transaction that must be approved after the timelock period
     * @notice Requires EXECUTE_TIME_DELAY_REQUEST permission for the function selector
     */
    function executeWithTimeLock(
        address target,
        bytes4 functionSelector,
        bytes memory params,
        uint256 gasLimit,
        bytes32 operationType
    ) public returns (uint256 txId) {
        // Validate inputs
        SharedValidation.validateNotZeroAddress(target);
        
        // Validate function is registered
        if (!functionSchemaExists(functionSelector)) {
            revert SharedValidation.FunctionError(functionSelector);
        }
        
        // Validate RBAC permissions for time-lock request
        if (!_hasActionPermission(msg.sender, functionSelector, StateAbstraction.TxAction.EXECUTE_TIME_DELAY_REQUEST)) {
            revert SharedValidation.NoPermission(msg.sender);
        }
        
        // Request via BaseStateMachine helper (STANDARD execution)
        StateAbstraction.TxRecord memory txRecord = _requestStandardTransaction(
            msg.sender,
            target,
            gasLimit,
            operationType,
            functionSelector,
            params
        );
        return txRecord.txId;
    }
    
    /**
     * @dev Approves and executes a time-locked transaction
     */
    function approveTimeLockExecution(
        uint256 txId,
        bytes32 expectedOperationType
    ) public returns (bytes memory result) {
        StateAbstraction.TxRecord memory txRecord = _approveTransaction(txId, expectedOperationType);
        return txRecord.result;
    }
    
    /**
     * @dev Cancels a time-locked transaction
     */
    function cancelTimeLockExecution(
        uint256 txId,
        bytes32 expectedOperationType
    ) public returns (StateAbstraction.TxRecord memory) {
        return _cancelTransaction(txId, expectedOperationType);
    }
    
    /**
     * @dev Approves a time-locked transaction using a meta-transaction
     */
    function approveTimeLockExecutionWithMetaTx(
        StateAbstraction.MetaTransaction memory metaTx,
        bytes32 expectedOperationType,
        bytes4 requiredSelector
    ) public returns (StateAbstraction.TxRecord memory) {
        return _approveTransactionWithMetaTx(
            metaTx,
            expectedOperationType,
            requiredSelector,
            StateAbstraction.TxAction.EXECUTE_META_APPROVE
        );
    }
    
    /**
     * @dev Cancels a time-locked transaction using a meta-transaction
     */
    function cancelTimeLockExecutionWithMetaTx(
        StateAbstraction.MetaTransaction memory metaTx,
        bytes32 expectedOperationType,
        bytes4 requiredSelector
    ) public returns (StateAbstraction.TxRecord memory) {
        return _cancelTransactionWithMetaTx(
            metaTx,
            expectedOperationType,
            requiredSelector,
            StateAbstraction.TxAction.EXECUTE_META_CANCEL
        );
    }
    
    /**
     * @dev Requests and approves a transaction in one step using a meta-transaction
     */
    function requestAndApproveExecution(
        StateAbstraction.MetaTransaction memory metaTx,
        bytes4 requiredSelector
    ) public returns (StateAbstraction.TxRecord memory) {
        return _requestAndApproveTransaction(
            metaTx,
            requiredSelector,
            StateAbstraction.TxAction.EXECUTE_META_REQUEST_AND_APPROVE
        );
    }
    
    // Note: Meta-transaction utility functions (createMetaTxParams, 
    // generateUnsignedMetaTransactionForNew, generateUnsignedMetaTransactionForExisting)
    // are already available through inheritance from BaseStateMachine
}


