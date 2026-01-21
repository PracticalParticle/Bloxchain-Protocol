// SPDX-License-Identifier: MPL-2.0
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

import "../base/BaseStateMachine.sol";
import "../../utils/SharedValidation.sol";
import "../../interfaces/IOnActionHook.sol";

/**
 * @title HookManager
 * @dev Simple hook manager component for BaseStateMachine workflows
 *
 * This component allows attaching external hook contracts per function selector.
 * It uses StateAbstraction's functionTargetHooks for storage, keeping the contract minimal:
 *
 * - Multiple hooks per function selector (via StateAbstraction.functionTargetHooks)
 * - OWNER role can set/clear hooks
 * - Hooks are executed AFTER the core state machine operation completes
 * - Hooks are best-effort: if no hook is configured, nothing happens
 *
 * Supported hook points (via IOnActionHook):
 * - onRequest            : after _requestTransaction
 * - onApprove            : after _approveTransaction
 * - onCancel             : after _cancelTransaction
 * - onMetaApprove        : after _approveTransactionWithMetaTx
 * - onMetaCancel         : after _cancelTransactionWithMetaTx
 * - onRequestAndApprove  : after _requestAndApproveTransaction
 *
 * Security model:
 * - Core state transitions and permissions are enforced by StateAbstraction
 * - Overrides call super first (Checks/Effects) then invoke external hooks (Interactions)
 * - Approve/meta-approve overrides remain protected by ReentrancyGuard via BaseStateMachine
 */
