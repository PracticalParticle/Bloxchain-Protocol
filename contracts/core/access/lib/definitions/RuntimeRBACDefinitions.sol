// SPDX-License-Identifier: MPL-2.0
pragma solidity ^0.8.25;

import "../../../base/lib/StateAbstraction.sol";
import "../../../../interfaces/IDefinition.sol";

/**
 * @title RuntimeRBACDefinitions
 * @dev Library containing predefined definitions for RuntimeRBAC initialization
 * This library holds static data that can be used to initialize RuntimeRBAC contracts
 * without increasing the main contract size
 * 
 * This library implements the IDefinition interface from StateAbstraction
 * and provides a direct initialization function for RuntimeRBAC contracts
 */
library RuntimeRBACDefinitions {
    
    // Operation Type Constants
    bytes32 public constant ROLE_CONFIG_BATCH = keccak256("ROLE_CONFIG_BATCH");
    
    // Function Selector Constants
    // Internal execution entrypoint for RBAC configuration batches
    bytes4 public constant ROLE_CONFIG_BATCH_EXECUTE_SELECTOR =
        bytes4(keccak256("executeRoleConfigBatch((uint8,bytes)[])"));
    
    // Meta-transaction Function Selectors
    // roleConfigBatchRequestAndApprove(StateAbstraction.MetaTransaction memory metaTx)
    bytes4 public constant ROLE_CONFIG_BATCH_META_SELECTOR =
        bytes4(
            keccak256(
                "roleConfigBatchRequestAndApprove(((uint256,uint256,uint8,(address,address,uint256,uint256,bytes32,bytes4,bytes),bytes32,bytes,(address,uint256,address,uint256)),(uint256,uint256,address,bytes4,uint8,uint256,uint256,address),bytes32,bytes,bytes))"
            )
        );
    
    /**
     * @dev Returns predefined function schemas
     * @return Array of function schema definitions
     *
     * Registers the meta-transaction handler for RBAC configuration batches.
     * All runtime RBAC changes must go through this single time-locked workflow.
     */
    function getFunctionSchemas() public pure returns (StateAbstraction.FunctionSchema[] memory) {
        StateAbstraction.FunctionSchema[] memory schemas = new StateAbstraction.FunctionSchema[](1);
        
        // Meta-transaction function schemas
        StateAbstraction.TxAction[] memory metaRequestApproveActions = new StateAbstraction.TxAction[](2);
        metaRequestApproveActions[0] = StateAbstraction.TxAction.SIGN_META_REQUEST_AND_APPROVE;
        metaRequestApproveActions[1] = StateAbstraction.TxAction.EXECUTE_META_REQUEST_AND_APPROVE;
        
        schemas[0] = StateAbstraction.FunctionSchema({
            functionSignature: "roleConfigBatchRequestAndApprove(((uint256,uint256,uint8,(address,address,uint256,uint256,bytes32,bytes4,bytes),bytes32,bytes,(address,uint256,address,uint256)),(uint256,uint256,address,bytes4,uint8,uint256,uint256,address),bytes32,bytes,bytes))",
            functionSelector: ROLE_CONFIG_BATCH_META_SELECTOR,
            operationType: ROLE_CONFIG_BATCH,
            operationName: "ROLE_CONFIG_BATCH",
            supportedActionsBitmap: StateAbstraction.createBitmapFromActions(metaRequestApproveActions),
            isProtected: true
        });
        
        return schemas;
    }
    
    /**
     * @dev Returns predefined role hashes and their corresponding function permissions
     * @return RolePermission struct containing roleHashes and functionPermissions arrays
     *
     * OWNER: allowed to SIGN_META_REQUEST_AND_APPROVE for the batch handler
     * BROADCASTER: allowed to EXECUTE_META_REQUEST_AND_APPROVE for the batch handler
     */
    function getRolePermissions() public pure returns (IDefinition.RolePermission memory) {
        bytes32[] memory roleHashes = new bytes32[](2);
        StateAbstraction.FunctionPermission[] memory functionPermissions =
            new StateAbstraction.FunctionPermission[](2);
        
        // Owner: sign meta batch
        StateAbstraction.TxAction[] memory ownerActions = new StateAbstraction.TxAction[](1);
        ownerActions[0] = StateAbstraction.TxAction.SIGN_META_REQUEST_AND_APPROVE;
        
        roleHashes[0] = StateAbstraction.OWNER_ROLE;
        functionPermissions[0] = StateAbstraction.FunctionPermission({
            functionSelector: ROLE_CONFIG_BATCH_META_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(ownerActions)
        });
        
        // Broadcaster: execute meta batch
        StateAbstraction.TxAction[] memory broadcasterActions = new StateAbstraction.TxAction[](1);
        broadcasterActions[0] = StateAbstraction.TxAction.EXECUTE_META_REQUEST_AND_APPROVE;
        
        roleHashes[1] = StateAbstraction.BROADCASTER_ROLE;
        functionPermissions[1] = StateAbstraction.FunctionPermission({
            functionSelector: ROLE_CONFIG_BATCH_META_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(broadcasterActions)
        });
        
        return IDefinition.RolePermission({
            roleHashes: roleHashes,
            functionPermissions: functionPermissions
        });
    }
}
