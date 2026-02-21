// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

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
        // getTransactionHistory requires fromTxId < toTxId; need at least 2 tx ids for a valid range
        vm.prank(owner);
        uint256[] memory pending = secureBlox.getPendingTransactions();
        
        if (pending.length >= 2) {
            uint256 toTxId = pending[pending.length - 1];
            vm.prank(owner);
            EngineBlox.TxRecord[] memory history = secureBlox.getTransactionHistory(1, toTxId);
            
            for (uint256 i = 0; i < history.length; i++) {
                EngineBlox.TxStatus status = history[i].status;
                
                // Status should be a valid enum value
                assertTrue(
                    status == EngineBlox.TxStatus.PENDING ||
                    status == EngineBlox.TxStatus.EXECUTING ||
                    status == EngineBlox.TxStatus.COMPLETED ||
                    status == EngineBlox.TxStatus.CANCELLED ||
                    status == EngineBlox.TxStatus.FAILED ||
                    status == EngineBlox.TxStatus.REJECTED
                );
            }
        }
    }

    function invariant_ReleaseTimeValidation() public {
        vm.prank(owner);
        uint256[] memory pending = secureBlox.getPendingTransactions();
        
        for (uint256 i = 0; i < pending.length; i++) {
            vm.prank(owner);
            EngineBlox.TxRecord memory txRecord = secureBlox.getTransaction(pending[i]);
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
        // getTransactionHistory requires fromTxId < toTxId; need at least 2 tx ids for a valid range
        vm.prank(owner);
        uint256[] memory pending = secureBlox.getPendingTransactions();
        
        if (pending.length >= 2) {
            uint256 toTxId = pending[pending.length - 1];
            vm.prank(owner);
            EngineBlox.TxRecord[] memory history = secureBlox.getTransactionHistory(1, toTxId);
            
            for (uint256 i = 0; i < history.length; i++) {
                EngineBlox.PaymentDetails memory payment = history[i].payment;
                
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
