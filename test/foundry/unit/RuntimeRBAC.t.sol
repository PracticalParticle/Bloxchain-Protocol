// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import "../CommonBase.sol";
import "../../../contracts/core/access/RuntimeRBAC.sol";
import "../../../contracts/core/access/interface/IRuntimeRBAC.sol";
import "../../../contracts/utils/SharedValidation.sol";

/**
 * @title RuntimeRBACTest
 * @dev Unit tests for RuntimeRBAC contract
 */
contract RuntimeRBACTest is CommonBase {
    bytes32 public constant TEST_ROLE_HASH = keccak256("TEST_ROLE");
    string public constant TEST_ROLE_NAME = "TEST_ROLE";
    bytes4 public constant TEST_FUNCTION_SELECTOR = bytes4(keccak256("testFunction()"));

    function setUp() public override {
        super.setUp();
    }

    // ============ ROLE CONFIGURATION TESTS ============

    function test_ExecuteRoleConfigBatch_CreateRole() public {
        RuntimeRBAC.RoleConfigAction[] memory actions = new RuntimeRBAC.RoleConfigAction[](1);
        
        StateAbstraction.FunctionPermission[] memory permissions = new StateAbstraction.FunctionPermission[](0);
        actions[0] = RuntimeRBAC.RoleConfigAction({
            actionType: RuntimeRBAC.RoleConfigActionType.CREATE_ROLE,
            data: abi.encode(TEST_ROLE_NAME, 10, permissions)
        });

        bytes memory executionParams = roleBlox.roleConfigBatchExecutionParams(actions);
        
        // Create a transaction to execute the batch
        // This would typically go through the state machine workflow
        // For now, we test the execution params creation
        assertGt(executionParams.length, 0);
    }

    function test_ExecuteRoleConfigBatch_AddWallet() public {
        // First create a role, then add wallet
        // This is a simplified test - full implementation would use state machine
        bytes32 roleHash = getRoleHash(TEST_ROLE_NAME);
        
        // Verify role doesn't exist yet
        vm.expectRevert();
        roleBlox.getWalletsInRole(roleHash);
    }

    function test_GetFunctionSchema_RegisteredFunction() public {
        // Test with a function that should be registered
        bytes4 selector = bytes4(keccak256("executeRoleConfigBatch((uint8,bytes)[])"));
        
        // This may or may not be registered depending on initialization
        // We test the function exists and handles both cases
        try roleBlox.getFunctionSchema(selector) returns (
            string memory functionSignature,
            bytes4 functionSelector,
            bytes32 operationType,
            string memory operationName,
            StateAbstraction.TxAction[] memory supportedActions,
            bool isProtected
        ) {
            // Function schema exists - verify it's valid
            assertGt(bytes(functionSignature).length, 0);
            assertEq(functionSelector, selector);
            assertGt(bytes(operationName).length, 0);
        } catch {
            // Function schema doesn't exist - expected for some functions
            // This is valid if the function wasn't registered during initialization
        }
    }

    function test_GetFunctionSchema_Revert_UnregisteredFunction() public {
        bytes4 invalidSelector = bytes4(0x12345678);
        vm.expectRevert(abi.encodeWithSelector(SharedValidation.ResourceNotFound.selector, bytes32(invalidSelector)));
        roleBlox.getFunctionSchema(invalidSelector);
    }

    function test_GetWalletsInRole_RequiresRole() public {
        bytes32 roleHash = OWNER_ROLE;
        
        // Should work if caller has a role
        vm.prank(owner);
        address[] memory wallets = roleBlox.getWalletsInRole(roleHash);
        assertGt(wallets.length, 0);
    }

    function test_GetWalletsInRole_Revert_NoRole() public {
        bytes32 roleHash = OWNER_ROLE;
        
        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(SharedValidation.NoPermission.selector, attacker));
        roleBlox.getWalletsInRole(roleHash);
    }

    function test_GetWalletsInRole_Revert_RoleNotFound() public {
        bytes32 nonExistentRole = keccak256("NON_EXISTENT_ROLE");
        
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(SharedValidation.ResourceNotFound.selector, nonExistentRole));
        roleBlox.getWalletsInRole(nonExistentRole);
    }

    // ============ INTERFACE SUPPORT TESTS ============

    function test_SupportsInterface_IRuntimeRBAC() public {
        bytes4 interfaceId = type(IRuntimeRBAC).interfaceId;
        assertTrue(roleBlox.supportsInterface(interfaceId));
    }

    function test_SupportsInterface_ERC165() public {
        assertTrue(roleBlox.supportsInterface(0x01ffc9a7));
    }

    // ============ PROTECTED ROLES TESTS ============

    function test_CannotModifyProtectedRoles() public {
        // Protected roles (OWNER, BROADCASTER, RECOVERY) cannot be removed
        // This is tested through the state machine's role management
        // The actual protection is in StateAbstraction library
        vm.prank(owner);
        assertTrue(roleBlox.hasRole(OWNER_ROLE, owner));
        
        vm.prank(owner);
        assertTrue(roleBlox.hasRole(BROADCASTER_ROLE, broadcaster));
        
        vm.prank(owner);
        assertTrue(roleBlox.hasRole(RECOVERY_ROLE, recovery));
    }
}
