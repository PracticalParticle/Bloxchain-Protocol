// SPDX-License-Identifier: MPL-2.0
pragma solidity ^0.8.25;

import "./core/access/DynamicRBAC.sol";
import "./core/security/SecureOwnable.sol";

/**
 * @title RoleBlox
 * @dev A basic implementation of state abstraction with dynamic role-based access control using DynamicRBAC and SecureOwnable
 * 
 * This contract combines both DynamicRBAC and SecureOwnable functionality:
 * - DynamicRBAC provides dynamic role creation and management
 * - SecureOwnable provides secure ownership transfer and management
 * - Both inherit from BaseStateMachine, ensuring proper initialization order
 */
contract RoleBlox is DynamicRBAC, SecureOwnable {
    /**
     * @notice Initializer to initialize RoleBlox
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
    ) public virtual override(DynamicRBAC, SecureOwnable) initializer {
        // Initialize both parent contracts
        // The guarded initialization ensures BaseStateMachine is only initialized once
        DynamicRBAC.initialize(initialOwner, broadcaster, recovery, timeLockPeriodSec, eventForwarder);
        SecureOwnable.initialize(initialOwner, broadcaster, recovery, timeLockPeriodSec, eventForwarder);
        
        // Add any RoleBlox-specific initialization logic here
    }

    // add your implementation here
}

