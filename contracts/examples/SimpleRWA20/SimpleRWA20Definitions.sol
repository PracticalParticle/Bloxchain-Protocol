// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import "../../core/lib/StateAbstraction.sol";
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
    bytes4 public constant MINT_TOKENS_META_SELECTOR = bytes4(keccak256("mintWithMetaTx((uint256,uint256,uint8,(address,address,uint256,uint256,bytes32,bytes4,bytes),bytes32,bytes,(address,uint256,address,uint256)),(uint256,uint256,address,bytes4,uint8,uint256,uint256,address),bytes32,bytes,bytes))"));
    bytes4 public constant BURN_TOKENS_META_SELECTOR = bytes4(keccak256("burnWithMetaTx((uint256,uint256,uint8,(address,address,uint256,uint256,bytes32,bytes4,bytes),bytes32,bytes,(address,uint256,address,uint256)),(uint256,uint256,address,bytes4,uint8,uint256,uint256,address),bytes32,bytes,bytes))"));
    
    /**
     * @dev Returns predefined function schemas
     * @return Array of function schema definitions
     */
    function getFunctionSchemas() public pure returns (StateAbstraction.FunctionSchema[] memory) {
        StateAbstraction.FunctionSchema[] memory schemas = new StateAbstraction.FunctionSchema[](4);
        
        // Meta-transaction function schemas
        StateAbstraction.TxAction[] memory metaTxRequestApproveActions = new StateAbstraction.TxAction[](2);
        metaTxRequestApproveActions[0] = StateAbstraction.TxAction.SIGN_META_REQUEST_AND_APPROVE;
        metaTxRequestApproveActions[1] = StateAbstraction.TxAction.EXECUTE_META_REQUEST_AND_APPROVE;
        
        // Prepare handlerForSelectors arrays
        bytes4[] memory mintHandlerForSelectors = new bytes4[](1);
        mintHandlerForSelectors[0] = MINT_TOKENS_SELECTOR;
        bytes4[] memory burnHandlerForSelectors = new bytes4[](1);
        burnHandlerForSelectors[0] = BURN_TOKENS_SELECTOR;
        
        // Meta-transaction functions
        schemas[0] = StateAbstraction.FunctionSchema({
            functionSignature: "mintWithMetaTx((uint256,uint256,uint8,(address,address,uint256,uint256,bytes32,bytes4,bytes),bytes32,bytes,(address,uint256,address,uint256)),(uint256,uint256,address,bytes4,uint8,uint256,uint256,address),bytes32,bytes,bytes))",
            functionSelector: MINT_TOKENS_META_SELECTOR,
            operationType: MINT_TOKENS,
            operationName: "MINT_TOKENS",
            supportedActionsBitmap: StateAbstraction.createBitmapFromActions(metaTxRequestApproveActions),
            isProtected: true,
            handlerForSelectors: mintHandlerForSelectors
        });
        
        schemas[1] = StateAbstraction.FunctionSchema({
            functionSignature: "burnWithMetaTx((uint256,uint256,uint8,(address,address,uint256,uint256,bytes32,bytes4,bytes),bytes32,bytes,(address,uint256,address,uint256)),(uint256,uint256,address,bytes4,uint8,uint256,uint256,address),bytes32,bytes,bytes))",
            functionSelector: BURN_TOKENS_META_SELECTOR,
            operationType: BURN_TOKENS,
            operationName: "BURN_TOKENS",
            supportedActionsBitmap: StateAbstraction.createBitmapFromActions(metaTxRequestApproveActions),
            isProtected: true,
            handlerForSelectors: burnHandlerForSelectors
        });
        
        // Execution selector schemas (for dual-permission model)
        bytes4[] memory mintExecutionHandlerForSelectors = new bytes4[](1);
        mintExecutionHandlerForSelectors[0] = MINT_TOKENS_SELECTOR;
        bytes4[] memory burnExecutionHandlerForSelectors = new bytes4[](1);
        burnExecutionHandlerForSelectors[0] = BURN_TOKENS_SELECTOR;
        
        schemas[2] = StateAbstraction.FunctionSchema({
            functionSignature: "executeMint(address,uint256)",
            functionSelector: MINT_TOKENS_SELECTOR,
            operationType: MINT_TOKENS,
            operationName: "MINT_TOKENS",
            supportedActionsBitmap: StateAbstraction.createBitmapFromActions(metaTxRequestApproveActions),
            isProtected: true,
            handlerForSelectors: mintExecutionHandlerForSelectors
        });
        
        schemas[3] = StateAbstraction.FunctionSchema({
            functionSignature: "executeBurn(address,uint256)",
            functionSelector: BURN_TOKENS_SELECTOR,
            operationType: BURN_TOKENS,
            operationName: "BURN_TOKENS",
            supportedActionsBitmap: StateAbstraction.createBitmapFromActions(metaTxRequestApproveActions),
            isProtected: true,
            handlerForSelectors: burnExecutionHandlerForSelectors
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
        roleHashes = new bytes32[](8);
        functionPermissions = new StateAbstraction.FunctionPermission[](8);
        
        // Owner role permissions for meta-transactions (signing)
        StateAbstraction.TxAction[] memory ownerMetaRequestApproveActions = new StateAbstraction.TxAction[](1);
        ownerMetaRequestApproveActions[0] = StateAbstraction.TxAction.SIGN_META_REQUEST_AND_APPROVE;
        
        // Broadcaster role permissions for meta-transactions (execution)
        StateAbstraction.TxAction[] memory broadcasterMetaRequestApproveActions = new StateAbstraction.TxAction[](1);
        broadcasterMetaRequestApproveActions[0] = StateAbstraction.TxAction.EXECUTE_META_REQUEST_AND_APPROVE;
        
        // Create reusable handlerForSelectors arrays
        bytes4[] memory mintTokensHandlers = new bytes4[](1);
        mintTokensHandlers[0] = MINT_TOKENS_SELECTOR;
        bytes4[] memory burnTokensHandlers = new bytes4[](1);
        burnTokensHandlers[0] = BURN_TOKENS_SELECTOR;
        
        // Owner: Mint Tokens Meta (signing)
        roleHashes[0] = StateAbstraction.OWNER_ROLE;
        functionPermissions[0] = StateAbstraction.FunctionPermission({
            functionSelector: MINT_TOKENS_META_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(ownerMetaRequestApproveActions),
            handlerForSelectors: mintTokensHandlers
        });
        
        // Owner: Burn Tokens Meta (signing)
        roleHashes[1] = StateAbstraction.OWNER_ROLE;
        functionPermissions[1] = StateAbstraction.FunctionPermission({
            functionSelector: BURN_TOKENS_META_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(ownerMetaRequestApproveActions),
            handlerForSelectors: burnTokensHandlers
        });
        
        // Broadcaster: Mint Tokens Meta (execution)
        roleHashes[2] = StateAbstraction.BROADCASTER_ROLE;
        functionPermissions[2] = StateAbstraction.FunctionPermission({
            functionSelector: MINT_TOKENS_META_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(broadcasterMetaRequestApproveActions),
            handlerForSelectors: mintTokensHandlers
        });
        
        // Broadcaster: Burn Tokens Meta (execution)
        roleHashes[3] = StateAbstraction.BROADCASTER_ROLE;
        functionPermissions[3] = StateAbstraction.FunctionPermission({
            functionSelector: BURN_TOKENS_META_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(broadcasterMetaRequestApproveActions),
            handlerForSelectors: burnTokensHandlers
        });
        
        // Owner: Mint Tokens Execution (for signing)
        roleHashes[4] = StateAbstraction.OWNER_ROLE;
        functionPermissions[4] = StateAbstraction.FunctionPermission({
            functionSelector: MINT_TOKENS_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(ownerMetaRequestApproveActions),
            handlerForSelectors: mintTokensHandlers
        });
        
        // Owner: Burn Tokens Execution (for signing)
        roleHashes[5] = StateAbstraction.OWNER_ROLE;
        functionPermissions[5] = StateAbstraction.FunctionPermission({
            functionSelector: BURN_TOKENS_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(ownerMetaRequestApproveActions),
            handlerForSelectors: burnTokensHandlers
        });
        
        // Broadcaster: Mint Tokens Execution (for execution)
        roleHashes[6] = StateAbstraction.BROADCASTER_ROLE;
        functionPermissions[6] = StateAbstraction.FunctionPermission({
            functionSelector: MINT_TOKENS_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(broadcasterMetaRequestApproveActions),
            handlerForSelectors: mintTokensHandlers
        });
        
        // Broadcaster: Burn Tokens Execution (for execution)
        roleHashes[7] = StateAbstraction.BROADCASTER_ROLE;
        functionPermissions[7] = StateAbstraction.FunctionPermission({
            functionSelector: BURN_TOKENS_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(broadcasterMetaRequestApproveActions),
            handlerForSelectors: burnTokensHandlers
        });
        
        return IDefinition.RolePermission({
            roleHashes: roleHashes,
            functionPermissions: functionPermissions
        });
    }
}
