import { Address, PublicClient, Hex, decodeAbiParameters } from 'viem';
import { MetaTransaction, TxRecord, PaymentDetails, TxParams } from '../interfaces/lib.index';
import { TxStatus } from '../types/lib.index';

export class ContractValidations {
  constructor(
    private client: PublicClient
  ) {}

  /**
   * @notice Validates a meta transaction's parameters
   * @param metaTx The meta transaction to validate
   * @throws Error if any validation fails
   */
  async validateMetaTransaction(metaTx: MetaTransaction): Promise<void> {    
    // Validate signature
    // 65 bytes signature when converted to hex string becomes 132 characters (0x + 130)
    if (!metaTx.signature || metaTx.signature.length !== 132) {
      throw new Error("Invalid signature length");
    }

    // Validate chain ID
    const currentChainId = await this.client.getChainId();
    if (BigInt(metaTx.params.chainId) !== BigInt(currentChainId)) {
      throw new Error("Chain ID mismatch");
    }

    // Validate handler contract
    if (!metaTx.params.handlerContract) {
      throw new Error("Invalid handler contract address");
    }

    // Validate handler selector (must be 4 bytes)
    if (!metaTx.params.handlerSelector || !(/^0x[0-9a-f]{8}$/i.test(metaTx.params.handlerSelector))) {
      throw new Error("Invalid handler selector format");
    }

    // Validate deadline
    const currentTimestamp = Math.floor(Date.now() / 1000);
    if (currentTimestamp > metaTx.params.deadline) {
      throw new Error("Meta-transaction expired");
    }

    // Validate max gas price
    const currentGasPrice = await this.client.getGasPrice();
    if (currentGasPrice > BigInt(metaTx.params.maxGasPrice) && metaTx.params.maxGasPrice > BigInt(0)) {
      throw new Error(`Current gas price exceeds maximum allowed: ${currentGasPrice} > ${metaTx.params.maxGasPrice}`);
    }

    // Validate signer
    if (!metaTx.params.signer) {
      throw new Error("Invalid signer address");
    }

    // Validate transaction record
    await this.validateTxRecord(metaTx.txRecord);
  }

  /**
   * @notice Validates a transaction record's parameters
   * @param txRecord The transaction record to validate
   * @throws Error if any validation fails
   * @private
   */
  private async validateTxRecord(txRecord: TxRecord): Promise<void> {
    // Validate txId
    if (txRecord.txId <= 0) {
      throw new Error("Invalid transaction ID");
    }

    // Validate release time
    //const currentTimestamp = Math.floor(Date.now() / 1000);
    //if (txRecord.releaseTime <= currentTimestamp) {
      //throw new Error(`Release time must be in the future: ${txRecord.releaseTime} <= ${currentTimestamp}`);
    //}

    // Validate status (must be PENDING for meta transactions)
    if (txRecord.status !== TxStatus.PENDING) {
      throw new Error(`Transaction must be in pending state: ${txRecord.status}`);
    }

    // Validate params
    await this.validateTxParams(txRecord.params);

    // Validate result (must be empty for pending transactions)
    if (txRecord.result) {
      // First check if it's a valid hex string
      if (!this.isValidHex(txRecord.result)) {
        throw new Error("Invalid hex format for transaction result");
      }
      
      // For pending transactions, only allow '0x' or '0x0' or '0x000000'
      const strippedResult = txRecord.result.replace(/^0x0*$/, '0x');
      if (strippedResult !== '0x') {
        throw new Error("Result must be empty for pending transactions");
      }
    }

    // Validate payment details if present
    if (txRecord.payment) {
      await this.validatePaymentDetails(txRecord.payment);
    }
  }

  /**
   * @notice Validates transaction parameters
   * @param params The transaction parameters to validate
   * @throws Error if any validation fails
   * @private
   */
  private async validateTxParams(params: TxParams): Promise<void> {
    // Validate requester address
    if (!params.requester) {
      throw new Error("Invalid requester address");
    }

    // Validate target address
    if (!params.target) {
      throw new Error("Invalid target address");
    }

    // Validate value (must be non-negative)
    if (BigInt(params.value) < BigInt(0)) {
      throw new Error("Negative value not allowed");
    }

    // Validate gas limit
    if (params.gasLimit <= 0) {
      throw new Error("Invalid gas limit");
    }

    // Validate operation type (must be valid hex)
    if (!(/^0x[0-9a-f]{64}$/i.test(params.operationType))) {
      throw new Error("Invalid operation type format");
    }

    // Validate execution selector (must be valid bytes4)
    if (!(/^0x[0-9a-f]{8}$/i.test(params.executionSelector))) {
      throw new Error("Invalid execution selector format");
    }

    // Validate execution params (must be valid hex)
    if (!(/^0x[0-9a-f]*$/i.test(params.executionParams))) {
      throw new Error("Invalid execution params format");
    }
  }


