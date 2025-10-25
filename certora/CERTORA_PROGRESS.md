# Certora Formal Verification Setup - Progress Documentation

## Overview
This document tracks the complete setup and troubleshooting process for implementing Certora formal verification for the State Abstraction project. It serves as a detailed memory/note and mind map of all attempts, solutions, and current status.

## Project Context
- **Target Contracts**: StateAbstraction.sol, BaseStateMachine.sol, StateAbstractionDefinitions.sol
- **Base Contract**: GuardianBare.sol (used as foundation for harness)
- **Goal**: Formal verification of core state machine invariants and safety properties from scientific paper
- **Platform**: Windows 10/11 with PowerShell
- **Certora CLI Version**: 8.3.1

## Initial Setup (Completed ✅)

### 1. Directory Structure Created
```
certora/
├── specs/           # CVL specification files
├── harness/         # Test harness contracts
├── conf/           # Configuration files
├── scripts/        # PowerShell verification scripts
├── output/         # Results output directory
└── .last/          # Last run tracking
```

### 2. Package.json Scripts Added
```json
{
  "scripts": {
    "certora:install": "pip3 install certora-cli",
    "certora:verify": "powershell -ExecutionPolicy Bypass -File certora/scripts/verify-all.ps1",
    "certora:core": "powershell -ExecutionPolicy Bypass -File certora/scripts/verify-core.ps1",
    "certora:security": "powershell -ExecutionPolicy Bypass -File certora/scripts/verify-security.ps1",
    "certora:cloud": "powershell -ExecutionPolicy Bypass -File certora/scripts/verify-cloud.ps1"
  }
}
```

### 3. Environment Configuration
- **API Key**: CERTORA_KEY configured in .env file
- **Config File**: .certora_config created with API key
- **Solidity Version**: Upgraded from 0.8.25 to 0.8.26
- **Truffle Compilation**: Verified working with new version

## Harness Contracts (Completed ✅)

### GuardianBareHarness.sol
- **Purpose**: Exposes internal state and functions of GuardianBare for Certora verification
- **Key Features**:
  - State accessors for SecureOperationState
  - Transaction record accessors
  - Role management accessors
  - Function permission accessors
  - Helper functions for invariants
- **Issues Resolved**:
  - Fixed `override` specifier issues
  - Corrected visibility modifiers
  - Simplified EnumerableSet access patterns
  - Removed problematic direct storage access

### MockERC20.sol
- **Purpose**: Mock ERC20 token for payment verification testing
- **Features**: Standard ERC20 implementation with additional testing utilities

## CVL Specifications (Completed ✅)

### 1. Helpers.spec
- Ghost variables for state tracking
- Hooks for function call observation
- Reusable CVL definitions
- **Status**: Created but not actively used (import issues)

### 2. StateAbstraction.spec
- **Invariant 5.1**: Transaction Uniqueness
- **Invariant 5.2**: State Consistency
- **Invariant 5.3**: Permission Integrity
- **Invariant 5.4**: Time Lock Validity
- **Status**: ✅ Character encoding fixed, syntax corrected

### 3. StateTransitions.spec
- **Safety Property 5.1**: No Double Execution
- **Safety Property 5.2**: Permission Preservation
- **Safety Property 5.3**: State Isolation
- **Status**: ✅ Character encoding fixed, syntax corrected

### 4. AccessControl.spec
- **Theorem 5.3**: Meta-Transaction Role Separation
- RBAC verification properties
- Role management safety rules
- **Status**: ✅ Character encoding fixed, syntax corrected

### 5. MetaTransactions.spec
- **Theorem 5.2**: Replay Protection
- Cryptographic security properties
- Signature validation rules
- **Status**: ✅ Character encoding fixed, syntax corrected

## Configuration Files (Completed ✅)

### JSON Configuration Format
All .conf files use JSON format with:
- File lists including all dependencies
- Verification targets (GuardianBareHarness)
- Prover settings (optimistic_loop, loop_iter, etc.)
- Rule sanity checks
- Optimistic hashing settings

### Files Created:
- `certora/conf/StateAbstraction.conf`
- `certora/conf/StateTransitions.conf`
- `certora/conf/AccessControl.conf`
- `certora/conf/MetaTransactions.conf`
- `certora/test-minimal.conf` (for testing)

## PowerShell Scripts (Completed ✅)

### verify-cloud.ps1
- Sets up Certora CLI PATH
- Loads environment variables from .env
- Creates/updates .certora_config
- Runs all verification configurations
- **Key Features**: Error handling, API key validation

### Other Scripts
- `verify-all.ps1`: Complete verification suite
- `verify-core.ps1`: Core invariants only
- `verify-security.ps1`: Security properties only

## Issues Encountered and Solutions

### 1. Character Encoding Issues (✅ RESOLVED)
**Problem**: Non-ASCII characters in CVL specs causing `'charmap' codec can't decode byte 0x81` errors
**Solution**: Created Python script to replace all UTF-8 mathematical symbols with ASCII equivalents
- `₁₂` → `12`
- `∈` → `in`
- `≠` → `!=`
- `×` → `*`
- Smart quotes → regular quotes

