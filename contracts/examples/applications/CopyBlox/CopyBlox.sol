// SPDX-License-Identifier: MIT
pragma solidity 0.8.35;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "../../../core/base/BaseStateMachine.sol";
import "../../../core/base/interface/IBaseStateMachine.sol";
import "../../../core/lib/EngineBlox.sol";
import "../../../core/lib/interfaces/IEventForwarder.sol";
import "../../../core/lib/utils/SharedValidation.sol";

/**
 * @title CopyBlox
 * @dev Example open factory: clone any `IBaseStateMachine` and initialize it in one call.
 *
 * This contract provides functionality to:
 * - Clone any blox contract using EIP-1167 minimal proxy pattern
 * - Initialize the cloned contract with caller-provided owner, broadcaster, recovery, and timelock
 * - Centralize events from clones by setting eventForwarder to CopyBlox address
 * - Implement IEventForwarder to receive and forward events from all clones
 * - Ensure all clones implement at least IBaseStateMachine interface
 * - Enumerate the clones created for a given initial owner (`clonesOf`)
 *
 * ## Intended use (developers / testing only)
 *
 * CopyBlox is an **example application** under `contracts/examples/applications/`. It is
 * **not** core protocol, **not** covered by the Nethermind core audit, and **must not** be
 * used as a production mint. Production integrators use **BasicFactory → BasicAccount**
 * (`contracts/factory/`, CreateX catalog). The published Sepolia address lives under
 * `networks.sepolia.developerTools` only; it is not exported from the Bloxchain TypeScript SDK.
 *
 * The open mint is deliberate for developer work: a caller may name **any** `initialOwner`
 * (mint for another entity), choose **recovery** and **broadcaster**, and pair with
 * templates such as `AccountBlox` that allow a **1-second** time-lock floor. BasicFactory
 * is intentionally more restrictive (self-owner mint, pinned BasicAccount, 1-day floor).
 * Do not "fix" CopyBlox into that model; document and accept the trust trade-offs below.
 *
 * ## Known risks and limitations (accepted)
 *
 * - **Permissionless provisioning.** Anyone may call `cloneBlox`. There is no
 *   `msg.sender == initialOwner` check. A third party can index a clone under an address
 *   they do not control and set recovery to an address they do control.
 * - **Recovery is powerful.** On SecureOwnable-based clones, the recovery role can drive
 *   ownership transfer. Only pass recovery addresses you trust for that clone.
 * - **Index is not custody.** `clonesOf(initialOwner)` / `BloxCloned` list clones *created
 *   for* that owner argument. They do not prove the named party requested or funded the
 *   clone. Never treat the index alone as "my accounts"; verify `owner()`, roles, and
 *   recovery on-chain before sending value.
 * - **Short timelock.** Pairing with AccountBlox (1-second floor) is for lab loops, not
 *   production security assumptions.
 *
 * The clone + owner-index + event-forwarding API stays additive for already-deployed
 * factories; storage layout is preserved. CopyBlox must not move into `contracts/core`.
 *
 * A CopyBlox instance is deliberately **not** an account. It answers ERC-165
 * `IBaseStateMachine` (it inherits `BaseStateMachine`) but it never answers
 * `ISecureOwnable`, and while it is left uninitialized `owner()` reverts and
 * `initialized()` is false. Integrators must therefore gate "is this an account I can
 * load?" on `getCode` + `owner()` + `initialized()` + ERC-165 `ISecureOwnable`, never
 * on `IBaseStateMachine` alone, or they will adopt the factory as an account.
 * See the SDK helper `isAccountBlox` and `docs/account-pattern.md`.
 *
 * ## Gas
 *
 * `cloneBlox` against the `AccountBlox` template costs ~16.2 M gas, against a public
 * per-transaction cap of 2^24 = 16,777,216 (EIP-7825). Send it with an explicit gas
 * limit at the cap, never with a bare estimate. See `docs/getting-started.md`.
 */
