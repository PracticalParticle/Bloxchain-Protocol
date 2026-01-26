// extract-abi.js
// This script extracts the ABI from the compiled contracts and saves it to a new file in the abi folder.
// run with: node extract-abi.js


const fs = require('fs');
const path = require('path');

// List of contract names to process
const contractsToProcess = [
  'EngineBlox',
  'BaseStateMachine',
  'SecureOwnable',
  'SecureOwnableDefinitions',
  'RuntimeRBAC',
  'RuntimeRBACDefinitions',
  'GuardController',
  'IDefinition',
  'BareBlox',
  'SecureBlox',
  'RoleBlox',
  'ControlBlox',
  'SimpleVault',
  'SimpleVaultDefinitions',
  'SimpleRWA20',
  'SimpleRWA20Definitions'
];

// Define the source and destination folders
const sourceFolder = path.join(__dirname, '..', 'build', 'contracts');
const rootAbiFolder = path.join(__dirname, '..', 'abi');
const sdkAbiFolder = path.join(__dirname, '..', 'sdk', 'typescript', 'abi');

// Create the destination folders if they don't exist
if (!fs.existsSync(rootAbiFolder)) {
  fs.mkdirSync(rootAbiFolder, { recursive: true });
}
if (!fs.existsSync(sdkAbiFolder)) {
  fs.mkdirSync(sdkAbiFolder, { recursive: true });
}

// Function to extract ABI from a contract file
function extractABI(filePath) {
  const contractJson = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return contractJson.abi;
}

// Function to write ABI to a destination
function writeABI(destinationPath, abi) {
  fs.writeFileSync(destinationPath, JSON.stringify(abi, null, 2));
}

// Process the specified contracts
contractsToProcess.forEach(contractName => {
  const fileName = `${contractName}.json`;
  const sourcePath = path.join(sourceFolder, fileName);
  
  if (fs.existsSync(sourcePath)) {
    const abi = extractABI(sourcePath);
    const abiFileName = `${contractName}.abi.json`;
    
    // Write to root abi folder (for compatibility with existing scripts)
    const rootAbiPath = path.join(rootAbiFolder, abiFileName);
    writeABI(rootAbiPath, abi);
    console.log(`✅ Root ABI: ${rootAbiPath}`);
    
    // Write to SDK abi folder (for npm package)
    const sdkAbiPath = path.join(sdkAbiFolder, abiFileName);
    writeABI(sdkAbiPath, abi);
    console.log(`✅ SDK ABI: ${sdkAbiPath}`);
  } else {
    console.log(`⚠️  Contract file not found: ${fileName}`);
  }
});

console.log('\n✨ ABI extraction complete. ABIs saved to both root and SDK locations.');
