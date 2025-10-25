// SPDX-License-Identifier: MPL-2.0
pragma solidity ^0.8.25;

/**
 * @title MockERC20
 * @dev Simple ERC20 token for Certora verification testing
 * 
 * This mock ERC20 token is designed for testing payment integration
 * in the StateAbstraction framework. It provides basic ERC20 functionality
 * with additional tracking capabilities for verification purposes.
 * 
 * Features:
 * - Standard ERC20 functionality
 * - Exposed balances and transfer tracking
 * - Minting capability for testing
 * - Transfer event tracking
 */
contract MockERC20 {
    string public name;
    string public symbol;
    uint8 public decimals;
    uint256 public totalSupply;
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    // Events
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    
    // Transfer tracking for verification
    event TransferExecuted(address indexed from, address indexed to, uint256 value, bool success);
    
    constructor(string memory _name, string memory _symbol, uint8 _decimals) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
    }
    
    /**
     * @dev Mint tokens to an address
     * @param to The address to mint to
     * @param amount The amount to mint
     */
    function mint(address to, uint256 amount) external {
        require(to != address(0), "Cannot mint to zero address");
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }
    
    /**
     * @dev Transfer tokens
     * @param to The recipient address
     * @param value The amount to transfer
     * @return Success status
     */
    function transfer(address to, uint256 value) external returns (bool) {
        bool success = _transfer(msg.sender, to, value);
        emit TransferExecuted(msg.sender, to, value, success);
        return success;
    }
    
    /**
     * @dev Transfer tokens from another address
     * @param from The sender address
     * @param to The recipient address
     * @param value The amount to transfer
     * @return Success status
     */
    function transferFrom(address from, address to, uint256 value) external returns (bool) {
        require(allowance[from][msg.sender] >= value, "Insufficient allowance");
        allowance[from][msg.sender] -= value;
        bool success = _transfer(from, to, value);
        emit TransferExecuted(from, to, value, success);
        return success;
    }
    
    /**
     * @dev Approve spender
     * @param spender The spender address
     * @param value The amount to approve
     * @return Success status
     */
    function approve(address spender, uint256 value) external returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }
    
    /**
     * @dev Internal transfer function
     * @param from The sender address
     * @param to The recipient address
     * @param value The amount to transfer
     * @return Success status
     */
    function _transfer(address from, address to, uint256 value) internal returns (bool) {
        require(to != address(0), "Cannot transfer to zero address");
        require(balanceOf[from] >= value, "Insufficient balance");
        
        balanceOf[from] -= value;
        balanceOf[to] += value;
        emit Transfer(from, to, value);
        return true;
    }
    
    // ============ VERIFICATION HELPERS ============
    
    /**
     * @dev Get balance of address
     * @param account The account address
     * @return Balance amount
     */
    function getBalance(address account) external view returns (uint256) {
        return balanceOf[account];
    }
    
    /**
     * @dev Get allowance between owner and spender
     * @param owner The owner address
     * @param spender The spender address
     * @return Allowance amount
     */
    function getAllowance(address owner, address spender) external view returns (uint256) {
        return allowance[owner][spender];
    }
    
    /**
     * @dev Check if transfer would succeed
     * @param from The sender address
     * @param to The recipient address
     * @param value The amount to transfer
     * @return True if transfer would succeed, false otherwise
     */
    function canTransfer(address from, address to, uint256 value) external view returns (bool) {
        return to != address(0) && balanceOf[from] >= value;
    }
    
    /**
     * @dev Check if transferFrom would succeed
     * @param from The sender address
     * @param to The recipient address
     * @param value The amount to transfer
     * @param spender The spender address
     * @return True if transferFrom would succeed, false otherwise
     */
    function canTransferFrom(address from, address to, uint256 value, address spender) external view returns (bool) {
        return to != address(0) && 
               balanceOf[from] >= value && 
               allowance[from][spender] >= value;
    }
}

