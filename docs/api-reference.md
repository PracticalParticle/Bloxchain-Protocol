# API Reference

Complete reference for Bloxchain TypeScript SDK classes and methods. Contract source of truth: Solidity in `contracts/core/`. See [TECHNICAL_OVERVIEW.md](../TECHNICAL_OVERVIEW.md) and [contracts/core/AUDIT.md](../contracts/core/AUDIT.md).

> Integrating from outside the repo? Start with the [Integrator Checklist](./integrator-checklist.md) - ABIs, EIP-712 constants, error unwrapping, deadline semantics, and the inner-status check, each with the workaround it replaces.

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



## 📦 **Package Entry Points**

| Specifier | Contents |
|-----------|----------|
| `@bloxchain/sdk` | Contract wrappers, meta-tx helpers, EIP-712 constants, error and inner-status utilities |
| `@bloxchain/sdk/abi` | Typed ABI barrel — `copyBloxAbi`, `accountBloxAbi`, `erc20Abi`, …, plus `ABIS` and `ALL_ERROR_ABI` |
| `@bloxchain/sdk/abi/<Name>` | One contract's ABI as an ES module (`@bloxchain/sdk/abi/CopyBlox`) |
| `@bloxchain/sdk/abi/<Name>.abi.json` | The raw JSON file, for tools that want it |

```typescript
import { copyBloxAbi } from '@bloxchain/sdk/abi/CopyBlox';
import { ABIS, ALL_ERROR_ABI } from '@bloxchain/sdk/abi';
```

`<Name>` is any of: `AccountBlox`, `BareBlox`, `BaseStateMachine`, `CopyBlox`,
`EngineBlox`, `ERC20`, `GuardController`, `GuardControllerDefinitions`,
`IDefinition`, `RoleBlox`, `RuntimeRBAC`, `RuntimeRBACDefinitions`, `SecureBlox`,
`SecureOwnable`, `SecureOwnableDefinitions`. Each module also exports
`<name>ErrorAbi` and `<name>EventAbi` filters.

## 🔑 **Reading permissioned views (`readAs`)**

Role-gated views (`getWalletRoles`, `getAuthorizedWallets`, `getActiveRolePermissions`,
`getSupportedRoles`, `getTransaction`, `getFunctionWhitelistTargets`, …) require the
caller to hold a role. A wrapper built without a wallet client sends no `from`, the
contract sees `address(0)`, and the call reverts `NoPermission(0x0)`.

```typescript
// At construction (optional 5th argument on every core wrapper)
const reader = new RuntimeRBAC(publicClient, undefined, account, chain, ownerAddress);

// Or later, or per call
reader.setReadSender(ownerAddress);
await reader.getWalletRoles(wallet, ownerAddress);
```

| Method | Effect |
|--------|--------|
| `setReadSender(address?)` | Sets (or clears) the `from` for reads; returns `this` |
| `getReadSender()` | The address reads are currently sent as |
| `<view>(…, readAs?)` | Per-call override, highest precedence |

Resolution order: per-call `readAs` → `setReadSender` → wallet client account → no
sender. The zero address is refused. `readAs` chooses an `eth_call` `from`; it grants
nothing and cannot be used to write.

## ✍️ **EIP-712 meta-transaction constants**

```typescript
import {
  META_TX_DOMAIN, META_TX_DOMAIN_NAME, META_TX_PRIMARY_TYPE,
  META_TX_TYPES, META_TX_TYPED_DATA_TYPES_AS_SIGNED, EIP712_DOMAIN_TYPE,
  buildTypedDataMessage, buildMetaTxTypedData, metaTxDeadlineFor,
} from '@bloxchain/sdk';
```

| Export | Use |
|--------|-----|
| `META_TX_TYPES` | Pass to viem's `signTypedData` — viem adds `EIP712Domain` itself |
| `META_TX_TYPED_DATA_TYPES_AS_SIGNED` | The set *as a signer sees it*; use for signer-policy conditions and eth-sig-util `TypedMessage` |
| `buildTypedDataMessage(metaTx)` | The EIP-712 message object |
| `buildMetaTxTypedData(metaTx, verifyingContract, chainId?)` | Domain + types + primaryType + message in one call |
| `metaTxDeadlineFor(client, ttlSeconds)` | Duration to pass as `deadline` (see below) |

### `deadline` is a duration

`createMetaTxParams(..., deadline, ...)` takes **seconds of validity**; the contract
stores `block.timestamp + deadline`, read from the *latest block*. On a chain that
mines on demand, that timestamp freezes between transactions while wall-clock time
runs on, so a naive TTL produces meta-transactions that are born expired.
`metaTxDeadlineFor` returns `drift + ttl` and degrades to exactly `ttl` on a chain
with scheduled blocks.

## ⛓️ **Inner transaction status**

A mined transaction is not a successful one: `EngineBlox` catches an inner revert,
records `TxStatus.FAILED`, and the outer receipt still says `success` — after
charging for the gas.

```typescript
const res = await account.roleConfigBatchRequestAndApprove(metaTx, { from: broadcaster });
const receipt = await account.waitForTransactionAndAssertInner(res);
```

