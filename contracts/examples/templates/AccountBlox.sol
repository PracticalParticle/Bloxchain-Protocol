// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import "../../core/pattern/Account.sol";
import "../../core/lib/utils/SharedValidation.sol";

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
    // Timelock period constants (in seconds)
    uint256 private constant MIN_TIMELOCK_PERIOD = 1; // 1 second
    uint256 private constant MAX_TIMELOCK_PERIOD = 90 * 24 * 60 * 60; // 90 days

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
        if (timeLockPeriodSec < MIN_TIMELOCK_PERIOD) revert SharedValidation.InvalidTimeLockPeriod(timeLockPeriodSec);
        if (timeLockPeriodSec > MAX_TIMELOCK_PERIOD) revert SharedValidation.InvalidTimeLockPeriod(timeLockPeriodSec);
        Account.initialize(initialOwner, broadcaster, recovery, timeLockPeriodSec, eventForwarder);
    }

    /**
     * @dev Internal function to update the timelock period with validation
     * @param newTimeLockPeriodSec The new timelock period in seconds
     */
    function _updateTimeLockPeriod(uint256 newTimeLockPeriodSec) internal virtual override {
        if (newTimeLockPeriodSec < MIN_TIMELOCK_PERIOD) revert SharedValidation.InvalidTimeLockPeriod(newTimeLockPeriodSec);
        if (newTimeLockPeriodSec > MAX_TIMELOCK_PERIOD) revert SharedValidation.InvalidTimeLockPeriod(newTimeLockPeriodSec);
        super._updateTimeLockPeriod(newTimeLockPeriodSec);
    }
}
