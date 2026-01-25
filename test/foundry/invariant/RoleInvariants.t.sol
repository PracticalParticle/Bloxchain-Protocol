// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import "../CommonBase.sol";

/**
 * @title RoleInvariantsTest
 * @dev Invariant tests for role management
 */
contract RoleInvariantsTest is CommonBase {
    function setUp() public override {
        super.setUp();
    }

    function invariant_RoleWalletLimits() public {
        vm.prank(owner);
        bytes32[] memory roles = secureBlox.getSupportedRoles();
        
        for (uint256 i = 0; i < roles.length; i++) {
            vm.prank(owner);
            (, , uint256 maxWallets, uint256 walletCount, ) = secureBlox.getRole(roles[i]);
            assertLe(walletCount, maxWallets);
        }
    }

    function invariant_ProtectedRolesImmutable() public {
        // Protected roles should always exist
        vm.prank(owner);
        assertTrue(secureBlox.hasRole(OWNER_ROLE, owner));
        vm.prank(owner);
        assertTrue(secureBlox.hasRole(BROADCASTER_ROLE, broadcaster));
        vm.prank(owner);
        assertTrue(secureBlox.hasRole(RECOVERY_ROLE, recovery));

        // Protected roles should have isProtected = true
        vm.prank(owner);
        (, , , , bool ownerProtected) = secureBlox.getRole(OWNER_ROLE);
        vm.prank(owner);
        (, , , , bool broadcasterProtected) = secureBlox.getRole(BROADCASTER_ROLE);
        vm.prank(owner);
        (, , , , bool recoveryProtected) = secureBlox.getRole(RECOVERY_ROLE);

        assertTrue(ownerProtected);
        assertTrue(broadcasterProtected);
        assertTrue(recoveryProtected);
    }

    function invariant_RoleHashConsistency() public {
        vm.prank(owner);
        bytes32[] memory roles = secureBlox.getSupportedRoles();
        
        for (uint256 i = 0; i < roles.length; i++) {
            vm.prank(owner);
            (, bytes32 roleHash, , , ) = secureBlox.getRole(roles[i]);
            assertEq(roleHash, roles[i]);
        }
    }

    function invariant_FunctionPermissionConsistency() public {
        vm.prank(owner);
        bytes32[] memory roles = secureBlox.getSupportedRoles();
        
        for (uint256 i = 0; i < roles.length; i++) {
            vm.prank(owner);
            StateAbstraction.FunctionPermission[] memory permissions = secureBlox.getActiveRolePermissions(roles[i]);
            
            // Verify permissions are valid
            for (uint256 j = 0; j < permissions.length; j++) {
                assertNotEq(permissions[j].functionSelector, bytes4(0));
            }
        }
    }
}
