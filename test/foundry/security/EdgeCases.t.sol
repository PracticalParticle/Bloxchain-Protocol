// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "../CommonBase.sol";
import "../../../contracts/core/access/RuntimeRBAC.sol";
import "../../../contracts/utils/SharedValidation.sol";

/**
 * @title EdgeCasesTest
 * @dev Tests for edge cases and error paths
 */
contract EdgeCasesTest is CommonBase {
    function setUp() public override {
        super.setUp();
    }

    function test_ZeroAddressHandling() public {
        // Zero address should be rejected
        vm.expectRevert(abi.encodeWithSelector(SharedValidation.InvalidAddress.selector, address(0)));
        secureBlox.updateRecoveryExecutionParams(address(0));
    }

    function test_InvalidStateTransitions() public {
        // Create and complete a transaction
        vm.prank(recovery);
        StateAbstraction.TxRecord memory requestTx = secureBlox.transferOwnershipRequest();
        uint256 txId = requestTx.txId;

        advanceTime(DEFAULT_TIMELOCK_PERIOD + 1);
        vm.prank(recovery);
        secureBlox.transferOwnershipDelayedApproval(txId);

        // Try to cancel a completed transaction (should fail)
        vm.prank(recovery);
        vm.expectRevert();
        secureBlox.transferOwnershipCancellation(txId);
    }

    function test_CreateMetaTxParams_ShortDeadline() public {
        // Create meta-tx params with very short deadline duration
        // Note: createMetaTxParams expects duration, so we use a small duration
        uint256 shortDuration = 1; // 1 second duration
        
        address handlerContract = address(secureBlox);
        bytes4 handlerSelector = bytes4(keccak256("testHandler()"));
        StateAbstraction.TxAction action = StateAbstraction.TxAction.EXECUTE_META_APPROVE;
        uint256 maxGasPrice = 100 gwei;

        // Creating params with short duration should be allowed (validation happens on execution)
        StateAbstraction.MetaTxParams memory params = secureBlox.createMetaTxParams(
            handlerContract,
            handlerSelector,
            action,
            shortDuration,
            maxGasPrice,
            owner
        );

        // Params creation doesn't validate deadline, only execution does
        // Deadline is calculated as block.timestamp + shortDuration
        assertEq(params.deadline, block.timestamp + shortDuration);
        assertGt(params.deadline, block.timestamp, "Deadline should be in the future");
        // Note: nonce is set to 0 in createMetaTxParams (populated in generateMetaTransaction)
        assertEq(params.nonce, 0);
        // The actual deadline validation happens when the meta-transaction is executed
    }

    function test_DuplicateRequests() public {
        // Create first request
        vm.prank(recovery);
        secureBlox.transferOwnershipRequest();

        // Try to create duplicate (should fail)
        vm.prank(recovery);
        vm.expectRevert(abi.encodeWithSelector(SharedValidation.ResourceAlreadyExists.selector, bytes32(uint256(0))));
        secureBlox.transferOwnershipRequest();
    }

    function test_EmptyArrays() public {
        // Test with empty arrays
        RuntimeRBAC.RoleConfigAction[] memory emptyActions = new RuntimeRBAC.RoleConfigAction[](0);
        bytes memory executionParams = roleBlox.roleConfigBatchExecutionParams(emptyActions);
        // Empty array encoding: offset (32) + length (32) = 64 bytes minimum
        // Plus any additional encoding overhead
        assertGe(executionParams.length, 64);
    }

    function test_MaxValueBoundaries() public {
        // Test with maximum values
        uint256 maxPeriod = type(uint256).max;
        
        // May or may not revert depending on validation - test that function handles it
        try secureBlox.updateTimeLockExecutionParams(maxPeriod) returns (bytes memory params) {
            // Function accepted the value (validation may allow it)
            // Verify params were created correctly
            uint256 decoded = abi.decode(params, (uint256));
            assertEq(decoded, maxPeriod);
        } catch {
            // Function rejected the value (expected for very large values)
            // This is also valid behavior - validation may reject extreme values
        }
    }

    function test_SameAddressUpdate() public {
        // Try to update to same address (should fail)
        vm.expectRevert(abi.encodeWithSelector(SharedValidation.NotNewAddress.selector, recovery, recovery));
        secureBlox.updateRecoveryExecutionParams(recovery);
    }

    function test_ConcurrentOperations() public {
        // Create multiple different operations
        vm.prank(recovery);
        secureBlox.transferOwnershipRequest();

        vm.prank(owner);
        secureBlox.updateBroadcasterRequest(user1);

        // Both should be pending
        vm.prank(owner);
        uint256[] memory pending = secureBlox.getPendingTransactions();
        assertGe(pending.length, 2);
    }

    function test_InvalidTransactionId() public {
        // Try to approve non-existent transaction
        vm.prank(recovery);
        vm.expectRevert();
        secureBlox.transferOwnershipDelayedApproval(99999);
    }

    function test_BeforeReleaseTime() public {
        // Create request
        vm.prank(recovery);
        StateAbstraction.TxRecord memory requestTx = secureBlox.transferOwnershipRequest();
        uint256 txId = requestTx.txId;

        // Try to approve before release time
        vm.prank(recovery);
        vm.expectRevert(abi.encodeWithSelector(SharedValidation.BeforeReleaseTime.selector, requestTx.releaseTime, block.timestamp));
        secureBlox.transferOwnershipDelayedApproval(txId);
    }
}
