// SPDX-License-Identifier: MPL-2.0
pragma solidity ^0.8.25;

import "../core/lib/StateAbstraction.sol";

/**
 * @dev Interface for definition contracts that provide operation types, function schemas, and role permissions
 * 
 * This interface allows contracts to dynamically load their configuration from external
 * definition contracts, enabling modular and extensible contract initialization.
 * 
 * Definition contracts should implement this interface to provide:
 * - Operation type definitions (what operations are supported)
 * - Function schema definitions (how functions are structured)
 * - Role permission definitions (who can do what)
 */
interface IDefinition {
    /**
     * @dev Struct to hold role permission data
     * @param roleHashes Array of role hashes
     * @param functionPermissions Array of function permissions (parallel to roleHashes)
     */
    struct RolePermission {
        bytes32[] roleHashes;
        StateAbstraction.FunctionPermission[] functionPermissions;
    }

    /**
     * @dev Returns all function schema definitions
     * @return Array of function schema definitions
     */
    function getFunctionSchemas() external pure returns (StateAbstraction.FunctionSchema[] memory);
    
    /**
     * @dev Returns all role hashes and their corresponding function permissions
     * @return RolePermission struct containing roleHashes and functionPermissions arrays
     */
    function getRolePermissions() external pure returns (RolePermission memory);
    
}
