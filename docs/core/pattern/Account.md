# Solidity API

# Account

Abstract account pattern combining GuardController, RuntimeRBAC, and SecureOwnable.

Use this as the base for account-style contracts (e.g. AccountBlox) to avoid duplicating
initialization, interface support, and receive/fallback boilerplate.

Combines:
- GuardController: Execution workflows and time-locked transactions
- RuntimeRBAC: Runtime role creation and management
- SecureOwnable: Secure ownership transfer and management



**Security Contact:** security@particlecs.com

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

### receive

```solidity
function receive() external payable
```

Accepts plain ETH transfers (no calldata).



**Security:** No external calls—reentrancy-safe; outgoing ETH only via GuardController execution. Uses simple emit to stay within 2,300 gas stipend (transfer/send compatible).

---

### fallback

```solidity
function fallback() external payable
```

Rejects calls with unknown selector (with or without value).




---


## Events

### EthReceived

```solidity
event EthReceived(address sender, uint256 value)
```

Emitted when plain ETH is received (receive()).

**Parameters:**
- `` (): Address that sent the ETH
- `` (): Amount of wei received

---


## Structs


## Enums


