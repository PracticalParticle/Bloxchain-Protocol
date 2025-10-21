// SPDX-License-Identifier: MPL-2.0
pragma solidity ^0.8.25;

// OpenZeppelin imports
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

// Contract imports
import "../../lib/StateAbstraction.sol";
import "../../utils/SharedValidation.sol";
import "../../lib/definitions/SecureOwnableDefinitions.sol";
import "../../lib/definitions/DynamicRBACDefinitions.sol";
import "../../interfaces/IDefinition.sol";
import "./SecureOwnable.sol";

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
abstract contract DynamicRBAC is Initializable, SecureOwnable {
    using StateAbstraction for StateAbstraction.SecureOperationState;
    using SharedValidation for *;
    
    // State variables
    bool public roleEditingEnabled;
    
    // Events
    event RoleCreated(bytes32 indexed roleHash, string roleName, uint256 maxWallets, bool isProtected);
    event WalletAddedToRole(bytes32 indexed roleHash, address indexed wallet);
    event WalletRemovedFromRole(bytes32 indexed roleHash, address indexed wallet);
    event RoleEditingToggled(bool enabled);



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
    ) public virtual override onlyInitializing {
        // Initialize SecureOwnable
        SecureOwnable.initialize(initialOwner, broadcaster, recovery, timeLockPeriodSec, eventForwarder);
        
        // Load DynamicRBAC-specific definitions
        IDefinition.RolePermission memory permissions = DynamicRBACDefinitions.getRolePermissions();
        _loadDefinitions(
            DynamicRBACDefinitions.getFunctionSchemas(),
            permissions.roleHashes,
            permissions.functionPermissions
        );
        
        // Initialize role editing as enabled by default
        roleEditingEnabled = true;
    }

    // Role Editing Control Functions
    /**
     * @dev Creates execution options for updating the role editing flag
     * @param enabled True to enable role editing, false to disable
     * @return The execution options
     */
    function updateRoleEditingToggleExecutionOptions(
        bool enabled
    ) public pure returns (bytes memory) {
        return _createStandardExecutionOptions(
            DynamicRBACDefinitions.ROLE_EDITING_TOGGLE_SELECTOR,
            abi.encode(enabled)
        );
    }

    /**
     * @dev Requests and approves a role editing toggle using a meta-transaction
     * @param metaTx The meta-transaction
     * @return The transaction record
     */
    function updateRoleEditingToggleRequestAndApprove(
        StateAbstraction.MetaTransaction memory metaTx
    ) public onlyBroadcaster returns (StateAbstraction.TxRecord memory) {
        return _requestAndApproveTransaction(
            metaTx,
            DynamicRBACDefinitions.ROLE_EDITING_TOGGLE_META_SELECTOR,
            StateAbstraction.TxAction.EXECUTE_META_REQUEST_AND_APPROVE
        );
    }

    // Core Role Management Functions
    /**
     * @dev Creates a new dynamic role with function permissions (always non-protected)
     * @param roleName The name of the role to create
     * @param maxWallets Maximum number of wallets allowed for this role
     * @param functionPermissions Array of function permissions to grant to the role
     * @return The hash of the created role
     * @notice Role becomes uneditable after creation - all permissions must be set at creation time
     */
    function createNewRole(
        string memory roleName,
        uint256 maxWallets,
        StateAbstraction.FunctionPermission[] memory functionPermissions
    ) external onlyOwner returns (bytes32) {
        // Validate that role editing is enabled
        if (!roleEditingEnabled) revert SharedValidation.RoleEditingDisabled();
        
        SharedValidation.validateRoleNameNotEmpty(roleName);
        SharedValidation.validateMaxWalletsGreaterThanZero(maxWallets);
        
        bytes32 roleHash = keccak256(bytes(roleName));
        
        // Create the role in the secure state with isProtected = false
        // StateAbstraction.createRole already validates role doesn't exist
        StateAbstraction.createRole(_getSecureState(), roleName, maxWallets, false);
        
        // Add all function permissions to the role
        for (uint i = 0; i < functionPermissions.length; i++) {
            StateAbstraction.addFunctionToRole(
                _getSecureState(), 
                roleHash, 
                functionPermissions[i]
            );
        }
        
        emit RoleCreated(roleHash, roleName, maxWallets, false);
        return roleHash;
    }

    /**
     * @dev Adds a wallet to a role
     * @param roleHash The hash of the role
     * @param wallet The wallet address to add
     */
    function addWalletToRole(bytes32 roleHash, address wallet) external onlyOwner {
        // Validate that role editing is enabled
        if (!roleEditingEnabled) revert SharedValidation.RoleEditingDisabled();
        
        // Validate that the role is not protected
        if (_getSecureState().getRole(roleHash).isProtected) revert SharedValidation.CannotModifyProtectedRoles();
        
        // StateAbstraction.assignWallet already validates:
        // - wallet is not zero address
        // - role exists
        // - role has capacity
        // - wallet is not already in role
        StateAbstraction.assignWallet(_getSecureState(), roleHash, wallet);
        emit WalletAddedToRole(roleHash, wallet);
    }

    /**
     * @dev Removes a wallet from a role
     * @param roleHash The hash of the role
     * @param wallet The wallet address to remove
     * @notice Security: Cannot remove the last wallet from a role to prevent empty roles
     */
    function revokeWallet(bytes32 roleHash, address wallet) external onlyOwner {
        // Validate that role editing is enabled
        if (!roleEditingEnabled) revert SharedValidation.RoleEditingDisabled();
        
        // Validate that the role is not protected
        if (_getSecureState().getRole(roleHash).isProtected) revert SharedValidation.CannotModifyProtectedRoles();
        
        // StateAbstraction.revokeWallet already validates:
        // - role exists
        // - wallet exists in role
        StateAbstraction.revokeWallet(_getSecureState(), roleHash, wallet);
        emit WalletRemovedFromRole(roleHash, wallet);
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
     * @dev External function that can only be called by the contract itself to execute role editing toggle
     * @param enabled True to enable role editing, false to disable
     */
    function executeRoleEditingToggle(bool enabled) external {
        SharedValidation.validateInternalCall(address(this));
        _toggleRoleEditing(enabled);
    }

    /**
     * @dev Internal function to toggle role editing
     * @param enabled True to enable role editing, false to disable
     */
    function _toggleRoleEditing(bool enabled) internal {
        roleEditingEnabled = enabled;
        emit RoleEditingToggled(enabled);
    }

}
