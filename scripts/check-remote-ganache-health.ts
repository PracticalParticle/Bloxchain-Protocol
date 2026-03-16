import 'dotenv/config';
import { createPublicClient, http } from 'viem';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

async function main() {
  console.log('🩺 Remote Ganache Health Check');
  console.log('='.repeat(60));

  const host = process.env.REMOTE_HOST;
  const protocol = process.env.REMOTE_PROTOCOL || 'https';
  const port = process.env.REMOTE_PORT || '8545';

  if (!host) {
    console.error('❌ REMOTE_HOST is not set in .env');
    process.exit(1);
  }

  const rpcUrl = `${protocol}://${host}:${port}`;
  console.log(`📡 RPC URL: ${rpcUrl}`);

  const defaultTimeoutMs = 30_000;
  let timeoutMs = defaultTimeoutMs;

  if (process.env.SANITY_SDK_RPC_TIMEOUT_MS) {
    const parsed = Number(process.env.SANITY_SDK_RPC_TIMEOUT_MS);
    if (!Number.isNaN(parsed) && parsed > 0) {
      timeoutMs = parsed;
    } else {
      console.warn(
        `⚠️ SANITY_SDK_RPC_TIMEOUT_MS is invalid ("${process.env.SANITY_SDK_RPC_TIMEOUT_MS}"); using default ${defaultTimeoutMs}ms`
      );
    }
  }

  const client = createPublicClient({
    transport: http(rpcUrl, { timeout: timeoutMs }),
  });

  try {
    const chainId = await client.getChainId();
    const blockNumber = await client.getBlockNumber();
    const latestBlock = await client.getBlock({ blockTag: 'latest' });

    console.log(`✅ Connected to remote Ganache`);
    console.log(`  📋 Chain ID:        ${chainId}`);
    console.log(`  📋 Block Number:    ${blockNumber}`);
    console.log(
      `  📋 Block Timestamp: ${new Date(Number(latestBlock.timestamp) * 1000).toISOString()}`
    );

    if (process.env.REMOTE_NETWORK_ID) {
      const networkId = Number(process.env.REMOTE_NETWORK_ID);
      console.log(`  📋 REMOTE_NETWORK_ID (env): ${networkId}`);
    }

    console.log('-'.repeat(60));

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    // __dirname is .../Bloxchain-protocol/scripts, so one level up is repo root
    const rootDir = path.resolve(__dirname, '..');
    const deployedPath = path.join(rootDir, 'deployed-addresses.json');

    let accountBloxAddress: `0x${string}` | null = null;

    if (fs.existsSync(deployedPath)) {
      try {
        const deployed = JSON.parse(fs.readFileSync(deployedPath, 'utf8'));
        const dev = deployed.development;
        if (dev && dev.AccountBlox?.address) {
          accountBloxAddress = dev.AccountBlox.address as `0x${string}`;
          console.log(
            `📋 AccountBlox from deployed-addresses.json (development): ${accountBloxAddress}`
          );
        }
      } catch (e) {
        console.warn(`⚠️  Could not read deployed-addresses.json: ${(e as Error).message}`);
      }
    }

    if (!accountBloxAddress && process.env.ACCOUNTBLOX_ADDRESS) {
      accountBloxAddress = process.env.ACCOUNTBLOX_ADDRESS as `0x${string}`;
      console.log(`📋 AccountBlox from ACCOUNTBLOX_ADDRESS (env): ${accountBloxAddress}`);
    }

    if (!accountBloxAddress) {
      console.log(
        '⚠️  No AccountBlox address found in deployed-addresses.json or .env; skipping contract health check.'
      );
      process.exit(0);
    }

    console.log('-'.repeat(60));
    console.log('🔍 Checking AccountBlox health…');

    const accountBloxAbi = [
      {
        type: 'function',
        name: 'owner',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ type: 'address' }],
      },
      {
        type: 'function',
        name: 'getBroadcasters',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ type: 'address[]' }],
      },
      {
        type: 'function',
        name: 'getRecovery',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ type: 'address' }],
      },
    ] as const;

    try {
      const owner = await client.readContract({
        address: accountBloxAddress,
        abi: accountBloxAbi,
        functionName: 'owner',
      });

      const broadcasters = await client.readContract({
        address: accountBloxAddress,
        abi: accountBloxAbi,
        functionName: 'getBroadcasters',
      });

      const recovery = await client.readContract({
        address: accountBloxAddress,
        abi: accountBloxAbi,
        functionName: 'getRecovery',
      });

      console.log('✅ AccountBlox contract read OK');
      console.log(`  👑 owner():           ${owner}`);
      console.log(`  📡 getBroadcasters(): ${JSON.stringify(broadcasters)}`);
      console.log(`  🛡️ getRecovery():      ${recovery}`);
    } catch (err: any) {
      console.error('❌ AccountBlox read failed (owner/getBroadcasters/getRecovery reverted)');
      console.error(`   Message: ${err?.message || err}`);
      const data: `0x${string}` | undefined =
        err?.data ?? err?.cause?.data ?? err?.cause?.cause?.data;
      if (typeof data === 'string' && data.startsWith('0x')) {
        console.error(`   Revert data: ${data}`);
      }
      process.exitCode = 1;
      return;
    }
  } catch (error: any) {
    console.error('❌ Remote Ganache health check failed');
    console.error(`   Message: ${error?.message || error}`);
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error('❌ Unexpected error in health check:', e);
  process.exit(1);
});

