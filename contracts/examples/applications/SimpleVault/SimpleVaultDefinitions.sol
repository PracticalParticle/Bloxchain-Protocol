// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import "../../../core/lib/EngineBlox.sol";
import "../../../interfaces/IDefinition.sol";

/**
 * @title SimpleVaultDefinitions
 * @dev Library containing predefined definitions for SimpleVault initialization
 * This library holds static data that can be used to initialize SimpleVault contracts
 * without increasing the main contract size
 * 
 * This library implements the IDefinition interface from EngineBlox
 * and provides a direct initialization function for SimpleVault contracts
 */
library SimpleVaultDefinitions {
    
    // Operation Type Constants
    bytes32 public constant WITHDRAW_ETH = keccak256("WITHDRAW_ETH");
    bytes32 public constant WITHDRAW_TOKEN = keccak256("WITHDRAW_TOKEN");
    bytes32 public constant GENERIC_APPROVAL = keccak256("GENERIC_APPROVAL");
    bytes32 public constant GENERIC_CANCELLATION = keccak256("GENERIC_CANCELLATION");
    bytes32 public constant GENERIC_META_APPROVAL = keccak256("GENERIC_META_APPROVAL");
    
    // Function Selector Constants
    bytes4 public constant WITHDRAW_ETH_SELECTOR = bytes4(keccak256("executeWithdrawEth(address,uint256)"));
    bytes4 public constant WITHDRAW_TOKEN_SELECTOR = bytes4(keccak256("executeWithdrawToken(address,address,uint256)"));
    
    // Time Delay Function Selectors
    bytes4 public constant WITHDRAW_ETH_REQUEST_SELECTOR = bytes4(keccak256("withdrawEthRequest(address,uint256)"));
    bytes4 public constant WITHDRAW_TOKEN_REQUEST_SELECTOR = bytes4(keccak256("withdrawTokenRequest(address,address,uint256)"));
    bytes4 public constant APPROVE_WITHDRAWAL_DELAYED_SELECTOR = bytes4(keccak256("approveWithdrawalAfterDelay(uint256)"));
    bytes4 public constant CANCEL_WITHDRAWAL_SELECTOR = bytes4(keccak256("cancelWithdrawal(uint256)"));
    
    // Meta-transaction Function Selectors
    bytes4 public constant APPROVE_WITHDRAWAL_META_SELECTOR = bytes4(keccak256("approveWithdrawalWithMetaTx(((uint256,uint256,uint8,(address,address,uint256,uint256,bytes32,bytes4,bytes),bytes32,bytes,(address,uint256,address,uint256)),(uint256,uint256,address,bytes4,uint8,uint256,uint256,address),bytes32,bytes,bytes))"));
    
    /**
     * @dev Returns predefined function schemas
     * @return Array of function schema definitions
     */
    function getFunctionSchemas() public pure returns (EngineBlox.FunctionSchema[] memory) {
        EngineBlox.FunctionSchema[] memory schemas = new EngineBlox.FunctionSchema[](7);
        
        // Time-delay function schemas
        EngineBlox.TxAction[] memory timeDelayRequestActions = new EngineBlox.TxAction[](1);
        timeDelayRequestActions[0] = EngineBlox.TxAction.EXECUTE_TIME_DELAY_REQUEST;
        
        EngineBlox.TxAction[] memory timeDelayApproveActions = new EngineBlox.TxAction[](1);
        timeDelayApproveActions[0] = EngineBlox.TxAction.EXECUTE_TIME_DELAY_APPROVE;
        
        EngineBlox.TxAction[] memory timeDelayCancelActions = new EngineBlox.TxAction[](1);
        timeDelayCancelActions[0] = EngineBlox.TxAction.EXECUTE_TIME_DELAY_CANCEL;
        
        // Meta-transaction function schemas
        EngineBlox.TxAction[] memory metaTxApproveActions = new EngineBlox.TxAction[](2);
        metaTxApproveActions[0] = EngineBlox.TxAction.SIGN_META_APPROVE;
        metaTxApproveActions[1] = EngineBlox.TxAction.EXECUTE_META_APPROVE;
        
        // Prepare handlerForSelectors arrays
        // Execution selectors must have self-reference (at least one element pointing to themselves)
        bytes4[] memory approveWithdrawalDelayedHandlerForSelectors = new bytes4[](1);
        approveWithdrawalDelayedHandlerForSelectors[0] = APPROVE_WITHDRAWAL_DELAYED_SELECTOR;
        bytes4[] memory cancelWithdrawalHandlerForSelectors = new bytes4[](1);
        cancelWithdrawalHandlerForSelectors[0] = CANCEL_WITHDRAWAL_SELECTOR;
        bytes4[] memory approveWithdrawalMetaHandlerForSelectors = new bytes4[](1);
        approveWithdrawalMetaHandlerForSelectors[0] = APPROVE_WITHDRAWAL_META_SELECTOR;
        
        // Handler selectors point to execution selectors
        bytes4[] memory withdrawEthHandlerForSelectors = new bytes4[](1);
        withdrawEthHandlerForSelectors[0] = WITHDRAW_ETH_SELECTOR;
        bytes4[] memory withdrawTokenHandlerForSelectors = new bytes4[](1);
        withdrawTokenHandlerForSelectors[0] = WITHDRAW_TOKEN_SELECTOR;
        
        // Time-delay functions
        schemas[0] = EngineBlox.FunctionSchema({
            functionSignature: "withdrawEthRequest(address,uint256)",
            functionSelector: WITHDRAW_ETH_REQUEST_SELECTOR,
            operationType: WITHDRAW_ETH,
            operationName: "WITHDRAW_ETH",
            supportedActionsBitmap: EngineBlox.createBitmapFromActions(timeDelayRequestActions),
            isProtected: true,
            handlerForSelectors: withdrawEthHandlerForSelectors
        });
        
        schemas[1] = EngineBlox.FunctionSchema({
            functionSignature: "withdrawTokenRequest(address,address,uint256)",
            functionSelector: WITHDRAW_TOKEN_REQUEST_SELECTOR,
            operationType: WITHDRAW_TOKEN,
            operationName: "WITHDRAW_TOKEN",
            supportedActionsBitmap: EngineBlox.createBitmapFromActions(timeDelayRequestActions),
            isProtected: true,
            handlerForSelectors: withdrawTokenHandlerForSelectors
        });
        
        schemas[2] = EngineBlox.FunctionSchema({
            functionSignature: "approveWithdrawalAfterDelay(uint256)",
            functionSelector: APPROVE_WITHDRAWAL_DELAYED_SELECTOR,
            operationType: GENERIC_APPROVAL,
            operationName: "GENERIC_APPROVAL",
            supportedActionsBitmap: EngineBlox.createBitmapFromActions(timeDelayApproveActions),
            isProtected: true,
            handlerForSelectors: approveWithdrawalDelayedHandlerForSelectors
        });
        
        schemas[3] = EngineBlox.FunctionSchema({
            functionSignature: "cancelWithdrawal(uint256)",
            functionSelector: CANCEL_WITHDRAWAL_SELECTOR,
            operationType: GENERIC_CANCELLATION,
            operationName: "GENERIC_CANCELLATION",
            supportedActionsBitmap: EngineBlox.createBitmapFromActions(timeDelayCancelActions),
            isProtected: true,
            handlerForSelectors: cancelWithdrawalHandlerForSelectors
        });
        
        // Meta-transaction functions
        schemas[4] = EngineBlox.FunctionSchema({
            functionSignature: "approveWithdrawalWithMetaTx(((uint256,uint256,uint8,(address,address,uint256,uint256,bytes32,bytes4,bytes),bytes32,bytes,(address,uint256,address,uint256)),(uint256,uint256,address,bytes4,uint8,uint256,uint256,address),bytes32,bytes,bytes))",
            functionSelector: APPROVE_WITHDRAWAL_META_SELECTOR,
            operationType: GENERIC_META_APPROVAL,
            operationName: "GENERIC_META_APPROVAL",
            supportedActionsBitmap: EngineBlox.createBitmapFromActions(metaTxApproveActions),
            isProtected: true,
            handlerForSelectors: approveWithdrawalMetaHandlerForSelectors
        });
        
        // Execution selector schemas (for dual-permission model)
        // These support both time-delay and meta-transaction workflows
        EngineBlox.TxAction[] memory executionActions = new EngineBlox.TxAction[](3);
        executionActions[0] = EngineBlox.TxAction.EXECUTE_TIME_DELAY_REQUEST;
        executionActions[1] = EngineBlox.TxAction.SIGN_META_APPROVE;
        executionActions[2] = EngineBlox.TxAction.EXECUTE_META_APPROVE;
        
        bytes4[] memory withdrawEthExecutionHandlerForSelectors = new bytes4[](1);
        withdrawEthExecutionHandlerForSelectors[0] = WITHDRAW_ETH_SELECTOR;
        bytes4[] memory withdrawTokenExecutionHandlerForSelectors = new bytes4[](1);
        withdrawTokenExecutionHandlerForSelectors[0] = WITHDRAW_TOKEN_SELECTOR;
        
        schemas[5] = EngineBlox.FunctionSchema({
            functionSignature: "executeWithdrawEth(address,uint256)",
            functionSelector: WITHDRAW_ETH_SELECTOR,
            operationType: WITHDRAW_ETH,
            operationName: "WITHDRAW_ETH",
            supportedActionsBitmap: EngineBlox.createBitmapFromActions(executionActions),
            isProtected: true,
            handlerForSelectors: withdrawEthExecutionHandlerForSelectors
        });
        
        schemas[6] = EngineBlox.FunctionSchema({
            functionSignature: "executeWithdrawToken(address,address,uint256)",
            functionSelector: WITHDRAW_TOKEN_SELECTOR,
            operationType: WITHDRAW_TOKEN,
            operationName: "WITHDRAW_TOKEN",
            supportedActionsBitmap: EngineBlox.createBitmapFromActions(executionActions),
            isProtected: true,
            handlerForSelectors: withdrawTokenExecutionHandlerForSelectors
        });
        
        return schemas;
    }
    
    /**
     * @dev Returns predefined role hashes and their corresponding function permissions
     * @return RolePermission struct containing roleHashes and functionPermissions arrays
     */
    function getRolePermissions() public pure returns (IDefinition.RolePermission memory) {
        bytes32[] memory roleHashes;
        EngineBlox.FunctionPermission[] memory functionPermissions;
        roleHashes = new bytes32[](10);
        functionPermissions = new EngineBlox.FunctionPermission[](10);
        
        // Owner role permissions for time-delay operations
        EngineBlox.TxAction[] memory ownerTimeDelayRequestActions = new EngineBlox.TxAction[](1);
        ownerTimeDelayRequestActions[0] = EngineBlox.TxAction.EXECUTE_TIME_DELAY_REQUEST;
        
        EngineBlox.TxAction[] memory ownerTimeDelayApproveActions = new EngineBlox.TxAction[](1);
        ownerTimeDelayApproveActions[0] = EngineBlox.TxAction.EXECUTE_TIME_DELAY_APPROVE;
        
        EngineBlox.TxAction[] memory ownerTimeDelayCancelActions = new EngineBlox.TxAction[](1);
        ownerTimeDelayCancelActions[0] = EngineBlox.TxAction.EXECUTE_TIME_DELAY_CANCEL;
        
        // Owner role permissions for meta-transactions
        EngineBlox.TxAction[] memory ownerMetaApproveActions = new EngineBlox.TxAction[](1);
        ownerMetaApproveActions[0] = EngineBlox.TxAction.SIGN_META_APPROVE;

        // Broadcaster role permissions for meta-transactions
        EngineBlox.TxAction[] memory broadcasterMetaApproveActions = new EngineBlox.TxAction[](1);
        broadcasterMetaApproveActions[0] = EngineBlox.TxAction.EXECUTE_META_APPROVE;
     
        // Create reusable handlerForSelectors arrays
        bytes4[] memory withdrawEthHandlers = new bytes4[](1);
        withdrawEthHandlers[0] = WITHDRAW_ETH_SELECTOR;
        bytes4[] memory withdrawTokenHandlers = new bytes4[](1);
        withdrawTokenHandlers[0] = WITHDRAW_TOKEN_SELECTOR;
        bytes4[] memory approveWithdrawalDelayedHandlers = new bytes4[](1);
        approveWithdrawalDelayedHandlers[0] = APPROVE_WITHDRAWAL_DELAYED_SELECTOR;
        bytes4[] memory cancelWithdrawalHandlers = new bytes4[](1);
        cancelWithdrawalHandlers[0] = CANCEL_WITHDRAWAL_SELECTOR;
        bytes4[] memory approveWithdrawalMetaHandlers = new bytes4[](1);
        approveWithdrawalMetaHandlers[0] = APPROVE_WITHDRAWAL_META_SELECTOR;
     
        // Owner: Withdraw ETH Request
        roleHashes[0] = EngineBlox.OWNER_ROLE;
        functionPermissions[0] = EngineBlox.FunctionPermission({
            functionSelector: WITHDRAW_ETH_REQUEST_SELECTOR,
            grantedActionsBitmap: EngineBlox.createBitmapFromActions(ownerTimeDelayRequestActions),
            handlerForSelectors: withdrawEthHandlers
        });
        
        // Owner: Withdraw Token Request
        roleHashes[1] = EngineBlox.OWNER_ROLE;
        functionPermissions[1] = EngineBlox.FunctionPermission({
            functionSelector: WITHDRAW_TOKEN_REQUEST_SELECTOR,
            grantedActionsBitmap: EngineBlox.createBitmapFromActions(ownerTimeDelayRequestActions),
            handlerForSelectors: withdrawTokenHandlers
        });
        
        // Owner: Approve Withdrawal Delayed
        roleHashes[2] = EngineBlox.OWNER_ROLE;
        functionPermissions[2] = EngineBlox.FunctionPermission({
            functionSelector: APPROVE_WITHDRAWAL_DELAYED_SELECTOR,
            grantedActionsBitmap: EngineBlox.createBitmapFromActions(ownerTimeDelayApproveActions),
            handlerForSelectors: approveWithdrawalDelayedHandlers // Self-reference indicates execution selector
        });
        
        // Owner: Cancel Withdrawal
        roleHashes[3] = EngineBlox.OWNER_ROLE;
        functionPermissions[3] = EngineBlox.FunctionPermission({
            functionSelector: CANCEL_WITHDRAWAL_SELECTOR,
            grantedActionsBitmap: EngineBlox.createBitmapFromActions(ownerTimeDelayCancelActions),
            handlerForSelectors: cancelWithdrawalHandlers // Self-reference indicates execution selector
        });
        
        // Owner: Approve Withdrawal Meta (signer)
        roleHashes[4] = EngineBlox.OWNER_ROLE;
        functionPermissions[4] = EngineBlox.FunctionPermission({
            functionSelector: APPROVE_WITHDRAWAL_META_SELECTOR,
            grantedActionsBitmap: EngineBlox.createBitmapFromActions(ownerMetaApproveActions),
            handlerForSelectors: approveWithdrawalMetaHandlers // Self-reference indicates execution selector
        });

        // Broadcaster: Approve Withdrawal Meta (executor)
        roleHashes[5] = EngineBlox.BROADCASTER_ROLE;
        functionPermissions[5] = EngineBlox.FunctionPermission({
            functionSelector: APPROVE_WITHDRAWAL_META_SELECTOR,
            grantedActionsBitmap: EngineBlox.createBitmapFromActions(broadcasterMetaApproveActions),
            handlerForSelectors: approveWithdrawalMetaHandlers // Self-reference indicates execution selector
        });
        
        // Owner: Withdraw ETH Execution (for time-delay and meta-tx signing)
        EngineBlox.TxAction[] memory ownerExecutionActions = new EngineBlox.TxAction[](2);
        ownerExecutionActions[0] = EngineBlox.TxAction.EXECUTE_TIME_DELAY_REQUEST;
        ownerExecutionActions[1] = EngineBlox.TxAction.SIGN_META_APPROVE;
        
        roleHashes[6] = EngineBlox.OWNER_ROLE;
        functionPermissions[6] = EngineBlox.FunctionPermission({
            functionSelector: WITHDRAW_ETH_SELECTOR,
            grantedActionsBitmap: EngineBlox.createBitmapFromActions(ownerExecutionActions),
            handlerForSelectors: withdrawEthHandlers
        });
        
        // Owner: Withdraw Token Execution (for time-delay and meta-tx signing)
        roleHashes[7] = EngineBlox.OWNER_ROLE;
        functionPermissions[7] = EngineBlox.FunctionPermission({
            functionSelector: WITHDRAW_TOKEN_SELECTOR,
            grantedActionsBitmap: EngineBlox.createBitmapFromActions(ownerExecutionActions),
            handlerForSelectors: withdrawTokenHandlers
        });
        
        // Broadcaster: Withdraw ETH Execution (for meta-tx execution)
        EngineBlox.TxAction[] memory broadcasterExecutionActions = new EngineBlox.TxAction[](1);
        broadcasterExecutionActions[0] = EngineBlox.TxAction.EXECUTE_META_APPROVE;
        
        roleHashes[8] = EngineBlox.BROADCASTER_ROLE;
        functionPermissions[8] = EngineBlox.FunctionPermission({
            functionSelector: WITHDRAW_ETH_SELECTOR,
            grantedActionsBitmap: EngineBlox.createBitmapFromActions(broadcasterExecutionActions),
            handlerForSelectors: withdrawEthHandlers
        });
        
        // Broadcaster: Withdraw Token Execution (for meta-tx execution)
        roleHashes[9] = EngineBlox.BROADCASTER_ROLE;
        functionPermissions[9] = EngineBlox.FunctionPermission({
            functionSelector: WITHDRAW_TOKEN_SELECTOR,
            grantedActionsBitmap: EngineBlox.createBitmapFromActions(broadcasterExecutionActions),
            handlerForSelectors: withdrawTokenHandlers
        });
        
        return IDefinition.RolePermission({
            roleHashes: roleHashes,
            functionPermissions: functionPermissions
        });
    }

    /**
     * @dev ERC165: report support for IDefinition when this library is used at an address
     */
    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == type(IDefinition).interfaceId;
    }
}
