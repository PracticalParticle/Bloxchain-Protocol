// SPDX-License-Identifier: MPL-2.0
pragma solidity ^0.8.25;

import "../../core/base/lib/StateAbstraction.sol";
import "../../interfaces/IDefinition.sol";

/**
 * @title SimpleVaultDefinitions
 * @dev Library containing predefined definitions for SimpleVault initialization
 * This library holds static data that can be used to initialize SimpleVault contracts
 * without increasing the main contract size
 * 
 * This library implements the IDefinition interface from StateAbstraction
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
    function getFunctionSchemas() public pure returns (StateAbstraction.FunctionSchema[] memory) {
        StateAbstraction.FunctionSchema[] memory schemas = new StateAbstraction.FunctionSchema[](5);
        
        // Time-delay function schemas
        StateAbstraction.TxAction[] memory timeDelayRequestActions = new StateAbstraction.TxAction[](1);
        timeDelayRequestActions[0] = StateAbstraction.TxAction.EXECUTE_TIME_DELAY_REQUEST;
        
        StateAbstraction.TxAction[] memory timeDelayApproveActions = new StateAbstraction.TxAction[](1);
        timeDelayApproveActions[0] = StateAbstraction.TxAction.EXECUTE_TIME_DELAY_APPROVE;
        
        StateAbstraction.TxAction[] memory timeDelayCancelActions = new StateAbstraction.TxAction[](1);
        timeDelayCancelActions[0] = StateAbstraction.TxAction.EXECUTE_TIME_DELAY_CANCEL;
        
        // Meta-transaction function schemas
        StateAbstraction.TxAction[] memory metaTxApproveActions = new StateAbstraction.TxAction[](2);
        metaTxApproveActions[0] = StateAbstraction.TxAction.SIGN_META_APPROVE;
        metaTxApproveActions[1] = StateAbstraction.TxAction.EXECUTE_META_APPROVE;
        
        // Time-delay functions
        schemas[0] = StateAbstraction.FunctionSchema({
            functionSignature: "withdrawEthRequest(address,uint256)",
            functionSelector: WITHDRAW_ETH_REQUEST_SELECTOR,
            operationType: WITHDRAW_ETH,
            operationName: "WITHDRAW_ETH",
            supportedActionsBitmap: StateAbstraction.createBitmapFromActions(timeDelayRequestActions),
            isProtected: true
        });
        
        schemas[1] = StateAbstraction.FunctionSchema({
            functionSignature: "withdrawTokenRequest(address,address,uint256)",
            functionSelector: WITHDRAW_TOKEN_REQUEST_SELECTOR,
            operationType: WITHDRAW_TOKEN,
            operationName: "WITHDRAW_TOKEN",
            supportedActionsBitmap: StateAbstraction.createBitmapFromActions(timeDelayRequestActions),
            isProtected: true
        });
        
        schemas[2] = StateAbstraction.FunctionSchema({
            functionSignature: "approveWithdrawalAfterDelay(uint256)",
            functionSelector: APPROVE_WITHDRAWAL_DELAYED_SELECTOR,
            operationType: GENERIC_APPROVAL,
            operationName: "GENERIC_APPROVAL",
            supportedActionsBitmap: StateAbstraction.createBitmapFromActions(timeDelayApproveActions),
            isProtected: true
        });
        
        schemas[3] = StateAbstraction.FunctionSchema({
            functionSignature: "cancelWithdrawal(uint256)",
            functionSelector: CANCEL_WITHDRAWAL_SELECTOR,
            operationType: GENERIC_CANCELLATION,
            operationName: "GENERIC_CANCELLATION",
            supportedActionsBitmap: StateAbstraction.createBitmapFromActions(timeDelayCancelActions),
            isProtected: true
        });
        
        // Meta-transaction functions
        schemas[4] = StateAbstraction.FunctionSchema({
            functionSignature: "approveWithdrawalWithMetaTx(((uint256,uint256,uint8,(address,address,uint256,uint256,bytes32,bytes4,bytes),bytes32,bytes,(address,uint256,address,uint256)),(uint256,uint256,address,bytes4,uint8,uint256,uint256,address),bytes32,bytes,bytes))",
            functionSelector: APPROVE_WITHDRAWAL_META_SELECTOR,
            operationType: GENERIC_META_APPROVAL,
            operationName: "GENERIC_META_APPROVAL",
            supportedActionsBitmap: StateAbstraction.createBitmapFromActions(metaTxApproveActions),
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
        roleHashes = new bytes32[](6);
        functionPermissions = new StateAbstraction.FunctionPermission[](6);
        
        // Owner role permissions for time-delay operations
        StateAbstraction.TxAction[] memory ownerTimeDelayRequestActions = new StateAbstraction.TxAction[](1);
        ownerTimeDelayRequestActions[0] = StateAbstraction.TxAction.EXECUTE_TIME_DELAY_REQUEST;
        
        StateAbstraction.TxAction[] memory ownerTimeDelayApproveActions = new StateAbstraction.TxAction[](1);
        ownerTimeDelayApproveActions[0] = StateAbstraction.TxAction.EXECUTE_TIME_DELAY_APPROVE;
        
        StateAbstraction.TxAction[] memory ownerTimeDelayCancelActions = new StateAbstraction.TxAction[](1);
        ownerTimeDelayCancelActions[0] = StateAbstraction.TxAction.EXECUTE_TIME_DELAY_CANCEL;
        
        // Owner role permissions for meta-transactions
        StateAbstraction.TxAction[] memory ownerMetaApproveActions = new StateAbstraction.TxAction[](1);
        ownerMetaApproveActions[0] = StateAbstraction.TxAction.SIGN_META_APPROVE;

        // Broadcaster role permissions for meta-transactions
        StateAbstraction.TxAction[] memory broadcasterMetaApproveActions = new StateAbstraction.TxAction[](1);
        broadcasterMetaApproveActions[0] = StateAbstraction.TxAction.EXECUTE_META_APPROVE;
     
        // Owner: Withdraw ETH Request
        roleHashes[0] = StateAbstraction.OWNER_ROLE;
        functionPermissions[0] = StateAbstraction.FunctionPermission({
            functionSelector: WITHDRAW_ETH_REQUEST_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(ownerTimeDelayRequestActions)
        });
        
        // Owner: Withdraw Token Request
        roleHashes[1] = StateAbstraction.OWNER_ROLE;
        functionPermissions[1] = StateAbstraction.FunctionPermission({
            functionSelector: WITHDRAW_TOKEN_REQUEST_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(ownerTimeDelayRequestActions)
        });
        
        // Owner: Approve Withdrawal Delayed
        roleHashes[2] = StateAbstraction.OWNER_ROLE;
        functionPermissions[2] = StateAbstraction.FunctionPermission({
            functionSelector: APPROVE_WITHDRAWAL_DELAYED_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(ownerTimeDelayApproveActions)
        });
        
        // Owner: Cancel Withdrawal
        roleHashes[3] = StateAbstraction.OWNER_ROLE;
        functionPermissions[3] = StateAbstraction.FunctionPermission({
            functionSelector: CANCEL_WITHDRAWAL_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(ownerTimeDelayCancelActions)
        });
        
        // Owner: Approve Withdrawal Meta (signer)
        roleHashes[4] = StateAbstraction.OWNER_ROLE;
        functionPermissions[4] = StateAbstraction.FunctionPermission({
            functionSelector: APPROVE_WITHDRAWAL_META_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(ownerMetaApproveActions)
        });

        // Broadcaster: Approve Withdrawal Meta (executor)
        roleHashes[5] = StateAbstraction.BROADCASTER_ROLE;
        functionPermissions[5] = StateAbstraction.FunctionPermission({
            functionSelector: APPROVE_WITHDRAWAL_META_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(broadcasterMetaApproveActions)
        });
        
        return IDefinition.RolePermission({
            roleHashes: roleHashes,
            functionPermissions: functionPermissions
        });
    }
}