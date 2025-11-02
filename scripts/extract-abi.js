// extract-abi.js
// This script extracts the ABI from the compiled contracts and saves it to a new file in the abi folder.
// run with: node extract-abi.js


const fs = require('fs');
const path = require('path');

// List of contract names to process
const contractsToProcess = [
  'StateAbstraction',
  'StateAbstractionDefinitions',
  'BaseStateMachine',
  'SecureOwnable',
  'SecureOwnableDefinitions',
  'SecureOwnableWorkflows',
  'DynamicRBAC',
  'DynamicRBACDefinitions',
  'GuardController',
  'IDefinition',
  'IWorkflow',
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
const destinationFolder = path.join(__dirname, '..', 'abi');

// Create the destination folder if it doesn't exist
if (!fs.existsSync(destinationFolder)) {
  fs.mkdirSync(destinationFolder);
}

// Function to extract ABI from a contract file
function extractABI(filePath) {
  const contractJson = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return contractJson.abi;
}

// Process the specified contracts
contractsToProcess.forEach(contractName => {
  const fileName = `${contractName}.json`;
  const sourcePath = path.join(sourceFolder, fileName);
  
  if (fs.existsSync(sourcePath)) {
    const destinationPath = path.join(destinationFolder, `${contractName}.abi.json`);
    
    const abi = extractABI(sourcePath);
    fs.writeFileSync(destinationPath, JSON.stringify(abi, null, 2));
    
    console.log(`ABI extracted and saved: ${destinationPath}`);
  } else {
    console.log(`Contract file not found: ${fileName}`);
  }
});

console.log('ABI extraction complete.');
