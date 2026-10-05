// SPDX-License-Identifier: MPL-2.0
pragma solidity 0.8.35;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuardTransient.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import "../core/base/interface/IBaseStateMachine.sol";
import "../core/execution/interface/IGuardController.sol";
import "../core/lib/EngineBlox.sol";
import "../core/lib/interfaces/IEventForwarder.sol";
import "../core/lib/utils/SharedValidation.sol";

/**
 * @title BasicFactory
 * @dev Canonical minter: clones exactly one implementation, pinned in the constructor.
 *
 * ## One blox, fixed for good
 *
 * The constructor vets and stores one already-deployed implementation as an `immutable`.
 * The pin must answer ERC-165 `IBaseStateMachine`. That check runs once, at deployment.
 * Neither mint has an implementation argument, so there is no way to mint anything else from
 * this factory. There is no owner, no role, no timelock and no whitelist to change.
 * A new template means a new factory. `BasicAccount` is the intended canonical pin; the
 * 1-day floor is enforced by that account, not by this factory.
 *
 * ## Two mint paths, one sequence
 *
 * - `cloneBlox` (nonce, `CREATE`): every call lands on a new address.
 * - `cloneBloxDeterministic` (`CREATE2`): the address is fixed by the minter, the owner, an
 *   `index` and a user `salt`. `predictClone` returns it before the mint.
 *
 * Both are permissionless **for the caller's own account** and follow the CopyBlox sequence:
 * self-owner check, EIP-1167 clone, record the clone,
 * `initialize(address,address,address,uint256,address)` in the same transaction with this
 * factory as the clone's event forwarder, then `BloxCloned`. A failed initialize reverts the
 * whole mint, code and lineage. The only lineage record is whether this factory minted that
 * address, by either path.
 *
 * ## Self-owner mint (SPEC-2026-0142)
 *
 * Both mints revert `RestrictedOwner(msg.sender, initialOwner)` unless
 * `initialOwner == msg.sender`. Anyone may mint, but only for themselves: this pin cannot
 * name a third party as owner while the minter keeps a helper role. Broadcaster and recovery
 * stay caller-chosen and may be other wallets. Minting for another owner is a valid pattern
 * for other factories; it is not available on this one. Relayed or sponsored mints therefore
 * need the owner to be the sending account (for example a smart account that sends the call).
 *
 * ## Deterministic address (SPEC-2026-0138)
 *
 * The `CREATE2` salt is `keccak256(abi.encode(minter, initialOwner, index, salt))`, where
 * `minter` is `msg.sender` on the write path and `deployer` on `predictClone`. Nothing else
 * goes in the hash: no broadcaster, recovery or timelock (those are `initialize` arguments
 * only), no `block.chainid`, no factory address (the factory is already the `CREATE2`
 * deployer), and no version tag. A different formula needs a different factory.
 *
 * The cross-chain key is the **minter**. Because a successful mint needs
 * `msg.sender == initialOwner` (SPEC-2026-0142), the minter and the owner are the same account,
 * so in practice the address is owner-keyed; the formula still hashes both. The same owner
 * repeating the same index and salt gets the same clone address on every chain where this
 * factory and its pinned implementation sit at the same addresses (this contract does not
 * arrange that). A relayer or a different wallet cannot mint for that owner, and a per-chain
 * smart-account owner derives a different address. The broadcaster, recovery and timelock at
 * that address may differ per chain unless the minter passes the same values. Default
 * convention: `salt = bytes32(0)` and `index = 0, 1, 2, ...` per owner.
 *
 * ## Lineage claim (what `isClone` means)
 *
 * `isClone(a)` is true when `a` was minted **by this factory**. That is the whole claim. It
 * does **not** mean every copy of the implementation on the chain came from this factory:
 * anyone can still deploy, clone, or proxy the same implementation by another path (including
 * `CopyBlox`), and those copies are not `isClone` here. Integrators that need "official"
 * lineage must check `isClone` on the declared factory address, not the implementation's
 * bytecode.
 *
 * ## Not an account
 *
 * This factory does not inherit `BaseStateMachine` or `Account`. It answers ERC-165
 * `IEventForwarder` only, never `ISecureOwnable`, and it has no `owner()`. The SDK account
 * gate therefore rejects it at the owner check.
 *
 * ## Gas
 *
 * Per-mint cost is the implementation's `initialize` (Account pattern) plus the clone and
 * one lineage write; the deterministic path adds one salt hash and the `CREATE2` address
 * check. Against `BasicAccount` both sit under the public per-transaction cap of
 * 2^24 = 16,777,216 (EIP-7825); `test/foundry/unit/BasicFactory.t.sol` records the numbers.
 * Send either mint with an explicit gas limit of `16777216`, never a bare estimate. See
 * `docs/getting-started.md`.
 *
 * ## Status
 *
 * Source for a future mainnet declaration. No official deployment is declared, and this
 * contract is not covered by the Nethermind core audit (NM_0828).
 *
 * @custom:security-contact security@particlecs.com
 */
