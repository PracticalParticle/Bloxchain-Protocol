// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import "../../core/pattern/Account.sol";

/**
 * @title AccountBlox
 * @dev Complete controller implementation using the Account pattern (GuardController, RuntimeRBAC, SecureOwnable).
 *
 * This contract delegates all behavior to Account:
 * - GuardController: Execution workflows and time-locked transactions
 * - RuntimeRBAC: Runtime role creation and management
 * - SecureOwnable: Secure ownership transfer and management
 *
 * Top-level initializer: only concrete contracts (AccountBlox) use the initializer modifier;
 * Account.initialize uses onlyInitializing and is invoked from here.
 */
contract AccountBlox is Account {
    /**
     * @notice Initializer for AccountBlox (top-level; sets initializing flag then delegates to Account).
     */
    function initialize(
        address initialOwner,
        address broadcaster,
        address recovery,
        uint256 timeLockPeriodSec,
        address eventForwarder
    ) public virtual override initializer {
        Account.initialize(initialOwner, broadcaster, recovery, timeLockPeriodSec, eventForwarder);
    }
}
