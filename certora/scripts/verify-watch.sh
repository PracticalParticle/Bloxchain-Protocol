#!/bin/bash
source certora/scripts/setup-env.sh

echo "Monitoring Certora cloud jobs..."
certora-cli-log --follow

