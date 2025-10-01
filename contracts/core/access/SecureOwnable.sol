// SPDX-License-Identifier: MPL-2.0
pragma solidity ^0.8.25;

// Contracts imports
import "../base/BaseStateMachine.sol";
import "../../lib/definitions/SecureOwnableDefinitions.sol";
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

    event OwnershipTransferRequest(address currentOwner, address newOwner);
    event OwnershipTransferCancelled(uint256 txId);
    event OwnershipTransferUpdated(address oldOwner, address newOwner);
    event BroadcasterUpdateRequest(address currentBroadcaster, address newBroadcaster);
    event BroadcasterUpdateCancelled(uint256 txId);
    event BroadcasterUpdated(address oldBroadcaster, address newBroadcaster);
    event RecoveryAddressUpdated(address oldRecovery, address newRecovery);
    event TimeLockPeriodUpdated(uint256 oldPeriod, uint256 newPeriod);

    modifier onlyOwner() {
        SharedValidation.validateOwner(owner());
        _;
    }

    modifier onlyOwnerOrRecovery() {
        SharedValidation.validateOwnerOrRecovery(owner(), getRecovery());
        _;
    }
    
    modifier onlyRecovery() {
        SharedValidation.validateRecovery(getRecovery());
        _;
    }

    modifier onlyBroadcaster() {
        SharedValidation.validateBroadcaster(getBroadcaster());
        _;
    }

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
        // Initialize base state machine
        _initializeBaseStateMachine(initialOwner, broadcaster, recovery, timeLockPeriodSec, eventForwarder);
        
        // Load SecureOwnable-specific definitions
        IDefinition.RolePermission memory secureOwnablePermissions = SecureOwnableDefinitions.getRolePermissions();
        StateAbstraction.loadDefinitions(
            _getSecureState(),
            SecureOwnableDefinitions.getFunctionSchemas(),
            secureOwnablePermissions.roleHashes,
            secureOwnablePermissions.functionPermissions
        );
    }

    // Ownership Management
    /**
     * @dev Requests a transfer of ownership
     * @return The transaction record
     */
    function transferOwnershipRequest() public onlyRecovery returns (StateAbstraction.TxRecord memory) {
        if (_hasOpenOwnershipRequest) revert SharedValidation.RequestAlreadyPending(0);
        
        StateAbstraction.TxRecord memory txRecord = _requestStandardTransaction(
            msg.sender,
            address(this),
            0, // no gas limit
            SecureOwnableDefinitions.OWNERSHIP_TRANSFER,
            SecureOwnableDefinitions.TRANSFER_OWNERSHIP_SELECTOR,
            abi.encode(getRecovery())
        );

        _hasOpenOwnershipRequest = true;
        emit OwnershipTransferRequest(owner(), getRecovery());
        return txRecord;
    }

    /**
     * @dev Approves a pending ownership transfer transaction after the release time
     * @param txId The transaction ID
     * @return The updated transaction record
     */
    function transferOwnershipDelayedApproval(uint256 txId) public onlyOwnerOrRecovery returns (StateAbstraction.TxRecord memory) {
        StateAbstraction.TxRecord memory updatedRecord = _approveTransaction(txId, SecureOwnableDefinitions.OWNERSHIP_TRANSFER);
        _hasOpenOwnershipRequest = false;
        return updatedRecord;
    }

    /**
     * @dev Approves a pending ownership transfer transaction using a meta-transaction
     * @param metaTx The meta-transaction
     * @return The updated transaction record
     */
    function transferOwnershipApprovalWithMetaTx(StateAbstraction.MetaTransaction memory metaTx) public onlyBroadcaster returns (StateAbstraction.TxRecord memory) {
        StateAbstraction.TxRecord memory updatedRecord = _approveTransactionWithMetaTx(
            metaTx,
            SecureOwnableDefinitions.OWNERSHIP_TRANSFER,
            SecureOwnableDefinitions.TRANSFER_OWNERSHIP_APPROVE_META_SELECTOR,
            StateAbstraction.TxAction.EXECUTE_META_APPROVE
        );
        _hasOpenOwnershipRequest = false;
        return updatedRecord;
    }

    /**
     * @dev Cancels a pending ownership transfer transaction
     * @param txId The transaction ID
     * @return The updated transaction record
     */
    function transferOwnershipCancellation(uint256 txId) public onlyRecovery returns (StateAbstraction.TxRecord memory) {
        StateAbstraction.TxRecord memory updatedRecord = _cancelTransaction(txId, SecureOwnableDefinitions.OWNERSHIP_TRANSFER);
        _hasOpenOwnershipRequest = false;
        emit OwnershipTransferCancelled(txId);
        return updatedRecord;
    }

    /**
     * @dev Cancels a pending ownership transfer transaction using a meta-transaction
     * @param metaTx The meta-transaction
     * @return The updated transaction record
     */
    function transferOwnershipCancellationWithMetaTx(StateAbstraction.MetaTransaction memory metaTx) public onlyBroadcaster returns (StateAbstraction.TxRecord memory) {
        StateAbstraction.TxRecord memory updatedRecord = _cancelTransactionWithMetaTx(
            metaTx,
            SecureOwnableDefinitions.OWNERSHIP_TRANSFER,
            SecureOwnableDefinitions.TRANSFER_OWNERSHIP_CANCEL_META_SELECTOR,
            StateAbstraction.TxAction.EXECUTE_META_CANCEL
        );
        _hasOpenOwnershipRequest = false;
        emit OwnershipTransferCancelled(updatedRecord.txId);
        return updatedRecord;
    }

    // Broadcaster Management
    /**
     * @dev Updates the broadcaster address
     * @param newBroadcaster The new broadcaster address
     * @return The execution options
     */
    function updateBroadcasterRequest(address newBroadcaster) public onlyOwner returns (StateAbstraction.TxRecord memory) {
        if (_hasOpenBroadcasterRequest) revert SharedValidation.RequestAlreadyPending(0);
        SharedValidation.validateAddressUpdate(newBroadcaster, getBroadcaster());
        
        StateAbstraction.TxRecord memory txRecord = _requestStandardTransaction(
            msg.sender,
            address(this),
            0,
            SecureOwnableDefinitions.BROADCASTER_UPDATE,
            SecureOwnableDefinitions.UPDATE_BROADCASTER_SELECTOR,
            abi.encode(newBroadcaster)
        );

        _hasOpenBroadcasterRequest = true;
        emit BroadcasterUpdateRequest(getBroadcaster(), newBroadcaster);
        return txRecord;
    }

    /**
     * @dev Approves a pending broadcaster update transaction after the release time
     * @param txId The transaction ID
     * @return The updated transaction record
     */
    function updateBroadcasterDelayedApproval(uint256 txId) public onlyOwner returns (StateAbstraction.TxRecord memory) {
        StateAbstraction.TxRecord memory updatedRecord = _approveTransaction(txId, SecureOwnableDefinitions.BROADCASTER_UPDATE);
        _hasOpenBroadcasterRequest = false;
        return updatedRecord;
    }

    /**
     * @dev Approves a pending broadcaster update transaction using a meta-transaction
     * @param metaTx The meta-transaction
     * @return The updated transaction record
     */
    function updateBroadcasterApprovalWithMetaTx(StateAbstraction.MetaTransaction memory metaTx) public onlyBroadcaster returns (StateAbstraction.TxRecord memory) {
        StateAbstraction.TxRecord memory updatedRecord = _approveTransactionWithMetaTx(
            metaTx,
            SecureOwnableDefinitions.BROADCASTER_UPDATE,
            SecureOwnableDefinitions.UPDATE_BROADCASTER_APPROVE_META_SELECTOR,
            StateAbstraction.TxAction.EXECUTE_META_APPROVE
        );
        _hasOpenBroadcasterRequest = false;
        return updatedRecord;
    }

    /**
     * @dev Cancels a pending broadcaster update transaction
     * @param txId The transaction ID
     * @return The updated transaction record
     */
    function updateBroadcasterCancellation(uint256 txId) public onlyOwner returns (StateAbstraction.TxRecord memory) {
        StateAbstraction.TxRecord memory updatedRecord = _cancelTransaction(txId, SecureOwnableDefinitions.BROADCASTER_UPDATE);
        _hasOpenBroadcasterRequest = false;
        emit BroadcasterUpdateCancelled(txId);
        return updatedRecord;
    }

    /**
     * @dev Cancels a pending broadcaster update transaction using a meta-transaction
     * @param metaTx The meta-transaction
     * @return The updated transaction record
     */
    function updateBroadcasterCancellationWithMetaTx(StateAbstraction.MetaTransaction memory metaTx) public onlyBroadcaster returns (StateAbstraction.TxRecord memory) {
        StateAbstraction.TxRecord memory updatedRecord = _cancelTransactionWithMetaTx(
            metaTx,
            SecureOwnableDefinitions.BROADCASTER_UPDATE,
            SecureOwnableDefinitions.UPDATE_BROADCASTER_CANCEL_META_SELECTOR,
            StateAbstraction.TxAction.EXECUTE_META_CANCEL
        );
        _hasOpenBroadcasterRequest = false;
        emit BroadcasterUpdateCancelled(updatedRecord.txId);
        return updatedRecord;
    }

    // Recovery Management
    /**
     * @dev Creates execution options for updating the recovery address
     * @param newRecoveryAddress The new recovery address
     * @return The execution options
     */
    function updateRecoveryExecutionOptions(
        address newRecoveryAddress
    ) public view returns (bytes memory) {
        SharedValidation.validateAddressUpdate(newRecoveryAddress, getRecovery());
        return _createStandardExecutionOptions(
            SecureOwnableDefinitions.UPDATE_RECOVERY_SELECTOR,
            abi.encode(newRecoveryAddress)
        );
    }

    /**
     * @dev Requests and approves a recovery address update using a meta-transaction
     * @param metaTx The meta-transaction
     * @return The transaction record
     */
    function updateRecoveryRequestAndApprove(
        StateAbstraction.MetaTransaction memory metaTx
    ) public onlyBroadcaster returns (StateAbstraction.TxRecord memory) {
        return _requestAndApproveTransaction(
            metaTx,
            SecureOwnableDefinitions.UPDATE_RECOVERY_META_SELECTOR,
            StateAbstraction.TxAction.EXECUTE_META_REQUEST_AND_APPROVE
        );
    }

    // TimeLock Management
    /**
     * @dev Creates execution options for updating the time lock period
     * @param newTimeLockPeriodSec The new time lock period in seconds
     * @return The execution options
     */
    function updateTimeLockExecutionOptions(
        uint256 newTimeLockPeriodSec
    ) public view returns (bytes memory) {
        SharedValidation.validateTimeLockUpdate(newTimeLockPeriodSec, getTimeLockPeriodSec());
        return _createStandardExecutionOptions(
            SecureOwnableDefinitions.UPDATE_TIMELOCK_SELECTOR,
            abi.encode(newTimeLockPeriodSec)
        );
    }

    /**
     * @dev Requests and approves a time lock period update using a meta-transaction
     * @param metaTx The meta-transaction
     * @return The transaction record
     */
    function updateTimeLockRequestAndApprove(
        StateAbstraction.MetaTransaction memory metaTx
    ) public onlyBroadcaster returns (StateAbstraction.TxRecord memory) {
        return _requestAndApproveTransaction(
            metaTx,
            SecureOwnableDefinitions.UPDATE_TIMELOCK_META_SELECTOR,
            StateAbstraction.TxAction.EXECUTE_META_REQUEST_AND_APPROVE
        );
    }

    // Execution Functions
    /**
     * @dev External function that can only be called by the contract itself to execute ownership transfer
     * @param newOwner The new owner address
     */
    function executeTransferOwnership(address newOwner) external {
        SharedValidation.validateInternalCallInternal(address(this));
        _transferOwnership(newOwner);
    }

    /**
     * @dev External function that can only be called by the contract itself to execute broadcaster update
     * @param newBroadcaster The new broadcaster address
     */
    function executeBroadcasterUpdate(address newBroadcaster) external {
        SharedValidation.validateInternalCallInternal(address(this));
        _updateBroadcaster(newBroadcaster);
    }

    /**
     * @dev External function that can only be called by the contract itself to execute recovery update
     * @param newRecoveryAddress The new recovery address
     */
    function executeRecoveryUpdate(address newRecoveryAddress) external {
        SharedValidation.validateInternalCallInternal(address(this));
        _updateRecoveryAddress(newRecoveryAddress);
    }

    /**
     * @dev External function that can only be called by the contract itself to execute timelock update
     * @param newTimeLockPeriodSec The new timelock period in seconds
     */
    function executeTimeLockUpdate(uint256 newTimeLockPeriodSec) external {
        SharedValidation.validateInternalCallInternal(address(this));
        _updateTimeLockPeriod(newTimeLockPeriodSec);
    }

    // Ownership management
    /**
     * @dev Returns the owner of the contract
     * @return The owner of the contract
     */
    function owner() public view virtual override returns (address) {
        return _getAuthorizedWalletAt(StateAbstraction.OWNER_ROLE, 0);
    }

    /**
     * @dev Returns the broadcaster address
     * @return The broadcaster address
     */
    function getBroadcaster() public view virtual override returns (address) {
        return _getAuthorizedWalletAt(StateAbstraction.BROADCASTER_ROLE, 0);
    }

    /**
     * @dev Returns the recovery address
     * @return The recovery address
     */
    function getRecovery() public view virtual override returns (address) {
        return _getAuthorizedWalletAt(StateAbstraction.RECOVERY_ROLE, 0);
    }

    /**
     * @dev Transfers ownership of the contract
     * @param newOwner The new owner of the contract
     */
    function _transferOwnership(address newOwner) internal virtual {
        address oldOwner = owner();
        _updateAssignedWallet(StateAbstraction.OWNER_ROLE, newOwner, oldOwner);
        emit OwnershipTransferUpdated(oldOwner, newOwner);
    }

    /**
     * @dev Updates the broadcaster address
     * @param newBroadcaster The new broadcaster address
     */
    function _updateBroadcaster(address newBroadcaster) internal virtual {
        address oldBroadcaster = getBroadcaster();
        _updateAssignedWallet(StateAbstraction.BROADCASTER_ROLE, newBroadcaster, oldBroadcaster);
        emit BroadcasterUpdated(oldBroadcaster, newBroadcaster);
    }

    /**
     * @dev Updates the recovery address
     * @param newRecoveryAddress The new recovery address
     */
    function _updateRecoveryAddress(address newRecoveryAddress) internal virtual {
        address oldRecovery = getRecovery();
        _updateAssignedWallet(StateAbstraction.RECOVERY_ROLE, newRecoveryAddress, oldRecovery);
        emit RecoveryAddressUpdated(oldRecovery, newRecoveryAddress);
    }

    /**
     * @dev Updates the time lock period
     * @param newTimeLockPeriodSec The new time lock period in seconds
     */
    function _updateTimeLockPeriod(uint256 newTimeLockPeriodSec) internal virtual override {
        uint256 oldPeriod = getTimeLockPeriodSec();
        StateAbstraction.updateTimeLockPeriod(_getSecureState(), newTimeLockPeriodSec);
        emit TimeLockPeriodUpdated(oldPeriod, newTimeLockPeriodSec);
    }

    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return
            interfaceId == type(ISecureOwnable).interfaceId ||
            super.supportsInterface(interfaceId);
    }
}
