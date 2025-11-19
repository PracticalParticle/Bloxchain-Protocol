// SPDX-License-Identifier: MPL-2.0
pragma solidity ^0.8.25;

import { MessageHashUtils } from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "../interfaces/ISignatureVerifier.sol";

/**
 * @title ECDSAVerifier
 * @dev ECDSA signature verifier implementation using secp256k1 curve
 * @notice Default verifier for Ethereum-compatible signatures
 */
contract ECDSAVerifier is ISignatureVerifier {
    using MessageHashUtils for bytes32;
    
    /**
     * @dev Recovers the signer address from a message hash and ECDSA signature
     * @param messageHash The EIP-712 message hash
     * @param signature The ECDSA signature in (r, s, v) format (65 bytes)
     * @return signer The recovered signer address, or address(0) if invalid
     */
    function recoverSigner(
        bytes32 messageHash,
        bytes memory signature
    ) external pure override returns (address) {
        require(signature.length == 65, "Invalid signature length");
        
        bytes32 r;
        bytes32 s;
        uint8 v;
        
        // Extract r, s, v from signature
        assembly {
            r := mload(add(signature, 0x20))
            s := mload(add(signature, 0x40))
            v := byte(0, mload(add(signature, 0x60)))
        }
        
        // Validate signature parameters (EIP-2)
        require(v == 27 || v == 28, "Invalid v");
        require(
            s < 0x7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a1,
            "Invalid s"
        );
        
        // Format message hash for ecrecover (EIP-191)
        bytes32 formattedHash = messageHash.toEthSignedMessageHash();
        
        // Recover signer using ecrecover
        address signer = ecrecover(formattedHash, v, r, s);
        require(signer != address(0), "Invalid signature");
        
        return signer;
    }
}

