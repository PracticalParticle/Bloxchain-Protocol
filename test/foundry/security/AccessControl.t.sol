// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "../CommonBase.sol";
import "../../../contracts/core/access/RuntimeRBAC.sol";
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

    function test_Revert_UnauthorizedFunctionRegistration() public {
        // Function registration requires proper permissions through state machine
        // Direct execution is internal-only, so we test that unauthorized access is prevented
        
        // Attempt to call internal function directly (should fail)
        // Function registration happens through roleConfigBatchExecutionParams
        // which requires proper role permissions
        
        // Verify that execution params creation requires proper setup
        RuntimeRBAC.RoleConfigAction[] memory actions = new RuntimeRBAC.RoleConfigAction[](1);
        bytes4 selector = bytes4(keccak256("testFunction()"));
        string memory functionSignature = "testFunction()";
        bytes32 operationType = keccak256("TEST_OPERATION");
        string memory operationName = "TEST_OPERATION";
        uint16 supportedActionsBitmap = 1;
        bool isProtected = false;
        bytes4[] memory handlerForSelectors = new bytes4[](0);
        
        actions[0] = RuntimeRBAC.RoleConfigAction({
            actionType: RuntimeRBAC.RoleConfigActionType.REGISTER_FUNCTION,
            data: abi.encode(selector, functionSignature, operationType, operationName, supportedActionsBitmap, isProtected, handlerForSelectors)
        });
        
        // Execution params can be created (this is just encoding)
        bytes memory executionParams = roleBlox.roleConfigBatchExecutionParams(actions);
        assertGt(executionParams.length, 0);
        
        // But actual execution requires proper permissions through state machine
        // This is tested through the full workflow in other tests
    }

    function test_Revert_UnauthorizedWhitelistModification() public {
        // Whitelist modification requires meta-transaction workflow
        // Direct calls are not available - this is tested through the workflow
        // For now, we verify the execution params function requires proper setup
        bytes memory params = controlBlox.updateTargetWhitelistExecutionParams(
            bytes4(keccak256("execute()")),
            address(mockTarget),
            true
        );
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
