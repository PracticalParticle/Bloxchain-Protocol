#!/bin/bash

# Certora Docker Runner Script
# This script runs Certora verification inside a Docker container

echo "🐳 Starting Certora Docker Environment..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop."
    exit 1
fi

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
    echo "✅ Loaded environment variables from .env"
else
    echo "⚠️  No .env file found. Make sure CERTORA_KEY is set."
fi

# Build the Docker image if it doesn't exist
if ! docker image inspect certora-dev > /dev/null 2>&1; then
    echo "🔨 Building Certora Docker image..."
    docker-compose -f docker-compose.certora.yml build
fi

# Run the container
echo "🚀 Starting Certora container..."
docker-compose -f docker-compose.certora.yml up -d

# Execute Certora commands inside the container
echo "🔍 Running Certora verification..."
docker-compose -f docker-compose.certora.yml exec certora bash -c "
    echo '📋 Environment check:'
    echo 'Java version:' \$(java -version 2>&1 | head -n 1)
    echo 'Python version:' \$(python3 --version)
    echo 'Solidity version:' \$(solc --version | head -n 1)
    echo 'Certora CLI version:' \$(certoraRun --version 2>&1 | head -n 1)
    echo ''
    echo '🧪 Testing minimal configuration...'
    certoraRun certora/test-minimal.conf
"

echo "✅ Certora verification completed!"
echo "📊 Check the output above for results."
