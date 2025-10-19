/**
 * HealthChecker Component Test Suite
 *
 * Demonstrates all HealthChecker features:
 * - Plugin health validation
 * - Manifest integrity checks
 * - Directory structure validation
 * - Version compatibility (add-ons)
 * - Dependency validation
 * - Auto-repair functionality
 * - Cache management
 *
 * @module tests/health-checker-test
 */

import { HealthChecker } from '../tools/workspace/health-checker.mjs';
import { PluginRegistry } from '../tools/workspace/registry-manager.mjs';
import fs from 'fs/promises';
import path from 'path';

// Test workspace path
const TEST_WORKSPACE = '.aiwg-test';
const REGISTRY_PATH = path.join(TEST_WORKSPACE, 'frameworks', 'registry.json');

/**
 * Setup test environment
 */
async function setup() {
  console.log('Setting up test environment...');

  // Clean up any existing test workspace
  try {
    await fs.rm(TEST_WORKSPACE, { recursive: true, force: true });
  } catch {
    // Ignore errors
  }

  // Create test workspace
  await fs.mkdir(TEST_WORKSPACE, { recursive: true });

  // Initialize registry
  const registry = new PluginRegistry(REGISTRY_PATH);
  await registry.initialize();

  // Create test framework
  await registry.addPlugin({
    id: 'test-framework',
    type: 'framework',
    name: 'Test Framework',
    version: '1.0.0',
    'install-date': new Date().toISOString(),
    'repo-path': 'frameworks/test-framework/repo/',
    projects: [],
    health: 'unknown'
  });

  // Create framework directories and manifest
  const frameworkDir = path.join(TEST_WORKSPACE, 'frameworks', 'test-framework');
  await fs.mkdir(path.join(frameworkDir, 'repo'), { recursive: true });
  await fs.mkdir(path.join(frameworkDir, 'projects'), { recursive: true });

  const manifest = {
    id: 'test-framework',
    version: '1.0.0',
    type: 'framework',
    name: 'Test Framework',
    description: 'Test framework for health checker validation'
  };
  await fs.writeFile(
    path.join(frameworkDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2),
    'utf-8'
  );

  // Create test add-on (healthy)
  await registry.addPlugin({
    id: 'test-addon-healthy',
    type: 'add-on',
    name: 'Test Add-on (Healthy)',
    version: '1.0.0',
    'install-date': new Date().toISOString(),
    'parent-framework': 'test-framework',
    'repo-path': 'add-ons/test-addon-healthy/',
    health: 'unknown'
  });

  // Create add-on directory and manifest
  const addonHealthyDir = path.join(TEST_WORKSPACE, 'add-ons', 'test-addon-healthy');
  await fs.mkdir(addonHealthyDir, { recursive: true });

  const addonManifest = {
    id: 'test-addon-healthy',
    version: '1.0.0',
    type: 'add-on',
    name: 'Test Add-on (Healthy)',
    description: 'Healthy test add-on'
  };
  await fs.writeFile(
    path.join(addonHealthyDir, 'manifest.json'),
    JSON.stringify(addonManifest, null, 2),
    'utf-8'
  );

  // Create test add-on (broken - missing manifest)
  await registry.addPlugin({
    id: 'test-addon-broken',
    type: 'add-on',
    name: 'Test Add-on (Broken)',
    version: '1.0.0',
    'install-date': new Date().toISOString(),
    'parent-framework': 'test-framework',
    'repo-path': 'add-ons/test-addon-broken/',
    health: 'unknown'
  });

  // Create directory but no manifest (to trigger error)
  const addonBrokenDir = path.join(TEST_WORKSPACE, 'add-ons', 'test-addon-broken');
  await fs.mkdir(addonBrokenDir, { recursive: true });

  // Create test extension (missing parent)
  await registry.addPlugin({
    id: 'test-extension-orphan',
    type: 'extension',
    name: 'Test Extension (Orphan)',
    version: '1.0.0',
    'install-date': new Date().toISOString(),
    extends: 'nonexistent-framework',
    'repo-path': 'extensions/test-extension-orphan/',
    health: 'unknown'
  });

  // Create extension directory and manifest
  const extensionDir = path.join(TEST_WORKSPACE, 'extensions', 'test-extension-orphan');
  await fs.mkdir(extensionDir, { recursive: true });

  const extensionManifest = {
    id: 'test-extension-orphan',
    version: '1.0.0',
    type: 'extension',
    name: 'Test Extension (Orphan)',
    description: 'Extension with missing parent framework'
  };
  await fs.writeFile(
    path.join(extensionDir, 'manifest.json'),
    JSON.stringify(extensionManifest, null, 2),
    'utf-8'
  );

  console.log('Test environment ready\n');

  return registry;
}

