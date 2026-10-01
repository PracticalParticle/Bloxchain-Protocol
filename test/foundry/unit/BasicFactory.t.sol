// SPDX-License-Identifier: MPL-2.0
pragma solidity 0.8.35;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "../../../contracts/account/BasicAccount.sol";
import "../../../contracts/factory/BasicFactory.sol";
import "../../../contracts/examples/templates/AccountBlox.sol";
import "../../../contracts/examples/applications/CopyBlox/CopyBlox.sol";
import "../../../contracts/core/base/interface/IBaseStateMachine.sol";
import "../../../contracts/core/access/interface/IRuntimeRBAC.sol";
import "../../../contracts/core/execution/interface/IGuardController.sol";
import "../../../contracts/core/security/interface/ISecureOwnable.sol";
import "../../../contracts/core/lib/EngineBlox.sol";
import "../../../contracts/core/lib/interfaces/IEventForwarder.sol";
import "../../../contracts/core/lib/utils/SharedValidation.sol";
import "../helpers/MockContracts.sol";

/**
 * @title BasicFactoryTest
 * @dev SPEC-2026-0130 pinned factory (follow-up handoff `handoff-cc-pinned.md`):
 *      - the constructor pins one implementation and rejects a bad pin;
 *      - every `cloneBlox` mints the pinned `BasicAccount`; there is no argument to mint anything else;
 *      - the mint is permissionless and follows the CopyBlox sequence;
 *      - only clones may forward events;
 *      - the factory is not an account (no `ISecureOwnable`, no `owner()`);
 *      - factory creation fits EIP-170 and the EIP-7825 cap, and so does the clone.
 */
