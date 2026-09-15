/**
 * Typed ABI barrel for consumers (`import { copyBloxAbi } from '@bloxchain/sdk/abi'`).
 *
 * Every ABI the package ships is reachable three ways, all equivalent:
 *
 * | Style | Example |
 * |-------|---------|
 * | Barrel (recommended) | `import { copyBloxAbi } from '@bloxchain/sdk/abi'` |
 * | Per-contract subpath | `import { copyBloxAbi } from '@bloxchain/sdk/abi/CopyBlox'` |
 * | Raw JSON subpath | `import abi from '@bloxchain/sdk/abi/CopyBlox.abi.json' with { type: 'json' }` |
 *
 * Prefer the barrel or the per-contract subpath: both are plain ES modules, so
 * they work under every bundler and Node resolver without JSON import
 * attributes. Reach for the raw JSON only when a tool insists on the file.
 *
 * ABIs are widened to `readonly unknown[]` so they can be handed to any viem
 * call site without variance complaints. When you want full viem type
 * inference for a narrow surface, use `erc20MinimalAbi` from
 * `@bloxchain/sdk/abi/ERC20`, or `parseAbi` your own fragment.
 */

export {
  accountBloxAbi,
  accountBloxErrorAbi,
  accountBloxEventAbi,
} from './abis/AccountBlox.js';
export { bareBloxAbi, bareBloxErrorAbi, bareBloxEventAbi } from './abis/BareBlox.js';
export {
  baseStateMachineAbi,
  baseStateMachineErrorAbi,
  baseStateMachineEventAbi,
} from './abis/BaseStateMachine.js';
export { copyBloxAbi, copyBloxErrorAbi, copyBloxEventAbi } from './abis/CopyBlox.js';
export { engineBloxAbi, engineBloxErrorAbi, engineBloxEventAbi } from './abis/EngineBlox.js';
export {
  guardControllerAbi,
  guardControllerErrorAbi,
  guardControllerEventAbi,
} from './abis/GuardController.js';
export {
  guardControllerDefinitionsAbi,
  guardControllerDefinitionsErrorAbi,
  guardControllerDefinitionsEventAbi,
} from './abis/GuardControllerDefinitions.js';
export { iDefinitionAbi, iDefinitionErrorAbi, iDefinitionEventAbi } from './abis/IDefinition.js';
export { roleBloxAbi, roleBloxErrorAbi, roleBloxEventAbi } from './abis/RoleBlox.js';
export { runtimeRBACAbi, runtimeRBACErrorAbi, runtimeRBACEventAbi } from './abis/RuntimeRBAC.js';
export {
  runtimeRBACDefinitionsAbi,
  runtimeRBACDefinitionsErrorAbi,
  runtimeRBACDefinitionsEventAbi,
} from './abis/RuntimeRBACDefinitions.js';
export { secureBloxAbi, secureBloxErrorAbi, secureBloxEventAbi } from './abis/SecureBlox.js';
export {
  secureOwnableAbi,
  secureOwnableErrorAbi,
  secureOwnableEventAbi,
} from './abis/SecureOwnable.js';
export {
  secureOwnableDefinitionsAbi,
  secureOwnableDefinitionsErrorAbi,
  secureOwnableDefinitionsEventAbi,
} from './abis/SecureOwnableDefinitions.js';
export { erc20Abi, erc20MinimalAbi, erc20EventAbi } from './abis/ERC20.js';

import { accountBloxAbi } from './abis/AccountBlox.js';
import { bareBloxAbi } from './abis/BareBlox.js';
import { baseStateMachineAbi } from './abis/BaseStateMachine.js';
import { copyBloxAbi } from './abis/CopyBlox.js';
import { engineBloxAbi } from './abis/EngineBlox.js';
import { guardControllerAbi } from './abis/GuardController.js';
import { guardControllerDefinitionsAbi } from './abis/GuardControllerDefinitions.js';
import { iDefinitionAbi } from './abis/IDefinition.js';
import { roleBloxAbi } from './abis/RoleBlox.js';
import { runtimeRBACAbi } from './abis/RuntimeRBAC.js';
import { runtimeRBACDefinitionsAbi } from './abis/RuntimeRBACDefinitions.js';
import { secureBloxAbi } from './abis/SecureBlox.js';
import { secureOwnableAbi } from './abis/SecureOwnable.js';
import { secureOwnableDefinitionsAbi } from './abis/SecureOwnableDefinitions.js';
import { erc20Abi } from './abis/ERC20.js';

/**
 * Every shipped ABI, keyed by contract name — the same names used by the
 * `@bloxchain/sdk/abi/<Name>` subpaths and the `abi/<Name>.abi.json` files.
 *
 * Useful when the contract is chosen at runtime:
 *
 * ```ts
 * import { ABIS } from '@bloxchain/sdk/abi';
 * const abi = ABIS[name];
 * ```
 */
export const ABIS = {
  AccountBlox: accountBloxAbi,
  BareBlox: bareBloxAbi,
  BaseStateMachine: baseStateMachineAbi,
  CopyBlox: copyBloxAbi,
  EngineBlox: engineBloxAbi,
  ERC20: erc20Abi,
  GuardController: guardControllerAbi,
  GuardControllerDefinitions: guardControllerDefinitionsAbi,
  IDefinition: iDefinitionAbi,
  RoleBlox: roleBloxAbi,
  RuntimeRBAC: runtimeRBACAbi,
  RuntimeRBACDefinitions: runtimeRBACDefinitionsAbi,
  SecureBlox: secureBloxAbi,
  SecureOwnable: secureOwnableAbi,
  SecureOwnableDefinitions: secureOwnableDefinitionsAbi,
} as const;

/** Name of a contract whose ABI this package ships. */
export type BloxchainAbiName = keyof typeof ABIS;

/**
 * Every custom-error entry from every shipped ABI, de-duplicated by name.
 *
 * Hand this to viem's `decodeErrorResult` when you hold revert bytes but do not
 * know which contract produced them — a guarded inner call can revert inside a
 * target the caller's ABI has never heard of.
 */
export const ALL_ERROR_ABI: readonly unknown[] = (() => {
  const seen = new Set<string>();
  const out: unknown[] = [];
  for (const abi of Object.values(ABIS)) {
    for (const item of abi as Array<{ type?: string; name?: string; inputs?: Array<{ type?: string }> }>) {
      if (item.type !== 'error') continue;
      const key = `${item.name}(${(item.inputs ?? []).map((i) => i.type).join(',')})`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(item);
    }
  }
  return out;
})();
