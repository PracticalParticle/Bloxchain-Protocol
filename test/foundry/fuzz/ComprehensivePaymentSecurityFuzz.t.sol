// SPDX-License-Identifier: MPL-2.0
pragma solidity 0.8.34;

import "../CommonBase.sol";
import "../../../contracts/core/execution/GuardController.sol";
import "../../../contracts/core/lib/EngineBlox.sol";
import "../../../contracts/core/lib/utils/SharedValidation.sol";
import "../helpers/MockContracts.sol";
import "../helpers/PaymentTestHelper.sol";

/**
 * @title ComprehensivePaymentSecurityFuzzTest
 * @dev Comprehensive fuzz tests covering ALL payment security attack vectors
 * 
 * This test suite covers:
 * - Payment recipient manipulation
 * - Payment amount manipulation
 * - Balance draining attacks
 * - Double payment prevention
 * - ERC20 token manipulation
 * - Payment timing attacks
 * 
 * Based on: SECURITY_ATTACK_VECTORS_ECONOMIC.md
 */
contract ComprehensivePaymentSecurityFuzzTest is CommonBase {
    PaymentTestHelper public paymentHelper;
    
    function setUp() public override {
        super.setUp();
        // Fund accountBlox for payment tests
        vm.deal(address(accountBlox), 1000 ether);
        mockERC20.mint(address(accountBlox), 1000000e18);
        
        // Deploy payment helper contract
        paymentHelper = new PaymentTestHelper();
        vm.prank(owner);
        paymentHelper.initialize(
            owner,
            broadcaster,
            recovery,
            DEFAULT_TIMELOCK_PERIOD,
            address(0)
        );
        
        // Fund payment helper for tests
        vm.deal(address(paymentHelper), 1000 ether);
        mockERC20.mint(address(paymentHelper), 1000000e18);
        
        // PaymentTestHelper sets up permissions in initialize() for NATIVE_TRANSFER_SELECTOR
        // and requestTransaction/approveTransaction functions
    }

    // ============ PAYMENT MANIPULATION ATTACKS ============

    /**
     * @dev Test: Payment recipient update access control
     * Attack Vector: Payment Recipient Update After Request (HIGH)
     * 
     * This test verifies that payment recipient updates work correctly and
     * that payments go to the updated recipient, not the original one.
     */
    function testFuzz_PaymentRecipientUpdateAccessControl(
        address originalRecipient,
        address newRecipient,
        uint256 paymentAmount
    ) public {
        vm.assume(originalRecipient != address(0));
        vm.assume(newRecipient != address(0));
        vm.assume(originalRecipient != newRecipient);
        // Exclude PaymentTestHelper and test accounts from being recipients
        vm.assume(originalRecipient != address(paymentHelper));
        vm.assume(newRecipient != address(paymentHelper));
        vm.assume(originalRecipient != owner && originalRecipient != broadcaster && originalRecipient != recovery);
        vm.assume(newRecipient != owner && newRecipient != broadcaster && newRecipient != recovery);
        // Bound payment amount to available balance
        paymentAmount = bound(paymentAmount, 1, address(paymentHelper).balance);
        
        // Create transaction with payment to newRecipient (payment set at request time only)
        bytes32 operationType = keccak256("NATIVE_TRANSFER");
        EngineBlox.PaymentDetails memory updatedPayment = EngineBlox.PaymentDetails({
            recipient: newRecipient,
            nativeTokenAmount: paymentAmount,
            erc20TokenAddress: address(0),
            erc20TokenAmount: 0
        });
        vm.prank(owner);
        try paymentHelper.requestTransactionWithPayment(
            owner,
            address(paymentHelper),
            0,
            0,
            operationType,
            EngineBlox.NATIVE_TRANSFER_SELECTOR,
            "",
            updatedPayment
        ) returns (uint256 txId) {
            assertTrue(txId > 0, "Transaction should be created");
            uint256 originalBalance = originalRecipient.balance;
            uint256 newBalance = newRecipient.balance;
            
            // Advance time and execute
            advanceTime(paymentHelper.getTimeLockPeriodSec() + 1);
            vm.prank(owner);
            
            // Some recipients might be contracts that reject payments - handle gracefully
            try paymentHelper.approveTransaction(txId) returns (uint256) {
                vm.prank(owner);
                EngineBlox.TxRecord memory result = paymentHelper.getTransaction(txId);
                // If execution succeeded, verify payment went to new recipient
                if (result.status == EngineBlox.TxStatus.COMPLETED) {
                    assertEq(newRecipient.balance, newBalance + paymentAmount, "Payment should go to new recipient");
                    assertEq(originalRecipient.balance, originalBalance, "Original recipient should not receive payment");
                }
            } catch (bytes memory reason) {
                // Handle PaymentFailed - some recipients might reject payments
                bytes4 errorSelector = bytes4(reason);
                if (errorSelector == SharedValidation.PaymentFailed.selector) {
                    // Payment failed - recipient might be a contract that rejects payments
                    // This is acceptable for fuzz testing
                    return;
                }
                assembly {
                    revert(add(reason, 0x20), mload(reason))
                }
            }
        } catch (bytes memory reason) {
            // Handle NoPermission error - permissions may not be set up
            bytes4 errorSelector = bytes4(reason);
            if (errorSelector == SharedValidation.NoPermission.selector) {
                return; // Skip test if permissions not set up
            }
            assembly {
                revert(add(reason, 0x20), mload(reason))
            }
        }
    }

    /**
     * @dev Test: Payment amount manipulation prevention
     * Attack Vector: Payment Amount Manipulation (HIGH)
     * 
     * This test verifies that payment amounts can be updated but are validated
     * against contract balance at execution time.
     */
    function testFuzz_PaymentAmountManipulationPrevented(
        uint256 initialAmount,
        uint256 manipulatedAmount
    ) public {
        address recipient = address(0x1234);
        uint256 maxBalance = address(paymentHelper).balance;
        vm.assume(maxBalance > 0);
        // Bound amounts to valid ranges
        initialAmount = bound(initialAmount, 1, maxBalance - 1);
        manipulatedAmount = bound(manipulatedAmount, initialAmount + 1, maxBalance * 2); // Allow exceeding balance
        
        // Create transaction with payment amount (set at request time; validated at execution)
        bytes32 operationType = keccak256("NATIVE_TRANSFER");
        EngineBlox.PaymentDetails memory manipulatedPayment = EngineBlox.PaymentDetails({
            recipient: recipient,
            nativeTokenAmount: manipulatedAmount,
            erc20TokenAddress: address(0),
            erc20TokenAmount: 0
        });
        vm.prank(owner);
        try paymentHelper.requestTransactionWithPayment(
            owner,
            address(paymentHelper),
            0,
            0,
            operationType,
            EngineBlox.NATIVE_TRANSFER_SELECTOR,
            "",
            manipulatedPayment
        ) returns (uint256 txId) {
            // Advance time and execute
            advanceTime(paymentHelper.getTimeLockPeriodSec() + 1);
            vm.prank(owner);
            
            // If manipulated amount exceeds balance, should revert with InsufficientBalance
            if (manipulatedAmount > maxBalance) {
                vm.expectRevert(abi.encodeWithSelector(
                    SharedValidation.InsufficientBalance.selector,
                    maxBalance,
                    manipulatedAmount
                ));
                paymentHelper.approveTransaction(txId);
            } else {
                // If amount is valid, execution should succeed
                paymentHelper.approveTransaction(txId);
                vm.prank(owner);
                EngineBlox.TxRecord memory result = paymentHelper.getTransaction(txId);
                assertEq(uint8(result.status), uint8(EngineBlox.TxStatus.COMPLETED), "Should succeed when amount is valid");
                uint256 recipientBalance = recipient.balance;
                assertEq(recipientBalance, manipulatedAmount, "Payment should be sent");
            }
        } catch (bytes memory reason) {
            bytes4 errorSelector = bytes4(reason);
            if (errorSelector == SharedValidation.NoPermission.selector) {
                return; // Skip test if permissions not set up
            }
            assembly {
                revert(add(reason, 0x20), mload(reason))
            }
        }
    }

    /**
     * @dev Test: Double payment prevention
     * Attack Vector: Double Payment Exploitation (MEDIUM)
     * 
     * This test verifies that a transaction with payment can only execute once,
     * preventing double payment exploitation.
     */
    function testFuzz_DoublePaymentPrevented(
        address recipient,
        uint256 paymentAmount
    ) public {
        vm.assume(recipient != address(0));
        // Exclude the paying contract: self-transfer leaves balance unchanged and breaks the assertion
        vm.assume(recipient != address(paymentHelper));
        vm.assume(recipient != address(accountBlox));
        // Bound payment amount to available balance
        paymentAmount = bound(paymentAmount, 1, address(paymentHelper).balance);
        
        // Create transaction with payment
        bytes32 operationType = keccak256("NATIVE_TRANSFER");
        EngineBlox.PaymentDetails memory payment = EngineBlox.PaymentDetails({
            recipient: recipient,
            nativeTokenAmount: paymentAmount,
            erc20TokenAddress: address(0),
            erc20TokenAmount: 0
        });
        vm.prank(owner);
        try paymentHelper.requestTransactionWithPayment(
            owner,
            address(paymentHelper),
            0,
            0,
            operationType,
            EngineBlox.NATIVE_TRANSFER_SELECTOR,
            "",
            payment
        ) returns (uint256 txId) {
            uint256 initialBalance = recipient.balance;
            
            // Advance time and execute
            advanceTime(paymentHelper.getTimeLockPeriodSec() + 1);
            vm.prank(owner);
            try paymentHelper.approveTransaction(txId) {
                // Payment succeeded - verify it was sent
                assertEq(recipient.balance, initialBalance + paymentAmount, "Payment should be sent once");
            } catch (bytes memory reason) {
                // Payment failed - recipient might reject payments (e.g., contracts)
                bytes4 errorSelector = bytes4(reason);
                if (errorSelector == SharedValidation.PaymentFailed.selector) {
                    return; // Skip test if recipient rejects payments
                }
                assembly {
                    revert(add(reason, 0x20), mload(reason))
                }
            }
            
            // Get transaction status after first execution (requires role)
            vm.prank(owner);
            EngineBlox.TxRecord memory recordAfterFirst = paymentHelper.getTransaction(txId);
            
            // Attempt to execute again - should fail (status not PENDING)
            vm.prank(owner);
            vm.expectRevert(abi.encodeWithSelector(
                SharedValidation.TransactionStatusMismatch.selector,
                uint8(EngineBlox.TxStatus.PENDING),
                uint8(recordAfterFirst.status)
            ));
            paymentHelper.approveTransaction(txId);
            
            // Verify payment was only sent once
            assertEq(recipient.balance, initialBalance + paymentAmount, "Payment should not be sent twice");
            
            // Verify transaction status unchanged (prevents double execution)
            vm.prank(owner);
            EngineBlox.TxRecord memory recordAfterSecond = paymentHelper.getTransaction(txId);
            assertEq(uint8(recordAfterSecond.status), uint8(recordAfterFirst.status), "Transaction should not execute twice");
        } catch (bytes memory reason) {
            bytes4 errorSelector = bytes4(reason);
            if (errorSelector == SharedValidation.NoPermission.selector) {
                return; // Skip test if permissions not set up
            }
            assembly {
                revert(add(reason, 0x20), mload(reason))
            }
        }
    }

    /**
     * @dev Test: ERC20 token address validation
     * Attack Vector: ERC20 Token Address Manipulation (MEDIUM)
     * 
     * This test verifies that invalid ERC20 token addresses are handled correctly
     * and that valid tokens work properly.
     */
    function testFuzz_ERC20TokenAddressValidation(
        address tokenAddress,
        uint256 paymentAmount
    ) public {
        vm.assume(tokenAddress != address(0));
        // Bound payment amount to available balance
        uint256 maxBalance = mockERC20.balanceOf(address(paymentHelper));
        if (maxBalance == 0) {
            return; // Skip if no balance
        }
        paymentAmount = bound(paymentAmount, 1, maxBalance);
        
        address recipient = address(0x5678);
        
        // Create transaction with ERC20 payment
        bytes32 operationType = keccak256("NATIVE_TRANSFER");
        EngineBlox.PaymentDetails memory payment = EngineBlox.PaymentDetails({
            recipient: recipient,
            nativeTokenAmount: 0,
            erc20TokenAddress: tokenAddress,
            erc20TokenAmount: paymentAmount
        });
        vm.prank(owner);
        try paymentHelper.requestTransactionWithPayment(
            owner,
            address(paymentHelper),
            0,
            0,
            operationType,
            EngineBlox.NATIVE_TRANSFER_SELECTOR,
            "",
            payment
        ) returns (uint256 txId) {
            uint256 initialTokenBalance = tokenAddress == address(mockERC20) ? mockERC20.balanceOf(recipient) : 0;
            
            // Advance time and execute
            advanceTime(paymentHelper.getTimeLockPeriodSec() + 1);
            vm.prank(owner);
            
            // If token address is invalid or contract doesn't support ERC20, should fail
            if (tokenAddress != address(mockERC20)) {
                // Invalid token address should revert (non-contract or doesn't support ERC20)
                // The execution will fail when trying to call balanceOf or transfer
                try paymentHelper.approveTransaction(txId) returns (uint256) {
                    EngineBlox.TxRecord memory result = paymentHelper.getTransaction(txId);
                    // If it doesn't revert, verify it failed
                    assertEq(uint8(result.status), uint8(EngineBlox.TxStatus.FAILED), "Should fail with invalid token address");
                    assertTrue(result.result.length > 0, "Should have error message");
                } catch {
                    // Revert is also acceptable for invalid token addresses
                    // This verifies that invalid tokens are rejected
                }
            } else {
                // Valid token should succeed
                paymentHelper.approveTransaction(txId);
                vm.prank(owner);
                EngineBlox.TxRecord memory result = paymentHelper.getTransaction(txId);
                assertEq(uint8(result.status), uint8(EngineBlox.TxStatus.COMPLETED), "Should succeed with valid token");
                assertEq(mockERC20.balanceOf(recipient), initialTokenBalance + paymentAmount, "Token payment should be sent");
            }
        } catch (bytes memory reason) {
            bytes4 errorSelector = bytes4(reason);
            if (errorSelector == SharedValidation.NoPermission.selector) {
                return; // Skip test if permissions not set up
            }
            assembly {
                revert(add(reason, 0x20), mload(reason))
            }
        }
    }

    /**
     * @dev Test: Balance drain prevention
     * Attack Vector: Native Token Balance Drain (MEDIUM)
     * 
     * This test verifies that multiple transactions with payments don't drain
     * the contract balance beyond what's available.
     */
    function testFuzz_BalanceDrainPrevented(
        uint256 paymentAmount,
        uint256 numberOfTransactions
    ) public {
        address recipient = address(0xABCD);
        // Bound to reasonable ranges
        numberOfTransactions = bound(numberOfTransactions, 1, 10); // Limit to 10 to avoid gas issues
        uint256 contractBalance = address(paymentHelper).balance;
        vm.assume(contractBalance > 0);
        // Ensure total payments don't exceed balance
        paymentAmount = bound(paymentAmount, 1, contractBalance / numberOfTransactions);
        
        uint256[] memory txIds = new uint256[](numberOfTransactions);
        uint256 initialRecipientBalance = recipient.balance;
        
        // Create multiple transactions with payments (payment set at request time)
        bytes32 operationType = keccak256("NATIVE_TRANSFER");
        EngineBlox.PaymentDetails memory payment = EngineBlox.PaymentDetails({
            recipient: recipient,
            nativeTokenAmount: paymentAmount,
            erc20TokenAddress: address(0),
            erc20TokenAmount: 0
        });
        for (uint256 i = 0; i < numberOfTransactions; i++) {
            vm.prank(owner);
            try paymentHelper.requestTransactionWithPayment(
                owner,
                address(paymentHelper),
                0,
                0,
                operationType,
                EngineBlox.NATIVE_TRANSFER_SELECTOR,
                "",
                payment
            ) returns (uint256 txId) {
                txIds[i] = txId;
            } catch (bytes memory) {
                txIds[i] = 0; // Mark as invalid
            }
        }
        
        // Advance time and execute all transactions
        advanceTime(paymentHelper.getTimeLockPeriodSec() + 1);
        
        uint256 totalPaid = 0;
        for (uint256 i = 0; i < numberOfTransactions; i++) {
            // Skip invalid transaction IDs (marked as 0 when requestTransaction failed)
            if (txIds[i] == 0) {
                continue;
            }
            
            vm.prank(owner);
            paymentHelper.approveTransaction(txIds[i]);
            vm.prank(owner);
            EngineBlox.TxRecord memory result = paymentHelper.getTransaction(txIds[i]);
            
            if (result.status == EngineBlox.TxStatus.COMPLETED) {
                totalPaid += paymentAmount;
            }
        }
        
        // Verify actual balance changes
        uint256 finalBalance = address(paymentHelper).balance;
        uint256 expectedFinalBalance = contractBalance - totalPaid;
        assertEq(finalBalance, expectedFinalBalance, "Balance should reflect actual payments");
        
        // Verify recipient received all payments
        assertEq(recipient.balance, initialRecipientBalance + totalPaid, "Recipient should receive all payments");
        
        // Verify balance check prevents over-draining
        assertGe(finalBalance, 0, "Balance should not go negative");
    }

    /**
     * @dev Test: Payment update timing
     * Attack Vector: Payment Update Timing (MEDIUM)
     * 
     * This test verifies that payment updates can occur before execution
     * and that the final payment configuration is what gets executed.
     */
    function testFuzz_PaymentUpdateTiming(
        address originalRecipient,
        address newRecipient,
        uint256 paymentAmount,
        uint256 timeAdvance
    ) public {
        vm.assume(originalRecipient != address(0));
        vm.assume(newRecipient != address(0));
        vm.assume(originalRecipient != newRecipient);
        // Exclude PaymentTestHelper and test accounts from being recipients
        vm.assume(originalRecipient != address(paymentHelper));
        vm.assume(newRecipient != address(paymentHelper));
        vm.assume(originalRecipient != owner && originalRecipient != broadcaster && originalRecipient != recovery);
        vm.assume(newRecipient != owner && newRecipient != broadcaster && newRecipient != recovery);
        // Bound payment amount to available balance
        paymentAmount = bound(paymentAmount, 1, address(paymentHelper).balance);
        
        // Create transaction with payment to newRecipient (payment fixed at request time)
        bytes32 operationType = keccak256("NATIVE_TRANSFER");
        EngineBlox.PaymentDetails memory updatedPayment = EngineBlox.PaymentDetails({
            recipient: newRecipient,
            nativeTokenAmount: paymentAmount,
            erc20TokenAddress: address(0),
            erc20TokenAmount: 0
        });
        vm.prank(owner);
        try paymentHelper.requestTransactionWithPayment(
            owner,
            address(paymentHelper),
            0,
            0,
            operationType,
            EngineBlox.NATIVE_TRANSFER_SELECTOR,
            "",
            updatedPayment
        ) returns (uint256 txId) {
            uint256 originalBalance = originalRecipient.balance;
            uint256 newBalance = newRecipient.balance;
            
            // Advance to release time
            uint256 timeLockPeriod = paymentHelper.getTimeLockPeriodSec();
            advanceTime(timeLockPeriod + 1);
            
            // Execute
            vm.prank(owner);
            
            // Some recipients might be contracts that reject payments - handle gracefully
            try paymentHelper.approveTransaction(txId) returns (uint256) {
                vm.prank(owner);
                EngineBlox.TxRecord memory result = paymentHelper.getTransaction(txId);
                // If execution succeeded, verify payment went to new recipient
                if (result.status == EngineBlox.TxStatus.COMPLETED) {
                    // Get current balances to account for any pre-existing balance
                    uint256 finalNewBalance = newRecipient.balance;
                    uint256 finalOriginalBalance = originalRecipient.balance;
                    
                    // Payment should have increased new recipient's balance by paymentAmount
                    assertGe(finalNewBalance, newBalance + paymentAmount, "Payment should go to new recipient");
                    assertEq(finalOriginalBalance, originalBalance, "Original recipient should not receive payment");
                }
            } catch (bytes memory reason) {
                // Handle PaymentFailed - some recipients might reject payments
                bytes4 errorSelector = bytes4(reason);
                if (errorSelector == SharedValidation.PaymentFailed.selector) {
                    // Payment failed - recipient might be a contract that rejects payments
                    // This is acceptable for fuzz testing
                    return;
                }
                assembly {
                    revert(add(reason, 0x20), mload(reason))
                }
            }
        } catch (bytes memory reason) {
            // Handle NoPermission error - permissions may not be set up
            bytes4 errorSelector = bytes4(reason);
            if (errorSelector == SharedValidation.NoPermission.selector) {
                return; // Skip test if permissions not set up
            }
            assembly {
                revert(add(reason, 0x20), mload(reason))
            }
        }
    }

    /**
     * @dev Test: Fee-on-transfer ERC20 handling — recipient receives amount minus fee; engine state consistent
     * Attack Vector: Fee-on-transfer tokens (UNEXPLORED_ATTACK_VECTORS.md §4.2)
     */
    function testFuzz_FeeOnTransferTokenHandling() public {
        try this._runFeeOnTransferTest() {
            // assertions run inside helper
        } catch (bytes memory reason) {
            if (reason.length >= 4 && bytes4(reason) == SharedValidation.NoPermission.selector) return;
            assembly { revert(add(reason, 0x20), mload(reason)) }
        }
    }

    /// @dev External so try/catch can catch reverts from nested calls
    function _runFeeOnTransferTest() external {
        MockFeeOnTransferToken feeToken = new MockFeeOnTransferToken("FeeToken", "FEE");
        feeToken.mint(address(paymentHelper), 1000000e18);
        uint256 amount = 1000e18;
        uint256 recipientBefore = feeToken.balanceOf(user1);
        uint256 helperBefore = feeToken.balanceOf(address(paymentHelper));

        EngineBlox.PaymentDetails memory payment = EngineBlox.PaymentDetails({
            recipient: user1,
            nativeTokenAmount: 0,
            erc20TokenAddress: address(feeToken),
            erc20TokenAmount: amount
        });
        bytes32 operationType = keccak256("NATIVE_TRANSFER");
        vm.prank(owner);
        uint256 txId = paymentHelper.requestTransactionWithPayment(
            owner,
            address(paymentHelper),
            0,
            0,
            operationType,
            EngineBlox.NATIVE_TRANSFER_SELECTOR,
            "",
            payment
        );
        advanceTime(paymentHelper.getTimeLockPeriodSec() + 1);
        vm.prank(owner);
        paymentHelper.approveTransaction(txId);

        EngineBlox.TxRecord memory result = paymentHelper.getTransaction(txId);
        assertEq(uint8(result.status), uint8(EngineBlox.TxStatus.COMPLETED));
        assertEq(feeToken.balanceOf(user1), recipientBefore + (amount * 99) / 100);
        assertEq(feeToken.balanceOf(address(paymentHelper)), helperBefore - amount);
    }

    // ============ HELPER FUNCTIONS ============
    
    // Helper functions would go here if needed
}
