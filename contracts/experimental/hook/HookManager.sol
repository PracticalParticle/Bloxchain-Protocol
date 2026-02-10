// SPDX-License-Identifier: MPL-2.0
pragma solidity 0.8.33;

import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

import "../../core/base/BaseStateMachine.sol";
import "../../core/lib/utils/SharedValidation.sol";
import "../../experimental/hook/interface/IOnActionHook.sol";

/**
 * @title HookManager
 * @dev Simple hook manager component for BaseStateMachine workflows
 *
 * This component allows attaching external hook contracts per function selector.
 * It uses EngineBlox's functionTargetHooks for storage, keeping the contract minimal:
 *
 * - Multiple hooks per function selector (via EngineBlox.functionTargetHooks)
 * - OWNER role can set/clear hooks
 * - Hooks are executed AFTER the core state machine operation completes
 * - If no hook is configured for a selector, nothing runs for that selector
 * - Hooks are mandatory for the transaction: if any registered hook reverts (e.g. bug, OOG, or
 *   malicious behavior), the entire parent transaction (request/approve/cancel) will revert.
 *   Only register trusted, non-reverting hook contracts.
 *
 * Hook integration:
 * - BaseStateMachine provides a single _postActionHook entry point that is called
 *   after any transaction operation that produces a TxRecord
 * - HookManager overrides _postActionHook and forwards TxRecord to all configured
 *   IOnActionHook implementations for the transaction's execution selector
 *
 * Security model:
 * - Core state transitions and permissions are enforced by EngineBlox
 * - Overrides call super first (Checks/Effects) then invoke external hooks (Interactions)
 * - Approve/meta-approve overrides remain protected by ReentrancyGuard via BaseStateMachine
 */
abstract contract HookManager is BaseStateMachine {
    using SharedValidation for *;
    using EnumerableSet for EnumerableSet.AddressSet;

    // ============ HOOK MANAGEMENT (EXTERNAL WITH OWNER CHECK) ============

    /**
     * @dev Sets the hook contract for a function selector
     * @param functionSelector The function selector
     * @param hook The hook contract address
     * @notice Only the owner may manage hooks; zero address not allowed (use clearHook to remove)
     */
    function setHook(bytes4 functionSelector, address hook) external {
        SharedValidation.validateOwner(owner());
        _setHook(functionSelector, hook);
    }

    /**
     * @dev Clears the hook contract for a function selector
     * @param functionSelector The function selector
     * @param hook The hook contract address to remove
     * @notice Only the owner may manage hooks
     */
    function clearHook(bytes4 functionSelector, address hook) external {
        SharedValidation.validateOwner(owner());
        _clearHook(functionSelector, hook);
    }

    // ============ INTERNAL HELPERS ============

    /**
     * @dev Executes all hooks for the transaction's execution selector using the unified
     *      onAction callback. If any hook reverts, the entire parent transaction reverts;
     *      only register trusted, non-reverting hook contracts.
     * @param txRecord The transaction record produced by the operation
     */
    function _executeActionHooks(
        EngineBlox.TxRecord memory txRecord
    ) internal {
        EngineBlox.SecureOperationState storage state = _getSecureState();
        bytes4 executionSelector = txRecord.params.executionSelector;
        EnumerableSet.AddressSet storage hooks = state.functionTargetHooks[executionSelector];
        uint256 length = hooks.length();
        
        for (uint256 i = 0; i < length; i++) {
            address hook = hooks.at(i);
            IOnActionHook(hook).onAction(txRecord);
        }
    }

    // ============ CENTRALIZED POST-ACTION HOOK ============

    /**
     * @dev Centralized post-action hook implementation.
     *      Called by BaseStateMachine after any transaction operation that produces a TxRecord.
     *      Forwards the TxRecord to all configured IOnActionHook implementations for the
     *      transaction's execution selector.
     */
    function _postActionHook(
        EngineBlox.TxRecord memory txRecord
    ) internal virtual override {
        // Allow further extension in deeper hierarchies
        super._postActionHook(txRecord);

        // Execute configured hooks (Interactions)
        _executeActionHooks(txRecord);
    }
}
