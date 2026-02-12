// SPDX-License-Identifier: MPL-2.0
pragma solidity 0.8.33;

import "../execution/GuardController.sol";
import "../access/RuntimeRBAC.sol";
import "../security/SecureOwnable.sol";
import "../lib/utils/SharedValidation.sol";

/**
 * @title Account
 * @dev Abstract account pattern combining GuardController, RuntimeRBAC, and SecureOwnable.
 *
 * Use this as the base for account-style contracts (e.g. AccountBlox) to avoid duplicating
 * initialization, interface support, and receive/fallback boilerplate.
 *
 * Combines:
 * - GuardController: Execution workflows and time-locked transactions
 * - RuntimeRBAC: Runtime role creation and management
 * - SecureOwnable: Secure ownership transfer and management
 *
 * @custom:security-contact security@particlecs.com
 */
abstract contract Account is GuardController, RuntimeRBAC, SecureOwnable {
    /**
     * @notice Initializer for the Account pattern (GuardController + RuntimeRBAC + SecureOwnable).
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
    receive() external payable virtual {}

    /**
     * @dev Rejects calls with unknown selector (with or without value).
     * @notice Only plain transfers hit receive(); all other calls revert.
     */
    fallback() external payable virtual {
        revert SharedValidation.NotSupported();
    }
}
