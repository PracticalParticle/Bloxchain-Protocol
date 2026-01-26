// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

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
        (, , uint256 maxWallets, uint256 walletCount, ) = secureBlox.getRole(OWNER_ROLE);
        assertEq(walletCount, 1);
        assertEq(maxWallets, 1);
    }

    function invariant_NoZeroAddressInProtectedRoles() public {
        address ownerAddr = secureBlox.owner();
        address recoveryAddr = secureBlox.getRecovery();
        address[] memory broadcasters = secureBlox.getBroadcasters();

        assertNotEq(ownerAddr, address(0));
        assertNotEq(recoveryAddr, address(0));
        assertGt(broadcasters.length, 0);
        assertNotEq(broadcasters[0], address(0));
    }

    function invariant_ValidStatusTransitions() public {
        // Get all pending transactions
        vm.prank(owner);
        uint256[] memory pending = secureBlox.getPendingTransactions();
        
        for (uint256 i = 0; i < pending.length; i++) {
            vm.prank(owner);
            EngineBlox.TxRecord memory txRecord = secureBlox.getTransaction(pending[i]);
            // Pending transactions should have PENDING status
            assertEq(uint8(txRecord.status), uint8(EngineBlox.TxStatus.PENDING));
        }
    }

    function invariant_TimelockPeriodPositive() public {
        uint256 period = secureBlox.getTimeLockPeriodSec();
        assertGt(period, 0);
    }

    function invariant_PendingTransactionsConsistency() public {
        vm.prank(owner);
        uint256[] memory pending = secureBlox.getPendingTransactions();
        
        // Verify all pending transactions are actually pending
        for (uint256 i = 0; i < pending.length; i++) {
            vm.prank(owner);
            EngineBlox.TxRecord memory txRecord = secureBlox.getTransaction(pending[i]);
            assertEq(uint8(txRecord.status), uint8(EngineBlox.TxStatus.PENDING));
        }
    }

    function invariant_TransactionCounterMonotonic() public {
        // Create a transaction to increment counter
        vm.prank(recovery);
        EngineBlox.TxRecord memory tx1 = secureBlox.transferOwnershipRequest();
        uint256 txId1 = tx1.txId;

        // Cancel it
        vm.prank(recovery);
        secureBlox.transferOwnershipCancellation(txId1);

        // Create another transaction
        vm.prank(recovery);
        EngineBlox.TxRecord memory tx2 = secureBlox.transferOwnershipRequest();
        uint256 txId2 = tx2.txId;

        // Counter should be monotonic
        assertGt(txId2, txId1);
    }
}
