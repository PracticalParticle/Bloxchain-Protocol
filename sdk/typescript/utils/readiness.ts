/**
 * @file readiness.ts
 * @description One-call answer to "is this flow open on this account?".
 *
 * A governed call through {@link ../contracts/core/GuardController.js | GuardController} needs **three**
 * independent things to be true at once, and each one is configured by a different batch:
 *
 * 1. the **function schema** for the execution selector is registered (`REGISTER_FUNCTION`, guard config);
 * 2. every **target** the flow touches is whitelisted for that selector (`ADD_TARGET_TO_WHITELIST`, guard config);
 * 3. some **role** holds the required `TxAction`s on that selector, with `handlerForSelectors` that the
 *    schema accepts (`ADD_FUNCTION_TO_ROLE`, role config).
 *
 * Whitelisting a target is **not** a permission. A schema being registered is **not** a permission. Integrators
 * that probe only one of the three discover the other two by paying for a reverted meta-transaction.
 * `flowReadiness` reads all three and reports every row, so a half-configured account is visible before the
 * first transaction rather than three meta-transactions in.
 *
 * ## Fail-closed contract
 *
 * `open` is `true` **only** when every row it was asked to check holds. It is `false` when:
 *
 * - any schema / whitelist / grant row is missing, **or**
 * - any underlying read **failed** (a reverted or errored read is never treated as a pass), **or**
 * - no targets or no roles were supplied (an empty probe cannot prove a flow is open).
 *
 * A probe that can pass over a shut door is not a probe. Callers may inspect `missing` for a named list of
 * everything that did not hold, and `errors` for reads that could not be completed.
 *
 * ## Reads are permissioned
 *
 * `getFunctionSchema`, `getActiveRolePermissions` and `getFunctionWhitelistTargets` are gated by
 * `_validateAnyRole()` on-chain. A reader constructed with `walletClient: undefined` sends `from = 0x0` and
 * every read reverts `NoPermission(0x0)` — which this helper reports as a read **error** (`open === false`),
 * never as "not configured". Build the reader with a wallet client whose account holds a role on the target
 * account (see `docs/runtime-rbac.md`).
 *
 * @see SPEC-2026-0119 R1
 */

import type { Address, Hex } from 'viem';
import type { FunctionPermission, FunctionSchema } from '../types/definition.index.js';
import { TxAction } from '../types/lib.index.js';
import { fromContractValue, getActionsFromBitmap, isBitSet } from './bitmap.js';

/** Zero address — never a valid whitelist target (`validateNotZeroAddress` rejects it on chain). */
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

/**
 * The reads `flowReadiness` needs. Structural on purpose: any object exposing these three reads works.
 *
 * {@link ../contracts/core/GuardController.js | GuardController} satisfies this interface as-is. A reader
 * built on the `AccountBlox` ABI (which carries all three functions) does too.
 */
export interface FlowReadinessReader {
  /** Reads the function schema for a selector. Reverts `ResourceNotFound` when the selector is unregistered. */
  getFunctionSchema(functionSelector: Hex): Promise<FunctionSchema>;
  /** Reads every whitelisted target for a selector. Empty means *no* target is allowed (explicit deny). */
  getFunctionWhitelistTargets(functionSelector: Hex): Promise<Address[]>;
  /** Reads the function permissions currently attached to a role. */
  getActiveRolePermissions(roleHash: Hex): Promise<FunctionPermission[]>;
}

/**
 * A role that must hold the flow, and (strongly recommended) the exact actions it must hold.
 *
 * Naming `actions` is what makes the probe meaningful: without it, any grant on the selector counts, and a
 * role granted `EXECUTE_TIME_DELAY_CANCEL` would satisfy a probe for a flow that actually needs
 * `SIGN_META_REQUEST_AND_APPROVE`.
 */
export interface FlowReadinessRoleRequirement {
  /** Role hash, e.g. `keccak256(toBytes('BRANCH_MANAGER'))`. */
  role: Hex;
  /** Actions this role must hold on the selector. Omit (or empty) to accept any grant on the selector. */
  actions?: TxAction[];
}

/** A role requirement, or a bare role hash meaning "any grant on the selector". */
export type FlowReadinessRoleInput = Hex | FlowReadinessRoleRequirement;

export interface FlowReadinessOptions {
  /** The **execution** selector the flow calls (e.g. `0xa9059cbb` for `transfer(address,uint256)`). */
  selector: Hex;
  /** Every target address the flow will call through this selector. Must be non-empty. */
  targets: Address[];
  /** Every role that must hold the flow, with the actions each must hold. Must be non-empty. */
  roles: FlowReadinessRoleInput[];
  /**
   * The governed account's own address, when known. A call whose target is the account itself is always
   * permitted on chain (`_validateTargetWhitelist` returns early for `target == address(this)`), so passing
   * this lets the probe report such a target as satisfied instead of missing.
   */
  accountAddress?: Address;
}

