// SPDX-License-Identifier: MPL-2.0
pragma solidity 0.8.35;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "../../../contracts/account/BasicAccount.sol";
import "../../../contracts/core/base/interface/IBaseStateMachine.sol";
import "../../../contracts/core/access/interface/IRuntimeRBAC.sol";
import "../../../contracts/core/execution/interface/IGuardController.sol";
import "../../../contracts/core/security/interface/ISecureOwnable.sol";
import "../../../contracts/core/security/lib/definitions/SecureOwnableDefinitions.sol";
import "../../../contracts/core/lib/EngineBlox.sol";
import "../../../contracts/core/lib/utils/SharedValidation.sol";

/**
 * @title BasicAccountTest
 * @dev SPEC-2026-0130 REQ-2 / AC3: the canonical account keeps a 1-day floor and a 90-day
 *      ceiling on `initialize` and on timelock updates, and its implementation can never be
 *      initialized.
 */
contract BasicAccountTest is Test {
    BasicAccount internal implementation;

    uint256 internal constant OWNER_KEY = 1;
    address internal owner;
    address internal broadcaster;
    address internal recovery;

    function setUp() public {
        owner = vm.addr(OWNER_KEY);
        broadcaster = vm.addr(2);
        recovery = vm.addr(3);
        implementation = new BasicAccount();
    }

    function _freshClone() internal returns (BasicAccount) {
        return BasicAccount(payable(Clones.clone(address(implementation))));
    }

    function _initializedClone(uint256 timeLockPeriodSec) internal returns (BasicAccount account) {
        account = _freshClone();
        account.initialize(owner, broadcaster, recovery, timeLockPeriodSec, address(0));
    }

    // ============ constants and implementation lock ============

    function test_Bounds_AreOneDayAndNinetyDays() public view {
        assertEq(implementation.MIN_TIME_LOCK_PERIOD(), 1 days, "floor");
        assertEq(implementation.MAX_TIME_LOCK_PERIOD(), 90 days, "ceiling");
    }

    function test_Implementation_CannotBeInitialized() public {
        vm.expectRevert(Initializable.InvalidInitialization.selector);
        implementation.initialize(owner, broadcaster, recovery, 1 days, address(0));
        assertFalse(implementation.initialized(), "implementation stays uninitialized");
    }

    // ============ initialize bounds (AC3) ============

    function test_Initialize_RevertsBelowFloor() public {
        BasicAccount account = _freshClone();
        vm.expectRevert(abi.encodeWithSelector(SharedValidation.InvalidTimeLockPeriod.selector, 1 days - 1));
        account.initialize(owner, broadcaster, recovery, 1 days - 1, address(0));
    }

    function test_Initialize_RevertsAboveCeiling() public {
        BasicAccount account = _freshClone();
        vm.expectRevert(abi.encodeWithSelector(SharedValidation.InvalidTimeLockPeriod.selector, 90 days + 1));
        account.initialize(owner, broadcaster, recovery, 90 days + 1, address(0));
    }

    function test_Initialize_AcceptsFloorAndCeiling() public {
        assertEq(_initializedClone(1 days).getTimeLockPeriodSec(), 1 days, "floor accepted");
        assertEq(_initializedClone(90 days).getTimeLockPeriodSec(), 90 days, "ceiling accepted");
    }

    function test_Initialize_OnlyOnce() public {
        BasicAccount account = _initializedClone(1 days);
        vm.expectRevert(Initializable.InvalidInitialization.selector);
        account.initialize(owner, broadcaster, recovery, 1 days, address(0));
    }

    function testFuzz_Initialize_EnforcesBounds(uint256 period) public {
        BasicAccount account = _freshClone();
        if (period < 1 days || period > 90 days) {
            vm.expectRevert(abi.encodeWithSelector(SharedValidation.InvalidTimeLockPeriod.selector, period));
            account.initialize(owner, broadcaster, recovery, period, address(0));
        } else {
            account.initialize(owner, broadcaster, recovery, period, address(0));
            assertEq(account.getTimeLockPeriodSec(), period, "period stored");
        }
    }

    // ============ timelock update bounds (AC3) ============

    /// @dev Owner-signed, broadcaster-executed timelock update (the only update path).
    function _updateTimeLock(BasicAccount account, uint256 newPeriod) internal returns (EngineBlox.TxRecord memory) {
        EngineBlox.MetaTxParams memory metaTxParams = account.createMetaTxParams(
            address(account),
            SecureOwnableDefinitions.UPDATE_TIMELOCK_META_SELECTOR,
            EngineBlox.TxAction.SIGN_META_REQUEST_AND_APPROVE,
            1 hours,
            0,
            owner
        );
        EngineBlox.MetaTransaction memory metaTx = account.generateUnsignedMetaTransactionForNew(
            owner,
            address(account),
            0,
            0,
            SecureOwnableDefinitions.TIMELOCK_UPDATE,
            SecureOwnableDefinitions.UPDATE_TIMELOCK_SELECTOR,
            SecureOwnableDefinitions.updateTimeLockExecutionParams(newPeriod),
            metaTxParams
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(OWNER_KEY, metaTx.message);
        metaTx.signature = abi.encodePacked(r, s, v);

        vm.prank(broadcaster);
        uint256 txId = account.updateTimeLockRequestAndApprove(metaTx);
        vm.prank(owner);
        return account.getTransaction(txId);
    }

    function test_UpdateTimeLock_BelowFloorFails() public {
        BasicAccount account = _initializedClone(2 days);
        EngineBlox.TxRecord memory record = _updateTimeLock(account, 1 days - 1);
        assertEq(uint8(record.status), uint8(EngineBlox.TxStatus.FAILED), "update below floor fails");
        assertEq(account.getTimeLockPeriodSec(), 2 days, "period unchanged");
    }

    function test_UpdateTimeLock_AboveCeilingFails() public {
        BasicAccount account = _initializedClone(2 days);
        EngineBlox.TxRecord memory record = _updateTimeLock(account, 90 days + 1);
        assertEq(uint8(record.status), uint8(EngineBlox.TxStatus.FAILED), "update above ceiling fails");
        assertEq(account.getTimeLockPeriodSec(), 2 days, "period unchanged");
    }

    function test_UpdateTimeLock_WithinBoundsSucceeds() public {
        BasicAccount account = _initializedClone(2 days);
        EngineBlox.TxRecord memory record = _updateTimeLock(account, 1 days);
        assertEq(uint8(record.status), uint8(EngineBlox.TxStatus.COMPLETED), "update to floor completes");
        assertEq(account.getTimeLockPeriodSec(), 1 days, "period updated");
    }

    // ============ interface shape ============

    function test_Clone_ReadsAsAnAccount_NotAFactory() public {
        BasicAccount account = _initializedClone(1 days);
        assertTrue(account.supportsInterface(type(ISecureOwnable).interfaceId), "ISecureOwnable");
        assertTrue(account.supportsInterface(type(IRuntimeRBAC).interfaceId), "IRuntimeRBAC");
        assertTrue(account.supportsInterface(type(IGuardController).interfaceId), "IGuardController");
        assertTrue(account.supportsInterface(type(IBaseStateMachine).interfaceId), "IBaseStateMachine");
    }
}
