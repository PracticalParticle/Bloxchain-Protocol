#!/usr/bin/env node

/**
 * @file count-loc.cjs
 * @description Counts lines of code (LoC) excluding comments for Solidity contracts.
 * Excludes contracts under examples/ and experimental/ directories.
 * @usage node scripts/count-loc.cjs [contracts-path]
 */

const fs = require('fs');
const path = require('path');

/**
 * Removes all comments from Solidity code
 * Handles single-line comments (//), multi-line comments, and NatSpec comments
 */
function removeComments(content) {
    let result = '';
    let i = 0;
    const len = content.length;
    
    while (i < len) {
        // Check for single-line comment
        if (i < len - 1 && content[i] === '/' && content[i + 1] === '/') {
            // Skip to end of line
            while (i < len && content[i] !== '\n') {
                i++;
            }
            // Keep the newline
            if (i < len) {
                result += content[i];
                i++;
            }
        }
        // Check for multi-line comment
        else if (i < len - 1 && content[i] === '/' && content[i + 1] === '*') {
            i += 2; // Skip /*
            // Skip until */
            while (i < len - 1 && !(content[i] === '*' && content[i + 1] === '/')) {
                // If comment contains newline, preserve it (to maintain line count structure)
                if (content[i] === '\n') {
                    result += '\n';
                }
                i++;
            }
            if (i < len - 1) {
                i += 2; // Skip */
            }
        }
        // Regular character
        else {
            result += content[i];
            i++;
        }
    }
    
    return result;
}

/**
 * Counts lines of code (non-empty lines after removing comments)
 */
function countLinesOfCode(content) {
    // Remove comments first
    const withoutComments = removeComments(content);
    
    // Split into lines
    const lines = withoutComments.split('\n');
    
    // Count non-empty lines (after trimming whitespace)
    let loc = 0;
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.length > 0) {
            loc++;
        }
    }
    
    return loc;
}

/** Directories to exclude from LoC statistics (folder name only) */
const EXCLUDED_DIRS = new Set(['examples', 'experimental']);

/**
 * Recursively finds all .sol files in a directory (skips examples and experimental)
 */
function findSolidityFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
            if (EXCLUDED_DIRS.has(file)) continue;
            findSolidityFiles(filePath, fileList);
        } else if (file.endsWith('.sol')) {
            fileList.push(filePath);
        }
    }
    
    return fileList;
}

/**
 * Formats a table row
 */
function formatRow(contract, loc, totalLines) {
    const contractName = path.relative(process.cwd(), contract).replace(/\\/g, '/');
    const locStr = loc.toString().padStart(6);
    const totalStr = totalLines.toString().padStart(6);
    const commentLines = (totalLines - loc).toString().padStart(6);
    const commentPercent = totalLines > 0 
        ? ((totalLines - loc) / totalLines * 100).toFixed(1).padStart(6) + '%'
        : '  0.0%';
    
    return `${contractName.padEnd(70)} | ${locStr} | ${totalStr} | ${commentLines} | ${commentPercent}`;
}

/**
 * Analyzes a contract file in detail
 */
