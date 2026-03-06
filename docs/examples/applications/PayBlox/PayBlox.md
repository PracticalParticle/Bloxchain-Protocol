# Solidity API

# PayBlox

A simple application that allows sending ETH to a destination address
using the payment management system from BaseStateMachine

This contract demonstrates:
- Creating payment requests with native token transfers via _requestTransactionWithPayment
- Maintaining a payment table visible only to the owner role
- Time-delay workflow for secure payment execution
- Simple accounting tool for tracking payments




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
- `` (): The event forwarder address



---

### receive

```solidity
function receive() external payable
```

Allows the contract to receive ETH




---

### getEthBalance

```solidity
function getEthBalance() public view returns (uint256)
```






---

### requestWithPayment

```solidity
function requestWithPayment(struct EngineBlox.PaymentDetails paymentDetails, string description) public nonpayable returns (uint256)
```



**Parameters:**
- `` (): The payment details including recipient and amounts
- `` (): Optional description/memo for accounting purposes

**Returns:**
- The transaction ID (use getTransaction(txId) for full record)


---

### approvePaymentAfterDelay

```solidity
function approvePaymentAfterDelay(uint256 txId) public nonpayable returns (uint256)
```



**Parameters:**
- `` (): The ID of the payment transaction to approve

**Returns:**
- The transaction ID


---

### cancelPayment

```solidity
function cancelPayment(uint256 txId) public nonpayable returns (uint256)
```



**Parameters:**
- `` (): The ID of the payment transaction to cancel

**Returns:**
- The transaction ID


---

### getPaymentRecord

```solidity
function getPaymentRecord(uint256 txId) public view returns (struct PayBlox.PaymentRecord)
```



**Parameters:**
- `` (): The transaction ID to get payment details for

**Returns:**
- The complete payment record with accounting information


---

### getPaymentRecords

```solidity
function getPaymentRecords(uint256[] txIds) public view returns (struct PayBlox.PaymentRecord[])
```



**Parameters:**
- `` (): Array of transaction IDs to retrieve

**Returns:**
- Array of payment records


---


## Events

### PaymentRequested

```solidity
event PaymentRequested(uint256 txId, address recipient, address requester, uint256 amount, uint256 timestamp, string description)
```




---

### PaymentExecuted

```solidity
event PaymentExecuted(uint256 txId, address recipient, uint256 amount, uint256 timestamp)
```




---

### PaymentCancelled

```solidity
event PaymentCancelled(uint256 txId, address recipient, uint256 amount, uint256 timestamp)
```




---

### EthReceived

```solidity
event EthReceived(address from, uint256 amount)
```




---


## Structs


## Enums


