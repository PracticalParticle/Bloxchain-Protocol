// SPDX-License-Identifier: MPL-2.0
pragma solidity 0.8.35;

import "../CommonBase.sol";
import "../../../contracts/examples/integrations/Safe/GuardianSafe/GuardianSafe.sol";
import "../../../contracts/examples/integrations/Safe/GuardianSafe/GuardianSafeDefinitions.sol";
import "./MockSafe.sol";

/**
 * @title GuardianSafeWiringTest
 * @dev SPEC-2026-0175 R1 (exec selector + single-tuple encode) and R4 (meta selector double-wrap).
 *      Note: this suite proves the definition wiring only. The coarse execution latch (Finding 4) is
 *      SPEC-2026-0176; GuardianSafe is not to be treated as installable until that lands.
 */
contract GuardianSafeWiringTest is CommonBase {
    GuardianSafe internal gs;
    MockSafe internal safe;
    SafeCallRecorder internal recorder;

    uint256 internal constant OWNER_PK = 1;

    function setUp() public override {
        super.setUp();
        safe = new MockSafe();
        recorder = new SafeCallRecorder();
        gs = new GuardianSafe();
        gs.initialize(address(safe), owner, broadcaster, recovery, DEFAULT_TIMELOCK_PERIOD, address(mockEventForwarder));
        safe.installGuardForTest(address(gs));
    }

    // ============ helpers ============

    function _safeTx(address to, bytes memory data) internal pure returns (GuardianSafe.SafeTx memory t) {
        t = GuardianSafe.SafeTx({
            to: to,
            value: 0,
            data: data,
            operation: 0,
            safeTxGas: 0,
            baseGas: 0,
            gasPrice: 0,
            gasToken: address(0),
            refundReceiver: payable(address(0)),
            signatures: ""
        });
    }

    function _status(uint256 txId) internal returns (EngineBlox.TxStatus) {
        vm.prank(owner);
        return gs.getTransaction(txId).status;
    }

    function _request(GuardianSafe.SafeTx memory t) internal returns (uint256 txId) {
        vm.prank(owner);
        txId = gs.requestTransaction(t);
    }

    function _sign(EngineBlox.MetaTransaction memory m) internal view returns (EngineBlox.MetaTransaction memory) {
        m.signature = metaTxSigner.signMetaTransaction(m, OWNER_PK, address(gs));
        return m;
    }

    function _metaParams() internal pure returns (GuardianSafe.SafeMetaTxParams memory) {
        return GuardianSafe.SafeMetaTxParams({deadline: 3600, maxGasPrice: 0});
    }

    // ============ selector / schema shape ============

    function test_ExecSafeTxSelector_MatchesExecuteTransactionStruct() public pure {
        assertEq(GuardianSafeDefinitions.EXEC_SAFE_TX_SELECTOR, GuardianSafe.executeTransaction.selector);
    }

    function test_MetaSelectors_MatchEntrypoints() public pure {
        assertEq(GuardianSafeDefinitions.APPROVE_TX_META_SELECTOR, GuardianSafe.approveTransactionWithMetaTx.selector);
        assertEq(GuardianSafeDefinitions.CANCEL_TX_META_SELECTOR, GuardianSafe.cancelTransactionWithMetaTx.selector);
        assertEq(
            GuardianSafeDefinitions.REQUEST_AND_APPROVE_TX_META_SELECTOR,
            GuardianSafe.requestAndApproveTransactionWithMetaTx.selector
        );
        assertEq(GuardianSafeDefinitions.REQUEST_TX_SELECTOR, GuardianSafe.requestTransaction.selector);
        assertEq(GuardianSafeDefinitions.APPROVE_TX_DELAYED_SELECTOR, GuardianSafe.approveTransactionAfterDelay.selector);
        assertEq(GuardianSafeDefinitions.CANCEL_TX_SELECTOR, GuardianSafe.cancelTransaction.selector);
    }

    function test_ExecutionParams_AreSingleSafeTxTuple() public view {
        GuardianSafe.SafeTx memory t = _safeTx(address(recorder), abi.encodeCall(SafeCallRecorder.ping, ()));
        bytes memory params = gs.createTransactionExecutionParams(t);
        assertEq(params, abi.encode(t));
        assertEq(
            abi.encodePacked(GuardianSafeDefinitions.EXEC_SAFE_TX_SELECTOR, params),
            abi.encodeCall(GuardianSafe.executeTransaction, (t))
        );
    }

    // ============ AC1: delayed approve enters executeTransaction(SafeTx) ============

    function test_DelayedApprove_ExecutesSafeTxThroughGuard() public {
        uint256 txId = _request(_safeTx(address(recorder), abi.encodeCall(SafeCallRecorder.ping, ())));
        advanceTime(DEFAULT_TIMELOCK_PERIOD + 1);

        vm.prank(owner);
        gs.approveTransactionAfterDelay(txId);

        assertEq(uint8(_status(txId)), uint8(EngineBlox.TxStatus.COMPLETED));
        assertEq(recorder.calls(), 1);
        assertEq(recorder.lastCaller(), address(safe));
        assertEq(safe.execCount(), 1);
    }

    function test_DelayedApprove_GuardRemovalPathReachable() public {
        uint256 txId = _request(_safeTx(address(safe), abi.encodeCall(MockSafe.setGuard, (address(0)))));
        advanceTime(DEFAULT_TIMELOCK_PERIOD + 1);

        vm.prank(owner);
        gs.approveTransactionAfterDelay(txId);

        assertEq(uint8(_status(txId)), uint8(EngineBlox.TxStatus.COMPLETED));
        assertEq(safe.guard(), address(0));
    }

    function test_DirectSafeExec_RejectedByGuard() public {
        GuardianSafe.SafeTx memory t = _safeTx(address(recorder), abi.encodeCall(SafeCallRecorder.ping, ()));
        vm.expectRevert(bytes("GuardianSafe: Transactions must be executed through GuardianSafe system"));
        safe.execTransaction(t.to, 0, t.data, 0, 0, 0, 0, address(0), payable(address(0)), "");
    }

    function test_DelayedApprove_BeforeTimelock_Reverts() public {
        uint256 txId = _request(_safeTx(address(recorder), abi.encodeCall(SafeCallRecorder.ping, ())));
        vm.prank(owner);
        vm.expectRevert();
        gs.approveTransactionAfterDelay(txId);
        assertEq(recorder.calls(), 0);
    }

    function test_DelayedCancel_CancelsPending() public {
        uint256 txId = _request(_safeTx(address(recorder), abi.encodeCall(SafeCallRecorder.ping, ())));
        vm.prank(owner);
        gs.cancelTransaction(txId);
        assertEq(uint8(_status(txId)), uint8(EngineBlox.TxStatus.CANCELLED));
    }

    function test_NonOwner_CannotRequest() public {
        GuardianSafe.SafeTx memory t = _safeTx(address(recorder), abi.encodeCall(SafeCallRecorder.ping, ()));
        vm.prank(attacker);
        vm.expectRevert();
        gs.requestTransaction(t);
    }

    // ============ AC4: meta selectors bind (double-wrap) ============

    function test_MetaApprove_ExecutesSafeTx() public {
        uint256 txId = _request(_safeTx(address(recorder), abi.encodeCall(SafeCallRecorder.ping, ())));

        EngineBlox.MetaTransaction memory m = _sign(gs.generateUnsignedSafeMetaTxForExisting(txId, _metaParams(), true));
        assertEq(m.params.handlerSelector, GuardianSafe.approveTransactionWithMetaTx.selector);

        vm.prank(broadcaster);
        gs.approveTransactionWithMetaTx(m);

        assertEq(uint8(_status(txId)), uint8(EngineBlox.TxStatus.COMPLETED));
        assertEq(recorder.calls(), 1);
    }

    function test_MetaCancel_CancelsPending() public {
        uint256 txId = _request(_safeTx(address(recorder), abi.encodeCall(SafeCallRecorder.ping, ())));

        EngineBlox.MetaTransaction memory m = _sign(gs.generateUnsignedSafeMetaTxForExisting(txId, _metaParams(), false));
        assertEq(m.params.handlerSelector, GuardianSafe.cancelTransactionWithMetaTx.selector);

        vm.prank(broadcaster);
        gs.cancelTransactionWithMetaTx(m);

        assertEq(uint8(_status(txId)), uint8(EngineBlox.TxStatus.CANCELLED));
        assertEq(recorder.calls(), 0);
    }

    function test_MetaRequestAndApprove_ExecutesSafeTx() public {
        GuardianSafe.SafeTx memory t = _safeTx(address(recorder), abi.encodeCall(SafeCallRecorder.ping, ()));
        EngineBlox.MetaTransaction memory m = _sign(gs.generateUnsignedSafeMetaTxForNew(t, _metaParams()));
        assertEq(m.params.handlerSelector, GuardianSafe.requestAndApproveTransactionWithMetaTx.selector);

        vm.prank(broadcaster);
        uint256 txId = gs.requestAndApproveTransactionWithMetaTx(m);

        assertEq(uint8(_status(txId)), uint8(EngineBlox.TxStatus.COMPLETED));
        assertEq(recorder.calls(), 1);
    }

    function test_MetaApprove_SubmittedToWrongEntrypoint_Reverts() public {
        uint256 txId = _request(_safeTx(address(recorder), abi.encodeCall(SafeCallRecorder.ping, ())));
        EngineBlox.MetaTransaction memory m = _sign(gs.generateUnsignedSafeMetaTxForExisting(txId, _metaParams(), true));

        vm.prank(broadcaster);
        vm.expectRevert(
            abi.encodeWithSelector(
                SharedValidation.MetaTxHandlerSelectorMismatch.selector,
                GuardianSafe.approveTransactionWithMetaTx.selector,
                GuardianSafe.cancelTransactionWithMetaTx.selector
            )
        );
        gs.cancelTransactionWithMetaTx(m);
    }
}
