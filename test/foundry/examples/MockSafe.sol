// SPDX-License-Identifier: MPL-2.0
pragma solidity 0.8.35;

import "../../../contracts/examples/integrations/Safe/GuardianSafe/GuardianSafe.sol";

/**
 * @title MockSafe
 * @dev Minimal Safe stand-in for GuardianSafe wiring tests (SPEC-2026-0175 / SPEC-2026-0176).
 *      `execTransaction` calls the installed guard's `checkTransaction` before executing the call and
 *      `checkAfterExecution` after, like Safe's guard hook. Signatures are not verified.
 *      `setGuard` is only callable by the Safe itself (i.e. via `execTransaction`), as in Safe.
 */
contract MockSafe {
    address public guard;
    uint256 public execCount;
    /// @dev SPEC-2026-0176 test knob: call the guard's checkTransaction twice for one execTransaction.
    bool public recheckGuard;

    function setRecheckGuardForTest(bool enabled) external {
        recheckGuard = enabled;
    }

    function installGuardForTest(address newGuard) external {
        guard = newGuard;
    }

    function setGuard(address newGuard) external {
        require(msg.sender == address(this), "MockSafe: only self");
        guard = newGuard;
    }

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
    ) external payable returns (bool success) {
        if (guard != address(0)) {
            ITransactionGuard(guard).checkTransaction(
                to,
                value,
                data,
                ITransactionGuard.Operation(operation),
                safeTxGas,
                baseGas,
                gasPrice,
                gasToken,
                refundReceiver,
                signatures,
                msg.sender
            );
            if (recheckGuard) {
                ITransactionGuard(guard).checkTransaction(
                    to,
                    value,
                    data,
                    ITransactionGuard.Operation(operation),
                    safeTxGas,
                    baseGas,
                    gasPrice,
                    gasToken,
                    refundReceiver,
                    signatures,
                    msg.sender
                );
            }
        }
        address guardBefore = guard;
        (success, ) = to.call{value: value}(data);
        execCount++;
        if (guardBefore != address(0)) {
            ITransactionGuard(guardBefore).checkAfterExecution(bytes32(0), success);
        }
    }

    receive() external payable {}
}

/**
 * @dev Simple call target that records the last caller and value.
 */
contract SafeCallRecorder {
    address public lastCaller;
    uint256 public calls;

    function ping() external payable {
        lastCaller = msg.sender;
        calls++;
    }
}

/**
 * @dev SPEC-2026-0176: call target that, while the Safe is executing an approved transaction, tries to run
 *      another `execTransaction` on the same Safe (the nested-bypass shape). It records the outcome instead of
 *      reverting so the outer approved transaction still completes and the test can inspect the guard's answer.
 */
contract NestedSafeExecutor {
    MockSafe public immutable safe;
    uint256 public attempts;
    bool public nestedSucceeded;
    bytes public lastRevertData;

    constructor(MockSafe safe_) {
        safe = safe_;
    }

    /// @notice Try an unapproved Safe transaction from inside the approved one.
    function nestedExec(address to, uint256 value, bytes calldata data) external {
        _tryExec(to, value, data);
    }

    /// @notice Try to replay this very call (same to/value/data/gas fields) as a second Safe transaction.
    function nestedReplay() external {
        _tryExec(address(this), 0, abi.encodeCall(NestedSafeExecutor.nestedReplay, ()));
    }

    function _tryExec(address to, uint256 value, bytes memory data) private {
        attempts++;
        if (attempts > 1) return; // do not recurse if the guard (wrongly) admitted the nested call
        try safe.execTransaction(to, value, data, 0, 0, 0, 0, address(0), payable(address(0)), "") returns (bool ok) {
            nestedSucceeded = ok;
        } catch (bytes memory reason) {
            lastRevertData = reason;
        }
    }
}
