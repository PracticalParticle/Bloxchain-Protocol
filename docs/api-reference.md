# API Reference

Complete reference for Bloxchain TypeScript SDK classes and methods. Contract source of truth: Solidity in `contracts/core/`. See [TECHNICAL_OVERVIEW.md](../TECHNICAL_OVERVIEW.md) and [contracts/core/AUDIT.md](../contracts/core/AUDIT.md).

## 📚 **Core Classes**

### **SecureOwnable**

The `SecureOwnable` class provides type-safe access to SecureOwnable contracts.

#### **Constructor**

```typescript
constructor(
  client: PublicClient,
  walletClient?: WalletClient,
  contractAddress: Address,
  chain: Chain
)
```

**Parameters:**
- `client`: Viem public client for read operations
- `walletClient`: Optional wallet client for write operations
- `contractAddress`: Address of the deployed contract
- `chain`: Chain configuration

#### **Read Methods**

##### `owner(): Promise<Address>`
Returns the current owner of the contract.

```typescript
const owner = await secureOwnable.owner()
```

##### `getTimeLockPeriodSec(): Promise<bigint>`
Returns the time lock period in seconds.

```typescript
const period = await secureOwnable.getTimeLockPeriodSec()
```

##### `getBroadcasters(): Promise<Address[]>`
Returns all broadcaster addresses for the broadcaster role.

```typescript
const broadcasters = await secureOwnable.getBroadcasters()
```

##### `getRecovery(): Promise<Address>`
Returns the recovery address.

```typescript
const recovery = await secureOwnable.getRecovery()
```

##### `initialized(): Promise<boolean>`
Returns whether the contract is initialized.

```typescript
const isInit = await secureOwnable.initialized()
```

#### **Write Methods**

##### `transferOwnershipRequest(options?: TransactionOptions): Promise<TransactionResult>`
Requests a time-delayed transfer of the **owner** role to the **recovery address at request time** (snapshotted in the pending tx). Rotating recovery later does not change that stored beneficiary. See the **Ownership transfer vs recovery** section in the [SecureOwnable guide](./secure-ownable.md).

```typescript
const result = await secureOwnable.transferOwnershipRequest({ from: account.address })
```

##### `transferOwnershipDelayedApproval(txId: bigint, options?: TransactionOptions): Promise<TransactionResult>`
Approves a pending ownership transfer after the time lock. Callable by **current** owner or **current** recovery; execution still assigns owner to the address snapshotted at request time (may differ from `getRecovery()` at approval time).

##### `updateBroadcasterRequest(newBroadcaster: Address, currentBroadcaster: Address, options?: TransactionOptions): Promise<TransactionResult>`
Requests a broadcaster update by address pair: replace (`currentBroadcaster` → `newBroadcaster`), add (`currentBroadcaster` = zero), or revoke (`newBroadcaster` = zero).

```typescript
const [current] = await secureOwnable.getBroadcasters()
const result = await secureOwnable.updateBroadcasterRequest(
  '0x...', // new broadcaster (or zero to revoke)
  current, // existing broadcaster (or zero to add)
  { from: account.address }
)
```

##### `updateRecoveryRequestAndApprove(metaTx: MetaTransaction, options?: TransactionOptions): Promise<TransactionResult>`
Requests and approves a recovery update using a signed meta-transaction (owner signs, broadcaster submits).

##### `updateTimeLockRequestAndApprove(metaTx: MetaTransaction, options?: TransactionOptions): Promise<TransactionResult>`
Requests and approves a time lock period update using a signed meta-transaction.

### **RuntimeRBAC**

The `RuntimeRBAC` class provides type-safe access to RuntimeRBAC contracts. It extends `BaseStateMachine` and provides batch-based role configuration.

#### **Constructor**

```typescript
constructor(
  client: PublicClient,
  walletClient?: WalletClient,
  contractAddress: Address,
  chain: Chain
)
```

#### **Read Methods**

##### `getRole(roleHash: Hex): Promise<Role>`
Gets role information by hash. Return shape includes `roleName`, `roleHash` (or `roleHashReturn`), `maxWallets`, `walletCount`, `isProtected`.

