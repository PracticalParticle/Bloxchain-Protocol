// SPDX-License-Identifier: MPL-2.0
pragma solidity ^0.8.2;

import "./core/access/SecureOwnable.sol";

/**
 * @title Guardian
 * @dev A basic implementation of account abstraction using SecureOwnable for secure ownership management
 */
contract Guardian is SecureOwnable {
    /**
     * @notice Initializer to initialize Guardian
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
