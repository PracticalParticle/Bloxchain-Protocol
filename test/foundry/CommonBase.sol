// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import "forge-std/Test.sol";
import "../../contracts/core/lib/EngineBlox.sol";
import "../../contracts/core/access/interface/IRuntimeRBAC.sol";
import "../../contracts/core/access/lib/definitions/RuntimeRBACDefinitions.sol";
import "../../contracts/core/execution/lib/definitions/GuardControllerDefinitions.sol";
import "../../contracts/core/security/lib/definitions/SecureOwnableDefinitions.sol";
import "../../contracts/examples/templates/SecureBlox.sol";
import "../../contracts/examples/templates/RoleBlox.sol";
import "../../contracts/examples/templates/AccountBlox.sol";
import "./helpers/MockContracts.sol";
import "./helpers/TestHelpers.sol";

/**
 * @title CommonBase
 * @dev Base test contract with fixtures and helper setup
 */
contract CommonBase is Test {
    // Test accounts
    address public owner;
    address public broadcaster;
    address public recovery;
    address public attacker;
    address public user1;
    address public user2;
    address public user3;
    address public user4;
    address public user5;

    // Deployed contracts
    SecureBlox public secureBlox;
    RoleBlox public roleBlox;
    AccountBlox public accountBlox;

    // Mock contracts
    MockERC20 public mockERC20;
    MockTarget public mockTarget;
    MockEventForwarder public mockEventForwarder;
    
    // Meta-transaction signer helper
    MetaTxSigner public metaTxSigner;

    // Constants
    uint256 public constant DEFAULT_TIMELOCK_PERIOD = 3600; // 1 hour
    bytes32 public constant OWNER_ROLE = EngineBlox.OWNER_ROLE;
    bytes32 public constant BROADCASTER_ROLE = EngineBlox.BROADCASTER_ROLE;
    bytes32 public constant RECOVERY_ROLE = EngineBlox.RECOVERY_ROLE;

    // SecureOwnable operation types
    bytes32 public constant OWNERSHIP_TRANSFER = keccak256("OWNERSHIP_TRANSFER");
    bytes32 public constant BROADCASTER_UPDATE = keccak256("BROADCASTER_UPDATE");
    bytes32 public constant RECOVERY_UPDATE = keccak256("RECOVERY_UPDATE");
    bytes32 public constant TIMELOCK_UPDATE = keccak256("TIMELOCK_UPDATE");

    // Function selectors
    bytes4 public constant TRANSFER_OWNERSHIP_SELECTOR = bytes4(keccak256("executeTransferOwnership(address)"));
    bytes4 public constant UPDATE_BROADCASTER_SELECTOR = bytes4(keccak256("executeBroadcasterUpdate(address,uint256)"));
    bytes4 public constant UPDATE_RECOVERY_SELECTOR = bytes4(keccak256("executeRecoveryUpdate(address)"));
    bytes4 public constant UPDATE_TIMELOCK_SELECTOR = bytes4(keccak256("executeTimeLockUpdate(uint256)"));

    // Setup function - called before each test
    function setUp() public virtual {
        // Create test accounts using vm.addr() to ensure addresses match private keys for signing
        // Private keys: 1, 2, 3 for owner, broadcaster, recovery
        owner = vm.addr(1);
        broadcaster = vm.addr(2);
        recovery = vm.addr(3);
        attacker = address(0x999);
        user1 = address(0x10);
        user2 = address(0x11);
        user3 = address(0x12);
        user4 = address(0x13);
        user5 = address(0x14);

        // Fund test accounts
        vm.deal(owner, 100 ether);
        vm.deal(broadcaster, 100 ether);
        vm.deal(recovery, 100 ether);
        vm.deal(attacker, 100 ether);
        vm.deal(user1, 100 ether);
        vm.deal(user2, 100 ether);
        vm.deal(user3, 100 ether);
        vm.deal(user4, 100 ether);
        vm.deal(user5, 100 ether);

        // Deploy mock contracts
        mockERC20 = new MockERC20("Test Token", "TEST");
        mockTarget = new MockTarget();
        mockEventForwarder = new MockEventForwarder();
        metaTxSigner = new MetaTxSigner();

        // Deploy and initialize SecureBlox
        secureBlox = new SecureBlox();
        vm.prank(owner);
        secureBlox.initialize(
            owner,
            broadcaster,
            recovery,
            DEFAULT_TIMELOCK_PERIOD,
            address(mockEventForwarder)
        );

        // Deploy and initialize RoleBlox
        roleBlox = new RoleBlox();
        vm.prank(owner);
        roleBlox.initialize(
            owner,
            broadcaster,
            recovery,
            DEFAULT_TIMELOCK_PERIOD,
            address(mockEventForwarder)
        );

        // Deploy and initialize AccountBlox
        accountBlox = new AccountBlox();
        vm.prank(owner);
        accountBlox.initialize(
            owner,
            broadcaster,
            recovery,
            DEFAULT_TIMELOCK_PERIOD,
            address(mockEventForwarder)
        );
    }

    // Helper functions
    function advanceTime(uint256 seconds_) internal {
        vm.warp(block.timestamp + seconds_);
    }

    function getRoleHash(string memory roleName) internal pure returns (bytes32) {
        return keccak256(bytes(roleName));
    }

    function getFunctionSelector(string memory signature) internal pure returns (bytes4) {
        return bytes4(keccak256(bytes(signature)));
    }

    function expectRevertWithSelector(bytes4 selector) internal {
        vm.expectRevert(abi.encodeWithSelector(selector));
    }

    function expectRevertWithCustomError(bytes4 errorSelector) internal {
        vm.expectRevert(abi.encodeWithSelector(errorSelector));
    }
}
