// SPDX-License-Identifier: MPL-2.0
pragma solidity ^0.8.25;

import "../../base/lib/StateAbstraction.sol";

/**
 * @title IDynamicRBAC
 * @dev Interface for Dynamic Role-Based Access Control system
 * 
 * This interface defines the standard functions for managing dynamic roles
 * in a secure multi-phase operation environment. It provides:
 * 
 * - Dynamic role creation and management
 * - Role-based permission assignment
 * - Wallet assignment to roles
 * - Role hierarchy and inheritance
 * - Integration with StateAbstraction for secure operations
 * 
 * The interface supports both protected and non-protected roles,
 * allowing for flexible access control management.
 */
interface IDynamicRBAC {
    // Events
    event RoleCreated(bytes32 indexed roleHash, string roleName, uint256 maxWallets, bool isProtected);
    event RoleUpdated(bytes32 indexed roleHash, string newRoleName, uint256 newMaxWallets);
    event WalletAddedToRole(bytes32 indexed roleHash, address indexed wallet);
    event WalletRemovedFromRole(bytes32 indexed roleHash, address indexed wallet);
    event RoleDeleted(bytes32 indexed roleHash);
    event FunctionPermissionAdded(bytes32 indexed roleHash, bytes4 indexed functionSelector, StateAbstraction.TxAction action);
    event FunctionPermissionRemoved(bytes32 indexed roleHash, bytes4 indexed functionSelector);

    // Role Management Functions
    /**
     * @dev Creates a new dynamic role (always non-protected)
     * @param roleName The name of the role to create
     * @param maxWallets Maximum number of wallets allowed for this role
     * @return The hash of the created role
     */
    function createRole(
        string memory roleName,
        uint256 maxWallets
    ) external returns (bytes32);

    /**
     * @dev Updates an existing role's properties
     * @param roleHash The hash of the role to update
     * @param newRoleName The new name for the role
     * @param newMaxWallets The new maximum number of wallets
     */
    function updateRole(
        bytes32 roleHash,
        string memory newRoleName,
        uint256 newMaxWallets
    ) external;

    /**
     * @dev Deletes a non-protected role
     * @param roleHash The hash of the role to delete
     */
    function deleteRole(bytes32 roleHash) external;

    // Wallet Management Functions
    /**
     * @dev Adds a wallet to a role
     * @param roleHash The hash of the role
     * @param wallet The wallet address to add
     */
    function addWalletToRole(bytes32 roleHash, address wallet) external;

    /**
     * @dev Removes a wallet from a role
     * @param roleHash The hash of the role
     * @param wallet The wallet address to remove
     */
    function revokeWallet(bytes32 roleHash, address wallet) external;

    /**
     * @dev Replaces a wallet in a role with a new wallet
     * @param roleHash The hash of the role
     * @param newWallet The new wallet address
     * @param oldWallet The old wallet address to replace
     */
    function replaceWalletInRole(
        bytes32 roleHash,
        address newWallet,
        address oldWallet
    ) external;

    // Permission Management Functions
    /**
     * @dev Adds a function permission to a role
     * @param roleHash The hash of the role
     * @param functionSelector The function selector to grant permission for
     * @param action The action type to grant
     */
    function addFunctionPermissionToRole(
        bytes32 roleHash,
        bytes4 functionSelector,
        StateAbstraction.TxAction action
    ) external;

    /**
     * @dev Removes a function permission from a role
     * @param roleHash The hash of the role
     * @param functionSelector The function selector to remove permission for
     */
    function removeFunctionPermissionFromRole(
        bytes32 roleHash,
        bytes4 functionSelector
    ) external;

    // Query Functions
    /**
     * @dev Gets all dynamic roles (non-protected roles)
     * @return Array of role hashes
     */
    function getDynamicRoles() external view returns (bytes32[] memory);

    /**
     * @dev Gets all roles (including protected roles)
     * @return Array of role hashes
     */
    function getAllRoles() external view returns (bytes32[] memory);

    /**
     * @dev Gets role information
     * @param roleHash The hash of the role
     * @return roleName The name of the role
     * @return maxWallets The maximum number of wallets allowed
     * @return isProtected Whether the role is protected
     * @return authorizedWallets Array of authorized wallet addresses
     */
    function getRoleInfo(bytes32 roleHash) external view returns (
        string memory roleName,
        uint256 maxWallets,
        bool isProtected,
        address[] memory authorizedWallets
    );

    /**
     * @dev Checks if a wallet has a specific role
     * @param roleHash The hash of the role
     * @param wallet The wallet address to check
     * @return True if the wallet has the role, false otherwise
     */
    function hasRole(bytes32 roleHash, address wallet) external view returns (bool);

    /**
     * @dev Gets all wallets in a role
     * @param roleHash The hash of the role
     * @return Array of wallet addresses
     */
    function getWalletsInRole(bytes32 roleHash) external view returns (address[] memory);

    /**
     * @dev Gets all function permissions for a role
     * @param roleHash The hash of the role
     * @return functionSelectors Array of function selectors
     * @return actions Array of granted actions
     */
    function getRolePermissions(bytes32 roleHash) external view returns (
        bytes4[] memory functionSelectors,
        StateAbstraction.TxAction[] memory actions
    );

    /**
     * @dev Checks if a role exists
     * @param roleHash The hash of the role
     * @return True if the role exists, false otherwise
     */
    function roleExists(bytes32 roleHash) external view returns (bool);

    /**
     * @dev Checks if a role is protected
     * @param roleHash The hash of the role
     * @return True if the role is protected, false otherwise
     */
    function isRoleProtected(bytes32 roleHash) external view returns (bool);

    /**
     * @dev Gets the number of wallets in a role
     * @param roleHash The hash of the role
     * @return The number of wallets currently assigned to the role
     */
    function getRoleWalletCount(bytes32 roleHash) external view returns (uint256);

    /**
     * @dev Checks if a role has reached its maximum wallet limit
     * @param roleHash The hash of the role
     * @return True if the role is at capacity, false otherwise
     */
    function isRoleAtCapacity(bytes32 roleHash) external view returns (bool);
}
