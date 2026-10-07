// validate-official-addresses.cjs
// Executable schema for official-deployed-addresses.json (SPEC-2026-0118 R2 / SPEC-2026-0137).
//
//   node scripts/validate-official-addresses.cjs
//   node scripts/validate-official-addresses.cjs --network sepolia
//   node scripts/validate-official-addresses.cjs --require-official sepolia
//
// Format /2: shared catalog.contracts + networks that reference the catalog id.
// Format /1: legacy per-network contracts map (accepted for fixtures only when present).

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const FILE = path.join(ROOT_DIR, 'official-deployed-addresses.json');
const LAB_FILE = 'deployed-addresses.json';

const EXPECTED_FORMAT = 'bloxchain-official-addresses/2';
const LEGACY_FORMAT = 'bloxchain-official-addresses/1';

/** Shared CreateX catalog must carry these official mint rows. */
const CATALOG_REQUIRED = [
  'EngineBlox',
  'SecureOwnableDefinitions',
  'RuntimeRBACDefinitions',
  'GuardControllerDefinitions',
  'BasicAccount',
  'BasicFactory',
];

/** Format /1 networks still required the legacy pair. */
const V1_REQUIRED = [
  'EngineBlox',
  'SecureOwnableDefinitions',
  'RuntimeRBACDefinitions',
  'GuardControllerDefinitions',
  'AccountBlox',
  'CopyBlox',
];

const KINDS = new Set(['library', 'definition-library', 'template', 'factory']);
const STATUSES = new Set(['official', 'pending-declaration', 'deprecated']);

const errors = [];
const warnings = [];

function error(where, message) {
  errors.push(`${where}: ${message}`);
}

function warn(where, message) {
  warnings.push(`${where}: ${message}`);
}

function argValue(flag) {
  const index = process.argv.indexOf(flag);
  return index === -1 ? null : process.argv[index + 1] ?? null;
}

function isAddress(value) {
  return typeof value === 'string' && /^0x[0-9a-fA-F]{40}$/.test(value);
}

function isIsoDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function validateFactoryGas(where, row, contractName) {
  if (!row.gas || typeof row.gas.maxTxGas !== 'number') {
    error(where, `a factory row must declare gas.maxTxGas (EIP-7825 per-tx cap for the network)`);
    return;
  }
  const { cloneBloxObserved, sendWithGasLimit, maxTxGas } = row.gas;
  const isPositiveSafeInteger = (value) => Number.isSafeInteger(value) && value > 0;

  if (!isPositiveSafeInteger(maxTxGas)) {
    error(where, `gas.maxTxGas must be a positive safe integer (got ${JSON.stringify(maxTxGas)})`);
  }
  if (cloneBloxObserved === null || cloneBloxObserved === undefined) {
    warn(
      where,
      'gas.cloneBloxObserved is null — fill from a real receipt after first mint (promoter seeds null)'
    );
  } else if (!isPositiveSafeInteger(cloneBloxObserved)) {
    error(
      where,
      `gas.cloneBloxObserved must be a positive safe integer or null (got ${JSON.stringify(cloneBloxObserved)})`
    );
  } else if (isPositiveSafeInteger(maxTxGas) && !(cloneBloxObserved < maxTxGas)) {
    // Polygon DET can exceed 2^24 on that chain; warn rather than fail when observed >= max.
    if (contractName === 'BasicFactory' && cloneBloxObserved >= maxTxGas) {
      warn(
        where,
        `gas.cloneBloxObserved (${cloneBloxObserved}) is not strictly less than gas.maxTxGas (${maxTxGas}); some L2s need a higher send limit than the EIP-7825 L1 cap.`
      );
    } else {
      error(
        where,
        `gas.cloneBloxObserved (${cloneBloxObserved}) must be strictly less than gas.maxTxGas (${maxTxGas})`
      );
    }
  }
  if (!isPositiveSafeInteger(sendWithGasLimit)) {
    error(
      where,
      `gas.sendWithGasLimit must be a positive safe integer (got ${JSON.stringify(sendWithGasLimit)})`
    );
  } else if (isPositiveSafeInteger(maxTxGas) && sendWithGasLimit > maxTxGas && contractName !== 'BasicFactory') {
    error(where, `gas.sendWithGasLimit (${sendWithGasLimit}) exceeds gas.maxTxGas (${maxTxGas})`);
  }
}

