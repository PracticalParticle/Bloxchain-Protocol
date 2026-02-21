// SPDX-License-Identifier: MPL-2.0
pragma solidity 0.8.34;

import "../../lib/EngineBlox.sol";

/**
 * @title IGuardController
 * @dev Interface for GuardController contract that GuardianSafeV3 and other contracts delegate to
 * @notice This interface defines only GuardController-specific methods
 * @notice Functions from BaseStateMachine (createMetaTxParams, generateUnsignedMetaTransaction*, getTransaction, functionSchemaExists, getFunctionSchema, owner, getBroadcaster, getRecovery) should be accessed via IBaseStateMachine
 * @notice Functions from RuntimeRBAC (registerFunction, unregisterFunction, createNewRole, addWalletToRole, revokeWallet) should be accessed via IRuntimeRBAC
 * @custom:security-contact security@particlecrypto.com
 */
interface IGuardController {
    /**
     * @dev Action types for batched Guard configuration
     */
    enum GuardConfigActionType {
        ADD_TARGET_TO_WHITELIST,
        REMOVE_TARGET_FROM_WHITELIST,
        REGISTER_FUNCTION,
        UNREGISTER_FUNCTION
    }

    /**
     * @dev Encodes a single Guard configuration action in a batch
     */
    struct GuardConfigAction {
        GuardConfigActionType actionType;
        bytes data;
    }

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
     * @dev Requests a time-locked execution via EngineBlox workflow
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
     * @dev Requests a time-locked execution with payment details attached (same permissions as executeWithTimeLock)
     * @param target The address of the target contract
     * @param value The ETH value to send (0 for standard function calls)
     * @param functionSelector The function selector to execute (NATIVE_TRANSFER_SELECTOR for simple native token transfers)
     * @param params The encoded parameters for the function (empty for simple native token transfers)
     * @param gasLimit The gas limit for execution
     * @param operationType The operation type hash
     * @param paymentDetails The payment details to attach to the transaction
     * @return txId The transaction ID for the requested operation (use getTransaction(txId) for full record)
     * @notice Reuses EXECUTE_TIME_DELAY_REQUEST permission; approval/cancel same as executeWithTimeLock
     */
    function executeWithPayment(
        address target,
        uint256 value,
        bytes4 functionSelector,
        bytes memory params,
        uint256 gasLimit,
        bytes32 operationType,
        EngineBlox.PaymentDetails memory paymentDetails
    ) external returns (uint256 txId);

    /**
     * @dev Approves and executes a time-locked transaction
     * @param txId The transaction ID
     * @param expectedOperationType The expected operation type for validation
     * @return txId The transaction ID (use getTransaction(txId) for full record and result)
     * @notice Requires STANDARD execution type and EXECUTE_TIME_DELAY_APPROVE permission for the execution function
     */
    function approveTimeLockExecution(
        uint256 txId,
        bytes32 expectedOperationType
    ) external returns (uint256);

    /**
     * @dev Cancels a time-locked transaction
     * @param txId The transaction ID
     * @param expectedOperationType The expected operation type for validation
     * @return txId The transaction ID (use getTransaction(txId) for full record)
     * @notice Requires STANDARD execution type and EXECUTE_TIME_DELAY_CANCEL permission for the execution function
     */
    function cancelTimeLockExecution(
        uint256 txId,
        bytes32 expectedOperationType
    ) external returns (uint256);

    /**
     * @dev Approves a time-locked transaction using a meta-transaction
     * @param metaTx The meta-transaction containing the transaction record and signature
     * @param expectedOperationType The expected operation type for validation
     * @param requiredSelector The handler selector for validation
     * @return The transaction ID (use getTransaction(txId) for full record)
     * @notice Requires STANDARD execution type and EXECUTE_META_APPROVE permission for the execution function
     */
    function approveTimeLockExecutionWithMetaTx(
        EngineBlox.MetaTransaction memory metaTx,
        bytes32 expectedOperationType,
        bytes4 requiredSelector
    ) external returns (uint256);

    /**
     * @dev Cancels a time-locked transaction using a meta-transaction
     * @param metaTx The meta-transaction containing the transaction record and signature
     * @param expectedOperationType The expected operation type for validation
     * @param requiredSelector The handler selector for validation
     * @return The transaction ID (use getTransaction(txId) for full record)
     * @notice Requires STANDARD execution type and EXECUTE_META_CANCEL permission for the execution function
     */
    function cancelTimeLockExecutionWithMetaTx(
        EngineBlox.MetaTransaction memory metaTx,
        bytes32 expectedOperationType,
        bytes4 requiredSelector
    ) external returns (uint256);

    /**
     * @dev Requests and approves a transaction in one step using a meta-transaction
     * @param metaTx The meta-transaction containing the transaction record and signature
     * @param requiredSelector The handler selector for validation
     * @return The transaction ID (use getTransaction(txId) for full record)
     * @notice Requires STANDARD execution type
     * @notice Validates function schema and permissions for the execution function (same as executeWithTimeLock)
     * @notice Requires EXECUTE_META_REQUEST_AND_APPROVE permission for the execution function selector
     */
    function requestAndApproveExecution(
        EngineBlox.MetaTransaction memory metaTx,
        bytes4 requiredSelector
    ) external returns (uint256);
}

