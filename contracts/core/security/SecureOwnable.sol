// SPDX-License-Identifier: MPL-2.0
pragma solidity ^0.8.25;

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

    event OwnershipTransferRequest(address currentOwner, address newOwner);
    event OwnershipTransferCancelled(uint256 txId);
    event OwnershipTransferUpdated(address oldOwner, address newOwner);
    event BroadcasterUpdateRequest(address currentBroadcaster, address newBroadcaster);
    event BroadcasterUpdateCancelled(uint256 txId);
    event BroadcasterUpdated(address oldBroadcaster, address newBroadcaster);
    event RecoveryAddressUpdated(address oldRecovery, address newRecovery);
    event TimeLockPeriodUpdated(uint256 oldPeriod, uint256 newPeriod);

    // ============ RECOVERY ACCESS CONTROL MODIFIERS ============

    /**
     * @dev Modifier to restrict access to owner or recovery
     */
    modifier onlyOwnerOrRecovery() {
        SharedValidation.validateOwnerOrRecovery(owner(), getRecovery());
        _;
    }
    
    /**
     * @dev Modifier to restrict access to recovery only
     */
    modifier onlyRecovery() {
        SharedValidation.validateRecovery(getRecovery());
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
        // Initialize base state machine (only if not already initialized)
        if (!_secureState.initialized) {
            _initializeBaseStateMachine(initialOwner, broadcaster, recovery, timeLockPeriodSec, eventForwarder);
        }
        
        // Load SecureOwnable-specific definitions
        IDefinition.RolePermission memory secureOwnablePermissions = SecureOwnableDefinitions.getRolePermissions();
        _loadDefinitions(
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
        if (_hasOpenOwnershipRequest) revert SharedValidation.ResourceAlreadyExists(bytes32(uint256(0)));
        
        StateAbstraction.TxRecord memory txRecord = _requestTransaction(
            msg.sender,
            address(this),
            0, // value
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
        StateAbstraction.TxRecord memory updatedRecord = _approveTransaction(txId);
        _hasOpenOwnershipRequest = false;
        return updatedRecord;
    }

    /**
     * @dev Approves a pending ownership transfer transaction using a meta-transaction
     * @param metaTx The meta-transaction
     * @return The updated transaction record
     */
    function transferOwnershipApprovalWithMetaTx(StateAbstraction.MetaTransaction memory metaTx) public onlyBroadcaster returns (StateAbstraction.TxRecord memory) {
        StateAbstraction.TxRecord memory updatedRecord = _approveTransactionWithMetaTx(metaTx);
        _hasOpenOwnershipRequest = false;
        return updatedRecord;
    }

    /**
     * @dev Cancels a pending ownership transfer transaction
     * @param txId The transaction ID
     * @return The updated transaction record
     */
    function transferOwnershipCancellation(uint256 txId) public onlyRecovery returns (StateAbstraction.TxRecord memory) {
        StateAbstraction.TxRecord memory updatedRecord = _cancelTransaction(txId);
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
        StateAbstraction.TxRecord memory updatedRecord = _cancelTransactionWithMetaTx(metaTx);
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
        if (_hasOpenBroadcasterRequest) revert SharedValidation.ResourceAlreadyExists(bytes32(uint256(0)));
        SharedValidation.validateAddressUpdate(newBroadcaster, getBroadcaster());
        
        StateAbstraction.TxRecord memory txRecord = _requestTransaction(
            msg.sender,
            address(this),
            0, // value
            0, // gas limit
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
        StateAbstraction.TxRecord memory updatedRecord = _approveTransaction(txId);
        _hasOpenBroadcasterRequest = false;
        return updatedRecord;
    }

    /**
     * @dev Approves a pending broadcaster update transaction using a meta-transaction
     * @param metaTx The meta-transaction
     * @return The updated transaction record
     */
    function updateBroadcasterApprovalWithMetaTx(StateAbstraction.MetaTransaction memory metaTx) public onlyBroadcaster returns (StateAbstraction.TxRecord memory) {
        StateAbstraction.TxRecord memory updatedRecord = _approveTransactionWithMetaTx(metaTx);
        _hasOpenBroadcasterRequest = false;
        return updatedRecord;
    }

    /**
     * @dev Cancels a pending broadcaster update transaction
     * @param txId The transaction ID
     * @return The updated transaction record
     */
    function updateBroadcasterCancellation(uint256 txId) public onlyOwner returns (StateAbstraction.TxRecord memory) {
        StateAbstraction.TxRecord memory updatedRecord = _cancelTransaction(txId);
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
        StateAbstraction.TxRecord memory updatedRecord = _cancelTransactionWithMetaTx(metaTx);
        _hasOpenBroadcasterRequest = false;
        emit BroadcasterUpdateCancelled(updatedRecord.txId);
        return updatedRecord;
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
        StateAbstraction.MetaTransaction memory metaTx
    ) public onlyBroadcaster returns (StateAbstraction.TxRecord memory) {
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
        StateAbstraction.MetaTransaction memory metaTx
    ) public onlyBroadcaster returns (StateAbstraction.TxRecord memory) {
        return _requestAndApproveTransaction(metaTx);
    }

    // Execution Functions
    /**
     * @dev External function that can only be called by the contract itself to execute ownership transfer
     * @param newOwner The new owner address
     */
    function executeTransferOwnership(address newOwner) external {
        SharedValidation.validateInternalCall(address(this));
        _transferOwnership(newOwner);
    }

    /**
     * @dev External function that can only be called by the contract itself to execute broadcaster update
     * @param newBroadcaster The new broadcaster address
     */
    function executeBroadcasterUpdate(address newBroadcaster) external {
        SharedValidation.validateInternalCall(address(this));
        _updateBroadcaster(newBroadcaster);
    }

    /**
     * @dev External function that can only be called by the contract itself to execute recovery update
     * @param newRecoveryAddress The new recovery address
     */
    function executeRecoveryUpdate(address newRecoveryAddress) external {
        SharedValidation.validateInternalCall(address(this));
        _updateRecoveryAddress(newRecoveryAddress);
    }

    /**
     * @dev External function that can only be called by the contract itself to execute timelock update
     * @param newTimeLockPeriodSec The new timelock period in seconds
     */
    function executeTimeLockUpdate(uint256 newTimeLockPeriodSec) external {
        SharedValidation.validateInternalCall(address(this));
        _updateTimeLockPeriod(newTimeLockPeriodSec);
    }

    // ============ INTERNAL FUNCTIONS ============

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
    function _updateTimeLockPeriod(uint256 newTimeLockPeriodSec) internal virtual {
        uint256 oldPeriod = getTimeLockPeriodSec();
        StateAbstraction.updateTimeLockPeriod(_getSecureState(), newTimeLockPeriodSec);
        emit TimeLockPeriodUpdated(oldPeriod, newTimeLockPeriodSec);
    }
}
