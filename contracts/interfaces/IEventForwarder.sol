// SPDX-License-Identifier: MPL-2.0
pragma solidity ^0.8.25;

// Import TxRecord struct from StateAbstraction
import "../lib/StateAbstraction.sol";

/**
 * @title IEventForwarder
 * @dev Interface for the event forwarder contract
 * 
 * This interface defines the contract for forwarding events from deployed instances
 * to a centralized event monitoring system. It uses function selectors for efficient
 * event identification and categorization.
 */
interface IEventForwarder {
    /**
     * @dev Forward a transaction event from a deployed instance
     * @param txId The transaction ID
     * @param functionSelector The function selector for the event (bytes4)
     * @param status The transaction status
     * @param requester The address of the requester
     * @param target The target contract address
     * @param operationType The type of operation
     */
    function forwardTxEvent(
        uint256 txId,
        bytes4 functionSelector,
        StateAbstraction.TxStatus status,
        address requester,
        address target,
        bytes32 operationType
    ) external;
}
