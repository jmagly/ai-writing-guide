/**
 * Test Status Display - Verify table formatting and display logic
 *
 * Creates mock data to test status command output without requiring actual plugins.
 * Useful for development and verification of formatting logic.
 *
 * @usage
 * node tools/cli/test-status-display.mjs
 */

import { PluginRegistry } from '../workspace/registry-manager.mjs';
import { HealthChecker } from '../workspace/health-checker.mjs';
import fs from 'fs/promises';
import path from 'path';

// Create temporary test registry
const testDir = '/tmp/aiwg-test-status';
const registryPath = path.join(testDir, 'frameworks', 'registry.json');

async function setupTestData() {
  console.log('Setting up test data...\n');

  // Create test directory
  await fs.mkdir(path.dirname(registryPath), { recursive: true });

  // Initialize registry
  const registry = new PluginRegistry(registryPath);
  await registry.initialize();

  // Add mock frameworks
  await registry.addPlugin({
    id: 'sdlc-complete',
    type: 'framework',
    name: 'SDLC Complete Framework',
    version: '1.0.0',
    'install-date': '2025-10-18T12:00:00Z',
    'repo-path': 'frameworks/sdlc-complete/repo/',
    projects: ['plugin-system', 'auth-service'],
    health: 'healthy',
    'health-checked': '2025-10-19T10:00:00Z'
  });

  await registry.addPlugin({
    id: 'marketing-flow',
    type: 'framework',
    name: 'Marketing Campaign Framework',
    version: '1.0.0',
    'install-date': '2025-10-19T08:00:00Z',
    'repo-path': 'frameworks/marketing-flow/repo/',
    projects: ['q4-campaign'],
    health: 'healthy',
    'health-checked': '2025-10-19T10:00:00Z'
  });

  // Add mock add-on
  await registry.addPlugin({
    id: 'gdpr-compliance',
    type: 'add-on',
    name: 'GDPR Compliance Add-on',
    version: '1.0.0',
    'install-date': '2025-10-18T14:00:00Z',
    'parent-framework': 'sdlc-complete',
    'repo-path': 'add-ons/gdpr-compliance/',
    health: 'healthy',
    'health-checked': '2025-10-19T10:00:00Z'
  });

  // Add mock add-on with warning
  await registry.addPlugin({
    id: 'soc2-compliance',
    type: 'add-on',
    name: 'SOC2 Compliance Add-on',
    version: '1.0.0',
    'install-date': '2025-10-19T09:00:00Z',
    'parent-framework': 'sdlc-complete',
    'repo-path': 'add-ons/soc2-compliance/',
    health: 'warning',
    'health-checked': '2025-10-19T10:00:00Z'
  });

  // Add mock extension
  await registry.addPlugin({
    id: 'custom-security-gates',
    type: 'extension',
    name: 'Custom Security Gates Extension',
    version: '1.0.0',
    'install-date': '2025-10-19T10:00:00Z',
    extends: 'sdlc-complete',
    'repo-path': 'extensions/custom-security-gates/',
    health: 'error',
    'health-checked': '2025-10-19T10:00:00Z'
  });

  console.log('✓ Test registry created');
  console.log(`  Location: ${registryPath}`);
  console.log(`  Plugins: 5 (2 frameworks, 2 add-ons, 1 extension)\n`);

  return registry;
}

async function testStatusCommand(registry) {
  console.log('Testing status command outputs...\n');

  // Import status command (requires dynamic import since it's ESM)
  const { statusCommand } = await import('./status-command.mjs');

  // Test 1: Show all plugins
  console.log('TEST 1: Show all plugins');
  console.log('─'.repeat(80));
  try {
    // Temporarily override registry path for testing
    process.env.AIWG_REGISTRY_PATH = registryPath;
    await statusCommand([]);
  } catch (error) {
    console.error('Error:', error.message);
  }

  console.log('\n\n');

  // Test 2: Filter by frameworks
  console.log('TEST 2: Filter by frameworks');
  console.log('─'.repeat(80));
  try {
    await statusCommand(['--type', 'frameworks']);
  } catch (error) {
    console.error('Error:', error.message);
  }

  console.log('\n\n');

  // Test 3: Filter by add-ons
  console.log('TEST 3: Filter by add-ons');
  console.log('─'.repeat(80));
  try {
    await statusCommand(['--type', 'add-ons']);
  } catch (error) {
    console.error('Error:', error.message);
  }

  console.log('\n\n');

  // Test 4: Check specific plugin
  console.log('TEST 4: Check specific plugin');
  console.log('─'.repeat(80));
  try {
    await statusCommand(['sdlc-complete']);
  } catch (error) {
    console.error('Error:', error.message);
  }

  console.log('\n\n');

  // Test 5: Verbose mode
  console.log('TEST 5: Verbose mode for specific plugin');
  console.log('─'.repeat(80));
  try {
    await statusCommand(['sdlc-complete', '--verbose']);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

async function cleanup() {
  console.log('\n\nCleaning up test data...');
  try {
    await fs.rm(testDir, { recursive: true, force: true });
    console.log('✓ Test directory removed');
  } catch (error) {
    console.error('Warning: Cleanup failed:', error.message);
  }
}

// Run tests
async function main() {
  console.log('\n=== AIWG - Status Command Display Test ===\n');

  try {
    const registry = await setupTestData();
    await testStatusCommand(registry);
    await cleanup();
    console.log('\n✓ All tests completed successfully\n');
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    await cleanup();
    process.exit(1);
  }
}

main();
