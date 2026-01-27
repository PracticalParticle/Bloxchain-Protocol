// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import "../../../contracts/core/base/BaseStateMachine.sol";
import "../../../contracts/core/lib/EngineBlox.sol";
import "../../../contracts/utils/SharedValidation.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/**
 * @title TestStateMachine
 * @dev Helper contract for testing definition loading
 * This contract extends BaseStateMachine and provides a testFunction() that exists in bytecode
 * It allows testing _loadDefinitions with various definition contracts
 */
contract TestStateMachine is BaseStateMachine {
    
    /**
     * @dev Test function that exists in contract bytecode
     * This function is used to test the protection validation mechanism
     * Using a simple function that will definitely be in the dispatch table
     */
    function testFunction() external pure returns (bool) {
        return true;
    }
    
    /**
     * @dev Another test function to ensure we have multiple functions
     */
    function anotherTestFunction() external pure returns (uint256) {
        return 42;
    }
    
    /**
     * @dev Initialize the state machine without loading definitions
     * This allows us to test definition loading separately
     */
    function initializeBaseOnly(
        address initialOwner,
        address broadcaster,
        address recovery,
        uint256 timeLockPeriodSec,
        address eventForwarder
    ) external initializer {
        _initializeBaseStateMachine(initialOwner, broadcaster, recovery, timeLockPeriodSec, eventForwarder);
    }
    
    /**
     * @dev Public function to load definitions for testing
     * This exposes _loadDefinitions so we can test it with various definition contracts
     */
    function loadDefinitionsForTesting(
        EngineBlox.FunctionSchema[] memory functionSchemas,
        bytes32[] memory roleHashes,
        EngineBlox.FunctionPermission[] memory functionPermissions
    ) external {
        _loadDefinitions(functionSchemas, roleHashes, functionPermissions);
    }
    
    /**
     * @dev Helper to check if a selector exists in this contract's bytecode
     */
    function checkSelectorExists(bytes4 selector) external view returns (bool) {
        return EngineBlox.selectorExistsInContract(address(this), selector);
    }
}
