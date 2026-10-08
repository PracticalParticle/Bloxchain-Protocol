// promote-official-addresses.cjs
// Fill process for official-deployed-addresses.json (SPEC-2026-0118 R2 / SPEC-2026-0137).
//
// Format /2: the CreateX six-pack lives once under catalog.contracts. Promoting a network
// either (a) seeds the shared catalog from deployed-addresses.json on first declare, or
// (b) asserts the source addresses match the catalog and adds the network row.
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
//   --declared-in <ref>   set declaredIn (default README.md#official-createx-catalog)

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const OFFICIAL_FILE = path.join(ROOT_DIR, 'official-deployed-addresses.json');

const FORMAT_V2 = 'bloxchain-official-addresses/2';
const CATALOG_ID = 'createx-v1';

const CATALOG_PROMOTABLE = {
  EngineBlox: { kind: 'library', linkTime: true },
  SecureOwnableDefinitions: { kind: 'definition-library', linkTime: true },
  RuntimeRBACDefinitions: { kind: 'definition-library', linkTime: true },
  GuardControllerDefinitions: { kind: 'definition-library', linkTime: true },
  BasicAccount: { kind: 'template' },
  BasicFactory: { kind: 'factory' },
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

function readSourceAddresses(sourceNetwork) {
  const out = {};
  for (const [contractName, meta] of Object.entries(CATALOG_PROMOTABLE)) {
    const entry = sourceNetwork[contractName];
    const address = entry && (typeof entry === 'string' ? entry : entry.address);
    if (!address) continue;
    if (!isAddress(address)) {
      fail(`${contractName}: ${JSON.stringify(address)} is not an address`);
    }
    out[contractName] = { address: address.toLowerCase(), meta };
  }
  return out;
}

function main() {
  const networkName = argValue('--network');
  const declare = process.argv.includes('--declare');
  const sourcePath = path.resolve(ROOT_DIR, argValue('--from', 'deployed-addresses.json'));
  const chainIdArg = argValue('--chain-id');
  const explorer = argValue('--explorer');
  const note = argValue('--note');
  const declaredIn = argValue('--declared-in', 'README.md#official-createx-catalog');

  if (!networkName) fail('--network <name> is required');
  if (!fs.existsSync(sourcePath)) {
    fail(
      `source file not found: ${path.relative(ROOT_DIR, sourcePath)}. Deploy the CreateX catalog first, or pass --from <path>.`
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
  if (official._format !== FORMAT_V2) {
    fail(
      `${path.basename(OFFICIAL_FILE)} is ${JSON.stringify(official._format)}; this promoter writes ${FORMAT_V2} only. Migrate the file first.`
    );
  }

  const existing = official.networks[networkName];
  let chainId;
  if (existing) {
    if (chainIdArg !== null && Number(chainIdArg) !== existing.chainId) {
      fail(
        `--chain-id ${chainIdArg} does not match existing chainId ${existing.chainId} for network "${networkName}"`
      );
    }
    chainId = existing.chainId;
  } else {
    chainId = chainIdArg === null ? null : Number(chainIdArg);
  }
  if (!Number.isInteger(chainId) || chainId <= 0) {
    fail(`--chain-id <id> is required for a network not already in the official file`);
  }
  if (LOCAL_CHAINS.has(chainId)) {
    fail(
      `chain ${chainId} is a local or lab chain. This file publishes official deployments only; lab addresses stay in ${path.basename(sourcePath)}.`
    );
  }

  const sourceAddrs = readSourceAddresses(sourceNetwork);
  const missingCatalog = Object.keys(CATALOG_PROMOTABLE).filter((name) => !sourceAddrs[name]);
  if (missingCatalog.length > 0) {
    fail(
      `${networkName} is missing ${missingCatalog.join(', ')} in ${path.basename(sourcePath)}. ` +
        `Every catalog contract must be present before the network is added: ${Object.keys(CATALOG_PROMOTABLE).join(', ')}.`
    );
  }

  if (!official.catalog) {
    official.catalog = {
      id: CATALOG_ID,
      label: 'CreateX same-address catalog v1',
      spec: 'SPEC-2026-0137',
      notes: 'Official Platform mint is BasicFactory → BasicAccount.',
      contracts: {},
    };
  }
  if (official.catalog.id !== CATALOG_ID) {
    fail(`catalog.id must be ${CATALOG_ID} (got ${JSON.stringify(official.catalog.id)})`);
  }

  const changes = [];
  const catalogContracts = official.catalog.contracts ?? (official.catalog.contracts = {});

  // Seed or verify shared catalog.
  for (const [name, { address, meta }] of Object.entries(sourceAddrs)) {
    const current = catalogContracts[name];
    const currentAddress = current && current.address ? current.address.toLowerCase() : null;
    if (!currentAddress) {
      catalogContracts[name] = {
        address,
        kind: meta.kind,
        artifact: `artifacts/${name}.json`,
        ...(meta.linkTime ? { linkTime: true } : {}),
      };
      if (name === 'BasicAccount') {
        catalogContracts[name].initializersDisabled = true;
        catalogContracts[name].linkedLibraries = [
          'EngineBlox',
          'SecureOwnableDefinitions',
          'RuntimeRBACDefinitions',
          'GuardControllerDefinitions',
        ];
      }
      if (name === 'BasicFactory') {
        catalogContracts[name].cloneTarget = 'BasicAccount';
        catalogContracts[name].gas = {
          cloneBloxObserved: null,
          sendWithGasLimit: 16777216,
          maxTxGas: 16777216,
          notes:
            'Fill cloneBloxObserved from a real receipt. Public networks cap a single transaction at 2^24 (EIP-7825) where applicable.',
        };
      }
      changes.push(`catalog.${name}: ${address}`);
    } else if (currentAddress !== address) {
      fail(
        `same-address gate failed: ${name} on ${networkName} is ${address} but catalog has ${currentAddress}. CreateX catalog must match across networks.`
      );
    }
  }

  const target = existing ?? {
    chainId,
    status: 'official',
    catalog: CATALOG_ID,
    explorer: explorer ?? null,
    declaredIn: declaredIn,
    mirroredAt: new Date().toISOString().slice(0, 10),
    notes: note ?? 'CreateX same-address catalog.',
  };
  if (explorer) target.explorer = explorer;
  if (note) target.notes = note;
  target.catalog = CATALOG_ID;
  if (!existing) {
    changes.push(`networks.${networkName}: add chain ${chainId}`);
  } else {
    if (existing.status !== 'official') {
      target.status = 'official';
      target.declaredIn = declaredIn;
      target.mirroredAt = new Date().toISOString().slice(0, 10);
      changes.push(`networks.${networkName}: status -> official`);
    }
    if (existing.catalog !== CATALOG_ID) {
      changes.push(
        `networks.${networkName}: catalog ${JSON.stringify(existing.catalog)} -> ${CATALOG_ID}`
      );
    }
  }

  // Strip any accidental per-network copies of catalog contracts.
  if (target.contracts) {
    for (const name of Object.keys(CATALOG_PROMOTABLE)) {
      if (target.contracts[name]) {
        delete target.contracts[name];
        changes.push(`networks.${networkName}.contracts.${name}: removed (lives in catalog)`);
      }
    }
    if (Object.keys(target.contracts).length === 0) delete target.contracts;
  }

  if (changes.length === 0 && existing) {
    console.log(`✅ nothing to promote: ${networkName} already matches catalog + network row`);
    return;
  }

  console.log(`\n${networkName} (chain ${chainId}) from ${path.relative(ROOT_DIR, sourcePath)}:`);
  for (const change of changes) console.log(`   ${change}`);

  const stillPending = Object.keys(CATALOG_PROMOTABLE).filter(
    (name) => !catalogContracts[name] || !catalogContracts[name].address
  );
  if (stillPending.length > 0) {
    console.log(`\n⏳ catalog still pending after this promotion: ${stillPending.join(', ')}`);
  }

  if (!declare) {
    console.log(
      '\n🔒 Nothing written. "Official" is a human release decision: verify every address on the explorer / Sourcify, then re-run with --declare.'
    );
    return;
  }

  official.networks[networkName] = target;
  official.updated = new Date().toISOString().slice(0, 10);
  official._format = FORMAT_V2;
  fs.writeFileSync(OFFICIAL_FILE, `${JSON.stringify(official, null, 2)}\n`);

  console.log(`\n✅ ${path.basename(OFFICIAL_FILE)} updated.`);
  console.log('   Next: npm run validate:official-addresses -- --require-official ' + networkName);
  console.log('   and keep README.md#official-createx-catalog in sync (one address table + network list).');
}

main();
