# Five things the revert will teach you

> Guard and RBAC behave correctly in every case on this page. Each one is still a place where an outside
> builder paid a transaction — or a day — to learn something the docs had not said out loud. This page says
> it out loud, with the exact error name and the batch that fixes it.

**Before you read the five:** you can check all of them in one call. [`flowReadiness`](#probe-the-flow-before-you-send-it)
reads the schema, the whitelist and the role grants and tells you whether the flow is open — and, when it is
not, names every row that is missing.

---

## 1. A whitelist is not a permission

**What you expect:** you registered the schema, you whitelisted the token, the call should go through.

**What happens:** `NoPermission(caller)`.

Initialization registers the `transfer(address,uint256)` schema, and a guard config batch whitelists the token
contract. Neither of those grants anybody the right to *call* it. `requestAndApproveExecution` checks
permission on the **execution selector**, and `getActiveRolePermissions` will show that no role holds any
action on `0xa9059cbb`. Schema, whitelist and grant are three separate things, configured by two different
batches, and a governed call needs all three.

| Thing | Configured by | Read it with |
|-------|---------------|--------------|
| Function schema | `GuardConfigActionType.REGISTER_FUNCTION` (guard config) | `getFunctionSchema(selector)` |
| Target whitelist | `GuardConfigActionType.ADD_TARGET_TO_WHITELIST` (guard config) | `getFunctionWhitelistTargets(selector)` |
| Role grant | `RoleConfigActionType.ADD_FUNCTION_TO_ROLE` (role config) | `getActiveRolePermissions(roleHash)` |

**The fix** — a role config batch granting both halves of the meta-transaction flow. They must be **separate
roles**: see [rule 4 of the meta-approve rules](#one-role-may-not-hold-both-halves).

```ts
import { encodeAddFunctionToRole, roleConfigBatchExecutionParams } from '@bloxchain/sdk';
import { RoleConfigActionType, TxAction } from '@bloxchain/sdk';

const actions = [
  {
    actionType: RoleConfigActionType.ADD_FUNCTION_TO_ROLE,
    data: encodeAddFunctionToRole(publicClient, rbacDefinitions, OWNER_ROLE, {
      functionSelector: TRANSFER_SELECTOR,
      grantedActionsBitmap: 1 << TxAction.SIGN_META_REQUEST_AND_APPROVE,
      handlerForSelectors: [REQUEST_AND_APPROVE_EXECUTION_SELECTOR]
    })
  },
  {
    actionType: RoleConfigActionType.ADD_FUNCTION_TO_ROLE,
    data: encodeAddFunctionToRole(publicClient, rbacDefinitions, BROADCASTER_ROLE, {
      functionSelector: TRANSFER_SELECTOR,
      grantedActionsBitmap: 1 << TxAction.EXECUTE_META_REQUEST_AND_APPROVE,
      handlerForSelectors: [REQUEST_AND_APPROVE_EXECUTION_SELECTOR]
    })
  }
];
```

---

## 2. A selector you registered yourself must self-reference

**What you expect:** the `handlerForSelectors` value that worked for the built-in `transfer` schema works for
your own selector too.

**What happens:** `HandlerForSelectorMismatch(0x00000000, <your handler>)` at grant time.

`GuardController._registerGuardedFunction` — the code behind `REGISTER_FUNCTION` — hard-codes
`enforceHandlerRelations: true` and `handlerForSelectors: [self]` for every selector registered at runtime.
The batch format for `REGISTER_FUNCTION` is `(string functionSignature, string operationName, TxAction[])`,
which has **no field** to change either. So a grant on a self-registered selector must name **the selector
itself**, and nothing else.

The `0x00000000` in the error is a placeholder — `_validateHandlerForSelectors` cannot return an array, so it
reports `bytes4(0)` in the first position and the offending handler in the second.

This is harmless at call time: `_validateExecutionAndHandlerPermissions` applies strict mode to the
**handler's** schema, and never re-reads the permission row's list. The cost is entirely at grant time.

**The fix** — omit `handlerForSelectors` and let the SDK default it, or derive it from the schema:

```ts
import { encodeAddFunctionToRole, resolveHandlerForSelectors } from '@bloxchain/sdk';

// Omitted → defaults to [functionSelector], which is what a runtime-registered selector requires.
encodeAddFunctionToRole(publicClient, rbacDefinitions, MANAGER_ROLE, {
  functionSelector: mySelector,
  grantedActionsBitmap: 1 << TxAction.SIGN_META_REQUEST_AND_APPROVE
});

// Or read the schema and let it decide — correct for built-in selectors too, and it throws
// before you spend gas if an explicit value would be rejected on chain.
const handlerForSelectors = await resolveHandlerForSelectors(guardController, mySelector);
```

> **The default is not universal.** A few built-in schemas also run strict mode but point at a *different*
> handler — `roleConfigBatchRequestAndApprove` lists `[executeRoleConfigBatch]`, not itself. Self-referencing
> those reverts just as surely. `resolveHandlerForSelectors` reads the schema and is correct in both cases.

---

## 3. Changing a grant is REMOVE + ADD, in one batch

**What you expect:** re-adding a selector with a new action bitmap updates the grant.

**What happens:** `ResourceAlreadyExists(<selector>)`.

`addFunctionToRole` adds the selector to the role's selector set and reverts if it was already there. There is
no update path. To change a bitmap or a `handlerForSelectors` list, remove the grant and re-add it — in the
**same** role config batch, so the role is never left without the permission between transactions.

```ts
const actions = [
  { actionType: RoleConfigActionType.REMOVE_FUNCTION_FROM_ROLE,
    data: encodeRemoveFunctionFromRole(publicClient, rbacDefinitions, MANAGER_ROLE, mySelector) },
  { actionType: RoleConfigActionType.ADD_FUNCTION_TO_ROLE,
    data: encodeAddFunctionToRole(publicClient, rbacDefinitions, MANAGER_ROLE, {
      functionSelector: mySelector,
      grantedActionsBitmap: newBitmap
    }) }
];
```

---

## 4. Some grants can never be removed

**What you expect:** rule 3 always works.

**What happens:** `GrantNotRevocable(<selector>)`.

`removeFunctionFromRole` checks the **schema's** `isGrantRevocable` flag. When it is `false`, the grant cannot
be dropped from **any** role — including one you created — and rule 3's REMOVE+ADD is unavailable. The grant
is permanent for the life of the schema.

Most built-in handler and execution schemas are registered with `isGrantRevocable: false`. Selectors you
register at runtime get `isGrantRevocable: true`, so their grants stay changeable.

**Check before you design around a grant you may want to withdraw:**

```ts
const schema = await guardController.getFunctionSchema(selector);
if (!schema.isGrantRevocable) {
  // This grant is for keeps. Pick the role carefully.
}
```

Note that `isProtected` is a *different* flag: it blocks `unregisterFunction` for the schema, and does not by
itself stop a grant being removed from a role. See
[rbac-grant-revocability](./runtime-rbac.md#3-function-level-permissions).

---

## 5. A manager is always a runtime role

**What you expect:** add the operations wallet to `OWNER_ROLE` — or to whichever system role already has the
permissions — and move on.

**What happens:** `CannotModifyProtected(<roleHash>)`.

`RuntimeRBAC` refuses `ADD_WALLET` and `REVOKE_WALLET` against a protected role, by design: role config
batches cannot change who holds `OWNER_ROLE`, `BROADCASTER_ROLE` or `RECOVERY_ROLE`. Ownership moves through
`SecureOwnable`'s own workflows instead.

So any "manager", "operator" or "desk" persona you need is a **runtime** role you create — `CREATE_ROLE`,
`ADD_WALLET`, then `ADD_FUNCTION_TO_ROLE` — and the order matters: `CREATE_ROLE` must come before either of
the others for the same role in the same batch.

```ts
const actions = [
  { actionType: RoleConfigActionType.CREATE_ROLE,
    data: encodeCreateRole(publicClient, rbacDefinitions, 'BRANCH_MANAGER', 3n) },
  { actionType: RoleConfigActionType.ADD_WALLET,
    data: encodeAddWallet(publicClient, rbacDefinitions, BRANCH_MANAGER_ROLE, managerWallet) },
  { actionType: RoleConfigActionType.ADD_FUNCTION_TO_ROLE,
    data: encodeAddFunctionToRole(publicClient, rbacDefinitions, BRANCH_MANAGER_ROLE, {
      functionSelector: mySelector,
      grantedActionsBitmap: 1 << TxAction.SIGN_META_REQUEST_AND_APPROVE
    }) }
];
```

---

## Meta-approve is not the timelock

Two approval paths reach the same execution, and they do **not** enforce the same things.

| Path | Enforces `releaseTime`? |
|------|--------------------------|
| `approveTimeLockExecution` (direct, `EXECUTE_TIME_DELAY_APPROVE`) | **Yes** — `validateReleaseTime`, reverts `BeforeReleaseTime(releaseTime, currentTime)` |
| `approveTimeLockExecutionWithMetaTx` (meta, `EXECUTE_META_APPROVE`) | **No** |

This is deliberate, and it is documented as such on `_txApprovalWithMetaTx` in
`contracts/core/lib/EngineBlox.sol`: the meta-transaction path lets authorized signers approve without waiting
for `releaseTime`, giving a timelock workflow a delegated, time-flexible escape hatch.

**What this means for you:** the timelock on an operation bounds the *direct* path only. Anyone holding
`SIGN_META_APPROVE` on that selector, together with anyone holding `EXECUTE_META_APPROVE`, can collapse the
delay to zero. If your threat model relies on the delay, do not grant the meta-approve pair on that selector —
or treat the pair as being as powerful as the operation itself. Both paths still check the target whitelist and
both permissions.

### One role may not hold both halves

`_validateMetaTxPermissions` rejects a grant whose bitmap contains **both** a meta-*sign* action
(`SIGN_META_REQUEST_AND_APPROVE`, `SIGN_META_APPROVE`, `SIGN_META_CANCEL`) and a meta-*execute* action
(`EXECUTE_META_REQUEST_AND_APPROVE`, `EXECUTE_META_APPROVE`, `EXECUTE_META_CANCEL`) for the same selector:

```text
ConflictingMetaTxPermissions(<selector>)
```

The check is per `(role, selector)` grant, and it is what makes two-party meta-transactions structural rather
than conventional. The only available shape is a **split**:

- the **owner** (or a step-up–protected signer role) holds the `SIGN_*` action and signs off-chain;
- a separate **broadcaster/operator** role holds the matching `EXECUTE_*` action and submits the signed
  meta-transaction on chain.

The same timelock collapse is reachable from the hook side, and is tracked as separate protocol work.

---

## What the guard does not see

The guard checks **`(target, selector)`**. That is the whole of it.

`_validateTargetWhitelist` takes the execution selector and the target address, rejects the zero address,
requires the selector to be registered, allows calls back into the account itself, and otherwise requires
membership in `functionTargetWhitelist[selector]` — reverting `TargetNotWhitelisted(target, functionSelector)`.
It never decodes the calldata.

**So a whitelist does not bound value.** Concretely:

- `transfer(address,uint256)` whitelisted to a token means *any amount* of that token, to any recipient the
  call names.
- `approve(address,uint256)` whitelisted to a token means an allowance of any size.
- A router's `execute(bytes[] commands, bytes[] inputs)` is **opaque**: the guard sees that you called the
  router, not what the commands inside do. A Uniswap-aware guard is a thing someone could build; the guard
  itself is not one.

"The account can only talk to those three contracts with those three selectors" is true and enforced on chain.
"The account cannot spend more than X" is a **different** claim, and the whitelist does not make it. Do not
describe a whitelist to a user, an auditor or a regulator as a spend limit.

**If you need amount- or destination-aware enforcement**, that is separate work, not a guard configuration.
On-account spend ceilings and destination allowlists — which decode the calldata the guard does not read — are
tracked as their own protocol work and are not part of the guard today.

Until they land, the honest description of a whitelist-only posture is the one field builders have used: the
security story is one whitelist deep. Off-chain caps and per-payee lists are a mitigation, not an invariant —
an external policy engine can pin the contract, the chain and the action, but not the amount inside the
call.

---

## Probe the flow before you send it

`flowReadiness` reads all three prerequisites at once and answers the only question that matters before you
sign anything.

```ts
import { flowReadiness, formatFlowReadiness, TxAction } from '@bloxchain/sdk';

const readiness = await flowReadiness(guardController, {
  selector: TRANSFER_SELECTOR,
  targets: [tokenAddress],
  roles: [
    { role: OWNER_ROLE, actions: [TxAction.SIGN_META_REQUEST_AND_APPROVE] },
    { role: BROADCASTER_ROLE, actions: [TxAction.EXECUTE_META_REQUEST_AND_APPROVE] }
  ]
});

if (!readiness.open) {
  throw new Error(formatFlowReadiness(readiness));
}
```

A half-configured account reads like this:

```text
flow 0xa9059cbb: NOT OPEN
  schema:    ok (ERC20_TRANSFER)
  targets:   1/1 whitelisted
  grants:    0/2 satisfied
  - grant: role 0x9b1f… holds no permission on selector 0xa9059cbb (needs SIGN_META_REQUEST_AND_APPROVE via ADD_FUNCTION_TO_ROLE)
  - grant: role 0x4d53… holds no permission on selector 0xa9059cbb (needs EXECUTE_META_REQUEST_AND_APPROVE via ADD_FUNCTION_TO_ROLE)
```

Two properties are worth knowing about, because they are the reason to trust the answer:

1. **It fails closed.** `open` is `true` only when *every* row it was asked to check holds. A missing row, a
   read that reverted, or an empty `targets` / `roles` list all force `false`. A probe that can pass over a
   shut door is not a probe.
2. **Name the actions.** Pass `roles` as `{ role, actions }`, not bare role hashes. A bare hash accepts *any*
   grant on the selector, so a role holding only `EXECUTE_TIME_DELAY_CANCEL` would satisfy a probe for a flow
   that actually needs `SIGN_META_REQUEST_AND_APPROVE`.

**The reads are permissioned.** `getFunctionSchema`, `getFunctionWhitelistTargets` and
`getActiveRolePermissions` are all gated by `_validateAnyRole()` on chain. A reader built with
`walletClient: undefined` sends `from = 0x0` and every read reverts `NoPermission(0x0)` — which `flowReadiness`
reports in `errors` with `open === false`, never as "not configured". Build the reader with a wallet client
whose account holds a role on the target account.

---

## Related documentation

- [GuardController Guide](./guard-controller.md) — guarded execution, whitelists, schema registration
- [RuntimeRBAC Guide](./runtime-rbac.md) — roles, grants, and the handler/execution selector model
- [Meta-Transactions](./meta-transactions.md) — meta-tx params, signing, and execution
- [API Reference](./api-reference.md) — `flowReadiness`, `resolveHandlerForSelectors`, and the rest of the SDK
