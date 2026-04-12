// SPDX-License-Identifier: MPL-2.0
pragma solidity 0.8.34;

import "../CommonBase.sol";
import "../../../contracts/core/access/RuntimeRBAC.sol";
import "../../../contracts/core/access/lib/definitions/RuntimeRBACDefinitions.sol";
import "../../../contracts/core/execution/GuardController.sol";
import "../../../contracts/core/execution/lib/definitions/GuardControllerDefinitions.sol";
import "../../../contracts/core/lib/EngineBlox.sol";
import "../../../contracts/core/lib/utils/SharedValidation.sol";
import "../../../contracts/core/security/lib/definitions/SecureOwnableDefinitions.sol";
import "../helpers/TestHelpers.sol";
import "../helpers/MockContracts.sol";
import "../helpers/PaymentTestHelper.sol";

/**
 * @title AuditDerivedAttackVectorsFuzzTest
 * @dev Fuzz tests derived from AgentArena audit findings (April 2026).
 *      Each test maps to one or more audit findings and validates the
 *      implemented mitigations hold under fuzzed inputs.
 *
 * Coverage:
 *  - Finding 1  (HIGH)   : Meta-tx handler spoofing → entrypoint binding
 *  - Finding 3  (MEDIUM) : Config batch payment rail → validateEmptyPayment
 *  - Finding 5  (MEDIUM) : Unbounded returndata DoS → bounded returndata constant
 *  - Finding 6  (MEDIUM) : Whitelist bypass via payments → payout whitelists
 *  - Finding 7  (MEDIUM) : Stale recovery in ownership transfer → snapshot semantics
 *  - Finding 8  (MEDIUM) : Recovery update while ownership pending → documented behavior
 *  - Finding 11 (LOW)    : Whitelist skip for unregistered selectors → ResourceNotFound
 *  - Finding 14 (LOW)    : Pending tx after whitelist delist → re-validate on cancel/complete
 *  - Finding 22 (LOW)    : getTransactionHistory empty revert → returns []
 *  - Finding 24 (LOW)    : Predictable txId DoS → sequential counter
 *  - Finding 29 (LOW)    : Gas limit zero → gasleft() convention
 *  - Finding 31 (LOW)    : No timelock upper bound → operator responsibility
 *  - Codex MT-008       : Symmetric handler mismatch (guard-signed → RBAC entry)
 *  - Codex Finding 3   : validateEmptyPayment — native-only non-zero fields
 */
