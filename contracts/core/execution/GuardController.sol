// SPDX-License-Identifier: MPL-2.0
pragma solidity ^0.8.25;

import "../base/BaseStateMachine.sol";
import "../../utils/SharedValidation.sol";
import "./lib/definitions/GuardControllerDefinitions.sol";
import "../../interfaces/IDefinition.sol";

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

    /**
     * @notice Initializer to initialize GuardController
     * @param initialOwner The initial owner address
     * @param broadcaster The broadcaster address
     * @param recovery The recovery address
     * @param timeLockPeriodSec The timelock period in seconds
     * @param eventForwarder The event forwarder address 
     */
    function initialize(
        address initialOwner,
        address broadcaster,
        address recovery,
        uint256 timeLockPeriodSec,
        address eventForwarder
    ) public virtual onlyInitializing {
        // Initialize base state machine (only if not already initialized)
        if (!_secureState.initialized) {
            _initializeBaseStateMachine(initialOwner, broadcaster, recovery, timeLockPeriodSec, eventForwarder);
        }
        
        // Load GuardController-specific definitions
        IDefinition.RolePermission memory guardControllerPermissions = GuardControllerDefinitions.getRolePermissions();
        _loadDefinitions(
            GuardControllerDefinitions.getFunctionSchemas(),
            guardControllerPermissions.roleHashes,
            guardControllerPermissions.functionPermissions
        );
    }

    // ============ EXECUTION FUNCTIONS ============
    
    /**
     * @dev Requests a time-locked execution via StateAbstraction workflow
     * @param target The address of the target contract
     * @param value The ETH value to send (0 for standard function calls)
     * @param functionSelector The function selector to execute (0x00000000 for simple ETH transfers)
     * @param params The encoded parameters for the function (empty for simple ETH transfers)
     * @param gasLimit The gas limit for execution
     * @param operationType The operation type hash
     * @return txId The transaction ID for the requested operation
     * @notice Creates a time-locked transaction that must be approved after the timelock period
     * @notice Requires EXECUTE_TIME_DELAY_REQUEST permission for the function selector
     * @notice For standard function calls: value=0, functionSelector=non-zero, params=encoded data
     * @notice For simple ETH transfers: value>0, functionSelector=0x00000000, params=""
     */
    function executeWithTimeLock(
        address target,
        uint256 value,
        bytes4 functionSelector,
        bytes memory params,
        uint256 gasLimit,
        bytes32 operationType
    ) public returns (uint256 txId) {
        // Validate inputs
        SharedValidation.validateNotZeroAddress(target);
        
        // Request via BaseStateMachine helper (validates permissions in StateAbstraction)
        StateAbstraction.TxRecord memory txRecord = _requestTransaction(
            msg.sender,
            target,
            value,
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
     * @return result The execution result
     * @notice Requires STANDARD execution type and EXECUTE_TIME_DELAY_APPROVE permission for the execution function
     */
    function approveTimeLockExecution(
        uint256 txId
    ) public returns (bytes memory result) {
        // Approve via BaseStateMachine helper (validates permissions in StateAbstraction)
        StateAbstraction.TxRecord memory updatedRecord = _approveTransaction(txId);
        return updatedRecord.result;
    }
    
    /**
     * @dev Cancels a time-locked transaction
     * @param txId The transaction ID
     * @return The updated transaction record
     * @notice Requires STANDARD execution type and EXECUTE_TIME_DELAY_CANCEL permission for the execution function
     */
    function cancelTimeLockExecution(
        uint256 txId
    ) public returns (StateAbstraction.TxRecord memory) {
        // Cancel via BaseStateMachine helper (validates permissions in StateAbstraction)
        return _cancelTransaction(txId);
    }
    
    /**
     * @dev Approves a time-locked transaction using a meta-transaction
     * @param metaTx The meta-transaction containing the transaction record and signature
     * @return The updated transaction record
     * @notice Requires STANDARD execution type and EXECUTE_META_APPROVE permission for the execution function
     */
    function approveTimeLockExecutionWithMetaTx(
        StateAbstraction.MetaTransaction memory metaTx
    ) public returns (StateAbstraction.TxRecord memory) {
        // Approve via BaseStateMachine helper (validates permissions in StateAbstraction)
        return _approveTransactionWithMetaTx(metaTx);
    }
    
    /**
     * @dev Cancels a time-locked transaction using a meta-transaction
     * @param metaTx The meta-transaction containing the transaction record and signature
     * @return The updated transaction record
     * @notice Requires STANDARD execution type and EXECUTE_META_CANCEL permission for the execution function
     */
    function cancelTimeLockExecutionWithMetaTx(
        StateAbstraction.MetaTransaction memory metaTx
    ) public returns (StateAbstraction.TxRecord memory) {
        // Cancel via BaseStateMachine helper (validates permissions in StateAbstraction)
        return _cancelTransactionWithMetaTx(metaTx);
    }
    
    /**
     * @dev Requests and approves a transaction in one step using a meta-transaction
     * @param metaTx The meta-transaction containing the transaction record and signature
     * @return The transaction record after request and approval
     * @notice Requires STANDARD execution type
     * @notice Validates function schema and permissions for the execution function (same as executeWithTimeLock)
     * @notice Requires EXECUTE_META_REQUEST_AND_APPROVE permission for the execution function selector
     */
    function requestAndApproveExecution(
        StateAbstraction.MetaTransaction memory metaTx
    ) public returns (StateAbstraction.TxRecord memory) {
        // Request and approve via BaseStateMachine helper (validates permissions in StateAbstraction)
        return _requestAndApproveTransaction(metaTx);
    }
    
    // Note: Meta-transaction utility functions (createMetaTxParams, 
    // generateUnsignedMetaTransactionForNew, generateUnsignedMetaTransactionForExisting)
    // are already available through inheritance from BaseStateMachine
    // 
    // Note: Permission validation is handled by StateAbstraction library functions
    // which validate both function schema existence and RBAC permissions for execution selectors
}


