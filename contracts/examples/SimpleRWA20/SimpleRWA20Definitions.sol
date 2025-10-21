// SPDX-License-Identifier: MPL-2.0
pragma solidity ^0.8.25;

import "../../lib/StateAbstraction.sol";
import "../../interfaces/IDefinition.sol";

/**
 * @title SimpleRWA20Definitions
 * @dev Library containing predefined definitions for SimpleRWA20 initialization
 * This library holds static data that can be used to initialize SimpleRWA20 contracts
 * without increasing the main contract size
 * 
 * This library implements the IDefinition interface from StateAbstraction
 * and provides a direct initialization function for SimpleRWA20 contracts
 */
library SimpleRWA20Definitions {
    
    // Operation Type Constants
    bytes32 public constant MINT_TOKENS = keccak256("MINT_TOKENS");
    bytes32 public constant BURN_TOKENS = keccak256("BURN_TOKENS");
    
    // Function Selector Constants
    bytes4 public constant MINT_TOKENS_SELECTOR = bytes4(keccak256("executeMint(address,uint256)"));
    bytes4 public constant BURN_TOKENS_SELECTOR = bytes4(keccak256("executeBurn(address,uint256)"));
    
    // Meta-transaction Function Selectors
    bytes4 public constant MINT_TOKENS_META_SELECTOR = bytes4(keccak256("mintWithMetaTx((uint256,uint256,uint8,(address,address,uint256,uint256,bytes32,uint8,bytes),bytes32,bytes,(address,uint256,address,uint256),(uint256,uint256,address,uint256),(uint256,uint256,address,bytes4,uint256,uint256,address),bytes,bytes))"));
    bytes4 public constant BURN_TOKENS_META_SELECTOR = bytes4(keccak256("burnWithMetaTx((uint256,uint256,uint8,(address,address,uint256,uint256,bytes32,uint8,bytes),bytes32,bytes,(address,uint256,address,uint256),(uint256,uint256,address,uint256),(uint256,uint256,address,bytes4,uint256,uint256,address),bytes,bytes))"));
    
    /**
     * @dev Returns predefined function schemas
     * @return Array of function schema definitions
     */
    function getFunctionSchemas() public pure returns (StateAbstraction.FunctionSchema[] memory) {
        StateAbstraction.FunctionSchema[] memory schemas = new StateAbstraction.FunctionSchema[](2);
        
        // Meta-transaction function schemas
        StateAbstraction.TxAction[] memory metaTxRequestApproveActions = new StateAbstraction.TxAction[](2);
        metaTxRequestApproveActions[0] = StateAbstraction.TxAction.SIGN_META_REQUEST_AND_APPROVE;
        metaTxRequestApproveActions[1] = StateAbstraction.TxAction.EXECUTE_META_REQUEST_AND_APPROVE;
        
        // Meta-transaction functions
        schemas[0] = StateAbstraction.FunctionSchema({
            functionName: "mintWithMetaTx",
            functionSelector: MINT_TOKENS_META_SELECTOR,
            operationType: MINT_TOKENS,
            operationName: "MINT_TOKENS",
            supportedActions: metaTxRequestApproveActions,
            isProtected: true
        });
        
        schemas[1] = StateAbstraction.FunctionSchema({
            functionName: "burnWithMetaTx",
            functionSelector: BURN_TOKENS_META_SELECTOR,
            operationType: BURN_TOKENS,
            operationName: "BURN_TOKENS",
            supportedActions: metaTxRequestApproveActions,
            isProtected: true
        });
        
        return schemas;
    }
    
    /**
     * @dev Returns predefined role hashes and their corresponding function permissions
     * @return RolePermission struct containing roleHashes and functionPermissions arrays
     */
    function getRolePermissions() public pure returns (IDefinition.RolePermission memory) {
        bytes32[] memory roleHashes;
        StateAbstraction.FunctionPermission[] memory functionPermissions;
        roleHashes = new bytes32[](4);
        functionPermissions = new StateAbstraction.FunctionPermission[](4);
        
        // Owner role permissions for meta-transactions (signing)
        StateAbstraction.TxAction[] memory ownerMetaRequestApproveActions = new StateAbstraction.TxAction[](1);
        ownerMetaRequestApproveActions[0] = StateAbstraction.TxAction.SIGN_META_REQUEST_AND_APPROVE;
        
        // Broadcaster role permissions for meta-transactions (execution)
        StateAbstraction.TxAction[] memory broadcasterMetaRequestApproveActions = new StateAbstraction.TxAction[](1);
        broadcasterMetaRequestApproveActions[0] = StateAbstraction.TxAction.EXECUTE_META_REQUEST_AND_APPROVE;
        
        // Owner: Mint Tokens Meta (signing)
        roleHashes[0] = StateAbstraction.OWNER_ROLE;
        functionPermissions[0] = StateAbstraction.FunctionPermission({
            functionSelector: MINT_TOKENS_META_SELECTOR,
            grantedActions: ownerMetaRequestApproveActions
        });
        
        // Owner: Burn Tokens Meta (signing)
        roleHashes[1] = StateAbstraction.OWNER_ROLE;
        functionPermissions[1] = StateAbstraction.FunctionPermission({
            functionSelector: BURN_TOKENS_META_SELECTOR,
            grantedActions: ownerMetaRequestApproveActions
        });
        
        // Broadcaster: Mint Tokens Meta (execution)
        roleHashes[2] = StateAbstraction.BROADCASTER_ROLE;
        functionPermissions[2] = StateAbstraction.FunctionPermission({
            functionSelector: MINT_TOKENS_META_SELECTOR,
            grantedActions: broadcasterMetaRequestApproveActions
        });
        
        // Broadcaster: Burn Tokens Meta (execution)
        roleHashes[3] = StateAbstraction.BROADCASTER_ROLE;
        functionPermissions[3] = StateAbstraction.FunctionPermission({
            functionSelector: BURN_TOKENS_META_SELECTOR,
            grantedActions: broadcasterMetaRequestApproveActions
        });
        
        return IDefinition.RolePermission({
            roleHashes: roleHashes,
            functionPermissions: functionPermissions
        });
    }
}