function analyzeContract(filePath, content) {
    const loc = countLinesOfCode(content);
    const allLines = content.split('\n').length;
    const commentLines = allLines - loc;
    const commentPercent = allLines > 0 ? ((commentLines / allLines) * 100).toFixed(1) : '0.0';
    
    // Count imports
    const importMatches = content.match(/^import\s+.*$/gm);
    const importCount = importMatches ? importMatches.length : 0;
    
    // Count contracts/interfaces/libraries
    const contractMatches = content.match(/\b(contract|interface|library)\s+\w+/g);
    const contractCount = contractMatches ? contractMatches.length : 0;
    
    // Count functions (approximate - looks for function keyword)
    const functionMatches = content.match(/\bfunction\s+\w+\s*\(/g);
    const functionCount = functionMatches ? functionMatches.length : 0;
    
    // Count events
    const eventMatches = content.match(/\bevent\s+\w+/g);
    const eventCount = eventMatches ? eventMatches.length : 0;
    
    // Count structs
    const structMatches = content.match(/\bstruct\s+\w+/g);
    const structCount = structMatches ? structMatches.length : 0;
    
    // Count enums
    const enumMatches = content.match(/\benum\s+\w+/g);
    const enumCount = enumMatches ? enumMatches.length : 0;
    
    // Count modifiers
    const modifierMatches = content.match(/\bmodifier\s+\w+/g);
    const modifierCount = modifierMatches ? modifierMatches.length : 0;
    
    // Count errors
    const errorMatches = content.match(/\berror\s+\w+/g);
    const errorCount = errorMatches ? errorMatches.length : 0;
    
    // Get file size
    const fileSize = Buffer.byteLength(content, 'utf8');
    const fileSizeKB = (fileSize / 1024).toFixed(2);
    
    return {
        filePath,
        loc,
        totalLines: allLines,
        commentLines,
        commentPercent,
        importCount,
        contractCount,
        functionCount,
        eventCount,
        structCount,
        enumCount,
        modifierCount,
        errorCount,
        fileSize,
        fileSizeKB
    };
}

/**
 * Generates a detailed report for a single contract
 */
function generateContractReport(analysis, index, total) {
    const contractName = path.relative(process.cwd(), analysis.filePath).replace(/\\/g, '/');
    const fileName = path.basename(analysis.filePath);
    
    console.log('\n' + '═'.repeat(100));
    console.log(`📄 Contract ${index + 1} of ${total}: ${fileName}`);
    console.log(`   Path: ${contractName}`);
    console.log('═'.repeat(100));
    
    console.log('\n📊 Code Metrics:');
    console.log(`   Lines of Code (excluding comments): ${analysis.loc.toLocaleString()}`);
    console.log(`   Total lines (including comments):   ${analysis.totalLines.toLocaleString()}`);
    console.log(`   Comment lines:                      ${analysis.commentLines.toLocaleString()}`);
    console.log(`   Comment percentage:                 ${analysis.commentPercent}%`);
    console.log(`   File size:                          ${analysis.fileSizeKB} KB (${analysis.fileSize.toLocaleString()} bytes)`);
    
    console.log('\n📦 Code Structure:');
    console.log(`   Contracts/Interfaces/Libraries:      ${analysis.contractCount}`);
    console.log(`   Functions:                          ${analysis.functionCount}`);
    console.log(`   Events:                             ${analysis.eventCount}`);
    console.log(`   Structs:                            ${analysis.structCount}`);
    console.log(`   Enums:                              ${analysis.enumCount}`);
    console.log(`   Modifiers:                          ${analysis.modifierCount}`);
    console.log(`   Custom Errors:                      ${analysis.errorCount}`);
    console.log(`   Imports:                            ${analysis.importCount}`);
    
    // Calculate code density
    const avgLocPerFunction = analysis.functionCount > 0 
        ? (analysis.loc / analysis.functionCount).toFixed(1)
        : 'N/A';
    console.log(`   Average LoC per function:            ${avgLocPerFunction}`);
    
    console.log('\n' + '─'.repeat(100));
}

/**
 * Main function
 */
function main() {
    // Parse command line arguments
    const args = process.argv.slice(2);
    
    // Check for help flag
    if (args.includes('--help') || args.includes('-h')) {
        console.log(`
Usage: node scripts/count-loc.cjs [contracts-path] [--output file.txt]

Options:
  contracts-path    Path to contracts directory (default: ./contracts)
  --output, -o     Save full report to file
  --help, -h        Show this help message

Examples:
  node scripts/count-loc.cjs
  node scripts/count-loc.cjs contracts
  node scripts/count-loc.cjs --output loc-report.txt
  node scripts/count-loc.cjs contracts --output report.txt

Note: To save output to file, you can also redirect:
  node scripts/count-loc.cjs > loc-report.txt
`);
        process.exit(0);
    }
    
    let contractsDir = path.join(process.cwd(), 'contracts');
    let outputFile = null;
    
    // Parse arguments
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--output' || args[i] === '-o') {
            if (i + 1 < args.length) {
                outputFile = args[i + 1];
                i++; // Skip next argument as it's the filename
            } else {
                console.error('Error: --output requires a filename');
                process.exit(1);
            }
        } else if (!args[i].startsWith('-')) {
            contractsDir = args[i];
        }
    }
    
    // Capture console output if output file is specified
    let output = '';
    const originalLog = console.log;
    const originalError = console.error;
    if (outputFile) {
        console.log = (...args) => {
            const message = args.map(arg => typeof arg === 'string' ? arg : JSON.stringify(arg)).join(' ') + '\n';
            output += message;
            originalLog(...args); // Still show in console
        };
        console.error = (...args) => {
            const message = args.map(arg => typeof arg === 'string' ? arg : JSON.stringify(arg)).join(' ') + '\n';
            output += message;
            originalError(...args); // Still show in console
        };
    }
    
    if (!fs.existsSync(contractsDir)) {
        console.error(`Error: Directory not found: ${contractsDir}`);
        process.exit(1);
    }
    
    console.log(`\n📊 Counting Lines of Code (excluding comments) in: ${contractsDir}\n`);
    
    // Find all Solidity files
    const solFiles = findSolidityFiles(contractsDir);
    
    if (solFiles.length === 0) {
        console.log('No Solidity files found.');
        // Write output file even when no files found
        if (outputFile) {
            try {
                fs.writeFileSync(outputFile, output, 'utf8');
                originalLog(`\n✅ Report saved to: ${outputFile}`);
            } catch (error) {
                originalError(`Error writing to file ${outputFile}:`, error.message);
                process.exit(1);
            }
            // Restore original console functions
            console.log = originalLog;
            console.error = originalError;
        }
        return;
    }
    
    // Process each file
    const results = [];
    const detailedAnalyses = [];
    let totalLoc = 0;
    let totalLines = 0;
    
    for (const file of solFiles) {
        try {
            const content = fs.readFileSync(file, 'utf8');
            const loc = countLinesOfCode(content);
            const allLines = content.split('\n').length;
            
            const analysis = analyzeContract(file, content);
            detailedAnalyses.push(analysis);
            
            results.push({
                file,
                loc,
                totalLines: allLines
            });
            
            totalLoc += loc;
            totalLines += allLines;
        } catch (error) {
            console.error(`Error processing ${file}:`, error.message);
        }
    }
    
    // Sort by LoC (descending)
    results.sort((a, b) => b.loc - a.loc);
    detailedAnalyses.sort((a, b) => b.loc - a.loc);
    
    // Print summary table first
    console.log('\n📋 Summary Table:\n');
    console.log('─'.repeat(120));
    console.log(
        'Contract'.padEnd(70) + ' | ' +
        'LoC'.padStart(6) + ' | ' +
        'Total'.padStart(6) + ' | ' +
        'Comments'.padStart(6) + ' | ' +
        'Comment %'.padStart(8)
    );
    console.log('─'.repeat(120));
    
    // Print table rows
    for (const result of results) {
        console.log(formatRow(result.file, result.loc, result.totalLines));
    }
    
    // Print footer with totals
    console.log('─'.repeat(120));
    console.log(
        'TOTAL'.padEnd(70) + ' | ' +
        totalLoc.toString().padStart(6) + ' | ' +
        totalLines.toString().padStart(6) + ' | ' +
        (totalLines - totalLoc).toString().padStart(6) + ' | ' +
        (totalLines > 0 
            ? ((totalLines - totalLoc) / totalLines * 100).toFixed(1).padStart(6) + '%'
            : '  0.0%')
    );
    console.log('─'.repeat(120));
    
    // Print overall summary
    console.log(`\n📈 Overall Summary:`);
    console.log(`   Files analyzed: ${results.length}`);
    console.log(`   Total LoC (excluding comments): ${totalLoc.toLocaleString()}`);
    console.log(`   Total lines (including comments): ${totalLines.toLocaleString()}`);
    console.log(`   Comment lines: ${(totalLines - totalLoc).toLocaleString()}`);
    console.log(`   Average LoC per file: ${Math.round(totalLoc / results.length)}`);
    console.log(`   Average comment percentage: ${((totalLines - totalLoc) / totalLines * 100).toFixed(1)}%`);
    
    // Generate detailed per-contract reports
    console.log(`\n\n${'═'.repeat(100)}`);
    console.log('📑 DETAILED PER-CONTRACT REPORTS');
    console.log('═'.repeat(100));
    
    for (let i = 0; i < detailedAnalyses.length; i++) {
        generateContractReport(detailedAnalyses[i], i, detailedAnalyses.length);
    }
    
    // Print final summary
    console.log(`\n\n${'═'.repeat(100)}`);
    console.log('📊 FINAL SUMMARY');
    console.log('═'.repeat(100));
    console.log(`\nTotal Contracts Analyzed: ${results.length}`);
    console.log(`Total Lines of Code: ${totalLoc.toLocaleString()}`);
    console.log(`Total Lines (with comments): ${totalLines.toLocaleString()}`);
    console.log(`Total Comment Lines: ${(totalLines - totalLoc).toLocaleString()}`);
    
    // Calculate totals for code elements
    const totalFunctions = detailedAnalyses.reduce((sum, a) => sum + a.functionCount, 0);
    const totalEvents = detailedAnalyses.reduce((sum, a) => sum + a.eventCount, 0);
    const totalStructs = detailedAnalyses.reduce((sum, a) => sum + a.structCount, 0);
    const totalEnums = detailedAnalyses.reduce((sum, a) => sum + a.enumCount, 0);
    const totalModifiers = detailedAnalyses.reduce((sum, a) => sum + a.modifierCount, 0);
    const totalErrors = detailedAnalyses.reduce((sum, a) => sum + a.errorCount, 0);
    const totalImports = detailedAnalyses.reduce((sum, a) => sum + a.importCount, 0);
    const totalContracts = detailedAnalyses.reduce((sum, a) => sum + a.contractCount, 0);
    
    console.log(`\nCode Elements:`);
    console.log(`   Total Contracts/Interfaces/Libraries: ${totalContracts}`);
    console.log(`   Total Functions: ${totalFunctions}`);
    console.log(`   Total Events: ${totalEvents}`);
    console.log(`   Total Structs: ${totalStructs}`);
    console.log(`   Total Enums: ${totalEnums}`);
    console.log(`   Total Modifiers: ${totalModifiers}`);
    console.log(`   Total Custom Errors: ${totalErrors}`);
    console.log(`   Total Imports: ${totalImports}`);
    console.log(`\n`);
    
    console.log(`💡 Tip: To save full report to file, redirect output:`);
    console.log(`   node scripts/count-loc.cjs > loc-report.txt\n`);
    
    // Write to file if specified
    if (outputFile) {
        try {
            fs.writeFileSync(outputFile, output, 'utf8');
            originalLog(`\n✅ Report saved to: ${outputFile}`);
        } catch (error) {
            originalError(`Error writing to file ${outputFile}:`, error.message);
            process.exit(1);
        }
        // Restore original console functions
        console.log = originalLog;
        console.error = originalError;
    }
}

// Run the script
if (require.main === module) {
    main();
}

module.exports = { countLinesOfCode, removeComments, findSolidityFiles };