/** Whether the execution selector has a registered schema, and what that schema demands of grants. */
export interface SchemaReadinessRow {
  selector: Hex;
  /** True when a schema exists for the selector. */
  registered: boolean;
  /** This row's contribution to `open`. */
  holds: boolean;
  operationName?: string;
  /** Actions the schema itself supports; a grant may never exceed these. */
  supportedActions?: TxAction[];
  /** When true, grants must carry `handlerForSelectors` drawn from `handlerForSelectors` below. */
  enforceHandlerRelations?: boolean;
  /** When false, a grant on this selector can never be removed from any role (`GrantNotRevocable`). */
  isGrantRevocable?: boolean;
  /** The schema's handler graph. A runtime-registered execution selector carries `[selector]` (self-reference). */
  handlerForSelectors?: Hex[];
  /** Set when the schema read failed; `holds` is false. */
  error?: string;
}

/** Whether one target is reachable through the selector. */
export interface WhitelistReadinessRow {
  selector: Hex;
  target: Address;
  whitelisted: boolean;
  /** This row's contribution to `open`. */
  holds: boolean;
  /** True when the target is the account itself, which the guard always allows. */
  selfCall?: boolean;
  /** Set when the whitelist read failed; `holds` is false. */
  error?: string;
}

/** Whether one role holds the selector, with the right actions and an acceptable handler wiring. */
export interface GrantReadinessRow {
  role: Hex;
  selector: Hex;
  /** True when the role carries a `FunctionPermission` for the selector at all. */
  granted: boolean;
  /** Actions the role actually holds on the selector. */
  grantedActions: TxAction[];
  /** Actions the caller asked for. Empty means "any grant counts". */
  requiredActions: TxAction[];
  /** Required actions the role does **not** hold. */
  missingActions: TxAction[];
  /** `handlerForSelectors` stored on the grant. */
  handlerForSelectors: Hex[];
  /**
   * False when the schema enforces handler relations and the grant names a handler the schema does not
   * list — the configuration that reverts `HandlerForSelectorMismatch` at grant time.
   */
  handlerRelationsHold: boolean;
  /** True when the grant self-references the selector, as a runtime-registered execution selector requires. */
  handlerSelfReferenced: boolean;
  /** This row's contribution to `open`. */
  holds: boolean;
  /** Set when the role permission read failed; `holds` is false. */
  error?: string;
}

export interface FlowReadiness {
  selector: Hex;
  /**
   * True **only** when every row holds and every read succeeded. False whenever anything is missing,
   * unreadable, or unchecked.
   */
  open: boolean;
  schema: SchemaReadinessRow;
  whitelisted: WhitelistReadinessRow[];
  grants: GrantReadinessRow[];
  /** Human-readable name of every row that did not hold — the list to hand a builder verbatim. */
  missing: string[];
  /** Reads that could not be completed. Non-empty always forces `open === false`. */
  errors: string[];
}

/** Lowercase a hex value for case-insensitive comparison. */
function norm(value: string): string {
  return value.toLowerCase();
}

/** Names for the nine `TxAction` values, for `missing` messages. */
const TX_ACTION_NAMES: Record<number, string> = {
  [TxAction.EXECUTE_TIME_DELAY_REQUEST]: 'EXECUTE_TIME_DELAY_REQUEST',
  [TxAction.EXECUTE_TIME_DELAY_APPROVE]: 'EXECUTE_TIME_DELAY_APPROVE',
  [TxAction.EXECUTE_TIME_DELAY_CANCEL]: 'EXECUTE_TIME_DELAY_CANCEL',
  [TxAction.SIGN_META_REQUEST_AND_APPROVE]: 'SIGN_META_REQUEST_AND_APPROVE',
  [TxAction.SIGN_META_APPROVE]: 'SIGN_META_APPROVE',
  [TxAction.SIGN_META_CANCEL]: 'SIGN_META_CANCEL',
  [TxAction.EXECUTE_META_REQUEST_AND_APPROVE]: 'EXECUTE_META_REQUEST_AND_APPROVE',
  [TxAction.EXECUTE_META_APPROVE]: 'EXECUTE_META_APPROVE',
  [TxAction.EXECUTE_META_CANCEL]: 'EXECUTE_META_CANCEL'
};

/** Render a `TxAction` as its enum name (falls back to the numeric value). */
export function txActionName(action: TxAction): string {
  return TX_ACTION_NAMES[action] ?? `TxAction(${action})`;
}

/** Normalize a `Hex | FlowReadinessRoleRequirement` into a requirement. */
function toRoleRequirement(input: FlowReadinessRoleInput): FlowReadinessRoleRequirement {
  return typeof input === 'string' ? { role: input, actions: [] } : { role: input.role, actions: input.actions ?? [] };
}

