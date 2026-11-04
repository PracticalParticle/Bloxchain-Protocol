// SPDX-License-Identifier: MIT
pragma solidity 0.8.35;

import "../../../../core/security/SecureOwnable.sol";
import "../../../../core/lib/utils/SharedValidation.sol";
import "../../../../core/lib/interfaces/IDefinition.sol";
import "./GuardianSafeDefinitions.sol";

interface ISafe {
    function execTransaction(
        address to,
        uint256 value,
        bytes calldata data,
        uint8 operation,
        uint256 safeTxGas,
        uint256 baseGas,
        uint256 gasPrice,
        address gasToken,
        address payable refundReceiver,
        bytes memory signatures
    ) external payable returns (bool success);
}

interface ITransactionGuard {
    enum Operation {
        Call,
        DelegateCall
    }

    function checkTransaction(
        address to,
        uint256 value,
        bytes memory data,
        Operation operation,
        uint256 safeTxGas,
        uint256 baseGas,
        uint256 gasPrice,
        address gasToken,
        address payable refundReceiver,
        bytes memory signatures,
        address msgSender
    ) external;

    function checkAfterExecution(bytes32 hash, bool success) external;
}

/**
 * @title GuardianSafe
 * @dev Teaching sample under contracts/examples/ — not a ready product; do not use on live networks.
 * @dev A secure wrapper for Safe wallet functionality using SecureOwnable security framework.
 * Implements time-locked operations and meta-transaction support for enhanced security.
 */
