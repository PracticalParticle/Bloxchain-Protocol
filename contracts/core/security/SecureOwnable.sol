// SPDX-License-Identifier: MPL-2.0
pragma solidity 0.8.33;

// Contracts imports
import "../base/BaseStateMachine.sol";
import "./lib/definitions/SecureOwnableDefinitions.sol";
import "../lib/interfaces/IDefinition.sol";
import "../lib/utils/SharedValidation.sol";
import "./interface/ISecureOwnable.sol";

/**
 * @title SecureOwnable
 * @dev Security-focused contract extending BaseStateMachine with ownership management
 *
 * SecureOwnable provides security-specific functionality built on top of the base state machine:
 * - Multi-role security model with Owner, Broadcaster, and Recovery roles
 * - Secure ownership transfer with time-locked operations
 * - Broadcaster and recovery address management
 * - Time-lock period configuration
 *
 * The contract implements four primary secure operation types:
 * 1. OWNERSHIP_TRANSFER - For securely transferring contract ownership
 * 2. BROADCASTER_UPDATE - For changing the broadcaster address
 * 3. RECOVERY_UPDATE - For updating the recovery address
 * 4. TIMELOCK_UPDATE - For modifying the time lock period
 *
 * Each operation follows a request -> approval workflow with appropriate time locks
 * and authorization checks. Operations can be cancelled within specific time windows.
 *
 * At most one ownership-transfer or broadcaster-update request may be pending at a time:
 * a pending request of either type blocks new requests until it is approved or cancelled.
 *
 * This contract focuses purely on security logic while leveraging the BaseStateMachine
 * for transaction management, meta-transactions, and state machine operations.
 */
