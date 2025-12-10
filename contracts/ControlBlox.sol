// SPDX-License-Identifier: MPL-2.0
pragma solidity ^0.8.25;

import "./core/execution/GuardController.sol";
import "./core/access/DynamicRBAC.sol";
import "./core/access/SecureOwnable.sol";

/**
 * @title ControlBlox
 * @dev Complete controller implementation using GuardController, DynamicRBAC, and SecureOwnable
 * 
 * This contract combines:
 * - GuardController: Execution workflows and time-locked transactions
 * - DynamicRBAC: Dynamic role creation and management
 * - SecureOwnable: Secure ownership transfer and management
 */
contract ControlBlox is GuardController, DynamicRBAC, SecureOwnable {
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
    ) public virtual override(DynamicRBAC, SecureOwnable) initializer {
        // Initialize both parent contracts
        // The guarded initialization ensures BaseStateMachine is only initialized once
        DynamicRBAC.initialize(initialOwner, broadcaster, recovery, timeLockPeriodSec, eventForwarder);
        SecureOwnable.initialize(initialOwner, broadcaster, recovery, timeLockPeriodSec, eventForwarder);
        
        // GuardController doesn't need initialization as it only provides execution functions
    }
}


