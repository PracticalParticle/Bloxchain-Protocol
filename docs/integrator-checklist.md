# Integrator Checklist

> Ten things an outside builder hits when they ship on `@bloxchain/sdk` with nothing but
> `npm i @bloxchain/sdk viem` — and what the SDK now gives you instead of a workaround.
>
> Every item below is a measured seam from a real build (ETHOnline 2026), not a
> hypothetical. If you are starting a Bloxchain integration, read this before
> writing your first wrapper: each section replaces a file somebody else already
> wrote by hand.

---

## 1. Never transcribe an ABI

The package ships every contract ABI, and all of them are importable.

```ts
// Per-contract subpath — a plain ES module, no import attributes needed
import { copyBloxAbi } from '@bloxchain/sdk/abi/CopyBlox';
import { accountBloxAbi } from '@bloxchain/sdk/abi/AccountBlox';
import { erc20MinimalAbi } from '@bloxchain/sdk/abi/ERC20';

// Or the typed barrel, when you want several at once
import { ABIS, ALL_ERROR_ABI } from '@bloxchain/sdk/abi';
const abi = ABIS.GuardController;

// Or the raw JSON, when a tool insists on the file
import copyBlox from '@bloxchain/sdk/abi/CopyBlox.abi.json' with { type: 'json' };
```

`ABIS` is keyed by contract name — the same names as the `@bloxchain/sdk/abi/<Name>`
subpaths and the `abi/<Name>.abi.json` files. `ALL_ERROR_ABI` is every custom-error
entry from every shipped ABI, de-duplicated: hand it to viem's `decodeErrorResult`
when you hold revert bytes and do not know which contract produced them.

ABIs are typed `readonly unknown[]` so they pass to any viem call site without
variance complaints. When you want full viem inference on a narrow surface, use
`erc20MinimalAbi` or `parseAbi` your own fragment.

> **Do not** copy signatures out of a block explorer into a local `abi.ts`. Yours
> will drift on the next release; these will not.

---

## 2. Never re-type the EIP-712 shape

The meta-transaction typed data the SDK signs is public:

```ts
import {
  META_TX_DOMAIN,
  META_TX_TYPES,
  META_TX_TYPED_DATA_TYPES_AS_SIGNED,
  META_TX_PRIMARY_TYPE,
  EIP712_DOMAIN_TYPE,
  buildTypedDataMessage,
  buildMetaTxTypedData,
} from '@bloxchain/sdk';
```

Which one you want depends on who is looking:

| You are… | Use |
|----------|-----|
| calling viem's `signTypedData` yourself | `META_TX_TYPES` — viem adds `EIP712Domain` for you |
| writing a **signer-policy condition** (Privy `ethereum_typed_data_message`, similar) | `META_TX_TYPED_DATA_TYPES_AS_SIGNED` |
| handing an eth-sig-util `TypedMessage` to a browser wallet library | `META_TX_TYPED_DATA_TYPES_AS_SIGNED` |
| building the whole payload in one call | `buildMetaTxTypedData(metaTx, verifyingContract)` |

The distinction is not cosmetic. viem prepends `EIP712Domain` to `types` before the
request reaches the account, and a policy that matches on `types` exactly will match
nothing if you pin the bare list.

```ts
const typedData = buildMetaTxTypedData(unsignedMetaTx, accountAddress);
// { types (incl. EIP712Domain), primaryType, domain, message }
```

---

## 3. A read-only client needs a `readAs` sender

Registry and permission views are role-gated for privacy (`_validateAnyRole`):
`getWalletRoles`, `getAuthorizedWallets`, `getActiveRolePermissions`,
`getSupportedRoles`, `getTransaction`, `getFunctionWhitelistTargets`, and their
siblings. A wrapper built without a wallet client has no account to send, so the
contract sees `address(0)` and reverts `NoPermission(0x0)`.

Give it a sender instead:

```ts
// At construction
const reader = new RuntimeRBAC(publicClient, undefined, account, chain, ownerAddress);

// Or later
reader.setReadSender(ownerAddress);

// Or per call
await reader.getWalletRoles(wallet, ownerAddress);
```

Resolution order is: per-call `readAs` → `setReadSender` → the wallet client's
account → no sender at all. It is never `address(0)`; passing the zero address is
refused with a message saying why.

> `readAs` only chooses the `from` of an `eth_call`. It grants nothing, proves
> nothing, and cannot be used to write. Node policy decides whether to honour it.

---

## 4. Decode errors once, and keep the bytes

