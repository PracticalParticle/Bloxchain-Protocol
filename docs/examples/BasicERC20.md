# Solidity API

# BasicERC20

A simple ERC20 token contract with access control for minting
This token uses OpenZeppelin AccessControl to manage minter roles




## Functions

### constructor

```solidity
function constructor(string name, string symbol, uint256 totalSupply, address minterAddress) public nonpayable
```

Constructor that mints the total supply to the deployer and grants minter role

**Parameters:**
- `` (): The name of the token
- `` (): The symbol of the token
- `` (): The total supply of tokens to mint (in wei/smallest unit)
- `` (): The address that will be granted the MINTER_ROLE



---

### mint

```solidity
function mint(address to, uint256 amount) public nonpayable
```

Mint new tokens to a specified address

**Parameters:**
- `` (): The address to mint tokens to
- `` (): The amount of tokens to mint (in wei/smallest unit)



---


## Events


## Structs


## Enums


