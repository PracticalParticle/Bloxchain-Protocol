// verify-package-consumption.mjs
// Proves the claim SPEC-2026-0118 exists to make: a fresh project that installs
// @bloxchain/contracts can resolve the factory and template ABI *and bytecode*, plus the
// official per-network addresses, without cloning or compiling the protocol repo.
//
// Assembles the package layout the publish pipeline produces into a throwaway directory,
// installs nothing, and resolves the published subpaths exactly as a consumer would
// (through the package.json "exports" map, not by guessing file paths).
//
//   npm run verify:package-consumption
//
// Requires artifacts/ to exist: run `npm run build:artifacts` first.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const ARTIFACTS_DIR = path.join(ROOT_DIR, 'artifacts');
const OFFICIAL_ADDRESSES = path.join(ROOT_DIR, 'official-deployed-addresses.json');
const PACKAGE_JSON = path.join(ROOT_DIR, 'package', 'package.json');

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

if (!fs.existsSync(ARTIFACTS_DIR)) {
  fail('artifacts/ not found. Run "npm run build:artifacts" first.');
}
if (!fs.existsSync(OFFICIAL_ADDRESSES)) {
  fail('official-deployed-addresses.json not found at repository root.');
}

const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bloxchain-consumer-'));
const packageDir = path.join(workDir, 'node_modules', '@bloxchain', 'contracts');

try {
  fs.mkdirSync(packageDir, { recursive: true });
  fs.cpSync(PACKAGE_JSON, path.join(packageDir, 'package.json'));
  fs.cpSync(ARTIFACTS_DIR, path.join(packageDir, 'artifacts'), { recursive: true });
  fs.cpSync(OFFICIAL_ADDRESSES, path.join(packageDir, 'official-deployed-addresses.json'));
  const abiDir = path.join(ROOT_DIR, 'abi');
  if (fs.existsSync(abiDir)) {
    fs.cpSync(abiDir, path.join(packageDir, 'abi'), { recursive: true });
  }

  fs.writeFileSync(
    path.join(workDir, 'package.json'),
    `${JSON.stringify({ name: 'fresh-consumer', type: 'module', private: true }, null, 2)}\n`
  );

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
  check(\`\${name}: clone gas fits the per-tx cap\`, typeof gas.maxTxGas === 'number' && gas.cloneBloxObserved < gas.maxTxGas, \`\${gas.cloneBloxObserved} < \${gas.maxTxGas}\`);
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

  console.log('📦 Resolving @bloxchain/contracts as a fresh consumer would\n');
  execFileSync(process.execPath, ['check.mjs'], { cwd: workDir, stdio: 'inherit' });
  console.log('\n✨ A fresh install can provision without the protocol repo.');
} finally {
  fs.rmSync(workDir, { recursive: true, force: true });
}
