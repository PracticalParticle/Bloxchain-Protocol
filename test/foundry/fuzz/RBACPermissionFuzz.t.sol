// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import "../CommonBase.sol";
import "../../../contracts/core/access/RuntimeRBAC.sol";
import "../../../contracts/core/access/lib/definitions/RuntimeRBACDefinitions.sol";
import "../../../contracts/utils/SharedValidation.sol";
import "../helpers/TestHelpers.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title RBACPermissionFuzzTest
 * @dev Fuzz tests for RBAC permission boundaries and access control
 */
contract RBACPermissionFuzzTest is CommonBase {
    using TestHelpers for *;

    // Use constants from RuntimeRBACDefinitions to ensure they match
    bytes4 public constant ROLE_CONFIG_BATCH_META_SELECTOR = RuntimeRBACDefinitions.ROLE_CONFIG_BATCH_META_SELECTOR;
    bytes4 public constant ROLE_CONFIG_BATCH_EXECUTE_SELECTOR = RuntimeRBACDefinitions.ROLE_CONFIG_BATCH_EXECUTE_SELECTOR;
    bytes32 public constant ROLE_CONFIG_BATCH_OPERATION_TYPE = RuntimeRBACDefinitions.ROLE_CONFIG_BATCH;

    function setUp() public override {
        super.setUp();
    }

    /**
     * @dev Fuzz test: Unauthorized role cannot execute operations
     */
    function testFuzz_UnauthorizedRoleCannotExecute(
        address unauthorizedUser,
        bytes32 roleHash,
        address wallet
    ) public {
        vm.assume(unauthorizedUser != owner);
        vm.assume(unauthorizedUser != broadcaster);
        vm.assume(unauthorizedUser != recovery);
        vm.assume(unauthorizedUser != address(0));
        vm.assume(wallet != address(0));
        
        // Ensure user doesn't have the role (or create a non-existent role)
        // For this test, we'll use a random roleHash that likely doesn't exist
        
        // Try to add wallet to role
        RuntimeRBAC.RoleConfigAction[] memory actions = new RuntimeRBAC.RoleConfigAction[](1);
        actions[0] = RuntimeRBAC.RoleConfigAction({
            actionType: RuntimeRBAC.RoleConfigActionType.ADD_WALLET,
            data: abi.encode(roleHash, wallet)
        });
        
        // Attempt to execute without proper role - should fail at internal call check
        vm.prank(unauthorizedUser);
        vm.expectRevert(
            abi.encodeWithSelector(
                SharedValidation.OnlyCallableByContract.selector,
                unauthorizedUser,
                address(roleBlox)
            )
        );
        roleBlox.executeRoleConfigBatch(actions);
    }

    /**
     * @dev Fuzz test: Role wallet limits are enforced
     */
    function testFuzz_RoleWalletLimitEnforced(
        string memory roleName,
        uint256 maxWallets,
        address[] memory wallets
    ) public {
        vm.assume(bytes(roleName).length > 0);
        vm.assume(bytes(roleName).length < 32);
        vm.assume(maxWallets > 0);
        vm.assume(maxWallets < 100);
        
        // Skip protected role names to avoid conflicts
        bytes32 roleHash = keccak256(bytes(roleName));
        vm.assume(roleHash != OWNER_ROLE);
        vm.assume(roleHash != BROADCASTER_ROLE);
        vm.assume(roleHash != RECOVERY_ROLE);
        
        // Bound wallet array to maxWallets + 1 to test limit
        uint256 walletCount = bound(wallets.length, maxWallets + 1, maxWallets + 10);
        address[] memory boundedWallets = new address[](walletCount);
        for (uint256 i = 0; i < walletCount; i++) {
            boundedWallets[i] = address(uint160(i + 1000)); // Ensure unique addresses
            vm.assume(boundedWallets[i] != owner);
            vm.assume(boundedWallets[i] != broadcaster);
            vm.assume(boundedWallets[i] != recovery);
        }
        
        // Create role with maxWallets limit
        RuntimeRBAC.RoleConfigAction[] memory createActions = new RuntimeRBAC.RoleConfigAction[](1);
        StateAbstraction.FunctionPermission[] memory permissions = new StateAbstraction.FunctionPermission[](0);
        createActions[0] = RuntimeRBAC.RoleConfigAction({
            actionType: RuntimeRBAC.RoleConfigActionType.CREATE_ROLE,
            data: abi.encode(roleName, maxWallets, permissions)
        });
        
        bytes memory createParams = roleBlox.roleConfigBatchExecutionParams(createActions);
        StateAbstraction.MetaTransaction memory createMetaTx = _createMetaTxForRoleConfig(
            owner,
            createParams,
            block.timestamp + 1 hours
        );
        
        vm.prank(broadcaster);
        roleBlox.roleConfigBatchRequestAndApprove(createMetaTx);
        
        // Add wallets up to the limit
        for (uint256 i = 0; i < maxWallets; i++) {
            RuntimeRBAC.RoleConfigAction[] memory addActions = new RuntimeRBAC.RoleConfigAction[](1);
            addActions[0] = RuntimeRBAC.RoleConfigAction({
                actionType: RuntimeRBAC.RoleConfigActionType.ADD_WALLET,
                data: abi.encode(roleHash, boundedWallets[i])
            });
            
            bytes memory addParams = roleBlox.roleConfigBatchExecutionParams(addActions);
            StateAbstraction.MetaTransaction memory addMetaTx = _createMetaTxForRoleConfig(
                owner,
                addParams,
                block.timestamp + 1 hours
            );
            
            vm.prank(broadcaster);
            roleBlox.roleConfigBatchRequestAndApprove(addMetaTx);
        }
        
        // Try to add one more - should fail
        RuntimeRBAC.RoleConfigAction[] memory overflowActions = new RuntimeRBAC.RoleConfigAction[](1);
        overflowActions[0] = RuntimeRBAC.RoleConfigAction({
            actionType: RuntimeRBAC.RoleConfigActionType.ADD_WALLET,
            data: abi.encode(roleHash, boundedWallets[maxWallets])
        });
        
        bytes memory overflowParams = roleBlox.roleConfigBatchExecutionParams(overflowActions);
        StateAbstraction.MetaTransaction memory overflowMetaTx = _createMetaTxForRoleConfig(
            owner,
            overflowParams,
            block.timestamp + 1 hours
        );
        
        vm.prank(broadcaster);
        StateAbstraction.TxRecord memory txRecord = roleBlox.roleConfigBatchRequestAndApprove(overflowMetaTx);
        
        // Transaction should fail with RoleWalletLimitReached error
        assertEq(uint8(txRecord.status), uint8(StateAbstraction.TxStatus.FAILED), "Transaction should fail");
        
        bytes memory expectedError = abi.encodeWithSelector(
            SharedValidation.RoleWalletLimitReached.selector,
            maxWallets,
            maxWallets
        );
        assertEq(txRecord.result, expectedError, "Should fail with RoleWalletLimitReached");
    }

    /**
     * @dev Fuzz test: Cannot add duplicate wallets to role
     */
    function testFuzz_CannotAddDuplicateWallet(
        string memory roleName,
        address wallet
    ) public {
        vm.assume(bytes(roleName).length > 0);
        vm.assume(bytes(roleName).length < 32);
        vm.assume(wallet != address(0));
        vm.assume(wallet != owner);
        vm.assume(wallet != broadcaster);
        vm.assume(wallet != recovery);
        
        // Skip protected role names to avoid conflicts
        bytes32 roleHash = keccak256(bytes(roleName));
        vm.assume(roleHash != OWNER_ROLE);
        vm.assume(roleHash != BROADCASTER_ROLE);
        vm.assume(roleHash != RECOVERY_ROLE);
        
        // Create role
        RuntimeRBAC.RoleConfigAction[] memory createActions = new RuntimeRBAC.RoleConfigAction[](1);
        StateAbstraction.FunctionPermission[] memory permissions = new StateAbstraction.FunctionPermission[](0);
        createActions[0] = RuntimeRBAC.RoleConfigAction({
            actionType: RuntimeRBAC.RoleConfigActionType.CREATE_ROLE,
            data: abi.encode(roleName, 10, permissions)
        });
        
        bytes memory createParams = roleBlox.roleConfigBatchExecutionParams(createActions);
        StateAbstraction.MetaTransaction memory createMetaTx = _createMetaTxForRoleConfig(
            owner,
            createParams,
            block.timestamp + 1 hours
        );
        
        vm.prank(broadcaster);
        roleBlox.roleConfigBatchRequestAndApprove(createMetaTx);
        
        // Add wallet first time
        RuntimeRBAC.RoleConfigAction[] memory addActions1 = new RuntimeRBAC.RoleConfigAction[](1);
        addActions1[0] = RuntimeRBAC.RoleConfigAction({
            actionType: RuntimeRBAC.RoleConfigActionType.ADD_WALLET,
            data: abi.encode(roleHash, wallet)
        });
        
        bytes memory addParams1 = roleBlox.roleConfigBatchExecutionParams(addActions1);
        StateAbstraction.MetaTransaction memory addMetaTx1 = _createMetaTxForRoleConfig(
            owner,
            addParams1,
            block.timestamp + 1 hours
        );
        
        vm.prank(broadcaster);
        roleBlox.roleConfigBatchRequestAndApprove(addMetaTx1);
        
        // Try to add same wallet again - should fail
        RuntimeRBAC.RoleConfigAction[] memory addActions2 = new RuntimeRBAC.RoleConfigAction[](1);
        addActions2[0] = RuntimeRBAC.RoleConfigAction({
            actionType: RuntimeRBAC.RoleConfigActionType.ADD_WALLET,
            data: abi.encode(roleHash, wallet)
        });
        
        bytes memory addParams2 = roleBlox.roleConfigBatchExecutionParams(addActions2);
        StateAbstraction.MetaTransaction memory addMetaTx2 = _createMetaTxForRoleConfig(
            owner,
            addParams2,
            block.timestamp + 1 hours
        );
        
        vm.prank(broadcaster);
        StateAbstraction.TxRecord memory txRecord = roleBlox.roleConfigBatchRequestAndApprove(addMetaTx2);
        
        // Transaction should fail with ItemAlreadyExists error
        assertEq(uint8(txRecord.status), uint8(StateAbstraction.TxStatus.FAILED), "Transaction should fail");
        
        bytes memory expectedError = abi.encodeWithSelector(
            SharedValidation.ItemAlreadyExists.selector,
            wallet
        );
        assertEq(txRecord.result, expectedError, "Should fail with ItemAlreadyExists");
    }

    /**
     * @dev Helper to create meta-transaction for role config batch
     */
    function _createMetaTxForRoleConfig(
        address signer,
        bytes memory executionParams,
        uint256 deadline
    ) internal returns (StateAbstraction.MetaTransaction memory) {
        // Create meta-transaction parameters
        StateAbstraction.MetaTxParams memory metaTxParams = roleBlox.createMetaTxParams(
            address(roleBlox),
            ROLE_CONFIG_BATCH_META_SELECTOR,
            StateAbstraction.TxAction.SIGN_META_REQUEST_AND_APPROVE,
            deadline,
            0, // maxGasPrice
            signer
        );

        // Generate unsigned meta-transaction
        StateAbstraction.MetaTransaction memory metaTx = roleBlox.generateUnsignedMetaTransactionForNew(
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
