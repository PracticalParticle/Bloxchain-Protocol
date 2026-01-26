// SPDX-License-Identifier: MPL-2.0
pragma solidity 0.8.33;

// Contracts imports
import "../../lib/EngineBlox.sol";

/**
 * @title IBaseStateMachine
 * @dev Interface for BaseStateMachine functionality
 */
interface IBaseStateMachine {
    // ============ CORE TRANSACTION MANAGEMENT ============
    
    /**
     * @dev Creates meta-transaction parameters with specified values
     * @param handlerContract The contract that will handle the meta-transaction
     * @param handlerSelector The function selector for the handler
     * @param action The transaction action type
     * @param deadline The timestamp after which the meta-transaction expires
     * @param maxGasPrice The maximum gas price allowed for execution
     * @param signer The address that will sign the meta-transaction
     * @return The formatted meta-transaction parameters
     */
    function createMetaTxParams(
        address handlerContract,
        bytes4 handlerSelector,
        EngineBlox.TxAction action,
        uint256 deadline,
        uint256 maxGasPrice,
        address signer
    ) external view returns (EngineBlox.MetaTxParams memory);

    /**
     * @dev Generates an unsigned meta-transaction for a new operation
     * @param requester The address requesting the operation
     * @param target The target contract address
     * @param value The ETH value to send
     * @param gasLimit The gas limit for execution
     * @param operationType The type of operation
     * @param executionSelector The function selector to execute (0x00000000 for simple ETH transfers)
     * @param executionParams The encoded parameters for the function (empty for simple ETH transfers)
     * @param metaTxParams The meta-transaction parameters
     * @return The unsigned meta-transaction
     */
    function generateUnsignedMetaTransactionForNew(
        address requester,
        address target,
        uint256 value,
        uint256 gasLimit,
        bytes32 operationType,
        bytes4 executionSelector,
        bytes memory executionParams,
        EngineBlox.MetaTxParams memory metaTxParams
    ) external view returns (EngineBlox.MetaTransaction memory);

    /**
     * @dev Generates an unsigned meta-transaction for an existing transaction
     * @param txId The ID of the existing transaction
     * @param metaTxParams The meta-transaction parameters
     * @return The unsigned meta-transaction
     */
    function generateUnsignedMetaTransactionForExisting(
        uint256 txId,
        EngineBlox.MetaTxParams memory metaTxParams
    ) external view returns (EngineBlox.MetaTransaction memory);

    // ============ STATE QUERIES ============

    /**
     * @dev Gets transaction history within a specified range
     * @param fromTxId The starting transaction ID (inclusive)
     * @param toTxId The ending transaction ID (inclusive)
     * @return The transaction history within the specified range
     */
    function getTransactionHistory(uint256 fromTxId, uint256 toTxId) external view returns (EngineBlox.TxRecord[] memory);

    /**
     * @dev Gets a transaction by ID
     * @param txId The transaction ID
     * @return The transaction record
     */
    function getTransaction(uint256 txId) external view returns (EngineBlox.TxRecord memory);

    /**
     * @dev Gets all pending transaction IDs
     * @return Array of pending transaction IDs
     */
    function getPendingTransactions() external view returns (uint256[] memory);

    // ============ ROLE AND PERMISSION QUERIES ============

    /**
     * @dev Returns if a wallet is authorized for a role
     * @param roleHash The hash of the role to check
     * @param wallet The wallet address to check
     * @return True if the wallet is authorized for the role, false otherwise
     */
    function hasRole(bytes32 roleHash, address wallet) external view returns (bool);

    /**
     * @dev Returns if an action is supported by a function
     * @param functionSelector The function selector to check
     * @param action The action to check
     * @return True if the action is supported by the function, false otherwise
     */
    function isActionSupportedByFunction(bytes4 functionSelector, EngineBlox.TxAction action) external view returns (bool);

    /**
     * @dev Gets the function permissions for a specific role
     * @param roleHash The hash of the role to get permissions for
     * @return The function permissions array for the role
     */
    function getActiveRolePermissions(bytes32 roleHash) external view returns (EngineBlox.FunctionPermission[] memory);

    /**
     * @dev Gets the current nonce for a specific signer
     * @param signer The address of the signer
     * @return The current nonce for the signer
     */
    function getSignerNonce(address signer) external view returns (uint256);

    // ============ SYSTEM STATE QUERIES ============

    /**
     * @dev Returns the supported operation types
     * @return The supported operation types
     */
    function getSupportedOperationTypes() external view returns (bytes32[] memory);

    /**
     * @dev Returns the supported roles list
     * @return The supported roles list
     */
    function getSupportedRoles() external view returns (bytes32[] memory);

    /**
     * @dev Returns the supported functions list
     * @return The supported functions list
     */
    function getSupportedFunctions() external view returns (bytes4[] memory);

    /**
     * @dev Returns the time lock period
     * @return The time lock period in seconds
     */
    function getTimeLockPeriodSec() external view returns (uint256);

    /**
     * @dev Returns whether the contract is initialized
     * @return bool True if the contract is initialized, false otherwise
     */
    function initialized() external view returns (bool);
}
