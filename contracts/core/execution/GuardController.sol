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
 * - Target address whitelist per role per function selector (defense-in-depth security layer)
 * 
 * Security Features:
 * - Target whitelist: Strict security - restricts which contract addresses can be called per role and function selector
 * - Prevents exploitation of global function selector permissions by limiting valid target contracts
 * - Strict enforcement: Target MUST be explicitly whitelisted for the role+function combination
 * - If whitelist is empty (no entries), no targets are allowed - explicit deny for security
 * - Target whitelist is ALWAYS checked - no backward compatibility fallback
 * 
 * Usage Flow:
 * 1. Deploy GuardController (or combine with RuntimeRBAC/SecureOwnable for role management)
 * 2. Function schemas should be registered via definitions or RuntimeRBAC if combined
 * 3. Create roles and assign function permissions with action bitmaps (via RuntimeRBAC if combined)
 * 4. Assign wallets to roles (via RuntimeRBAC if combined)
 * 5. Configure target whitelists per role per function selector (REQUIRED for execution)
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
    using EnumerableSet for EnumerableSet.AddressSet;
    using EnumerableSet for EnumerableSet.Bytes32Set;

    // ============ TARGET WHITELIST STORAGE ============
    
    /**
     * @dev Whitelist mapping: roleHash -> functionSelector -> allowed target addresses
     * @notice Strict security: Target address MUST be in the whitelist for the role+function combination.
     *         If whitelist is empty (length == 0), no targets are allowed - explicit deny.
     *         Target must be explicitly added to whitelist to be allowed.
     */
    mapping(bytes32 => mapping(bytes4 => EnumerableSet.AddressSet)) 
        private _roleFunctionTargetWhitelist;

    // ============ EVENTS ============
    
    /**
     * @dev Emitted when a target address is added to the whitelist
     * @param roleHash The role hash
     * @param functionSelector The function selector
     * @param target The target address that was whitelisted
     */
    event TargetAddedToWhitelist(
        bytes32 indexed roleHash,
        bytes4 indexed functionSelector,
        address indexed target
    );
    
    /**
     * @dev Emitted when a target address is removed from the whitelist
     * @param roleHash The role hash
     * @param functionSelector The function selector
     * @param target The target address that was removed
     */
    event TargetRemovedFromWhitelist(
        bytes32 indexed roleHash,
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
        
        // SECURITY: Validate target whitelist
        _validateTargetWhitelist(target, functionSelector, msg.sender);
        
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
        _validateNotInternalFunction(
            txRecord.params.target,
            txRecord.params.executionSelector
        );
        
        // SECURITY: Validate target whitelist
        _validateTargetWhitelist(
            txRecord.params.target,
            txRecord.params.executionSelector,
            msg.sender
        );
        
        // Approve via BaseStateMachine helper (validates permissions in StateAbstraction)
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
        _validateNotInternalFunction(
            txRecord.params.target,
            txRecord.params.executionSelector
        );
        
        // SECURITY: Validate target whitelist (for consistency, even though cancel doesn't execute)
        _validateTargetWhitelist(
            txRecord.params.target,
            txRecord.params.executionSelector,
            msg.sender
        );
        
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
        _validateNotInternalFunction(
            metaTx.txRecord.params.target,
            metaTx.txRecord.params.executionSelector
        );
        
        // SECURITY: Validate target whitelist (validate against signer, not executor)
        _validateTargetWhitelist(
            metaTx.txRecord.params.target,
            metaTx.txRecord.params.executionSelector,
            metaTx.params.signer
        );
        
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
        // SECURITY: Prevent access to internal execution functions
        _validateNotInternalFunction(
            metaTx.txRecord.params.target,
            metaTx.txRecord.params.executionSelector
        );
        
        // SECURITY: Validate target whitelist (validate against signer, not executor)
        _validateTargetWhitelist(
            metaTx.txRecord.params.target,
            metaTx.txRecord.params.executionSelector,
            metaTx.params.signer
        );
        
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
        // SECURITY: Prevent access to internal execution functions
        _validateNotInternalFunction(
            metaTx.txRecord.params.target,
            metaTx.txRecord.params.executionSelector
        );
        
        // SECURITY: Validate target whitelist (validate against signer, not executor)
        _validateTargetWhitelist(
            metaTx.txRecord.params.target,
            metaTx.txRecord.params.executionSelector,
            metaTx.params.signer
        );
        
        // Request and approve via BaseStateMachine helper (validates permissions in StateAbstraction)
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
     * @dev Validates that GuardController is not attempting to access internal execution functions
     * @param target The target contract address
     * @param functionSelector The function selector to validate
     * @notice Internal functions use validateInternalCallInternal and should only be called
     *         through the contract's own workflow, not via GuardController
     * @notice Blocks all calls to address(this) to prevent bypassing internal-only protection
     * @notice Exception: NATIVE_TRANSFER_SELECTOR is allowed to target address(this) for native token deposits
     */
    function _validateNotInternalFunction(
        address target,
        bytes4 functionSelector
    ) internal view {
        // SECURITY: Prevent GuardController from accessing internal execution functions
        // Internal functions use validateInternalCallInternal and should only be called
        // through the contract's own workflow, not via GuardController
        // Block all calls to address(this) to prevent bypassing internal-only protection
        // Exception: NATIVE_TRANSFER_SELECTOR is allowed for native token transfers to the contract
        if (target == address(this) && functionSelector != StateAbstraction.NATIVE_TRANSFER_SELECTOR) {
            revert SharedValidation.InternalFunctionNotAccessible(functionSelector);
        }
    }

    /**
     * @dev Validates that the target address is whitelisted for the caller's role and function selector
     * @param target The target contract address to validate
     * @param functionSelector The function selector being called
     * @param caller The address making the call
     * @notice Strict security: Target MUST be in the whitelist for at least one of caller's roles.
     *         If whitelist is empty (length == 0), no targets are allowed - explicit deny.
     *         Checks all roles the caller belongs to - target must be whitelisted in at least one.
     */
    function _validateTargetWhitelist(
        address target,
        bytes4 functionSelector,
        address caller
    ) internal view {
        StateAbstraction.SecureOperationState storage state = _getSecureState();
        
        // Get all supported roles
        bytes32[] memory roles = state.getSupportedRolesList();
        
        // Track if we found any role with permission for this function
        bool hasPermission = false;
        bytes32 firstRoleWithPermission = bytes32(0);
        
        for (uint256 i = 0; i < roles.length; i++) {
            bytes32 roleHash = roles[i];
            
            // Check if caller has this role
            if (!state.hasRole(roleHash, caller)) {
                continue;
            }
            
            // Check if role has permission for this function selector
            if (!state.roles[roleHash].functionSelectorsSet.contains(bytes32(functionSelector))) {
                continue;
            }
            
            // Found a role with permission - track it
            hasPermission = true;
            if (firstRoleWithPermission == bytes32(0)) {
                firstRoleWithPermission = roleHash;
            }
            
            // Check whitelist for this role+function combination
            EnumerableSet.AddressSet storage whitelist = _roleFunctionTargetWhitelist[roleHash][functionSelector];
            
            // If target is in whitelist, validation passes
            if (whitelist.contains(target)) {
                return; // Target is whitelisted - allow
            }
        }
        
        // If caller has permission for this function through any role, but target is not whitelisted
        if (hasPermission) {
            revert SharedValidation.TargetNotWhitelisted(target, functionSelector, firstRoleWithPermission);
        }
        
        // Caller doesn't have permission for this function through any role
        // This case is already handled by StateAbstraction permission checks, but we revert here for safety
        revert SharedValidation.TargetNotWhitelisted(target, functionSelector, bytes32(0));
    }

    // ============ TARGET WHITELIST MANAGEMENT ============

    /**
     * @dev Internal helper to add a target address to the whitelist for a role and function selector
     * @param roleHash The role hash
     * @param functionSelector The function selector
     * @param target The target address to whitelist
     * @notice Validates that the role exists and has permission for the function selector
     * @notice Access control is enforced by StateAbstraction workflows on the caller of the execution function
     */
    function _addTargetToWhitelist(
        bytes32 roleHash,
        bytes4 functionSelector,
        address target
    ) internal {
        SharedValidation.validateNotZeroAddress(target);
        StateAbstraction._validateRoleExists(_getSecureState(), roleHash);
        
        // Verify role has permission for this function selector
        if (!_getSecureState().roles[roleHash].functionSelectorsSet.contains(bytes32(functionSelector))) {
            revert SharedValidation.ResourceNotFound(bytes32(functionSelector));
        }
        
        EnumerableSet.AddressSet storage whitelist = _roleFunctionTargetWhitelist[roleHash][functionSelector];
        
        if (!whitelist.add(target)) {
            revert SharedValidation.ItemAlreadyExists(target);
        }
        
        emit TargetAddedToWhitelist(roleHash, functionSelector, target);
    }
    
    /**
     * @dev Internal helper to remove a target address from the whitelist
     * @param roleHash The role hash
     * @param functionSelector The function selector
     * @param target The target address to remove
     * @notice Access control is enforced by StateAbstraction workflows on the caller of the execution function
     */
    function _removeTargetFromWhitelist(
        bytes32 roleHash,
        bytes4 functionSelector,
        address target
    ) internal {
        EnumerableSet.AddressSet storage whitelist = _roleFunctionTargetWhitelist[roleHash][functionSelector];
        
        if (whitelist.remove(target)) {
            emit TargetRemovedFromWhitelist(roleHash, functionSelector, target);
        } else {
            revert SharedValidation.ItemNotFound(target);
        }
    }

    /**
     * @dev Creates execution params for updating the target whitelist for a role and function selector
     * @param roleHash The role hash
     * @param functionSelector The function selector
     * @param target The target address to add or remove
     * @param isAdd True to add the target, false to remove
     * @return The execution params to be used in a meta-transaction
     * @notice Validation focuses on basic input checks; full validation occurs during execution
     */
    function updateTargetWhitelistExecutionParams(
        bytes32 roleHash,
        bytes4 functionSelector,
        address target,
        bool isAdd
    ) public view returns (bytes memory) {
        SharedValidation.validateNotZeroAddress(target);
        StateAbstraction._validateRoleExists(_getSecureState(), roleHash);

        // If adding, validate that the role has permission for this function selector
        if (isAdd && !_getSecureState().roles[roleHash].functionSelectorsSet.contains(bytes32(functionSelector))) {
            revert SharedValidation.ResourceNotFound(bytes32(functionSelector));
        }

        return abi.encode(roleHash, functionSelector, target, isAdd);
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
        SharedValidation.validateBroadcaster(getBroadcaster());
        SharedValidation.validateOwnerIsSigner(metaTx.params.signer, owner());
        
        return _requestAndApproveTransaction(metaTx);
    }

    /**
     * @dev External execution entrypoint for whitelist updates.
     *      Can only be called by the contract itself during protected StateAbstraction workflows.
     * @param roleHash The role hash
     * @param functionSelector The function selector
     * @param target The target address to add or remove
     * @param isAdd True to add the target, false to remove
     */
    function executeUpdateTargetWhitelist(
        bytes32 roleHash,
        bytes4 functionSelector,
        address target,
        bool isAdd
    ) external {
        SharedValidation.validateInternalCall(address(this));

        if (isAdd) {
            _addTargetToWhitelist(roleHash, functionSelector, target);
        } else {
            _removeTargetFromWhitelist(roleHash, functionSelector, target);
        }
    }

    /**
     * @dev Gets all whitelisted targets for a role and function selector
     * @param roleHash The role hash
     * @param functionSelector The function selector
     * @return Array of whitelisted target addresses
     * @notice Requires caller to have any role (via _validateAnyRole) for privacy protection
     */
    function getAllowedTargets(
        bytes32 roleHash,
        bytes4 functionSelector
    ) external view returns (address[] memory) {
        StateAbstraction.SecureOperationState storage state = _getSecureState();
        StateAbstraction._validateAnyRole(state); // Privacy: require any role to query
        StateAbstraction._validateRoleExists(state, roleHash);
        
        EnumerableSet.AddressSet storage whitelist = _roleFunctionTargetWhitelist[roleHash][functionSelector];
        uint256 length = whitelist.length();
        address[] memory targets = new address[](length);
        
        for (uint256 i = 0; i < length; i++) {
            targets[i] = whitelist.at(i);
        }
        
        return targets;
    }
}


