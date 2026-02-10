// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import "../CommonBase.sol";
import "../../../contracts/core/access/RuntimeRBAC.sol";
import "../../../contracts/core/access/lib/definitions/RuntimeRBACDefinitions.sol";
import "../../../contracts/utils/SharedValidation.sol";
import "../helpers/TestHelpers.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title ProtectedResourceFuzzTest
 * @dev Comprehensive fuzz tests for protected resource boundaries
 * 
 * These tests specifically target the security boundaries that were missed
 * in the original fuzz tests, particularly the CannotModifyProtected protection.
 */
contract ProtectedResourceFuzzTest is CommonBase {
    using TestHelpers for *;

    // Use constants from RuntimeRBACDefinitions to ensure they match
    bytes4 public constant ROLE_CONFIG_BATCH_META_SELECTOR = RuntimeRBACDefinitions.ROLE_CONFIG_BATCH_META_SELECTOR;
    bytes4 public constant ROLE_CONFIG_BATCH_EXECUTE_SELECTOR = RuntimeRBACDefinitions.ROLE_CONFIG_BATCH_EXECUTE_SELECTOR;
    bytes32 public constant ROLE_CONFIG_BATCH_OPERATION_TYPE = RuntimeRBACDefinitions.ROLE_CONFIG_BATCH;

    function setUp() public override {
        super.setUp();
    }

    /**
     * @dev Fuzz test: Cannot add wallet to protected roles via RuntimeRBAC
     * This test would have caught the CannotModifyProtected vulnerability
     */
    function testFuzz_CannotAddWalletToProtectedRole(address wallet) public {
        vm.assume(wallet != address(0));
        vm.assume(wallet != owner);
        vm.assume(wallet != broadcaster);
        vm.assume(wallet != recovery);

        // Test all protected roles
        bytes32[3] memory protectedRoles = [OWNER_ROLE, BROADCASTER_ROLE, RECOVERY_ROLE];

        for (uint256 i = 0; i < protectedRoles.length; i++) {
            // Create role config batch to add wallet
            RuntimeRBAC.RoleConfigAction[] memory actions = new RuntimeRBAC.RoleConfigAction[](1);
            actions[0] = RuntimeRBAC.RoleConfigAction({
                actionType: RuntimeRBAC.RoleConfigActionType.ADD_WALLET,
                data: abi.encode(protectedRoles[i], wallet)
            });

            bytes memory executionParams = RuntimeRBACDefinitions.roleConfigBatchExecutionParams(abi.encode(actions));

            // Create and execute meta-transaction - should fail
            EngineBlox.MetaTransaction memory metaTx = _createMetaTxForRoleConfig(
                owner,
                executionParams,
                1 hours
            );

            vm.prank(broadcaster);
            uint256 _txId = roleBlox.roleConfigBatchRequestAndApprove(metaTx);
            vm.prank(broadcaster);
            EngineBlox.TxRecord memory txRecord = roleBlox.getTransaction(_txId);
            
            // Transaction should be marked as FAILED with CannotModifyProtected error
            assertEq(uint8(txRecord.status), uint8(EngineBlox.TxStatus.FAILED), "Transaction should fail");
            
            // Verify the error is CannotModifyProtected
            bytes memory expectedError = abi.encodeWithSelector(
                SharedValidation.CannotModifyProtected.selector,
                protectedRoles[i]
            );
            assertEq(txRecord.result, expectedError, "Should fail with CannotModifyProtected");
        }
    }

    /**
     * @dev Fuzz test: Cannot revoke wallet from protected roles via RuntimeRBAC
     */
    function testFuzz_CannotRevokeWalletFromProtectedRole() public {
        // Test revoking owner from OWNER_ROLE
        RuntimeRBAC.RoleConfigAction[] memory actions = new RuntimeRBAC.RoleConfigAction[](1);
        actions[0] = RuntimeRBAC.RoleConfigAction({
            actionType: RuntimeRBAC.RoleConfigActionType.REVOKE_WALLET,
            data: abi.encode(OWNER_ROLE, owner)
        });

        bytes memory executionParams = RuntimeRBACDefinitions.roleConfigBatchExecutionParams(abi.encode(actions));
        EngineBlox.MetaTransaction memory metaTx = _createMetaTxForRoleConfig(
            owner,
            executionParams,
            1 hours
        );

        vm.prank(broadcaster);
        uint256 _txId = roleBlox.roleConfigBatchRequestAndApprove(metaTx);
        vm.prank(broadcaster);
        EngineBlox.TxRecord memory txRecord = roleBlox.getTransaction(_txId);
        
        // Transaction should be marked as FAILED with CannotModifyProtected error
        assertEq(uint8(txRecord.status), uint8(EngineBlox.TxStatus.FAILED), "Transaction should fail");
        
        // Verify the error is CannotModifyProtected
        bytes memory expectedError = abi.encodeWithSelector(
            SharedValidation.CannotModifyProtected.selector,
            OWNER_ROLE
        );
        assertEq(txRecord.result, expectedError, "Should revert with CannotModifyProtected");
    }

    /**
     * @dev Fuzz test: Cannot remove protected roles
     */
    function testFuzz_CannotRemoveProtectedRole() public {
        bytes32[3] memory protectedRoles = [OWNER_ROLE, BROADCASTER_ROLE, RECOVERY_ROLE];

        for (uint256 i = 0; i < protectedRoles.length; i++) {
            RuntimeRBAC.RoleConfigAction[] memory actions = new RuntimeRBAC.RoleConfigAction[](1);
            actions[0] = RuntimeRBAC.RoleConfigAction({
                actionType: RuntimeRBAC.RoleConfigActionType.REMOVE_ROLE,
                data: abi.encode(protectedRoles[i])
            });

            bytes memory executionParams = RuntimeRBACDefinitions.roleConfigBatchExecutionParams(abi.encode(actions));
            EngineBlox.MetaTransaction memory metaTx = _createMetaTxForRoleConfig(
                owner,
                executionParams,
                1 hours
            );

            vm.prank(broadcaster);
            uint256 _txId = roleBlox.roleConfigBatchRequestAndApprove(metaTx);
            vm.prank(broadcaster);
            EngineBlox.TxRecord memory txRecord = roleBlox.getTransaction(_txId);
            
            // Transaction should be marked as FAILED with CannotModifyProtected error
            assertEq(uint8(txRecord.status), uint8(EngineBlox.TxStatus.FAILED), "Transaction should fail");
            
            // Verify the error is CannotModifyProtected
            bytes memory expectedError = abi.encodeWithSelector(
                SharedValidation.CannotModifyProtected.selector,
                protectedRoles[i]
            );
            assertEq(txRecord.result, expectedError, "Should fail with CannotModifyProtected");
        }
    }

    /**
     * @dev Fuzz test: Protected roles remain unchanged after any operation
     */
    function testFuzz_ProtectedRolesUnchangedAfterOperation(
        string memory roleName,
        address wallet
    ) public {
        vm.assume(bytes(roleName).length > 0);
        vm.assume(bytes(roleName).length < 32);
        vm.assume(wallet != address(0));
        vm.assume(wallet != owner);
        vm.assume(wallet != broadcaster);
        vm.assume(wallet != recovery);

        // Store initial protected role states
        address initialOwner = roleBlox.owner();
        address initialRecovery = roleBlox.getRecovery();
        address[] memory initialBroadcasters = roleBlox.getBroadcasters();

        // Create a non-protected role and add wallet to it
        bytes32 newRoleHash = keccak256(bytes(roleName));
        
        // First create the role
        RuntimeRBAC.RoleConfigAction[] memory createActions = new RuntimeRBAC.RoleConfigAction[](1);
        EngineBlox.FunctionPermission[] memory permissions = new EngineBlox.FunctionPermission[](0);
        createActions[0] = RuntimeRBAC.RoleConfigAction({
            actionType: RuntimeRBAC.RoleConfigActionType.CREATE_ROLE,
            data: abi.encode(roleName, 10, permissions)
        });

        bytes memory createParams = RuntimeRBACDefinitions.roleConfigBatchExecutionParams(abi.encode(createActions));
        EngineBlox.MetaTransaction memory createMetaTx = _createMetaTxForRoleConfig(
            owner,
            createParams,
            1 hours
        );

        vm.prank(broadcaster);
        roleBlox.roleConfigBatchRequestAndApprove(createMetaTx);

        // Then add wallet to the new role
        RuntimeRBAC.RoleConfigAction[] memory addActions = new RuntimeRBAC.RoleConfigAction[](1);
        addActions[0] = RuntimeRBAC.RoleConfigAction({
            actionType: RuntimeRBAC.RoleConfigActionType.ADD_WALLET,
            data: abi.encode(newRoleHash, wallet)
        });

        bytes memory addParams = RuntimeRBACDefinitions.roleConfigBatchExecutionParams(abi.encode(addActions));
        EngineBlox.MetaTransaction memory addMetaTx = _createMetaTxForRoleConfig(
            owner,
            addParams,
            1 hours
        );

        vm.prank(broadcaster);
        roleBlox.roleConfigBatchRequestAndApprove(addMetaTx);

        // Verify protected roles are unchanged
        assertEq(roleBlox.owner(), initialOwner);
        assertEq(roleBlox.getRecovery(), initialRecovery);
        address[] memory finalBroadcasters = roleBlox.getBroadcasters();
        assertEq(finalBroadcasters.length, initialBroadcasters.length);
        assertEq(finalBroadcasters[0], initialBroadcasters[0]);
    }

    /**
     * @dev Helper to create meta-transaction for role config batch
     */
    function _createMetaTxForRoleConfig(
        address signer,
        bytes memory executionParams,
        uint256 deadline
    ) internal returns (EngineBlox.MetaTransaction memory) {
        // Create meta-transaction parameters
        EngineBlox.MetaTxParams memory metaTxParams = roleBlox.createMetaTxParams(
            address(roleBlox),
            ROLE_CONFIG_BATCH_META_SELECTOR,
            EngineBlox.TxAction.SIGN_META_REQUEST_AND_APPROVE,
            deadline,
            0, // maxGasPrice
            signer
        );

        // Generate unsigned meta-transaction
        EngineBlox.MetaTransaction memory metaTx = roleBlox.generateUnsignedMetaTransactionForNew(
            signer,
            address(roleBlox),
            0, // value
            0, // gasLimit
            ROLE_CONFIG_BATCH_OPERATION_TYPE,
            ROLE_CONFIG_BATCH_EXECUTE_SELECTOR,
            executionParams,
            metaTxParams
        );

        // Sign the meta-transaction using the message hash from the contract
        // The contract uses toEthSignedMessageHash() when recovering, so we must sign with the same format
        uint256 signerPrivateKey = _getPrivateKeyForAddress(signer);
        bytes32 messageHash = metaTx.message; // Use the message hash from contract (EIP-712 hash)
        bytes32 ethSignedMessageHash = MessageHashUtils.toEthSignedMessageHash(messageHash); // Add Ethereum signed message prefix
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPrivateKey, ethSignedMessageHash);
        bytes memory signature = abi.encodePacked(r, s, v);

        metaTx.signature = signature;
        return metaTx;
    }

    /**
     * @dev Get private key for test addresses
     * Uses vm.addr() to ensure addresses match private keys
     */
    function _getPrivateKeyForAddress(address addr) internal view returns (uint256) {
        // CommonBase uses vm.addr(1), vm.addr(2), vm.addr(3) for owner, broadcaster, recovery
        if (addr == owner) return 1;
        if (addr == broadcaster) return 2;
        if (addr == recovery) return 3;
        // For other addresses, try to find matching private key
        for (uint256 i = 1; i <= 100; i++) {
            if (vm.addr(i) == addr) {
                return i;
            }
        }
        // If no match found, revert with helpful message
        revert("No matching private key found for address");
    }
}