##### `hasRole(roleHash: Hex, wallet: Address): Promise<boolean>`
Checks if a wallet has a specific role.

```typescript
const hasRole = await runtimeRBAC.hasRole('0x...', '0x...')
```

##### `getAuthorizedWallets(roleHash: Hex): Promise<Address[]>`
Gets all authorized wallets for a role.

```typescript
const wallets = await runtimeRBAC.getAuthorizedWallets('0x...')
```

##### `getWalletRoles(wallet: Address): Promise<Hex[]>`
Gets all roles assigned to a wallet.

```typescript
const roles = await runtimeRBAC.getWalletRoles('0x...')
```

##### `getSupportedRoles(): Promise<Hex[]>`
Returns the list of supported roles.

```typescript
const roles = await runtimeRBAC.getSupportedRoles()
```

##### `getFunctionSchema(functionSelector: Hex): Promise<FunctionSchema>`
Gets function schema information.

```typescript
const schema = await runtimeRBAC.getFunctionSchema('0xa9059cbb')
```

#### **Write Methods**

##### `roleConfigBatchRequestAndApprove(metaTx: MetaTransaction, options?: TransactionOptions): Promise<TransactionResult>`
Requests and approves a RBAC configuration batch using a meta-transaction.

```typescript
const txHash = await runtimeRBAC.roleConfigBatchRequestAndApprove(
  metaTx,
  { from: account.address }
)
```

##### `roleConfigBatchExecutionParams(definitionAddress: Address, actions: RoleConfigAction[]): Promise<Hex>`
Calls the deployed RuntimeRBACDefinitions contract to build execution params (single source of truth with Solidity).

```typescript
const definitionAddress = deployedAddresses.sepolia.RuntimeRBACDefinitions.address; // from deployed-addresses.json for your chain
const executionParams = await runtimeRBAC.roleConfigBatchExecutionParams(definitionAddress, actions);
// Or use definition helper: import { roleConfigBatchExecutionParams } from '@bloxchain/sdk'; const executionParams = await roleConfigBatchExecutionParams(client, definitionAddress, actions);
```



## 🧭 **Configuration Helpers**

### **`flowReadiness`**

##### `flowReadiness(account: FlowReadinessReader, options: FlowReadinessOptions): Promise<FlowReadiness>`

Answers "is this governed flow open on this account?" in one call, by reading the three things a guarded call
needs: the **function schema** for the execution selector, the **target whitelist** for that selector, and the
**role grants** on it. View calls only — nothing is simulated or sent.

```typescript
import { flowReadiness, formatFlowReadiness, TxAction } from '@bloxchain/sdk';

const readiness = await flowReadiness(guardController, {
  selector: TRANSFER_SELECTOR,
  targets: [tokenAddress],
  roles: [
    { role: OWNER_ROLE, actions: [TxAction.SIGN_META_REQUEST_AND_APPROVE] },
    { role: BROADCASTER_ROLE, actions: [TxAction.EXECUTE_META_REQUEST_AND_APPROVE] }
  ]
});

if (!readiness.open) throw new Error(formatFlowReadiness(readiness));
```

**Options**

| Field | Type | Notes |
|-------|------|-------|
| `selector` | `Hex` | The **execution** selector the flow calls |
| `targets` | `Address[]` | Every target the flow calls through that selector. Must be non-empty |
| `roles` | `(Hex \| { role, actions })[]` | Roles that must hold the flow. Name the `actions` — a bare hash accepts any grant on the selector. Must be non-empty |
| `accountAddress` | `Address?` | The account's own address, so a self-call target (always allowed on chain) reads as satisfied |

**Result**

| Field | Type | Notes |
|-------|------|-------|
| `open` | `boolean` | **True only if every row holds.** A missing row, a read that reverted, or an empty `targets` / `roles` list forces `false` |
| `schema` | `SchemaReadinessRow` | Registration plus `enforceHandlerRelations`, `isGrantRevocable`, `supportedActions`, `handlerForSelectors` |
| `whitelisted` | `WhitelistReadinessRow[]` | One row per target |
| `grants` | `GrantReadinessRow[]` | One row per role: granted actions, missing actions, handler wiring |
| `missing` | `string[]` | Human-readable name of every row that did not hold |
| `errors` | `string[]` | Reads that could not be completed. Non-empty always forces `open === false` |