function validateContract(where, contractName, row) {
  if (!row || typeof row !== 'object') {
    error(where, 'must be an object');
    return { declared: false };
  }

  if (!KINDS.has(row.kind)) {
    error(where, `kind must be one of ${[...KINDS].join(', ')} (got ${JSON.stringify(row.kind)})`);
  }

  const pending = row.status === 'pending-declaration' || row.address === null;

  if (pending) {
    if (row.address !== null) {
      error(where, 'a pending row must have "address": null, not a guessed address');
    }
    if (row.status !== 'pending-declaration') {
      error(where, 'a row with a null address must set "status": "pending-declaration"');
    }
    return { declared: false };
  }

  if (!isAddress(row.address)) {
    error(where, `address must be a 0x-prefixed 20-byte hex string (got ${JSON.stringify(row.address)})`);
    return { declared: false };
  }
  if (row.address !== row.address.toLowerCase()) {
    warn(where, 'address is not lowercase; keep one casing so string comparison is safe');
  }
  if (row.address === `0x${'0'.repeat(40)}`) {
    error(where, 'address is the zero address');
  }

  if (row.artifact !== undefined && typeof row.artifact !== 'string') {
    error(where, 'artifact must be a path string when present');
  }

  if (contractName === 'CopyBlox') {
    if (!row.supports || typeof row.supports.clonesOf !== 'boolean') {
      error(
        where,
        'a CopyBlox factory row must declare supports.clonesOf (false for factories deployed before the owner index)'
      );
    }
    validateFactoryGas(where, row, contractName);
  }

  if (contractName === 'BasicFactory') {
    validateFactoryGas(where, row, contractName);
  }

  return { declared: true };
}

function validateCatalog(data) {
  if (!data.catalog || typeof data.catalog !== 'object') {
    error('catalog', 'must be present for format /2 (shared CreateX address book)');
    return { pending: CATALOG_REQUIRED.slice() };
  }
  if (typeof data.catalog.id !== 'string' || !data.catalog.id) {
    error('catalog.id', 'must be a non-empty string');
  }
  if (!data.catalog.contracts || typeof data.catalog.contracts !== 'object') {
    error('catalog.contracts', 'must be an object');
    return { pending: CATALOG_REQUIRED.slice() };
  }

  const pending = [];
  for (const name of CATALOG_REQUIRED) {
    if (!(name in data.catalog.contracts)) {
      error('catalog.contracts', `missing required contract row: ${name}`);
      pending.push(name);
      continue;
    }
    const { declared } = validateContract(
      `catalog.contracts.${name}`,
      name,
      data.catalog.contracts[name]
    );
    if (!declared) pending.push(name);
  }

  for (const name of Object.keys(data.catalog.contracts)) {
    if (!CATALOG_REQUIRED.includes(name)) {
      validateContract(`catalog.contracts.${name}`, name, data.catalog.contracts[name]);
    }
  }

  return { pending };
}

