// SPDX-License-Identifier: MPL-2.0
pragma solidity 0.8.34;

import "../../../contracts/core/pattern/Account.sol";

/**
 * @title AccountPatternTest
 * @dev Same Account stack and `initialize` entrypoint as `AccountBlox`, for Foundry tests only
 *      (avoids pulling the example contract into every test build graph when not needed).
 */
contract AccountPatternTest is Account {
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
