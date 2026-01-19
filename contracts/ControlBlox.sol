// SPDX-License-Identifier: MPL-2.0
pragma solidity ^0.8.25;

import "./core/execution/GuardController.sol";
import "./core/access/RuntimeRBAC.sol";
import "./core/security/SecureOwnable.sol";
import "./utils/SharedValidation.sol";

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

    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override(GuardController, RuntimeRBAC, SecureOwnable) returns (bool) {
        return GuardController.supportsInterface(interfaceId) || RuntimeRBAC.supportsInterface(interfaceId) || SecureOwnable.supportsInterface(interfaceId);
    }

    /**
     * @dev Explicit deposit function for ETH deposits
     * @notice Users must call this function to deposit ETH to the contract
     * @notice Direct ETH transfers to the contract will revert (no receive() function)
     */
    event EthReceived(address indexed from, uint256 amount);
    
    function deposit() external payable {
        emit EthReceived(msg.sender, msg.value);
        // ETH is automatically added to contract balance
    }
    
    /**
     * @dev Fallback function to reject accidental calls
     * @notice Prevents accidental ETH transfers and unknown function calls
     * @notice Users must use deposit() function to send ETH
     */
    fallback() external payable {
        revert SharedValidation.NotSupported();
    }

    receive() external payable {
        revert SharedValidation.NotSupported();
    }
}


