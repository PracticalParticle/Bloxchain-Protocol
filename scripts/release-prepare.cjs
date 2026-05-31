#!/usr/bin/env node
// release-prepare.cjs — validate before release, or publish after prepare.
//   npm run release:prepare   — sync, ABI, package layout, Foundry, SDK gate (no npm publish)
//   npm run publish:contracts — publish @bloxchain/contracts (run release:prepare first)
//   npm run publish:sdk       — publish @bloxchain/sdk (run release:prepare first)
// Publish re-runs prepublish steps, verifies artifacts, then npm publish --ignore-scripts.
// Flags: --publish-contracts | --publish-sdk
// Env: SKIP_TESTS=1 | RUN_SANITY_SDK_TESTS=1 | PREPARE_CONTRACTS_ONLY=1 | DEBUG=1

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { execSync } = require('child_process');
const { keccak256 } = require('viem');

const rootDir = path.resolve(__dirname, '..');
const contractsPackageDir = path.join(rootDir, 'package');
const sdkPackageDir = path.join(rootDir, 'sdk', 'typescript');

const SKIP_OPTIONAL_TESTS = process.env.SKIP_TESTS === '1';
const RUN_SANITY_SDK_TESTS = process.env.RUN_SANITY_SDK_TESTS === '1';
const PREPARE_CONTRACTS_ONLY = process.env.PREPARE_CONTRACTS_ONLY === '1';
const DEBUG = process.env.DEBUG === '1';
const NPM_PUBLISH_TAG = 'alpha.24';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
  log(`\n${step} ${message}`, 'cyan');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function fail(message) {
  logError(message);
  throw new Error(message);
}

const REQUIRED_PACKAGE_JSON_FIELDS = ['name', 'version', 'description', 'license'];

function validatePackageJson(packagePath, packageName) {
  const packageJsonPath = path.join(packagePath, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    fail(`${packageName}: package.json not found`);
  }
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  for (const field of REQUIRED_PACKAGE_JSON_FIELDS) {
    if (!packageJson[field]) {
      fail(`${packageName}: missing required field '${field}' in package.json`);
    }
  }
  if (!/^\d+\.\d+\.\d+/.test(packageJson.version)) {
    fail(`${packageName}: invalid version format '${packageJson.version}' (expected semver)`);
  }
  return packageJson;
}

function exec(command, options = {}) {
  const defaultOptions = {
    cwd: rootDir,
    stdio: 'inherit',
    encoding: 'utf8',
    shell: true,
  };
  try {
    execSync(command, { ...defaultOptions, ...options });
    return true;
  } catch (error) {
    if (DEBUG && error.stack) {
      log('\n' + error.stack, 'yellow');
    }
    throw error;
  }
}

function execInPackage(dir, command, options = {}) {
  try {
    execSync(command, {
      cwd: dir,
      stdio: 'inherit',
      encoding: 'utf8',
      shell: true,
      ...options,
    });
    return true;
  } catch (error) {
    if (DEBUG && error.stack) {
      log('\n' + error.stack, 'yellow');
    }
    throw error;
  }
}

function syncVersions() {
  logStep('📋', 'Step 1: Syncing versions...');
  exec('npm run release:sync-versions');
  const rootPkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  const contractsPkg = JSON.parse(fs.readFileSync(path.join(contractsPackageDir, 'package.json'), 'utf8'));
  if (rootPkg.version !== contractsPkg.version) {
    fail(`Version mismatch: root ${rootPkg.version} vs package ${contractsPkg.version}`);
  }
  logSuccess('Versions synced and verified');
}

function extractAbi() {
  logStep('📋', 'Step 2: Extracting ABIs...');
  exec('npm run compile:foundry:abi');
  const rootAbiDir = path.join(rootDir, 'abi');
  if (!fs.existsSync(rootAbiDir)) {
    fail('abi/ directory not found after extract-abi');
  }
  const abiFiles = fs.readdirSync(rootAbiDir).filter((f) => f.endsWith('.abi.json'));
  if (abiFiles.length === 0) {
    fail('No .abi.json files in abi/ after extract-abi');
  }
  logSuccess('ABIs extracted and verified');
}

