# Getting Started with Bloxchain – Account Pattern

This guide shows the **simplest way** to start using the Bloxchain protocol: by connecting to an **Account‑based contract** that already combines all core components (`SecureOwnable`, `RuntimeRBAC`, `GuardController`) behind a single address.

For a deeper explanation of the pattern itself, see the [Account Pattern doc](./account-pattern.md).

## 📋 **Prerequisites**

- Node.js 18+
- TypeScript 4.5+
- npm or yarn
- Basic knowledge of Ethereum and smart contracts

Pin **`@bloxchain/sdk`** and optionally **`@bloxchain/contracts`** to exact versions in production. See [Versioning & releases](./VERSIONING.md) for how npm semver relates to on-chain `EngineBlox.VERSION`.

## 🚀 **Installation**

```bash
npm install @bloxchain/contracts @bloxchain/sdk viem

# Or with yarn
yarn add @bloxchain/contracts @bloxchain/sdk viem
```

Those two packages are enough to **create** an account as well as operate one. You do not
need to clone or compile this repository:

| Package | What you get |
|---------|--------------|
| `@bloxchain/sdk` | Typed wrappers, encoders, meta-transaction signing, the account shape gate |
| `@bloxchain/contracts` | `artifacts/*.json` (ABI **and** bytecode, link references, compiler settings), `official-deployed-addresses.json`, Solidity sources |

```typescript
// Compiled artifacts, no solc in your build
import factory from '@bloxchain/contracts/artifacts/CopyBlox.json' with { type: 'json' };
import template from '@bloxchain/contracts/artifacts/AccountBlox.json' with { type: 'json' };
import official from '@bloxchain/contracts/official-deployed-addresses.json' with { type: 'json' };
```

`artifacts/manifest.json` records a sha256 per artifact plus the compiler configuration
they were built with, so you can pin what you consumed.

## 🔧 **Basic Setup (Account-Based Contract)**

### 1. **Import Required Dependencies**

```typescript
import {
  SecureOwnable,
  RuntimeRBAC,
  GuardController,
} from '@bloxchain/sdk';
import { createPublicClient, createWalletClient, http } from 'viem';
import { sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
```

### 2. **Initialize Clients**

```typescript
const rpcUrl = process.env.RPC_URL!;           // e.g. https://sepolia.infura.io/v3/...
const privateKey = process.env.PRIVATE_KEY!;   // never hardcode; use env vars

const account = privateKeyToAccount(privateKey);

// Public client for reads
const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(rpcUrl),
});

// Wallet client for writes
const walletClient = createWalletClient({
  account,
  chain: sepolia,
  transport: http(rpcUrl),
});
```

### 3. **Connect to an Account-Based Contract**

Use a deployed Account implementation (for example `AccountBlox`) from `deployed-addresses.json`:

```typescript
// Example shape – adjust the import path to your deployed-addresses.json (often at the repository root)
import deployed from '../deployed-addresses.json';

const network = 'sepolia' as const;
const accountAddress = deployed[network].AccountBlox.address as `0x${string}`;

// All three wrappers point to the SAME address
const secureOwnable = new SecureOwnable(publicClient, walletClient, accountAddress, sepolia);
const runtimeRBAC = new RuntimeRBAC(publicClient, walletClient, accountAddress, sepolia);
const guardController = new GuardController(publicClient, walletClient, accountAddress, sepolia);
```

### Definition library addresses (public testnets)

Integrators need deployed **definition libraries** for execution-param helpers
(`updateRecoveryExecutionParams`, batch encoders, schema refresh).

**Read them from `official-deployed-addresses.json`**, which ships with
`@bloxchain/contracts` and holds the addresses a human release owner has declared official,
per network:

```typescript
import official from '@bloxchain/contracts/official-deployed-addresses.json' with { type: 'json' };
import { resolveOfficialNetwork, getOfficialAddress } from '@bloxchain/sdk';

const sepolia = resolveOfficialNetwork(official, 11155111);
const gcd = getOfficialAddress(sepolia, 'GuardControllerDefinitions');
const rbd = getOfficialAddress(sepolia, 'RuntimeRBACDefinitions');
const sod = getOfficialAddress(sepolia, 'SecureOwnableDefinitions');
```

