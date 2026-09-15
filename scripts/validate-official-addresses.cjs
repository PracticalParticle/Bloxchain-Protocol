// validate-official-addresses.cjs
// Executable schema for official-deployed-addresses.json (SPEC-2026-0118 R2).
//
//   node scripts/validate-official-addresses.cjs            # validate the file
//   node scripts/validate-official-addresses.cjs --network sepolia
//   node scripts/validate-official-addresses.cjs --require-official sepolia
//
// --require-official <network> additionally fails when that network still has pending
// rows, which is what a release check wants before telling integrators to use it.

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const FILE = path.join(ROOT_DIR, 'official-deployed-addresses.json');
const LAB_FILE = 'deployed-addresses.json';

const EXPECTED_FORMAT = 'bloxchain-official-addresses/1';

/** Every official network must carry a row for each of these. */
const REQUIRED_CONTRACTS = [
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

function validateContract(networkName, contractName, row) {
  const where = `networks.${networkName}.contracts.${contractName}`;

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
          `gas.cloneBloxObserved must be a positive safe integer (got ${JSON.stringify(cloneBloxObserved)})`
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

function validateNetwork(networkName, network, seenChainIds) {
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

  if (!network.contracts || typeof network.contracts !== 'object') {
    error(where, 'contracts must be an object');
    return { pending: [] };
  }

  const pending = [];
  for (const contractName of REQUIRED_CONTRACTS) {
    if (!(contractName in network.contracts)) {
      error(where, `missing required contract row: ${contractName}`);
      pending.push(contractName);
      continue;
    }
    const { declared } = validateContract(networkName, contractName, network.contracts[contractName]);
    if (!declared) pending.push(contractName);
  }

  for (const contractName of Object.keys(network.contracts)) {
    if (!REQUIRED_CONTRACTS.includes(contractName)) {
      validateContract(networkName, contractName, network.contracts[contractName]);
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
  const pendingByNetwork = {};

  for (const [networkName, network] of Object.entries(data.networks)) {
    if (onlyNetwork && networkName !== onlyNetwork) continue;
    const { pending } = validateNetwork(networkName, network, seenChainIds);
    pendingByNetwork[networkName] = pending;
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
    } else if ((pendingByNetwork[requireOfficial] ?? []).length > 0) {
      error(
        `networks.${requireOfficial}`,
        `still has pending rows: ${pendingByNetwork[requireOfficial].join(', ')}`
      );
    }
  }

  for (const [networkName, pending] of Object.entries(pendingByNetwork)) {
    const network = data.networks[networkName];
    const label = `${networkName} (chain ${network && network.chainId})`;
    if (pending.length === 0) {
      console.log(`✅ ${label}: all ${REQUIRED_CONTRACTS.length} required contracts declared`);
    } else {
      console.log(
        `⏳ ${label}: ${REQUIRED_CONTRACTS.length - pending.length}/${REQUIRED_CONTRACTS.length} declared, pending: ${pending.join(', ')}`
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
