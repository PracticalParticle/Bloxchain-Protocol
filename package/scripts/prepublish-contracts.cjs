// prepublish-contracts.cjs
// Prepares contracts package for publishing by copying contracts and abi

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const contractsDir = __dirname.replace(/[\\/]scripts$/, '');
const rootDir = path.join(contractsDir, '..');
const sourceContractsDir = path.join(rootDir, 'contracts');
const sourceAbiDir = path.join(rootDir, 'abi');
const destContractsDir = path.join(contractsDir, 'contracts');
const destAbiDir = path.join(contractsDir, 'abi');

console.log('📦 Preparing @bloxchain/contracts for publishing...\n');

// Step 1: Extract ABIs from root
console.log('📋 Step 1: Extracting ABIs...');
try {
  execSync('npm run extract-abi', { cwd: rootDir, stdio: 'inherit' });
  console.log('✅ ABIs extracted\n');
} catch (error) {
  console.error('❌ Failed to extract ABIs:', error.message);
  process.exit(1);
}

// Step 2: Copy contracts directory
console.log('📋 Step 2: Copying contracts...');
if (!fs.existsSync(sourceContractsDir)) {
  console.error('❌ Source contracts directory not found!');
  process.exit(1);
}

// Remove existing if present
if (fs.existsSync(destContractsDir)) {
  fs.rmSync(destContractsDir, { recursive: true, force: true });
}

// Copy contracts
copyDir(sourceContractsDir, destContractsDir);
console.log('✅ Contracts copied\n');

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

// Copy ABIs
copyDir(sourceAbiDir, destAbiDir);
console.log('✅ ABIs copied\n');

console.log('✅ Package ready for publishing!\n');

// Helper function to copy directory recursively
function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
