// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "../CommonBase.sol";
import "../helpers/TestHelpers.sol";

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
     * @dev Test whitelist execution params creation
     */
    function test_Whitelist_ExecutionParamsCreation() public {
        bytes memory params = controlBlox.updateTargetWhitelistExecutionParams(
            TEST_FUNCTION_SELECTOR,
            address(mockTarget),
            true
        );
        
        (bytes4 selector, address target, bool isAdd) = abi.decode(params, (bytes4, address, bool));
        assertEq(selector, TEST_FUNCTION_SELECTOR);
        assertEq(target, address(mockTarget));
        assertTrue(isAdd);
    }

    /**
     * @dev Test that whitelist starts empty
     */
    function test_Whitelist_StartsEmpty() public {
        vm.prank(owner);
        address[] memory targets = controlBlox.getAllowedTargets(TEST_FUNCTION_SELECTOR);
        assertEq(targets.length, 0);
    }

    /**
     * @dev Test execution fails without whitelist
     */
    function test_Whitelist_ExecutionFailsWithoutWhitelist() public {
        bytes32 operationType = keccak256("TEST_OPERATION");
        
        vm.prank(owner);
        vm.expectRevert(); // Will fail due to whitelist check or permissions
        controlBlox.executeWithTimeLock(
            address(mockTarget),
            0,
            TEST_FUNCTION_SELECTOR,
            "",
            0,
            operationType
        );
    }

    /**
     * @dev Test whitelist removal execution params
     */
    function test_Whitelist_RemoveExecutionParams() public {
        bytes memory params = controlBlox.updateTargetWhitelistExecutionParams(
            TEST_FUNCTION_SELECTOR,
            address(mockTarget),
            false
        );
        
        (bytes4 selector, address target, bool isAdd) = abi.decode(params, (bytes4, address, bool));
        assertEq(selector, TEST_FUNCTION_SELECTOR);
        assertEq(target, address(mockTarget));
        assertFalse(isAdd);
    }

    /**
     * @dev Test multiple whitelist operations
     */
    function test_Whitelist_MultipleTargets() public {
        address target1 = address(0x100);
        address target2 = address(0x200);
        
        bytes memory params1 = controlBlox.updateTargetWhitelistExecutionParams(
            TEST_FUNCTION_SELECTOR,
            target1,
            true
        );
        
        bytes memory params2 = controlBlox.updateTargetWhitelistExecutionParams(
            TEST_FUNCTION_SELECTOR,
            target2,
            true
        );
        
        // Verify both params are created correctly
        (bytes4 sel1, address t1, bool add1) = abi.decode(params1, (bytes4, address, bool));
        (bytes4 sel2, address t2, bool add2) = abi.decode(params2, (bytes4, address, bool));
        
        assertEq(sel1, TEST_FUNCTION_SELECTOR);
        assertEq(t1, target1);
        assertTrue(add1);
        
        assertEq(sel2, TEST_FUNCTION_SELECTOR);
        assertEq(t2, target2);
        assertTrue(add2);
    }
}
