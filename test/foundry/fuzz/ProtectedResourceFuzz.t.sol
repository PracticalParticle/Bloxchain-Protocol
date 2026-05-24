// SPDX-License-Identifier: MPL-2.0
pragma solidity 0.8.35;

import "../CommonBase.sol";
import "../../../contracts/core/access/RuntimeRBAC.sol";
import "../../../contracts/core/access/lib/definitions/RuntimeRBACDefinitions.sol";
import "../../../contracts/core/execution/lib/definitions/GuardControllerDefinitions.sol";
import "../../../contracts/core/lib/utils/SharedValidation.sol";
import "../helpers/TestHelpers.sol";

/**
 * @title ProtectedResourceFuzzTest
 * @dev Comprehensive fuzz tests for protected resource boundaries
 * 
 * These tests specifically target the security boundaries that were missed
 * in the original fuzz tests, particularly `GrantNotRevocable` on grant removal and
 * `CannotModifyProtected` on protected role / wallet boundaries.
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
            IRuntimeRBAC.RoleConfigAction[] memory actions = new IRuntimeRBAC.RoleConfigAction[](1);
            actions[0] = IRuntimeRBAC.RoleConfigAction({
                actionType: IRuntimeRBAC.RoleConfigActionType.ADD_WALLET,
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
            uint256 _txId = accountBlox.roleConfigBatchRequestAndApprove(metaTx);
            vm.prank(broadcaster);
            EngineBlox.TxRecord memory txRecord = accountBlox.getTransaction(_txId);
            
            // Transaction should be marked as FAILED with CannotModifyProtected error
            assertEq(uint8(txRecord.status), uint8(EngineBlox.TxStatus.FAILED), "Transaction should fail");
            
            // Verify the error is CannotModifyProtected
            bytes memory expectedError = abi.encodeWithSelector(
                SharedValidation.CannotModifyProtected.selector,
                protectedRoles[i]
            );
            assertEq(txRecord.resultHash, TestHelpers.executionResultHash(expectedError), "Should fail with CannotModifyProtected");
        }
    }

    /**
     * @dev Fuzz test: Cannot revoke wallet from protected roles via RuntimeRBAC
     */
    function testFuzz_CannotRevokeWalletFromProtectedRole() public {
        // Test revoking owner from OWNER_ROLE
        IRuntimeRBAC.RoleConfigAction[] memory actions = new IRuntimeRBAC.RoleConfigAction[](1);
        actions[0] = IRuntimeRBAC.RoleConfigAction({
            actionType: IRuntimeRBAC.RoleConfigActionType.REVOKE_WALLET,
            data: abi.encode(OWNER_ROLE, owner)
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
        
        // Transaction should be marked as FAILED with CannotModifyProtected error
        assertEq(uint8(txRecord.status), uint8(EngineBlox.TxStatus.FAILED), "Transaction should fail");
        
        // Verify the error is CannotModifyProtected
        bytes memory expectedError = abi.encodeWithSelector(
            SharedValidation.CannotModifyProtected.selector,
            OWNER_ROLE
        );
        assertEq(txRecord.resultHash, TestHelpers.executionResultHash(expectedError), "Should revert with CannotModifyProtected");
    }

    /**
     * @dev Fuzz test: Cannot remove protected roles
     */
    function testFuzz_CannotRemoveProtectedRole() public {
        bytes32[3] memory protectedRoles = [OWNER_ROLE, BROADCASTER_ROLE, RECOVERY_ROLE];

        for (uint256 i = 0; i < protectedRoles.length; i++) {
            IRuntimeRBAC.RoleConfigAction[] memory actions = new IRuntimeRBAC.RoleConfigAction[](1);
            actions[0] = IRuntimeRBAC.RoleConfigAction({
                actionType: IRuntimeRBAC.RoleConfigActionType.REMOVE_ROLE,
                data: abi.encode(protectedRoles[i])
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
            
            // Transaction should be marked as FAILED with CannotModifyProtected error
            assertEq(uint8(txRecord.status), uint8(EngineBlox.TxStatus.FAILED), "Transaction should fail");
            
            // Verify the error is CannotModifyProtected
            bytes memory expectedError = abi.encodeWithSelector(
                SharedValidation.CannotModifyProtected.selector,
                protectedRoles[i]
            );
            assertEq(txRecord.resultHash, TestHelpers.executionResultHash(expectedError), "Should fail with CannotModifyProtected");
        }
    }

    /**
     * @dev Revoking a grant for a **revocable** protected policy schema (`isGrantRevocable: true`, e.g. NATIVE_TRANSFER)
     *      from a non-protected custom role succeeds. Core GuardController execution selectors use `isGrantRevocable: false`
     *      and cannot be removed via `REMOVE_FUNCTION_FROM_ROLE` from any role.
     *      The granted bitmap must not mix meta-sign and meta-execute actions (`_validateMetaTxPermissions`).
     */
    function test_RemoveProtectedSchemaFromNonProtectedRole_succeeds() public {
        string memory roleName = "CUSTOM_REMOVE_PROT_SCHEMA";
        bytes32 roleHash = keccak256(bytes(roleName));

        EngineBlox.FunctionPermission[] memory emptyPerms = new EngineBlox.FunctionPermission[](0);
        IRuntimeRBAC.RoleConfigAction[] memory createActions = new IRuntimeRBAC.RoleConfigAction[](1);
        createActions[0] = IRuntimeRBAC.RoleConfigAction({
            actionType: IRuntimeRBAC.RoleConfigActionType.CREATE_ROLE,
            data: abi.encode(roleName, uint256(10), emptyPerms)
        });
        bytes memory createParams = RuntimeRBACDefinitions.roleConfigBatchExecutionParams(abi.encode(createActions));
        EngineBlox.MetaTransaction memory createMetaTx = _createMetaTxForRoleConfig(owner, createParams, 1 hours);
        vm.prank(broadcaster);
        uint256 createTxId = accountBlox.roleConfigBatchRequestAndApprove(createMetaTx);
        vm.prank(broadcaster);
        assertEq(
            uint8(accountBlox.getTransaction(createTxId).status),
            uint8(EngineBlox.TxStatus.COMPLETED),
            "create role"
        );

        IRuntimeRBAC.RoleConfigAction[] memory addWalletActions = new IRuntimeRBAC.RoleConfigAction[](1);
        addWalletActions[0] = IRuntimeRBAC.RoleConfigAction({
            actionType: IRuntimeRBAC.RoleConfigActionType.ADD_WALLET,
            data: abi.encode(roleHash, owner)
        });
        bytes memory addWalletParams = RuntimeRBACDefinitions.roleConfigBatchExecutionParams(abi.encode(addWalletActions));
        EngineBlox.MetaTransaction memory addWalletMetaTx = _createMetaTxForRoleConfig(owner, addWalletParams, 1 hours);
        vm.prank(broadcaster);
        uint256 addWalletTxId = accountBlox.roleConfigBatchRequestAndApprove(addWalletMetaTx);
        vm.prank(broadcaster);
        assertEq(uint8(accountBlox.getTransaction(addWalletTxId).status), uint8(EngineBlox.TxStatus.COMPLETED), "add wallet");

        EngineBlox.TxAction[] memory grantActs = new EngineBlox.TxAction[](1);
        grantActs[0] = EngineBlox.TxAction.EXECUTE_TIME_DELAY_REQUEST;
        uint16 grantBitmap = EngineBlox.createBitmapFromActions(grantActs);
        bytes4[] memory handlers = new bytes4[](1);
        handlers[0] = EngineBlox.NATIVE_TRANSFER_SELECTOR;
        EngineBlox.FunctionPermission memory fp = EngineBlox.FunctionPermission({
            functionSelector: EngineBlox.NATIVE_TRANSFER_SELECTOR,
            grantedActionsBitmap: grantBitmap,
            handlerForSelectors: handlers
        });
        IRuntimeRBAC.RoleConfigAction[] memory addFnActions = new IRuntimeRBAC.RoleConfigAction[](1);
        addFnActions[0] = IRuntimeRBAC.RoleConfigAction({
            actionType: IRuntimeRBAC.RoleConfigActionType.ADD_FUNCTION_TO_ROLE,
            data: abi.encode(roleHash, fp)
        });
        bytes memory addFnParams = RuntimeRBACDefinitions.roleConfigBatchExecutionParams(abi.encode(addFnActions));
        EngineBlox.MetaTransaction memory addFnMetaTx = _createMetaTxForRoleConfig(owner, addFnParams, 1 hours);
        vm.prank(broadcaster);
        uint256 addFnTxId = accountBlox.roleConfigBatchRequestAndApprove(addFnMetaTx);
        vm.prank(broadcaster);
        assertEq(uint8(accountBlox.getTransaction(addFnTxId).status), uint8(EngineBlox.TxStatus.COMPLETED), "add native transfer fn");

        IRuntimeRBAC.RoleConfigAction[] memory removeActions = new IRuntimeRBAC.RoleConfigAction[](1);
        removeActions[0] = IRuntimeRBAC.RoleConfigAction({
            actionType: IRuntimeRBAC.RoleConfigActionType.REMOVE_FUNCTION_FROM_ROLE,
            data: abi.encode(roleHash, EngineBlox.NATIVE_TRANSFER_SELECTOR)
        });
        bytes memory removeParams = RuntimeRBACDefinitions.roleConfigBatchExecutionParams(abi.encode(removeActions));
        EngineBlox.MetaTransaction memory removeMetaTx = _createMetaTxForRoleConfig(owner, removeParams, 1 hours);
        vm.prank(broadcaster);
        uint256 removeTxId = accountBlox.roleConfigBatchRequestAndApprove(removeMetaTx);
        vm.prank(broadcaster);
        assertEq(uint8(accountBlox.getTransaction(removeTxId).status), uint8(EngineBlox.TxStatus.COMPLETED), "remove native transfer fn");
    }

    /**
     * @dev `REMOVE_FUNCTION_FROM_ROLE` for a schema with `isGrantRevocable: false` fails on a custom role (`GrantNotRevocable`).
     */
    function test_RemoveNonRevocableSchemaFromNonProtectedRole_reverts() public {
        string memory roleName = "CUSTOM_REMOVE_NONREV";
        bytes32 roleHash = keccak256(bytes(roleName));

        EngineBlox.FunctionPermission[] memory emptyPerms = new EngineBlox.FunctionPermission[](0);
        IRuntimeRBAC.RoleConfigAction[] memory createActions = new IRuntimeRBAC.RoleConfigAction[](1);
        createActions[0] = IRuntimeRBAC.RoleConfigAction({
            actionType: IRuntimeRBAC.RoleConfigActionType.CREATE_ROLE,
            data: abi.encode(roleName, uint256(10), emptyPerms)
        });
        bytes memory createParams = RuntimeRBACDefinitions.roleConfigBatchExecutionParams(abi.encode(createActions));
        EngineBlox.MetaTransaction memory createMetaTx = _createMetaTxForRoleConfig(owner, createParams, 1 hours);
        vm.prank(broadcaster);
        uint256 createTxId = accountBlox.roleConfigBatchRequestAndApprove(createMetaTx);
        vm.prank(broadcaster);
        assertEq(uint8(accountBlox.getTransaction(createTxId).status), uint8(EngineBlox.TxStatus.COMPLETED), "create role");

        IRuntimeRBAC.RoleConfigAction[] memory addWalletActions = new IRuntimeRBAC.RoleConfigAction[](1);
        addWalletActions[0] = IRuntimeRBAC.RoleConfigAction({
            actionType: IRuntimeRBAC.RoleConfigActionType.ADD_WALLET,
            data: abi.encode(roleHash, owner)
        });
        bytes memory addWalletParams = RuntimeRBACDefinitions.roleConfigBatchExecutionParams(abi.encode(addWalletActions));
        EngineBlox.MetaTransaction memory addWalletMetaTx2 = _createMetaTxForRoleConfig(owner, addWalletParams, 1 hours);
        vm.prank(broadcaster);
        uint256 addWalletTxId = accountBlox.roleConfigBatchRequestAndApprove(addWalletMetaTx2);
        vm.prank(broadcaster);
        assertEq(uint8(accountBlox.getTransaction(addWalletTxId).status), uint8(EngineBlox.TxStatus.COMPLETED), "add wallet");

        EngineBlox.TxAction[] memory tlActs = new EngineBlox.TxAction[](1);
        tlActs[0] = EngineBlox.TxAction.EXECUTE_TIME_DELAY_REQUEST;
        bytes4[] memory handlers = new bytes4[](1);
        handlers[0] = GuardControllerDefinitions.EXECUTE_WITH_TIMELOCK_SELECTOR;
        EngineBlox.FunctionPermission memory fp = EngineBlox.FunctionPermission({
            functionSelector: GuardControllerDefinitions.EXECUTE_WITH_TIMELOCK_SELECTOR,
            grantedActionsBitmap: EngineBlox.createBitmapFromActions(tlActs),
            handlerForSelectors: handlers
        });
        IRuntimeRBAC.RoleConfigAction[] memory addFnActions = new IRuntimeRBAC.RoleConfigAction[](1);
        addFnActions[0] = IRuntimeRBAC.RoleConfigAction({
            actionType: IRuntimeRBAC.RoleConfigActionType.ADD_FUNCTION_TO_ROLE,
            data: abi.encode(roleHash, fp)
        });
        bytes memory addFnParams = RuntimeRBACDefinitions.roleConfigBatchExecutionParams(abi.encode(addFnActions));
        EngineBlox.MetaTransaction memory addFnMetaTx2 = _createMetaTxForRoleConfig(owner, addFnParams, 1 hours);
        vm.prank(broadcaster);
        uint256 addFnTxId = accountBlox.roleConfigBatchRequestAndApprove(addFnMetaTx2);
        vm.prank(broadcaster);
        assertEq(uint8(accountBlox.getTransaction(addFnTxId).status), uint8(EngineBlox.TxStatus.COMPLETED), "add timelock fn");

        IRuntimeRBAC.RoleConfigAction[] memory removeActions = new IRuntimeRBAC.RoleConfigAction[](1);
        removeActions[0] = IRuntimeRBAC.RoleConfigAction({
            actionType: IRuntimeRBAC.RoleConfigActionType.REMOVE_FUNCTION_FROM_ROLE,
            data: abi.encode(roleHash, GuardControllerDefinitions.EXECUTE_WITH_TIMELOCK_SELECTOR)
        });
        bytes memory removeParams = RuntimeRBACDefinitions.roleConfigBatchExecutionParams(abi.encode(removeActions));
        EngineBlox.MetaTransaction memory removeMetaTx2 = _createMetaTxForRoleConfig(owner, removeParams, 1 hours);
        vm.prank(broadcaster);
        uint256 removeTxId = accountBlox.roleConfigBatchRequestAndApprove(removeMetaTx2);
        vm.prank(broadcaster);
        EngineBlox.TxRecord memory txRecord = accountBlox.getTransaction(removeTxId);
        assertEq(uint8(txRecord.status), uint8(EngineBlox.TxStatus.FAILED));
        bytes memory expectedError = abi.encodeWithSelector(
            SharedValidation.GrantNotRevocable.selector,
            GuardControllerDefinitions.EXECUTE_WITH_TIMELOCK_SELECTOR
        );
        assertEq(txRecord.resultHash, TestHelpers.executionResultHash(expectedError));
    }

    /**
     * @dev Removing a grant for a **non-revocable** schema (`isGrantRevocable: false`) fails when targeting OWNER_ROLE (`GrantNotRevocable`).
     */
    function test_RemoveProtectedSchemaFromProtectedRole_reverts() public {
        IRuntimeRBAC.RoleConfigAction[] memory actions = new IRuntimeRBAC.RoleConfigAction[](1);
        actions[0] = IRuntimeRBAC.RoleConfigAction({
            actionType: IRuntimeRBAC.RoleConfigActionType.REMOVE_FUNCTION_FROM_ROLE,
            data: abi.encode(OWNER_ROLE, GuardControllerDefinitions.EXECUTE_WITH_TIMELOCK_SELECTOR)
        });
        bytes memory params = RuntimeRBACDefinitions.roleConfigBatchExecutionParams(abi.encode(actions));
        EngineBlox.MetaTransaction memory metaTx = _createMetaTxForRoleConfig(owner, params, 1 hours);
        vm.prank(broadcaster);
        uint256 txId = accountBlox.roleConfigBatchRequestAndApprove(metaTx);
        vm.prank(broadcaster);
        EngineBlox.TxRecord memory txRecord = accountBlox.getTransaction(txId);
        assertEq(uint8(txRecord.status), uint8(EngineBlox.TxStatus.FAILED));
        bytes memory expectedError = abi.encodeWithSelector(
            SharedValidation.GrantNotRevocable.selector,
            GuardControllerDefinitions.EXECUTE_WITH_TIMELOCK_SELECTOR
        );
        assertEq(txRecord.resultHash, TestHelpers.executionResultHash(expectedError));
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
        address initialOwner = accountBlox.owner();
        address initialRecovery = accountBlox.getRecovery();
        address[] memory initialBroadcasters = accountBlox.getBroadcasters();

        // Create a non-protected role and add wallet to it
        bytes32 newRoleHash = keccak256(bytes(roleName));
        
        // First create the role
        IRuntimeRBAC.RoleConfigAction[] memory createActions = new IRuntimeRBAC.RoleConfigAction[](1);
        EngineBlox.FunctionPermission[] memory permissions = new EngineBlox.FunctionPermission[](0);
        createActions[0] = IRuntimeRBAC.RoleConfigAction({
            actionType: IRuntimeRBAC.RoleConfigActionType.CREATE_ROLE,
            data: abi.encode(roleName, 10, permissions)
        });

        bytes memory createParams = RuntimeRBACDefinitions.roleConfigBatchExecutionParams(abi.encode(createActions));
        EngineBlox.MetaTransaction memory createMetaTx = _createMetaTxForRoleConfig(
            owner,
            createParams,
            1 hours
        );

        vm.prank(broadcaster);
        accountBlox.roleConfigBatchRequestAndApprove(createMetaTx);

        // Then add wallet to the new role
        IRuntimeRBAC.RoleConfigAction[] memory addActions = new IRuntimeRBAC.RoleConfigAction[](1);
        addActions[0] = IRuntimeRBAC.RoleConfigAction({
            actionType: IRuntimeRBAC.RoleConfigActionType.ADD_WALLET,
            data: abi.encode(newRoleHash, wallet)
        });

        bytes memory addParams = RuntimeRBACDefinitions.roleConfigBatchExecutionParams(abi.encode(addActions));
        EngineBlox.MetaTransaction memory addMetaTx = _createMetaTxForRoleConfig(
            owner,
            addParams,
            1 hours
        );

        vm.prank(broadcaster);
        accountBlox.roleConfigBatchRequestAndApprove(addMetaTx);

        // Verify protected roles are unchanged
        assertEq(accountBlox.owner(), initialOwner);
        assertEq(accountBlox.getRecovery(), initialRecovery);
        address[] memory finalBroadcasters = accountBlox.getBroadcasters();
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

        // Sign the meta-transaction (standard EIP-712 digest, no prefix)
        uint256 signerPrivateKey = _getPrivateKeyForAddress(signer);
        bytes32 messageHash = metaTx.message;
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPrivateKey, messageHash);
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
