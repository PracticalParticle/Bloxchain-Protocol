// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import "../CommonBase.sol";
import "../../../contracts/core/access/RuntimeRBAC.sol";
import "../../../contracts/core/access/lib/definitions/RuntimeRBACDefinitions.sol";
import "../../../contracts/utils/SharedValidation.sol";
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
     */
    function testFuzz_ExpiredMetaTransactionRejected(uint256 deadlineOffset) public {
        // Deadline in the past - bound to prevent underflow
        uint256 offset = bound(deadlineOffset, 1, block.timestamp > 365 days ? 365 days : block.timestamp - 1);
        uint256 deadline = block.timestamp - offset;

        // Create a valid action
        RuntimeRBAC.RoleConfigAction[] memory actions = new RuntimeRBAC.RoleConfigAction[](1);
        EngineBlox.FunctionPermission[] memory permissions = new EngineBlox.FunctionPermission[](0);
        actions[0] = RuntimeRBAC.RoleConfigAction({
            actionType: RuntimeRBAC.RoleConfigActionType.CREATE_ROLE,
            data: abi.encode("TEST_ROLE", 10, permissions)
        });

        bytes memory executionParams = roleBlox.roleConfigBatchExecutionParams(actions);
        EngineBlox.MetaTransaction memory metaTx = _createMetaTxForRoleConfig(
            owner,
            executionParams,
            deadline
        );

        vm.prank(broadcaster);
        EngineBlox.TxRecord memory txRecord = roleBlox.roleConfigBatchRequestAndApprove(metaTx);
        
        // Transaction should fail with MetaTxExpired error
        assertEq(uint8(txRecord.status), uint8(EngineBlox.TxStatus.FAILED), "Transaction should fail");
        
        bytes memory expectedError = abi.encodeWithSelector(
            SharedValidation.MetaTxExpired.selector,
            deadline,
            block.timestamp
        );
        assertEq(txRecord.result, expectedError, "Should fail with MetaTxExpired");
    }

    /**
     * @dev Fuzz test: Wrong nonce is rejected
     */
    function testFuzz_WrongNonceRejected(uint256 wrongNonce) public {
        // Get actual nonce
        uint256 actualNonce = roleBlox.getSignerNonce(owner);
        vm.assume(wrongNonce != actualNonce);

        // Create a valid action
        RuntimeRBAC.RoleConfigAction[] memory actions = new RuntimeRBAC.RoleConfigAction[](1);
        EngineBlox.FunctionPermission[] memory permissions = new EngineBlox.FunctionPermission[](0);
        actions[0] = RuntimeRBAC.RoleConfigAction({
            actionType: RuntimeRBAC.RoleConfigActionType.CREATE_ROLE,
            data: abi.encode("TEST_ROLE", 10, permissions)
        });

        bytes memory executionParams = roleBlox.roleConfigBatchExecutionParams(actions);

        // Create meta-transaction with wrong nonce
        EngineBlox.MetaTxParams memory metaTxParams = roleBlox.createMetaTxParams(
            address(roleBlox),
            ROLE_CONFIG_BATCH_META_SELECTOR,
            EngineBlox.TxAction.SIGN_META_REQUEST_AND_APPROVE,
            block.timestamp + 1 hours,
            0,
            owner
        );

        // Override nonce with wrong value
        metaTxParams.nonce = wrongNonce;

        EngineBlox.MetaTransaction memory metaTx = roleBlox.generateUnsignedMetaTransactionForNew(
            owner,
            address(roleBlox),
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
            address(roleBlox)
        );
        metaTx.signature = signature;

        vm.prank(broadcaster);
        EngineBlox.TxRecord memory txRecord = roleBlox.roleConfigBatchRequestAndApprove(metaTx);
        
        // Transaction should fail with InvalidNonce error
        assertEq(uint8(txRecord.status), uint8(EngineBlox.TxStatus.FAILED), "Transaction should fail");
        
        bytes memory expectedError = abi.encodeWithSelector(
            SharedValidation.InvalidNonce.selector,
            wrongNonce,
            actualNonce
        );
        assertEq(txRecord.result, expectedError, "Should fail with InvalidNonce");
    }

    /**
     * @dev Fuzz test: Wrong chain ID is rejected
     */
    function testFuzz_WrongChainIdRejected(uint256 wrongChainId) public {
        vm.assume(wrongChainId != block.chainid);

        // Create a valid action
        RuntimeRBAC.RoleConfigAction[] memory actions = new RuntimeRBAC.RoleConfigAction[](1);
        EngineBlox.FunctionPermission[] memory permissions = new EngineBlox.FunctionPermission[](0);
        actions[0] = RuntimeRBAC.RoleConfigAction({
            actionType: RuntimeRBAC.RoleConfigActionType.CREATE_ROLE,
            data: abi.encode("TEST_ROLE", 10, permissions)
        });

        bytes memory executionParams = roleBlox.roleConfigBatchExecutionParams(actions);

        // Create meta-transaction with wrong chain ID
        EngineBlox.MetaTxParams memory metaTxParams = roleBlox.createMetaTxParams(
            address(roleBlox),
            ROLE_CONFIG_BATCH_META_SELECTOR,
            EngineBlox.TxAction.SIGN_META_REQUEST_AND_APPROVE,
            block.timestamp + 1 hours,
            0,
            owner
        );

        // Override chain ID with wrong value
        metaTxParams.chainId = wrongChainId;

        EngineBlox.MetaTransaction memory metaTx = roleBlox.generateUnsignedMetaTransactionForNew(
            owner,
            address(roleBlox),
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
            address(roleBlox)
        );
        metaTx.signature = signature;

        vm.prank(broadcaster);
        EngineBlox.TxRecord memory txRecord = roleBlox.roleConfigBatchRequestAndApprove(metaTx);
        
        // Transaction should fail with ChainIdMismatch error
        assertEq(uint8(txRecord.status), uint8(EngineBlox.TxStatus.FAILED), "Transaction should fail");
        
        bytes memory expectedError = abi.encodeWithSelector(
            SharedValidation.ChainIdMismatch.selector,
            wrongChainId,
            block.chainid
        );
        assertEq(txRecord.result, expectedError, "Should fail with ChainIdMismatch");
    }

    /**
     * @dev Fuzz test: Invalid signature length is rejected
     */
    function testFuzz_InvalidSignatureLengthRejected(bytes memory invalidSignature) public {
        vm.assume(invalidSignature.length != 65);

        // Create a valid action
        RuntimeRBAC.RoleConfigAction[] memory actions = new RuntimeRBAC.RoleConfigAction[](1);
        EngineBlox.FunctionPermission[] memory permissions = new EngineBlox.FunctionPermission[](0);
        actions[0] = RuntimeRBAC.RoleConfigAction({
            actionType: RuntimeRBAC.RoleConfigActionType.CREATE_ROLE,
            data: abi.encode("TEST_ROLE", 10, permissions)
        });

        bytes memory executionParams = roleBlox.roleConfigBatchExecutionParams(actions);
        EngineBlox.MetaTransaction memory metaTx = _createMetaTxForRoleConfig(
            owner,
            executionParams,
            block.timestamp + 1 hours
        );

        // Override with invalid signature
        metaTx.signature = invalidSignature;

        vm.prank(broadcaster);
        EngineBlox.TxRecord memory txRecord = roleBlox.roleConfigBatchRequestAndApprove(metaTx);
        
        // Transaction should fail with InvalidSignatureLength or InvalidSignature error
        assertEq(uint8(txRecord.status), uint8(EngineBlox.TxStatus.FAILED), "Transaction should fail");
        assertGt(txRecord.result.length, 0, "Should have error in result");
    }

    /**
     * @dev Fuzz test: Unauthorized signer is rejected
     */
    function testFuzz_UnauthorizedSignerRejected(address unauthorizedSigner) public {
        vm.assume(unauthorizedSigner != owner);
        vm.assume(unauthorizedSigner != address(0));
        vm.assume(unauthorizedSigner != broadcaster);
        vm.assume(unauthorizedSigner != recovery);
        
        // Ensure we can find a private key for this address, or skip if we can't
        // For fuzzing, we'll try to find a matching private key
        bool canSign = false;
        for (uint256 i = 1; i <= 1000; i++) {
            if (vm.addr(i) == unauthorizedSigner) {
                canSign = true;
                break;
            }
        }
        vm.assume(canSign); // Skip if we can't sign with this address

        // Create a valid action
        RuntimeRBAC.RoleConfigAction[] memory actions = new RuntimeRBAC.RoleConfigAction[](1);
        EngineBlox.FunctionPermission[] memory permissions = new EngineBlox.FunctionPermission[](0);
        actions[0] = RuntimeRBAC.RoleConfigAction({
            actionType: RuntimeRBAC.RoleConfigActionType.CREATE_ROLE,
            data: abi.encode("TEST_ROLE", 10, permissions)
        });

        bytes memory executionParams = roleBlox.roleConfigBatchExecutionParams(actions);

        // Create meta-transaction signed by unauthorized address
        EngineBlox.MetaTxParams memory metaTxParams = roleBlox.createMetaTxParams(
            address(roleBlox),
            ROLE_CONFIG_BATCH_META_SELECTOR,
            EngineBlox.TxAction.SIGN_META_REQUEST_AND_APPROVE,
            block.timestamp + 1 hours,
            0,
            unauthorizedSigner
        );

        EngineBlox.MetaTransaction memory metaTx = roleBlox.generateUnsignedMetaTransactionForNew(
            unauthorizedSigner,
            address(roleBlox),
            0,
            0,
            ROLE_CONFIG_BATCH_OPERATION_TYPE,
            ROLE_CONFIG_BATCH_EXECUTE_SELECTOR,
            executionParams,
            metaTxParams
        );

        // Sign the meta-transaction using the message hash from the contract
        uint256 signerPrivateKey = _getPrivateKeyForAddress(unauthorizedSigner);
        bytes32 messageHash = metaTx.message; // Use the message hash from contract (EIP-712 hash)
        bytes32 ethSignedMessageHash = MessageHashUtils.toEthSignedMessageHash(messageHash); // Add Ethereum signed message prefix
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPrivateKey, ethSignedMessageHash);
        bytes memory signature = abi.encodePacked(r, s, v);
        metaTx.signature = signature;

        vm.prank(broadcaster);
        EngineBlox.TxRecord memory txRecord = roleBlox.roleConfigBatchRequestAndApprove(metaTx);
        
        // Transaction should fail with SignerNotAuthorized error
        assertEq(uint8(txRecord.status), uint8(EngineBlox.TxStatus.FAILED), "Transaction should fail");
        
        bytes memory expectedError = abi.encodeWithSelector(
            SharedValidation.SignerNotAuthorized.selector,
            unauthorizedSigner
        );
        assertEq(txRecord.result, expectedError, "Should fail with SignerNotAuthorized");
    }

    /**
     * @dev Fuzz test: Nonce replay protection
     */
    function testFuzz_NonceReplayProtection() public {
        // Create a valid action
        RuntimeRBAC.RoleConfigAction[] memory actions = new RuntimeRBAC.RoleConfigAction[](1);
        EngineBlox.FunctionPermission[] memory permissions = new EngineBlox.FunctionPermission[](0);
        actions[0] = RuntimeRBAC.RoleConfigAction({
            actionType: RuntimeRBAC.RoleConfigActionType.CREATE_ROLE,
            data: abi.encode("TEST_ROLE_1", 10, permissions)
        });

        bytes memory executionParams = roleBlox.roleConfigBatchExecutionParams(actions);
        EngineBlox.MetaTransaction memory metaTx1 = _createMetaTxForRoleConfig(
            owner,
            executionParams,
            block.timestamp + 1 hours
        );

        // Execute first transaction
        vm.prank(broadcaster);
        roleBlox.roleConfigBatchRequestAndApprove(metaTx1);

        // Try to replay with same nonce - should fail
        RuntimeRBAC.RoleConfigAction[] memory actions2 = new RuntimeRBAC.RoleConfigAction[](1);
        actions2[0] = RuntimeRBAC.RoleConfigAction({
            actionType: RuntimeRBAC.RoleConfigActionType.CREATE_ROLE,
            data: abi.encode("TEST_ROLE_2", 10, permissions)
        });

        bytes memory executionParams2 = roleBlox.roleConfigBatchExecutionParams(actions2);
        
        // Get current nonce (should have incremented)
        uint256 currentNonce = roleBlox.getSignerNonce(owner);
        
        // Create new meta-transaction with old nonce
        EngineBlox.MetaTxParams memory metaTxParams = roleBlox.createMetaTxParams(
            address(roleBlox),
            ROLE_CONFIG_BATCH_META_SELECTOR,
            EngineBlox.TxAction.SIGN_META_REQUEST_AND_APPROVE,
            block.timestamp + 1 hours,
            0,
            owner
        );

        // Override with old nonce (should be currentNonce - 1)
        metaTxParams.nonce = currentNonce - 1;

        EngineBlox.MetaTransaction memory metaTx2 = roleBlox.generateUnsignedMetaTransactionForNew(
            owner,
            address(roleBlox),
            0,
            0,
            ROLE_CONFIG_BATCH_OPERATION_TYPE,
            ROLE_CONFIG_BATCH_EXECUTE_SELECTOR,
            executionParams2,
            metaTxParams
        );

        // Sign the meta-transaction using the message hash from the contract
        uint256 signerPrivateKey = _getPrivateKeyForAddress(owner);
        bytes32 messageHash2 = metaTx2.message; // Use the message hash from contract (EIP-712 hash)
        bytes32 ethSignedMessageHash2 = MessageHashUtils.toEthSignedMessageHash(messageHash2); // Add Ethereum signed message prefix
        (uint8 v2, bytes32 r2, bytes32 s2) = vm.sign(signerPrivateKey, ethSignedMessageHash2);
        bytes memory signature2 = abi.encodePacked(r2, s2, v2);
        metaTx2.signature = signature2;

        vm.prank(broadcaster);
        EngineBlox.TxRecord memory txRecord2 = roleBlox.roleConfigBatchRequestAndApprove(metaTx2);
        
        // Transaction should fail with InvalidNonce error
        assertEq(uint8(txRecord2.status), uint8(EngineBlox.TxStatus.FAILED), "Transaction should fail");
        
        bytes memory expectedError = abi.encodeWithSelector(
            SharedValidation.InvalidNonce.selector,
            currentNonce - 1,
            currentNonce
        );
        assertEq(txRecord2.result, expectedError, "Should fail with InvalidNonce");
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
