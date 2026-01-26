// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";
import "../../core/base/BaseStateMachine.sol";
import "../../core/base/interface/IBaseStateMachine.sol";
import "../../utils/SharedValidation.sol";

/**
 * @title CopyBlox
 * @dev A simple blox that can clone other blox contracts and initialize them with user values
 * 
 * This contract provides functionality to:
 * - Clone any blox contract using EIP-1167 minimal proxy pattern
 * - Initialize the cloned contract with user-provided values
 * - Centralize events from clones by setting eventForwarder to CopyBlox address
 * - Ensure all clones implement at least IBaseStateMachine interface
 */
contract CopyBlox is BaseStateMachine {
    using Clones for address;
    using ERC165Checker for address;

    /**
     * @dev Counter to track the total number of clones created
     */
    uint256 private _cloneCount;

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
    ) external returns (address cloneAddress) {
        // Validate that bloxAddress is a contract
        require(bloxAddress.code.length > 0, "CopyBlox: Invalid blox address");
        
        // Verify that the blox contract implements IBaseStateMachine interface
        require(
            bloxAddress.supportsInterface(type(IBaseStateMachine).interfaceId),
            "CopyBlox: Blox must implement IBaseStateMachine"
        );
        
        // Clone the blox contract using EIP-1167 minimal proxy pattern
        cloneAddress = Clones.clone(bloxAddress);
        
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
        
        require(success, "CopyBlox: Initialization failed");
        
        // Increment clone counter
        _cloneCount++;
        
        emit BloxCloned(bloxAddress, cloneAddress, initialOwner, _cloneCount);
        
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
     * @dev Fallback function to reject accidental calls
     * @notice Prevents accidental ETH transfers and unknown function calls
     */
    fallback() external payable {
        revert SharedValidation.NotSupported();
    }

    receive() external payable {
        revert SharedValidation.NotSupported();
    }
}
