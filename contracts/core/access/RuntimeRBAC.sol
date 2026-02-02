// SPDX-License-Identifier: MPL-2.0
pragma solidity 0.8.33;

// Contract imports
import "../base/BaseStateMachine.sol";
import "../lib/EngineBlox.sol";
import "../../utils/SharedValidation.sol";
import "./lib/definitions/RuntimeRBACDefinitions.sol";
import "../../interfaces/IDefinition.sol";
import "./interface/IRuntimeRBAC.sol";

/**
 * @title RuntimeRBAC
 * @dev Minimal Runtime Role-Based Access Control system based on EngineBlox
 * 
 * This contract provides essential runtime RBAC functionality:
 * - Creation of non-protected roles
 * - Basic wallet assignment to roles
 * - Function permission management per role
 * - Integration with EngineBlox for secure operations
 * 
 * Key Features:
 * - Only non-protected roles can be created dynamically
 * - Protected roles (OWNER, BROADCASTER, RECOVERY) are managed by SecureOwnable
 * - Minimal interface for core RBAC operations
 * - Essential role management functions only
 */
abstract contract RuntimeRBAC is BaseStateMachine {
    using EngineBlox for EngineBlox.SecureOperationState;
    using SharedValidation for *;

    /**
     * @dev Action types for batched RBAC configuration (must match IRuntimeRBAC for encoding)
     */
    enum RoleConfigActionType {
        CREATE_ROLE,
        REMOVE_ROLE,
        ADD_WALLET,
        REVOKE_WALLET,
        ADD_FUNCTION_TO_ROLE,
        REMOVE_FUNCTION_FROM_ROLE
    }

    /**
     * @dev Encodes a single RBAC configuration action in a batch (must match IRuntimeRBAC for encoding)
     */
    struct RoleConfigAction {
        RoleConfigActionType actionType;
        bytes data;
    }

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
            permissions.functionPermissions,
            true // Allow protected schemas for factory settings
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
     * @dev Requests and approves a RBAC configuration batch using a meta-transaction
     * @param metaTx The meta-transaction
     * @return The transaction record
     * @notice OWNER signs, BROADCASTER executes according to RuntimeRBACDefinitions
     */
    function roleConfigBatchRequestAndApprove(
        EngineBlox.MetaTransaction memory metaTx
    ) public returns (EngineBlox.TxRecord memory) {
        _validateBroadcaster(msg.sender);
        return _requestAndApproveTransaction(metaTx);
    }

    /**
     * @dev External function that can only be called by the contract itself to execute a RBAC configuration batch
     * @param actions Encoded role configuration actions
     */
    function executeRoleConfigBatch(RoleConfigAction[] calldata actions) external {
        _validateExecuteBySelf();
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
        EngineBlox.TxAction[] memory supportedActions,
        bool isProtected
    ) {
        EngineBlox.FunctionSchema storage schema = _getSecureState().functions[functionSelector];
        if (schema.functionSelector != functionSelector) {
            revert SharedValidation.ResourceNotFound(bytes32(functionSelector));
        }
        
        // Convert bitmap to array
        supportedActions = _convertBitmapToActions(schema.supportedActionsBitmap);
        
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
     * @dev Reverts if the role is protected (prevents editing OWNER, BROADCASTER, RECOVERY via batch).
     * @param roleHash The role hash to check
     */
    function _requireRoleNotProtected(bytes32 roleHash) internal view {
        if (_getSecureState().roles[roleHash].isProtected) {
            revert SharedValidation.CannotModifyProtected(roleHash);
        }
    }

    /**
     * @dev Internal helper to execute a RBAC configuration batch
     * @param actions Encoded role configuration actions
     */
    function _executeRoleConfigBatch(RoleConfigAction[] calldata actions) internal {
        _validateBatchSize(actions.length);

        for (uint256 i = 0; i < actions.length; i++) {
            RoleConfigAction calldata action = actions[i];

            if (action.actionType == RoleConfigActionType.CREATE_ROLE) {
                // Decode CREATE_ROLE action data
                // Format: (string roleName, uint256 maxWallets, FunctionPermission[] functionPermissions)
                // FunctionPermission is struct(bytes4 functionSelector, uint16 grantedActionsBitmap, bytes4 handlerForSelector)
                // When encoding from JavaScript, it's encoded as tuple(bytes4,uint16,bytes4)[]
                // Solidity can decode tuple[] directly into struct[] if the layout matches
                (
                    string memory roleName,
                    uint256 maxWallets,
                    EngineBlox.FunctionPermission[] memory functionPermissions
                ) = abi.decode(action.data, (string, uint256, EngineBlox.FunctionPermission[]));

                bytes32 roleHash = _createNewRole(roleName, maxWallets, functionPermissions);

                _logComponentEvent(_encodeRoleConfigEvent(RoleConfigActionType.CREATE_ROLE, roleHash, bytes4(0)));
            } else if (action.actionType == RoleConfigActionType.REMOVE_ROLE) {
                (bytes32 roleHash) = abi.decode(action.data, (bytes32));
                _removeRole(roleHash);

                _logComponentEvent(_encodeRoleConfigEvent(RoleConfigActionType.REMOVE_ROLE, roleHash, bytes4(0)));
            } else if (action.actionType == RoleConfigActionType.ADD_WALLET) {
                (bytes32 roleHash, address wallet) = abi.decode(action.data, (bytes32, address));
                _requireRoleNotProtected(roleHash);
                _assignWallet(roleHash, wallet);

                _logComponentEvent(_encodeRoleConfigEvent(RoleConfigActionType.ADD_WALLET, roleHash, bytes4(0)));
            } else if (action.actionType == RoleConfigActionType.REVOKE_WALLET) {
                (bytes32 roleHash, address wallet) = abi.decode(action.data, (bytes32, address));
                _requireRoleNotProtected(roleHash);
                _revokeWallet(roleHash, wallet);

                _logComponentEvent(_encodeRoleConfigEvent(RoleConfigActionType.REVOKE_WALLET, roleHash, bytes4(0)));
            } else if (action.actionType == RoleConfigActionType.ADD_FUNCTION_TO_ROLE) {
                (
                    bytes32 roleHash,
                    EngineBlox.FunctionPermission memory functionPermission
                ) = abi.decode(action.data, (bytes32, EngineBlox.FunctionPermission));

                _addFunctionToRole(roleHash, functionPermission);

                _logComponentEvent(_encodeRoleConfigEvent(RoleConfigActionType.ADD_FUNCTION_TO_ROLE, roleHash, functionPermission.functionSelector));
            } else if (action.actionType == RoleConfigActionType.REMOVE_FUNCTION_FROM_ROLE) {
                (bytes32 roleHash, bytes4 functionSelector) = abi.decode(action.data, (bytes32, bytes4));
                _removeFunctionFromRole(roleHash, functionSelector);

                _logComponentEvent(_encodeRoleConfigEvent(RoleConfigActionType.REMOVE_FUNCTION_FROM_ROLE, roleHash, functionSelector));
            } else {
                revert SharedValidation.NotSupported();
            }
        }
    }

    /**
     * @dev Encodes RBAC config event payload for ComponentEvent. Decode as (RoleConfigActionType, bytes32 roleHash, bytes4 functionSelector).
     */
    function _encodeRoleConfigEvent(RoleConfigActionType action, bytes32 roleHash, bytes4 selector) internal pure returns (bytes memory) {
        return abi.encode(action, roleHash, selector);
    }

    // ============ INTERNAL ROLE / FUNCTION HELPERS ============

    function _createNewRole(
        string memory roleName,
        uint256 maxWallets,
        EngineBlox.FunctionPermission[] memory functionPermissions
    ) internal returns (bytes32 roleHash) {
        SharedValidation.validateRoleNameNotEmpty(roleName);
        SharedValidation.validateMaxWalletsGreaterThanZero(maxWallets);

        roleHash = keccak256(bytes(roleName));

        // Create the role in the secure state with isProtected = false
        _createRole(roleName, maxWallets, false);

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
            _addFunctionToRole(roleHash, functionPermissions[i]);
        }
    }

}
