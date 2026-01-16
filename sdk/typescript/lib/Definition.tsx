import { PublicClient, WalletClient, Address, Chain, Hex } from 'viem';
import { 
  IDefinition, 
  DefinitionsConfig
} from '../interfaces/definition.index';
import { 
  FunctionSchema, 
  RolePermission,
  FunctionPermission
} from '../types/definition.index';
import { TxAction } from '../types/lib.index';
import { fromContractValue } from '../utils/bitmap';

// Import the ABI
import IDefinitionABI from '../../../abi/IDefinition.abi.json';

/**
 * Definitions class for interacting with any definition library
 * that implements the IDefinition interface
 * 
 * This class provides type-safe access to contract definitions including:
 * - Operation types and their configurations
 * - Function schemas and permissions
 * - Role-based access control definitions
 * 
 * Note: Workflow-related functionality has been moved to the separate Workflow class
 * 
 * @example
 * ```typescript
 * const definitions = new Definitions(
 *   publicClient,
 *   walletClient,
 *   '0x1234...',
 *   chain
 * );
 * 
 * // Get function schemas
 * const schemas = await definitions.getFunctionSchemas();
 * ```
 */
export class Definitions implements IDefinition {
  protected client: PublicClient;
  protected walletClient: WalletClient | undefined;
  protected contractAddress: Address;
  protected chain: Chain;
  protected config: DefinitionsConfig;

  constructor(
    client: PublicClient,
    walletClient: WalletClient | undefined,
    contractAddress: Address,
    chain: Chain,
    config?: Partial<DefinitionsConfig>
  ) {
    this.client = client;
    this.walletClient = walletClient;
    this.contractAddress = contractAddress;
    this.chain = chain;
    this.config = {
      contractAddress,
      chainId: chain.id,
      ...config
    };
  }

  /**
   * Returns all function schema definitions
   * @returns Array of function schema definitions
   */
  async getFunctionSchemas(): Promise<FunctionSchema[]> {
    try {
      const result = await this.client.readContract({
        address: this.contractAddress,
        abi: IDefinitionABI,
        functionName: 'getFunctionSchemas'
      }) as any[];

      return result.map((item: any) => ({
        functionSignature: item.functionSignature as string,
        functionSelector: item.functionSelector as Hex,
        operationType: item.operationType as Hex,
        operationName: item.operationName as string,
        supportedActionsBitmap: fromContractValue(item.supportedActionsBitmap), // uint16
        isProtected: item.isProtected as boolean
      }));
    } catch (error) {
      throw new Error(`Failed to get function schemas: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Returns all role hashes and their corresponding function permissions
   * @returns RolePermission struct containing roleHashes and functionPermissions arrays
   */
  async getRolePermissions(): Promise<RolePermission> {
    try {
      const result = await this.client.readContract({
        address: this.contractAddress,
        abi: IDefinitionABI,
        functionName: 'getRolePermissions'
      }) as any;

      return {
        roleHashes: result.roleHashes.map((hash: any) => hash as Hex),
        functionPermissions: result.functionPermissions.map((perm: any) => ({
          functionSelector: perm.functionSelector as Hex,
          grantedActionsBitmap: fromContractValue(perm.grantedActionsBitmap) // uint16
        }))
      };
    } catch (error) {
      throw new Error(`Failed to get role permissions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Utility method to get operation type by name from function schemas
   * @param operationName The name of the operation to find
   * @returns The operation type hash if found, undefined otherwise
   */
  async getOperationTypeByName(operationName: string): Promise<Hex | undefined> {
    const schemas = await this.getFunctionSchemas();
    const schema = schemas.find(s => s.operationName === operationName);
    return schema?.operationType;
  }

  /**
   * Utility method to get function schema by selector
   * @param functionSelector The function selector to find
   * @returns The function schema if found, undefined otherwise
   */
  async getFunctionSchemaBySelector(functionSelector: Hex): Promise<FunctionSchema | undefined> {
    const schemas = await this.getFunctionSchemas();
    return schemas.find(schema => schema.functionSelector === functionSelector);
  }

  /**
   * Utility method to check if a role has permission for a function
   * Note: This checks if the role is in the roleHashes array at the same index
   * as the functionPermission that matches the functionSelector
   * @param roleHash The role hash to check
   * @param functionSelector The function selector to check permission for
   * @returns True if the role has permission, false otherwise
   */
  async hasRolePermission(roleHash: Hex, functionSelector: Hex): Promise<boolean> {
    const rolePermissions = await this.getRolePermissions();
    
    // RolePermissions uses parallel arrays: roleHashes[i] corresponds to functionPermissions[i]
    for (let i = 0; i < rolePermissions.roleHashes.length && i < rolePermissions.functionPermissions.length; i++) {
      if (rolePermissions.roleHashes[i] === roleHash && 
          rolePermissions.functionPermissions[i].functionSelector === functionSelector) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Utility method to get all roles that can execute a specific function
   * Note: Returns roles from roleHashes array where corresponding functionPermission matches
   * @param functionSelector The function selector to check
   * @returns Array of role hashes that can execute the function
   */
  async getRolesForFunction(functionSelector: Hex): Promise<Hex[]> {
    const rolePermissions = await this.getRolePermissions();
    const roles: Hex[] = [];
    
    // RolePermissions uses parallel arrays: roleHashes[i] corresponds to functionPermissions[i]
    for (let i = 0; i < rolePermissions.roleHashes.length && i < rolePermissions.functionPermissions.length; i++) {
      if (rolePermissions.functionPermissions[i].functionSelector === functionSelector) {
        roles.push(rolePermissions.roleHashes[i]);
      }
    }
    
    return roles;
  }

  /**
   * Get contract configuration
   * @returns The current contract configuration
   */
  getConfig(): DefinitionsConfig {
    return { ...this.config };
  }

  /**
   * Update contract configuration
   * @param config Partial configuration to update
   */
  updateConfig(config: Partial<DefinitionsConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
