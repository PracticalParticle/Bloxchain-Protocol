// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title BasicERC20
 * @dev A simple ERC20 token contract with access control for minting
 * This token uses OpenZeppelin AccessControl to manage minter roles
 */
contract BasicERC20 is ERC20, AccessControl {
    /// @dev The role identifier for minters
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    
    /// @dev The minter address that will be granted the MINTER_ROLE
    address public minter;
    
    /**
     * @dev Constructor that mints the total supply to the deployer and grants minter role
     * @param name The name of the token
     * @param symbol The symbol of the token
     * @param totalSupply The total supply of tokens to mint (in wei/smallest unit)
     * @param minterAddress The address that will be granted the MINTER_ROLE
     */
    constructor(
        string memory name,
        string memory symbol,
        uint256 totalSupply,
        address minterAddress
    ) ERC20(name, symbol) {
        require(minterAddress != address(0), "BasicERC20: minter cannot be zero address");
        
        // Grant the contract deployer (msg.sender) the default admin role
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        
        // Grant the MINTER_ROLE to the specified minter address
        _grantRole(MINTER_ROLE, minterAddress);
        
        minter = minterAddress;
        
        // Mint the total supply to the deployer
        _mint(msg.sender, totalSupply);
    }
    
    /**
     * @dev Mint new tokens to a specified address
     * @param to The address to mint tokens to
     * @param amount The amount of tokens to mint (in wei/smallest unit)
     * @notice Only addresses with MINTER_ROLE can call this function
     */
    function mint(address to, uint256 amount) public onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }
}
