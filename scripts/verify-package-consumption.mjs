// verify-package-consumption.mjs
// Proves the claim SPEC-2026-0118 exists to make: a fresh project that installs
// @bloxchain/contracts can resolve the factory and template ABI *and bytecode*, plus the
// official per-network addresses, without cloning or compiling the protocol repo.
//
// Uses the same package preparation as release-prepare.cjs (`prepublish-contracts.cjs`),
// then `npm pack` from package/ and installs that tarball into a throwaway consumer —
// not a hand-assembled fs.cpSync tree — so the exports map and prune behaviour match npm.
//
//   npm run verify:package-consumption
//
// Requires a compile (prepublish runs ABI extract + artifact build). Prefer
// `npm run build:artifacts` first in CI so sizes are already checked.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PACKAGE_DIR = path.join(ROOT_DIR, 'package');
const PREPUBLISH = path.join(PACKAGE_DIR, 'scripts', 'prepublish-contracts.cjs');
const OFFICIAL_ADDRESSES = path.join(ROOT_DIR, 'official-deployed-addresses.json');
const SKIP_PREPUBLISH = process.env.SKIP_PREPUBLISH === '1';

/** Windows: node `execFileSync('npm')` looks for npm.exe; the installer ships `npm.cmd`. */
function resolveNpmCli() {
  if (process.env.npm_execpath && fs.existsSync(process.env.npm_execpath)) {
    return { command: process.execPath, argsPrefix: [process.env.npm_execpath] };
  }
  if (process.platform === 'win32') {
    const npmCmd = path.join(path.dirname(process.execPath), 'npm.cmd');
    if (fs.existsSync(npmCmd)) {
      return { command: npmCmd, argsPrefix: [] };
    }
  }
  return { command: 'npm', argsPrefix: [] };
}

function runNpm(args, options = {}) {
  const { command, argsPrefix } = resolveNpmCli();
  return execFileSync(command, [...argsPrefix, ...args], {
    shell: process.platform === 'win32' && command.endsWith('.cmd'),
    ...options,
  });
}

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

if (!fs.existsSync(OFFICIAL_ADDRESSES)) {
  fail('official-deployed-addresses.json not found at repository root.');
}
if (!fs.existsSync(PREPUBLISH)) {
  fail(`prepublish script not found at ${PREPUBLISH}`);
}

const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bloxchain-consumer-'));
const packDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bloxchain-pack-'));

