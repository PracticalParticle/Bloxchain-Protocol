// SPDX-License-Identifier: MPL-2.0
pragma solidity ^0.8.25;

import "../../lib/StateAbstraction.sol";

/**
 * @title IGuardController
 * @dev Interface for GuardController contract that GuardianSafeV3 and other contracts delegate to
 * @notice This interface defines only GuardController-specific methods
 * @notice Functions from BaseStateMachine (createMetaTxParams, generateUnsignedMetaTransaction*, getTransaction, functionSchemaExists, owner, getBroadcaster, getRecovery) should be accessed via IBaseStateMachine
 * @notice Functions from RuntimeRBAC (registerFunction, unregisterFunction, getFunctionSchema, createNewRole, addWalletToRole, revokeWallet) should be accessed via IRuntimeRBAC
 * @custom:security-contact security@particlecrypto.com
 */
interface IGuardController {
    /**
     * @notice Initializer to initialize GuardController
     * @param initialOwner The initial owner address
     * @param broadcaster The broadcaster address
     * @param recovery The recovery address
     * @param timeLockPeriodSec The timelock period in seconds
     * @param eventForwarder The event forwarder address
     */
    function initialize(
        address initialOwner,
        address broadcaster,
        address recovery,
        uint256 timeLockPeriodSec,
        address eventForwarder
    ) external;

    /**
     * @dev Requests a time-locked execution via StateAbstraction workflow
     * @param target The address of the target contract
     * @param value The ETH value to send (0 for standard function calls)
     * @param functionSelector The function selector to execute (0x00000000 for simple ETH transfers)
     * @param params The encoded parameters for the function (empty for simple ETH transfers)
     * @param gasLimit The gas limit for execution
     * @param operationType The operation type hash
     * @return txId The transaction ID for the requested operation
     * @notice Creates a time-locked transaction that must be approved after the timelock period
     * @notice Requires EXECUTE_TIME_DELAY_REQUEST permission for the function selector
     * @notice For standard function calls: value=0, functionSelector=non-zero, params=encoded data
     * @notice For simple ETH transfers: value>0, functionSelector=0x00000000, params=""
     */
    function executeWithTimeLock(
        address target,
        uint256 value,
        bytes4 functionSelector,
        bytes memory params,
        uint256 gasLimit,
        bytes32 operationType
    ) external returns (uint256 txId);

    /**
     * @dev Approves and executes a time-locked transaction
     * @param txId The transaction ID
     * @param expectedOperationType The expected operation type for validation
     * @return result The execution result
     * @notice Requires STANDARD execution type and EXECUTE_TIME_DELAY_APPROVE permission for the execution function
     */
    function approveTimeLockExecution(
        uint256 txId,
        bytes32 expectedOperationType
    ) external returns (bytes memory result);

    /**
     * @dev Cancels a time-locked transaction
     * @param txId The transaction ID
     * @param expectedOperationType The expected operation type for validation
     * @return The updated transaction record
     * @notice Requires STANDARD execution type and EXECUTE_TIME_DELAY_CANCEL permission for the execution function
     */
    function cancelTimeLockExecution(
        uint256 txId,
        bytes32 expectedOperationType
    ) external returns (StateAbstraction.TxRecord memory);

    /**
     * @dev Approves a time-locked transaction using a meta-transaction
     * @param metaTx The meta-transaction containing the transaction record and signature
     * @param expectedOperationType The expected operation type for validation
     * @param requiredSelector The handler selector for validation
     * @return The updated transaction record
     * @notice Requires STANDARD execution type and EXECUTE_META_APPROVE permission for the execution function
     */
    function approveTimeLockExecutionWithMetaTx(
        StateAbstraction.MetaTransaction memory metaTx,
        bytes32 expectedOperationType,
        bytes4 requiredSelector
    ) external returns (StateAbstraction.TxRecord memory);

    /**
     * @dev Cancels a time-locked transaction using a meta-transaction
     * @param metaTx The meta-transaction containing the transaction record and signature
     * @param expectedOperationType The expected operation type for validation
     * @param requiredSelector The handler selector for validation
     * @return The updated transaction record
     * @notice Requires STANDARD execution type and EXECUTE_META_CANCEL permission for the execution function
     */
    function cancelTimeLockExecutionWithMetaTx(
        StateAbstraction.MetaTransaction memory metaTx,
        bytes32 expectedOperationType,
        bytes4 requiredSelector
    ) external returns (StateAbstraction.TxRecord memory);

    /**
     * @dev Requests and approves a transaction in one step using a meta-transaction
     * @param metaTx The meta-transaction containing the transaction record and signature
     * @param requiredSelector The handler selector for validation
     * @return The transaction record after request and approval
     * @notice Requires STANDARD execution type
     * @notice Validates function schema and permissions for the execution function (same as executeWithTimeLock)
     * @notice Requires EXECUTE_META_REQUEST_AND_APPROVE permission for the execution function selector
     */
    function requestAndApproveExecution(
        StateAbstraction.MetaTransaction memory metaTx,
        bytes4 requiredSelector
    ) external returns (StateAbstraction.TxRecord memory);
}

