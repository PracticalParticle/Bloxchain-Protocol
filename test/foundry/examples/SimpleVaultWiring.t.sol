// SPDX-License-Identifier: MPL-2.0
pragma solidity 0.8.35;

import "../CommonBase.sol";
import "../../../contracts/examples/applications/SimpleVault/SimpleVault.sol";
import "../../../contracts/examples/applications/SimpleVault/SimpleVaultDefinitions.sol";

/**
 * @title SimpleVaultWiringTest
 * @dev SPEC-2026-0175 R3: withdraw execution schemas + owner grants include delayed approve/cancel;
 *      approve/cancel/meta-approve handler graphs point at the withdraw execution selectors.
 */
contract SimpleVaultWiringTest is CommonBase {
    SimpleVault internal vault;
    address internal payee;

    uint256 internal constant OWNER_PK = 1;

    function setUp() public override {
        super.setUp();
        payee = address(0xCAFE);
        vault = new SimpleVault();
        vault.initialize(owner, broadcaster, recovery, DEFAULT_TIMELOCK_PERIOD, address(mockEventForwarder));
        vm.deal(address(this), 10 ether);
        (bool ok, ) = address(vault).call{value: 5 ether}("");
        assertTrue(ok);
        mockERC20.mint(address(vault), 1000 ether);
    }

    function _status(uint256 txId) internal returns (EngineBlox.TxStatus) {
        vm.prank(owner);
        return vault.getTransaction(txId).status;
    }

    // ============ schema shape ============

    function test_Selectors_MatchEntrypoints() public pure {
        assertEq(SimpleVaultDefinitions.WITHDRAW_ETH_SELECTOR, SimpleVault.executeWithdrawEth.selector);
        assertEq(SimpleVaultDefinitions.WITHDRAW_TOKEN_SELECTOR, SimpleVault.executeWithdrawToken.selector);
        assertEq(SimpleVaultDefinitions.APPROVE_WITHDRAWAL_DELAYED_SELECTOR, SimpleVault.approveWithdrawalAfterDelay.selector);
        assertEq(SimpleVaultDefinitions.CANCEL_WITHDRAWAL_SELECTOR, SimpleVault.cancelWithdrawal.selector);
        assertEq(SimpleVaultDefinitions.APPROVE_WITHDRAWAL_META_SELECTOR, SimpleVault.approveWithdrawalWithMetaTx.selector);
    }

    function test_ApproveCancelMetaHandlers_PointAtWithdrawExecutionSelectors() public pure {
        EngineBlox.FunctionSchema[] memory s = SimpleVaultDefinitions.getFunctionSchemas();
        // indices 2,3,4 = approve delayed, cancel, approve meta
        for (uint256 i = 2; i <= 4; i++) {
            assertEq(s[i].handlerForSelectors.length, 2);
            assertEq(s[i].handlerForSelectors[0], SimpleVaultDefinitions.WITHDRAW_ETH_SELECTOR);
            assertEq(s[i].handlerForSelectors[1], SimpleVaultDefinitions.WITHDRAW_TOKEN_SELECTOR);
            assertTrue(s[i].enforceHandlerRelations);
        }
        // execution schemas self-reference and support delayed approve / cancel
        for (uint256 i = 5; i <= 6; i++) {
            assertEq(s[i].handlerForSelectors.length, 1);
            assertEq(s[i].handlerForSelectors[0], s[i].functionSelector);
            assertTrue(EngineBlox.hasActionInBitmap(s[i].supportedActionsBitmap, EngineBlox.TxAction.EXECUTE_TIME_DELAY_APPROVE));
            assertTrue(EngineBlox.hasActionInBitmap(s[i].supportedActionsBitmap, EngineBlox.TxAction.EXECUTE_TIME_DELAY_CANCEL));
        }
    }

    // ============ AC3: request -> delayed approve withdraws; cancel works ============

    function test_EthWithdraw_RequestThenDelayedApprove_PaysOut() public {
        vm.prank(owner);
        uint256 txId = vault.withdrawEthRequest(payee, 1 ether);
        advanceTime(DEFAULT_TIMELOCK_PERIOD + 1);

        vm.prank(owner);
        vault.approveWithdrawalAfterDelay(txId);

        assertEq(uint8(_status(txId)), uint8(EngineBlox.TxStatus.COMPLETED));
        assertEq(payee.balance, 1 ether);
        assertEq(address(vault).balance, 4 ether);
    }

    function test_TokenWithdraw_RequestThenDelayedApprove_PaysOut() public {
        vm.prank(owner);
        uint256 txId = vault.withdrawTokenRequest(address(mockERC20), payee, 250 ether);
        advanceTime(DEFAULT_TIMELOCK_PERIOD + 1);

        vm.prank(owner);
        vault.approveWithdrawalAfterDelay(txId);

        assertEq(uint8(_status(txId)), uint8(EngineBlox.TxStatus.COMPLETED));
        assertEq(mockERC20.balanceOf(payee), 250 ether);
    }

    function test_EthWithdraw_Cancel_ClearsPending() public {
        vm.prank(owner);
        uint256 txId = vault.withdrawEthRequest(payee, 1 ether);

        vm.prank(owner);
        vault.cancelWithdrawal(txId);
        assertEq(uint8(_status(txId)), uint8(EngineBlox.TxStatus.CANCELLED));

        advanceTime(DEFAULT_TIMELOCK_PERIOD + 1);
        vm.prank(owner);
        vm.expectRevert();
        vault.approveWithdrawalAfterDelay(txId);
        assertEq(address(vault).balance, 5 ether);
    }

    function test_TokenWithdraw_Cancel_ClearsPending() public {
        vm.prank(owner);
        uint256 txId = vault.withdrawTokenRequest(address(mockERC20), payee, 1 ether);
        vm.prank(owner);
        vault.cancelWithdrawal(txId);
        assertEq(uint8(_status(txId)), uint8(EngineBlox.TxStatus.CANCELLED));
    }

    function test_DelayedApprove_BeforeTimelock_Reverts() public {
        vm.prank(owner);
        uint256 txId = vault.withdrawEthRequest(payee, 1 ether);
        vm.prank(owner);
        vm.expectRevert();
        vault.approveWithdrawalAfterDelay(txId);
    }

    function test_NonOwner_CannotApproveOrCancel() public {
        vm.prank(owner);
        uint256 txId = vault.withdrawEthRequest(payee, 1 ether);
        advanceTime(DEFAULT_TIMELOCK_PERIOD + 1);

        vm.prank(attacker);
        vm.expectRevert();
        vault.approveWithdrawalAfterDelay(txId);

        vm.prank(broadcaster);
        vm.expectRevert();
        vault.cancelWithdrawal(txId);
    }

    // ============ meta approve (handler graph now reaches the execution selector) ============

    function test_EthWithdraw_MetaApprove_PaysOut() public {
        vm.prank(owner);
        uint256 txId = vault.withdrawEthRequest(payee, 1 ether);

        EngineBlox.MetaTransaction memory m = vault.generateUnsignedWithdrawalMetaTxApproval(
            txId, SimpleVault.VaultMetaTxParams({deadline: 3600, maxGasPrice: 0})
        );
        m.signature = metaTxSigner.signMetaTransaction(m, OWNER_PK, address(vault));

        vm.prank(broadcaster);
        vault.approveWithdrawalWithMetaTx(m);

        assertEq(uint8(_status(txId)), uint8(EngineBlox.TxStatus.COMPLETED));
        assertEq(payee.balance, 1 ether);
    }

    function test_TokenWithdraw_MetaApprove_PaysOut() public {
        vm.prank(owner);
        uint256 txId = vault.withdrawTokenRequest(address(mockERC20), payee, 10 ether);

        EngineBlox.MetaTransaction memory m = vault.generateUnsignedWithdrawalMetaTxApproval(
            txId, SimpleVault.VaultMetaTxParams({deadline: 3600, maxGasPrice: 0})
        );
        m.signature = metaTxSigner.signMetaTransaction(m, OWNER_PK, address(vault));

        vm.prank(broadcaster);
        vault.approveWithdrawalWithMetaTx(m);

        assertEq(uint8(_status(txId)), uint8(EngineBlox.TxStatus.COMPLETED));
        assertEq(mockERC20.balanceOf(payee), 10 ether);
    }

    receive() external payable {}
}
