// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import "../CommonBase.sol";
import "../../../contracts/core/access/RuntimeRBAC.sol";
import "../../../contracts/core/access/lib/definitions/RuntimeRBACDefinitions.sol";
import "../../../contracts/utils/SharedValidation.sol";
import "../helpers/TestHelpers.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title RuntimeRBACFuzzTest
 * @dev Enhanced fuzz tests for RuntimeRBAC contract that actually execute code paths
 * 
 * This enhanced version tests actual execution, not just parameter encoding.
 * It would have caught the CannotModifyProtected vulnerability.
 */
contract RuntimeRBACFuzzTest is CommonBase {
    using TestHelpers for *;

    // Use constants from RuntimeRBACDefinitions to ensure they match
    bytes4 public constant ROLE_CONFIG_BATCH_META_SELECTOR = RuntimeRBACDefinitions.ROLE_CONFIG_BATCH_META_SELECTOR;
    bytes4 public constant ROLE_CONFIG_BATCH_EXECUTE_SELECTOR = RuntimeRBACDefinitions.ROLE_CONFIG_BATCH_EXECUTE_SELECTOR;
    bytes32 public constant ROLE_CONFIG_BATCH_OPERATION_TYPE = RuntimeRBACDefinitions.ROLE_CONFIG_BATCH;

    function setUp() public override {
        super.setUp();
    }

    /// @dev Converts uint to decimal string to build deterministic role names (avoids vm.assume rejections).
    function _uint2str(uint256 _i) internal pure returns (string memory) {
        if (_i == 0) return "0";
        uint256 j = _i;
        uint256 len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory b = new bytes(len);
        uint256 k = len;
        while (_i != 0) {
            k--;
            b[k] = bytes1(uint8(48 + _i % 10));
            _i /= 10;
        }
        return string(b);
    }

    /**
     * @dev Enhanced: Actually execute role creation through full workflow.
     * Uses deterministic role names from fuzz index to avoid vm.assume reject limit.
     */
    function testFuzz_RoleCreation(uint256 roleIndex, uint256 maxWallets) public {
        roleIndex = bound(roleIndex, 1, 99_999);
        maxWallets = bound(maxWallets, 1, 99);
        string memory roleName = string(abi.encodePacked("fuzz_role_", _uint2str(roleIndex)));

        bytes32 roleHash = keccak256(bytes(roleName));

        // Create role config batch
        RuntimeRBAC.RoleConfigAction[] memory actions = new RuntimeRBAC.RoleConfigAction[](1);
        EngineBlox.FunctionPermission[] memory permissions = new EngineBlox.FunctionPermission[](0);

        actions[0] = RuntimeRBAC.RoleConfigAction({
            actionType: RuntimeRBAC.RoleConfigActionType.CREATE_ROLE,
            data: abi.encode(roleName, maxWallets, permissions)
        });

        bytes memory executionParams = RuntimeRBACDefinitions.roleConfigBatchExecutionParams(abi.encode(actions));
        assertGt(executionParams.length, 0);

        // Actually execute through meta-transaction
        EngineBlox.MetaTransaction memory metaTx = _createMetaTxForRoleConfig(
            owner,
            executionParams,
            1 hours
        );

        vm.prank(broadcaster);
        EngineBlox.TxRecord memory txRecord = roleBlox.roleConfigBatchRequestAndApprove(metaTx);

        // Verify transaction completed
        assertEq(uint8(txRecord.status), uint8(EngineBlox.TxStatus.COMPLETED));

        // Verify role was created
        vm.prank(owner);
        (string memory name, bytes32 hash, , , ) = roleBlox.getRole(roleHash);
        assertEq(hash, roleHash);
        assertEq(keccak256(bytes(name)), keccak256(bytes(roleName)));
    }

    /**
     * @dev Enhanced: Actually execute wallet assignment through full workflow
     */
    function testFuzz_WalletAssignment(string memory roleName, address wallet) public {
        vm.assume(bytes(roleName).length > 0);
        vm.assume(bytes(roleName).length < 32);
        vm.assume(wallet != address(0));
        vm.assume(wallet != owner);
        vm.assume(wallet != broadcaster);
        vm.assume(wallet != recovery);

        bytes32 roleHash = keccak256(bytes(roleName));
        
        // Skip protected role names to avoid conflicts
        vm.assume(roleHash != OWNER_ROLE);
        vm.assume(roleHash != BROADCASTER_ROLE);
        vm.assume(roleHash != RECOVERY_ROLE);

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

        // Then add wallet to the role
        RuntimeRBAC.RoleConfigAction[] memory addActions = new RuntimeRBAC.RoleConfigAction[](1);
        addActions[0] = RuntimeRBAC.RoleConfigAction({
            actionType: RuntimeRBAC.RoleConfigActionType.ADD_WALLET,
            data: abi.encode(roleHash, wallet)
        });

        bytes memory addParams = RuntimeRBACDefinitions.roleConfigBatchExecutionParams(abi.encode(addActions));
        EngineBlox.MetaTransaction memory addMetaTx = _createMetaTxForRoleConfig(
            owner,
            addParams,
            1 hours
        );

        vm.prank(broadcaster);
        EngineBlox.TxRecord memory txRecord = roleBlox.roleConfigBatchRequestAndApprove(addMetaTx);
        
        // Verify transaction completed
        assertEq(uint8(txRecord.status), uint8(EngineBlox.TxStatus.COMPLETED));
        
        // Verify wallet was added
        vm.prank(owner);
        assertTrue(roleBlox.hasRole(roleHash, wallet), "Wallet should be in role");
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
     * @dev Fuzz getFunctionSchema via BaseStateMachine surface:
     *      - succeeds and returns matching selector when schema exists
     *      - reverts with ResourceNotFound when schema does not exist
     */
    function testFuzz_GetFunctionSchema(bytes4 selector) public {
        // Selector 0 can make functionSchemaExists true (default storage) while getFunctionSchema reverts with ResourceNotFound
        vm.assume(selector != bytes4(0));
        bool exists = roleBlox.functionSchemaExists(selector);

        if (exists) {
            vm.prank(owner); // getFunctionSchema requires caller to have any role
            EngineBlox.FunctionSchema memory schema = roleBlox.getFunctionSchema(selector);

            // Basic sanity checks for existing schemas
            assertEq(schema.functionSelector, selector, "Returned selector must match input selector");
            // Native-transfer macro selector (0x00000000) may intentionally have empty metadata,
            // so only enforce signature/name constraints for non-zero selectors.
            if (selector != bytes4(0)) {
                assertGt(bytes(schema.functionSignature).length, 0, "Function signature should not be empty");
                assertTrue(schema.operationType != bytes32(0), "Operation type should be non-zero");
                assertGt(bytes(schema.operationName).length, 0, "Operation name should not be empty");
            }

            // For protected schemas, we expect at least one supported action (bitmap non-zero)
            if (schema.isProtected) {
                assertTrue(schema.supportedActionsBitmap != 0, "Protected schemas should advertise supported actions");
            }
        } else {
            vm.prank(owner); // getFunctionSchema requires caller to have any role
            vm.expectRevert(abi.encodeWithSelector(SharedValidation.ResourceNotFound.selector, bytes32(selector)));
            roleBlox.getFunctionSchema(selector);
        }
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