abstract contract HookManager is BaseStateMachine {
    using SharedValidation for *;
    using EnumerableSet for EnumerableSet.AddressSet;

    event HookSet(
        bytes4 indexed functionSelector,
        address indexed hook
    );

    event HookCleared(
        bytes4 indexed functionSelector,
        address indexed hook
    );

    // ============ HOOK MANAGEMENT ============

    /**
     * @dev Sets the hook contract for a function selector
     * @param functionSelector The function selector
     * @param hook The hook contract address
     *
     * @notice Only wallets with OWNER_ROLE may manage hooks
     * @notice Zero address is not allowed here; use clearHook to remove
     */
    function setHook(bytes4 functionSelector, address hook) external {
        SharedValidation.validateOwner(owner());
        SharedValidation.validateNotZeroAddress(hook);

        StateAbstraction.addTargetToFunctionHooks(_getSecureState(), functionSelector, hook);
        emit HookSet(functionSelector, hook);
    }

    /**
     * @dev Clears the hook contract for a function selector
     * @param functionSelector The function selector
     * @param hook The hook contract address to remove
     *
     * @notice Only wallets with OWNER_ROLE may manage hooks
     */
    function clearHook(bytes4 functionSelector, address hook) external {
        SharedValidation.validateOwner(owner());
        SharedValidation.validateNotZeroAddress(hook);

        StateAbstraction.removeTargetFromFunctionHooks(_getSecureState(), functionSelector, hook);
        emit HookCleared(functionSelector, hook);
    }

    /**
     * @dev Returns all configured hooks for a function selector
     * @param functionSelector The function selector
     * @return hooks Array of hook contract addresses
     */
    function getHook(
        bytes4 functionSelector
    ) external view returns (address[] memory hooks) {
        return StateAbstraction.getFunctionHookTargets(_getSecureState(), functionSelector);
    }

    // ============ INTERNAL HELPERS ============

    /**
     * @dev Executes all hooks for a function selector with onRequest callback
     */
    function _executeOnRequestHooks(
        bytes4 functionSelector,
        StateAbstraction.TxRecord memory txRecord,
        address caller
    ) internal {
        StateAbstraction.SecureOperationState storage state = _getSecureState();
        EnumerableSet.AddressSet storage hooks = state.functionTargetHooks[functionSelector];
        uint256 length = hooks.length();
        
        for (uint256 i = 0; i < length; i++) {
            address hook = hooks.at(i);
            IOnActionHook(hook).onRequest(txRecord, caller);
        }
    }

    /**
     * @dev Executes all hooks for a function selector with onApprove callback
     */
    function _executeOnApproveHooks(
        bytes4 functionSelector,
        StateAbstraction.TxRecord memory txRecord,
        address caller
    ) internal {
        StateAbstraction.SecureOperationState storage state = _getSecureState();
        EnumerableSet.AddressSet storage hooks = state.functionTargetHooks[functionSelector];
        uint256 length = hooks.length();
        
        for (uint256 i = 0; i < length; i++) {
            address hook = hooks.at(i);
            IOnActionHook(hook).onApprove(txRecord, caller);
        }
    }

    /**
     * @dev Executes all hooks for a function selector with onCancel callback
     */
    function _executeOnCancelHooks(
        bytes4 functionSelector,
        StateAbstraction.TxRecord memory txRecord,
        address caller
    ) internal {
        StateAbstraction.SecureOperationState storage state = _getSecureState();
        EnumerableSet.AddressSet storage hooks = state.functionTargetHooks[functionSelector];
        uint256 length = hooks.length();
        
        for (uint256 i = 0; i < length; i++) {
            address hook = hooks.at(i);
            IOnActionHook(hook).onCancel(txRecord, caller);
        }
    }

    /**
     * @dev Executes all hooks for a function selector with onMetaApprove callback
     */
    function _executeOnMetaApproveHooks(
        bytes4 functionSelector,
        StateAbstraction.TxRecord memory txRecord,
        StateAbstraction.MetaTransaction memory metaTx,
        address caller
    ) internal {
        StateAbstraction.SecureOperationState storage state = _getSecureState();
        EnumerableSet.AddressSet storage hooks = state.functionTargetHooks[functionSelector];
        uint256 length = hooks.length();
        
        for (uint256 i = 0; i < length; i++) {
            address hook = hooks.at(i);
            IOnActionHook(hook).onMetaApprove(txRecord, metaTx, caller);
        }
    }

    /**
     * @dev Executes all hooks for a function selector with onMetaCancel callback
     */
    function _executeOnMetaCancelHooks(
        bytes4 functionSelector,
        StateAbstraction.TxRecord memory txRecord,
        StateAbstraction.MetaTransaction memory metaTx,
        address caller
    ) internal {
        StateAbstraction.SecureOperationState storage state = _getSecureState();
        EnumerableSet.AddressSet storage hooks = state.functionTargetHooks[functionSelector];
        uint256 length = hooks.length();
        
        for (uint256 i = 0; i < length; i++) {
            address hook = hooks.at(i);
            IOnActionHook(hook).onMetaCancel(txRecord, metaTx, caller);
        }
    }

    /**
     * @dev Executes all hooks for a function selector with onRequestAndApprove callback
     */
    function _executeOnRequestAndApproveHooks(
        bytes4 functionSelector,
        StateAbstraction.TxRecord memory txRecord,
        StateAbstraction.MetaTransaction memory metaTx,
        address caller
    ) internal {
        StateAbstraction.SecureOperationState storage state = _getSecureState();
        EnumerableSet.AddressSet storage hooks = state.functionTargetHooks[functionSelector];
        uint256 length = hooks.length();
        
        for (uint256 i = 0; i < length; i++) {
            address hook = hooks.at(i);
            IOnActionHook(hook).onRequestAndApprove(txRecord, metaTx, caller);
        }
    }

    // ============ OVERRIDES WITH HOOK EXECUTION ============

    /**
     * @dev Override to add onRequest hook execution
     */
    function _requestTransaction(
        address requester,
        address target,
        uint256 value,
        uint256 gasLimit,
        bytes32 operationType,
        bytes4 functionSelector,
        bytes memory params
    ) internal virtual override returns (StateAbstraction.TxRecord memory) {
        // Core behavior first (Checks/Effects)
        StateAbstraction.TxRecord memory txRecord = super._requestTransaction(
            requester,
            target,
            value,
            gasLimit,
            operationType,
            functionSelector,
            params
        );

        // Hook execution (Interactions)
        _executeOnRequestHooks(functionSelector, txRecord, msg.sender);

        return txRecord;
    }

    /**
     * @dev Override to add onApprove hook execution
     */
    function _approveTransaction(
        uint256 txId
    ) internal virtual override nonReentrant returns (StateAbstraction.TxRecord memory) {
        // Core behavior first (includes state machine reentrancy guard)
        StateAbstraction.TxRecord memory txRecord = super._approveTransaction(txId);

        // Hook execution for the execution selector tied to this tx
        bytes4 executionSelector = txRecord.params.executionSelector;
        _executeOnApproveHooks(executionSelector, txRecord, msg.sender);

        return txRecord;
    }

    /**
     * @dev Override to add onMetaApprove hook execution
     */
    function _approveTransactionWithMetaTx(
        StateAbstraction.MetaTransaction memory metaTx
    ) internal virtual override nonReentrant returns (StateAbstraction.TxRecord memory) {
        // Core behavior first
        StateAbstraction.TxRecord memory txRecord = super._approveTransactionWithMetaTx(metaTx);

        // Hook execution based on signer role and execution selector
        bytes4 executionSelector = txRecord.params.executionSelector;
        _executeOnMetaApproveHooks(executionSelector, txRecord, metaTx, msg.sender);

        return txRecord;
    }

    /**
     * @dev Override to add onCancel hook execution
     */
    function _cancelTransaction(
        uint256 txId
    ) internal virtual override returns (StateAbstraction.TxRecord memory) {
        // Core behavior first
        StateAbstraction.TxRecord memory txRecord = super._cancelTransaction(txId);

        // Hook execution
        bytes4 executionSelector = txRecord.params.executionSelector;
        _executeOnCancelHooks(executionSelector, txRecord, msg.sender);

        return txRecord;
    }

    /**
     * @dev Override to add onMetaCancel hook execution
     */
    function _cancelTransactionWithMetaTx(
        StateAbstraction.MetaTransaction memory metaTx
    ) internal virtual override returns (StateAbstraction.TxRecord memory) {
        // Core behavior first
        StateAbstraction.TxRecord memory txRecord = super._cancelTransactionWithMetaTx(metaTx);

        // Hook execution based on signer role and execution selector
        bytes4 executionSelector = txRecord.params.executionSelector;
        _executeOnMetaCancelHooks(executionSelector, txRecord, metaTx, msg.sender);

        return txRecord;
    }

    /**
     * @dev Override to add onRequestAndApprove hook execution
     */
    function _requestAndApproveTransaction(
        StateAbstraction.MetaTransaction memory metaTx
    ) internal virtual override nonReentrant returns (StateAbstraction.TxRecord memory) {
        // Core behavior first
        StateAbstraction.TxRecord memory txRecord = super._requestAndApproveTransaction(metaTx);

        // Hook execution based on signer role and execution selector
        bytes4 executionSelector = txRecord.params.executionSelector;
        _executeOnRequestAndApproveHooks(executionSelector, txRecord, metaTx, msg.sender);

        return txRecord;
    }
}
