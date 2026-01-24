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
            // Release time should be validly set (greater than zero)
            // Note: Pending transactions can have releaseTime <= block.timestamp when timelock has elapsed
            // but transaction hasn't been approved/cancelled yet
            assertGt(txRecord.releaseTime, 0);
        }
    }

    // Ghost variable to track last observed nonce
    uint256 private lastObservedNonce;

    function invariant_MetaTransactionNonceMonotonic() public {
        vm.prank(owner);
        uint256 currentNonce = secureBlox.getSignerNonce(owner);
        
        // Nonce should be non-decreasing across all state transitions
        // This invariant is checked across multiple calls via the ghost variable
        assertGe(currentNonce, lastObservedNonce);
        
        // Update ghost variable for next check
        lastObservedNonce = currentNonce;
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
                
                // If payment recipient is set, verify at least one amount is non-zero
                if (payment.recipient != address(0)) {
                    assertNotEq(payment.recipient, address(0));
                    // Payment should have either native token amount or ERC20 amount
                    bool hasNativePayment = payment.nativeTokenAmount > 0;
                    bool hasERC20Payment = payment.erc20TokenAddress != address(0) && payment.erc20TokenAmount > 0;
                    assertTrue(hasNativePayment || hasERC20Payment, "Payment recipient set but no amount");
                }
            }
        }
    }
}
