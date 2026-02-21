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
        _initializeBaseStateMachine(initialOwner, broadcaster, recovery, timeLockPeriodSec, eventForwarder);

        // Load RuntimeRBAC-specific definitions
        IDefinition.RolePermission memory permissions = RuntimeRBACDefinitions.getRolePermissions();
        _loadDefinitions(
            RuntimeRBACDefinitions.getFunctionSchemas(),
            permissions.roleHashes,
            permissions.functionPermissions,
            true // Enforce all function schemas are protected
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
                _executeCreateRole(action.data);
            } else if (action.actionType == IRuntimeRBAC.RoleConfigActionType.REMOVE_ROLE) {
                _executeRemoveRole(action.data);
            } else if (action.actionType == IRuntimeRBAC.RoleConfigActionType.ADD_WALLET) {
                _executeAddWallet(action.data);
            } else if (action.actionType == IRuntimeRBAC.RoleConfigActionType.REVOKE_WALLET) {
                _executeRevokeWallet(action.data);
            } else if (action.actionType == IRuntimeRBAC.RoleConfigActionType.ADD_FUNCTION_TO_ROLE) {
                _executeAddFunctionToRole(action.data);
            } else if (action.actionType == IRuntimeRBAC.RoleConfigActionType.REMOVE_FUNCTION_FROM_ROLE) {
                _executeRemoveFunctionFromRole(action.data);
            } else {
                revert SharedValidation.NotSupported();
            }
        }
    }

    /**
     * @dev Executes CREATE_ROLE: creates a new non-protected role
     * @param data ABI-encoded (string roleName, uint256 maxWallets)
     */
    function _executeCreateRole(bytes calldata data) internal {
        (string memory roleName, uint256 maxWallets) = abi.decode(data, (string, uint256));
        bytes32 roleHash = _createRole(roleName, maxWallets, false);
        _logRoleConfigEvent(IRuntimeRBAC.RoleConfigActionType.CREATE_ROLE, roleHash, bytes4(0), address(0));
    }

    /**
     * @dev Executes REMOVE_ROLE: removes a role by hash
     * @param data ABI-encoded (bytes32 roleHash)
     */
    function _executeRemoveRole(bytes calldata data) internal {
        (bytes32 roleHash) = abi.decode(data, (bytes32));
        _removeRole(roleHash);
        _logRoleConfigEvent(IRuntimeRBAC.RoleConfigActionType.REMOVE_ROLE, roleHash, bytes4(0), address(0));
    }

    /**
     * @dev Executes ADD_WALLET: assigns a wallet to a role (role must not be protected)
     * @param data ABI-encoded (bytes32 roleHash, address wallet)
     */
    function _executeAddWallet(bytes calldata data) internal {
        (bytes32 roleHash, address wallet) = abi.decode(data, (bytes32, address));
        _requireRoleNotProtected(roleHash);
        _assignWallet(roleHash, wallet);
        _logRoleConfigEvent(IRuntimeRBAC.RoleConfigActionType.ADD_WALLET, roleHash, bytes4(0), wallet);
    }

    /**
     * @dev Executes REVOKE_WALLET: revokes a wallet from a role (role must not be protected)
     * @param data ABI-encoded (bytes32 roleHash, address wallet)
     */
    function _executeRevokeWallet(bytes calldata data) internal {
        (bytes32 roleHash, address wallet) = abi.decode(data, (bytes32, address));
        _requireRoleNotProtected(roleHash);
        _revokeWallet(roleHash, wallet);
        _logRoleConfigEvent(IRuntimeRBAC.RoleConfigActionType.REVOKE_WALLET, roleHash, bytes4(0), wallet);
    }

    /**
     * @dev Executes ADD_FUNCTION_TO_ROLE: adds a function permission to a role
     * @param data ABI-encoded (bytes32 roleHash, FunctionPermission functionPermission)
     */
    function _executeAddFunctionToRole(bytes calldata data) internal {
        (
            bytes32 roleHash,
            EngineBlox.FunctionPermission memory functionPermission
        ) = abi.decode(data, (bytes32, EngineBlox.FunctionPermission));
        _addFunctionToRole(roleHash, functionPermission);
        _logRoleConfigEvent(IRuntimeRBAC.RoleConfigActionType.ADD_FUNCTION_TO_ROLE, roleHash, functionPermission.functionSelector, address(0));
    }

    /**
     * @dev Executes REMOVE_FUNCTION_FROM_ROLE: removes a function permission from a role
     * @param data ABI-encoded (bytes32 roleHash, bytes4 functionSelector)
     */
    function _executeRemoveFunctionFromRole(bytes calldata data) internal {
        (bytes32 roleHash, bytes4 functionSelector) = abi.decode(data, (bytes32, bytes4));
        _removeFunctionFromRole(roleHash, functionSelector);
        _logRoleConfigEvent(IRuntimeRBAC.RoleConfigActionType.REMOVE_FUNCTION_FROM_ROLE, roleHash, functionSelector, address(0));
    }

    /**
     * @dev Encodes and logs a role config event via ComponentEvent. Payload decodes as (RoleConfigActionType, bytes32 roleHash, bytes4 functionSelector, address wallet).
     * @param action The role config action type
     * @param roleHash The role hash
     * @param selector The function selector (or zero for N/A)
     * @param wallet The wallet address (or zero for actions that do not apply to a wallet)
     */
    function _logRoleConfigEvent(IRuntimeRBAC.RoleConfigActionType action, bytes32 roleHash, bytes4 selector, address wallet) internal {
        _logComponentEvent(abi.encode(action, roleHash, selector, wallet));
    }
}
