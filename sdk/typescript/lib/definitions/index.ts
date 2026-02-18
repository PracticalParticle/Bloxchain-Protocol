/**
 * Definition modules: call deployed definition contracts for execution params and specs.
 * Single source of truth: encoding and specs come from Solidity definition libraries.
 * Pass PublicClient and definition contract address (e.g. from deployed-addresses.json per chain).
 */

export {
  updateRecoveryExecutionParams,
  updateTimeLockExecutionParams
} from './SecureOwnableDefinitions';

export {
  roleConfigBatchExecutionParams,
  getRoleConfigActionSpecs,
  encodeCreateRole,
  encodeRemoveRole,
  encodeAddWallet,
  encodeRevokeWallet,
  encodeAddFunctionToRole,
  encodeRemoveFunctionFromRole
} from './RuntimeRBACDefinitions';
export type { FunctionPermissionForEncoding } from './RuntimeRBACDefinitions';

export {
  guardConfigBatchExecutionParams,
  getGuardConfigActionSpecs,
  encodeAddTargetToWhitelist,
  encodeRemoveTargetFromWhitelist,
  encodeRegisterFunction,
  encodeUnregisterFunction
} from './GuardControllerDefinitions';
