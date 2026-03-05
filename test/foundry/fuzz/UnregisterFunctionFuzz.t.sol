// SPDX-License-Identifier: MPL-2.0
pragma solidity 0.8.34;

import "../CommonBase.sol";
import "../../../contracts/core/lib/EngineBlox.sol";
import "../../../contracts/core/lib/utils/SharedValidation.sol";

// Minimal harness embedding a SecureOperationState and exposing the relevant flows
contract EngineBloxUnregisterHarness {
    using EngineBlox for EngineBlox.SecureOperationState;

    EngineBlox.SecureOperationState internal state;
    bytes4 public selector;
    bytes32 public constant TEST_OPERATION = keccak256("TEST_OPERATION");

    constructor(address _owner, address _broadcaster, address _recovery, uint256 _timeLockPeriodSec) {
        EngineBlox.initialize(state, _owner, _broadcaster, _recovery, _timeLockPeriodSec);
    }

    /**
     * @dev Registers an unprotected function schema and grants EXECUTE_TIME_DELAY_REQUEST
     *      permission on it to OWNER_ROLE for the given selector.
     */
    function setupFunctionAndPermission(bytes4 functionSelector, string memory functionSignature) external {
        require(selector == bytes4(0), "Already initialized");
        require(functionSelector != bytes4(0), "Invalid selector");
        // Ensure the provided signature and selector are consistent to avoid misleading test setups
        bytes4 derivedSelector = bytes4(keccak256(bytes(functionSignature)));
        require(derivedSelector == functionSelector, "Selector/signature mismatch");
        selector = functionSelector;

        EngineBlox.TxAction[] memory actions = new EngineBlox.TxAction[](1);
        actions[0] = EngineBlox.TxAction.EXECUTE_TIME_DELAY_REQUEST;
        uint16 bitmap = EngineBlox.createBitmapFromActions(actions);

        bytes4[] memory handlers = new bytes4[](1);
        handlers[0] = functionSelector;

        EngineBlox.registerFunction(
            state,
            functionSignature,
            functionSelector,
            "TEST_OPERATION",
            bitmap,
            true, // enforceHandlerRelations
            false,
            handlers
        );

        EngineBlox.FunctionPermission memory permission = EngineBlox.FunctionPermission({
            functionSelector: functionSelector,
            grantedActionsBitmap: bitmap,
            handlerForSelectors: handlers
        });

        EngineBlox.addFunctionToRole(state, EngineBlox.OWNER_ROLE, permission);
    }

    function unsafeUnregister() external {
        require(selector != bytes4(0), "Selector not set");
        EngineBlox.unregisterFunction(state, selector, false);
    }

    function requestAsCaller(address requester, address target) external {
        require(selector != bytes4(0), "Selector not set");
        EngineBlox.txRequest(
            state,
            requester,
            target,
            0,
            0,
            TEST_OPERATION,
            selector,
            selector,
            ""
        );
    }
}

/**
 * @title UnregisterFunctionFuzzTest
 * @dev Fuzz tests for unsafe function schema unregistration and subsequent execution attempts.
 */
contract UnregisterFunctionFuzzTest is CommonBase {
    using EngineBlox for EngineBlox.SecureOperationState;

    function test_UnsafeUnregisterPreventsNewRequests() public {
        EngineBloxUnregisterHarness harness = new EngineBloxUnregisterHarness(
            owner,
            broadcaster,
            recovery,
            DEFAULT_TIMELOCK_PERIOD
        );

        string memory functionSignature = "testFuzzUnsafeUnregister()";
        bytes4 derivedSelector = bytes4(keccak256(bytes(functionSignature)));

        vm.prank(owner);
        harness.setupFunctionAndPermission(derivedSelector, functionSignature);

        vm.prank(owner);
        harness.requestAsCaller(owner, address(harness));

        vm.prank(owner);
        harness.unsafeUnregister();

        vm.prank(owner);
        vm.expectRevert(
            abi.encodeWithSelector(
                SharedValidation.ResourceNotFound.selector,
                bytes32(derivedSelector)
            )
        );
        harness.requestAsCaller(owner, address(harness));
    }
}