function validateNetworkV2(networkName, network, catalogId, catalogContracts, seenChainIds) {
  const where = `networks.${networkName}`;
  const catalogRows =
    catalogContracts && typeof catalogContracts === 'object' ? catalogContracts : {};

  if (!network || typeof network !== 'object') {
    error(where, 'must be an object');
    return { pending: [] };
  }

  if (!Number.isInteger(network.chainId) || network.chainId <= 0) {
    error(where, `chainId must be a positive integer (got ${JSON.stringify(network.chainId)})`);
  } else if (seenChainIds.has(network.chainId)) {
    error(where, `chainId ${network.chainId} is already used by ${seenChainIds.get(network.chainId)}`);
  } else {
    seenChainIds.set(network.chainId, networkName);
  }

  if (network.chainId === 1337 || network.chainId === 31337) {
    error(where, `chain ${network.chainId} is a local or lab chain and must not appear in this file`);
  }

  if (!STATUSES.has(network.status)) {
    error(where, `status must be one of ${[...STATUSES].join(', ')} (got ${JSON.stringify(network.status)})`);
  }

  if (network.mirroredAt !== undefined && !isIsoDate(network.mirroredAt)) {
    error(where, 'mirroredAt must be a YYYY-MM-DD date');
  }

  if (network.status === 'official' && !network.declaredIn) {
    error(where, 'an official network must record declaredIn (where a human declared it)');
  }

  if (network.catalog !== catalogId) {
    error(where, `catalog must be "${catalogId}" (got ${JSON.stringify(network.catalog)})`);
  }

  // Networks must not repeat the shared six-pack under contracts.
  if (network.contracts && typeof network.contracts === 'object') {
    for (const name of CATALOG_REQUIRED) {
      if (name in network.contracts) {
        error(
          `${where}.contracts.${name}`,
          'do not repeat shared catalog addresses under the network; put them in catalog.contracts only'
        );
      }
    }
  }

  const tools = network.developerTools ?? network.legacy;
  const toolsKey = network.developerTools ? 'developerTools' : 'legacy';
  if (tools && typeof tools === 'object') {
    if (network.legacy && !network.developerTools) {
      warn(where, 'legacy key is deprecated; rename to developerTools (official developer toolkit)');
    }
    for (const [name, row] of Object.entries(tools)) {
      validateContract(`${where}.${toolsKey}.${name}`, name, row);
    }
  }

  if (network.gas && typeof network.gas === 'object') {
    const knownKeys = new Set([
      ...Object.keys(catalogRows),
      ...Object.keys(network.developerTools ?? {}),
      ...Object.keys(network.legacy ?? {}),
      ...Object.keys(network.contracts ?? {}),
    ]);
    for (const [name, overlay] of Object.entries(network.gas)) {
      if (!knownKeys.has(name)) {
        error(
          `${where}.gas.${name}`,
          'unknown contract key; must match catalog.contracts, developerTools, legacy, or network.contracts'
        );
        continue;
      }
      if (!overlay || typeof overlay !== 'object') {
        error(`${where}.gas.${name}`, 'must be an object');
        continue;
      }
      // Known non-factory keys are allowed; validateFactoryGas still checks the shape.
      validateFactoryGas(`${where}.gas.${name}`, { gas: overlay }, name);
    }
  }

  return { pending: [] };
}

function validateNetworkV1(networkName, network, seenChainIds) {
  const where = `networks.${networkName}`;

  if (!network || typeof network !== 'object') {
    error(where, 'must be an object');
    return { pending: [] };
  }

  if (!Number.isInteger(network.chainId) || network.chainId <= 0) {
    error(where, `chainId must be a positive integer (got ${JSON.stringify(network.chainId)})`);
  } else if (seenChainIds.has(network.chainId)) {
    error(where, `chainId ${network.chainId} is already used by ${seenChainIds.get(network.chainId)}`);
  } else {
    seenChainIds.set(network.chainId, networkName);
  }

  if (network.chainId === 1337 || network.chainId === 31337) {
    error(where, `chain ${network.chainId} is a local or lab chain and must not appear in this file`);
  }

  if (!STATUSES.has(network.status)) {
    error(where, `status must be one of ${[...STATUSES].join(', ')} (got ${JSON.stringify(network.status)})`);
  }

  if (network.mirroredAt !== undefined && !isIsoDate(network.mirroredAt)) {
    error(where, 'mirroredAt must be a YYYY-MM-DD date');
  }

  if (network.status === 'official' && !network.declaredIn) {
    error(where, 'an official network must record declaredIn (where a human declared it)');
  }

  if (!network.contracts || typeof network.contracts !== 'object') {
    error(where, 'contracts must be an object');
    return { pending: [] };
  }

  const pending = [];
  for (const contractName of V1_REQUIRED) {
    if (!(contractName in network.contracts)) {
      error(where, `missing required contract row: ${contractName}`);
      pending.push(contractName);
      continue;
    }
    const { declared } = validateContract(
      `${where}.contracts.${contractName}`,
      contractName,
      network.contracts[contractName]
    );
    if (!declared) pending.push(contractName);
  }

  for (const contractName of Object.keys(network.contracts)) {
    if (!V1_REQUIRED.includes(contractName)) {
      validateContract(
        `${where}.contracts.${contractName}`,
        contractName,
        network.contracts[contractName]
      );
    }
  }

  return { pending };
}

