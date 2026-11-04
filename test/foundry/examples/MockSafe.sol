// SPDX-License-Identifier: MPL-2.0
pragma solidity 0.8.35;

import "../../../contracts/examples/integrations/Safe/GuardianSafe/GuardianSafe.sol";

/**
 * @title MockSafe
 * @dev Minimal Safe stand-in for GuardianSafe wiring tests (SPEC-2026-0175).
 *      `execTransaction` calls the installed guard's `checkTransaction` before executing the call and
 *      `checkAfterExecution` after, like Safe's guard hook. Signatures are not verified.
 *      `setGuard` is only callable by the Safe itself (i.e. via `execTransaction`), as in Safe.
 */
contract MockSafe {
    address public guard;
    uint256 public execCount;

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
