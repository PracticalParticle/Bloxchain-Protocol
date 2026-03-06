# Solidity API

# AccountBlox

Complete controller implementation using the Account pattern (GuardController, RuntimeRBAC, SecureOwnable).

This contract delegates all behavior to Account:
- GuardController: Execution workflows and time-locked transactions
- RuntimeRBAC: Runtime role creation and management
- SecureOwnable: Secure ownership transfer and management

Top-level initializer: only concrete contracts (AccountBlox) use the initializer modifier;
Account.initialize uses onlyInitializing and is invoked from here.




## Functions

### initialize

```solidity
function initialize(address initialOwner, address broadcaster, address recovery, uint256 timeLockPeriodSec, address eventForwarder) public nonpayable
```






---


## Events


## Structs


## Enums


