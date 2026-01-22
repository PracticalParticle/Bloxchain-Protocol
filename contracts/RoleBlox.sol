// SPDX-License-Identifier: MPL-2.0
pragma solidity ^0.8.25;

import "./core/access/RuntimeRBAC.sol";
import "./core/security/SecureOwnable.sol";
import "./core/base/BaseStateMachine.sol";

/**
 * @title RoleBlox
 * @dev A basic implementation of state abstraction with runtime role-based access control using RuntimeRBAC and SecureOwnable
 * 
 * This contract combines both RuntimeRBAC and SecureOwnable functionality:
 * - RuntimeRBAC provides runtime role creation and management
 * - SecureOwnable provides secure ownership transfer and management
 * - Both inherit from BaseStateMachine, ensuring proper initialization order
 */
contract RoleBlox is RuntimeRBAC, SecureOwnable {
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
    ) public virtual override(RuntimeRBAC, SecureOwnable) initializer {
        // Initialize both parent contracts
        // The guarded initialization ensures BaseStateMachine is only initialized once
        RuntimeRBAC.initialize(initialOwner, broadcaster, recovery, timeLockPeriodSec, eventForwarder);
        SecureOwnable.initialize(initialOwner, broadcaster, recovery, timeLockPeriodSec, eventForwarder);
        
        // Add any RoleBlox-specific initialization logic here
    }

    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override(RuntimeRBAC, SecureOwnable) returns (bool) {
        return RuntimeRBAC.supportsInterface(interfaceId) || SecureOwnable.supportsInterface(interfaceId);
    }

    /**
     * @dev Override to resolve ambiguity between BaseStateMachine and SecureOwnable
     * @param newTimeLockPeriodSec The new time lock period in seconds
     */
    function _updateTimeLockPeriod(uint256 newTimeLockPeriodSec) internal virtual override(BaseStateMachine, SecureOwnable) {
        SecureOwnable._updateTimeLockPeriod(newTimeLockPeriodSec);
    }
}

