// SPDX-License-Identifier: MPL-2.0
pragma solidity 0.8.34;

import "../execution/GuardController.sol";
import "../execution/interface/IGuardController.sol";
import "../access/RuntimeRBAC.sol";
import "../access/interface/IRuntimeRBAC.sol";
import "../security/SecureOwnable.sol";
import "../security/interface/ISecureOwnable.sol";
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
     * @dev Emitted when plain ETH is received (receive()).
     * @param sender Address that sent the ETH
     * @param value Amount of wei received
     * @custom:security Gas-efficient so receive() stays within 2,300 gas stipend (transfer/send compatible).
     */
    event EthReceived(address indexed sender, uint256 value);

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
    ) public virtual override(GuardController, RuntimeRBAC, SecureOwnable) onlyInitializing {
        GuardController.initialize(initialOwner, broadcaster, recovery, timeLockPeriodSec, eventForwarder);
        RuntimeRBAC.initialize(initialOwner, broadcaster, recovery, timeLockPeriodSec, eventForwarder);
        SecureOwnable.initialize(initialOwner, broadcaster, recovery, timeLockPeriodSec, eventForwarder);
    }

    /**
     * @dev See {IERC165-supportsInterface}.
     * @notice GuardController, RuntimeRBAC, and SecureOwnable each extend BaseStateMachine directly; a single
     *         `super` chain only walks one branch. We OR the three component interface IDs here, then delegate
     *         once to `super` for IBaseStateMachine / ERC165 — avoids tripling BaseStateMachine+ERC165 work.
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override(GuardController, RuntimeRBAC, SecureOwnable) returns (bool) {
        return interfaceId == type(IGuardController).interfaceId
            || interfaceId == type(IRuntimeRBAC).interfaceId
            || interfaceId == type(ISecureOwnable).interfaceId
            || super.supportsInterface(interfaceId);
    }

    /**
     * @dev Accepts plain ETH transfers (no calldata).
     * @notice General-use wallet: ETH can be sent naturally; balance is credited.
     * @custom:security No external calls—reentrancy-safe; outgoing ETH only via GuardController execution. Uses simple emit to stay within 2,300 gas stipend (transfer/send compatible).
     */
    receive() external payable virtual {
        emit EthReceived(msg.sender, msg.value);
    }

    /**
     * @dev Rejects calls with unknown selector (with or without value).
     * @notice Only plain transfers hit receive(); all other calls revert.
     */
    fallback() external payable virtual {
        revert SharedValidation.NotSupported();
    }
}