`getOfficialAddress` throws rather than returning null for a contract that is not declared
on that network, because quietly falling back to some other address is the failure this
file exists to prevent.

> **`official-deployed-addresses.json` is not `deployed-addresses.json`.** The deployment
> scripts in this repository write `deployed-addresses.json` for whatever network they were
> pointed at, including local and lab chains. It is git-ignored, it is never published, and
> it is not a source of truth for an integrator. Only the official file is.

For local protocol development against `deployed-addresses.json`, the keys map to env vars:

| `deployed-addresses.json` key | Env variable |
|-------------------------------|--------------|
| `SecureOwnableDefinitions` | `SECURE_OWNABLE_DEFINITIONS_ADDRESS` |
| `RuntimeRBACDefinitions` | `RUNTIME_RBAC_DEFINITIONS_ADDRESS` |
| `GuardControllerDefinitions` | `GUARD_CONTROLLER_DEFINITIONS_ADDRESS` |
| `GuardControllerDefinitions` | `DEFINITION_CONTRACT_ADDRESS` (alias for single schema-refresh address) |

Pass either source's addresses to SDK helpers such as
`updateRecoveryExecutionParams(client, sod, newRecovery)`.

---

## 🏗 **Provisioning an account from npm alone**

This is the supported public path: `npm i @bloxchain/contracts @bloxchain/sdk` and an RPC
URL are enough to create a governed account on an official network.

Working reference: **`scripts/sanity-sdk/provision-account.ts`** (`npm run provision:account`).
It is idempotent and safe to re-run; `--offline` validates configuration without a chain
and `--dry-run` checks every lock against a chain without sending anything.

### 1. The sanctioned factory

Provisioning goes through a **CopyBlox-shaped clone factory**. `cloneBlox` creates an
EIP-1167 minimal proxy of the account template and runs `initialize` on it **in the same
transaction**, so there is never a live, uninitialized account at a public address.

```typescript
import { CopyBlox, resolveOfficialNetwork, getOfficialAddress } from '@bloxchain/sdk';
import official from '@bloxchain/contracts/official-deployed-addresses.json' with { type: 'json' };

const network = resolveOfficialNetwork(official, 11155111);
const factory = new CopyBlox(
  publicClient,
  broadcasterWallet,
  getOfficialAddress(network, 'CopyBlox'),
  sepolia,
);

const result = await factory.cloneBlox(
  {
    template: getOfficialAddress(network, 'AccountBlox'),
    initialOwner: ownerAddress,
    broadcaster: broadcasterAddress,
    recovery: recoveryAddress,
    timeLockPeriodSec: 3600n,
  },
  { from: broadcasterAddress },
);

const receipt = await result.wait();
const account = factory.cloneAddressFromReceipt(receipt);
```

### 2. Finding the accounts an owner already has

An owner can hold **more than one** account. Ask for all of them:

```typescript
const { clones, source } = await factory.clonesOf(ownerAddress);
// source: 'on-chain-index' when the factory carries clonesOf,
//         'bloxcloned-logs'  when it predates it (the wrapper falls back automatically)
```

Taking "the latest `BloxCloned` log" strands every earlier account the owner holds,
including ones with balances or pending time-locked transfers. Newer factories answer
`clonesOf(owner)` on-chain; `official-deployed-addresses.json` records which deployments
have it (`contracts.CopyBlox.supports.clonesOf`). For a log scan, pass the factory's
deployment block as `fromBlock`, because public providers refuse wide ranges.

### 3. The shape gate: never adopt an address unchecked

Before you point a session, a signing policy or a user's passbook at an address, check
that it is actually an account **and** that the caller owns it:

```typescript
import { isAccountBlox, inspectAccountBlox, assertOwnedAccount } from '@bloxchain/sdk';

await isAccountBlox(publicClient, candidate);                    // boolean
await inspectAccountBlox(publicClient, candidate);               // which check failed, and why
await assertOwnedAccount(publicClient, candidate, ownerAddress); // throws unless owned
```

The gate is `getCode` + `owner()` + `initialized()` + ERC-165 **`ISecureOwnable`**, and
every part earns its place. Measured against four real contracts:

