// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

// Particle imports
import "../../../core/security/SecureOwnable.sol";
import "../../../core/lib/utils/SharedValidation.sol";
import "../../../core/lib/interfaces/IDefinition.sol";
import "./PayBloxDefinitions.sol";

/**
 * @title PayBlox
 * @dev A simple application that allows sending ETH to a destination address
 * using the payment management system from BaseStateMachine
 * 
 * This contract demonstrates:
 * - Creating payment requests with native token transfers via _requestTransactionWithPayment
 * - Maintaining a payment table visible only to the owner role
 * - Time-delay workflow for secure payment execution
 * - Simple accounting tool for tracking payments
 */
contract PayBlox is SecureOwnable {
    
    /**
     * @dev Payment record struct for accounting and logging
     * @param paymentDetails The payment details (recipient, amounts)
     * @param timestamp The timestamp when the payment was requested
     * @param requester The address that requested the payment
     * @param status The current status of the payment transaction
     * @param description Optional description/memo for accounting purposes
     */
    struct PaymentRecord {
        EngineBlox.PaymentDetails paymentDetails;
        uint256 timestamp;
        address requester;
        EngineBlox.TxStatus status;
        string description;
    }
    
    // Payment table: mapping from txId to PaymentRecord (visible only to owner)
    mapping(uint256 => PaymentRecord) private _paymentTable;
    
    // Events
    event PaymentRequested(
        uint256 indexed txId,
        address indexed recipient,
        address indexed requester,
        uint256 amount,
        uint256 timestamp,
        string description
    );
    event PaymentExecuted(
        uint256 indexed txId,
        address indexed recipient,
        uint256 amount,
        uint256 timestamp
    );
    event PaymentCancelled(
        uint256 indexed txId,
        address indexed recipient,
        uint256 amount,
        uint256 timestamp
    );
    event EthReceived(address indexed from, uint256 amount);
    
    /**
     * @notice Initialize PayBlox (replaces constructor for clone pattern)
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
    ) public override initializer {
        // Initialize SecureOwnable directly
        SecureOwnable.initialize(initialOwner, broadcaster, recovery, timeLockPeriodSec, eventForwarder);
        
        // Load PayBlox-specific definitions
        IDefinition.RolePermission memory permissions = 
            PayBloxDefinitions.getRolePermissions();
        _loadDefinitions(
            PayBloxDefinitions.getFunctionSchemas(),
            permissions.roleHashes,
            permissions.functionPermissions,
            true // Enforce all function schemas are protected
        );
    }
    
    /**
     * @dev Allows the contract to receive ETH
     */
    receive() external payable {
        emit EthReceived(msg.sender, msg.value);
    }
    
    /**
     * @notice Get the ETH balance of the contract
     */
    function getEthBalance() public view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @notice Request a payment with payment details
     * @param paymentDetails The payment details including recipient and amounts
     * @param description Optional description/memo for accounting purposes
     * @return txId The transaction ID (use getTransaction(txId) for full record)
     * @notice This creates a transaction request with payment attached in one step via _requestTransactionWithPayment.
     *         All information is logged in the payment table.
     */
    function requestWithPayment(
        EngineBlox.PaymentDetails memory paymentDetails,
        string memory description
    ) public returns (uint256 txId) {
        SharedValidation.validateOwner(owner());
        SharedValidation.validateNotZeroAddress(paymentDetails.recipient);
        if (paymentDetails.nativeTokenAmount == 0 && paymentDetails.erc20TokenAmount == 0) {
            revert SharedValidation.NotSupported();
        }
        // Restriction: Cannot specify both native token and ERC20 token amounts at the same time
        if (paymentDetails.nativeTokenAmount > 0 && paymentDetails.erc20TokenAmount > 0) {
            revert SharedValidation.NotSupported();
        }
        
        // Create transaction request with payment attached (value=0, target=this for no-op; payment holds recipient/amount)
        EngineBlox.TxRecord memory txRecord = _requestTransactionWithPayment(
            msg.sender,
            address(this),
            0,
            0,
            PayBloxDefinitions.NATIVE_PAYMENT,
            EngineBlox.NATIVE_TRANSFER_SELECTOR,
            "",
            paymentDetails
        );
        
        // Register payment in the payment table with accounting information (owner-only visibility)
        _paymentTable[txRecord.txId] = PaymentRecord({
            paymentDetails: paymentDetails,
            timestamp: block.timestamp,
            requester: msg.sender,
            status: txRecord.status,
            description: description
        });
        
        emit PaymentRequested(
            txRecord.txId,
            paymentDetails.recipient,
            msg.sender,
            paymentDetails.nativeTokenAmount > 0 ? paymentDetails.nativeTokenAmount : paymentDetails.erc20TokenAmount,
            block.timestamp,
            description
        );
        return txRecord.txId;
    }
    
    /**
     * @notice Approve a payment after the time delay has passed
     * @param txId The ID of the payment transaction to approve
     * @return The transaction ID
     */
    function approvePaymentAfterDelay(uint256 txId) public returns (uint256) {
        SharedValidation.validateOwner(owner());
        EngineBlox.TxRecord memory updated = _approveTransaction(txId);
        
        // Update payment record status in the accounting table
        if (_paymentTable[txId].timestamp != 0) {
            _paymentTable[txId].status = updated.status;
        }
        
        // When transaction is approved and executed, payment will be automatically sent
        // via executeAttachedPayment in EngineBlox
        if (updated.status == EngineBlox.TxStatus.COMPLETED) {
            PaymentRecord storage record = _paymentTable[txId];
            emit PaymentExecuted(
                txId,
                record.paymentDetails.recipient,
                record.paymentDetails.nativeTokenAmount,
                block.timestamp
            );
        }
        
        return updated.txId;
    }
    
    /**
     * @notice Cancel a pending payment request
     * @param txId The ID of the payment transaction to cancel
     * @return The transaction ID
     */
    function cancelPayment(uint256 txId) public returns (uint256) {
        SharedValidation.validateOwner(owner());
        EngineBlox.TxRecord memory updated = _cancelTransaction(txId);
        
        // Update payment record status in the accounting table
        if (_paymentTable[txId].timestamp != 0) {
            _paymentTable[txId].status = updated.status;
            
            PaymentRecord storage record = _paymentTable[txId];
            emit PaymentCancelled(
                txId,
                record.paymentDetails.recipient,
                record.paymentDetails.nativeTokenAmount,
                block.timestamp
            );
        }
        
        return updated.txId;
    }
    
    /**
     * @notice Get payment record from the payment table (owner-only)
     * @param txId The transaction ID to get payment details for
     * @return The complete payment record with accounting information
     * @notice This function is only accessible by the owner role
     */
    function getPaymentRecord(uint256 txId) public view returns (PaymentRecord memory) {
        SharedValidation.validateOwner(owner());
        return _paymentTable[txId];
    }
    
    /**
     * @notice Get all payment records for accounting purposes (owner-only)
     * @param txIds Array of transaction IDs to retrieve
     * @return Array of payment records
     * @notice This function allows batch retrieval of payment records for accounting
     */
    function getPaymentRecords(uint256[] memory txIds) public view returns (PaymentRecord[] memory) {
        SharedValidation.validateOwner(owner());
        PaymentRecord[] memory records = new PaymentRecord[](txIds.length);
        for (uint256 i = 0; i < txIds.length; i++) {
            records[i] = _paymentTable[txIds[i]];
        }
        return records;
    }
}
