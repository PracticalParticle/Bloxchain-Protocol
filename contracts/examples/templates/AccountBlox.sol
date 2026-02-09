// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import "../../core/execution/GuardController.sol";
import "../../core/access/RuntimeRBAC.sol";
import "../../core/security/SecureOwnable.sol";
import "../../core/base/BaseStateMachine.sol";
import "../../utils/SharedValidation.sol";

/**
 * @title AccountBlox
 * @dev Complete controller implementation using GuardController, RuntimeRBAC, and SecureOwnable
 * 
 * This contract combines:
 * - GuardController: Execution workflows and time-locked transactions
 * - RuntimeRBAC: Runtime role creation and management
 * - SecureOwnable: Secure ownership transfer and management
 */
contract AccountBlox is GuardController, RuntimeRBAC, SecureOwnable {
    /**
     * @notice Initializer to initialize AccountBlox
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
     * @dev Accepts plain ETH transfers (no calldata).
     * @notice General-use wallet: ETH can be sent naturally; balance is credited.
     * @custom:security No external calls—reentrancy-safe; outgoing ETH only via GuardController execution.
     */
    receive() external payable {}

    /**
     * @dev Rejects calls with unknown selector (with or without value).
     * @notice Only plain transfers hit receive(); all other calls revert.
     */
    fallback() external payable {
        revert SharedValidation.NotSupported();
    }
}


