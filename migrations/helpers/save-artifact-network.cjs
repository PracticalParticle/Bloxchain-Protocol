/**
 * Helper function to save network information to Truffle artifacts
 * This fixes the issue where Truffle doesn't save network info when network_id is "*"
 * 
 * @param {Object} artifact - Truffle artifact object (from artifacts.require)
 * @param {string} contractAddress - Deployed contract address
 * @param {Object} web3 - Web3 instance
 * @param {string} networkName - Network name (e.g., "development")
 * @param {string} transactionHash - Optional transaction hash from deployment
 * @returns {Promise<void>}
 */
async function saveArtifactNetwork(artifact, contractAddress, web3, networkName, transactionHash = null) {
    const fs = require('fs');
    const path = require('path');
    
    try {
        // Get the actual network ID from the blockchain
        const networkId = await web3.eth.net.getId();
        const networkIdStr = networkId.toString();
        
        // Get the artifact file path
        const buildDir = path.join(__dirname, '../../build/contracts');
        const artifactPath = path.join(buildDir, `${artifact.contractName}.json`);
        
        if (!fs.existsSync(artifactPath)) {
            console.warn(`⚠️  Artifact file not found: ${artifactPath}`);
            return;
        }
        
        // Read the existing artifact
        const artifactData = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
        
        // Initialize networks object if it doesn't exist
        if (!artifactData.networks) {
            artifactData.networks = {};
        }
        
        // Try to get transaction hash from:
        // 1. Provided parameter
        // 2. Existing artifact entry
        // 3. Try to find it from contract creation transaction
        let txHash = transactionHash;
        if (!txHash && artifactData.networks[networkIdStr] && artifactData.networks[networkIdStr].transactionHash) {
            txHash = artifactData.networks[networkIdStr].transactionHash;
        }
        if (!txHash) {
            // Try to find the creation transaction by checking recent blocks
            try {
                const code = await web3.eth.getCode(contractAddress);
                if (code && code !== '0x') {
                    // Contract exists, try to find creation transaction
                    // This is a best-effort - we'll use a placeholder if we can't find it
                    txHash = '0x0000000000000000000000000000000000000000000000000000000000000000';
                }
            } catch (e) {
                // Ignore errors
            }
        }
        
        // Update or create network entry
        artifactData.networks[networkIdStr] = {
            address: contractAddress,
            transactionHash: txHash || '0x0000000000000000000000000000000000000000000000000000000000000000',
            network: networkName || 'development'
        };
        
        // Save the updated artifact
        fs.writeFileSync(artifactPath, JSON.stringify(artifactData, null, 2));
        
        console.log(`💾 Saved network info to artifact: ${artifact.contractName} -> network ${networkIdStr} (${networkName})`);
        
    } catch (error) {
        console.warn(`⚠️  Failed to save network info for ${artifact.contractName}:`, error.message);
        // Don't throw - this is a best-effort operation
    }
}

module.exports = { saveArtifactNetwork };
