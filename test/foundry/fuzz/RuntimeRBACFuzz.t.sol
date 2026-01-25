// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import "../CommonBase.sol";
import "../../../contracts/core/access/RuntimeRBAC.sol";
import "../../../contracts/utils/SharedValidation.sol";

/**
 * @title RuntimeRBACFuzzTest
 * @dev Fuzz tests for RuntimeRBAC contract
 */
contract RuntimeRBACFuzzTest is CommonBase {
    function setUp() public override {
        super.setUp();
    }

    function testFuzz_RoleCreation(string memory roleName, uint256 maxWallets) public {
        vm.assume(bytes(roleName).length > 0);
        vm.assume(bytes(roleName).length < 32);
        vm.assume(maxWallets > 0);
        vm.assume(maxWallets < 100);

        bytes32 roleHash = keccak256(bytes(roleName));

        // Test that we can create execution params for role creation
        RuntimeRBAC.RoleConfigAction[] memory actions = new RuntimeRBAC.RoleConfigAction[](1);
        StateAbstraction.FunctionPermission[] memory permissions = new StateAbstraction.FunctionPermission[](0);
        
        actions[0] = RuntimeRBAC.RoleConfigAction({
            actionType: RuntimeRBAC.RoleConfigActionType.CREATE_ROLE,
            data: abi.encode(roleName, maxWallets, permissions)
        });

        bytes memory executionParams = roleBlox.roleConfigBatchExecutionParams(actions);
        assertGt(executionParams.length, 0);
    }

    function testFuzz_WalletAssignment(bytes32 roleHash, address wallet) public {
        vm.assume(wallet != address(0));
        vm.assume(wallet != owner);
        vm.assume(wallet != broadcaster);
        vm.assume(wallet != recovery);

        // Test execution params creation
        RuntimeRBAC.RoleConfigAction[] memory actions = new RuntimeRBAC.RoleConfigAction[](1);
        actions[0] = RuntimeRBAC.RoleConfigAction({
            actionType: RuntimeRBAC.RoleConfigActionType.ADD_WALLET,
            data: abi.encode(roleHash, wallet)
        });

        bytes memory executionParams = roleBlox.roleConfigBatchExecutionParams(actions);
        assertGt(executionParams.length, 0);
    }

    // NOTE: Function registration has been moved to GuardController
    // This test is removed as REGISTER_FUNCTION is no longer part of RuntimeRBAC
    // Use GuardController.guardConfigBatchExecutionParams with GuardConfigActionType.REGISTER_FUNCTION instead
}
