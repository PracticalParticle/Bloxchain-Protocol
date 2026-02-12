// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import "../../core/pattern/Account.sol";

/**
 * @title AccountBlox
 * @dev Complete controller implementation using the Account pattern (GuardController, RuntimeRBAC, SecureOwnable).
 *
 * This contract delegates all behavior to Account:
 * - GuardController: Execution workflows and time-locked transactions
 * - RuntimeRBAC: Runtime role creation and management
 * - SecureOwnable: Secure ownership transfer and management
 */
contract AccountBlox is Account {}