function getSolPathsRecursive(dir, baseDir, excludedDirs) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(baseDir, fullPath);
    if (entry.isDirectory()) {
      if (excludedDirs.includes(entry.name)) continue;
      results.push(...getSolPathsRecursive(fullPath, baseDir, excludedDirs));
    } else if (entry.name.endsWith('.sol')) {
      results.push(relPath);
    }
  }
  return results;
}

function prepareContractsPackage() {
  logStep('📋', 'Step 3: Preparing @bloxchain/contracts package...');
  execInPackage(contractsPackageDir, 'node scripts/prepublish-contracts.cjs');
  const coreDir = path.join(contractsPackageDir, 'core');
  const abiDir = path.join(contractsPackageDir, 'abi');
  if (!fs.existsSync(coreDir)) {
    fail('package/core/ not found after prepare');
  }
  if (!fs.existsSync(abiDir)) {
    fail('package/abi/ not found after prepare');
  }
  if (fs.readdirSync(coreDir).length === 0) {
    fail('package/core/ is empty after prepare');
  }
  if (fs.readdirSync(abiDir).length === 0) {
    fail('package/abi/ is empty after prepare');
  }
  const sourceContractsDir = path.join(rootDir, 'contracts');
  const excludedDirs = ['examples', 'experimental'];
  const expectedSolPaths = getSolPathsRecursive(sourceContractsDir, sourceContractsDir, excludedDirs);
  const missing = expectedSolPaths.filter(
    (rel) => !fs.existsSync(path.join(contractsPackageDir, rel))
  );
  if (missing.length > 0) {
    fail(
      'Package layout mismatch: missing .sol files (expected from contracts/, excluding examples & experimental):\n  ' +
        missing.join('\n  ')
    );
  }
  logSuccess('Contracts package prepared and verified (layout matches contracts/)');
}

function runTests() {
  logStep('📋', 'Step 4: Running tests...');

  // Mandatory: Foundry unit/invariant tests (never skipped by SKIP_TESTS).
  exec('npm run test:foundry');
  logSuccess('Foundry tests passed');

  // Optional: remote_evm sanity-sdk core suite (requires Nethermind / RPC at RPC_URL).
  if (SKIP_OPTIONAL_TESTS) {
    logWarning('Skipping optional sanity-sdk tests (SKIP_TESTS=1)');
    return;
  }
  if (!RUN_SANITY_SDK_TESTS) {
    logWarning(
      'Skipping optional sanity-sdk tests (set RUN_SANITY_SDK_TESTS=1 to run test:sanity-sdk:core on remote_evm)'
    );
    return;
  }

  logStep('📋', 'Step 4b: Running optional sanity-sdk core tests (remote_evm)...');
  exec('npm run test:sanity-sdk:core');
  logSuccess('Sanity SDK core tests passed');
}

function verifyContractsPackage() {
  logStep('📋', 'Step 5: Verifying @bloxchain/contracts package...');
  const packageJson = validatePackageJson(contractsPackageDir, '@bloxchain/contracts');
  const files = packageJson.files || [];
  for (const name of files) {
    if (name === 'README.md') continue;
    const fullPath = path.join(contractsPackageDir, name);
    if (!fs.existsSync(fullPath)) {
      fail(`Required package file missing: ${name}`);
    }
  }
  logSuccess('Required files present');
  let packOutput;
  try {
    packOutput = execSync('npm pack --dry-run 2>&1', {
      cwd: contractsPackageDir,
      encoding: 'utf8',
      shell: true,
    });
  } catch (error) {
    fail('npm pack --dry-run failed: ' + error.message);
  }
  const requiredInPack = ['core', 'abi', 'standards'];
  for (const dir of requiredInPack) {
    if (!new RegExp(dir + '[/\\\\]').test(packOutput)) {
      fail(`npm pack output missing ${dir}/`);
    }
  }
  logSuccess('npm pack --dry-run OK');
}

function distImportUrl(...segments) {
  return pathToFileURL(path.join(sdkPackageDir, 'dist', ...segments)).href;
}

function assertEq(label, a, b) {
  if (String(a).toLowerCase() !== String(b).toLowerCase()) {
    fail(`${label}: expected ${b}, got ${a}`);
  }
}

function selectorFromSignature(sig) {
  return keccak256(new TextEncoder().encode(sig)).slice(0, 10);
}

