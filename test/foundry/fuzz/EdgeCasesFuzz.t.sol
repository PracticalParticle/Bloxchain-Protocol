// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import "../CommonBase.sol";
import "../../../contracts/core/access/RuntimeRBAC.sol";
import "../../../contracts/core/access/lib/definitions/RuntimeRBACDefinitions.sol";
import "../../../contracts/core/lib/utils/SharedValidation.sol";
import "../helpers/TestHelpers.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title EdgeCasesFuzzTest
 * @dev Fuzz tests for edge cases and unusual scenarios
 * 
 * Tests batch operations, concurrent transactions, and boundary conditions
 */
contract EdgeCasesFuzzTest is CommonBase {
    using TestHelpers for *;

    // Use constants from RuntimeRBACDefinitions to ensure they match
    bytes4 public constant ROLE_CONFIG_BATCH_META_SELECTOR = RuntimeRBACDefinitions.ROLE_CONFIG_BATCH_META_SELECTOR;
    bytes4 public constant ROLE_CONFIG_BATCH_EXECUTE_SELECTOR = RuntimeRBACDefinitions.ROLE_CONFIG_BATCH_EXECUTE_SELECTOR;
    bytes32 public constant ROLE_CONFIG_BATCH_OPERATION_TYPE = RuntimeRBACDefinitions.ROLE_CONFIG_BATCH;

    function setUp() public override {
        super.setUp();
    }

    /**
     * @dev Fuzz test: Batch operations with mixed valid/invalid actions
     */
    function testFuzz_MixedBatchOperations(
        uint8 actionCount
    ) public {
        uint256 count = bound(actionCount, 2, 20);
        IRuntimeRBAC.RoleConfigAction[] memory actions = new IRuntimeRBAC.RoleConfigAction[](count);
        
        // Mix valid and invalid actions
        for (uint256 i = 0; i < count; i++) {
            if (i % 2 == 0) {
                // Valid: Create role
                string memory roleName = string(abi.encodePacked("ROLE_", i));
                EngineBlox.FunctionPermission[] memory permissions = new EngineBlox.FunctionPermission[](0);
                actions[i] = IRuntimeRBAC.RoleConfigAction({
                    actionType: IRuntimeRBAC.RoleConfigActionType.CREATE_ROLE,
                    data: abi.encode(roleName, 10, permissions)
                });
            } else {
                // Invalid: Try to modify protected role
                actions[i] = IRuntimeRBAC.RoleConfigAction({
                    actionType: IRuntimeRBAC.RoleConfigActionType.ADD_WALLET,
                    data: abi.encode(OWNER_ROLE, address(/* forge-lint: disable-next-line(unsafe-typecast) */ uint160(i)))
                });
            }
        }
        
        // Execute batch - should revert on first invalid action
        bytes memory executionParams = RuntimeRBACDefinitions.roleConfigBatchExecutionParams(abi.encode(actions));
        EngineBlox.MetaTransaction memory metaTx = _createMetaTxForRoleConfig(
            owner,
            executionParams,
            1 hours
        );
        
        vm.prank(broadcaster);
        uint256 _txId = accountBlox.roleConfigBatchRequestAndApprove(metaTx);
        vm.prank(broadcaster);
        EngineBlox.TxRecord memory txRecord = accountBlox.getTransaction(_txId);
        
        // Transaction should fail due to protected role modification
        assertEq(uint8(txRecord.status), uint8(EngineBlox.TxStatus.FAILED), "Transaction should fail");
        
        // Verify the error is CannotModifyProtected (for OWNER_ROLE which is in the batch)
        bytes memory expectedError = abi.encodeWithSelector(
            SharedValidation.CannotModifyProtected.selector,
            OWNER_ROLE
        );
        assertEq(txRecord.result, expectedError, "Should fail with CannotModifyProtected");
    }

    /**
     * @dev Fuzz test: Empty batch operations
     */
    function testFuzz_EmptyBatchOperations() public {
        IRuntimeRBAC.RoleConfigAction[] memory actions = new IRuntimeRBAC.RoleConfigAction[](0);
        
        bytes memory executionParams = RuntimeRBACDefinitions.roleConfigBatchExecutionParams(abi.encode(actions));
        EngineBlox.MetaTransaction memory metaTx = _createMetaTxForRoleConfig(
            owner,
            executionParams,
            1 hours
        );
        
        // Empty batch should still execute (no-op)
        vm.prank(broadcaster);
        uint256 _txId = accountBlox.roleConfigBatchRequestAndApprove(metaTx);
        vm.prank(broadcaster);
        EngineBlox.TxRecord memory txRecord = accountBlox.getTransaction(_txId);
        assertEq(uint8(txRecord.status), uint8(EngineBlox.TxStatus.COMPLETED));
    }

    /**
     * @dev Fuzz test: Large batch operations
     */
    function testFuzz_LargeBatchOperations(
        uint8 batchSize
    ) public {
        uint256 size = bound(batchSize, 1, 50);
        IRuntimeRBAC.RoleConfigAction[] memory actions = new IRuntimeRBAC.RoleConfigAction[](size);
        
        // Create multiple roles in one batch
        for (uint256 i = 0; i < size; i++) {
            string memory roleName = string(abi.encodePacked("ROLE_", i));
            EngineBlox.FunctionPermission[] memory permissions = new EngineBlox.FunctionPermission[](0);
            actions[i] = IRuntimeRBAC.RoleConfigAction({
                actionType: IRuntimeRBAC.RoleConfigActionType.CREATE_ROLE,
                data: abi.encode(roleName, 10, permissions)
            });
        }
        
        bytes memory executionParams = RuntimeRBACDefinitions.roleConfigBatchExecutionParams(abi.encode(actions));
        EngineBlox.MetaTransaction memory metaTx = _createMetaTxForRoleConfig(
            owner,
            executionParams,
            1 hours
        );
        
        vm.prank(broadcaster);
        uint256 _txId = accountBlox.roleConfigBatchRequestAndApprove(metaTx);
        vm.prank(broadcaster);
        EngineBlox.TxRecord memory txRecord = accountBlox.getTransaction(_txId);
        assertEq(uint8(txRecord.status), uint8(EngineBlox.TxStatus.COMPLETED));
        
        // Verify all roles were created
        for (uint256 i = 0; i < size; i++) {
            bytes32 roleHash = keccak256(abi.encodePacked("ROLE_", i));
            vm.prank(owner);
            (string memory name, bytes32 hash, , , ) = accountBlox.getRole(roleHash);
            assertEq(hash, roleHash, "Role should be created");
        }
    }

    /**
     * @dev Fuzz test: Role name edge cases
     */
    function testFuzz_RoleNameEdgeCases(
        string memory roleName
    ) public {
        vm.assume(bytes(roleName).length > 0);
        vm.assume(bytes(roleName).length < 100); // Reasonable upper bound
        
        // Skip protected role names to avoid conflicts
        bytes32 roleHash = keccak256(bytes(roleName));
        vm.assume(roleHash != OWNER_ROLE);
        vm.assume(roleHash != BROADCASTER_ROLE);
        vm.assume(roleHash != RECOVERY_ROLE);
        
        IRuntimeRBAC.RoleConfigAction[] memory actions = new IRuntimeRBAC.RoleConfigAction[](1);
        EngineBlox.FunctionPermission[] memory permissions = new EngineBlox.FunctionPermission[](0);
        actions[0] = IRuntimeRBAC.RoleConfigAction({
            actionType: IRuntimeRBAC.RoleConfigActionType.CREATE_ROLE,
            data: abi.encode(roleName, 10, permissions)
        });
        
        bytes memory executionParams = RuntimeRBACDefinitions.roleConfigBatchExecutionParams(abi.encode(actions));
        EngineBlox.MetaTransaction memory metaTx = _createMetaTxForRoleConfig(
            owner,
            executionParams,
            1 hours
        );
        
        vm.prank(broadcaster);
        uint256 _txId = accountBlox.roleConfigBatchRequestAndApprove(metaTx);
        vm.prank(broadcaster);
        EngineBlox.TxRecord memory txRecord = accountBlox.getTransaction(_txId);
        assertEq(uint8(txRecord.status), uint8(EngineBlox.TxStatus.COMPLETED));
        
        // Verify role was created with correct name
        vm.prank(owner);
        (string memory name, bytes32 hash, , , ) = accountBlox.getRole(roleHash);
        assertEq(keccak256(bytes(name)), keccak256(bytes(roleName)), "Role name should match");
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
        EngineBlox.MetaTxParams memory metaTxParams = accountBlox.createMetaTxParams(
            address(accountBlox),
            ROLE_CONFIG_BATCH_META_SELECTOR,
            EngineBlox.TxAction.SIGN_META_REQUEST_AND_APPROVE,
            deadline,
            0, // maxGasPrice
            signer
        );

        // Generate unsigned meta-transaction
        EngineBlox.MetaTransaction memory metaTx = accountBlox.generateUnsignedMetaTransactionForNew(
            signer,
            address(accountBlox),
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
