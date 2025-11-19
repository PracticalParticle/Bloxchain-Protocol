// SPDX-License-Identifier: MPL-2.0
pragma solidity ^0.8.25;

/**
 * @title ISignatureVerifier
 * @dev Minimal interface for pluggable signature verification
 * @notice Allows different signature algorithms to be used with meta-transactions
 */
interface ISignatureVerifier {
    /**
     * @dev Recovers signer address from message hash and signature
     * @param messageHash EIP-712 formatted message hash
     * @param signature Signature bytes (format algorithm-specific)
     * @return signer Recovered signer address, or address(0) if invalid
     */
    function recoverSigner(
        bytes32 messageHash,
        bytes memory signature
    ) external view returns (address);
}

