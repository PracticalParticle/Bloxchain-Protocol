// SPDX-License-Identifier: MPL-2.0
pragma solidity 0.8.34;

// Contracts imports
import "../../lib/EngineBlox.sol";

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
     * @return txId The transaction ID (use getTransaction(txId) for full record)
     */
    function transferOwnershipRequest() external returns (uint256 txId);

    /**
     * @dev Approves a pending ownership transfer transaction after the release time
     * @param txId The transaction ID
     * @return The transaction ID (use getTransaction(txId) for full record)
     */
    function transferOwnershipDelayedApproval(uint256 txId) external returns (uint256);

    /**
     * @dev Approves a pending ownership transfer transaction using a meta-transaction
     * @param metaTx The meta-transaction
     * @return The transaction ID (use getTransaction(txId) for full record)
     */
    function transferOwnershipApprovalWithMetaTx(EngineBlox.MetaTransaction memory metaTx) external returns (uint256);

    /**
     * @dev Cancels a pending ownership transfer transaction
     * @param txId The transaction ID
     * @return The transaction ID (use getTransaction(txId) for full record)
     */
    function transferOwnershipCancellation(uint256 txId) external returns (uint256);

    /**
     * @dev Cancels a pending ownership transfer transaction using a meta-transaction
     * @param metaTx The meta-transaction
     * @return The transaction ID (use getTransaction(txId) for full record)
     */
    function transferOwnershipCancellationWithMetaTx(EngineBlox.MetaTransaction memory metaTx) external returns (uint256);

    // ============ BROADCASTER MANAGEMENT ============

    /**
     * @dev Requests an update to the broadcaster at a specific location (index).
     * @param newBroadcaster The new broadcaster address (zero address to revoke at location)
     * @param location The index in the broadcaster role's authorized wallets set
     * @return txId The transaction ID (use getTransaction(txId) for full record)
     */
    function updateBroadcasterRequest(address newBroadcaster, uint256 location) external returns (uint256 txId);

    /**
     * @dev Approves a pending broadcaster update transaction after the release time
     * @param txId The transaction ID
     * @return The transaction ID (use getTransaction(txId) for full record)
     */
    function updateBroadcasterDelayedApproval(uint256 txId) external returns (uint256);

    /**
     * @dev Approves a pending broadcaster update transaction using a meta-transaction
     * @param metaTx The meta-transaction
     * @return The transaction ID (use getTransaction(txId) for full record)
     */
    function updateBroadcasterApprovalWithMetaTx(EngineBlox.MetaTransaction memory metaTx) external returns (uint256);

    /**
     * @dev Cancels a pending broadcaster update transaction
     * @param txId The transaction ID
     * @return The transaction ID (use getTransaction(txId) for full record)
     */
    function updateBroadcasterCancellation(uint256 txId) external returns (uint256);

    /**
     * @dev Cancels a pending broadcaster update transaction using a meta-transaction
     * @param metaTx The meta-transaction
     * @return The transaction ID (use getTransaction(txId) for full record)
     */
    function updateBroadcasterCancellationWithMetaTx(EngineBlox.MetaTransaction memory metaTx) external returns (uint256);

    // ============ RECOVERY MANAGEMENT ============

    /**
     * @dev Requests and approves a recovery address update using a meta-transaction
     * @param metaTx The meta-transaction
     * @return The transaction ID (use getTransaction(txId) for full record)
     */
    function updateRecoveryRequestAndApprove(EngineBlox.MetaTransaction memory metaTx) external returns (uint256);

    // ============ TIMELOCK MANAGEMENT ============

    /**
     * @dev Requests and approves a time lock period update using a meta-transaction
     * @param metaTx The meta-transaction
     * @return The transaction ID (use getTransaction(txId) for full record)
     */
    function updateTimeLockRequestAndApprove(EngineBlox.MetaTransaction memory metaTx) external returns (uint256);
}
