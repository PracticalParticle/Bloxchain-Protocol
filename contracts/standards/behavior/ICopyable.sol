// SPDX-License-Identifier: MPL-2.0
pragma solidity 0.8.33;

/**
 * @title ICopyable
 * @dev Interface for blox contracts that support generic cloning with custom init data.
 *
 * Bloxes implementing this interface can be cloned by factory patterns (e.g. CopyBlox,
 * FactoryBlox) and initialized in one call with owner/broadcaster/recovery/timelock/
 * eventForwarder plus arbitrary init data, or have clone-specific data set via
 * setCloneData.
 *
 * Use cases:
 * - Clone and init in one step: factory calls initializeWithData(..., initData).
 * - Clone with standard init then set clone data: factory calls initialize(...)
 *   then the deployer or factory calls setCloneData(initData).
 */
interface ICopyable {
    /**
     * @dev Full initialization with standard blox params and custom init data.
     * @param initialOwner The initial owner address
     * @param broadcaster The broadcaster address
     * @param recovery The recovery address
     * @param timeLockPeriodSec The timelock period in seconds
     * @param eventForwarder The event forwarder address (optional, use address(0) to skip)
     * @param initData Custom initialization data (e.g. ABI-encoded config) for this clone
     */
    function initializeWithData(
        address initialOwner,
        address broadcaster,
        address recovery,
        uint256 timeLockPeriodSec,
        address eventForwarder,
        bytes calldata initData
    ) external;
}
