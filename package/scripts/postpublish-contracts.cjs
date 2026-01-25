// postpublish-contracts.cjs
// Cleans up copied files after publishing

const fs = require('fs');
const path = require('path');

const contractsDir = __dirname.replace(/[\\/]scripts$/, '');
const copiedContractsDir = path.join(contractsDir, 'contracts');
const copiedAbiDir = path.join(contractsDir, 'abi');

console.log('🧹 Cleaning up after publish...\n');

if (fs.existsSync(copiedContractsDir)) {
  fs.rmSync(copiedContractsDir, { recursive: true, force: true });
  console.log('✅ Removed copied contracts directory');
}

if (fs.existsSync(copiedAbiDir)) {
  fs.rmSync(copiedAbiDir, { recursive: true, force: true });
  console.log('✅ Removed copied abi directory');
}

console.log('\n✅ Cleanup complete!');
