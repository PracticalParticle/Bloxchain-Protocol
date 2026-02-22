// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import "../CommonBase.sol";
import "../../../contracts/examples/templates/AccountBlox.sol";
import "../../../contracts/core/security/SecureOwnable.sol";
import "../../../contracts/core/security/interface/ISecureOwnable.sol";
import "../../../contracts/core/security/lib/definitions/SecureOwnableDefinitions.sol";
import "../../../contracts/core/lib/utils/SharedValidation.sol";
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
        AccountBlox newContract = new AccountBlox();
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
        AccountBlox newContract = new AccountBlox();
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
        AccountBlox newContract = new AccountBlox();
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
        AccountBlox newContract = new AccountBlox();
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
        AccountBlox newContract = new AccountBlox();
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
        uint256 txId = accountBlox.transferOwnershipRequest();
        vm.prank(recovery);
        EngineBlox.TxRecord memory txRecord = accountBlox.getTransaction(txId);

        assertGt(txRecord.txId, 0);
        assertEq(uint8(txRecord.status), uint8(EngineBlox.TxStatus.PENDING));
        assertEq(txRecord.params.operationType, SecureOwnableDefinitions.OWNERSHIP_TRANSFER);
    }

    function test_TransferOwnershipRequest_Revert_Unauthorized() public {
        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(SharedValidation.RestrictedRecovery.selector, attacker, recovery));
        accountBlox.transferOwnershipRequest();
    }

    function test_TransferOwnershipRequest_Revert_DuplicateRequest() public {
        vm.prank(recovery);
        accountBlox.transferOwnershipRequest();

        vm.prank(recovery);
        vm.expectRevert(SharedValidation.PendingSecureRequest.selector);
        accountBlox.transferOwnershipRequest();
    }

    function test_TransferOwnershipDelayedApproval_AfterTimelock() public {
        vm.prank(recovery);
        uint256 requestTxId = accountBlox.transferOwnershipRequest();
        vm.prank(recovery);
        EngineBlox.TxRecord memory requestTx = accountBlox.getTransaction(requestTxId);
        uint256 txId = requestTx.txId;

        // Advance time past timelock
        advanceTime(DEFAULT_TIMELOCK_PERIOD + 1);

        vm.prank(recovery);
        accountBlox.transferOwnershipDelayedApproval(txId);
        vm.prank(recovery);
        EngineBlox.TxRecord memory approvalTx = accountBlox.getTransaction(txId);

        assertEq(uint8(approvalTx.status), uint8(EngineBlox.TxStatus.COMPLETED));
        assertEq(accountBlox.owner(), recovery);
    }

    function test_TransferOwnershipDelayedApproval_Revert_BeforeTimelock() public {
        vm.prank(recovery);
        uint256 requestTxId = accountBlox.transferOwnershipRequest();
        vm.prank(recovery);
        EngineBlox.TxRecord memory requestTx = accountBlox.getTransaction(requestTxId);
        uint256 txId = requestTx.txId;

        // Don't advance time
        vm.prank(recovery);
        vm.expectRevert(abi.encodeWithSelector(SharedValidation.BeforeReleaseTime.selector, requestTx.releaseTime, block.timestamp));
        accountBlox.transferOwnershipDelayedApproval(txId);
    }

    function test_TransferOwnershipDelayedApproval_OwnerCanApprove() public {
        vm.prank(recovery);
        uint256 requestTxId = accountBlox.transferOwnershipRequest();
        vm.prank(recovery);
        EngineBlox.TxRecord memory requestTx = accountBlox.getTransaction(requestTxId);
        uint256 txId = requestTx.txId;

        advanceTime(DEFAULT_TIMELOCK_PERIOD + 1);

        vm.prank(owner);
        accountBlox.transferOwnershipDelayedApproval(txId);
        // After approval, recovery is the new owner; use recovery to query
        vm.prank(recovery);
        EngineBlox.TxRecord memory approvalTx = accountBlox.getTransaction(txId);

        assertEq(uint8(approvalTx.status), uint8(EngineBlox.TxStatus.COMPLETED));
    }

    function test_TransferOwnershipCancellation_RecoveryCanCancel() public {
        vm.prank(recovery);
        uint256 requestTxId = accountBlox.transferOwnershipRequest();
        vm.prank(recovery);
        EngineBlox.TxRecord memory requestTx = accountBlox.getTransaction(requestTxId);
        uint256 txId = requestTx.txId;

        vm.prank(recovery);
        accountBlox.transferOwnershipCancellation(txId);
        vm.prank(recovery);
        EngineBlox.TxRecord memory cancelTx = accountBlox.getTransaction(txId);

        assertEq(uint8(cancelTx.status), uint8(EngineBlox.TxStatus.CANCELLED));
        assertEq(accountBlox.owner(), owner); // Owner unchanged
    }

    // ============ BROADCASTER UPDATE TESTS ============

    function test_UpdateBroadcasterRequest_OwnerCanRequest() public {
        address newBroadcaster = user1;
        vm.prank(owner);
        uint256 txId = accountBlox.updateBroadcasterRequest(newBroadcaster, 0);
        vm.prank(owner);
        EngineBlox.TxRecord memory txRecord = accountBlox.getTransaction(txId);

        assertGt(txRecord.txId, 0);
        assertEq(uint8(txRecord.status), uint8(EngineBlox.TxStatus.PENDING));
        assertEq(txRecord.params.operationType, SecureOwnableDefinitions.BROADCASTER_UPDATE);
    }

    function test_UpdateBroadcasterRequest_Revert_Unauthorized() public {
        vm.prank(attacker);
        vm.expectRevert();
        accountBlox.updateBroadcasterRequest(user1, 0);
    }

    function test_UpdateBroadcasterDelayedApproval_AfterTimelock() public {
        address newBroadcaster = user1;
        vm.prank(owner);
        uint256 requestTxId = accountBlox.updateBroadcasterRequest(newBroadcaster, 0);
        vm.prank(owner);
        EngineBlox.TxRecord memory requestTx = accountBlox.getTransaction(requestTxId);
        uint256 txId = requestTx.txId;

        advanceTime(DEFAULT_TIMELOCK_PERIOD + 1);

        vm.prank(owner);
        accountBlox.updateBroadcasterDelayedApproval(txId);
        vm.prank(owner);
        EngineBlox.TxRecord memory approvalTx = accountBlox.getTransaction(txId);

        assertEq(uint8(approvalTx.status), uint8(EngineBlox.TxStatus.COMPLETED));
        address[] memory broadcasters = accountBlox.getBroadcasters();
        assertEq(broadcasters[0], newBroadcaster);
    }

    function test_UpdateBroadcasterCancellation_OwnerCanCancel() public {
        address newBroadcaster = user1;
        vm.prank(owner);
        uint256 requestTxId = accountBlox.updateBroadcasterRequest(newBroadcaster, 0);
        vm.prank(owner);
        EngineBlox.TxRecord memory requestTx = accountBlox.getTransaction(requestTxId);
        uint256 txId = requestTx.txId;

        vm.prank(owner);
        accountBlox.updateBroadcasterCancellation(txId);
        vm.prank(owner);
        EngineBlox.TxRecord memory cancelTx = accountBlox.getTransaction(txId);

        assertEq(uint8(cancelTx.status), uint8(EngineBlox.TxStatus.CANCELLED));
    }

    function test_UpdateBroadcasterRequest_RevokeAtLocation_ZeroAddress() public {
        // Add a second broadcaster at location 1 first (BROADCASTER_ROLE is protected: cannot revoke the last wallet)
        vm.prank(owner);
        uint256 addTxId = accountBlox.updateBroadcasterRequest(user2, 1);
        vm.prank(owner);
        EngineBlox.TxRecord memory addTx = accountBlox.getTransaction(addTxId);
        advanceTime(DEFAULT_TIMELOCK_PERIOD + 1);
        vm.prank(owner);
        accountBlox.updateBroadcasterDelayedApproval(addTxId);
        address[] memory before = accountBlox.getBroadcasters();
        assertEq(before.length, 2);
        assertEq(before[1], user2);

        // Request revoke at location 1 (zero address = revoke)
        vm.prank(owner);
        uint256 requestTxId = accountBlox.updateBroadcasterRequest(address(0), 1);
        vm.prank(owner);
        EngineBlox.TxRecord memory requestTx = accountBlox.getTransaction(requestTxId);
        uint256 txId = requestTx.txId;

        advanceTime(DEFAULT_TIMELOCK_PERIOD + 1);

        vm.prank(owner);
        accountBlox.updateBroadcasterDelayedApproval(txId);
        vm.prank(owner);
        EngineBlox.TxRecord memory approvalTx = accountBlox.getTransaction(txId);

        assertEq(uint8(approvalTx.status), uint8(EngineBlox.TxStatus.COMPLETED));
        address[] memory broadcasters = accountBlox.getBroadcasters();
        assertEq(broadcasters.length, 1);
        assertEq(broadcasters[0], broadcaster);
    }

    /**
     * @dev Fuzz test for revoke-at-location path: seeds broadcaster list to >= 2,
     * clamps location, submits revoke with address(0), approves, then asserts
     * length decreased by one, removal-at-index behavior, no duplicates.
     * References: accountBlox.updateBroadcasterRequest, updateBroadcasterDelayedApproval,
     * getBroadcasters, test_UpdateBroadcasterRequest_RevokeAtLocation_ZeroAddress.
     */
    function testFuzz_UpdateBroadcasterRequest_RevokeAtLocation(uint256 location) public {
        // Seed broadcaster list to at least two entries (same as test_UpdateBroadcasterRequest_RevokeAtLocation_ZeroAddress)
        vm.prank(owner);
        uint256 addTxId = accountBlox.updateBroadcasterRequest(user2, 1);
        vm.prank(owner);
        EngineBlox.TxRecord memory addTx = accountBlox.getTransaction(addTxId);
        advanceTime(DEFAULT_TIMELOCK_PERIOD + 1);
        vm.prank(owner);
        accountBlox.updateBroadcasterDelayedApproval(addTxId);
        address[] memory before = accountBlox.getBroadcasters();
        assertEq(before.length, 2);
        assertEq(before[1], user2);

        // Clamp location to valid index [0, broadcasters.length - 1]
        uint256 loc = bound(location, 0, before.length - 1);

        // Submit revoke-at-location request (address(0) = revoke)
        vm.prank(owner);
        uint256 requestTxId = accountBlox.updateBroadcasterRequest(address(0), loc);
        vm.prank(owner);
        EngineBlox.TxRecord memory requestTx = accountBlox.getTransaction(requestTxId);
        uint256 txId = requestTx.txId;

        advanceTime(DEFAULT_TIMELOCK_PERIOD + 1);

        vm.prank(owner);
        accountBlox.updateBroadcasterDelayedApproval(txId);
        vm.prank(owner);
        EngineBlox.TxRecord memory approvalTx = accountBlox.getTransaction(txId);

        assertEq(uint8(approvalTx.status), uint8(EngineBlox.TxStatus.COMPLETED));
        address[] memory after_ = accountBlox.getBroadcasters();

        // Post-conditions: length decreased by one
        assertEq(after_.length, before.length - 1, "length should decrease by one");

        // Remaining elements equal to expected removal-at-index: [0..loc) unchanged, [loc+1..) shifted
        for (uint256 i = 0; i < after_.length; i++) {
            if (i < loc) {
                assertEq(after_[i], before[i], "elements before index unchanged");
            } else {
                assertEq(after_[i], before[i + 1], "elements after index shifted");
            }
        }

        // No duplicates in result
        for (uint256 i = 0; i < after_.length; i++) {
            for (uint256 j = i + 1; j < after_.length; j++) {
                assertTrue(after_[i] != after_[j], "no duplicate addresses");
            }
        }
    }

    /**
     * @dev Owner protection: revoking the last broadcaster fails (protected role);
     * delayed approval catches the internal revert and returns status FAILED, list unchanged.
     */
    function test_UpdateBroadcasterRequest_RevokeAtLocation_LastBroadcaster_Reverts() public {
        address[] memory b = accountBlox.getBroadcasters();
        assertEq(b.length, 1, "exactly one broadcaster initially");

        vm.prank(owner);
        uint256 requestTxId = accountBlox.updateBroadcasterRequest(address(0), 0);
        vm.prank(owner);
        EngineBlox.TxRecord memory requestTx = accountBlox.getTransaction(requestTxId);
        uint256 txId = requestTx.txId;
        advanceTime(DEFAULT_TIMELOCK_PERIOD + 1);

        vm.prank(owner);
        accountBlox.updateBroadcasterDelayedApproval(txId);
        vm.prank(owner);
        EngineBlox.TxRecord memory approvalTx = accountBlox.getTransaction(txId);

        assertEq(uint8(approvalTx.status), uint8(EngineBlox.TxStatus.FAILED), "owner protection: revoke last must fail");
        address[] memory after_ = accountBlox.getBroadcasters();
        assertEq(after_.length, 1, "broadcaster list unchanged");
        assertEq(after_[0], broadcaster, "single broadcaster preserved");
    }

    /**
     * @dev Invariant harness for broadcaster list safety. Asserts across state:
     * broadcasters.length >= 1, broadcasters.length <= MAX_BROADCASTERS (from getRole),
     * no duplicate addresses; identities change only via updateBroadcasterRequest /
     * updateBroadcasterDelayedApproval (valid revokes). Reference: getBroadcasters,
     * updateBroadcasterRequest, updateBroadcasterDelayedApproval,
     * test_UpdateBroadcasterRequest_RevokeAtLocation_ZeroAddress.
     */
    function invariant_BroadcasterListSafety() public {
        address[] memory broadcasters = accountBlox.getBroadcasters();

        assertGe(broadcasters.length, 1, "at least one broadcaster");

        vm.prank(owner);
        (, , uint256 maxWallets, , ) = accountBlox.getRole(BROADCASTER_ROLE);
        assertLe(broadcasters.length, maxWallets, "broadcasters within role limit");

        for (uint256 i = 0; i < broadcasters.length; i++) {
            for (uint256 j = i + 1; j < broadcasters.length; j++) {
                assertTrue(broadcasters[i] != broadcasters[j], "no duplicate broadcaster addresses");
            }
        }
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
        uint256 requestTxId = accountBlox.transferOwnershipRequest();
        vm.prank(recovery);
        EngineBlox.TxRecord memory requestTx = accountBlox.getTransaction(requestTxId);
        uint256 txId = requestTx.txId;

        advanceTime(DEFAULT_TIMELOCK_PERIOD + 1);

        // The approval will internally call executeTransferOwnership
        vm.prank(recovery);
        accountBlox.transferOwnershipDelayedApproval(txId);

        assertEq(accountBlox.owner(), recovery);
    }

    function test_ExecuteTransferOwnership_Revert_ExternalCall() public {
        vm.expectRevert(abi.encodeWithSelector(SharedValidation.OnlyCallableByContract.selector, attacker, address(accountBlox)));
        vm.prank(attacker);
        accountBlox.executeTransferOwnership(user1);
    }

    // ============ INTERFACE SUPPORT TESTS ============

    function test_SupportsInterface_ISecureOwnable() public {
        bytes4 interfaceId = type(ISecureOwnable).interfaceId;
        assertTrue(accountBlox.supportsInterface(interfaceId));
    }

    function test_SupportsInterface_ERC165() public {
        assertTrue(accountBlox.supportsInterface(0x01ffc9a7));
    }

    function test_SupportsInterface_InvalidInterface() public {
        assertFalse(accountBlox.supportsInterface(0x12345678));
    }

    // ============ META-TRANSACTION TESTS ============

    function test_TransferOwnershipApprovalWithMetaTx_Valid() public {
        uint256 privateKey = 0x3; // Recovery private key
        address newOwner = user1;

        // Step 1: Create ownership transfer request
        vm.prank(recovery);
        uint256 requestTxId = accountBlox.transferOwnershipRequest();
        vm.prank(recovery);
        EngineBlox.TxRecord memory requestTx = accountBlox.getTransaction(requestTxId);
        uint256 txId = requestTx.txId;

        // Step 2: Create meta-transaction parameters
        address handlerContract = address(accountBlox);
        bytes4 handlerSelector = bytes4(keccak256("transferOwnershipDelayedApproval(uint256)"));
        EngineBlox.TxAction action = EngineBlox.TxAction.EXECUTE_META_APPROVE;
        uint256 deadlineDuration = 3600; // Duration in seconds
        uint256 maxGasPrice = 100 gwei;

        EngineBlox.MetaTxParams memory metaTxParams = accountBlox.createMetaTxParams(
            handlerContract,
            handlerSelector,
            action,
            deadlineDuration,
            maxGasPrice,
            recovery
        );

        // Step 3: Generate unsigned meta-transaction
        vm.prank(recovery);
        EngineBlox.MetaTransaction memory unsignedMetaTx = accountBlox.generateUnsignedMetaTransactionForExisting(
            txId,
            metaTxParams
        );

        // Step 4: Sign the meta-transaction
        bytes memory signature = metaTxSigner.signMetaTransaction(
            unsignedMetaTx,
            privateKey,
            address(accountBlox)
        );

        // Step 5: Verify signature structure
        assertEq(signature.length, 65);
        assertNotEq(unsignedMetaTx.message, bytes32(0));

        // Step 6: Verify message hash consistency
        bytes32 expectedHash = metaTxSigner.generateMessageHash(
            unsignedMetaTx,
            address(accountBlox)
        );
        assertEq(unsignedMetaTx.message, expectedHash);

        // Note: Full execution would require proper permissions setup
        // This test verifies the meta-transaction structure and signing
    }

    // ============ EDGE CASE TESTS ============

    function test_MultiplePendingRequests_OnlyOneOwnership() public {
        vm.prank(recovery);
        accountBlox.transferOwnershipRequest();

        // Try to create another ownership request
        vm.prank(recovery);
        vm.expectRevert(SharedValidation.PendingSecureRequest.selector);
        accountBlox.transferOwnershipRequest();
    }

    function test_OwnershipTransfer_CompleteWorkflow() public {
        address newOwner = user1;

        // Step 1: Request
        vm.prank(recovery);
        uint256 requestTxId = accountBlox.transferOwnershipRequest();
        vm.prank(recovery);
        EngineBlox.TxRecord memory requestTx = accountBlox.getTransaction(requestTxId);
        uint256 txId = requestTx.txId;

        // Verify pending
        vm.prank(owner);
        EngineBlox.TxRecord memory pendingTx = accountBlox.getTransaction(txId);
        assertEq(uint8(pendingTx.status), uint8(EngineBlox.TxStatus.PENDING));

        // Step 2: Advance time
        advanceTime(DEFAULT_TIMELOCK_PERIOD + 1);

        // Step 3: Approve
        vm.prank(recovery);
        accountBlox.transferOwnershipDelayedApproval(txId);
        vm.prank(recovery);
        EngineBlox.TxRecord memory approvalTx = accountBlox.getTransaction(txId);

        // Step 4: Verify completion
        assertEq(uint8(approvalTx.status), uint8(EngineBlox.TxStatus.COMPLETED));
        assertEq(accountBlox.owner(), recovery);
    }
}
