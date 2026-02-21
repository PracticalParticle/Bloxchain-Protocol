// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import "../CommonBase.sol";
import "../helpers/TestHelpers.sol";
import "../../../contracts/core/execution/GuardController.sol";
import "../../../contracts/core/execution/interface/IGuardController.sol";
import "../../../contracts/core/execution/lib/definitions/GuardControllerDefinitions.sol";

/**
 * @title WhitelistWorkflowTest
 * @dev Integration tests for whitelist management via meta-transactions
 */
contract WhitelistWorkflowTest is CommonBase {
    bytes4 public constant TEST_FUNCTION_SELECTOR = bytes4(keccak256("execute()"));
    uint256 private constant OWNER_PRIVATE_KEY = 0x1;

    function setUp() public override {
        super.setUp();
    }

    /**
     * @dev Test whitelist execution params creation (now using batch config)
     */
    function test_Whitelist_ExecutionParamsCreation() public {
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

    /**
     * @dev Test that whitelist starts empty
     */
    function test_Whitelist_StartsEmpty() public {
        vm.prank(owner);
        address[] memory targets = accountBlox.getFunctionWhitelistTargets(TEST_FUNCTION_SELECTOR);
        assertEq(targets.length, 0);
    }

    /**
     * @dev Test execution fails without whitelist
     */
    function test_Whitelist_ExecutionFailsWithoutWhitelist() public {
        bytes32 operationType = keccak256("TEST_OPERATION");
        
        vm.prank(owner);
        vm.expectRevert(); // Will fail due to whitelist check or permissions
        accountBlox.executeWithTimeLock(
            address(mockTarget),
            0,
            TEST_FUNCTION_SELECTOR,
            "",
            0,
            operationType
        );
    }

    /**
     * @dev Test whitelist removal execution params (now using batch config)
     */
    function test_Whitelist_RemoveExecutionParams() public {
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

    /**
     * @dev Test multiple whitelist operations (now using batch config)
     */
    function test_Whitelist_MultipleTargets() public {
        address target1 = address(0x100);
        address target2 = address(0x200);
        
        // Test batch with multiple actions
        IGuardController.GuardConfigAction[] memory actions = new IGuardController.GuardConfigAction[](2);
        actions[0] = IGuardController.GuardConfigAction({
            actionType: IGuardController.GuardConfigActionType.ADD_TARGET_TO_WHITELIST,
            data: abi.encode(TEST_FUNCTION_SELECTOR, target1)
        });
        actions[1] = IGuardController.GuardConfigAction({
            actionType: IGuardController.GuardConfigActionType.ADD_TARGET_TO_WHITELIST,
            data: abi.encode(TEST_FUNCTION_SELECTOR, target2)
        });
        
        bytes memory params = GuardControllerDefinitions.guardConfigBatchExecutionParams(actions);
        
        // Decode the actions array
        IGuardController.GuardConfigAction[] memory decodedActions = abi.decode(params, (IGuardController.GuardConfigAction[]));
        assertEq(decodedActions.length, 2);
        
        // Verify first action
        assertEq(uint8(decodedActions[0].actionType), uint8(IGuardController.GuardConfigActionType.ADD_TARGET_TO_WHITELIST));
        (bytes4 sel1, address t1) = abi.decode(decodedActions[0].data, (bytes4, address));
        assertEq(sel1, TEST_FUNCTION_SELECTOR);
        assertEq(t1, target1);
        
        // Verify second action
        assertEq(uint8(decodedActions[1].actionType), uint8(IGuardController.GuardConfigActionType.ADD_TARGET_TO_WHITELIST));
        (bytes4 sel2, address t2) = abi.decode(decodedActions[1].data, (bytes4, address));
        assertEq(sel2, TEST_FUNCTION_SELECTOR);
        assertEq(t2, target2);
    }
}
