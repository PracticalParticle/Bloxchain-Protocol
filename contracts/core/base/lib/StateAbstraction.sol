// SPDX-License-Identifier: MPL-2.0
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { MessageHashUtils } from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

// Local imports
import "../../../utils/SharedValidation.sol";
import "../../../interfaces/IEventForwarder.sol";

/**
 * @title StateAbstraction
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
library StateAbstraction {
    // ============ VERSION INFORMATION ============
    bytes32 public constant LIBRARY_NAME_HASH = keccak256("StateAbstraction");
    uint8 public constant VERSION_MAJOR = 1;
    uint8 public constant VERSION_MINOR = 0;
    uint8 public constant VERSION_PATCH = 0;
    
    using MessageHashUtils for bytes32;
    using SharedValidation for *;
    using EnumerableSet for EnumerableSet.UintSet;
    using EnumerableSet for EnumerableSet.Bytes32Set;
    using EnumerableSet for EnumerableSet.AddressSet;
    using SafeERC20 for IERC20;

    enum TxStatus {
        UNDEFINED,
        PENDING,
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
        EXECUTE_META_CANCEL,
        EXECUTE_UPDATE_PAYMENT
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
        uint16 grantedActionsBitmap; // Bitmap for TxAction enum (10 bits max)
    }

    struct FunctionSchema {
        string functionName;
        bytes4 functionSelector;
        bytes32 operationType;
        string operationName;
        uint16 supportedActionsBitmap; // Bitmap for TxAction enum (10 bits max)
        bool isProtected;
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
        
        // ============ FUNCTION MANAGEMENT ============
        mapping(bytes4 => FunctionSchema) functions;
        EnumerableSet.Bytes32Set supportedFunctionsSet; // Using Bytes32Set for bytes4 selectors
        EnumerableSet.Bytes32Set supportedOperationTypesSet;
        
        // ============ META-TRANSACTION SUPPORT ============
        mapping(address => uint256) signerNonces;
        
        // ============ EVENT FORWARDING ============
        address eventForwarder;
    }

    bytes32 constant OWNER_ROLE = keccak256(bytes("OWNER_ROLE"));
    bytes32 constant BROADCASTER_ROLE = keccak256(bytes("BROADCASTER_ROLE"));
    bytes32 constant RECOVERY_ROLE = keccak256(bytes("RECOVERY_ROLE"));

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
        createRole(self, "OWNER_ROLE", 1, true);
        createRole(self, "BROADCASTER_ROLE", 1, true);
        createRole(self, "RECOVERY_ROLE", 1, true);
        
        // Add authorized wallets to roles
        assignWallet(self, OWNER_ROLE, _owner);
        assignWallet(self, BROADCASTER_ROLE, _broadcaster);
        assignWallet(self, RECOVERY_ROLE, _recovery);
        
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
     */
    function getTxRecord(SecureOperationState storage self, uint256 txId) public view returns (TxRecord memory) {
        _validateAnyRole(self);
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
     * @param executionSelector The function selector to execute (0x00000000 for simple ETH transfers).
     * @param executionParams The encoded parameters for the function (empty for simple ETH transfers).
     * @return The created TxRecord.
     */
    function txRequest(
        SecureOperationState storage self,
        address requester,
        address target,
        uint256 value,
        uint256 gasLimit,
        bytes32 operationType,
        bytes4 executionSelector,
        bytes memory executionParams
    ) public returns (TxRecord memory) {
        if (!hasActionPermission(self, msg.sender, executionSelector, TxAction.EXECUTE_TIME_DELAY_REQUEST) && !hasActionPermission(self, msg.sender, executionSelector, TxAction.EXECUTE_META_REQUEST_AND_APPROVE)) {
            revert SharedValidation.NoPermission(msg.sender);
        }
        SharedValidation.validateNotZeroAddress(target);

        TxRecord memory txRequestRecord = createNewTxRecord(
            self,
            requester,
            target,
            value,
            gasLimit,
            operationType,
            executionSelector,
            executionParams
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
     * @return The updated TxRecord.
     */
    function txDelayedApproval(SecureOperationState storage self, uint256 txId) public returns (TxRecord memory) {
        if (!hasActionPermission(self, msg.sender, self.txRecords[txId].params.executionSelector, TxAction.EXECUTE_TIME_DELAY_APPROVE)) {
            revert SharedValidation.NoPermission(msg.sender);
        }
        _validateTxPending(self, txId);
        SharedValidation.validateReleaseTime(self.txRecords[txId].releaseTime);
        
        (bool success, bytes memory result) = executeTransaction(self.txRecords[txId]);
        
        _completeTransaction(self, txId, success, result, self.txRecords[txId].params.executionSelector);
        return self.txRecords[txId];
    }

    /**
     * @dev Cancels a pending transaction.
     * @param self The SecureOperationState to modify.
     * @param txId The ID of the transaction to cancel.
     * @return The updated TxRecord.
     */
    function txCancellation(SecureOperationState storage self, uint256 txId) public returns (TxRecord memory) {
        if (!hasActionPermission(self, msg.sender, self.txRecords[txId].params.executionSelector, TxAction.EXECUTE_TIME_DELAY_CANCEL)) {
            revert SharedValidation.NoPermission(msg.sender);
        }
        _validateTxPending(self, txId);
        
        _cancelTransaction(self, txId, self.txRecords[txId].params.executionSelector);
        
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
        if (!hasActionPermission(self, msg.sender, metaTx.txRecord.params.executionSelector, TxAction.EXECUTE_META_CANCEL)) {
            revert SharedValidation.NoPermission(msg.sender);
        }
        _validateTxPending(self, txId);
        if (!verifySignature(self, metaTx)) revert SharedValidation.InvalidSignature(metaTx.signature);
        
        incrementSignerNonce(self, metaTx.params.signer);
        _cancelTransaction(self, txId, metaTx.txRecord.params.executionSelector);
        
        return self.txRecords[txId];
    }

    /**
     * @dev Approves a pending transaction immediately using a meta-transaction.
     * @param self The SecureOperationState to modify.
     * @param metaTx The meta-transaction containing the signature and nonce.
     * @return The updated TxRecord.
     */
    function txApprovalWithMetaTx(SecureOperationState storage self, MetaTransaction memory metaTx) public returns (TxRecord memory) {
        uint256 txId = metaTx.txRecord.txId;
        if (!hasActionPermission(self, msg.sender, metaTx.txRecord.params.executionSelector, TxAction.EXECUTE_META_APPROVE)) {
            revert SharedValidation.NoPermission(msg.sender);
        }
        _validateTxPending(self, txId);
        if (!verifySignature(self, metaTx)) revert SharedValidation.InvalidSignature(metaTx.signature);
        
        incrementSignerNonce(self, metaTx.params.signer);
        (bool success, bytes memory result) = executeTransaction(self.txRecords[txId]);
        
        _completeTransaction(self, txId, success, result, metaTx.txRecord.params.executionSelector);
        
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
        if (!hasActionPermission(self, msg.sender, metaTx.txRecord.params.executionSelector, TxAction.EXECUTE_META_REQUEST_AND_APPROVE)) {
            revert SharedValidation.NoPermission(msg.sender);
        }
        
        TxRecord memory txRecord = txRequest(
            self,
            metaTx.txRecord.params.requester,
            metaTx.txRecord.params.target,
            metaTx.txRecord.params.value,
            metaTx.txRecord.params.gasLimit,
            metaTx.txRecord.params.operationType,
            metaTx.txRecord.params.executionSelector,
            metaTx.txRecord.params.executionParams
        );

        metaTx.txRecord = txRecord;
        return txApprovalWithMetaTx(self, metaTx);
    }

    /**
     * @dev Executes a transaction based on its execution type and attached payment.
     * @param record The transaction record to execute.
     * @return A tuple containing the success status and result of the execution.
     */
    function executeTransaction(TxRecord memory record) private returns (bool, bytes memory) {
        bytes memory txData = prepareTransactionData(record);
        uint gas = record.params.gasLimit;
        if (gas == 0) {
            gas = gasleft();
        }
        
        // Execute the main transaction
        (bool success, bytes memory result) = record.params.target.call{value: record.params.value, gas: gas}(
            txData
        );

        if (success) {
            record.status = TxStatus.COMPLETED;
            record.result = result;
            
            // Execute attached payment if transaction was successful
            if (record.payment.recipient != address(0)) {
                executeAttachedPayment(record);
            }
        } else {
            record.status = TxStatus.FAILED;
        }

        return (success, result);
    }

    /**
     * @dev Executes the payment attached to a transaction record
     * @param record The transaction record containing payment details
     */
    function executeAttachedPayment(TxRecord memory record) private {
        PaymentDetails memory payment = record.payment;
        
        // Execute native token payment if specified
        if (payment.nativeTokenAmount > 0) {
            if (address(this).balance < payment.nativeTokenAmount) {
                revert SharedValidation.InsufficientBalance(address(this).balance, payment.nativeTokenAmount);
            }
            
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
            
            erc20Token.safeTransfer(payment.recipient, payment.erc20TokenAmount);
        }
    }

    /**
     * @dev Prepares transaction data from execution selector and params without executing it.
     * @param record The transaction record to prepare data for.
     * @return The prepared transaction data.
     */
    function prepareTransactionData(TxRecord memory record) private pure returns (bytes memory) {
        // If executionSelector is 0x00000000, it's a simple ETH transfer (no function call)
        if (record.params.executionSelector == bytes4(0)) {
            return "";
        }
        // Otherwise, encode the function selector with params
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
     * @param executionSelector The function selector to execute (0x00000000 for simple ETH transfers)
     * @param executionParams The encoded parameters for the function (empty for simple ETH transfers)
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
        bytes memory executionParams
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
            payment: PaymentDetails({
                recipient: address(0),
                nativeTokenAmount: 0,
                erc20TokenAddress: address(0),
                erc20TokenAmount: 0
            })
        });
    }

    /**
     * @dev Adds a transaction ID to the pending transactions set.
     * @param self The SecureOperationState to modify.
     * @param txId The transaction ID to add to the pending set.
     */
    function addToPendingTransactionsList(SecureOperationState storage self, uint256 txId) private {
        SharedValidation.validateTransactionExists(txId);
        _validateTxPending(self, txId);
        
        // Check if transaction ID is already in the set (O(1) operation)
        if (self.pendingTransactionsSet.contains(txId)) revert SharedValidation.RequestAlreadyPending(txId);
        
        self.pendingTransactionsSet.add(txId);
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
            revert SharedValidation.TransactionNotFound(txId);
        }
    }

    // ============ PAYMENT MANAGEMENT FUNCTIONS ============

    /**
     * @dev Updates payment details for a pending transaction
     * @param self The SecureOperationState to modify
     * @param txId The transaction ID to update payment for
     * @param paymentDetails The new payment details
     */
    function updatePaymentForTransaction(
        SecureOperationState storage self,
        uint256 txId,
        PaymentDetails memory paymentDetails
    ) public {
        if (!hasActionPermission(self, msg.sender, self.txRecords[txId].params.executionSelector, TxAction.EXECUTE_UPDATE_PAYMENT)) {
            revert SharedValidation.NoPermission(msg.sender);
        }
        _validateTxPending(self, txId);
           
        self.txRecords[txId].payment = paymentDetails;
        
        logTxEvent(self, txId, self.txRecords[txId].params.executionSelector);
    }

    // ============ ROLE-BASED ACCESS CONTROL FUNCTIONS ============


    /**
     * @dev Gets the role by its hash.
     * @param self The SecureOperationState to check.
     * @param role The role to get the hash for.
     * @return The role associated with the hash, or Role(0) if the role doesn't exist.
     */
    function getRole(SecureOperationState storage self, bytes32 role) public view returns (Role storage) {
        _validateAnyRole(self);
        return self.roles[role];
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
        bytes32 roleHash = keccak256(bytes(roleName));
        if (self.roles[roleHash].roleHash == roleHash) revert SharedValidation.RoleAlreadyExists();
        
        // Create the role with empty arrays
        self.roles[roleHash].roleName = roleName;
        self.roles[roleHash].roleHash = roleHash;
        self.roles[roleHash].maxWallets = maxWallets;
        self.roles[roleHash].walletCount = 0;
        self.roles[roleHash].isProtected = isProtected;
        
        self.supportedRolesSet.add(roleHash);
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
        // Validate that the role exists
        _validateRoleExists(self, roleHash);
        
        // Security check: Prevent removing protected roles
        if (self.roles[roleHash].isProtected) {
            revert SharedValidation.CannotRemoveProtectedRole();
        }
        
        // Remove the role from the supported roles set (O(1) operation)
        // Defensive check: ensure role was actually in the set
        if (!self.supportedRolesSet.remove(roleHash)) {
            revert SharedValidation.RoleEmpty();
        }
        
        // Clear the role data
        delete self.roles[roleHash];
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
        if (roleData.authorizedWallets.contains(wallet)) revert SharedValidation.WalletError(wallet);
        
        roleData.authorizedWallets.add(wallet);
        roleData.walletCount = roleData.authorizedWallets.length();
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
        
        // Check if old wallet exists in the role
        Role storage roleData = self.roles[role];
        if (!roleData.authorizedWallets.contains(oldWallet)) {
            revert SharedValidation.WalletError(oldWallet);
        }

        // update the wallet if it's not the same
        if (oldWallet != newWallet) {
            // Remove old wallet (should succeed since we checked contains above)
            if (!roleData.authorizedWallets.remove(oldWallet)) {
                revert SharedValidation.WalletError(oldWallet);
            }
            
            // Check if new wallet is already in the role to prevent duplicates
            if (roleData.authorizedWallets.contains(newWallet)) {
                revert SharedValidation.WalletError(newWallet);
            }
            
            // Add new wallet (should always succeed since we verified it doesn't exist)
            if (!roleData.authorizedWallets.add(newWallet)) {
                revert SharedValidation.WalletError(newWallet);
            }
        }
        
    }

    /**
     * @dev Removes a wallet from a role.
     * @param self The SecureOperationState to modify.
     * @param role The role to remove the wallet from.
     * @param wallet The wallet address to remove.
     * @notice Security: Cannot remove the last wallet from a role to prevent empty roles.
     */
    function revokeWallet(SecureOperationState storage self, bytes32 role, address wallet) public {
        _validateRoleExists(self, role);
        
        // Check if wallet exists in the role
        Role storage roleData = self.roles[role];
        if (!roleData.authorizedWallets.contains(wallet)) {
            revert SharedValidation.WalletError(wallet);
        }
        
        // Security check: Prevent removing the last wallet from a role
        if (roleData.authorizedWallets.length() <= 1) {
            revert SharedValidation.WalletError(wallet);
        }
        
        // Remove the wallet (O(1) operation)
        roleData.authorizedWallets.remove(wallet);
        roleData.walletCount = roleData.authorizedWallets.length();
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
        // Check if role exists by checking if it's in the supported roles set
        if (!self.supportedRolesSet.contains(roleHash)) revert SharedValidation.RoleEmpty();
        
        // Use supportedFunctionsSet as source of truth for all selectors (including bytes4(0))
        if (!self.supportedFunctionsSet.contains(bytes32(functionPermission.functionSelector))) {
            revert SharedValidation.FunctionError(functionPermission.functionSelector);
        }
        
        // Validate that all grantedActions are supported by the function
        _validateMetaTxPermissions(self, functionPermission);
        
        Role storage role = self.roles[roleHash];
        
        // Check if permission already exists
        if (role.functionSelectorsSet.contains(bytes32(functionPermission.functionSelector))) {
            revert SharedValidation.FunctionPermissionExists(functionPermission.functionSelector);
        }
        
        // If it doesn't exist, add it
        role.functionPermissions[functionPermission.functionSelector] = functionPermission;
        role.functionSelectorsSet.add(bytes32(functionPermission.functionSelector));
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
        // Check if role exists by checking if it's in the supported roles set
        if (!self.supportedRolesSet.contains(roleHash)) revert SharedValidation.RoleEmpty();
        
        // Security check: Prevent removing protected functions from roles
        // Check if function exists and is protected (works for all selectors including bytes4(0))
        if (self.supportedFunctionsSet.contains(bytes32(functionSelector))) {
            FunctionSchema memory functionSchema = self.functions[functionSelector];
            if (functionSchema.isProtected) {
                revert SharedValidation.CannotRemoveProtectedRole();
            }
        }
        
        Role storage role = self.roles[roleHash];
        
        // Check if permission exists and remove it
        if (!role.functionSelectorsSet.contains(bytes32(functionSelector))) {
            revert SharedValidation.FunctionError(functionSelector);
        }
        
        // Remove the function permission
        delete role.functionPermissions[functionSelector];
        role.functionSelectorsSet.remove(bytes32(functionSelector));
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
        // Check if wallet has any role that grants permission for this function and action
        uint256 rolesLength = self.supportedRolesSet.length();
        for (uint i = 0; i < rolesLength; i++) {
            bytes32 roleHash = self.supportedRolesSet.at(i);
            Role storage role = self.roles[roleHash];
            
            if (role.authorizedWallets.contains(wallet)) {
                // Use the dedicated role permission check function
                if (roleHasActionPermission(self, roleHash, functionSelector, requestedAction)) {
                    return true;
                }
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
        // Check if wallet has any role that grants view permission
        uint256 rolesLength = self.supportedRolesSet.length();
        for (uint i = 0; i < rolesLength; i++) {
            bytes32 roleHash = self.supportedRolesSet.at(i);
            Role storage role = self.roles[roleHash];
            
            if (role.authorizedWallets.contains(wallet)) {
                return true;
            }
        }
        return false;
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
     * @param functionName Name of the function.
     * @param functionSelector Hash identifier for the function.
     * @param operationType The operation type this function belongs to.
     * @param operationName The name of the operation type.
     * @param supportedActionsBitmap Bitmap of permissions required to execute this function.
     * @param isProtected Whether the function schema is protected from removal.
     */
    function createFunctionSchema(
        SecureOperationState storage self,
        string memory functionName,
        bytes4 functionSelector,
        bytes32 operationType,
        string memory operationName,
        uint16 supportedActionsBitmap,
        bool isProtected
    ) public {
        if (!self.supportedOperationTypesSet.contains(operationType)) {
            SharedValidation.validateOperationTypeNotZero(operationType);
            self.supportedOperationTypesSet.add(operationType);
        }  
        
        // Use supportedFunctionsSet as source of truth for all selectors (including bytes4(0))
        if (self.supportedFunctionsSet.contains(bytes32(functionSelector))) {
            revert SharedValidation.FunctionError(functionSelector);
        }
        
        self.functions[functionSelector] = FunctionSchema({
            functionName: functionName,
            functionSelector: functionSelector,
            operationType: operationType,
            operationName: operationName,
            supportedActionsBitmap: supportedActionsBitmap,
            isProtected: isProtected
        });
        self.supportedFunctionsSet.add(bytes32(functionSelector)); 
    }

    /**
     * @dev Removes a function schema from the system.
     * @param self The SecureOperationState to modify.
     * @param functionSelector The function selector to remove.
     * @notice Security: Cannot remove protected function schemas to maintain system integrity.
     * @notice Cleanup: Automatically removes unused operation types from supportedOperationTypesSet.
     */
    function removeFunctionSchema(
        SecureOperationState storage self,
        bytes4 functionSelector
    ) public {
        // Use supportedFunctionsSet as source of truth for all selectors (including bytes4(0))
        if (!self.supportedFunctionsSet.contains(bytes32(functionSelector))) {
            revert SharedValidation.FunctionError(functionSelector);
        }
        
        // Security check: Prevent removing protected function schemas
        if (self.functions[functionSelector].isProtected) {
            SharedValidation.validateCanRemoveProtectedFunctionSchema(functionSelector);
        }
        
        // Store the operation type before removing the function schema
        bytes32 operationType = self.functions[functionSelector].operationType;
        
        // Remove the function schema from the supported functions set (O(1) operation)
        self.supportedFunctionsSet.remove(bytes32(functionSelector));
        
        // Clear the function schema data
        delete self.functions[functionSelector];
        
        // Check if the operation type is still in use by other functions
        bytes4[] memory functionsUsingOperationType = getFunctionsByOperationType(self, operationType);
        if (functionsUsingOperationType.length == 0) {
            // Remove the operation type from supported operation types set if no longer in use
            // Only attempt removal if it exists in the set (may have been cleaned up already)
            if (self.supportedOperationTypesSet.contains(operationType)) {
                // Remove operation type (should always succeed since we verified it exists)
                if (!self.supportedOperationTypesSet.remove(operationType)) {
                    // This should never happen, but defensive check for safety
                    revert SharedValidation.OperationNotSupported();
                }
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
        // Use supportedFunctionsSet as source of truth for all selectors (including bytes4(0))
        if (!self.supportedFunctionsSet.contains(bytes32(functionSelector))) {
            return false;
        }
        
        FunctionSchema memory functionSchema = self.functions[functionSelector];
        return hasActionInBitmap(functionSchema.supportedActionsBitmap, action);
    }

    /**
     * @dev Returns all function schemas that use a specific operation type.
     * @param self The SecureOperationState to check.
     * @param operationType The operation type to search for.
     * @return Array of function selectors that use the specified operation type.
     */
    function getFunctionsByOperationType(
        SecureOperationState storage self,
        bytes32 operationType
    ) public view returns (bytes4[] memory) {
        _validateAnyRole(self);
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
        
        // Create properly sized result array
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
     */
    function getPendingTransactionsList(SecureOperationState storage self) public view returns (uint256[] memory) {
        _validateAnyRole(self);
        return _convertUintSetToArray(self.pendingTransactionsSet);
    }

    /**
     * @dev Gets all supported roles as an array for backward compatibility
     * @param self The SecureOperationState to check
     * @return Array of supported role hashes
     */
    function getSupportedRolesList(SecureOperationState storage self) public view returns (bytes32[] memory) {
        _validateAnyRole(self);
        return _convertBytes32SetToArray(self.supportedRolesSet);
    }

    /**
     * @dev Gets all supported function selectors as an array for backward compatibility
     * @param self The SecureOperationState to check
     * @return Array of supported function selectors
     */
    function getSupportedFunctionsList(SecureOperationState storage self) public view returns (bytes4[] memory) {
        _validateAnyRole(self);
        uint256 length = self.supportedFunctionsSet.length();
        bytes4[] memory result = new bytes4[](length);
        for (uint256 i = 0; i < length; i++) {
            result[i] = bytes4(self.supportedFunctionsSet.at(i));
        }
        return result;
    }

    /**
     * @dev Gets all supported operation types as an array for backward compatibility
     * @param self The SecureOperationState to check
     * @return Array of supported operation type hashes
     */
    function getSupportedOperationTypesList(SecureOperationState storage self) public view returns (bytes32[] memory) {
        _validateAnyRole(self);
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
     * @dev Gets all function permissions for a role as an array for backward compatibility
     * @param self The SecureOperationState to check
     * @param roleHash The role hash to get function permissions from
     * @return Array of function permissions with arrays (for external API)
     */
    function getRoleFunctionPermissions(SecureOperationState storage self, bytes32 roleHash) public view returns (FunctionPermission[] memory) {
        _validateAnyRole(self);
        Role storage role = self.roles[roleHash];
        
        uint256 length = role.functionSelectorsSet.length();
        FunctionPermission[] memory result = new FunctionPermission[](length);
        
        for (uint256 i = 0; i < length; i++) {
            bytes4 functionSelector = bytes4(role.functionSelectorsSet.at(i));
            result[i] = role.functionPermissions[functionSelector];
        }
        
        return result;
    }

    // ============ META-TRANSACTION SUPPORT FUNCTIONS ============

    /**
     * @dev Gets the current nonce for a specific signer.
     * @param self The SecureOperationState to check.
     * @param signer The address of the signer.
     * @return The current nonce for the signer.
     */
    function getSignerNonce(SecureOperationState storage self, address signer) public view returns (uint256) {
        _validateAnyRole(self);
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
        if (metaTx.txRecord.status != TxStatus.PENDING) revert SharedValidation.TransactionNotPending(uint8(metaTx.txRecord.status));
        
        // Transaction parameters validation
        SharedValidation.validateNotZeroAddress(metaTx.txRecord.params.requester);
        
        // Meta-transaction parameters validation
        SharedValidation.validateChainId(metaTx.params.chainId);
        SharedValidation.validateHandlerContractMatch(metaTx.params.handlerContract, metaTx.txRecord.params.target);
        SharedValidation.validateMetaTxDeadline(metaTx.params.deadline);
        
        // Gas price validation (if applicable)
        SharedValidation.validateGasPrice(metaTx.params.maxGasPrice);
        
        // Validate signer-specific nonce
        SharedValidation.validateNonce(metaTx.params.nonce, getSignerNonce(self, metaTx.params.signer));

        // txId validation for new meta transactions
        if (metaTx.params.action == TxAction.SIGN_META_REQUEST_AND_APPROVE) {
            SharedValidation.validateTransactionId(metaTx.txRecord.txId, self.txCounter);
        }
        
        // Signature verification
        bytes32 messageHash = generateMessageHash(metaTx);
        address recoveredSigner = recoverSigner(messageHash, metaTx.signature);
        if (recoveredSigner != metaTx.params.signer) revert SharedValidation.InvalidSignature(metaTx.signature);

        // Authorization check - verify signer has meta-transaction signing permissions for the function and action
        bool isAuthorized = hasActionPermission(self, metaTx.params.signer, metaTx.params.handlerSelector, metaTx.params.action);
        if (!isAuthorized) revert SharedValidation.SignerNotAuthorized(metaTx.params.signer);
        
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
            LIBRARY_NAME_HASH,
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
            txParams.executionParams
        );

         MetaTransaction memory res = generateMetaTransaction(self, txRecord, metaTxParams);
         return res;
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
        if (txRecord.txId != txId) revert SharedValidation.TransactionNotFound(txId);
        
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
                // Forwarding failed, continue execution
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


    // ============ OPTIMIZATION HELPER FUNCTIONS ============

    /**
     * @dev Helper function to complete a transaction and remove from pending list
     * @param self The SecureOperationState to modify
     * @param txId The transaction ID to complete
     * @param success Whether the transaction execution was successful
     * @param result The result of the transaction execution
     * @param functionSelector The function selector for logging
     */
    function _completeTransaction(
        SecureOperationState storage self,
        uint256 txId,
        bool success,
        bytes memory result,
        bytes4 functionSelector
    ) private {
        // Update storage with new status and result
        if (success) {
            self.txRecords[txId].status = TxStatus.COMPLETED;
            self.txRecords[txId].result = result;
        } else {
            self.txRecords[txId].status = TxStatus.FAILED;
        }
        
        // Remove from pending transactions list
        removeFromPendingTransactionsList(self, txId);
        
        logTxEvent(self, txId, functionSelector);
    }

    /**
     * @dev Helper function to cancel a transaction and remove from pending list
     * @param self The SecureOperationState to modify
     * @param txId The transaction ID to cancel
     * @param functionSelector The function selector for logging
     */
    function _cancelTransaction(
        SecureOperationState storage self,
        uint256 txId,
        bytes4 functionSelector
    ) private {
        self.txRecords[txId].status = TxStatus.CANCELLED;
        
        // Remove from pending transactions list
        removeFromPendingTransactionsList(self, txId);
        
        logTxEvent(self, txId, functionSelector);
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
        if (self.roles[roleHash].roleHash == 0) revert SharedValidation.RoleEmpty();
    }

    /**
     * @dev Validates that a transaction is in pending status
     * @param self The SecureOperationState to check
     * @param txId The transaction ID to validate
     * @notice This function consolidates the repeated pending transaction check pattern to reduce contract size
     */
    function _validateTxPending(SecureOperationState storage self, uint256 txId) internal view {
        if (self.txRecords[txId].status != TxStatus.PENDING) revert SharedValidation.TransactionNotPending(uint8(self.txRecords[txId].status));
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
        for (uint i = 0; i < 10; i++) { // TxAction enum has 10 values (0-9)
            if (hasActionInBitmap(bitmap, TxAction(i))) {
                if (!isActionSupportedByFunction(self, functionPermission.functionSelector, TxAction(i))) {
                    revert SharedValidation.ActionNotSupported();
                }
            }
        }
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

}