/** Publish gate: Node ESM can load dist; key selectors match Solidity meta-tx signatures. */
async function verifySdkPublishGate() {
  const distPath = path.join(sdkPackageDir, 'dist');
  const main = await import(distImportUrl('index.js'));
  const abi = await import(distImportUrl('abi.js'));
  if (!main.SecureOwnable || !main.extractErrorInfo) {
    fail('SDK main exports missing (SecureOwnable, extractErrorInfo)');
  }
  if (!main.INTERFACE_IDS || !main.ComponentDetection || typeof main.supportsInterface !== 'function') {
    fail('SDK main exports missing (INTERFACE_IDS, ComponentDetection, supportsInterface)');
  }
  if (!abi.engineBloxAbi) {
    fail('SDK abi exports missing (engineBloxAbi)');
  }

  const metaSigs = await import(distImportUrl('types', 'meta-tx-signatures.js'));
  const META = metaSigs.ENGINE_BLOX_META_TRANSACTION_PARAM;
  const access = await import(distImportUrl('types', 'core.access.index.js'));
  const security = await import(distImportUrl('types', 'core.security.index.js'));
  const execution = await import(distImportUrl('types', 'core.execution.index.js'));
  const iface = await import(distImportUrl('utils', 'interface-ids.js'));

  assertEq(
    'ROLE_CONFIG_BATCH_META_SELECTOR',
    access.RUNTIME_RBAC_FUNCTION_SELECTORS.ROLE_CONFIG_BATCH_META_SELECTOR,
    selectorFromSignature(`roleConfigBatchRequestAndApprove(${META})`)
  );
  assertEq(
    'UPDATE_BROADCASTER_APPROVE_META_SELECTOR',
    security.FUNCTION_SELECTORS.UPDATE_BROADCASTER_APPROVE_META_SELECTOR,
    selectorFromSignature(`updateBroadcasterApprovalWithMetaTx(${META})`)
  );
  assertEq(
    'APPROVE_TIMELOCK_EXECUTION_META_SELECTOR',
    execution.GUARD_CONTROLLER_FUNCTION_SELECTORS.APPROVE_TIMELOCK_EXECUTION_META_SELECTOR,
    selectorFromSignature(`approveTimeLockExecutionWithMetaTx(${META})`)
  );
  assertEq(
    'IRuntimeRBAC interfaceId',
    iface.INTERFACE_IDS.IRuntimeRBAC,
    selectorFromSignature(`roleConfigBatchRequestAndApprove(${META})`)
  );

  if ('RUNTIME_RBAC_INTERFACE_FALLBACK_SELECTOR' in iface) {
    fail('RUNTIME_RBAC_INTERFACE_FALLBACK_SELECTOR must be removed from interface-ids.js');
  }

  logSuccess('SDK publish gate (ESM import + selector alignment)');
}

async function prepareSdk() {
  if (PREPARE_CONTRACTS_ONLY) {
    logWarning('Skipping SDK prepare (PREPARE_CONTRACTS_ONLY=1)');
    return;
  }
  logStep('📋', 'Step 6: Preparing @bloxchain/sdk...');
  exec('npm run build:sdk');
  validatePackageJson(sdkPackageDir, '@bloxchain/sdk');
  const distPath = path.join(sdkPackageDir, 'dist');
  if (!fs.existsSync(path.join(distPath, 'index.js'))) {
    fail('SDK dist/index.js not found after build');
  }
  if (!fs.existsSync(path.join(distPath, 'index.d.ts'))) {
    fail('SDK dist/index.d.ts not found after build');
  }
  await verifySdkPublishGate();
  let packOutput;
  try {
    packOutput = execSync('npm pack --dry-run 2>&1', {
      cwd: sdkPackageDir,
      encoding: 'utf8',
      shell: true,
    });
  } catch (error) {
    fail('SDK npm pack --dry-run failed: ' + error.message);
  }
  const hasDist = /dist[/\\]/.test(packOutput);
  if (!hasDist) fail('SDK npm pack output missing dist/');
  logSuccess('SDK prepared and verified');
}

function assertReleasePrepared({ contracts = false, sdk = false }) {
  if (contracts) {
    const coreDir = path.join(contractsPackageDir, 'core');
    if (!fs.existsSync(coreDir) || fs.readdirSync(coreDir).length === 0) {
      fail('Contracts package not ready. Run: npm run release:prepare');
    }
  }
  if (sdk) {
    const distIndex = path.join(sdkPackageDir, 'dist', 'index.js');
    if (!fs.existsSync(distIndex)) {
      fail('SDK dist/ missing. Run: npm run release:prepare');
    }
  }
}

