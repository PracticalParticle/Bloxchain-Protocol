# Solidity API

# SimpleVault






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

### getTokenBalance

```solidity
function getTokenBalance(address token) public view returns (uint256)
```



**Parameters:**
- `` (): Token address



---

### withdrawEthRequest

```solidity
function withdrawEthRequest(address to, uint256 amount) public nonpayable returns (struct EngineBlox.TxRecord)
```



**Parameters:**
- `` (): Recipient address
- `` (): Amount of ETH to withdraw



---

### withdrawTokenRequest

```solidity
function withdrawTokenRequest(address token, address to, uint256 amount) public nonpayable returns (struct EngineBlox.TxRecord)
```



**Parameters:**
- `` (): Token address
- `` (): Recipient address
- `` (): Amount of tokens to withdraw



---

### approveWithdrawalAfterDelay

```solidity
function approveWithdrawalAfterDelay(uint256 txId) public nonpayable returns (struct EngineBlox.TxRecord)
```



**Parameters:**
- `` (): The ID of the withdrawal transaction to approve



---

### approveWithdrawalWithMetaTx

```solidity
function approveWithdrawalWithMetaTx(struct EngineBlox.MetaTransaction metaTx) public nonpayable returns (struct EngineBlox.TxRecord)
```



**Parameters:**
- `` (): Meta transaction data



---

### cancelWithdrawal

```solidity
function cancelWithdrawal(uint256 txId) public nonpayable returns (struct EngineBlox.TxRecord)
```



**Parameters:**
- `` (): The ID of the withdrawal transaction to cancel



---

### executeWithdrawEth

```solidity
function executeWithdrawEth(address payable to, uint256 amount) external nonpayable
```

External function that can only be called by the contract itself to execute ETH withdrawal

**Parameters:**
- `` (): Recipient address
- `` (): Amount to withdraw



---

### executeWithdrawToken

```solidity
function executeWithdrawToken(address token, address to, uint256 amount) external nonpayable
```

External function that can only be called by the contract itself to execute token withdrawal

**Parameters:**
- `` (): Token address
- `` (): Recipient address
- `` (): Amount to withdraw



---

### _withdrawEth

```solidity
function _withdrawEth(address payable to, uint256 amount) internal nonpayable
```

Internal function to withdraw ETH

**Parameters:**
- `` (): Recipient address
- `` (): Amount to withdraw



---

### _withdrawToken

```solidity
function _withdrawToken(address token, address to, uint256 amount) internal nonpayable
```

Internal function to withdraw tokens

**Parameters:**
- `` (): Token address
- `` (): Recipient address
- `` (): Amount to withdraw



---

### generateUnsignedWithdrawalMetaTxApproval

```solidity
function generateUnsignedWithdrawalMetaTxApproval(uint256 txId, struct SimpleVault.VaultMetaTxParams metaTxParams) public view returns (struct EngineBlox.MetaTransaction)
```



**Parameters:**
- `` (): The ID of the existing withdrawal transaction
- `` (): Parameters for the meta-transaction

**Returns:**
- MetaTransaction The unsigned meta-transaction ready for signing


---

### _updateTimeLockPeriod

```solidity
function _updateTimeLockPeriod(uint256 newTimeLockPeriodSec) internal nonpayable
```

Internal function to update the timelock period with validation

**Parameters:**
- `` (): The new timelock period in seconds



---


## Events

### EthWithdrawn

```solidity
event EthWithdrawn(address to, uint256 amount)
```




---

### TokenWithdrawn

```solidity
event TokenWithdrawn(address token, address to, uint256 amount)
```




---

### EthReceived

```solidity
event EthReceived(address from, uint256 amount)
```




---


## Structs


## Enums


