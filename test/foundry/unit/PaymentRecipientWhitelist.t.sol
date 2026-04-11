// SPDX-License-Identifier: MPL-2.0
pragma solidity 0.8.34;

import "../CommonBase.sol";
import "../../../contracts/core/lib/EngineBlox.sol";
import "../../../contracts/core/lib/utils/SharedValidation.sol";
import "../helpers/PaymentTestHelper.sol";

/// @dev Unit tests: attached payment recipients must satisfy the same target whitelist as the execution target.
contract PaymentRecipientWhitelistTest is CommonBase {
    PaymentTestHelper public paymentHelper;

    function setUp() public override {
        super.setUp();
        paymentHelper = new PaymentTestHelper();
        vm.prank(owner);
        paymentHelper.initialize(owner, broadcaster, recovery, DEFAULT_TIMELOCK_PERIOD, address(0));
        vm.deal(address(paymentHelper), 100 ether);
    }

    function test_RevertWhen_PaymentRecipientNotWhitelisted_selfTarget_native() public {
        address badRecipient = address(0xBEEF);
        bytes32 operationType = keccak256("NATIVE_TRANSFER");
        EngineBlox.PaymentDetails memory payment = EngineBlox.PaymentDetails({
            recipient: badRecipient,
            nativeTokenAmount: 1 ether,
            erc20TokenAddress: address(0),
            erc20TokenAmount: 0
        });

        vm.prank(owner);
        vm.expectRevert(
            abi.encodeWithSelector(SharedValidation.TargetNotWhitelisted.selector, badRecipient, EngineBlox.ATTACHED_PAYMENT_RECIPIENT_SELECTOR)
        );
        paymentHelper.requestTransactionWithPayment(
            owner,
            address(paymentHelper),
            0,
            0,
            operationType,
            EngineBlox.NATIVE_TRANSFER_SELECTOR,
            "",
            payment
        );
    }

    function test_SucceedsWhen_PaymentRecipientWhitelisted() public {
        address recipient = address(0xCAFE);
        vm.prank(owner);
        paymentHelper.whitelistTargetForTesting(recipient, EngineBlox.ATTACHED_PAYMENT_RECIPIENT_SELECTOR);

        bytes32 operationType = keccak256("NATIVE_TRANSFER");
        EngineBlox.PaymentDetails memory payment = EngineBlox.PaymentDetails({
            recipient: recipient,
            nativeTokenAmount: 1 ether,
            erc20TokenAddress: address(0),
            erc20TokenAmount: 0
        });

        vm.prank(owner);
        uint256 txId = paymentHelper.requestTransactionWithPayment(
            owner,
            address(paymentHelper),
            0,
            0,
            operationType,
            EngineBlox.NATIVE_TRANSFER_SELECTOR,
            "",
            payment
        );
        assertGt(txId, 0);
    }
}
