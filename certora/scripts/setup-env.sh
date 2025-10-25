#!/bin/bash
# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Create .certora_config if it doesn't exist
if [ ! -f certora/.certora_config ]; then
    if [ -z "$CERTORA_KEY" ]; then
        echo "Error: CERTORA_KEY not set in .env file"
        exit 1
    fi
    echo "{\"key\": \"$CERTORA_KEY\", \"server\": \"production\", \"prover_version\": \"latest\"}" > certora/.certora_config
    echo "Created certora/.certora_config"
fi