function installPublishDeps(target = 'both') {
  if (target === 'contracts' || target === 'both') {
    logStep('📋', 'Installing @bloxchain/contracts dependencies...');
    execInPackage(contractsPackageDir, 'npm install');
  }
  if (target === 'sdk' || target === 'both') {
    logStep('📋', 'Installing @bloxchain/sdk dependencies...');
    execInPackage(sdkPackageDir, 'npm install');
  }
  logSuccess(
    target === 'both'
      ? 'Publishable package dependencies installed'
      : `Dependencies installed (${target})`
  );
}

function publishContractsPackage() {
  logStep('📋', 'Final prepare @bloxchain/contracts (pre-publish)...');
  execInPackage(contractsPackageDir, 'node scripts/prepublish-contracts.cjs');
  verifyContractsPackage();
  logStep('📋', `Publishing @bloxchain/contracts (tag ${NPM_PUBLISH_TAG})...`);
  execInPackage(contractsPackageDir, 'npm audit --audit-level=moderate');
  execInPackage(contractsPackageDir, `npm publish --ignore-scripts --tag ${NPM_PUBLISH_TAG}`);
  logSuccess(`Published @bloxchain/contracts@${NPM_PUBLISH_TAG}`);
}

async function publishSdkPackage() {
  logStep('📋', 'Final prepare @bloxchain/sdk (pre-publish)...');
  exec('npm run build:sdk');
  await verifySdkPublishGate();
  logStep('📋', `Publishing @bloxchain/sdk (tag ${NPM_PUBLISH_TAG})...`);
  execInPackage(sdkPackageDir, 'npm audit --audit-level=moderate');
  execInPackage(sdkPackageDir, `npm publish --ignore-scripts --tag ${NPM_PUBLISH_TAG}`);
  logSuccess(`Published @bloxchain/sdk@${NPM_PUBLISH_TAG}`);
}

function printPrepareSummary() {
  log('\n' + '='.repeat(60), 'bright');
  log('✅ Release prepare complete', 'green');
  log('='.repeat(60) + '\n', 'bright');
  log('Ready to publish. Run:', 'cyan');
  log('  npm login', 'yellow');
  log('  npm run publish:contracts', 'yellow');
  log('  npm run publish:sdk', 'yellow');
  log('');
}

async function runReleasePrepare() {
  log('\n' + '='.repeat(60), 'bright');
  log('📦 Release Prepare', 'bright');
  log('='.repeat(60), 'bright');
  syncVersions();
  extractAbi();
  prepareContractsPackage();
  runTests();
  verifyContractsPackage();
  await prepareSdk();
  printPrepareSummary();
}

async function runPublishContracts() {
  log('\n' + '='.repeat(60), 'bright');
  log('📦 Publish @bloxchain/contracts', 'bright');
  log('='.repeat(60), 'bright');
  assertReleasePrepared({ contracts: true });
  syncVersions();
  installPublishDeps('contracts');
  publishContractsPackage();
}

async function runPublishSdk() {
  log('\n' + '='.repeat(60), 'bright');
  log('📦 Publish @bloxchain/sdk', 'bright');
  log('='.repeat(60), 'bright');
  assertReleasePrepared({ sdk: true });
  syncVersions();
  installPublishDeps('sdk');
  await publishSdkPackage();
}

async function runCli() {
  const argv = process.argv.slice(2);
  if (argv.includes('--publish-contracts')) {
    await runPublishContracts();
  } else if (argv.includes('--publish-sdk')) {
    await runPublishSdk();
  } else {
    await runReleasePrepare();
  }
}

if (require.main === module) {
  runCli().catch((error) => {
    log('\n' + '='.repeat(60), 'bright');
    logError('Release pipeline failed');
    log('='.repeat(60) + '\n', 'bright');
    logError(error.message || String(error));
    process.exit(1);
  });
}

module.exports = {
  runReleasePrepare,
  runPublishContracts,
  runPublishSdk,
  verifySdkPublishGate,
  installPublishDeps,
};
