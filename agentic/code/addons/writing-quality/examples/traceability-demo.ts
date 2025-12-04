/**
 * Traceability System Demonstration
 *
 * This script demonstrates the Requirements Traceability System
 * by scanning the AI Writing Guide project and generating reports.
 */

import { TraceabilityChecker } from '../src/traceability/traceability-checker.js';

async function main() {
  console.log('='.repeat(60));
  console.log('Requirements Traceability System - Demonstration');
  console.log('='.repeat(60));
  console.log();

  // Initialize checker
  const projectPath = '/home/manitcor/dev/ai-writing-guide';
  const checker = new TraceabilityChecker(projectPath);

  // Step 1: Scan project
  console.log('Step 1: Scanning project...');
  const scan = await checker.scanAll();
  console.log(`  ✓ Scanned ${scan.requirements.size} requirements`);
  console.log(`  ✓ Found ${scan.code.size} code files with requirement IDs`);
  console.log(`  ✓ Found ${scan.tests.size} test files with requirement IDs`);
  console.log(`  ✓ Scan completed in ${scan.scanTime.toFixed(2)}ms`);
  console.log();

  // Step 2: Build traceability links
  console.log('Step 2: Building traceability links...');
  const links = await checker.buildTraceabilityLinks();
  console.log(`  ✓ Built ${links.size} traceability links`);
  console.log();

  // Step 3: Calculate coverage
  console.log('Step 3: Calculating coverage...');
  const coverage = await checker.calculateCoverage();
  console.log(`  ✓ Overall coverage: ${coverage.percentage.toFixed(1)}%`);
  console.log(`  ✓ P0 coverage: ${coverage.byPriority.get('P0')?.toFixed(1)}%`);
  console.log(`  ✓ P1 coverage: ${coverage.byPriority.get('P1')?.toFixed(1)}%`);
  console.log(`  ✓ P2 coverage: ${coverage.byPriority.get('P2')?.toFixed(1)}%`);
  console.log();

  // Step 4: Detect orphans
  console.log('Step 4: Detecting orphans...');
  const orphans = await checker.detectOrphans();
  console.log(`  ⚠️  Orphaned requirements: ${orphans.orphanedRequirements.length}`);
  console.log(`  ⚠️  Orphaned code files: ${orphans.orphanedCode.length}`);
  console.log(`  ⚠️  Orphaned test files: ${orphans.orphanedTests.length}`);
  console.log();

  // Show first 5 orphaned requirements
  if (orphans.orphanedRequirements.length > 0) {
    console.log('  First 5 orphaned requirements:');
    orphans.orphanedRequirements.slice(0, 5).forEach(reqId => {
      const severity = orphans.severity.get(reqId);
      const emoji = severity === 'critical' ? '🔴' : severity === 'warning' ? '🟡' : '🔵';
      console.log(`    ${emoji} ${reqId} (${severity})`);
    });
    console.log();
  }

  // Step 5: Generate matrix
  console.log('Step 5: Generating traceability matrix...');
  const matrix = await checker.generateMatrix();
  console.log(`  ✓ Matrix: ${matrix.requirements.length} requirements × ${matrix.code.length} code files × ${matrix.tests.length} test files`);
  console.log();

  // Step 6: Export reports
  console.log('Step 6: Exporting reports...');
  const csvPath = await checker.exportMatrix('csv');
  console.log(`  ✓ CSV matrix: ${csvPath}`);

  const mdPath = await checker.exportMatrix('markdown');
  console.log(`  ✓ Markdown matrix: ${mdPath}`);

  const htmlPath = await checker.exportMatrix('html');
  console.log(`  ✓ HTML matrix: ${htmlPath}`);

  const reportPath = await checker.exportReport('markdown');
  console.log(`  ✓ Gap report: ${reportPath}`);
  console.log();

  // Step 7: Validate Construction gate
  console.log('Step 7: Validating Construction gate...');
  const gate = await checker.checkConstructionGate();

  if (gate.passed) {
    console.log('  ✅ Construction gate PASSED');
  } else {
    console.log('  ❌ Construction gate FAILED');
    gate.issues.forEach(issue => console.log(`    - ${issue}`));
  }

  if (gate.warnings.length > 0) {
    console.log('  Warnings:');
    gate.warnings.forEach(warning => console.log(`    ⚠️  ${warning}`));
  }
  console.log();

  // Summary
  console.log('='.repeat(60));
  console.log('Summary');
  console.log('='.repeat(60));
  console.log(`Total requirements: ${scan.requirements.size}`);
  console.log(`Requirements with code: ${Array.from(links.values()).filter(l => l.coverage.hasCode).length}`);
  console.log(`Requirements with tests: ${Array.from(links.values()).filter(l => l.coverage.hasTests).length}`);
  console.log(`Requirements fully traced: ${Array.from(links.values()).filter(l => l.coverage.hasCode && l.coverage.hasTests).length}`);
  console.log();
  console.log(`Coverage: ${coverage.percentage.toFixed(1)}%`);
  console.log(`P0 coverage: ${coverage.byPriority.get('P0')?.toFixed(1) || 'N/A'}%`);
  console.log();
  console.log(`Orphaned requirements: ${orphans.orphanedRequirements.length}`);
  console.log(`Orphaned code: ${orphans.orphanedCode.length}`);
  console.log(`Orphaned tests: ${orphans.orphanedTests.length}`);
  console.log();
  console.log('Reports generated:');
  console.log(`  - ${csvPath}`);
  console.log(`  - ${mdPath}`);
  console.log(`  - ${htmlPath}`);
  console.log(`  - ${reportPath}`);
  console.log();
  console.log('✓ Demonstration complete!');
}

main().catch(console.error);
