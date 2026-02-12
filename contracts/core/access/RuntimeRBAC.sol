// SPDX-License-Identifier: MPL-2.0
pragma solidity 0.8.33;

// Contract imports
import "../base/BaseStateMachine.sol";
import "../lib/EngineBlox.sol";
import "../lib/utils/SharedValidation.sol";
import "./lib/definitions/RuntimeRBACDefinitions.sol";
import "../lib/interfaces/IDefinition.sol";
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
abstract contract RuntimeRBAC is BaseStateMachine, IRuntimeRBAC {
    using EngineBlox for EngineBlox.SecureOperationState;
    using SharedValidation for *;

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
    ) public returns (uint256) {
        _validateBroadcaster(msg.sender);
        EngineBlox.TxRecord memory txRecord = _requestAndApproveTransaction(metaTx);
        return txRecord.txId;
    }

    /**
     * @dev External function that can only be called by the contract itself to execute a RBAC configuration batch
     * @param actions Encoded role configuration actions
     */
    function executeRoleConfigBatch(IRuntimeRBAC.RoleConfigAction[] calldata actions) external {
        _validateExecuteBySelf();
        _executeRoleConfigBatch(actions);
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
    function _executeRoleConfigBatch(IRuntimeRBAC.RoleConfigAction[] calldata actions) internal {
        _validateBatchSize(actions.length);

        for (uint256 i = 0; i < actions.length; i++) {
            IRuntimeRBAC.RoleConfigAction calldata action = actions[i];

            if (action.actionType == IRuntimeRBAC.RoleConfigActionType.CREATE_ROLE) {
                // Decode CREATE_ROLE action data
                // Format: (string roleName, uint256 maxWallets)
                (
                    string memory roleName,
                    uint256 maxWallets
                ) = abi.decode(action.data, (string, uint256));

                // Create the role in the secure state with isProtected = false
                bytes32 roleHash = _createRole(roleName, maxWallets, false);

                _logComponentEvent(_encodeRoleConfigEvent(IRuntimeRBAC.RoleConfigActionType.CREATE_ROLE, roleHash, bytes4(0)));
            } else if (action.actionType == IRuntimeRBAC.RoleConfigActionType.REMOVE_ROLE) {
                // Decode REMOVE_ROLE action data
                // Format: (bytes32 roleHash)
                (bytes32 roleHash) = abi.decode(action.data, (bytes32));
                _removeRole(roleHash);

                _logComponentEvent(_encodeRoleConfigEvent(IRuntimeRBAC.RoleConfigActionType.REMOVE_ROLE, roleHash, bytes4(0)));
            } else if (action.actionType == IRuntimeRBAC.RoleConfigActionType.ADD_WALLET) {
                // Decode ADD_WALLET action data
                // Format: (bytes32 roleHash, address wallet)
                (bytes32 roleHash, address wallet) = abi.decode(action.data, (bytes32, address));
                _requireRoleNotProtected(roleHash);
                _assignWallet(roleHash, wallet);

                _logComponentEvent(_encodeRoleConfigEvent(IRuntimeRBAC.RoleConfigActionType.ADD_WALLET, roleHash, bytes4(0)));
            } else if (action.actionType == IRuntimeRBAC.RoleConfigActionType.REVOKE_WALLET) {
                // Decode REVOKE_WALLET action data
                // Format: (bytes32 roleHash, address wallet)
                (bytes32 roleHash, address wallet) = abi.decode(action.data, (bytes32, address));
                _requireRoleNotProtected(roleHash);
                _revokeWallet(roleHash, wallet);

                _logComponentEvent(_encodeRoleConfigEvent(IRuntimeRBAC.RoleConfigActionType.REVOKE_WALLET, roleHash, bytes4(0)));
            } else if (action.actionType == IRuntimeRBAC.RoleConfigActionType.ADD_FUNCTION_TO_ROLE) {
                // Decode ADD_FUNCTION_TO_ROLE action data
                // Format: (bytes32 roleHash, FunctionPermission functionPermission)
                (
                    bytes32 roleHash,
                    EngineBlox.FunctionPermission memory functionPermission
                ) = abi.decode(action.data, (bytes32, EngineBlox.FunctionPermission));

                _addFunctionToRole(roleHash, functionPermission);

                _logComponentEvent(_encodeRoleConfigEvent(IRuntimeRBAC.RoleConfigActionType.ADD_FUNCTION_TO_ROLE, roleHash, functionPermission.functionSelector));
            } else if (action.actionType == IRuntimeRBAC.RoleConfigActionType.REMOVE_FUNCTION_FROM_ROLE) {
                // Decode REMOVE_FUNCTION_FROM_ROLE action data
                // Format: (bytes32 roleHash, bytes4 functionSelector)
                (bytes32 roleHash, bytes4 functionSelector) = abi.decode(action.data, (bytes32, bytes4));
                _removeFunctionFromRole(roleHash, functionSelector);

                _logComponentEvent(_encodeRoleConfigEvent(IRuntimeRBAC.RoleConfigActionType.REMOVE_FUNCTION_FROM_ROLE, roleHash, functionSelector));
            } else {
                revert SharedValidation.NotSupported();
            }
        }
    }

    /**
     * @dev Encodes RBAC config event payload for ComponentEvent. Decode as (RoleConfigActionType, bytes32 roleHash, bytes4 functionSelector).
     */
    function _encodeRoleConfigEvent(IRuntimeRBAC.RoleConfigActionType action, bytes32 roleHash, bytes4 selector) internal pure returns (bytes memory) {
        return abi.encode(action, roleHash, selector);
    }
}
