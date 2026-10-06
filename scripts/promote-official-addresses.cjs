// promote-official-addresses.cjs
// Fill process for official-deployed-addresses.json (SPEC-2026-0118 R2, SPEC-2026-0137).
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
// Two postures (see scripts/lib/official-catalog.cjs):
//
//   createx  The source network carries the `createxCatalog` block the Inventory CreateX
//            deploy script writes. Promotes the libraries + BasicAccount + BasicFactory as
//            the official mint, all or nothing. On a network that was legacy, AccountBlox /
//            CopyBlox are kept with status "deprecated", and the libraries they link against
//            move to Legacy<Name> rows instead of being overwritten.
//
//   legacy   No CreateX block. Promotes the libraries + AccountBlox + CopyBlox as before.
//
// Flags:
//   --network <name>      key in deployed-addresses.json and in the official file (required)
//   --chain-id <id>       chain id for a network not already in the official file
//   --declare             actually write (the human declaration)
//   --explorer <url>      explorer base url for a new network
//   --from <path>         source file (default deployed-addresses.json)
//   --note "<text>"       note recorded on the network
//   --declared-in <ref>   where the human declared it (README anchor, release, SPEC log)
//   --mirrored-at <date>  YYYY-MM-DD the README / docs table was mirrored from this file

const fs = require('fs');
const path = require('path');
const {
  CONTRACTS,
  CREATEX,
  LEGACY_LIBRARY_PREFIX,
  LIBRARIES,
  MAX_TX_GAS,
  POSTURES,
  createXSaltError,
  isBytes32,
  postureOf,
  predictCreateXAddress,
} = require('./lib/official-catalog.cjs');

const ROOT_DIR = path.join(__dirname, '..');
const OFFICIAL_FILE = path.join(ROOT_DIR, 'official-deployed-addresses.json');

const LOCAL_CHAINS = new Set([1337, 31337]);

const CATALOG_NOTES = {
  EngineBlox:
    'CreateX catalog state machine library. Linked into BasicAccount at compile time; an account does not call it by address.',
  SecureOwnableDefinitions:
    "CreateX catalog definitions. Passed as definitionAddress to the SDK's updateRecovery / updateTimeLock execution-parameter helpers.",
  RuntimeRBACDefinitions:
    'CreateX catalog definitions. Passed as definitionAddress to roleConfigBatchExecutionParams and getRoleConfigActionSpecs.',
  GuardControllerDefinitions:
    'CreateX catalog definitions. Passed as definitionAddress to guardConfigBatchExecutionParams and getGuardConfigActionSpecs.',
  BasicAccount:
    'Official implementation pinned by BasicFactory. Its constructor disables initializers, so this address can never be initialized or claimed; it is only ever cloned. Timelock 1 day to 90 days. Do not operate this address as an account.',
  BasicFactory:
    'Official mint (SPEC-2026-0140). cloneBlox (CREATE) and cloneBloxDeterministic (CREATE2) clone BasicAccount and initialize it in one transaction. Self-owner only: initialOwner must be msg.sender (SPEC-2026-0142). A deterministic clone matches across CreateX catalog networks for the same minter, owner, index and salt; default salt = 0 with a stepped index (SPEC-2026-0138).',
};

const LEGACY_NOTE_PREFIX =
  'Legacy developer path (SPEC-2026-0137): pre-CreateX deployment kept for integrators already pointed at it. Not the Platform default; use BasicFactory -> BasicAccount.';

/** Replaces the old notes, which called these rows the official / sanctioned path. */
const LEGACY_ROW_NOTES = {
  AccountBlox:
    'Clone source for the legacy CopyBlox. Already initialized so the implementation cannot be claimed; links the Legacy* libraries. Do not operate this address as an account.',
  CopyBlox:
    'cloneBlox deploys and initializes an AccountBlox in one transaction. Predates the owner-indexed clone list (supports.clonesOf false), so enumerate an owner\'s accounts from BloxCloned logs.',
};

const DEFAULT_CATALOG_NOTE =
  'CreateX catalog (SPEC-2026-0137). BasicFactory -> BasicAccount is the official mint and the Platform default; the libraries, BasicAccount and BasicFactory sit at the same addresses on every CreateX catalog network. Rows with status "deprecated" (AccountBlox, CopyBlox, Legacy*) are the pre-CreateX legacy developer path. Verify on the explorer before relying on them.';

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

