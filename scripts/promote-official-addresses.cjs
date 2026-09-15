// promote-official-addresses.cjs
// Fill process for official-deployed-addresses.json (SPEC-2026-0118 R2).
//
// Copies addresses out of the deployment scripts' output (deployed-addresses.json, which
// is git-ignored and may point at any chain, including local and lab ones) into the
// published official file. It refuses to write unless a human passes --declare, because
// "official" is a release decision, not a side effect of running a deploy script.
//
//   node scripts/promote-official-addresses.cjs --network sepolia --chain-id 11155111
//       ... prints the diff it would apply, writes nothing
//
//   node scripts/promote-official-addresses.cjs --network sepolia --chain-id 11155111 --declare
//       ... applies it
//
// Flags:
//   --network <name>      key in deployed-addresses.json and in the official file (required)
//   --chain-id <id>       chain id for a network not already in the official file
//   --declare             actually write (the human declaration)
//   --explorer <url>      explorer base url for a new network
//   --from <path>         source file (default deployed-addresses.json)
//   --note "<text>"       note recorded on the network

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const OFFICIAL_FILE = path.join(ROOT_DIR, 'official-deployed-addresses.json');

const PROMOTABLE = {
  EngineBlox: { kind: 'library', linkTime: true },
  SecureOwnableDefinitions: { kind: 'definition-library', linkTime: true },
  RuntimeRBACDefinitions: { kind: 'definition-library', linkTime: true },
  GuardControllerDefinitions: { kind: 'definition-library', linkTime: true },
  AccountBlox: { kind: 'template' },
  CopyBlox: { kind: 'factory' },
};

const LOCAL_CHAINS = new Set([1337, 31337]);

function argValue(flag, fallback = null) {
  const index = process.argv.indexOf(flag);
  return index === -1 ? fallback : process.argv[index + 1] ?? fallback;
}

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

function isAddress(value) {
  return typeof value === 'string' && /^0x[0-9a-fA-F]{40}$/.test(value);
}

function main() {
  const networkName = argValue('--network');
  const declare = process.argv.includes('--declare');
  const sourcePath = path.resolve(ROOT_DIR, argValue('--from', 'deployed-addresses.json'));
  const chainIdArg = argValue('--chain-id');
  const explorer = argValue('--explorer');
  const note = argValue('--note');

  if (!networkName) fail('--network <name> is required');
  if (!fs.existsSync(sourcePath)) {
    fail(
      `source file not found: ${path.relative(ROOT_DIR, sourcePath)}. Deploy first (npm run deploy:hardhat:foundation, then the factory), or pass --from <path>.`
    );
  }

  const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
  const sourceNetwork = source[networkName];
  if (!sourceNetwork) {
    fail(
      `network "${networkName}" is not in ${path.relative(ROOT_DIR, sourcePath)}. Present: ${Object.keys(source).join(', ') || '(none)'}`
    );
  }

  const official = JSON.parse(fs.readFileSync(OFFICIAL_FILE, 'utf8'));
  const existing = official.networks[networkName];

  const chainId = existing ? existing.chainId : chainIdArg === null ? null : Number(chainIdArg);
  if (!Number.isInteger(chainId) || chainId <= 0) {
    fail(`--chain-id <id> is required for a network not already in the official file`);
  }
  if (LOCAL_CHAINS.has(chainId)) {
    fail(
      `chain ${chainId} is a local or lab chain. This file publishes official deployments only; lab addresses stay in ${path.basename(sourcePath)}.`
    );
  }

  const target = existing ?? {
    chainId,
    status: 'pending-declaration',
    explorer: explorer ?? null,
    declaredIn: null,
    contracts: {},
  };
  if (explorer) target.explorer = explorer;
  if (note) target.notes = note;

  const changes = [];
  for (const [contractName, meta] of Object.entries(PROMOTABLE)) {
    const entry = sourceNetwork[contractName];
    const address = entry && (typeof entry === 'string' ? entry : entry.address);
    if (!address) continue;
    if (!isAddress(address)) {
      fail(`${networkName}.${contractName}: ${JSON.stringify(address)} is not an address`);
    }

    const normalized = address.toLowerCase();
    const current = target.contracts[contractName];
    const currentAddress = current && current.address ? current.address.toLowerCase() : null;
    if (currentAddress === normalized) continue;

    target.contracts[contractName] = {
      ...(current ?? {}),
      address: normalized,
      kind: meta.kind,
      artifact: `artifacts/${contractName}.json`,
      ...(meta.linkTime ? { linkTime: true } : {}),
    };
    delete target.contracts[contractName].status;

    if (contractName === 'CopyBlox' && !target.contracts[contractName].supports) {
      // A freshly deployed factory carries the owner index; an older one does not. The
      // deploy script cannot know, so record the honest default for a new deployment and
      // make the human confirm it.
      target.contracts[contractName].supports = { clonesOf: true };
      target.contracts[contractName].cloneTarget = 'AccountBlox';
      target.contracts[contractName].gas = {
        cloneBloxObserved: null,
        sendWithGasLimit: 16777216,
        maxTxGas: 16777216,
        notes:
          'Fill cloneBloxObserved from a real receipt on this network. Public networks cap a single transaction at 2^24 (EIP-7825).',
      };
    }

    changes.push(
      `${contractName}: ${currentAddress ? `${currentAddress} -> ${normalized}` : normalized}`
    );
  }

  if (changes.length === 0) {
    console.log(`✅ nothing to promote: ${networkName} already matches ${path.basename(sourcePath)}`);
    return;
  }

  console.log(`\n${networkName} (chain ${chainId}) from ${path.relative(ROOT_DIR, sourcePath)}:`);
  for (const change of changes) console.log(`   ${change}`);

  // Contracts this network has not deployed yet get an explicit pending row rather than
  // no row at all, so the file stays valid and the gap is visible instead of implied.
  const stillPending = Object.keys(PROMOTABLE).filter(
    (name) => !target.contracts[name] || !target.contracts[name].address
  );
  for (const name of stillPending) {
    target.contracts[name] = {
      ...(target.contracts[name] ?? {}),
      address: null,
      kind: PROMOTABLE[name].kind,
      status: 'pending-declaration',
    };
  }
  if (stillPending.length > 0) {
    console.log(`\n⏳ still pending after this promotion: ${stillPending.join(', ')}`);
  }

  if (!declare) {
    console.log(
      '\n🔒 Nothing written. "Official" is a human release decision: verify every address on the explorer, then re-run with --declare.'
    );
    return;
  }

  official.networks[networkName] = target;
  official.updated = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(OFFICIAL_FILE, `${JSON.stringify(official, null, 2)}\n`);

  console.log(`\n✅ ${path.basename(OFFICIAL_FILE)} updated.`);
  console.log('   Next: set status/declaredIn if this is a new network, then run');
  console.log(`   npm run validate:official-addresses -- --require-official ${networkName}`);
  console.log('   and mirror the table into README.md and the public documentation.');
}

main();
