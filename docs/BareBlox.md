# Solidity API

# BareBlox

A minimal implementation using only BaseStateMachine for core state machine functionality

This contract provides the most basic state abstraction implementation using only
the core state machine capabilities from BaseStateMachine. It includes:
- Basic initialization with core roles (owner, broadcaster, recovery)
- Time-lock period configuration
- Event forwarding support
- All core state machine functionality (meta-transactions, state queries, etc.)

This is the minimal viable implementation for applications that only need
the core state machine functionality without additional security features.




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


## Events


## Structs


## Enums