try {
  if (SKIP_PREPUBLISH) {
    const preparedArtifact = path.join(PACKAGE_DIR, 'artifacts', 'CopyBlox.json');
    if (!fs.existsSync(preparedArtifact)) {
      fail(
        'SKIP_PREPUBLISH=1 but package/artifacts/CopyBlox.json is missing. Run prepublish first.'
      );
    }
    console.log('📦 SKIP_PREPUBLISH=1 — using already-prepared package/\n');
  } else {
    console.log('📦 Preparing @bloxchain/contracts the same way release-prepare does\n');
    execFileSync(process.execPath, [PREPUBLISH], { cwd: PACKAGE_DIR, stdio: 'inherit' });
  }

  console.log('\n📦 npm pack from prepared package/\n');
  const packOut = runNpm(['pack', '--json'], {
    cwd: PACKAGE_DIR,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  let packMeta;
  try {
    packMeta = JSON.parse(packOut.trim());
  } catch {
    fail(`npm pack --json did not return JSON:\n${packOut}`);
  }
  const packed = Array.isArray(packMeta) ? packMeta[0] : packMeta;
  const tarballName = packed?.filename;
  if (!tarballName || typeof tarballName !== 'string') {
    fail(`npm pack did not report a filename:\n${packOut}`);
  }
  const tarballPath = path.join(PACKAGE_DIR, tarballName);
  if (!fs.existsSync(tarballPath)) {
    fail(`npm pack tarball missing: ${tarballPath}`);
  }
  const stagedTarball = path.join(packDir, tarballName);
  // copy + unlink: rename fails when package/ and os.tmpdir() are on different volumes
  fs.copyFileSync(tarballPath, stagedTarball);
  fs.unlinkSync(tarballPath);

  fs.writeFileSync(
    path.join(workDir, 'package.json'),
    `${JSON.stringify({ name: 'fresh-consumer', type: 'module', private: true }, null, 2)}\n`
  );

  console.log(`\n📦 Installing ${tarballName} into throwaway consumer\n`);
  runNpm(['install', stagedTarball, '--no-save', '--no-package-lock'], {
    cwd: workDir,
    stdio: 'inherit',
  });

  fs.writeFileSync(
    path.join(workDir, 'check.mjs'),
    `// A fresh integrator: no protocol repo, no solc, no compile step.
import factory from '@bloxchain/contracts/artifacts/CopyBlox.json' with { type: 'json' };
import template from '@bloxchain/contracts/artifacts/AccountBlox' with { type: 'json' };
import manifest from '@bloxchain/contracts/artifacts/manifest.json' with { type: 'json' };
import official from '@bloxchain/contracts/official-deployed-addresses.json' with { type: 'json' };

const passed = [];
const failed = [];
const check = (label, condition, detail) =>
  (condition ? passed : failed).push(detail ? \`\${label} — \${detail}\` : label);

const bytes = (hex) => (hex.length - 2) / 2;
const linkedLibraries = (artifact) =>
  Object.values(artifact.linkReferences ?? {}).flatMap((libs) => Object.keys(libs));

// R1: artifacts reachable through the exports map, with bytecode, not just ABI.
check('factory ABI resolves', Array.isArray(factory.abi) && factory.abi.length > 0, \`\${factory.abi.length} entries\`);
check('factory exposes cloneBlox', factory.abi.some((e) => e.name === 'cloneBlox'));
check('factory exposes clonesOf', factory.abi.some((e) => e.name === 'clonesOf'));
check('factory bytecode resolves', factory.bytecode.startsWith('0x') && bytes(factory.bytecode) > 1000, \`\${bytes(factory.bytecode)} B\`);
check('factory records its library links', linkedLibraries(factory).length > 0, linkedLibraries(factory).join(', '));
check('extensionless subpath resolves', template.contractName === 'AccountBlox');
check('template bytecode resolves', template.bytecode.startsWith('0x'), \`\${bytes(template.bytecode)} B\`);
check('template records 4 library links', linkedLibraries(template).length === 4, linkedLibraries(template).join(', '));
check('manifest records a sha256 per artifact', /^[0-9a-f]{64}$/.test(manifest.contracts.CopyBlox.sha256));
check('manifest records the compiler', typeof manifest.compiler.solc === 'string', \`\${manifest.compiler.solc}, viaIR=\${manifest.compiler.viaIR}, optimizer=\${manifest.compiler.runs}\`);

// R2: official addresses, with the definition libraries and the factory.
const declared = Object.entries(official.networks).filter(([, n]) => n.status === 'official');
check('at least one official network', declared.length > 0, declared.map(([k, n]) => \`\${k} (\${n.chainId})\`).join(', '));
for (const [name, network] of declared) {
  const address = (contract) => network.contracts?.[contract]?.address ?? null;
  const isAddress = (value) => typeof value === 'string' && /^0x[0-9a-fA-F]{40}$/.test(value);
  check(\`\${name}: factory address\`, isAddress(address('CopyBlox')), address('CopyBlox'));
  check(\`\${name}: account template address\`, isAddress(address('AccountBlox')), address('AccountBlox'));
  check(
    \`\${name}: definition library addresses\`,
    ['SecureOwnableDefinitions', 'RuntimeRBACDefinitions', 'GuardControllerDefinitions'].every((c) => isAddress(address(c)))
  );
  check(
    \`\${name}: factory declares whether it has the owner index\`,
    typeof network.contracts?.CopyBlox?.supports?.clonesOf === 'boolean',
    \`clonesOf=\${network.contracts?.CopyBlox?.supports?.clonesOf}\`
  );
  // R4: the gas envelope travels with the address, so a consumer never has to guess it.
  const gas = network.contracts?.CopyBlox?.gas ?? {};
  check(\`\${name}: clone gas fits the per-tx cap\`, typeof gas.maxTxGas === 'number' && Number.isFinite(gas.cloneBloxObserved) && gas.cloneBloxObserved < gas.maxTxGas, \`\${gas.cloneBloxObserved} < \${gas.maxTxGas}\`);
}

// No lab or local chain may reach npm through this file.
const localChains = Object.entries(official.networks).filter(([, n]) => [1337, 31337].includes(n.chainId));
check('no local or lab chains published', localChains.length === 0, localChains.map(([k]) => k).join(', ') || 'none');

for (const line of passed) console.log(\`  ok   \${line}\`);
for (const line of failed) console.log(\`  FAIL \${line}\`);
console.log(\`\\n\${passed.length} passed, \${failed.length} failed\`);
process.exitCode = failed.length > 0 ? 1 : 0;
`
  );

  console.log('\n📦 Resolving @bloxchain/contracts as a fresh consumer would\n');
  execFileSync(process.execPath, ['check.mjs'], { cwd: workDir, stdio: 'inherit' });
  console.log('\n✨ A fresh install can provision without the protocol repo.');
} finally {
  fs.rmSync(workDir, { recursive: true, force: true });
  fs.rmSync(packDir, { recursive: true, force: true });
}
