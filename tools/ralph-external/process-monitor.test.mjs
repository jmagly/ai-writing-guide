/**
 * Basic tests for ProcessMonitor
 *
 * Run with: node tools/ralph-external/process-monitor.test.mjs
 */

import { ProcessMonitor } from './process-monitor.mjs';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import assert from 'assert';

const TEST_DIR = '.aiwg/ralph/monitor-test';

function cleanup() {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }
}

function setup() {
  cleanup();
  mkdirSync(TEST_DIR, { recursive: true });
}

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    console.error(`  ${error.message}`);
    throw error;
  }
}

// Test: Initialization
test('ProcessMonitor initializes correctly', () => {
  setup();
  const monitor = new ProcessMonitor({
    projectRoot: TEST_DIR,
    heartbeatIntervalMs: 1000,
    staleThresholdMs: 2000,
  });

  assert.strictEqual(monitor.projectRoot, TEST_DIR);
  assert.strictEqual(monitor.heartbeatIntervalMs, 1000);
  assert.strictEqual(monitor.staleThresholdMs, 2000);
  assert.strictEqual(monitor.monitoredLoops.size, 0);
});

// Test: isProcessAlive
test('isProcessAlive() detects running process', () => {
  setup();
  const monitor = new ProcessMonitor({ projectRoot: TEST_DIR });

  // Current process should be alive
  assert.strictEqual(monitor.isProcessAlive(process.pid), true);

  // Invalid PIDs
  assert.strictEqual(monitor.isProcessAlive(0), false);
  assert.strictEqual(monitor.isProcessAlive(-1), false);
  assert.strictEqual(monitor.isProcessAlive(null), false);

  // Non-existent process (high PID unlikely to exist)
  assert.strictEqual(monitor.isProcessAlive(999999), false);
});

// Test: parseUptime
test('parseUptime() parses elapsed time correctly', () => {
  setup();
  const monitor = new ProcessMonitor({ projectRoot: TEST_DIR });

  // Seconds only
  assert.strictEqual(monitor.parseUptime('5'), 5);

  // mm:ss
  assert.strictEqual(monitor.parseUptime('1:30'), 90);
  assert.strictEqual(monitor.parseUptime('5:00'), 300);

  // hh:mm:ss
  assert.strictEqual(monitor.parseUptime('1:00:00'), 3600);
  assert.strictEqual(monitor.parseUptime('2:30:45'), 9045);

  // dd-hh:mm:ss
  assert.strictEqual(monitor.parseUptime('1-00:00:00'), 86400);
  assert.strictEqual(monitor.parseUptime('2-12:30:45'), 217845);
});

// Test: parseStatus
test('parseStatus() parses process status correctly', () => {
  setup();
  const monitor = new ProcessMonitor({ projectRoot: TEST_DIR });

  assert.strictEqual(monitor.parseStatus('R'), 'running');
  assert.strictEqual(monitor.parseStatus('S'), 'sleeping');
  assert.strictEqual(monitor.parseStatus('Z'), 'zombie');
  assert.strictEqual(monitor.parseStatus('T'), 'stopped');
  assert.strictEqual(monitor.parseStatus('X'), 'dead');
  assert.strictEqual(monitor.parseStatus('?'), 'unknown');
});

// Test: recordHeartbeat
test('recordHeartbeat() creates heartbeat file', () => {
  setup();
  const monitor = new ProcessMonitor({ projectRoot: TEST_DIR });

  const loopId = 'test-loop-001';
  monitor.recordHeartbeat(loopId, {
    iteration: 5,
    status: 'running',
  });

  const heartbeatFile = join(TEST_DIR, '.aiwg', 'ralph', 'heartbeats', `${loopId}.json`);
  assert.ok(existsSync(heartbeatFile));

  const heartbeat = monitor.getLastHeartbeat(loopId);
  assert.strictEqual(heartbeat.loopId, loopId);
  assert.strictEqual(heartbeat.iteration, 5);
  assert.strictEqual(heartbeat.status, 'running');
  assert.ok(heartbeat.timestamp > 0);
});

// Test: getLastHeartbeat
test('getLastHeartbeat() retrieves heartbeat', () => {
  setup();
  const monitor = new ProcessMonitor({ projectRoot: TEST_DIR });

  const loopId = 'test-loop-002';

  // No heartbeat yet
  assert.strictEqual(monitor.getLastHeartbeat(loopId), null);

  // Record heartbeat
  monitor.recordHeartbeat(loopId, { iteration: 3 });

  // Retrieve heartbeat
  const heartbeat = monitor.getLastHeartbeat(loopId);
  assert.ok(heartbeat);
  assert.strictEqual(heartbeat.loopId, loopId);
  assert.strictEqual(heartbeat.iteration, 3);
});

// Test: isStale
test('isStale() detects stale heartbeats', () => {
  setup();
  const monitor = new ProcessMonitor({
    projectRoot: TEST_DIR,
    staleThresholdMs: 100, // 100ms threshold
  });

  const loopId = 'test-loop-003';

  // No heartbeat = stale
  assert.strictEqual(monitor.isStale(loopId), true);

  // Fresh heartbeat
  monitor.recordHeartbeat(loopId);
  assert.strictEqual(monitor.isStale(loopId), false);

  // Test with custom threshold overrides
  assert.strictEqual(monitor.isStale(loopId, -1), true); // negative threshold = always stale
  assert.strictEqual(monitor.isStale(loopId, 10000), false); // 10s threshold = not stale
});

