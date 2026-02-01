// SPDX-License-Identifier: MPL-2.0
pragma solidity 0.8.33;

import "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import "../../../lib/EngineBlox.sol";
import "../../../../interfaces/IDefinition.sol";

/**
 * @title RuntimeRBACDefinitions
 * @dev Library containing predefined definitions for RuntimeRBAC initialization
 * This library holds static data that can be used to initialize RuntimeRBAC contracts
 * without increasing the main contract size
 * 
 * This library implements the IDefinition interface from EngineBlox
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
    // roleConfigBatchRequestAndApprove(EngineBlox.MetaTransaction memory metaTx)
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
     * 
     * Function schemas include:
     * - Handler function (roleConfigBatchRequestAndApprove): checked via msg.sig
     * - Execution function (executeRoleConfigBatch): checked in EngineBlox for dual-permission model
     */
    function getFunctionSchemas() public pure returns (EngineBlox.FunctionSchema[] memory) {
        EngineBlox.FunctionSchema[] memory schemas = new EngineBlox.FunctionSchema[](2);
        
        // Meta-transaction handler function schema
        EngineBlox.TxAction[] memory metaRequestApproveActions = new EngineBlox.TxAction[](2);
        metaRequestApproveActions[0] = EngineBlox.TxAction.SIGN_META_REQUEST_AND_APPROVE;
        metaRequestApproveActions[1] = EngineBlox.TxAction.EXECUTE_META_REQUEST_AND_APPROVE;
        
        bytes4[] memory handlerForSelectors = new bytes4[](1);
        handlerForSelectors[0] = ROLE_CONFIG_BATCH_EXECUTE_SELECTOR;
        
        schemas[0] = EngineBlox.FunctionSchema({
            functionSignature: "roleConfigBatchRequestAndApprove(((uint256,uint256,uint8,(address,address,uint256,uint256,bytes32,bytes4,bytes),bytes32,bytes,(address,uint256,address,uint256)),(uint256,uint256,address,bytes4,uint8,uint256,uint256,address),bytes32,bytes,bytes))",
            functionSelector: ROLE_CONFIG_BATCH_META_SELECTOR,
            operationType: ROLE_CONFIG_BATCH,
            operationName: "ROLE_CONFIG_BATCH",
            supportedActionsBitmap: EngineBlox.createBitmapFromActions(metaRequestApproveActions),
            isProtected: true,
            handlerForSelectors: handlerForSelectors
        });
        
        // Execution function schema (required for dual-permission model)
        // This is checked in EngineBlox._validateExecutionAndHandlerPermissions
        // Must support both SIGN (for owner) and EXECUTE (for broadcaster) actions
        EngineBlox.TxAction[] memory executionActions = new EngineBlox.TxAction[](2);
        executionActions[0] = EngineBlox.TxAction.SIGN_META_REQUEST_AND_APPROVE;
        executionActions[1] = EngineBlox.TxAction.EXECUTE_META_REQUEST_AND_APPROVE;
        
        // Execution selectors must have at least one element pointing to themselves (self-reference)
        bytes4[] memory executionHandlerForSelectors = new bytes4[](1);
        executionHandlerForSelectors[0] = ROLE_CONFIG_BATCH_EXECUTE_SELECTOR;
        
        schemas[1] = EngineBlox.FunctionSchema({
            functionSignature: "executeRoleConfigBatch((uint8,bytes)[])",
            functionSelector: ROLE_CONFIG_BATCH_EXECUTE_SELECTOR,
            operationType: ROLE_CONFIG_BATCH,
            operationName: "ROLE_CONFIG_BATCH",
            supportedActionsBitmap: EngineBlox.createBitmapFromActions(executionActions),
            isProtected: true,
            handlerForSelectors: executionHandlerForSelectors
        });
        
        return schemas;
    }
    
    /**
     * @dev Returns predefined role hashes and their corresponding function permissions
     * @return RolePermission struct containing roleHashes and functionPermissions arrays
     *
     * OWNER: allowed to SIGN_META_REQUEST_AND_APPROVE for the batch handler
     * BROADCASTER: allowed to EXECUTE_META_REQUEST_AND_APPROVE for both:
     *   - Handler selector (ROLE_CONFIG_BATCH_META_SELECTOR) - checked via msg.sig
     *   - Execution selector (ROLE_CONFIG_BATCH_EXECUTE_SELECTOR) - checked in EngineBlox
     */
    function getRolePermissions() public pure returns (IDefinition.RolePermission memory) {
        bytes32[] memory roleHashes = new bytes32[](4);
        EngineBlox.FunctionPermission[] memory functionPermissions =
            new EngineBlox.FunctionPermission[](4);
        
        // Owner: sign meta batch (handler function permission)
        EngineBlox.TxAction[] memory ownerHandlerActions = new EngineBlox.TxAction[](1);
        ownerHandlerActions[0] = EngineBlox.TxAction.SIGN_META_REQUEST_AND_APPROVE;
        
        bytes4[] memory ownerHandlerHandlerForSelectors = new bytes4[](1);
        ownerHandlerHandlerForSelectors[0] = ROLE_CONFIG_BATCH_EXECUTE_SELECTOR;
        
        roleHashes[0] = EngineBlox.OWNER_ROLE;
        functionPermissions[0] = EngineBlox.FunctionPermission({
            functionSelector: ROLE_CONFIG_BATCH_META_SELECTOR,
            grantedActionsBitmap: EngineBlox.createBitmapFromActions(ownerHandlerActions),
            handlerForSelectors: ownerHandlerHandlerForSelectors
        });
        
        // Owner: sign meta batch (execution function permission)
        // Required because verifySignature checks both handler and execution selectors for the signer
        EngineBlox.TxAction[] memory ownerExecutionActions = new EngineBlox.TxAction[](1);
        ownerExecutionActions[0] = EngineBlox.TxAction.SIGN_META_REQUEST_AND_APPROVE;
        
        bytes4[] memory ownerExecutionHandlerForSelectors = new bytes4[](1);
        ownerExecutionHandlerForSelectors[0] = ROLE_CONFIG_BATCH_EXECUTE_SELECTOR; // Self-reference indicates execution selector
        
        roleHashes[1] = EngineBlox.OWNER_ROLE;
        functionPermissions[1] = EngineBlox.FunctionPermission({
            functionSelector: ROLE_CONFIG_BATCH_EXECUTE_SELECTOR,
            grantedActionsBitmap: EngineBlox.createBitmapFromActions(ownerExecutionActions),
            handlerForSelectors: ownerExecutionHandlerForSelectors
        });
        
        // Broadcaster: execute meta batch (handler function permission)
        EngineBlox.TxAction[] memory broadcasterHandlerActions = new EngineBlox.TxAction[](1);
        broadcasterHandlerActions[0] = EngineBlox.TxAction.EXECUTE_META_REQUEST_AND_APPROVE;
        
        bytes4[] memory broadcasterHandlerHandlerForSelectors = new bytes4[](1);
        broadcasterHandlerHandlerForSelectors[0] = ROLE_CONFIG_BATCH_EXECUTE_SELECTOR;
        
        roleHashes[2] = EngineBlox.BROADCASTER_ROLE;
        functionPermissions[2] = EngineBlox.FunctionPermission({
            functionSelector: ROLE_CONFIG_BATCH_META_SELECTOR,
            grantedActionsBitmap: EngineBlox.createBitmapFromActions(broadcasterHandlerActions),
            handlerForSelectors: broadcasterHandlerHandlerForSelectors
        });
        
        // Broadcaster: execute meta batch (execution function permission)
        // Required because _validateExecutionAndHandlerPermissions checks both handler and execution selectors
        EngineBlox.TxAction[] memory broadcasterExecutionActions = new EngineBlox.TxAction[](1);
        broadcasterExecutionActions[0] = EngineBlox.TxAction.EXECUTE_META_REQUEST_AND_APPROVE;
        
        bytes4[] memory broadcasterExecutionHandlerForSelectors = new bytes4[](1);
        broadcasterExecutionHandlerForSelectors[0] = ROLE_CONFIG_BATCH_EXECUTE_SELECTOR; // Self-reference indicates execution selector
        
        roleHashes[3] = EngineBlox.BROADCASTER_ROLE;
        functionPermissions[3] = EngineBlox.FunctionPermission({
            functionSelector: ROLE_CONFIG_BATCH_EXECUTE_SELECTOR,
            grantedActionsBitmap: EngineBlox.createBitmapFromActions(broadcasterExecutionActions),
            handlerForSelectors: broadcasterExecutionHandlerForSelectors
        });
        
        return IDefinition.RolePermission({
            roleHashes: roleHashes,
            functionPermissions: functionPermissions
        });
    }

    /**
     * @dev ERC165: report support for IDefinition and IERC165 when this library is used at an address.
     * IDefinition extends IERC165; both interface IDs must be reported for ERC165 compliance.
     */
    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == type(IERC165).interfaceId || interfaceId == type(IDefinition).interfaceId;
    }
}
