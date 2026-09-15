// build-artifacts.cjs
// Builds publishable compiled artifacts (ABI + bytecode + link references + compiler
// settings) from Foundry output (out/) into artifacts/, plus artifacts/manifest.json
// with a sha256 per artifact.
//
// SPEC-2026-0118 R1: `npm i @bloxchain/contracts` must be enough to deploy or clone an
// account without compiling the protocol repo. `abi/` ships interfaces only, which is why
// an outside builder had to run their own solc pipeline (EXP-2026-0089 / Branch Zero V1).
//
// Run after: npm run compile:foundry   (or use npm run build:artifacts)
//   node scripts/build-artifacts.cjs            # write artifacts/
//   node scripts/build-artifacts.cjs --check    # verify without writing (CI)
//
// Artifact files are deterministic: no timestamps inside them, so the sha256 in the
// manifest is reproducible from the same compiler and sources. Only manifest.json
// carries a generatedAt.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT_DIR = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT_DIR, 'out');
const ARTIFACTS_DIR = path.join(ROOT_DIR, 'artifacts');
const VERSION_FILE = path.join(ROOT_DIR, 'package', 'package.json');

const ARTIFACT_FORMAT = 'bloxchain-artifact/1';
const MANIFEST_FORMAT = 'bloxchain-artifact-manifest/1';

/** EIP-170 deployed-code limit; an account template must stay under it. */
const EIP_170_LIMIT = 24576;

/**
 * Contracts published as artifacts. Kept deliberately small: the account template, the
 * definition libraries it links against, the state-machine library, and the sanctioned
 * clone factory. Example applications other than the factory are not published.
 */
const PUBLISHED_CONTRACTS = [
  { name: 'AccountBlox', kind: 'template', sizeLimit: EIP_170_LIMIT },
  { name: 'CopyBlox', kind: 'factory', sizeLimit: EIP_170_LIMIT },
  { name: 'EngineBlox', kind: 'library' },
  { name: 'SecureOwnableDefinitions', kind: 'definition-library' },
  { name: 'RuntimeRBACDefinitions', kind: 'definition-library' },
  { name: 'GuardControllerDefinitions', kind: 'definition-library' },
];

const checkOnly = process.argv.includes('--check');

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

function findFoundryArtifact(contractName) {
  const preferred = path.join(OUT_DIR, `${contractName}.sol`, `${contractName}.json`);
  if (fs.existsSync(preferred)) return preferred;

  const matches = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'build-info') continue;
        walk(full);
      } else if (entry.name === `${contractName}.json`) {
        matches.push(full);
      }
    }
  }
  walk(OUT_DIR);

  if (matches.length === 0) return null;
  if (matches.length === 1) return matches[0];
  return (
    matches.find((p) => p.endsWith(`${contractName}.sol${path.sep}${contractName}.json`)) ??
    matches[0]
  );
}

function hexOrEmpty(value) {
  if (!value || typeof value !== 'string') return '0x';
  return value.startsWith('0x') ? value : `0x${value}`;
}

/** Bytes of code, ignoring the 0x prefix. */
function byteLength(hex) {
  const body = hex.replace(/^0x/, '');
  return Math.floor(body.length / 2);
}

function hasUnlinkedPlaceholder(hex) {
  return /__\$[0-9a-f]{34}\$__/i.test(hex);
}

/** Compiler settings, read from the artifact's own metadata rather than foundry.toml. */
function compilerFromMetadata(rawMetadata, contractName) {
  if (!rawMetadata) return null;
  let metadata;
  try {
    metadata = JSON.parse(rawMetadata);
  } catch {
    console.warn(`⚠️  ${contractName}: metadata is not valid JSON; compiler block omitted`);
    return null;
  }
  const settings = metadata.settings ?? {};
  return {
    solc: (metadata.compiler && metadata.compiler.version) || null,
    optimizer: Boolean(settings.optimizer && settings.optimizer.enabled),
    runs: (settings.optimizer && settings.optimizer.runs) ?? null,
    viaIR: Boolean(settings.viaIR),
    evmVersion: settings.evmVersion ?? null,
  };
}

function sourceNameOf(foundryArtifact, artifactPath, contractName) {
  const target =
    foundryArtifact.metadata && foundryArtifact.metadata.settings
      ? foundryArtifact.metadata.settings.compilationTarget
      : null;
  if (target && typeof target === 'object') {
    const [source] = Object.keys(target);
    if (source) return source;
  }
  // Fall back to the out/<File>.sol/<Contract>.json directory name.
  const dir = path.basename(path.dirname(artifactPath));
  return dir.endsWith('.sol') ? dir : `${contractName}.sol`;
}

function readProtocolPackageVersion() {
  try {
    return JSON.parse(fs.readFileSync(VERSION_FILE, 'utf8')).version ?? null;
  } catch {
    return null;
  }
}

