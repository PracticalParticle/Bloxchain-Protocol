// SPDX-License-Identifier: MPL-2.0
pragma solidity ^0.8.26;

import "./core/access/DynamicRBAC.sol";

/**
 * @title GuardianWithRoles
 * @dev A basic implementation of state abstraction with dynamic role-based access control using DynamicRBAC
 */
contract GuardianWithRoles is DynamicRBAC {
    /**
     * @notice Initializer to initialize GuardianWithRoles
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
        // add your initialization logic here
    }

    // add your implementation here
}
