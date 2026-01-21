# Solidity API

# RoleBlox

A basic implementation of state abstraction with runtime role-based access control using RuntimeRBAC and SecureOwnable

This contract combines both RuntimeRBAC and SecureOwnable functionality:
- RuntimeRBAC provides runtime role creation and management
- SecureOwnable provides secure ownership transfer and management
- Both inherit from BaseStateMachine, ensuring proper initialization order




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


## Events


## Structs


## Enums


