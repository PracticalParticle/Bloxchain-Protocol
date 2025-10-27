// SPDX-License-Identifier: MPL-2.0
pragma solidity ^0.8.25;

import "./core/base/BaseStateMachine.sol";

/**
 * @title BareBlox
 * @dev A minimal implementation using only BaseStateMachine for core state machine functionality
 * 
 * This contract provides the most basic state abstraction implementation using only
 * the core state machine capabilities from BaseStateMachine. It includes:
 * - Basic initialization with core roles (owner, broadcaster, recovery)
 * - Time-lock period configuration
 * - Event forwarding support
 * - All core state machine functionality (meta-transactions, state queries, etc.)
 * 
 * This is the minimal viable implementation for applications that only need
 * the core state machine functionality without additional security features.
 */
contract BareBlox is BaseStateMachine {
    /**
     * @notice Initializer to initialize BareBlox
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
    ) public virtual initializer {
        _initializeBaseStateMachine(
            initialOwner,
            broadcaster,
            recovery,
            timeLockPeriodSec,
            eventForwarder      
        );
        // Add any additional initialization logic here
    }

    // Add your custom implementation here
    // All BaseStateMachine functionality is available:
    // - Meta-transaction utilities
    // - State queries (getTransactionHistory, getTransaction, etc.)
    // - Role and permission queries
    // - System state queries
    // - Centralized transaction management functions
}

