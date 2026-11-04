// SPDX-License-Identifier: MIT
pragma solidity 0.8.35;

import "../../../core/lib/EngineBlox.sol";
import "../../../core/lib/interfaces/IDefinition.sol";

/**
 * @title PayBloxDefinitions
 * @dev Library containing predefined definitions for PayBlox initialization
 * This library holds static data that can be used to initialize PayBlox contracts
 * without increasing the main contract size
 *
 * This library implements the IDefinition interface from EngineBlox
 * and provides a direct initialization function for PayBlox contracts
 *
 * Handler / execution graph (dual-permission model, mirrors SecureOwnableDefinitions):
 * - Handler selectors (`requestWithPayment`, `approvePaymentAfterDelay`, `cancelPayment`) point at the
 *   execution selector `EngineBlox.NATIVE_TRANSFER_SELECTOR`.
 * - `NATIVE_TRANSFER_SELECTOR` is registered as an execution schema (self-reference), mirroring
 *   GuardControllerDefinitions, and OWNER_ROLE is granted request/approve/cancel on it so EngineBlox's
 *   execution-side permission check passes for each time-delay step.
 *
 * Attached payment policy keys:
 * - `ATTACHED_PAYMENT_RECIPIENT_SELECTOR` and `ERC20_TRANSFER_SELECTOR` are registered so EngineBlox's attached-payment
 *   whitelist policy can be evaluated. No role is granted actions on them; they are whitelist keys only.
 * - Recipients (and ERC20 token contracts) must be whitelisted by the owner before a payment can be requested.
 *   An empty whitelist denies every payout by design.
 */
