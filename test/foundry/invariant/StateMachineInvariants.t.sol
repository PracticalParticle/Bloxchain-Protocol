// SPDX-License-Identifier: MPL-2.0
pragma solidity 0.8.34;

import "../CommonBase.sol";

/**
 * @title StateMachineInvariantsTest
 * @dev Invariant tests for state machine
 */
contract StateMachineInvariantsTest is CommonBase {
    function setUp() public override {
        super.setUp();
    }

    function invariant_OwnerRoleSingleWallet() public {
        vm.prank(owner);
        (, , uint256 maxWallets, uint256 walletCount, ) = accountBlox.getRole(OWNER_ROLE);
        assertEq(walletCount, 1);
        assertEq(maxWallets, 1);
    }

    function invariant_NoZeroAddressInProtectedRoles() public {
        address ownerAddr = accountBlox.owner();
        address recoveryAddr = accountBlox.getRecovery();
        address[] memory broadcasters = accountBlox.getBroadcasters();

        assertNotEq(ownerAddr, address(0));
        assertNotEq(recoveryAddr, address(0));
        assertGt(broadcasters.length, 0);
        assertNotEq(broadcasters[0], address(0));
    }

    function invariant_ValidStatusTransitions() public {
        // Get all pending transactions
        vm.prank(owner);
        uint256[] memory pending = accountBlox.getPendingTransactions();
        
        for (uint256 i = 0; i < pending.length; i++) {
            vm.prank(owner);
            EngineBlox.TxRecord memory txRecord = accountBlox.getTransaction(pending[i]);
            // Pending transactions should have PENDING status
            assertEq(uint8(txRecord.status), uint8(EngineBlox.TxStatus.PENDING));
        }
    }

    function invariant_TimelockPeriodPositive() public {
        uint256 period = accountBlox.getTimeLockPeriodSec();
        assertGt(period, 0);
    }

    function invariant_PendingTransactionsConsistency() public {
        vm.prank(owner);
        uint256[] memory pending = accountBlox.getPendingTransactions();
        
        // Verify all pending transactions are actually pending
        for (uint256 i = 0; i < pending.length; i++) {
            vm.prank(owner);
            EngineBlox.TxRecord memory txRecord = accountBlox.getTransaction(pending[i]);
            assertEq(uint8(txRecord.status), uint8(EngineBlox.TxStatus.PENDING));
        }
    }

    function invariant_TransactionCounterMonotonic() public {
        // Create a transaction to increment counter
        vm.prank(recovery);
        uint256 txId1 = accountBlox.transferOwnershipRequest();

        // Cancel it
        vm.prank(recovery);
        accountBlox.transferOwnershipCancellation(txId1);

        // Create another transaction
        vm.prank(recovery);
        uint256 txId2 = accountBlox.transferOwnershipRequest();

        // Counter should be monotonic
        assertGt(txId2, txId1);
    }
}
