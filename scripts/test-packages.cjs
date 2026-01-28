#!/usr/bin/env node
// test-packages.cjs
// Tests package readiness for both @bloxchain/contracts and @bloxchain/sdk
// This script cleans the root, prepares each package, and validates they're ready for publishing

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const contractsPackageDir = path.join(rootDir, 'package');
const sdkPackageDir = path.join(rootDir, 'sdk', 'typescript');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
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

function exec(command, options = {}) {
  const defaultOptions = {
    cwd: rootDir,
    stdio: 'inherit',
    encoding: 'utf8',
    shell: true, // Use shell on Windows for better compatibility
  };
  const mergedOptions = { ...defaultOptions, ...options };
  try {
    execSync(command, mergedOptions);
    return true;
  } catch (error) {
    if (options.throwOnError !== false) {
      throw error;
    }
    return false;
  }
}

function cleanRoot() {
  logStep('🧹', 'Cleaning root directory...');
  
  const nodeModulesPath = path.join(rootDir, 'node_modules');
  const packageLockPath = path.join(rootDir, 'package-lock.json');
  
  let cleaned = false;
  
  if (fs.existsSync(nodeModulesPath)) {
    log('Removing node_modules...', 'yellow');
    try {
      fs.rmSync(nodeModulesPath, { recursive: true, force: true });
      logSuccess('Removed node_modules');
      cleaned = true;
    } catch (error) {
      logError(`Failed to remove node_modules: ${error.message}`);
      logWarning('Continuing anyway...');
    }
  } else {
    log('node_modules not found, skipping...', 'yellow');
  }
  
  if (fs.existsSync(packageLockPath)) {
    log('Removing package-lock.json...', 'yellow');
    try {
      fs.unlinkSync(packageLockPath);
      logSuccess('Removed package-lock.json');
      cleaned = true;
    } catch (error) {
      logError(`Failed to remove package-lock.json: ${error.message}`);
      logWarning('Continuing anyway...');
    }
  } else {
    log('package-lock.json not found, skipping...', 'yellow');
  }
  
  if (cleaned) {
    logSuccess('Root directory cleaned');
  } else {
    log('Root directory was already clean', 'yellow');
  }
}

function validatePackageJson(packagePath, packageName) {
  log(`Validating ${packageName} package.json...`, 'yellow');
  
  const packageJsonPath = path.join(packagePath, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    throw new Error(`${packageName}: package.json not found`);
  }
  
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  // Required fields
  const requiredFields = ['name', 'version', 'description', 'license'];
  for (const field of requiredFields) {
    if (!packageJson[field]) {
      throw new Error(`${packageName}: Missing required field '${field}' in package.json`);
    }
  }
  
  // Check version format
  if (!/^\d+\.\d+\.\d+/.test(packageJson.version)) {
    throw new Error(`${packageName}: Invalid version format '${packageJson.version}'`);
  }
  
  logSuccess(`${packageName} package.json is valid`);
  return packageJson;
}

function validatePackageFiles(packagePath, packageName, packageJson) {
  log(`Validating ${packageName} files...`, 'yellow');
  
  if (!packageJson.files || !Array.isArray(packageJson.files)) {
    logWarning(`${packageName}: No 'files' field in package.json, all files will be included`);
    return;
  }
  
  const missingFiles = [];
  for (const filePattern of packageJson.files) {
    const filePath = path.join(packagePath, filePattern);
    
    // Handle glob patterns (simple check)
    if (filePattern.includes('*')) {
      // For now, just check if the directory exists
      const dirPath = path.dirname(filePath);
      if (!fs.existsSync(dirPath)) {
        missingFiles.push(filePattern);
      }
    } else {
      if (!fs.existsSync(filePath)) {
        missingFiles.push(filePattern);
      }
    }
  }
  
  if (missingFiles.length > 0) {
    throw new Error(
      `${packageName}: Missing required files: ${missingFiles.join(', ')}`
    );
  }
  
  logSuccess(`${packageName} all required files are present`);
}

function testContractsPackage() {
  logStep('📦', 'Testing @bloxchain/contracts package...');
  
  // Validate package.json
  const packageJson = validatePackageJson(contractsPackageDir, '@bloxchain/contracts');
  
  // Run prepublish script
  log('Running prepublish script...', 'yellow');
  try {
    exec('npm run prepublishOnly', { cwd: contractsPackageDir });
    logSuccess('Prepublish script completed');
  } catch (error) {
    throw new Error('Prepublish script failed: ' + error.message);
  }
  
  // Validate files
  validatePackageFiles(contractsPackageDir, '@bloxchain/contracts', packageJson);
  
  // Test npm pack
  log('Testing npm pack (dry-run)...', 'yellow');
  let packOutput;
  try {
    packOutput = execSync('npm pack --dry-run 2>&1', {
      cwd: contractsPackageDir,
      encoding: 'utf8',
      shell: true,
    });
    logSuccess('npm pack dry-run successful');
    
    // Check that expected files are in the pack
    // Look for contracts and abi files using regex
    const hasContracts = /contracts\//.test(packOutput);
    const hasAbi = /abi\//.test(packOutput);
    
    if (!hasContracts) {
      logWarning('Contracts directory not found in pack output');
    }
    if (!hasAbi) {
      logWarning('ABI directory not found in pack output');
    }
    
    logSuccess('Package structure looks good');
  } catch (error) {
    throw new Error('npm pack dry-run failed: ' + error.message);
  }
  
  logSuccess('@bloxchain/contracts package is ready for publishing');
}