contract GuardianSafe is SecureOwnable, ITransactionGuard {
    using SharedValidation for *;
    
    // Operation types (from definitions)
    bytes32 public constant EXEC_SAFE_TX = GuardianSafeDefinitions.EXEC_SAFE_TX;

    // DelegateCall flag
    bool public delegatedCallEnabled = false;

    // Safe transaction structure
    struct SafeTx {
        address to;             // Destination address
        uint256 value;          // Ether value
        bytes data;             // Data payload
        uint8 operation;        // Operation type (0=Call, 1=DelegateCall)
        uint256 safeTxGas;      // Gas for Safe transaction
        uint256 baseGas;        // Gas costs for data
        uint256 gasPrice;       // Maximum gas price
        address gasToken;       // Token for gas payment (0 for ETH)
        address payable refundReceiver;  // Refund receiver address
        bytes signatures;       // Packed signature data
    }

    // Safe instance
    ISafe private safe;

    // Events
    event TransactionRequested(SafeTx safeTx);
    event TransactionExecuted(bytes32 operationType, bytes executionData);
    event TransactionCancelled(uint256 txId);
    event DelegatedCallStatusChanged(bool enabled);

    // Meta-transaction parameters struct
    struct SafeMetaTxParams {
        uint256 deadline;
        uint256 maxGasPrice;
    }

    /**
     * @dev Binding for the one Safe transaction GuardianSafe is currently executing (SPEC-2026-0176).
     *      Set by `executeTransaction` (only reachable through an approved EngineBlox execution), consumed by the
     *      first matching `checkTransaction`, and cleared again in `checkAfterExecution` and after the Safe call.
     *      Zero means no Safe transaction is admitted. Replaces the former global `isExecutingThroughGuardian`
     *      latch, which admitted *any* Safe transaction (including nested ones) while it was set.
     */
    bytes32 private approvedSafeTxHash;

    /**
     * @dev True while `executeTransaction` has a Safe call in flight (set with the binding, cleared in
     *      `checkAfterExecution` and after the Safe call). Unlike `approvedSafeTxHash` it is not consumed by the
     *      first guard check, so the guard can tell "inside a governed window" from "outside any governed call".
     *      Keeps the unapproved `setGuard(address(this))` install path closed during a governed window.
     */
    bool private guardianExecutionOpen;

    /**
     * @notice Initialize GuardianSafe (replaces constructor for clone pattern)
     * @param _safe The Safe contract address
     * @param initialOwner The initial owner address
     * @param broadcaster The broadcaster address for meta-transactions
     * @param recovery The recovery address
     * @param timeLockPeriodSec The timelock period for operations in seconds
     * @param eventForwarder The event forwarder address
     */
    function initialize(
        address _safe,
        address initialOwner,
        address broadcaster,
        address recovery,
        uint256 timeLockPeriodSec,
        address eventForwarder
    ) public initializer {
        SharedValidation.validateNotZeroAddress(_safe);
        safe = ISafe(_safe);

        // Initialize SecureOwnable
        SecureOwnable.initialize(initialOwner, broadcaster, recovery, timeLockPeriodSec, eventForwarder);
        
        // Load GuardianSafe-specific definitions
        IDefinition.RolePermission memory permissions = 
            GuardianSafeDefinitions.getRolePermissions();
        _loadDefinitions(
            GuardianSafeDefinitions.getFunctionSchemas(),
            permissions.roleHashes,
            permissions.functionPermissions,
            true // Enforce all function schemas are protected
        );
    }

    /**
     * @notice Gets the underlying Safe contract address
     * @return The address of the Safe contract
     */
    function getSafeAddress() external view returns (address) {
        return address(safe);
    }

    /**
     * @notice Enable or disable delegated calls
     * @param enabled True to enable delegated calls, false to disable
     */
    function setDelegatedCallEnabled(bool enabled) external {
        SharedValidation.validateOwner(owner());
        delegatedCallEnabled = enabled;
        emit DelegatedCallStatusChanged(enabled);
    }

    /**
     * @notice Request execution of a Safe transaction with time-lock security
     * @param safeTx The Safe transaction parameters
     */
    function requestTransaction(SafeTx calldata safeTx) 
        external 
        returns (uint256 txId) 
    {
        SharedValidation.validateOwner(owner());
        // Use helper function to encode parameters and avoid stack too deep
        bytes memory params = _encodeSafeTxParams(safeTx);
        
        EngineBlox.TxRecord memory txRecord = _requestTransaction(
            msg.sender,
            address(this),
            0, // value
            safeTx.safeTxGas,
            EXEC_SAFE_TX,
            GuardianSafeDefinitions.EXEC_SAFE_TX_SELECTOR,
            params
        );
        
        emit TransactionRequested(safeTx);

        return txRecord.txId;
    }

    /**
     * @dev Helper function to encode SafeTx parameters to avoid stack too deep
     * @param safeTx The Safe transaction parameters
     * @return Encoded parameters for executeTransaction function
     * @notice Encodes a single SafeTx tuple so it decodes as `executeTransaction(SafeTx)`
     *         (selector GuardianSafeDefinitions.EXEC_SAFE_TX_SELECTOR). Flattened field encoding does not match
     *         the struct ABI (dynamic tuple head offset) and must not be used.
     */
    function _encodeSafeTxParams(SafeTx calldata safeTx) private pure returns (bytes memory) {
        return abi.encode(safeTx);
    }

    /**
     * @notice Approve a pending transaction after timelock period
     * @param txId The transaction ID to approve
     */
    function approveTransactionAfterDelay(uint256 txId) external returns (uint256) {
        SharedValidation.validateOwner(owner());
        EngineBlox.TxRecord memory txRecord = _approveTransaction(txId);
        return txRecord.txId;
    }

    /**
     * @notice Approve a pending transaction with meta transaction
     * @param metaTx Meta transaction data
     */
    function approveTransactionWithMetaTx(EngineBlox.MetaTransaction memory metaTx) 
        external 
        returns (uint256) 
    {
        _validateBroadcaster(msg.sender);
        EngineBlox.TxRecord memory txRecord = _approveTransactionWithMetaTx(metaTx);
        return txRecord.txId;
    }

    /**
     * @notice Cancel a pending transaction
     * @param txId The transaction ID to cancel
     */
    function cancelTransaction(uint256 txId) external returns (uint256) {
        SharedValidation.validateOwner(owner());
        EngineBlox.TxRecord memory updatedRecord = _cancelTransaction(txId);
        emit TransactionCancelled(txId);
        return updatedRecord.txId;
    }

    /**
     * @notice Cancel a pending transaction with meta transaction
     * @param metaTx Meta transaction data
     */
    function cancelTransactionWithMetaTx(EngineBlox.MetaTransaction memory metaTx) 
        external 
        returns (uint256) 
    {
        _validateBroadcaster(msg.sender);
        EngineBlox.TxRecord memory updatedRecord = _cancelTransactionWithMetaTx(metaTx);
        emit TransactionCancelled(updatedRecord.txId);
        return updatedRecord.txId;
    }

    /**
     * @notice Request and approve a Safe transaction in a single phase using meta-transaction
     * @param metaTx Meta transaction data
     * @return The transaction record
     */
    function requestAndApproveTransactionWithMetaTx(
        EngineBlox.MetaTransaction memory metaTx
    ) public returns (uint256) {
        _validateBroadcaster(msg.sender);
        EngineBlox.TxRecord memory txRecord = _requestAndApproveTransaction(metaTx);
        return txRecord.txId;
    }

    /**
     * @notice Execute a Safe transaction through execTransaction
     * @param safeTx The Safe transaction parameters
     * @dev Binds the guard to exactly this Safe transaction (all Safe call fields, signatures, and
     *      `msgSender == address(this)`) for the duration of the call. The binding is single-use: the guard
     *      consumes it on the first matching `checkTransaction`, so a nested `execTransaction` from the call
     *      target — different or identical fields — is rejected. Cleared after the call whether it succeeds or
     *      fails; a revert rolls the write back with the rest of the frame.
     */
    function executeTransaction(SafeTx memory safeTx) external {
        SharedValidation.validateInternalCall(address(this));
        require(
            approvedSafeTxHash == bytes32(0) && !guardianExecutionOpen,
            "GuardianSafe: Safe transaction already in progress"
        );

        guardianExecutionOpen = true;
        approvedSafeTxHash = _safeTxBindingHash(
            safeTx.to,
            safeTx.value,
            safeTx.data,
            safeTx.operation,
            safeTx.safeTxGas,
            safeTx.baseGas,
            safeTx.gasPrice,
            safeTx.gasToken,
            safeTx.refundReceiver,
            safeTx.signatures,
            address(this)
        );

        bool success = safe.execTransaction(
            safeTx.to,
            safeTx.value,
            safeTx.data,
            safeTx.operation,
            safeTx.safeTxGas,
            safeTx.baseGas,
            safeTx.gasPrice,
            safeTx.gasToken,
            safeTx.refundReceiver,
            safeTx.signatures
        );
        
        // Fail-safe: the guard normally consumes the binding in checkTransaction and clears it in
        // checkAfterExecution; clear again in case the Safe returned without calling the guard.
        approvedSafeTxHash = bytes32(0);
        guardianExecutionOpen = false;

        require(success, "Safe transaction execution failed");
        
        // Emit event for successful execution
        emit TransactionExecuted(EXEC_SAFE_TX, abi.encode(safeTx));
    }


    /**
     * @dev Returns whether the module supports a given interface
     * @param interfaceId The interface identifier
     * @return bool True if the interface is supported
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return 
            interfaceId == type(ITransactionGuard).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    /**
     * @dev Receive function to accept ETH
     */
    receive() external payable {}

    /**
     * @notice Generate an unsigned meta-transaction for a new Safe transaction
     * @param safeTx The Safe transaction parameters
     * @param params Meta transaction parameters
     * @return The unsigned meta-transaction
     */
    function generateUnsignedSafeMetaTxForNew(
        SafeTx memory safeTx,
        SafeMetaTxParams memory params
    ) public view returns (EngineBlox.MetaTransaction memory) {
        // Validate that operation is Call (0)
        if (safeTx.operation != 0) revert SharedValidation.NotSupported();

        bytes memory executionParams = createTransactionExecutionParams(safeTx);

        // Create meta-transaction parameters
        EngineBlox.MetaTxParams memory metaTxParams = createMetaTxParams(
            address(this),
            GuardianSafeDefinitions.REQUEST_AND_APPROVE_TX_META_SELECTOR,
            EngineBlox.TxAction.SIGN_META_REQUEST_AND_APPROVE,
            params.deadline,
            params.maxGasPrice,
            owner()
        );

        // Generate the unsigned meta-transaction
        return generateUnsignedMetaTransactionForNew(
            owner(),
            address(this),
            safeTx.value,
            safeTx.safeTxGas,
            EXEC_SAFE_TX,
            GuardianSafeDefinitions.EXEC_SAFE_TX_SELECTOR,
            executionParams,
            metaTxParams
        );
    }

    /**
     * @notice Generate an unsigned meta-transaction for an existing Safe transaction
     * @param txId The ID of the existing transaction
     * @param params Meta transaction parameters
     * @param isApproval Whether this is for approval (true) or cancellation (false)
     * @return The unsigned meta-transaction
     */
    function generateUnsignedSafeMetaTxForExisting(
        uint256 txId,
        SafeMetaTxParams memory params,
        bool isApproval
    ) public view returns (EngineBlox.MetaTransaction memory) {
        // Create meta-transaction parameters with appropriate selector
        EngineBlox.MetaTxParams memory metaTxParams = createMetaTxParams(
            address(this),
            isApproval ? GuardianSafeDefinitions.APPROVE_TX_META_SELECTOR : GuardianSafeDefinitions.CANCEL_TX_META_SELECTOR,
            isApproval ? EngineBlox.TxAction.SIGN_META_APPROVE : EngineBlox.TxAction.SIGN_META_CANCEL,
            params.deadline,
            params.maxGasPrice,
            owner()
        );

        // Generate the unsigned meta-transaction
        return generateUnsignedMetaTransactionForExisting(
            txId,
            metaTxParams
        );
    }

     /**
     * @notice Create execution params for a Safe transaction
     * @param safeTx The Safe transaction parameters
     * @return The execution params bytes
     */
    function createTransactionExecutionParams(
        SafeTx memory safeTx
    ) public pure returns (bytes memory) {
        SharedValidation.validateTargetAddress(safeTx.to);

        // Convert to calldata for helper function (we'll create a memory version)
        SafeTx memory memSafeTx = safeTx;
        return _encodeSafeTxParamsMemory(memSafeTx);
    }

    /**
     * @dev Helper function to encode SafeTx parameters from memory (for createTransactionExecutionOptions)
     * @param safeTx The Safe transaction parameters
     * @return Encoded parameters for executeTransaction function
     * @notice Single SafeTx tuple, identical to `_encodeSafeTxParams` (see there).
     */
    function _encodeSafeTxParamsMemory(SafeTx memory safeTx) private pure returns (bytes memory) {
        return abi.encode(safeTx);
    }

    /**
     * @notice Safe guard hook: admits only the Safe transaction GuardianSafe is executing right now
     * @dev SPEC-2026-0176: the live transaction (all Safe call fields, signatures, and `msgSender`) must hash to
     *      `approvedSafeTxHash`, set by `executeTransaction`. The binding is consumed on admit, so any further
     *      `execTransaction` in the same window (nested from the call target, or a replay of the same fields) is
     *      rejected. Only the bound Safe may call this hook. Installing this contract as the guard
     *      (`setGuard(address(this))`) stays allowed without a binding only while no governed execution window is
     *      open (initial setup path); inside the window it must match the binding like any other transaction.
     *      The binding is a GuardianSafe-local identity, not Safe's EIP-712 safeTxHash (no Safe nonce/domain).
     */
    function checkTransaction(
        address to,
        uint256 value,
        bytes memory data,
        Operation operation,
        uint256 safeTxGas,
        uint256 baseGas,
        uint256 gasPrice,
        address gasToken,
        address payable refundReceiver,
        bytes memory signatures,
        address msgSender
    ) external override {
        require(msg.sender == address(safe), "GuardianSafe: caller is not the Safe");

        // Check if this is a delegated call and validate if needed
        if (operation == Operation.DelegateCall) {
            _validateDelegation();
        }

        bool approved = _consumeApprovedSafeTx(
            _safeTxBindingHash(
                to,
                value,
                data,
                uint8(operation),
                safeTxGas,
                baseGas,
                gasPrice,
                gasToken,
                refundReceiver,
                signatures,
                msgSender
            )
        );

        // Handle setGuard calls specially
        if (to == address(safe) && data.length >= 4) {
            bytes4 selector;
            assembly {
                selector := mload(add(data, 0x20))
            }
            
            if (selector == bytes4(keccak256("setGuard(address)"))) {
                // Extract the guard address being set (skip first 4 bytes for function selector)
                address newGuardAddress;
                assembly {
                    newGuardAddress := mload(add(data, 0x24))
                }
                
                // Installing this GuardianSafe as guard is allowed without approval only outside a governed
                // execution window (initial setup). Inside the window it must match the binding like any tx.
                if (newGuardAddress == address(this) && !guardianExecutionOpen) {
                    return; // Allow initial guard setup
                }
                
                // For guard changes after setup, only the approved Safe transaction is admitted
                require(
                    approved,
                    "GuardianSafe: Guard changes must be executed through GuardianSafe system"
                );
                return;
            }
        }

        // For all other transactions, only the approved Safe transaction is admitted
        require(
            approved,
            "GuardianSafe: Transactions must be executed through GuardianSafe system"
        );
    }

    /**
     * @notice Safe guard hook after execution: clears any remaining binding (success or failure)
     * @dev Only the bound Safe may call this hook.
     */
    function checkAfterExecution(bytes32 /* hash */, bool /* success */) external override {
        require(msg.sender == address(safe), "GuardianSafe: caller is not the Safe");
        approvedSafeTxHash = bytes32(0);
        guardianExecutionOpen = false;
    }

    /**
     * @dev Consumes the binding if `liveHash` matches it. Returns false (and leaves state untouched) otherwise.
     */
    function _consumeApprovedSafeTx(bytes32 liveHash) private returns (bool) {
        bytes32 bound = approvedSafeTxHash;
        if (bound == bytes32(0) || bound != liveHash) {
            return false;
        }
        approvedSafeTxHash = bytes32(0);
        return true;
    }

    /**
     * @dev Identity of a Safe transaction as seen by the guard: every field Safe passes to `checkTransaction`
     *      (dynamic fields hashed) plus the `execTransaction` caller. Binding `msgSender` to `address(this)` means
     *      only GuardianSafe's own `safe.execTransaction` call can match.
     */
    function _safeTxBindingHash(
        address to,
        uint256 value,
        bytes memory data,
        uint8 operation,
        uint256 safeTxGas,
        uint256 baseGas,
        uint256 gasPrice,
        address gasToken,
        address refundReceiver,
        bytes memory signatures,
        address msgSender
    ) private pure returns (bytes32) {
        return keccak256(
            abi.encode(
                to,
                value,
                keccak256(data),
                operation,
                safeTxGas,
                baseGas,
                gasPrice,
                gasToken,
                refundReceiver,
                keccak256(signatures),
                msgSender
            )
        );
    }

    /**
     * @notice Validates if delegated calls are allowed
     * @dev Reverts if delegated calls are not enabled
     */
    function _validateDelegation() internal view {
        require(delegatedCallEnabled, "Delegated calls are not enabled");
    }
}
