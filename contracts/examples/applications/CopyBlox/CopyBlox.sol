// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

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
 * @dev A simple blox that can clone other blox contracts and initialize them with user values
 * 
 * This contract provides functionality to:
 * - Clone any blox contract using EIP-1167 minimal proxy pattern
 * - Initialize the cloned contract with user-provided values
 * - Centralize events from clones by setting eventForwarder to CopyBlox address
 * - Implement IEventForwarder to receive and forward events from all clones
 * - Ensure all clones implement at least IBaseStateMachine interface
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
     * @notice Clone a blox contract and initialize it with user values
     * @param bloxAddress The address of the blox contract to clone
     * @param initialOwner The initial owner address for the cloned blox
     * @param broadcaster The broadcaster address for the cloned blox
     * @param recovery The recovery address for the cloned blox
     * @param timeLockPeriodSec The timelock period in seconds for the cloned blox
     * @return cloneAddress The address of the newly cloned blox contract
     * @notice The eventForwarder is automatically set to CopyBlox address to centralize events
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

        // Clone first (no state change yet)
        cloneAddress = Clones.clone(bloxAddress);
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

        _clones.add(cloneAddress);
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
        bytes32 operationType
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
        bytes32 operationType
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
            operationType
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
                operationType
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
     */
    uint256[50] private __gap;
}
