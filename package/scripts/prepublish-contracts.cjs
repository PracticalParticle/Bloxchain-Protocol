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
console.log('✅ Contracts copied (package/core contains all contracts)\n');

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

// Copy ABIs (excluding examples and experimental)
copyDir(sourceAbiDir, destAbiDir, excludedDirs);
console.log('✅ ABIs copied (excluding examples and experimental)\n');

console.log('✅ Package ready for publishing!\n');

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
