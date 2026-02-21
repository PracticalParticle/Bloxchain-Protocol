// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

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

    bool private isExecutingThroughGuardian = false;
    
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
     */
    function _encodeSafeTxParams(SafeTx calldata safeTx) private pure returns (bytes memory) {
        return abi.encode(
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
     */
    function executeTransaction(SafeTx memory safeTx) external {
        SharedValidation.validateInternalCall(address(this));
        
        isExecutingThroughGuardian = true;
        
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
        
        isExecutingThroughGuardian = false;
        
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
     */
    function _encodeSafeTxParamsMemory(SafeTx memory safeTx) private pure returns (bytes memory) {
        return abi.encode(
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
    }

    function checkTransaction(
        address to,
        uint256 /* value */,
        bytes memory data,
        Operation operation,
        uint256 /* safeTxGas */,
        uint256 /* baseGas */,
        uint256 /* gasPrice */,
        address /* gasToken */,
        address payable /* refundReceiver */,
        bytes memory /* signatures */,
        address /* msgSender */
    ) external view override {
        // Check if this is a delegated call and validate if needed
        if (operation == Operation.DelegateCall) {
            _validateDelegation();
        }
        
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
                
                // If setting this GuardianSafe as guard, allow from any user (initial setup)
                if (newGuardAddress == address(this)) {
                    return; // Allow initial guard setup
                }
                
                // For guard changes after setup, only allow through GuardianSafe system
                require(
                    isExecutingThroughGuardian,
                    "GuardianSafe: Guard changes must be executed through GuardianSafe system"
                );
                return;
            }
        }
        
        // For all other transactions, ensure they come through GuardianSafe system
        require(
            isExecutingThroughGuardian, 
            "GuardianSafe: Transactions must be executed through GuardianSafe system"
        );
    }

    function checkAfterExecution(bytes32 hash, bool success) external override {
        // Empty implementation as per requirements
    }

    /**
     * @notice Validates if delegated calls are allowed
     * @dev Reverts if delegated calls are not enabled
     */
    function _validateDelegation() internal view {
        require(delegatedCallEnabled, "Delegated calls are not enabled");
    }
}
