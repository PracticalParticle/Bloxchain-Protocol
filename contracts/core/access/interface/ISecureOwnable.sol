// SPDX-License-Identifier: MPL-2.0
pragma solidity ^0.8.25;

// Contracts imports
import "../../base/lib/StateAbstraction.sol";

/**
 * @title ISecureOwnable
 * @dev Interface for SecureOwnable functionality
 * @notice This interface defines SecureOwnable-specific operations
 * @notice Note: owner(), getBroadcaster(), and getRecovery() are available through BaseStateMachine
 */
interface ISecureOwnable {
    // Interface is kept for future SecureOwnable-specific functionality
    // All role queries (owner, broadcaster, recovery) are in BaseStateMachine
}
