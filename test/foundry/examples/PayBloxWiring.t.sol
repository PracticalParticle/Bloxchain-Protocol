// SPDX-License-Identifier: MPL-2.0
pragma solidity 0.8.35;

import "../CommonBase.sol";
import "../../../contracts/core/lib/utils/SharedValidation.sol";
import "../../../contracts/examples/applications/PayBlox/PayBlox.sol";
import "../../../contracts/examples/applications/PayBlox/PayBloxDefinitions.sol";

/**
 * @title PayBloxWiringTest
 * @dev SPEC-2026-0175 R2: NATIVE_TRANSFER execution schema, handler graph, owner grants, payment whitelist.
 */
contract PayBloxWiringTest is CommonBase {
    PayBlox internal pay;
    address internal payee;

    function setUp() public override {
        super.setUp();
        payee = address(0xBEEF);
        pay = new PayBlox();
        pay.initialize(owner, broadcaster, recovery, DEFAULT_TIMELOCK_PERIOD, address(mockEventForwarder));
        vm.deal(address(this), 10 ether);
        (bool ok, ) = address(pay).call{value: 5 ether}("");
        assertTrue(ok);
    }

    function _native(address to, uint256 amount) internal pure returns (EngineBlox.PaymentDetails memory) {
        return EngineBlox.PaymentDetails({recipient: to, nativeTokenAmount: amount, erc20TokenAddress: address(0), erc20TokenAmount: 0});
    }

    function _status(uint256 txId) internal returns (EngineBlox.TxStatus) {
        vm.prank(owner);
        return pay.getTransaction(txId).status;
    }

    function _whitelist(address recipient) internal {
        vm.prank(owner);
        pay.addPaymentRecipient(recipient);
    }

    // ============ schema shape ============

    function test_HandlerSelectors_MatchEntrypoints() public pure {
        assertEq(PayBloxDefinitions.REQUEST_WITH_PAYMENT_SELECTOR, PayBlox.requestWithPayment.selector);
        assertEq(PayBloxDefinitions.APPROVE_PAYMENT_DELAYED_SELECTOR, PayBlox.approvePaymentAfterDelay.selector);
        assertEq(PayBloxDefinitions.CANCEL_PAYMENT_SELECTOR, PayBlox.cancelPayment.selector);
    }

    function test_Handlers_PointAtNativeTransfer() public pure {
        EngineBlox.FunctionSchema[] memory s = PayBloxDefinitions.getFunctionSchemas();
        for (uint256 i = 0; i < 3; i++) {
            assertEq(s[i].handlerForSelectors.length, 1);
            assertEq(s[i].handlerForSelectors[0], EngineBlox.NATIVE_TRANSFER_SELECTOR);
            assertTrue(s[i].enforceHandlerRelations);
        }
        assertEq(s[3].functionSelector, EngineBlox.NATIVE_TRANSFER_SELECTOR);
        assertEq(s[4].functionSelector, EngineBlox.ATTACHED_PAYMENT_RECIPIENT_SELECTOR);
        assertEq(s[5].functionSelector, EngineBlox.ERC20_TRANSFER_SELECTOR);
    }

    // ============ AC2: request + approve native payout ============

    function test_NativePayout_RequestApprove_PaysWhitelistedRecipient() public {
        _whitelist(payee);

        vm.prank(owner);
        uint256 txId = pay.requestWithPayment(_native(payee, 1 ether), "invoice-1");
        assertEq(uint8(_status(txId)), uint8(EngineBlox.TxStatus.PENDING));

        advanceTime(DEFAULT_TIMELOCK_PERIOD + 1);
        uint256 before = payee.balance;

        vm.prank(owner);
        pay.approvePaymentAfterDelay(txId);

        assertEq(uint8(_status(txId)), uint8(EngineBlox.TxStatus.COMPLETED));
        assertEq(payee.balance - before, 1 ether);
        assertEq(address(pay).balance, 4 ether);
    }

    function test_NativePayout_CancelPending() public {
        _whitelist(payee);
        vm.prank(owner);
        uint256 txId = pay.requestWithPayment(_native(payee, 1 ether), "invoice-2");

        vm.prank(owner);
        pay.cancelPayment(txId);

        assertEq(uint8(_status(txId)), uint8(EngineBlox.TxStatus.CANCELLED));
        assertEq(address(pay).balance, 5 ether);
    }

    function test_NativePayout_ApproveBeforeTimelock_Reverts() public {
        _whitelist(payee);
        vm.prank(owner);
        uint256 txId = pay.requestWithPayment(_native(payee, 1 ether), "early");
        vm.prank(owner);
        vm.expectRevert();
        pay.approvePaymentAfterDelay(txId);
    }

    // ============ whitelist is deny-by-design ============

    function test_NativePayout_NotWhitelisted_RequestReverts() public {
        vm.prank(owner);
        vm.expectRevert(
            abi.encodeWithSelector(
                SharedValidation.TargetNotWhitelisted.selector, payee, EngineBlox.ATTACHED_PAYMENT_RECIPIENT_SELECTOR
            )
        );
        pay.requestWithPayment(_native(payee, 1 ether), "nope");
    }

    function test_NativePayout_RecipientRemovedBeforeApproval_ApprovalReverts() public {
        _whitelist(payee);
        vm.prank(owner);
        uint256 txId = pay.requestWithPayment(_native(payee, 1 ether), "revoked");

        vm.prank(owner);
        pay.removePaymentRecipient(payee);

        advanceTime(DEFAULT_TIMELOCK_PERIOD + 1);
        vm.prank(owner);
        vm.expectRevert();
        pay.approvePaymentAfterDelay(txId);
        assertEq(address(pay).balance, 5 ether);
    }

    function test_Whitelist_OnlyOwner() public {
        vm.prank(attacker);
        vm.expectRevert();
        pay.addPaymentRecipient(attacker);

        vm.prank(broadcaster);
        vm.expectRevert();
        pay.addPaymentRecipient(attacker);

        vm.prank(attacker);
        vm.expectRevert();
        pay.addPaymentToken(address(mockERC20));
    }

    function test_NonOwner_CannotRequestOrApprove() public {
        _whitelist(payee);
        vm.prank(attacker);
        vm.expectRevert();
        pay.requestWithPayment(_native(attacker, 1 ether), "steal");

        vm.prank(owner);
        uint256 txId = pay.requestWithPayment(_native(payee, 1 ether), "ok");
        advanceTime(DEFAULT_TIMELOCK_PERIOD + 1);
        vm.prank(attacker);
        vm.expectRevert();
        pay.approvePaymentAfterDelay(txId);
    }

    function test_SelfRecipient_RevertsBeforeRequest() public {
        _whitelist(address(pay));
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(SharedValidation.InvalidAddress.selector, address(pay)));
        pay.requestWithPayment(_native(address(pay), 1 ether), "self");
    }

    // ============ ERC20 payout ============

    function test_Erc20Payout_RequiresTokenWhitelist_ThenPays() public {
        mockERC20.mint(address(pay), 1000 ether);
        _whitelist(payee);
        EngineBlox.PaymentDetails memory p = EngineBlox.PaymentDetails({
            recipient: payee,
            nativeTokenAmount: 0,
            erc20TokenAddress: address(mockERC20),
            erc20TokenAmount: 100 ether
        });

        vm.prank(owner);
        vm.expectRevert(
            abi.encodeWithSelector(
                SharedValidation.TargetNotWhitelisted.selector, address(mockERC20), EngineBlox.ERC20_TRANSFER_SELECTOR
            )
        );
        pay.requestWithPayment(p, "erc20");

        vm.prank(owner);
        pay.addPaymentToken(address(mockERC20));
        vm.prank(owner);
        uint256 txId = pay.requestWithPayment(p, "erc20");
        advanceTime(DEFAULT_TIMELOCK_PERIOD + 1);
        vm.prank(owner);
        pay.approvePaymentAfterDelay(txId);

        assertEq(uint8(_status(txId)), uint8(EngineBlox.TxStatus.COMPLETED));
        assertEq(mockERC20.balanceOf(payee), 100 ether);
    }

    receive() external payable {}
}
