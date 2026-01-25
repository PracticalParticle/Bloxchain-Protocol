// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import "../CommonBase.sol";
import "../../../contracts/core/lib/StateAbstraction.sol";

/**
 * @title StateAbstractionTest
 * @dev Unit tests for StateAbstraction library
 * @notice Most StateAbstraction functions are internal and tested through contract tests
 * @notice This file tests public constants and any directly testable library functions
 */
contract StateAbstractionTest is CommonBase {
    function setUp() public override {
        super.setUp();
    }

    // ============ CONSTANTS TESTS ============

    function test_OwnerRole_Constant() public {
        bytes32 expected = keccak256(bytes("OWNER_ROLE"));
        assertEq(StateAbstraction.OWNER_ROLE, expected);
    }

    function test_BroadcasterRole_Constant() public {
        bytes32 expected = keccak256(bytes("BROADCASTER_ROLE"));
        assertEq(StateAbstraction.BROADCASTER_ROLE, expected);
    }

    function test_RecoveryRole_Constant() public {
        bytes32 expected = keccak256(bytes("RECOVERY_ROLE"));
        assertEq(StateAbstraction.RECOVERY_ROLE, expected);
    }

    function test_NativeTransferSelector_Constant() public {
        bytes4 expected = bytes4(keccak256("__bloxchain_native_transfer__(address,uint256)"));
        assertEq(StateAbstraction.NATIVE_TRANSFER_SELECTOR, expected);
    }

    // ============ STATE MANAGEMENT TESTS ============
    // Most state management is tested through contract interactions
    // These tests verify state transitions work correctly

    function test_TransactionStatus_Transitions() public {
        // Create a transaction
        vm.prank(recovery);
        StateAbstraction.TxRecord memory requestTx = secureBlox.transferOwnershipRequest();
        uint256 txId = requestTx.txId;

        // Verify PENDING status
        vm.prank(owner);
        StateAbstraction.TxRecord memory pendingTx = secureBlox.getTransaction(txId);
        assertEq(uint8(pendingTx.status), uint8(StateAbstraction.TxStatus.PENDING));

        // Advance time and approve
        advanceTime(DEFAULT_TIMELOCK_PERIOD + 1);
        vm.prank(recovery);
        secureBlox.transferOwnershipDelayedApproval(txId);

        // Verify COMPLETED status
        // Note: After ownership transfer, the owner changes from owner to recovery
        // So we need to use recovery (the new owner) to view the transaction
        vm.prank(recovery);
        StateAbstraction.TxRecord memory completedTx = secureBlox.getTransaction(txId);
        assertEq(uint8(completedTx.status), uint8(StateAbstraction.TxStatus.COMPLETED));
    }

    function test_TransactionStatus_InvalidTransition() public {
        // Create and immediately try to approve (should fail)
        vm.prank(recovery);
        StateAbstraction.TxRecord memory requestTx = secureBlox.transferOwnershipRequest();
        uint256 txId = requestTx.txId;

        // Try to approve before timelock (should revert)
        vm.prank(recovery);
        vm.expectRevert();
        secureBlox.transferOwnershipDelayedApproval(txId);
    }
}
