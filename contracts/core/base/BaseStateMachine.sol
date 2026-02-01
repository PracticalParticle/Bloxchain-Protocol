// SPDX-License-Identifier: MPL-2.0
pragma solidity 0.8.33;

// OpenZeppelin imports
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

// Contracts imports
import "../lib/EngineBlox.sol";
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
 * All access to EngineBlox library functions is centralized through BaseStateMachine
 * wrapper functions to ensure consistency and maintainability.
 *
 * Key Features:
 * - State initialization with role and permission setup
 * - Meta-transaction parameter creation and generation
 * - Comprehensive state queries and transaction history
 * - Role and permission validation utilities
 * - System configuration queries
 * - Event forwarding for external monitoring
 */
abstract contract BaseStateMachine is Initializable, ERC165Upgradeable, ReentrancyGuardUpgradeable {
    using EngineBlox for EngineBlox.SecureOperationState;
    using SharedValidation for *;

    EngineBlox.SecureOperationState internal _secureState;

    /**
     * @dev Unified component event for SecureOwnable, GuardController, RuntimeRBAC.
     * Indexers filter by functionSelector (msg.sig at emit site) and decode data (abi-encoded payload).
     * @param functionSelector The function selector (msg.sig) at the emit site; used by indexers to filter
     * @param data ABI-encoded payload associated with the event
     */
    event ComponentEvent(bytes4 indexed functionSelector, bytes data);

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
        __ReentrancyGuard_init();
        
        _secureState.initialize(initialOwner, broadcaster, recovery, timeLockPeriodSec);

        _secureState.setEventForwarder(eventForwarder);
    }

    // ============ SYSTEM ROLE QUERY FUNCTIONS ============

    /**
     * @dev Returns the owner of the contract
     * @return The owner of the contract
     */
    function owner() public view returns (address) {
        return _getAuthorizedWalletAt(EngineBlox.OWNER_ROLE, 0);
    }

    /**
     * @dev Returns all broadcaster addresses for the BROADCASTER_ROLE
     * @return Array of broadcaster addresses
     */
    function getBroadcasters() public view returns (address[] memory) {
        return _getAuthorizedWallets(EngineBlox.BROADCASTER_ROLE);
    }

    /**
     * @dev Returns the recovery address
     * @return The recovery address
     */
    function getRecovery() public view returns (address) {
        return _getAuthorizedWalletAt(EngineBlox.RECOVERY_ROLE, 0);
    }

    // ============ INTERFACE SUPPORT ============

    /**
     * @dev See {IERC165-supportsInterface}.
     * @notice Base implementation for ERC165 interface detection
     * @notice Registers IBaseStateMachine interface ID for proper interface detection
     * @notice Component contracts (SecureOwnable, RuntimeRBAC, GuardController) should override
     *         to add their respective interface IDs for component detection
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
     * @param functionSelector The function selector for execution (NATIVE_TRANSFER_SELECTOR for simple native token transfers)
     * @param params The encoded parameters for the function (empty for simple native token transfers)
     * @return The created transaction record
     * @notice Validates permissions for the calling function (request function), not the execution selector
     * @notice Execution functions are internal-only and don't need permission definitions
     * @notice This function is virtual to allow extensions to add hook functionality
     * @notice For standard function calls: value=0, functionSelector=non-zero, params=encoded data
     * @notice For simple native token transfers: value>0, functionSelector=NATIVE_TRANSFER_SELECTOR, params=""
     */
    function _requestTransaction(
        address requester,
        address target,
        uint256 value,
        uint256 gasLimit,
        bytes32 operationType,
        bytes4 functionSelector,
        bytes memory params
    ) internal virtual returns (EngineBlox.TxRecord memory) {
        return EngineBlox.txRequest(
            _getSecureState(),
            requester,
            target,
            value,
            gasLimit,
            operationType,
            bytes4(msg.sig),
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
     * @notice Protected by ReentrancyGuard to prevent reentrancy attacks
     */
    function _approveTransaction(
        uint256 txId
    ) internal virtual nonReentrant returns (EngineBlox.TxRecord memory) {
        return EngineBlox.txDelayedApproval(_getSecureState(), txId, bytes4(msg.sig));
    }

    /**
     * @dev Centralized function to approve a transaction using meta-transaction
     * @param metaTx The meta-transaction
     * @return The updated transaction record
     * @notice Validates permissions for the calling function (msg.sig) and handler selector from metaTx
     * @notice Uses EXECUTE_META_APPROVE action for permission checking
     * @notice This function is virtual to allow extensions to add hook functionality
     * @notice Protected by ReentrancyGuard to prevent reentrancy attacks
     */
    function _approveTransactionWithMetaTx(
        EngineBlox.MetaTransaction memory metaTx
    ) internal virtual nonReentrant returns (EngineBlox.TxRecord memory) {
        return EngineBlox.txApprovalWithMetaTx(_getSecureState(), metaTx);
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
    ) internal virtual returns (EngineBlox.TxRecord memory) {
        return EngineBlox.txCancellation(_getSecureState(), txId, bytes4(msg.sig));
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
        EngineBlox.MetaTransaction memory metaTx
    ) internal virtual returns (EngineBlox.TxRecord memory) {
        return EngineBlox.txCancellationWithMetaTx(_getSecureState(), metaTx);
    }

    /**
     * @dev Centralized function to request and approve a transaction using meta-transaction
     * @param metaTx The meta-transaction
     * @return The transaction record
     * @notice Validates permissions for the calling function (msg.sig) and handler selector from metaTx
     * @notice Uses EXECUTE_META_REQUEST_AND_APPROVE action for permission checking
     * @notice This function is virtual to allow extensions to add hook functionality
     * @notice Protected by ReentrancyGuard to prevent reentrancy attacks
     */
    function _requestAndApproveTransaction(
        EngineBlox.MetaTransaction memory metaTx
    ) internal virtual nonReentrant returns (EngineBlox.TxRecord memory) {
        return EngineBlox.requestAndApprove(_getSecureState(), metaTx);
    }

    /**
     * @dev Centralized function to update payment details for a pending transaction
     * @param txId The transaction ID to update payment for
     * @param paymentDetails The new payment details
     * @notice This function is virtual to allow extensions to add hook functionality
     */
    function _updatePaymentForTransaction(
        uint256 txId,
        EngineBlox.PaymentDetails memory paymentDetails
    ) internal virtual returns (EngineBlox.TxRecord memory) {
        EngineBlox.updatePaymentForTransaction(_getSecureState(), txId, paymentDetails);
        return _secureState.getTxRecord(txId);
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
        EngineBlox.TxAction action,
        uint256 deadline,
        uint256 maxGasPrice,
        address signer
    ) public view returns (EngineBlox.MetaTxParams memory) {
        return EngineBlox.createMetaTxParams(
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
     * @param executionSelector The function selector to execute (NATIVE_TRANSFER_SELECTOR for simple native token transfers)
     * @param executionParams The encoded parameters for the function (empty for simple native token transfers)
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
    ) public view returns (EngineBlox.MetaTransaction memory) {
        EngineBlox.TxParams memory txParams = EngineBlox.TxParams({
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
        EngineBlox.MetaTxParams memory metaTxParams
    ) public view returns (EngineBlox.MetaTransaction memory) {
        return _secureState.generateUnsignedForExistingMetaTx(txId, metaTxParams);
    }

    // ============ STATE QUERIES ============

    /**
     * @dev Gets transaction history within a specified range
     * @param fromTxId The starting transaction ID (inclusive)
     * @param toTxId The ending transaction ID (inclusive)
     * @return The transaction history within the specified range
     * @notice Requires caller to have any role (via _validateAnyRole) to limit information visibility
     */
    function getTransactionHistory(uint256 fromTxId, uint256 toTxId) public view returns (EngineBlox.TxRecord[] memory) {
        _validateAnyRole();
        
        // Validate the range
        fromTxId = fromTxId > 0 ? fromTxId : 1;
        toTxId = toTxId > _secureState.txCounter ? _secureState.txCounter : toTxId;
        
        // Validate that fromTxId is less than toTxId
        SharedValidation.validateLessThan(fromTxId, toTxId);

        uint256 rangeSize = toTxId - fromTxId + 1;
        
        // For larger ranges, use paginated version
        SharedValidation.validateRangeSize(rangeSize, 1000);
        
        EngineBlox.TxRecord[] memory history = new EngineBlox.TxRecord[](rangeSize);
        
        for (uint256 i = 0; i < rangeSize; i++) {
            history[i] = _secureState.getTxRecord(fromTxId + i);
        }
        
        return history;
    }

    /**
     * @dev Gets a transaction by ID
     * @param txId The transaction ID
     * @return The transaction record
     * @notice Requires caller to have any role (via _validateAnyRole) to limit information visibility
     */
    function getTransaction(uint256 txId) public view returns (EngineBlox.TxRecord memory) {
        _validateAnyRole();
        return _secureState.getTxRecord(txId);
    }

    /**
     * @dev Gets all pending transaction IDs
     * @return Array of pending transaction IDs
     * @notice Requires caller to have any role (via _validateAnyRole) to limit information visibility
     */
    function getPendingTransactions() public view returns (uint256[] memory) {
        _validateAnyRole();
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
     * @notice Requires caller to have any role (via _validateAnyRole) to limit information visibility
     */
    function getRole(bytes32 roleHash) public view returns (
        string memory roleName,
        bytes32 roleHashReturn,
        uint256 maxWallets,
        uint256 walletCount,
        bool isProtected
    ) {
        _validateAnyRole();
        EngineBlox.Role storage role = _secureState.getRole(roleHash);
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
     * @dev Gets all roles assigned to a wallet
     * @param wallet The wallet address to get roles for
     * @return Array of role hashes assigned to the wallet
     * @notice Requires caller to have any role (via _validateAnyRole) to limit information visibility
     * @notice This function uses the reverse index for efficient lookup
     */
    function getWalletRoles(address wallet) public view returns (bytes32[] memory) {
        _validateAnyRole();
        return EngineBlox.getWalletRoles(_getSecureState(), wallet);
    }

    /**
     * @dev Gets all authorized wallets for a role
     * @param roleHash The role hash to get wallets for
     * @return Array of authorized wallet addresses
     * @notice Requires caller to have any role (via _validateAnyRole) to limit information visibility
     */
    function getWalletsInRole(bytes32 roleHash) public view virtual returns (address[] memory) {
        _validateAnyRole();
        _validateRoleExists(roleHash);
        return _getAuthorizedWallets(roleHash);
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
    function isActionSupportedByFunction(bytes4 functionSelector, EngineBlox.TxAction action) public view returns (bool) {
        return _secureState.isActionSupportedByFunction(functionSelector, action);
    }

    /**
     * @dev Gets the function permissions for a specific role
     * @param roleHash The hash of the role to get permissions for
     * @return The function permissions array for the role
     * @notice Requires caller to have any role (via _validateAnyRole) to limit information visibility
     */
    function getActiveRolePermissions(bytes32 roleHash) public view returns (EngineBlox.FunctionPermission[] memory) {
        _validateAnyRole();
        return _secureState.getRoleFunctionPermissions(roleHash);
    }

    /**
     * @dev Gets the current nonce for a specific signer
     * @param signer The address of the signer
     * @return The current nonce for the signer
     * @notice Requires caller to have any role (via _validateAnyRole) to limit information visibility
     */
    function getSignerNonce(address signer) public view returns (uint256) {
        _validateAnyRole();
        return _secureState.getSignerNonce(signer);
    }

    // ============ SYSTEM STATE QUERIES ============

    /**
     * @dev Returns the supported operation types
     * @return The supported operation types
     * @notice Requires caller to have any role (via _validateAnyRole) to limit information visibility
     */
    function getSupportedOperationTypes() public view returns (bytes32[] memory) {
        _validateAnyRole();
        return _secureState.getSupportedOperationTypesList();
    }

    /**
     * @dev Returns the supported roles list
     * @return The supported roles list
     * @notice Requires caller to have any role (via _validateAnyRole) to limit information visibility
     */
    function getSupportedRoles() public view returns (bytes32[] memory) {
        _validateAnyRole();
        return _secureState.getSupportedRolesList();
    }

    /**
     * @dev Returns the supported functions list
     * @return The supported functions list
     * @notice Requires caller to have any role (via _validateAnyRole) to limit information visibility
     */
    function getSupportedFunctions() public view returns (bytes4[] memory) {
        _validateAnyRole();
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
        return EngineBlox.getAuthorizedWalletAt(_getSecureState(), roleHash, index);
    }

    /**
     * @dev Centralized function to get all authorized wallets for a role
     * @param roleHash The role hash
     * @return Array of authorized wallet addresses
     */
    function _getAuthorizedWallets(bytes32 roleHash) internal view returns (address[] memory) {
        EngineBlox.Role storage role = _secureState.roles[roleHash];
        uint256 walletCount = role.walletCount;

        address[] memory wallets = new address[](walletCount);
        for (uint256 i = 0; i < walletCount; i++) {
            wallets[i] = _getAuthorizedWalletAt(roleHash, i);
        }

        return wallets;
    }

    /**
     * @dev Centralized function to create a new role
     * @param roleName The name of the role
     * @param maxWallets The maximum number of wallets allowed for this role
     * @param isProtected Whether the role is protected from removal
     * @return roleHash The hash of the created role
     * @notice This function is virtual to allow extensions to add hook functionality
     */
    function _createRole(
        string memory roleName,
        uint256 maxWallets,
        bool isProtected
    ) internal virtual returns (bytes32) {
        bytes32 roleHash = keccak256(bytes(roleName));
        EngineBlox.createRole(_getSecureState(), roleName, maxWallets, isProtected);
        return roleHash;
    }

    /**
     * @dev Centralized function to remove a role
     * @param roleHash The hash of the role to remove
     * @notice This function is virtual to allow extensions to add hook functionality
     */
    function _removeRole(bytes32 roleHash) internal virtual {
        EngineBlox.removeRole(_getSecureState(), roleHash);
    }

    /**
     * @dev Centralized function to assign a wallet to a role
     * @param roleHash The role hash
     * @param wallet The wallet address to assign
     * @notice This function is virtual to allow extensions to add hook functionality
     */
    function _assignWallet(bytes32 roleHash, address wallet) internal virtual {
        EngineBlox.assignWallet(_getSecureState(), roleHash, wallet);
    }

    /**
     * @dev Centralized function to revoke a wallet from a role
     * @param roleHash The role hash
     * @param wallet The wallet address to revoke
     * @notice This function is virtual to allow extensions to add hook functionality
     */
    function _revokeWallet(bytes32 roleHash, address wallet) internal virtual {
        EngineBlox.revokeWallet(_getSecureState(), roleHash, wallet);
    }

    /**
     * @dev Centralized function to update assigned wallet for a role
     * @param roleHash The role hash
     * @param newWallet The new wallet address
     * @param oldWallet The old wallet address
     * @notice This function is virtual to allow extensions to add hook functionality or additional validation
     */
    function _updateAssignedWallet(bytes32 roleHash, address newWallet, address oldWallet) internal virtual {
        EngineBlox.updateAssignedWallet(_getSecureState(), roleHash, newWallet, oldWallet);
    }

    /**
     * @dev Centralized function to update the time lock period
     * @param newTimeLockPeriodSec The new time lock period in seconds
     * @notice This function is virtual to allow extensions to add hook functionality
     */
    function _updateTimeLockPeriod(uint256 newTimeLockPeriodSec) internal virtual {
        EngineBlox.updateTimeLockPeriod(_getSecureState(), newTimeLockPeriodSec);
    }

    // ============ FUNCTION SCHEMA MANAGEMENT ============

    /**
     * @dev Centralized function to create a function schema
     * @param functionSignature The function signature
     * @param functionSelector The function selector
     * @param operationName The operation name
     * @param supportedActionsBitmap The bitmap of supported actions
     * @param isProtected Whether the function schema is protected
     * @param handlerForSelectors Array of handler selectors
     * @notice This function is virtual to allow extensions to add hook functionality
     */
    function _createFunctionSchema(
        string memory functionSignature,
        bytes4 functionSelector,
        string memory operationName,
        uint16 supportedActionsBitmap,
        bool isProtected,
        bytes4[] memory handlerForSelectors
    ) internal virtual {
        EngineBlox.createFunctionSchema(
            _getSecureState(),
            functionSignature,
            functionSelector,
            operationName,
            supportedActionsBitmap,
            isProtected,
            handlerForSelectors
        );
    }

    /**
     * @dev Centralized function to remove a function schema
     * @param functionSelector The function selector to remove
     * @param safeRemoval Whether to perform safe removal (check for role references)
     * @notice This function is virtual to allow extensions to add hook functionality
     */
    function _removeFunctionSchema(bytes4 functionSelector, bool safeRemoval) internal virtual {
        EngineBlox.removeFunctionSchema(_getSecureState(), functionSelector, safeRemoval);
    }

    /**
     * @dev Centralized function to add a function permission to a role
     * @param roleHash The role hash
     * @param functionPermission The function permission to add
     * @notice This function is virtual to allow extensions to add hook functionality
     */
    function _addFunctionToRole(
        bytes32 roleHash,
        EngineBlox.FunctionPermission memory functionPermission
    ) internal virtual {
        EngineBlox.addFunctionToRole(_getSecureState(), roleHash, functionPermission);
    }

    /**
     * @dev Centralized function to remove a function permission from a role
     * @param roleHash The role hash
     * @param functionSelector The function selector to remove
     * @notice This function is virtual to allow extensions to add hook functionality
     */
    function _removeFunctionFromRole(bytes32 roleHash, bytes4 functionSelector) internal virtual {
        EngineBlox.removeFunctionFromRole(_getSecureState(), roleHash, functionSelector);
    }

    // ============ PERMISSION VALIDATION ============

    /**
     * @dev Centralized function to validate that the caller has any role
     */
    function _validateAnyRole() internal view {
        EngineBlox._validateAnyRole(_getSecureState());
    }

    /**
     * @dev Centralized function to validate that a role exists
     * @param roleHash The role hash to validate
     */
    function _validateRoleExists(bytes32 roleHash) internal view {
        EngineBlox._validateRoleExists(_getSecureState(), roleHash);
    }

    /**
     * @dev Centralized function to validate that the caller is the contract itself (for execution-only entry points).
     */
    function _validateExecuteBySelf() internal view {
        SharedValidation.validateInternalCall(address(this));
    }

    /**
     * @dev Centralized function to validate batch size against EngineBlox.MAX_BATCH_SIZE.
     * @param length The batch length to validate
     */
    function _validateBatchSize(uint256 length) internal pure {
        SharedValidation.validateBatchSize(length, EngineBlox.MAX_BATCH_SIZE);
    }

    // ============ UTILITY FUNCTIONS ============

    /**
     * @dev Centralized function to convert a bitmap to an array of actions
     * @param bitmap The bitmap to convert
     * @return Array of TxAction values
     */
    function _convertBitmapToActions(uint16 bitmap) internal pure returns (EngineBlox.TxAction[] memory) {
        return EngineBlox.convertBitmapToActions(bitmap);
    }

    /**
     * @dev Centralized function to create a bitmap from an array of actions
     * @param actions Array of TxAction values
     * @return The bitmap representation
     */
    function _createBitmapFromActions(EngineBlox.TxAction[] memory actions) internal pure returns (uint16) {
        return EngineBlox.createBitmapFromActions(actions);
    }

    // ============ TARGET WHITELIST MANAGEMENT ============

    /**
     * @dev Centralized function to add a target address to the whitelist for a function selector
     * @param functionSelector The function selector
     * @param target The target address to whitelist
     * @notice This function is virtual to allow extensions to add hook functionality
     */
    function _addTargetToFunctionWhitelist(bytes4 functionSelector, address target) internal virtual {
        _getSecureState().addTargetToFunctionWhitelist(functionSelector, target);
    }

    /**
     * @dev Centralized function to remove a target address from the whitelist for a function selector
     * @param functionSelector The function selector
     * @param target The target address to remove
     * @notice This function is virtual to allow extensions to add hook functionality
     */
    function _removeTargetFromFunctionWhitelist(bytes4 functionSelector, address target) internal virtual {
        _getSecureState().removeTargetFromFunctionWhitelist(functionSelector, target);
    }

    /**
     * @dev Centralized function to get all whitelisted targets for a function selector
     * @param functionSelector The function selector
     * @return Array of whitelisted target addresses
     */
    function _getFunctionWhitelistTargets(bytes4 functionSelector) internal view returns (address[] memory) {
        return _getSecureState().getFunctionWhitelistTargets(functionSelector);
    }

    // ============ DEFINITION LOADING ============

    /**
     * @dev Loads definitions directly into the secure state
     * This function initializes the secure state with all predefined definitions
     * @param functionSchemas Array of function schema definitions  
     * @param roleHashes Array of role hashes
     * @param functionPermissions Array of function permissions (parallel to roleHashes)
     * @param allowProtectedSchemas Whether to allow protected function schemas (default: true for factory settings)
     * @notice When allowProtectedSchemas is false, reverts if any function schema is protected
     * @notice This allows custom definitions to be restricted from creating protected schemas
     */
    function _loadDefinitions(
        EngineBlox.FunctionSchema[] memory functionSchemas,
        bytes32[] memory roleHashes,
        EngineBlox.FunctionPermission[] memory functionPermissions,
        bool allowProtectedSchemas
    ) internal {
        // Load function schemas
        for (uint256 i = 0; i < functionSchemas.length; i++) {
            // Validate protected schemas if not allowed (for custom definitions)
            if (!allowProtectedSchemas && functionSchemas[i].isProtected) {
                revert SharedValidation.CannotModifyProtected(
                    bytes32(functionSchemas[i].functionSelector)
                );
            }
            EngineBlox.createFunctionSchema(
                _getSecureState(),
                functionSchemas[i].functionSignature,
                functionSchemas[i].functionSelector,
                functionSchemas[i].operationName,
                functionSchemas[i].supportedActionsBitmap,
                functionSchemas[i].isProtected,
                functionSchemas[i].handlerForSelectors
            );
        }
        
        // Load role permissions using parallel arrays
        SharedValidation.validateArrayLengthMatch(roleHashes.length, functionPermissions.length);
        for (uint256 i = 0; i < roleHashes.length; i++) {
            EngineBlox.addFunctionToRole(
                _getSecureState(),
                roleHashes[i],
                functionPermissions[i]
            );
        }
    }

    // ============ INTERNAL UTILITIES ============

    /**
     * @dev Internal function to get the secure state
     * @return secureState The secure state
     */
    function _getSecureState() internal view returns (EngineBlox.SecureOperationState storage) {
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
        EngineBlox.TxAction action
    ) internal view returns (bool) {
        return _secureState.hasActionPermission(caller, functionSelector, action);
    }

    /**
     * @dev Internal helper to validate that a caller has the BROADCASTER_ROLE
     * @param caller The address to validate
     */
    function _validateBroadcaster(address caller) internal view {
        if (!hasRole(EngineBlox.BROADCASTER_ROLE, caller)) {
            revert SharedValidation.NoPermission(caller);
        }
    }

    /**
     * @dev Centralized component event logging for SecureOwnable, GuardController, RuntimeRBAC.
     * Uses msg.sig as the event index so callers only pass encoded data.
     * @param data abi.encode of event parameters
     */
    function _logComponentEvent(bytes memory data) internal {
        emit ComponentEvent(msg.sig, data);
    }

}
