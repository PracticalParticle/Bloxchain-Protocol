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
 * - STANDARD execution type only (function selector + params)
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
        
        // Pre-execution validation (function schema + permissions)
        _preExecutionValidation(
            functionSelector,
            msg.sender,
            StateAbstraction.TxAction.EXECUTE_TIME_DELAY_REQUEST
        );
        
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
     * @param txId The transaction ID
     * @param expectedOperationType The expected operation type for validation
     * @return result The execution result
     * @notice Requires STANDARD execution type and EXECUTE_TIME_DELAY_APPROVE permission for the execution function
     */
    function approveTimeLockExecution(
        uint256 txId,
        bytes32 expectedOperationType
    ) public returns (bytes memory result) {
        // Get transaction to extract execution function
        StateAbstraction.TxRecord memory txRecord = StateAbstraction.getTxRecord(_getSecureState(), txId);
        
        // Extract execution function selector (validates STANDARD execution type)
        bytes4 executionFunctionSelector = _extractExecutionFunctionSelector(txRecord);
        
        // Pre-execution validation (function schema + permissions)
        _preExecutionValidation(
            executionFunctionSelector,
            msg.sender,
            StateAbstraction.TxAction.EXECUTE_TIME_DELAY_APPROVE
        );
        
        StateAbstraction.TxRecord memory updatedRecord = _approveTransaction(txId, expectedOperationType);
        return updatedRecord.result;
    }
    
    /**
     * @dev Cancels a time-locked transaction
     * @param txId The transaction ID
     * @param expectedOperationType The expected operation type for validation
     * @return The updated transaction record
     * @notice Requires STANDARD execution type and EXECUTE_TIME_DELAY_CANCEL permission for the execution function
     */
    function cancelTimeLockExecution(
        uint256 txId,
        bytes32 expectedOperationType
    ) public returns (StateAbstraction.TxRecord memory) {
        // Get transaction to extract execution function
        StateAbstraction.TxRecord memory txRecord = StateAbstraction.getTxRecord(_getSecureState(), txId);
        
        // Extract execution function selector (validates STANDARD execution type)
        bytes4 executionFunctionSelector = _extractExecutionFunctionSelector(txRecord);
        
        // Pre-execution validation (function schema + permissions)
        _preExecutionValidation(
            executionFunctionSelector,
            msg.sender,
            StateAbstraction.TxAction.EXECUTE_TIME_DELAY_CANCEL
        );
        
        return _cancelTransaction(txId, expectedOperationType);
    }
    
    /**
     * @dev Approves a time-locked transaction using a meta-transaction
     * @param metaTx The meta-transaction containing the transaction record and signature
     * @param expectedOperationType The expected operation type for validation
     * @param requiredSelector The handler selector for validation
     * @return The updated transaction record
     * @notice Requires STANDARD execution type and EXECUTE_META_APPROVE permission for the execution function
     */
    function approveTimeLockExecutionWithMetaTx(
        StateAbstraction.MetaTransaction memory metaTx,
        bytes32 expectedOperationType,
        bytes4 requiredSelector
    ) public returns (StateAbstraction.TxRecord memory) {
        // Extract execution function selector (validates STANDARD execution type)
        bytes4 executionFunctionSelector = _extractExecutionFunctionSelector(metaTx.txRecord);
        
        // Pre-execution validation (function schema + permissions)
        _preExecutionValidation(
            executionFunctionSelector,
            msg.sender,
            StateAbstraction.TxAction.EXECUTE_META_APPROVE
        );
        
        return _approveTransactionWithMetaTx(
            metaTx,
            expectedOperationType,
            requiredSelector,
            StateAbstraction.TxAction.EXECUTE_META_APPROVE
        );
    }
    
    /**
     * @dev Cancels a time-locked transaction using a meta-transaction
     * @param metaTx The meta-transaction containing the transaction record and signature
     * @param expectedOperationType The expected operation type for validation
     * @param requiredSelector The handler selector for validation
     * @return The updated transaction record
     * @notice Requires STANDARD execution type and EXECUTE_META_CANCEL permission for the execution function
     */
    function cancelTimeLockExecutionWithMetaTx(
        StateAbstraction.MetaTransaction memory metaTx,
        bytes32 expectedOperationType,
        bytes4 requiredSelector
    ) public returns (StateAbstraction.TxRecord memory) {
        // Extract execution function selector (validates STANDARD execution type)
        bytes4 executionFunctionSelector = _extractExecutionFunctionSelector(metaTx.txRecord);
        
        // Pre-execution validation (function schema + permissions)
        _preExecutionValidation(
            executionFunctionSelector,
            msg.sender,
            StateAbstraction.TxAction.EXECUTE_META_CANCEL
        );
        
        return _cancelTransactionWithMetaTx(
            metaTx,
            expectedOperationType,
            requiredSelector,
            StateAbstraction.TxAction.EXECUTE_META_CANCEL
        );
    }
    
    /**
     * @dev Requests and approves a transaction in one step using a meta-transaction
     * @param metaTx The meta-transaction containing the transaction record and signature
     * @param requiredSelector The handler selector for validation
     * @return The transaction record after request and approval
     * @notice Requires STANDARD execution type
     * @notice Validates function schema and permissions for the execution function (same as executeWithTimeLock)
     * @notice Requires EXECUTE_META_REQUEST_AND_APPROVE permission for the execution function selector
     */
    function requestAndApproveExecution(
        StateAbstraction.MetaTransaction memory metaTx,
        bytes4 requiredSelector
    ) public returns (StateAbstraction.TxRecord memory) {
        // Extract execution function selector (validates STANDARD execution type)
        bytes4 executionFunctionSelector = _extractExecutionFunctionSelector(metaTx.txRecord);
        
        // Pre-execution validation (function schema + permissions)
        _preExecutionValidation(
            executionFunctionSelector,
            msg.sender,
            StateAbstraction.TxAction.EXECUTE_META_REQUEST_AND_APPROVE
        );
        
        return _requestAndApproveTransaction(
            metaTx,
            requiredSelector,
            StateAbstraction.TxAction.EXECUTE_META_REQUEST_AND_APPROVE
        );
    }
    
    // Note: Meta-transaction utility functions (createMetaTxParams, 
    // generateUnsignedMetaTransactionForNew, generateUnsignedMetaTransactionForExisting)
    // are already available through inheritance from BaseStateMachine

    // ============ INTERNAL HELPER FUNCTIONS ============
    
    /**
     * @dev Pre-execution validation that checks function schema and permissions
     * @param executionFunctionSelector The execution function selector to validate
     * @param caller The address requesting the execution
     * @param action The required action permission
     * @notice This function is virtual to allow extensions to add custom validation logic
     * @notice Reverts if function schema doesn't exist or caller lacks permission
     */
    function _preExecutionValidation(
        bytes4 executionFunctionSelector,
        address caller,
        StateAbstraction.TxAction action
    ) internal view {
        // Validate function schema (mandatory for all executions)
        if (!functionSchemaExists(executionFunctionSelector)) {
            revert SharedValidation.FunctionError(executionFunctionSelector);
        }
        
        // Validate RBAC permissions
        if (!_hasActionPermission(caller, executionFunctionSelector, action)) {
            revert SharedValidation.NoPermission(caller);
        }
    }
    
    /**
     * @dev Validates STANDARD execution type and extracts the execution function selector from a transaction record
     * @param txRecord The transaction record containing execution type and options
     * @return executionFunctionSelector The extracted function selector
     * @notice Reverts if execution type is not STANDARD
     */
    function _extractExecutionFunctionSelector(
        StateAbstraction.TxRecord memory txRecord
    ) internal pure returns (bytes4 executionFunctionSelector) {
        // Require STANDARD execution type
        if (txRecord.params.executionType != StateAbstraction.ExecutionType.STANDARD) {
            revert SharedValidation.OperationNotSupported();
        }
        
        // Extract execution function selector
        StateAbstraction.StandardExecutionOptions memory execOptions = abi.decode(
            txRecord.params.executionOptions,
            (StateAbstraction.StandardExecutionOptions)
        );
        return execOptions.functionSelector;
    }
}