```ts
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

`explainError` never throws. It returns `{ kind, errorName, args, selector, raw, message, cause }`:

- `kind` — `revert` | `signer` | `transport` | `unknown`
- `errorName` — switchable: a custom-error name, `SignerDenied`/`SignerError`, `RpcError`, or `Unknown`
- `raw` — the revert bytes, untouched, so you can decode them yourself against an ABI the SDK does not ship

Lower-level pieces are exported too: `extractRevertData`, `decodeRevert`,
`classifySignerError`, `errorTextChain`, `isRevertNamed`.

**Branch on `errorName`, not on `message`.** Message wording is prose and is not a
compatibility contract.

**Two things the unwrap will not do.** It will not read a 20-byte address as text
(an address is 40 hex characters — never a selector plus whole 32-byte words, so it
can never be mistaken for revert data), and it will not read structured revert bytes
as ASCII. An unnamed error is reported as `Unknown`. `raw` is attached only when
unnamed revert bytes were extracted for an undecodable revert; transport and
generic unknown results do not include `raw`.

---

## 5. The signer may have refused before the chain ever saw it

A remote signer or custody provider answers the signing request itself. viem wraps
that answer as the `cause` of a contract error, so it arrives looking exactly like a
failed write — and a decoder that only knows about reverts will invent a contract
cause for something the contract never saw.

`explainError` asks the signer layer first:

| `errorName` | Means | Nothing broadcast? | Retry unchanged? |
|-------------|-------|--------------------|------------------|
| `SignerDenied` | Policy violation, or the user rejected it | yes | no — fix the policy or ask the user |
| `SignerError` | The signer could not answer (auth, outage) | yes | yes, once the signer is back |

Neither spends gas. If you are paging someone, page whoever owns the signer policy,
not whoever owns the contract.

---

## 6. Two deadline APIs — do not cross-wire them

There are **two** legitimate `createMetaTxParams` paths. Mixing them produces
born-expired meta-transactions.

### On-chain view / account wrapper — **duration**

`account.createMetaTxParams(..., deadline, ...)` (and the Solidity view it calls)
takes **seconds of validity**. The contract stores `block.timestamp + deadline`.

That `block.timestamp` is read from the *latest block*, because the function is a
view. On a chain that mines on demand rather than on a schedule, the latest block's
timestamp freezes between transactions while wall-clock time keeps running. Sit idle
longer than your TTL and every meta-transaction is born already expired: `eth_call`
passes (it replays against the stale block) and the mined transaction reverts.

```ts
import { metaTxDeadlineFor } from '@bloxchain/sdk';

const deadline = await metaTxDeadlineFor(publicClient, 600n); // duration, ~10 minutes
const params = await account.createMetaTxParams(
  handler, selector, TxAction.SIGN_META_REQUEST_AND_APPROVE,
  deadline, maxGasPrice, signer
);
```

`metaTxDeadlineFor` returns `drift + ttl`. On a chain with scheduled blocks the drift
is at most one block time and it degrades to exactly your TTL, so it is always safe
to use **with the on-chain view**.

### Off-chain `MetaTransactionBuilder` — **absolute unix timestamp**

`MetaTransactionBuilder.createMetaTxParams(..., deadline, ...)` writes
`params.deadline` **verbatim**. `validateMetaTxDeadline` compares that field to
`block.timestamp`. Pass an absolute unix time (e.g. `chainTime + ttl`). **Do not**
pass `metaTxDeadlineFor`'s return value into the Builder — that is a duration and
will revert `MetaTxExpired` at execution.

---

## 7. A mined transaction is not a successful one

This is the one that costs real money.

When the call inside a Bloxchain workflow reverts, `EngineBlox._completeTransaction`
**catches** it: the record is written `TxStatus.FAILED`, the revert bytes go out on
`TxExecutionResult`, and the outer transaction still mines with `status: 'success'`,
having charged for every unit of gas it burned. A role-configuration batch can cost
two million gas, report success, and grant nothing.

So check the inner status after every guarded write and every configuration batch:

```ts
const res = await account.roleConfigBatchRequestAndApprove(metaTx, { from: broadcaster });
const receipt = await account.waitForTransactionAndAssertInner(res);
// past this line the roles really were granted
```

Standalone forms, for when you are not holding a wrapper:

```ts
import { assertInnerSuccess, readInnerOutcomes, waitForTransactionAndAssertInner } from '@bloxchain/sdk';

