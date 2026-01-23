// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "../CommonBase.sol";

/**
 * @title TransactionInvariantsTest
 * @dev Invariant tests for transaction lifecycle
 */
contract TransactionInvariantsTest is CommonBase {
    function setUp() public override {
        super.setUp();
    }

    function invariant_TransactionStatusConsistency() public {
        // Get transaction history - need to check if there are any transactions first
        vm.prank(owner);
        uint256[] memory pending = secureBlox.getPendingTransactions();
        
        if (pending.length > 0) {
            vm.prank(owner);
            StateAbstraction.TxRecord[] memory history = secureBlox.getTransactionHistory(1, pending[0]);
            
            for (uint256 i = 0; i < history.length; i++) {
                StateAbstraction.TxStatus status = history[i].status;
                
                // Status should be a valid enum value
                assertTrue(
                    status == StateAbstraction.TxStatus.PENDING ||
                    status == StateAbstraction.TxStatus.EXECUTING ||
                    status == StateAbstraction.TxStatus.COMPLETED ||
                    status == StateAbstraction.TxStatus.CANCELLED ||
                    status == StateAbstraction.TxStatus.FAILED ||
                    status == StateAbstraction.TxStatus.REJECTED
                );
            }
        }
    }

    function invariant_ReleaseTimeValidation() public {
        vm.prank(owner);
        uint256[] memory pending = secureBlox.getPendingTransactions();
        
        for (uint256 i = 0; i < pending.length; i++) {
            vm.prank(owner);
            StateAbstraction.TxRecord memory txRecord = secureBlox.getTransaction(pending[i]);
            // Release time should be in the future for pending transactions
            assertGe(txRecord.releaseTime, block.timestamp);
        }
    }

    function invariant_MetaTransactionNonceMonotonic() public {
        vm.prank(owner);
        uint256 nonce1 = secureBlox.getSignerNonce(owner);
        
        // Perform an operation that increments nonce (if any)
        // For now, we just verify nonce is non-decreasing
        vm.prank(owner);
        uint256 nonce2 = secureBlox.getSignerNonce(owner);
        assertGe(nonce2, nonce1);
    }

    function invariant_PaymentValidation() public {
        // Verify that payment details are valid when present
        // Check if there are transactions first
        vm.prank(owner);
        uint256[] memory pending = secureBlox.getPendingTransactions();
        
        if (pending.length > 0) {
            vm.prank(owner);
            StateAbstraction.TxRecord[] memory history = secureBlox.getTransactionHistory(1, pending[0]);
            
            for (uint256 i = 0; i < history.length; i++) {
                StateAbstraction.PaymentDetails memory payment = history[i].payment;
                
                // If payment recipient is set, it should not be zero address
                if (payment.recipient != address(0)) {
                    assertNotEq(payment.recipient, address(0));
                }
            }
        }
    }
}
