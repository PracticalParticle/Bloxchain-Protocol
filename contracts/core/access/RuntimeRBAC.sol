// SPDX-License-Identifier: MPL-2.0
pragma solidity ^0.8.25;

// Contract imports
import "../base/BaseStateMachine.sol";
import "../base/lib/StateAbstraction.sol";
import "../../utils/SharedValidation.sol";
import "./lib/definitions/RuntimeRBACDefinitions.sol";
import "../../interfaces/IDefinition.sol";
import "./interface/IRuntimeRBAC.sol";

/**
 * @title RuntimeRBAC
 * @dev Minimal Runtime Role-Based Access Control system based on StateAbstraction
 * 
 * This contract provides essential runtime RBAC functionality:
 * - Creation of non-protected roles
 * - Basic wallet assignment to roles
 * - Function permission management per role
 * - Integration with StateAbstraction for secure operations
 * 
 * Key Features:
 * - Only non-protected roles can be created dynamically
 * - Protected roles (OWNER, BROADCASTER, RECOVERY) are managed by SecureOwnable
 * - Minimal interface for core RBAC operations
 * - Essential role management functions only
 */
abstract contract RuntimeRBAC is BaseStateMachine {
    using StateAbstraction for StateAbstraction.SecureOperationState;
    using SharedValidation for *;
    
    /**
     * @dev Action types for batched RBAC configuration
     */
    enum RoleConfigActionType {
        CREATE_ROLE,
        REMOVE_ROLE,
        ADD_WALLET,
        REVOKE_WALLET,
        REGISTER_FUNCTION,
        UNREGISTER_FUNCTION,
        ADD_FUNCTION_TO_ROLE,
        REMOVE_FUNCTION_FROM_ROLE,
        LOAD_DEFINITIONS
    }

    /**
     * @dev Encodes a single RBAC configuration action in a batch
     */
    struct RoleConfigAction {
        RoleConfigActionType actionType;
        bytes data;
    }
    
    /**
     * @dev Unified event for all RBAC configuration changes applied via batches
     *
     * - actionType: the high-level type of configuration action
     * - roleHash: affected role hash (if applicable, otherwise 0)
     * - functionSelector: affected function selector (if applicable, otherwise 0)
     * - data: optional action-specific payload (kept minimal for size; decoded off-chain if needed)
     */
    event RoleConfigApplied(
        RoleConfigActionType indexed actionType,
        bytes32 indexed roleHash,
        bytes4 indexed functionSelector,
        bytes data
    );

    /**
     * @notice Initializer to initialize RuntimeRBAC
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
        
        // Load RuntimeRBAC-specific definitions
        IDefinition.RolePermission memory permissions = RuntimeRBACDefinitions.getRolePermissions();
        _loadDefinitions(
            RuntimeRBACDefinitions.getFunctionSchemas(),
            permissions.roleHashes,
            permissions.functionPermissions
        );
    }

    // ============ INTERFACE SUPPORT ============

    /**
     * @dev See {IERC165-supportsInterface}.
     * @notice Adds IRuntimeRBAC interface ID for component detection
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return interfaceId == type(IRuntimeRBAC).interfaceId || super.supportsInterface(interfaceId);
    }

    // ============ ROLE CONFIGURATION BATCH INTERFACE ============

    /**
     * @dev Creates execution params for a RBAC configuration batch
     * @param actions Encoded role configuration actions
     * @return The execution params for StateAbstraction
     */
    function roleConfigBatchExecutionParams(
        RoleConfigAction[] memory actions
    ) public pure returns (bytes memory) {
        return abi.encode(actions);
    }

    /**
     * @dev Requests and approves a RBAC configuration batch using a meta-transaction
     * @param metaTx The meta-transaction
     * @return The transaction record
     * @notice OWNER signs, BROADCASTER executes according to RuntimeRBACDefinitions
     */
    function roleConfigBatchRequestAndApprove(
        StateAbstraction.MetaTransaction memory metaTx
    ) public returns (StateAbstraction.TxRecord memory) {
        SharedValidation.validateBroadcaster(getBroadcaster());
        return _requestAndApproveTransaction(metaTx);
    }

    /**
     * @dev External function that can only be called by the contract itself to execute a RBAC configuration batch
     * @param actions Encoded role configuration actions
     */
    function executeRoleConfigBatch(RoleConfigAction[] calldata actions) external {
        SharedValidation.validateInternalCall(address(this));
        _executeRoleConfigBatch(actions);
    }

    // Essential Query Functions Only

    /**
     * @dev Gets function schema information
     * @param functionSelector The function selector to get information for
     * @return functionSignature The function signature or name
     * @return functionSelectorReturn The function selector
     * @return operationType The operation type
     * @return operationName The operation name
     * @return supportedActions The supported actions
     * @return isProtected Whether the function schema is protected
     */
    function getFunctionSchema(bytes4 functionSelector) external view returns (
        string memory functionSignature,
        bytes4 functionSelectorReturn,
        bytes32 operationType,
        string memory operationName,
        StateAbstraction.TxAction[] memory supportedActions,
        bool isProtected
    ) {
        StateAbstraction.FunctionSchema storage schema = _getSecureState().functions[functionSelector];
        if (schema.functionSelector != functionSelector) {
            revert SharedValidation.ResourceNotFound(bytes32(functionSelector));
        }
        
        // Convert bitmap to array
        supportedActions = StateAbstraction.convertBitmapToActions(schema.supportedActionsBitmap);
        
        return (
            schema.functionSignature,
            schema.functionSelector,
            schema.operationType,
            schema.operationName,
            supportedActions,
            schema.isProtected
        );
    }

    // ============ HELPER FUNCTIONS ============

    /**
     * @dev Internal helper to execute a RBAC configuration batch
     * @param actions Encoded role configuration actions
     */
    function _executeRoleConfigBatch(RoleConfigAction[] calldata actions) internal {
        for (uint256 i = 0; i < actions.length; i++) {
            RoleConfigAction calldata action = actions[i];

            if (action.actionType == RoleConfigActionType.CREATE_ROLE) {
                // Decode CREATE_ROLE action data
                // Format: (string roleName, uint256 maxWallets, FunctionPermission[] functionPermissions)
                // FunctionPermission is struct(bytes4 functionSelector, uint16 grantedActionsBitmap)
                // When encoding from JavaScript, it's encoded as tuple(bytes4,uint16)[]
                // Solidity can decode tuple[] directly into struct[] if the layout matches
                (
                    string memory roleName,
                    uint256 maxWallets,
                    StateAbstraction.FunctionPermission[] memory functionPermissions
                ) = abi.decode(action.data, (string, uint256, StateAbstraction.FunctionPermission[]));

                bytes32 roleHash = _createNewRole(roleName, maxWallets, functionPermissions);

                emit RoleConfigApplied(
                    RoleConfigActionType.CREATE_ROLE,
                    roleHash,
                    bytes4(0),
                    "" // optional: abi.encode(roleName, maxWallets)
                );
            } else if (action.actionType == RoleConfigActionType.REMOVE_ROLE) {
                (bytes32 roleHash) = abi.decode(action.data, (bytes32));
                _removeRole(roleHash);

                emit RoleConfigApplied(
                    RoleConfigActionType.REMOVE_ROLE,
                    roleHash,
                    bytes4(0),
                    ""
                );
            } else if (action.actionType == RoleConfigActionType.ADD_WALLET) {
                (bytes32 roleHash, address wallet) = abi.decode(action.data, (bytes32, address));
                _addWalletToRole(roleHash, wallet);

                emit RoleConfigApplied(
                    RoleConfigActionType.ADD_WALLET,
                    roleHash,
                    bytes4(0),
                    "" // optional: abi.encode(wallet)
                );
            } else if (action.actionType == RoleConfigActionType.REVOKE_WALLET) {
                (bytes32 roleHash, address wallet) = abi.decode(action.data, (bytes32, address));
                _revokeWallet(roleHash, wallet);

                emit RoleConfigApplied(
                    RoleConfigActionType.REVOKE_WALLET,
                    roleHash,
                    bytes4(0),
                    "" // optional: abi.encode(wallet)
                );
            } else if (action.actionType == RoleConfigActionType.REGISTER_FUNCTION) {
                (
                    string memory functionSignature,
                    string memory operationName,
                    StateAbstraction.TxAction[] memory supportedActions
                ) = abi.decode(action.data, (string, string, StateAbstraction.TxAction[]));

                bytes4 functionSelector =
                    _registerFunction(functionSignature, operationName, supportedActions);

                emit RoleConfigApplied(
                    RoleConfigActionType.REGISTER_FUNCTION,
                    bytes32(0),
                    functionSelector,
                    "" // optional: abi.encode(operationName)
                );
            } else if (action.actionType == RoleConfigActionType.UNREGISTER_FUNCTION) {
                (bytes4 functionSelector, bool safeRemoval) = abi.decode(action.data, (bytes4, bool));
                _unregisterFunction(functionSelector, safeRemoval);

                emit RoleConfigApplied(
                    RoleConfigActionType.UNREGISTER_FUNCTION,
                    bytes32(0),
                    functionSelector,
                    ""
                );
            } else if (action.actionType == RoleConfigActionType.ADD_FUNCTION_TO_ROLE) {
                (
                    bytes32 roleHash,
                    StateAbstraction.FunctionPermission memory functionPermission
                ) = abi.decode(action.data, (bytes32, StateAbstraction.FunctionPermission));

                _addFunctionToRole(roleHash, functionPermission);

                emit RoleConfigApplied(
                    RoleConfigActionType.ADD_FUNCTION_TO_ROLE,
                    roleHash,
                    functionPermission.functionSelector,
                    ""
                );
            } else if (action.actionType == RoleConfigActionType.REMOVE_FUNCTION_FROM_ROLE) {
                (bytes32 roleHash, bytes4 functionSelector) = abi.decode(action.data, (bytes32, bytes4));
                _removeFunctionFromRole(roleHash, functionSelector);

                emit RoleConfigApplied(
                    RoleConfigActionType.REMOVE_FUNCTION_FROM_ROLE,
                    roleHash,
                    functionSelector,
                    ""
                );
            } else if (action.actionType == RoleConfigActionType.LOAD_DEFINITIONS) {
                (
                    StateAbstraction.FunctionSchema[] memory functionSchemas,
                    bytes32[] memory roleHashes,
                    StateAbstraction.FunctionPermission[] memory functionPermissions
                ) = abi.decode(
                        action.data,
                        (StateAbstraction.FunctionSchema[], bytes32[], StateAbstraction.FunctionPermission[])
                    );

                _loadDynamicDefinitions(functionSchemas, roleHashes, functionPermissions);

                emit RoleConfigApplied(
                    RoleConfigActionType.LOAD_DEFINITIONS,
                    bytes32(0),
                    bytes4(0),
                    abi.encode(functionSchemas.length, roleHashes.length)
                );
            } else {
                revert SharedValidation.NotSupported();
            }
        }
    }

    /**
     * @dev Loads function schemas and role permissions dynamically at runtime
     * @param functionSchemas Array of function schema definitions to load
     * @param roleHashes Array of role hashes to add permissions to
     * @param functionPermissions Array of function permissions (parallel to roleHashes)
     * @notice Only non-protected function schemas can be loaded dynamically
     */
    function _loadDynamicDefinitions(
        StateAbstraction.FunctionSchema[] memory functionSchemas,
        bytes32[] memory roleHashes,
        StateAbstraction.FunctionPermission[] memory functionPermissions
    ) internal {
        // Validate array lengths match
        SharedValidation.validateArrayLengthMatch(roleHashes.length, functionPermissions.length);
        
        // Validate that all function schemas are non-protected
        // Note: FunctionSchema.supportedActionsBitmap must already be set (not an array)
        // The bitmap is expected to be pre-converted from actions array if needed
        for (uint256 i = 0; i < functionSchemas.length; i++) {
            if (functionSchemas[i].isProtected) {
                revert SharedValidation.CannotRemoveProtected(bytes32(functionSchemas[i].functionSelector));
            }
        }
        
        // Validate that all target roles exist and are non-protected
        for (uint256 i = 0; i < roleHashes.length; i++) {
            StateAbstraction.Role storage role = _getSecureState().roles[roleHashes[i]];
            if (role.roleHash == bytes32(0)) {
                revert SharedValidation.ResourceNotFound(roleHashes[i]);
            }
            if (role.isProtected) {
                revert SharedValidation.CannotRemoveProtected(roleHashes[i]);
            }
        }
        
        // Call the base implementation
        _loadDefinitions(functionSchemas, roleHashes, functionPermissions);
    }

    // ============ INTERNAL ROLE / FUNCTION HELPERS ============

    function _createNewRole(
        string memory roleName,
        uint256 maxWallets,
        StateAbstraction.FunctionPermission[] memory functionPermissions
    ) internal returns (bytes32 roleHash) {
        SharedValidation.validateRoleNameNotEmpty(roleName);
        SharedValidation.validateMaxWalletsGreaterThanZero(maxWallets);

        roleHash = keccak256(bytes(roleName));

        // Create the role in the secure state with isProtected = false
        StateAbstraction.createRole(_getSecureState(), roleName, maxWallets, false);

        // Add all function permissions to the role
        // NOTE: Function schemas must be registered BEFORE adding permissions to roles
        // This is the same pattern used in _loadDefinitions: schemas first, then permissions
        // The function selectors in functionPermissions must exist in supportedFunctionsSet
        // (they should be registered during initialize() via RuntimeRBACDefinitions)
        // 
        // CRITICAL: The order matters - _loadDefinitions loads schemas FIRST, then permissions
        // In _createNewRole, we assume schemas are already registered (from initialize)
        // If schemas aren't registered, addFunctionToRole will revert with ResourceNotFound
        for (uint256 i = 0; i < functionPermissions.length; i++) {
            // Add function permission to role
            // addFunctionToRole will check:
            // 1. Role exists in supportedRolesSet (✅ just created)
            // 2. Function selector exists in supportedFunctionsSet (must be registered during initialize)
            // 3. Actions are supported by function schema (via _validateMetaTxPermissions)
            StateAbstraction.addFunctionToRole(_getSecureState(), roleHash, functionPermissions[i]);
        }
    }

    function _removeRole(bytes32 roleHash) internal {
        _ensureRoleNotProtected(roleHash);

        StateAbstraction.removeRole(_getSecureState(), roleHash);
    }

    function _addWalletToRole(bytes32 roleHash, address wallet) internal {
        StateAbstraction.assignWallet(_getSecureState(), roleHash, wallet);
    }

    function _revokeWallet(bytes32 roleHash, address wallet) internal {
        StateAbstraction.revokeWallet(_getSecureState(), roleHash, wallet);
    }

    /**
     * @dev Validates that a role is not protected
     */
    function _ensureRoleNotProtected(bytes32 roleHash) internal view {
        StateAbstraction.Role storage role = _getSecureState().roles[roleHash];
        if (role.roleHash == bytes32(0)) {
            revert SharedValidation.ResourceNotFound(roleHash);
        }
        if (role.isProtected) {
            revert SharedValidation.CannotRemoveProtected(roleHash);
        }
    }

    function _registerFunction(
        string memory functionSignature,
        string memory operationName,
        StateAbstraction.TxAction[] memory supportedActions
    ) internal returns (bytes4 functionSelector) {
        // Derive function selector from signature
        functionSelector = bytes4(keccak256(bytes(functionSignature)));

        // Validate that function schema doesn't already exist
        if (functionSchemaExists(functionSelector)) {
            revert SharedValidation.ResourceAlreadyExists(bytes32(functionSelector));
        }

        // Derive operation type from name
        bytes32 operationType = keccak256(bytes(operationName));

        // Convert actions array to bitmap
        uint16 supportedActionsBitmap = StateAbstraction.createBitmapFromActions(supportedActions);

        // Create function schema directly (always non-protected)
        StateAbstraction.createFunctionSchema(
            _getSecureState(),
            functionSignature,
            functionSelector,
            operationType,
            operationName,
            supportedActionsBitmap,
            false // isProtected = false for dynamically registered functions
        );
    }

    function _unregisterFunction(bytes4 functionSelector, bool safeRemoval) internal {
        // Load schema and validate it exists
        StateAbstraction.FunctionSchema storage schema = _getSecureState().functions[functionSelector];
        if (schema.functionSelector != functionSelector) {
            revert SharedValidation.ResourceNotFound(bytes32(functionSelector));
        }

        // Ensure not protected
        if (schema.isProtected) {
            revert SharedValidation.CannotRemoveProtected(bytes32(functionSelector));
        }

        // The safeRemoval check is now handled within StateAbstraction.removeFunctionSchema
        // (avoids getSupportedRolesList/getRoleFunctionPermissions which call _validateAnyRole;
        // during meta-tx execution msg.sender is the contract, causing NoPermission)
        StateAbstraction.removeFunctionSchema(_getSecureState(), functionSelector, safeRemoval);
    }

    /**
     * @dev Adds a function permission to an existing role
     * @param roleHash The role hash to add the function permission to
     * @param functionPermission The function permission to add
     * @notice StateAbstraction.addFunctionToRole validates that the role exists and the function is registered
     */
    function _addFunctionToRole(
        bytes32 roleHash,
        StateAbstraction.FunctionPermission memory functionPermission
    ) internal {
        StateAbstraction.addFunctionToRole(_getSecureState(), roleHash, functionPermission);
    }

    /**
     * @dev Removes a function permission from an existing role
     * @param roleHash The role hash to remove the function permission from
     * @param functionSelector The function selector to remove from the role
     * @notice StateAbstraction.removeFunctionFromRole validates that the role exists and prevents removing protected functions
     */
    function _removeFunctionFromRole(
        bytes32 roleHash,
        bytes4 functionSelector
    ) internal {
        StateAbstraction.removeFunctionFromRole(_getSecureState(), roleHash, functionSelector);
    }

}
