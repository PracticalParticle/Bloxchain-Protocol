// prepublish-contracts.cjs
// Prepares contracts package for publishing by copying contracts and abi

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const contractsDir = __dirname.replace(/[\\/]scripts$/, '');
const rootDir = path.join(contractsDir, '..');
const sourceContractsDir = path.join(rootDir, 'contracts');
const sourceAbiDir = path.join(rootDir, 'abi');
const destAbiDir = path.join(contractsDir, 'abi');

console.log('📦 Preparing @bloxchain/contracts for publishing...\n');

// Step 0: Sync versions from root
console.log('📋 Step 0: Syncing versions from root...');
try {
  execSync('npm run release:sync-versions', { cwd: rootDir, stdio: 'inherit' });
  console.log('✅ Versions synced\n');
} catch (error) {
  console.error('❌ Failed to sync versions:', error.message);
  process.exit(1);
}

// Step 1: Extract ABIs from root
console.log('📋 Step 1: Extracting ABIs...');
try {
  execSync('npm run extract-abi', { cwd: rootDir, stdio: 'inherit' });
  console.log('✅ ABIs extracted\n');
} catch (error) {
  console.error('❌ Failed to extract ABIs:', error.message);
  process.exit(1);
}

// Step 2: Copy contracts/core to package/core (single exposed folder; lib/utils, lib/interfaces live inside core)
console.log('📋 Step 2: Copying contracts to package root...');
if (!fs.existsSync(sourceContractsDir)) {
  console.error('❌ Source contracts directory not found!');
  process.exit(1);
}

const excludedDirs = ['examples', 'experimental'];
const coreSrc = path.join(sourceContractsDir, 'core');
const coreDest = path.join(contractsDir, 'core');
if (!fs.existsSync(coreSrc)) {
  console.error('❌ Source directory not found: contracts/core');
  process.exit(1);
}
if (fs.existsSync(coreDest)) {
  fs.rmSync(coreDest, { recursive: true, force: true });
}
copyDir(coreSrc, coreDest, excludedDirs);
console.log('✅ Core copied\n');

// Step 2b: Copy contracts/standards to package/standards
const standardsSrc = path.join(sourceContractsDir, 'standards');
const standardsDest = path.join(contractsDir, 'standards');
if (fs.existsSync(standardsSrc)) {
  if (fs.existsSync(standardsDest)) {
    fs.rmSync(standardsDest, { recursive: true, force: true });
  }
  copyDir(standardsSrc, standardsDest, []);
  console.log('✅ Standards copied\n');
} else {
  console.log('⏭️  No standards directory; skipping\n');
}

// Step 2c: Copy contracts/components to package/components
const componentsSrc = path.join(sourceContractsDir, 'components');
const componentsDest = path.join(contractsDir, 'components');
if (fs.existsSync(componentsSrc)) {
  if (fs.existsSync(componentsDest)) {
    fs.rmSync(componentsDest, { recursive: true, force: true });
  }
  copyDir(componentsSrc, componentsDest, []);
  console.log('✅ Components copied\n');
} else {
  console.log('⏭️  No components directory; skipping\n');
}

// Step 3: Copy abi directory
console.log('📋 Step 3: Copying ABIs...');
if (!fs.existsSync(sourceAbiDir)) {
  console.error('❌ Source ABI directory not found!');
  process.exit(1);
}

// Remove existing if present
if (fs.existsSync(destAbiDir)) {
  fs.rmSync(destAbiDir, { recursive: true, force: true });
}

copyDir(sourceAbiDir, destAbiDir, []);
console.log('✅ ABIs copied\n');

// Step 4: Remove ABIs that don't have a contract in the package
// Only keep ABIs whose contract name exists in core, standards, or components (no examples).
const packagedContractNames = collectPackagedContractNames();
console.log('📋 Step 4: Pruning ABIs not packaged with contracts...');
const removed = pruneUnpackagedAbis(destAbiDir, packagedContractNames);
if (removed.length > 0) {
  console.log(`   Removed ${removed.length} ABI(s) with no packaged contract: ${removed.join(', ')}`);
}
const remaining = fs.existsSync(destAbiDir) ? fs.readdirSync(destAbiDir).filter(f => f.endsWith('.abi.json')).length : 0;
console.log(`   Packaged ABIs remaining: ${remaining}`);
console.log('✅ ABI prune complete\n');

console.log('✅ Package ready for publishing!\n');

/**
 * Collect contract names (basename of .sol files) from the source dirs that get copied
 * into the package: core, standards, components. Excludes examples and experimental.
 */
function collectPackagedContractNames() {
  const names = new Set();
  const dirs = [
    coreSrc,
    fs.existsSync(standardsSrc) ? standardsSrc : null,
    fs.existsSync(componentsSrc) ? componentsSrc : null
  ].filter(Boolean);

  function walk(dir, excludeDirs = []) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!excludeDirs.includes(entry.name)) {
          walk(full, excludeDirs);
        }
      } else if (entry.name.endsWith('.sol')) {
        names.add(path.basename(entry.name, '.sol'));
      }
    }
  }

  for (const d of dirs) {
    walk(d, excludedDirs);
  }
  return names;
}

/**
 * Remove any file in destAbiDir that is *.abi.json and whose contract name
 * (stem) is not in packagedContractNames. Returns list of removed filenames.
 */
function pruneUnpackagedAbis(destAbiDir, packagedContractNames) {
  const removed = [];
  if (!fs.existsSync(destAbiDir)) return removed;

  const files = fs.readdirSync(destAbiDir);
  for (const file of files) {
    if (!file.endsWith('.abi.json')) continue;
    const stem = file.replace(/\.abi\.json$/, '');
    if (!packagedContractNames.has(stem)) {
      const full = path.join(destAbiDir, file);
      fs.unlinkSync(full);
      removed.push(file);
    }
  }
  return removed;
}

// Helper function to copy directory recursively
// excludedDirs: array of directory names to skip (e.g., ['examples', 'experimental'])
function copyDir(src, dest, excludedDirs = []) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    // Skip excluded directories
    if (entry.isDirectory() && excludedDirs.includes(entry.name)) {
      console.log(`⏭️  Skipping excluded directory: ${entry.name}`);
      continue;
    }
    
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath, excludedDirs);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
