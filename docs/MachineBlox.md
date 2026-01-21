# Solidity API

# MachineBlox

Complete controller implementation with hook management capabilities

This contract combines:
- GuardController: Execution workflows and time-locked transactions
- RuntimeRBAC: Runtime role creation and management
- SecureOwnable: Secure ownership transfer and management
- HookManager: External hook contract attachment for state machine actions




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

### _requestTransaction

```solidity
function _requestTransaction(address requester, address target, uint256 value, uint256 gasLimit, bytes32 operationType, bytes4 functionSelector, bytes params) internal nonpayable returns (struct StateAbstraction.TxRecord)
```






---

### _approveTransaction

```solidity
function _approveTransaction(uint256 txId) internal nonpayable returns (struct StateAbstraction.TxRecord)
```






---

### _approveTransactionWithMetaTx

```solidity
function _approveTransactionWithMetaTx(struct StateAbstraction.MetaTransaction metaTx) internal nonpayable returns (struct StateAbstraction.TxRecord)
```






---

### _cancelTransaction

```solidity
function _cancelTransaction(uint256 txId) internal nonpayable returns (struct StateAbstraction.TxRecord)
```






---

### _cancelTransactionWithMetaTx

```solidity
function _cancelTransactionWithMetaTx(struct StateAbstraction.MetaTransaction metaTx) internal nonpayable returns (struct StateAbstraction.TxRecord)
```






---

### _requestAndApproveTransaction

```solidity
function _requestAndApproveTransaction(struct StateAbstraction.MetaTransaction metaTx) internal nonpayable returns (struct StateAbstraction.TxRecord)
```






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


