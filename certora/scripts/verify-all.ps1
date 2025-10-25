# PowerShell script for running all Certora verifications locally
# This script runs all verification configurations locally

# Set error action preference
$ErrorActionPreference = "Stop"

# Add Certora CLI to PATH
$certoraPath = "C:\Users\jack-laptop\AppData\Local\Packages\PythonSoftwareFoundation.Python.3.11_qbz5n2kfra8p0\LocalCache\local-packages\Python311\Scripts"
if (Test-Path $certoraPath) {
    $env:PATH = "$certoraPath;$env:PATH"
}

Write-Host "Running all Certora verifications locally..."

try {
    certoraRun certora/conf/StateAbstraction.conf
    certoraRun certora/conf/StateTransitions.conf
    certoraRun certora/conf/AccessControl.conf
    certoraRun certora/conf/MetaTransactions.conf
    
    Write-Host "All verifications complete!"
} catch {
    Write-Error "Failed to run Certora verification: $_"
    exit 1
}
