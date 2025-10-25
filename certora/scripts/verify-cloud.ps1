# PowerShell script for running all Certora verifications on cloud prover
# This script sets up the environment and runs all verification configurations

# Set error action preference
$ErrorActionPreference = "Stop"

# Add Certora CLI to PATH
$certoraPath = "C:\Users\jack-laptop\AppData\Local\Packages\PythonSoftwareFoundation.Python.3.11_qbz5n2kfra8p0\LocalCache\local-packages\Python311\Scripts"
if (Test-Path $certoraPath) {
    $env:PATH = "$certoraPath;$env:PATH"
}

# Load environment variables from .env file
if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        if ($_ -match "^([^#][^=]+)=(.*)$") {
            [Environment]::SetEnvironmentVariable($matches[1], $matches[2], "Process")
        }
    }
}

# Check if CERTORA_KEY is set
if (-not $env:CERTORA_KEY) {
    Write-Error "Error: CERTORA_KEY not set in .env file"
    exit 1
}

# Create .certora_config if it doesn't exist
$certoraConfigPath = "certora\.certora_config"
if (-not (Test-Path $certoraConfigPath)) {
    $configContent = @{
        key = $env:CERTORA_KEY
        server = "production"
        prover_version = "latest"
    } | ConvertTo-Json
    
    Set-Content -Path $certoraConfigPath -Value $configContent
    Write-Host "Created $certoraConfigPath"
}

Write-Host "Running all Certora verifications on cloud prover..."
Write-Host "Results will be available at: https://prover.certora.com/"

# Run with cloud settings
try {
    certoraRun certora/conf/StateAbstraction.conf
    certoraRun certora/conf/StateTransitions.conf
    certoraRun certora/conf/AccessControl.conf
    certoraRun certora/conf/MetaTransactions.conf
    
    Write-Host "All jobs submitted to cloud prover!"
    Write-Host "Check status at: https://prover.certora.com/"
} catch {
    Write-Error "Failed to run Certora verification: $_"
    exit 1
}