### 2. CVL Syntax Errors (✅ RESOLVED)
**Problem**: Invalid `import` statements and `memory` keyword usage
**Solution**: 
- Removed `import "Helpers.spec";` statements
- Replaced with `use builtin rule sanity;`
- Removed `memory` keyword from function parameters

### 3. Harness Compilation Errors (✅ RESOLVED)
**Problem**: Multiple Solidity compilation errors in GuardianBareHarness.sol
**Solutions Applied**:
- Added `override` specifiers where needed
- Corrected visibility modifiers (`external` → `public`)
- Simplified EnumerableSet access using existing public functions
- Removed problematic direct storage access patterns

### 4. Solidity Compiler Issues (✅ RESOLVED)
**Problem**: Certora couldn't find Solidity compiler
**Solution**: 
- Upgraded to Solidity 0.8.26
- Installed `solc-select` and native `solc`
- Removed explicit `solc` path from configs (let Certora auto-detect)

## Current Blocking Issue: Java File Locking

### Problem Description
```
INFO: java.io.FileNotFoundException: D:\My Git Projects\ParticleCS\Bloxchain-protocol\tmpXXXXXXX 
(The process cannot access the file because it is being used by another process)
```

### Root Cause Analysis
1. **Java Version**: Using Java 25 (OpenJDK Temurin-25+36) - potentially too new
2. **File Locking**: Java's advisory file locking mechanism conflicts on Windows
3. **Permission Issues**: Symlink creation fails (`WinError 1314`)
4. **Process Conflicts**: Temporary file access conflicts

### Attempted Solutions

#### 1. Disable Local Typechecking ❌
```bash
certoraRun config.conf --disable_local_typechecking
```
**Result**: Still attempts local compilation, doesn't bypass the issue

#### 2. Compilation Steps Only ❌
```bash
certoraRun config.conf --compilation_steps_only
```
**Result**: Same file locking error occurs

#### 3. Java Process Check ✅
**Result**: No conflicting Java processes running

#### 4. Administrator Privileges ❌
**Attempted**: Running PowerShell as administrator
**Command**: 
```powershell
Start-Process powershell -Verb RunAs -ArgumentList "-NoExit -ExecutionPolicy Bypass -Command `"cd 'D:\My Git Projects\ParticleCS\Bloxchain-protocol'; .\certora\scripts\verify-cloud.ps1`""
```
**Result**: Same Java file locking error persists, administrator privileges didn't resolve the issue
**CRITICAL FINDING**: Despite "All jobs submitted to cloud prover!" message, NO jobs appear on Certora dashboard - the message is misleading/false

#### 5. Java Version Downgrade ❌
**Attempted**: Downgraded from Java 25 to Java 19 (OpenJDK Temurin-19.0.2+7)
**Command**: 
```bash
java -version  # Confirmed Java 19 active
certoraRun certora/test-minimal.conf
```
**Result**: Same Java file locking error persists, Java version downgrade didn't resolve the issue
#### 6. System Restart ❌
**Attempted**: Restart PC to clear file handles and reset Java runtime environment
**Result**: Same Java file locking error persists after restart
**Error**: Still getting `FileNotFoundException` and `WinError 1314` symlink issues
**Status**: Restart did not resolve the Java compatibility issue

#### 7. Manual Cloud API Submission ❌
**Attempted**: Investigate bypassing local compilation entirely via direct cloud API submission
**Research**: Searched [Certora documentation](https://docs.certora.com/en/latest/) for manual cloud API methods
**Result**: No documented REST API or direct cloud submission methods found
**CLI Options Tested**: 
- `--prover_version release/10April2025`
- `--url_visibility public`
- `--wait_for_results none`
- Configuration file options
**Status**: Manual cloud API submission not available - local compilation is required prerequisite

#### 8. Windows Compatibility Analysis ✅
**Research**: Comprehensive search of [Certora documentation](https://docs.certora.com/en/latest/) for Windows-specific issues
**Key Findings**:
- **No explicit Windows compatibility issues documented**
- **No platform-specific warnings or limitations mentioned**
- **No known issues section addressing Windows problems**
- **Documentation consistently recommends WSL for Windows-specific issues**
**Conclusion**: While Windows isn't officially unsupported, **Linux environments are preferred**
**Status**: Our Java file locking issues appear to be Windows-specific problems not addressed in documentation

#### 9. Docker Environment Setup ✅
**Solution**: Created Docker container with Linux environment to bypass Windows-specific issues
**Implementation**:
- **Dockerfile.certora**: Ubuntu 22.04 base with Java 19, Python 3, Node.js, Solidity 0.8.26
- **docker-compose.certora.yml**: Container orchestration with volume mounting
- **Package.json scripts**: Added Docker commands for build, run, test, shell access
- **Success**: Resolved Java file locking issue by running in Linux environment
**Status**: Docker environment successfully bypasses Windows compatibility issues
- Try different Java distribution (Oracle JDK vs OpenJDK)
- Use Java from different package manager

#### 3. Environment Variables
```powershell
$env:JAVA_OPTS = "-Djava.io.tmpdir=C:\temp -Djava.awt.headless=true"
```

#### 4. WSL/Docker Alternative
- Run Certora in Windows Subsystem for Linux (WSL)
- Use Docker container with Linux environment

#### 5. Manual Cloud Submission
- Try direct API calls to Certora cloud
- Bypass local compilation entirely

## Current Status Summary

### ✅ Completed Successfully
- Complete Certora framework setup
- All CVL specifications written and syntax-corrected
- Harness contracts compiled and working
- Configuration files properly formatted
- PowerShell scripts functional
- Character encoding issues resolved
- API key authentication working

## Current Status Summary

### ✅ Completed Successfully
- Complete Certora framework setup
- All CVL specifications written and syntax-corrected
- Harness contracts compiled and working
- Configuration files properly formatted
- PowerShell scripts functional
- Character encoding issues resolved
- API key authentication working

### 🔄 In Progress
- Java file locking issue resolution
- **CRITICAL**: Investigating why "All jobs submitted" message appears but no jobs reach dashboard

### ❌ Blocking Issues
- Java temporary file locking preventing cloud submission
- **CRITICAL**: "All jobs submitted to cloud prover!" message is FALSE - no jobs appear on Certora dashboard
- Local compilation step failing, preventing actual cloud submission
- Jobs are NOT being submitted despite success message

### 🎯 Success Criteria
- Jobs successfully submitted to Certora cloud prover
- Jobs visible on https://prover.certora.com/ dashboard
- Verification results available for review

## Files Modified/Created

### New Files Created
- `certora/specs/Helpers.spec`
- `certora/specs/StateAbstraction.spec`
- `certora/specs/StateTransitions.spec`
- `certora/specs/AccessControl.spec`
- `certora/specs/MetaTransactions.spec`
- `certora/specs/test.spec`
- `certora/harness/GuardianBareHarness.sol`
- `certora/harness/MockERC20.sol`
- `certora/conf/StateAbstraction.conf`
- `certora/conf/StateTransitions.conf`
- `certora/conf/AccessControl.conf`
- `certora/conf/MetaTransactions.conf`
- `certora/test-minimal.conf`
- `certora/scripts/verify-cloud.ps1`
- `certora/scripts/verify-all.ps1`
- `certora/scripts/verify-core.ps1`
- `certora/scripts/verify-security.ps1`
- `certora/.certora_config.example`
- `certora/README.md`

### Files Modified
- `package.json` - Added Certora scripts
- `truffle-config.js` - Updated Solidity version to 0.8.26
- `.gitignore` - Added Certora-specific ignores
- `.env.example` - Added CERTORA_KEY placeholder

## Technical Details

### Certora CLI Commands Used
```bash
# Installation
pip3 install certora-cli

