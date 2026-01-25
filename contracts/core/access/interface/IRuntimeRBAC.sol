// SPDX-License-Identifier: MPL-2.0
pragma solidity 0.8.33;

import "../../lib/StateAbstraction.sol";

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
 * - Integration with StateAbstraction for secure operations
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
     * @param actionType The type of configuration action
     * @param roleHash Affected role hash (if applicable, otherwise 0)
     * @param functionSelector Affected function selector (if applicable, otherwise 0)
     * @param data Optional action-specific payload
     */
    event RoleConfigApplied(
        RoleConfigActionType indexed actionType,
        bytes32 indexed roleHash,
        bytes4 indexed functionSelector,
        bytes data
    );

    // ============ ROLE CONFIGURATION BATCH INTERFACE ============

    /**
     * @dev Creates execution params for a RBAC configuration batch
     * @param actions Encoded role configuration actions
     * @return The execution params for StateAbstraction
     */
    function roleConfigBatchExecutionParams(
        RoleConfigAction[] memory actions
    ) external pure returns (bytes memory);

    /**
     * @dev Requests and approves a RBAC configuration batch using a meta-transaction
     * @param metaTx The meta-transaction
     * @return The transaction record
     */
    function roleConfigBatchRequestAndApprove(
        StateAbstraction.MetaTransaction memory metaTx
    ) external returns (StateAbstraction.TxRecord memory);

    // ============ QUERY FUNCTIONS ============

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
    );

    /**
     * @dev Gets all authorized wallets for a role
     * @param roleHash The role hash to get wallets for
     * @return Array of authorized wallet addresses
     * @notice Requires caller to have any role (via _validateAnyRole) for privacy protection
     */
    function getWalletsInRole(bytes32 roleHash) external view returns (address[] memory);
}
