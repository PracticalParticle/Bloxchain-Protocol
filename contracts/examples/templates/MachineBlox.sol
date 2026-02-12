// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import "../../core/pattern/Account.sol";
import "../../core/base/BaseStateMachine.sol";
import "../../experimental/hook/HookManager.sol";
import "../../core/lib/utils/SharedValidation.sol";

/**
 * @title MachineBlox
 * @dev Complete controller implementation with hook management capabilities.
 *
 * Extends the Account pattern with:
 * - HookManager: External hook contract attachment for state machine actions
 *
 * ETH handling: direct receive is disabled; use deposit() to credit ETH.
 */
contract MachineBlox is Account, HookManager {
    /**
     * @notice Initializer to initialize MachineBlox (Account + HookManager).
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
    ) public virtual override(Account) initializer {
        Account.initialize(initialOwner, broadcaster, recovery, timeLockPeriodSec, eventForwarder);
    }

    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override(Account, BaseStateMachine) returns (bool) {
        return Account.supportsInterface(interfaceId) || BaseStateMachine.supportsInterface(interfaceId);
    }

    /**
     * @dev Resolve ambiguity between BaseStateMachine and HookManager for post-action hook.
     *      Ensures HookManager's external hook execution is wired into the unified
     *      BaseStateMachine post-transaction entry point.
     */
    function _postActionHook(
        EngineBlox.TxRecord memory txRecord
    ) internal virtual override(BaseStateMachine, HookManager) {
        HookManager._postActionHook(txRecord);
    }

    /**
     * @dev Explicit deposit function for ETH deposits.
     * @notice Users must call this function to deposit ETH to the contract.
     * @notice Direct ETH transfers to the contract will revert (receive/fallback revert).
     */
    event EthReceived(address indexed from, uint256 amount);

    function deposit() external payable {
        emit EthReceived(msg.sender, msg.value);
    }

    /**
     * @dev Override Account's receive to reject direct ETH; use deposit() instead.
     */
    receive() external payable override {
        revert SharedValidation.NotSupported();
    }

    /**
     * @dev Override Account's fallback (same behavior: reject).
     */
    fallback() external payable override {
        revert SharedValidation.NotSupported();
    }
}
