// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

// OpenZeppelin imports
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// Particle imports
import "../../core/security/SecureOwnable.sol";
import "../../utils/SharedValidation.sol";
import "../../interfaces/IDefinition.sol";
import "./SimpleVaultDefinitions.sol";


contract SimpleVault is SecureOwnable {
    using SafeERC20 for IERC20;

    // Constants are now defined in SimpleVaultDefinitions.sol

    // Timelock period constants (in seconds)
    uint256 private constant MIN_TIMELOCK_PERIOD = 1; // 1 second
    uint256 private constant MAX_TIMELOCK_PERIOD = 90 * 24 * 60 * 60; // 90 days

    // Struct for meta-transaction parameters
    struct VaultMetaTxParams {
        uint256 deadline;
        uint256 maxGasPrice;
    }

    // Events
    event EthWithdrawn(address indexed to, uint256 amount);
    event TokenWithdrawn(address indexed token, address indexed to, uint256 amount);
    event EthReceived(address indexed from, uint256 amount);

    /**
     * @notice Initialize SimpleVault (replaces constructor for clone pattern)
     * @param initialOwner The initial owner address
     * @param broadcaster The broadcaster address
     * @param recovery The recovery address
     * @param timeLockPeriodSec The timelock period in seconds
     */
    function initialize(
        address initialOwner,
        address broadcaster,
        address recovery,
        uint256 timeLockPeriodSec,
        address eventForwarder
    ) public override initializer {
        // Initialize SecureOwnable directly
        SecureOwnable.initialize(initialOwner, broadcaster, recovery, timeLockPeriodSec, eventForwarder);
        if (timeLockPeriodSec < MIN_TIMELOCK_PERIOD) revert SharedValidation.InvalidTimeLockPeriod(timeLockPeriodSec);
        if (timeLockPeriodSec > MAX_TIMELOCK_PERIOD) revert SharedValidation.InvalidTimeLockPeriod(timeLockPeriodSec);
        
        // Load SimpleVault-specific definitions
        IDefinition.RolePermission memory permissions = 
            SimpleVaultDefinitions.getRolePermissions();
        _loadDefinitions(
            SimpleVaultDefinitions.getFunctionSchemas(),
            permissions.roleHashes,
            permissions.functionPermissions,
            true // Allow protected schemas for factory settings
        );
    }

    /**
     * @dev Allows the contract to receive ETH
     */
    receive() external payable {
        emit EthReceived(msg.sender, msg.value);
    }

    /**
     * @notice Get the ETH balance of the vault
     */
    function getEthBalance() public view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @notice Get the token balance of the vault
     * @param token Token address
     */
    function getTokenBalance(address token) public view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    /**
     * @notice Request ETH withdrawal
     * @param to Recipient address
     * @param amount Amount of ETH to withdraw
     */
    function withdrawEthRequest(address to, uint256 amount) public returns (EngineBlox.TxRecord memory) {
        SharedValidation.validateOwner(owner());
        SharedValidation.validateNotZeroAddress(to);
        if (amount > getEthBalance()) revert SharedValidation.NotSupported();

        EngineBlox.TxRecord memory txRecord = _requestTransaction(
            msg.sender,
            address(this),
            0, // value
            0, // gas limit
            SimpleVaultDefinitions.WITHDRAW_ETH,
            SimpleVaultDefinitions.WITHDRAW_ETH_SELECTOR,
            abi.encode(to, amount)
        );
        return txRecord;
    }

    /**
     * @notice Request token withdrawal
     * @param token Token address
     * @param to Recipient address
     * @param amount Amount of tokens to withdraw
     */
    function withdrawTokenRequest(address token, address to, uint256 amount) public returns (EngineBlox.TxRecord memory) {
        SharedValidation.validateOwner(owner());
        SharedValidation.validateNotZeroAddress(token);
        SharedValidation.validateNotZeroAddress(to);
        if (amount > getTokenBalance(token)) revert SharedValidation.NotSupported();

        EngineBlox.TxRecord memory txRecord = _requestTransaction(
            msg.sender,
            address(this),
            0, // value
            0, // gas limit
            SimpleVaultDefinitions.WITHDRAW_TOKEN,
            SimpleVaultDefinitions.WITHDRAW_TOKEN_SELECTOR,
            abi.encode(token, to, amount)
        );
        return txRecord;
    }

    /**
     * @notice Approve a withdrawal after the time delay has passed
     * @param txId The ID of the withdrawal transaction to approve
     */
    function approveWithdrawalAfterDelay(uint256 txId) public returns (EngineBlox.TxRecord memory) {
        SharedValidation.validateOwner(owner());
        EngineBlox.TxRecord memory updated = _approveTransaction(txId);
        return updated;
    }

    /**
     * @notice Approve withdrawal with meta transaction
     * @param metaTx Meta transaction data
     */
    function approveWithdrawalWithMetaTx(EngineBlox.MetaTransaction memory metaTx) public returns (EngineBlox.TxRecord memory) {
        _validateBroadcaster(msg.sender);
        return _approveTransactionWithMetaTx(metaTx);
    }

    /**
     * @notice Cancel a pending withdrawal request
     * @param txId The ID of the withdrawal transaction to cancel
     */
    function cancelWithdrawal(uint256 txId) public returns (EngineBlox.TxRecord memory) {
        SharedValidation.validateOwner(owner());
        EngineBlox.TxRecord memory updated = _cancelTransaction(txId);
        return updated;
    }

    /**
     * @dev External function that can only be called by the contract itself to execute ETH withdrawal
     * @param to Recipient address
     * @param amount Amount to withdraw
     */
    function executeWithdrawEth(address payable to, uint256 amount) external {
        SharedValidation.validateInternalCall(address(this));
        _withdrawEth(to, amount);
    }

    /**
     * @dev External function that can only be called by the contract itself to execute token withdrawal
     * @param token Token address
     * @param to Recipient address
     * @param amount Amount to withdraw
     */
    function executeWithdrawToken(address token, address to, uint256 amount) external {
        SharedValidation.validateInternalCall(address(this));
        _withdrawToken(token, to, amount);
    }

    /**
     * @dev Internal function to withdraw ETH
     * @param to Recipient address
     * @param amount Amount to withdraw
     */
    function _withdrawEth(address payable to, uint256 amount) internal {
        (bool success, ) = to.call{value: amount}("");
        require(success, "ETH transfer failed");
        emit EthWithdrawn(to, amount);
    }

    /**
     * @dev Internal function to withdraw tokens
     * @param token Token address
     * @param to Recipient address
     * @param amount Amount to withdraw
     */
    function _withdrawToken(address token, address to, uint256 amount) internal {
        IERC20(token).safeTransfer(to, amount);
        emit TokenWithdrawn(token, to, amount);
    }

    /**
     * @notice Generates an unsigned meta-transaction for an existing withdrawal request
     * @param txId The ID of the existing withdrawal transaction
     * @param metaTxParams Parameters for the meta-transaction
     * @return MetaTransaction The unsigned meta-transaction ready for signing
     */
    function generateUnsignedWithdrawalMetaTxApproval(uint256 txId, VaultMetaTxParams memory metaTxParams) public view returns (EngineBlox.MetaTransaction memory) {
        // Create meta-transaction parameters using the correct selector from definitions
        EngineBlox.MetaTxParams memory params = createMetaTxParams(
            address(this),
            SimpleVaultDefinitions.APPROVE_WITHDRAWAL_META_SELECTOR,
            EngineBlox.TxAction.SIGN_META_APPROVE,
            metaTxParams.deadline,
            metaTxParams.maxGasPrice,
            owner()
        );

        // Generate the unsigned meta-transaction using the parent contract's function
        return generateUnsignedMetaTransactionForExisting(txId, params);
    }


    /**
     * @dev Internal function to update the timelock period with validation
     * @param newTimeLockPeriodSec The new timelock period in seconds
     */
    function _updateTimeLockPeriod(uint256 newTimeLockPeriodSec) internal virtual override {
        if (newTimeLockPeriodSec < MIN_TIMELOCK_PERIOD) revert SharedValidation.InvalidTimeLockPeriod(newTimeLockPeriodSec);
        if (newTimeLockPeriodSec > MAX_TIMELOCK_PERIOD) revert SharedValidation.InvalidTimeLockPeriod(newTimeLockPeriodSec);
        super._updateTimeLockPeriod(newTimeLockPeriodSec);
    }
}
