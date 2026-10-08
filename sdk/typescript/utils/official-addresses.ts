import { Address, getAddress, isAddress } from 'viem';

/**
 * Types and resolution for `official-deployed-addresses.json`, the address file that
 * ships with `@bloxchain/contracts`.
 *
 * Format `/2` stores the CreateX six-pack once under `catalog.contracts` and lists
 * supported networks that reference that catalog. Sepolia may also declare an
 * experimental pair under `networks.<name>.developerTools` (`AccountBlox` / `CopyBlox`):
 * open factory and a 1-second AccountBlox floor. Resolvers merge
 * catalog + developerTools into `contracts` so {@link getOfficialAddress} can read either;
 * {@link getOfficialBasicMint} only accepts BasicFactory / BasicAccount.
 *
 * The SDK does not read the file itself: `@bloxchain/contracts` is an optional peer.
 * Load the JSON however you like and pass it in:
 *
 * ```ts
 * import official from '@bloxchain/contracts/official-deployed-addresses.json' with { type: 'json' };
 * import { resolveOfficialNetwork, getOfficialBasicMint } from '@bloxchain/sdk';
 *
 * const network = resolveOfficialNetwork(official, chainId);
 * const { factory, implementation } = getOfficialBasicMint(network);
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
  /** Shared catalog id (format `/2`), e.g. `createx-v1`. */
  catalog?: string;
  explorer?: string | null;
  declaredIn?: string | null;
  mirroredAt?: string;
  notes?: string;
  /**
   * Extra per-network rows. Shared catalog rows are filled in by
   * {@link resolveOfficialNetwork}.
   */
  contracts?: Record<string, OfficialContract>;
  /**
   * Experimental overlay, e.g. Sepolia AccountBlox / CopyBlox.
   * Not the CreateX mint.
   */
  developerTools?: Record<string, OfficialContract>;
  /**
   * Optional per-contract gas overlays for this network (e.g. Polygon `BasicFactory`
   * send limit above the shared catalog default). Merged onto catalog rows by
   * {@link resolveOfficialNetwork}.
   */
  gas?: Record<string, OfficialGasNotes>;
}

export interface OfficialCatalog {
  id: string;
  label?: string;
  spec?: string;
  deployer?: string;
  notes?: string;
  contracts: Record<string, OfficialContract>;
}

export interface OfficialAddressesFile {
  _format: string;
  description?: string;
  declarationPolicy?: Record<string, string>;
  updated?: string;
  createx?: {
    address?: string;
    runtimeCodeHash?: string;
    source?: string;
  };
  /** Shared CreateX catalog. */
  catalog?: OfficialCatalog;
  networks: Record<string, OfficialNetwork>;
}

/** A network resolved from the file, with its key and checksummed addresses. */
export interface ResolvedOfficialNetwork extends OfficialNetwork {
  /** Key this network has in the file, e.g. `sepolia`. */
  network: string;
  /** Always present after resolve — catalog and developerTools merged. */
  contracts: Record<string, OfficialContract>;
}

/** Published address-file format (shared CreateX catalog). */
export const OFFICIAL_ADDRESSES_FORMAT = 'bloxchain-official-addresses/2';

/**
 * Contract keys for the official mint: `BasicFactory` clones `BasicAccount`.
 * Prefer these keys. A network that lacks them has no official mint declared.
 */
export const OFFICIAL_MINT_CONTRACTS = {
  factory: 'BasicFactory',
  implementation: 'BasicAccount',
} as const;

/**
 * Contract keys for the Sepolia experiment (`CopyBlox` / `AccountBlox`).
 * Address-book only. `@bloxchain/sdk` does not export a CopyBlox client.
 * Wire via `@bloxchain/contracts` artifacts if needed.
 */
export const DEVELOPER_TOOL_CONTRACTS = {
  factory: 'CopyBlox',
  template: 'AccountBlox',
} as const;

/** Declared addresses of the official mint on one network. */
export interface OfficialBasicMint {
  /** `BasicFactory`: pass to the SDK `BasicFactory` client. */
  factory: Address;
  /** `BasicAccount`: the implementation the factory is pinned to (compare with `implementation()`). */
  implementation: Address;
}

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

function applyNetworkGasOverlays(
  merged: Record<string, OfficialContract>,
  overlays: Record<string, OfficialGasNotes> | undefined
): void {
  if (!overlays) return;
  for (const [name, overlay] of Object.entries(overlays)) {
    const base = merged[name];
    if (!base) continue;
    merged[name] = {
      ...base,
      gas: { ...(base.gas ?? {}), ...overlay },
    };
  }
}

function mergeNetworkContracts(
  file: OfficialAddressesFile,
  data: OfficialNetwork
): Record<string, OfficialContract> {
  const merged: Record<string, OfficialContract> = {};
  const catalogId = data.catalog ?? file.catalog?.id;
  const hasMatchingCatalog =
    !!file.catalog && !!catalogId && file.catalog.id === catalogId;

  // Catalog merge when a catalog is present, including when `_format` is omitted.
  if (hasMatchingCatalog && file.catalog) {
    Object.assign(merged, file.catalog.contracts);
  }
  if (data.developerTools) {
    Object.assign(merged, data.developerTools);
  }
  if (data.contracts) {
    for (const [name, row] of Object.entries(data.contracts)) {
      if (!(name in merged)) merged[name] = row;
    }
  }
  applyNetworkGasOverlays(merged, data.gas);
  return merged;
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
      `Unexpected official address file format ${file._format}; this SDK reads ` +
        `${OFFICIAL_ADDRESSES_FORMAT}.`
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
  const contracts = mergeNetworkContracts(file, data);
  return { network, ...data, contracts };
}

/**
 * Throw unless the resolved network is declared `official`.
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
 * Throws rather than returning null for a pending row. Does **not** require the network
 * itself to be `official` — use {@link assertNetworkIsOfficial} for that in provisioning.
 *
 * @param network Network from {@link resolveOfficialNetwork}
 * @param contractName Contract key, e.g. `'BasicFactory'` (official mint) or `'CopyBlox'` (Sepolia experiment)
 * @throws {OfficialContractNotDeclaredError} when the row is missing or pending
 */
export function getOfficialAddress(
  network: ResolvedOfficialNetwork,
  contractName: string
): Address {
  const row = network.contracts?.[contractName];
  if (
    !row ||
    !row.address ||
    !isAddress(row.address) ||
    row.status === 'pending-declaration'
  ) {
    throw new OfficialContractNotDeclaredError(network.network, contractName);
  }
  return getAddress(row.address);
}

/**
 * The official mint on a network: the declared `BasicFactory` and `BasicAccount` addresses.
 *
 * Fails closed. Both rows must be declared; a missing or pending row throws, and there is no
 * fallback to the experimental `CopyBlox` / `AccountBlox` rows.
 *
 * @param network Network from {@link resolveOfficialNetwork}
 * @throws {OfficialContractNotDeclaredError} when `BasicFactory` or `BasicAccount` is not declared
 */
export function getOfficialBasicMint(network: ResolvedOfficialNetwork): OfficialBasicMint {
  return {
    factory: getOfficialAddress(network, OFFICIAL_MINT_CONTRACTS.factory),
    implementation: getOfficialAddress(network, OFFICIAL_MINT_CONTRACTS.implementation),
  };
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
 * Whether an experimental CopyBlox factory deployment carries the on-chain owner index.
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
