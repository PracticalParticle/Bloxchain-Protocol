// SPDX-License-Identifier: MPL-2.0
pragma solidity 0.8.35;

import "../CommonBase.sol";
import "../../../contracts/examples/integrations/Safe/GuardianSafe/GuardianSafe.sol";
import "../../../contracts/examples/integrations/Safe/GuardianSafe/GuardianSafeDefinitions.sol";
import "./MockSafe.sol";

/**
 * @title GuardianSafeWiringTest
 * @dev SPEC-2026-0175 R1 (exec selector + single-tuple encode) and R4 (meta selector double-wrap);
 *      SPEC-2026-0176 approved Safe-tx binding (guard admits only the transaction GuardianSafe is executing,
 *      single-use, cleared after; nested / replayed / post-clear Safe transactions are rejected).
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

    // ============ SPEC-2026-0176: approved Safe-tx binding ============

    string internal constant TX_REJECT = "GuardianSafe: Transactions must be executed through GuardianSafe system";
    string internal constant GUARD_REJECT = "GuardianSafe: Guard changes must be executed through GuardianSafe system";
    string internal constant NOT_SAFE = "GuardianSafe: caller is not the Safe";

    address internal constant PAYEE = address(0xBEEF);
    address internal constant THIEF = address(0xBAD);

    function _approveAfterDelay(GuardianSafe.SafeTx memory t) internal returns (uint256 txId) {
        txId = _request(t);
        advanceTime(DEFAULT_TIMELOCK_PERIOD + 1);
        vm.prank(owner);
        gs.approveTransactionAfterDelay(txId);
    }

    function _execFrom(address caller, GuardianSafe.SafeTx memory t) internal {
        vm.prank(caller);
        safe.execTransaction(
            t.to, t.value, t.data, t.operation, t.safeTxGas, t.baseGas, t.gasPrice, t.gasToken, t.refundReceiver, t.signatures
        );
    }

    function _errorString(string memory reason) internal pure returns (bytes memory) {
        return abi.encodeWithSignature("Error(string)", reason);
    }

    /// AC1 / B1: one approved native payout from the Safe succeeds end-to-end.
    function test_Binding_ApprovedPayout_PaysOut() public {
        vm.deal(address(safe), 5 ether);
        GuardianSafe.SafeTx memory t = _safeTx(PAYEE, "");
        t.value = 1 ether;

        uint256 txId = _approveAfterDelay(t);

        assertEq(uint8(_status(txId)), uint8(EngineBlox.TxStatus.COMPLETED));
        assertEq(PAYEE.balance, 1 ether);
        assertEq(address(safe).balance, 4 ether);
    }

    /// B1 / AC3: after the approved tx completes, even the identical tx sent from GuardianSafe's address is rejected.
    function test_Binding_ClearedAfterExecution_ExactReplayBlocked() public {
        vm.deal(address(safe), 5 ether);
        GuardianSafe.SafeTx memory t = _safeTx(PAYEE, "");
        t.value = 1 ether;
        _approveAfterDelay(t);

        vm.expectRevert(bytes(TX_REJECT));
        _execFrom(address(gs), t);
        assertEq(PAYEE.balance, 1 ether);
    }

    /// AC3 / B3: a plain Safe tx without GuardianSafe approval is still blocked after a governed tx ran.
    function test_Binding_PostClear_PlainSafeTxBlocked() public {
        _approveAfterDelay(_safeTx(address(recorder), abi.encodeCall(SafeCallRecorder.ping, ())));
        vm.deal(address(safe), 1 ether);

        GuardianSafe.SafeTx memory t = _safeTx(THIEF, "");
        t.value = 1 ether;
        vm.expectRevert(bytes(TX_REJECT));
        _execFrom(attacker, t);
        assertEq(THIEF.balance, 0);
    }

    /// AC2 / B2: during an approved outer call, a nested unapproved execTransaction is rejected at the guard.
    function test_Binding_NestedUnapprovedExec_RejectedAtGuard() public {
        vm.deal(address(safe), 5 ether);
        NestedSafeExecutor exec = new NestedSafeExecutor(safe);

        uint256 txId = _approveAfterDelay(
            _safeTx(address(exec), abi.encodeCall(NestedSafeExecutor.nestedExec, (THIEF, 5 ether, bytes(""))))
        );

        assertEq(uint8(_status(txId)), uint8(EngineBlox.TxStatus.COMPLETED));
        assertEq(exec.attempts(), 1);
        assertFalse(exec.nestedSucceeded());
        assertEq(exec.lastRevertData(), _errorString(TX_REJECT));
        assertEq(THIEF.balance, 0);
        assertEq(address(safe).balance, 5 ether);
    }

    /// B2: a nested guard removal during an approved outer call is rejected.
    function test_Binding_NestedGuardRemoval_Rejected() public {
        NestedSafeExecutor exec = new NestedSafeExecutor(safe);

        _approveAfterDelay(
            _safeTx(
                address(exec),
                abi.encodeCall(
                    NestedSafeExecutor.nestedExec, (address(safe), 0, abi.encodeCall(MockSafe.setGuard, (address(0))))
                )
            )
        );

        assertFalse(exec.nestedSucceeded());
        assertEq(exec.lastRevertData(), _errorString(GUARD_REJECT));
        assertEq(safe.guard(), address(gs));
    }

    /// B2: during an approved outer call, a nested `setGuard(address(gs))` gets no free pass; it must match the binding.
    function test_Binding_NestedSetGuardSelf_Rejected() public {
        NestedSafeExecutor exec = new NestedSafeExecutor(safe);

        uint256 txId = _approveAfterDelay(
            _safeTx(
                address(exec),
                abi.encodeCall(
                    NestedSafeExecutor.nestedExec, (address(safe), 0, abi.encodeCall(MockSafe.setGuard, (address(gs))))
                )
            )
        );

        assertEq(uint8(_status(txId)), uint8(EngineBlox.TxStatus.COMPLETED));
        assertEq(exec.attempts(), 1);
        assertFalse(exec.nestedSucceeded());
        assertEq(exec.lastRevertData(), _errorString(GUARD_REJECT));
        assertEq(safe.execCount(), 1);
    }

    /// Sponsor lock 2: once the governed window closes, the unapproved `setGuard(address(gs))` install path is open again.
    function test_SetGuardSelf_AllowedAgainAfterWindowCloses() public {
        _approveAfterDelay(_safeTx(address(recorder), abi.encodeCall(SafeCallRecorder.ping, ())));

        vm.prank(attacker);
        safe.execTransaction(
            address(safe), 0, abi.encodeCall(MockSafe.setGuard, (address(gs))), 0, 0, 0, 0, address(0), payable(address(0)), ""
        );
        assertEq(safe.guard(), address(gs));
        assertEq(safe.execCount(), 2);
    }

    /// B2: a nested replay of the same Safe call fields is rejected (binding is single-use and bound to GuardianSafe).
    function test_Binding_NestedReplayOfApprovedFields_Rejected() public {
        NestedSafeExecutor exec = new NestedSafeExecutor(safe);

        uint256 txId = _approveAfterDelay(_safeTx(address(exec), abi.encodeCall(NestedSafeExecutor.nestedReplay, ())));

        assertEq(uint8(_status(txId)), uint8(EngineBlox.TxStatus.COMPLETED));
        assertEq(exec.attempts(), 1);
        assertFalse(exec.nestedSucceeded());
        assertEq(exec.lastRevertData(), _errorString(TX_REJECT));
        assertEq(safe.execCount(), 1);
    }

    /// R1: the binding admits one guard check only; a second check of the same tx fails and the call does not run.
    function test_Binding_SingleUse_SecondGuardCheckFails() public {
        safe.setRecheckGuardForTest(true);
        uint256 txId = _approveAfterDelay(_safeTx(address(recorder), abi.encodeCall(SafeCallRecorder.ping, ())));

        assertEq(uint8(_status(txId)), uint8(EngineBlox.TxStatus.FAILED));
        assertEq(recorder.calls(), 0);
        assertEq(safe.execCount(), 0);
    }

    /// R2: a failed Safe call leaves no binding (governed tx FAILED; a later identical tx from GuardianSafe still blocked).
    function test_Binding_FailedSafeCall_LeavesNoBinding() public {
        GuardianSafe.SafeTx memory t = _safeTx(address(recorder), hex"deadbeef"); // no such function: inner call fails
        uint256 txId = _approveAfterDelay(t);
        assertEq(uint8(_status(txId)), uint8(EngineBlox.TxStatus.FAILED));

        vm.expectRevert(bytes(TX_REJECT));
        _execFrom(address(gs), t);
    }

    /// The guard hooks only answer the bound Safe.
    function test_GuardHooks_OnlyCallableBySafe() public {
        vm.prank(attacker);
        vm.expectRevert(bytes(NOT_SAFE));
        gs.checkTransaction(
            address(recorder), 0, "", ITransactionGuard.Operation.Call, 0, 0, 0, address(0), payable(address(0)), "", address(gs)
        );

        vm.prank(attacker);
        vm.expectRevert(bytes(NOT_SAFE));
        gs.checkAfterExecution(bytes32(0), true);
    }

    /// Sponsor lock 2: installing GuardianSafe as the guard stays allowed without a governed approval.
    function test_InitialGuardInstall_StillAllowed() public {
        MockSafe fresh = new MockSafe();
        GuardianSafe gs2 = new GuardianSafe();
        gs2.initialize(address(fresh), owner, broadcaster, recovery, DEFAULT_TIMELOCK_PERIOD, address(mockEventForwarder));
        fresh.installGuardForTest(address(gs2));

        vm.prank(attacker);
        fresh.execTransaction(
            address(fresh), 0, abi.encodeCall(MockSafe.setGuard, (address(gs2))), 0, 0, 0, 0, address(0), payable(address(0)), ""
        );
        assertEq(fresh.guard(), address(gs2));
    }
}