function buildArtifact(entry) {
  const { name, kind, sizeLimit } = entry;
  const artifactPath = findFoundryArtifact(name);
  if (!artifactPath) {
    fail(`Foundry artifact not found for ${name}. Run "npm run compile:foundry" first.`);
  }

  const foundry = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  if (!Array.isArray(foundry.abi)) {
    fail(`No ABI array in Foundry artifact: ${artifactPath}`);
  }

  const bytecode = hexOrEmpty(foundry.bytecode && foundry.bytecode.object);
  const deployedBytecode = hexOrEmpty(foundry.deployedBytecode && foundry.deployedBytecode.object);
  if (byteLength(bytecode) === 0) {
    fail(`${name}: creation bytecode is empty in ${artifactPath}`);
  }

  const runtimeBytes = byteLength(deployedBytecode);
  if (sizeLimit && runtimeBytes > sizeLimit) {
    fail(`${name}: deployed size ${runtimeBytes} B exceeds ${sizeLimit} B (EIP-170)`);
  }

  const artifact = {
    _format: ARTIFACT_FORMAT,
    contractName: name,
    sourceName: sourceNameOf(foundry, artifactPath, name),
    kind,
    abi: foundry.abi,
    bytecode,
    deployedBytecode,
    linkReferences: (foundry.bytecode && foundry.bytecode.linkReferences) || {},
    deployedLinkReferences:
      (foundry.deployedBytecode && foundry.deployedBytecode.linkReferences) || {},
    compiler: compilerFromMetadata(foundry.rawMetadata, name),
    methodIdentifiers: foundry.methodIdentifiers ?? {},
  };

  return {
    entry,
    artifact,
    stats: {
      creationBytes: byteLength(bytecode),
      runtimeBytes,
      requiresLinking: hasUnlinkedPlaceholder(bytecode),
      linkLibraries: Object.values(artifact.linkReferences).flatMap((libs) => Object.keys(libs)),
    },
  };
}

function main() {
  if (!fs.existsSync(OUT_DIR)) {
    fail('Foundry output not found at out/. Run "npm run compile:foundry" first.');
  }

  console.log(
    `📦 ${checkOnly ? 'Checking' : 'Building'} publishable artifacts (${PUBLISHED_CONTRACTS.length} contracts)\n`
  );

  const built = PUBLISHED_CONTRACTS.map(buildArtifact);

  // One compiler configuration for the whole set, or the publish is not self-consistent.
  const fingerprints = new Set(
    built.map((b) => JSON.stringify(b.artifact.compiler)).filter((f) => f !== 'null')
  );
  if (fingerprints.size > 1) {
    fail(
      `Artifacts were built with more than one compiler configuration:\n  ${[...fingerprints].join('\n  ')}`
    );
  }
  const compiler = built[0].artifact.compiler;

  if (!checkOnly) {
    fs.rmSync(ARTIFACTS_DIR, { recursive: true, force: true });
    fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
  }

  const contracts = {};
  for (const { entry, artifact, stats } of built) {
    const fileName = `${entry.name}.json`;
    const body = `${JSON.stringify(artifact, null, 2)}\n`;
    const sha256 = crypto.createHash('sha256').update(body, 'utf8').digest('hex');

    if (!checkOnly) {
      fs.writeFileSync(path.join(ARTIFACTS_DIR, fileName), body);
    }

    const linkLibraries = [...new Set(stats.linkLibraries)].sort();
    contracts[entry.name] = {
      file: `artifacts/${fileName}`,
      kind: entry.kind,
      sourceName: artifact.sourceName,
      sha256,
      creationBytes: stats.creationBytes,
      runtimeBytes: stats.runtimeBytes,
      requiresLinking: stats.requiresLinking,
      linkLibraries,
    };

    const link = stats.requiresLinking ? `  links: ${linkLibraries.join(', ')}` : '';
    console.log(
      `✅ ${entry.name.padEnd(28)} runtime ${String(stats.runtimeBytes).padStart(6)} B  creation ${String(
        stats.creationBytes
      ).padStart(6)} B${link}`
    );
  }

  const manifest = {
    _format: MANIFEST_FORMAT,
    package: '@bloxchain/contracts',
    version: readProtocolPackageVersion(),
    generatedAt: new Date().toISOString(),
    compiler,
    note:
      'Artifact files are deterministic (no embedded timestamps); the sha256 values below ' +
      'are reproducible from the same sources and compiler. Contracts with requiresLinking ' +
      'must have their libraries linked before deployment; see official-deployed-addresses.json ' +
      'for the official library addresses per network.',
    contracts,
  };

  if (!checkOnly) {
    fs.writeFileSync(
      path.join(ARTIFACTS_DIR, 'manifest.json'),
      `${JSON.stringify(manifest, null, 2)}\n`
    );
  }

  const where = checkOnly
    ? '✨ Artifact check passed'
    : `✨ Artifacts written to ${path.relative(ROOT_DIR, ARTIFACTS_DIR)}/`;
  console.log(
    `\n${where} (solc ${(compiler && compiler.solc) || 'unknown'}, optimizer ${
      compiler && compiler.optimizer ? `on/${compiler.runs}` : 'off'
    }, viaIR ${compiler && compiler.viaIR}, evm ${(compiler && compiler.evmVersion) || 'unknown'})`
  );
}

main();
