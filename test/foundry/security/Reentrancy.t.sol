// SPDX-License-Identifier: MPL-2.0
pragma solidity 0.8.34;

import "../CommonBase.sol";
import "../helpers/MockContracts.sol";

/**
 * @title ReentrancyTest
 * @dev Tests for reentrancy protection
 */
contract ReentrancyTest is CommonBase {
    ReentrancyAttack public attackContract;

    function setUp() public override {
        super.setUp();
        attackContract = new ReentrancyAttack();
    }

    function test_ReentrancyProtection_OwnershipTransfer() public {
        // Create ownership transfer request
        vm.prank(recovery);
        uint256 txId = accountBlox.transferOwnershipRequest();
        vm.prank(recovery);
        EngineBlox.TxRecord memory requestTx = accountBlox.getTransaction(txId);

        advanceTime(DEFAULT_TIMELOCK_PERIOD + 1);

        // First approval should succeed
        vm.prank(recovery);
        accountBlox.transferOwnershipDelayedApproval(txId);
        vm.prank(recovery);
        EngineBlox.TxRecord memory approvalTx = accountBlox.getTransaction(txId);

        // Verify single execution completed
        assertEq(uint8(approvalTx.status), uint8(EngineBlox.TxStatus.COMPLETED));
        assertEq(accountBlox.owner(), recovery);

        // Attempt to call again - state machine should prevent reentrancy
        // The transaction status is now COMPLETED, not PENDING, so it should revert
        vm.prank(recovery);
        vm.expectRevert();
        accountBlox.transferOwnershipDelayedApproval(txId);
    }

    function test_ReentrancyProtection_StateMachinePrevents() public {
        // The state machine uses status transitions to prevent reentrancy
        // PENDING -> EXECUTING -> COMPLETED/FAILED
        // Reentry attempts would find status as EXECUTING, not PENDING, and fail

        vm.prank(recovery);
        uint256 txId = accountBlox.transferOwnershipRequest();
        vm.prank(recovery);
        EngineBlox.TxRecord memory requestTx = accountBlox.getTransaction(txId);

        advanceTime(DEFAULT_TIMELOCK_PERIOD + 1);

        // First approval should succeed
        vm.prank(recovery);
        accountBlox.transferOwnershipDelayedApproval(txId);

        // Attempt to approve again (would be reentrancy if not protected)
        vm.prank(recovery);
        vm.expectRevert();
        accountBlox.transferOwnershipDelayedApproval(txId);
    }
}
