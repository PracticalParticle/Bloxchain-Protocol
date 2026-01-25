// SPDX-License-Identifier: MPL-2.0
pragma solidity 0.8.33;

// Contracts imports
import "../../lib/StateAbstraction.sol";

/**
 * @title ISecureOwnable
 * @dev Interface for SecureOwnable functionality
 * @notice This interface defines SecureOwnable-specific operations
 * @notice Note: owner(), getBroadcasters(), and getRecovery() are available through BaseStateMachine
 */
interface ISecureOwnable {
    // ============ OWNERSHIP MANAGEMENT ============

    /**
     * @dev Requests a transfer of ownership
     * @return The transaction record
     */
    function transferOwnershipRequest() external returns (StateAbstraction.TxRecord memory);

    /**
     * @dev Approves a pending ownership transfer transaction after the release time
     * @param txId The transaction ID
     * @return The updated transaction record
     */
    function transferOwnershipDelayedApproval(uint256 txId) external returns (StateAbstraction.TxRecord memory);

    /**
     * @dev Approves a pending ownership transfer transaction using a meta-transaction
     * @param metaTx The meta-transaction
     * @return The updated transaction record
     */
    function transferOwnershipApprovalWithMetaTx(StateAbstraction.MetaTransaction memory metaTx) external returns (StateAbstraction.TxRecord memory);

    /**
     * @dev Cancels a pending ownership transfer transaction
     * @param txId The transaction ID
     * @return The updated transaction record
     */
    function transferOwnershipCancellation(uint256 txId) external returns (StateAbstraction.TxRecord memory);

    /**
     * @dev Cancels a pending ownership transfer transaction using a meta-transaction
     * @param metaTx The meta-transaction
     * @return The updated transaction record
     */
    function transferOwnershipCancellationWithMetaTx(StateAbstraction.MetaTransaction memory metaTx) external returns (StateAbstraction.TxRecord memory);

    // ============ BROADCASTER MANAGEMENT ============

    /**
     * @dev Updates the broadcaster address
     * @param newBroadcaster The new broadcaster address
     * @return The transaction record
     */
    function updateBroadcasterRequest(address newBroadcaster) external returns (StateAbstraction.TxRecord memory);

    /**
     * @dev Approves a pending broadcaster update transaction after the release time
     * @param txId The transaction ID
     * @return The updated transaction record
     */
    function updateBroadcasterDelayedApproval(uint256 txId) external returns (StateAbstraction.TxRecord memory);

    /**
     * @dev Approves a pending broadcaster update transaction using a meta-transaction
     * @param metaTx The meta-transaction
     * @return The updated transaction record
     */
    function updateBroadcasterApprovalWithMetaTx(StateAbstraction.MetaTransaction memory metaTx) external returns (StateAbstraction.TxRecord memory);

    /**
     * @dev Cancels a pending broadcaster update transaction
     * @param txId The transaction ID
     * @return The updated transaction record
     */
    function updateBroadcasterCancellation(uint256 txId) external returns (StateAbstraction.TxRecord memory);

    /**
     * @dev Cancels a pending broadcaster update transaction using a meta-transaction
     * @param metaTx The meta-transaction
     * @return The updated transaction record
     */
    function updateBroadcasterCancellationWithMetaTx(StateAbstraction.MetaTransaction memory metaTx) external returns (StateAbstraction.TxRecord memory);

    // ============ RECOVERY MANAGEMENT ============

    /**
     * @dev Creates execution params for updating the recovery address
     * @param newRecoveryAddress The new recovery address
     * @return The execution params
     */
    function updateRecoveryExecutionParams(address newRecoveryAddress) external view returns (bytes memory);

    /**
     * @dev Requests and approves a recovery address update using a meta-transaction
     * @param metaTx The meta-transaction
     * @return The transaction record
     */
    function updateRecoveryRequestAndApprove(StateAbstraction.MetaTransaction memory metaTx) external returns (StateAbstraction.TxRecord memory);

    // ============ TIMELOCK MANAGEMENT ============

    /**
     * @dev Creates execution params for updating the time lock period
     * @param newTimeLockPeriodSec The new time lock period in seconds
     * @return The execution params
     */
    function updateTimeLockExecutionParams(uint256 newTimeLockPeriodSec) external view returns (bytes memory);

    /**
     * @dev Requests and approves a time lock period update using a meta-transaction
     * @param metaTx The meta-transaction
     * @return The transaction record
     */
    function updateTimeLockRequestAndApprove(StateAbstraction.MetaTransaction memory metaTx) external returns (StateAbstraction.TxRecord memory);
}
