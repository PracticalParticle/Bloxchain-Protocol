// SPDX-License-Identifier: MPL-2.0
pragma solidity 0.8.33;

import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "../base/BaseStateMachine.sol";
import "../../utils/SharedValidation.sol";
import "./lib/definitions/GuardControllerDefinitions.sol";
import "../../interfaces/IDefinition.sol";
import "./interface/IGuardController.sol";

/**
 * @title GuardController
 * @dev Lightweight controller for generic contract delegation with full EngineBlox workflows
 * 
 * This contract provides a complete solution for delegating control to external addresses.
 * It extends BaseStateMachine for core state machine functionality and supports all EngineBlox
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
 * - executeGuardConfigBatch: Batch execution for adding/removing targets from whitelist (OWNER_ROLE only)
 * - getAllowedTargets: Query whitelisted targets for a function selector
 * 
 * @notice This contract is modular and can be combined with RuntimeRBAC and SecureOwnable
 * @notice Target whitelist is a GuardController-specific security feature, not part of EngineBlox library
 * @custom:security-contact security@particlecrypto.com
 */
abstract contract GuardController is BaseStateMachine {
    using EngineBlox for EngineBlox.SecureOperationState;

    /**
     * @dev Action types for batched Guard configuration
     */
    enum GuardConfigActionType {
        ADD_TARGET_TO_WHITELIST,
        REMOVE_TARGET_FROM_WHITELIST,
        REGISTER_FUNCTION,
        UNREGISTER_FUNCTION
    }

    /**
     * @dev Encodes a single Guard configuration action in a batch
     */
    struct GuardConfigAction {
        GuardConfigActionType actionType;
        bytes data;
    }

    // ============ EVENTS ============
    
    /**
     * @dev Unified event for all Guard configuration changes applied via batches
     *
     * - actionType: the high-level type of configuration action
     * - functionSelector: affected function selector (if applicable, otherwise 0)
     * - target: affected target address (if applicable, otherwise 0)
     * - data: optional action-specific payload (kept minimal for size; decoded off-chain if needed)
     */
    event GuardConfigApplied(
        GuardConfigActionType indexed actionType,
        bytes4 indexed functionSelector,
        address indexed target,
        bytes data
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
     * @dev Requests a time-locked execution via EngineBlox workflow
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
    ) public returns (EngineBlox.TxRecord memory) {
        // Validate inputs
        SharedValidation.validateNotZeroAddress(target);
        
        // SECURITY: Prevent access to internal execution functions
        _validateNotInternalFunction(target, functionSelector);
        
        // Request via BaseStateMachine helper (validates permissions and whitelist in EngineBlox)
        EngineBlox.TxRecord memory txRecord = _requestTransaction(
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
    ) public returns (EngineBlox.TxRecord memory) {
        // SECURITY: Prevent access to internal execution functions
        EngineBlox.TxRecord memory txRecord = _getSecureState().txRecords[txId];
        _validateNotInternalFunction(txRecord.params.target, txRecord.params.executionSelector);
        
        // Approve via BaseStateMachine helper (validates permissions and whitelist in EngineBlox)
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
    ) public returns (EngineBlox.TxRecord memory) {
        // SECURITY: Prevent access to internal execution functions
        EngineBlox.TxRecord memory txRecord = _getSecureState().txRecords[txId];
        _validateNotInternalFunction(txRecord.params.target, txRecord.params.executionSelector);
        
        // Cancel via BaseStateMachine helper (validates permissions in EngineBlox)
        return _cancelTransaction(txId);
    }
    
    /**
     * @dev Approves a time-locked transaction using a meta-transaction
     * @param metaTx The meta-transaction containing the transaction record and signature
     * @return The updated transaction record
     * @notice Requires STANDARD execution type and EXECUTE_META_APPROVE permission for the execution function
     */
    function approveTimeLockExecutionWithMetaTx(
        EngineBlox.MetaTransaction memory metaTx
    ) public returns (EngineBlox.TxRecord memory) {
        // SECURITY: Prevent access to internal execution functions
        _validateNotInternalFunction(metaTx.txRecord.params.target, metaTx.txRecord.params.executionSelector);
        
        // Approve via BaseStateMachine helper (validates permissions and whitelist in EngineBlox)
        return _approveTransactionWithMetaTx(metaTx);
    }
    
    /**
     * @dev Cancels a time-locked transaction using a meta-transaction
     * @param metaTx The meta-transaction containing the transaction record and signature
     * @return The updated transaction record
     * @notice Requires STANDARD execution type and EXECUTE_META_CANCEL permission for the execution function
     */
    function cancelTimeLockExecutionWithMetaTx(
        EngineBlox.MetaTransaction memory metaTx
    ) public returns (EngineBlox.TxRecord memory) {
        // SECURITY: Prevent access to internal execution functions
        _validateNotInternalFunction(metaTx.txRecord.params.target, metaTx.txRecord.params.executionSelector);
        
        // Cancel via BaseStateMachine helper (validates permissions and whitelist in EngineBlox)
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
        EngineBlox.MetaTransaction memory metaTx
    ) public returns (EngineBlox.TxRecord memory) {
        // SECURITY: Prevent access to internal execution functions
        _validateNotInternalFunction(metaTx.txRecord.params.target, metaTx.txRecord.params.executionSelector);
        
        // Request and approve via BaseStateMachine helper (validates permissions and whitelist in EngineBlox)
        return _requestAndApproveTransaction(metaTx);
    }
    
    // Note: Meta-transaction utility functions (createMetaTxParams, 
    // generateUnsignedMetaTransactionForNew, generateUnsignedMetaTransactionForExisting)
    // are already available through inheritance from BaseStateMachine
    // 
    // Note: Permission validation is handled by EngineBlox library functions
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
        return functionSelector == EngineBlox.NATIVE_TRANSFER_SELECTOR
            || functionSelector == EngineBlox.UPDATE_PAYMENT_SELECTOR;
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

    // ============ GUARD CONFIGURATION BATCH INTERFACE ============

    /**
     * @dev Creates execution params for a Guard configuration batch
     * @param actions Encoded guard configuration actions
     * @return The execution params for EngineBlox
     */
    function guardConfigBatchExecutionParams(
        GuardConfigAction[] memory actions
    ) public pure returns (bytes memory) {
        return abi.encode(actions);
    }

    /**
     * @dev Requests and approves a Guard configuration batch using a meta-transaction
     * @param metaTx The meta-transaction
     * @return The transaction record
     * @notice OWNER signs, BROADCASTER executes according to GuardControllerDefinitions
     */
    function guardConfigBatchRequestAndApprove(
        EngineBlox.MetaTransaction memory metaTx
    ) public returns (EngineBlox.TxRecord memory) {
        _validateBroadcaster(msg.sender);
        SharedValidation.validateOwnerIsSigner(metaTx.params.signer, owner());
        
        return _requestAndApproveTransaction(metaTx);
    }

    /**
     * @dev External function that can only be called by the contract itself to execute a Guard configuration batch
     * @param actions Encoded guard configuration actions
     */
    function executeGuardConfigBatch(GuardConfigAction[] calldata actions) external {
        SharedValidation.validateInternalCall(address(this));
        _executeGuardConfigBatch(actions);
    }

    // ============ HELPER FUNCTIONS ============

    /**
     * @dev Internal helper to execute a Guard configuration batch
     * @param actions Encoded guard configuration actions
     */
    function _executeGuardConfigBatch(GuardConfigAction[] calldata actions) internal {
        // Validate batch size limit
        SharedValidation.validateBatchSize(
            actions.length,
            EngineBlox.MAX_BATCH_SIZE
        );
        
        for (uint256 i = 0; i < actions.length; i++) {
            GuardConfigAction calldata action = actions[i];

            if (action.actionType == GuardConfigActionType.ADD_TARGET_TO_WHITELIST) {
                // Decode ADD_TARGET_TO_WHITELIST action data
                // Format: (bytes4 functionSelector, address target)
                (bytes4 functionSelector, address target) = abi.decode(action.data, (bytes4, address));

                _addTargetToFunctionWhitelist(functionSelector, target);

                emit GuardConfigApplied(
                    GuardConfigActionType.ADD_TARGET_TO_WHITELIST,
                    functionSelector,
                    target,
                    "" // optional: could encode additional data if needed
                );
            } else if (action.actionType == GuardConfigActionType.REMOVE_TARGET_FROM_WHITELIST) {
                // Decode REMOVE_TARGET_FROM_WHITELIST action data
                // Format: (bytes4 functionSelector, address target)
                (bytes4 functionSelector, address target) = abi.decode(action.data, (bytes4, address));

                _removeTargetFromFunctionWhitelist(functionSelector, target);

                emit GuardConfigApplied(
                    GuardConfigActionType.REMOVE_TARGET_FROM_WHITELIST,
                    functionSelector,
                    target,
                    ""
                );
            } else if (action.actionType == GuardConfigActionType.REGISTER_FUNCTION) {
                // Decode REGISTER_FUNCTION action data
                // Format: (string functionSignature, string operationName, TxAction[] supportedActions)
                (
                    string memory functionSignature,
                    string memory operationName,
                    EngineBlox.TxAction[] memory supportedActions
                ) = abi.decode(action.data, (string, string, EngineBlox.TxAction[]));

                bytes4 functionSelector = _registerFunction(functionSignature, operationName, supportedActions);

                emit GuardConfigApplied(
                    GuardConfigActionType.REGISTER_FUNCTION,
                    functionSelector,
                    address(0),
                    "" // optional: abi.encode(operationName)
                );
            } else if (action.actionType == GuardConfigActionType.UNREGISTER_FUNCTION) {
                // Decode UNREGISTER_FUNCTION action data
                // Format: (bytes4 functionSelector, bool safeRemoval)
                (bytes4 functionSelector, bool safeRemoval) = abi.decode(action.data, (bytes4, bool));

                _unregisterFunction(functionSelector, safeRemoval);

                emit GuardConfigApplied(
                    GuardConfigActionType.UNREGISTER_FUNCTION,
                    functionSelector,
                    address(0),
                    ""
                );
            } else {
                revert SharedValidation.NotSupported();
            }
        }
    }

    // ============ INTERNAL FUNCTION SCHEMA HELPERS ============

    /**
     * @dev Internal helper to register a new function schema
     * @param functionSignature The function signature
     * @param operationName The operation name
     * @param supportedActions Array of supported actions
     * @return functionSelector The derived function selector
     */
    function _registerFunction(
        string memory functionSignature,
        string memory operationName,
        EngineBlox.TxAction[] memory supportedActions
    ) internal returns (bytes4 functionSelector) {
        // Derive function selector from signature
        functionSelector = bytes4(keccak256(bytes(functionSignature)));

        // Validate that function schema doesn't already exist
        if (functionSchemaExists(functionSelector)) {
            revert SharedValidation.ResourceAlreadyExists(bytes32(functionSelector));
        }

        // Convert actions array to bitmap
        uint16 supportedActionsBitmap = _createBitmapFromActions(supportedActions);

        // Create function schema directly (always non-protected)
        // Dynamically registered functions are execution selectors (handlerForSelectors must contain self-reference)
        bytes4[] memory executionHandlerForSelectors = new bytes4[](1);
        executionHandlerForSelectors[0] = functionSelector; // Self-reference for execution selector
        _createFunctionSchema(
            functionSignature,
            functionSelector,
            operationName,
            supportedActionsBitmap,
            false, // isProtected = false for dynamically registered functions
            executionHandlerForSelectors // handlerForSelectors with self-reference for execution selectors
        );
    }

    /**
     * @dev Internal helper to unregister a function schema
     * @param functionSelector The function selector to unregister
     * @param safeRemoval If true, checks for role references before removal
     */
    function _unregisterFunction(bytes4 functionSelector, bool safeRemoval) internal {
        // Load schema and validate it exists
        EngineBlox.FunctionSchema storage schema = _getSecureState().functions[functionSelector];
        if (schema.functionSelector != functionSelector) {
            revert SharedValidation.ResourceNotFound(bytes32(functionSelector));
        }

        // Ensure not protected
        if (schema.isProtected) {
            revert SharedValidation.CannotModifyProtected(bytes32(functionSelector));
        }

        // The safeRemoval check is now handled within EngineBlox.removeFunctionSchema
        // (avoids getSupportedRolesList/getRoleFunctionPermissions which call _validateAnyRole;
        // during meta-tx execution msg.sender is the contract, causing NoPermission)
        _removeFunctionSchema(functionSelector, safeRemoval);
    }

    /**
     * @dev Gets all whitelisted targets for a function selector
     * @param functionSelector The function selector
     * @return Array of whitelisted target addresses
     * @notice Requires caller to have any role (via _validateAnyRole) to limit information visibility
     */
    function getAllowedTargets(
        bytes4 functionSelector
    ) external view returns (address[] memory) {
        _validateAnyRole();
        return _getFunctionWhitelistTargets(functionSelector);
    }
}


