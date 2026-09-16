import { Address, getAddress, isAddress } from 'viem';

/**
 * Types and resolution for `official-deployed-addresses.json`, the per-network address
 * file that ships with `@bloxchain/contracts` (SPEC-2026-0118 R2).
 *
 * The SDK does not read the file itself: `@bloxchain/contracts` is an optional peer, and
 * an integrator may keep their own copy or serve it from their backend. Load the JSON
 * however you like and pass it in:
 *
 * ```ts
 * import official from '@bloxchain/contracts/official-deployed-addresses.json' with { type: 'json' };
 * import { resolveOfficialNetwork } from '@bloxchain/sdk';
 *
 * const sepolia = resolveOfficialNetwork(official, 11155111);
 * const factory = sepolia.contracts.CopyBlox.address;
 * ```
 *
 * Do not confuse this with `deployed-addresses.json`, which the deployment scripts write
 * for whatever network they were pointed at, including local and lab chains. That file is
 * never published and is not a source of truth for an integrator.
 */

export type OfficialContractKind = 'library' | 'definition-library' | 'template' | 'factory';

export type OfficialStatus = 'official' | 'pending-declaration' | 'deprecated';

export interface OfficialGasNotes {
  /** Observed `gasUsed` for a clone on this network, when measured. */
  cloneBloxObserved?: number | null;
  /** Gas limit to send a clone with. */
  sendWithGasLimit?: number | null;
  /** Per-transaction gas cap this network enforces (EIP-7825 is 2^24). */
  maxTxGas?: number | null;
  notes?: string;
}

export interface OfficialContract {
  /** Deployed address, or null when the row is pending a human declaration. */
  address: string | null;
  kind: OfficialContractKind;
  status?: OfficialStatus;
  /** Path to the matching artifact inside `@bloxchain/contracts`. */
  artifact?: string;
  /** True for libraries linked into a template at compile time. */
  linkTime?: boolean;
  /** Libraries a template's bytecode links against. */
  linkedLibraries?: string[];
  /** True when a template has already been initialized (so it cannot be claimed). */
  initialized?: boolean;
  /** Template a factory clones by default. */
  cloneTarget?: string;
  /** Optional API a deployment may or may not carry. */
  supports?: { clonesOf?: boolean };
  gas?: OfficialGasNotes;
  notes?: string;
}

export interface OfficialNetwork {
  chainId: number;
  status: OfficialStatus;
  explorer?: string | null;
  declaredIn?: string | null;
  mirroredAt?: string;
  notes?: string;
  contracts: Record<string, OfficialContract>;
}

export interface OfficialAddressesFile {
  _format: string;
  description?: string;
  declarationPolicy?: Record<string, string>;
  updated?: string;
  networks: Record<string, OfficialNetwork>;
}

/** A network resolved from the file, with its key and checksummed addresses. */
export interface ResolvedOfficialNetwork extends OfficialNetwork {
  /** Key this network has in the file, e.g. `sepolia`. */
  network: string;
}

export const OFFICIAL_ADDRESSES_FORMAT = 'bloxchain-official-addresses/1';

export class OfficialNetworkNotFoundError extends Error {
  constructor(lookup: string | number, available: string[]) {
    super(
      `No official deployment for ${typeof lookup === 'number' ? `chain ${lookup}` : lookup}. ` +
        `Declared networks: ${available.join(', ') || '(none)'}. ` +
        'A network appears in official-deployed-addresses.json only after a human release ' +
        'owner declares it official.'
    );
    this.name = 'OfficialNetworkNotFoundError';
  }
}

export class OfficialContractNotDeclaredError extends Error {
  constructor(network: string, contractName: string) {
    super(
      `${contractName} is not declared on ${network}. The row is either missing or still ` +
        'pending a human declaration; do not substitute an address of your own.'
    );
    this.name = 'OfficialContractNotDeclaredError';
  }
}

