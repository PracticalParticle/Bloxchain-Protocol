// SPDX-License-Identifier: MPL-2.0
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "../base/BaseStateMachine.sol";
import "../../utils/SharedValidation.sol";
import "./lib/definitions/GuardControllerDefinitions.sol";
import "../../interfaces/IDefinition.sol";
import "./interface/IGuardController.sol";

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
     * - Target address whitelist per function selector (defense-in-depth security layer)
 * 
 * Security Features:
     * - Target whitelist: Strict security - restricts which contract addresses can be called per function selector
     * - Prevents exploitation of global function selector permissions by limiting valid target contracts
     * - Strict enforcement: Target MUST be explicitly whitelisted for the function selector
 * - If whitelist is empty (no entries), no targets are allowed - explicit deny for security
 * - Target whitelist is ALWAYS checked - no backward compatibility fallback
 * 
 * Usage Flow:
 * 1. Deploy GuardController (or combine with RuntimeRBAC/SecureOwnable for role management)
 * 2. Function schemas should be registered via definitions or RuntimeRBAC if combined
 * 3. Create roles and assign function permissions with action bitmaps (via RuntimeRBAC if combined)
 * 4. Assign wallets to roles (via RuntimeRBAC if combined)
     * 5. Configure target whitelists per function selector (REQUIRED for execution)
 * 6. Execute operations via time-lock workflows based on action permissions
 * 7. Target whitelist is ALWAYS validated before execution - target must be in whitelist
 * 8. Target contract validates access (ownership/role-based)
 * 
 * Workflows Available:
 * - Standard execution: function selector + params
 * - Time-locked approval: request + approve workflow
 * - Meta-transaction workflows: signed approvals/cancellations
 * 
 * Whitelist Management:
 * - addTargetToWhitelist: Add a target address to whitelist (OWNER_ROLE only)
 * - removeTargetFromWhitelist: Remove a target address from whitelist (OWNER_ROLE only)
 * - getAllowedTargets: Query whitelisted targets for a role and function selector
 * 
 * @notice This contract is modular and can be combined with RuntimeRBAC and SecureOwnable
 * @notice Target whitelist is a GuardController-specific security feature, not part of StateAbstraction library
 * @custom:security-contact security@particlecrypto.com
 */
