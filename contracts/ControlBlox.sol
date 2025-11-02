// SPDX-License-Identifier: MPL-2.0
pragma solidity ^0.8.25;

import "./core/execution/GuardController.sol";

/**
 * @title ControlBlox
 * @dev Minimal controller implementation using GuardController (DynamicRBAC + guarded execution)
 */
contract ControlBlox is GuardController {
    /**
     * @notice Initializer to initialize ControlBlox
     * @param initialOwner The initial owner address
     * @param broadcaster The broadcaster address
     * @param recovery The recovery address
     * @param timeLockPeriodSec The timelock period in seconds
     * @param eventForwarder The event forwarder address (optional)
     */
    function initialize(
        address initialOwner,
        address broadcaster,
        address recovery,
        uint256 timeLockPeriodSec,
        address eventForwarder
    ) public virtual override initializer {
        super.initialize(
            initialOwner,
            broadcaster,
            recovery,
            timeLockPeriodSec,
            eventForwarder
        );
    }
}


