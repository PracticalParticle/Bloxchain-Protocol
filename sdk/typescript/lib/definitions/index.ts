/**
 * Definition modules: pure helpers for building execution params.
 * Mirror Solidity definition libraries; no contract calls.
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