contract AuditDerivedAttackVectorsFuzzTest is CommonBase {
    using TestHelpers for *;

    bytes4 public constant ROLE_CONFIG_BATCH_META_SELECTOR = RuntimeRBACDefinitions.ROLE_CONFIG_BATCH_META_SELECTOR;
    bytes4 public constant ROLE_CONFIG_BATCH_EXECUTE_SELECTOR = RuntimeRBACDefinitions.ROLE_CONFIG_BATCH_EXECUTE_SELECTOR;
    bytes32 public constant ROLE_CONFIG_BATCH_OPERATION_TYPE = RuntimeRBACDefinitions.ROLE_CONFIG_BATCH;

    bytes4 public constant GUARD_CONFIG_BATCH_META_SELECTOR = GuardControllerDefinitions.GUARD_CONFIG_BATCH_META_SELECTOR;

    PaymentTestHelper public paymentHelper;

    function setUp() public override {
        super.setUp();

        vm.deal(address(accountBlox), 100 ether);
        mockERC20.mint(address(accountBlox), 1_000_000e18);

        paymentHelper = new PaymentTestHelper();
        vm.prank(owner);
        paymentHelper.initialize(owner, broadcaster, recovery, DEFAULT_TIMELOCK_PERIOD, address(0));
        vm.deal(address(paymentHelper), 100 ether);
        mockERC20.mint(address(paymentHelper), 1_000_000e18);
        vm.prank(owner);
        paymentHelper.whitelistTargetForTesting(address(mockERC20), EngineBlox.ERC20_TRANSFER_SELECTOR);
    }

    // =========================================================================
    // Finding 1 — Meta-tx handler selector mismatch (HIGH)
    // =========================================================================

    /**
     * @dev Audit Finding 1: A meta-tx signed for handler A must not be submittable
     *      through wrapper B. The entrypoint binding in BaseStateMachine rejects
     *      any meta-tx whose handlerSelector != msg.sig.
     *
     *      Attack: sign for roleConfigBatchRequestAndApprove, submit through
     *      guardConfigBatchRequestAndApprove (different msg.sig).
     */
    function testFuzz_Finding1_HandlerSelectorMismatchRejected() public {
        IRuntimeRBAC.RoleConfigAction[] memory actions = new IRuntimeRBAC.RoleConfigAction[](1);
        EngineBlox.FunctionPermission[] memory permissions = new EngineBlox.FunctionPermission[](0);
        actions[0] = IRuntimeRBAC.RoleConfigAction({
            actionType: IRuntimeRBAC.RoleConfigActionType.CREATE_ROLE,
            data: abi.encode("AUDIT_ROLE", 10, permissions)
        });

        bytes memory executionParams = RuntimeRBACDefinitions.roleConfigBatchExecutionParams(abi.encode(actions));

        // Sign for the RBAC batch handler
        EngineBlox.MetaTxParams memory metaTxParams = accountBlox.createMetaTxParams(
            address(accountBlox),
            ROLE_CONFIG_BATCH_META_SELECTOR, // signed handler = RBAC batch
            EngineBlox.TxAction.SIGN_META_REQUEST_AND_APPROVE,
            1 hours,
            0,
            owner
        );

        EngineBlox.MetaTransaction memory metaTx = accountBlox.generateUnsignedMetaTransactionForNew(
            owner,
            address(accountBlox),
            0,
            0,
            ROLE_CONFIG_BATCH_OPERATION_TYPE,
            ROLE_CONFIG_BATCH_EXECUTE_SELECTOR,
            executionParams,
            metaTxParams
        );

        uint256 pk = _getPrivateKeyForAddress(owner);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, metaTx.message);
        metaTx.signature = abi.encodePacked(r, s, v);

        // Submit through the Guard config batch wrapper (different msg.sig)
        vm.prank(broadcaster);
        vm.expectRevert(
            abi.encodeWithSelector(
                SharedValidation.MetaTxHandlerSelectorMismatch.selector,
                ROLE_CONFIG_BATCH_META_SELECTOR,
                GUARD_CONFIG_BATCH_META_SELECTOR
            )
        );
        accountBlox.guardConfigBatchRequestAndApprove(metaTx);
    }

    /**
     * @dev Codex MT-008 / symmetric Finding 1: meta-tx signed for **guard** config batch
     *      must not be submittable through **role** config batch (reverse cross-wrapper).
     */
    function testFuzz_Finding1_HandlerMismatch_GuardSignedRoleSubmitted() public {
        IGuardController.GuardConfigAction[] memory gActions = new IGuardController.GuardConfigAction[](0);
        bytes memory executionParams = GuardControllerDefinitions.guardConfigBatchExecutionParams(gActions);

        EngineBlox.MetaTxParams memory metaTxParams = accountBlox.createMetaTxParams(
            address(accountBlox),
            GUARD_CONFIG_BATCH_META_SELECTOR,
            EngineBlox.TxAction.SIGN_META_REQUEST_AND_APPROVE,
            1 hours,
            0,
            owner
        );

        EngineBlox.MetaTransaction memory metaTx = accountBlox.generateUnsignedMetaTransactionForNew(
            owner,
            address(accountBlox),
            0,
            0,
            GuardControllerDefinitions.CONTROLLER_CONFIG_BATCH,
            GuardControllerDefinitions.GUARD_CONFIG_BATCH_EXECUTE_SELECTOR,
            executionParams,
            metaTxParams
        );

        uint256 pk = _getPrivateKeyForAddress(owner);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, metaTx.message);
        metaTx.signature = abi.encodePacked(r, s, v);

        vm.prank(broadcaster);
        vm.expectRevert(
            abi.encodeWithSelector(
                SharedValidation.MetaTxHandlerSelectorMismatch.selector,
                GUARD_CONFIG_BATCH_META_SELECTOR,
                ROLE_CONFIG_BATCH_META_SELECTOR
            )
        );
        accountBlox.roleConfigBatchRequestAndApprove(metaTx);
    }

    /**
     * @dev Finding 1 (contract binding): handlerContract must equal address(this).
     *      (A) Fail-fast: `generateUnsignedMetaTransactionForNew` → `generateMetaTransaction` uses
     *      `SharedValidation.validateMetaTxHandlerContractBinding` (same custom error as on-chain).
     *      (B) On-chain: `EngineBlox.verifySignature` re-checks `metaTx.params.handlerContract` before
     *      `generateMessageHash` / `recoverSigner`, so a calldata struct tampered after a valid sign
     *      still reverts `MetaTxHandlerContractMismatch` when submitted via `roleConfigBatchRequestAndApprove`.
     */
    function testFuzz_Finding1_HandlerContractMismatchRejected(address wrongContract) public {
        vm.assume(wrongContract != address(accountBlox));
        vm.assume(wrongContract != address(0));

        IRuntimeRBAC.RoleConfigAction[] memory actions = new IRuntimeRBAC.RoleConfigAction[](1);
        EngineBlox.FunctionPermission[] memory permissions = new EngineBlox.FunctionPermission[](0);
        actions[0] = IRuntimeRBAC.RoleConfigAction({
            actionType: IRuntimeRBAC.RoleConfigActionType.CREATE_ROLE,
            data: abi.encode("AUDIT_ROLE", 10, permissions)
        });
        bytes memory executionParams = RuntimeRBACDefinitions.roleConfigBatchExecutionParams(abi.encode(actions));

        EngineBlox.MetaTxParams memory metaTxParamsBad = accountBlox.createMetaTxParams(
            address(accountBlox),
            ROLE_CONFIG_BATCH_META_SELECTOR,
            EngineBlox.TxAction.SIGN_META_REQUEST_AND_APPROVE,
            1 hours,
            0,
            owner
        );
        // (A) Tamper the handlerContract before generation
        metaTxParamsBad.handlerContract = wrongContract;

        vm.expectRevert(
            abi.encodeWithSelector(
                SharedValidation.MetaTxHandlerContractMismatch.selector,
                wrongContract,
                address(accountBlox)
            )
        );
        accountBlox.generateUnsignedMetaTransactionForNew(
            owner,
            address(accountBlox),
            0,
            0,
            ROLE_CONFIG_BATCH_OPERATION_TYPE,
            ROLE_CONFIG_BATCH_EXECUTE_SELECTOR,
            executionParams,
            metaTxParamsBad
        );

        // (B) Valid unsigned meta-tx + signature, then tamper params.handlerContract; submit through production wrapper
        EngineBlox.MetaTxParams memory metaTxParamsGood = accountBlox.createMetaTxParams(
            address(accountBlox),
            ROLE_CONFIG_BATCH_META_SELECTOR,
            EngineBlox.TxAction.SIGN_META_REQUEST_AND_APPROVE,
            1 hours,
            0,
            owner
        );
        EngineBlox.MetaTransaction memory metaTx = accountBlox.generateUnsignedMetaTransactionForNew(
            owner,
            address(accountBlox),
            0,
            0,
            ROLE_CONFIG_BATCH_OPERATION_TYPE,
            ROLE_CONFIG_BATCH_EXECUTE_SELECTOR,
            executionParams,
            metaTxParamsGood
        );
        uint256 pk = _getPrivateKeyForAddress(owner);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, metaTx.message);
        metaTx.signature = abi.encodePacked(r, s, v);

        metaTx.params.handlerContract = wrongContract;

        vm.prank(broadcaster);
        vm.expectRevert(
            abi.encodeWithSelector(
                SharedValidation.MetaTxHandlerContractMismatch.selector,
                wrongContract,
                address(accountBlox)
            )
        );
        accountBlox.roleConfigBatchRequestAndApprove(metaTx);
    }

    // =========================================================================
    // Finding 3 — Config batch as payment rail (MEDIUM)
    // =========================================================================

    /**
     * @dev Audit Finding 3: roleConfigBatchRequestAndApprove must reject
     *      non-zero payment fields. Fuzz all four payment dimensions.
     */
    function testFuzz_Finding3_RBACBatchRejectsNonZeroPayment(
        address recipient,
        uint256 nativeAmount,
        address erc20Token,
        uint256 erc20Amount
    ) public {
        // At least one payment field must be non-zero
        vm.assume(
            recipient != address(0) ||
            nativeAmount != 0 ||
            erc20Token != address(0) ||
            erc20Amount != 0
        );

        IRuntimeRBAC.RoleConfigAction[] memory actions = new IRuntimeRBAC.RoleConfigAction[](0);
        bytes memory executionParams = RuntimeRBACDefinitions.roleConfigBatchExecutionParams(abi.encode(actions));

        EngineBlox.MetaTxParams memory metaTxParams = accountBlox.createMetaTxParams(
            address(accountBlox),
            ROLE_CONFIG_BATCH_META_SELECTOR,
            EngineBlox.TxAction.SIGN_META_REQUEST_AND_APPROVE,
            1 hours,
            0,
            owner
        );

        EngineBlox.MetaTransaction memory metaTx = accountBlox.generateUnsignedMetaTransactionForNew(
            owner,
            address(accountBlox),
            0,
            0,
            ROLE_CONFIG_BATCH_OPERATION_TYPE,
            ROLE_CONFIG_BATCH_EXECUTE_SELECTOR,
            executionParams,
            metaTxParams
        );

        // Inject non-zero payment
        metaTx.txRecord.payment = EngineBlox.PaymentDetails({
            recipient: recipient,
            nativeTokenAmount: nativeAmount,
            erc20TokenAddress: erc20Token,
            erc20TokenAmount: erc20Amount
        });

        uint256 pk = _getPrivateKeyForAddress(owner);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, metaTx.message);
        metaTx.signature = abi.encodePacked(r, s, v);

        vm.prank(broadcaster);
        vm.expectRevert(abi.encodeWithSelector(SharedValidation.InvalidPayment.selector));
        accountBlox.roleConfigBatchRequestAndApprove(metaTx);
    }

    /**
     * @dev Finding 3 (guard side): guardConfigBatchRequestAndApprove also rejects
     *      non-zero payment fields.
     */
    function testFuzz_Finding3_GuardBatchRejectsNonZeroPayment(
        uint256 nativeAmount
    ) public {
        nativeAmount = bound(nativeAmount, 1, type(uint128).max);

        IGuardController.GuardConfigAction[] memory actions = new IGuardController.GuardConfigAction[](0);
        bytes memory executionParams = GuardControllerDefinitions.guardConfigBatchExecutionParams(actions);

        EngineBlox.MetaTxParams memory metaTxParams = accountBlox.createMetaTxParams(
            address(accountBlox),
            GUARD_CONFIG_BATCH_META_SELECTOR,
            EngineBlox.TxAction.SIGN_META_REQUEST_AND_APPROVE,
            1 hours,
            0,
            owner
        );

        EngineBlox.MetaTransaction memory metaTx = accountBlox.generateUnsignedMetaTransactionForNew(
            owner,
            address(accountBlox),
            0,
            0,
            GuardControllerDefinitions.CONTROLLER_CONFIG_BATCH,
            GuardControllerDefinitions.GUARD_CONFIG_BATCH_EXECUTE_SELECTOR,
            executionParams,
            metaTxParams
        );

        metaTx.txRecord.payment.nativeTokenAmount = nativeAmount;

        uint256 pk = _getPrivateKeyForAddress(owner);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, metaTx.message);
        metaTx.signature = abi.encodePacked(r, s, v);

        vm.prank(broadcaster);
        vm.expectRevert(abi.encodeWithSelector(SharedValidation.InvalidPayment.selector));
        accountBlox.guardConfigBatchRequestAndApprove(metaTx);
    }

    /**
     * @dev Finding 3 edge: `validateEmptyPayment` rejects **native-only** non-zero payment
     *      (zero recipient is still invalid when `nativeTokenAmount > 0`).
     */
    function testFuzz_Finding3_RBACBatchRejectsNativeOnlyNonZeroPayment(uint256 nativeAmount) public {
        nativeAmount = bound(nativeAmount, 1, type(uint128).max);

        IRuntimeRBAC.RoleConfigAction[] memory actions = new IRuntimeRBAC.RoleConfigAction[](0);
        bytes memory executionParams = RuntimeRBACDefinitions.roleConfigBatchExecutionParams(abi.encode(actions));

        EngineBlox.MetaTxParams memory metaTxParams = accountBlox.createMetaTxParams(
            address(accountBlox),
            ROLE_CONFIG_BATCH_META_SELECTOR,
            EngineBlox.TxAction.SIGN_META_REQUEST_AND_APPROVE,
            1 hours,
            0,
            owner
        );

        EngineBlox.MetaTransaction memory metaTx = accountBlox.generateUnsignedMetaTransactionForNew(
            owner,
            address(accountBlox),
            0,
            0,
            ROLE_CONFIG_BATCH_OPERATION_TYPE,
            ROLE_CONFIG_BATCH_EXECUTE_SELECTOR,
            executionParams,
            metaTxParams
        );

        metaTx.txRecord.payment = EngineBlox.PaymentDetails({
            recipient: address(0),
            nativeTokenAmount: nativeAmount,
            erc20TokenAddress: address(0),
            erc20TokenAmount: 0
        });

        uint256 pk = _getPrivateKeyForAddress(owner);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, metaTx.message);
        metaTx.signature = abi.encodePacked(r, s, v);

        vm.prank(broadcaster);
        vm.expectRevert(abi.encodeWithSelector(SharedValidation.InvalidPayment.selector));
        accountBlox.roleConfigBatchRequestAndApprove(metaTx);
    }

    // =========================================================================
    // Finding 5 — Bounded returndata constant (MEDIUM)
    // =========================================================================

    /**
     * @dev Audit Finding 5: MAX_RESULT_PREVIEW_BYTES is 32 KiB. Verify the
     *      on-chain constant matches the documented cap.
     */
    function testFuzz_Finding5_MaxResultPreviewBytesIs32KiB() public pure {
        assertEq(EngineBlox.MAX_RESULT_PREVIEW_BYTES, 32 * 1024);
    }

    // =========================================================================
    // Finding 6 — Payment recipient whitelist enforcement (MEDIUM)
    // =========================================================================

    /**
     * @dev Audit Finding 6: Attached payment to a non-whitelisted recipient
     *      must revert at request time. Fuzz the recipient address.
     */
    function testFuzz_Finding6_NonWhitelistedRecipientRejected(address randomRecipient) public {
        vm.assume(randomRecipient != address(0));
        vm.assume(randomRecipient != address(paymentHelper));
        vm.assume(randomRecipient != owner && randomRecipient != broadcaster && randomRecipient != recovery);

        EngineBlox.PaymentDetails memory payment = EngineBlox.PaymentDetails({
            recipient: randomRecipient,
            nativeTokenAmount: 1 ether,
            erc20TokenAddress: address(0),
            erc20TokenAmount: 0
        });

        vm.prank(owner);
        vm.expectRevert(); // TargetNotWhitelisted or ResourceNotFound
        paymentHelper.requestTransactionWithPayment(
            owner,
            address(paymentHelper),
            0,
            0,
            keccak256("NATIVE_TRANSFER"),
            EngineBlox.NATIVE_TRANSFER_SELECTOR,
            "",
            payment
        );
    }

    /**
     * @dev Finding 6 (ERC20 side): Non-whitelisted ERC20 token address must
     *      revert at request time.
     */
    function testFuzz_Finding6_NonWhitelistedERC20Rejected(address badToken) public {
        vm.assume(badToken != address(0));
        vm.assume(badToken != address(mockERC20));
        vm.assume(badToken != address(paymentHelper));
        vm.assume(badToken != owner && badToken != broadcaster && badToken != recovery);

        // Whitelist a valid recipient so only the token check fails
        vm.prank(owner);
        paymentHelper.whitelistTargetForTesting(user1, EngineBlox.ATTACHED_PAYMENT_RECIPIENT_SELECTOR);

        EngineBlox.PaymentDetails memory payment = EngineBlox.PaymentDetails({
            recipient: user1,
            nativeTokenAmount: 0,
            erc20TokenAddress: badToken,
            erc20TokenAmount: 100e18
        });

        vm.prank(owner);
        vm.expectRevert(); // TargetNotWhitelisted for ERC20_TRANSFER_SELECTOR
        paymentHelper.requestTransactionWithPayment(
            owner,
            address(paymentHelper),
            0,
            0,
            keccak256("NATIVE_TRANSFER"),
            EngineBlox.NATIVE_TRANSFER_SELECTOR,
            "",
            payment
        );
    }

    // =========================================================================
    // Finding 7 — Stale recovery snapshot in ownership transfer (MEDIUM)
    // =========================================================================

    /**
     * @dev Audit Finding 7: transferOwnershipRequest snapshots recovery at
     *      request time. Verify the snapshot is the current recovery, not an
     *      arbitrary value.
     */
    function testFuzz_Finding7_OwnershipTransferSnapshotsCurrentRecovery() public {
        address currentRecovery = accountBlox.getRecovery();
        assertEq(currentRecovery, recovery);

        // transferOwnershipRequest must be called by recovery
        vm.prank(recovery);
        uint256 txId = accountBlox.transferOwnershipRequest();

        // Read the stored tx and decode executionParams to verify snapshot
        vm.prank(owner);
        EngineBlox.TxRecord memory txRecord = accountBlox.getTransaction(txId);
        address snapshotRecovery = abi.decode(txRecord.params.executionParams, (address));
        assertEq(snapshotRecovery, recovery, "Snapshot must equal recovery at request time");
    }

    // =========================================================================
    // Finding 8 — Recovery update while ownership transfer pending (MEDIUM)
    // =========================================================================

    /**
     * @dev Audit Finding 8: updateRecoveryRequestAndApprove does not block
     *      when an ownership transfer is pending. Verify this documented behavior.
     */
    function testFuzz_Finding8_RecoveryUpdateNotBlockedByPendingOwnership(address newRecovery) public {
        vm.assume(newRecovery != address(0));
        vm.assume(newRecovery != recovery);
        vm.assume(newRecovery != owner);
        vm.assume(newRecovery != broadcaster);

        // Request ownership transfer (creates pending tx — must be called by recovery)
        vm.prank(recovery);
        accountBlox.transferOwnershipRequest();

        // Build a recovery update meta-tx (should succeed despite pending ownership)
        EngineBlox.MetaTxParams memory metaTxParams = accountBlox.createMetaTxParams(
            address(accountBlox),
            SecureOwnableDefinitions.UPDATE_RECOVERY_META_SELECTOR,
            EngineBlox.TxAction.SIGN_META_REQUEST_AND_APPROVE,
            1 hours,
            0,
            owner
        );

        bytes memory recoveryExecutionParams = abi.encode(newRecovery);

        EngineBlox.MetaTransaction memory metaTx = accountBlox.generateUnsignedMetaTransactionForNew(
            owner,
            address(accountBlox),
            0,
            0,
            SecureOwnableDefinitions.RECOVERY_UPDATE,
            SecureOwnableDefinitions.UPDATE_RECOVERY_SELECTOR,
            recoveryExecutionParams,
            metaTxParams
        );

        uint256 pk = _getPrivateKeyForAddress(owner);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, metaTx.message);
        metaTx.signature = abi.encodePacked(r, s, v);

        // Should succeed — recovery rotation is not gated by pending ownership
        vm.prank(broadcaster);
        accountBlox.updateRecoveryRequestAndApprove(metaTx);
        assertEq(accountBlox.getRecovery(), newRecovery, "Recovery should be updated");
    }

    // =========================================================================
    // Finding 11 — Unregistered selector whitelist revert (LOW)
    // =========================================================================

    /**
     * @dev Audit Finding 11: unregistered execution selector reverts `ResourceNotFound`
     *      (`_validateFunctionSchemaExists` in `txRequest` before `_txRequest` / `_validateTargetWhitelist`).
     */
    function testFuzz_Finding11_UnregisteredSelectorRevertsResourceNotFound(bytes4 randomSelector) public {
        // Avoid selectors registered on `paymentHelper` (schema set) so we hit `ResourceNotFound`, not `NoPermission`
        vm.assume(randomSelector != bytes4(0));
        vm.assume(randomSelector != EngineBlox.NATIVE_TRANSFER_SELECTOR);
        vm.assume(randomSelector != EngineBlox.ATTACHED_PAYMENT_RECIPIENT_SELECTOR);
        vm.assume(randomSelector != EngineBlox.ERC20_TRANSFER_SELECTOR);
        vm.assume(randomSelector != paymentHelper.requestTransaction.selector);
        vm.assume(randomSelector != paymentHelper.requestTransactionWithPayment.selector);
        vm.assume(randomSelector != paymentHelper.approveTransaction.selector);
        vm.assume(randomSelector != paymentHelper.cancelTransaction.selector);

        vm.expectRevert(
            abi.encodeWithSelector(SharedValidation.ResourceNotFound.selector, bytes32(randomSelector))
        );
        vm.prank(owner);
        paymentHelper.requestTransaction(
            owner,
            address(mockTarget),
            0,
            0,
            keccak256("UNKNOWN_OP"),
            randomSelector,
            ""
        );
    }

    // =========================================================================
    // Finding 14 — Pending tx after whitelist delist (LOW)
    // =========================================================================

    /**
     * @dev Audit Finding 14: A pending tx created while `target` was whitelisted must
     *      still pass `_validateTargetWhitelist` on cancel/complete. Removing the
     *      whitelist entry after request must block both cancel and delayed approve.
     */
    function testFuzz_Finding14_PendingTxAfterWhitelistDelist_CancelReverts() public {
        // Keep owner as msg.sender for all helper calls (expectRevert can interact poorly with one-shot prank)
        vm.startPrank(owner);
        paymentHelper.whitelistTargetForTesting(address(mockTarget), EngineBlox.NATIVE_TRANSFER_SELECTOR);

        uint256 txId = paymentHelper.requestTransaction(
            owner,
            address(mockTarget),
            0,
            100_000,
            keccak256("NATIVE_TRANSFER"),
            EngineBlox.NATIVE_TRANSFER_SELECTOR,
            ""
        );
        assertEq(uint8(paymentHelper.getTransaction(txId).status), uint8(EngineBlox.TxStatus.PENDING));

        paymentHelper.removeTargetFromWhitelistForTesting(address(mockTarget), EngineBlox.NATIVE_TRANSFER_SELECTOR);

        vm.expectRevert(
            abi.encodeWithSelector(
                SharedValidation.TargetNotWhitelisted.selector,
                address(mockTarget),
                EngineBlox.NATIVE_TRANSFER_SELECTOR
            )
        );
        paymentHelper.cancelTransaction(txId);
        vm.stopPrank();
    }

    /**
     * @dev Finding 14 (approve path): after delist, delayed approval must revert at
     *      `_completeTransaction` → `_validateTargetWhitelist` even though the tx was valid at request.
     */
    function testFuzz_Finding14_PendingTxAfterWhitelistDelist_ApproveReverts() public {
        vm.prank(owner);
        paymentHelper.whitelistTargetForTesting(address(mockTarget), EngineBlox.NATIVE_TRANSFER_SELECTOR);

        vm.prank(owner);
        uint256 txId = paymentHelper.requestTransaction(
            owner,
            address(mockTarget),
            0,
            100_000,
            keccak256("NATIVE_TRANSFER"),
            EngineBlox.NATIVE_TRANSFER_SELECTOR,
            ""
        );

        vm.prank(owner);
        paymentHelper.removeTargetFromWhitelistForTesting(address(mockTarget), EngineBlox.NATIVE_TRANSFER_SELECTOR);

        vm.warp(block.timestamp + DEFAULT_TIMELOCK_PERIOD + 1);

        vm.startPrank(owner);
        vm.expectRevert(
            abi.encodeWithSelector(
                SharedValidation.TargetNotWhitelisted.selector,
                address(mockTarget),
                EngineBlox.NATIVE_TRANSFER_SELECTOR
            )
        );
        paymentHelper.approveTransaction(txId);
        vm.stopPrank();
    }

    // =========================================================================
    // Finding 22 — getTransactionHistory empty case (LOW)
    // =========================================================================

    /**
     * @dev Audit Finding 22: getTransactionHistory must return [] when no
     *      transactions exist, not revert.
     */
    function testFuzz_Finding22_EmptyTransactionHistoryReturnsEmptyArray() public {
        // Fresh contract — no transactions submitted yet
        AccountPatternTest freshAccount = new AccountPatternTest();
        vm.prank(owner);
        freshAccount.initialize(owner, broadcaster, recovery, DEFAULT_TIMELOCK_PERIOD, address(0));

        vm.prank(owner);
        EngineBlox.TxRecord[] memory history = freshAccount.getTransactionHistory(0, 100);
        assertEq(history.length, 0, "Should return empty array, not revert");
    }

    /**
     * @dev Finding 22: Non-overlapping range also returns [].
     */
    function testFuzz_Finding22_NonOverlappingRangeReturnsEmpty(uint256 fromId) public {
        fromId = bound(fromId, 1000, type(uint128).max);

        AccountPatternTest freshAccount = new AccountPatternTest();
        vm.prank(owner);
        freshAccount.initialize(owner, broadcaster, recovery, DEFAULT_TIMELOCK_PERIOD, address(0));

        vm.prank(owner);
        EngineBlox.TxRecord[] memory history = freshAccount.getTransactionHistory(fromId, fromId + 10);
        assertEq(history.length, 0, "Non-overlapping range should return empty");
    }

    // =========================================================================
    // Finding 24 — Predictable txId (sequential counter) (LOW)
    // =========================================================================

    /**
     * @dev Audit Finding 24: txCounter is sequential and observable. Verify
     *      that successive txIds are strictly incrementing by 1.
     */
    function testFuzz_Finding24_TxIdIsSequentialAndPredictable() public {
        // First tx
        IRuntimeRBAC.RoleConfigAction[] memory actions1 = new IRuntimeRBAC.RoleConfigAction[](1);
        EngineBlox.FunctionPermission[] memory perms1 = new EngineBlox.FunctionPermission[](0);
        actions1[0] = IRuntimeRBAC.RoleConfigAction({
            actionType: IRuntimeRBAC.RoleConfigActionType.CREATE_ROLE,
            data: abi.encode("COUNTER_A", 10, perms1)
        });
        bytes memory exec1 = RuntimeRBACDefinitions.roleConfigBatchExecutionParams(abi.encode(actions1));
        EngineBlox.MetaTransaction memory metaTx1 = _createMetaTxForRoleConfig(owner, exec1, 1 hours);
        vm.prank(broadcaster);
        uint256 txId1 = accountBlox.roleConfigBatchRequestAndApprove(metaTx1);

        // Second tx
        IRuntimeRBAC.RoleConfigAction[] memory actions2 = new IRuntimeRBAC.RoleConfigAction[](1);
        EngineBlox.FunctionPermission[] memory perms2 = new EngineBlox.FunctionPermission[](0);
        actions2[0] = IRuntimeRBAC.RoleConfigAction({
            actionType: IRuntimeRBAC.RoleConfigActionType.CREATE_ROLE,
            data: abi.encode("COUNTER_B", 10, perms2)
        });
        bytes memory exec2 = RuntimeRBACDefinitions.roleConfigBatchExecutionParams(abi.encode(actions2));
        EngineBlox.MetaTransaction memory metaTx2 = _createMetaTxForRoleConfig(owner, exec2, 1 hours);
        vm.prank(broadcaster);
        uint256 txId2 = accountBlox.roleConfigBatchRequestAndApprove(metaTx2);

        assertEq(txId2, txId1 + 1, "Sequential txIds must differ by exactly 1");
    }

    // =========================================================================
    // Finding 29 — Gas limit zero convention (LOW)
    // =========================================================================

    /**
     * @dev Audit Finding 29: gasLimit == 0 in TxParams means forward all remaining
     *      gas (gasleft() convention). The constant is not enforced; test that
     *      zero gas-limit requests are accepted.
     */
    function testFuzz_Finding29_ZeroGasLimitAcceptedInRequest() public {
        // Request a transaction with gasLimit = 0
        vm.prank(owner);
        paymentHelper.whitelistTargetForTesting(address(mockTarget), EngineBlox.NATIVE_TRANSFER_SELECTOR);

        vm.prank(owner);
        uint256 txId = paymentHelper.requestTransaction(
            owner,
            address(mockTarget),
            0,   // value
            0,   // gasLimit == 0
            keccak256("NATIVE_TRANSFER"),
            EngineBlox.NATIVE_TRANSFER_SELECTOR,
            ""
        );
        assertTrue(txId > 0, "Zero gasLimit request should succeed");
    }

    // =========================================================================
    // Finding 31 — No upper bound on timelock (LOW)
    // =========================================================================

    /**
     * @dev Audit Finding 31: Extremely large timelock values are accepted by
     *      the contract. Deployers must validate in scripts. Verify the contract
     *      does not cap the value at any on-chain maximum.
     */
    function testFuzz_Finding31_LargeTimelockAccepted(uint256 largePeriod) public {
        largePeriod = bound(largePeriod, 1, type(uint128).max);

        AccountPatternTest largeTimelockAccount = new AccountPatternTest();
        vm.prank(owner);
        largeTimelockAccount.initialize(owner, broadcaster, recovery, largePeriod, address(0));
        assertEq(largeTimelockAccount.getTimeLockPeriodSec(), largePeriod);
    }

    // =========================================================================
    // Helpers
    // =========================================================================

    function _createMetaTxForRoleConfig(
        address signer,
        bytes memory executionParams,
        uint256 deadline
    ) internal returns (EngineBlox.MetaTransaction memory) {
        EngineBlox.MetaTxParams memory metaTxParams = accountBlox.createMetaTxParams(
            address(accountBlox),
            ROLE_CONFIG_BATCH_META_SELECTOR,
            EngineBlox.TxAction.SIGN_META_REQUEST_AND_APPROVE,
            deadline,
            0,
            signer
        );

        EngineBlox.MetaTransaction memory metaTx = accountBlox.generateUnsignedMetaTransactionForNew(
            signer,
            address(accountBlox),
            0,
            0,
            ROLE_CONFIG_BATCH_OPERATION_TYPE,
            ROLE_CONFIG_BATCH_EXECUTE_SELECTOR,
            executionParams,
            metaTxParams
        );

        uint256 signerPrivateKey = _getPrivateKeyForAddress(signer);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPrivateKey, metaTx.message);
        metaTx.signature = abi.encodePacked(r, s, v);
        return metaTx;
    }

    function _getPrivateKeyForAddress(address addr) internal view returns (uint256) {
        if (addr == owner) return 1;
        if (addr == broadcaster) return 2;
        if (addr == recovery) return 3;
        for (uint256 i = 4; i <= 100; i++) {
            if (vm.addr(i) == addr) return i;
        }
        revert("No matching private key found");
    }
}
