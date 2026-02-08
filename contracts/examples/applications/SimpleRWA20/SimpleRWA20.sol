// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

// OpenZeppelin imports
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// Particle imports
import "../../../core/security/SecureOwnable.sol";
import "../../../utils/SharedValidation.sol";
import "../../../interfaces/IDefinition.sol";
import "./SimpleRWA20Definitions.sol";

/**
 * @title SimpleRWA20
 * @dev A secure ERC20 token for real-world assets with enhanced security via Guardian.
 * Uses EngineBlox for mint and burn operations, restricted to broadcaster.
 * Implements ERC20Burnable for secure burn operations with allowance checks.
 */
contract SimpleRWA20 is ERC20Upgradeable, ERC20BurnableUpgradeable, SecureOwnable {
    using SafeERC20 for IERC20;

    // Constants are now defined in SimpleRWA20Definitions.sol

    // Struct for meta-transaction parameters
    struct TokenMetaTxParams {
        uint256 deadline;
        uint256 maxGasPrice;
    }

    // Events for important token operations
    event TokensMinted(address indexed to, uint256 amount);
    event TokensBurned(address indexed from, uint256 amount);

    /**
     * @notice Initialize SimpleRWA20 (replaces constructor for clone pattern)
     * @param name The name of the token
     * @param symbol The symbol of the token
     * @param initialOwner The initial owner address
     * @param broadcaster The broadcaster address
     * @param recovery The recovery address
     * @param timeLockPeriodSec The timelock period in seconds
     */
    function initialize(
        string memory name,
        string memory symbol,
        address initialOwner,
        address broadcaster,
        address recovery,
        uint256 timeLockPeriodSec,
        address eventForwarder
    ) public initializer {
        // Initialize ERC20 state variables manually
        __ERC20_init(name, symbol);
        
        // Initialize SecureOwnable (base + SecureOwnable definitions: ownership, broadcaster, recovery, timelock)
        SecureOwnable.initialize(initialOwner, broadcaster, recovery, timeLockPeriodSec, eventForwarder);
        
        // Load SimpleRWA20-specific definitions (mint/burn meta-tx)
        IDefinition.RolePermission memory permissions = 
            SimpleRWA20Definitions.getRolePermissions();
        _loadDefinitions(
            SimpleRWA20Definitions.getFunctionSchemas(),
            permissions.roleHashes,
            permissions.functionPermissions,
            true // Allow protected schemas for factory settings
        );
    }

    /**
     * @notice Create a mint request and immediately execute it via meta-transaction (single phase)
     * @param metaTx Meta transaction data containing mint parameters
     * @return The transaction record
     */
    function mintWithMetaTx(EngineBlox.MetaTransaction memory metaTx) 
        public 
        nonReentrant
        returns (EngineBlox.TxRecord memory) 
    {
        _validateBroadcaster(msg.sender);
        return _handleTokenMetaTx(metaTx, SimpleRWA20Definitions.MINT_TOKENS_META_SELECTOR, SimpleRWA20Definitions.MINT_TOKENS);
    }

    /**
     * @notice Create a burn request and immediately execute it via meta-transaction (single phase)
     * @param metaTx Meta transaction data containing burn parameters
     * @return The transaction record
     */
    function burnWithMetaTx(EngineBlox.MetaTransaction memory metaTx) 
        public 
        nonReentrant
        returns (EngineBlox.TxRecord memory) 
    {
        _validateBroadcaster(msg.sender);
        return _handleTokenMetaTx(metaTx, SimpleRWA20Definitions.BURN_TOKENS_META_SELECTOR, SimpleRWA20Definitions.BURN_TOKENS);
    }

    /**
     * @notice Generates an unsigned meta-transaction for minting tokens
     * @param to Recipient address
     * @param amount Amount of tokens to mint
     * @param params Parameters for the meta-transaction
     * @return MetaTransaction The unsigned meta-transaction ready for signing
     */
    function generateUnsignedMintMetaTx(
        address to,
        uint256 amount,
        TokenMetaTxParams memory params
    ) public view returns (EngineBlox.MetaTransaction memory) {
        SharedValidation.validateNotZeroAddress(to);
        
        return _generateUnsignedTokenMetaTx(
            to,
            amount,
            params,
            SimpleRWA20Definitions.MINT_TOKENS,
            SimpleRWA20Definitions.MINT_TOKENS_SELECTOR,
            SimpleRWA20Definitions.MINT_TOKENS_META_SELECTOR
        );
    }

    /**
     * @notice Generates an unsigned meta-transaction for burning tokens
     * @param from Address to burn tokens from
     * @param amount Amount of tokens to burn
     * @param params Parameters for the meta-transaction
     * @return MetaTransaction The unsigned meta-transaction ready for signing
     */
    function generateUnsignedBurnMetaTx(
        address from,
        uint256 amount,
        TokenMetaTxParams memory params
    ) public view returns (EngineBlox.MetaTransaction memory) {
        SharedValidation.validateNotZeroAddress(from);
        if (balanceOf(from) < amount) revert SharedValidation.NotSupported();
        
        return _generateUnsignedTokenMetaTx(
            from,
            amount,
            params,
            SimpleRWA20Definitions.BURN_TOKENS,
            SimpleRWA20Definitions.BURN_TOKENS_SELECTOR,
            SimpleRWA20Definitions.BURN_TOKENS_META_SELECTOR
        );
    }

    /**
     * @dev External function that can only be called by the contract itself to execute minting
     * @param to Recipient address
     * @param amount Amount to mint
     */
    function executeMint(address to, uint256 amount) external {
        SharedValidation.validateInternalCall(address(this));
        _mint(to, amount);
        emit TokensMinted(to, amount);
    }

    /**
     * @dev External function that can only be called by the contract itself to execute burning
     * @param from Address to burn from
     * @param amount Amount to burn
     */
    function executeBurn(address from, uint256 amount) external {
        SharedValidation.validateInternalCall(address(this));
        // Use burnFrom from ERC20Burnable which handles allowance checks
        burnFrom(from, amount);
        emit TokensBurned(from, amount);
    }

    /**
     * @dev Internal helper function to handle token meta transactions
     * @param metaTx Meta transaction data
     * @param expectedSelector The expected function selector
     * @param expectedOperationType The expected operation type
     * @return The transaction record
     */
    function _handleTokenMetaTx(
        EngineBlox.MetaTransaction memory metaTx,
        bytes4 expectedSelector,
        bytes32 expectedOperationType
    ) internal returns (EngineBlox.TxRecord memory) {
        if (!_hasActionPermission(msg.sender, expectedSelector, EngineBlox.TxAction.EXECUTE_META_REQUEST_AND_APPROVE)) {
            revert SharedValidation.NoPermission(msg.sender);
        }
        SharedValidation.validateHandlerSelectorMatch(metaTx.params.handlerSelector, expectedSelector);
        
        EngineBlox.TxRecord memory txRecord = _requestAndApproveTransaction(metaTx);
        
        SharedValidation.validateOperationType(txRecord.params.operationType, expectedOperationType);
        // Operation is automatically handled by EngineBlox
        return txRecord;
    }

    /**
     * @dev Internal helper function to generate unsigned token meta transactions
     * @param account The target account (to/from address)
     * @param amount Amount of tokens
     * @param params Meta transaction parameters
     * @param operationType The operation type (MINT_TOKENS or BURN_TOKENS)
     * @param functionSelector The function selector for the operation
     * @param metaTxSelector The meta transaction selector for the operation
     * @return MetaTransaction The unsigned meta-transaction
     */
    function _generateUnsignedTokenMetaTx(
        address account,
        uint256 amount,
        TokenMetaTxParams memory params,
        bytes32 operationType,
        bytes4 functionSelector,
        bytes4 metaTxSelector
    ) internal view returns (EngineBlox.MetaTransaction memory) {
        // Create execution params
        bytes memory executionParams = abi.encode(account, amount);
        
        // Create meta-transaction parameters
        EngineBlox.MetaTxParams memory metaTxParams = createMetaTxParams(
            address(this),
            metaTxSelector,
            EngineBlox.TxAction.SIGN_META_REQUEST_AND_APPROVE,
            params.deadline,
            params.maxGasPrice,
            owner()
        );
        
        // Generate the unsigned meta-transaction
        return generateUnsignedMetaTransactionForNew(
            owner(),
            address(this),
            0, // no value
            gasleft(),
            operationType,
            functionSelector,
            executionParams,
            metaTxParams
        );
    }


    /**
     * @dev Hook that is called during any token transfer
     * This includes minting and burning.
     * Overrides functionality from ERC20, ERC20Pausable, and ERC20Burnable.
     */
    function _update(
        address from,
        address to,
        uint256 amount
    ) internal virtual override {
        super._update(from, to, amount);
    }
}
