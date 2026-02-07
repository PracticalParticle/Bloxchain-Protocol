// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import "../CommonBase.sol";
import "../../../contracts/core/access/RuntimeRBAC.sol";
import "../../../contracts/core/execution/GuardController.sol";
import "../../../contracts/core/execution/lib/definitions/GuardControllerDefinitions.sol";
import "../../../contracts/utils/SharedValidation.sol";

/**
 * @title AccessControlTest
 * @dev Tests for access control boundaries
 */
contract AccessControlTest is CommonBase {
    function setUp() public override {
        super.setUp();
    }

    function test_Revert_UnauthorizedOwnershipTransfer() public {
        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(SharedValidation.RestrictedRecovery.selector, attacker, recovery));
        secureBlox.transferOwnershipRequest();
    }

    function test_Revert_UnauthorizedRoleCreation() public {
        // Role creation requires proper permissions through state machine
        // Direct execution is internal-only (executeRoleConfigBatch)
        RuntimeRBAC.RoleConfigAction[] memory actions = new RuntimeRBAC.RoleConfigAction[](1);
        EngineBlox.FunctionPermission[] memory permissions = new EngineBlox.FunctionPermission[](0);
        actions[0] = RuntimeRBAC.RoleConfigAction({
            actionType: RuntimeRBAC.RoleConfigActionType.CREATE_ROLE,
            data: abi.encode("ATTACKER_ROLE", 10, permissions)
        });

        // Attempt direct execution (should fail - internal only)
        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(SharedValidation.OnlyCallableByContract.selector, attacker, address(roleBlox)));
        roleBlox.executeRoleConfigBatch(actions);
    }

    // NOTE: Function registration has been moved to GuardController
    // This test is removed as REGISTER_FUNCTION is no longer part of RuntimeRBAC
    // Use GuardControllerDefinitions.guardConfigBatchExecutionParams with GuardConfigActionType.REGISTER_FUNCTION instead

    function test_GuardConfigBatchExecutionParams() public {
        // Test that guardConfigBatchExecutionParams correctly encodes GuardConfigAction data
        // NOTE: This is a pure function that doesn't check authorization
        // Authorization is tested through the meta-transaction workflow
        GuardControllerDefinitions.GuardConfigAction[] memory actions = new GuardControllerDefinitions.GuardConfigAction[](1);
        actions[0] = GuardControllerDefinitions.GuardConfigAction({
            actionType: GuardControllerDefinitions.GuardConfigActionType.ADD_TARGET_TO_WHITELIST,
            data: abi.encode(bytes4(keccak256("execute()")), address(mockTarget))
        });
        
        bytes memory params = GuardControllerDefinitions.guardConfigBatchExecutionParams(actions);
        assertGt(params.length, 0);
        
        // Verify the params can be decoded back to the original actions
        GuardControllerDefinitions.GuardConfigAction[] memory decodedActions = abi.decode(params, (GuardControllerDefinitions.GuardConfigAction[]));
        assertEq(decodedActions.length, 1);
        assertEq(uint8(decodedActions[0].actionType), uint8(GuardControllerDefinitions.GuardConfigActionType.ADD_TARGET_TO_WHITELIST));
    }

    function test_Revert_ProtectedRoleModification() public {
        // Protected roles cannot be removed or modified
        // This is enforced in EngineBlox library
        // We verify the roles remain protected
        vm.prank(owner);
        (, , , , bool ownerProtected) = secureBlox.getRole(OWNER_ROLE);
        assertTrue(ownerProtected);
    }

    function test_PermissionBoundary_OwnerOnly() public {
        // Owner-only functions should reject non-owners
        vm.prank(attacker);
        vm.expectRevert();
        secureBlox.updateBroadcasterRequest(user1, 0);
    }

    function test_PermissionBoundary_RecoveryOnly() public {
        // Recovery-only functions should reject non-recovery
        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(SharedValidation.RestrictedRecovery.selector, attacker, recovery));
        secureBlox.transferOwnershipRequest();
    }
}
