# Solidity API

# ICopyable

Interface for blox contracts that support generic cloning with custom init data.

Bloxes implementing this interface can be cloned by factory patterns (e.g. CopyBlox,
FactoryBlox) and initialized in one call with owner/broadcaster/recovery/timelock/
eventForwarder plus arbitrary init data, or have clone-specific data set

Use cases:
- Clone and init in one step: factory calls initializeWithData(..., initData).
- Clone with standard init then set clone data: factory calls initializeWithData(...)




## Functions

### initializeWithData

```solidity
function initializeWithData(address initialOwner, address broadcaster, address recovery, uint256 timeLockPeriodSec, address eventForwarder, bytes initData) external nonpayable
```

Full initialization with standard blox params and custom init data.

**Parameters:**
- `` (): The initial owner address
- `` (): The broadcaster address
- `` (): The recovery address
- `` (): The timelock period in seconds
- `` (): The event forwarder address (optional, use address(0) to skip)
- `` (): Custom initialization data (e.g. ABI-encoded config) for this clone



---


## Events


## Structs


## Enums


