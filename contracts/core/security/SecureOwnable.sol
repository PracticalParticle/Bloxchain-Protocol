// SPDX-License-Identifier: MPL-2.0
pragma solidity 0.8.34;

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
 * Pending secure requests use separate flags for ownership transfer and broadcaster update.
 * A new ownership-transfer request is allowed if no ownership transfer is already pending
 * (a broadcaster update may still be pending). A new broadcaster-update request is allowed only
 * when neither type has a pending request.
 *
 * **Ownership transfer vs recovery (threat model):**
 * - `transferOwnershipRequest` snapshots `getRecovery()` into the pending tx `executionParams`. On execution,
 *   `executeTransferOwnership` receives that snapshotted address as the new owner. Rotating recovery after
 *   the request does **not** rewrite the pending payload; the beneficiary remains the recovery address
 *   at request time.
 * - `transferOwnershipDelayedApproval` authorizes the **current** owner or **current** recovery (`getRecovery()`
 *   at approval time). It does **not** require the approver to match the snapshotted beneficiary. Integrators
 *   must treat approval as consent to execute the **stored** transfer, not “transfer to whoever is recovery now.”
 * - `transferOwnershipCancellation` allows only the **current** recovery to cancel. If owner and broadcaster
 *   rotate recovery via `updateRecoveryRequestAndApprove` while a transfer is pending, the **previous**
 *   recovery loses cancel rights immediately; the pending tx still targets the old address until approved,
 *   cancelled by the new recovery, or superseded operationally.
 * - Recovery and timelock updates use a request-and-approve meta-tx path without an additional timelock and
 *   are **not** blocked when an ownership transfer is pending (unlike broadcaster update requests). This is
 *   intentional: fast recovery rotation when owner and broadcaster still cooperate; operators who need a
 *   strict “recovery cannot change during pending ownership transfer” invariant must enforce it off-chain or
 *   extend this contract.
 *
 * This contract focuses purely on security logic while leveraging the BaseStateMachine
 * for transaction management, meta-transactions, and state machine operations.
 */