export class NetworkNotOfficialError extends Error {
  constructor(network: string, status: OfficialStatus) {
    super(
      `Network ${network} has status "${status}", not "official". Provisioning and public ` +
        'setup must use a network declared official in official-deployed-addresses.json.'
    );
    this.name = 'NetworkNotOfficialError';
  }
}

/**
 * Find a network in the official address file by chain id or by key.
 *
 * @param file Parsed `official-deployed-addresses.json`
 * @param lookup Chain id (e.g. `11155111`) or network key (e.g. `'sepolia'`)
 * @throws {OfficialNetworkNotFoundError} when the network is not declared
 */
export function resolveOfficialNetwork(
  file: OfficialAddressesFile,
  lookup: number | string
): ResolvedOfficialNetwork {
  if (!file || !file.networks) {
    throw new OfficialNetworkNotFoundError(lookup, []);
  }
  if (file._format && file._format !== OFFICIAL_ADDRESSES_FORMAT) {
    throw new Error(
      `Unexpected official address file format ${file._format}; this SDK reads ${OFFICIAL_ADDRESSES_FORMAT}.`
    );
  }

  const entries = Object.entries(file.networks);
  const match =
    typeof lookup === 'number'
      ? entries.find(([, network]) => network.chainId === lookup)
      : entries.find(([key]) => key === lookup);

  if (!match) {
    throw new OfficialNetworkNotFoundError(
      lookup,
      entries.map(([key, network]) => `${key} (${network.chainId})`)
    );
  }

  const [network, data] = match;
  return { network, ...data };
}

/**
 * Throw unless the resolved network is declared `official`.
 *
 * Use this in provisioning and public setup before reading contract addresses. Valid
 * addresses on a pending or deprecated network remain readable via
 * {@link getOfficialAddress}; this gate is separate so staged rows are not rejected at
 * the contract level.
 *
 * @param network Network from {@link resolveOfficialNetwork}
 * @throws {NetworkNotOfficialError} when `status` is not `official`
 */
export function assertNetworkIsOfficial(network: ResolvedOfficialNetwork): void {
  if (network.status !== 'official') {
    throw new NetworkNotOfficialError(network.network, network.status);
  }
}

/**
 * Get one declared contract address from a resolved network.
 *
 * Throws rather than returning null for a pending row: a caller that silently falls back
 * to some other address is the failure mode this file exists to prevent. Does **not**
 * require the network itself to be `official` — use {@link assertNetworkIsOfficial} for
 * that in provisioning flows.
 *
 * @param network Network from {@link resolveOfficialNetwork}
 * @param contractName Contract key, e.g. `'CopyBlox'`
 * @throws {OfficialContractNotDeclaredError} when the row is missing or pending
 */
export function getOfficialAddress(
  network: ResolvedOfficialNetwork,
  contractName: string
): Address {
  const row = network.contracts?.[contractName];
  if (!row || !row.address || !isAddress(row.address)) {
    throw new OfficialContractNotDeclaredError(network.network, contractName);
  }
  return getAddress(row.address);
}

/**
 * Contract rows on a network that are still waiting on a declaration.
 *
 * @param network Network from {@link resolveOfficialNetwork}
 */
export function pendingOfficialContracts(network: ResolvedOfficialNetwork): string[] {
  return Object.entries(network.contracts ?? {})
    .filter(([, row]) => !row.address || row.status === 'pending-declaration')
    .map(([name]) => name);
}

/**
 * Whether a factory deployment carries the on-chain owner index, according to the file.
 *
 * Factories deployed before the index exist on official networks, and for those an
 * owner's accounts must come from `BloxCloned` logs. The SDK factory wrapper falls back
 * on its own; this lets a caller decide up front (for example, to require a `fromBlock`).
 *
 * @param network Network from {@link resolveOfficialNetwork}
 * @param contractName Factory key, defaults to `'CopyBlox'`
 */
export function factorySupportsClonesOf(
  network: ResolvedOfficialNetwork,
  contractName = 'CopyBlox'
): boolean {
  return network.contracts?.[contractName]?.supports?.clonesOf === true;
}
