// SPDX-License-Identifier: MPL-2.0
pragma solidity 0.8.33;

import "../core/lib/StateAbstraction.sol";

/**
 * @title IOnActionHook
 * @dev Minimal interface for external hook contracts attached to state machine actions
 *
 * @notice This interface is intentionally small to keep overall contract size low.
 * @notice Implementations can choose which functions to support; unneeded ones can revert.
 */
interface IOnActionHook {
    /**
     * @dev Called after a transaction request is created
     * @param txRecord The created transaction record
     * @param caller The address that initiated the request
     */
    function onRequest(
        StateAbstraction.TxRecord memory txRecord,
        address caller
    ) external;

    /**
     * @dev Called after a pending transaction is approved (time-lock flow)
     * @param txRecord The updated transaction record
     * @param caller The address that approved the transaction
     */
    function onApprove(
        StateAbstraction.TxRecord memory txRecord,
        address caller
    ) external;

    /**
     * @dev Called after a pending transaction is cancelled
     * @param txRecord The updated transaction record
     * @param caller The address that cancelled the transaction
     */
    function onCancel(
        StateAbstraction.TxRecord memory txRecord,
        address caller
    ) external;

    /**
     * @dev Called after a transaction is approved via meta-transaction
     * @param txRecord The updated transaction record
     * @param metaTx The meta-transaction used for approval
     * @param caller The address executing the meta-transaction
     */
    function onMetaApprove(
        StateAbstraction.TxRecord memory txRecord,
        StateAbstraction.MetaTransaction memory metaTx,
        address caller
    ) external;

    /**
     * @dev Called after a transaction is cancelled via meta-transaction
     * @param txRecord The updated transaction record
     * @param metaTx The meta-transaction used for cancellation
     * @param caller The address executing the meta-transaction
     */
    function onMetaCancel(
        StateAbstraction.TxRecord memory txRecord,
        StateAbstraction.MetaTransaction memory metaTx,
        address caller
    ) external;

    /**
     * @dev Called after a transaction is requested and approved in one step via meta-transaction
     * @param txRecord The created + approved transaction record
     * @param metaTx The meta-transaction used for the operation
     * @param caller The address executing the meta-transaction
     */
    function onRequestAndApprove(
        StateAbstraction.TxRecord memory txRecord,
        StateAbstraction.MetaTransaction memory metaTx,
        address caller
    ) external;
}