> The underlying reads are gated by `_validateAnyRole()` on chain. A reader built with
> `walletClient: undefined` sends `from = 0x0` and every read reverts `NoPermission(0x0)`, which is reported in
> `errors` — never as "not configured".

##### `formatFlowReadiness(readiness: FlowReadiness): string`
Renders the result as a short multi-line report, naming every row that did not hold.

### **`resolveHandlerForSelectors`**

##### `resolveHandlerForSelectors(reader, functionSelector: Hex, explicit?: readonly Hex[]): Promise<Hex[]>`

Reads the function schema and returns the `handlerForSelectors` a grant on that selector must carry — the only
way to get it right for every selector, since a runtime-registered selector must **self-reference** while some
built-in schemas point at a different handler. When `explicit` is supplied it is validated rather than
replaced, so a wrong value throws here instead of reverting `HandlerForSelectorMismatch` on chain.

```typescript
import { encodeAddFunctionToRole, resolveHandlerForSelectors } from '@bloxchain/sdk';

const handlerForSelectors = await resolveHandlerForSelectors(guardController, mySelector);
const data = encodeAddFunctionToRole(publicClient, rbacDefinitions, MANAGER_ROLE, {
  functionSelector: mySelector,
  grantedActionsBitmap: 1 << TxAction.SIGN_META_REQUEST_AND_APPROVE,
  handlerForSelectors
});
```

`encodeAddFunctionToRole` also accepts an **omitted** `handlerForSelectors`, defaulting it to
`[functionSelector]` — correct for every selector registered at runtime via `REGISTER_FUNCTION`.

## 📝 **Types & Interfaces**

### **Core Types**

```typescript
type Address = `0x${string}`
type Hash = `0x${string}`


type OperationType = 
  | 'OWNERSHIP_TRANSFER'
  | 'BROADCASTER_UPDATE'
  | 'RECOVERY_UPDATE'
  | 'TIMELOCK_UPDATE'
  | 'ROLE_EDITING_TOGGLE'
  | 'CUSTOM'

type TxAction = 
  | 'EXECUTE_TIME_DELAY_REQUEST'
  | 'EXECUTE_TIME_DELAY_APPROVE'
  | 'EXECUTE_TIME_DELAY_CANCEL'
  | 'SIGN_META_REQUEST_AND_APPROVE'
  | 'SIGN_META_APPROVE'
  | 'SIGN_META_CANCEL'
  | 'EXECUTE_META_REQUEST_AND_APPROVE'
  | 'EXECUTE_META_APPROVE'
  | 'EXECUTE_META_CANCEL'

type TxStatus = 
  | 'UNDEFINED'
  | 'PENDING'
  | 'COMPLETED'
  | 'CANCELLED'
```



## 🔧 **Transaction Options**

```typescript
interface TransactionOptions {
  from?: Address
  value?: bigint
  gas?: bigint
  gasPrice?: bigint
  maxFeePerGas?: bigint
  maxPriorityFeePerGas?: bigint
  nonce?: number
}
```

## 📊 **Error Types**

```typescript
class BloxchainError extends Error {
  code: string
  details?: any
}

class ContractError extends BloxchainError {
  contractAddress: Address
  method: string
}

class ValidationError extends BloxchainError {
  field: string
  value: any
}

class ComplianceError extends BloxchainError {
  violation: ComplianceViolation
}
```

## 🎯 **Usage Examples**

### **Basic Contract Interaction**

```typescript
import { SecureOwnable } from '@bloxchain/sdk'
import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'

const client = createPublicClient({
  chain: mainnet,
  transport: http()
})

const secureOwnable = new SecureOwnable(
  client,
  undefined,
  '0x...',
  mainnet
)

// Read operations
const owner = await secureOwnable.owner()
const timeLock = await secureOwnable.getTimeLockPeriodSec()

console.log('Owner:', owner)
console.log('Time lock period:', timeLock)
```

---

**Need more details?** Check out the specific guides:
- [SecureOwnable Guide](./secure-ownable.md)
- [RuntimeRBAC Guide](./runtime-rbac.md)
