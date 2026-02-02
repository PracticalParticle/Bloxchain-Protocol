# Solidity API

# AccountBlox

Complete controller implementation using GuardController, RuntimeRBAC, and SecureOwnable

This contract combines:
- GuardController: Execution workflows and time-locked transactions
- RuntimeRBAC: Runtime role creation and management
- SecureOwnable: Secure ownership transfer and management




## Functions

### initialize

```solidity
function initialize(address initialOwner, address broadcaster, address recovery, uint256 timeLockPeriodSec, address eventForwarder) public nonpayable
```



**Parameters:**
- `` (): The initial owner address
- `` (): The broadcaster address
- `` (): The recovery address
- `` (): The timelock period in seconds
- `` (): The event forwarder address (optional)



---

### supportsInterface

```solidity
function supportsInterface(bytes4 interfaceId) public view returns (bool)
```

See {IERC165-supportsInterface}.




---

### deposit

```solidity
function deposit() external payable
```






---

### fallback

```solidity
function fallback() external payable
```

Fallback function to reject accidental calls




---

### receive

```solidity
function receive() external payable
```






---


## Events

### EthReceived

```solidity
event EthReceived(address from, uint256 amount)
```

Explicit deposit function for ETH deposits


---


## Structs


## Enums


