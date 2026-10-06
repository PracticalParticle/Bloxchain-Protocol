// validate-official-addresses.cjs
// Executable schema for official-deployed-addresses.json (SPEC-2026-0118 R2, SPEC-2026-0137).
//
//   node scripts/validate-official-addresses.cjs            # validate the file
//   node scripts/validate-official-addresses.cjs --network sepolia
//   node scripts/validate-official-addresses.cjs --require-official sepolia
//
// --require-official <network> additionally fails when that network still has pending
// rows, which is what a release check wants before telling integrators to use it.
//
// Required rows depend on the network's posture (scripts/lib/official-catalog.cjs): a CreateX
// catalog network must declare the libraries + BasicAccount + BasicFactory, each with a
// CreateX salt and init code hash that reproduce its address offline; a legacy network
// declares the libraries + AccountBlox + CopyBlox. Legacy rows kept on a catalog network
// must be "deprecated".

const fs = require('fs');
const path = require('path');
const {
  CREATEX,
  LEGACY_LIBRARY_PREFIX,
  LIBRARIES,
  POSTURES,
  createXSaltError,
  isBytes32,
  postureOf,
  predictCreateXAddress,
} = require('./lib/official-catalog.cjs');

const ROOT_DIR = path.join(__dirname, '..');
const FILE = path.join(ROOT_DIR, 'official-deployed-addresses.json');
const LAB_FILE = 'deployed-addresses.json';

const EXPECTED_FORMAT = 'bloxchain-official-addresses/1';

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

