// SPDX-License-Identifier: MPL-2.0
pragma solidity 0.8.34;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockERC20
 * @dev Simple ERC20 token for testing payment functionality
 */
contract MockERC20 is ERC20 {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        _mint(msg.sender, 1000000 * 10**18);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

/**
 * @title MockFeeOnTransferToken
 * @dev ERC20 that deducts a fee (1%) on transfer; recipient receives 99% of amount.
 *      Used to test fee-on-transfer token handling (UNEXPLORED_ATTACK_VECTORS.md §4.2).
 */
contract MockFeeOnTransferToken is ERC20 {
    uint256 public constant FEE_BPS = 100; // 1%
    address public feeRecipient;

    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        _mint(msg.sender, 1000000 * 10**18);
        feeRecipient = msg.sender;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function _update(address from, address to, uint256 value) internal override {
        if (from == address(0) || to == address(0)) {
            super._update(from, to, value);
            return;
        }
        uint256 fee = (value * FEE_BPS) / 10000;
        uint256 toAmount = value - fee;
        super._update(from, feeRecipient, fee);
        super._update(from, to, toAmount);
    }
}

/**
 * @title MockTarget
 * @dev Mock contract for testing execution functionality
 */
contract MockTarget {
    uint256 public value;
    address public caller;
    bytes public data;

    event Executed(address indexed caller, uint256 value, bytes data);

    function execute() external payable {
        value = msg.value;
        caller = msg.sender;
        data = msg.data;
        emit Executed(msg.sender, msg.value, msg.data);
    }

    function executeWithParams(uint256 param1, address param2) external payable {
        value = msg.value;
        caller = msg.sender;
        data = abi.encode(param1, param2);
        emit Executed(msg.sender, msg.value, data);
    }

    function revertOnCall() external pure {
        revert("MockTarget: Revert requested");
    }
}

/**
 * @title MockStorageWriter
 * @dev Target that writes to its own storage in execute(). Used to verify engine uses call() not delegatecall.
 *      If engine used delegatecall, engine's storage could be overwritten (UNEXPLORED_ATTACK_VECTORS.md §4.1).
 */
contract MockStorageWriter {
    bytes32 public slot0;

    function execute() external payable {
        slot0 = 0x0000000000000000000000000000000000000000000000000000000000000bad;
    }
}

/**
 * @title MockEventForwarder
 * @dev Mock event forwarder for testing event forwarding
 */
contract MockEventForwarder {
    event EventForwarded(bytes32 indexed eventType, bytes data);

    function forwardEvent(bytes32 eventType, bytes memory data) external {
        emit EventForwarded(eventType, data);
    }
}

/**
 * @title ReentrancyAttack
 * @dev Contract for testing reentrancy protection
 */
contract ReentrancyAttack {
    address public target;
    bytes4 public selector;
    bytes public data;

    function setAttack(address _target, bytes4 _selector, bytes memory _data) external {
        target = _target;
        selector = _selector;
        data = _data;
    }

    function attack() external {
        (bool success, ) = target.call(abi.encodeWithSelector(selector, data));
        require(success, "Attack failed");
    }

    receive() external payable {
        if (target != address(0)) {
            (bool success, ) = target.call(abi.encodeWithSelector(selector, data));
            if (success) {
                // Attempt reentrancy
            }
        }
    }
}