| Address | `getCode` | `owner()` | `initialized()` | `IBaseStateMachine` | `ISecureOwnable` |
|---|---|---|---|---|---|
| An account clone | 20,853 B | the owner | `true` | `true` | `true` |
| An EOA | none | reverts | reverts | reverts | reverts |
| A plain ERC-20 | 2,771 B | reverts | reverts | `false` | `false` |
| **The factory itself** | 11,684 B | reverts | `false` | **`true`** | **`false`** |

The factory answers `IBaseStateMachine` because it **is** one. A gate built on that check
alone loads the factory as if it were an account.

### 4. Gas: the clone sits just under a hard protocol cap

```text
clone + initialize (AccountBlox)   ~16,236,000 gas measured
EIP-7825 per-transaction cap        16,777,216 (2^24)
head-room                             ~540,000 gas
```

Public networks enforce **EIP-7825**: a single transaction may not ask for more than
`2^24` gas, whatever the block gas limit is. A 60 M block still rejects a 20 M
transaction with `transaction gas limit too high (cap: 16777216, tx: 20000000)`.

Practical rules, in order of importance:

1. **Send an explicit gas limit at the cap**, not an estimate. The SDK wrapper does this by
   default (`GAS_ENVELOPE.cloneSendGasLimit`).
2. **Fail loudly below the floor.** An estimate well under ~15 M means the estimator never
   priced the clone: a public node without a state override answers "insufficient funds"
   rather than a number, and an estimate that comes back exactly *at* the cap was clamped.
   `assertGasEnvelope` treats both as errors.
3. **Simulation does not size gas.** `simulationMode` proves the call is revert-free and
   nothing more.
4. **A lab chain that has not implemented EIP-7825 will accept more**, which is how this
   passes locally and fails on Sepolia.

```typescript
import { MAX_TX_GAS, GAS_ENVELOPE, assertUnderMaxTxGas } from '@bloxchain/sdk';
```

### 5. The three locks

A fresh account is a **vault**: it exists, it is owned, and it will refuse everything.
Three things must be true before the first `requestAndApproveExecution` succeeds.

| Lock | What it does | What its absence looks like |
|---|---|---|
| **1. `initialize`** | Sets owner, broadcaster, recovery, time lock | The clone factory does this atomically with the clone |
| **2. Guard batch** | Registers schemas and **whitelists the target** for its selector | `TargetNotWhitelisted` |
| **3. Role batch** | **Grants a role an action** on the execution selector and the handler | `NoPermission(caller)` |

**Whitelist is not permission**, and this is the step that surprises people.
`initialize` already registers the `transfer(address,uint256)` schema with all nine
actions supported, so `getFunctionSchema(0xa9059cbb)` looks complete. But
`getActiveRolePermissions` shows **no role holding any action on that selector**, and
`requestAndApproveExecution` checks the *execution* selector. Whitelisting the token and
stopping there yields `NoPermission`. Locks 2 and 3 are both required.

Lock 3 needs **both halves** of the pair:

- OWNER: `SIGN_META_REQUEST_AND_APPROVE`
- BROADCASTER: `EXECUTE_META_REQUEST_AND_APPROVE`

with `handlerForSelectors` naming the handler the call arrives through
(`REQUEST_AND_APPROVE_EXECUTION_SELECTOR` for the built-in schemas). A selector you
**register yourself** is different: `GuardController._registerGuardedFunction` sets
`enforceHandlerRelations: true` with a self-reference, so a grant on a self-registered
selector must name **that selector itself** or the batch reverts
`HandlerForSelectorMismatch`.

Configuring the guard and role sides is covered in
[Guard Controller](./guard-controller.md) and [Runtime RBAC](./runtime-rbac.md).

### 6. Keep provisioning idempotent

Provisioning gets run more than once against the same account, so write it to converge
rather than to apply:

- **Read back before sending.** Whitelist membership (`getFunctionWhitelistTargets`),
  grants (`getActiveRolePermissions`) and balances. A repeat run should send nothing.
- **Version the desired role set.** Keep a `ROLE_SET_VERSION` next to it and bump it when
  the set changes, so a deployment can be asked which set an account is on.
- **Change a grant with REMOVE + ADD in one batch.** A second `addFunctionToRole` for the
  same `(role, selector)` reverts `ResourceAlreadyExists`.
