// SPDX-License-Identifier: MPL-2.0
pragma solidity ^0.8.25;

// Contract imports
import "../base/BaseStateMachine.sol";
import "../base/lib/StateAbstraction.sol";
import "../../utils/SharedValidation.sol";
import "./lib/definitions/DynamicRBACDefinitions.sol";
import "../../interfaces/IDefinition.sol";

/**
 * @title DynamicRBAC
 * @dev Minimal Dynamic Role-Based Access Control system based on StateAbstraction
 * 
 * This contract provides essential dynamic RBAC functionality:
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
abstract contract DynamicRBAC is BaseStateMachine {
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
     * @notice Initializer to initialize DynamicRBAC
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
        
        // Load DynamicRBAC-specific definitions
        IDefinition.RolePermission memory permissions = DynamicRBACDefinitions.getRolePermissions();
        _loadDefinitions(
            DynamicRBACDefinitions.getFunctionSchemas(),
            permissions.roleHashes,
            permissions.functionPermissions
        );
    }

    // ============ ROLE CONFIGURATION BATCH INTERFACE ============

    /**
     * @dev Creates execution options for a RBAC configuration batch
     * @param actions Encoded role configuration actions
     * @return The execution options for StateAbstraction
     */
    function roleConfigBatchExecutionOptions(
        RoleConfigAction[] memory actions
    ) public pure returns (bytes memory) {
        return _createStandardExecutionOptions(
            DynamicRBACDefinitions.ROLE_CONFIG_BATCH_EXECUTE_SELECTOR,
            abi.encode(actions)
        );
    }

    /**
     * @dev Requests and approves a RBAC configuration batch using a meta-transaction
     * @param metaTx The meta-transaction
     * @return The transaction record
     * @notice OWNER signs, BROADCASTER executes according to DynamicRBACDefinitions
     */
    function roleConfigBatchRequestAndApprove(
        StateAbstraction.MetaTransaction memory metaTx
    ) public onlyBroadcaster returns (StateAbstraction.TxRecord memory) {
        return _requestAndApproveTransaction(
            metaTx,
            DynamicRBACDefinitions.ROLE_CONFIG_BATCH_META_SELECTOR,
            StateAbstraction.TxAction.EXECUTE_META_REQUEST_AND_APPROVE
        );
    }

    /**
     * @dev External function that can only be called by the contract itself to execute a RBAC configuration batch
     * @param actions Encoded role configuration actions
     */
    function executeRoleConfigBatch(RoleConfigAction[] calldata actions) external {
        SharedValidation.validateInternalCallInternal(address(this));
        _executeRoleConfigBatch(actions);
    }

    // Essential Query Functions Only
    /**
     * @dev Checks if a role exists
     * @param roleHash The hash of the role
     * @return True if the role exists, false otherwise
     */
    function roleExists(bytes32 roleHash) external view returns (bool) {
        return _getSecureState().getRole(roleHash).roleHash != bytes32(0);
    }

    /**
     * @dev Gets function schema information
     * @param functionSelector The function selector to get information for
     * @return functionName The name of the function
     * @return functionSelectorReturn The function selector
     * @return operationType The operation type
     * @return operationName The operation name
     * @return supportedActions The supported actions
     * @return isProtected Whether the function schema is protected
     */
    function getFunctionSchema(bytes4 functionSelector) external view returns (
        string memory functionName,
        bytes4 functionSelectorReturn,
        bytes32 operationType,
        string memory operationName,
        StateAbstraction.TxAction[] memory supportedActions,
        bool isProtected
    ) {
        StateAbstraction.FunctionSchema storage schema = _getSecureState().functions[functionSelector];
        if (schema.functionSelector != functionSelector) {
            revert SharedValidation.FunctionError(functionSelector);
        }
        
        // Convert bitmap to array
        supportedActions = _convertBitmapToActions(schema.supportedActionsBitmap);
        
        return (
            schema.functionName,
            schema.functionSelector,
            schema.operationType,
            schema.operationName,
            supportedActions,
            schema.isProtected
        );
    }

    // ============ HELPER FUNCTIONS ============

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
        // Convert supportedActions arrays to bitmaps
        for (uint256 i = 0; i < functionSchemas.length; i++) {
            if (functionSchemas[i].isProtected) {
                revert SharedValidation.CannotModifyProtectedRoles();
            }
            // Convert supportedActions array to bitmap
            // Note: functionSchemas[i].supportedActions is passed as array but we need bitmap
            // This will be handled in _loadDefinitions via createFunctionSchema
        }
        
        // Validate that all target roles exist and are non-protected
        for (uint256 i = 0; i < roleHashes.length; i++) {
            StateAbstraction.Role storage role = _getSecureState().getRole(roleHashes[i]);
            if (role.roleHash == bytes32(0)) {
                revert SharedValidation.RoleEmpty();
            }
            if (role.isProtected) {
                revert SharedValidation.CannotModifyProtectedRoles();
            }
        }
        
        // Call the base implementation
        _loadDefinitions(functionSchemas, roleHashes, functionPermissions);
    }

    /**
     * @dev Internal helper to execute a RBAC configuration batch
     * @param actions Encoded role configuration actions
     */
    function _executeRoleConfigBatch(RoleConfigAction[] calldata actions) internal {
        for (uint256 i = 0; i < actions.length; i++) {
            RoleConfigAction calldata action = actions[i];

            if (action.actionType == RoleConfigActionType.CREATE_ROLE) {
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
                revert SharedValidation.OperationNotSupported();
            }
        }
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
        for (uint256 i = 0; i < functionPermissions.length; i++) {
            StateAbstraction.addFunctionToRole(_getSecureState(), roleHash, functionPermissions[i]);
        }
    }

    function _removeRole(bytes32 roleHash) internal {
        _ensureRoleNotProtected(roleHash);

        StateAbstraction.removeRole(_getSecureState(), roleHash);
    }

    function _addWalletToRole(bytes32 roleHash, address wallet) internal {
        _ensureRoleNotProtected(roleHash);

        StateAbstraction.assignWallet(_getSecureState(), roleHash, wallet);
    }

    function _revokeWallet(bytes32 roleHash, address wallet) internal {
        StateAbstraction.revokeWallet(_getSecureState(), roleHash, wallet);
    }

    /**
     * @dev Validates that a role is not protected
     */
    function _ensureRoleNotProtected(bytes32 roleHash) internal view {
        if (_getSecureState().getRole(roleHash).isProtected) {
            revert SharedValidation.CannotModifyProtectedRoles();
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
            revert SharedValidation.FunctionError(functionSelector);
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
        // Validate function exists
        if (!functionSchemaExists(functionSelector)) {
            revert SharedValidation.FunctionError(functionSelector);
        }

        // Ensure not protected
        StateAbstraction.FunctionSchema storage schema = _getSecureState().functions[functionSelector];
        if (schema.isProtected) {
            revert SharedValidation.CannotModifyProtectedRoles();
        }

        // If safeRemoval is requested, ensure no role currently references this function
        if (safeRemoval) {
            bytes32[] memory roles = _getSecureState().getSupportedRolesList();
            for (uint256 i = 0; i < roles.length; i++) {
                StateAbstraction.FunctionPermission[] memory perms =
                    _getSecureState().getRoleFunctionPermissions(roles[i]);
                for (uint256 j = 0; j < perms.length; j++) {
                    if (perms[j].functionSelector == functionSelector) {
                        revert SharedValidation.FunctionError(functionSelector);
                    }
                }
            }
        }

        StateAbstraction.removeFunctionSchema(_getSecureState(), functionSelector);
    }

    /**
     * @dev Converts a bitmap to an array of TxActions
     * @param bitmap The bitmap to convert
     * @return Array of TxActions represented by the bitmap
     */
    function _convertBitmapToActions(uint16 bitmap) internal pure returns (StateAbstraction.TxAction[] memory) {
        // Count how many actions are set
        uint256 count = 0;
        for (uint8 i = 0; i < 16; i++) {
            if ((bitmap & (1 << i)) != 0) {
                count++;
            }
        }
        
        // Create array and populate it
        StateAbstraction.TxAction[] memory actions = new StateAbstraction.TxAction[](count);
        uint256 index = 0;
        for (uint8 i = 0; i < 16; i++) {
            if ((bitmap & (1 << i)) != 0) {
                actions[index] = StateAbstraction.TxAction(i);
                index++;
            }
        }
        
        return actions;
    }

}
