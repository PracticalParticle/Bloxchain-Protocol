#!/usr/bin/env node
/**
 * Fresh remote_evm test deployment: foundation libraries + AccountBlox + CopyBlox + BasicERC20.
 *
 * Prerequisites:
 *   - Remote EVM running (e.g. Nethermind Docker on http://127.0.0.1:8545)
 *   - .env.deployment.local (copy from env.deployment.example, set local RPC + key)
 *   - npm install --save-dev @nomicfoundation/hardhat-toolbox-viem
 *
 * Usage:
 *   npm run deploy:remote-evm:test
 *   DEPLOY_ENV_FILE=.env.deployment.local npm run deploy:remote-evm:test
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '../..');
const network = process.env.DEPLOY_NETWORK || 'remote_evm';
const deployEnvFile = process.env.DEPLOY_ENV_FILE?.trim() || '.env.deployment.local';
const deployEnvPath = path.join(rootDir, deployEnvFile);

function run(step, scriptPath) {
  console.log(`\n▶ ${step}`);
  const cmd = `npx hardhat run ${scriptPath} --network ${network}`;
  execSync(cmd, {
    cwd: rootDir,
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      DEPLOY_ENV_FILE: deployEnvFile,
    },
  });
}

function runNode(step, scriptPath, extraEnv = {}) {
  console.log(`\n▶ ${step}`);
  execSync(`node ${scriptPath}`, {
    cwd: rootDir,
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      DEPLOY_ENV_FILE: deployEnvFile,
      DEPLOY_NETWORK: network,
      DEPLOY_NETWORK_NAME: network,
      ...extraEnv,
    },
  });
}

function main() {
  if (!fs.existsSync(deployEnvPath)) {
    console.error(
      `Missing ${deployEnvFile}. Copy env.deployment.example to ${deployEnvFile} and set DEPLOY_RPC_URL / DEPLOY_PRIVATE_KEY for remote_evm.`
    );
    process.exit(1);
  }

  console.log(`Deploying to network: ${network}`);
  console.log(`Using env file: ${deployEnvFile}`);

  run(
    'Foundation libraries + AccountBlox',
    'scripts/deployment/deploy-foundation-libraries.js'
  );
  run('CopyBlox example', 'scripts/deployment/deploy-example-copyblox.js');
  runNode('BasicERC20 token', 'scripts/deployment/create-erc20-token.js', {
    CREATE_ERC20_USE_DEFAULTS: '1',
  });

  console.log('\n✅ remote_evm test deployment complete (foundation + CopyBlox + BasicERC20).');
  console.log('   Addresses: deployed-addresses.json');
  console.log('   Optional: npm run generate:sanity-env -- --out .env');
}

main();
