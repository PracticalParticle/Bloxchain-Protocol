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
 * `cloneBlox` has no implementation argument, so there is no way to mint anything else from
 * this factory. There is no owner, no role, no timelock and no whitelist to change.
 * A new template means a new factory. `BasicAccount` is the intended canonical pin; the
 * 1-day floor is enforced by that account, not by this factory.
 *
 * `cloneBlox` is permissionless and follows the CopyBlox sequence: EIP-1167 clone, record
 * the clone, `initialize(address,address,address,uint256,address)` in the same transaction
 * with this factory as the clone's event forwarder, then `BloxCloned`. A failed initialize
 * reverts the whole mint. The only lineage record is whether this factory minted that address.
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
 * one lineage write. Against `BasicAccount` it sits under the public per-transaction cap of
 * 2^24 = 16,777,216 (EIP-7825); `test/foundry/unit/BasicFactory.t.sol` records the number.
 * Send `cloneBlox` with an explicit gas limit of `16777216`, never a bare estimate. See
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
     * @param initialOwner The initial owner address for the clone
     * @param broadcaster The broadcaster address for the clone
     * @param recovery The recovery address for the clone
     * @param timeLockPeriodSec The timelock period in seconds (`BasicAccount` accepts 1 day to 90 days)
     * @return cloneAddress The address of the new clone
     * @dev Registration happens before initialize so the clone can forward events during its
     *      own initialize; a failed initialize reverts the registration. Send with gas limit
     *      `16777216`.
     */
    function cloneBlox(
        address initialOwner,
        address broadcaster,
        address recovery,
        uint256 timeLockPeriodSec
    ) external nonReentrant returns (address cloneAddress) {
        SharedValidation.validateNotZeroAddress(initialOwner);
        SharedValidation.validateNotZeroAddress(broadcaster);
        SharedValidation.validateNotZeroAddress(recovery);

        address source = implementation;
        cloneAddress = Clones.clone(source);
        _isClone[cloneAddress] = true;

        (bool success, ) = cloneAddress.call(
            abi.encodeCall(
                IGuardController.initialize,
                (initialOwner, broadcaster, recovery, timeLockPeriodSec, address(this))
            )
        );
        if (!success) revert SharedValidation.OperationFailed();

        emit BloxCloned(source, cloneAddress, initialOwner);
    }

    // ============ VIEWS ============

    /**
     * @notice True when `cloneAddress` was minted by this factory.
     * @dev Lineage of this factory only; see the contract-level lineage claim.
     */
    function isClone(address cloneAddress) external view returns (bool) {
        return _isClone[cloneAddress];
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
}