  /**
   * @notice Validates if a string is a valid hex value
   * @param value The hex string to validate
   * @param exactBytes Optional parameter for exact byte length
   * @returns boolean indicating if the hex string is valid
   * @private
   */
  private isValidHex(value: Hex, exactBytes?: number): boolean {
    if (!value || typeof value !== 'string' || !value.startsWith('0x')) {
      return false;
    }

    const hexDigits = value.slice(2);
    if (hexDigits.length % 2 !== 0) {
      return false;
    }

    if (exactBytes !== undefined && hexDigits.length !== exactBytes * 2) {
      return false;
    }

    return /^[0-9a-f]*$/i.test(hexDigits);
  }

  /**
   * @notice Validates payment details
   * @param payment The payment details to validate
   * @throws Error if any validation fails
   * @private
   */
  private async validatePaymentDetails(payment: PaymentDetails): Promise<void> {
    // Validate recipient address if any payment is specified
    if (BigInt(payment.nativeTokenAmount) > BigInt(0) || BigInt(payment.erc20TokenAmount) > BigInt(0)) {
      if (!payment.recipient) {
        throw new Error("Invalid payment recipient address");
      }
    }

    // Validate native token amount
    if (BigInt(payment.nativeTokenAmount) < BigInt(0)) {
      throw new Error("Negative native token amount not allowed");
    }

    // Validate ERC20 token details if specified
    if (BigInt(payment.erc20TokenAmount) > BigInt(0)) {
      if (!payment.erc20TokenAddress) {
        throw new Error("Invalid ERC20 token address");
      }
      if (BigInt(payment.erc20TokenAmount) < BigInt(0)) {
        throw new Error("Negative ERC20 token amount not allowed");
      }
    }
  }

  /**
   * @notice Validates if a timestamp is in the future
   * @param timestamp The timestamp to validate
   * @param errorMessage Custom error message
   * @throws Error if timestamp is not in the future
   */
  validateFutureTimestamp(timestamp: number, errorMessage: string = "Timestamp must be in the future"): void {
    if (timestamp <= Math.floor(Date.now() / 1000)) {
      throw new Error(errorMessage);
    }
  }

  /**
   * @notice Validates if a period in minutes is valid
   * @param periodInMinutes The period to validate
   * @param errorMessage Custom error message
   * @throws Error if period is not valid
   */
  validateTimePeriod(periodInMinutes: number, errorMessage: string = "Invalid time period"): void {
    if (periodInMinutes <= 0) {
      throw new Error(errorMessage);
    }
  }

  /**
   * @notice Validates if an address has admin owner role
   * @dev Equivalent to onlyAdminOwner modifier in Solidity
   * @param address The address to validate
   * @param adminOwner The expected admin owner address
   * @throws Error if address is not admin owner
   */
  validateAdminOwner(address: Address | undefined, adminOwner: Address): void {
    this.validateRole(address, adminOwner, "admin owner");
  }

  /**
   * @notice Validates if an address has broadcaster role
   * @dev Equivalent to onlyBroadcaster modifier in Solidity
   * @param address The address to validate
   * @param broadcaster The expected broadcaster address
   * @throws Error if address is not broadcaster
   */
  validateBroadcaster(address: Address | undefined, broadcaster: Address): void {
    this.validateRole(address, broadcaster, "broadcaster");
  }

  /**
   * @notice Validates if an address has recovery role
   * @dev Equivalent to onlyRecovery modifier in Solidity
   * @param address The address to validate
   * @param recovery The expected recovery address
   * @throws Error if address is not recovery address
   */
  validateRecovery(address: Address | undefined, recovery: Address): void {
    this.validateRole(address, recovery, "recovery owner");
  }

  /**
   * @notice Validates if an address has a specific role
   * @param address The address to validate
   * @param roleAddress The expected role address
   * @param roleName The name of the role for error messages
   * @throws Error if address doesn't match role address
   */
  validateRole(address: Address | undefined, roleAddress: Address, roleName: string): void {
    if (!address || address !== roleAddress) {
      throw new Error(`Restricted to ${roleName}`);
    }
  }

  /**
   * @notice Validates if an address has either of two roles
   * @param address The address to validate
   * @param role1Address First role address
   * @param role2Address Second role address
   * @param roleNames Names of the roles for error messages
   * @throws Error if address doesn't match either role
   */
  validateMultipleRoles(address: Address | undefined, role1Address: Address, role2Address: Address, roleNames: string): void {
    if (!address || (address !== role1Address && address !== role2Address)) {
      throw new Error(`Restricted to ${roleNames}`);
    }
  }

  /**
   * @notice Validates native token balance
   * @param contractAddress The contract address to check
   * @param requiredAmount The required balance amount
   * @throws Error if balance is insufficient
   */
  async validateNativeTokenBalance(contractAddress: Address, requiredAmount: bigint): Promise<void> {
    const balance = await this.client.getBalance({ address: contractAddress });
    if (balance < requiredAmount) {
      throw new Error("Insufficient native token balance");
    }
  }
}