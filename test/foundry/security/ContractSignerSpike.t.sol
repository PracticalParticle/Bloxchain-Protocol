// SPDX-License-Identifier: MPL-2.0
pragma solidity 0.8.35;

import "forge-std/Test.sol";
import "../../../contracts/core/lib/EngineBlox.sol";
import "../../../contracts/core/lib/utils/SharedValidation.sol";
import "../../../contracts/core/access/interface/IRuntimeRBAC.sol";
import "../../../contracts/core/access/lib/definitions/RuntimeRBACDefinitions.sol";
import "../helpers/AccountPatternTest.sol";
import "../helpers/MockContracts.sol";

/**
 * @title ContractSignerSpike
 * @dev SPIKE(EXP-2026-0015 E11) — evidence fixture, NOT a delivery.
 *
 * Question: can a CONTRACT authorise a governed operation on the constitutional rail?
 * This exercises exactly one governed operation — an RBAC role-config batch (CREATE_ROLE) —
 * with a contract as the OWNER / meta-transaction signer, verified through EIP-1271 instead
 * of ecrecover.
 *
 * The EIP-712 digest is unchanged: the fixture signs the same `metaTx.message` the protocol
 * already produces, so any pass here is a verification-path result, not a hash change.
 */

/**
 * @dev Minimal ERC-1271 signer. Approves a digest only after `approve(digest)` has been
 *      called by its own controller — i.e. authorisation is contract state, not a key.
 */
contract ApprovingContractSigner {
    bytes4 private constant MAGIC = 0x1626ba7e;

    address public immutable controller;
    mapping(bytes32 => bool) public approved;

    constructor(address controller_) {
        controller = controller_;
    }

    function approve(bytes32 digest) external {
        require(msg.sender == controller, "not controller");
        approved[digest] = true;
    }

    function isValidSignature(bytes32 digest, bytes calldata) external view returns (bytes4) {
        return approved[digest] ? MAGIC : bytes4(0xffffffff);
    }
}

/// @dev Returns a non-magic value for everything: must never authorise.
contract RejectingContractSigner {
    function isValidSignature(bytes32, bytes calldata) external pure returns (bytes4) {
        return bytes4(0xdeadbeef);
    }
}

/// @dev Reverts on every check: the dual dispatch must fail closed, not treat a revert as valid.
contract RevertingContractSigner {
    function isValidSignature(bytes32, bytes calldata) external pure returns (bytes4) {
        revert("nope");
    }
}

