// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import "../../core/execution/GuardController.sol";
import "../../core/access/RuntimeRBAC.sol";
import "../../core/security/SecureOwnable.sol";
import "../../experimental/hook/HookManager.sol";
import "../../core/base/BaseStateMachine.sol";
import "../../core/lib/utils/SharedValidation.sol";

/**
 * @title MachineBlox
 * @dev Complete controller implementation with hook management capabilities
 * 
 * This contract combines:
 * - GuardController: Execution workflows and time-locked transactions
 * - RuntimeRBAC: Runtime role creation and management
 * - SecureOwnable: Secure ownership transfer and management
 * - HookManager: External hook contract attachment for state machine actions
 */
contract MachineBlox is GuardController, RuntimeRBAC, SecureOwnable, HookManager {
    /**
     * @notice Initializer to initialize MachineBlox
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
    function supportsInterface(bytes4 interfaceId) public view virtual override(GuardController, RuntimeRBAC, SecureOwnable, BaseStateMachine) returns (bool) {
        return GuardController.supportsInterface(interfaceId) || RuntimeRBAC.supportsInterface(interfaceId) || SecureOwnable.supportsInterface(interfaceId);
    }

    // ============ INTERNAL FUNCTION OVERRIDES ============
    // These overrides resolve conflicts by ensuring HookManager's hook execution is called

    /**
     * @dev Resolve ambiguity between BaseStateMachine and HookManager for post-action hook.
     *      This ensures HookManager's external hook execution is wired into the unified
     *      BaseStateMachine post-transaction entry point.
     */
    function _postActionHook(
        EngineBlox.TxRecord memory txRecord
    ) internal virtual override(BaseStateMachine, HookManager) {
        HookManager._postActionHook(txRecord);
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
