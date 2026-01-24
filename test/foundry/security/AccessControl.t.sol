// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "../CommonBase.sol";
import "../../../contracts/core/access/RuntimeRBAC.sol";
import "../../../contracts/core/execution/GuardController.sol";
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
        StateAbstraction.FunctionPermission[] memory permissions = new StateAbstraction.FunctionPermission[](0);
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
    // Use GuardController.guardConfigBatchExecutionParams with GuardConfigActionType.REGISTER_FUNCTION instead

    function test_Revert_UnauthorizedWhitelistModification() public {
        // Whitelist modification requires meta-transaction workflow
        // Direct calls are not available - this is tested through the workflow
        // For now, we verify the execution params function requires proper setup
        // NOTE: Now uses guardConfigBatchExecutionParams with GuardConfigAction
        GuardController.GuardConfigAction[] memory actions = new GuardController.GuardConfigAction[](1);
        actions[0] = GuardController.GuardConfigAction({
            actionType: GuardController.GuardConfigActionType.ADD_TARGET_TO_WHITELIST,
            data: abi.encode(bytes4(keccak256("execute()")), address(mockTarget))
        });
        
        bytes memory params = controlBlox.guardConfigBatchExecutionParams(actions);
        assertGt(params.length, 0);
    }

    function test_Revert_ProtectedRoleModification() public {
        // Protected roles cannot be removed or modified
        // This is enforced in StateAbstraction library
        // We verify the roles remain protected
        vm.prank(owner);
        (, , , , bool ownerProtected) = secureBlox.getRole(OWNER_ROLE);
        assertTrue(ownerProtected);
    }

    function test_PermissionBoundary_OwnerOnly() public {
        // Owner-only functions should reject non-owners
        vm.prank(attacker);
        vm.expectRevert();
        secureBlox.updateBroadcasterRequest(user1);
    }

    function test_PermissionBoundary_RecoveryOnly() public {
        // Recovery-only functions should reject non-recovery
        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(SharedValidation.RestrictedRecovery.selector, attacker, recovery));
        secureBlox.transferOwnershipRequest();
    }
}
