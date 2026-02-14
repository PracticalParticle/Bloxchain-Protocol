// postpublish-contracts.cjs
// Cleans up copied files after publishing

const fs = require('fs');
const path = require('path');

const contractsDir = __dirname.replace(/[\\/]scripts$/, '');
const copiedContractsDir = path.join(contractsDir, 'contracts');
const copiedAbiDir = path.join(contractsDir, 'abi');
const copiedStandardsDir = path.join(contractsDir, 'standards');
const copiedComponentsDir = path.join(contractsDir, 'components');
const copiedCoreDir = path.join(contractsDir, 'core');

console.log('🧹 Cleaning up after publish...\n');

if (fs.existsSync(copiedContractsDir)) {
  fs.rmSync(copiedContractsDir, { recursive: true, force: true });
  console.log('✅ Removed copied contracts directory');
}

if (fs.existsSync(copiedAbiDir)) {
  fs.rmSync(copiedAbiDir, { recursive: true, force: true });
  console.log('✅ Removed copied abi directory');
}

if (fs.existsSync(copiedStandardsDir)) {
  fs.rmSync(copiedStandardsDir, { recursive: true, force: true });
  console.log('✅ Removed copied standards directory');
}

if (fs.existsSync(copiedComponentsDir)) {
  fs.rmSync(copiedComponentsDir, { recursive: true, force: true });
  console.log('✅ Removed copied components directory');
}

if (fs.existsSync(copiedCoreDir)) {
  fs.rmSync(copiedCoreDir, { recursive: true, force: true });
  console.log('✅ Removed copied core directory');
}

console.log('\n✅ Cleanup complete!');
