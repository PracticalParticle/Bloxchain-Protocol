#!/usr/bin/env node
// release-prepare.cjs
// Single-command pre-publication: sync versions, extract ABIs, prepare package, test, verify.
// Usage: npm run release:prepare (from repo root)
// Env: SKIP_TESTS=1 | PREPARE_CONTRACTS_ONLY=1 | DEBUG=1

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const contractsPackageDir = path.join(rootDir, 'package');
const sdkPackageDir = path.join(rootDir, 'sdk', 'typescript');

const SKIP_TESTS = process.env.SKIP_TESTS === '1';
const PREPARE_CONTRACTS_ONLY = process.env.PREPARE_CONTRACTS_ONLY === '1';
const DEBUG = process.env.DEBUG === '1';

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
  exec('npm run extract-abi');
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
  if (SKIP_TESTS) {
    logWarning('Skipping tests (SKIP_TESTS=1)');
    return;
  }
  logStep('📋', 'Step 4: Running tests...');
  exec('npm run test:foundry');
  logSuccess('Foundry tests passed');
  // Sanity tests require deploy/chain; optional for prepare
  log('Running sanity:core (may require deployed contracts)...', 'yellow');
  const sanityOk = exec('npm run test:sanity:core', { throwOnError: false });
  if (!sanityOk) {
    logWarning('test:sanity:core failed or skipped; continuing. Run manually if needed.');
  } else {
    logSuccess('Sanity core tests passed');
  }
  log('Running sanity-sdk:core (may require deployed contracts)...', 'yellow');
  const sanitySdkOk = exec('npm run test:sanity-sdk:core', { throwOnError: false });
  if (!sanitySdkOk) {
    logWarning('test:sanity-sdk:core failed or skipped; continuing. Run manually if needed.');
  } else {
    logSuccess('Sanity SDK tests passed');
  }
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

function prepareSdk() {
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

function printSummary() {
  log('\n' + '='.repeat(60), 'bright');
  log('✅ Release prepare complete', 'green');
  log('='.repeat(60) + '\n', 'bright');
  log('Ready to publish. Run:', 'cyan');
  log('  npm login', 'yellow');
  log('  npm run publish:contracts', 'yellow');
  log('  npm run publish:sdk', 'yellow');
  log('\nOr manually:', 'cyan');
  log('  cd package && npm publish --tag alpha.11', 'yellow');
  log('  cd sdk/typescript && npm publish --tag alpha.11', 'yellow');
  log('');
}

function main() {
  log('\n' + '='.repeat(60), 'bright');
  log('📦 Release Prepare', 'bright');
  log('='.repeat(60), 'bright');
  try {
    syncVersions();
    extractAbi();
    prepareContractsPackage();
    runTests();
    verifyContractsPackage();
    prepareSdk();
    printSummary();
    process.exit(0);
  } catch (error) {
    log('\n' + '='.repeat(60), 'bright');
    logError('Release prepare failed');
    log('='.repeat(60) + '\n', 'bright');
    logError(error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };
