// SPDX-License-Identifier: MPL-2.0
pragma solidity ^0.8.25;

import "./core/execution/GuardController.sol";
import "./core/access/RuntimeRBAC.sol";
import "./core/security/SecureOwnable.sol";

/**
 * @title ControlBlox
 * @dev Complete controller implementation using GuardController, RuntimeRBAC, and SecureOwnable
 * 
 * This contract combines:
 * - GuardController: Execution workflows and time-locked transactions
 * - RuntimeRBAC: Runtime role creation and management
 * - SecureOwnable: Secure ownership transfer and management
 */
contract ControlBlox is GuardController, RuntimeRBAC, SecureOwnable {
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
    ) public virtual override(GuardController, RuntimeRBAC, SecureOwnable) initializer {
        // Initialize all parent contracts
        // The guarded initialization ensures BaseStateMachine is only initialized once
        GuardController.initialize(initialOwner, broadcaster, recovery, timeLockPeriodSec, eventForwarder);
        RuntimeRBAC.initialize(initialOwner, broadcaster, recovery, timeLockPeriodSec, eventForwarder);
        SecureOwnable.initialize(initialOwner, broadcaster, recovery, timeLockPeriodSec, eventForwarder);
    }
}