abstract contract GuardController is BaseStateMachine {
    using StateAbstraction for StateAbstraction.SecureOperationState;

    // ============ EVENTS ============
    
    /**
     * @dev Emitted when a target address is added to the whitelist
     * @param functionSelector The function selector
     * @param target The target address that was whitelisted
     */
    event TargetAddedToWhitelist(
        bytes4 indexed functionSelector,
        address indexed target
    );
    
    /**
     * @dev Emitted when a target address is removed from the whitelist
     * @param functionSelector The function selector
     * @param target The target address that was removed
     */
    event TargetRemovedFromWhitelist(
        bytes4 indexed functionSelector,
        address indexed target
    );

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

    // ============ INTERFACE SUPPORT ============

    /**
     * @dev See {IERC165-supportsInterface}.
     * @notice Adds IGuardController interface ID for component detection
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return interfaceId == type(IGuardController).interfaceId || super.supportsInterface(interfaceId);
    }

    // ============ EXECUTION FUNCTIONS ============
    
    /**
     * @dev Requests a time-locked execution via StateAbstraction workflow
     * @param target The address of the target contract
     * @param value The ETH value to send (0 for standard function calls)
     * @param functionSelector The function selector to execute (NATIVE_TRANSFER_SELECTOR for simple native token transfers)
     * @param params The encoded parameters for the function (empty for simple native token transfers)
     * @param gasLimit The gas limit for execution
     * @param operationType The operation type hash
     * @return txId The transaction ID for the requested operation
     * @notice Creates a time-locked transaction that must be approved after the timelock period
     * @notice Requires EXECUTE_TIME_DELAY_REQUEST permission for the function selector
     * @notice For standard function calls: value=0, functionSelector=non-zero, params=encoded data
     * @notice For simple native token transfers: value>0, functionSelector=NATIVE_TRANSFER_SELECTOR, params=""
     */
    function executeWithTimeLock(
        address target,
        uint256 value,
        bytes4 functionSelector,
        bytes memory params,
        uint256 gasLimit,
        bytes32 operationType
    ) public returns (StateAbstraction.TxRecord memory) {
        // Validate inputs
        SharedValidation.validateNotZeroAddress(target);
        
        // SECURITY: Prevent access to internal execution functions
        _validateNotInternalFunction(target, functionSelector);
        
        // Request via BaseStateMachine helper (validates permissions and whitelist in StateAbstraction)
        StateAbstraction.TxRecord memory txRecord = _requestTransaction(
            msg.sender,
            target,
            value,
            gasLimit,
            operationType,
            functionSelector,
            params
        );
        return txRecord;
    }
    
    /**
     * @dev Approves and executes a time-locked transaction
     * @param txId The transaction ID
     * @return result The execution result
     * @notice Requires STANDARD execution type and EXECUTE_TIME_DELAY_APPROVE permission for the execution function
     */
    function approveTimeLockExecution(
        uint256 txId
    ) public returns (StateAbstraction.TxRecord memory) {
        // SECURITY: Prevent access to internal execution functions
        StateAbstraction.TxRecord memory txRecord = _getSecureState().txRecords[txId];
        _validateNotInternalFunction(txRecord.params.target, txRecord.params.executionSelector);
        
        // Approve via BaseStateMachine helper (validates permissions and whitelist in StateAbstraction)
        return _approveTransaction(txId);  
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
        // SECURITY: Prevent access to internal execution functions
        StateAbstraction.TxRecord memory txRecord = _getSecureState().txRecords[txId];
        _validateNotInternalFunction(txRecord.params.target, txRecord.params.executionSelector);
        
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
        // SECURITY: Prevent access to internal execution functions
        _validateNotInternalFunction(metaTx.txRecord.params.target, metaTx.txRecord.params.executionSelector);
        
        // Approve via BaseStateMachine helper (validates permissions and whitelist in StateAbstraction)
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
        // SECURITY: Prevent access to internal execution functions
        _validateNotInternalFunction(metaTx.txRecord.params.target, metaTx.txRecord.params.executionSelector);
        
        // Cancel via BaseStateMachine helper (validates permissions and whitelist in StateAbstraction)
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
        // SECURITY: Prevent access to internal execution functions
        _validateNotInternalFunction(metaTx.txRecord.params.target, metaTx.txRecord.params.executionSelector);
        
        // Request and approve via BaseStateMachine helper (validates permissions and whitelist in StateAbstraction)
        return _requestAndApproveTransaction(metaTx);
    }
    
    // Note: Meta-transaction utility functions (createMetaTxParams, 
    // generateUnsignedMetaTransactionForNew, generateUnsignedMetaTransactionForExisting)
    // are already available through inheritance from BaseStateMachine
    // 
    // Note: Permission validation is handled by StateAbstraction library functions
    // which validate both function schema existence and RBAC permissions for execution selectors

    // ============ INTERNAL VALIDATION HELPERS ============

    /**
     * @dev Checks if a function selector is a known system macro selector
     * @param functionSelector The function selector to check
     * @return true if the selector is a known system macro selector, false otherwise
     * @notice System macro selectors are special selectors that represent system-level operations
     *         and are allowed to bypass certain security restrictions
     * @notice Currently known macro selectors:
     *         - NATIVE_TRANSFER_SELECTOR: For native token transfers
     */
    function _isSystemMacroSelector(bytes4 functionSelector) internal pure returns (bool) {
        return functionSelector == StateAbstraction.NATIVE_TRANSFER_SELECTOR;
    }

    /**
     * @dev Validates that GuardController is not attempting to access internal execution functions
     * @param target The target contract address
     * @param functionSelector The function selector to validate
     * @notice Internal functions use validateInternalCallInternal and should only be called
     *         through the contract's own workflow, not via GuardController
     * @notice Blocks all calls to address(this) to prevent bypassing internal-only protection
     * @notice Exception: System macro selectors (e.g., NATIVE_TRANSFER_SELECTOR) are allowed
     *         to target address(this) for system-level operations like native token deposits
     */
    function _validateNotInternalFunction(
        address target,
        bytes4 functionSelector
    ) internal view {
        // SECURITY: Prevent GuardController from accessing internal execution functions
        // Internal functions use validateInternalCallInternal and should only be called
        // through the contract's own workflow, not via GuardController
        
        // If target is this contract, we need to validate the function selector
        if (target == address(this)) {
            // Allow system macro selectors (e.g., NATIVE_TRANSFER_SELECTOR for native token deposits)
            // These are special system-level operations that are safe to execute on address(this)
            if (_isSystemMacroSelector(functionSelector)) {
                return; // Allow system macro selectors
            }
            
            // Block all other calls to address(this) to prevent bypassing internal-only protection
            revert SharedValidation.InternalFunctionNotAccessible(functionSelector);
        }
    }

    // ============ TARGET WHITELIST MANAGEMENT ============

    /**
     * @dev Internal helper to add a target address to the whitelist for a function selector
     * @param functionSelector The function selector
     * @param target The target address to whitelist
     * @notice Access control is enforced by StateAbstraction workflows on the caller of the execution function
     */
    function _addTargetToWhitelist(
        bytes4 functionSelector,
        address target
    ) internal {
        // Use StateAbstraction storage and helper to manage per-function whitelists.
        _getSecureState().addTargetToFunctionWhitelist(functionSelector, target);
        emit TargetAddedToWhitelist(functionSelector, target);
    }
    
    /**
     * @dev Internal helper to remove a target address from the whitelist
     * @param functionSelector The function selector
     * @param target The target address to remove
     * @notice Access control is enforced by StateAbstraction workflows on the caller of the execution function
     */
    function _removeTargetFromWhitelist(
        bytes4 functionSelector,
        address target
    ) internal {
        _getSecureState().removeTargetFromFunctionWhitelist(functionSelector, target);
        emit TargetRemovedFromWhitelist(functionSelector, target);
    }

    /**
     * @dev Creates execution params for updating the target whitelist for a function selector
     * @param functionSelector The function selector
     * @param target The target address to add or remove
     * @param isAdd True to add the target, false to remove
     * @return The execution params to be used in a meta-transaction
     * @notice Validation focuses on basic input checks; full validation occurs during execution
     */
    function updateTargetWhitelistExecutionParams(
        bytes4 functionSelector,
        address target,
        bool isAdd
    ) public pure returns (bytes memory) {
        SharedValidation.validateNotZeroAddress(target);
        return abi.encode(functionSelector, target, isAdd);
    }

    /**
     * @dev Requests and approves a whitelist update using a meta-transaction
     * @param metaTx The meta-transaction describing the whitelist update
     * @return The transaction record
     * @notice OWNER signs, BROADCASTER executes according to GuardControllerDefinitions
     */
    function updateTargetWhitelistRequestAndApprove(
        StateAbstraction.MetaTransaction memory metaTx
    ) public returns (StateAbstraction.TxRecord memory) {
        _validateBroadcaster(msg.sender);
        SharedValidation.validateOwnerIsSigner(metaTx.params.signer, owner());
        
        return _requestAndApproveTransaction(metaTx);
    }

    /**
     * @dev External execution entrypoint for whitelist updates.
     *      Can only be called by the contract itself during protected StateAbstraction workflows.
     * @param functionSelector The function selector
     * @param target The target address to add or remove
     * @param isAdd True to add the target, false to remove
     */
    function executeUpdateTargetWhitelist(
        bytes4 functionSelector,
        address target,
        bool isAdd
    ) external {
        SharedValidation.validateInternalCall(address(this));

        if (isAdd) {
            _addTargetToWhitelist(functionSelector, target);
        } else {
            _removeTargetFromWhitelist(functionSelector, target);
        }
    }

    /**
     * @dev Gets all whitelisted targets for a function selector
     * @param functionSelector The function selector
     * @return Array of whitelisted target addresses
     * @notice Requires caller to have any role (via _validateAnyRole) for privacy protection
     */
    function getAllowedTargets(
        bytes4 functionSelector
    ) external view returns (address[] memory) {
        // Delegate to StateAbstraction, which enforces _validateAnyRole internally
        // for privacy protection when reading whitelist configuration.
        return _getSecureState().getFunctionWhitelistTargets(functionSelector);
    }
}