// Test: startMonitoring
test('startMonitoring() initializes monitoring', () => {
  setup();
  const monitor = new ProcessMonitor({ projectRoot: TEST_DIR });

  // Create mock loop state
  const loopId = 'test-loop-004';
  const loopStateDir = join(TEST_DIR, '.aiwg', 'ralph', 'loops', loopId);
  mkdirSync(loopStateDir, { recursive: true });
  writeFileSync(
    join(loopStateDir, 'state.json'),
    JSON.stringify({ currentPid: process.pid, status: 'running' })
  );

  monitor.startMonitoring([loopId]);

  assert.strictEqual(monitor.monitoredLoops.size, 1);
  assert.ok(monitor.monitoredLoops.has(loopId));

  const monitored = monitor.monitoredLoops.get(loopId);
  assert.strictEqual(monitored.pid, process.pid);

  monitor.stopAll();
});

// Test: stopMonitoring
test('stopMonitoring() removes loop from monitoring', () => {
  setup();
  const monitor = new ProcessMonitor({ projectRoot: TEST_DIR });

  const loopId = 'test-loop-005';
  const loopStateDir = join(TEST_DIR, '.aiwg', 'ralph', 'loops', loopId);
  mkdirSync(loopStateDir, { recursive: true });
  writeFileSync(
    join(loopStateDir, 'state.json'),
    JSON.stringify({ currentPid: process.pid, status: 'running' })
  );

  monitor.startMonitoring([loopId]);
  assert.strictEqual(monitor.monitoredLoops.size, 1);

  monitor.stopMonitoring(loopId);
  assert.strictEqual(monitor.monitoredLoops.size, 0);
});

// Test: getMonitoredLoops
test('getMonitoredLoops() returns monitored loop IDs', () => {
  setup();
  const monitor = new ProcessMonitor({ projectRoot: TEST_DIR });

  const loopIds = ['test-loop-006', 'test-loop-007'];

  for (const loopId of loopIds) {
    const loopStateDir = join(TEST_DIR, '.aiwg', 'ralph', 'loops', loopId);
    mkdirSync(loopStateDir, { recursive: true });
    writeFileSync(
      join(loopStateDir, 'state.json'),
      JSON.stringify({ currentPid: process.pid, status: 'running' })
    );
  }

  monitor.startMonitoring(loopIds);

  const monitored = monitor.getMonitoredLoops();
  assert.strictEqual(monitored.length, 2);
  assert.ok(monitored.includes('test-loop-006'));
  assert.ok(monitored.includes('test-loop-007'));

  monitor.stopAll();
});

// Test: getProcessHealth for current process
test('getProcessHealth() returns metrics for current process', () => {
  setup();
  const monitor = new ProcessMonitor({ projectRoot: TEST_DIR });

  const loopId = 'test-loop-008';
  monitor.monitoredLoops.set(loopId, { pid: process.pid });

  const health = monitor.getProcessHealth(loopId);

  assert.ok(health);
  assert.strictEqual(health.pid, process.pid);
  assert.ok(health.cpu >= 0);
  assert.ok(health.memory >= 0);
  assert.ok(health.uptime >= 0);
  assert.ok(['running', 'sleeping', 'unknown'].includes(health.status));
});

// Test: getProcessHealth for non-existent process
test('getProcessHealth() returns dead status for non-existent process', () => {
  setup();
  const monitor = new ProcessMonitor({ projectRoot: TEST_DIR });

  const loopId = 'test-loop-009';
  monitor.monitoredLoops.set(loopId, { pid: 999999 }); // Non-existent PID

  const health = monitor.getProcessHealth(loopId);

  assert.ok(health);
  assert.strictEqual(health.pid, 999999);
  assert.strictEqual(health.status, 'dead');
  assert.strictEqual(health.cpu, 0);
  assert.strictEqual(health.memory, 0);
  assert.strictEqual(health.uptime, 0);
});

// Test: stopAll
test('stopAll() stops all monitoring', () => {
  setup();
  const monitor = new ProcessMonitor({ projectRoot: TEST_DIR });

  const loopIds = ['test-loop-010', 'test-loop-011'];

  for (const loopId of loopIds) {
    const loopStateDir = join(TEST_DIR, '.aiwg', 'ralph', 'loops', loopId);
    mkdirSync(loopStateDir, { recursive: true });
    writeFileSync(
      join(loopStateDir, 'state.json'),
      JSON.stringify({ currentPid: process.pid, status: 'running' })
    );
  }

  monitor.startMonitoring(loopIds);
  assert.strictEqual(monitor.monitoredLoops.size, 2);

  monitor.stopAll();
  assert.strictEqual(monitor.monitoredLoops.size, 0);
  assert.strictEqual(monitor.heartbeatTimer, null);
});

// Cleanup after all tests
cleanup();
console.log('\n=== All ProcessMonitor Tests Passed ===\n');