function sourceAddress(entry) {
  return entry && (typeof entry === 'string' ? entry : entry.address);
}

/**
 * Check the CreateX block and every catalog row before anything is copied: the CreateX
 * address and code hash are the pins, every salt is permissioned with byte 21 = 0x00, and
 * every address is recomputed from deployer + salt + init code hash. A row that does not
 * reproduce is not promoted, whatever the deploy script recorded.
 */
function checkCatalogSource(networkName, sourceNetwork, chainId) {
  const catalog = sourceNetwork.createxCatalog;
  const where = `${networkName}.createxCatalog`;
  if (catalog.rail !== 'createx') fail(`${where}.rail must be "createx"`);
  if (String(catalog.createx).toLowerCase() !== CREATEX.address) {
    fail(`${where}.createx is ${catalog.createx}, expected ${CREATEX.address}`);
  }
  if (String(catalog.runtimeCodeHash).toLowerCase() !== CREATEX.runtimeCodeHash) {
    fail(`${where}.runtimeCodeHash does not match the CreateX pin ${CREATEX.runtimeCodeHash}`);
  }
  if (!isAddress(catalog.deployer)) fail(`${where}.deployer is not an address`);
  if (catalog.chainId !== undefined && Number(catalog.chainId) !== chainId) {
    fail(`${where}.chainId ${catalog.chainId} does not match chain ${chainId}`);
  }

  const missing = POSTURES.createx.required.filter((name) => !sourceAddress(sourceNetwork[name]));
  if (missing.length > 0) {
    fail(
      `${networkName} is a CreateX catalog source but is missing ${missing.join(', ')}. The catalog is promoted all or nothing; finish the deploy first.`
    );
  }

  for (const name of POSTURES.createx.required) {
    const entry = sourceNetwork[name];
    const address = sourceAddress(entry);
    if (!isAddress(address)) fail(`${networkName}.${name}: ${JSON.stringify(address)} is not an address`);
    const createx = entry.createx || {};
    const saltError = createXSaltError(createx.salt, catalog.deployer);
    if (saltError) fail(`${networkName}.${name}.createx: ${saltError}`);
    if (!isBytes32(createx.initCodeHash)) fail(`${networkName}.${name}.createx.initCodeHash is not 32 bytes`);
    const predicted = predictCreateXAddress({
      deployer: catalog.deployer,
      salt: createx.salt,
      initCodeHash: createx.initCodeHash,
    });
    if (predicted !== address.toLowerCase()) {
      fail(
        `${networkName}.${name}: recorded ${address.toLowerCase()} but deployer + salt + initCodeHash give ${predicted}`
      );
    }
  }

  const linked = sourceNetwork.BasicAccount.linkedLibraries || {};
  for (const lib of LIBRARIES) {
    const want = sourceAddress(sourceNetwork[lib]).toLowerCase();
    if (!linked[lib] || String(linked[lib]).toLowerCase() !== want) {
      fail(`${networkName}.BasicAccount must link ${lib} at ${want} (got ${JSON.stringify(linked[lib])})`);
    }
  }
  const pinned = sourceNetwork.BasicFactory.implementation;
  if (!pinned || String(pinned).toLowerCase() !== sourceAddress(sourceNetwork.BasicAccount).toLowerCase()) {
    fail(`${networkName}.BasicFactory.implementation must be the catalog BasicAccount (got ${JSON.stringify(pinned)})`);
  }
}

function catalogRow(name, entry, current) {
  const meta = CONTRACTS[name];
  const row = {
    address: sourceAddress(entry).toLowerCase(),
    kind: meta.kind,
    ...(meta.linkTime ? { linkTime: true } : {}),
    createx: { salt: entry.createx.salt.toLowerCase(), initCodeHash: entry.createx.initCodeHash.toLowerCase() },
  };
  if (name === 'BasicAccount') {
    row.linkedLibraries = [...LIBRARIES];
    row.initializersDisabled = true;
  }
  if (name === 'BasicFactory') {
    const observed =
      (entry.gas && entry.gas.cloneBloxObserved) ??
      (current && current.gas && current.gas.cloneBloxObserved) ??
      null;
    row.cloneTarget = 'BasicAccount';
    row.supports = { clonesOf: false, deterministic: true };
    row.gas = {
      cloneBloxObserved: observed,
      sendWithGasLimit: MAX_TX_GAS,
      maxTxGas: MAX_TX_GAS,
      notes:
        'cloneBloxObserved is gasUsed from a self-owner cloneBlox receipt on this network. Public networks cap a single transaction at 2^24 = 16,777,216 (EIP-7825): send either mint with an explicit gas limit at the cap, never a bare estimate.',
    };
  }
  row.notes = CATALOG_NOTES[name];
  return row;
}

