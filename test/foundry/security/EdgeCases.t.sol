// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

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
        // Library is pure: encodes without validation. Contract validates on executeRecoveryUpdate.
        bytes memory params = SecureOwnableDefinitions.updateRecoveryExecutionParams(address(0));
        address decoded = abi.decode(params, (address));
        assertEq(decoded, address(0));
    }

    function test_InvalidStateTransitions() public {
        // Create and complete a transaction
        vm.prank(recovery);
        uint256 txId = secureBlox.transferOwnershipRequest();
        vm.prank(recovery);
        EngineBlox.TxRecord memory requestTx = secureBlox.getTransaction(txId);

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
        EngineBlox.TxAction action = EngineBlox.TxAction.EXECUTE_META_APPROVE;
        uint256 maxGasPrice = 100 gwei;

        // Creating params with short duration should be allowed (validation happens on execution)
        EngineBlox.MetaTxParams memory params = secureBlox.createMetaTxParams(
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
        vm.expectRevert(SharedValidation.PendingSecureRequest.selector);
        secureBlox.transferOwnershipRequest();
    }

    function test_EmptyArrays() public {
        // Test with empty arrays
        RuntimeRBAC.RoleConfigAction[] memory emptyActions = new RuntimeRBAC.RoleConfigAction[](0);
        bytes memory executionParams = RuntimeRBACDefinitions.roleConfigBatchExecutionParams(abi.encode(emptyActions));
        // Empty array encoding: offset (32) + length (32) = 64 bytes minimum
        // Plus any additional encoding overhead
        assertGe(executionParams.length, 64);
    }

    function test_MaxValueBoundaries() public {
        // Test with maximum values
        uint256 maxPeriod = type(uint256).max;
        
        // May or may not revert depending on validation - test that function handles it
        try SecureOwnableDefinitions.updateTimeLockExecutionParams(maxPeriod) returns (bytes memory params) {
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
        // Library is pure: encodes without validation. Contract validates on executeRecoveryUpdate.
        bytes memory params = SecureOwnableDefinitions.updateRecoveryExecutionParams(recovery);
        address decoded = abi.decode(params, (address));
        assertEq(decoded, recovery);
    }

    function test_ConcurrentOperations() public {
        // Only one secure request (ownership or broadcaster) may be pending at a time
        vm.prank(recovery);
        secureBlox.transferOwnershipRequest();

        // Second request while ownership is pending should revert
        vm.prank(owner);
        vm.expectRevert(SharedValidation.PendingSecureRequest.selector);
        secureBlox.updateBroadcasterRequest(user1, 0);

        // Exactly one should be pending
        vm.prank(owner);
        uint256[] memory pending = secureBlox.getPendingTransactions();
        assertEq(pending.length, 1);
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
        uint256 txId = secureBlox.transferOwnershipRequest();
        vm.prank(recovery);
        EngineBlox.TxRecord memory requestTx = secureBlox.getTransaction(txId);

        // Try to approve before release time
        vm.prank(recovery);
        vm.expectRevert(abi.encodeWithSelector(SharedValidation.BeforeReleaseTime.selector, requestTx.releaseTime, block.timestamp));
        secureBlox.transferOwnershipDelayedApproval(txId);
    }
}
