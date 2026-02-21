// SPDX-License-Identifier: MPL-2.0
pragma solidity 0.8.33;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { MessageHashUtils } from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

// Local imports
import "./utils/SharedValidation.sol";
import "./interfaces/IEventForwarder.sol";

/**
 * @title EngineBlox
 * @dev A library for implementing secure state abstraction with time-locks and meta-transactions
 * 
 * This library provides a comprehensive framework for creating secure operations that require
 * state management and multiple phases of approval before execution. It supports:
 * 
 * - Time-locked operations that can only be executed after a waiting period
 * - Meta-transactions for delegated approvals
 * - Role-based access control for different operation types
 * - Multiple execution types (standard function calls or raw transaction data)
 * - Payment handling for both native tokens and ERC20 tokens
 * - State machine-driven operation workflows
 * 
 * The library supports flexible configuration of operation types, function schemas, and role permissions
 * through direct function calls without requiring external definition files.
 * 
 * The library is designed to be used as a building block for secure smart contract systems
 * that require high levels of security and flexibility through state abstraction.
 */
library EngineBlox {
    // ============ VERSION INFORMATION ============
    bytes32 public constant PROTOCOL_NAME_HASH = keccak256("Bloxchain");
    uint8 public constant VERSION_MAJOR = 1;
    uint8 public constant VERSION_MINOR = 0;
    uint8 public constant VERSION_PATCH = 0;
    
    // ============ SYSTEM SAFETY LIMITS ============
    // These constants define the safety range limits for system operations
    // to prevent gas exhaustion attacks. These are immutable system-wide limits.
    
    /// @dev Maximum number of items allowed in batch operations (prevents gas exhaustion)
    uint256 public constant MAX_BATCH_SIZE = 200;
    
    /// @dev Maximum total number of roles allowed in the system (prevents gas exhaustion in permission checks)
    uint256 public constant MAX_ROLES = 1000;
    
    /// @dev Maximum number of hooks allowed per function selector (prevents gas exhaustion in hook execution)
    uint256 public constant MAX_HOOKS_PER_SELECTOR = 100;
    
    /// @dev Maximum total number of functions allowed in the system (prevents gas exhaustion in function operations)
    uint256 public constant MAX_FUNCTIONS = 2000;
    
    using MessageHashUtils for bytes32;
    using SharedValidation for *;
    using EnumerableSet for EnumerableSet.UintSet;
    using EnumerableSet for EnumerableSet.Bytes32Set;
    using EnumerableSet for EnumerableSet.AddressSet;
    using SafeERC20 for IERC20;

    enum TxStatus {
        UNDEFINED,
        PENDING,
        EXECUTING,
        PROCESSING_PAYMENT,
        CANCELLED,
        COMPLETED,
        FAILED,
        REJECTED
    }

    enum TxAction {
        EXECUTE_TIME_DELAY_REQUEST,
        EXECUTE_TIME_DELAY_APPROVE,
        EXECUTE_TIME_DELAY_CANCEL,
        SIGN_META_REQUEST_AND_APPROVE,
        SIGN_META_APPROVE,
        SIGN_META_CANCEL,
        EXECUTE_META_REQUEST_AND_APPROVE,
        EXECUTE_META_APPROVE,
        EXECUTE_META_CANCEL
    }

    struct TxParams {
        address requester;
        address target;
        uint256 value;
        uint256 gasLimit;
        bytes32 operationType;
        bytes4 executionSelector;
        bytes executionParams;
    }

    struct MetaTxParams {
        uint256 chainId;
        uint256 nonce;
        address handlerContract;
        bytes4 handlerSelector;
        TxAction action;
        uint256 deadline;
        uint256 maxGasPrice;
        address signer;
    }

    struct TxRecord {
        uint256 txId;
        uint256 releaseTime;
        TxStatus status;
        TxParams params;
        bytes32 message;
        bytes result;
        PaymentDetails payment;
    }

    struct MetaTransaction {
        TxRecord txRecord;
        MetaTxParams params;
        bytes32 message;
        bytes signature;
        bytes data;
    }

    struct PaymentDetails {
        address recipient;
        uint256 nativeTokenAmount;
        address erc20TokenAddress;
        uint256 erc20TokenAmount;
    }

    struct Role {
        string roleName;
        bytes32 roleHash;
        EnumerableSet.AddressSet authorizedWallets;
        mapping(bytes4 => FunctionPermission) functionPermissions;
        EnumerableSet.Bytes32Set functionSelectorsSet;
        uint256 maxWallets;
        uint256 walletCount;
        bool isProtected;
    }

    struct FunctionPermission {
        bytes4 functionSelector;
        uint16 grantedActionsBitmap; // Bitmap for TxAction enum (9 bits max)
        bytes4[] handlerForSelectors; // Array of execution selectors this function can access. If it contains functionSelector, this is an execution selector; otherwise, these are handler selectors pointing to execution selectors
    }

    struct FunctionSchema {
        string functionSignature;
        bytes4 functionSelector;
        bytes32 operationType;
        string operationName;
        uint16 supportedActionsBitmap; // Bitmap for TxAction enum (9 bits max)
        bool isProtected;
        bytes4[] handlerForSelectors; 
    }

    // ============ DEFINITION STRUCTS ============

    struct SecureOperationState {
        // ============ SYSTEM STATE ============
        bool initialized;
        uint256 txCounter;
        uint256 timeLockPeriodSec;
        
        // ============ TRANSACTION MANAGEMENT ============
        mapping(uint256 => TxRecord) txRecords;
        EnumerableSet.UintSet pendingTransactionsSet;
        
        // ============ ROLE-BASED ACCESS CONTROL ============
        mapping(bytes32 => Role) roles;
        EnumerableSet.Bytes32Set supportedRolesSet;
        // Reverse index for O(1) wallet-to-role lookup (optimization for gas efficiency)
        mapping(address => EnumerableSet.Bytes32Set) walletRoles; // wallet => roles set
        
        // ============ FUNCTION MANAGEMENT ============
        mapping(bytes4 => FunctionSchema) functions;
        EnumerableSet.Bytes32Set supportedFunctionsSet; // Using Bytes32Set for bytes4 selectors
        EnumerableSet.Bytes32Set supportedOperationTypesSet;
        
        // ============ META-TRANSACTION SUPPORT ============
        mapping(address => uint256) signerNonces;
        
        // ============ EVENT FORWARDING ============
        address eventForwarder;
        
        // ============ FUNCTION TARGET MANAGEMENT ============
        // Per-function target whitelist (always enforced; address(this) is always allowed)
        mapping(bytes4 => EnumerableSet.AddressSet) functionTargetWhitelist;
        // Per-function target hooks (generic pipeline for hook setup)
        mapping(bytes4 => EnumerableSet.AddressSet) functionTargetHooks;

        // ============ SYSTEM MACRO SELECTORS ============
        // Function selectors that are allowed to target address(this) (e.g. native transfer, update payment)
        EnumerableSet.Bytes32Set systemMacroSelectorsSet;
    }

    bytes32 constant OWNER_ROLE = keccak256(bytes("OWNER_ROLE"));
    bytes32 constant BROADCASTER_ROLE = keccak256(bytes("BROADCASTER_ROLE"));
    bytes32 constant RECOVERY_ROLE = keccak256(bytes("RECOVERY_ROLE"));

    // Native token transfer selector (reserved signature unlikely to exist in real contracts)
    bytes4 public constant NATIVE_TRANSFER_SELECTOR = bytes4(keccak256("__bloxchain_native_transfer__()"));
    bytes32 public constant NATIVE_TRANSFER_OPERATION = keccak256("NATIVE_TRANSFER");
    
    // EIP-712 Type Hashes
    bytes32 private constant TYPE_HASH = keccak256("MetaTransaction(TxRecord txRecord,MetaTxParams params,bytes data)TxRecord(uint256 txId,uint256 releaseTime,uint8 status,TxParams params,bytes32 message,bytes result,PaymentDetails payment)TxParams(address requester,address target,uint256 value,uint256 gasLimit,bytes32 operationType,bytes4 executionSelector,bytes executionParams)MetaTxParams(uint256 chainId,uint256 nonce,address handlerContract,bytes4 handlerSelector,uint8 action,uint256 deadline,uint256 maxGasPrice,address signer)PaymentDetails(address recipient,uint256 nativeTokenAmount,address erc20TokenAddress,uint256 erc20TokenAmount)");
    bytes32 private constant DOMAIN_SEPARATOR_TYPE_HASH = keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");


    event TransactionEvent(
        uint256 indexed txId,
        bytes4 indexed functionHash,
        TxStatus status,
        address indexed requester,
        address target,
        bytes32 operationType
    );

    // ============ SYSTEM STATE FUNCTIONS ============

    /**
     * @dev Initializes the SecureOperationState with the specified time lock period and roles.
     * @param self The SecureOperationState to initialize.
     * @param _timeLockPeriodSec The time lock period in seconds.
     * @param _owner The address of the owner.
     * @param _broadcaster The address of the broadcaster.
     * @param _recovery The address of the recovery.
     */
    function initialize(
        SecureOperationState storage self,  
        address _owner, 
        address _broadcaster,
        address _recovery,
        uint256 _timeLockPeriodSec
    ) public {
        if (self.initialized) revert SharedValidation.AlreadyInitialized();
        SharedValidation.validateNotZeroAddress(_owner);
        SharedValidation.validateNotZeroAddress(_broadcaster);
        SharedValidation.validateNotZeroAddress(_recovery);
        SharedValidation.validateTimeLockPeriod(_timeLockPeriodSec);

        self.timeLockPeriodSec = _timeLockPeriodSec;
        self.txCounter = 0;

        // Create base roles first
        // OWNER and RECOVERY remain single-wallet roles (maxWallets = 1)
        // BROADCASTER is now a multi-wallet role with support for up to 3 wallets
        createRole(self, "OWNER_ROLE", 1, true);
        createRole(self, "BROADCASTER_ROLE", 3, true);
        createRole(self, "RECOVERY_ROLE", 1, true);
        
        // Add authorized wallets to roles
        assignWallet(self, OWNER_ROLE, _owner);
        assignWallet(self, BROADCASTER_ROLE, _broadcaster);
        assignWallet(self, RECOVERY_ROLE, _recovery);

        // Register default system macro selectors (allowed to target address(this) for system-level operations)
        addMacroSelector(self, NATIVE_TRANSFER_SELECTOR);
        
        // Mark as initialized after successful setup
        self.initialized = true;
    }

    /**
     * @dev Updates the time lock period for the SecureOperationState.
     * @param self The SecureOperationState to modify.
     * @param _newTimeLockPeriodSec The new time lock period in seconds.
     */
    function updateTimeLockPeriod(SecureOperationState storage self, uint256 _newTimeLockPeriodSec) public {
        SharedValidation.validateTimeLockPeriod(_newTimeLockPeriodSec);
        self.timeLockPeriodSec = _newTimeLockPeriodSec;
    }

    // ============ TRANSACTION MANAGEMENT FUNCTIONS ============

    /**
     * @dev Gets the transaction record by its ID.
     * @param self The SecureOperationState to check.
     * @param txId The ID of the transaction to check.
     * @return The TxRecord associated with the transaction ID.
     * @notice Access control should be enforced by the calling contract.
     */
    function getTxRecord(SecureOperationState storage self, uint256 txId) public view returns (TxRecord memory) {
        return self.txRecords[txId];
    }

    /**
     * @dev Requests a transaction with the specified parameters.
     * @param self The SecureOperationState to modify.
     * @param requester The address of the requester.
     * @param target The target contract address for the transaction.
     * @param value The value to send with the transaction.
     * @param gasLimit The gas limit for the transaction.
     * @param operationType The type of operation.
     * @param handlerSelector The function selector of the handler/request function.
     * @param executionSelector The function selector to execute (NATIVE_TRANSFER_SELECTOR for simple native token transfers).
     * @param executionParams The encoded parameters for the function (empty for simple native token transfers).
     * @return The created TxRecord.
     */
    function txRequest(
        SecureOperationState storage self,
        address requester,
        address target,
        uint256 value,
        uint256 gasLimit,
        bytes32 operationType,
        bytes4 handlerSelector,
        bytes4 executionSelector,
        bytes memory executionParams
    ) public returns (TxRecord memory) {
        // Validate both execution and handler selector permissions
        _validateExecutionAndHandlerPermissions(self, msg.sender, executionSelector, handlerSelector, TxAction.EXECUTE_TIME_DELAY_REQUEST);
        
        return _txRequest(
            self,
            requester,
            target,
            value,
            gasLimit,
            operationType,
            executionSelector,
            executionParams,
            _noPayment()
        );
    }

    /**
     * @dev Requests a transaction with payment details attached from the start.
     * @param self The SecureOperationState to modify.
     * @param requester The address of the requester.
     * @param target The target contract address for the transaction.
     * @param value The value to send with the transaction.
     * @param gasLimit The gas limit for the transaction.
     * @param operationType The type of operation.
     * @param handlerSelector The function selector of the handler/request function.
     * @param executionSelector The function selector to execute (NATIVE_TRANSFER_SELECTOR for simple native token transfers).
     * @param executionParams The encoded parameters for the function (empty for simple native token transfers).
     * @param paymentDetails The payment details to attach to the transaction.
     * @return The created TxRecord with payment set.
     * @notice Validates request permissions (same as txRequest).
     */
    function txRequestWithPayment(
        SecureOperationState storage self,
        address requester,
        address target,
        uint256 value,
        uint256 gasLimit,
        bytes32 operationType,
        bytes4 handlerSelector,
        bytes4 executionSelector,
        bytes memory executionParams,
        PaymentDetails memory paymentDetails
    ) public returns (TxRecord memory) {
        // Validate both execution and handler selector permissions (same as txRequest)
        _validateExecutionAndHandlerPermissions(self, msg.sender, executionSelector, handlerSelector, TxAction.EXECUTE_TIME_DELAY_REQUEST);

        return _txRequest(
            self,
            requester,
            target,
            value,
            gasLimit,
            operationType,
            executionSelector,
            executionParams,
            paymentDetails
        );
    }

    /**
     * @dev Internal helper function to request a transaction without permission checks.
     * @param self The SecureOperationState to modify.
     * @param requester The address of the requester.
     * @param target The target contract address for the transaction.
     * @param value The value to send with the transaction.
     * @param gasLimit The gas limit for the transaction.
     * @param operationType The type of operation.
     * @param executionParams The encoded parameters for the function (empty for simple native token transfers).
     * @param paymentDetails The payment details to attach (use empty struct for no payment).
     * @return The created TxRecord.
     * @notice This function skips permission validation and should only be called from functions
     *         that have already validated permissions.
     */
    function _txRequest(
        SecureOperationState storage self,
        address requester,
        address target,
        uint256 value,
        uint256 gasLimit,
        bytes32 operationType,
        bytes4 executionSelector,
        bytes memory executionParams,
        PaymentDetails memory paymentDetails
    ) private returns (TxRecord memory) {
        SharedValidation.validateNotZeroAddress(target);
        // enforce that the requested target is whitelisted for this selector.
        _validateFunctionTargetWhitelist(self, executionSelector, target);

        TxRecord memory txRequestRecord = createNewTxRecord(
            self,
            requester,
            target,
            value,
            gasLimit,
            operationType,
            executionSelector,
            executionParams,
            paymentDetails
        );
    
        self.txRecords[txRequestRecord.txId] = txRequestRecord;
        self.txCounter++;

        // Add to pending transactions list
        addToPendingTransactionsList(self, txRequestRecord.txId);

        logTxEvent(self, txRequestRecord.txId, executionSelector);
        
        return txRequestRecord;
    }

    /**
     * @dev Approves a pending transaction after the release time.
     * @param self The SecureOperationState to modify.
     * @param txId The ID of the transaction to approve.
     * @param handlerSelector The function selector of the handler/approval function.
     * @return The updated TxRecord.
     */
    function txDelayedApproval(
        SecureOperationState storage self,
        uint256 txId,
        bytes4 handlerSelector
    ) public returns (TxRecord memory) {
        // Validate both execution and handler selector permissions
        _validateExecutionAndHandlerPermissions(self, msg.sender, self.txRecords[txId].params.executionSelector, handlerSelector, TxAction.EXECUTE_TIME_DELAY_APPROVE);
        _validateTxStatus(self, txId, TxStatus.PENDING);
        SharedValidation.validateReleaseTime(self.txRecords[txId].releaseTime);
        
        // EFFECT: Update status to EXECUTING before external call to prevent reentrancy
        self.txRecords[txId].status = TxStatus.EXECUTING;
        
        // INTERACT: External call after state update
        (bool success, bytes memory result) = executeTransaction(self, self.txRecords[txId]);
        
        _completeTransaction(self, txId, success, result);
        return self.txRecords[txId];
    }

    /**
     * @dev Cancels a pending transaction.
     * @param self The SecureOperationState to modify.
     * @param txId The ID of the transaction to cancel.
     * @param handlerSelector The function selector of the handler/cancellation function.
     * @return The updated TxRecord.
     */
    function txCancellation(
        SecureOperationState storage self,
        uint256 txId,
        bytes4 handlerSelector
    ) public returns (TxRecord memory) {
        // Validate both execution and handler selector permissions
        _validateExecutionAndHandlerPermissions(self, msg.sender, self.txRecords[txId].params.executionSelector, handlerSelector, TxAction.EXECUTE_TIME_DELAY_CANCEL);
        _validateTxStatus(self, txId, TxStatus.PENDING);
        
        _cancelTransaction(self, txId);
        
        return self.txRecords[txId];
    }

    /**
     * @dev Cancels a pending transaction using a meta-transaction.
     * @param self The SecureOperationState to modify.
     * @param metaTx The meta-transaction containing the signature and nonce.
     * @return The updated TxRecord.
     */
    function txCancellationWithMetaTx(SecureOperationState storage self, MetaTransaction memory metaTx) public returns (TxRecord memory) {
        uint256 txId = metaTx.txRecord.txId;
        // Validate both execution and handler selector permissions
        _validateExecutionAndHandlerPermissions(self, msg.sender, metaTx.txRecord.params.executionSelector, metaTx.params.handlerSelector, TxAction.EXECUTE_META_CANCEL);
        _validateTxStatus(self, txId, TxStatus.PENDING);
        if (!verifySignature(self, metaTx)) revert SharedValidation.InvalidSignature(metaTx.signature);
        
        incrementSignerNonce(self, metaTx.params.signer);
        _cancelTransaction(self, txId);
        
        return self.txRecords[txId];
    }

    /**
     * @dev Approves a pending transaction immediately using a meta-transaction.
     * @param self The SecureOperationState to modify.
     * @param metaTx The meta-transaction containing the signature and nonce.
     * @return The updated TxRecord.
     */
    function txApprovalWithMetaTx(SecureOperationState storage self, MetaTransaction memory metaTx) public returns (TxRecord memory) {
        // Validate both execution and handler selector permissions
        _validateExecutionAndHandlerPermissions(self, msg.sender, metaTx.txRecord.params.executionSelector, metaTx.params.handlerSelector, TxAction.EXECUTE_META_APPROVE);
        
        return _txApprovalWithMetaTx(self, metaTx);
    }

    /**
     * @dev Internal helper function to approve a pending transaction using a meta-transaction without permission checks.
     * @param self The SecureOperationState to modify.
     * @param metaTx The meta-transaction containing the signature and nonce.
     * @return The updated TxRecord.
     * @notice This function skips permission validation and should only be called from functions
     *         that have already validated permissions.
     */
    function _txApprovalWithMetaTx(SecureOperationState storage self, MetaTransaction memory metaTx) private returns (TxRecord memory) {
        uint256 txId = metaTx.txRecord.txId;
        _validateTxStatus(self, txId, TxStatus.PENDING);
        if (!verifySignature(self, metaTx)) revert SharedValidation.InvalidSignature(metaTx.signature);
        
        incrementSignerNonce(self, metaTx.params.signer);
        
        // EFFECT: Update status to EXECUTING before external call to prevent reentrancy
        self.txRecords[txId].status = TxStatus.EXECUTING;
        
        // INTERACT: External call after state update
        (bool success, bytes memory result) = executeTransaction(self, self.txRecords[txId]);
        
        _completeTransaction(self, txId, success, result);
        
        return self.txRecords[txId];
    }

    /**
     * @dev Requests and immediately approves a transaction.
     * @param self The SecureOperationState to modify.
     * @param metaTx The meta-transaction containing the signature and nonce.
     * @return The updated TxRecord.
     */
    function requestAndApprove(
        SecureOperationState storage self,
        MetaTransaction memory metaTx
    ) public returns (TxRecord memory) {
        // Validate both execution and handler selector permissions
        _validateExecutionAndHandlerPermissions(self, msg.sender, metaTx.txRecord.params.executionSelector, metaTx.params.handlerSelector, TxAction.EXECUTE_META_REQUEST_AND_APPROVE);
        
        TxRecord memory txRecord = _txRequest(
            self,
            metaTx.txRecord.params.requester,
            metaTx.txRecord.params.target,
            metaTx.txRecord.params.value,
            metaTx.txRecord.params.gasLimit,
            metaTx.txRecord.params.operationType,
            metaTx.txRecord.params.executionSelector,
            metaTx.txRecord.params.executionParams,
            metaTx.txRecord.payment
        );

        metaTx.txRecord = txRecord;
        return _txApprovalWithMetaTx(self, metaTx);
    }

    /**
     * @dev Executes a transaction based on its execution type and attached payment.
     * @param self The SecureOperationState storage reference (for validation)
     * @param record The transaction record to execute.
     * @return A tuple containing the success status and result of the execution.
     * @custom:security REENTRANCY PROTECTION: This function is protected against reentrancy
     *         through a state machine pattern:
     *         1. Entry functions (txDelayedApproval, txApprovalWithMetaTx) set status to EXECUTING
     *            BEFORE calling this function (Checks-Effects-Interactions pattern)
     *         2. _validateTxExecuting ensures transaction is in EXECUTING status at entry
     *         3. All reentry attempts would require PENDING status, but status is EXECUTING,
     *            causing _validateTxPending to revert in entry functions
     *         4. Status flow is one-way: PENDING → EXECUTING → (COMPLETED/FAILED)
     *         This creates an effective reentrancy guard without additional storage overhead.
     */
    function executeTransaction(SecureOperationState storage self, TxRecord memory record) private returns (bool, bytes memory) {
        // Validate that transaction is in EXECUTING status (set by caller before this function)
        // This proves reentrancy protection is active at entry point
        _validateTxStatus(self, record.txId, TxStatus.EXECUTING);

        bytes memory txData = prepareTransactionData(record);
        uint gas = record.params.gasLimit;
        if (gas == 0) {
            gas = gasleft();
        }
        
        // Execute the main transaction
        // REENTRANCY SAFE: Status is EXECUTING, preventing reentry through entry functions
        // that require PENDING status. Any reentry attempt would fail at _validateTxStatus(..., PENDING).
        (bool success, bytes memory result) = record.params.target.call{value: record.params.value, gas: gas}(
            txData
        );

        if (success) {
            record.status = TxStatus.COMPLETED;
            record.result = result;
            
            // Execute attached payment if transaction was successful
            if (record.payment.recipient != address(0)) {
                executeAttachedPayment(self, record);
            }
        } else {
            record.status = TxStatus.FAILED;
            record.result = result;
        }

        return (success, result);
    }

    /**
     * @dev Executes the payment attached to a transaction record
     * @param self The SecureOperationState storage reference (for validation)
     * @param record The transaction record containing payment details
     * @custom:security REENTRANCY PROTECTION: This function is protected by the same state machine
     *         pattern as executeTransaction:
     *         1. Transaction status is EXECUTING (validated at entry)
     *         2. Status changes to PROCESSING_PAYMENT before external calls
     *         3. Reentry attempts would require PENDING status, which is impossible
     *            since status can only move forward: PENDING → EXECUTING → PROCESSING_PAYMENT
     *         4. All entry functions check for PENDING status first, so reentry fails
     *         The external calls (native token transfer, ERC20 transfer) cannot reenter
     *         critical functions because the transaction is no longer in PENDING state.
     */
    function executeAttachedPayment(
        SecureOperationState storage self,
        TxRecord memory record
    ) private {
        // Validate that transaction is still in EXECUTING status
        // This ensures reentrancy protection is maintained throughout payment execution
        _validateTxStatus(self, record.txId, TxStatus.EXECUTING);
        self.txRecords[record.txId].status = TxStatus.PROCESSING_PAYMENT;
        
        PaymentDetails memory payment = record.payment;
        
        // Execute native token payment if specified
        if (payment.nativeTokenAmount > 0) {
            if (address(this).balance < payment.nativeTokenAmount) {
                revert SharedValidation.InsufficientBalance(address(this).balance, payment.nativeTokenAmount);
            }
            
            // REENTRANCY SAFE: Status is PROCESSING_PAYMENT, preventing reentry
            // through functions that require PENDING status
            (bool success, bytes memory result) = payment.recipient.call{value: payment.nativeTokenAmount}("");
            if (!success) {
                revert SharedValidation.PaymentFailed(payment.recipient, payment.nativeTokenAmount, result);
            }
        }
        
        // Execute ERC20 token payment if specified
        if (payment.erc20TokenAmount > 0) {
            SharedValidation.validateNotZeroAddress(payment.erc20TokenAddress);
            
            IERC20 erc20Token = IERC20(payment.erc20TokenAddress);
            if (erc20Token.balanceOf(address(this)) < payment.erc20TokenAmount) {
                revert SharedValidation.InsufficientBalance(erc20Token.balanceOf(address(this)), payment.erc20TokenAmount);
            }
            
            // REENTRANCY SAFE: Status is PROCESSING_PAYMENT, preventing reentry
            // through functions that require PENDING status. safeTransfer uses
            // SafeERC20 which includes reentrancy protection, but our state machine
            // provides additional defense-in-depth protection.
            erc20Token.safeTransfer(payment.recipient, payment.erc20TokenAmount);
        }
    }

    /**
     * @dev Prepares transaction data from execution selector and params without executing it.
     * @param record The transaction record to prepare data for.
     * @return The prepared transaction data.
     */
    function prepareTransactionData(TxRecord memory record) private pure returns (bytes memory) {
        // If executionSelector is NATIVE_TRANSFER_SELECTOR, it's a simple native token transfer (no function call)
        if (record.params.executionSelector == NATIVE_TRANSFER_SELECTOR) {
            // SECURITY: Validate empty params to prevent confusion with real function calls
            if (record.params.executionParams.length != 0) {
                revert SharedValidation.NotSupported();
            }
            return ""; // Empty calldata for native token transfer
        }
        // Otherwise, encode the function selector with params
        // For low-level calls, we need: selector (4 bytes) + ABI-encoded params
        // abi.encodePacked concatenates bytes4 and bytes memory correctly
        return abi.encodePacked(record.params.executionSelector, record.params.executionParams);
    }


    /**
     * @notice Creates a new transaction record with basic fields populated
     * @dev Initializes a TxRecord struct with the provided parameters and default values
     * @param self The SecureOperationState to reference for txId and timelock
     * @param requester The address initiating the transaction
     * @param target The contract address that will receive the transaction
     * @param value The amount of native tokens to send with the transaction
     * @param gasLimit The maximum gas allowed for the transaction
     * @param operationType The type of operation being performed
     * @param executionSelector The function selector to execute (NATIVE_TRANSFER_SELECTOR for simple native token transfers)
     * @param executionParams The encoded parameters for the function (empty for simple native token transfers)
     * @param payment The payment details to attach to the record (use empty struct for no payment)
     * @return TxRecord A new transaction record with populated fields
     */
    function createNewTxRecord(
        SecureOperationState storage self,
        address requester,
        address target,
        uint256 value,
        uint256 gasLimit,
        bytes32 operationType,
        bytes4 executionSelector,
        bytes memory executionParams,
        PaymentDetails memory payment
    ) private view returns (TxRecord memory) {
        return TxRecord({
            txId: self.txCounter + 1,
            releaseTime: block.timestamp + self.timeLockPeriodSec * 1 seconds,
            status: TxStatus.PENDING,
            params: TxParams({
                requester: requester,
                target: target,
                value: value,
                gasLimit: gasLimit,
                operationType: operationType,
                executionSelector: executionSelector,
                executionParams: executionParams
            }),
            message: 0,
            result: "",
            payment: payment
        });
    }

    /**
     * @dev Adds a transaction ID to the pending transactions set.
     * @param self The SecureOperationState to modify.
     * @param txId The transaction ID to add to the pending set.
     */
    function addToPendingTransactionsList(SecureOperationState storage self, uint256 txId) private {
        SharedValidation.validateTransactionExists(txId);
        _validateTxStatus(self, txId, TxStatus.PENDING);
        
        // Try to add transaction ID to the set - add() returns false if already exists
        if (!self.pendingTransactionsSet.add(txId)) {
            revert SharedValidation.ResourceAlreadyExists(bytes32(uint256(txId)));
        }
    }

    /**
     * @dev Removes a transaction ID from the pending transactions set.
     * @param self The SecureOperationState to modify.
     * @param txId The transaction ID to remove from the pending set.
     */
    function removeFromPendingTransactionsList(SecureOperationState storage self, uint256 txId) private {
        SharedValidation.validateTransactionExists(txId);
        
        // Remove the transaction ID from the set (O(1) operation)
        if (!self.pendingTransactionsSet.remove(txId)) {
            revert SharedValidation.ResourceNotFound(bytes32(uint256(txId)));
        }
    }

    // ============ ROLE-BASED ACCESS CONTROL FUNCTIONS ============


    /**
     * @dev Gets the role by its hash.
     * @param self The SecureOperationState to check.
     * @param role The role to get the hash for.
     * @return The role associated with the hash, or Role(0) if the role doesn't exist.
     * @notice Access control should be enforced by the calling contract.
     */
    function getRole(SecureOperationState storage self, bytes32 role) public view returns (Role storage) {
        _validateRoleExists(self, role);
        return self.roles[role];
    }

    /**
     * @dev Gets the function schema by selector.
     * @param self The SecureOperationState to read from.
     * @param functionSelector The function selector to get the schema for.
     * @return The FunctionSchema struct (memory copy).
     * @notice Reverts with ResourceNotFound if the schema does not exist.
     */
    function getFunctionSchema(SecureOperationState storage self, bytes4 functionSelector) public view returns (FunctionSchema memory) {
        _validateFunctionSchemaExists(self, functionSelector);
        return self.functions[functionSelector];
    }

    /**
     * @dev Creates a role with specified function permissions.
     * @param self The SecureOperationState to check.
     * @param roleName Name of the role.
     * @param maxWallets Maximum number of wallets allowed for this role.
     * @param isProtected Whether the role is protected from removal.
     */
    function createRole(
        SecureOperationState storage self,
        string memory roleName,
        uint256 maxWallets,
        bool isProtected
    ) public {
        SharedValidation.validateRoleNameNotEmpty(roleName);
        SharedValidation.validateMaxWalletsGreaterThanZero(maxWallets);

        bytes32 roleHash = keccak256(bytes(roleName));
        
        // Validate role count limit
        SharedValidation.validateRoleCount(
            self.supportedRolesSet.length(),
            MAX_ROLES
        );
        
        // Check if role already exists in mapping - if so, revert
        if (self.roles[roleHash].roleHash == roleHash) {
            revert SharedValidation.ResourceAlreadyExists(roleHash);
        }
        
        // Add the role to the set - if it already exists, revert to prevent inconsistent state
        if (!self.supportedRolesSet.add(roleHash)) {
            revert SharedValidation.ResourceAlreadyExists(roleHash);
        }
        
        // Initialize the role mapping
        self.roles[roleHash].roleName = roleName;
        self.roles[roleHash].roleHash = roleHash;
        self.roles[roleHash].maxWallets = maxWallets;
        self.roles[roleHash].walletCount = 0;
        self.roles[roleHash].isProtected = isProtected;
        
        _validateRoleExists(self, roleHash);
    }

    /**
     * @dev Removes a role from the system.
     * @param self The SecureOperationState to modify.
     * @param roleHash The hash of the role to remove.
     * @notice Security: Cannot remove protected roles to maintain system integrity.
     */
    function removeRole(
        SecureOperationState storage self,
        bytes32 roleHash
    ) public {
        // Validate that the role exists (checks both roles mapping and supportedRolesSet)
        _validateRoleExists(self, roleHash);
        
        // Security check: Prevent removing protected roles
        if (self.roles[roleHash].isProtected) {
            revert SharedValidation.CannotModifyProtected(roleHash);
        }
        
        Role storage roleData = self.roles[roleHash];
        
        // Clean up reverse index for all wallets in this role
        // Collect all wallets first (to avoid modifying set during iteration)
        uint256 walletCount = roleData.authorizedWallets.length();
        address[] memory wallets = new address[](walletCount);
        
        for (uint256 i = 0; i < walletCount; i++) {
            wallets[i] = roleData.authorizedWallets.at(i);
        }
        
        // Remove role from each wallet's reverse index
        // This ensures the wallet-to-role index remains consistent for O(1) permission checks
        for (uint256 i = 0; i < walletCount; i++) {
            self.walletRoles[wallets[i]].remove(roleHash);
        }
        
        // Clear the role data from roles mapping
        // Remove the role from the supported roles set (O(1) operation)
        // NOTE: Mappings (functionPermissions, authorizedWallets, functionSelectorsSet)
        // are not deleted by Solidity's delete operator. This is acceptable because:
        // 1. Role is removed from supportedRolesSet, making it inaccessible via role queries
        // 2. Reverse index (walletRoles) is cleaned up above, so permission checks won't find this role
        // 3. All access checks use the reverse index (walletRoles) for O(1) lookups, so orphaned data is unreachable
        // 4. Role recreation with same name would pass roleHash check but mappings
        //    would be effectively reset since role is reinitialized from scratch
        delete self.roles[roleHash];  
        if (!self.supportedRolesSet.remove(roleHash)) {
            revert SharedValidation.ResourceNotFound(roleHash);
        }   
    }

    /**
     * @dev Checks if a wallet is authorized for a role.
     * @param self The SecureOperationState to check.
     * @param roleHash The hash of the role to check.
     * @param wallet The wallet address to check.
     * @return True if the wallet is authorized for the role, false otherwise.
     */
    function hasRole(SecureOperationState storage self, bytes32 roleHash, address wallet) public view returns (bool) {
        Role storage role = getRole(self, roleHash);
        return role.authorizedWallets.contains(wallet);
    }

    /**
     * @dev Adds a wallet address to a role in the roles mapping.
     * @param self The SecureOperationState to modify.
     * @param role The role hash to add the wallet to.
     * @param wallet The wallet address to add.
     */
    function assignWallet(SecureOperationState storage self, bytes32 role, address wallet) public {
        SharedValidation.validateNotZeroAddress(wallet);
        _validateRoleExists(self, role);
        
        Role storage roleData = self.roles[role];
        SharedValidation.validateWalletLimit(roleData.authorizedWallets.length(), roleData.maxWallets);
        
        // Check if wallet is already in the role
        if (roleData.authorizedWallets.contains(wallet)) revert SharedValidation.ItemAlreadyExists(wallet);
        
        if (!roleData.authorizedWallets.add(wallet)) {
            revert SharedValidation.ItemAlreadyExists(wallet);
        }
        roleData.walletCount = roleData.authorizedWallets.length();
        
        // Update reverse index for O(1) permission checks
        self.walletRoles[wallet].add(role);
    }

    /**
     * @dev Updates a role from an old address to a new address.
     * @param self The SecureOperationState to modify.
     * @param role The role to update.
     * @param newWallet The new wallet address to assign the role to.
     * @param oldWallet The old wallet address to remove from the role.
     */
    function updateAssignedWallet(SecureOperationState storage self, bytes32 role, address newWallet, address oldWallet) public {
        _validateRoleExists(self, role);
        SharedValidation.validateNotZeroAddress(newWallet);
        SharedValidation.validateNewAddress(newWallet, oldWallet);
        
        // Check if old wallet exists in the role
        Role storage roleData = self.roles[role];
        
        // Remove old wallet
        if (!roleData.authorizedWallets.remove(oldWallet)) {
            revert SharedValidation.ItemNotFound(oldWallet);
        }
        
        // Add new wallet (should always succeed since we verified it doesn't exist)
        if (!roleData.authorizedWallets.add(newWallet)) {
            revert SharedValidation.OperationFailed();
        }
        
        // Update reverse indices for O(1) permission checks
        self.walletRoles[oldWallet].remove(role);
        self.walletRoles[newWallet].add(role);
    }

    /**
     * @dev Removes a wallet from a role.
     * @param self The SecureOperationState to modify.
     * @param role The role to remove the wallet from.
     * @param wallet The wallet address to remove.
     * @notice Security: Cannot remove the last wallet from a protected role
     */
    function revokeWallet(SecureOperationState storage self, bytes32 role, address wallet) public {
        _validateRoleExists(self, role);
        
        Role storage roleData = self.roles[role];
        
        // Security check: Prevent removing the last wallet from a protected role
        if (roleData.isProtected && roleData.authorizedWallets.length() <= 1) {
            revert SharedValidation.CannotModifyProtected(bytes32(role));
        }
        
        // Remove the wallet (O(1) operation)
        if (!roleData.authorizedWallets.remove(wallet)) {
            revert SharedValidation.ItemNotFound(wallet);
        }
        roleData.walletCount = roleData.authorizedWallets.length();
        
        // Update reverse index for O(1) permission checks
        self.walletRoles[wallet].remove(role);
    }

    /**
     * @dev Adds a function permission to an existing role.
     * @param self The SecureOperationState to modify.
     * @param roleHash The role hash to add the function permission to.
     * @param functionPermission The function permission to add.
     */
    function addFunctionToRole(
        SecureOperationState storage self,
        bytes32 roleHash,
        FunctionPermission memory functionPermission
    ) public {
        bytes32 functionSelectorHash = bytes32(functionPermission.functionSelector);

        // Check if role exists (checks both roles mapping and supportedRolesSet)
        _validateRoleExists(self, roleHash);

        // Validate that all handlerForSelectors in permission are in the schema's handlerForSelectors array
        _validateHandlerForSelectors(self, functionPermission.functionSelector, functionPermission.handlerForSelectors);
        
        // Validate that all grantedActions are supported by the function
        _validateMetaTxPermissions(self, functionPermission);
        
        // add the function selector to the role's function selectors set and mapping
        Role storage role = self.roles[roleHash];
        role.functionPermissions[functionPermission.functionSelector] = functionPermission;
        
        // Add to role's function selectors set
        if (!role.functionSelectorsSet.add(functionSelectorHash)) {
            revert SharedValidation.ResourceAlreadyExists(functionSelectorHash);
        }
    }

    /**
     * @dev Removes a function permission from an existing role.
     * @param self The SecureOperationState to modify.
     * @param roleHash The role hash to remove the function permission from.
     * @param functionSelector The function selector to remove from the role.
     */
    function removeFunctionFromRole(
        SecureOperationState storage self,
        bytes32 roleHash,
        bytes4 functionSelector
    ) public {
        // Check if role exists (checks both roles mapping and supportedRolesSet)
        _validateRoleExists(self, roleHash);
        
        // Security check: Prevent removing protected functions from roles
        // Check if function exists and is protected
        if (self.supportedFunctionsSet.contains(bytes32(functionSelector))) {
            FunctionSchema memory functionSchema = self.functions[functionSelector];
            if (functionSchema.isProtected) {
                revert SharedValidation.CannotModifyProtected(bytes32(functionSelector));
            }
        }
        
        // Remove the function permission
        Role storage role = self.roles[roleHash];
        delete role.functionPermissions[functionSelector];
        if (!role.functionSelectorsSet.remove(bytes32(functionSelector))) {
            revert SharedValidation.ResourceNotFound(bytes32(functionSelector));
        }
    }

    /**
     * @dev Checks if a wallet has permission for a specific function and action.
     * @param self The SecureOperationState to check.
     * @param wallet The wallet address to check.
     * @param functionSelector The function selector to check permissions for.
     * @param requestedAction The specific action being requested.
     * @return True if the wallet has permission for the function and action, false otherwise.
     */
    function hasActionPermission(
        SecureOperationState storage self,
        address wallet,
        bytes4 functionSelector,
        TxAction requestedAction
    ) public view returns (bool) {
        // OPTIMIZED: Use reverse index instead of iterating all roles (O(n) -> O(1) lookup)
        // This provides significant gas savings when there are many roles
        EnumerableSet.Bytes32Set storage walletRolesSet = self.walletRoles[wallet];
        uint256 rolesLength = walletRolesSet.length();
        
        for (uint i = 0; i < rolesLength; i++) {
            bytes32 roleHash = walletRolesSet.at(i);
            
            // Use the dedicated role permission check function
            if (roleHasActionPermission(self, roleHash, functionSelector, requestedAction)) {
                return true;
            }
        }
        return false;
    }

    /**
     * @dev Checks if a wallet has view permission for any role (privacy function access)
     * @param self The SecureOperationState to check.
     * @param wallet The wallet address to check.
     * @return True if the wallet has view permission, false otherwise.
     */
    function hasAnyRole(
        SecureOperationState storage self,
        address wallet
    ) public view returns (bool) {
        // OPTIMIZED: Use reverse index - O(1) check instead of O(n) iteration
        // This provides significant gas savings when there are many roles
        return self.walletRoles[wallet].length() > 0;
    }

    /**
     * @dev Checks if a specific role has permission for a function and action.
     * @param self The SecureOperationState to check.
     * @param roleHash The role hash to check.
     * @param functionSelector The function selector to check permissions for.
     * @param requestedAction The specific action being requested.
     * @return True if the role has permission for the function and action, false otherwise.
     */
    function roleHasActionPermission(
        SecureOperationState storage self,
        bytes32 roleHash,
        bytes4 functionSelector,
        TxAction requestedAction
    ) public view returns (bool) {
        Role storage role = self.roles[roleHash];
        
        // Check if function has permissions
        if (!role.functionSelectorsSet.contains(bytes32(functionSelector))) {
            return false;
        }
        
        FunctionPermission storage permission = role.functionPermissions[functionSelector];
        
        return hasActionInBitmap(permission.grantedActionsBitmap, requestedAction);
    }

    // ============ FUNCTION MANAGEMENT FUNCTIONS ============

    /**
     * @dev Creates a function access control with specified permissions.
     * @param self The SecureOperationState to check.
     * @param functionSignature Function signature (e.g., "transfer(address,uint256)") or function name.
     * @param functionSelector Hash identifier for the function.
     * @param operationName The name of the operation type.
     * @param supportedActionsBitmap Bitmap of permissions required to execute this function.
     * @param isProtected Whether the function schema is protected from removal.
     * @param handlerForSelectors Non-empty array required - execution selectors must contain self-reference, handler selectors must point to execution selectors
     */
    function createFunctionSchema(
        SecureOperationState storage self,
        string memory functionSignature,
        bytes4 functionSelector,
        string memory operationName,
        uint16 supportedActionsBitmap,
        bool isProtected,
        bytes4[] memory handlerForSelectors
    ) public {
        // Validate that functionSignature matches functionSelector
        // Note: NATIVE_TRANSFER_SELECTOR uses a reserved signature that represents native token transfers
        // and doesn't correspond to a real function, but still requires signature validation
        bytes4 derivedSelector = bytes4(keccak256(bytes(functionSignature)));
        if (derivedSelector != functionSelector) {
            revert SharedValidation.FunctionSelectorMismatch(functionSelector, derivedSelector);
        }
        // Derive operation type from operation name
        bytes32 derivedOperationType = keccak256(bytes(operationName));

        // Validate handlerForSelectors: non-empty and all selectors are non-zero
        // NOTE:
        // - Empty arrays are NOT allowed anymore. Execution selectors must have
        //   at least one entry pointing to themselves (self-reference), and
        //   handler selectors must point to valid execution selectors.
        // - bytes4(0) is never allowed in this array.
        if (handlerForSelectors.length == 0) {
            revert SharedValidation.OperationFailed();
        }
        for (uint256 i = 0; i < handlerForSelectors.length; i++) {
            if (handlerForSelectors[i] == bytes4(0)) {
                revert SharedValidation.ResourceNotFound(bytes32(0)); // Zero selector is invalid
            }
        }
        
        // register the operation type if it's not already in the set
        SharedValidation.validateOperationTypeNotZero(derivedOperationType);
        if (self.supportedOperationTypesSet.add(derivedOperationType)) {
            // do nothing
        }
        
        // Validate function count limit
        SharedValidation.validateFunctionCount(
            self.supportedFunctionsSet.length(),
            MAX_FUNCTIONS
        );
        
        // Check if function already exists in the set
        if (self.supportedFunctionsSet.contains(bytes32(functionSelector))) {
            revert SharedValidation.ResourceAlreadyExists(bytes32(functionSelector));
        }
        
        FunctionSchema storage schema = self.functions[functionSelector];
        schema.functionSignature = functionSignature;
        schema.functionSelector = functionSelector;
        schema.operationType = derivedOperationType;
        schema.operationName = operationName;
        schema.supportedActionsBitmap = supportedActionsBitmap;
        schema.isProtected = isProtected;
        schema.handlerForSelectors = handlerForSelectors;
        
        // Add to supportedFunctionsSet
        if (!self.supportedFunctionsSet.add(bytes32(functionSelector))) {
            revert SharedValidation.OperationFailed();
        }
    }

    /**
     * @dev Removes a function schema from the system.
     * @param self The SecureOperationState to modify.
     * @param functionSelector The function selector to remove.
     * @param safeRemoval If true, reverts with ResourceAlreadyExists when any role still references this function.
     *        The safeRemoval check is done inside this function (iterating supportedRolesSet directly) for efficiency.
     * @notice Security: Cannot remove protected function schemas to maintain system integrity.
     * @notice Cleanup: Automatically removes unused operation types from supportedOperationTypesSet.
     */
    function removeFunctionSchema(
        SecureOperationState storage self,
        bytes4 functionSelector,
        bool safeRemoval
    ) public {
        // Security check: Prevent removing protected function schemas
        // MUST check BEFORE removing from set to avoid inconsistent state
        if (self.functions[functionSelector].isProtected) {
            revert SharedValidation.CannotModifyProtected(bytes32(functionSelector));
        }

        // If safeRemoval: ensure no role references this function. Iterate supportedRolesSet directly for efficiency.
        if (safeRemoval) {
            uint256 rolesLength = self.supportedRolesSet.length();
            for (uint256 i = 0; i < rolesLength; i++) {
                bytes32 roleHash = self.supportedRolesSet.at(i);
                if (self.roles[roleHash].functionSelectorsSet.contains(bytes32(functionSelector))) {
                    revert SharedValidation.ResourceAlreadyExists(bytes32(functionSelector));
                }
            }
        }

        // Store operation type before deletion (needed for cleanup check)
        bytes32 operationType = self.functions[functionSelector].operationType;

        // Clear the function schema data
        // Remove the function schema from the supported functions set (O(1) operation)
        // MUST remove BEFORE checking if operation type is still in use, otherwise
        // _getFunctionsByOperationType will still find this function selector
        delete self.functions[functionSelector];
        if (!self.supportedFunctionsSet.remove(bytes32(functionSelector))) {
            revert SharedValidation.ResourceNotFound(bytes32(functionSelector));
        }

        // Check if the operation type is still in use by other functions.
        // Now that the function has been removed, this will correctly detect if the
        // operation type is no longer in use.
        bytes4[] memory functionsUsingOperationType = _getFunctionsByOperationType(self, operationType);
        if (functionsUsingOperationType.length == 0) {
            // Remove the operation type from supported operation types set if no longer in use
            if (!self.supportedOperationTypesSet.remove(operationType)) {
                // This should never happen, but defensive check for safety
                revert SharedValidation.OperationFailed();
            } 
        }
    }

    /**
     * @dev Checks if a specific action is supported by a function.
     * @param self The SecureOperationState to check.
     * @param functionSelector The function selector to check.
     * @param action The action to check for support.
     * @return True if the action is supported by the function, false otherwise.
     */
    function isActionSupportedByFunction(
        SecureOperationState storage self,
        bytes4 functionSelector,
        TxAction action
    ) public view returns (bool) {
        // Check if function exists in supportedFunctionsSet
        if (!self.supportedFunctionsSet.contains(bytes32(functionSelector))) {
            return false;
        }
        
        FunctionSchema memory functionSchema = self.functions[functionSelector];
        return hasActionInBitmap(functionSchema.supportedActionsBitmap, action);
    }

    /**
     * @dev Adds a target address to the whitelist for a function selector.
     * @param self The SecureOperationState to modify.
     * @param functionSelector The function selector whose whitelist will be updated.
     * @param target The target address to add to the whitelist.
     */
    function addTargetToFunctionWhitelist(
        SecureOperationState storage self,
        bytes4 functionSelector,
        address target
    ) public {
        SharedValidation.validateNotZeroAddress(target);

        // Function selector must be registered in the schema set
        if (!self.supportedFunctionsSet.contains(bytes32(functionSelector))) {
            revert SharedValidation.ResourceNotFound(bytes32(functionSelector));
        }

        EnumerableSet.AddressSet storage set = self.functionTargetWhitelist[functionSelector];
        if (!set.add(target)) {
            revert SharedValidation.ItemAlreadyExists(target);
        }
    }

    /**
     * @dev Removes a target address from the whitelist for a function selector.
     * @param self The SecureOperationState to modify.
     * @param functionSelector The function selector whose whitelist will be updated.
     * @param target The target address to remove from the whitelist.
     */
    function removeTargetFromFunctionWhitelist(
        SecureOperationState storage self,
        bytes4 functionSelector,
        address target
    ) public {
        SharedValidation.validateNotZeroAddress(target);

        EnumerableSet.AddressSet storage set = self.functionTargetWhitelist[functionSelector];
        if (!set.remove(target)) {
            revert SharedValidation.ItemNotFound(target);
        }
    }

    /**
     * @dev Validates that the target address is whitelisted for the given function selector.
     *      Internal contract calls (address(this)) are always allowed.
     * @param self The SecureOperationState to check.
     * @param functionSelector The function selector being executed.
     * @param target The target contract address.
     * @notice Target MUST be present in functionTargetWhitelist[functionSelector] unless target is address(this).
     *         If whitelist is empty (no entries), no targets are allowed - explicit deny for security.
     */
    function _validateFunctionTargetWhitelist(
        SecureOperationState storage self,
        bytes4 functionSelector,
        address target
    ) internal view {
        // Fast path: selector not registered, skip validation
        if (!self.supportedFunctionsSet.contains(bytes32(functionSelector))) {
            return;
        }

        // SECURITY: Internal contract calls are always allowed
        // This enables internal execution functions to work without whitelist configuration
        if (target == address(this)) {
            return;
        }

        EnumerableSet.AddressSet storage set = self.functionTargetWhitelist[functionSelector];

        // If target is in whitelist, validation passes
        if (set.contains(target)) {
            return;
        }

        // Target is not whitelisted for this function selector.
        revert SharedValidation.TargetNotWhitelisted(target, functionSelector);
    }

    /**
     * @dev Returns all whitelisted target addresses for a function selector.
     * @param self The SecureOperationState to check.
     * @param functionSelector The function selector to query.
     * @return Array of whitelisted target addresses.
     * @notice Access control should be enforced by the calling contract.
     */
    function getFunctionWhitelistTargets(
        SecureOperationState storage self,
        bytes4 functionSelector
    ) public view returns (address[] memory) {
        EnumerableSet.AddressSet storage set = self.functionTargetWhitelist[functionSelector];
        return _convertAddressSetToArray(set);
    }

    // ============ SYSTEM MACRO SELECTORS ============

    /**
     * @dev Adds a function selector to the system macro selectors set.
     *      Macro selectors are allowed to target address(this) for system-level operations (e.g. native transfer).
     * @param self The SecureOperationState to modify.
     * @param functionSelector The function selector to add (e.g. NATIVE_TRANSFER_SELECTOR).
     */
    function addMacroSelector(
        SecureOperationState storage self,
        bytes4 functionSelector
    ) public {
        SharedValidation.validateHandlerSelector(functionSelector);
        bytes32 sel = bytes32(functionSelector);
        if (!self.systemMacroSelectorsSet.add(sel)) {
            revert SharedValidation.ResourceAlreadyExists(sel);
        }
    }

    /**
     * @dev Returns true if the given function selector is in the system macro selectors set.
     * @param self The SecureOperationState to check.
     * @param functionSelector The function selector to check.
     */
    function isMacroSelector(
        SecureOperationState storage self,
        bytes4 functionSelector
    ) public view returns (bool) {
        return self.systemMacroSelectorsSet.contains(bytes32(functionSelector));
    }

    // ============ FUNCTION TARGET HOOKS MANAGEMENT ============

    /**
     * @dev Adds a target address to the hooks for a function selector.
     * @param self The SecureOperationState to modify.
     * @param functionSelector The function selector whose hooks will be updated.
     * @param target The target address to add to the hooks.
     */
    function addTargetToFunctionHooks(
        SecureOperationState storage self,
        bytes4 functionSelector,
        address target
    ) public {
        SharedValidation.validateNotZeroAddress(target);

        // Function selector must be registered in the schema set
        if (!self.supportedFunctionsSet.contains(bytes32(functionSelector))) {
            revert SharedValidation.ResourceNotFound(bytes32(functionSelector));
        }

        EnumerableSet.AddressSet storage set = self.functionTargetHooks[functionSelector];
        
        // Validate hook count limit
        SharedValidation.validateHookCount(
            set.length(),
            MAX_HOOKS_PER_SELECTOR
        );
        
        if (!set.add(target)) {
            revert SharedValidation.ItemAlreadyExists(target);
        }
    }

    /**
     * @dev Removes a target address from the hooks for a function selector.
     * @param self The SecureOperationState to modify.
     * @param functionSelector The function selector whose hooks will be updated.
     * @param target The target address to remove from the hooks.
     */
    function removeTargetFromFunctionHooks(
        SecureOperationState storage self,
        bytes4 functionSelector,
        address target
    ) public {
        EnumerableSet.AddressSet storage set = self.functionTargetHooks[functionSelector];
        if (!set.remove(target)) {
            revert SharedValidation.ItemNotFound(target);
        }
    }

    /**
     * @dev Returns all hook target addresses for a function selector.
     * @param self The SecureOperationState to check.
     * @param functionSelector The function selector to query.
     * @return Array of hook target addresses.
     * @notice Access control should be enforced by the calling contract.
     */
    function getFunctionHookTargets(
        SecureOperationState storage self,
        bytes4 functionSelector
    ) public view returns (address[] memory) {
        EnumerableSet.AddressSet storage set = self.functionTargetHooks[functionSelector];
        return _convertAddressSetToArray(set);
    }

    /**
     * @dev Returns all function schemas that use a specific operation type.
     * @param self The SecureOperationState to check.
     * @param operationType The operation type to search for.
     * @return Array of function selectors that use the specified operation type.
     * @notice Access control should be enforced by the calling contract.
     */
    function getFunctionsByOperationType(
        SecureOperationState storage self,
        bytes32 operationType
    ) public view returns (bytes4[] memory) {
        return _getFunctionsByOperationType(self, operationType);
    }

    /**
     * @dev Internal: Returns all function schemas that use a specific operation type.
     * Used by removeFunctionSchema and getFunctionsByOperationType.
     */
    function _getFunctionsByOperationType(
        SecureOperationState storage self,
        bytes32 operationType
    ) internal view returns (bytes4[] memory) {
        uint256 functionsLength = self.supportedFunctionsSet.length();
        bytes4[] memory tempResults = new bytes4[](functionsLength);
        uint256 resultCount = 0;
        
        for (uint i = 0; i < functionsLength; i++) {
            bytes4 functionSelector = bytes4(self.supportedFunctionsSet.at(i));
            FunctionSchema memory functionSchema = self.functions[functionSelector];
            if (functionSchema.operationType == operationType) {
                tempResults[resultCount] = functionSelector;
                resultCount++;
            }
        }
        
        bytes4[] memory result = new bytes4[](resultCount);
        for (uint i = 0; i < resultCount; i++) {
            result[i] = tempResults[i];
        }
        
        return result;
    }


    // ============ BACKWARD COMPATIBILITY FUNCTIONS ============

    /**
     * @dev Gets all pending transaction IDs as an array for backward compatibility
     * @param self The SecureOperationState to check
     * @return Array of pending transaction IDs
     * @notice Access control should be enforced by the calling contract.
     */
    function getPendingTransactionsList(SecureOperationState storage self) public view returns (uint256[] memory) {
        return _convertUintSetToArray(self.pendingTransactionsSet);
    }

    /**
     * @dev Gets all supported roles as an array for backward compatibility
     * @param self The SecureOperationState to check
     * @return Array of supported role hashes
     * @notice Access control should be enforced by the calling contract.
     */
    function getSupportedRolesList(SecureOperationState storage self) public view returns (bytes32[] memory) {
        return _convertBytes32SetToArray(self.supportedRolesSet);
    }

    /**
     * @dev Gets all supported function selectors as an array for backward compatibility
     * @param self The SecureOperationState to check
     * @return Array of supported function selectors
     * @notice Access control should be enforced by the calling contract.
     */
    function getSupportedFunctionsList(SecureOperationState storage self) public view returns (bytes4[] memory) {
        return _convertBytes4SetToArray(self.supportedFunctionsSet);
    }

    /**
     * @dev Gets all supported operation types as an array for backward compatibility
     * @param self The SecureOperationState to check
     * @return Array of supported operation type hashes
     * @notice Access control should be enforced by the calling contract.
     */
    function getSupportedOperationTypesList(SecureOperationState storage self) public view returns (bytes32[] memory) {
        return _convertBytes32SetToArray(self.supportedOperationTypesSet);
    }

    /**
     * @dev Gets the authorized wallet at a specific index from a role
     * @param self The SecureOperationState to check
     * @param roleHash The role hash to get the wallet from
     * @param index The index position of the wallet to retrieve
     * @return The authorized wallet address at the specified index
     */
    function getAuthorizedWalletAt(SecureOperationState storage self, bytes32 roleHash, uint256 index) public view returns (address) {
        Role storage role = self.roles[roleHash];
        SharedValidation.validateIndexInBounds(index, role.authorizedWallets.length());
        return role.authorizedWallets.at(index);
    }

    /**
     * @dev Gets all authorized wallets for a role
     * @param self The SecureOperationState to check
     * @param roleHash The role hash
     * @return Array of authorized wallet addresses
     * @notice Access control should be enforced by the calling contract.
     */
    function _getAuthorizedWallets(
        SecureOperationState storage self,
        bytes32 roleHash
    ) public view returns (address[] memory) {
        Role storage role = self.roles[roleHash];
        uint256 walletCount = role.walletCount;

        address[] memory wallets = new address[](walletCount);
        for (uint256 i = 0; i < walletCount; i++) {
            wallets[i] = getAuthorizedWalletAt(self, roleHash, i);
        }

        return wallets;
    }

    /**
     * @dev Gets all function permissions for a role as an array for backward compatibility
     * @param self The SecureOperationState to check
     * @param roleHash The role hash to get function permissions from
     * @return Array of function permissions with arrays (for external API)
     * @notice Access control should be enforced by the calling contract.
     */
    function getRoleFunctionPermissions(SecureOperationState storage self, bytes32 roleHash) public view returns (FunctionPermission[] memory) {
        Role storage role = self.roles[roleHash];
        
        uint256 length = role.functionSelectorsSet.length();
        FunctionPermission[] memory result = new FunctionPermission[](length);
        
        for (uint256 i = 0; i < length; i++) {
            bytes4 functionSelector = bytes4(role.functionSelectorsSet.at(i));
            result[i] = role.functionPermissions[functionSelector];
        }
        
        return result;
    }

    /**
     * @dev Gets all roles assigned to a wallet using the reverse index
     * @param self The SecureOperationState to check
     * @param wallet The wallet address to get roles for
     * @return Array of role hashes assigned to the wallet
     * @notice Access control should be enforced by the calling contract.
     * @notice This function uses the reverse index (walletRoles) for efficient O(n) lookup where n = wallet's role count
     */
    function getWalletRoles(SecureOperationState storage self, address wallet) public view returns (bytes32[] memory) {
        EnumerableSet.Bytes32Set storage walletRolesSet = self.walletRoles[wallet];
        return _convertBytes32SetToArray(walletRolesSet);
    }

    // ============ META-TRANSACTION SUPPORT FUNCTIONS ============

    /**
     * @dev Gets the current nonce for a specific signer.
     * @param self The SecureOperationState to check.
     * @param signer The address of the signer.
     * @return The current nonce for the signer.
     * @notice Access control should be enforced by the calling contract.
     */
    function getSignerNonce(SecureOperationState storage self, address signer) public view returns (uint256) {
        return self.signerNonces[signer];
    }

    /**
     * @dev Increments the nonce for a specific signer.
     * @param self The SecureOperationState to modify.
     * @param signer The address of the signer.
     */
    function incrementSignerNonce(SecureOperationState storage self, address signer) private {
        self.signerNonces[signer]++;
    }

    /**
     * @dev Verifies the signature of a meta-transaction with detailed error reporting
     * @param self The SecureOperationState to check against
     * @param metaTx The meta-transaction containing the signature to verify
     * @return True if the signature is valid, false otherwise
     */
    function verifySignature(
        SecureOperationState storage self,
        MetaTransaction memory metaTx
    ) private view returns (bool) {
        // Basic validation
        SharedValidation.validateSignatureLength(metaTx.signature);
        _validateTxStatus(self, metaTx.txRecord.txId, TxStatus.PENDING);
        
        // Transaction parameters validation
        SharedValidation.validateNotZeroAddress(metaTx.txRecord.params.requester);
        
        // Meta-transaction parameters validation
        SharedValidation.validateChainId(metaTx.params.chainId);
        SharedValidation.validateMetaTxDeadline(metaTx.params.deadline);
        
        // Gas price validation (if applicable)
        SharedValidation.validateGasPrice(metaTx.params.maxGasPrice);
        
        // Validate signer-specific nonce
        SharedValidation.validateNonce(metaTx.params.nonce, getSignerNonce(self, metaTx.params.signer));

        // txId validation for new meta transactions
        if (metaTx.params.action == TxAction.SIGN_META_REQUEST_AND_APPROVE) {
            SharedValidation.validateTransactionId(metaTx.txRecord.txId, self.txCounter);
        }

        // Authorization check - verify signer has meta-transaction signing permissions for the function and action
        bool isSignAction = metaTx.params.action == TxAction.SIGN_META_REQUEST_AND_APPROVE || metaTx.params.action == TxAction.SIGN_META_APPROVE || metaTx.params.action == TxAction.SIGN_META_CANCEL;
        bool isHandlerAuthorized = hasActionPermission(self, metaTx.params.signer, metaTx.params.handlerSelector, metaTx.params.action);
        bool isExecutionAuthorized = hasActionPermission(self, metaTx.params.signer, metaTx.txRecord.params.executionSelector, metaTx.params.action);
        if (!isSignAction || !isHandlerAuthorized || !isExecutionAuthorized) {
            revert SharedValidation.SignerNotAuthorized(metaTx.params.signer);
        }
          
        // Signature verification
        bytes32 messageHash = generateMessageHash(metaTx);
        address recoveredSigner = recoverSigner(messageHash, metaTx.signature);
        if (recoveredSigner != metaTx.params.signer) revert SharedValidation.InvalidSignature(metaTx.signature);

        return true;
    }

    /**
     * @dev Generates a message hash for the specified meta-transaction following EIP-712
     * @param metaTx The meta-transaction to generate the hash for
     * @return The generated message hash
     */
    function generateMessageHash(MetaTransaction memory metaTx) private view returns (bytes32) {
        bytes32 domainSeparator = keccak256(abi.encode(
            DOMAIN_SEPARATOR_TYPE_HASH,
            PROTOCOL_NAME_HASH,
            keccak256(abi.encodePacked(VERSION_MAJOR, ".", VERSION_MINOR, ".", VERSION_PATCH)),
            block.chainid,
            address(this)
        ));

        bytes32 structHash = keccak256(abi.encode(
            TYPE_HASH,
            keccak256(abi.encode(
                metaTx.txRecord.txId,
                metaTx.txRecord.params.requester,
                metaTx.txRecord.params.target,
                metaTx.txRecord.params.value,
                metaTx.txRecord.params.gasLimit,
                metaTx.txRecord.params.operationType,
                metaTx.txRecord.params.executionSelector,
                keccak256(metaTx.txRecord.params.executionParams)
            )),
            metaTx.params.chainId,
            metaTx.params.nonce,
            metaTx.params.handlerContract,
            metaTx.params.handlerSelector,
            uint8(metaTx.params.action),
            metaTx.params.deadline,
            metaTx.params.maxGasPrice,
            metaTx.params.signer
        ));

        return keccak256(abi.encodePacked(
            "\x19\x01",
            domainSeparator,
            structHash
        ));
    }

    /**
     * @dev Recovers the signer address from a message hash and signature.
     * @param messageHash The hash of the message that was signed.
     * @param signature The signature to recover the address from.
     * @return The address of the signer.
     */
    function recoverSigner(bytes32 messageHash, bytes memory signature) public pure returns (address) {
        SharedValidation.validateSignatureLength(signature);

        bytes32 r;
        bytes32 s;
        uint8 v;

        // More efficient assembly block with better memory safety
        assembly {
            // First 32 bytes stores the length of the signature
            // add(signature, 32) = pointer of sig + 32
            // effectively, skips first 32 bytes of signature
            r := mload(add(signature, 0x20))
            // add(signature, 64) = pointer of sig + 64
            // effectively, skips first 64 bytes of signature
            s := mload(add(signature, 0x40))
            // add(signature, 96) = pointer of sig + 96
            // effectively, skips first 96 bytes of signature
            // byte(0, mload(add(signature, 96))) = first byte of the next 32 bytes
            v := byte(0, mload(add(signature, 0x60)))
        }

        // EIP-2 still allows signature malleability for ecrecover(). Remove this possibility and make the signature
        // unique. Appendix F in the Ethereum Yellow paper (https://ethereum.github.io/yellowpaper/paper.pdf), defines
        // the valid range for s in (301): 0 < s < secp256k1n ÷ 2 + 1, and for v in (302): v ∈ {27, 28}
        SharedValidation.validateSignatureParams(s, v);

        address signer = ecrecover(messageHash.toEthSignedMessageHash(), v, r, s);
        SharedValidation.validateRecoveredSigner(signer);

        return signer;
    }


    /**
     * @dev Creates a meta-transaction for a new operation
     */
    function generateUnsignedForNewMetaTx(
        SecureOperationState storage self,
        TxParams memory txParams,
        MetaTxParams memory metaTxParams
    ) public view returns (MetaTransaction memory) {
        SharedValidation.validateNotZeroAddress(txParams.target);
        
        TxRecord memory txRecord = createNewTxRecord(
            self,
            txParams.requester,
            txParams.target,
            txParams.value,
            txParams.gasLimit,
            txParams.operationType,
            txParams.executionSelector,
            txParams.executionParams,
            _noPayment()
        );

         return generateMetaTransaction(self, txRecord, metaTxParams);
    }

    /**
     * @dev Creates a meta-transaction for an existing transaction
     */
    function generateUnsignedForExistingMetaTx(
        SecureOperationState storage self,
        uint256 txId,
        MetaTxParams memory metaTxParams
    ) public view returns (MetaTransaction memory) {
        TxRecord memory txRecord = getTxRecord(self, txId);
        if (txRecord.txId != txId) revert SharedValidation.ResourceNotFound(bytes32(uint256(txId)));
        
        return generateMetaTransaction(self, txRecord, metaTxParams);
    }

    /**
     * @notice Creates a meta-transaction structure with populated nonce from storage
     * @dev Initializes a MetaTransaction with transaction record data and empty signature fields.
     *      The nonce is populated directly from storage for security. The caller is responsible 
     *      for filling in the following fields:
     *      - handlerContract: The contract that will handle the meta-transaction
     *      - handlerSelector: The function selector for the handler
     *      - deadline: The timestamp after which the meta-transaction expires
     *      - maxGasPrice: The maximum gas price allowed for execution
     *      - signer: The address that will sign the meta-transaction
     * @param self The SecureOperationState to reference for nonce
     * @param txRecord The transaction record to include in the meta-transaction
     * @param metaTxParams The meta-transaction parameters to include in the meta-transaction
     * @return MetaTransaction A new meta-transaction structure with default values
     */
    function generateMetaTransaction(
        SecureOperationState storage self,
        TxRecord memory txRecord,
        MetaTxParams memory metaTxParams
    ) private view returns (MetaTransaction memory) {
        SharedValidation.validateChainId(metaTxParams.chainId);
        SharedValidation.validateHandlerContract(metaTxParams.handlerContract);
        SharedValidation.validateHandlerSelector(metaTxParams.handlerSelector);
        SharedValidation.validateDeadline(metaTxParams.deadline);
        SharedValidation.validateNotZeroAddress(metaTxParams.signer);

        // Populate the nonce directly from storage for security
        metaTxParams.nonce = getSignerNonce(self, metaTxParams.signer);

        MetaTransaction memory metaTx = MetaTransaction({
            txRecord: txRecord,
            params: metaTxParams,
            message: 0,
            signature: "",
            data: prepareTransactionData(txRecord)
        });

        // Generate the message hash for ready to sign meta-transaction
        bytes32 msgHash = generateMessageHash(metaTx);
        metaTx.message = msgHash;

        return metaTx;
    }

    /**
     * @notice Creates meta-transaction parameters with specified values
     * @dev Helper function to create properly formatted MetaTxParams
     * @param handlerContract The contract that will handle the meta-transaction
     * @param handlerSelector The function selector for the handler
     * @param action The transaction action type
     * @param deadline The timestamp after which the meta-transaction expires
     * @param maxGasPrice The maximum gas price allowed for execution
     * @param signer The address that will sign the meta-transaction
     * @return MetaTxParams The formatted meta-transaction parameters
     */
    function createMetaTxParams(
        address handlerContract,
        bytes4 handlerSelector,
        TxAction action,
        uint256 deadline,
        uint256 maxGasPrice,
        address signer
    ) public view returns (MetaTxParams memory) {
        SharedValidation.validateHandlerContract(handlerContract);
        SharedValidation.validateHandlerSelector(handlerSelector);
        SharedValidation.validateNotZeroAddress(signer);
        return MetaTxParams({
            chainId: block.chainid,
            nonce: 0, // Uninitialized - will be populated in generateMetaTransaction
            handlerContract: handlerContract,
            handlerSelector: handlerSelector,
            action: action,
            deadline: block.timestamp + deadline * 1 seconds,
            maxGasPrice: maxGasPrice,
            signer: signer
        });
    }

    // ============ EVENT FUNCTIONS ============

    /**
     * @dev Logs an event by emitting TransactionEvent and forwarding to event forwarder
     * @param self The SecureOperationState
     * @param txId The transaction ID
     * @param functionSelector The function selector to emit in the event
     * @custom:security REENTRANCY PROTECTION: This function is safe from reentrancy because:
     *         1. It is called AFTER all state changes are complete (in _completeTransaction,
     *            _cancelTransaction, and txRequest)
     *         2. It only reads state and emits events - no critical state modifications
     *         3. The external call to eventForwarder is wrapped in try-catch, so failures
     *            don't affect contract state
     *         4. Even if eventForwarder is malicious and tries to reenter, all entry functions
     *            require PENDING status, but transactions are already in COMPLETED/CANCELLED
     *            status at this point, preventing reentry
     *         This is a false positive from static analysis - the function is reentrancy-safe.
     */
    function logTxEvent(
        SecureOperationState storage self,
        uint256 txId,
        bytes4 functionSelector
    ) public {
        TxRecord memory txRecord = self.txRecords[txId];
        
        // Emit only non-sensitive public data
        emit TransactionEvent(
            txId,
            functionSelector,
            txRecord.status,
            txRecord.params.requester,
            txRecord.params.target,
            txRecord.params.operationType
        );
        
        // Forward event data to event forwarder
        // REENTRANCY SAFE: External call is wrapped in try-catch and doesn't modify
        // critical state. Even if eventForwarder is malicious, reentry attempts fail
        // because transactions are no longer in PENDING status (they're COMPLETED/CANCELLED).
        if (self.eventForwarder != address(0)) {
            try IEventForwarder(self.eventForwarder).forwardTxEvent(
                txId,
                functionSelector,
                txRecord.status,
                txRecord.params.requester,
                txRecord.params.target,
                txRecord.params.operationType
            ) {
                // Event forwarded successfully
            } catch {
                // Forwarding failed, continue execution (non-critical operation)
            }
        }
    }

    /**
     * @dev Set the event forwarder for this specific instance
     * @param self The SecureOperationState
     * @param forwarder The event forwarder address
     */
    function setEventForwarder(
        SecureOperationState storage self,
        address forwarder
    ) public {
        self.eventForwarder = forwarder;
    }

        // ============ BITMAP HELPER FUNCTIONS ============

    /**
     * @dev Checks if a TxAction is present in a bitmap
     * @param bitmap The bitmap to check
     * @param action The TxAction to check for
     * @return True if the action is present in the bitmap
     */
    function hasActionInBitmap(uint16 bitmap, TxAction action) internal pure returns (bool) {
        return (bitmap & (1 << uint8(action))) != 0;
    }

    /**
     * @dev Adds a TxAction to a bitmap
     * @param bitmap The original bitmap
     * @param action The TxAction to add
     * @return The updated bitmap with the action added
     */
    function addActionToBitmap(uint16 bitmap, TxAction action) internal pure returns (uint16) {
        return uint16(bitmap | (1 << uint8(action)));
    }

    /**
     * @dev Creates a bitmap from an array of TxActions
     * @param actions Array of TxActions to convert to bitmap
     * @return Bitmap representation of the actions
     */
    function createBitmapFromActions(TxAction[] memory actions) internal pure returns (uint16) {
        uint16 bitmap = 0;
        for (uint i = 0; i < actions.length; i++) {
            bitmap = addActionToBitmap(bitmap, actions[i]);
        }
        return bitmap;
    }

    /**
     * @dev Converts a bitmap to an array of TxActions
     * @param bitmap The bitmap to convert
     * @return Array of TxActions represented by the bitmap
     */
    function convertBitmapToActions(uint16 bitmap) internal pure returns (TxAction[] memory) {
        // Count how many actions are set
        uint256 count = 0;
        for (uint8 i = 0; i < 16; i++) {
            if ((bitmap & (1 << i)) != 0) {
                count++;
            }
        }
        
        // Create array and populate it
        TxAction[] memory actions = new TxAction[](count);
        uint256 index = 0;
        for (uint8 i = 0; i < 16; i++) {
            if ((bitmap & (1 << i)) != 0) {
                actions[index] = TxAction(i);
                index++;
            }
        }
        
        return actions;
    }


    // ============ OPTIMIZATION HELPER FUNCTIONS ============

    /**
     * @dev Helper function to complete a transaction and remove from pending list
     * @param self The SecureOperationState to modify
     * @param txId The transaction ID to complete
     * @param success Whether the transaction execution was successful
     * @param result The result of the transaction execution
     */
    function _completeTransaction(
        SecureOperationState storage self,
        uint256 txId,
        bool success,
        bytes memory result
    ) private {
        // enforce that the requested target is whitelisted for this selector.
        _validateFunctionTargetWhitelist(self, self.txRecords[txId].params.executionSelector, self.txRecords[txId].params.target);
        
        // Update storage with new status and result
        if (success) {
            self.txRecords[txId].status = TxStatus.COMPLETED;
            self.txRecords[txId].result = result;
        } else {
            self.txRecords[txId].status = TxStatus.FAILED;
            self.txRecords[txId].result = result; // Store failure reason for debugging
            // Note: FAILED status is intentional - transactions can be valid when requested
            // but fail when executed (e.g., conditions changed, insufficient balance, etc.)
            // Users can query status via getTransaction() or listen to TransactionEvent
        }
        
        // Remove from pending transactions list
        removeFromPendingTransactionsList(self, txId);
        
        logTxEvent(self, txId, self.txRecords[txId].params.executionSelector);
    }

    /**
     * @dev Helper function to cancel a transaction and remove from pending list
     * @param self The SecureOperationState to modify
     * @param txId The transaction ID to cancel
     */
    function _cancelTransaction(
        SecureOperationState storage self,
        uint256 txId
    ) private {
        // enforce that the requested target is whitelisted for this selector.
        _validateFunctionTargetWhitelist(self, self.txRecords[txId].params.executionSelector, self.txRecords[txId].params.target);
        
        self.txRecords[txId].status = TxStatus.CANCELLED;
        
        // Remove from pending transactions list
        removeFromPendingTransactionsList(self, txId);
        
        logTxEvent(self, txId, self.txRecords[txId].params.executionSelector);
    }

        /**
     * @dev Validates that the caller has any role permission
     * @param self The SecureOperationState to check
     * @notice This function consolidates the repeated permission check pattern to reduce contract size
     */
    function _validateAnyRole(SecureOperationState storage self) internal view {
        if (!hasAnyRole(self, msg.sender)) revert SharedValidation.NoPermission(msg.sender);
    }

    /**
     * @dev Validates that a role exists by checking if its hash is not zero
     * @param self The SecureOperationState to check
     * @param roleHash The role hash to validate
     * @notice This function consolidates the repeated role existence check pattern to reduce contract size
     */
    function _validateRoleExists(SecureOperationState storage self, bytes32 roleHash) internal view {
        if (self.roles[roleHash].roleHash == 0 || !self.supportedRolesSet.contains(roleHash)) {
            revert SharedValidation.ResourceNotFound(roleHash);
        }
    }

    /**
     * @dev Validates that a function schema exists for the given selector.
     * @param self The SecureOperationState to check.
     * @param functionSelector The function selector to validate.
     */
    function _validateFunctionSchemaExists(SecureOperationState storage self, bytes4 functionSelector) internal view {
        if (!self.supportedFunctionsSet.contains(bytes32(functionSelector))) {
            revert SharedValidation.ResourceNotFound(bytes32(functionSelector));
        }
    }

    /**
     * @dev Validates that a transaction is in the expected status
     * @param self The SecureOperationState to check
     * @param txId The transaction ID to validate
     * @param expectedStatus The expected transaction status
     * @notice This function consolidates the repeated transaction status check pattern to reduce contract size.
     *         REENTRANCY PROTECTION: This validation is a critical part of the state machine reentrancy guard:
     *         1. Entry functions set status to EXECUTING before calling executeTransaction
     *            (following Checks-Effects-Interactions pattern)
     *         2. If reentry is attempted, the transaction status is EXECUTING (not PENDING)
     *         3. All entry functions check for PENDING status first via _validateTxStatus(..., PENDING)
     *         4. Reentry attempts fail because status check fails (EXECUTING != PENDING)
     *         This creates a one-way state machine: PENDING → EXECUTING → (COMPLETED/FAILED)
     *         that prevents reentrancy without additional storage overhead.
     */
    function _validateTxStatus(
        SecureOperationState storage self,
        uint256 txId,
        TxStatus expectedStatus
    ) internal view {
        TxStatus currentStatus = self.txRecords[txId].status;
        if (currentStatus != expectedStatus) {
            revert SharedValidation.TransactionStatusMismatch(uint8(expectedStatus), uint8(currentStatus));
        }
    }

    /**
     * @dev Validates that a wallet has permission for both execution selector and handler selector for a given action
     * @param self The SecureOperationState to check
     * @param wallet The wallet address to check permissions for
     * @param executionSelector The execution function selector (underlying operation)
     * @param handlerSelector The handler/calling function selector
     * @param action The action to validate permissions for
     * @notice This function consolidates the repeated dual permission check pattern to reduce contract size
     * @notice Reverts with NoPermission if either permission check fails
     */
    function _validateExecutionAndHandlerPermissions(
        SecureOperationState storage self,
        address wallet,
        bytes4 executionSelector,
        bytes4 handlerSelector,
        TxAction action
    ) internal view {
        // Validate permission for the execution selector (underlying operation)
        if (!hasActionPermission(self, wallet, executionSelector, action)) {
            revert SharedValidation.NoPermission(wallet);
        }
        // Validate permission for the handler/calling function selector (e.g. msg.sig)
        if (!hasActionPermission(self, wallet, handlerSelector, action)) {
            revert SharedValidation.NoPermission(wallet);
        }
    }

    /**
     * @dev Validates that all handlerForSelectors are present in the schema's handlerForSelectors array
     * @param self The SecureOperationState to validate against
     * @param functionSelector The function selector for which the permission is defined
     * @param handlerForSelectors The handlerForSelectors array from the permission to validate
     * @notice Reverts with HandlerForSelectorMismatch if any handlerForSelector is not found in the schema's array
     * @notice Special case: Execution function permissions should include functionSelector in handlerForSelectors (self-reference)
     */
    function _validateHandlerForSelectors(
        SecureOperationState storage self,
        bytes4 functionSelector,
        bytes4[] memory handlerForSelectors
    ) internal view {
        bytes32 functionSelectorHash = bytes32(functionSelector);

        // Ensure the function schema exists
        if (!self.supportedFunctionsSet.contains(functionSelectorHash)) {
            revert SharedValidation.ResourceNotFound(functionSelectorHash);
        }

        FunctionSchema storage schema = self.functions[functionSelector];

        // Validate each handlerForSelector in the array
        for (uint256 j = 0; j < handlerForSelectors.length; j++) {
            bytes4 handlerForSelector = handlerForSelectors[j];
            
            // Special case: execution function permissions use handlerForSelector == functionSelector (self-reference)
            if (handlerForSelector == functionSelector) {
                continue; // Valid execution function permission
            }

            bool found = false;
            for (uint256 i = 0; i < schema.handlerForSelectors.length; i++) {
                if (schema.handlerForSelectors[i] == handlerForSelector) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                revert SharedValidation.HandlerForSelectorMismatch(
                    bytes4(0), // Cannot return array, use 0 as placeholder
                    handlerForSelector
                );
            }
        }
    }

    /**
     * @dev Validates meta-transaction permissions for a function permission
     * @param self The secure operation state
     * @param functionPermission The function permission to validate
     * @custom:security This function prevents conflicting meta-sign and meta-execute permissions
     */
    function _validateMetaTxPermissions(
        SecureOperationState storage self,
        FunctionPermission memory functionPermission
    ) internal view {
        uint16 bitmap = functionPermission.grantedActionsBitmap;
        
        // Revert if permissions are empty (bitmap is 0) to prevent silent failures
        if (bitmap == 0) {
            revert SharedValidation.NotSupported();
        }
        
        // Create bitmasks for meta-sign and meta-execute actions
        // Meta-sign actions: SIGN_META_REQUEST_AND_APPROVE (3), SIGN_META_APPROVE (4), SIGN_META_CANCEL (5)
        uint16 metaSignMask = (1 << 3) | (1 << 4) | (1 << 5);
        
        // Meta-execute actions: EXECUTE_META_REQUEST_AND_APPROVE (6), EXECUTE_META_APPROVE (7), EXECUTE_META_CANCEL (8)
        uint16 metaExecuteMask = (1 << 6) | (1 << 7) | (1 << 8);
        
        // Check if any meta-sign actions are present
        bool hasMetaSign = (bitmap & metaSignMask) != 0;
        
        // Check if any meta-execute actions are present
        bool hasMetaExecute = (bitmap & metaExecuteMask) != 0;
        
        // If both flags are raised, this is a security misconfiguration
        if (hasMetaSign && hasMetaExecute) {
            revert SharedValidation.ConflictingMetaTxPermissions(functionPermission.functionSelector);
        }
        
        // Validate that each action in the bitmap is supported by the function
        // This still requires iteration, but we can optimize it
        for (uint i = 0; i < 9; i++) { // TxAction enum has 9 values (0-8)
            if (hasActionInBitmap(bitmap, TxAction(i))) {
                if (!isActionSupportedByFunction(self, functionPermission.functionSelector, TxAction(i))) {
                    revert SharedValidation.NotSupported();
                }
            }
        }
    }

    /**
     * @dev Generic helper to convert AddressSet to array
     * @param set The EnumerableSet.AddressSet to convert
     * @return Array of address values
     */
    function _convertAddressSetToArray(EnumerableSet.AddressSet storage set) 
        internal view returns (address[] memory) {
        uint256 length = set.length();
        address[] memory result = new address[](length);
        for (uint256 i = 0; i < length; i++) {
            result[i] = set.at(i);
        }
        return result;
    }

    /**
     * @dev Generic helper to convert UintSet to array
     * @param set The EnumerableSet.UintSet to convert
     * @return Array of uint256 values
     */
    function _convertUintSetToArray(EnumerableSet.UintSet storage set) 
        internal view returns (uint256[] memory) {
        uint256 length = set.length();
        uint256[] memory result = new uint256[](length);
        for (uint256 i = 0; i < length; i++) {
            result[i] = set.at(i);
        }
        return result;
    }

    /**
     * @dev Generic helper to convert Bytes32Set to array
     * @param set The EnumerableSet.Bytes32Set to convert
     * @return Array of bytes32 values
     */
    function _convertBytes32SetToArray(EnumerableSet.Bytes32Set storage set) 
        internal view returns (bytes32[] memory) {
        uint256 length = set.length();
        bytes32[] memory result = new bytes32[](length);
        for (uint256 i = 0; i < length; i++) {
            result[i] = set.at(i);
        }
        return result;
    }

    /**
     * @dev Generic helper to convert Bytes32Set (containing bytes4 selectors) to bytes4 array
     * @param set The EnumerableSet.Bytes32Set to convert (stores bytes4 selectors as bytes32)
     * @return Array of bytes4 function selectors
     */
    function _convertBytes4SetToArray(EnumerableSet.Bytes32Set storage set) 
        internal view returns (bytes4[] memory) {
        uint256 length = set.length();
        bytes4[] memory result = new bytes4[](length);
        for (uint256 i = 0; i < length; i++) {
            result[i] = bytes4(set.at(i));
        }
        return result;
    }

    /**
     * @dev Returns an empty PaymentDetails struct for use when no payment is attached.
     * @return payment Empty payment details (recipient and amounts zero).
     */
    function _noPayment() internal pure returns (PaymentDetails memory payment) {
        return PaymentDetails({
            recipient: address(0),
            nativeTokenAmount: 0,
            erc20TokenAddress: address(0),
            erc20TokenAmount: 0
        });
    }

}