| Export | Use |
|--------|-----|
| `assertInnerSuccess(receipt, opts)` | Throw `InnerTransactionFailedError` if a record is `FAILED` |
| `readInnerOutcomes(receipt, opts)` | Non-throwing: every terminal record, failures decoded |
| `waitForTransactionAndAssertInner(client, hash, opts)` | Wait, then assert |
| `ENGINE_BLOX_EVENTS_ABI` | `TransactionEvent` / `TxExecutionResult` — declared on the library, so absent from a Blox's own ABI |
| `TX_STATUS_NAMES`, `txStatusName(status)` | Name a `TxStatus` value |

Options: `address` (scope to one Blox), `abi` (decode the inner revert — pass the
**target's** ABI or `ALL_ERROR_ABI`), `failOnCancelled` (off by default).

## 🧪 **Simulation, gas estimation, and `MAX_TX_GAS`**

`simulationMode` proves the call would not revert against the latest block. It does
**not** size gas, and it is not a promise about the block you land in.

| Question | Mechanism |
|----------|-----------|
| Will it revert? | `simulateContract` via `simulationMode` (`'strict'` default, `'warn-only'`, `'skip'`) |
| How much gas? | `eth_estimateGas` — see the state-override note below |
| What is the ceiling? | `MAX_TX_GAS` = `2 ** 24` = 16,777,216 (EIP-7825) |

Public nodes answer `eth_estimateGas` with *"insufficient funds"* instead of a number
when the sender cannot cover `gas × price + value`. Give it a notional balance for
the estimate only:

```typescript
const gas = await publicClient.estimateContractGas({
  address: accountAddress, abi: accountBloxAbi, functionName: 'executeGuarded',
  args, account: caller,
  stateOverride: [{ address: caller, balance: parseEther('10') }],
});
```

EIP-7825 caps any single transaction at `2 ** 24` gas regardless of the block gas
limit. This bites on configuration batches, not single calls: split a batch that
estimates near the cap rather than having it rejected outright. The `gasLimit` in
`TxParams` is a cap the guard forwards to the inner call, not a price — but it still
counts toward the outer transaction's limit.

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

// TxStatus is a numeric enum matching EngineBlox.sol; `TX_STATUS_NAMES` names the values.
const TxStatus = {
  UNDEFINED: 0, PENDING: 1, EXECUTING: 2, PROCESSING_PAYMENT: 3,
  CANCELLED: 4, COMPLETED: 5, FAILED: 6,
} as const
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

## 📊 **Error handling**

```typescript
import { explainError } from '@bloxchain/sdk';
import { ALL_ERROR_ABI } from '@bloxchain/sdk/abi';

try {
  await account.transferOwnershipRequest({ from: owner });
} catch (e) {
  const why = explainError(e, { abi: ALL_ERROR_ABI });
  switch (why.errorName) {
    case 'BeforeReleaseTime': /* still in timelock */ break;
    case 'NoPermission':      /* caller holds no role */ break;
    case 'SignerDenied':      /* the signer refused; nothing was broadcast */ break;
    default: console.error(why.message, why.raw);
  }
}
```

```typescript
interface ExplainedError {
  kind: 'revert' | 'signer' | 'transport' | 'unknown'
  errorName: string                 // switch on this, never on `message`
  args: Record<string, unknown>
  selector?: `0x${string}`
  raw?: `0x${string}`               // revert bytes, untouched
  message: string
  cause: unknown
}
```

`explainError` never throws. It asks the **signer** layer first — a remote signer's
refusal arrives wrapped as the cause of a contract error, and guessing a revert for
it sends you to the wrong dashboard — then decodes the revert, then classifies
transport failures.

| Export | Use |
|--------|-----|
| `explainError(error, { abi, ignoreSelectors })` | One structured answer |
| `extractRevertData(error, opts)` | Walk `cause` / `originalError` for the raw revert bytes |
| `decodeRevert(data, abi?)` | Decode bytes: ABI first, then `Error(string)` / `Panic`, then the curated table |
| `classifySignerError(error)` | `SignerDenied` or `SignerError`, or `undefined` if the chain reverted |
| `isRevertNamed(explained, name)` | Narrow to one protocol error |
| `ERROR_SIGNATURES`, `ERROR_DECODE_TYPES` | The curated selector tables |

| `errorName` | Broadcast? | Gas spent? |
|-------------|-----------|------------|
| `SignerDenied` — policy violation or user rejection | no | none |
| `SignerError` — signer auth failure or outage | no | none |
| a protocol error name — the chain reverted | yes | yes |
| `RpcError` — transport | maybe | maybe |

Two things the unwrap will not do: read a 20-byte address as text, or read structured
revert bytes as ASCII. An error it cannot name is reported as `Unknown` with its
bytes attached.

`enhanceViemError` / `handleViemError` (thrown by the wrappers themselves) carry the
same facts as `errorName`, `args`, `selector`, `raw`, `kind`, and `signerFailure`
alongside the existing message fields.

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
- [Integrator Checklist](./integrator-checklist.md)
- [SecureOwnable Guide](./secure-ownable.md)
- [RuntimeRBAC Guide](./runtime-rbac.md)