- **A mined receipt is not a result.** A config batch can mine `success`, burn 2 M gas and
  grant nothing. Read the record back and check its inner `TxStatus` is `COMPLETED`.
- **Registry views are permissioned.** A reader built with no wallet client sends
  `from = 0x0` and is refused `NoPermission(0x0)`. Build readers with a wallet client.
- **`createMetaTxParams` takes a duration, not a timestamp.** The contract adds
  `block.timestamp`. On a chain that mines on demand, also correct for the drift between
  wall clock and the latest block, or the deadline is already past when the transaction
  mines while `eth_call` still passes.

---

## 📖 **Common Tasks with an Account**

### 1. **Inspect Ownership & Security State**

```typescript
// SecureOwnable – core security state
const owner = await secureOwnable.owner();
const broadcasters = await secureOwnable.getBroadcasters();
const recovery = await secureOwnable.getRecovery();
const timeLockPeriod = await secureOwnable.getTimeLockPeriodSec();

console.log({ owner, broadcasters, recovery, timeLockPeriod });

// RuntimeRBAC – roles and permissions
const supportedRoles = await runtimeRBAC.getSupportedRoles();
const firstRole = supportedRoles[0];
const roleInfo = await runtimeRBAC.getRole(firstRole);

console.log('First role info:', roleInfo);
```

### 2. **Perform a Secure Ownership Transfer**

```typescript
// 1) Owner (or recovery) requests a transfer (new owner is encoded in the state machine)
const txRequest = await secureOwnable.transferOwnershipRequest({
  from: account.address,
});

await publicClient.waitForTransactionReceipt({ hash: txRequest.hash });

// 2) After the timelock expires, approve the pending transaction (txId from BaseStateMachine.getPendingTransactions / getTransaction)
const baseStateMachine = new BaseStateMachine(publicClient, walletClient, accountAddress, sepolia);
const pendingTxIds = await baseStateMachine.getPendingTransactions();
const txId = pendingTxIds[0];

const txApprove = await secureOwnable.transferOwnershipDelayedApproval(txId, {
  from: account.address,
});

await publicClient.waitForTransactionReceipt({ hash: txApprove.hash });
```

### 3. **Guarded Call via GuardController**

Use the GuardController wrapper to execute a time‑locked call to a whitelisted target:

```typescript
import { EngineBlox } from '@bloxchain/sdk/lib/EngineBlox';

// Assume target is a whitelisted contract for a registered function selector
const target = '0x...'; // e.g. ERC20 token
const functionSelector = '0xa9059cbb' as `0x${string}`; // transfer(address,uint256)
const params = '0x...' as `0x${string}`; // abi-encoded params

const gasLimit = 300_000n;
const operationType = EngineBlox.NATIVE_TRANSFER_OPERATION; // or custom op type

const txResult = await guardController.executeWithTimeLock(
  target,
  0n,                    // value
  functionSelector,
  params,
  gasLimit,
  operationType,
  { from: account.address },
);

console.log('Requested guarded execution tx hash:', txResult.hash);
```

(Approvals, cancellations, and meta‑tx flows use the same patterns as described in the component‑specific docs.)

---

## Deployment and initialization

Account‑style contracts use OpenZeppelin **Initializable** semantics: there is **no constructor state** on the implementation; a single correct **`initialize(...)`** (or your product’s chained initializer) must run on the **proxy** (or minimal proxy). Treat **initialization as part of deployment**: the address end users call should not appear as a **public, uninitialized** proxy across block boundaries—wire **`initialize` in the same transaction** that creates the proxy (factory, proxy constructor `_data`, or equivalent), then rely on ownership, RBAC, and guards.

### **1. Recommended: factory / cloner pattern**

