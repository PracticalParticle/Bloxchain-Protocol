// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import "../../../contracts/core/pattern/Account.sol";
import "../../../contracts/core/base/BaseStateMachine.sol";
import "../../../contracts/experimental/hook/HookManager.sol";
import "../../../contracts/core/lib/utils/SharedValidation.sol";

/**
 * @title HookTestBlox
 * @dev Test-only contract: Account + HookManager for hook fuzz tests.
 *      Replaces MachineBlox in tests so templates can stay minimal (AccountBlox only).
 */
contract HookTestBlox is Account, HookManager {
    function initialize(
        address initialOwner,
        address broadcaster,
        address recovery,
        uint256 timeLockPeriodSec,
        address eventForwarder
    ) public virtual override(Account) initializer {
        Account.initialize(initialOwner, broadcaster, recovery, timeLockPeriodSec, eventForwarder);
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(Account, BaseStateMachine) returns (bool) {
        return Account.supportsInterface(interfaceId) || BaseStateMachine.supportsInterface(interfaceId);
    }

    function _postActionHook(
        EngineBlox.TxRecord memory txRecord
    ) internal virtual override(BaseStateMachine, HookManager) {
        HookManager._postActionHook(txRecord);
    }

    function deposit() external payable {
        emit EthReceived(msg.sender, msg.value);
    }

    receive() external payable override {
        revert SharedValidation.NotSupported();
    }

    fallback() external payable override {
        revert SharedValidation.NotSupported();
    }
}
