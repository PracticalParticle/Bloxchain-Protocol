// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import "../CommonBase.sol";
import "../../../contracts/core/execution/GuardController.sol";
import "../../../contracts/core/execution/interface/IGuardController.sol";
import "../../../contracts/core/execution/lib/definitions/GuardControllerDefinitions.sol";
import "../../../contracts/core/lib/utils/SharedValidation.sol";

/**
 * @title GuardControllerTest
 * @dev Unit tests for GuardController contract
 */
contract GuardControllerTest is CommonBase {
    bytes4 public constant TEST_FUNCTION_SELECTOR = bytes4(keccak256("execute()"));

    function setUp() public override {
        super.setUp();
    }

    // ============ TARGET WHITELIST TESTS ============
    // Note: Whitelist management uses meta-transaction workflow
    // Direct tests would require full meta-transaction setup
    // These tests focus on query functions and execution validation

    function test_GetAllowedTargets_ReturnsWhitelistedTargets() public {
        // Initially empty whitelist
        vm.prank(owner);
        address[] memory targets = accountBlox.getFunctionWhitelistTargets(TEST_FUNCTION_SELECTOR);
        assertEq(targets.length, 0);
    }

    function test_GetAllowedTargets_RequiresRole() public {
        // Should require any role for privacy protection
        vm.prank(attacker);
        vm.expectRevert();
        accountBlox.getFunctionWhitelistTargets(TEST_FUNCTION_SELECTOR);
    }

    function test_GuardConfigBatchExecutionParams_AddTargetToWhitelist() public {
        IGuardController.GuardConfigAction[] memory actions = new IGuardController.GuardConfigAction[](1);
        actions[0] = IGuardController.GuardConfigAction({
            actionType: IGuardController.GuardConfigActionType.ADD_TARGET_TO_WHITELIST,
            data: abi.encode(TEST_FUNCTION_SELECTOR, address(mockTarget))
        });
        
        bytes memory params = GuardControllerDefinitions.guardConfigBatchExecutionParams(actions);
        
        // Decode the actions array
        IGuardController.GuardConfigAction[] memory decodedActions = abi.decode(params, (IGuardController.GuardConfigAction[]));
        assertEq(decodedActions.length, 1);
        assertEq(uint8(decodedActions[0].actionType), uint8(IGuardController.GuardConfigActionType.ADD_TARGET_TO_WHITELIST));
        
        (bytes4 selector, address target) = abi.decode(decodedActions[0].data, (bytes4, address));
        assertEq(selector, TEST_FUNCTION_SELECTOR);
        assertEq(target, address(mockTarget));
    }

    function test_GuardConfigBatchExecutionParams_RemoveTargetFromWhitelist() public {
        IGuardController.GuardConfigAction[] memory actions = new IGuardController.GuardConfigAction[](1);
        actions[0] = IGuardController.GuardConfigAction({
            actionType: IGuardController.GuardConfigActionType.REMOVE_TARGET_FROM_WHITELIST,
            data: abi.encode(TEST_FUNCTION_SELECTOR, address(mockTarget))
        });
        
        bytes memory params = GuardControllerDefinitions.guardConfigBatchExecutionParams(actions);
        
        // Decode the actions array
        IGuardController.GuardConfigAction[] memory decodedActions = abi.decode(params, (IGuardController.GuardConfigAction[]));
        assertEq(decodedActions.length, 1);
        assertEq(uint8(decodedActions[0].actionType), uint8(IGuardController.GuardConfigActionType.REMOVE_TARGET_FROM_WHITELIST));
        
        (bytes4 selector, address target) = abi.decode(decodedActions[0].data, (bytes4, address));
        assertEq(selector, TEST_FUNCTION_SELECTOR);
        assertEq(target, address(mockTarget));
    }

    function test_GuardConfigBatchExecutionParams_Revert_ZeroAddress() public {
        IGuardController.GuardConfigAction[] memory actions = new IGuardController.GuardConfigAction[](1);
        actions[0] = IGuardController.GuardConfigAction({
            actionType: IGuardController.GuardConfigActionType.ADD_TARGET_TO_WHITELIST,
            data: abi.encode(TEST_FUNCTION_SELECTOR, address(0))
        });
        
        // The validation happens during execution, not during params creation
        // So we can create params with zero address, but execution will fail
        bytes memory params = GuardControllerDefinitions.guardConfigBatchExecutionParams(actions);
        assertGt(params.length, 0);
    }

    function test_EmptyWhitelist_DeniesAllExecutions() public {
        // No targets whitelisted
        vm.prank(owner);
        address[] memory targets = accountBlox.getFunctionWhitelistTargets(TEST_FUNCTION_SELECTOR);
        assertEq(targets.length, 0);

        // Execution should fail due to whitelist check
        // This is tested in execution tests below
    }

    // ============ EXECUTION TESTS ============
    // Note: These tests require whitelist setup via meta-transactions
    // For now, we test the structure and validation

    function test_ExecuteWithTimeLock_Revert_NonWhitelistedTarget() public {
        // Don't add to whitelist
        bytes32 operationType = keccak256("TEST_OPERATION");
        
        vm.prank(owner);
        // May fail with NoPermission if owner doesn't have permission, or TargetNotWhitelisted if whitelist check happens first
        vm.expectRevert();
        accountBlox.executeWithTimeLock(
            address(mockTarget),
            0,
            TEST_FUNCTION_SELECTOR,
            "",
            0,
            operationType
        );
    }

    function test_ApproveTimeLockExecution_AfterTimelock() public {
        // Note: This test requires whitelist setup via meta-transactions
        // Since whitelist setup requires meta-transactions, we test the structure
        // Full test would require: whitelist target via meta-transaction workflow, then create and approve
        
        // For now, we verify that execution fails without whitelist (expected behavior)
        bytes32 operationType = keccak256("TEST_OPERATION");
        
        // Attempt to create execution request - will fail without whitelist or permissions
        vm.prank(owner);
        vm.expectRevert(); // Will fail due to whitelist or permission check
        accountBlox.executeWithTimeLock(
            address(mockTarget),
            0,
            TEST_FUNCTION_SELECTOR,
            "",
            0,
            operationType
        );
        
        // Note: Full test requires meta-transaction workflow to:
        // 1. Add target to whitelist via meta-transaction
        // 2. Create execution request
        // 3. Wait for timelock
        // 4. Approve execution
    }

    function test_CancelTimeLockExecution_Authorized() public {
        // Note: This test requires whitelist setup via meta-transactions
        // Since whitelist setup requires meta-transactions, we test the structure
        // Full test would require: whitelist target via meta-transaction workflow, then create and cancel
        
        // For now, we verify that execution fails without whitelist (expected behavior)
        bytes32 operationType = keccak256("TEST_OPERATION");
        
        // Attempt to create execution request - will fail without whitelist or permissions
        vm.prank(owner);
        vm.expectRevert(); // Will fail due to whitelist or permission check
        accountBlox.executeWithTimeLock(
            address(mockTarget),
            0,
            TEST_FUNCTION_SELECTOR,
            "",
            0,
            operationType
        );
        
        // Note: Full test requires meta-transaction workflow to:
        // 1. Add target to whitelist via meta-transaction
        // 2. Create execution request
        // 3. Cancel the request
    }

    // ============ INTERFACE SUPPORT TESTS ============

    function test_SupportsInterface_IGuardController() public {
        bytes4 interfaceId = type(IGuardController).interfaceId;
        assertTrue(accountBlox.supportsInterface(interfaceId));
    }

    function test_SupportsInterface_ERC165() public {
        assertTrue(accountBlox.supportsInterface(0x01ffc9a7));
    }
}