To avoid “forgot to call `initialize`” or wrong ordering when spinning up many instances, prefer a **factory** that creates the proxy and calls `initialize` **in the same transaction**. A **CopyBlox-shaped** clone factory is the sanctioned public provisioning path: see [Provisioning an account from npm alone](#-provisioning-an-account-from-npm-alone) for the supported flow, and `contracts/examples/applications/CopyBlox/CopyBlox.sol` for the contract:

- Validates the implementation implements **`IBaseStateMachine`**.
- **`Clones.clone`** (EIP‑1167) then **`call`s** `initialize(address,address,address,uint256,address)` on the new clone.
- If initialization **reverts**, the whole transaction **reverts**—you do not end up with a live, uninitialized clone from that path.

Use the same **initializer arity and argument order** your concrete contract exposes (often the same five parameters as `CopyBlox` / `BaseStateMachine`).

### **2. Proxy deploy runbook (atomic `initialize`)**

If you deploy transparent / UUPS / ERC‑1967–style proxies yourself, you still must avoid a **live, public proxy that is uninitialized** between transactions. Prefer **one atomic transaction** that both **creates** the proxy and **runs `initialize`**—for example:

- OpenZeppelin **proxy constructors** that accept **`_data`**: supply ABI‑encoded **`initialize(...)`** calldata so the proxy’s constructor performs the initializer delegatecall before the deployment transaction ends.
- A **proxy factory** (or deployer helper) whose single entrypoint **`deploy`s** the proxy and **`call`s** `initialize` on the new address in the **same transaction** (any revert aborts the whole deploy; no orphan uninitialized proxy from that path).

Explicit runbook:

1. Deploy **implementation** (never call user‑facing `initialize` on the implementation in production unless you mean to brick or document a pattern—follow OZ guidance).
2. Create the **proxy** using a pattern where **`initialize`** runs **in the same transaction** as proxy creation, with owner, broadcaster, recovery, timelock, and `eventForwarder` (match your concrete contract’s arity and order). Do **not** rely on a follow‑up transaction to initialize a proxy that is already callable at its deployed address.
3. **Only after** that atomic creation+initialization transaction succeeds, run smoke‑reads on the **proxy**: **`owner()`**, **`getRecovery()`**, **`getTimeLockPeriodSec()`**, and verify **`eventForwarder`** matches your intent—before funding, granting roles, or sending production traffic.

More detail: [Best Practices — Deployment](./best-practices.md) (initializer subsection under Deployment) and [Account Pattern](./account-pattern.md).

---

## 🔒 **Security Basics**

Keep these minimum practices in your integration:

```typescript
// 1) Environment-based secrets
const PRIVATE_KEY = process.env.PRIVATE_KEY;
if (!PRIVATE_KEY) throw new Error('PRIVATE_KEY env var is required');

// 2) Simple address validation
const isAddress = (value: string) => /^0x[a-fA-F0-9]{40}$/.test(value);

// 3) Error handling around writes
try {
  const result = await secureOwnable.transferOwnershipRequest({ from: account.address });
  console.log('Tx hash:', result.hash);
} catch (error) {
  console.error('Tx failed:', error);
}
```

For a full set of recommendations, see [Best Practices](./best-practices.md).

---

## 🧪 **Protocol development (internal test chain)**

The repo includes **internal** scripts for running sanity tests against a local JSON-RPC node (often called `remote_evm` in `deployed-addresses.json`). This is **not** part of the published protocol surface integrators should rely on.

For protocol maintainers only:

1. Copy `env.example` to `.env` (or run `npm run generate:sanity-env -- --out .env` after an internal deploy).
2. Deploy the internal test stack: `npm run deploy:remote-evm:test`
3. Run Foundry: `npm run test:foundry`; optional SDK sanity: `npm run test:sanity-sdk:core`

Integrators should use **public testnets** (e.g. sepolia) and addresses from `deployed-addresses.json` with the SDK — not hard-coded role or wallet profiles from sanity tooling.

---

## 📚 **Next Steps**

1. Learn more about the [Account Pattern](./account-pattern.md) and how it composes the core components.
2. Explore component‑level docs:
   - [SecureOwnable](./secure-ownable.md)
   - [RuntimeRBAC](./runtime-rbac.md)
   - [GuardController](./guard-controller.md)
3. Dive into architecture:
   - [Bloxchain Architecture](./bloxchain-architecture.md)
   - [State Machine Engine](./state-machine-engine.md)
   - [Core Contract Graph](./core-contract-graph.md)
4. Look at end‑to‑end flows in [Basic Examples](./examples-basic.md).

For detailed API signatures, see the [API Reference](./api-reference.md).

