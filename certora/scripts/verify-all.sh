#!/bin/bash
set -e

echo "Running all Certora verifications locally..."

certoraRun certora/conf/StateAbstraction.conf
certoraRun certora/conf/StateTransitions.conf
certoraRun certora/conf/AccessControl.conf
certoraRun certora/conf/MetaTransactions.conf

echo "All verifications complete!"

