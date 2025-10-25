#!/bin/bash
set -e

# Setup environment and API key
source certora/scripts/setup-env.sh

echo "Running all Certora verifications on cloud prover..."
echo "Results will be available at: https://prover.certora.com/"

# Run with cloud settings
certoraRun certora/conf/StateAbstraction.conf --cloud
certoraRun certora/conf/StateTransitions.conf --cloud
certoraRun certora/conf/AccessControl.conf --cloud
certoraRun certora/conf/MetaTransactions.conf --cloud

echo "All jobs submitted to cloud prover!"
echo "Check status at: https://prover.certora.com/"

