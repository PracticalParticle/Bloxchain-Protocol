// SPDX-License-Identifier: MPL-2.0
pragma solidity 0.8.33;

// Contracts imports
import "../base/BaseStateMachine.sol";
import "./lib/definitions/SecureOwnableDefinitions.sol";
import "../../interfaces/IDefinition.sol";
import "../../utils/SharedValidation.sol";
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
 * This contract focuses purely on security logic while leveraging the BaseStateMachine
 * for transaction management, meta-transactions, and state machine operations.
 */
abstract contract SecureOwnable is BaseStateMachine, ISecureOwnable {
    using SharedValidation for *;

    // Request flags
    bool private _hasOpenOwnershipRequest;
    bool private _hasOpenBroadcasterRequest;

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
     * @return The transaction record
     */
    function transferOwnershipRequest() public returns (EngineBlox.TxRecord memory) {
        SharedValidation.validateRecovery(getRecovery());
        if (_hasOpenOwnershipRequest) revert SharedValidation.ResourceAlreadyExists(bytes32(uint256(0)));
        
        EngineBlox.TxRecord memory txRecord = _requestTransaction(
            msg.sender,
            address(this),
            0, // value
            0, // no gas limit
            SecureOwnableDefinitions.OWNERSHIP_TRANSFER,
            SecureOwnableDefinitions.TRANSFER_OWNERSHIP_SELECTOR,
            abi.encode(getRecovery())
        );

        _hasOpenOwnershipRequest = true;
        _logComponentEvent(abi.encode(owner(), getRecovery()));
        return txRecord;
    }

    /**
     * @dev Approves a pending ownership transfer transaction after the release time
     * @param txId The transaction ID
     * @return The updated transaction record
     */
    function transferOwnershipDelayedApproval(uint256 txId) public returns (EngineBlox.TxRecord memory) {
        SharedValidation.validateOwnerOrRecovery(owner(), getRecovery());
        
        return _completeOwnershipApprove(_approveTransaction(txId));
    }

    /**
     * @dev Approves a pending ownership transfer transaction using a meta-transaction
     * @param metaTx The meta-transaction
     * @return The updated transaction record
     */
    function transferOwnershipApprovalWithMetaTx(EngineBlox.MetaTransaction memory metaTx) public returns (EngineBlox.TxRecord memory) {
        _validateBroadcasterAndOwnerSigner(metaTx);

        return _completeOwnershipApprove(_approveTransactionWithMetaTx(metaTx));
    }

    /**
     * @dev Cancels a pending ownership transfer transaction
     * @param txId The transaction ID
     * @return The updated transaction record
     */
    function transferOwnershipCancellation(uint256 txId) public returns (EngineBlox.TxRecord memory) {
        SharedValidation.validateRecovery(getRecovery());
        return _completeOwnershipCancel(_cancelTransaction(txId));
    }

    /**
     * @dev Cancels a pending ownership transfer transaction using a meta-transaction
     * @param metaTx The meta-transaction
     * @return The updated transaction record
     */
    function transferOwnershipCancellationWithMetaTx(EngineBlox.MetaTransaction memory metaTx) public returns (EngineBlox.TxRecord memory) {
        _validateBroadcasterAndOwnerSigner(metaTx);

        return _completeOwnershipCancel(_cancelTransactionWithMetaTx(metaTx));
    }

    // Broadcaster Management
    /**
     * @dev Updates the broadcaster address
     * @param newBroadcaster The new broadcaster address
     * @return The execution options
     */
    function updateBroadcasterRequest(address newBroadcaster) public returns (EngineBlox.TxRecord memory) {
        SharedValidation.validateOwner(owner());
        if (_hasOpenBroadcasterRequest) revert SharedValidation.ResourceAlreadyExists(bytes32(uint256(0)));
        address currentBroadcaster = _getAuthorizedWalletAt(EngineBlox.BROADCASTER_ROLE, 0);
        SharedValidation.validateAddressUpdate(newBroadcaster, currentBroadcaster);
        
        EngineBlox.TxRecord memory txRecord = _requestTransaction(
            msg.sender,
            address(this),
            0, // value
            0, // gas limit
            SecureOwnableDefinitions.BROADCASTER_UPDATE,
            SecureOwnableDefinitions.UPDATE_BROADCASTER_SELECTOR,
            abi.encode(newBroadcaster)
        );

        _hasOpenBroadcasterRequest = true;
        _logComponentEvent(abi.encode(currentBroadcaster, newBroadcaster));
        return txRecord;
    }

    /**
     * @dev Approves a pending broadcaster update transaction after the release time
     * @param txId The transaction ID
     * @return The updated transaction record
     */
    function updateBroadcasterDelayedApproval(uint256 txId) public returns (EngineBlox.TxRecord memory) {
        SharedValidation.validateOwner(owner());
        return _completeBroadcasterApprove(_approveTransaction(txId));
    }

    /**
     * @dev Approves a pending broadcaster update transaction using a meta-transaction
     * @param metaTx The meta-transaction
     * @return The updated transaction record
     */
    function updateBroadcasterApprovalWithMetaTx(EngineBlox.MetaTransaction memory metaTx) public returns (EngineBlox.TxRecord memory) {
        _validateBroadcasterAndOwnerSigner(metaTx);

        return _completeBroadcasterApprove(_approveTransactionWithMetaTx(metaTx));
    }

    /**
     * @dev Cancels a pending broadcaster update transaction
     * @param txId The transaction ID
     * @return The updated transaction record
     */
    function updateBroadcasterCancellation(uint256 txId) public returns (EngineBlox.TxRecord memory) {
        SharedValidation.validateOwner(owner());
        return _completeBroadcasterCancel(_cancelTransaction(txId));
    }

    /**
     * @dev Cancels a pending broadcaster update transaction using a meta-transaction
     * @param metaTx The meta-transaction
     * @return The updated transaction record
     */
    function updateBroadcasterCancellationWithMetaTx(EngineBlox.MetaTransaction memory metaTx) public returns (EngineBlox.TxRecord memory) {
        _validateBroadcasterAndOwnerSigner(metaTx);

        return _completeBroadcasterCancel(_cancelTransactionWithMetaTx(metaTx));
    }

    // Recovery Management
    /**
     * @dev Creates execution params for updating the recovery address
     * @param newRecoveryAddress The new recovery address
     * @return The execution params
     */
    function updateRecoveryExecutionParams(
        address newRecoveryAddress
    ) public view returns (bytes memory) {
        SharedValidation.validateAddressUpdate(newRecoveryAddress, getRecovery());
        return abi.encode(newRecoveryAddress);
    }

    /**
     * @dev Requests and approves a recovery address update using a meta-transaction
     * @param metaTx The meta-transaction
     * @return The transaction record
     */
    function updateRecoveryRequestAndApprove(
        EngineBlox.MetaTransaction memory metaTx
    ) public returns (EngineBlox.TxRecord memory) {
        _validateBroadcasterAndOwnerSigner(metaTx);

        return _requestAndApproveTransaction(metaTx);
    }

    // TimeLock Management
    /**
     * @dev Creates execution params for updating the time lock period
     * @param newTimeLockPeriodSec The new time lock period in seconds
     * @return The execution params
     */
    function updateTimeLockExecutionParams(
        uint256 newTimeLockPeriodSec
    ) public view returns (bytes memory) {
        SharedValidation.validateTimeLockUpdate(newTimeLockPeriodSec, getTimeLockPeriodSec());
        return abi.encode(newTimeLockPeriodSec);
    }

    /**
     * @dev Requests and approves a time lock period update using a meta-transaction
     * @param metaTx The meta-transaction
     * @return The transaction record
     */
    function updateTimeLockRequestAndApprove(
        EngineBlox.MetaTransaction memory metaTx
    ) public returns (EngineBlox.TxRecord memory) {
        _validateBroadcasterAndOwnerSigner(metaTx);

        return _requestAndApproveTransaction(metaTx);
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
     * @param newBroadcaster The new broadcaster address
     */
    function executeBroadcasterUpdate(address newBroadcaster) external {
        _validateExecuteBySelf();
        _updateBroadcaster(newBroadcaster, 0);
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
     * @dev Validates that the caller is the broadcaster and that the meta-tx signer is the owner.
     * @param metaTx The meta-transaction to validate
     */
    function _validateBroadcasterAndOwnerSigner(EngineBlox.MetaTransaction memory metaTx) internal view {
        _validateBroadcaster(msg.sender);
        SharedValidation.validateOwnerIsSigner(metaTx.params.signer, owner());
    }

    /**
     * @dev Completes ownership flow after approval: resets flag and returns record.
     */
    function _completeOwnershipApprove(EngineBlox.TxRecord memory updatedRecord) internal returns (EngineBlox.TxRecord memory) {
        _hasOpenOwnershipRequest = false;
        return updatedRecord;
    }

    /**
     * @dev Completes ownership flow after cancellation: resets flag, logs txId, returns record.
     */
    function _completeOwnershipCancel(EngineBlox.TxRecord memory updatedRecord) internal returns (EngineBlox.TxRecord memory) {
        _hasOpenOwnershipRequest = false;
        _logComponentEvent(abi.encode(updatedRecord.txId));
        return updatedRecord;
    }

    /**
     * @dev Completes broadcaster flow after approval: resets flag and returns record.
     */
    function _completeBroadcasterApprove(EngineBlox.TxRecord memory updatedRecord) internal returns (EngineBlox.TxRecord memory) {
        _hasOpenBroadcasterRequest = false;
        return updatedRecord;
    }

    /**
     * @dev Completes broadcaster flow after cancellation: resets flag, logs txId, returns record.
     */
    function _completeBroadcasterCancel(EngineBlox.TxRecord memory updatedRecord) internal returns (EngineBlox.TxRecord memory) {
        _hasOpenBroadcasterRequest = false;
        _logComponentEvent(abi.encode(updatedRecord.txId));
        return updatedRecord;
    }

    /**
     * @dev Transfers ownership of the contract
     * @param newOwner The new owner of the contract
     */
    function _transferOwnership(address newOwner) internal virtual {
        address oldOwner = owner();
        _updateAssignedWallet(EngineBlox.OWNER_ROLE, newOwner, oldOwner);
        _logComponentEvent(abi.encode(oldOwner, newOwner));
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
                _logComponentEvent(abi.encode(oldBroadcaster, address(0)));
            }
            return;
        }

        // Case 2: Update existing broadcaster at location
        if (oldBroadcaster != address(0)) {
            _updateAssignedWallet(EngineBlox.BROADCASTER_ROLE, newBroadcaster, oldBroadcaster);
            _logComponentEvent(abi.encode(oldBroadcaster, newBroadcaster));
            return;
        }

        // Case 3: No broadcaster at location, assign a new one (will respect maxWallets)
        _assignWallet(EngineBlox.BROADCASTER_ROLE, newBroadcaster);
        _logComponentEvent(abi.encode(address(0), newBroadcaster));
    }

    /**
     * @dev Updates the recovery address
     * @param newRecoveryAddress The new recovery address
     */
    function _updateRecoveryAddress(address newRecoveryAddress) internal virtual {
        address oldRecovery = getRecovery();
        _updateAssignedWallet(EngineBlox.RECOVERY_ROLE, newRecoveryAddress, oldRecovery);
        _logComponentEvent(abi.encode(oldRecovery, newRecoveryAddress));
    }

    /**
     * @dev Updates the time lock period
     * @param newTimeLockPeriodSec The new time lock period in seconds
     */
    function _updateTimeLockPeriod(uint256 newTimeLockPeriodSec) internal virtual override {
        uint256 oldPeriod = getTimeLockPeriodSec();
        super._updateTimeLockPeriod(newTimeLockPeriodSec);
        _logComponentEvent(abi.encode(oldPeriod, newTimeLockPeriodSec));
    }
}
