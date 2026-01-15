# Bloxchain Setup Guide

This guide will help you set up the Bloxchain Workflow Analyzer for your own development environment.

## Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/your-org/bloxchain-protocol.git
cd bloxchain
npm install
```

### 2. Configure Environment

Copy the example environment file and configure it for your setup:

```bash
cp env.example .env
```

Edit `.env` with your configuration:

```bash
# Network Configuration
BLOXCHAIN_NETWORK=development

# Development Network Configuration
# Leave REMOTE_HOST unset for local development (localhost)
# Set REMOTE_HOST to use remote development environment
REMOTE_HOST=your-remote-host.com
REMOTE_PORT=8545
REMOTE_NETWORK_ID=1337
REMOTE_GAS=8000000
REMOTE_GAS_PRICE=20000000000
REMOTE_FROM=0x1234567890123456789012345678901234567890

# Definition Library Addresses (update after deployment)
MULTIPHASE_DEFINITIONS_ADDRESS=0x...
SECURE_OWNABLE_DEFINITIONS_ADDRESS=0x...
RUNTIME_RBAC_DEFINITIONS_ADDRESS=0x...
```

### 3. Deploy Contracts

Deploy to your development network:

```bash
npm run deploy:development
```

### 4. Update Contract Addresses

After deployment, update the contract addresses in your `.env` file:

```bash
# Contract Addresses (update after deployment)
SECUREBLOX_ADDRESS=0x...
ROLEBLOX_ADDRESS=0x...
SIMPLE_VAULT_ADDRESS=0x...
SIMPLE_RWA20_ADDRESS=0x...
```

### 5. Analyze Contracts

Run the dynamic analysis:

```bash
npm run analyze:contract
```

## Network Configurations

### Local Development

For local development with Ganache:

```bash
# .env
BLOXCHAIN_NETWORK=development
# REMOTE_HOST not set - defaults to localhost
REMOTE_PORT=8545
REMOTE_NETWORK_ID=1337
```

### Remote Development

For remote development (recommended for open source):

```bash
# .env
BLOXCHAIN_NETWORK=development
REMOTE_HOST=your-remote-host.com
REMOTE_PORT=8545
REMOTE_NETWORK_ID=1337
```

### Custom Network

For custom networks:

```bash
# .env
GUARDIAN_NETWORK=custom
CUSTOM_RPC_URL=https://your-custom-rpc:8545
CUSTOM_NETWORK_ID=9999
CUSTOM_NETWORK_NAME=custom_network
```

## Environment Variables Reference

### Network Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `BLOXCHAIN_NETWORK` | Network name (localhost, remote_development, custom) | remote_development | No |
| `REMOTE_HOST` | Remote host address | 127.0.0.1 | No |
| `REMOTE_PORT` | Remote port | 8545 | No |
| `REMOTE_NETWORK_ID` | Network ID | 1337 | No |
| `REMOTE_GAS` | Gas limit for transactions | 8000000 | No |
| `REMOTE_GAS_PRICE` | Gas price for transactions | 20000000000 | No |
| `REMOTE_FROM` | Default from address | - | No |

### Definition Libraries

| Variable | Description | Required |
|----------|-------------|----------|
| `MULTIPHASE_DEFINITIONS_ADDRESS` | StateAbstractionDefinitions address | Yes |
| `SECURE_OWNABLE_DEFINITIONS_ADDRESS` | SecureOwnableDefinitions address | Yes |
| `RUNTIME_RBAC_DEFINITIONS_ADDRESS` | RuntimeRBACDefinitions address | Yes |

### Contract Addresses

| Variable | Description | Required |
|----------|-------------|----------|
| `GUARDIAN_ADDRESS` | Guardian address | No |
| `GUARDIAN_WITH_ROLES_ADDRESS` | GuardianWithRoles address | No |
| `SIMPLE_VAULT_ADDRESS` | SimpleVault address | No |
| `SIMPLE_RWA20_ADDRESS` | SimpleRWA20 address | No |

## Available Scripts

### Deployment

```bash
# Deploy to development network (local or remote based on .env)
npm run deploy:development

# Deploy to specific network
npx truffle migrate --network development
```

### Analysis

```bash
# Run dynamic contract analysis
npm run analyze:contract

# Run specific analysis
node scripts/analyze-contract-simple.js
```

### Testing

```bash
# Run all tests
npm test

# Run analyzer tests
npm run test:analyzer

# Run integration tests
npm run test:analyzer:integration
```

## Troubleshooting

### Common Issues

1. **Network Connection Failed**
   - Check your `REMOTE_HOST` and `REMOTE_PORT` settings
   - Ensure your remote node is running and accessible

2. **Contract Not Found**
   - Verify contract addresses in `.env` file
   - Ensure contracts are deployed to the correct network

3. **Definition Library Errors**
   - Check definition library addresses
   - Ensure libraries are deployed and accessible

### Getting Help

- Check the [README.md](README.md) for general information
- Review the [SDK Documentation](sdk/typescript/analyzer/README.md) for detailed API usage
- Open an issue on GitHub for bugs or feature requests

## Contributing

1. Fork the repository
2. Create a feature branch
3. Set up your development environment using this guide
4. Make your changes
5. Test thoroughly
6. Submit a pull request

## License

MPL-2.0
