// SPDX-License-Identifier: MPL-2.0
pragma solidity 0.8.33;

import "../../lib/EngineBlox.sol";

/**
 * @title IRuntimeRBAC
 * @dev Interface for Runtime Role-Based Access Control system
 * 
 * This interface defines the functions for managing runtime roles through batch operations.
 * All role management operations are performed via the batch interface for atomic execution.
 * 
 * Key Features:
 * - Batch-based role configuration (atomic operations)
 * - Runtime function schema registration
 * - Integration with EngineBlox for secure operations
 * - Query functions for role and permission inspection
 * 
 * Note: This contract inherits from BaseStateMachine which provides additional query functions
 * such as getRole(), hasRole(), getActiveRolePermissions(), getSupportedRoles(), etc.
 */
interface IRuntimeRBAC {
    /**
     * @dev Action types for batched RBAC configuration
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
     * @dev Encodes a single RBAC configuration action in a batch
     */
    struct RoleConfigAction {
        RoleConfigActionType actionType;
        bytes data;
    }

    /// @dev RBAC config changes are emitted via BaseStateMachine.ComponentEvent with functionSelector = msg.sig (executeRoleConfigBatch). Decode data as (RoleConfigActionType, bytes32 roleHash, bytes4 functionSelector).

    // ============ ROLE CONFIGURATION BATCH INTERFACE ============

    /**
     * @dev Requests and approves a RBAC configuration batch using a meta-transaction
     * @param metaTx The meta-transaction
     * @return The transaction record
     */
    function roleConfigBatchRequestAndApprove(
        EngineBlox.MetaTransaction memory metaTx
    ) external returns (EngineBlox.TxRecord memory);

    /**
     * @dev Gets all authorized wallets for a role
     * @param roleHash The role hash to get wallets for
     * @return Array of authorized wallet addresses
     * @notice Requires caller to have any role (via _validateAnyRole) for privacy protection
     */
    function getWalletsInRole(bytes32 roleHash) external view returns (address[] memory);
}
