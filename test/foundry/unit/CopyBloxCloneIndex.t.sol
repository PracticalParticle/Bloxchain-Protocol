// SPDX-License-Identifier: MPL-2.0
pragma solidity 0.8.35;

import "forge-std/Test.sol";
import "../../../contracts/examples/applications/CopyBlox/CopyBlox.sol";
import "../../../contracts/examples/templates/AccountBlox.sol";
import "../../../contracts/core/base/interface/IBaseStateMachine.sol";
import "../../../contracts/core/security/interface/ISecureOwnable.sol";
import "../../../contracts/core/lib/utils/SharedValidation.sol";

/**
 * @title CopyBloxCloneIndexTest
 * @dev Covers the public provisioning surface of CopyBlox (SPEC-2026-0118):
 *      - the owner-indexed clone list (`clonesOf` and friends) returns every clone an
 *        owner holds, not only the latest one;
 *      - the shape gate an integrator must use holds on real contracts: a clone reads as
 *        an account and the factory itself does not;
 *      - `cloneBlox` against the AccountBlox template stays under the EIP-7825 per-tx cap.
 *
 * CopyBlox is left uninitialized here on purpose: that is how the official factories are
 * deployed, and `cloneBlox` does not require initialization (reentrancy protection is
 * transient, not initialized state).
 */
contract CopyBloxCloneIndexTest is Test {
    /// @dev EIP-7825 per-transaction gas cap enforced by public networks (2^24).
    uint256 internal constant MAX_TX_GAS = 16_777_216;

    CopyBlox internal factory;
    AccountBlox internal template;

    address internal alice;
    address internal bob;
    address internal broadcaster;
    address internal recovery;

    uint256 internal constant TIMELOCK = 3600;

    function setUp() public {
        alice = address(0xA11CE);
        bob = address(0xB0B);
        broadcaster = address(0xBCA5);
        recovery = address(0xBEC0);

        factory = new CopyBlox();
        template = new AccountBlox();
        // The template is initialized so the implementation cannot be taken over; a clone
        // copies runtime code, not storage, so an initialized template is a valid source.
        template.initialize(address(this), broadcaster, recovery, TIMELOCK, address(0));
    }

    function _clone(address initialOwner) internal returns (address) {
        return factory.cloneBlox(address(template), initialOwner, broadcaster, recovery, TIMELOCK);
    }

    // ============ R3: owner-indexed clone list ============

    /// @dev AC4: an owner with several clones gets all of them back, in creation order.
    function test_ClonesOf_ReturnsEveryCloneForOwner() public {
        address first = _clone(alice);
        address second = _clone(alice);
        address third = _clone(alice);
        address bobs = _clone(bob);

        address[] memory alices = factory.clonesOf(alice);
        assertEq(alices.length, 3, "alice should have three clones");
        assertEq(alices[0], first, "creation order [0]");
        assertEq(alices[1], second, "creation order [1]");
        assertEq(alices[2], third, "creation order [2]");
        assertEq(factory.clonesOfCount(alice), 3, "clonesOfCount(alice)");

        address[] memory bobsClones = factory.clonesOf(bob);
        assertEq(bobsClones.length, 1, "bob should have one clone");
        assertEq(bobsClones[0], bobs, "bob's clone");

        // The flat list still sees all four.
        assertEq(factory.getCloneCount(), 4, "flat clone count");
        assertTrue(factory.isClone(first), "isClone(first)");
        assertTrue(factory.isClone(bobs), "isClone(bobs)");
    }

    function test_ClonesOf_IsEmptyForUnknownOwner() public {
        _clone(alice);
        assertEq(factory.clonesOf(bob).length, 0, "unknown owner has no clones");
        assertEq(factory.clonesOfCount(bob), 0, "unknown owner count");
    }

    function test_CloneOfOwnerAt_ReturnsByIndex() public {
        address first = _clone(alice);
        address second = _clone(alice);
        assertEq(factory.cloneOfOwnerAt(alice, 0), first, "index 0");
        assertEq(factory.cloneOfOwnerAt(alice, 1), second, "index 1");
    }

    function test_CloneOfOwnerAt_RevertsOutOfRange() public {
        _clone(alice);
        vm.expectRevert(abi.encodeWithSelector(SharedValidation.InvalidOperation.selector, alice));
        factory.cloneOfOwnerAt(alice, 1);
    }

    /// @dev The index is keyed by the owner the clone was initialized with and is not
    ///      re-keyed on transfer, so consumers must still read `owner()`.
    function test_ClonesOf_KeyedByInitialOwner() public {
        address cloneAddress = _clone(alice);
        assertEq(AccountBlox(payable(cloneAddress)).owner(), alice, "clone owner is alice");
        assertEq(factory.clonesOf(alice)[0], cloneAddress, "indexed under alice");
    }

    // ============ R3: the shape gate ============

    /// @dev AC3 (first half): the factory must not read as a loadable account.
    ///      `IBaseStateMachine` alone would adopt it, which is the whole point of the gate.
    function test_FactoryDoesNotReadAsAnAccount() public {
        assertTrue(
            factory.supportsInterface(type(IBaseStateMachine).interfaceId),
            "factory answers IBaseStateMachine (this is why that check alone is not enough)"
        );
        assertFalse(
            factory.supportsInterface(type(ISecureOwnable).interfaceId),
            "factory must not answer ISecureOwnable"
        );
        assertFalse(factory.initialized(), "uninitialized factory");
        vm.expectRevert();
        factory.owner();
    }

    /// @dev AC3 (second half): a clone reads as an account after clone+init.
    function test_CloneReadsAsAnAccount() public {
        AccountBlox account = AccountBlox(payable(_clone(alice)));
        assertGt(address(account).code.length, 0, "clone has code");
        assertEq(account.owner(), alice, "owner()");
        assertTrue(account.initialized(), "initialized()");
        assertTrue(
            account.supportsInterface(type(ISecureOwnable).interfaceId),
            "clone answers ISecureOwnable"
        );
        assertTrue(
            account.supportsInterface(type(IBaseStateMachine).interfaceId),
            "clone answers IBaseStateMachine"
        );
    }

    // ============ R4: gas envelope ============

    /// @dev The clone must fit under the public per-transaction cap (2^24, EIP-7825), and
    ///      the owner index must not be what pushes it over.
    function test_CloneBloxFitsUnderEip7825Cap() public {
        uint256 before = gasleft();
        _clone(alice);
        uint256 used = before - gasleft();
        emit log_named_uint("cloneBlox gas (AccountBlox template)", used);
        emit log_named_uint("EIP-7825 per-tx cap", MAX_TX_GAS);
        assertLt(used, MAX_TX_GAS, "cloneBlox must fit under the EIP-7825 per-tx cap");
    }

    /// @dev Cost of the owner index itself: second clone for a known owner reuses the
    ///      length slot, first clone for a new owner pays for it.
    function test_OwnerIndexGasOverheadIsRecorded() public {
        uint256 beforeFirst = gasleft();
        _clone(alice);
        uint256 firstForOwner = beforeFirst - gasleft();

        uint256 beforeSecond = gasleft();
        _clone(alice);
        uint256 secondForOwner = beforeSecond - gasleft();

        emit log_named_uint("cloneBlox gas, first clone for an owner", firstForOwner);
        emit log_named_uint("cloneBlox gas, second clone for the same owner", secondForOwner);
        assertLt(firstForOwner, MAX_TX_GAS, "first clone under cap");
        assertLt(secondForOwner, MAX_TX_GAS, "second clone under cap");
    }
}
