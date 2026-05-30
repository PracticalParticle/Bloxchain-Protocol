import { keccak256, Hex } from 'viem';
import { metaTxHandlerSignature } from './meta-tx-signatures.js';

/**
 * Operation type hashes (SecureOwnableDefinitions.sol).
 */
export const OPERATION_TYPES = {
  OWNERSHIP_TRANSFER: keccak256(new TextEncoder().encode('OWNERSHIP_TRANSFER')),
  BROADCASTER_UPDATE: keccak256(new TextEncoder().encode('BROADCASTER_UPDATE')),
  RECOVERY_UPDATE: keccak256(new TextEncoder().encode('RECOVERY_UPDATE')),
  TIMELOCK_UPDATE: keccak256(new TextEncoder().encode('TIMELOCK_UPDATE')),
} as const;

export type OperationType = (typeof OPERATION_TYPES)[keyof typeof OPERATION_TYPES];

/**
 * Function selectors (SecureOwnableDefinitions.sol).
 */
export const FUNCTION_SELECTORS = {
  TRANSFER_OWNERSHIP_SELECTOR: keccak256(
    new TextEncoder().encode('executeTransferOwnership(address)')
  ).slice(0, 10) as Hex,
  UPDATE_BROADCASTER_SELECTOR: keccak256(
    new TextEncoder().encode('executeBroadcasterUpdate(address,address)')
  ).slice(0, 10) as Hex,
  UPDATE_RECOVERY_SELECTOR: keccak256(
    new TextEncoder().encode('executeRecoveryUpdate(address)')
  ).slice(0, 10) as Hex,
  UPDATE_TIMELOCK_SELECTOR: keccak256(
    new TextEncoder().encode('executeTimeLockUpdate(uint256)')
  ).slice(0, 10) as Hex,
  TRANSFER_OWNERSHIP_REQUEST_SELECTOR: keccak256(
    new TextEncoder().encode('transferOwnershipRequest()')
  ).slice(0, 10) as Hex,
  TRANSFER_OWNERSHIP_DELAYED_APPROVAL_SELECTOR: keccak256(
    new TextEncoder().encode('transferOwnershipDelayedApproval(uint256)')
  ).slice(0, 10) as Hex,
  TRANSFER_OWNERSHIP_CANCELLATION_SELECTOR: keccak256(
    new TextEncoder().encode('transferOwnershipCancellation(uint256)')
  ).slice(0, 10) as Hex,
  UPDATE_BROADCASTER_REQUEST_SELECTOR: keccak256(
    new TextEncoder().encode('updateBroadcasterRequest(address,address)')
  ).slice(0, 10) as Hex,
  UPDATE_BROADCASTER_DELAYED_APPROVAL_SELECTOR: keccak256(
    new TextEncoder().encode('updateBroadcasterDelayedApproval(uint256)')
  ).slice(0, 10) as Hex,
  UPDATE_BROADCASTER_CANCELLATION_SELECTOR: keccak256(
    new TextEncoder().encode('updateBroadcasterCancellation(uint256)')
  ).slice(0, 10) as Hex,
  TRANSFER_OWNERSHIP_APPROVE_META_SELECTOR: keccak256(
    new TextEncoder().encode(metaTxHandlerSignature('transferOwnershipApprovalWithMetaTx'))
  ).slice(0, 10) as Hex,
  TRANSFER_OWNERSHIP_CANCEL_META_SELECTOR: keccak256(
    new TextEncoder().encode(metaTxHandlerSignature('transferOwnershipCancellationWithMetaTx'))
  ).slice(0, 10) as Hex,
  UPDATE_BROADCASTER_APPROVE_META_SELECTOR: keccak256(
    new TextEncoder().encode(metaTxHandlerSignature('updateBroadcasterApprovalWithMetaTx'))
  ).slice(0, 10) as Hex,
  UPDATE_BROADCASTER_CANCEL_META_SELECTOR: keccak256(
    new TextEncoder().encode(metaTxHandlerSignature('updateBroadcasterCancellationWithMetaTx'))
  ).slice(0, 10) as Hex,
  UPDATE_RECOVERY_META_SELECTOR: keccak256(
    new TextEncoder().encode(metaTxHandlerSignature('updateRecoveryRequestAndApprove'))
  ).slice(0, 10) as Hex,
  UPDATE_TIMELOCK_META_SELECTOR: keccak256(
    new TextEncoder().encode(metaTxHandlerSignature('updateTimeLockRequestAndApprove'))
  ).slice(0, 10) as Hex,
} as const;

export type FunctionSelector = (typeof FUNCTION_SELECTORS)[keyof typeof FUNCTION_SELECTORS];