contract CopyBlox is BaseStateMachine, IEventForwarder {
    using Clones for address;
    using ERC165Checker for address;
    using EnumerableSet for EnumerableSet.AddressSet;

    /**
     * @dev Set to store all created clone addresses (length used as clone count)
     */
    EnumerableSet.AddressSet private _clones;

    /**
     * @dev Clones created for each initial owner, in creation order.
     * @notice Keyed by the `initialOwner` passed to `cloneBlox`, which is the owner the
     *         clone was initialized with. It is **not** re-keyed when a clone later
     *         transfers ownership through `SecureOwnable`, so a consumer that needs
     *         current ownership must still read `owner()` on each entry.
     * @dev Consumes one slot from `__gap` (50 -> 49) so the storage layout of already
     *      deployed CopyBlox instances is unchanged.
     */
    mapping(address => address[]) private _clonesByOwner;

    /**
     * @dev Event emitted when a blox is cloned
     * @param original The address of the original blox contract
     * @param clone The address of the cloned blox contract
     * @param initialOwner The initial owner of the cloned blox
     * @param cloneNumber The sequential number of this clone
     */
    event BloxCloned(
        address indexed original,
        address indexed clone,
        address indexed initialOwner,
        uint256 cloneNumber
    );

    /**
     * @notice Initializer to initialize CopyBlox
     * @param initialOwner The initial owner address
     * @param broadcaster The broadcaster address
     * @param recovery The recovery address
     * @param timeLockPeriodSec The timelock period in seconds
     * @param eventForwarder The event forwarder address (optional)
     */
    function initialize(
        address initialOwner,
        address broadcaster,
        address recovery,
        uint256 timeLockPeriodSec,
        address eventForwarder
    ) public virtual initializer {
        _initializeBaseStateMachine(
            initialOwner,
            broadcaster,
            recovery,
            timeLockPeriodSec,
            eventForwarder
        );
    }

    /**
     * @notice Clone a blox and initialize it (open factory: any caller, any owner).
     * @dev Developer / test path only. Does **not** require `msg.sender == initialOwner`.
     *      Caller chooses recovery and timelock; see contract-level known risks. Production
     *      mint is BasicFactory (self-owner). Event forwarder is this CopyBlox.
     * @param bloxAddress The address of the blox contract to clone
     * @param initialOwner The initial owner address for the cloned blox (need not be caller)
     * @param broadcaster The broadcaster address for the cloned blox
     * @param recovery The recovery address for the cloned blox (trusted; can move ownership)
     * @param timeLockPeriodSec The timelock period in seconds for the cloned blox
     * @return cloneAddress The address of the newly cloned blox contract
     */
    function cloneBlox(
        address bloxAddress,
        address initialOwner,
        address broadcaster,
        address recovery,
        uint256 timeLockPeriodSec
    ) external nonReentrant returns (address cloneAddress) {
        SharedValidation.validateNotZeroAddress(initialOwner);
        SharedValidation.validateNotZeroAddress(broadcaster);
        SharedValidation.validateNotZeroAddress(recovery);

        _validateBloxImplementation(bloxAddress); // rejects zero (code.length==0), self, non-contract, non-IBaseStateMachine

        // Clone first, then register before initialize so any reentrant read of the
        // indexes sees a consistent set. A failed initialize reverts the registrations.
        cloneAddress = Clones.clone(bloxAddress);
        _clones.add(cloneAddress);
        _clonesByOwner[initialOwner].push(cloneAddress);

        address eventForwarder = address(this);
        (bool success, ) = cloneAddress.call(
            abi.encodeWithSignature(
                "initialize(address,address,address,uint256,address)",
                initialOwner,
                broadcaster,
                recovery,
                timeLockPeriodSec,
                eventForwarder
            )
        );
        if (!success) revert SharedValidation.OperationFailed();

        emit BloxCloned(bloxAddress, cloneAddress, initialOwner, _clones.length());
        return cloneAddress;
    }

    /**
     * @dev Validates that an address is not zero, not this contract, has code, and implements IBaseStateMachine.
     */
    function _validateBloxImplementation(address bloxAddress) internal view {
        if (bloxAddress == address(this)) revert SharedValidation.InvalidAddress(bloxAddress);
        if (bloxAddress.code.length == 0) revert SharedValidation.InvalidAddress(bloxAddress);
        if (!bloxAddress.supportsInterface(type(IBaseStateMachine).interfaceId)) {
            revert SharedValidation.InvalidOperation(bloxAddress);
        }
    }

    /**
     * @notice Get the total number of clones created
     * @return The total number of clones created by this CopyBlox instance
     */
    function getCloneCount() external view returns (uint256) {
        return _clones.length();
    }

    /**
     * @notice Get a clone address at a specific index
     * @param index The index of the clone to retrieve
     * @return The clone address at the specified index
     */
    function getCloneAtIndex(uint256 index) external view returns (address) {
        return _clones.at(index);
    }

    /**
     * @notice Check if an address is a clone created by this CopyBlox
     * @param cloneAddress The address to check
     * @return True if the address is a clone, false otherwise
     */
    function isClone(address cloneAddress) external view returns (bool) {
        return _clones.contains(cloneAddress);
    }

    /**
     * @notice Get every clone this CopyBlox created for an initial owner
     * @param initialOwner The initial owner to look up
     * @return The clone addresses created for that owner, in creation order
     * @dev Returns all of them, not only the most recent one: an owner may hold several
     *      accounts, and picking "the latest `BloxCloned` log" silently strands the rest.
     *      The key is the owner the clone was initialized with; verify `owner()` on an
     *      entry before treating it as currently owned.
     */
    function clonesOf(address initialOwner) external view returns (address[] memory) {
        return _clonesByOwner[initialOwner];
    }

    /**
     * @notice Get the number of clones created for an initial owner
     * @param initialOwner The initial owner to look up
     * @return The number of clones created for that owner
     */
    function clonesOfCount(address initialOwner) external view returns (uint256) {
        return _clonesByOwner[initialOwner].length;
    }

    /**
     * @notice Get one clone created for an initial owner, by index
     * @param initialOwner The initial owner to look up
     * @param index The index into that owner's clone list (creation order)
     * @return The clone address at the specified index
     * @dev Reverts on an out-of-range index, matching `getCloneAtIndex`.
     */
    function cloneOfOwnerAt(address initialOwner, uint256 index) external view returns (address) {
        address[] storage clonesForOwner = _clonesByOwner[initialOwner];
        if (index >= clonesForOwner.length) revert SharedValidation.InvalidOperation(initialOwner);
        return clonesForOwner[index];
    }

    // ============ IEventForwarder IMPLEMENTATION ============

    /**
     * @dev Event emitted when a transaction event is forwarded from a clone
     * @param cloneAddress The address of the clone that emitted the event
     * @param txId The transaction ID
     * @param functionSelector The function selector for the event
     * @param status The transaction status
     * @param requester The address of the requester
     * @param target The target contract address
     * @param operationType The type of operation
     */
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
     * @notice Forward a transaction event from a deployed clone instance
     * @param txId The transaction ID
     * @param functionSelector The function selector for the event (bytes4)
     * @param status The transaction status
     * @param requester The address of the requester
     * @param target The target contract address
     * @param operationType The type of operation
     * @dev This function is called by clones to forward their events to CopyBlox
     * @dev Only clones created by this CopyBlox can forward events
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
        if (!_clones.contains(msg.sender)) revert SharedValidation.NoPermission(msg.sender);
        
        // Emit event with clone address for tracking
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
        
        // If CopyBlox itself has an eventForwarder, forward the event further
        // This allows chaining event forwarders
        address eventForwarder = _secureState.eventForwarder;
        if (eventForwarder != address(0) && eventForwarder != address(this)) {
            try IEventForwarder(eventForwarder).forwardTxEvent(
                txId,
                functionSelector,
                status,
                requester,
                target,
                operationType,
                resultHash
            ) {
                // Event forwarded successfully
            } catch {
                // Forwarding failed, continue execution (non-critical operation)
            }
        }
    }

    /**
     * @dev Fallback function to reject accidental calls
     * @notice Prevents accidental ETH transfers and unknown function calls
     */
    fallback() external payable {
        revert SharedValidation.NotSupported();
    }

    receive() external payable {
        revert SharedValidation.NotSupported();
    }
    
    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     * @dev 50 -> 49: `_clonesByOwner` (SPEC-2026-0118) took one slot from this gap so the
     *      layout of already deployed CopyBlox instances is preserved.
     */
    uint256[49] private __gap;
}
