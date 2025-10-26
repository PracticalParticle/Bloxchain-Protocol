# Docker Configuration for Bloxchain Protocol

This directory contains all Docker-related files for the Bloxchain protocol project.

## Files

- **`Dockerfile.certora`**: Docker image definition for Certora formal verification environment
- **`docker-compose.certora.yml`**: Docker Compose configuration for Certora service
- **`.dockerignore`**: Files to exclude from Docker build context

## Usage

### Building the Certora Docker Image

```bash
npm run certora:docker:build
```

### Running Certora Verification in Docker

```bash
npm run certora:docker:test
```

### Accessing Docker Shell

```bash
npm run certora:docker:shell
```

## Docker Environment

The Certora Docker environment includes:

- **Base OS**: Ubuntu 22.04
- **Java**: OpenJDK 19 (required for Certora)
- **Python**: Python 3 with pip
- **Node.js**: Latest LTS version
- **Solidity**: solc 0.8.26
- **Certora CLI**: Latest version (8.3.1)

## Benefits

- **Cross-platform compatibility**: Works on Windows, macOS, and Linux
- **Isolated environment**: No conflicts with host system dependencies
- **Reproducible builds**: Consistent environment across different machines
- **Easy cleanup**: Remove container when done

## Troubleshooting

If you encounter issues:

1. **Build failures**: Check Docker Desktop is running
2. **Permission issues**: Ensure Docker has proper permissions
3. **Volume mounting**: Verify the project directory is accessible
4. **Java errors**: The Docker environment uses Java 19 which resolves Windows file locking issues

## Development

To modify the Docker environment:

1. Edit `Dockerfile.certora` for base image changes
2. Update `docker-compose.certora.yml` for service configuration
3. Modify `.dockerignore` to exclude additional files from build context
4. Test changes with `npm run certora:docker:build`
