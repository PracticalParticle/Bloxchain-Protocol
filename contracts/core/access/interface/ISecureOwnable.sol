// SPDX-License-Identifier: MPL-2.0
pragma solidity ^0.8.25;

// Contracts imports
import "../../base/lib/StateAbstraction.sol";

/**
 * @title ISecureOwnable
 * @dev Interface for SecureOwnable functionality
 */
interface ISecureOwnable {    
    function owner() external view returns (address);
    function getBroadcaster() external view returns (address);
    function getRecovery() external view returns (address);
}