contract BasicFactoryTest is Test {
    /// @dev EIP-7825 per-transaction gas cap enforced by public networks (2^24).
    uint256 internal constant MAX_TX_GAS = 16_777_216;
    /// @dev EIP-170 runtime code limit.
    uint256 internal constant MAX_CODE_SIZE = 24_576;
    uint256 internal constant ACCOUNT_TIMELOCK = 1 days;

    BasicAccount internal accountImpl;
    BasicFactory internal factory;

    address internal broadcaster;
    address internal recovery;
    address internal alice;
    address internal bob;
    address internal stranger;

    event BloxCloned(address indexed original, address indexed clone, address indexed initialOwner);
    event CloneEventForwarded(
        address indexed cloneAddress,
        uint256 indexed txId,
        bytes4 indexed functionSelector,
        EngineBlox.TxStatus status,
        address requester,
        address target,
        bytes32 operationType,
        bytes32 resultHash
    );

    function setUp() public {
        broadcaster = vm.addr(2);
        recovery = vm.addr(3);
        alice = address(0xA11CE);
        bob = address(0xB0B);
        stranger = address(0x5712A);

        accountImpl = new BasicAccount();
        factory = new BasicFactory(address(accountImpl));
    }

    function _clone(address initialOwner) internal returns (address) {
        return factory.cloneBlox(initialOwner, broadcaster, recovery, ACCOUNT_TIMELOCK);
    }

    // ============ constructor pin (vetted once) ============

    function _expectRejected(address candidate) internal {
        vm.expectRevert(abi.encodeWithSelector(SharedValidation.InvalidOperation.selector, candidate));
        new BasicFactory(candidate);
    }

    function test_Constructor_PinsTheImplementation() public view {
        assertEq(factory.implementation(), address(accountImpl), "pinned implementation");
    }

    function test_Constructor_AcceptsBasicAccount() public {
        BasicFactory fresh = new BasicFactory(address(new BasicAccount()));
        assertTrue(fresh.implementation() != address(0), "BasicAccount accepted");
    }

    function test_Constructor_AcceptsAnyBlox() public {
        assertTrue(address(new BasicFactory(address(new AccountBlox()))) != address(0), "AccountBlox");
        assertTrue(address(new BasicFactory(address(new CopyBlox()))) != address(0), "CopyBlox");
    }

    function test_Constructor_RejectsAddressWithoutCode() public {
        _expectRejected(stranger);
        _expectRejected(address(0));
    }

    function test_Constructor_RejectsNonBloxAndNoErc165() public {
        _expectRejected(address(new MockERC20("T", "T")));
        _expectRejected(address(new MockTarget()));
    }

    /// @dev The origin check is not repeated on mint: even if the pin stopped answering the probes,
    ///      `cloneBlox` still clones the stored address.
    function test_CloneBlox_DoesNotRepeatTheOriginCheck() public {
        vm.mockCallRevert(address(accountImpl), abi.encodeWithSelector(IERC165.supportsInterface.selector), "");
        vm.expectCall(address(accountImpl), abi.encodeWithSelector(IERC165.supportsInterface.selector), 0);

        address c = _clone(alice);
        assertTrue(factory.isClone(c), "minted without re-vetting the pin");
        assertEq(BasicAccount(payable(c)).owner(), alice, "clone initialized");
    }

    // ============ mint: always the pinned implementation ============

    function test_CloneBlox_MintsThePinnedBasicAccount() public {
        vm.prank(stranger); // anyone may mint
        address cloneAddress = factory.cloneBlox(alice, broadcaster, recovery, ACCOUNT_TIMELOCK);

        assertTrue(factory.isClone(cloneAddress), "isClone");
        assertFalse(factory.isClone(alice), "the owner is not a clone");

        // The clone is an EIP-1167 proxy of exactly the pinned implementation.
        assertEq(
            keccak256(cloneAddress.code),
            keccak256(_minimalProxyCode(address(accountImpl))),
            "clone delegates to the pinned implementation"
        );

        BasicAccount account = BasicAccount(payable(cloneAddress));
        assertTrue(account.initialized(), "clone initialized");
        assertEq(account.owner(), alice, "clone owner");
        assertEq(account.getTimeLockPeriodSec(), ACCOUNT_TIMELOCK, "clone timelock");
        assertEq(account.MIN_TIME_LOCK_PERIOD(), 1 days, "clone floor");
        assertEq(account.MAX_TIME_LOCK_PERIOD(), 90 days, "clone ceiling");
    }

    function test_CloneBlox_EveryMintIsThePinnedImplementation() public {
        bytes32 expected = keccak256(_minimalProxyCode(address(accountImpl)));
        for (uint256 i = 0; i < 3; i++) {
            address c = _clone(i % 2 == 0 ? alice : bob);
            assertEq(keccak256(c.code), expected, "same pinned implementation every time");
            assertTrue(factory.isClone(c), "lineage");
        }
        assertFalse(factory.isClone(alice), "not every address is a clone");
    }

    /// @dev There is no implementation argument: the CopyBlox five-argument mint does not exist here.
    function test_CloneBlox_HasNoImplementationArgument() public {
        AccountBlox other = new AccountBlox();
        (bool ok, ) = address(factory).call(
            abi.encodeWithSignature(
                "cloneBlox(address,address,address,address,uint256)",
                address(other),
                alice,
                broadcaster,
                recovery,
                ACCOUNT_TIMELOCK
            )
        );
        assertFalse(ok, "five-argument cloneBlox is not a function on this factory");
        assertFalse(factory.isClone(address(other)), "nothing minted");
    }

    function test_CloneBlox_EmitsBloxCloned() public {
        address predicted = vm.computeCreateAddress(address(factory), vm.getNonce(address(factory)));
        vm.expectEmit(true, true, true, true, address(factory));
        emit BloxCloned(address(accountImpl), predicted, alice);
        _clone(alice);
    }

    function test_CloneBlox_RevertsForZeroRoles() public {
        vm.expectRevert(abi.encodeWithSelector(SharedValidation.InvalidAddress.selector, address(0)));
        factory.cloneBlox(address(0), broadcaster, recovery, ACCOUNT_TIMELOCK);
        vm.expectRevert(abi.encodeWithSelector(SharedValidation.InvalidAddress.selector, address(0)));
        factory.cloneBlox(alice, address(0), recovery, ACCOUNT_TIMELOCK);
        vm.expectRevert(abi.encodeWithSelector(SharedValidation.InvalidAddress.selector, address(0)));
        factory.cloneBlox(alice, broadcaster, address(0), ACCOUNT_TIMELOCK);
    }

    /// @dev The clone enforces the BasicAccount bounds; a failed initialize reverts the whole mint.
    function test_CloneBlox_RevertsOutsideBasicAccountBounds() public {
        vm.expectRevert(SharedValidation.OperationFailed.selector);
        factory.cloneBlox(alice, broadcaster, recovery, 1 days - 1);
        vm.expectRevert(SharedValidation.OperationFailed.selector);
        factory.cloneBlox(alice, broadcaster, recovery, 90 days + 1);
        address predicted = vm.computeCreateAddress(address(factory), vm.getNonce(address(factory)));
        assertFalse(factory.isClone(predicted), "failed mint leaves no lineage");
    }

    // ============ event forwarding ============

    function test_ForwardTxEvent_FromCloneEmits() public {
        address c = _clone(alice);
        vm.expectEmit(true, true, true, true, address(factory));
        emit CloneEventForwarded(c, 42, bytes4(0xabcdef01), EngineBlox.TxStatus.PENDING, alice, c, bytes32("op"), bytes32(0));
        vm.prank(c);
        factory.forwardTxEvent(42, bytes4(0xabcdef01), EngineBlox.TxStatus.PENDING, alice, c, bytes32("op"), bytes32(0));
    }

    function test_ForwardTxEvent_RevertsForNonClone() public {
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(SharedValidation.NoPermission.selector, stranger));
        factory.forwardTxEvent(1, bytes4(0), EngineBlox.TxStatus.PENDING, stranger, stranger, bytes32(0), bytes32(0));

        // Same code, other path: a BasicAccount clone not minted here is not in the set.
        address outsider = Clones.clone(address(accountImpl));
        vm.prank(outsider);
        vm.expectRevert(abi.encodeWithSelector(SharedValidation.NoPermission.selector, outsider));
        factory.forwardTxEvent(1, bytes4(0), EngineBlox.TxStatus.PENDING, stranger, stranger, bytes32(0), bytes32(0));
        assertFalse(factory.isClone(outsider), "not isClone");
    }

    // ============ not an account ============

    function test_Factory_IsNotAnAccount() public {
        assertTrue(factory.supportsInterface(type(IEventForwarder).interfaceId), "IEventForwarder");
        assertTrue(factory.supportsInterface(0x01ffc9a7), "IERC165");
        assertFalse(factory.supportsInterface(0xffffffff), "ERC-165 invalid id");
        assertFalse(factory.supportsInterface(type(ISecureOwnable).interfaceId), "not ISecureOwnable");
        assertFalse(factory.supportsInterface(type(IRuntimeRBAC).interfaceId), "not IRuntimeRBAC");
        assertFalse(factory.supportsInterface(type(IGuardController).interfaceId), "not IGuardController");
        assertFalse(factory.supportsInterface(type(IBaseStateMachine).interfaceId), "not IBaseStateMachine");

        // No owner() and no initialized(): the account gate stops at the owner check.
        (bool hasOwner, ) = address(factory).staticcall(abi.encodeWithSignature("owner()"));
        assertFalse(hasOwner, "owner() does not exist");
        (bool hasInit, ) = address(factory).staticcall(abi.encodeWithSignature("initialized()"));
        assertFalse(hasInit, "initialized() does not exist");
    }

    function test_Factory_HasNoCatalogOrInitSurface() public {
        bytes[4] memory calls = [
            abi.encodeWithSignature("addToWhitelist(address)", address(accountImpl)),
            abi.encodeWithSignature("removeFromWhitelist(address)", address(accountImpl)),
            abi.encodeWithSignature(
                "initialize(address,address,address,uint256,address)", alice, broadcaster, recovery, 1 days, address(0)
            ),
            abi.encodeWithSignature("isWhitelisted(address)", address(accountImpl))
        ];
        for (uint256 i = 0; i < calls.length; i++) {
            (bool ok, ) = address(factory).call(calls[i]);
            assertFalse(ok, "no catalog, init or role surface");
        }
    }

    function test_Factory_RejectsPlainEth() public {
        vm.deal(stranger, 1 ether);
        vm.prank(stranger);
        (bool ok, ) = address(factory).call{value: 1 ether}("");
        assertFalse(ok, "factory holds no ETH");
    }

    function test_Clone_IsAnAccount() public {
        BasicAccount account = BasicAccount(payable(_clone(alice)));
        assertTrue(account.supportsInterface(type(ISecureOwnable).interfaceId), "clone is an account");
    }

    // ============ size and gas envelope ============

    function test_FactoryCreation_FitsEip170AndEip7825() public {
        uint256 before = gasleft();
        BasicFactory fresh = new BasicFactory(address(accountImpl));
        uint256 creationGas = before - gasleft();
        uint256 runtimeBytes = address(fresh).code.length;
        emit log_named_uint("BasicFactory runtime bytes", runtimeBytes);
        emit log_named_uint("BasicFactory creation gas", creationGas);
        emit log_named_uint("BasicAccount runtime bytes", address(accountImpl).code.length);
        assertLt(runtimeBytes, MAX_CODE_SIZE, "BasicFactory under EIP-170");
        assertLt(address(accountImpl).code.length, MAX_CODE_SIZE, "BasicAccount under EIP-170");
        assertLt(creationGas, MAX_TX_GAS, "factory creation under the EIP-7825 cap");
    }

    function test_CloneBlox_FitsUnderEip7825Cap() public {
        uint256 before = gasleft();
        _clone(alice);
        uint256 used = before - gasleft();
        emit log_named_uint("BasicFactory.cloneBlox gas (BasicAccount)", used);
        emit log_named_uint("EIP-7825 per-tx cap", MAX_TX_GAS);
        emit log_named_uint("headroom", MAX_TX_GAS - used);
        assertLt(used, MAX_TX_GAS, "cloneBlox must fit under the EIP-7825 per-tx cap");
    }

    // ============ fuzz ============

    function testFuzz_IsClone_OnlyMintedAddresses(address ownerA, address ownerB, uint8 countA, uint8 countB) public {
        vm.assume(ownerA != address(0) && ownerB != address(0) && ownerA != ownerB);
        uint256 nA = bound(countA, 1, 3);
        uint256 nB = bound(countB, 1, 3);
        for (uint256 i = 0; i < nA; i++) {
            address c = _clone(ownerA);
            assertTrue(factory.isClone(c), "ownerA mint");
        }
        for (uint256 j = 0; j < nB; j++) {
            address c = _clone(ownerB);
            assertTrue(factory.isClone(c), "ownerB mint");
        }
        assertFalse(factory.isClone(ownerA), "owner is not a clone");
        assertFalse(factory.isClone(ownerB), "owner is not a clone");
    }

    /// @dev EIP-1167 runtime code for a proxy to `target` (what `Clones.clone` deploys).
    function _minimalProxyCode(address target) internal pure returns (bytes memory) {
        return abi.encodePacked(
            hex"363d3d373d3d3d363d73", target, hex"5af43d82803e903d91602b57fd5bf3"
        );
    }
}
