// SPDX-License-Identifier: MPL-2.0
pragma solidity 0.8.33;

import "../core/lib/EngineBlox.sol";

/**
 * @title IOnActionHook
 * @dev Minimal interface for external hook contracts attached to state machine actions.
 *
 * @notice This interface is intentionally small to keep overall contract size low.
 * @notice The state machine calls this single hook after any transaction operation that
 *         produces a TxRecord, providing a centralized post-action entry point.
 */
interface IOnActionHook {
    /**
     * @dev Called after any transaction operation that produces a TxRecord.
     *      This includes request, approve, cancel and meta-tx flows.
     * @param txRecord The transaction record produced by the operation
     */
    function onAction(EngineBlox.TxRecord memory txRecord) external;
}
