// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import "../../core/lib/StateAbstraction.sol";
import "../../interfaces/IDefinition.sol";

/**
 * @title PayBloxDefinitions
 * @dev Library containing predefined definitions for PayBlox initialization
 * This library holds static data that can be used to initialize PayBlox contracts
 * without increasing the main contract size
 * 
 * This library implements the IDefinition interface from StateAbstraction
 * and provides a direct initialization function for PayBlox contracts
 */
library PayBloxDefinitions {
    
    // Operation Type Constants
    bytes32 public constant NATIVE_PAYMENT = StateAbstraction.NATIVE_TRANSFER_OPERATION;
    bytes32 public constant GENERIC_APPROVAL = keccak256("GENERIC_APPROVAL");
    bytes32 public constant GENERIC_CANCELLATION = keccak256("GENERIC_CANCELLATION");
    
    // Function Selector Constants
    // Using NATIVE_TRANSFER_SELECTOR from StateAbstraction for native token transfers
    
    // Time Delay Function Selectors
    bytes4 public constant REQUEST_WITH_PAYMENT_SELECTOR = bytes4(keccak256("requestWithPayment((address,uint256,address,uint256),string)"));
    bytes4 public constant APPROVE_PAYMENT_DELAYED_SELECTOR = bytes4(keccak256("approvePaymentAfterDelay(uint256)"));
    bytes4 public constant CANCEL_PAYMENT_SELECTOR = bytes4(keccak256("cancelPayment(uint256)"));
    
    /**
     * @dev Returns predefined function schemas
     * @return Array of function schema definitions
     */
    function getFunctionSchemas() public pure returns (StateAbstraction.FunctionSchema[] memory) {
        StateAbstraction.FunctionSchema[] memory schemas = new StateAbstraction.FunctionSchema[](3);
        
        // Time-delay function schemas
        StateAbstraction.TxAction[] memory timeDelayRequestActions = new StateAbstraction.TxAction[](1);
        timeDelayRequestActions[0] = StateAbstraction.TxAction.EXECUTE_TIME_DELAY_REQUEST;
        
        StateAbstraction.TxAction[] memory timeDelayApproveActions = new StateAbstraction.TxAction[](1);
        timeDelayApproveActions[0] = StateAbstraction.TxAction.EXECUTE_TIME_DELAY_APPROVE;
        
        StateAbstraction.TxAction[] memory timeDelayCancelActions = new StateAbstraction.TxAction[](1);
        timeDelayCancelActions[0] = StateAbstraction.TxAction.EXECUTE_TIME_DELAY_CANCEL;
        
        // Prepare handlerForSelectors arrays
        // Execution selectors must have self-reference (at least one element pointing to themselves)
        bytes4[] memory approvePaymentDelayedHandlerForSelectors = new bytes4[](1);
        approvePaymentDelayedHandlerForSelectors[0] = APPROVE_PAYMENT_DELAYED_SELECTOR;
        bytes4[] memory cancelPaymentHandlerForSelectors = new bytes4[](1);
        cancelPaymentHandlerForSelectors[0] = CANCEL_PAYMENT_SELECTOR;
        
        // Handler selectors point to execution selectors
        bytes4[] memory nativeTransferHandlerForSelectors = new bytes4[](1);
        nativeTransferHandlerForSelectors[0] = StateAbstraction.NATIVE_TRANSFER_SELECTOR;
        
        // Time-delay functions
        schemas[0] = StateAbstraction.FunctionSchema({
            functionSignature: "requestWithPayment((address,uint256,address,uint256),string)",
            functionSelector: REQUEST_WITH_PAYMENT_SELECTOR,
            operationType: NATIVE_PAYMENT,
            operationName: "NATIVE_PAYMENT",
            supportedActionsBitmap: StateAbstraction.createBitmapFromActions(timeDelayRequestActions),
            isProtected: true,
            handlerForSelectors: nativeTransferHandlerForSelectors
        });
        
        schemas[1] = StateAbstraction.FunctionSchema({
            functionSignature: "approvePaymentAfterDelay(uint256)",
            functionSelector: APPROVE_PAYMENT_DELAYED_SELECTOR,
            operationType: GENERIC_APPROVAL,
            operationName: "GENERIC_APPROVAL",
            supportedActionsBitmap: StateAbstraction.createBitmapFromActions(timeDelayApproveActions),
            isProtected: true,
            handlerForSelectors: approvePaymentDelayedHandlerForSelectors
        });
        
        schemas[2] = StateAbstraction.FunctionSchema({
            functionSignature: "cancelPayment(uint256)",
            functionSelector: CANCEL_PAYMENT_SELECTOR,
            operationType: GENERIC_CANCELLATION,
            operationName: "GENERIC_CANCELLATION",
            supportedActionsBitmap: StateAbstraction.createBitmapFromActions(timeDelayCancelActions),
            isProtected: true,
            handlerForSelectors: cancelPaymentHandlerForSelectors
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
        roleHashes = new bytes32[](3);
        functionPermissions = new StateAbstraction.FunctionPermission[](3);
        
        // Owner role permissions for time-delay operations
        StateAbstraction.TxAction[] memory ownerTimeDelayRequestActions = new StateAbstraction.TxAction[](1);
        ownerTimeDelayRequestActions[0] = StateAbstraction.TxAction.EXECUTE_TIME_DELAY_REQUEST;
        
        StateAbstraction.TxAction[] memory ownerTimeDelayApproveActions = new StateAbstraction.TxAction[](1);
        ownerTimeDelayApproveActions[0] = StateAbstraction.TxAction.EXECUTE_TIME_DELAY_APPROVE;
        
        StateAbstraction.TxAction[] memory ownerTimeDelayCancelActions = new StateAbstraction.TxAction[](1);
        ownerTimeDelayCancelActions[0] = StateAbstraction.TxAction.EXECUTE_TIME_DELAY_CANCEL;
     
        // Create reusable handlerForSelectors arrays
        bytes4[] memory nativeTransferHandlers = new bytes4[](1);
        nativeTransferHandlers[0] = StateAbstraction.NATIVE_TRANSFER_SELECTOR;
        bytes4[] memory approvePaymentDelayedHandlers = new bytes4[](1);
        approvePaymentDelayedHandlers[0] = APPROVE_PAYMENT_DELAYED_SELECTOR;
        bytes4[] memory cancelPaymentHandlers = new bytes4[](1);
        cancelPaymentHandlers[0] = CANCEL_PAYMENT_SELECTOR;
     
        // Owner: Request Payment With Payment
        roleHashes[0] = StateAbstraction.OWNER_ROLE;
        functionPermissions[0] = StateAbstraction.FunctionPermission({
            functionSelector: REQUEST_WITH_PAYMENT_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(ownerTimeDelayRequestActions),
            handlerForSelectors: nativeTransferHandlers
        });
        
        // Owner: Approve Payment Delayed
        roleHashes[1] = StateAbstraction.OWNER_ROLE;
        functionPermissions[1] = StateAbstraction.FunctionPermission({
            functionSelector: APPROVE_PAYMENT_DELAYED_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(ownerTimeDelayApproveActions),
            handlerForSelectors: approvePaymentDelayedHandlers // Self-reference indicates execution selector
        });
        
        // Owner: Cancel Payment
        roleHashes[2] = StateAbstraction.OWNER_ROLE;
        functionPermissions[2] = StateAbstraction.FunctionPermission({
            functionSelector: CANCEL_PAYMENT_SELECTOR,
            grantedActionsBitmap: StateAbstraction.createBitmapFromActions(ownerTimeDelayCancelActions),
            handlerForSelectors: cancelPaymentHandlers // Self-reference indicates execution selector
        });
        
        return IDefinition.RolePermission({
            roleHashes: roleHashes,
            functionPermissions: functionPermissions
        });
    }
}
