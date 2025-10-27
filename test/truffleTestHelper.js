require('dotenv').config();
const { createTestClient, http } = require('viem');

// Get RPC URL from environment or default to localhost
// Protocol logic: 
// - Use REMOTE_PROTOCOL if REMOTE_HOST is set (defaults to 'https')
// - Use 'http' for localhost
function getRPCUrl() {
  if (process.env.RPC_URL) {
    return process.env.RPC_URL;
  }
  
  if (process.env.REMOTE_HOST) {
    const protocol = process.env.REMOTE_PROTOCOL || 'https';
    const port = process.env.REMOTE_PORT || 8545;
    return `${protocol}://${process.env.REMOTE_HOST}:${port}`;
  }
  
  // Default to http for localhost
  return 'http://127.0.0.1:8545';
}

const RPC_URL = getRPCUrl();

const testClient = createTestClient({
    mode: 'anvil',
    transport: http(RPC_URL)
});

const advanceTimeAndBlock = async (time) => {
    await advanceTime(time);
    await advanceBlock();
    
    return testClient.getBlock(); // Viem's way to get latest block
};

const advanceTime = async (time) => {
    await testClient.increaseTime({ seconds: BigInt(time) });
};

const advanceBlock = async () => {
    await testClient.mine({ blocks: 1 });
    const block = await testClient.getBlock();
    return block.hash;
};

module.exports = {
    advanceTime,
    advanceBlock,
    advanceTimeAndBlock,
    testClient,
    RPC_URL
};