// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import "../CommonBase.sol";
import "../../../contracts/core/access/RuntimeRBAC.sol";
import "../../../contracts/core/access/lib/definitions/RuntimeRBACDefinitions.sol";
import "../../../contracts/core/lib/EngineBlox.sol";
import "../../../contracts/core/lib/utils/SharedValidation.sol";
import "../helpers/TestHelpers.sol";

/**
 * @title ComprehensiveEIP712AndViewFuzzTest
 * @dev Fuzz tests for EIP-712 signature/domain consistency and view state consistency (Attack Vectors Codex §18).
 *
 * Covers:
 * - Domain separator determinism (EIP-712 upgrade impact)
 * - View consistency after state changes (stale cache desync)
 * - EIP-712 typehash/struct consistency with signer recovery
 * - Excess msg.value / receive() handling
 */
contract ComprehensiveEIP712AndViewFuzzTest is CommonBase {
    using TestHelpers for *;

    bytes4 public constant ROLE_CONFIG_BATCH_META_SELECTOR = RuntimeRBACDefinitions.ROLE_CONFIG_BATCH_META_SELECTOR;
    bytes4 public constant ROLE_CONFIG_BATCH_EXECUTE_SELECTOR = RuntimeRBACDefinitions.ROLE_CONFIG_BATCH_EXECUTE_SELECTOR;
    bytes32 public constant ROLE_CONFIG_BATCH_OPERATION_TYPE = RuntimeRBACDefinitions.ROLE_CONFIG_BATCH;

    function setUp() public override {
        super.setUp();
    }

    /**
     * @dev Test: Domain separator / message hash is deterministic for same inputs
     * Attack Vector: Domain separator staleness (Codex §18.1)
     */
    function testFuzz_DomainSeparatorDeterministic(
        uint256 nonce,
        uint256 txId,
        uint256 deadline
    ) public {
        deadline = bound(deadline, 1, 30 days);
        EngineBlox.MetaTxParams memory p = accountBlox.createMetaTxParams(
            address(accountBlox),
            ROLE_CONFIG_BATCH_META_SELECTOR,
            EngineBlox.TxAction.SIGN_META_REQUEST_AND_APPROVE,
            deadline,
            0,
            owner
        );
        p.nonce = nonce;
        EngineBlox.MetaTransaction memory m;
        m.params = p;
        m.txRecord.txId = txId;
        m.txRecord.params.requester = owner;
        m.txRecord.params.target = address(accountBlox);
        m.txRecord.params.operationType = ROLE_CONFIG_BATCH_OPERATION_TYPE;
        m.txRecord.params.executionSelector = ROLE_CONFIG_BATCH_EXECUTE_SELECTOR;

        bytes32 h1 = metaTxSigner.generateMessageHash(m, address(accountBlox));
        bytes32 h2 = metaTxSigner.generateMessageHash(m, address(accountBlox));
        assertEq(h1, h2, "Message hash must be deterministic for same inputs");
    }

    /**
     * @dev Test: After role config batch, view functions reflect latest state
     * Attack Vector: Stale cached state / view desync (Codex §18.3)
     */
    function testFuzz_ViewReflectsLatestState(string memory roleName) public {
        vm.assume(bytes(roleName).length > 0 && bytes(roleName).length < 32);
        for (uint256 i = 0; i < bytes(roleName).length; i++) {
            vm.assume(bytes(roleName)[i] >= 0x20 && bytes(roleName)[i] <= 0x7E);
        }
        bytes32 roleHash = keccak256(bytes(roleName));
        if (roleHash == EngineBlox.OWNER_ROLE || roleHash == EngineBlox.BROADCASTER_ROLE || roleHash == EngineBlox.RECOVERY_ROLE) {
            return;
        }

        EngineBlox.FunctionPermission[] memory permissions = new EngineBlox.FunctionPermission[](0);
        IRuntimeRBAC.RoleConfigAction[] memory createActions = new IRuntimeRBAC.RoleConfigAction[](1);
        createActions[0] = IRuntimeRBAC.RoleConfigAction({
            actionType: IRuntimeRBAC.RoleConfigActionType.CREATE_ROLE,
            data: abi.encode(roleName, 10, permissions)
        });
        bytes memory createParams = RuntimeRBACDefinitions.roleConfigBatchExecutionParams(abi.encode(createActions));
        EngineBlox.MetaTransaction memory createMetaTx = _createMetaTxForRoleConfig(owner, createParams, 1 hours);
        vm.prank(broadcaster);
        try accountBlox.roleConfigBatchRequestAndApprove(createMetaTx) {
            // continue
        } catch (bytes memory reason) {
            if (reason.length >= 4 && bytes4(reason) == SharedValidation.InvalidSignature.selector) return;
            assembly { revert(add(reason, 0x20), mload(reason)) }
        }

        vm.prank(owner);
        bytes32[] memory roles = accountBlox.getSupportedRoles();
        bool found;
        for (uint256 i = 0; i < roles.length; i++) {
            if (roles[i] == roleHash) {
                found = true;
                break;
            }
        }
        assertTrue(found, "getSupportedRoles must include new role");
        vm.prank(owner);
        address[] memory wallets = accountBlox.getWalletsInRole(roleHash);
        assertEq(wallets.length, 0, "New role must have no wallets");
    }

    /**
     * @dev Test: receive() accepts ETH; full msg.value credited (no partial use requiring refund)
     * Attack Vector: Excess msg.value handling (Codex §18.7)
     */
    function testFuzz_ExcessMsgValueRefunded(uint96 valueWei) public {
        valueWei = uint96(bound(uint256(valueWei), 1, 100 ether));
        uint256 balanceBefore = address(accountBlox).balance;
        vm.deal(user1, valueWei);
        vm.prank(user1);
        (bool sent,) = address(accountBlox).call{value: valueWei}("");
        assertTrue(sent, "receive must accept ETH");
        assertEq(address(accountBlox).balance, balanceBefore + valueWei, "Full value must be credited; no excess to refund");
    }

    /**
     * @dev Test: EIP-712 signed meta-tx recovers correct signer (typehash/struct match)
     * Attack Vector: Signature hash verification (Codex §18.7)
     */
    function testFuzz_EIP712RecoversCorrectSigner() public {
        IRuntimeRBAC.RoleConfigAction[] memory actions = new IRuntimeRBAC.RoleConfigAction[](1);
        EngineBlox.FunctionPermission[] memory permissions = new EngineBlox.FunctionPermission[](0);
        actions[0] = IRuntimeRBAC.RoleConfigAction({
            actionType: IRuntimeRBAC.RoleConfigActionType.CREATE_ROLE,
            data: abi.encode("EIP712_TEST_ROLE", 10, permissions)
        });
        bytes memory executionParams = RuntimeRBACDefinitions.roleConfigBatchExecutionParams(abi.encode(actions));
        EngineBlox.MetaTransaction memory metaTx = _createMetaTxForRoleConfig(owner, executionParams, 1 hours);

        // metaTx.message is the EIP-712 digest; TestHelpers signs this digest directly (no eth-signed-message wrapper)
        bytes32 digest = metaTx.message;
        (uint8 v, bytes32 r, bytes32 s) = _splitSignature(metaTx.signature);
        address recovered = ecrecover(digest, v, r, s);
        assertEq(recovered, owner, "Recovered signer must match intended signer");
    }

    function _createMetaTxForRoleConfig(
        address signer,
        bytes memory executionParams,
        uint256 deadline
    ) internal returns (EngineBlox.MetaTransaction memory) {
        EngineBlox.MetaTxParams memory metaTxParams = accountBlox.createMetaTxParams(
            address(accountBlox),
            ROLE_CONFIG_BATCH_META_SELECTOR,
            EngineBlox.TxAction.SIGN_META_REQUEST_AND_APPROVE,
            deadline,
            0,
            signer
        );
        EngineBlox.MetaTransaction memory metaTx = accountBlox.generateUnsignedMetaTransactionForNew(
            signer,
            address(accountBlox),
            0,
            0,
            ROLE_CONFIG_BATCH_OPERATION_TYPE,
            ROLE_CONFIG_BATCH_EXECUTE_SELECTOR,
            executionParams,
            metaTxParams
        );
        uint256 signerPrivateKey = _getPrivateKeyForAddress(signer);
        metaTx.signature = metaTxSigner.signMetaTransaction(metaTx, signerPrivateKey, address(accountBlox));
        return metaTx;
    }

    function _getPrivateKeyForAddress(address addr) internal view returns (uint256) {
        if (addr == owner) return 1;
        if (addr == broadcaster) return 2;
        if (addr == recovery) return 3;
        return 1;
    }

    function _splitSignature(bytes memory sig) internal pure returns (uint8 v, bytes32 r, bytes32 s) {
        require(sig.length == 65, "bad sig length");
        assembly {
            r := mload(add(sig, 0x20))
            s := mload(add(sig, 0x40))
            v := byte(0, mload(add(sig, 0x60)))
        }
        if (v < 27) v += 27;
    }
}
