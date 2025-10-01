// SPDX-License-Identifier: MPL-2.0
pragma solidity ^0.8.25;

// OpenZeppelin imports
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

// Contracts imports
import "../../lib/StateAbstraction.sol";
import "../../lib/definitions/StateAbstractionDefinitions.sol";
import "../../interfaces/IDefinition.sol";
import "../../utils/SharedValidation.sol";

/**
 * @title BaseStateMachine
 * @dev Core state machine functionality for secure multi-phase operations
 *
 * This contract provides the foundational state machine capabilities that can be extended
 * by security-specific contracts. It handles:
 * - State initialization and management
 * - Meta-transaction utilities and parameter creation
 * - State queries and transaction history
 * - Role-based access control queries
 * - System state information
 *
 * The contract is designed to be inherited by security-specific contracts that implement
 * their own operation types and business logic while leveraging the core state machine.
 * Implementing contracts can call StateAbstraction library functions directly for
 * transaction management operations.
 *
 * Key Features:
 * - State initialization with role and permission setup
 * - Meta-transaction parameter creation and generation
 * - Comprehensive state queries and transaction history
 * - Role and permission validation utilities
 * - System configuration queries
 * - Event forwarding for external monitoring
 */
abstract contract BaseStateMachine is Initializable, ERC165Upgradeable {
    using StateAbstraction for StateAbstraction.SecureOperationState;
    using SharedValidation for *;

    StateAbstraction.SecureOperationState internal _secureState;

    // Events for core state machine operations
    event TransactionRequested(
        uint256 indexed txId,
        address indexed requester,
        bytes32 indexed operationType,
        uint256 releaseTime
    );
    
    event TransactionApproved(
        uint256 indexed txId,
        bytes32 indexed operationType,
        address indexed approver
    );
    
    event TransactionCancelled(
        uint256 indexed txId,
        bytes32 indexed operationType,
        address indexed canceller
    );
    
    event TransactionExecuted(
        uint256 indexed txId,
        bytes32 indexed operationType,
        bool success
    );

    /**
     * @notice Initializes the base state machine core
     * @param initialOwner The initial owner address
     * @param broadcaster The broadcaster address
     * @param recovery The recovery address
     * @param timeLockPeriodSec The timelock period in seconds
     * @param eventForwarder The event forwarder address
     */
    function _initializeBaseStateMachine(
        address initialOwner,
        address broadcaster,
        address recovery,
        uint256 timeLockPeriodSec,
        address eventForwarder
    ) internal onlyInitializing {
        __ERC165_init();
        
        _secureState.initialize(initialOwner, broadcaster, recovery, timeLockPeriodSec);
        
        // Load base state machine definitions
        IDefinition.RolePermission memory multiPhasePermissions = StateAbstractionDefinitions.getRolePermissions();
        StateAbstraction.loadDefinitions(
            _secureState,
            StateAbstractionDefinitions.getFunctionSchemas(),
            multiPhasePermissions.roleHashes,
            multiPhasePermissions.functionPermissions
        );

        _secureState.setEventForwarder(eventForwarder);
    }

    // ============ TRANSACTION MANAGEMENT ============

    /**
     * @dev Centralized function to request a standard transaction with common validation
     * @param requester The address requesting the transaction
     * @param operationType The type of operation
     * @param functionSelector The function selector for execution options
     * @param params The encoded parameters for the function
     * @return The created transaction record
     */
    function _requestStandardTransaction(
        address requester,
        address target,
        uint256 gasLimit,
        bytes32 operationType,
        bytes4 functionSelector,
        bytes memory params
    ) internal returns (StateAbstraction.TxRecord memory) {
        bytes memory executionOptions = StateAbstraction.createStandardExecutionOptions(
            functionSelector,
            params
        );

        return StateAbstraction.txRequest(
            _getSecureState(),
            requester,
            target,
            0, // value is always 0 for standard execution
            gasLimit,
            operationType,
            StateAbstraction.ExecutionType.STANDARD,
            executionOptions
        );
    }

    /**
     * @dev Centralized function to request a raw transaction with RAW execution type
     * @param requester The address requesting the transaction
     * @param target The target contract address
     * @param gasLimit The gas limit for execution
     * @param operationType The type of operation
     * @param rawTxData The raw transaction data
     * @return The created transaction record
     */
    function _requestRawTransaction(
        address requester,
        address target,
        uint256 gasLimit,
        bytes32 operationType,
        bytes memory rawTxData
    ) internal returns (StateAbstraction.TxRecord memory) {
        bytes memory executionOptions = StateAbstraction.createRawExecutionOptions(rawTxData);

        return StateAbstraction.txRequest(
            _getSecureState(),
            requester,
            target,
            0, // value is always 0 for raw execution
            gasLimit,
            operationType,
            StateAbstraction.ExecutionType.RAW,
            executionOptions
        );
    }

    /**
     * @dev Centralized function to request a simple transaction with NONE execution type
     * @param requester The address requesting the transaction
     * @param target The target contract address
     * @param value The ETH value to send
     * @param gasLimit The gas limit for execution
     * @param operationType The type of operation
     * @return The created transaction record
     */
    function _requestSimpleTransaction(
        address requester,
        address target,
        uint256 value,
        uint256 gasLimit,
        bytes32 operationType
    ) internal returns (StateAbstraction.TxRecord memory) {
        return StateAbstraction.txRequest(
            _getSecureState(),
            requester,
            target,
            value,
            gasLimit,
            operationType,
            StateAbstraction.ExecutionType.NONE,
            ""
        );
    }

    /**
     * @dev Centralized function to approve a pending transaction after release time
     * @param txId The transaction ID
     * @param expectedOperationType The expected operation type for validation
     * @return The updated transaction record
     */
    function _approveTransaction(
        uint256 txId,
        bytes32 expectedOperationType
    ) internal returns (StateAbstraction.TxRecord memory) {
        StateAbstraction.TxRecord memory updatedRecord = StateAbstraction.txDelayedApproval(_getSecureState(), txId);
        SharedValidation.validateOperationTypeInternal(updatedRecord.params.operationType, expectedOperationType);
        return updatedRecord;
    }

    /**
     * @dev Centralized function to approve a transaction using meta-transaction
     * @param metaTx The meta-transaction
     * @param expectedOperationType The expected operation type for validation
     * @param requiredSelector The required handler selector for validation
     * @param requiredAction The required action for permission checking
     * @return The updated transaction record
     */
    function _approveTransactionWithMetaTx(
        StateAbstraction.MetaTransaction memory metaTx,
        bytes32 expectedOperationType,
        bytes4 requiredSelector,
        StateAbstraction.TxAction requiredAction
    ) internal returns (StateAbstraction.TxRecord memory) {
        if (!_hasActionPermission(msg.sender, requiredSelector, requiredAction)) {
            revert SharedValidation.NoPermission(msg.sender);
        }
        SharedValidation.validateHandlerSelectorMatchInternal(metaTx.params.handlerSelector, requiredSelector);
        StateAbstraction.TxRecord memory updatedRecord = StateAbstraction.txApprovalWithMetaTx(_getSecureState(), metaTx);
        SharedValidation.validateOperationTypeInternal(updatedRecord.params.operationType, expectedOperationType);
        return updatedRecord;
    }

    /**
     * @dev Centralized function to cancel a pending transaction
     * @param txId The transaction ID
     * @param expectedOperationType The expected operation type for validation
     * @return The updated transaction record
     */
    function _cancelTransaction(
        uint256 txId,
        bytes32 expectedOperationType
    ) internal returns (StateAbstraction.TxRecord memory) {
        StateAbstraction.TxRecord memory updatedRecord = StateAbstraction.txCancellation(_getSecureState(), txId);
        SharedValidation.validateOperationTypeInternal(updatedRecord.params.operationType, expectedOperationType);
        return updatedRecord;
    }

    /**
     * @dev Centralized function to cancel a transaction using meta-transaction
     * @param metaTx The meta-transaction
     * @param expectedOperationType The expected operation type for validation
     * @param requiredSelector The required handler selector for validation
     * @param requiredAction The required action for permission checking
     * @return The updated transaction record
     */
    function _cancelTransactionWithMetaTx(
        StateAbstraction.MetaTransaction memory metaTx,
        bytes32 expectedOperationType,
        bytes4 requiredSelector,
        StateAbstraction.TxAction requiredAction
    ) internal returns (StateAbstraction.TxRecord memory) {
        if (!_hasActionPermission(msg.sender, requiredSelector, requiredAction)) {
            revert SharedValidation.NoPermission(msg.sender);
        }
        SharedValidation.validateHandlerSelectorMatchInternal(metaTx.params.handlerSelector, requiredSelector);
        StateAbstraction.TxRecord memory updatedRecord = StateAbstraction.txCancellationWithMetaTx(_getSecureState(), metaTx);
        SharedValidation.validateOperationTypeInternal(updatedRecord.params.operationType, expectedOperationType);
        return updatedRecord;
    }

    /**
     * @dev Centralized function to request and approve a transaction using meta-transaction
     * @param metaTx The meta-transaction
     * @param requiredSelector The required handler selector for validation
     * @param requiredAction The required action for permission checking
     * @return The transaction record
     */
    function _requestAndApproveTransaction(
        StateAbstraction.MetaTransaction memory metaTx,
        bytes4 requiredSelector,
        StateAbstraction.TxAction requiredAction
    ) internal returns (StateAbstraction.TxRecord memory) {
        if (!_hasActionPermission(msg.sender, requiredSelector, requiredAction)) {
            revert SharedValidation.NoPermission(msg.sender);
        }
        return StateAbstraction.requestAndApprove(_getSecureState(), metaTx);
    }

    // ============ META-TRANSACTION UTILITIES ============

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
        StateAbstraction.TxAction action,
        uint256 deadline,
        uint256 maxGasPrice,
        address signer
    ) public view returns (StateAbstraction.MetaTxParams memory) {
        return StateAbstraction.createMetaTxParams(
            handlerContract,
            handlerSelector,
            action,
            deadline,
            maxGasPrice,
            signer
        );
    }

    /**
     * @dev Generates an unsigned meta-transaction for a new operation
     * @param requester The address requesting the operation
     * @param target The target contract address
     * @param value The ETH value to send
     * @param gasLimit The gas limit for execution
     * @param operationType The type of operation
     * @param executionType The type of execution (STANDARD or RAW)
     * @param executionOptions The encoded execution options
     * @param metaTxParams The meta-transaction parameters
     * @return The unsigned meta-transaction
     */
    function generateUnsignedMetaTransactionForNew(
        address requester,
        address target,
        uint256 value,
        uint256 gasLimit,
        bytes32 operationType,
        StateAbstraction.ExecutionType executionType,
        bytes memory executionOptions,
        StateAbstraction.MetaTxParams memory metaTxParams
    ) public view returns (StateAbstraction.MetaTransaction memory) {
        StateAbstraction.TxParams memory txParams = StateAbstraction.TxParams({
            requester: requester,
            target: target,
            value: value,
            gasLimit: gasLimit,
            operationType: operationType,
            executionType: executionType,
            executionOptions: executionOptions
        });

        return _secureState.generateUnsignedForNewMetaTx(txParams, metaTxParams);
    }

    /**
     * @dev Generates an unsigned meta-transaction for an existing transaction
     * @param txId The ID of the existing transaction
     * @param metaTxParams The meta-transaction parameters
     * @return The unsigned meta-transaction
     */
    function generateUnsignedMetaTransactionForExisting(
        uint256 txId,
        StateAbstraction.MetaTxParams memory metaTxParams
    ) public view returns (StateAbstraction.MetaTransaction memory) {
        return _secureState.generateUnsignedForExistingMetaTx(txId, metaTxParams);
    }

    // ============ STATE QUERIES ============

    /**
     * @dev Gets transaction history within a specified range
     * @param fromTxId The starting transaction ID (inclusive)
     * @param toTxId The ending transaction ID (inclusive)
     * @return The transaction history within the specified range
     */
    function getTransactionHistory(uint256 fromTxId, uint256 toTxId) public view returns (StateAbstraction.TxRecord[] memory) {    
        // Validate the range
        fromTxId = fromTxId > 0 ? fromTxId : 1;
        toTxId = toTxId > _secureState.txCounter ? _secureState.txCounter : toTxId;
        
        // Validate that fromTxId is less than toTxId
        SharedValidation.validateLessThan(fromTxId, toTxId);

        uint256 rangeSize = toTxId - fromTxId + 1;
        StateAbstraction.TxRecord[] memory history = new StateAbstraction.TxRecord[](rangeSize);
        
        for (uint256 i = 0; i < rangeSize; i++) {
            history[i] = _secureState.getTxRecord(fromTxId + i);
        }
        
        return history;
    }

    /**
     * @dev Gets a transaction by ID
     * @param txId The transaction ID
     * @return The transaction record
     */
    function getTransaction(uint256 txId) public view returns (StateAbstraction.TxRecord memory) {
        return _secureState.getTxRecord(txId);
    }

    /**
     * @dev Gets all pending transaction IDs
     * @return Array of pending transaction IDs
     */
    function getPendingTransactions() public view returns (uint256[] memory) {
        return _secureState.getPendingTransactionsList();
    }

    // ============ ROLE AND PERMISSION QUERIES ============

    /**
     * @dev Gets the basic role information by its hash
     * @param roleHash The hash of the role to get
     * @return roleName The name of the role
     * @return roleHashReturn The hash of the role
     * @return maxWallets The maximum number of wallets allowed for this role
     * @return walletCount The current number of wallets assigned to this role
     * @return isProtected Whether the role is protected from removal
     */
    function getRole(bytes32 roleHash) public view returns (
        string memory roleName,
        bytes32 roleHashReturn,
        uint256 maxWallets,
        uint256 walletCount,
        bool isProtected
    ) {
        StateAbstraction.Role storage role = _secureState.getRole(roleHash);
        return (
            role.roleName,
            role.roleHash,
            role.maxWallets,
            role.walletCount,
            role.isProtected
        );
    }

    /**
     * @dev Returns if a wallet is authorized for a role
     * @param roleHash The hash of the role to check
     * @param wallet The wallet address to check
     * @return True if the wallet is authorized for the role, false otherwise
     */
    function hasRole(bytes32 roleHash, address wallet) public view returns (bool) {
        return _secureState.hasRole(roleHash, wallet);
    }

    /**
     * @dev Returns if an action is supported by a function
     * @param functionSelector The function selector to check
     * @param action The action to check
     * @return True if the action is supported by the function, false otherwise
     */
    function isActionSupportedByFunction(bytes4 functionSelector, StateAbstraction.TxAction action) public view returns (bool) {
        return _secureState.isActionSupportedByFunction(functionSelector, action);
    }

    /**
     * @dev Gets the function permissions for a specific role
     * @param roleHash The hash of the role to get permissions for
     * @return The function permissions array for the role
     */
    function getRolePermission(bytes32 roleHash) public view returns (StateAbstraction.FunctionPermission[] memory) {
        StateAbstraction.Role storage role = _secureState.getRole(roleHash);
        return role.functionPermissions;
    }

    /**
     * @dev Gets the current nonce for a specific signer
     * @param signer The address of the signer
     * @return The current nonce for the signer
     */
    function getSignerNonce(address signer) public view returns (uint256) {
        return _secureState.getSignerNonce(signer);
    }

    // ============ SYSTEM STATE QUERIES ============

    /**
     * @dev Returns the supported operation types
     * @return The supported operation types
     */
    function getSupportedOperationTypes() public view returns (bytes32[] memory) {
        return _secureState.getSupportedOperationTypesList();
    }

    /**
     * @dev Returns the supported roles list
     * @return The supported roles list
     */
    function getSupportedRoles() public view returns (bytes32[] memory) {
        return _secureState.getSupportedRolesList();
    }

    /**
     * @dev Returns the supported functions list
     * @return The supported functions list
     */
    function getSupportedFunctions() public view returns (bytes4[] memory) {
        return _secureState.getSupportedFunctionsList();
    }

    /**
     * @dev Returns the time lock period
     * @return The time lock period in seconds
     */
    function getTimeLockPeriodSec() public view virtual returns (uint256) {
        return _secureState.timeLockPeriodSec;
    }

    /**
     * @dev Returns whether the contract is initialized
     * @return bool True if the contract is initialized, false otherwise
     */
    function initialized() public view virtual returns (bool) {
        return _getInitializedVersion() != type(uint8).max && _secureState.initialized;
    }

    // ============  ROLE MANAGEMENT ============

    /**
     * @dev Centralized function to get authorized wallet at specific index
     * @param roleHash The role hash
     * @param index The wallet index
     * @return The authorized wallet address
     */
    function _getAuthorizedWalletAt(bytes32 roleHash, uint256 index) internal view returns (address) {
        return StateAbstraction.getAuthorizedWalletAt(_getSecureState(), roleHash, index);
    }

    /**
     * @dev Centralized function to update assigned wallet for a role
     * @param roleHash The role hash
     * @param newWallet The new wallet address
     * @param oldWallet The old wallet address
     */
    function _updateAssignedWallet(bytes32 roleHash, address newWallet, address oldWallet) internal {
        StateAbstraction.updateAssignedWallet(_getSecureState(), roleHash, newWallet, oldWallet);
    }

    /**
     * @dev Centralized function to update time lock period
     * @param newTimeLockPeriodSec The new time lock period in seconds
     */
    function _updateTimeLockPeriod(uint256 newTimeLockPeriodSec) internal virtual {
        StateAbstraction.updateTimeLockPeriod(_getSecureState(), newTimeLockPeriodSec);
    }

    // ============ CENTRALIZED EXECUTION OPTIONS ============

    /**
     * @dev Centralized function to create standard execution options
     * @param functionSelector The function selector
     * @param params The encoded parameters
     * @return The execution options
     */
    function _createStandardExecutionOptions(
        bytes4 functionSelector,
        bytes memory params
    ) internal pure returns (bytes memory) {
        return StateAbstraction.createStandardExecutionOptions(functionSelector, params);
    }

    /**
     * @dev Centralized function to create raw execution options
     * @param rawTxData The raw transaction data
     * @return The execution options
     */
    function _createRawExecutionOptions(
        bytes memory rawTxData
    ) internal pure returns (bytes memory) {
        return StateAbstraction.createRawExecutionOptions(rawTxData);
    }

    // ============ INTERNAL UTILITIES ============

    /**
     * @dev Internal function to get the secure state
     * @return secureState The secure state
     */
    function _getSecureState() internal view returns (StateAbstraction.SecureOperationState storage) {
        return _secureState;
    }

    /**
     * @dev Internal function to check if an address has action permission
     * @param caller The address to check
     * @param functionSelector The function selector
     * @param action The action to check
     * @return True if the caller has permission, false otherwise
     */
    function _hasActionPermission(
        address caller,
        bytes4 functionSelector,
        StateAbstraction.TxAction action
    ) internal view returns (bool) {
        return _secureState.hasActionPermission(caller, functionSelector, action);
    }

}
