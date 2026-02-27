// SPDX-License-Identifier: MPL-2.0
pragma solidity 0.8.34;

import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "../../../contracts/core/base/BaseStateMachine.sol";
import "../../../contracts/core/lib/EngineBlox.sol";
import "../../../contracts/core/lib/utils/SharedValidation.sol";

/**
 * @title PaymentTestHelper
 * @dev Test helper contract that exposes payment functionality for testing
 * 
 * This contract extends BaseStateMachine and exposes internal payment functions
 * so that tests can properly set up and test payment scenarios.
 * For testing purposes, it bypasses permission checks.
 */
contract PaymentTestHelper is BaseStateMachine {
    using EnumerableSet for EnumerableSet.Bytes32Set;
    using EnumerableSet for EnumerableSet.AddressSet;
    /**
     * @notice Initializer to initialize PaymentTestHelper
     * @param initialOwner The initial owner address
     * @param broadcaster The broadcaster address
     * @param recovery The recovery address
     * @param timeLockPeriodSec The timelock period in seconds
     * @param eventForwarder The event forwarder address (optional)
     */
    function initialize(
        address initialOwner,
        address broadcaster,
        address recovery,
        uint256 timeLockPeriodSec,
        address eventForwarder
    ) public initializer {
        // Input validation
        SharedValidation.validateNotZeroAddress(initialOwner);
        SharedValidation.validateNotZeroAddress(broadcaster);
        SharedValidation.validateNotZeroAddress(recovery);
        SharedValidation.validateTimeLockPeriod(timeLockPeriodSec);
        
        _initializeBaseStateMachine(
            initialOwner,
            broadcaster,
            recovery,
            timeLockPeriodSec,
            eventForwarder
        );
        
        // Set up permissions for NATIVE_TRANSFER_SELECTOR to allow payment testing
        _setupPaymentPermissions();
    }
    
    /**
     * @notice Internal function to set up payment permissions for testing
     * @dev Registers NATIVE_TRANSFER_SELECTOR and requestTransaction function, grants owner permissions
     */
    function _setupPaymentPermissions() internal {
        EngineBlox.SecureOperationState storage state = _getSecureState();
        bytes4 nativeTransferSelector = EngineBlox.NATIVE_TRANSFER_SELECTOR;
        bytes4 requestTxSelector = this.requestTransaction.selector;
        
        // Note: OWNER_ROLE has maxWallets=1, so we can't add the contract address
        // The owner address is already in OWNER_ROLE from initialization
        // When tests call with vm.prank(owner), msg.sender will be owner, so permissions should work
        bytes32 ownerRoleHash = EngineBlox.OWNER_ROLE;
        EngineBlox.Role storage ownerRole = state.roles[ownerRoleHash];
        
        // Create bitmap for EXECUTE_TIME_DELAY_REQUEST action
        EngineBlox.TxAction[] memory requestActions = new EngineBlox.TxAction[](1);
        requestActions[0] = EngineBlox.TxAction.EXECUTE_TIME_DELAY_REQUEST;
        uint16 requestActionsBitmap = EngineBlox.createBitmapFromActions(requestActions);
        
        // Create bitmap for EXECUTE_TIME_DELAY_APPROVE action (for approveTransaction)
        EngineBlox.TxAction[] memory approveActions = new EngineBlox.TxAction[](1);
        approveActions[0] = EngineBlox.TxAction.EXECUTE_TIME_DELAY_APPROVE;
        uint16 approveActionsBitmap = EngineBlox.createBitmapFromActions(approveActions);
        
        // Create bitmap for both REQUEST and APPROVE actions (NATIVE_TRANSFER needs both)
        EngineBlox.TxAction[] memory bothActions = new EngineBlox.TxAction[](2);
        bothActions[0] = EngineBlox.TxAction.EXECUTE_TIME_DELAY_REQUEST;
        bothActions[1] = EngineBlox.TxAction.EXECUTE_TIME_DELAY_APPROVE;
        uint16 bothActionsBitmap = EngineBlox.createBitmapFromActions(bothActions);
        
        // Register NATIVE_TRANSFER_SELECTOR function schema if not already registered
        bytes4[] memory nativeTransferHandlers = new bytes4[](1);
        nativeTransferHandlers[0] = nativeTransferSelector; // Self-reference
        
        if (!state.supportedFunctionsSet.contains(bytes32(nativeTransferSelector))) {
            EngineBlox.registerFunction(
                state,
                "__bloxchain_native_transfer__()",
                nativeTransferSelector,
                "NATIVE_TRANSFER",
                bothActionsBitmap, // Support both REQUEST and APPROVE
                true, // isProtected = true (required for functions starting with '_')
                nativeTransferHandlers
            );
        }
        
        // Ensure permissions are granted even if schema already exists
        // Check if permission already exists to avoid duplicates
        if (!ownerRole.functionSelectorsSet.contains(bytes32(nativeTransferSelector))) {
            EngineBlox.FunctionPermission memory nativeTransferPermission = EngineBlox.FunctionPermission({
                functionSelector: nativeTransferSelector,
                grantedActionsBitmap: bothActionsBitmap, // Both REQUEST and APPROVE
                handlerForSelectors: nativeTransferHandlers
            });
            EngineBlox.addFunctionToRole(state, ownerRoleHash, nativeTransferPermission);
        }
        
        // Ensure whitelist entry exists even if schema already exists
        // Note: address(this) is always allowed, but we add it explicitly for clarity
        EnumerableSet.AddressSet storage whitelist = state.functionTargetWhitelist[nativeTransferSelector];
        if (!whitelist.contains(address(this))) {
            EngineBlox.addTargetToWhitelist(state, nativeTransferSelector, address(this));
        }
        
        // Register requestTransaction function schema if not already registered
        // Handler selectors must include self-reference (requestTransaction.selector) 
        // and can also include the execution selector (NATIVE_TRANSFER_SELECTOR)
        bytes4[] memory requestTxHandlers = new bytes4[](2);
        requestTxHandlers[0] = requestTxSelector; // Self-reference (required)
        requestTxHandlers[1] = nativeTransferSelector; // Points to NATIVE_TRANSFER_SELECTOR
        
        if (!state.supportedFunctionsSet.contains(bytes32(requestTxSelector))) {
            EngineBlox.registerFunction(
                state,
                "requestTransaction(address,address,uint256,uint256,bytes32,bytes4,bytes)",
                requestTxSelector,
                "TEST_OPERATION",
                requestActionsBitmap,
                true, // isProtected = true (required because function exists in contract bytecode)
                requestTxHandlers
            );
        }
        
        // Ensure permissions are granted even if schema already exists
        if (!ownerRole.functionSelectorsSet.contains(bytes32(requestTxSelector))) {
            // handlerForSelectors in permission should include requestTransaction.selector itself (self-reference)
            // so it can be used as a handler, and also NATIVE_TRANSFER_SELECTOR
            bytes4[] memory requestTxPermissionHandlers = new bytes4[](2);
            requestTxPermissionHandlers[0] = requestTxSelector; // Self-reference (allows it to be used as handler)
            requestTxPermissionHandlers[1] = nativeTransferSelector; // Can handle NATIVE_TRANSFER_SELECTOR
            
            EngineBlox.FunctionPermission memory requestTxPermission = EngineBlox.FunctionPermission({
                functionSelector: requestTxSelector,
                grantedActionsBitmap: requestActionsBitmap,
                handlerForSelectors: requestTxPermissionHandlers
            });
            EngineBlox.addFunctionToRole(state, ownerRoleHash, requestTxPermission);
        }
        
        // Register requestTransactionWithPayment function schema (needs REQUEST + execution selector permission)
        bytes4 requestWithPaymentSelector = this.requestTransactionWithPayment.selector;
        bytes4[] memory requestWithPaymentHandlers = new bytes4[](2);
        requestWithPaymentHandlers[0] = requestWithPaymentSelector;
        requestWithPaymentHandlers[1] = nativeTransferSelector;
        if (!state.supportedFunctionsSet.contains(bytes32(requestWithPaymentSelector))) {
            EngineBlox.registerFunction(
                state,
                "requestTransactionWithPayment(address,address,uint256,uint256,bytes32,bytes4,bytes,(address,uint256,address,uint256))",
                requestWithPaymentSelector,
                "TEST_OPERATION_WITH_PAYMENT",
                requestActionsBitmap,
                true,
                requestWithPaymentHandlers
            );
        }
        if (!ownerRole.functionSelectorsSet.contains(bytes32(requestWithPaymentSelector))) {
            bytes4[] memory requestWithPaymentPermissionHandlers = new bytes4[](2);
            requestWithPaymentPermissionHandlers[0] = requestWithPaymentSelector;
            requestWithPaymentPermissionHandlers[1] = nativeTransferSelector;
            EngineBlox.FunctionPermission memory requestWithPaymentPermission = EngineBlox.FunctionPermission({
                functionSelector: requestWithPaymentSelector,
                grantedActionsBitmap: requestActionsBitmap,
                handlerForSelectors: requestWithPaymentPermissionHandlers
            });
            EngineBlox.addFunctionToRole(state, ownerRoleHash, requestWithPaymentPermission);
        }
        
        // Register approveTransaction function schema if not already registered
        bytes4 approveTxSelector = this.approveTransaction.selector;
        bytes4[] memory approveTxHandlers = new bytes4[](1);
        approveTxHandlers[0] = approveTxSelector; // Self-reference
        
        if (!state.supportedFunctionsSet.contains(bytes32(approveTxSelector))) {
            EngineBlox.registerFunction(
                state,
                "approveTransaction(uint256)",
                approveTxSelector,
                "TEST_APPROVAL",
                approveActionsBitmap,
                true, // isProtected = true (required because function exists in contract bytecode)
                approveTxHandlers
            );
        }
        
        // Ensure permissions are granted even if schema already exists
        if (!ownerRole.functionSelectorsSet.contains(bytes32(approveTxSelector))) {
            EngineBlox.FunctionPermission memory approveTxPermission = EngineBlox.FunctionPermission({
                functionSelector: approveTxSelector,
                grantedActionsBitmap: approveActionsBitmap,
                handlerForSelectors: approveTxHandlers
            });
            EngineBlox.addFunctionToRole(state, ownerRoleHash, approveTxPermission);
        }
    }
    
    // _requestTransaction is inherited from BaseStateMachine and uses msg.sig as handlerSelector
    // This means we need to grant permission for the calling function's selector
    // For PaymentTestHelper.requestTransaction, we need to set up permissions for that selector
    
    /**
     * @notice Exposes _requestTransactionWithPayment for testing (request tx with payment attached in one step)
     * @param requester The address requesting the transaction
     * @param target The target contract address
     * @param value The value to send with the transaction
     * @param gasLimit The gas limit for the transaction
     * @param operationType The operation type
     * @param executionSelector The function selector to execute
     * @param executionParams The execution parameters
     * @param paymentDetails The payment details to attach
     * @return txId The transaction ID (use getTransaction(txId) for full record)
     */
    function requestTransactionWithPayment(
        address requester,
        address target,
        uint256 value,
        uint256 gasLimit,
        bytes32 operationType,
        bytes4 executionSelector,
        bytes memory executionParams,
        EngineBlox.PaymentDetails memory paymentDetails
    ) external returns (uint256 txId) {
        EngineBlox.TxRecord memory txRecord = _requestTransactionWithPayment(
            requester,
            target,
            value,
            gasLimit,
            operationType,
            executionSelector,
            executionParams,
            paymentDetails
        );
        return txRecord.txId;
    }
    
    /**
     * @notice Exposes _requestTransaction for testing
     * @param requester The address requesting the transaction
     * @param target The target contract address
     * @param value The value to send with the transaction
     * @param gasLimit The gas limit for the transaction
     * @param operationType The operation type
     * @param executionSelector The function selector to execute
     * @param executionParams The execution parameters
     * @return txId The transaction ID (use getTransaction(txId) for full record)
     */
    function requestTransaction(
        address requester,
        address target,
        uint256 value,
        uint256 gasLimit,
        bytes32 operationType,
        bytes4 executionSelector,
        bytes memory executionParams
    ) external returns (uint256 txId) {
        EngineBlox.TxRecord memory txRecord = _requestTransaction(
            requester,
            target,
            value,
            gasLimit,
            operationType,
            executionSelector,
            executionParams
        );
        return txRecord.txId;
    }
    
    /**
     * @notice Exposes _approveTransaction for testing
     * @param txId The transaction ID to approve
     * @return The transaction ID (use getTransaction(txId) for full record)
     */
    function approveTransaction(uint256 txId) external returns (uint256) {
        EngineBlox.TxRecord memory txRecord = _approveTransaction(txId);
        return txRecord.txId;
    }
    
    /**
     * @notice Helper function to set up test permissions
     * @dev This is a placeholder - permissions should be set up via proper role management
     * @dev For now, we rely on the owner role having default permissions
     */
    function setupTestPermissions(address wallet, bytes4 selector) external {
        // Placeholder - in a real scenario, you would set up permissions here
        // For testing, we assume owner role has necessary permissions
        // This function exists for API compatibility but doesn't need to do anything
        // if owner role is properly initialized
    }
    
    /**
     * @notice Helper function to whitelist target for testing  
     * @dev Whitelists a target using EngineBlox library
     * @param target The target address to whitelist
     * @param selector The function selector
     */
    function whitelistTargetForTesting(address target, bytes4 selector) external {
        // Only owner can whitelist for testing
        require(msg.sender == owner(), "Only owner can whitelist for testing");
        
        // Input validation
        SharedValidation.validateNotZeroAddress(target);
        require(selector != bytes4(0), "Selector cannot be zero");
        
        // Add target to whitelist using EngineBlox library function
        EngineBlox.SecureOperationState storage state = _getSecureState();
        EngineBlox.addTargetToWhitelist(state, selector, target);
    }
    
    /**
     * @notice Returns true if the given function selector is a system macro selector (for testing).
     * @param functionSelector The function selector to check.
     */
    function containsSystemMacroSelector(bytes4 functionSelector) external view returns (bool) {
        return EngineBlox.isMacroSelector(_getSecureState(), functionSelector);
    }
    
    /**
     * @dev Fallback function that accepts calls for NATIVE_TRANSFER_SELECTOR
     * @notice For testing: allows NATIVE_TRANSFER_SELECTOR transactions to succeed
     * @notice This is safe for test contracts only
     */
    fallback() external payable {
        // For NATIVE_TRANSFER_SELECTOR, we allow the call to succeed
        // The actual payment is handled by executeAttachedPayment
        // This is only for test contracts - production contracts should have proper fallback handling
    }
    
    /**
     * @dev Receive function to accept ETH for payment testing
     * @notice For testing: allows contract to receive ETH for payment tests
     */
    receive() external payable {
        // Accept ETH for payment testing
    }
    
    // getTransaction() and getTimeLockPeriodSec() are already public in BaseStateMachine
    // so they can be called directly on PaymentTestHelper instances
}