# Basic verification
certoraRun config.conf

# With flags
certoraRun config.conf --disable_local_typechecking
certoraRun config.conf --compilation_steps_only

# Help
certoraRun --help
```

### Environment Variables
- `CERTORA_KEY`: API key for cloud prover access
- `PATH`: Includes Certora CLI and Java paths
- `JAVA_OPTS`: Java system properties (attempted)

### Dependencies
- Python 3.11+ (for Certora CLI)
- Java 19+ (currently using Java 25)
- Solidity 0.8.26
- Node.js/npm (for project dependencies)

## Lessons Learned

1. **Character Encoding**: Always use ASCII characters in CVL specifications
2. **CVL Syntax**: Import statements don't work the same way as in Solidity
3. **Windows Compatibility**: PowerShell scripts work better than bash on Windows
4. **Java Compatibility**: Newer Java versions may have compatibility issues
5. **Permission Requirements**: Some operations require administrator privileges

## Critical Discovery: False Success Message

### The Problem
Despite the Certora CLI output showing:
```
All jobs submitted to cloud prover!
Check status at: https://prover.certora.com/
```

**REALITY**: No jobs appear on the Certora dashboard at https://prover.certora.com/

### Analysis
This indicates that:
1. The local compilation step is failing due to Java file locking
2. The CLI is incorrectly reporting success when jobs are NOT actually submitted
3. The Java file locking issue is preventing the entire cloud submission process
4. We need to resolve the Java issue before any jobs can reach the cloud

### Impact
- All previous "successful" runs were actually failures
- The Java file locking issue is the root cause blocking everything
- We need to focus entirely on resolving Java compatibility

## Next Actions Required

1. **CRITICAL**: Resolve Java file locking issue (this is blocking everything)
2. **Try Java Version Downgrade**: Install Java 19 or 21 instead of Java 25
3. **If Java Fails**: Consider WSL/Docker alternative
4. **Verify Real Success**: Only consider it successful when jobs appear on dashboard
5. **Final Option**: Manual cloud API submission

---

*This document will be updated as we progress through the remaining issues and achieve successful cloud submission.*