abstract contract SecureOwnable is BaseStateMachine, ISecureOwnable {
    using SharedValidation for *;

    /// @dev True while any pending ownership transfer or broadcaster update request exists; blocks new requests until handled.
    bool private _hasOpenRequest;

    /**
     * @notice Initializer to initialize SecureOwnable state
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
    ) public virtual onlyInitializing {
        // Initialize base state machine (only if not already initialized)
        if (!_secureState.initialized) {
            _initializeBaseStateMachine(initialOwner, broadcaster, recovery, timeLockPeriodSec, eventForwarder);
        }
        
        // Load SecureOwnable-specific definitions
        IDefinition.RolePermission memory secureOwnablePermissions = SecureOwnableDefinitions.getRolePermissions();
        _loadDefinitions(
            SecureOwnableDefinitions.getFunctionSchemas(),
            secureOwnablePermissions.roleHashes,
            secureOwnablePermissions.functionPermissions,
            true // Allow protected schemas for factory settings
        );
    }

    // ============ INTERFACE SUPPORT ============

    /**
     * @dev See {IERC165-supportsInterface}.
     * @notice Adds ISecureOwnable interface ID for component detection
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return interfaceId == type(ISecureOwnable).interfaceId || super.supportsInterface(interfaceId);
    }

    // Ownership Management
    /**
     * @dev Requests a transfer of ownership
     * @return txId The transaction ID (use getTransaction(txId) for full record)
     */
    function transferOwnershipRequest() public returns (uint256 txId) {
        SharedValidation.validateRecovery(getRecovery());
        _requireNoPendingRequest();

        EngineBlox.TxRecord memory txRecord = _requestTransaction(
            msg.sender,
            address(this),
            0, // value
            0, // no gas limit
            SecureOwnableDefinitions.OWNERSHIP_TRANSFER,
            SecureOwnableDefinitions.TRANSFER_OWNERSHIP_SELECTOR,
            abi.encode(getRecovery())
        );

        _hasOpenRequest = true;
        _logAddressPairEvent(owner(), getRecovery());
        return txRecord.txId;
    }

    /**
     * @dev Approves a pending ownership transfer transaction after the release time
     * @param txId The transaction ID
     * @return The transaction ID
     */
    function transferOwnershipDelayedApproval(uint256 txId) public returns (uint256) {
        SharedValidation.validateOwnerOrRecovery(owner(), getRecovery());
        return _completeApprove(_approveTransaction(txId));
    }

    /**
     * @dev Approves a pending ownership transfer transaction using a meta-transaction
     * @param metaTx The meta-transaction
     * @return The transaction ID
     */
    function transferOwnershipApprovalWithMetaTx(EngineBlox.MetaTransaction memory metaTx) public returns (uint256) {
        _validateBroadcasterAndOwnerSigner(metaTx);
        return _completeApprove(_approveTransactionWithMetaTx(metaTx));
    }

    /**
     * @dev Cancels a pending ownership transfer transaction
     * @param txId The transaction ID
     * @return The transaction ID
     */
    function transferOwnershipCancellation(uint256 txId) public returns (uint256) {
        SharedValidation.validateRecovery(getRecovery());
        return _completeCancel(_cancelTransaction(txId));
    }

    /**
     * @dev Cancels a pending ownership transfer transaction using a meta-transaction
     * @param metaTx The meta-transaction
     * @return The transaction ID
     */
    function transferOwnershipCancellationWithMetaTx(EngineBlox.MetaTransaction memory metaTx) public returns (uint256) {
        _validateBroadcasterAndOwnerSigner(metaTx);
        return _completeCancel(_cancelTransactionWithMetaTx(metaTx));
    }

    // Broadcaster Management
    /**
     * @dev Requests an update to the broadcaster at a specific location (index).
     * @param newBroadcaster The new broadcaster address (zero address to revoke at location)
     * @param location The index in the broadcaster role's authorized wallets set
     * @return txId The transaction ID for the pending request (use getTransaction(txId) for full record)
     */
    function updateBroadcasterRequest(address newBroadcaster, uint256 location) public returns (uint256 txId) {
        SharedValidation.validateOwner(owner());
        _requireNoPendingRequest();

        // Get the current broadcaster at the specified location. zero address if no broadcaster at location.
        address currentBroadcaster = location < _getSecureState().roles[EngineBlox.BROADCASTER_ROLE].walletCount
            ? _getAuthorizedWalletAt(EngineBlox.BROADCASTER_ROLE, location)
            : address(0);

        EngineBlox.TxRecord memory txRecord = _requestTransaction(
            msg.sender,
            address(this),
            0, // value
            0, // gas limit
            SecureOwnableDefinitions.BROADCASTER_UPDATE,
            SecureOwnableDefinitions.UPDATE_BROADCASTER_SELECTOR,
            abi.encode(newBroadcaster, location)
        );

        _hasOpenRequest = true;
        _logAddressPairEvent(currentBroadcaster, newBroadcaster);
        return txRecord.txId;
    }

    /**
     * @dev Approves a pending broadcaster update transaction after the release time
     * @param txId The transaction ID
     * @return The transaction ID
     */
    function updateBroadcasterDelayedApproval(uint256 txId) public returns (uint256) {
        SharedValidation.validateOwner(owner());
        return _completeApprove(_approveTransaction(txId));
    }

    /**
     * @dev Approves a pending broadcaster update transaction using a meta-transaction
     * @param metaTx The meta-transaction
     * @return The transaction ID
     */
    function updateBroadcasterApprovalWithMetaTx(EngineBlox.MetaTransaction memory metaTx) public returns (uint256) {
        _validateBroadcasterAndOwnerSigner(metaTx);
        return _completeApprove(_approveTransactionWithMetaTx(metaTx));
    }

    /**
     * @dev Cancels a pending broadcaster update transaction
     * @param txId The transaction ID
     * @return The transaction ID
     */
    function updateBroadcasterCancellation(uint256 txId) public returns (uint256) {
        SharedValidation.validateOwner(owner());
        return _completeCancel(_cancelTransaction(txId));
    }

    /**
     * @dev Cancels a pending broadcaster update transaction using a meta-transaction
     * @param metaTx The meta-transaction
     * @return The transaction ID
     */
    function updateBroadcasterCancellationWithMetaTx(EngineBlox.MetaTransaction memory metaTx) public returns (uint256) {
        _validateBroadcasterAndOwnerSigner(metaTx);
        return _completeCancel(_cancelTransactionWithMetaTx(metaTx));
    }

    // Recovery Management

    /**
     * @dev Requests and approves a recovery address update using a meta-transaction
     * @param metaTx The meta-transaction
     * @return The transaction ID
     */
    function updateRecoveryRequestAndApprove(
        EngineBlox.MetaTransaction memory metaTx
    ) public returns (uint256) {
        _validateBroadcasterAndOwnerSigner(metaTx);
        EngineBlox.TxRecord memory txRecord = _requestAndApproveTransaction(metaTx);
        return txRecord.txId;
    }

    // TimeLock Management

    /**
     * @dev Requests and approves a time lock period update using a meta-transaction
     * @param metaTx The meta-transaction
     * @return The transaction ID
     */
    function updateTimeLockRequestAndApprove(
        EngineBlox.MetaTransaction memory metaTx
    ) public returns (uint256) {
        _validateBroadcasterAndOwnerSigner(metaTx);
        EngineBlox.TxRecord memory txRecord = _requestAndApproveTransaction(metaTx);
        return txRecord.txId;
    }

    // Execution Functions
    /**
     * @dev External function that can only be called by the contract itself to execute ownership transfer
     * @param newOwner The new owner address
     */
    function executeTransferOwnership(address newOwner) external {
        _validateExecuteBySelf();
        _transferOwnership(newOwner);
    }

    /**
     * @dev External function that can only be called by the contract itself to execute broadcaster update
     * @param newBroadcaster The new broadcaster address (zero address to revoke at location)
     * @param location The index in the broadcaster role's authorized wallets set
     */
    function executeBroadcasterUpdate(address newBroadcaster, uint256 location) external {
        _validateExecuteBySelf();
        _updateBroadcaster(newBroadcaster, location);
    }

    /**
     * @dev External function that can only be called by the contract itself to execute recovery update
     * @param newRecoveryAddress The new recovery address
     */
    function executeRecoveryUpdate(address newRecoveryAddress) external {
        _validateExecuteBySelf();
        _updateRecoveryAddress(newRecoveryAddress);
    }

    /**
     * @dev External function that can only be called by the contract itself to execute timelock update
     * @param newTimeLockPeriodSec The new timelock period in seconds
     */
    function executeTimeLockUpdate(uint256 newTimeLockPeriodSec) external {
        _validateExecuteBySelf();
        _updateTimeLockPeriod(newTimeLockPeriodSec);
    }

    // ============ INTERNAL FUNCTIONS ============

    /**
     * @dev Reverts if an ownership-transfer or broadcaster-update request is already pending.
     */
    function _requireNoPendingRequest() internal view {
        if (_hasOpenRequest) revert SharedValidation.PendingSecureRequest();
    }

    /**
     * @dev Validates that the caller is the broadcaster and that the meta-tx signer is the owner.
     * @param metaTx The meta-transaction to validate
     */
    function _validateBroadcasterAndOwnerSigner(EngineBlox.MetaTransaction memory metaTx) internal view {
        _validateBroadcaster(msg.sender);
        SharedValidation.validateOwnerIsSigner(metaTx.params.signer, owner());
    }

    /**
     * @dev Completes ownership/broadcaster flow after approval: resets flag and returns txId.
     * @param updatedRecord The updated transaction record from approval
     * @return txId The transaction ID
     */
    function _completeApprove(EngineBlox.TxRecord memory updatedRecord) internal returns (uint256 txId) {
        _hasOpenRequest = false;
        return updatedRecord.txId;
    }

    /**
     * @dev Completes ownership/broadcaster flow after cancellation: resets flag, logs txId, returns txId.
     * @param updatedRecord The updated transaction record from cancellation
     * @return txId The transaction ID
     */
    function _completeCancel(EngineBlox.TxRecord memory updatedRecord) internal returns (uint256 txId) {
        _hasOpenRequest = false;
        return updatedRecord.txId;
    }

    /**
     * @dev Transfers ownership of the contract
     * @param newOwner The new owner of the contract
     */
    function _transferOwnership(address newOwner) internal virtual {
        address oldOwner = owner();
        _updateAssignedWallet(EngineBlox.OWNER_ROLE, newOwner, oldOwner);
        _logAddressPairEvent(oldOwner, newOwner);
    }

    /**
     * @dev Updates the broadcaster role at a specific index (location)
     * @param newBroadcaster The new broadcaster address (zero address to revoke)
     * @param location The index in the broadcaster role's authorized wallets set
     *
     * Logic:
     * - If a broadcaster exists at `location` and `newBroadcaster` is non-zero,
     *   update that slot from old to new (role remains full).
     * - If no broadcaster exists at `location` and `newBroadcaster` is non-zero,
     *   assign `newBroadcaster` to the broadcaster role (respecting maxWallets).
     * - If `newBroadcaster` is the zero address and a broadcaster exists at `location`,
     *   revoke that broadcaster from the role.
     */
    function _updateBroadcaster(address newBroadcaster, uint256 location) internal virtual {
        EngineBlox.Role storage role = _getSecureState().roles[EngineBlox.BROADCASTER_ROLE];

        address oldBroadcaster;
        uint256 length = role.walletCount;

        if (location < length) {
            oldBroadcaster = _getAuthorizedWalletAt(EngineBlox.BROADCASTER_ROLE, location);
        } else {
            oldBroadcaster = address(0);
        }

        // Case 1: Revoke existing broadcaster at location
        if (newBroadcaster == address(0)) {
            if (oldBroadcaster != address(0)) {
                _revokeWallet(EngineBlox.BROADCASTER_ROLE, oldBroadcaster);
                _logAddressPairEvent(oldBroadcaster, address(0));
            }
            return;
        }

        // Case 2: Update existing broadcaster at location
        if (oldBroadcaster != address(0)) {
            _updateAssignedWallet(EngineBlox.BROADCASTER_ROLE, newBroadcaster, oldBroadcaster);
            _logAddressPairEvent(oldBroadcaster, newBroadcaster);
            return;
        }

        // Case 3: No broadcaster at location, assign a new one (will respect maxWallets)
        _assignWallet(EngineBlox.BROADCASTER_ROLE, newBroadcaster);
        _logAddressPairEvent(address(0), newBroadcaster);
    }

    /**
     * @dev Updates the recovery address
     * @param newRecoveryAddress The new recovery address
     */
    function _updateRecoveryAddress(address newRecoveryAddress) internal virtual {
        address oldRecovery = getRecovery();
        _updateAssignedWallet(EngineBlox.RECOVERY_ROLE, newRecoveryAddress, oldRecovery);
        _logAddressPairEvent(oldRecovery, newRecoveryAddress);
    }

    /**
     * @dev Emits ComponentEvent with ABI-encoded (address, address) payload. Reused to reduce contract size.
     * @param a First address
     * @param b Second address
     */
    function _logAddressPairEvent(address a, address b) internal {
        _logComponentEvent(abi.encode(a, b));
    }
}
