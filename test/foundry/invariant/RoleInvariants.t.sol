// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import "../CommonBase.sol";
import "forge-std/StdInvariant.sol";

/**
 * @title RoleInvariantsTest
 * @dev Invariant tests for role management
 */
contract RoleInvariantsTest is CommonBase {
    function setUp() public override {
        super.setUp();
        // Exclude SecureOwnable execution functions from fuzz so the invariant "protected roles
        // never modified via RuntimeRBAC" is not violated by legitimate time-delay/meta execution.
        // The fuzzer may only call other functions (e.g. RuntimeRBAC); recovery/owner/broadcaster
        // must not change via those paths.
        bytes4[] memory secureOwnableExecutionSelectors = new bytes4[](4);
        secureOwnableExecutionSelectors[0] = TRANSFER_OWNERSHIP_SELECTOR;
        secureOwnableExecutionSelectors[1] = UPDATE_BROADCASTER_SELECTOR;
        secureOwnableExecutionSelectors[2] = UPDATE_RECOVERY_SELECTOR;
        secureOwnableExecutionSelectors[3] = UPDATE_TIMELOCK_SELECTOR;
        excludeSelector(
            StdInvariant.FuzzSelector({ addr: address(roleBlox), selectors: secureOwnableExecutionSelectors })
        );
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

    /**
     * @dev Enhanced invariant: Protected roles cannot be modified via RuntimeRBAC
     * This invariant would have caught the CannotModifyProtected vulnerability
     */
    function invariant_ProtectedRolesNeverModifiedViaRuntimeRBAC() public {
        // Verify protected roles unchanged
        address currentOwner = roleBlox.owner();
        address currentRecovery = roleBlox.getRecovery();
        address[] memory currentBroadcasters = roleBlox.getBroadcasters();

        assertEq(currentOwner, owner, "Owner should never change via RuntimeRBAC");
        assertEq(currentRecovery, recovery, "Recovery should never change via RuntimeRBAC");
        assertGt(currentBroadcasters.length, 0, "Broadcaster should exist");
        assertEq(currentBroadcasters[0], broadcaster, "Broadcaster should never change via RuntimeRBAC");

        // Verify protection flags remain true
        vm.prank(owner);
        (, , , , bool ownerProtected) = roleBlox.getRole(OWNER_ROLE);
        vm.prank(owner);
        (, , , , bool broadcasterProtected) = roleBlox.getRole(BROADCASTER_ROLE);
        vm.prank(owner);
        (, , , , bool recoveryProtected) = roleBlox.getRole(RECOVERY_ROLE);

        assertTrue(ownerProtected, "OWNER_ROLE should remain protected");
        assertTrue(broadcasterProtected, "BROADCASTER_ROLE should remain protected");
        assertTrue(recoveryProtected, "RECOVERY_ROLE should remain protected");
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
            EngineBlox.FunctionPermission[] memory permissions = secureBlox.getActiveRolePermissions(roles[i]);
            
            // Verify permissions are valid
            for (uint256 j = 0; j < permissions.length; j++) {
                assertNotEq(permissions[j].functionSelector, bytes4(0));
            }
        }
    }
}