/**
 * Cleanup test environment
 */
async function cleanup() {
  console.log('\nCleaning up test environment...');
  try {
    await fs.rm(TEST_WORKSPACE, { recursive: true, force: true });
    console.log('Test environment cleaned up');
  } catch (error) {
    console.error('Cleanup failed:', error.message);
  }
}

/**
 * Run all tests
 */
async function runTests() {
  const registry = await setup();
  const checker = new HealthChecker(TEST_WORKSPACE, registry);

  try {
    // Test 1: Check healthy plugin
    console.log('=== TEST 1: Check Healthy Plugin ===');
    const healthyResult = await checker.checkPlugin('test-framework');
    console.log(`Status: ${healthyResult.status}`);
    console.log(`Issues: ${healthyResult.issues.length}`);
    if (healthyResult.issues.length > 0) {
      healthyResult.issues.forEach(issue => {
        console.log(`  [${issue.severity}] ${issue.check}: ${issue.message}`);
      });
    }
    console.log('Expected: HEALTHY\n');

    // Test 2: Check broken plugin (missing manifest)
    console.log('=== TEST 2: Check Broken Plugin (Missing Manifest) ===');
    const brokenResult = await checker.checkPlugin('test-addon-broken');
    console.log(`Status: ${brokenResult.status}`);
    console.log(`Issues: ${brokenResult.issues.length}`);
    brokenResult.issues.forEach(issue => {
      console.log(`  [${issue.severity}] ${issue.check}: ${issue.message}`);
    });
    console.log('Expected: ERROR (missing manifest)\n');

    // Test 3: Check orphan extension (missing parent)
    console.log('=== TEST 3: Check Orphan Extension (Missing Parent) ===');
    const orphanResult = await checker.checkPlugin('test-extension-orphan');
    console.log(`Status: ${orphanResult.status}`);
    console.log(`Issues: ${orphanResult.issues.length}`);
    orphanResult.issues.forEach(issue => {
      console.log(`  [${issue.severity}] ${issue.check}: ${issue.message}`);
    });
    console.log('Expected: ERROR (missing extended framework)\n');

    // Test 4: Check all plugins
    console.log('=== TEST 4: Check All Plugins ===');
    const allResults = await checker.checkAll();
    console.log(`Total plugins: ${allResults.total}`);
    console.log(`Healthy: ${allResults.healthy}`);
    console.log(`Warnings: ${allResults.warnings}`);
    console.log(`Errors: ${allResults.errors}`);
    console.log('\nBreakdown:');
    allResults.results.forEach(result => {
      console.log(`  ${result.pluginId}: ${result.status} (${result.issues.length} issues)`);
    });
    console.log('');

    // Test 5: Generate overall summary
    console.log('=== TEST 5: Overall Summary ===');
    const summary = await checker.generateSummary();
    console.log(`Overall Status: ${summary.overallStatus}`);
    console.log(`Plugins: ${summary.plugins.healthy}/${summary.plugins.total} healthy`);
    console.log(`Issues: ${summary.issues.total} total (${summary.issues.errors} errors, ${summary.issues.warnings} warnings)`);
    console.log('');

    // Test 6: Detailed report
    console.log('=== TEST 6: Detailed Health Report ===');
    const report = await checker.getHealthReport('test-addon-broken');
    console.log(`Plugin: ${report.pluginId}`);
    console.log(`Status: ${report.status}`);
    console.log(`Type: ${report.metadata.type}`);
    console.log(`Parent Framework: ${report.metadata['parent-framework']}`);
    console.log(`Issues Summary: ${report.summary.total} total (${report.summary.errors} errors, ${report.summary.warnings} warnings)`);
    console.log('Detailed Issues:');
    report.issues.forEach((issue, idx) => {
      console.log(`  ${idx + 1}. [${issue.severity}] ${issue.check}`);
      console.log(`     Message: ${issue.message}`);
      if (issue.details) {
        console.log(`     Details: ${JSON.stringify(issue.details)}`);
      }
    });
    console.log('');

    // Test 7: Cache functionality
    console.log('=== TEST 7: Cache Functionality ===');
    const cacheStart = Date.now();
    await checker.checkPlugin('test-framework');
    const firstCheckTime = Date.now() - cacheStart;

    const cacheStart2 = Date.now();
    const cachedResult = checker.getCached('test-framework');
    const cachedCheckTime = Date.now() - cacheStart2;

    console.log(`First check time: ${firstCheckTime}ms`);
    console.log(`Cached check time: ${cachedCheckTime}ms`);
    console.log(`Cache hit: ${cachedResult !== null}`);
    console.log(`Cached result status: ${cachedResult?.status}`);
    console.log('Expected: Cache hit significantly faster\n');

    // Test 8: Auto-repair
    console.log('=== TEST 8: Auto-Repair ===');
    const repairResult = await checker.repairPlugin('test-addon-broken');
    console.log(`Repaired: ${repairResult.repaired}`);
    console.log(`Actions taken: ${repairResult.actions.length}`);
    repairResult.actions.forEach(action => {
      console.log(`  - ${action}`);
    });
    if (repairResult.failures.length > 0) {
      console.log('Failed actions:');
      repairResult.failures.forEach(failure => {
        console.log(`  - ${failure.action}: ${failure.error}`);
      });
    }

    // Verify repair worked
    console.log('\nRe-checking after repair:');
    const afterRepair = await checker.checkPlugin('test-addon-broken');
    console.log(`Status: ${afterRepair.status}`);
    console.log(`Issues: ${afterRepair.issues.length}`);
    console.log('Expected: Fewer issues (manifest created)\n');

    // Test 9: Version compatibility
    console.log('=== TEST 9: Version Compatibility ===');
    const versionCheck = await checker.validateVersionCompatibility('test-addon-healthy');
    console.log(`Valid: ${versionCheck.valid}`);
    console.log(`Issues: ${versionCheck.issues.length}`);
    if (versionCheck.issues.length > 0) {
      versionCheck.issues.forEach(issue => {
        console.log(`  [${issue.severity}] ${issue.message}`);
      });
    }
    console.log('Expected: VALID (compatible versions)\n');

    // Test 10: Dependency validation
    console.log('=== TEST 10: Dependency Validation ===');
    const depCheck = await checker.validateDependencies('test-addon-healthy');
    console.log(`Valid: ${depCheck.valid}`);
    console.log(`Issues: ${depCheck.issues.length}`);
    if (depCheck.issues.length > 0) {
      depCheck.issues.forEach(issue => {
        console.log(`  [${issue.severity}] ${issue.message}`);
      });
    }
    console.log('Expected: VALID (parent framework exists)\n');

    // Test 11: Cache invalidation
    console.log('=== TEST 11: Cache Invalidation ===');
    console.log(`Cache before invalidation: ${checker.getCached('test-framework') !== null}`);
    checker.invalidateCache('test-framework');
    console.log(`Cache after invalidation: ${checker.getCached('test-framework') !== null}`);
    console.log('Expected: Cache miss after invalidation\n');

    // Test 12: Clear all cache
    console.log('=== TEST 12: Clear All Cache ===');
    await checker.checkPlugin('test-framework');
    await checker.checkPlugin('test-addon-healthy');
    console.log(`Cache entries before clear: 2`);
    checker.clearCache();
    console.log(`Cache hit after clear (test-framework): ${checker.getCached('test-framework') !== null}`);
    console.log(`Cache hit after clear (test-addon-healthy): ${checker.getCached('test-addon-healthy') !== null}`);
    console.log('Expected: All cache entries cleared\n');

    console.log('=== ALL TESTS COMPLETED ===');

  } catch (error) {
    console.error('\nTEST FAILED:');
    console.error(error);
  } finally {
    await cleanup();
  }
}

// Run tests
runTests().catch(console.error);