/** Extract a readable message from an unknown thrown value. */
function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

/**
 * Reads whether a governed flow is fully configured on an account.
 *
 * Performs only view calls — it never simulates or sends a transaction, and never mutates state.
 *
 * @param account Reader for the governed account (a `GuardController`, or anything matching
 *                {@link FlowReadinessReader}). Must be built with a wallet client whose account holds a
 *                role, because the underlying reads are permissioned.
 * @param options The flow to probe: execution `selector`, every `targets` entry it calls, every `roles`
 *                entry that must hold it.
 * @returns Every row that was checked, plus `open` — true only if all of them hold.
 *
 * @example
 * ```ts
 * const readiness = await flowReadiness(guardController, {
 *   selector: TRANSFER_SELECTOR,
 *   targets: [tokenAddress],
 *   roles: [
 *     { role: OWNER_ROLE, actions: [TxAction.SIGN_META_REQUEST_AND_APPROVE] },
 *     { role: BROADCASTER_ROLE, actions: [TxAction.EXECUTE_META_REQUEST_AND_APPROVE] }
 *   ]
 * });
 *
 * if (!readiness.open) {
 *   throw new Error(`Flow is not open:\n  ${readiness.missing.join('\n  ')}`);
 * }
 * ```
 */
export async function flowReadiness(
  account: FlowReadinessReader,
  options: FlowReadinessOptions
): Promise<FlowReadiness> {
  const { selector } = options;
  const targets = options.targets ?? [];
  const roleInputs = options.roles ?? [];
  const missing: string[] = [];
  const errors: string[] = [];

  // ---- Row 1: the function schema -------------------------------------------------------------
  const schema: SchemaReadinessRow = { selector, registered: false, holds: false };
  let schemaData: FunctionSchema | null = null;
  try {
    schemaData = await account.getFunctionSchema(selector);
    schema.registered = true;
    schema.holds = true;
    schema.operationName = schemaData.operationName;
    schema.supportedActions = getActionsFromBitmap(fromContractValue(schemaData.supportedActionsBitmap));
    schema.enforceHandlerRelations = schemaData.enforceHandlerRelations;
    schema.isGrantRevocable = schemaData.isGrantRevocable;
    schema.handlerForSelectors = [...(schemaData.handlerForSelectors ?? [])];
  } catch (error) {
    const message = errorMessage(error);
    schema.error = message;
    errors.push(`schema read failed for selector ${selector}: ${message}`);
    missing.push(`schema: no readable function schema for selector ${selector} (register it with REGISTER_FUNCTION)`);
  }

  // ---- Row set 2: whitelisted targets ---------------------------------------------------------
  const whitelisted: WhitelistReadinessRow[] = [];
  if (targets.length === 0) {
    missing.push('whitelist: no targets were supplied — an empty probe cannot prove a flow is open');
  } else {
    let onChainTargets: Address[] | null = null;
    try {
      onChainTargets = await account.getFunctionWhitelistTargets(selector);
    } catch (error) {
      const message = errorMessage(error);
      errors.push(`whitelist read failed for selector ${selector}: ${message}`);
      for (const target of targets) {
        whitelisted.push({ selector, target, whitelisted: false, holds: false, error: message });
        missing.push(`whitelist: could not read whitelist for ${target} on selector ${selector}: ${message}`);
      }
    }

    if (onChainTargets) {
      const allowed = new Set(onChainTargets.map((t) => norm(t)));
      const self = options.accountAddress ? norm(options.accountAddress) : null;
      for (const target of targets) {
        const key = norm(target);
        if (key === ZERO_ADDRESS) {
          whitelisted.push({ selector, target, whitelisted: false, holds: false });
          missing.push(`whitelist: the zero address is never a valid target for selector ${selector}`);
          continue;
        }
        // Calls back into the account itself bypass the whitelist on chain by design.
        const selfCall = self !== null && key === self;
        const isAllowed = selfCall || allowed.has(key);
        whitelisted.push({ selector, target, whitelisted: isAllowed, holds: isAllowed, selfCall: selfCall || undefined });
        if (!isAllowed) {
          missing.push(
            `whitelist: target ${target} is not whitelisted for selector ${selector} (add it with ADD_TARGET_TO_WHITELIST)`
          );
        }
      }
    }
  }

  // ---- Row set 3: role grants -----------------------------------------------------------------
  const grants: GrantReadinessRow[] = [];
  if (roleInputs.length === 0) {
    missing.push('grants: no roles were supplied — an empty probe cannot prove a flow is open');
  }
  // Handler relations are only enforced when the schema says so; when the schema could not be read we
  // cannot clear a grant's wiring, so we report it as not holding rather than assuming it is fine.
  const schemaHandlers = new Set((schema.handlerForSelectors ?? []).map((h) => norm(h)));
  const enforceHandlers = schemaData ? schemaData.enforceHandlerRelations : false;

  for (const input of roleInputs) {
    const { role, actions: requiredActions = [] } = toRoleRequirement(input);
    const row: GrantReadinessRow = {
      role,
      selector,
      granted: false,
      grantedActions: [],
      requiredActions,
      missingActions: [...requiredActions],
      handlerForSelectors: [],
      handlerRelationsHold: false,
      handlerSelfReferenced: false,
      holds: false
    };

    let permissions: FunctionPermission[] | null = null;
    try {
      permissions = await account.getActiveRolePermissions(role);
    } catch (error) {
      const message = errorMessage(error);
      row.error = message;
      errors.push(`role permission read failed for role ${role}: ${message}`);
      missing.push(`grant: could not read permissions for role ${role}: ${message}`);
      grants.push(row);
      continue;
    }

    const permission = permissions.find((p) => norm(p.functionSelector) === norm(selector));
    if (!permission) {
      missing.push(
        `grant: role ${role} holds no permission on selector ${selector}` +
          (requiredActions.length > 0
            ? ` (needs ${requiredActions.map(txActionName).join(', ')} via ADD_FUNCTION_TO_ROLE)`
            : ' (add it with ADD_FUNCTION_TO_ROLE)')
      );
      grants.push(row);
      continue;
    }

    row.granted = true;
    const bitmap = fromContractValue(permission.grantedActionsBitmap);
    row.grantedActions = getActionsFromBitmap(bitmap);
    row.missingActions = requiredActions.filter((action) => !isBitSet(bitmap, action));
    row.handlerForSelectors = [...(permission.handlerForSelectors ?? [])];
    row.handlerSelfReferenced = row.handlerForSelectors.some((h) => norm(h) === norm(selector));
    // Mirror `_validateHandlerForSelectors`: in strict mode every handler on the grant must appear in the
    // schema's own list. Without a readable schema we cannot clear it.
    row.handlerRelationsHold = !schemaData
      ? false
      : !enforceHandlers || row.handlerForSelectors.every((h) => schemaHandlers.has(norm(h)));

    if (row.missingActions.length > 0) {
      missing.push(
        `grant: role ${role} is missing ${row.missingActions.map(txActionName).join(', ')} on selector ${selector} ` +
          '(change a grant with REMOVE_FUNCTION_FROM_ROLE then ADD_FUNCTION_TO_ROLE in one batch)'
      );
    }
    if (!row.handlerRelationsHold) {
      missing.push(
        !schemaData
          ? `grant: cannot validate handlerForSelectors for role ${role} on selector ${selector} without a readable schema`
          : `grant: role ${role} names handlerForSelectors [${row.handlerForSelectors.join(', ')}] that the schema for ` +
            `${selector} does not list [${(schema.handlerForSelectors ?? []).join(', ')}] — this reverts ` +
            'HandlerForSelectorMismatch'
      );
    }

    row.holds = row.granted && row.missingActions.length === 0 && row.handlerRelationsHold;
    grants.push(row);
  }

  // ---- Fail closed ----------------------------------------------------------------------------
  // `open` is the AND of every row, and any read error or empty row set forces it false.
  const open =
    errors.length === 0 &&
    missing.length === 0 &&
    schema.holds &&
    targets.length > 0 &&
    roleInputs.length > 0 &&
    whitelisted.length > 0 &&
    whitelisted.every((row) => row.holds) &&
    grants.length > 0 &&
    grants.every((row) => row.holds);

  return { selector, open, schema, whitelisted, grants, missing, errors };
}

/**
 * Renders a {@link FlowReadiness} as a short multi-line report — the string to put in a thrown error or a CLI.
 *
 * @param readiness Result of {@link flowReadiness}.
 * @returns A human-readable summary naming every row that did not hold.
 */
export function formatFlowReadiness(readiness: FlowReadiness): string {
  const lines: string[] = [
    `flow ${readiness.selector}: ${readiness.open ? 'OPEN' : 'NOT OPEN'}`,
    `  schema:    ${readiness.schema.holds ? 'ok' : 'missing'}${readiness.schema.operationName ? ` (${readiness.schema.operationName})` : ''}`,
    `  targets:   ${readiness.whitelisted.filter((r) => r.holds).length}/${readiness.whitelisted.length} whitelisted`,
    `  grants:    ${readiness.grants.filter((r) => r.holds).length}/${readiness.grants.length} satisfied`
  ];
  for (const item of readiness.missing) lines.push(`  - ${item}`);
  for (const item of readiness.errors) lines.push(`  ! ${item}`);
  return lines.join('\n');
}
