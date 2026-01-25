// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import "../../core/execution/GuardController.sol";
import "../../core/access/RuntimeRBAC.sol";
import "../../core/security/SecureOwnable.sol";
import "../../core/hook/HookManager.sol";
import "../../core/base/BaseStateMachine.sol";
import "../../utils/SharedValidation.sol";

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

    function _requestTransaction(
        address requester,
        address target,
        uint256 value,
        uint256 gasLimit,
        bytes32 operationType,
        bytes4 functionSelector,
        bytes memory params
    ) internal virtual override(BaseStateMachine, HookManager) returns (StateAbstraction.TxRecord memory) {
        return HookManager._requestTransaction(requester, target, value, gasLimit, operationType, functionSelector, params);
    }

    function _approveTransaction(
        uint256 txId
    ) internal virtual override(BaseStateMachine, HookManager) returns (StateAbstraction.TxRecord memory) {
        return HookManager._approveTransaction(txId);
    }

    function _approveTransactionWithMetaTx(
        StateAbstraction.MetaTransaction memory metaTx
    ) internal virtual override(BaseStateMachine, HookManager) returns (StateAbstraction.TxRecord memory) {
        return HookManager._approveTransactionWithMetaTx(metaTx);
    }

    function _cancelTransaction(
        uint256 txId
    ) internal virtual override(BaseStateMachine, HookManager) returns (StateAbstraction.TxRecord memory) {
        return HookManager._cancelTransaction(txId);
    }

    function _cancelTransactionWithMetaTx(
        StateAbstraction.MetaTransaction memory metaTx
    ) internal virtual override(BaseStateMachine, HookManager) returns (StateAbstraction.TxRecord memory) {
        return HookManager._cancelTransactionWithMetaTx(metaTx);
    }

    function _requestAndApproveTransaction(
        StateAbstraction.MetaTransaction memory metaTx
    ) internal virtual override(BaseStateMachine, HookManager) returns (StateAbstraction.TxRecord memory) {
        return HookManager._requestAndApproveTransaction(metaTx);
    }

    /**
     * @dev Override to resolve ambiguity between BaseStateMachine and SecureOwnable
     * @param newTimeLockPeriodSec The new time lock period in seconds
     */
    function _updateTimeLockPeriod(uint256 newTimeLockPeriodSec) internal virtual override(BaseStateMachine, SecureOwnable) {
        SecureOwnable._updateTimeLockPeriod(newTimeLockPeriodSec);
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