function testSdkPackage() {
  logStep('📦', 'Testing @bloxchain/sdk package...');
  
  // Validate package.json
  const packageJson = validatePackageJson(sdkPackageDir, '@bloxchain/sdk');
  
  // Check if dist directory exists or needs to be built
  const distPath = path.join(sdkPackageDir, 'dist');
  const sdkNodeModules = path.join(sdkPackageDir, 'node_modules');
  
  if (!fs.existsSync(distPath)) {
    log('dist directory not found, building SDK...', 'yellow');
    
    // Install SDK dependencies if needed (for TypeScript compiler)
    if (!fs.existsSync(sdkNodeModules)) {
      log('Installing SDK dependencies...', 'yellow');
      try {
        exec('npm install', { cwd: sdkPackageDir });
        logSuccess('SDK dependencies installed');
      } catch (error) {
        throw new Error('Failed to install SDK dependencies: ' + error.message);
      }
    } else {
      log('SDK node_modules found, skipping install...', 'yellow');
    }
    
    try {
      exec('npm run build', { cwd: sdkPackageDir });
      logSuccess('SDK build completed');
    } catch (error) {
      throw new Error('SDK build failed: ' + error.message);
    }
  } else {
    log('dist directory found, skipping build...', 'yellow');
  }
  
  // Run prepublish script
  log('Running prepublish script...', 'yellow');
  try {
    exec('npm run prepublishOnly', { cwd: sdkPackageDir });
    logSuccess('Prepublish script completed');
  } catch (error) {
    throw new Error('Prepublish script failed: ' + error.message);
  }
  
  // Validate files
  validatePackageFiles(sdkPackageDir, '@bloxchain/sdk', packageJson);
  
  // Check dist files
  if (!fs.existsSync(path.join(distPath, 'index.js'))) {
    throw new Error('@bloxchain/sdk: dist/index.js not found');
  }
  if (!fs.existsSync(path.join(distPath, 'index.d.ts'))) {
    throw new Error('@bloxchain/sdk: dist/index.d.ts not found');
  }
  logSuccess('SDK dist files are present');
  
  // Test npm pack
  log('Testing npm pack (dry-run)...', 'yellow');
  try {
    const packOutput = execSync('npm pack --dry-run 2>&1', {
      cwd: sdkPackageDir,
      encoding: 'utf8',
      shell: true,
    });
    logSuccess('npm pack dry-run successful');
    
    // Check that expected files are in the pack
    // Look for dist files (dist/index.js, dist/contracts/, etc.)
    const hasDist = packOutput.includes('dist/') || packOutput.includes('dist\\');
    const hasAbi = packOutput.includes('abi/') || packOutput.includes('abi\\');
    
    if (!hasDist) {
      throw new Error('dist directory not found in pack output');
    }
    if (!hasAbi) {
      logWarning('ABI directory not found in pack output');
    }
    
    logSuccess('Package structure looks good');
  } catch (error) {
    throw new Error('npm pack dry-run failed: ' + error.message);
  }
  
  logSuccess('@bloxchain/sdk package is ready for publishing');
}

function checkPrerequisites() {
  logStep('🔍', 'Checking prerequisites...');
  
  // Check npm
  try {
    const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
    logSuccess(`npm is available (version ${npmVersion})`);
  } catch (error) {
    throw new Error('npm is not available. Please install Node.js and npm.');
  }
  
  // Check node
  try {
    const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
    logSuccess(`Node.js is available (version ${nodeVersion})`);
  } catch (error) {
    throw new Error('Node.js is not available. Please install Node.js.');
  }
  
  // Check package directories exist
  if (!fs.existsSync(contractsPackageDir)) {
    throw new Error(`Contracts package directory not found: ${contractsPackageDir}`);
  }
  if (!fs.existsSync(sdkPackageDir)) {
    throw new Error(`SDK package directory not found: ${sdkPackageDir}`);
  }
  
  logSuccess('All prerequisites met');
}

function main() {
  log('\n' + '='.repeat(60), 'bright');
  log('🧪 Package Readiness Test', 'bright');
  log('='.repeat(60) + '\n', 'bright');
  
  try {
    // Step 0: Check prerequisites
    checkPrerequisites();
    
    // Step 1: Clean root
    cleanRoot();
    
    // Step 2: Test contracts package
    testContractsPackage();
    
    // Step 3: Test SDK package
    testSdkPackage();
    
    // Summary
    log('\n' + '='.repeat(60), 'bright');
    log('✅ All packages are ready for publishing!', 'green');
    log('='.repeat(60) + '\n', 'bright');
    
    log('Next steps:', 'cyan');
    log('  1. Review the package contents above', 'yellow');
    log('  2. Run: npm run publish:contracts', 'yellow');
    log('  3. Run: npm run publish:sdk', 'yellow');
    log('');
    
    process.exit(0);
  } catch (error) {
    log('\n' + '='.repeat(60), 'bright');
    logError('Package test failed!');
    log('='.repeat(60) + '\n', 'bright');
    logError(error.message);
    if (error.stack && process.env.DEBUG) {
      log('\nStack trace:', 'yellow');
      log(error.stack, 'yellow');
    }
    log('');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main, testContractsPackage, testSdkPackage, cleanRoot };
