// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {Test} from "forge-std/Test.sol";
import "../../../contracts/core/lib/EngineBlox.sol";

/**
 * @title TestHelpers
 * @dev Utility functions for testing
 */
library TestHelpers {
    using MessageHashUtils for bytes32;
    using ECDSA for bytes32;

    /**
     * @dev Calculates role hash from role name
     */
    function getRoleHash(string memory roleName) internal pure returns (bytes32) {
        return keccak256(bytes(roleName));
    }

    /**
     * @dev Calculates function selector from function signature
     */
    function getFunctionSelector(string memory signature) internal pure returns (bytes4) {
        return bytes4(keccak256(bytes(signature)));
    }

    /**
     * @dev Hashes TxRecord for EIP-712
     */
    function _hashTxRecord(EngineBlox.TxRecord memory record) private pure returns (bytes32) {
        return keccak256(abi.encode(
            record.txId,
            record.releaseTime,
            uint8(record.status),
            _hashTxParams(record.params),
            record.message,
            keccak256(record.result),
            _hashPaymentDetails(record.payment)
        ));
    }

    /**
     * @dev Hashes TxParams for EIP-712
     */
    function _hashTxParams(EngineBlox.TxParams memory params) private pure returns (bytes32) {
        return keccak256(abi.encode(
            params.requester,
            params.target,
            params.value,
            params.gasLimit,
            params.operationType,
            params.executionSelector,
            keccak256(params.executionParams)
        ));
    }

    /**
     * @dev Hashes MetaTxParams for EIP-712
     */
    function _hashMetaTxParams(EngineBlox.MetaTxParams memory params) private pure returns (bytes32) {
        return keccak256(abi.encode(
            params.chainId,
            params.nonce,
            params.handlerContract,
            params.handlerSelector,
            uint8(params.action),
            params.deadline,
            params.maxGasPrice,
            params.signer
        ));
    }

    /**
     * @dev Hashes PaymentDetails for EIP-712
     */
    function _hashPaymentDetails(EngineBlox.PaymentDetails memory payment) private pure returns (bytes32) {
        return keccak256(abi.encode(
            payment.recipient,
            payment.nativeTokenAmount,
            payment.erc20TokenAddress,
            payment.erc20TokenAmount
        ));
    }
}

/**
 * @title MetaTxSigner
 * @dev Helper contract for signing meta-transactions (must be a contract, not library, to use vm.sign)
 */
contract MetaTxSigner is Test {
    using MessageHashUtils for bytes32;
    using ECDSA for bytes32;

    // EIP-712 constants matching EngineBlox
    bytes32 private constant TYPE_HASH = keccak256("MetaTransaction(TxRecord txRecord,MetaTxParams params,bytes data)TxRecord(uint256 txId,uint256 releaseTime,uint8 status,TxParams params,bytes32 message,bytes result,PaymentDetails payment)TxParams(address requester,address target,uint256 value,uint256 gasLimit,bytes32 operationType,bytes4 executionSelector,bytes executionParams)MetaTxParams(uint256 chainId,uint256 nonce,address handlerContract,bytes4 handlerSelector,uint8 action,uint256 deadline,uint256 maxGasPrice,address signer)PaymentDetails(address recipient,uint256 nativeTokenAmount,address erc20TokenAddress,uint256 erc20TokenAmount)");
    bytes32 private constant DOMAIN_SEPARATOR_TYPE_HASH = keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");
    bytes32 private constant PROTOCOL_NAME_HASH = keccak256("Bloxchain");
    string private constant VERSION = "1.0.0";

    /**
     * @dev Signs a meta-transaction using vm.sign
     * @param metaTx The meta-transaction to sign
     * @param signerPrivateKey The private key of the signer
     * @param verifyingContract The contract address that will verify the signature
     * @return The signature bytes
     */
    function signMetaTransaction(
        EngineBlox.MetaTransaction memory metaTx,
        uint256 signerPrivateKey,
        address verifyingContract
    ) public view returns (bytes memory) {
        bytes32 messageHash = generateMessageHash(metaTx, verifyingContract);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPrivateKey, messageHash);
        return abi.encodePacked(r, s, v);
    }

    /**
     * @dev Generates the EIP-712 message hash for a meta-transaction
     * @param metaTx The meta-transaction
     * @param verifyingContract The contract address
     * @return The message hash
     * @notice This matches EngineBlox.generateMessageHash exactly
     */
    function generateMessageHash(
        EngineBlox.MetaTransaction memory metaTx,
        address verifyingContract
    ) public view returns (bytes32) {
        // Domain separator - matches EngineBlox
        bytes32 domainSeparator = keccak256(abi.encode(
            DOMAIN_SEPARATOR_TYPE_HASH,
            PROTOCOL_NAME_HASH,
            keccak256(abi.encodePacked(uint8(1), ".", uint8(0), ".", uint8(0))), // VERSION_MAJOR.MINOR.PATCH
            block.chainid,
            verifyingContract
        ));

        // Struct hash - matches EngineBlox exactly
        // Note: EngineBlox only hashes specific TxParams fields, not the full TxRecord
        bytes32 structHash = keccak256(abi.encode(
            TYPE_HASH,
            keccak256(abi.encode(
                metaTx.txRecord.txId,
                metaTx.txRecord.params.requester,
                metaTx.txRecord.params.target,
                metaTx.txRecord.params.value,
                metaTx.txRecord.params.gasLimit,
                metaTx.txRecord.params.operationType,
                metaTx.txRecord.params.executionSelector,
                keccak256(metaTx.txRecord.params.executionParams)
            )),
            metaTx.params.chainId,
            metaTx.params.nonce,
            metaTx.params.handlerContract,
            metaTx.params.handlerSelector,
            uint8(metaTx.params.action),
            metaTx.params.deadline,
            metaTx.params.maxGasPrice,
            metaTx.params.signer
        ));

        return keccak256(abi.encodePacked(
            "\x19\x01",
            domainSeparator,
            structHash
        ));
    }

    /**
     * @dev Hashes TxRecord for EIP-712
     */
    function _hashTxRecord(EngineBlox.TxRecord memory record) private pure returns (bytes32) {
        return keccak256(abi.encode(
            record.txId,
            record.releaseTime,
            uint8(record.status),
            _hashTxParams(record.params),
            record.message,
            keccak256(record.result),
            _hashPaymentDetails(record.payment)
        ));
    }

    /**
     * @dev Hashes TxParams for EIP-712
     */
    function _hashTxParams(EngineBlox.TxParams memory params) private pure returns (bytes32) {
        return keccak256(abi.encode(
            params.requester,
            params.target,
            params.value,
            params.gasLimit,
            params.operationType,
            params.executionSelector,
            keccak256(params.executionParams)
        ));
    }

    /**
     * @dev Hashes MetaTxParams for EIP-712
     */
    function _hashMetaTxParams(EngineBlox.MetaTxParams memory params) private pure returns (bytes32) {
        return keccak256(abi.encode(
            params.chainId,
            params.nonce,
            params.handlerContract,
            params.handlerSelector,
            uint8(params.action),
            params.deadline,
            params.maxGasPrice,
            params.signer
        ));
    }

    /**
     * @dev Hashes PaymentDetails for EIP-712
     */
    function _hashPaymentDetails(EngineBlox.PaymentDetails memory payment) private pure returns (bytes32) {
        return keccak256(abi.encode(
            payment.recipient,
            payment.nativeTokenAmount,
            payment.erc20TokenAddress,
            payment.erc20TokenAmount
        ));
    }
}
