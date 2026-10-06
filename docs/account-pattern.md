## Account Pattern – Composing Core Components

The `Account` pattern (`contracts/core/pattern/Account.sol`) is the **easiest way to start with the Bloxchain protocol**. It combines all core security components into a single upgrade‑safe contract:

- `SecureOwnable` – owner / broadcaster / recovery roles and secure ownership flows  
- `RuntimeRBAC` – dynamic roles and function permissions  
- `GuardController` – time‑locked, meta‑tx‑aware execution with target whitelists  

```12:75:contracts/core/pattern/Account.sol
abstract contract Account is GuardController, RuntimeRBAC, SecureOwnable {
    // initialize(...) wires all three components
    // supportsInterface(...) joins all component interfaces
    // receive() accepts ETH, fallback() rejects unsupported calls
}
```

Concrete implementations (for example `AccountBlox`) inherit from `Account` and add application‑specific logic while reusing the shared state machine and security model.

---

## On‑Chain Responsibilities

- **Initialization**
  - Single `initialize(initialOwner, broadcaster, recovery, timeLockPeriodSec, eventForwarder)` call that:
    - Initializes the shared `SecureOperationState` via each component.
    - Loads definition libraries for:
      - Secure ownership operations (`SecureOwnableDefinitions`)
      - Runtime role configuration (`RuntimeRBACDefinitions`)
      - Guarded execution and whitelists (`GuardControllerDefinitions`)
  - **Operational recommendation:** For many deployed instances, use a **factory / cloner** that deploys the proxy (or minimal proxy) and invokes `initialize` in the **same transaction** so initialization cannot be skipped by mistake. The official factory is **`BasicFactory`** (`contracts/factory/BasicFactory.sol`), pinned to `BasicAccount` — vets the pin once, clones, calls `initialize`, reverts on failure. The legacy / example **`CopyBlox`** (`contracts/examples/applications/CopyBlox/CopyBlox.sol`) shows the same pattern as an open factory for any `IBaseStateMachine`. Manual transparent/UUPS deploys should follow an explicit runbook; see [Getting Started — Deployment and initialization](./getting-started.md#deployment-and-initialization).

- **Security Model**
  - Protected roles (`OWNER_ROLE`, `BROADCASTER_ROLE`, `RECOVERY_ROLE`) are controlled only by `SecureOwnable`.
  - Non‑protected roles and function permissions are configured via `RuntimeRBAC` role config batches.
  - Execution of arbitrary calls (including ERC‑20, application contracts, etc.) is mediated by `GuardController`:
    - Time‑locked request / approve / cancel flows.
    - Meta‑transaction based approvals (owner signs with ECDSA / `ecrecover`, broadcaster executes; not ERC-1271).
    - Strict per‑function **target whitelists**.

- **ETH Handling**
  - `receive()` accepts plain ETH and emits `EthReceived(sender, value)`.
  - `fallback()` always reverts – all non‑ETH‑transfer calls must go through known selectors coordinated by the state machine.
  - **Clones:** do not use Solidity `transfer` / `send` to a freshly minted EIP-1167 account while the implementation is cold; use `call` with enough gas.

---

## SDK View of an Account

From the SDK’s perspective, an Account is **one contract address** that simultaneously exposes all three component interfaces.

You typically create three wrappers pointing to the same address:

```typescript
import {
  SecureOwnable,
  RuntimeRBAC,
  GuardController,
} from '@bloxchain/sdk';
import { createPublicClient, createWalletClient, http } from 'viem';
import { sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

// 1) Create clients
const rpcUrl = process.env.RPC_URL!;
const privateKey = process.env.PRIVATE_KEY!;

const account = privateKeyToAccount(privateKey);

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(rpcUrl),
});

const walletClient = createWalletClient({
  account,
  chain: sepolia,
  transport: http(rpcUrl),
});

// 2) Use an account you own, e.g. a BasicAccount clone minted by the official BasicFactory
const accountAddress = '0x...' as `0x${string}`; // your clone; gate it with assertOwnedAccount first

const secureOwnable = new SecureOwnable(publicClient, walletClient, accountAddress, sepolia);
const runtimeRBAC = new RuntimeRBAC(publicClient, walletClient, accountAddress, sepolia);
const guardController = new GuardController(publicClient, walletClient, accountAddress, sepolia);
```

Once instantiated:

- Use `secureOwnable` to:
  - Inspect and change owner / broadcaster / recovery (via secure, time‑locked flows).
  - Update global time‑lock configuration.
- Use `runtimeRBAC` to:
  - Inspect roles and their permissions.
  - Apply **role config batches** using the same definition contracts used on‑chain.
- Use `guardController` to:
  - Submit guarded executions via `executeWithTimeLock` or `executeWithPayment`.
  - Approve / cancel via time‑lock or meta‑transactions.
  - Configure whitelists and function schemas using guard config batches.

---

## Getting an Account, and Recognising One

### A fresh account is a vault

`initialize` gives an account its owner, broadcaster, recovery address and time lock. It
does **not** give it the ability to do anything. A newly initialized account refuses every
execution until two more things are configured:

1. a **guard batch** that whitelists the execution target for its selector, and
2. a **role batch** that grants a role an action on the execution selector and its handler.

The second one is the one that catches people. `initialize` registers the
`transfer(address,uint256)` schema with all nine actions *supported*, so the schema read
looks complete, while `getActiveRolePermissions` shows no role actually *holding* an
action on that selector. Whitelisting a token and stopping there reverts
`NoPermission(caller)`. **A supported action is not a granted action, and a whitelist is
not a permission.** The full recipe is in
[Getting Started, three locks](./getting-started.md#7-the-three-locks).

### Creating one: the official factory

The official way to create an account is **`BasicFactory` → `BasicAccount`** (SPEC-2026-0140).
`cloneBlox` (or the deterministic `cloneBloxDeterministic`) deploys an EIP-1167 minimal proxy
of the one `BasicAccount` the factory is pinned to and calls `initialize` on it in the **same
transaction**, so no uninitialized account is ever live at a public address. In the SDK, use
the `BasicFactory` client; operate the clone with the `SecureOwnable` / `RuntimeRBAC` /
`GuardController` wrappers above (there is no separate account client).

The factory is deliberately **not** in `contracts/core`, and an account never depends on it at
runtime. No network declares the official pair yet: `getOfficialBasicMint(network)` throws
until one does, and never falls back to CopyBlox.

The legacy / example **CopyBlox** factory (historical Sepolia developer pipeline) is
**deprecated as an official path**. Its SDK client stays exported for existing integrators.

### Official and legacy pipelines

| | Official (SPEC-2026-0130 / 0140) | Legacy / example (declared on Sepolia) |
|---|---|---|
| Account | `BasicAccount` (`contracts/account/`), 1-day floor, 90-day ceiling, implementation initializer locked | `AccountBlox`, 1-second timelock floor |
| Factory | `BasicFactory` (`contracts/factory/`), a pinned minter: clones the one `BasicAccount` fixed in its constructor | `CopyBlox`, the open factory: a bare `BaseStateMachine` that clones any blox |
| Mint | Permissionless **self-owner** mint: the sender must be `initialOwner` (SPEC-2026-0142), as a **direct EOA call** (M-1). Nonce `cloneBlox(initialOwner, broadcaster, recovery, timeLockPeriodSec)`, or deterministic `cloneBloxDeterministic(..., index, salt)` (`CREATE2`) with `predictClone(deployer, initialOwner, index, salt)` | Permissionless, nonce (`CREATE`), for any owner |
| Finding the accounts of an owner | `predictClone` over `index = 0, 1, 2, …` + `isClone`, or `BloxCloned` logs | `clonesOf(owner)` (log fallback on older deployments) |
| Governance on the factory | None: no owner, roles, timelock or whitelist. A new official account means a new factory | None |

Both factories send the clone with gas limit `16777216` (the EIP-7825 cap). Measured for the
official pair: `cloneBlox` 16,137,707 gas used, `cloneBloxDeterministic` 16,140,930 gas used,
factory runtime 1,960 bytes.

**Known limitation: gas (M-1).** Gas *used* is not the limit a sender needs. `initialize`
receives only 63/64 of the gas at each nested call, so a mint must be sent with about 16.67M
available. Under the EIP-7825 cap (Osaka) only a **direct EOA call** to `BasicFactory` fits
(about 108k of headroom). A Safe or other smart-contract wallet, an ERC-4337 account, a
forwarder or a multicall in front of the factory needs more than `2^24` and is **unsupported**
on cap-enforcing networks. Relief is expected where Glamsterdam is live; it is not fixed until
then. See
[Getting Started, known limitation](./getting-started.md#5-known-limitation-the-mint-fits-the-cap-only-as-a-direct-eoa-call-m-1).

**Network requirements (I-1).** A Cancun-level EVM, and `EngineBlox`, the three definition
libraries, `BasicAccount` and `BasicFactory` at the same addresses on every network; otherwise
predicted addresses differ per chain. See
[Getting Started, network requirements](./getting-started.md#6-network-requirements-for-the-official-stack-i-1).

**Official pattern: self-owner mint.** `BasicFactory` reverts `RestrictedOwner(caller, owner)`
on both mints unless `initialOwner == msg.sender`: you mint your own account, and you may still
name helper wallets as broadcaster and recovery. Minting for another owner (a relayer or a
sponsor naming a third party as owner) stays possible with other factories such as the legacy
CopyBlox, but is out of scope for the official pin; it is a social-engineering surface the
official path closes.

The deterministic address (SPEC-2026-0138) is `CREATE2` over
`keccak256(abi.encode(minter, initialOwner, index, salt))`, with `minter = msg.sender`. Since
the minter must be the owner, use the owner as `deployer` in `predictClone`. The
cross-chain key is the **minter** (= owner): the same minter, owner, index and salt
give the same address on every network where the factory and implementation share addresses.
Broadcaster, recovery and timelock are not hashed, so they may differ across chains unless the
minter passes the same values. Default: `salt = bytes32(0)`, `index = 0, 1, 2, …`. See
[Getting Started, deterministic mint](./getting-started.md#deterministic-mint-same-address-on-every-matched-network).

The lineage check for the official pipeline is `BasicFactory.isClone(address)`: the address
was minted by **that** factory, by either path. A clone at the same address on another chain
is a claim about that chain's factory; check `isClone` there. It is not a property of the bytecode, and other deployment
paths for the same implementation remain possible. The official pair is not yet declared:
nothing is in `official-deployed-addresses.json`, and the Nethermind core audit does not cover
it (it had an internal light assure, SPEC-2026-0139, which is not an audit opinion). See
[Getting Started, official and legacy pipelines](./getting-started.md#9-official-and-legacy-pipelines).

### Recognising one: the shape gate

An account and a factory are both `BaseStateMachine`s, so ERC-165 `IBaseStateMachine` does
**not** distinguish them. Gate on all four of:

| Check | An account | CopyBlox (legacy) | BasicFactory |
|---|---|---|---|
| `getCode` non-empty | yes | yes | yes |
| `owner()` answers | yes | **reverts** while uninitialized | **no such function** |
| `initialized()` | `true` | `false` | no such function |
| ERC-165 `ISecureOwnable` | `true` | **`false`** | `false` |

`ISecureOwnable` is the sharp edge for CopyBlox: the account components (`SecureOwnable`,
`RuntimeRBAC`, `GuardController`, composed by `Account`) answer it, and a bare
`BaseStateMachine` such as CopyBlox does not. The pinned `BasicFactory` is not a state
machine at all and has no `owner()`, so the gate stops it at the owner check. The SDK ships
this as `isAccountBlox` / `inspectAccountBlox` (rejection `no-owner`), and `assertOwnedAccount`
adds the owner match you need before adopting an address a user named.

---

## When to Use the Account Pattern

Use `Account` (or an `Account`‑based implementation) when you want:

- A **single address** that:
  - Can receive ETH.
  - Can own / guard other contracts and tokens.
  - Has auditable, time‑locked, role‑based approvals for critical operations.
- The **full Bloxchain security model** without wiring each component by hand.

For a step‑by‑step walkthrough that uses an Account‑based contract as the entry point, see the updated [Getting Started guide](./getting-started.md).