function main() {
  const networkName = argValue('--network');
  const declare = process.argv.includes('--declare');
  const sourcePath = path.resolve(ROOT_DIR, argValue('--from', 'deployed-addresses.json'));
  const chainIdArg = argValue('--chain-id');
  const explorer = argValue('--explorer');
  const note = argValue('--note');
  const declaredIn = argValue('--declared-in');
  const mirroredAt = argValue('--mirrored-at');

  if (!networkName) fail('--network <name> is required');
  if (mirroredAt !== null && !/^\d{4}-\d{2}-\d{2}$/.test(mirroredAt)) fail('--mirrored-at must be YYYY-MM-DD');
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

  const catalogSource = Boolean(sourceNetwork.createxCatalog);
  if (catalogSource) checkCatalogSource(networkName, sourceNetwork, chainId);
  if (!catalogSource && postureOf(existing) === 'createx') {
    fail(
      `${networkName} is a CreateX catalog network; ${path.basename(sourcePath)} has no createxCatalog block, so it cannot be promoted over it.`
    );
  }
  const posture = catalogSource ? 'createx' : 'legacy';

  // Work on a copy so a dry run never mutates what it prints against.
  const target = existing
    ? JSON.parse(JSON.stringify(existing))
    : {
        chainId,
        status: 'pending-declaration',
        explorer: explorer ?? null,
        declaredIn: null,
        contracts: {},
      };
  if (explorer) target.explorer = explorer;
  if (declaredIn) target.declaredIn = declaredIn;
  if (mirroredAt) target.mirroredAt = mirroredAt;

  const changes = [];

  if (posture === 'createx') {
    const catalog = sourceNetwork.createxCatalog;
    const nextCatalog = {
      rail: 'createx',
      createx: CREATEX.address,
      createxRuntimeCodeHash: CREATEX.runtimeCodeHash,
      deployer: catalog.deployer.toLowerCase(),
      saltScheme: 'permissioned, no chainid: salt = deployer (20 bytes) | 0x00 | entropy (11 bytes)',
      ...(catalog.build ? { build: catalog.build } : {}),
    };
    if (JSON.stringify(target.catalog) !== JSON.stringify(nextCatalog)) {
      changes.push(`catalog: ${target.catalog ? 'updated' : 'legacy -> createx'} (deployer ${nextCatalog.deployer})`);
      target.catalog = nextCatalog;
    }
    if (postureOf(existing) !== 'createx') {
      target.notes = note ?? DEFAULT_CATALOG_NOTE;
      // The README / docs mirror describes the legacy table until someone re-mirrors it.
      if (!mirroredAt) delete target.mirroredAt;
    } else if (note) {
      target.notes = note;
    }

    // Retire the legacy shape first, so the libraries it links against are preserved
    // under Legacy<Name> before the catalog libraries take the canonical keys.
    const accountBlox = target.contracts.AccountBlox;
    for (const lib of LIBRARIES) {
      const current = target.contracts[lib];
      const legacyKey = `${LEGACY_LIBRARY_PREFIX}${lib}`;
      if (!current || !current.address || current.createx || target.contracts[legacyKey]) continue;
      if (current.address.toLowerCase() === sourceAddress(sourceNetwork[lib]).toLowerCase()) continue;
      target.contracts[legacyKey] = {
        ...current,
        status: 'deprecated',
        notes: `${LEGACY_NOTE_PREFIX} Linked into the legacy AccountBlox. ${current.notes ?? ''}`.trim(),
      };
      changes.push(`${legacyKey}: ${current.address} (kept, deprecated)`);
      if (accountBlox && Array.isArray(accountBlox.linkedLibraries)) {
        accountBlox.linkedLibraries = accountBlox.linkedLibraries.map((name) => (name === lib ? legacyKey : name));
      }
    }
    for (const name of POSTURES.createx.legacy) {
      const row = target.contracts[name];
      if (!row || row.status === 'deprecated') continue;
      if (!row.address) {
        // A pending legacy stub on a catalog network is just noise: the legacy pair is never promoted here.
        delete target.contracts[name];
        changes.push(`${name}: pending stub removed (legacy pair is not promoted on a catalog network)`);
        continue;
      }
      row.status = 'deprecated';
      row.notes = `${LEGACY_NOTE_PREFIX} ${LEGACY_ROW_NOTES[name]}`;
      changes.push(`${name}: ${row.address} -> status deprecated (legacy developer)`);
    }

    for (const name of POSTURES.createx.required) {
      const current = target.contracts[name];
      const next = catalogRow(name, sourceNetwork[name], current);
      if (current && JSON.stringify(current) === JSON.stringify(next)) continue;
      const currentAddress = current && current.address ? current.address.toLowerCase() : null;
      target.contracts[name] = next;
      changes.push(
        `${name}: ${currentAddress && currentAddress !== next.address ? `${currentAddress} -> ` : ''}${next.address}` +
          `${currentAddress === next.address ? ' (metadata)' : ''}` +
          (name === 'BasicFactory' ? `  [cloneBloxObserved ${next.gas.cloneBloxObserved}]` : '')
      );
    }
  } else {
    if (note) target.notes = note;
    for (const name of POSTURES.legacy.required) {
      const meta = CONTRACTS[name];
      const address = sourceAddress(sourceNetwork[name]);
      if (!address) continue;
      if (!isAddress(address)) {
        fail(`${networkName}.${name}: ${JSON.stringify(address)} is not an address`);
      }

      const normalized = address.toLowerCase();
      const current = target.contracts[name];
      const currentAddress = current && current.address ? current.address.toLowerCase() : null;
      if (currentAddress === normalized) continue;

      target.contracts[name] = {
        ...(current ?? {}),
        address: normalized,
        kind: meta.kind,
        artifact: `artifacts/${name}.json`,
        ...(meta.linkTime ? { linkTime: true } : {}),
      };
      delete target.contracts[name].status;

      if (name === 'CopyBlox' && !target.contracts[name].supports) {
        // A freshly deployed factory carries the owner index; an older one does not. The
        // deploy script cannot know, so record the honest default for a new deployment and
        // make the human confirm it.
        target.contracts[name].supports = { clonesOf: true };
        target.contracts[name].cloneTarget = 'AccountBlox';
        target.contracts[name].gas = {
          cloneBloxObserved: null,
          sendWithGasLimit: MAX_TX_GAS,
          maxTxGas: MAX_TX_GAS,
          notes:
            'Fill cloneBloxObserved from a real receipt on this network. Public networks cap a single transaction at 2^24 (EIP-7825).',
        };
      }

      changes.push(`${name}: ${currentAddress ? `${currentAddress} -> ${normalized}` : normalized}`);
    }
  }

  // An existing network with nothing to change is done. A *missing* network with no
  // promotable source addresses is not a match — fall through so --declare can still
  // create the network row with pending-declaration contract stubs.
  if (changes.length === 0 && existing) {
    console.log(`✅ nothing to promote: ${networkName} already matches ${path.basename(sourcePath)}`);
    return;
  }

  console.log(`\n${networkName} (chain ${chainId}, ${posture} posture) from ${path.relative(ROOT_DIR, sourcePath)}:`);
  if (changes.length === 0) {
    console.log(
      `   ⚠️ network is missing from the official file and ${path.basename(sourcePath)} has no promotable addresses`
    );
  } else {
    for (const change of changes) console.log(`   ${change}`);
  }

  // Contracts this network has not deployed yet get an explicit pending row rather than
  // no row at all, so the file stays valid and the gap is visible instead of implied.
  const stillPending = POSTURES[posture].required.filter(
    (name) => !target.contracts[name] || !target.contracts[name].address
  );
  for (const name of stillPending) {
    target.contracts[name] = {
      ...(target.contracts[name] ?? {}),
      address: null,
      kind: CONTRACTS[name].kind,
      status: 'pending-declaration',
    };
  }
  if (stillPending.length > 0) {
    console.log(`\n⏳ still pending after this promotion: ${stillPending.join(', ')}`);
  }
  if (posture === 'createx' && target.contracts.BasicFactory.gas.cloneBloxObserved === null) {
    console.log(
      '\n⚠️ BasicFactory gas.cloneBloxObserved is null: run the self-owner cloneBlox sanity mint first, or validation will fail.'
    );
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