contract BasicFactory is ERC165, ReentrancyGuardTransient, IEventForwarder {
    /// @notice The one implementation this factory clones, fixed at construction.
    address public immutable implementation;

    /// @dev True when this factory minted the address. Not an ownership index.
    mapping(address => bool) private _isClone;

    /// @notice Emitted when the pinned implementation is cloned.
    event BloxCloned(address indexed original, address indexed clone, address indexed initialOwner);

    /// @notice Emitted when a clone minted here forwards a transaction event.
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

    /**
     * @param implementation_ The blox to pin. It must already be deployed.
     * @dev Vets the pin once, here. `cloneBlox` clones the stored address and never re-checks it.
     *      The pin must answer ERC-165 `IBaseStateMachine`. A failed call, a short answer, or a
     *      false answer reverts `InvalidOperation`. The probe is a low-level `staticcall` that
     *      must return a full 32-byte word, so an address without code (including zero) fails
     *      the same way: a call to it succeeds with no return data. This is not a bytecode proof.
     *      The mint still calls `initialize(address,address,address,uint256,address)`.
     */
    constructor(address implementation_) {
        if (!_answersWord(implementation_, abi.encodeCall(IERC165.supportsInterface, (type(IBaseStateMachine).interfaceId)), 1)) {
            revert SharedValidation.InvalidOperation(implementation_);
        }
        implementation = implementation_;
    }

    /**
     * @dev True when `target` answers `data` without reverting and its first return word equals
     *      `expected`. Returns false for a revert or for fewer than 32 bytes of return data.
     */
    function _answersWord(address target, bytes memory data, uint256 expected) private view returns (bool) {
        (bool success, bytes memory result) = target.staticcall(data);
        return success && result.length >= 32 && abi.decode(result, (uint256)) == expected;
    }

    /**
     * @dev See {IERC165-supportsInterface}. Answers `IEventForwarder` and `IERC165`; never an
     *      account interface.
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return interfaceId == type(IEventForwarder).interfaceId || super.supportsInterface(interfaceId);
    }

    // ============ MINT (PERMISSIONLESS) ============

    /**
     * @notice Clone the pinned implementation and initialize it with caller-provided values.
     * @param initialOwner The initial owner address for the clone; must be `msg.sender`
     * @param broadcaster The broadcaster address for the clone (may be a helper wallet)
     * @param recovery The recovery address for the clone (may be a helper wallet)
     * @param timeLockPeriodSec The timelock period in seconds (`BasicAccount` accepts 1 day to 90 days)
     * @return cloneAddress The address of the new clone
     * @dev Reverts `RestrictedOwner(msg.sender, initialOwner)` unless the caller is the owner.
     *      Nonce path (`CREATE`): each call yields a new address. Registration happens before
     *      initialize so the clone can forward events during its own initialize; a failed
     *      initialize reverts the registration. Send with gas limit `16777216`.
     */
    function cloneBlox(
        address initialOwner,
        address broadcaster,
        address recovery,
        uint256 timeLockPeriodSec
    ) external nonReentrant returns (address cloneAddress) {
        _validateRoles(initialOwner, broadcaster, recovery);
        cloneAddress = Clones.clone(implementation);
        _register(cloneAddress, initialOwner, broadcaster, recovery, timeLockPeriodSec);
    }

    /**
     * @notice Clone the pinned implementation at a deterministic address and initialize it.
     * @param initialOwner The initial owner address for the clone (part of the address); must be `msg.sender`
     * @param broadcaster The broadcaster address for the clone (not part of the address; may be a helper)
     * @param recovery The recovery address for the clone (not part of the address; may be a helper)
     * @param timeLockPeriodSec The timelock period in seconds (not part of the address;
     *        `BasicAccount` accepts 1 day to 90 days)
     * @param index Caller-chosen slot, so one minter and owner can hold many clones (default 0, 1, 2, ...)
     * @param salt Caller-chosen salt (default `bytes32(0)`)
     * @return cloneAddress The new clone; equals `predictClone(msg.sender, initialOwner, index, salt)`
     * @dev `CREATE2` path. Reverts `RestrictedOwner(msg.sender, initialOwner)` unless the caller
     *      is the owner. The address binds `msg.sender`, so a different sender (relayer, other
     *      wallet) derives a different address. Reverts `ItemAlreadyExists` when the address
     *      already holds code (a repeat on this chain). A failed initialize reverts the code and
     *      the lineage, so the address stays free. Send with gas limit `16777216`.
     */
    function cloneBloxDeterministic(
        address initialOwner,
        address broadcaster,
        address recovery,
        uint256 timeLockPeriodSec,
        uint256 index,
        bytes32 salt
    ) external nonReentrant returns (address cloneAddress) {
        _validateRoles(initialOwner, broadcaster, recovery);
        address source = implementation;
        bytes32 create2Salt = _create2Salt(msg.sender, initialOwner, index, salt);
        address predicted = Clones.predictDeterministicAddress(source, create2Salt);
        if (predicted.code.length != 0) revert SharedValidation.ItemAlreadyExists(predicted);
        cloneAddress = Clones.cloneDeterministic(source, create2Salt);
        _register(cloneAddress, initialOwner, broadcaster, recovery, timeLockPeriodSec);
    }

    // ============ VIEWS ============

    /**
     * @notice True when `cloneAddress` was minted by this factory.
     * @dev Lineage of this factory only; see the contract-level lineage claim.
     */
    function isClone(address cloneAddress) external view returns (bool) {
        return _isClone[cloneAddress];
    }

    /**
     * @notice The address `cloneBloxDeterministic` mints when `deployer` sends it with these arguments.
     * @param deployer The account that will send the mint (`msg.sender` on the write path)
     * @param initialOwner The initial owner the mint will pass
     * @param index The index the mint will pass
     * @param salt The salt the mint will pass
     * @dev For a mint that can succeed, `deployer` must equal `initialOwner` (SPEC-2026-0142);
     *      any other pair predicts an address the write path will never mint, because the mint
     *      reverts `RestrictedOwner`. The view still takes both so the salt formula is unchanged.
     *      Broadcaster, recovery and timelock do not affect the address. Independent of
     *      `block.chainid`; matches another chain only when this factory and the pinned
     *      implementation sit at the same addresses there. Does not say whether the address is
     *      already minted; check `isClone`.
     */
    function predictClone(
        address deployer,
        address initialOwner,
        uint256 index,
        bytes32 salt
    ) external view returns (address) {
        return Clones.predictDeterministicAddress(implementation, _create2Salt(deployer, initialOwner, index, salt));
    }

    // ============ IEventForwarder ============

    /**
     * @notice Forward a transaction event from a clone minted by this factory
     * @dev Only clones in `isClone` may call. The factory has no downstream forwarder of its
     *      own, so the event ends here.
     */
    function forwardTxEvent(
        uint256 txId,
        bytes4 functionSelector,
        EngineBlox.TxStatus status,
        address requester,
        address target,
        bytes32 operationType,
        bytes32 resultHash
    ) external override {
        if (!_isClone[msg.sender]) revert SharedValidation.NoPermission(msg.sender);
        emit CloneEventForwarded(
            msg.sender,
            txId,
            functionSelector,
            status,
            requester,
            target,
            operationType,
            resultHash
        );
    }

    // ============ INTERNAL ============

    /// @dev `CREATE2` salt, locked by SPEC-2026-0138: minter, owner, index, user salt. Nothing else.
    function _create2Salt(
        address minter,
        address initialOwner,
        uint256 index,
        bytes32 salt
    ) private pure returns (bytes32) {
        return keccak256(abi.encode(minter, initialOwner, index, salt));
    }

    /// @dev Non-zero roles, then the self-owner rule (SPEC-2026-0142): the caller must be the owner.
    function _validateRoles(address initialOwner, address broadcaster, address recovery) private view {
        SharedValidation.validateNotZeroAddress(initialOwner);
        SharedValidation.validateNotZeroAddress(broadcaster);
        SharedValidation.validateNotZeroAddress(recovery);
        if (initialOwner != msg.sender) revert SharedValidation.RestrictedOwner(msg.sender, initialOwner);
    }

    /// @dev Record lineage, then initialize with this factory as forwarder. Any failure reverts the mint.
    function _register(
        address cloneAddress,
        address initialOwner,
        address broadcaster,
        address recovery,
        uint256 timeLockPeriodSec
    ) private {
        _isClone[cloneAddress] = true;
        (bool success, ) = cloneAddress.call(
            abi.encodeCall(
                IGuardController.initialize,
                (initialOwner, broadcaster, recovery, timeLockPeriodSec, address(this))
            )
        );
        if (!success) revert SharedValidation.OperationFailed();
        emit BloxCloned(implementation, cloneAddress, initialOwner);
    }
}
