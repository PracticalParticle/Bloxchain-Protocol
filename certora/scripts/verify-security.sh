#!/bin/bash
source certora/scripts/setup-env.sh
certoraRun certora/conf/AccessControl.conf
certoraRun certora/conf/MetaTransactions.conf