function validateContract(networkName, contractName, row) {
  const where = `networks.${networkName}.contracts.${contractName}`;

  if (!row || typeof row !== 'object') {
    error(where, 'must be an object');
    return { declared: false };
  }

  if (!KINDS.has(row.kind)) {
    error(where, `kind must be one of ${[...KINDS].join(', ')} (got ${JSON.stringify(row.kind)})`);
  }
  if (row.status !== undefined && !STATUSES.has(row.status)) {
    error(where, `status must be one of ${[...STATUSES].join(', ')} (got ${JSON.stringify(row.status)})`);
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

  if (contractName === 'CopyBlox' || contractName === 'BasicFactory') {
    if (contractName === 'CopyBlox' && (!row.supports || typeof row.supports.clonesOf !== 'boolean')) {
      error(
        where,
        'a factory row must declare supports.clonesOf (false for factories deployed before the owner index, so consumers fall back to BloxCloned logs)'
      );
    }
    if (!row.gas || typeof row.gas.maxTxGas !== 'number') {
      error(where, 'a factory row must declare gas.maxTxGas (EIP-7825 per-tx cap for the network)');
    } else {
      const { cloneBloxObserved, sendWithGasLimit, maxTxGas } = row.gas;
      const isPositiveSafeInteger = (value) => Number.isSafeInteger(value) && value > 0;

      if (!isPositiveSafeInteger(maxTxGas)) {
        error(where, `gas.maxTxGas must be a positive safe integer (got ${JSON.stringify(maxTxGas)})`);
      }
      if (!isPositiveSafeInteger(cloneBloxObserved)) {
        error(
          where,
          `gas.cloneBloxObserved must be a positive safe integer (got ${JSON.stringify(cloneBloxObserved)}). Fresh factory promotions leave this field null — populate it from a real transaction receipt before re-running validation.`
        );
      } else if (isPositiveSafeInteger(maxTxGas) && !(cloneBloxObserved < maxTxGas)) {
        error(
          where,
          `gas.cloneBloxObserved (${cloneBloxObserved}) must be strictly less than gas.maxTxGas (${maxTxGas})`
        );
      }
      if (!isPositiveSafeInteger(sendWithGasLimit)) {
        error(
          where,
          `gas.sendWithGasLimit must be a positive safe integer (got ${JSON.stringify(sendWithGasLimit)})`
        );
      } else if (isPositiveSafeInteger(maxTxGas) && sendWithGasLimit > maxTxGas) {
        error(where, `gas.sendWithGasLimit (${sendWithGasLimit}) exceeds gas.maxTxGas (${maxTxGas})`);
      }
    }
  }

  return { declared: true };
}

/**
 * CreateX catalog rules: the CreateX pins, a permissioned no-chainid salt per row, an
 * address that reproduces from deployer + salt + init code hash, the official mint wiring,
 * and every legacy row on the network marked deprecated.
 */
function validateCatalog(networkName, network) {
  const where = `networks.${networkName}.catalog`;
  const catalog = network.catalog;

  if (catalog.createx !== CREATEX.address) {
    error(where, `createx must be ${CREATEX.address} (got ${JSON.stringify(catalog.createx)})`);
  }
  if (catalog.createxRuntimeCodeHash !== CREATEX.runtimeCodeHash) {
    error(where, `createxRuntimeCodeHash must be the CreateX pin ${CREATEX.runtimeCodeHash}`);
  }
  if (!isAddress(catalog.deployer)) {
    error(where, `deployer must be an address (got ${JSON.stringify(catalog.deployer)})`);
    return;
  }

  const contracts = network.contracts;
  for (const name of POSTURES.createx.required) {
    const row = contracts[name];
    if (!row || !isAddress(row.address)) continue;
    const rowWhere = `networks.${networkName}.contracts.${name}`;
    if (!row.createx || typeof row.createx !== 'object') {
      error(rowWhere, 'a CreateX catalog row must record createx.salt and createx.initCodeHash');
      continue;
    }
    const saltError = createXSaltError(row.createx.salt, catalog.deployer);
    if (saltError) {
      error(rowWhere, `createx.${saltError}`);
      continue;
    }
    if (!isBytes32(row.createx.initCodeHash)) {
      error(rowWhere, 'createx.initCodeHash must be 32 bytes');
      continue;
    }
    const predicted = predictCreateXAddress({
      deployer: catalog.deployer,
      salt: row.createx.salt,
      initCodeHash: row.createx.initCodeHash,
    });
    if (predicted !== row.address.toLowerCase()) {
      error(rowWhere, `address ${row.address} does not reproduce from deployer + salt + initCodeHash (${predicted})`);
    }
    if (row.status === 'deprecated') {
      error(rowWhere, 'the official mint row of a catalog network cannot be deprecated');
    }
  }

  const factory = contracts.BasicFactory;
  if (factory && factory.address && factory.cloneTarget !== 'BasicAccount') {
    error(`networks.${networkName}.contracts.BasicFactory`, 'cloneTarget must be BasicAccount');
  }

  const legacyNames = [
    ...POSTURES.createx.legacy,
    ...LIBRARIES.map((lib) => `${LEGACY_LIBRARY_PREFIX}${lib}`),
  ];
  for (const name of legacyNames) {
    const row = contracts[name];
    if (row && row.status !== 'deprecated') {
      error(
        `networks.${networkName}.contracts.${name}`,
        'a legacy row on a CreateX catalog network must have "status": "deprecated" (legacy developer path, not the Platform default)'
      );
    }
  }
}

function validateNetwork(networkName, network, seenChainIds) {
  const where = `networks.${networkName}`;

  if (!network || typeof network !== 'object') {
    error(where, 'must be an object');
    return { pending: [], required: [] };
  }

  if (!Number.isInteger(network.chainId) || network.chainId <= 0) {
    error(where, `chainId must be a positive integer (got ${JSON.stringify(network.chainId)})`);
  } else if (seenChainIds.has(network.chainId)) {
    error(where, `chainId ${network.chainId} is already used by ${seenChainIds.get(network.chainId)}`);
  } else {
    seenChainIds.set(network.chainId, networkName);
  }

  // Lab and local chains are exactly what this file must not carry.
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

  if (network.catalog !== undefined && postureOf(network) !== 'createx') {
    error(where, `catalog.rail must be "createx" when catalog is present (got ${JSON.stringify(network.catalog && network.catalog.rail)})`);
  }

  if (!network.contracts || typeof network.contracts !== 'object') {
    error(where, 'contracts must be an object');
    return { pending: [], required: [] };
  }

  const required = POSTURES[postureOf(network)].required;
  const pending = [];
  for (const contractName of required) {
    if (!(contractName in network.contracts)) {
      error(where, `missing required contract row: ${contractName}`);
      pending.push(contractName);
      continue;
    }
    const { declared } = validateContract(networkName, contractName, network.contracts[contractName]);
    if (!declared) pending.push(contractName);
  }

  for (const contractName of Object.keys(network.contracts)) {
    if (!required.includes(contractName)) {
      validateContract(networkName, contractName, network.contracts[contractName]);
    }
  }

  // A template's linked libraries must name rows on the same network, so retiring a
  // library to Legacy<Name> cannot leave the legacy template pointing at nothing.
  for (const [contractName, row] of Object.entries(network.contracts)) {
    if (!row || !Array.isArray(row.linkedLibraries)) continue;
    for (const lib of row.linkedLibraries) {
      if (!network.contracts[lib]) {
        error(`${where}.contracts.${contractName}`, `linkedLibraries names ${lib}, which has no row on this network`);
      }
    }
  }

  if (postureOf(network) === 'createx') validateCatalog(networkName, network);

  return { pending, required };
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

  if (data._format !== EXPECTED_FORMAT) {
    error('_format', `expected ${EXPECTED_FORMAT} (got ${JSON.stringify(data._format)})`);
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
  const results = {};

  for (const [networkName, network] of Object.entries(data.networks)) {
    if (onlyNetwork && networkName !== onlyNetwork) continue;
    results[networkName] = validateNetwork(networkName, network, seenChainIds);
  }

  if (onlyNetwork && !(onlyNetwork in results)) {
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
    } else if ((results[requireOfficial]?.pending ?? []).length > 0) {
      error(
        `networks.${requireOfficial}`,
        `still has pending rows: ${results[requireOfficial].pending.join(', ')}`
      );
    }
  }

  for (const [networkName, { pending, required }] of Object.entries(results)) {
    const network = data.networks[networkName];
    const label = `${networkName} (chain ${network && network.chainId}, ${postureOf(network)})`;
    if (pending.length === 0) {
      console.log(`✅ ${label}: all ${required.length} required contracts declared`);
    } else {
      console.log(
        `⏳ ${label}: ${required.length - pending.length}/${required.length} declared, pending: ${pending.join(', ')}`
      );
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
