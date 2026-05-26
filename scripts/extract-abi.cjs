// extract-abi.cjs
// Extracts ABIs from Foundry artifacts (out/) into abi/ and sdk/typescript/abi/.
// Run after: npm run compile:foundry  (or use compile:foundry:abi)

const fs = require('fs');
const path = require('path');

// Core + templates shipped in the TS SDK. Example apps (SimpleVault, SimpleRWA20 + defs) are omitted from abi/ and sdk/typescript/abi/.
const contractsToProcess = [
  'EngineBlox',
  'BaseStateMachine',
  'SecureOwnable',
  'SecureOwnableDefinitions',
  'RuntimeRBAC',
  'RuntimeRBACDefinitions',
  'GuardController',
  'GuardControllerDefinitions',
  'IDefinition',
  'AccountBlox',
  'CopyBlox',
];

const outFolder = path.join(__dirname, '..', 'out');
const rootAbiFolder = path.join(__dirname, '..', 'abi');
const sdkAbiFolder = path.join(__dirname, '..', 'sdk', 'typescript', 'abi');

function findFoundryArtifact(contractName) {
  const preferred = path.join(outFolder, `${contractName}.sol`, `${contractName}.json`);
  if (fs.existsSync(preferred)) {
    return preferred;
  }

  const matches = [];

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'build-info') {
          continue;
        }
        walk(fullPath);
      } else if (entry.name === `${contractName}.json`) {
        matches.push(fullPath);
      }
    }
  }

  walk(outFolder);

  if (matches.length === 0) {
    return null;
  }

  if (matches.length === 1) {
    return matches[0];
  }

  const exactDirMatch = matches.find((artifactPath) =>
    artifactPath.endsWith(`${contractName}.sol${path.sep}${contractName}.json`)
  );
  return exactDirMatch ?? matches[0];
}

function extractABI(filePath) {
  const contractJson = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (!Array.isArray(contractJson.abi)) {
    throw new Error(`No ABI array in Foundry artifact: ${filePath}`);
  }
  return contractJson.abi;
}

function writeABI(destinationPath, abi) {
  fs.writeFileSync(destinationPath, JSON.stringify(abi, null, 2));
}

if (!fs.existsSync(outFolder)) {
  console.error('❌ Foundry output not found at out/. Run "npm run compile:foundry" first.');
  process.exit(1);
}

if (!fs.existsSync(rootAbiFolder)) {
  fs.mkdirSync(rootAbiFolder, { recursive: true });
}
if (!fs.existsSync(sdkAbiFolder)) {
  fs.mkdirSync(sdkAbiFolder, { recursive: true });
}

let missingCount = 0;

for (const contractName of contractsToProcess) {
  const sourcePath = findFoundryArtifact(contractName);

  if (!sourcePath) {
    console.log(`⚠️  Foundry artifact not found for: ${contractName}`);
    missingCount += 1;
    continue;
  }

  const abi = extractABI(sourcePath);
  const abiFileName = `${contractName}.abi.json`;
  const rootAbiPath = path.join(rootAbiFolder, abiFileName);
  const sdkAbiPath = path.join(sdkAbiFolder, abiFileName);

  writeABI(rootAbiPath, abi);
  writeABI(sdkAbiPath, abi);
  console.log(`✅ ${contractName} (from ${path.relative(path.join(__dirname, '..'), sourcePath)})`);
}

if (missingCount > 0) {
  console.error(`\n❌ ${missingCount} contract artifact(s) missing. Run "npm run compile:foundry" and retry.`);
  process.exit(1);
}

console.log('\n✨ ABI extraction complete. ABIs saved to both root and SDK locations.');
