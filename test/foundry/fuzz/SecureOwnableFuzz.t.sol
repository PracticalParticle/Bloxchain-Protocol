// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import "../CommonBase.sol";
import "../../../contracts/utils/SharedValidation.sol";

/**
 * @title SecureOwnableFuzzTest
 * @dev Fuzz tests for SecureOwnable contract
 */
contract SecureOwnableFuzzTest is CommonBase {
    function setUp() public override {
        super.setUp();
    }

    function testFuzz_OwnershipTransfer(uint256 timelockPeriod) public {
        // Filter invalid inputs
        vm.assume(timelockPeriod > 0);
        vm.assume(timelockPeriod < 365 days);

        // Create new contract with fuzzed timelock
        SecureBlox newContract = new SecureBlox();
        vm.prank(owner);
        newContract.initialize(
            owner,
            broadcaster,
            recovery,
            timelockPeriod,
            address(mockEventForwarder)
        );

        // Request ownership transfer (always transfers to recovery)
        vm.prank(recovery);
        EngineBlox.TxRecord memory requestTx = newContract.transferOwnershipRequest();
        uint256 txId = requestTx.txId;

        // Advance time past timelock
        advanceTime(timelockPeriod + 1);

        // Approve
        vm.prank(recovery);
        EngineBlox.TxRecord memory approvalTx = newContract.transferOwnershipDelayedApproval(txId);

        // Verify completion
        assertEq(uint8(approvalTx.status), uint8(EngineBlox.TxStatus.COMPLETED));
        assertEq(newContract.owner(), recovery);
    }

    function testFuzz_BroadcasterUpdate(address newBroadcaster) public {
        vm.assume(newBroadcaster != address(0));
        vm.assume(newBroadcaster != broadcaster);
        vm.assume(newBroadcaster != owner);
        vm.assume(newBroadcaster != recovery);

        vm.prank(owner);
        EngineBlox.TxRecord memory requestTx = secureBlox.updateBroadcasterRequest(newBroadcaster);
        uint256 txId = requestTx.txId;

        advanceTime(DEFAULT_TIMELOCK_PERIOD + 1);

        vm.prank(owner);
        secureBlox.updateBroadcasterDelayedApproval(txId);

        address[] memory broadcasters = secureBlox.getBroadcasters();
        assertEq(broadcasters[0], newBroadcaster);
    }

    function testFuzz_RecoveryUpdate(address newRecovery) public {
        vm.assume(newRecovery != address(0));
        vm.assume(newRecovery != recovery);
        vm.assume(newRecovery != owner);
        vm.assume(newRecovery != broadcaster);

        // Test execution params creation
        bytes memory params = secureBlox.updateRecoveryExecutionParams(newRecovery);
        address decoded = abi.decode(params, (address));
        assertEq(decoded, newRecovery);
    }

    function testFuzz_TimeLockUpdate(uint256 newPeriod) public {
        vm.assume(newPeriod > 0);
        vm.assume(newPeriod != DEFAULT_TIMELOCK_PERIOD);
        vm.assume(newPeriod < 365 days);

        bytes memory params = secureBlox.updateTimeLockExecutionParams(newPeriod);
        uint256 decoded = abi.decode(params, (uint256));
        assertEq(decoded, newPeriod);
    }

    function testFuzz_MetaTransaction(uint256 deadlineDuration, uint256 maxGasPrice) public {
        // Deadline is a duration in seconds, not absolute timestamp
        vm.assume(deadlineDuration > 0);
        vm.assume(deadlineDuration < 365 days); // Reasonable upper bound
        vm.assume(maxGasPrice > 0);
        vm.assume(maxGasPrice < type(uint256).max / 2);

        // Create meta-tx params
        address handlerContract = address(secureBlox);
        bytes4 handlerSelector = bytes4(keccak256("testHandler()"));
        EngineBlox.TxAction action = EngineBlox.TxAction.EXECUTE_META_APPROVE;

        EngineBlox.MetaTxParams memory params = secureBlox.createMetaTxParams(
            handlerContract,
            handlerSelector,
            action,
            deadlineDuration,
            maxGasPrice,
            owner
        );

        // Nonce is set to 0 in createMetaTxParams (populated in generateMetaTransaction)
        assertEq(params.nonce, 0);
        // Deadline is calculated as block.timestamp + deadlineDuration
        assertEq(params.deadline, block.timestamp + deadlineDuration);
        assertEq(params.maxGasPrice, maxGasPrice);
    }
}
