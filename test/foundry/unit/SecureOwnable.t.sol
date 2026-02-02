// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import "../CommonBase.sol";
import "../../../contracts/core/security/SecureOwnable.sol";
import "../../../contracts/core/security/interface/ISecureOwnable.sol";
import "../../../contracts/core/security/lib/definitions/SecureOwnableDefinitions.sol";
import "../../../contracts/utils/SharedValidation.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title SecureOwnableTest
 * @dev Comprehensive unit tests for SecureOwnable contract
 */
contract SecureOwnableTest is CommonBase {
    using MessageHashUtils for bytes32;
    using ECDSA for bytes32;

    // Test events
    event OwnershipTransferRequest(address indexed currentOwner, address indexed newOwner);
    event OwnershipTransferUpdated(address indexed oldOwner, address indexed newOwner);
    event BroadcasterUpdated(address indexed oldBroadcaster, address indexed newBroadcaster);
    event RecoveryAddressUpdated(address indexed oldRecovery, address indexed newRecovery);
    event TimeLockPeriodUpdated(uint256 indexed oldPeriod, uint256 indexed newPeriod);

    function setUp() public override {
        super.setUp();
    }

    // ============ INITIALIZATION TESTS ============

    function test_Initialize_WithValidParameters() public {
        SecureBlox newContract = new SecureBlox();
        vm.prank(owner);
        newContract.initialize(
            owner,
            broadcaster,
            recovery,
            DEFAULT_TIMELOCK_PERIOD,
            address(mockEventForwarder)
        );

        assertTrue(newContract.initialized());
        assertEq(newContract.owner(), owner);
        assertEq(newContract.getRecovery(), recovery);
        assertEq(newContract.getTimeLockPeriodSec(), DEFAULT_TIMELOCK_PERIOD);
    }

    function test_Initialize_Revert_ZeroOwner() public {
        SecureBlox newContract = new SecureBlox();
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(SharedValidation.InvalidAddress.selector, address(0)));
        newContract.initialize(
            address(0),
            broadcaster,
            recovery,
            DEFAULT_TIMELOCK_PERIOD,
            address(mockEventForwarder)
        );
    }

    function test_Initialize_Revert_ZeroRecovery() public {
        SecureBlox newContract = new SecureBlox();
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(SharedValidation.InvalidAddress.selector, address(0)));
        newContract.initialize(
            owner,
            broadcaster,
            address(0),
            DEFAULT_TIMELOCK_PERIOD,
            address(mockEventForwarder)
        );
    }

    function test_Initialize_Revert_ZeroTimelock() public {
        SecureBlox newContract = new SecureBlox();
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(SharedValidation.TimeLockPeriodZero.selector, 0));
        newContract.initialize(
            owner,
            broadcaster,
            recovery,
            0,
            address(mockEventForwarder)
        );
    }

    function test_Initialize_Revert_DoubleInitialization() public {
        SecureBlox newContract = new SecureBlox();
        vm.prank(owner);
        newContract.initialize(
            owner,
            broadcaster,
            recovery,
            DEFAULT_TIMELOCK_PERIOD,
            address(mockEventForwarder)
        );

        vm.prank(owner);
        vm.expectRevert(); // Can be InvalidInitialization or AlreadyInitialized
        newContract.initialize(
            owner,
            broadcaster,
            recovery,
            DEFAULT_TIMELOCK_PERIOD,
            address(mockEventForwarder)
        );
    }

    // ============ OWNERSHIP TRANSFER TESTS ============

    function test_TransferOwnershipRequest_RecoveryCanRequest() public {
        vm.prank(recovery);
        EngineBlox.TxRecord memory txRecord = secureBlox.transferOwnershipRequest();

        assertGt(txRecord.txId, 0);
        assertEq(uint8(txRecord.status), uint8(EngineBlox.TxStatus.PENDING));
        assertEq(txRecord.params.operationType, SecureOwnableDefinitions.OWNERSHIP_TRANSFER);
    }

    function test_TransferOwnershipRequest_Revert_Unauthorized() public {
        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(SharedValidation.RestrictedRecovery.selector, attacker, recovery));
        secureBlox.transferOwnershipRequest();
    }

    function test_TransferOwnershipRequest_Revert_DuplicateRequest() public {
        vm.prank(recovery);
        secureBlox.transferOwnershipRequest();

        vm.prank(recovery);
        vm.expectRevert(SharedValidation.PendingSecureRequest.selector);
        secureBlox.transferOwnershipRequest();
    }

    function test_TransferOwnershipDelayedApproval_AfterTimelock() public {
        vm.prank(recovery);
        EngineBlox.TxRecord memory requestTx = secureBlox.transferOwnershipRequest();
        uint256 txId = requestTx.txId;

        // Advance time past timelock
        advanceTime(DEFAULT_TIMELOCK_PERIOD + 1);

        vm.prank(recovery);
        EngineBlox.TxRecord memory approvalTx = secureBlox.transferOwnershipDelayedApproval(txId);

        assertEq(uint8(approvalTx.status), uint8(EngineBlox.TxStatus.COMPLETED));
        assertEq(secureBlox.owner(), recovery);
    }

    function test_TransferOwnershipDelayedApproval_Revert_BeforeTimelock() public {
        vm.prank(recovery);
        EngineBlox.TxRecord memory requestTx = secureBlox.transferOwnershipRequest();
        uint256 txId = requestTx.txId;

        // Don't advance time
        vm.prank(recovery);
        vm.expectRevert(abi.encodeWithSelector(SharedValidation.BeforeReleaseTime.selector, requestTx.releaseTime, block.timestamp));
        secureBlox.transferOwnershipDelayedApproval(txId);
    }

    function test_TransferOwnershipDelayedApproval_OwnerCanApprove() public {
        vm.prank(recovery);
        EngineBlox.TxRecord memory requestTx = secureBlox.transferOwnershipRequest();
        uint256 txId = requestTx.txId;

        advanceTime(DEFAULT_TIMELOCK_PERIOD + 1);

        vm.prank(owner);
        EngineBlox.TxRecord memory approvalTx = secureBlox.transferOwnershipDelayedApproval(txId);

        assertEq(uint8(approvalTx.status), uint8(EngineBlox.TxStatus.COMPLETED));
    }

    function test_TransferOwnershipCancellation_RecoveryCanCancel() public {
        vm.prank(recovery);
        EngineBlox.TxRecord memory requestTx = secureBlox.transferOwnershipRequest();
        uint256 txId = requestTx.txId;

        vm.prank(recovery);
        EngineBlox.TxRecord memory cancelTx = secureBlox.transferOwnershipCancellation(txId);

        assertEq(uint8(cancelTx.status), uint8(EngineBlox.TxStatus.CANCELLED));
        assertEq(secureBlox.owner(), owner); // Owner unchanged
    }

    // ============ BROADCASTER UPDATE TESTS ============

    function test_UpdateBroadcasterRequest_OwnerCanRequest() public {
        address newBroadcaster = user1;
        vm.prank(owner);
        EngineBlox.TxRecord memory txRecord = secureBlox.updateBroadcasterRequest(newBroadcaster);

        assertGt(txRecord.txId, 0);
        assertEq(uint8(txRecord.status), uint8(EngineBlox.TxStatus.PENDING));
        assertEq(txRecord.params.operationType, SecureOwnableDefinitions.BROADCASTER_UPDATE);
    }

    function test_UpdateBroadcasterRequest_Revert_Unauthorized() public {
        vm.prank(attacker);
        vm.expectRevert();
        secureBlox.updateBroadcasterRequest(user1);
    }

    function test_UpdateBroadcasterDelayedApproval_AfterTimelock() public {
        address newBroadcaster = user1;
        vm.prank(owner);
        EngineBlox.TxRecord memory requestTx = secureBlox.updateBroadcasterRequest(newBroadcaster);
        uint256 txId = requestTx.txId;

        advanceTime(DEFAULT_TIMELOCK_PERIOD + 1);

        vm.prank(owner);
        EngineBlox.TxRecord memory approvalTx = secureBlox.updateBroadcasterDelayedApproval(txId);

        assertEq(uint8(approvalTx.status), uint8(EngineBlox.TxStatus.COMPLETED));
        address[] memory broadcasters = secureBlox.getBroadcasters();
        assertEq(broadcasters[0], newBroadcaster);
    }

    function test_UpdateBroadcasterCancellation_OwnerCanCancel() public {
        address newBroadcaster = user1;
        vm.prank(owner);
        EngineBlox.TxRecord memory requestTx = secureBlox.updateBroadcasterRequest(newBroadcaster);
        uint256 txId = requestTx.txId;

        vm.prank(owner);
        EngineBlox.TxRecord memory cancelTx = secureBlox.updateBroadcasterCancellation(txId);

        assertEq(uint8(cancelTx.status), uint8(EngineBlox.TxStatus.CANCELLED));
    }

    // ============ RECOVERY UPDATE TESTS ============

    function test_UpdateRecoveryExecutionParams_ValidAddress() public {
        address newRecovery = user1;
        bytes memory params = SecureOwnableDefinitions.updateRecoveryExecutionParams(newRecovery);
        address decoded = abi.decode(params, (address));
        assertEq(decoded, newRecovery);
    }

    function test_UpdateRecoveryExecutionParams_ZeroAddress_Encodes() public {
        // Library is pure: encodes without validation. Contract validates on executeRecoveryUpdate.
        bytes memory params = SecureOwnableDefinitions.updateRecoveryExecutionParams(address(0));
        address decoded = abi.decode(params, (address));
        assertEq(decoded, address(0));
    }

    function test_UpdateRecoveryExecutionParams_SameAddress_Encodes() public {
        // Library is pure: encodes without validation. Contract validates on executeRecoveryUpdate.
        bytes memory params = SecureOwnableDefinitions.updateRecoveryExecutionParams(recovery);
        address decoded = abi.decode(params, (address));
        assertEq(decoded, recovery);
    }

    // ============ TIMELOCK UPDATE TESTS ============

    function test_UpdateTimeLockExecutionParams_ValidPeriod() public {
        uint256 newPeriod = 7200;
        bytes memory params = SecureOwnableDefinitions.updateTimeLockExecutionParams(newPeriod);
        uint256 decoded = abi.decode(params, (uint256));
        assertEq(decoded, newPeriod);
    }

    function test_UpdateTimeLockExecutionParams_ZeroPeriod_Encodes() public {
        // Library is pure: encodes without validation. Contract validates on executeTimeLockUpdate.
        bytes memory params = SecureOwnableDefinitions.updateTimeLockExecutionParams(0);
        uint256 decoded = abi.decode(params, (uint256));
        assertEq(decoded, 0);
    }

    function test_UpdateTimeLockExecutionParams_SamePeriod_Encodes() public {
        // Library is pure: encodes without validation. Contract validates on executeTimeLockUpdate.
        bytes memory params = SecureOwnableDefinitions.updateTimeLockExecutionParams(DEFAULT_TIMELOCK_PERIOD);
        uint256 decoded = abi.decode(params, (uint256));
        assertEq(decoded, DEFAULT_TIMELOCK_PERIOD);
    }

    // ============ EXECUTION FUNCTIONS TESTS ============

    function test_ExecuteTransferOwnership_InternalCall() public {
        address newOwner = user1;
        
        // Create a transaction that will call executeTransferOwnership
        vm.prank(recovery);
        EngineBlox.TxRecord memory requestTx = secureBlox.transferOwnershipRequest();
        uint256 txId = requestTx.txId;

        advanceTime(DEFAULT_TIMELOCK_PERIOD + 1);

        // The approval will internally call executeTransferOwnership
        vm.prank(recovery);
        secureBlox.transferOwnershipDelayedApproval(txId);

        assertEq(secureBlox.owner(), recovery);
    }

    function test_ExecuteTransferOwnership_Revert_ExternalCall() public {
        vm.expectRevert(abi.encodeWithSelector(SharedValidation.OnlyCallableByContract.selector, attacker, address(secureBlox)));
        vm.prank(attacker);
        secureBlox.executeTransferOwnership(user1);
    }

    // ============ INTERFACE SUPPORT TESTS ============

    function test_SupportsInterface_ISecureOwnable() public {
        bytes4 interfaceId = type(ISecureOwnable).interfaceId;
        assertTrue(secureBlox.supportsInterface(interfaceId));
    }

    function test_SupportsInterface_ERC165() public {
        assertTrue(secureBlox.supportsInterface(0x01ffc9a7));
    }

    function test_SupportsInterface_InvalidInterface() public {
        assertFalse(secureBlox.supportsInterface(0x12345678));
    }

    // ============ META-TRANSACTION TESTS ============

    function test_TransferOwnershipApprovalWithMetaTx_Valid() public {
        uint256 privateKey = 0x3; // Recovery private key
        address newOwner = user1;

        // Step 1: Create ownership transfer request
        vm.prank(recovery);
        EngineBlox.TxRecord memory requestTx = secureBlox.transferOwnershipRequest();
        uint256 txId = requestTx.txId;

        // Step 2: Create meta-transaction parameters
        address handlerContract = address(secureBlox);
        bytes4 handlerSelector = bytes4(keccak256("transferOwnershipDelayedApproval(uint256)"));
        EngineBlox.TxAction action = EngineBlox.TxAction.EXECUTE_META_APPROVE;
        uint256 deadlineDuration = 3600; // Duration in seconds
        uint256 maxGasPrice = 100 gwei;

        EngineBlox.MetaTxParams memory metaTxParams = secureBlox.createMetaTxParams(
            handlerContract,
            handlerSelector,
            action,
            deadlineDuration,
            maxGasPrice,
            recovery
        );

        // Step 3: Generate unsigned meta-transaction
        vm.prank(recovery);
        EngineBlox.MetaTransaction memory unsignedMetaTx = secureBlox.generateUnsignedMetaTransactionForExisting(
            txId,
            metaTxParams
        );

        // Step 4: Sign the meta-transaction
        bytes memory signature = metaTxSigner.signMetaTransaction(
            unsignedMetaTx,
            privateKey,
            address(secureBlox)
        );

        // Step 5: Verify signature structure
        assertEq(signature.length, 65);
        assertNotEq(unsignedMetaTx.message, bytes32(0));

        // Step 6: Verify message hash consistency
        bytes32 expectedHash = metaTxSigner.generateMessageHash(
            unsignedMetaTx,
            address(secureBlox)
        );
        assertEq(unsignedMetaTx.message, expectedHash);

        // Note: Full execution would require proper permissions setup
        // This test verifies the meta-transaction structure and signing
    }

    // ============ EDGE CASE TESTS ============

    function test_MultiplePendingRequests_OnlyOneOwnership() public {
        vm.prank(recovery);
        secureBlox.transferOwnershipRequest();

        // Try to create another ownership request
        vm.prank(recovery);
        vm.expectRevert(SharedValidation.PendingSecureRequest.selector);
        secureBlox.transferOwnershipRequest();
    }

    function test_OwnershipTransfer_CompleteWorkflow() public {
        address newOwner = user1;

        // Step 1: Request
        vm.prank(recovery);
        EngineBlox.TxRecord memory requestTx = secureBlox.transferOwnershipRequest();
        uint256 txId = requestTx.txId;

        // Verify pending
        vm.prank(owner);
        EngineBlox.TxRecord memory pendingTx = secureBlox.getTransaction(txId);
        assertEq(uint8(pendingTx.status), uint8(EngineBlox.TxStatus.PENDING));

        // Step 2: Advance time
        advanceTime(DEFAULT_TIMELOCK_PERIOD + 1);

        // Step 3: Approve
        vm.prank(recovery);
        EngineBlox.TxRecord memory approvalTx = secureBlox.transferOwnershipDelayedApproval(txId);

        // Step 4: Verify completion
        assertEq(uint8(approvalTx.status), uint8(EngineBlox.TxStatus.COMPLETED));
        assertEq(secureBlox.owner(), recovery);
    }
}
