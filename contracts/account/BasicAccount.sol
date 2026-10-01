// SPDX-License-Identifier: MPL-2.0
pragma solidity 0.8.35;

import "../core/pattern/Account.sol";
import "../core/lib/utils/SharedValidation.sol";

/**
 * @title BasicAccount
 * @dev Canonical account implementation built on the Account pattern
 *      (GuardController + RuntimeRBAC + SecureOwnable).
 *
 * This is the source intended for a future mainnet declaration. It is the same engine as the
 * `AccountBlox` teaching template under `contracts/examples/templates/`, with production
 * timelock bounds:
 * - `MIN_TIME_LOCK_PERIOD` = 1 day (AccountBlox allows 1 second)
 * - `MAX_TIME_LOCK_PERIOD` = 90 days
 *
 * Both bounds are enforced on `initialize` and on every timelock update.
 *
 * The constructor disables initializers, so the deployed implementation can never be
 * initialized or taken over. Use it only as a clone source: `BasicFactory.cloneBlox` creates
 * an EIP-1167 clone (which copies runtime code, not storage) and initializes it in the same
 * transaction.
 *
 * This contract is not covered by the Nethermind core audit (NM_0828). No official deployment
 * of it is declared.
 *
 * @custom:security-contact security@particlecs.com
 */
contract BasicAccount is Account {
    /// @notice Minimum timelock period in seconds (1 day)
    uint256 public constant MIN_TIME_LOCK_PERIOD = 1 days;

    /// @notice Maximum timelock period in seconds (90 days)
    uint256 public constant MAX_TIME_LOCK_PERIOD = 90 days;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initializer for BasicAccount (top-level; sets initializing flag then delegates to Account).
     * @param initialOwner The initial owner address
     * @param broadcaster The broadcaster address
     * @param recovery The recovery address
     * @param timeLockPeriodSec The timelock period in seconds (1 day to 90 days inclusive)
     * @param eventForwarder The event forwarder address (optional)
     */
    function initialize(
        address initialOwner,
        address broadcaster,
        address recovery,
        uint256 timeLockPeriodSec,
        address eventForwarder
    ) public virtual override initializer {
        _validateTimeLockBounds(timeLockPeriodSec);
        Account.initialize(initialOwner, broadcaster, recovery, timeLockPeriodSec, eventForwarder);
    }

    /**
     * @dev Internal function to update the timelock period with validation
     * @param newTimeLockPeriodSec The new timelock period in seconds
     */
    function _updateTimeLockPeriod(uint256 newTimeLockPeriodSec) internal virtual override {
        _validateTimeLockBounds(newTimeLockPeriodSec);
        super._updateTimeLockPeriod(newTimeLockPeriodSec);
    }

    /**
     * @dev Reverts with `InvalidTimeLockPeriod` outside [MIN_TIME_LOCK_PERIOD, MAX_TIME_LOCK_PERIOD].
     */
    function _validateTimeLockBounds(uint256 timeLockPeriodSec) internal pure {
        if (timeLockPeriodSec < MIN_TIME_LOCK_PERIOD || timeLockPeriodSec > MAX_TIME_LOCK_PERIOD) {
            revert SharedValidation.InvalidTimeLockPeriod(timeLockPeriodSec);
        }
    }
}
