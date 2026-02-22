// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import "../CommonBase.sol";
import "../../../contracts/core/access/RuntimeRBAC.sol";
import "../../../contracts/core/access/lib/definitions/RuntimeRBACDefinitions.sol";
import "../../../contracts/core/lib/utils/SharedValidation.sol";
import "../helpers/TestHelpers.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title MetaTransactionSecurityFuzzTest
 * @dev Fuzz tests for meta-transaction security boundaries
 * 
 * Tests signature validation, nonce management, deadline checks, and authorization
 */
contract MetaTransactionSecurityFuzzTest is CommonBase {
    using TestHelpers for *;

    // Use constants from RuntimeRBACDefinitions to ensure they match
    bytes4 public constant ROLE_CONFIG_BATCH_META_SELECTOR = RuntimeRBACDefinitions.ROLE_CONFIG_BATCH_META_SELECTOR;
    bytes4 public constant ROLE_CONFIG_BATCH_EXECUTE_SELECTOR = RuntimeRBACDefinitions.ROLE_CONFIG_BATCH_EXECUTE_SELECTOR;
    bytes32 public constant ROLE_CONFIG_BATCH_OPERATION_TYPE = RuntimeRBACDefinitions.ROLE_CONFIG_BATCH;

    function setUp() public override {
        super.setUp();
    }

    /**
     * @dev Fuzz test: Expired meta-transactions are rejected
     * createMetaTxParams(deadline) uses block.timestamp + deadline; we need an absolute past deadline, so build params and override .deadline.
     */
    function testFuzz_ExpiredMetaTransactionRejected(uint256 deadlineOffset) public {
        if (block.timestamp <= 1) vm.warp(1000);
        uint256 now_ = block.timestamp;
        uint256 maxOffset = now_ - 1;
        uint256 offset = bound(deadlineOffset, 1, maxOffset);
        uint256 pastDeadline = now_ - offset;

        IRuntimeRBAC.RoleConfigAction[] memory actions = new IRuntimeRBAC.RoleConfigAction[](1);
        EngineBlox.FunctionPermission[] memory permissions = new EngineBlox.FunctionPermission[](0);
        actions[0] = IRuntimeRBAC.RoleConfigAction({
            actionType: IRuntimeRBAC.RoleConfigActionType.CREATE_ROLE,
            data: abi.encode("TEST_ROLE", 10, permissions)
        });

        bytes memory executionParams = RuntimeRBACDefinitions.roleConfigBatchExecutionParams(abi.encode(actions));
        EngineBlox.MetaTxParams memory metaTxParams = accountBlox.createMetaTxParams(
            address(accountBlox),
            ROLE_CONFIG_BATCH_META_SELECTOR,
            EngineBlox.TxAction.SIGN_META_REQUEST_AND_APPROVE,
            1 hours,
            0,
            owner
        );
        metaTxParams.deadline = pastDeadline;

        // generateUnsignedMetaTransactionForNew reverts with DeadlineInPast when deadline is in the past
        vm.expectRevert(
            abi.encodeWithSelector(
                SharedValidation.DeadlineInPast.selector,
                pastDeadline,
                block.timestamp
            )
        );
        accountBlox.generateUnsignedMetaTransactionForNew(
            owner,
            address(accountBlox),
            0,
            0,
            ROLE_CONFIG_BATCH_OPERATION_TYPE,
            ROLE_CONFIG_BATCH_EXECUTE_SELECTOR,
            executionParams,
            metaTxParams
        );
    }

    /**
     * @dev Fuzz test: Wrong nonce is rejected.
     * Contract overwrites nonce in generateUnsignedMetaTransactionForNew, so build a valid meta-tx,
     * sign it, then tamper params.nonce so the contract reverts at validateNonce (before signature check).
     */
    function testFuzz_WrongNonceRejected(uint256) public {
        // Build a valid meta-tx (contract will set nonce to current signer nonce)
        IRuntimeRBAC.RoleConfigAction[] memory actions = new IRuntimeRBAC.RoleConfigAction[](1);
        EngineBlox.FunctionPermission[] memory permissions = new EngineBlox.FunctionPermission[](0);
        actions[0] = IRuntimeRBAC.RoleConfigAction({
            actionType: IRuntimeRBAC.RoleConfigActionType.CREATE_ROLE,
            data: abi.encode("TEST_ROLE", 10, permissions)
        });

        bytes memory executionParams = RuntimeRBACDefinitions.roleConfigBatchExecutionParams(abi.encode(actions));
        EngineBlox.MetaTxParams memory metaTxParams = accountBlox.createMetaTxParams(
            address(accountBlox),
            ROLE_CONFIG_BATCH_META_SELECTOR,
            EngineBlox.TxAction.SIGN_META_REQUEST_AND_APPROVE,
            1 hours,
            0,
            owner
        );

        EngineBlox.MetaTransaction memory metaTx = accountBlox.generateUnsignedMetaTransactionForNew(
            owner,
            address(accountBlox),
            0,
            0,
            ROLE_CONFIG_BATCH_OPERATION_TYPE,
            ROLE_CONFIG_BATCH_EXECUTE_SELECTOR,
            executionParams,
            metaTxParams
        );

        uint256 signerPrivateKey = _getPrivateKeyForAddress(owner);
        bytes memory signature = metaTxSigner.signMetaTransaction(
            metaTx,
            signerPrivateKey,
            address(accountBlox)
        );
        metaTx.signature = signature;

        // Tamper nonce so validateNonce(provided, expected) reverts InvalidNonce (checked before signature)
        vm.prank(owner);
        uint256 expectedNonce = accountBlox.getSignerNonce(owner);
        metaTx.params.nonce = expectedNonce + 1;

        vm.prank(broadcaster);
        vm.expectRevert(
            abi.encodeWithSelector(
                SharedValidation.InvalidNonce.selector,
                expectedNonce + 1,
                expectedNonce
            )
        );
        accountBlox.roleConfigBatchRequestAndApprove(metaTx);
    }

    /**
     * @dev Fuzz test: Wrong chain ID is rejected.
     * ChainId is validated in generateUnsignedMetaTransactionForNew; expect revert there.
     */
    function testFuzz_WrongChainIdRejected(uint256) public {
        uint256 wrongChainId = block.chainid == 1 ? 2 : 1;
        vm.assume(wrongChainId != block.chainid);

        // Create a valid action
        IRuntimeRBAC.RoleConfigAction[] memory actions = new IRuntimeRBAC.RoleConfigAction[](1);
        EngineBlox.FunctionPermission[] memory permissions = new EngineBlox.FunctionPermission[](0);
        actions[0] = IRuntimeRBAC.RoleConfigAction({
            actionType: IRuntimeRBAC.RoleConfigActionType.CREATE_ROLE,
            data: abi.encode("TEST_ROLE", 10, permissions)
        });

        bytes memory executionParams = RuntimeRBACDefinitions.roleConfigBatchExecutionParams(abi.encode(actions));

        EngineBlox.MetaTxParams memory metaTxParams = accountBlox.createMetaTxParams(
            address(accountBlox),
            ROLE_CONFIG_BATCH_META_SELECTOR,
            EngineBlox.TxAction.SIGN_META_REQUEST_AND_APPROVE,
            1 hours,
            0,
            owner
        );

        metaTxParams.chainId = wrongChainId;

        vm.expectRevert(
            abi.encodeWithSelector(
                SharedValidation.ChainIdMismatch.selector,
                wrongChainId,
                block.chainid
            )
        );
        accountBlox.generateUnsignedMetaTransactionForNew(
            owner,
            address(accountBlox),
            0,
            0,
            ROLE_CONFIG_BATCH_OPERATION_TYPE,
            ROLE_CONFIG_BATCH_EXECUTE_SELECTOR,
            executionParams,
            metaTxParams
        );
    }

    /**
     * @dev Fuzz test: Invalid signature length is rejected
     * Contract reverts with InvalidSignatureLength; expect revert.
     */
    function testFuzz_InvalidSignatureLengthRejected(bytes memory invalidSignature) public {
        vm.assume(invalidSignature.length != 65);

        // Create a valid action
        IRuntimeRBAC.RoleConfigAction[] memory actions = new IRuntimeRBAC.RoleConfigAction[](1);
        EngineBlox.FunctionPermission[] memory permissions = new EngineBlox.FunctionPermission[](0);
        actions[0] = IRuntimeRBAC.RoleConfigAction({
            actionType: IRuntimeRBAC.RoleConfigActionType.CREATE_ROLE,
            data: abi.encode("TEST_ROLE", 10, permissions)
        });

        bytes memory executionParams = RuntimeRBACDefinitions.roleConfigBatchExecutionParams(abi.encode(actions));
        EngineBlox.MetaTransaction memory metaTx = _createMetaTxForRoleConfig(
            owner,
            executionParams,
            1 hours
        );

        // Override with invalid signature
        metaTx.signature = invalidSignature;

        vm.prank(broadcaster);
        vm.expectRevert(
            abi.encodeWithSelector(
                SharedValidation.InvalidSignatureLength.selector,
                invalidSignature.length,
                uint256(65)
            )
        );
        accountBlox.roleConfigBatchRequestAndApprove(metaTx);
    }

    /**
     * @dev Fuzz test: Unauthorized signer is rejected
     * Fuzz over private-key index 4..1000 so we have a signable address that is not owner/broadcaster/recovery.
     */
    function testFuzz_UnauthorizedSignerRejected(uint256 pkIndex) public {
        uint256 pk = bound(pkIndex, 4, 1000);
        address unauthorizedSigner = vm.addr(pk);

        // Create a valid action
        IRuntimeRBAC.RoleConfigAction[] memory actions = new IRuntimeRBAC.RoleConfigAction[](1);
        EngineBlox.FunctionPermission[] memory permissions = new EngineBlox.FunctionPermission[](0);
        actions[0] = IRuntimeRBAC.RoleConfigAction({
            actionType: IRuntimeRBAC.RoleConfigActionType.CREATE_ROLE,
            data: abi.encode("TEST_ROLE", 10, permissions)
        });

        bytes memory executionParams = RuntimeRBACDefinitions.roleConfigBatchExecutionParams(abi.encode(actions));

        // Create meta-transaction signed by unauthorized address
        EngineBlox.MetaTxParams memory metaTxParams = accountBlox.createMetaTxParams(
            address(accountBlox),
            ROLE_CONFIG_BATCH_META_SELECTOR,
            EngineBlox.TxAction.SIGN_META_REQUEST_AND_APPROVE,
            1 hours,
            0,
            unauthorizedSigner
        );

        EngineBlox.MetaTransaction memory metaTx = accountBlox.generateUnsignedMetaTransactionForNew(
            unauthorizedSigner,
            address(accountBlox),
            0,
            0,
            ROLE_CONFIG_BATCH_OPERATION_TYPE,
            ROLE_CONFIG_BATCH_EXECUTE_SELECTOR,
            executionParams,
            metaTxParams
        );

        // Sign the meta-transaction using the message hash from the contract
        bytes32 messageHash = metaTx.message;
        bytes32 ethSignedMessageHash = MessageHashUtils.toEthSignedMessageHash(messageHash);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, ethSignedMessageHash);
        bytes memory signature = abi.encodePacked(r, s, v);
        metaTx.signature = signature;

        vm.prank(broadcaster);
        vm.expectRevert(
            abi.encodeWithSelector(
                SharedValidation.SignerNotAuthorized.selector,
                unauthorizedSigner
            )
        );
        accountBlox.roleConfigBatchRequestAndApprove(metaTx);
    }

    /**
     * @dev Fuzz test: Nonce replay protection.
     * Replay the same signed meta-tx after it was executed; contract must revert with InvalidNonce.
     */
    function testFuzz_NonceReplayProtection() public {
        // Create a valid action
        IRuntimeRBAC.RoleConfigAction[] memory actions = new IRuntimeRBAC.RoleConfigAction[](1);
        EngineBlox.FunctionPermission[] memory permissions = new EngineBlox.FunctionPermission[](0);
        actions[0] = IRuntimeRBAC.RoleConfigAction({
            actionType: IRuntimeRBAC.RoleConfigActionType.CREATE_ROLE,
            data: abi.encode("TEST_ROLE_1", 10, permissions)
        });

        bytes memory executionParams = RuntimeRBACDefinitions.roleConfigBatchExecutionParams(abi.encode(actions));
        EngineBlox.MetaTransaction memory metaTx1 = _createMetaTxForRoleConfig(
            owner,
            executionParams,
            1 hours
        );

        // Execute first transaction
        vm.prank(broadcaster);
        accountBlox.roleConfigBatchRequestAndApprove(metaTx1);

        // Replay the same meta-tx (same nonce already used) - must revert with InvalidNonce
        vm.prank(broadcaster);
        vm.expectRevert(
            abi.encodeWithSelector(
                SharedValidation.InvalidNonce.selector,
                metaTx1.params.nonce,
                metaTx1.params.nonce + 1
            )
        );
        accountBlox.roleConfigBatchRequestAndApprove(metaTx1);
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
