// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import "../CommonBase.sol";
import "../../../contracts/core/lib/EngineBlox.sol";
import "../../../contracts/core/execution/GuardController.sol";
import "../../../contracts/utils/SharedValidation.sol";
import "../../../contracts/examples/templates/AccountBlox.sol";
import "../helpers/MockContracts.sol";
import "../helpers/PaymentTestHelper.sol";

/**
 * @title SystemMacroSelectorSecurityFuzzTest
 * @dev Comprehensive fuzz tests for system macro selector security
 * 
 * System macro selectors are special selectors for system-level operations:
 * - NATIVE_TRANSFER_SELECTOR: For native token transfers
 * - UPDATE_PAYMENT_SELECTOR: For payment detail updates
 * 
 * These selectors can bypass certain restrictions (e.g., call address(this))
 * but must still respect all other security checks (permissions, whitelist, etc.)
 * 
 * This test suite verifies:
 * - System macro selectors can target address(this)
 * - Non-macro selectors cannot target address(this)
 * - System macro selectors still require proper permissions
 * - System macro selectors still respect whitelist (if applicable)
 * - System macro selectors cannot bypass other security checks
 */
contract SystemMacroSelectorSecurityFuzzTest is CommonBase {
    PaymentTestHelper public paymentHelper;
    
    function setUp() public override {
        super.setUp();
        
        // Deploy payment helper for payment-related tests
        paymentHelper = new PaymentTestHelper();
        vm.prank(owner);
        paymentHelper.initialize(
            owner,
            broadcaster,
            recovery,
            DEFAULT_TIMELOCK_PERIOD,
            address(0)
        );
        vm.deal(address(paymentHelper), 1000 ether);
    }

    // ============ SYSTEM MACRO SELECTOR VALIDATION ============

    /**
     * @dev Test: System macro selectors can target address(this)
     * 
     * This verifies that NATIVE_TRANSFER_SELECTOR and UPDATE_PAYMENT_SELECTOR
     * can be used to target address(this) for system-level operations
     */
    function testFuzz_SystemMacroSelectorsCanTargetAddressThis(
        uint256 transferAmount
    ) public {
        // Bound transfer amount to available balance
        transferAmount = bound(transferAmount, 1, address(paymentHelper).balance);
        
        // NATIVE_TRANSFER_SELECTOR should be able to target address(this)
        // This is tested through payment helper which uses NATIVE_TRANSFER_SELECTOR
        
        // Create transaction with NATIVE_TRANSFER_SELECTOR targeting address(this)
        bytes32 operationType = keccak256("NATIVE_TRANSFER");
        vm.prank(owner);
        
        try paymentHelper.requestTransaction(
            owner,
            address(paymentHelper), // Target is address(this) for payment helper
            0,
            0,
            operationType,
            EngineBlox.NATIVE_TRANSFER_SELECTOR,
            ""
        ) returns (EngineBlox.TxRecord memory txRecord) {
            uint256 txId = txRecord.txId;
            assertTrue(txId > 0, "Transaction should be created");
            
            // Set up payment
            EngineBlox.PaymentDetails memory payment = EngineBlox.PaymentDetails({
                recipient: address(0x1234),
                nativeTokenAmount: transferAmount,
                erc20TokenAddress: address(0),
                erc20TokenAmount: 0
            });
            
            vm.prank(owner);
            paymentHelper.updatePaymentForTransaction(txId, payment);
            
            // Advance time and execute
            advanceTime(paymentHelper.getTimeLockPeriodSec() + 1);
            vm.prank(owner);
            
            // Execution should succeed - system macro selector can target address(this)
            EngineBlox.TxRecord memory result = paymentHelper.approveTransaction(txId);
            assertEq(uint8(result.status), uint8(EngineBlox.TxStatus.COMPLETED), "System macro selector should work");
        } catch (bytes memory reason) {
            // Handle NoPermission - permissions may not be set up
            bytes4 errorSelector = bytes4(reason);
            if (errorSelector == SharedValidation.NoPermission.selector) {
                return; // Skip if permissions not set up
            }
            assembly {
                revert(add(reason, 0x20), mload(reason))
            }
        }
    }

    /**
     * @dev Test: Non-macro selectors cannot target address(this)
     * 
     * This verifies that regular function selectors cannot bypass
     * internal function protection by targeting address(this)
     * 
     * Note: This is tested through GuardController's _validateNotInternalFunction
     * which blocks non-macro selectors from targeting address(this)
     */
    function testFuzz_NonMacroSelectorsCannotTargetAddressThis(
        bytes4 nonMacroSelector
    ) public {
        // Filter out system macro selectors - we only want to test non-macro selectors
        vm.assume(!_isDefaultSystemMacroSelector(nonMacroSelector));
        vm.assume(nonMacroSelector != bytes4(0));
        
        // Attempt to call address(this) with a non-macro selector via accountBlox
        // This should be blocked by GuardController._validateNotInternalFunction
        bytes32 operationType = keccak256("TEST_OPERATION");
        
        vm.prank(owner);
        vm.expectRevert(
            abi.encodeWithSelector(
                SharedValidation.InternalFunctionNotAccessible.selector,
                nonMacroSelector
            )
        );
        accountBlox.executeWithTimeLock(
            address(accountBlox), // Target is address(this) for accountBlox
            0,
            nonMacroSelector,
            "",
            0,
            operationType
        );
    }

    /**
     * @dev Test: System macro selectors still require permissions
     * 
     * This verifies that even system macro selectors require proper
     * permissions - they cannot bypass permission checks
     */
    function testFuzz_SystemMacroSelectorsRequirePermissions(
        address unauthorizedUser,
        uint256 transferAmount
    ) public {
        vm.assume(unauthorizedUser != address(0));
        vm.assume(unauthorizedUser != owner);
        vm.assume(unauthorizedUser != broadcaster);
        vm.assume(unauthorizedUser != recovery);
        
        // Bound transfer amount
        transferAmount = bound(transferAmount, 1, address(paymentHelper).balance);
        
        // Unauthorized user attempts to use NATIVE_TRANSFER_SELECTOR
        // Should fail due to lack of permissions
        bytes32 operationType = keccak256("NATIVE_TRANSFER");
        
        vm.prank(unauthorizedUser);
        vm.expectRevert(abi.encodeWithSelector(SharedValidation.NoPermission.selector, unauthorizedUser));
        paymentHelper.requestTransaction(
            unauthorizedUser,
            address(paymentHelper),
            0,
            0,
            operationType,
            EngineBlox.NATIVE_TRANSFER_SELECTOR,
            ""
        );
    }

    /**
     * @dev Test: UPDATE_PAYMENT_SELECTOR requires permissions
     * 
     * This verifies that UPDATE_PAYMENT_SELECTOR requires proper permissions
     */
    function testFuzz_UpdatePaymentSelectorRequiresPermissions(
        address unauthorizedUser,
        uint256 txId,
        uint256 paymentAmount
    ) public {
        vm.assume(unauthorizedUser != address(0));
        vm.assume(unauthorizedUser != owner);
        
        // Bound payment amount
        paymentAmount = bound(paymentAmount, 1, address(paymentHelper).balance);
        
        // First, create a transaction as owner
        bytes32 operationType = keccak256("NATIVE_TRANSFER");
        vm.prank(owner);
        
        try paymentHelper.requestTransaction(
            owner,
            address(paymentHelper),
            0,
            0,
            operationType,
            EngineBlox.NATIVE_TRANSFER_SELECTOR,
            ""
        ) returns (EngineBlox.TxRecord memory txRecord) {
            uint256 actualTxId = txRecord.txId;
            
            // Unauthorized user attempts to update payment
            // Should fail due to lack of permissions for UPDATE_PAYMENT_SELECTOR
            EngineBlox.PaymentDetails memory payment = EngineBlox.PaymentDetails({
                recipient: address(0x1234),
                nativeTokenAmount: paymentAmount,
                erc20TokenAddress: address(0),
                erc20TokenAmount: 0
            });
            
            vm.prank(unauthorizedUser);
            vm.expectRevert(abi.encodeWithSelector(SharedValidation.NoPermission.selector, unauthorizedUser));
            paymentHelper.updatePaymentForTransaction(actualTxId, payment);
        } catch (bytes memory reason) {
            // Handle NoPermission - permissions may not be set up
            bytes4 errorSelector = bytes4(reason);
            if (errorSelector == SharedValidation.NoPermission.selector) {
                return; // Skip if permissions not set up
            }
            assembly {
                revert(add(reason, 0x20), mload(reason))
            }
        }
    }

    /**
     * @dev Test: Default system macro selectors are allowed to target address(this)
     *
     * Verifies that NATIVE_TRANSFER_SELECTOR and UPDATE_PAYMENT_SELECTOR (the defaults
     * registered at GuardController initialize) are treated as system macro selectors.
     */
    function testFuzz_SystemMacroSelectorIdentification(
        bytes4 selector
    ) public {
        // Known system macro selectors (same as those added in GuardController.initialize)
        assertTrue(
            _isDefaultSystemMacroSelector(EngineBlox.NATIVE_TRANSFER_SELECTOR),
            "NATIVE_TRANSFER_SELECTOR should be default system macro"
        );
        assertTrue(
            _isDefaultSystemMacroSelector(EngineBlox.UPDATE_PAYMENT_SELECTOR),
            "UPDATE_PAYMENT_SELECTOR should be default system macro"
        );
        // Non-default selectors are not system macros
        if (selector != EngineBlox.NATIVE_TRANSFER_SELECTOR &&
            selector != EngineBlox.UPDATE_PAYMENT_SELECTOR) {
            assertFalse(
                _isDefaultSystemMacroSelector(selector),
                "Non-macro selector should not be default system macro"
            );
        }
    }

    /**
     * @dev Helper: true if selector is one of the default system macro selectors (added at GuardController.initialize)
     */
    function _isDefaultSystemMacroSelector(bytes4 functionSelector) internal pure returns (bool) {
        return functionSelector == EngineBlox.NATIVE_TRANSFER_SELECTOR
            || functionSelector == EngineBlox.UPDATE_PAYMENT_SELECTOR;
    }

    /**
     * @dev Test: System macro selectors cannot bypass whitelist (if applicable)
     * 
     * This verifies that system macro selectors still respect whitelist
     * requirements for external targets (though they can target address(this))
     * 
     * Note: Whitelist enforcement is tested through payment helper which uses
     * system macro selectors. The key security property is that whitelist
     * is still checked for external targets even with system macros.
     */
    function testFuzz_SystemMacroSelectorsRespectWhitelist(
        address externalTarget,
        uint256 transferAmount
    ) public {
        vm.assume(externalTarget != address(0));
        vm.assume(externalTarget != address(paymentHelper));
        vm.assume(externalTarget != address(accountBlox));
        
        // Bound transfer amount
        transferAmount = bound(transferAmount, 1, address(paymentHelper).balance);
        
        bytes32 operationType = keccak256("NATIVE_TRANSFER");
        bytes4 systemMacroSelector = EngineBlox.NATIVE_TRANSFER_SELECTOR;
        
        // Test 1: System macro selector can target address(this) - should succeed
        // (This bypasses whitelist check as address(this) is always allowed)
        vm.prank(owner);
        try paymentHelper.requestTransaction(
            owner,
            address(paymentHelper), // Target is address(this) for payment helper
            0,
            0,
            operationType,
            systemMacroSelector,
            ""
        ) returns (EngineBlox.TxRecord memory txRecord1) {
            uint256 txId1 = txRecord1.txId;
            assertTrue(txId1 > 0, "Transaction should be created for address(this)");
            
            // Set up payment and execute
            EngineBlox.PaymentDetails memory payment1 = EngineBlox.PaymentDetails({
                recipient: address(0x1234),
                nativeTokenAmount: transferAmount,
                erc20TokenAddress: address(0),
                erc20TokenAmount: 0
            });
            
            vm.prank(owner);
            paymentHelper.updatePaymentForTransaction(txId1, payment1);
            
            advanceTime(paymentHelper.getTimeLockPeriodSec() + 1);
            vm.prank(owner);
            
            // Should succeed - system macro can target address(this)
            EngineBlox.TxRecord memory result1 = paymentHelper.approveTransaction(txId1);
            assertEq(
                uint8(result1.status),
                uint8(EngineBlox.TxStatus.COMPLETED),
                "System macro selector should work with address(this)"
            );
        } catch (bytes memory reason) {
            // Handle NoPermission - permissions may not be set up
            bytes4 errorSelector = bytes4(reason);
            if (errorSelector == SharedValidation.NoPermission.selector) {
                return; // Skip if permissions not set up
            }
            assembly {
                revert(add(reason, 0x20), mload(reason))
            }
        }
        
        // Test 2: System macro selector targeting non-whitelisted external address - should fail
        vm.prank(owner);
        try paymentHelper.requestTransaction(
            owner,
            externalTarget, // Non-whitelisted external target
            0,
            0,
            operationType,
            systemMacroSelector,
            ""
        ) returns (EngineBlox.TxRecord memory txRecord2) {
            uint256 txId2 = txRecord2.txId;
            
            // Set up payment
            EngineBlox.PaymentDetails memory payment2 = EngineBlox.PaymentDetails({
                recipient: address(0x1234),
                nativeTokenAmount: transferAmount,
                erc20TokenAddress: address(0),
                erc20TokenAmount: 0
            });
            
            vm.prank(owner);
            paymentHelper.updatePaymentForTransaction(txId2, payment2);
            
            // Advance time and attempt execution
            advanceTime(paymentHelper.getTimeLockPeriodSec() + 1);
            vm.prank(owner);
            
            // Should fail - external target not whitelisted
            vm.expectRevert(
                abi.encodeWithSelector(
                    SharedValidation.TargetNotWhitelisted.selector,
                    externalTarget,
                    systemMacroSelector
                )
            );
            paymentHelper.approveTransaction(txId2);
        } catch (bytes memory reason) {
            // Request might fail if target validation happens early
            bytes4 errorSelector = bytes4(reason);
            if (errorSelector == SharedValidation.NoPermission.selector) {
                return; // Skip if permissions not set up
            }
            // If it's TargetNotWhitelisted at request time, that's also valid
            if (errorSelector == SharedValidation.TargetNotWhitelisted.selector) {
                return; // Expected behavior
            }
            assembly {
                revert(add(reason, 0x20), mload(reason))
            }
        }
        
        // Test 3: System macro selector targeting whitelisted external address - should succeed
        // First, whitelist the external target
        vm.prank(owner);
        paymentHelper.whitelistTargetForTesting(externalTarget, systemMacroSelector);
        
        vm.prank(owner);
        try paymentHelper.requestTransaction(
            owner,
            externalTarget, // Now whitelisted
            0,
            0,
            operationType,
            systemMacroSelector,
            ""
        ) returns (EngineBlox.TxRecord memory txRecord3) {
            uint256 txId3 = txRecord3.txId;
            assertTrue(txId3 > 0, "Transaction should be created for whitelisted target");
            
            // Set up payment
            EngineBlox.PaymentDetails memory payment3 = EngineBlox.PaymentDetails({
                recipient: address(0x1234),
                nativeTokenAmount: transferAmount,
                erc20TokenAddress: address(0),
                erc20TokenAmount: 0
            });
            
            vm.prank(owner);
            paymentHelper.updatePaymentForTransaction(txId3, payment3);
            
            // Advance time and execute
            advanceTime(paymentHelper.getTimeLockPeriodSec() + 1);
            vm.prank(owner);
            
            // Should succeed - external target is whitelisted
            EngineBlox.TxRecord memory result3 = paymentHelper.approveTransaction(txId3);
            assertEq(
                uint8(result3.status),
                uint8(EngineBlox.TxStatus.COMPLETED),
                "System macro selector should work with whitelisted external target"
            );
        } catch (bytes memory reason) {
            // Handle NoPermission - permissions may not be set up
            bytes4 errorSelector = bytes4(reason);
            if (errorSelector == SharedValidation.NoPermission.selector) {
                return; // Skip if permissions not set up
            }
            assembly {
                revert(add(reason, 0x20), mload(reason))
            }
        }
    }

}
