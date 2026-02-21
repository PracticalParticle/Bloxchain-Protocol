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
     * @dev Counter to track the total number of clones created
     */
    uint256 private _cloneCount;

    /**
     * @dev Set to store all created clone addresses
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
        // Validate addresses
        SharedValidation.validateNotZeroAddress(bloxAddress);
        SharedValidation.validateNotZeroAddress(initialOwner);
        SharedValidation.validateNotZeroAddress(broadcaster);
        SharedValidation.validateNotZeroAddress(recovery);
        
        // Prevent cloning self
        if (bloxAddress == address(this)) {
            revert SharedValidation.InvalidAddress(bloxAddress);
        }
        
        // Validate that bloxAddress is a contract
        if (bloxAddress.code.length == 0) {
            revert SharedValidation.InvalidAddress(bloxAddress);
        }
        
        // Verify that the blox contract implements IBaseStateMachine interface
        if (!bloxAddress.supportsInterface(type(IBaseStateMachine).interfaceId)) {
            revert SharedValidation.InvalidOperation(bloxAddress);
        }
        
        // Check for overflow on clone count
        if (_cloneCount == type(uint256).max) {
            revert SharedValidation.OperationFailed();
        }
        
        // CHECKS: All validations complete
        
        // EFFECTS: Update state before external calls (CEI pattern)
        uint256 newCloneCount = _cloneCount + 1;
        _cloneCount = newCloneCount;
        
        // Clone the blox contract using EIP-1167 minimal proxy pattern
        cloneAddress = Clones.clone(bloxAddress);
        
        // Add clone to the set (before initialization call)
        _clones.add(cloneAddress);
        
        // INTERACTIONS: External calls after state updates
        // Set eventForwarder to CopyBlox address to centralize events from clones
        address eventForwarder = address(this);
        
        // Initialize the cloned contract
        // We use a low-level call to handle any initialize function signature
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
        
        if (!success) {
            // Revert state changes on failure
            _clones.remove(cloneAddress);
            _cloneCount = newCloneCount - 1;
            revert SharedValidation.OperationFailed();
        }
        
        emit BloxCloned(bloxAddress, cloneAddress, initialOwner, newCloneCount);
        
        return cloneAddress;
    }

    /**
     * @notice Get the total number of clones created
     * @return The total number of clones created by this CopyBlox instance
     */
    function getCloneCount() external view returns (uint256) {
        return _cloneCount;
    }

    /**
     * @notice Get all clone addresses
     * @return An array of all clone addresses created by this CopyBlox instance
     */
    function getAllClones() external view returns (address[] memory) {
        return _clones.values();
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
     * @notice Get the total number of clones in the set
     * @return The number of clones in the enumerable set
     * @dev This should match getCloneCount() but uses the set length
     */
    function getClonesLength() external view returns (uint256) {
        return _clones.length();
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
        // Verify that the caller is a clone created by this CopyBlox
        require(_clones.contains(msg.sender), "CopyBlox: Only clones can forward events");
        
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
