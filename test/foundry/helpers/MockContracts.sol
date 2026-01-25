// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

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