contract ContractSignerSpikeTest is Test {
    bytes4 constant ROLE_CONFIG_BATCH_META_SELECTOR = RuntimeRBACDefinitions.ROLE_CONFIG_BATCH_META_SELECTOR;
    bytes4 constant ROLE_CONFIG_BATCH_EXECUTE_SELECTOR = RuntimeRBACDefinitions.ROLE_CONFIG_BATCH_EXECUTE_SELECTOR;
    bytes32 constant ROLE_CONFIG_BATCH_OPERATION_TYPE = RuntimeRBACDefinitions.ROLE_CONFIG_BATCH;

    AccountPatternTest account;
    ApprovingContractSigner contractOwner;
    address controller;
    address broadcaster;
    address recovery;

    function setUp() public {
        controller = vm.addr(0xC0);
        broadcaster = vm.addr(2);
        recovery = vm.addr(3);

        contractOwner = new ApprovingContractSigner(controller);

        // The constitutional OWNER is a CONTRACT. No EOA holds the owner role.
        account = new AccountPatternTest();
        account.initialize(
            address(contractOwner),
            broadcaster,
            recovery,
            3600,
            address(new MockEventForwarder())
        );
    }

    // ============ W0 EVIDENCE: a contract can already HOLD the owner role ============

    /// @dev Baseline fact: role assignment has no EOA gate; a contract is a valid owner today.
    function test_W0_contractCanHoldOwnerRole() public view {
        assertEq(account.owner(), address(contractOwner), "contract should be the constitutional owner");
    }

    // ============ W2 EVIDENCE: contract authorises an RBAC role-config operation ============

    /// @dev The lane's core question, end to end: a CONTRACT authorises CREATE_ROLE.
    function test_W2_contractSignerAuthorisesRoleConfig() public {
        string memory roleName = "spike_role";
        bytes32 roleHash = keccak256(bytes(roleName));

        EngineBlox.MetaTransaction memory metaTx = _buildRoleConfigMetaTx(roleName);

        // Authorisation is contract state, not a signature over a key.
        vm.prank(controller);
        contractOwner.approve(metaTx.message);

        // Signature blob is deliberately NOT 65 bytes: proves the contract branch is in play.
        metaTx.signature = hex"c0ffee";

        vm.prank(broadcaster);
        uint256 txId = account.roleConfigBatchRequestAndApprove(metaTx);

        // getTransaction / getRole are role-gated views: prank a role holder to read them.
        vm.prank(broadcaster);
        EngineBlox.TxRecord memory rec = account.getTransaction(txId);
        assertEq(uint8(rec.status), uint8(EngineBlox.TxStatus.COMPLETED), "governed op should complete");

        vm.prank(broadcaster);
        (, bytes32 hash,,,) = account.getRole(roleHash);
        assertEq(hash, roleHash, "role created by a contract-authorised op");
    }

    /// @dev Gas probe for the contract-signer path (same op as the EOA probe below).
    function test_W2_gas_contractSignerPath() public {
        EngineBlox.MetaTransaction memory metaTx = _buildRoleConfigMetaTx("gas_role_xxxxxx");
        vm.prank(controller);
        contractOwner.approve(metaTx.message);
        metaTx.signature = hex"c0ffee";

        vm.prank(broadcaster);
        uint256 g0 = gasleft();
        account.roleConfigBatchRequestAndApprove(metaTx);
        emit log_named_uint("gas_contractSigner_roleConfig", g0 - gasleft());
    }

    // ============ W2 EVIDENCE: fail-closed behaviour ============

    /// @dev A contract that never returns the magic value must not authorise.
    function test_W2_rejectingContractSignerIsRefused() public {
        AccountPatternTest acct = new AccountPatternTest();
        RejectingContractSigner rejecting = new RejectingContractSigner();
        acct.initialize(address(rejecting), broadcaster, recovery, 3600, address(new MockEventForwarder()));

        EngineBlox.MetaTransaction memory metaTx = _buildRoleConfigMetaTxFor(acct, address(rejecting), "nope_role");
        metaTx.signature = hex"c0ffee";

        vm.prank(broadcaster);
        vm.expectRevert();
        acct.roleConfigBatchRequestAndApprove(metaTx);
    }

    /// @dev A reverting isValidSignature must fail closed.
    function test_W2_revertingContractSignerIsRefused() public {
        AccountPatternTest acct = new AccountPatternTest();
        RevertingContractSigner reverting = new RevertingContractSigner();
        acct.initialize(address(reverting), broadcaster, recovery, 3600, address(new MockEventForwarder()));

        EngineBlox.MetaTransaction memory metaTx = _buildRoleConfigMetaTxFor(acct, address(reverting), "revert_role");
        metaTx.signature = hex"c0ffee";

        vm.prank(broadcaster);
        vm.expectRevert();
        acct.roleConfigBatchRequestAndApprove(metaTx);
    }

    /// @dev Replay protection must survive a contract signer: the same approved digest
    ///      cannot be submitted twice, because the signer nonce advanced.
    function test_W2_contractSignerReplayIsRefused() public {
        EngineBlox.MetaTransaction memory metaTx = _buildRoleConfigMetaTx("replay_role");
        vm.prank(controller);
        contractOwner.approve(metaTx.message);
        metaTx.signature = hex"c0ffee";

        vm.prank(broadcaster);
        account.roleConfigBatchRequestAndApprove(metaTx);

        // The contract still approves this digest — only the nonce stops the replay.
        assertTrue(contractOwner.approved(metaTx.message), "digest still approved by signer");

        vm.prank(broadcaster);
        vm.expectRevert();
        account.roleConfigBatchRequestAndApprove(metaTx);
    }

    // ============ EOA control: the existing path must be untouched ============

    /// @dev Control case on an EOA-owned account: ecrecover path still works, and gas is comparable.
    function test_W2_gas_eoaSignerPathStillWorks() public {
        address eoaOwner = vm.addr(1);
        AccountPatternTest acct = new AccountPatternTest();
        acct.initialize(eoaOwner, broadcaster, recovery, 3600, address(new MockEventForwarder()));

        EngineBlox.MetaTransaction memory metaTx = _buildRoleConfigMetaTxFor(acct, eoaOwner, "gas_role_yyyyyy");
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(1, metaTx.message);
        metaTx.signature = abi.encodePacked(r, s, v);

        vm.prank(broadcaster);
        uint256 g0 = gasleft();
        uint256 txId = acct.roleConfigBatchRequestAndApprove(metaTx);
        emit log_named_uint("gas_eoaSigner_roleConfig", g0 - gasleft());

        vm.prank(broadcaster);
        EngineBlox.TxRecord memory rec = acct.getTransaction(txId);
        assertEq(uint8(rec.status), uint8(EngineBlox.TxStatus.COMPLETED), "EOA path must still complete");
    }

    /// @dev An EOA signer must still be held to the 65-byte / low-s ECDSA rules.
    function test_W2_eoaShortSignatureStillRejected() public {
        address eoaOwner = vm.addr(1);
        AccountPatternTest acct = new AccountPatternTest();
        acct.initialize(eoaOwner, broadcaster, recovery, 3600, address(new MockEventForwarder()));

        EngineBlox.MetaTransaction memory metaTx = _buildRoleConfigMetaTxFor(acct, eoaOwner, "short_sig_role");
        metaTx.signature = hex"c0ffee"; // not 65 bytes

        vm.prank(broadcaster);
        vm.expectRevert();
        acct.roleConfigBatchRequestAndApprove(metaTx);
    }

    // ============ helpers ============

    function _buildRoleConfigMetaTx(string memory roleName)
        internal
        view
        returns (EngineBlox.MetaTransaction memory)
    {
        return _buildRoleConfigMetaTxFor(account, address(contractOwner), roleName);
    }

    function _buildRoleConfigMetaTxFor(
        AccountPatternTest acct,
        address signer,
        string memory roleName
    ) internal view returns (EngineBlox.MetaTransaction memory) {
        IRuntimeRBAC.RoleConfigAction[] memory actions = new IRuntimeRBAC.RoleConfigAction[](1);
        actions[0] = IRuntimeRBAC.RoleConfigAction({
            actionType: IRuntimeRBAC.RoleConfigActionType.CREATE_ROLE,
            data: RuntimeRBACDefinitions.encodeCreateRole(roleName, 5)
        });

        bytes memory executionParams =
            RuntimeRBACDefinitions.roleConfigBatchExecutionParams(abi.encode(actions));

        EngineBlox.MetaTxParams memory metaTxParams = acct.createMetaTxParams(
            address(acct),
            ROLE_CONFIG_BATCH_META_SELECTOR,
            EngineBlox.TxAction.SIGN_META_REQUEST_AND_APPROVE,
            1 hours,
            0,
            signer
        );

        return acct.generateUnsignedMetaTransactionForNew(
            signer,
            address(acct),
            0,
            0,
            ROLE_CONFIG_BATCH_OPERATION_TYPE,
            ROLE_CONFIG_BATCH_EXECUTE_SELECTOR,
            executionParams,
            metaTxParams
        );
    }
}
