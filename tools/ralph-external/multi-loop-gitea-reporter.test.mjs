/**
 * Basic tests for MultiLoopGiteaReporter
 *
 * Run with: node tools/ralph-external/multi-loop-gitea-reporter.test.mjs
 */

import { MultiLoopGiteaReporter } from './multi-loop-gitea-reporter.mjs';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import assert from 'assert';

const TEST_DIR = '.aiwg/ralph/gitea-reporter-test';

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
test('MultiLoopGiteaReporter initializes correctly', () => {
  setup();
  const reporter = new MultiLoopGiteaReporter({
    projectRoot: TEST_DIR,
    owner: 'test-owner',
    repo: 'test-repo',
  });

  assert.strictEqual(reporter.projectRoot, TEST_DIR);
  assert.strictEqual(reporter.tracker.owner, 'test-owner');
  assert.strictEqual(reporter.tracker.repo, 'test-repo');
  assert.strictEqual(reporter.issueNumbers.size, 0);
});

// Test: formatLoopComment - progress
test('formatLoopComment() formats progress comment', () => {
  setup();
  const reporter = new MultiLoopGiteaReporter({
    projectRoot: TEST_DIR,
    owner: 'test-owner',
    repo: 'test-repo',
  });

  const comment = reporter.formatLoopComment('test-loop-001', {
    type: 'progress',
    iteration: 3,
    maxIterations: 10,
    status: 'running',
    analysis: {
      learnings: 'Fixed bugs in auth module',
      artifactsModified: ['src/auth.ts', 'test/auth.test.ts'],
      nextApproach: 'Add integration tests',
    },
  });

  assert.ok(comment.includes('test-loop-001'));
  assert.ok(comment.includes('Iteration 3/10'));
  assert.ok(comment.includes('running'));
  assert.ok(comment.includes('Fixed bugs in auth module'));
  assert.ok(comment.includes('src/auth.ts'));
  assert.ok(comment.includes('Add integration tests'));
});

// Test: formatLoopComment - completion
test('formatLoopComment() formats completion comment', () => {
  setup();
  const reporter = new MultiLoopGiteaReporter({
    projectRoot: TEST_DIR,
    owner: 'test-owner',
    repo: 'test-repo',
  });

  const comment = reporter.formatLoopComment('test-loop-002', {
    type: 'completion',
    success: true,
    iterations: 5,
    reason: 'All tests passing',
  });

  assert.ok(comment.includes('test-loop-002'));
  assert.ok(comment.includes('Loop Completed'));
  assert.ok(comment.includes('SUCCESS'));
  assert.ok(comment.includes('All tests passing'));
});

// Test: formatLoopComment - crash
test('formatLoopComment() formats crash comment', () => {
  setup();
  const reporter = new MultiLoopGiteaReporter({
    projectRoot: TEST_DIR,
    owner: 'test-owner',
    repo: 'test-repo',
  });

  const comment = reporter.formatLoopComment('test-loop-003', {
    type: 'crash',
    error: 'Timeout exceeded',
    stack: 'Error: Timeout\n  at process...',
  });

  assert.ok(comment.includes('test-loop-003'));
  assert.ok(comment.includes('Loop Crashed'));
  assert.ok(comment.includes('Timeout exceeded'));
  assert.ok(comment.includes('Stack Trace'));
});

// Test: getAllLoopsStatus
test('getAllLoopsStatus() reads loop states', () => {
  setup();
  const reporter = new MultiLoopGiteaReporter({
    projectRoot: TEST_DIR,
    owner: 'test-owner',
    repo: 'test-repo',
  });

  // Create mock loop states
  const loopIds = ['test-loop-004', 'test-loop-005'];
  for (const [i, loopId] of loopIds.entries()) {
    const loopDir = join(TEST_DIR, '.aiwg', 'ralph', 'loops', loopId);
    mkdirSync(loopDir, { recursive: true });
    writeFileSync(
      join(loopDir, 'state.json'),
      JSON.stringify({
        loopId,
        status: 'running',
        currentIteration: i + 1,
        maxIterations: 10,
        objective: `Test objective ${i + 1}`,
        startTime: new Date().toISOString(),
        iterations: [],
      })
    );
  }

  const loops = reporter.getAllLoopsStatus();

  assert.strictEqual(loops.length, 2);
  assert.strictEqual(loops[0].loopId, 'test-loop-004');
  assert.strictEqual(loops[0].iteration, 1);
  assert.strictEqual(loops[1].loopId, 'test-loop-005');
  assert.strictEqual(loops[1].iteration, 2);
});

// Test: generateAllLoopsSummary
test('generateAllLoopsSummary() generates summary', () => {
  setup();
  const reporter = new MultiLoopGiteaReporter({
    projectRoot: TEST_DIR,
    owner: 'test-owner',
    repo: 'test-repo',
  });

  // Create mock loop states
  const loopIds = ['test-loop-006', 'test-loop-007'];
  for (const [i, loopId] of loopIds.entries()) {
    const loopDir = join(TEST_DIR, '.aiwg', 'ralph', 'loops', loopId);
    mkdirSync(loopDir, { recursive: true });
    writeFileSync(
      join(loopDir, 'state.json'),
      JSON.stringify({
        loopId,
        status: i === 0 ? 'running' : 'paused',
        currentIteration: i + 2,
        maxIterations: 10,
        objective: `Test objective ${i + 1}`,
        startTime: new Date().toISOString(),
        iterations: [],
      })
    );
  }

  const summary = reporter.generateAllLoopsSummary();

  assert.ok(summary.markdown);
  assert.ok(summary.markdown.includes('Multi-Loop Summary'));
  assert.ok(summary.markdown.includes('test-loop-006'));
  assert.ok(summary.markdown.includes('test-loop-007'));
  assert.strictEqual(summary.totalActive, 1);
  assert.strictEqual(summary.totalPaused, 1);
  assert.strictEqual(summary.loops.length, 2);
});

// Test: formatRecentActivity
test('formatRecentActivity() formats activity log', () => {
  setup();
  const reporter = new MultiLoopGiteaReporter({
    projectRoot: TEST_DIR,
    owner: 'test-owner',
    repo: 'test-repo',
  });

  const loops = [
    {
      loopId: 'test-loop-008',
      iterations: [
        {
          number: 1,
          status: 'completed',
          timestamp: new Date().toISOString(),
        },
      ],
    },
    {
      loopId: 'test-loop-009',
      iterations: [],
    },
  ];

  const activity = reporter.formatRecentActivity(loops);

  assert.ok(activity.includes('test-loop-008'));
  assert.ok(activity.includes('Iteration 1'));
  assert.ok(activity.includes('completed'));
});

// Test: setIssueNumber and getIssueNumber
test('setIssueNumber() and getIssueNumber() manage issue mapping', () => {
  setup();
  const reporter = new MultiLoopGiteaReporter({
    projectRoot: TEST_DIR,
    owner: 'test-owner',
    repo: 'test-repo',
  });

  const loopId = 'test-loop-010';
  const issueNumber = 42;

  // Get before set
  assert.strictEqual(reporter.getIssueNumber(loopId), null);

  // Set
  reporter.setIssueNumber(loopId, issueNumber);

  // Get after set
  assert.strictEqual(reporter.getIssueNumber(loopId), issueNumber);
});

// Cleanup after all tests
cleanup();
console.log('\n=== All MultiLoopGiteaReporter Tests Passed ===\n');
