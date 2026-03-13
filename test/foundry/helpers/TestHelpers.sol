// SPDX-License-Identifier: MPL-2.0
pragma solidity 0.8.34;

import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {Test} from "forge-std/Test.sol";
import "../../../contracts/core/lib/EngineBlox.sol";

/**
 * @title TestHelpers
 * @dev Utility functions for testing
 */
library TestHelpers {
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
 * @dev Helper contract for signing meta-transactions (standard EIP-712 digest; use vm.sign with raw digest)
 */
contract MetaTxSigner is Test {
    // EIP-712 type hashes matching EngineBlox (selective MetaTxRecord: txId, params, payment only)
    // These must stay in sync with EngineBlox.META_TX_TYPE_HASH and EngineBlox.META_TX_RECORD_TYPE_HASH.
    bytes32 private constant META_TX_TYPE_HASH = keccak256("MetaTransaction(MetaTxRecord txRecord,MetaTxParams params,bytes data)");
    bytes32 private constant META_TX_RECORD_TYPE_HASH = keccak256("MetaTxRecord(uint256 txId,TxParams params,PaymentDetails payment)");
    bytes32 private constant TX_PARAMS_TYPE_HASH = keccak256("TxParams(address requester,address target,uint256 value,uint256 gasLimit,bytes32 operationType,bytes4 executionSelector,bytes executionParams)");
    bytes32 private constant META_TX_PARAMS_TYPE_HASH = keccak256("MetaTxParams(uint256 chainId,uint256 nonce,address handlerContract,bytes4 handlerSelector,uint8 action,uint256 deadline,uint256 maxGasPrice,address signer)");
    bytes32 private constant PAYMENT_DETAILS_TYPE_HASH = keccak256("PaymentDetails(address recipient,uint256 nativeTokenAmount,address erc20TokenAddress,uint256 erc20TokenAmount)");
    bytes32 private constant DOMAIN_SEPARATOR_TYPE_HASH = keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");
    bytes32 private constant PROTOCOL_NAME_HASH = keccak256("Bloxchain");

    /**
     * @dev Signs a meta-transaction using vm.sign (standard EIP-712 digest, no prefix)
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
     * @dev Generates the EIP-712 message hash (matches EngineBlox.generateMessageHash)
     */
    function generateMessageHash(
        EngineBlox.MetaTransaction memory metaTx,
        address verifyingContract
    ) public view returns (bytes32) {
        bytes32 domainSeparator = keccak256(abi.encode(
            DOMAIN_SEPARATOR_TYPE_HASH,
            PROTOCOL_NAME_HASH,
            keccak256(abi.encodePacked(uint8(1), ".", uint8(0), ".", uint8(0))),
            block.chainid,
            verifyingContract
        ));

        EngineBlox.TxParams memory tp = metaTx.txRecord.params;
        bytes32 txParamsStructHash = keccak256(abi.encode(
            TX_PARAMS_TYPE_HASH,
            tp.requester,
            tp.target,
            tp.value,
            tp.gasLimit,
            tp.operationType,
            tp.executionSelector,
            keccak256(tp.executionParams)
        ));

        EngineBlox.PaymentDetails memory payment = metaTx.txRecord.payment;
        bytes32 paymentStructHash = keccak256(abi.encode(
            PAYMENT_DETAILS_TYPE_HASH,
            payment.recipient,
            payment.nativeTokenAmount,
            payment.erc20TokenAddress,
            payment.erc20TokenAmount
        ));

        bytes32 metaTxRecordStructHash = keccak256(abi.encode(
            META_TX_RECORD_TYPE_HASH,
            metaTx.txRecord.txId,
            txParamsStructHash,
            paymentStructHash
        ));

        EngineBlox.MetaTxParams memory mp = metaTx.params;
        bytes32 metaTxParamsStructHash = keccak256(abi.encode(
            META_TX_PARAMS_TYPE_HASH,
            mp.chainId,
            mp.nonce,
            mp.handlerContract,
            mp.handlerSelector,
            uint8(mp.action),
            mp.deadline,
            mp.maxGasPrice,
            mp.signer
        ));

        bytes32 structHash = keccak256(abi.encode(
            META_TX_TYPE_HASH,
            metaTxRecordStructHash,
            metaTxParamsStructHash,
            keccak256(metaTx.data)
        ));

        return keccak256(abi.encodePacked(
            "\x19\x01",
            domainSeparator,
            structHash
        ));
    }
}