function main() {
  if (!fs.existsSync(FILE)) {
    console.error(`❌ ${path.basename(FILE)} not found at repository root`);
    process.exit(1);
  }

  let data;
  try {
    data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch (e) {
    console.error(`❌ ${path.basename(FILE)} is not valid JSON: ${e.message}`);
    process.exit(1);
  }

  const format = data._format;
  if (format !== EXPECTED_FORMAT && format !== LEGACY_FORMAT) {
    error('_format', `expected ${EXPECTED_FORMAT} (got ${JSON.stringify(format)})`);
  }
  if (!data.declarationPolicy || typeof data.declarationPolicy !== 'object') {
    error('declarationPolicy', 'must be present so the fill process travels with the file');
  }
  if (!data.networks || typeof data.networks !== 'object' || Object.keys(data.networks).length === 0) {
    console.error('❌ networks: must be a non-empty object');
    process.exit(1);
  }

  const onlyNetwork = argValue('--network');
  const requireOfficial = argValue('--require-official');
  const seenChainIds = new Map();
  const pendingByNetwork = {};
  let catalogPending = [];

  if (format === EXPECTED_FORMAT) {
    const result = validateCatalog(data);
    catalogPending = result.pending;
    const catalogId = data.catalog && data.catalog.id;

    const catalogContracts =
      data.catalog && data.catalog.contracts && typeof data.catalog.contracts === 'object'
        ? data.catalog.contracts
        : {};
    for (const [networkName, network] of Object.entries(data.networks)) {
      if (onlyNetwork && networkName !== onlyNetwork) continue;
      const { pending } = validateNetworkV2(
        networkName,
        network,
        catalogId,
        catalogContracts,
        seenChainIds
      );
      pendingByNetwork[networkName] = pending;
    }
  } else {
    for (const [networkName, network] of Object.entries(data.networks)) {
      if (onlyNetwork && networkName !== onlyNetwork) continue;
      const { pending } = validateNetworkV1(networkName, network, seenChainIds);
      pendingByNetwork[networkName] = pending;
    }
  }

  if (onlyNetwork && !(onlyNetwork in pendingByNetwork)) {
    console.error(`❌ network ${onlyNetwork} is not in ${path.basename(FILE)}`);
    process.exit(1);
  }

  if (requireOfficial) {
    const network = data.networks[requireOfficial];
    if (!network) {
      error(`--require-official ${requireOfficial}`, 'network is not in the file');
    } else if (onlyNetwork && onlyNetwork !== requireOfficial) {
      error(
        `--require-official ${requireOfficial}`,
        `excluded by --network ${onlyNetwork}; omit --network or pass --network ${requireOfficial}`
      );
    } else if (network.status !== 'official') {
      error(`networks.${requireOfficial}`, `status is ${network.status}, expected official`);
    } else if (format === EXPECTED_FORMAT && catalogPending.length > 0) {
      error('catalog', `still has pending rows: ${catalogPending.join(', ')}`);
    } else if ((pendingByNetwork[requireOfficial] ?? []).length > 0) {
      error(
        `networks.${requireOfficial}`,
        `still has pending rows: ${pendingByNetwork[requireOfficial].join(', ')}`
      );
    }
  }

  if (format === EXPECTED_FORMAT) {
    if (catalogPending.length === 0) {
      console.log(`✅ catalog createx-v1: all ${CATALOG_REQUIRED.length} contracts declared (shared addresses)`);
    } else {
      console.log(
        `⏳ catalog: ${CATALOG_REQUIRED.length - catalogPending.length}/${CATALOG_REQUIRED.length} declared, pending: ${catalogPending.join(', ')}`
      );
    }
    console.log(`✅ networks: ${Object.keys(pendingByNetwork).length} supported chain(s) reference the shared catalog`);
    for (const networkName of Object.keys(pendingByNetwork)) {
      const network = data.networks[networkName];
      console.log(`   · ${networkName} (chain ${network.chainId})`);
    }
  } else {
    for (const [networkName, pending] of Object.entries(pendingByNetwork)) {
      const network = data.networks[networkName];
      const label = `${networkName} (chain ${network && network.chainId})`;
      if (pending.length === 0) {
        console.log(`✅ ${label}: all ${V1_REQUIRED.length} required contracts declared`);
      } else {
        console.log(
          `⏳ ${label}: ${V1_REQUIRED.length - pending.length}/${V1_REQUIRED.length} declared, pending: ${pending.join(', ')}`
        );
      }
    }
  }

  for (const w of warnings) console.warn(`⚠️  ${w}`);

  if (errors.length > 0) {
    console.error(`\n❌ ${path.basename(FILE)} is invalid:`);
    for (const e of errors) console.error(`   - ${e}`);
    console.error(
      `\nNever hand-write an address you have not verified. Deploy, verify on the explorer, then use scripts/promote-official-addresses.cjs to copy it out of ${LAB_FILE}.`
    );
    process.exit(1);
  }

  console.log(`\n✨ ${path.basename(FILE)} is valid`);
}

main();
