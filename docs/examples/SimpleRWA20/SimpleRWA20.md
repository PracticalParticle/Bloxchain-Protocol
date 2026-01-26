# Solidity API

# SimpleRWA20

A secure ERC20 token for real-world assets with enhanced security via Guardian.
Uses EngineBlox for mint and burn operations, restricted to broadcaster.
Implements ERC20Burnable for secure burn operations with allowance checks.




## Functions

### initialize

```solidity
function initialize(string name, string symbol, address initialOwner, address broadcaster, address recovery, uint256 timeLockPeriodSec, address eventForwarder) public nonpayable
```



**Parameters:**
- `` (): The name of the token
- `` (): The symbol of the token
- `` (): The initial owner address
- `` (): The broadcaster address
- `` (): The recovery address
- `` (): The timelock period in seconds



---

### mintWithMetaTx

```solidity
function mintWithMetaTx(struct EngineBlox.MetaTransaction metaTx) public nonpayable returns (struct EngineBlox.TxRecord)
```



**Parameters:**
- `` (): Meta transaction data containing mint parameters

**Returns:**
- The transaction record


---

### burnWithMetaTx

```solidity
function burnWithMetaTx(struct EngineBlox.MetaTransaction metaTx) public nonpayable returns (struct EngineBlox.TxRecord)
```



**Parameters:**
- `` (): Meta transaction data containing burn parameters

**Returns:**
- The transaction record


---

### generateUnsignedMintMetaTx

```solidity
function generateUnsignedMintMetaTx(address to, uint256 amount, struct SimpleRWA20.TokenMetaTxParams params) public view returns (struct EngineBlox.MetaTransaction)
```



**Parameters:**
- `` (): Recipient address
- `` (): Amount of tokens to mint
- `` (): Parameters for the meta-transaction

**Returns:**
- MetaTransaction The unsigned meta-transaction ready for signing


---

### generateUnsignedBurnMetaTx

```solidity
function generateUnsignedBurnMetaTx(address from, uint256 amount, struct SimpleRWA20.TokenMetaTxParams params) public view returns (struct EngineBlox.MetaTransaction)
```



**Parameters:**
- `` (): Address to burn tokens from
- `` (): Amount of tokens to burn
- `` (): Parameters for the meta-transaction

**Returns:**
- MetaTransaction The unsigned meta-transaction ready for signing


---

### executeMint

```solidity
function executeMint(address to, uint256 amount) external nonpayable
```

External function that can only be called by the contract itself to execute minting

**Parameters:**
- `` (): Recipient address
- `` (): Amount to mint



---

### executeBurn

```solidity
function executeBurn(address from, uint256 amount) external nonpayable
```

External function that can only be called by the contract itself to execute burning

**Parameters:**
- `` (): Address to burn from
- `` (): Amount to burn



---

### _handleTokenMetaTx

```solidity
function _handleTokenMetaTx(struct EngineBlox.MetaTransaction metaTx, bytes4 expectedSelector, bytes32 expectedOperationType) internal nonpayable returns (struct EngineBlox.TxRecord)
```

Internal helper function to handle token meta transactions

**Parameters:**
- `` (): Meta transaction data
- `` (): The expected function selector
- `` (): The expected operation type

**Returns:**
- The transaction record


---

### _generateUnsignedTokenMetaTx

```solidity
function _generateUnsignedTokenMetaTx(address account, uint256 amount, struct SimpleRWA20.TokenMetaTxParams params, bytes32 operationType, bytes4 functionSelector, bytes4 metaTxSelector) internal view returns (struct EngineBlox.MetaTransaction)
```

Internal helper function to generate unsigned token meta transactions

**Parameters:**
- `` (): The target account (to/from address)
- `` (): Amount of tokens
- `` (): Meta transaction parameters
- `` (): The operation type (MINT_TOKENS or BURN_TOKENS)
- `` (): The function selector for the operation
- `` (): The meta transaction selector for the operation

**Returns:**
- MetaTransaction The unsigned meta-transaction


---

### _update

```solidity
function _update(address from, address to, uint256 amount) internal nonpayable
```

Hook that is called during any token transfer
This includes minting and burning.
Overrides functionality from ERC20, ERC20Pausable, and ERC20Burnable.




---


## Events

### TokensMinted

```solidity
event TokensMinted(address to, uint256 amount)
```




---

### TokensBurned

```solidity
event TokensBurned(address from, uint256 amount)
```




---


## Structs


## Enums


