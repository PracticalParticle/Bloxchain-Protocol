// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import "../../core/lib/EngineBlox.sol";
import "../../interfaces/IDefinition.sol";

/**
 * @title PayBloxDefinitions
 * @dev Library containing predefined definitions for PayBlox initialization
 * This library holds static data that can be used to initialize PayBlox contracts
 * without increasing the main contract size
 * 
 * This library implements the IDefinition interface from EngineBlox
 * and provides a direct initialization function for PayBlox contracts
 */
library PayBloxDefinitions {
    
    // Operation Type Constants
    bytes32 public constant NATIVE_PAYMENT = EngineBlox.NATIVE_TRANSFER_OPERATION;
    bytes32 public constant GENERIC_APPROVAL = keccak256("GENERIC_APPROVAL");
    bytes32 public constant GENERIC_CANCELLATION = keccak256("GENERIC_CANCELLATION");
    
    // Function Selector Constants
    // Using NATIVE_TRANSFER_SELECTOR from EngineBlox for native token transfers
    
    // Time Delay Function Selectors
    bytes4 public constant REQUEST_WITH_PAYMENT_SELECTOR = bytes4(keccak256("requestWithPayment((address,uint256,address,uint256),string)"));
    bytes4 public constant APPROVE_PAYMENT_DELAYED_SELECTOR = bytes4(keccak256("approvePaymentAfterDelay(uint256)"));
    bytes4 public constant CANCEL_PAYMENT_SELECTOR = bytes4(keccak256("cancelPayment(uint256)"));
    
    /**
     * @dev Returns predefined function schemas
     * @return Array of function schema definitions
     */
    function getFunctionSchemas() public pure returns (EngineBlox.FunctionSchema[] memory) {
        EngineBlox.FunctionSchema[] memory schemas = new EngineBlox.FunctionSchema[](4);
        
        // Time-delay function schemas
        EngineBlox.TxAction[] memory timeDelayRequestActions = new EngineBlox.TxAction[](1);
        timeDelayRequestActions[0] = EngineBlox.TxAction.EXECUTE_TIME_DELAY_REQUEST;
        
        EngineBlox.TxAction[] memory timeDelayApproveActions = new EngineBlox.TxAction[](1);
        timeDelayApproveActions[0] = EngineBlox.TxAction.EXECUTE_TIME_DELAY_APPROVE;
        
        EngineBlox.TxAction[] memory timeDelayCancelActions = new EngineBlox.TxAction[](1);
        timeDelayCancelActions[0] = EngineBlox.TxAction.EXECUTE_TIME_DELAY_CANCEL;
        
        // Prepare handlerForSelectors arrays
        // Execution selectors must have self-reference (at least one element pointing to themselves)
        bytes4[] memory approvePaymentDelayedHandlerForSelectors = new bytes4[](1);
        approvePaymentDelayedHandlerForSelectors[0] = APPROVE_PAYMENT_DELAYED_SELECTOR;
        bytes4[] memory cancelPaymentHandlerForSelectors = new bytes4[](1);
        cancelPaymentHandlerForSelectors[0] = CANCEL_PAYMENT_SELECTOR;
        
        // Handler selectors point to execution selectors
        bytes4[] memory nativeTransferHandlerForSelectors = new bytes4[](1);
        nativeTransferHandlerForSelectors[0] = EngineBlox.NATIVE_TRANSFER_SELECTOR;
        
        // Time-delay functions
        schemas[0] = EngineBlox.FunctionSchema({
            functionSignature: "requestWithPayment((address,uint256,address,uint256),string)",
            functionSelector: REQUEST_WITH_PAYMENT_SELECTOR,
            operationType: NATIVE_PAYMENT,
            operationName: "NATIVE_PAYMENT",
            supportedActionsBitmap: EngineBlox.createBitmapFromActions(timeDelayRequestActions),
            isProtected: true,
            handlerForSelectors: nativeTransferHandlerForSelectors
        });
        
        schemas[1] = EngineBlox.FunctionSchema({
            functionSignature: "approvePaymentAfterDelay(uint256)",
            functionSelector: APPROVE_PAYMENT_DELAYED_SELECTOR,
            operationType: GENERIC_APPROVAL,
            operationName: "GENERIC_APPROVAL",
            supportedActionsBitmap: EngineBlox.createBitmapFromActions(timeDelayApproveActions),
            isProtected: true,
            handlerForSelectors: approvePaymentDelayedHandlerForSelectors
        });
        
        schemas[2] = EngineBlox.FunctionSchema({
            functionSignature: "cancelPayment(uint256)",
            functionSelector: CANCEL_PAYMENT_SELECTOR,
            operationType: GENERIC_CANCELLATION,
            operationName: "GENERIC_CANCELLATION",
            supportedActionsBitmap: EngineBlox.createBitmapFromActions(timeDelayCancelActions),
            isProtected: true,
            handlerForSelectors: cancelPaymentHandlerForSelectors
        });
        
        // UPDATE_PAYMENT_SELECTOR schema for payment detail updates
        bytes4[] memory updatePaymentHandlerForSelectors = new bytes4[](1);
        updatePaymentHandlerForSelectors[0] = EngineBlox.UPDATE_PAYMENT_SELECTOR;
        
        schemas[3] = EngineBlox.FunctionSchema({
            functionSignature: "__bloxchain_update_payment__()",
            functionSelector: EngineBlox.UPDATE_PAYMENT_SELECTOR,
            operationType: EngineBlox.UPDATE_PAYMENT_OPERATION,
            operationName: "UPDATE_PAYMENT",
            supportedActionsBitmap: EngineBlox.createBitmapFromActions(timeDelayRequestActions),
            isProtected: false, // Not a protected function, but requires permissions
            handlerForSelectors: updatePaymentHandlerForSelectors
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
        roleHashes = new bytes32[](4);
        functionPermissions = new EngineBlox.FunctionPermission[](4);
        
        // Owner role permissions for time-delay operations
        EngineBlox.TxAction[] memory ownerTimeDelayRequestActions = new EngineBlox.TxAction[](1);
        ownerTimeDelayRequestActions[0] = EngineBlox.TxAction.EXECUTE_TIME_DELAY_REQUEST;
        
        EngineBlox.TxAction[] memory ownerTimeDelayApproveActions = new EngineBlox.TxAction[](1);
        ownerTimeDelayApproveActions[0] = EngineBlox.TxAction.EXECUTE_TIME_DELAY_APPROVE;
        
        EngineBlox.TxAction[] memory ownerTimeDelayCancelActions = new EngineBlox.TxAction[](1);
        ownerTimeDelayCancelActions[0] = EngineBlox.TxAction.EXECUTE_TIME_DELAY_CANCEL;
     
        // Create reusable handlerForSelectors arrays
        bytes4[] memory nativeTransferHandlers = new bytes4[](1);
        nativeTransferHandlers[0] = EngineBlox.NATIVE_TRANSFER_SELECTOR;
        bytes4[] memory approvePaymentDelayedHandlers = new bytes4[](1);
        approvePaymentDelayedHandlers[0] = APPROVE_PAYMENT_DELAYED_SELECTOR;
        bytes4[] memory cancelPaymentHandlers = new bytes4[](1);
        cancelPaymentHandlers[0] = CANCEL_PAYMENT_SELECTOR;
        bytes4[] memory updatePaymentHandlers = new bytes4[](1);
        updatePaymentHandlers[0] = EngineBlox.UPDATE_PAYMENT_SELECTOR;
     
        // Owner: Request Payment With Payment
        roleHashes[0] = EngineBlox.OWNER_ROLE;
        functionPermissions[0] = EngineBlox.FunctionPermission({
            functionSelector: REQUEST_WITH_PAYMENT_SELECTOR,
            grantedActionsBitmap: EngineBlox.createBitmapFromActions(ownerTimeDelayRequestActions),
            handlerForSelectors: nativeTransferHandlers
        });
        
        // Owner: Approve Payment Delayed
        roleHashes[1] = EngineBlox.OWNER_ROLE;
        functionPermissions[1] = EngineBlox.FunctionPermission({
            functionSelector: APPROVE_PAYMENT_DELAYED_SELECTOR,
            grantedActionsBitmap: EngineBlox.createBitmapFromActions(ownerTimeDelayApproveActions),
            handlerForSelectors: approvePaymentDelayedHandlers // Self-reference indicates execution selector
        });
        
        // Owner: Cancel Payment
        roleHashes[2] = EngineBlox.OWNER_ROLE;
        functionPermissions[2] = EngineBlox.FunctionPermission({
            functionSelector: CANCEL_PAYMENT_SELECTOR,
            grantedActionsBitmap: EngineBlox.createBitmapFromActions(ownerTimeDelayCancelActions),
            handlerForSelectors: cancelPaymentHandlers // Self-reference indicates execution selector
        });
        
        // Owner: Update Payment (for payment detail updates)
        roleHashes[3] = EngineBlox.OWNER_ROLE;
        functionPermissions[3] = EngineBlox.FunctionPermission({
            functionSelector: EngineBlox.UPDATE_PAYMENT_SELECTOR,
            grantedActionsBitmap: EngineBlox.createBitmapFromActions(ownerTimeDelayRequestActions),
            handlerForSelectors: updatePaymentHandlers
        });
        
        return IDefinition.RolePermission({
            roleHashes: roleHashes,
            functionPermissions: functionPermissions
        });
    }
}