abstract contract SecureOwnable is BaseStateMachine, ISecureOwnable {
    using SharedValidation for *;

    /// @dev Lane flags for **delayed** ownership-transfer and broadcaster-update requests only (`transferOwnershipRequest`,
    ///      `updateBroadcasterRequest`). Recovery and timelock updates use `_requestAndApproveTransaction` and do **not**
    ///      read or write these booleans. Each flag is set only after a successful `_requestTransaction` in that same tx;
    ///      clearing happens only in `_completeApprove` / `_completeCancel` in the **same** transaction as a successful
    ///      `_approveTransaction` / `_cancelTransaction`, so a revert unwinds engine state and flag writes together.
    /// @dev Upgrading from legacy `_hasOpenRequest` / `_pendingBits` requires no pending requests.
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
        _initializeBaseStateMachine(initialOwner, broadcaster, recovery, timeLockPeriodSec, eventForwarder);

        // Load SecureOwnable-specific definitions
        IDefinition.RolePermission memory secureOwnablePermissions = SecureOwnableDefinitions.getRolePermissions();
        _loadDefinitions(
            SecureOwnableDefinitions.getFunctionSchemas(),
            secureOwnablePermissions.roleHashes,
            secureOwnablePermissions.functionPermissions,
            true // Enforce all function schemas are protected
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
     * @dev Requests a time-delayed transfer of the OWNER role to the **recovery address at request time**.
     * @notice Encodes `getRecovery()` into `executionParams`; that address becomes the new owner on successful
     *         execution. Changing recovery later does not update this pending record.
     * @return txId The transaction ID (use getTransaction(txId) for full record)
     */
    function transferOwnershipRequest() public returns (uint256 txId) {
        SharedValidation.validateRecovery(getRecovery());
        _requireNoPendingRequest(SecureOwnableDefinitions.OWNERSHIP_TRANSFER);

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
        _logAddressPairEvent(owner(), getRecovery());
        return txRecord.txId;
    }

    /**
     * @dev Approves a pending ownership transfer after `releaseTime` (timelock on the direct path).
     * @notice Callable by **current** owner or **current** recovery. Execution still transfers ownership to
     *         the address snapshotted at request time, which may differ from `getRecovery()` at approval time.
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
     * @dev Cancels a pending ownership transfer transaction.
     * @notice Only the **current** `getRecovery()` may cancel. After a recovery rotation, the prior recovery
     *         address can no longer cancel.
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
     * @notice Requires no pending broadcaster-update and no pending ownership-transfer request.
     * @param newBroadcaster The new broadcaster address (zero address to revoke at location)
     * @param location The index in the broadcaster role's authorized wallets set
     * @return txId The transaction ID for the pending request (use getTransaction(txId) for full record)
     */
    function updateBroadcasterRequest(address newBroadcaster, uint256 location) public returns (uint256 txId) {
        SharedValidation.validateOwner(owner());
        _requireNoPendingRequest(SecureOwnableDefinitions.BROADCASTER_UPDATE);
        _requireNoPendingRequest(SecureOwnableDefinitions.OWNERSHIP_TRANSFER);

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

        _hasOpenBroadcasterRequest = true;
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
     * @dev Requests and approves a recovery address update using a meta-transaction (owner signs, broadcaster submits).
     * @notice Does **not** revert when an ownership transfer is pending. A pending transfer continues to target
     *         the recovery address snapshotted at its request until executed or cancelled by **current** recovery.
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
     * @dev External function that can only be called by the contract itself to execute ownership transfer.
     * @param newOwner The new owner; for the OWNERSHIP_TRANSFER flow this is the recovery address encoded at
     *        request time (see `transferOwnershipRequest`), not necessarily `getRecovery()` at execution time.
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
     * @dev Validates that the caller is the broadcaster and that the meta-tx signer is the owner.
     * @param metaTx The meta-transaction to validate
     */
    function _validateBroadcasterAndOwnerSigner(EngineBlox.MetaTransaction memory metaTx) internal view {
        _validateBroadcaster(msg.sender);
        SharedValidation.validateOwnerIsSigner(metaTx.params.signer, owner());
    }

    /**
     * @dev Completes ownership/broadcaster flow after approval: clears the matching pending flag and returns txId.
     * @param updatedRecord The updated transaction record from approval
     * @return txId The transaction ID
     */
    function _completeApprove(EngineBlox.TxRecord memory updatedRecord) internal returns (uint256 txId) {
        _clearPendingFlagForOperation(updatedRecord.params.operationType);
        return updatedRecord.txId;
    }

    /**
     * @dev Completes ownership/broadcaster flow after cancellation: clears the matching pending flag and returns txId.
     * @param updatedRecord The updated transaction record from cancellation
     * @return txId The transaction ID
     */
    function _completeCancel(EngineBlox.TxRecord memory updatedRecord) internal returns (uint256 txId) {
        _clearPendingFlagForOperation(updatedRecord.params.operationType);
        return updatedRecord.txId;
    }

    /**
     * @dev Reverts if the pending flag for `requestOperationType` is already set (one lane per call).
     *      `OWNERSHIP_TRANSFER` checks only `_hasOpenOwnershipRequest` (a broadcaster update may still be pending).
     *      `BROADCASTER_UPDATE` checks only `_hasOpenBroadcasterRequest`. Callers that need both lanes idle
     *      (e.g. `updateBroadcasterRequest`) invoke this once per operation type.
     * @param requestOperationType Lane to validate (`OWNERSHIP_TRANSFER` or `BROADCASTER_UPDATE`).
     */
    function _requireNoPendingRequest(bytes32 requestOperationType) internal view {
        if (requestOperationType == SecureOwnableDefinitions.OWNERSHIP_TRANSFER) {
            if (_hasOpenOwnershipRequest) revert SharedValidation.PendingSecureRequest();
        } else if (requestOperationType == SecureOwnableDefinitions.BROADCASTER_UPDATE) {
            if (_hasOpenBroadcasterRequest) revert SharedValidation.PendingSecureRequest();
        } else {
            revert();
        }
    }

    /**
     * @dev Clears the pending flag for a completed or cancelled secure op (approve/cancel paths).
     * @param operationType The tx record's `operationType` (`OWNERSHIP_TRANSFER` or `BROADCASTER_UPDATE`).
     */
    function _clearPendingFlagForOperation(bytes32 operationType) private {
        if (operationType == SecureOwnableDefinitions.OWNERSHIP_TRANSFER) {
            _hasOpenOwnershipRequest = false;
        } else if (operationType == SecureOwnableDefinitions.BROADCASTER_UPDATE) {
            _hasOpenBroadcasterRequest = false;
        } else {
            revert();
        }
    }

    /**
     * @dev Transfers ownership of the contract
     * @param newOwner The new owner of the contract
     */
    function _transferOwnership(address newOwner) internal virtual {
        address oldOwner = owner();
        _updateWallet(EngineBlox.OWNER_ROLE, newOwner, oldOwner);
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
            _updateWallet(EngineBlox.BROADCASTER_ROLE, newBroadcaster, oldBroadcaster);
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
        _updateWallet(EngineBlox.RECOVERY_ROLE, newRecoveryAddress, oldRecovery);
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
