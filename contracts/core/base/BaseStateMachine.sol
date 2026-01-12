// SPDX-License-Identifier: MPL-2.0
pragma solidity ^0.8.25;

// OpenZeppelin imports
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

// Contracts imports
import "./lib/StateAbstraction.sol";
import "../../utils/SharedValidation.sol";
import "./interface/IBaseStateMachine.sol";

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

    // ============ ACCESS CONTROL MODIFIERS ============

    /**
     * @dev Modifier to restrict access to the owner only
     */
    modifier onlyOwner() {
        SharedValidation.validateOwner(owner());
        _;
    }

    /**
     * @dev Modifier to restrict access to broadcaster only
     */
    modifier onlyBroadcaster() {
        SharedValidation.validateBroadcaster(getBroadcaster());
        _;
    }

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

        _secureState.setEventForwarder(eventForwarder);
    }

    // ============ SYSTEM ROLE QUERY FUNCTIONS ============

    /**
     * @dev Returns the owner of the contract
     * @return The owner of the contract
     */
    function owner() public view returns (address) {
        return _getAuthorizedWalletAt(StateAbstraction.OWNER_ROLE, 0);
    }

    /**
     * @dev Returns the broadcaster address
     * @return The broadcaster address
     */
    function getBroadcaster() public view returns (address) {
        return _getAuthorizedWalletAt(StateAbstraction.BROADCASTER_ROLE, 0);
    }

    /**
     * @dev Returns the recovery address
     * @return The recovery address
     */
    function getRecovery() public view returns (address) {
        return _getAuthorizedWalletAt(StateAbstraction.RECOVERY_ROLE, 0);
    }

    // ============ INTERFACE SUPPORT ============

    /**
     * @dev See {IERC165-supportsInterface}.
     * @notice Base implementation for ERC165 interface detection
     * @notice Registers IBaseStateMachine interface ID for proper interface detection
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return interfaceId == type(IBaseStateMachine).interfaceId || super.supportsInterface(interfaceId);
    }

    // ============ TRANSACTION MANAGEMENT ============

    /**
     * @dev Centralized function to request a transaction with common validation
     * @param requester The address requesting the transaction
     * @param target The target contract address
     * @param value The ETH value to send (0 for standard function calls)
     * @param gasLimit The gas limit for execution
     * @param operationType The type of operation
     * @param functionSelector The function selector for execution (0x00000000 for simple ETH transfers)
     * @param params The encoded parameters for the function (empty for simple ETH transfers)
     * @return The created transaction record
     * @notice Validates permissions for the calling function (request function), not the execution selector
     * @notice Execution functions are internal-only and don't need permission definitions
     * @notice This function is virtual to allow extensions to add hook functionality
     * @notice For standard function calls: value=0, functionSelector=non-zero, params=encoded data
     * @notice For simple ETH transfers: value>0, functionSelector=0x00000000, params=""
     */
    function _requestTransaction(
        address requester,
        address target,
        uint256 value,
        uint256 gasLimit,
        bytes32 operationType,
        bytes4 functionSelector,
        bytes memory params
    ) internal virtual returns (StateAbstraction.TxRecord memory) {
        // Validate permissions for the calling function (request function selector), not the execution selector
        // Execution functions are internal-only and protected by validateInternalCallInternal
        _validateCallingFunctionPermission(msg.sender, StateAbstraction.TxAction.EXECUTE_TIME_DELAY_REQUEST);

        return StateAbstraction.txRequest(
            _getSecureState(),
            requester,
            target,
            value,
            gasLimit,
            operationType,
            functionSelector,
            params
        );
    }

    /**
     * @dev Centralized function to approve a pending transaction after release time
     * @param txId The transaction ID
     * @return The updated transaction record
     * @notice Validates permissions for the calling function (approval function selector), not the execution selector
     * @notice Execution functions are internal-only and don't need permission definitions
     * @notice This function is virtual to allow extensions to add hook functionality
     */
    function _approveTransaction(
        uint256 txId
    ) internal virtual returns (StateAbstraction.TxRecord memory) {
        // Validate permissions for the calling function (approval function selector), not the execution selector
        // Execution functions are internal-only and protected by validateInternalCallInternal
        _validateCallingFunctionPermission(msg.sender, StateAbstraction.TxAction.EXECUTE_TIME_DELAY_APPROVE);

        return StateAbstraction.txDelayedApproval(_getSecureState(), txId);
    }

    /**
     * @dev Centralized function to approve a transaction using meta-transaction
     * @param metaTx The meta-transaction
     * @return The updated transaction record
     * @notice Validates permissions for the calling function (msg.sig) and handler selector from metaTx
     * @notice Uses EXECUTE_META_APPROVE action for permission checking
     * @notice This function is virtual to allow extensions to add hook functionality
     */
    function _approveTransactionWithMetaTx(
        StateAbstraction.MetaTransaction memory metaTx
    ) internal virtual returns (StateAbstraction.TxRecord memory) {
        // Validate permissions for the calling function (consistent with time-delay pattern)
        _validateCallingFunctionPermission(msg.sender, StateAbstraction.TxAction.EXECUTE_META_APPROVE);
        
        // Validate handler selector permission using the handler selector from metaTx
        if (!_hasActionPermission(msg.sender, metaTx.params.handlerSelector, StateAbstraction.TxAction.EXECUTE_META_APPROVE)) {
            revert SharedValidation.NoPermission(msg.sender);
        }
        
        return StateAbstraction.txApprovalWithMetaTx(_getSecureState(), metaTx);
    }

    /**
     * @dev Centralized function to cancel a pending transaction
     * @param txId The transaction ID
     * @return The updated transaction record
     * @notice Validates permissions for the calling function (cancellation function selector), not the execution selector
     * @notice Execution functions are internal-only and don't need permission definitions
     * @notice This function is virtual to allow extensions to add hook functionality
     */
    function _cancelTransaction(
        uint256 txId
    ) internal virtual returns (StateAbstraction.TxRecord memory) {
        // Validate permissions for the calling function (cancellation function selector), not the execution selector
        // Execution functions are internal-only and protected by validateInternalCallInternal
        _validateCallingFunctionPermission(msg.sender, StateAbstraction.TxAction.EXECUTE_TIME_DELAY_CANCEL);

        return StateAbstraction.txCancellation(_getSecureState(), txId);
    }

    /**
     * @dev Centralized function to cancel a transaction using meta-transaction
     * @param metaTx The meta-transaction
     * @return The updated transaction record
     * @notice Validates permissions for the calling function (msg.sig) and handler selector from metaTx
     * @notice Uses EXECUTE_META_CANCEL action for permission checking
     * @notice This function is virtual to allow extensions to add hook functionality
     */
    function _cancelTransactionWithMetaTx(
        StateAbstraction.MetaTransaction memory metaTx
    ) internal virtual returns (StateAbstraction.TxRecord memory) {
        // Validate permissions for the calling function (consistent with time-delay pattern)
        _validateCallingFunctionPermission(msg.sender, StateAbstraction.TxAction.EXECUTE_META_CANCEL);
        
        // Validate handler selector permission using the handler selector from metaTx
        if (!_hasActionPermission(msg.sender, metaTx.params.handlerSelector, StateAbstraction.TxAction.EXECUTE_META_CANCEL)) {
            revert SharedValidation.NoPermission(msg.sender);
        }
        
        return StateAbstraction.txCancellationWithMetaTx(_getSecureState(), metaTx);
    }

    /**
     * @dev Centralized function to request and approve a transaction using meta-transaction
     * @param metaTx The meta-transaction
     * @return The transaction record
     * @notice Validates permissions for the calling function (msg.sig) and handler selector from metaTx
     * @notice Uses EXECUTE_META_REQUEST_AND_APPROVE action for permission checking
     * @notice This function is virtual to allow extensions to add hook functionality
     */
    function _requestAndApproveTransaction(
        StateAbstraction.MetaTransaction memory metaTx
    ) internal virtual returns (StateAbstraction.TxRecord memory) {
        // Validate permissions for the calling function (consistent with time-delay pattern)
        _validateCallingFunctionPermission(msg.sender, StateAbstraction.TxAction.EXECUTE_META_REQUEST_AND_APPROVE);
        
        // Validate handler selector permission using the handler selector from metaTx
        if (!_hasActionPermission(msg.sender, metaTx.params.handlerSelector, StateAbstraction.TxAction.EXECUTE_META_REQUEST_AND_APPROVE)) {
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
        StateAbstraction.MetaTxParams memory metaTxParams
    ) public view returns (StateAbstraction.MetaTransaction memory) {
        StateAbstraction.TxParams memory txParams = StateAbstraction.TxParams({
            requester: requester,
            target: target,
            value: value,
            gasLimit: gasLimit,
            operationType: operationType,
            executionSelector: executionSelector,
            executionParams: executionParams
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
     * @dev Checks if a function schema exists
     * @param functionSelector The function selector to check
     * @return True if the function schema exists, false otherwise
     */
    function functionSchemaExists(bytes4 functionSelector) public view returns (bool) {
        return _secureState.functions[functionSelector].functionSelector == functionSelector;
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
    function getActiveRolePermissions(bytes32 roleHash) public view returns (StateAbstraction.FunctionPermission[] memory) {
        return _secureState.getRoleFunctionPermissions(roleHash);
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
    function getTimeLockPeriodSec() public view returns (uint256) {
        return _secureState.timeLockPeriodSec;
    }

    /**
     * @dev Returns whether the contract is initialized
     * @return bool True if the contract is initialized, false otherwise
     */
    function initialized() public view returns (bool) {
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
     * @notice This function is virtual to allow extensions to add hook functionality or additional validation
     */
    function _updateAssignedWallet(bytes32 roleHash, address newWallet, address oldWallet) internal virtual {
        StateAbstraction.updateAssignedWallet(_getSecureState(), roleHash, newWallet, oldWallet);
    }


    // ============ DEFINITION LOADING ============

    /**
     * @dev Loads definitions directly into the secure state
     * This function initializes the secure state with all predefined definitions
     * @param functionSchemas Array of function schema definitions  
     * @param roleHashes Array of role hashes
     * @param functionPermissions Array of function permissions (parallel to roleHashes)
     */
    function _loadDefinitions(
        StateAbstraction.FunctionSchema[] memory functionSchemas,
        bytes32[] memory roleHashes,
        StateAbstraction.FunctionPermission[] memory functionPermissions
    ) internal {
        // Load function schemas
        for (uint256 i = 0; i < functionSchemas.length; i++) {
            StateAbstraction.createFunctionSchema(
                _getSecureState(),
                functionSchemas[i].functionName,
                functionSchemas[i].functionSelector,
                functionSchemas[i].operationType,
                functionSchemas[i].operationName,
                functionSchemas[i].supportedActionsBitmap,
                functionSchemas[i].isProtected
            );
        }
        
        // Load role permissions using parallel arrays
        SharedValidation.validateArrayLengthMatch(roleHashes.length, functionPermissions.length);
        for (uint256 i = 0; i < roleHashes.length; i++) {
            StateAbstraction.addFunctionToRole(
                _getSecureState(),
                roleHashes[i],
                functionPermissions[i]
            );
        }
    }

    // ============ INTERNAL UTILITIES ============

    /**
     * @dev Validates that the caller has permission for the calling function (msg.sig) and specified action
     * @param caller The address to check permissions for
     * @param action The required action permission
     * @notice Reverts if caller doesn't have permission for the calling function (msg.sig) and action
     * @notice This helper centralizes the msg.sig permission validation pattern
     */
    function _validateCallingFunctionPermission(
        address caller,
        StateAbstraction.TxAction action
    ) internal view {
        bytes4 callingFunctionSelector = msg.sig;
        if (!_hasActionPermission(caller, callingFunctionSelector, action)) {
            revert SharedValidation.NoPermission(caller);
        }
    }

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
