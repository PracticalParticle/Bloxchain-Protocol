// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import "../CommonBase.sol";
import "../../../contracts/core/lib/EngineBlox.sol";
import "../../../contracts/utils/SharedValidation.sol";
import "../../../contracts/examples/templates/ControlBlox.sol";
import "../helpers/MockContracts.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/**
 * @title ComprehensiveInitializationFuzzTest
 * @dev Comprehensive fuzz tests covering ALL initialization and upgrade attack vectors
 * 
 * This test suite covers:
 * - Multiple initialization attacks
 * - Uninitialized state exploitation
 * - Initialization parameter manipulation
 * - Storage layout collision (documentation only)
 * 
 * Based on: ATTACK_VECTORS_CODEX.md Section 12
 */
contract ComprehensiveInitializationFuzzTest is CommonBase {
    ControlBlox public uninitializedContract;
    
    function setUp() public override {
        super.setUp();
        // Deploy but don't initialize a new contract for uninitialized tests
        uninitializedContract = new ControlBlox();
    }

    // ============ MULTIPLE INITIALIZATION ATTACKS ============

    /**
     * @dev Test: Multiple initialization prevention
     * Attack Vector: Multiple Initialization Attack (CRITICAL)
     * ID: INIT-001
     * 
     * Note: ControlBlox uses OpenZeppelin's initializer modifier which prevents
     * re-initialization. This test verifies the protection works.
     */
    function testFuzz_MultipleInitializationPrevented(
        address attackerOwner,
        address attackerBroadcaster,
        address attackerRecovery
    ) public {
        vm.assume(attackerOwner != address(0));
        vm.assume(attackerBroadcaster != address(0));
        vm.assume(attackerRecovery != address(0));
        vm.assume(attackerOwner != owner);
        vm.assume(attackerBroadcaster != broadcaster);
        vm.assume(attackerRecovery != recovery);
        
        // Create new contract instance for this test
        ControlBlox testContract = new ControlBlox();
        
        // First initialization should succeed
        vm.prank(owner);
        testContract.initialize(
            owner,
            broadcaster,
            recovery,
            DEFAULT_TIMELOCK_PERIOD,
            address(0)
        );
        
        // Verify initialized
        assertTrue(_isInitialized(testContract), "Contract should be initialized");
        
        // Second initialization attempt should fail
        // OpenZeppelin's initializer modifier prevents re-initialization
        // It throws InvalidInitialization() error (no parameters)
        vm.prank(attackerOwner);
        // OpenZeppelin throws InvalidInitialization() when trying to re-initialize
        // Use bytes4(keccak256("InvalidInitialization()")) for error selector
        vm.expectRevert(bytes4(keccak256("InvalidInitialization()")));
        testContract.initialize(
            attackerOwner,
            attackerBroadcaster,
            attackerRecovery,
            DEFAULT_TIMELOCK_PERIOD,
            address(0)
        );
        
        // Verify owner unchanged
        assertEq(testContract.owner(), owner, "Owner should not change");
        assertTrue(testContract.owner() != attackerOwner, "Attacker should not become owner");
    }

    /**
     * @dev Test: Multiple initialization with same parameters
     * Attack Vector: Multiple Initialization Attack (CRITICAL)
     * ID: INIT-001
     * 
     * Note: OpenZeppelin's initializer modifier prevents re-initialization
     * regardless of parameters.
     */
    function testFuzz_MultipleInitializationWithSameParamsPrevented() public {
        // Create new contract instance for this test
        ControlBlox testContract = new ControlBlox();
        
        // First initialization
        vm.prank(owner);
        testContract.initialize(
            owner,
            broadcaster,
            recovery,
            DEFAULT_TIMELOCK_PERIOD,
            address(0)
        );
        
        // Attempt second initialization with same parameters
        // OpenZeppelin's initializer modifier prevents re-initialization
        // It throws InvalidInitialization() error (no parameters)
        vm.prank(owner);
        // OpenZeppelin throws InvalidInitialization() when trying to re-initialize
        // Use bytes4(keccak256("InvalidInitialization()")) for error selector
        vm.expectRevert(bytes4(keccak256("InvalidInitialization()")));
        testContract.initialize(
            owner,
            broadcaster,
            recovery,
            DEFAULT_TIMELOCK_PERIOD,
            address(0)
        );
    }

    // ============ UNINITIALIZED STATE EXPLOITATION ============

    /**
     * @dev Test: Uninitialized state exploitation prevention
     * Attack Vector: Uninitialized State Exploitation (HIGH)
     * ID: INIT-002
     * 
     * Note: Most functions are internal, so we test through public functions
     * that depend on initialization (like owner())
     */
    function testFuzz_UninitializedStateExploitationPrevented() public {
        // Attempt to access owner() on uninitialized contract
        // This will revert because contract is not initialized
        // The owner() function depends on initialized state
        vm.expectRevert();
        uninitializedContract.owner();
    }

    // ============ INITIALIZATION PARAMETER MANIPULATION ============

    /**
     * @dev Test: Zero owner address prevention
     * Attack Vector: Initialization Parameter Manipulation (MEDIUM)
     * ID: INIT-003
     */
    function testFuzz_ZeroOwnerAddressPrevented() public {
        ControlBlox newContract = new ControlBlox();
        vm.expectRevert(abi.encodeWithSelector(SharedValidation.InvalidAddress.selector, address(0)));
        newContract.initialize(
            address(0), // Zero owner
            broadcaster,
            recovery,
            DEFAULT_TIMELOCK_PERIOD,
            address(0)
        );
    }

    /**
     * @dev Test: Zero broadcaster address prevention
     * Attack Vector: Initialization Parameter Manipulation (MEDIUM)
     * ID: INIT-003
     */
    function testFuzz_ZeroBroadcasterAddressPrevented() public {
        ControlBlox newContract = new ControlBlox();
        vm.expectRevert(abi.encodeWithSelector(SharedValidation.InvalidAddress.selector, address(0)));
        newContract.initialize(
            owner,
            address(0), // Zero broadcaster
            recovery,
            DEFAULT_TIMELOCK_PERIOD,
            address(0)
        );
    }

    /**
     * @dev Test: Zero recovery address prevention
     * Attack Vector: Initialization Parameter Manipulation (MEDIUM)
     * ID: INIT-003
     */
    function testFuzz_ZeroRecoveryAddressPrevented() public {
        ControlBlox newContract = new ControlBlox();
        vm.expectRevert(abi.encodeWithSelector(SharedValidation.InvalidAddress.selector, address(0)));
        newContract.initialize(
            owner,
            broadcaster,
            address(0), // Zero recovery
            DEFAULT_TIMELOCK_PERIOD,
            address(0)
        );
    }

    /**
     * @dev Test: Zero time-lock period prevention
     * Attack Vector: Initialization Parameter Manipulation (MEDIUM)
     * ID: INIT-003
     * 
     * Note: validateTimeLockPeriod only checks for zero, not minimum value.
     * Some contracts may have additional minimum requirements.
     */
    function testFuzz_ZeroTimeLockPeriodPrevented() public {
        // Time-lock period cannot be zero
        ControlBlox newContract = new ControlBlox();
        vm.expectRevert(abi.encodeWithSelector(
            SharedValidation.TimeLockPeriodZero.selector,
            0
        ));
        newContract.initialize(
            owner,
            broadcaster,
            recovery,
            0, // Zero time-lock period
            address(0)
        );
    }

    /**
     * @dev Test: All zero addresses prevention
     * Attack Vector: Initialization Parameter Manipulation (MEDIUM)
     * ID: INIT-003
     */
    function testFuzz_AllZeroAddressesPrevented() public {
        ControlBlox newContract = new ControlBlox();
        vm.expectRevert(abi.encodeWithSelector(SharedValidation.InvalidAddress.selector, address(0)));
        newContract.initialize(
            address(0),
            address(0),
            address(0),
            DEFAULT_TIMELOCK_PERIOD,
            address(0)
        );
    }

    /**
     * @dev Test: Valid initialization succeeds
     * Attack Vector: Initialization Parameter Manipulation (MEDIUM)
     * ID: INIT-003
     * 
     * This test verifies that valid initialization parameters work correctly
     */
    function testFuzz_ValidInitializationSucceeds(
        address validOwner,
        address validBroadcaster,
        address validRecovery,
        uint256 timeLockPeriod
    ) public {
        vm.assume(validOwner != address(0));
        vm.assume(validBroadcaster != address(0));
        vm.assume(validRecovery != address(0));
        vm.assume(validOwner != validBroadcaster);
        vm.assume(validOwner != validRecovery);
        vm.assume(validBroadcaster != validRecovery);
        // Time-lock period must be >= 1 day
        timeLockPeriod = bound(timeLockPeriod, 86400, type(uint256).max);
        
        ControlBlox newContract = new ControlBlox();
        newContract.initialize(
            validOwner,
            validBroadcaster,
            validRecovery,
            timeLockPeriod,
            address(0)
        );
        
        // Verify initialization succeeded
        assertTrue(_isInitialized(newContract), "Contract should be initialized");
        assertEq(newContract.owner(), validOwner, "Owner should be set correctly");
        assertEq(newContract.getTimeLockPeriodSec(), timeLockPeriod, "Time-lock period should be set correctly");
    }

    // ============ HELPER FUNCTIONS ============

    /**
     * @dev Helper to check if contract is initialized
     */
    function _isInitialized(ControlBlox contractInstance) internal view returns (bool) {
        // Try to get owner - if initialized, this will return an address
        // If not initialized, it will revert
        try contractInstance.owner() returns (address) {
            return true;
        } catch {
            return false;
        }
    }
}