library PayBloxDefinitions {

    // Operation Type Constants
    bytes32 public constant NATIVE_PAYMENT = keccak256("NATIVE_TRANSFER");
    bytes32 public constant GENERIC_APPROVAL = keccak256("GENERIC_APPROVAL");
    bytes32 public constant GENERIC_CANCELLATION = keccak256("GENERIC_CANCELLATION");

    // Function Selector Constants
    // Using NATIVE_TRANSFER_SELECTOR from EngineBlox as the execution selector for payments

    // Time Delay Function Selectors
    bytes4 public constant REQUEST_WITH_PAYMENT_SELECTOR = bytes4(keccak256("requestWithPayment((address,uint256,address,uint256),string)"));
    bytes4 public constant APPROVE_PAYMENT_DELAYED_SELECTOR = bytes4(keccak256("approvePaymentAfterDelay(uint256)"));
    bytes4 public constant CANCEL_PAYMENT_SELECTOR = bytes4(keccak256("cancelPayment(uint256)"));

    /**
     * @dev Returns predefined function schemas
     * @return Array of function schema definitions
     */
    function getFunctionSchemas() public pure returns (EngineBlox.FunctionSchema[] memory) {
        EngineBlox.FunctionSchema[] memory schemas = new EngineBlox.FunctionSchema[](6);

        // Time-delay function schemas
        EngineBlox.TxAction[] memory timeDelayRequestActions = new EngineBlox.TxAction[](1);
        timeDelayRequestActions[0] = EngineBlox.TxAction.EXECUTE_TIME_DELAY_REQUEST;

        EngineBlox.TxAction[] memory timeDelayApproveActions = new EngineBlox.TxAction[](1);
        timeDelayApproveActions[0] = EngineBlox.TxAction.EXECUTE_TIME_DELAY_APPROVE;

        EngineBlox.TxAction[] memory timeDelayCancelActions = new EngineBlox.TxAction[](1);
        timeDelayCancelActions[0] = EngineBlox.TxAction.EXECUTE_TIME_DELAY_CANCEL;

        // Execution selector actions: request, approve and cancel are all checked against the execution selector
        EngineBlox.TxAction[] memory timeDelayAllActions = new EngineBlox.TxAction[](3);
        timeDelayAllActions[0] = EngineBlox.TxAction.EXECUTE_TIME_DELAY_REQUEST;
        timeDelayAllActions[1] = EngineBlox.TxAction.EXECUTE_TIME_DELAY_APPROVE;
        timeDelayAllActions[2] = EngineBlox.TxAction.EXECUTE_TIME_DELAY_CANCEL;

        // Handler selectors point to the execution selector
        bytes4[] memory nativeTransferHandlerForSelectors = new bytes4[](1);
        nativeTransferHandlerForSelectors[0] = EngineBlox.NATIVE_TRANSFER_SELECTOR;

        // Policy keys reference themselves (self-reference)
        bytes4[] memory attachedPaymentRecipientHandlerForSelectors = new bytes4[](1);
        attachedPaymentRecipientHandlerForSelectors[0] = EngineBlox.ATTACHED_PAYMENT_RECIPIENT_SELECTOR;
        bytes4[] memory erc20TransferHandlerForSelectors = new bytes4[](1);
        erc20TransferHandlerForSelectors[0] = EngineBlox.ERC20_TRANSFER_SELECTOR;

        // Time-delay functions (handlers)
        schemas[0] = EngineBlox.FunctionSchema({
            functionSignature: "requestWithPayment((address,uint256,address,uint256),string)",
            functionSelector: REQUEST_WITH_PAYMENT_SELECTOR,
            operationType: NATIVE_PAYMENT,
            operationName: "NATIVE_PAYMENT",
            supportedActionsBitmap: EngineBlox.createBitmapFromActions(timeDelayRequestActions),
            enforceHandlerRelations: true,
            isProtected: true,
            isGrantRevocable: true,
            handlerForSelectors: nativeTransferHandlerForSelectors
        });

        schemas[1] = EngineBlox.FunctionSchema({
            functionSignature: "approvePaymentAfterDelay(uint256)",
            functionSelector: APPROVE_PAYMENT_DELAYED_SELECTOR,
            operationType: GENERIC_APPROVAL,
            operationName: "GENERIC_APPROVAL",
            supportedActionsBitmap: EngineBlox.createBitmapFromActions(timeDelayApproveActions),
            enforceHandlerRelations: true,
            isProtected: true,
            isGrantRevocable: true,
            handlerForSelectors: nativeTransferHandlerForSelectors
        });

        schemas[2] = EngineBlox.FunctionSchema({
            functionSignature: "cancelPayment(uint256)",
            functionSelector: CANCEL_PAYMENT_SELECTOR,
            operationType: GENERIC_CANCELLATION,
            operationName: "GENERIC_CANCELLATION",
            supportedActionsBitmap: EngineBlox.createBitmapFromActions(timeDelayCancelActions),
            enforceHandlerRelations: true,
            isProtected: true,
            isGrantRevocable: true,
            handlerForSelectors: nativeTransferHandlerForSelectors
        });

        // Execution selector schema: native transfer convenience selector (mirrors GuardControllerDefinitions)
        schemas[3] = EngineBlox.FunctionSchema({
            functionSignature: "__bloxchain_native_transfer__()",
            functionSelector: EngineBlox.NATIVE_TRANSFER_SELECTOR,
            operationType: keccak256(bytes("NATIVE_TRANSFER")),
            operationName: "NATIVE_TRANSFER",
            supportedActionsBitmap: EngineBlox.createBitmapFromActions(timeDelayAllActions),
            enforceHandlerRelations: true,
            isProtected: true,
            isGrantRevocable: true,
            handlerForSelectors: nativeTransferHandlerForSelectors
        });

        // Attached-payment policy keys (whitelist only; no role grants)
        schemas[4] = EngineBlox.FunctionSchema({
            functionSignature: "__bloxchain_attached_payment_recipient__()",
            functionSelector: EngineBlox.ATTACHED_PAYMENT_RECIPIENT_SELECTOR,
            operationType: keccak256(bytes("ATTACHED_PAYMENT_RECIPIENT")),
            operationName: "ATTACHED_PAYMENT_RECIPIENT",
            supportedActionsBitmap: EngineBlox.createBitmapFromActions(timeDelayAllActions),
            enforceHandlerRelations: true,
            isProtected: true,
            isGrantRevocable: true,
            handlerForSelectors: attachedPaymentRecipientHandlerForSelectors
        });

        schemas[5] = EngineBlox.FunctionSchema({
            functionSignature: "transfer(address,uint256)",
            functionSelector: EngineBlox.ERC20_TRANSFER_SELECTOR,
            operationType: keccak256(bytes("ERC20_TRANSFER")),
            operationName: "ERC20_TRANSFER",
            supportedActionsBitmap: EngineBlox.createBitmapFromActions(timeDelayAllActions),
            enforceHandlerRelations: true,
            isProtected: true,
            isGrantRevocable: true,
            handlerForSelectors: erc20TransferHandlerForSelectors
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

        EngineBlox.TxAction[] memory ownerExecutionActions = new EngineBlox.TxAction[](3);
        ownerExecutionActions[0] = EngineBlox.TxAction.EXECUTE_TIME_DELAY_REQUEST;
        ownerExecutionActions[1] = EngineBlox.TxAction.EXECUTE_TIME_DELAY_APPROVE;
        ownerExecutionActions[2] = EngineBlox.TxAction.EXECUTE_TIME_DELAY_CANCEL;

        // Create reusable handlerForSelectors array
        bytes4[] memory nativeTransferHandlers = new bytes4[](1);
        nativeTransferHandlers[0] = EngineBlox.NATIVE_TRANSFER_SELECTOR;

        // Owner: Request Payment With Payment (handler)
        roleHashes[0] = EngineBlox.OWNER_ROLE;
        functionPermissions[0] = EngineBlox.FunctionPermission({
            functionSelector: REQUEST_WITH_PAYMENT_SELECTOR,
            grantedActionsBitmap: EngineBlox.createBitmapFromActions(ownerTimeDelayRequestActions),
            handlerForSelectors: nativeTransferHandlers
        });

        // Owner: Approve Payment Delayed (handler)
        roleHashes[1] = EngineBlox.OWNER_ROLE;
        functionPermissions[1] = EngineBlox.FunctionPermission({
            functionSelector: APPROVE_PAYMENT_DELAYED_SELECTOR,
            grantedActionsBitmap: EngineBlox.createBitmapFromActions(ownerTimeDelayApproveActions),
            handlerForSelectors: nativeTransferHandlers
        });

        // Owner: Cancel Payment (handler)
        roleHashes[2] = EngineBlox.OWNER_ROLE;
        functionPermissions[2] = EngineBlox.FunctionPermission({
            functionSelector: CANCEL_PAYMENT_SELECTOR,
            grantedActionsBitmap: EngineBlox.createBitmapFromActions(ownerTimeDelayCancelActions),
            handlerForSelectors: nativeTransferHandlers
        });

        // Owner: Native Transfer (execution) - request/approve/cancel for the dual-permission check
        roleHashes[3] = EngineBlox.OWNER_ROLE;
        functionPermissions[3] = EngineBlox.FunctionPermission({
            functionSelector: EngineBlox.NATIVE_TRANSFER_SELECTOR,
            grantedActionsBitmap: EngineBlox.createBitmapFromActions(ownerExecutionActions),
            handlerForSelectors: nativeTransferHandlers // Self-reference indicates execution selector
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