assertInnerSuccess(receipt, { address: accountAddress, abi: ALL_ERROR_ABI });
const outcomes = readInnerOutcomes(receipt, { address: accountAddress }); // non-throwing
```

On failure you get an `InnerTransactionFailedError` carrying `errorName`, `args`,
`raw`, and every terminal `outcome` from the receipt.

Two notes. Pass the **target's** ABI (or `ALL_ERROR_ABI`) as `abi` — the revert came
from the contract the guarded call went into, not from the Blox. And scope with
`address` when the transaction touched more than one Blox. `CANCELLED` passes by
default, because a cancellation is a decision rather than a fault; pass
`failOnCancelled: true` if you disagree.

The lifecycle events are declared on the `EngineBlox` library, so they do **not**
appear in a Blox's own compiled ABI. `ENGINE_BLOX_EVENTS_ABI` is exported for when
you want to parse logs yourself.

---

## 8. Simulation proves revert-freedom, not gas

`simulationMode` (`'strict'` by default on every write) runs `eth_call` before
sending. That tells you the transaction would not revert **against the latest
block**. It does not size gas, and it is not a guarantee about the block your
transaction actually lands in.

Three separate things, often confused:

| Question | Mechanism | What it does not tell you |
|----------|-----------|---------------------------|
| Will it revert? | `simulateContract` (`simulationMode`) | how much gas it needs |
| How much gas? | `eth_estimateGas` | whether it will still be true next block |
| What is the ceiling? | `MAX_TX_GAS` (below) | anything about your call |

```ts
await account.someGuardedWrite(args, {
  from: caller,
  simulationMode: 'strict',   // 'warn-only' logs and sends; 'skip' sends blind
  gas: 500_000n,              // forwarded as-is; bypasses eth_estimateGas
});
```

### Estimating with a state override

Public nodes answer `eth_estimateGas` with *"insufficient funds"* rather than a
number when the sender cannot cover `gas × price + value` — which is exactly the
situation when you are estimating in order to find out how much to fund. Use a state
override to give the sender a notional balance for the estimate only:

```ts
const gas = await publicClient.estimateContractGas({
  address: accountAddress,
  abi: accountBloxAbi,
  functionName: 'executeGuarded',
  args,
  account: caller,
  stateOverride: [{ address: caller, balance: parseEther('10') }],
});
```

The override exists only inside that call. Not every provider supports
`stateOverride` on `eth_estimateGas`; when yours does not, fund the sender or pass an
explicit `gas`.

### `MAX_TX_GAS` (EIP-7825)

On networks / forks where **EIP-7825** is active, the per-transaction gas limit is
capped at **2²⁴ = 16,777,216**. That figure is **not** universal — use the target
chain's effective transaction gas cap (client / explorer / chain docs) rather than
assuming 16,777,216 everywhere. Chains that have not adopted EIP-7825 still follow
their own block and tx limits.

```ts
// Only where EIP-7825 applies; otherwise use the network's published tx gas cap.
const MAX_TX_GAS = 16_777_216n; // 2 ** 24
```

Where the cap applies, it bites on batches more often than on single calls. If a
configuration batch or a multi-action meta-transaction estimates near the cap, split
it — a transaction over the cap is rejected outright rather than mined and failed.
Remember also that the `gasLimit` you put in `TxParams` is a **cap the guard
forwards** to the inner call, not a price: over-provisioning it costs nothing
directly, but it counts toward the outer transaction's limit.

---

## 9. Read the record, not just the receipt

`getTransaction(txId)` returns the `TxRecord` with its authoritative `status`. The
receipt-based helpers in §7 read the same state out of the logs of a transaction you
just sent, which is cheaper and immune to a later change. Use the record when you are
inspecting history or polling a pending time-locked operation, and the receipt
helpers when you have just written.

`TxExecutionResult` carries the full execution returndata. Verify it against
`TxRecord.resultHash` from the same transaction: an empty `result` implies
`resultHash == bytes32(0)`; otherwise `keccak256(result) == resultHash`.

---

## 10. What to put in your own code

After all of the above, a Bloxchain integration should contain **no** local copy of:

- an ABI fragment (§1)
- the EIP-712 type list or domain (§2)
- a revert decoder (§4)
- a signer-error classifier (§5)
- a deadline-drift correction (§6)
- an inner-status reader (§7)

If you find yourself writing one, check this list first — and if the SDK genuinely
cannot express what you need, that is a gap worth reporting rather than working
around.

---

## See also

- [API Reference](./api-reference.md) — class and type reference
- [Getting Started](./getting-started.md) — setup and first calls
- [Meta-Transactions](./meta-transactions.md) — the full meta-tx lifecycle
- [RuntimeRBAC](./runtime-rbac.md) · [GuardController](./guard-controller.md) · [SecureOwnable](./secure-ownable.md)
