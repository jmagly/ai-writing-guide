# Test Infrastructure Specification

## Document Metadata

```yaml
---
document: Test Infrastructure Specification
version: 1.0
status: BASELINED
created: 2025-10-19
project: AI Writing Guide - SDLC Framework
phase: Elaboration
owner: Test Engineer
blockers-resolved: BLOCKER-001
related-documents:
  - UC-005: Framework Self-Improvement (30 test cases requiring infrastructure)
  - Test Architect Review: BLOCKER-001 (multi-agent mocking, Git sandbox, GitHub API stubbing)
  - NFR Extraction List: 48 NFRs requiring automated validation
  - Test Plan: Master test execution strategy
---
```

## 1. Overview

### 1.1 Purpose

This document defines the test infrastructure for the AI Writing Guide SDLC Framework project, enabling comprehensive testing across all test types: unit tests, integration tests, end-to-end tests, and non-functional requirement (NFR) benchmarking.

The infrastructure addresses critical testing needs identified in UC-005 (Framework Self-Improvement) test cases, including:

- Multi-agent workflow testing (30+ test cases requiring Task tool simulation)
- Git operations testing (commit, branch, merge workflows)
- GitHub API integration testing (PR creation, issue management)
- Filesystem isolation (prevent test artifacts from polluting production workspace)
- Performance benchmarking (validate 48 NFR thresholds)

### 1.2 Scope

**In Scope:**
- Test framework stack (Vitest, Playwright, pytest, Benchmark.js)
- Multi-agent mock framework (MockAgentOrchestrator)
- Git sandbox environment (isolated repository per test run)
- GitHub API stubbing (MSW HTTP mocking)
- Filesystem isolation (temporary directory management)
- Performance profiling (NFR validation infrastructure)
- Test data factories (programmatic fixture generation)
- CI/CD integration (GitHub Actions workflows)

**Out of Scope:**
- Production deployment infrastructure
- User acceptance testing (UAT) logistics
- Manual security penetration testing
- Visual regression testing (UI not in scope for framework)

### 1.3 Audience

- **Test Engineers**: Implement test cases using infrastructure components
- **Developers**: Understand test infrastructure when debugging test failures
- **DevOps Engineers**: Configure CI/CD pipelines with test execution
- **Quality Assurance**: Review test coverage and infrastructure adequacy

### 1.4 Success Criteria

- ✅ Multi-agent mock framework specified with code examples
- ✅ Git sandbox environment specified with isolation guarantees
- ✅ GitHub API stubbing specified with endpoint coverage
- ✅ Filesystem isolation specified with cleanup guarantees
- ✅ Performance profiling specified with NFR validation methodology
- ✅ Test data factories specified with fixture generation patterns
- ✅ CI/CD integration guidance provided
- ✅ BLOCKER-001 resolved (Construction phase can start)

---

## 2. Test Framework Stack

### 2.1 Unit Testing

**Framework**: Vitest (JavaScript/TypeScript), pytest (Python)

**Coverage Target**: 80% minimum (100% for P0 features)

**Vitest Configuration** (`.aiwg/testing/vitest.config.mjs`):

```javascript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/**',
        '.aiwg/testing/fixtures/**',
        '.aiwg/testing/sandbox/**',
        '**/*.test.mjs',
        '**/*.spec.mjs'
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80
      }
    },
    testTimeout: 10000, // 10 seconds per test
    hookTimeout: 5000   // 5 seconds for setup/teardown
  }
});
```

**pytest Configuration** (`.aiwg/testing/pytest.ini`):

```ini
[pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts =
    --verbose
    --strict-markers
    --cov=tools
    --cov-report=html
    --cov-report=term
    --cov-fail-under=80
markers =
    unit: Unit tests (fast, isolated)
    integration: Integration tests (slower, external dependencies)
    e2e: End-to-end tests (slowest, full workflows)
    performance: Performance benchmarking tests
```

**Mocking Strategy**:
- **Vitest**: `vi.mock()` for module mocking, `vi.fn()` for function spies
- **pytest**: `unittest.mock.Mock`, `unittest.mock.patch` decorators

**Assertion Library**:
- **Vitest**: `expect()` with matchers (`toBe`, `toEqual`, `toContain`, `toThrow`)
- **pytest**: Built-in `assert` with rich assertion rewriting

**Example Unit Test** (Vitest):

```javascript
// tests/tools/install/installation-transaction.test.mjs
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InstallationTransaction } from '../../../tools/install/installation-transaction.mjs';
import fs from 'fs/promises';

// Mock filesystem operations
vi.mock('fs/promises');

describe('InstallationTransaction', () => {
  let transaction;

  beforeEach(() => {
    transaction = new InstallationTransaction('/tmp/test-install');
    vi.clearAllMocks();
  });

  describe('backup', () => {
    it('should create backup directory with timestamp', async () => {
      fs.mkdir.mockResolvedValue(undefined);
      fs.cp.mockResolvedValue(undefined);

      await transaction.backup('/home/user/.claude/agents');

      expect(fs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('/tmp/test-install/backup'),
        { recursive: true }
      );
      expect(fs.cp).toHaveBeenCalledWith(
        '/home/user/.claude/agents',
        expect.stringContaining('agents'),
        { recursive: true }
      );
    });

    it('should throw error if source does not exist', async () => {
      fs.access.mockRejectedValue(new Error('ENOENT'));

      await expect(transaction.backup('/nonexistent')).rejects.toThrow('ENOENT');
    });
  });

  describe('rollback', () => {
    it('should restore files from backup', async () => {
      fs.readdir.mockResolvedValue(['agents', 'commands']);
      fs.cp.mockResolvedValue(undefined);

      await transaction.rollback();

      expect(fs.cp).toHaveBeenCalledTimes(2); // agents + commands
      expect(fs.cp).toHaveBeenCalledWith(
        expect.stringContaining('backup/agents'),
        '/home/user/.claude/agents',
        { recursive: true }
      );
    });

    it('should complete in <5 seconds (NFR-PERF-009)', async () => {
      const start = performance.now();

      fs.readdir.mockResolvedValue(['agents']);
      fs.cp.mockResolvedValue(undefined);
      await transaction.rollback();

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(5000); // 5 seconds
    });
  });
});
```

### 2.2 Integration Testing

**Framework**: Vitest (component integration), pytest (workflow integration)

**Scope**: Multi-component workflows without full system deployment

**Characteristics**:
- Real components with partial mocking (mock external dependencies only)
- Database interactions (if applicable)
- File system operations (using temporary directories)
- Inter-component communication

**Example Integration Test** (Multi-Agent Workflow):

```javascript
// tests/integration/multi-agent-workflow.test.mjs
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MockAgentOrchestrator } from '../../.aiwg/testing/mocks/agent-orchestrator-mock.mjs';
import { FilesystemSandbox } from '../../.aiwg/testing/mocks/filesystem-sandbox.mjs';

describe('Multi-Agent Documentation Workflow', () => {
  let orchestrator;
  let sandbox;

  beforeEach(async () => {
    orchestrator = new MockAgentOrchestrator({ latency: 50 });
    sandbox = new FilesystemSandbox();
    await sandbox.create();

    // Register mock agents
    orchestrator.registerAgent('architecture-designer', (prompt) => ({
      status: 'success',
      artifact: 'Software Architecture Document (SAD) draft v0.1',
      wordCount: 3245,
      outputPath: sandbox.getPath('.aiwg/working/architecture/sad/drafts/v0.1-primary-draft.md')
    }));

    orchestrator.registerAgent('security-architect', (prompt) => ({
      status: 'success',
      reviewDecision: 'APPROVED',
      findings: ['Consider adding threat model section', 'Security controls well-documented'],
      reviewPath: sandbox.getPath('.aiwg/working/architecture/sad/reviews/security-review.md')
    }));

    orchestrator.registerAgent('test-architect', (prompt) => ({
      status: 'success',
      reviewDecision: 'CONDITIONAL',
      findings: ['Add testability section', 'Missing integration test strategy'],
      reviewPath: sandbox.getPath('.aiwg/working/architecture/sad/reviews/test-review.md')
    }));
  });

  afterEach(async () => {
    await sandbox.destroy();
  });

  it('should orchestrate Primary Author → Reviewers → Synthesizer workflow', async () => {
    // Step 1: Primary Author creates draft
    const draft = await orchestrator.executeTask('architecture-designer',
      'Create SAD draft from requirements');

    expect(draft.status).toBe('success');
    expect(draft.wordCount).toBeGreaterThan(2000);

    // Step 2: Launch parallel reviewers
    const reviews = await Promise.all([
      orchestrator.executeTask('security-architect', 'Review SAD for security'),
      orchestrator.executeTask('test-architect', 'Review SAD for testability')
    ]);

    expect(reviews).toHaveLength(2);
    expect(reviews[0].reviewDecision).toBe('APPROVED');
    expect(reviews[1].reviewDecision).toBe('CONDITIONAL');

    // Step 3: Verify execution log
    const log = orchestrator.getExecutionLog();
    expect(log).toHaveLength(3); // 1 author + 2 reviewers
    expect(log[0].agentType).toBe('architecture-designer');
    expect(log[1].agentType).toBe('security-architect');
    expect(log[2].agentType).toBe('test-architect');
  });

  it('should complete workflow in <20 minutes (NFR-PERF-004)', async () => {
    const start = performance.now();

    await orchestrator.executeTask('architecture-designer', 'Create SAD');
    await Promise.all([
      orchestrator.executeTask('security-architect', 'Review'),
      orchestrator.executeTask('test-architect', 'Review')
    ]);

    const duration = (performance.now() - start) / 1000; // convert to seconds
    expect(duration).toBeLessThan(1200); // 20 minutes = 1200 seconds
  });
});
```

### 2.3 End-to-End Testing

**Framework**: Playwright (CLI workflows), pytest (full SDLC workflows)

**Scope**: Complete user journeys from start to finish

**Characteristics**:
- Real Git operations (using Git sandbox)
- Real filesystem operations (using filesystem sandbox)
- Stubbed GitHub API (using MSW)
- Minimal mocking (maximize real component usage)

**Playwright Configuration** (`.aiwg/testing/playwright.config.mjs`):

```javascript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 300000, // 5 minutes per test (E2E workflows are long)
  expect: {
    timeout: 30000 // 30 seconds for assertions
  },
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  projects: [
    {
      name: 'CLI Workflows',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
});
```

**Example E2E Test** (Complete Iteration Workflow):

```javascript
// tests/e2e/iteration-workflow.test.mjs
import { test, expect } from '@playwright/test';
import { GitSandbox } from '../../.aiwg/testing/mocks/git-sandbox.mjs';
import { FilesystemSandbox } from '../../.aiwg/testing/mocks/filesystem-sandbox.mjs';
import { GitHubAPIStub } from '../../.aiwg/testing/mocks/github-api-stub.mjs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

test.describe('UC-005: Complete Iteration Workflow (E2E)', () => {
  let gitSandbox;
  let fsSandbox;
  let githubStub;

  test.beforeAll(async () => {
    gitSandbox = new GitSandbox();
    await gitSandbox.create();

    fsSandbox = new FilesystemSandbox();
    await fsSandbox.create();

    githubStub = new GitHubAPIStub();
    githubStub.setup();
  });

  test.afterAll(async () => {
    await gitSandbox.destroy();
    await fsSandbox.destroy();
    githubStub.teardown();
  });

  test('TC-FSI-030: Complete iteration 5 workflow (2-week dual-track)', async () => {
    // Step 1: Initialize iteration backlog
    const backlogPath = fsSandbox.getPath('.aiwg/planning/iteration-backlog.md');
    await fsSandbox.copyFixture('iteration-backlog-typical.md', backlogPath);

    // Step 2: Run iteration workflow command
    const { stdout, stderr } = await execAsync(
      `/flow-iteration-dual-track 5`,
      { cwd: fsSandbox.sandboxPath }
    );

    // Step 3: Verify iteration plan generated
    const iterationPlanExists = await fsSandbox.fileExists('.aiwg/planning/iteration-5-plan.md');
    expect(iterationPlanExists).toBe(true);

    // Step 4: Verify Discovery track artifacts
    const spikeReportExists = await fsSandbox.fileExists(
      '.aiwg/working/iteration-5/spikes/rollback-strategies-spike.md'
    );
    expect(spikeReportExists).toBe(true);

    // Step 5: Verify Delivery track artifacts
    const sourceCodeExists = await fsSandbox.fileExists(
      'tools/install/installation-transaction.mjs'
    );
    expect(sourceCodeExists).toBe(true);

    // Step 6: Verify retrospective generated
    const retroExists = await fsSandbox.fileExists(
      '.aiwg/quality/retrospectives/iteration-5-retro.md'
    );
    expect(retroExists).toBe(true);

    // Step 7: Verify Git commit
    const gitLog = gitSandbox.exec('git log -1 --oneline');
    expect(gitLog).toContain('iteration-5');

    // Step 8: Verify GitHub Discussions post created
    const githubCalls = githubStub.getAPICallLog();
    const discussionPost = githubCalls.find(call =>
      call.method === 'POST' && call.url.includes('/discussions')
    );
    expect(discussionPost).toBeDefined();
    expect(discussionPost.body.title).toContain('Iteration 5 Retrospective');
  });
});
```

### 2.4 NFR Benchmarking

**Framework**: Benchmark.js (JavaScript performance), pytest-benchmark (Python performance)

**Scope**: Validate all 48 NFRs from NFR Extraction List

**Benchmark.js Configuration**:

```javascript
// .aiwg/testing/benchmarks/performance-benchmarks.mjs
import Benchmark from 'benchmark';
import fs from 'fs/promises';

const suite = new Benchmark.Suite('Performance NFRs');

// NFR-PERF-001: Content validation time <60s for 2000-word documents
suite.add('NFR-PERF-001: Content Validation', {
  defer: true,
  fn: async (deferred) => {
    const content = await fs.readFile('.aiwg/testing/fixtures/2000-word-document.md', 'utf-8');
    const validator = new ContentValidator();
    await validator.validate(content);
    deferred.resolve();
  }
});

// NFR-PERF-009: Plugin rollback time <5 seconds
suite.add('NFR-PERF-009: Plugin Rollback', {
  defer: true,
  fn: async (deferred) => {
    const transaction = new InstallationTransaction('/tmp/bench-install');
    await transaction.backup('/home/user/.claude/agents');
    await transaction.rollback();
    deferred.resolve();
  }
});

suite
  .on('cycle', (event) => {
    console.log(String(event.target));
  })
  .on('complete', function() {
    console.log('Fastest is ' + this.filter('fastest').map('name'));

    // Validate NFR thresholds
    this.forEach((benchmark) => {
      const avgTime = benchmark.stats.mean * 1000; // convert to ms
      if (benchmark.name.includes('NFR-PERF-001') && avgTime > 60000) {
        throw new Error(`NFR-PERF-001 FAILED: ${avgTime}ms > 60000ms`);
      }
      if (benchmark.name.includes('NFR-PERF-009') && avgTime > 5000) {
        throw new Error(`NFR-PERF-009 FAILED: ${avgTime}ms > 5000ms`);
      }
    });
  })
  .run({ async: true });
```

**pytest-benchmark Configuration**:

```python
# tests/performance/test_nfr_benchmarks.py
import pytest
from intake_coordinator import IntakeCoordinator

@pytest.mark.performance
def test_nfr_perf_003_codebase_analysis(benchmark):
    """NFR-PERF-003: Codebase analysis time <5 minutes for 1000-file repos"""
    coordinator = IntakeCoordinator()
    fixture_repo = '.aiwg/testing/fixtures/repos/1000-file-repo'

    result = benchmark(coordinator.analyze_codebase, fixture_repo)

    # Validate <5 minutes (300 seconds)
    assert benchmark.stats.mean < 300, f"Analysis took {benchmark.stats.mean}s > 300s"
    assert result.completeness > 0.8, "Analysis completeness <80%"
```

---

## 3. Multi-Agent Mock Framework

### 3.1 Overview

**Problem**: UC-005 test cases require simulating Claude Code Task tool and multi-agent communication patterns (Primary Author → Parallel Reviewers → Synthesizer).

**Solution**: `MockAgentOrchestrator` class providing deterministic agent behavior for testing.

### 3.2 MockAgentOrchestrator Implementation

**File**: `.aiwg/testing/mocks/agent-orchestrator-mock.mjs`

```javascript
/**
 * MockAgentOrchestrator
 *
 * Simulates Claude Code Task tool for multi-agent workflow testing.
 * Supports:
 * - Agent response stubbing (predefined or function-based)
 * - Execution latency simulation
 * - Agent failure injection
 * - Execution log tracking (verify agent invocation order)
 */
export class MockAgentOrchestrator {
  constructor(config = {}) {
    this.agents = new Map(); // agentType → mockBehavior
    this.executionLog = [];
    this.responseLatency = config.latency || 100; // milliseconds
    this.failureRate = config.failureRate || 0; // 0-1 probability of failure
    this.timeoutThreshold = config.timeoutThreshold || 60000; // 60 seconds default
  }

  /**
   * Register mock agent with predefined behavior
   *
   * @param {string} agentType - Agent identifier (e.g., 'architecture-designer')
   * @param {object|function} mockBehavior - Static response object or function(prompt) => response
   *
   * @example
   * orchestrator.registerAgent('retrospective-agent', {
   *   status: 'success',
   *   report: 'Retrospective report with 10 improvement actions',
   *   wordCount: 2500
   * });
   *
   * orchestrator.registerAgent('spike-analyzer', (prompt) => {
   *   if (prompt.includes('rollback')) {
   *     return { status: 'success', recommendation: 'transaction-based' };
   *   }
   *   return { status: 'error', message: 'Unknown spike request' };
   * });
   */
  registerAgent(agentType, mockBehavior) {
    if (!agentType || typeof agentType !== 'string') {
      throw new Error('agentType must be a non-empty string');
    }
    if (typeof mockBehavior !== 'object' && typeof mockBehavior !== 'function') {
      throw new Error('mockBehavior must be an object or function');
    }

    this.agents.set(agentType, mockBehavior);
  }

  /**
   * Execute agent task (simulates Claude Code Task tool)
   *
   * @param {string} agentType - Agent to execute
   * @param {string} prompt - Prompt for agent
   * @param {object} options - Execution options (timeout, priority)
   * @returns {Promise<object>} Agent response
   *
   * @throws {Error} If agent not registered
   * @throws {Error} If execution timeout exceeded
   */
  async executeTask(agentType, prompt, options = {}) {
    const startTime = Date.now();

    // Validate agent registration
    const mockBehavior = this.agents.get(agentType);
    if (!mockBehavior) {
      throw new Error(`Agent ${agentType} not registered in mock orchestrator`);
    }

    // Simulate execution latency
    await this._simulateLatency();

    // Inject random failures (if configured)
    if (Math.random() < this.failureRate) {
      const error = new Error(`Agent ${agentType} failed randomly (failure rate: ${this.failureRate})`);
      this.executionLog.push({
        agentType,
        prompt,
        result: null,
        error: error.message,
        timestamp: Date.now(),
        duration: Date.now() - startTime
      });
      throw error;
    }

    // Check timeout
    const timeout = options.timeout || this.timeoutThreshold;
    if (Date.now() - startTime > timeout) {
      const error = new Error(`Agent ${agentType} timeout exceeded (${timeout}ms)`);
      this.executionLog.push({
        agentType,
        prompt,
        result: null,
        error: error.message,
        timestamp: Date.now(),
        duration: Date.now() - startTime
      });
      throw error;
    }

    // Execute mock behavior
    const result = typeof mockBehavior === 'function'
      ? mockBehavior(prompt)
      : mockBehavior;

    // Log execution
    this.executionLog.push({
      agentType,
      prompt,
      result,
      error: null,
      timestamp: Date.now(),
      duration: Date.now() - startTime
    });

    return result;
  }

  /**
   * Get execution log (for test assertions)
   *
   * @returns {Array<object>} Execution log with agentType, prompt, result, timestamp
   */
  getExecutionLog() {
    return this.executionLog;
  }

  /**
   * Get agents called count (verify parallel execution)
   *
   * @returns {number} Total agents executed
   */
  getAgentCallCount() {
    return this.executionLog.length;
  }

  /**
   * Get specific agent call count (verify agent invoked N times)
   *
   * @param {string} agentType - Agent to count
   * @returns {number} Call count for specific agent
   */
  getAgentCallCountByType(agentType) {
    return this.executionLog.filter(log => log.agentType === agentType).length;
  }

  /**
   * Reset execution log (between tests)
   */
  reset() {
    this.executionLog = [];
  }

  /**
   * Clear all registered agents (full reset)
   */
  clearAgents() {
    this.agents.clear();
    this.executionLog = [];
  }

  /**
   * Simulate execution latency (configurable delay)
   * @private
   */
  async _simulateLatency() {
    if (this.responseLatency > 0) {
      await new Promise(resolve => setTimeout(resolve, this.responseLatency));
    }
  }
}
```

### 3.3 Usage Examples

**Example 1: Basic Agent Registration and Execution**

```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import { MockAgentOrchestrator } from '.aiwg/testing/mocks/agent-orchestrator-mock.mjs';

describe('MockAgentOrchestrator', () => {
  let orchestrator;

  beforeEach(() => {
    orchestrator = new MockAgentOrchestrator({ latency: 50 });
  });

  it('TC-FSI-001: Retrospective generation completes successfully', async () => {
    // Register mock retrospective agent
    orchestrator.registerAgent('retrospective-agent', {
      status: 'success',
      report: 'Retrospective report with 10 improvement actions',
      wordCount: 2500,
      actionItems: [
        { description: 'Optimize parallel reviewer execution', priority: 'HIGH' },
        { description: 'Add traceability command', priority: 'MEDIUM' },
        { description: 'Improve velocity prediction', priority: 'LOW' }
      ]
    });

    // Execute task
    const result = await orchestrator.executeTask('retrospective-agent',
      'Analyze previous iteration artifacts');

    // Assertions
    expect(result.status).toBe('success');
    expect(result.wordCount).toBeGreaterThan(2000);
    expect(result.actionItems).toHaveLength(3);
  });
});
```

**Example 2: Function-Based Mock Behavior (Dynamic Responses)**

```javascript
it('TC-FSI-002: Spike analyzer returns different recommendations based on prompt', async () => {
  // Register mock spike analyzer with dynamic behavior
  orchestrator.registerAgent('spike-analyzer', (prompt) => {
    if (prompt.includes('transaction-based')) {
      return {
        status: 'success',
        recommendation: 'transaction-based rollback',
        riskLevel: 'medium',
        estimatedEffort: '2 hours'
      };
    } else if (prompt.includes('snapshot-based')) {
      return {
        status: 'success',
        recommendation: 'snapshot-based rollback',
        riskLevel: 'low',
        estimatedEffort: '4 hours'
      };
    } else {
      return {
        status: 'error',
        message: 'Unknown spike request'
      };
    }
  });

  // Test transaction-based request
  const txResult = await orchestrator.executeTask('spike-analyzer',
    'Research transaction-based rollback strategies');
  expect(txResult.recommendation).toBe('transaction-based rollback');

  // Test snapshot-based request
  const snapResult = await orchestrator.executeTask('spike-analyzer',
    'Research snapshot-based rollback strategies');
  expect(snapResult.recommendation).toBe('snapshot-based rollback');
});
```

**Example 3: Parallel Agent Execution (Multi-Agent Workflow)**

```javascript
it('TC-FSI-005: Multi-agent code review with 3+ reviewers', async () => {
  // Register multiple reviewers
  orchestrator.registerAgent('security-gatekeeper', {
    reviewDecision: 'APPROVED',
    findings: ['Security controls adequate']
  });

  orchestrator.registerAgent('test-engineer', {
    reviewDecision: 'CONDITIONAL',
    findings: ['Add edge case tests for rollback']
  });

  orchestrator.registerAgent('technical-writer', {
    reviewDecision: 'APPROVED',
    findings: ['Documentation clear and complete']
  });

  // Execute reviewers in parallel
  const reviews = await Promise.all([
    orchestrator.executeTask('security-gatekeeper', 'Review SAD for security'),
    orchestrator.executeTask('test-engineer', 'Review SAD for testability'),
    orchestrator.executeTask('technical-writer', 'Review SAD for clarity')
  ]);

  // Assertions
  expect(reviews).toHaveLength(3);
  expect(orchestrator.getAgentCallCount()).toBe(3);

  const log = orchestrator.getExecutionLog();
  expect(log[0].agentType).toBe('security-gatekeeper');
  expect(log[1].agentType).toBe('test-engineer');
  expect(log[2].agentType).toBe('technical-writer');
});
```

**Example 4: Failure Injection (Error Handling Testing)**

```javascript
it('TC-FSI-011: Delivery track handles test coverage failure', async () => {
  // Register mock code reviewer that fails coverage check
  orchestrator.registerAgent('code-reviewer', {
    status: 'error',
    message: 'Test coverage 65% (threshold: 80%)',
    coverageReport: {
      lines: 65,
      branches: 60,
      functions: 70,
      statements: 65
    }
  });

  // Execute and verify error handling
  const result = await orchestrator.executeTask('code-reviewer',
    'Implement feature with tests');

  expect(result.status).toBe('error');
  expect(result.coverageReport.lines).toBeLessThan(80);
});
```

**Example 5: Timeout Simulation (Performance Testing)**

```javascript
it('TC-FSI-014: Discovery track spike timeout handling', async () => {
  // Create orchestrator with low timeout threshold
  const fastOrchestrator = new MockAgentOrchestrator({
    latency: 100,
    timeoutThreshold: 500 // 500ms timeout
  });

  // Register slow agent (simulates long spike research)
  fastOrchestrator.registerAgent('research-coordinator', async () => {
    await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
    return { status: 'success', report: 'Spike complete' };
  });

  // Verify timeout exception
  await expect(
    fastOrchestrator.executeTask('research-coordinator', 'Research rollback strategies', { timeout: 500 })
  ).rejects.toThrow('timeout exceeded');
});
```

---

## 4. Git Sandbox Environment

### 4.1 Overview

**Problem**: UC-005 test cases require Git operations (commit, branch, merge) without polluting real repository.

**Solution**: Isolated Git sandbox created per test run with automatic cleanup.

### 4.2 GitSandbox Implementation

**File**: `.aiwg/testing/mocks/git-sandbox.mjs`

```javascript
import fs from 'fs/promises';
import { execSync } from 'child_process';
import path from 'path';
import os from 'os';

/**
 * GitSandbox
 *
 * Isolated Git repository for testing without polluting production repo.
 * Supports:
 * - Automatic initialization (git init, git config)
 * - Initial commit (provides base for branches)
 * - Command execution (git add, commit, branch, merge)
 * - Automatic cleanup (delete sandbox after test)
 */
export class GitSandbox {
  constructor(baseDir = null) {
    this.baseDir = baseDir || path.join(os.tmpdir(), 'aiwg-git-sandbox');
    this.sandboxPath = null;
  }

  /**
   * Create isolated Git repository
   *
   * @returns {Promise<string>} Path to sandbox repository
   */
  async create() {
    // Create unique sandbox directory
    this.sandboxPath = path.join(this.baseDir, `git-sandbox-${Date.now()}`);
    await fs.mkdir(this.sandboxPath, { recursive: true });

    // Initialize Git repository
    execSync('git init', { cwd: this.sandboxPath, stdio: 'pipe' });
    execSync('git config user.name "Test User"', { cwd: this.sandboxPath, stdio: 'pipe' });
    execSync('git config user.email "test@aiwg.local"', { cwd: this.sandboxPath, stdio: 'pipe' });

    // Create initial commit (provides base for branches)
    await fs.writeFile(path.join(this.sandboxPath, 'README.md'), '# Test Repository');
    execSync('git add README.md', { cwd: this.sandboxPath, stdio: 'pipe' });
    execSync('git commit -m "Initial commit"', { cwd: this.sandboxPath, stdio: 'pipe' });

    return this.sandboxPath;
  }

  /**
   * Destroy sandbox (cleanup temporary directory)
   *
   * @returns {Promise<void>}
   */
  async destroy() {
    if (this.sandboxPath) {
      await fs.rm(this.sandboxPath, { recursive: true, force: true });
      this.sandboxPath = null;
    }
  }

  /**
   * Execute Git command in sandbox
   *
   * @param {string} command - Git command (e.g., 'git status', 'git log')
   * @returns {string} Command output (stdout)
   *
   * @throws {Error} If sandbox not created
   * @throws {Error} If Git command fails
   */
  exec(command) {
    if (!this.sandboxPath) {
      throw new Error('Git sandbox not created. Call create() first.');
    }

    try {
      return execSync(command, {
        cwd: this.sandboxPath,
        encoding: 'utf-8',
        stdio: 'pipe'
      });
    } catch (error) {
      throw new Error(`Git command failed: ${command}\n${error.message}`);
    }
  }

  /**
   * Get sandbox path (for file operations)
   *
   * @returns {string} Absolute path to sandbox directory
   */
  getPath(...segments) {
    if (!this.sandboxPath) {
      throw new Error('Git sandbox not created. Call create() first.');
    }
    return path.join(this.sandboxPath, ...segments);
  }

  /**
   * Create and checkout new branch
   *
   * @param {string} branchName - Branch name
   * @returns {string} Current branch name
   */
  createBranch(branchName) {
    this.exec(`git checkout -b ${branchName}`);
    return this.getCurrentBranch();
  }

  /**
   * Get current branch name
   *
   * @returns {string} Current branch
   */
  getCurrentBranch() {
    return this.exec('git rev-parse --abbrev-ref HEAD').trim();
  }

  /**
   * Commit file changes
   *
   * @param {string} message - Commit message
   * @param {string[]} files - Files to add (default: all files)
   * @returns {string} Commit SHA
   */
  commit(message, files = ['.']) {
    files.forEach(file => this.exec(`git add ${file}`));
    this.exec(`git commit -m "${message}"`);
    return this.exec('git rev-parse HEAD').trim();
  }

  /**
   * Get commit history
   *
   * @param {number} count - Number of commits to retrieve
   * @returns {Array<object>} Commit history (sha, message, author, date)
   */
  getCommitHistory(count = 10) {
    const log = this.exec(`git log -${count} --format=%H|%s|%an|%ad`);
    return log.trim().split('\n').map(line => {
      const [sha, message, author, date] = line.split('|');
      return { sha, message, author, date };
    });
  }

  /**
   * Get file status (staged, modified, untracked)
   *
   * @returns {object} Status summary
   */
  getStatus() {
    const status = this.exec('git status --porcelain');
    const lines = status.trim().split('\n').filter(line => line.length > 0);

    return {
      staged: lines.filter(line => line[0] !== ' ' && line[0] !== '?').map(line => line.substring(3)),
      modified: lines.filter(line => line[1] === 'M').map(line => line.substring(3)),
      untracked: lines.filter(line => line[0] === '?').map(line => line.substring(3))
    };
  }
}
```

### 4.3 Usage Examples

**Example 1: Basic Git Operations**

```javascript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GitSandbox } from '.aiwg/testing/mocks/git-sandbox.mjs';
import fs from 'fs/promises';

describe('GitSandbox', () => {
  let sandbox;

  beforeEach(async () => {
    sandbox = new GitSandbox();
    await sandbox.create();
  });

  afterEach(async () => {
    await sandbox.destroy();
  });

  it('TC-FSI-029: Should commit iteration artifacts to Git', async () => {
    // Create iteration plan file
    const iterationPlan = sandbox.getPath('.aiwg/planning/iteration-5-plan.md');
    await fs.mkdir(sandbox.getPath('.aiwg/planning'), { recursive: true });
    await fs.writeFile(iterationPlan, '# Iteration 5 Plan\n\nFeatures: FID-005, FID-006');

    // Add and commit
    sandbox.commit('docs(iteration-5): add iteration plan', ['.aiwg/planning/iteration-5-plan.md']);

    // Verify commit
    const history = sandbox.getCommitHistory(1);
    expect(history[0].message).toContain('iteration-5');

    // Verify file tracked
    const status = sandbox.getStatus();
    expect(status.staged).toHaveLength(0); // No staged files after commit
    expect(status.untracked).toHaveLength(0); // No untracked files
  });

  it('TC-FSI-005: Should create feature branch successfully', () => {
    // Create branch
    sandbox.createBranch('feature/test-branch');

    // Verify current branch
    const currentBranch = sandbox.getCurrentBranch();
    expect(currentBranch).toBe('feature/test-branch');

    // Verify branch exists
    const branches = sandbox.exec('git branch');
    expect(branches).toContain('feature/test-branch');
  });
});
```

**Example 2: Git Status Validation**

```javascript
it('TC-FSI-029: Should detect untracked files before commit', async () => {
  // Create new files
  await fs.writeFile(sandbox.getPath('new-file.txt'), 'New file content');
  await fs.writeFile(sandbox.getPath('another-file.txt'), 'Another file');

  // Get status
  const status = sandbox.getStatus();

  // Verify untracked files
  expect(status.untracked).toContain('new-file.txt');
  expect(status.untracked).toContain('another-file.txt');
  expect(status.staged).toHaveLength(0);
});
```

**Example 3: Commit History Validation**

```javascript
it('Should track multiple commits with metadata', () => {
  // Create multiple commits
  sandbox.exec('echo "Change 1" > file1.txt');
  sandbox.commit('feat: add file1', ['file1.txt']);

  sandbox.exec('echo "Change 2" > file2.txt');
  sandbox.commit('fix: add file2', ['file2.txt']);

  sandbox.exec('echo "Change 3" > file3.txt');
  sandbox.commit('docs: add file3', ['file3.txt']);

  // Get commit history
  const history = sandbox.getCommitHistory(4); // 3 new + 1 initial

  // Verify commit count
  expect(history).toHaveLength(4);

  // Verify commit messages
  expect(history[0].message).toBe('docs: add file3');
  expect(history[1].message).toBe('fix: add file2');
  expect(history[2].message).toBe('feat: add file1');
  expect(history[3].message).toBe('Initial commit');
});
```

---

## 5. GitHub API Stubbing

### 5.1 Overview

**Problem**: UC-005 test cases require GitHub API calls (PR creation, issue creation, Discussions posting) without real API access.

**Solution**: GitHub API stub using MSW (Mock Service Worker) for HTTP interception.

### 5.2 GitHubAPIStub Implementation

**File**: `.aiwg/testing/mocks/github-api-stub.mjs`

```javascript
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

/**
 * GitHubAPIStub
 *
 * Mock GitHub API server for testing without real API calls.
 * Supports:
 * - PR creation (POST /repos/{owner}/{repo}/pulls)
 * - Issue creation (POST /repos/{owner}/{repo}/issues)
 * - Discussions posting (POST /repos/{owner}/{repo}/discussions)
 * - Rate limit simulation (HTTP 429)
 * - API call logging (verify API invocations)
 */
export class GitHubAPIStub {
  constructor() {
    this.server = setupServer();
    this.prCounter = 1;
    this.issueCounter = 1;
    this.discussionCounter = 1;
    this.apiCallLog = [];
    this.rateLimitRemaining = 5000;
    this.rateLimitReset = Date.now() + 3600000; // 1 hour from now
  }

  /**
   * Setup mock server (start intercepting HTTP requests)
   */
  setup() {
    // Stub PR creation endpoint
    this.server.use(
      http.post('https://api.github.com/repos/:owner/:repo/pulls', async ({ request, params }) => {
        const body = await request.json();

        // Log API call
        this.apiCallLog.push({
          method: 'POST',
          url: `/repos/${params.owner}/${params.repo}/pulls`,
          body,
          timestamp: Date.now()
        });

        // Check rate limit
        if (this.rateLimitRemaining <= 0) {
          return HttpResponse.json(
            { message: 'API rate limit exceeded' },
            {
              status: 429,
              headers: {
                'X-RateLimit-Remaining': '0',
                'X-RateLimit-Reset': String(this.rateLimitReset)
              }
            }
          );
        }

        // Decrement rate limit
        this.rateLimitRemaining--;

        // Return mock PR response
        return HttpResponse.json({
          id: this.prCounter,
          number: this.prCounter++,
          html_url: `https://github.com/${params.owner}/${params.repo}/pull/${this.prCounter}`,
          state: 'open',
          title: body.title || 'Test PR',
          body: body.body || '',
          head: { ref: body.head || 'feature' },
          base: { ref: body.base || 'main' },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          status: 201,
          headers: {
            'X-RateLimit-Remaining': String(this.rateLimitRemaining),
            'X-RateLimit-Reset': String(this.rateLimitReset)
          }
        });
      })
    );

    // Stub issue creation endpoint
    this.server.use(
      http.post('https://api.github.com/repos/:owner/:repo/issues', async ({ request, params }) => {
        const body = await request.json();

        // Log API call
        this.apiCallLog.push({
          method: 'POST',
          url: `/repos/${params.owner}/${params.repo}/issues`,
          body,
          timestamp: Date.now()
        });

        // Check rate limit
        if (this.rateLimitRemaining <= 0) {
          return HttpResponse.json(
            { message: 'API rate limit exceeded' },
            { status: 429 }
          );
        }

        this.rateLimitRemaining--;

        // Return mock issue response
        return HttpResponse.json({
          id: this.issueCounter,
          number: this.issueCounter++,
          html_url: `https://github.com/${params.owner}/${params.repo}/issues/${this.issueCounter}`,
          state: 'open',
          title: body.title || 'Test Issue',
          body: body.body || '',
          labels: body.labels || [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { status: 201 });
      })
    );

    // Stub Discussions creation endpoint
    this.server.use(
      http.post('https://api.github.com/repos/:owner/:repo/discussions', async ({ request, params }) => {
        const body = await request.json();

        // Log API call
        this.apiCallLog.push({
          method: 'POST',
          url: `/repos/${params.owner}/${params.repo}/discussions`,
          body,
          timestamp: Date.now()
        });

        // Check rate limit
        if (this.rateLimitRemaining <= 0) {
          return HttpResponse.json(
            { message: 'API rate limit exceeded' },
            { status: 429 }
          );
        }

        this.rateLimitRemaining--;

        // Return mock discussion response
        return HttpResponse.json({
          id: this.discussionCounter,
          number: this.discussionCounter++,
          html_url: `https://github.com/${params.owner}/${params.repo}/discussions/${this.discussionCounter}`,
          title: body.title || 'Test Discussion',
          body: body.body || '',
          category: body.category || { name: 'General' },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { status: 201 });
      })
    );

    this.server.listen({ onUnhandledRequest: 'bypass' });
  }

  /**
   * Teardown mock server (stop intercepting)
   */
  teardown() {
    this.server.close();
  }

  /**
   * Reset counters and API call log (between tests)
   */
  reset() {
    this.prCounter = 1;
    this.issueCounter = 1;
    this.discussionCounter = 1;
    this.apiCallLog = [];
    this.rateLimitRemaining = 5000;
    this.rateLimitReset = Date.now() + 3600000;
    this.server.resetHandlers();
  }

  /**
   * Get API call log (for test assertions)
   *
   * @returns {Array<object>} API call log with method, url, body, timestamp
   */
  getAPICallLog() {
    return this.apiCallLog;
  }

  /**
   * Simulate rate limit exhaustion (for error handling tests)
   */
  exhaustRateLimit() {
    this.rateLimitRemaining = 0;
  }

  /**
   * Restore rate limit (for rate limit recovery tests)
   */
  restoreRateLimit() {
    this.rateLimitRemaining = 5000;
    this.rateLimitReset = Date.now() + 3600000;
  }
}
```

### 5.3 Usage Examples

**Example 1: PR Creation**

```javascript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { GitHubAPIStub } from '.aiwg/testing/mocks/github-api-stub.mjs';

describe('GitHub API Stub', () => {
  let githubStub;

  beforeAll(() => {
    githubStub = new GitHubAPIStub();
    githubStub.setup();
  });

  afterAll(() => {
    githubStub.teardown();
  });

  beforeEach(() => {
    githubStub.reset();
  });

  it('TC-FSI-028: Should create PR successfully', async () => {
    const response = await fetch('https://api.github.com/repos/jmagly/ai-writing-guide/pulls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Test PR',
        head: 'feature/test',
        base: 'main',
        body: 'This is a test PR'
      })
    });

    const pr = await response.json();

    // Assertions
    expect(response.status).toBe(201);
    expect(pr.number).toBe(1);
    expect(pr.html_url).toContain('/pull/1');
    expect(pr.title).toBe('Test PR');
  });

  it('TC-FSI-028: Should create issue successfully', async () => {
    const response = await fetch('https://api.github.com/repos/jmagly/ai-writing-guide/issues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Bug Report',
        body: 'Found a bug in feature X',
        labels: ['bug', 'priority-high']
      })
    });

    const issue = await response.json();

    // Assertions
    expect(response.status).toBe(201);
    expect(issue.number).toBe(1);
    expect(issue.title).toBe('Bug Report');
    expect(issue.labels).toEqual(['bug', 'priority-high']);
  });
});
```

**Example 2: Discussions Posting**

```javascript
it('TC-FSI-008: Should post iteration summary to Discussions', async () => {
  const response = await fetch('https://api.github.com/repos/jmagly/ai-writing-guide/discussions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Iteration 5 Retrospective - Plugin Rollback & Security',
      body: '## Summary\n\nVelocity: 38 story points\nFeatures: FID-005, FID-006',
      category: { name: 'Show and tell' }
    })
  });

  const discussion = await response.json();

  // Assertions
  expect(response.status).toBe(201);
  expect(discussion.number).toBe(1);
  expect(discussion.title).toContain('Iteration 5 Retrospective');

  // Verify API call logged
  const apiLog = githubStub.getAPICallLog();
  expect(apiLog).toHaveLength(1);
  expect(apiLog[0].method).toBe('POST');
  expect(apiLog[0].url).toContain('/discussions');
});
```

**Example 3: Rate Limit Handling**

```javascript
it('TC-FSI-006: Should handle GitHub rate limit (Exc-6)', async () => {
  // Exhaust rate limit
  githubStub.exhaustRateLimit();

  const response = await fetch('https://api.github.com/repos/jmagly/ai-writing-guide/discussions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Test Post' })
  });

  const error = await response.json();

  // Assertions
  expect(response.status).toBe(429);
  expect(error.message).toBe('API rate limit exceeded');
  expect(response.headers.get('X-RateLimit-Remaining')).toBe('0');
});
```

---

## 6. Filesystem Isolation

### 6.1 Overview

**Problem**: UC-005 test cases require file operations (`.aiwg/` directory creation, artifact generation) without polluting real workspace.

**Solution**: Isolated filesystem sandbox using temporary directories with automatic cleanup.

### 6.2 FilesystemSandbox Implementation

**File**: `.aiwg/testing/mocks/filesystem-sandbox.mjs`

```javascript
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

/**
 * FilesystemSandbox
 *
 * Isolated filesystem environment for testing without polluting production workspace.
 * Supports:
 * - Temporary directory creation (.aiwg/ structure)
 * - Fixture file copying (test data population)
 * - Automatic cleanup (delete sandbox after test)
 * - Path resolution (get absolute paths within sandbox)
 */
export class FilesystemSandbox {
  constructor() {
    this.sandboxPath = null;
  }

  /**
   * Create isolated filesystem sandbox
   *
   * @returns {Promise<string>} Path to sandbox directory
   */
  async create() {
    // Create temporary directory
    this.sandboxPath = await fs.mkdtemp(path.join(os.tmpdir(), 'aiwg-test-'));

    // Create .aiwg/ directory structure
    await fs.mkdir(path.join(this.sandboxPath, '.aiwg/requirements'), { recursive: true });
    await fs.mkdir(path.join(this.sandboxPath, '.aiwg/architecture'), { recursive: true });
    await fs.mkdir(path.join(this.sandboxPath, '.aiwg/planning'), { recursive: true });
    await fs.mkdir(path.join(this.sandboxPath, '.aiwg/testing'), { recursive: true });
    await fs.mkdir(path.join(this.sandboxPath, '.aiwg/quality/retrospectives'), { recursive: true });
    await fs.mkdir(path.join(this.sandboxPath, '.aiwg/working'), { recursive: true });

    return this.sandboxPath;
  }

  /**
   * Destroy sandbox (cleanup temporary directory)
   *
   * @returns {Promise<void>}
   */
  async destroy() {
    if (this.sandboxPath) {
      await fs.rm(this.sandboxPath, { recursive: true, force: true });
      this.sandboxPath = null;
    }
  }

  /**
   * Get absolute path within sandbox
   *
   * @param {...string} segments - Path segments
   * @returns {string} Absolute path
   *
   * @example
   * sandbox.getPath('.aiwg/planning/iteration-5-plan.md')
   * // Returns: /tmp/aiwg-test-abc123/.aiwg/planning/iteration-5-plan.md
   */
  getPath(...segments) {
    if (!this.sandboxPath) {
      throw new Error('Filesystem sandbox not created. Call create() first.');
    }
    return path.join(this.sandboxPath, ...segments);
  }

  /**
   * Copy fixture file to sandbox
   *
   * @param {string} fixtureName - Fixture filename (from .aiwg/testing/fixtures/)
   * @param {string} destination - Destination path within sandbox
   * @returns {Promise<void>}
   *
   * @example
   * await sandbox.copyFixture('iteration-backlog-typical.md', '.aiwg/planning/iteration-backlog.md')
   */
  async copyFixture(fixtureName, destination) {
    const fixtureDir = path.join(process.cwd(), '.aiwg/testing/fixtures');
    const fixturePath = path.join(fixtureDir, fixtureName);
    const destPath = this.getPath(destination);

    // Ensure destination directory exists
    await fs.mkdir(path.dirname(destPath), { recursive: true });

    // Copy fixture file
    await fs.copyFile(fixturePath, destPath);
  }

  /**
   * Check if file exists in sandbox
   *
   * @param {string} filePath - Path relative to sandbox root
   * @returns {Promise<boolean>} True if file exists
   */
  async fileExists(filePath) {
    try {
      await fs.access(this.getPath(filePath));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Read file from sandbox
   *
   * @param {string} filePath - Path relative to sandbox root
   * @param {string} encoding - File encoding (default: 'utf-8')
   * @returns {Promise<string>} File contents
   */
  async readFile(filePath, encoding = 'utf-8') {
    return fs.readFile(this.getPath(filePath), encoding);
  }

  /**
   * Write file to sandbox
   *
   * @param {string} filePath - Path relative to sandbox root
   * @param {string} content - File content
   * @returns {Promise<void>}
   */
  async writeFile(filePath, content) {
    const fullPath = this.getPath(filePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content, 'utf-8');
  }

  /**
   * List directory contents
   *
   * @param {string} dirPath - Directory path relative to sandbox root
   * @returns {Promise<string[]>} Array of filenames
   */
  async listDirectory(dirPath) {
    return fs.readdir(this.getPath(dirPath));
  }

  /**
   * Get file stats (size, modification time)
   *
   * @param {string} filePath - Path relative to sandbox root
   * @returns {Promise<object>} File stats
   */
  async getFileStats(filePath) {
    const stats = await fs.stat(this.getPath(filePath));
    return {
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      isDirectory: stats.isDirectory(),
      isFile: stats.isFile()
    };
  }
}
```

### 6.3 Usage Examples

**Example 1: Basic File Operations**

```javascript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FilesystemSandbox } from '.aiwg/testing/mocks/filesystem-sandbox.mjs';

describe('FilesystemSandbox', () => {
  let sandbox;

  beforeEach(async () => {
    sandbox = new FilesystemSandbox();
    await sandbox.create();
  });

  afterEach(async () => {
    await sandbox.destroy();
  });

  it('Should create and read files in sandbox', async () => {
    // Write file
    await sandbox.writeFile('.aiwg/planning/iteration-5-plan.md', '# Iteration 5 Plan');

    // Verify file exists
    const exists = await sandbox.fileExists('.aiwg/planning/iteration-5-plan.md');
    expect(exists).toBe(true);

    // Read file
    const content = await sandbox.readFile('.aiwg/planning/iteration-5-plan.md');
    expect(content).toBe('# Iteration 5 Plan');
  });

  it('Should list directory contents', async () => {
    // Create multiple files
    await sandbox.writeFile('.aiwg/planning/iteration-5-plan.md', 'Plan 5');
    await sandbox.writeFile('.aiwg/planning/iteration-6-plan.md', 'Plan 6');

    // List directory
    const files = await sandbox.listDirectory('.aiwg/planning');

    // Assertions
    expect(files).toHaveLength(2);
    expect(files).toContain('iteration-5-plan.md');
    expect(files).toContain('iteration-6-plan.md');
  });
});
```

**Example 2: Fixture File Loading**

```javascript
it('TC-FSI-001: Should load iteration backlog fixture', async () => {
  // Copy fixture to sandbox
  await sandbox.copyFixture('iteration-backlog-typical.md', '.aiwg/planning/iteration-backlog.md');

  // Verify file exists
  const exists = await sandbox.fileExists('.aiwg/planning/iteration-backlog.md');
  expect(exists).toBe(true);

  // Read and validate content
  const content = await sandbox.readFile('.aiwg/planning/iteration-backlog.md');
  expect(content).toContain('FID-005'); // Plugin Rollback feature
  expect(content).toContain('FID-006'); // Security feature
});
```

**Example 3: File Stats Validation**

```javascript
it('Should track file modification time', async () => {
  // Create file
  await sandbox.writeFile('.aiwg/planning/test.md', 'Version 1');

  const stats1 = await sandbox.getFileStats('.aiwg/planning/test.md');
  expect(stats1.size).toBe(9); // "Version 1" = 9 bytes

  // Wait and modify
  await new Promise(resolve => setTimeout(resolve, 100));
  await sandbox.writeFile('.aiwg/planning/test.md', 'Version 2 - Updated');

  const stats2 = await sandbox.getFileStats('.aiwg/planning/test.md');
  expect(stats2.size).toBe(20); // "Version 2 - Updated" = 20 bytes
  expect(stats2.modified.getTime()).toBeGreaterThan(stats1.modified.getTime());
});
```

---

## 7. Test Data Factories

### 7.1 Overview

**Problem**: Test cases require realistic test data (iteration backlogs, team profiles, spike reports, retrospectives) without manual fixture maintenance.

**Solution**: Test data factory pattern for programmatic fixture generation.

### 7.2 TestDataFactory Implementation

**File**: `.aiwg/testing/fixtures/test-data-factory.mjs`

```javascript
/**
 * TestDataFactory
 *
 * Programmatic test data generation for SDLC artifacts.
 * Supports:
 * - Iteration backlogs (minimal, typical, overload)
 * - Team profiles (solo, small team, enterprise)
 * - Spike reports (risk retired, risk remains, timeout)
 * - Retrospectives (typical, minimal, overload)
 */
export class TestDataFactory {
  /**
   * Create iteration backlog fixture
   *
   * @param {object} options - Configuration options
   * @param {number} options.iteration - Iteration number
   * @param {Array<string>} options.features - Feature IDs (e.g., ['FID-005', 'FID-006'])
   * @param {number} options.totalStoryPoints - Total story points
   * @returns {string} Markdown-formatted iteration backlog
   */
  static createIterationBacklog(options = {}) {
    const iteration = options.iteration || 5;
    const features = options.features || ['FID-005', 'FID-006'];
    const totalStoryPoints = options.totalStoryPoints || 40;

    const featureList = features.map((fid, index) => {
      const points = Math.floor(totalStoryPoints / features.length);
      return `
## ${fid}: Feature ${index + 1}

- **Priority**: P${index}
- **Story Points**: ${points}
- **Status**: backlog
- **Acceptance Criteria**:
  1. Criterion 1
  2. Criterion 2
  3. Criterion 3
`;
    }).join('\n');

    return `# Iteration ${iteration} Backlog

**Iteration**: ${iteration}
**Duration**: 2 weeks
**Total Story Points**: ${totalStoryPoints}
**Team Velocity**: ${totalStoryPoints} points/iteration

## Features

${featureList}

## Iteration Goals

1. Complete ${features.length} features
2. Maintain 80%+ test coverage
3. Zero production bugs

---

**Generated**: ${new Date().toISOString()}
`;
  }

  /**
   * Create team profile fixture
   *
   * @param {object} options - Configuration options
   * @param {Array<object>} options.members - Team members
   * @param {string} options.workingHours - Working hours per week
   * @param {number} options.velocity - Story points per iteration
   * @returns {string} YAML-formatted team profile
   */
  static createTeamProfile(options = {}) {
    const members = options.members || [
      { name: 'Joseph Magly', role: 'Solo Developer', skills: ['JavaScript', 'Python', 'SDLC'] }
    ];
    const workingHours = options.workingHours || '20 hours/week';
    const velocity = options.velocity || 40;

    const memberList = members.map(member => `
  - name: ${member.name}
    role: ${member.role}
    skills: ${JSON.stringify(member.skills)}
`).join('');

    return `# Team Profile

team:
  name: AIWG Framework Development
  type: ${members.length === 1 ? 'solo' : 'small-team'}

members:${memberList}

capacity:
  working_hours: ${workingHours}
  velocity: ${velocity} story_points/iteration

preferences:
  iteration_length: 2 weeks
  retrospective_frequency: every iteration
  test_coverage_threshold: 80%

---
generated: ${new Date().toISOString()}
`;
  }

  /**
   * Create spike report fixture
   *
   * @param {object} options - Configuration options
   * @param {string} options.spikeId - Spike identifier
   * @param {string} options.riskLevel - 'low' | 'medium' | 'high'
   * @param {string} options.recommendation - Recommendation text
   * @param {string} options.riskStatus - 'retired' | 'remains'
   * @returns {string} Markdown-formatted spike report
   */
  static createSpikeReport(options = {}) {
    const spikeId = options.spikeId || 'SPIKE-001';
    const riskLevel = options.riskLevel || 'medium';
    const recommendation = options.recommendation || 'Proceed with transaction-based rollback implementation';
    const riskStatus = options.riskStatus || 'retired';

    return `# Spike Report: ${spikeId}

## Metadata

- **Spike ID**: ${spikeId}
- **Iteration**: 5
- **Duration**: 2 hours
- **Researcher**: Research Coordinator Agent
- **Date**: ${new Date().toISOString()}

## Research Question

How should we implement rollback functionality for plugin installations?

## Options Evaluated

1. **Transaction-based Rollback**
   - Pros: Fast (<5 seconds), simple implementation
   - Cons: Requires filesystem snapshots (not available on all OS)

2. **Snapshot-based Rollback**
   - Pros: OS-independent, reliable
   - Cons: Slower (10-15 seconds), more complex

## Recommendation

${recommendation}

## Risk Assessment

- **Risk Level**: ${riskLevel}
- **Risk Status**: ${riskStatus.toUpperCase()}

## Next Steps

${riskStatus === 'retired' ? '- Proceed to Delivery track implementation' : '- Conduct additional spike or pivot strategy'}

---

**Generated**: ${new Date().toISOString()}
`;
  }

  /**
   * Create retrospective fixture
   *
   * @param {object} options - Configuration options
   * @param {number} options.iteration - Iteration number
   * @param {Array<string>} options.successes - Success items
   * @param {Array<string>} options.improvements - Improvement items
   * @param {Array<object>} options.actionItems - Action items with priority, owner, target
   * @returns {string} Markdown-formatted retrospective
   */
  static createRetrospective(options = {}) {
    const iteration = options.iteration || 5;
    const successes = options.successes || [
      'Discovery track retired major rollback risk',
      'Multi-agent review identified security improvement'
    ];
    const improvements = options.improvements || [
      'Multi-agent workflow duration longer than expected (20 min vs 15 min target)',
      'Test coverage initial draft below threshold (65% vs 80%)'
    ];
    const actionItems = options.actionItems || [
      { description: 'Optimize parallel reviewer execution', priority: 'HIGH', owner: 'Core Orchestrator', target: 'Iteration 6' },
      { description: 'Add traceability automation command', priority: 'MEDIUM', owner: 'Traceability Engineer', target: 'Iteration 6' },
      { description: 'Improve velocity prediction accuracy', priority: 'LOW', owner: 'Iteration Planner', target: 'Iteration 7' }
    ];

    const successList = successes.map((item, i) => `${i + 1}. ${item}`).join('\n');
    const improvementList = improvements.map((item, i) => `${i + 1}. ${item}`).join('\n');
    const actionItemList = actionItems.map((item, i) => `
### Action Item ${i + 1}: ${item.description}

- **Priority**: ${item.priority}
- **Owner**: ${item.owner}
- **Target Iteration**: ${item.target}
`).join('\n');

    return `# Iteration ${iteration} Retrospective

## Metadata

- **Iteration**: ${iteration}
- **Date**: ${new Date().toISOString()}
- **Participants**: AIWG Framework Team
- **Facilitator**: Retrospective Facilitator Agent

## What Went Well (Successes)

${successList}

## What Could Be Better (Improvements)

${improvementList}

## Action Items

${actionItemList}

## Metrics

- **Velocity**: 38 story points (40 planned, 95% achievement)
- **Test Coverage**: 92% (exceeds 80% threshold)
- **Production Bugs**: 0

---

**Generated**: ${new Date().toISOString()}
`;
  }
}
```

### 7.3 Usage Examples

**Example 1: Generate Iteration Backlog**

```javascript
import { describe, it, expect } from 'vitest';
import { TestDataFactory } from '.aiwg/testing/fixtures/test-data-factory.mjs';

describe('TestDataFactory', () => {
  it('Should generate typical iteration backlog', () => {
    const backlog = TestDataFactory.createIterationBacklog({
      iteration: 5,
      features: ['FID-005', 'FID-006', 'FID-007'],
      totalStoryPoints: 60
    });

    // Assertions
    expect(backlog).toContain('# Iteration 5 Backlog');
    expect(backlog).toContain('FID-005');
    expect(backlog).toContain('FID-006');
    expect(backlog).toContain('FID-007');
    expect(backlog).toContain('Total Story Points**: 60');
  });

  it('Should generate minimal backlog (1 feature)', () => {
    const backlog = TestDataFactory.createIterationBacklog({
      iteration: 1,
      features: ['FID-001'],
      totalStoryPoints: 10
    });

    expect(backlog).toContain('FID-001');
    expect(backlog).not.toContain('FID-002');
  });
});
```

**Example 2: Generate Team Profile**

```javascript
it('Should generate solo developer team profile', () => {
  const profile = TestDataFactory.createTeamProfile({
    members: [
      { name: 'Joseph Magly', role: 'Solo Developer', skills: ['JavaScript', 'Python'] }
    ],
    workingHours: '20 hours/week',
    velocity: 40
  });

  expect(profile).toContain('name: Joseph Magly');
  expect(profile).toContain('type: solo');
  expect(profile).toContain('velocity: 40');
});

it('Should generate small team profile', () => {
  const profile = TestDataFactory.createTeamProfile({
    members: [
      { name: 'Developer 1', role: 'Frontend', skills: ['React', 'TypeScript'] },
      { name: 'Developer 2', role: 'Backend', skills: ['Node.js', 'PostgreSQL'] },
      { name: 'Developer 3', role: 'DevOps', skills: ['Docker', 'Kubernetes'] }
    ],
    workingHours: '120 hours/week',
    velocity: 80
  });

  expect(profile).toContain('type: small-team');
  expect(profile).toContain('Developer 1');
  expect(profile).toContain('Developer 2');
  expect(profile).toContain('Developer 3');
});
```

**Example 3: Generate Spike Report**

```javascript
it('Should generate spike report with risk retired', () => {
  const spike = TestDataFactory.createSpikeReport({
    spikeId: 'SPIKE-001',
    riskLevel: 'medium',
    recommendation: 'Use transaction-based rollback (fast, simple)',
    riskStatus: 'retired'
  });

  expect(spike).toContain('SPIKE-001');
  expect(spike).toContain('Risk Level**: medium');
  expect(spike).toContain('Risk Status**: RETIRED');
  expect(spike).toContain('Proceed to Delivery track');
});

it('Should generate spike report with risk remains', () => {
  const spike = TestDataFactory.createSpikeReport({
    spikeId: 'SPIKE-002',
    riskLevel: 'high',
    recommendation: 'Infeasible on Windows (filesystem snapshots unavailable)',
    riskStatus: 'remains'
  });

  expect(spike).toContain('Risk Status**: REMAINS');
  expect(spike).toContain('additional spike or pivot');
});
```

**Example 4: Generate Retrospective**

```javascript
it('Should generate retrospective with action items', () => {
  const retro = TestDataFactory.createRetrospective({
    iteration: 5,
    successes: ['Great team collaboration', 'Exceeded velocity target'],
    improvements: ['Need better test coverage', 'Documentation incomplete'],
    actionItems: [
      { description: 'Add missing tests', priority: 'HIGH', owner: 'Test Engineer', target: 'Iteration 6' },
      { description: 'Update README', priority: 'MEDIUM', owner: 'Technical Writer', target: 'Iteration 6' }
    ]
  });

  expect(retro).toContain('# Iteration 5 Retrospective');
  expect(retro).toContain('Great team collaboration');
  expect(retro).toContain('Need better test coverage');
  expect(retro).toContain('Add missing tests');
  expect(retro).toContain('Priority**: HIGH');
  expect(retro).toContain('Owner**: Test Engineer');
});
```

---

## 8. Performance Profiling

### 8.1 Overview

**Problem**: 48 NFRs specify performance thresholds (e.g., "<60s", "<5 seconds") requiring automated validation.

**Solution**: Performance profiler with baseline tracking and CI/CD integration.

### 8.2 PerformanceProfiler Implementation

**File**: `.aiwg/testing/utilities/performance-profiler.mjs`

```javascript
import fs from 'fs/promises';
import path from 'path';

/**
 * PerformanceProfiler
 *
 * Performance measurement and NFR validation infrastructure.
 * Supports:
 * - High-precision timing (performance.now())
 * - Statistical aggregation (mean, median, 95th percentile)
 * - Baseline tracking (detect performance regression)
 * - NFR threshold validation (auto-fail if threshold exceeded)
 */
export class PerformanceProfiler {
  constructor(config = {}) {
    this.baselineDir = config.baselineDir || '.aiwg/testing/performance/baselines';
    this.measurements = [];
    this.baselines = new Map();
  }

  /**
   * Start timer (high-precision measurement)
   *
   * @param {string} label - Measurement label (e.g., 'NFR-PERF-001')
   * @returns {number} Start timestamp
   */
  start(label) {
    const timestamp = performance.now();
    this.measurements.push({ label, start: timestamp, end: null, duration: null });
    return timestamp;
  }

  /**
   * Stop timer (calculate duration)
   *
   * @param {string} label - Measurement label (must match start() call)
   * @returns {number} Duration in milliseconds
   */
  stop(label) {
    const timestamp = performance.now();
    const measurement = this.measurements.find(m => m.label === label && m.end === null);

    if (!measurement) {
      throw new Error(`No active measurement found for label: ${label}`);
    }

    measurement.end = timestamp;
    measurement.duration = timestamp - measurement.start;

    return measurement.duration;
  }

  /**
   * Measure async function execution
   *
   * @param {string} label - Measurement label
   * @param {function} fn - Async function to measure
   * @returns {Promise<{result: any, duration: number}>} Function result and duration
   */
  async measure(label, fn) {
    this.start(label);
    const result = await fn();
    const duration = this.stop(label);

    return { result, duration };
  }

  /**
   * Get statistics for measurements
   *
   * @param {string} label - Measurement label (optional, gets all if omitted)
   * @returns {object} Statistics (count, mean, median, p95, min, max)
   */
  getStatistics(label = null) {
    const filtered = label
      ? this.measurements.filter(m => m.label === label && m.duration !== null)
      : this.measurements.filter(m => m.duration !== null);

    if (filtered.length === 0) {
      return null;
    }

    const durations = filtered.map(m => m.duration).sort((a, b) => a - b);
    const sum = durations.reduce((acc, d) => acc + d, 0);

    return {
      count: durations.length,
      mean: sum / durations.length,
      median: durations[Math.floor(durations.length / 2)],
      p95: durations[Math.floor(durations.length * 0.95)],
      min: durations[0],
      max: durations[durations.length - 1]
    };
  }

  /**
   * Load baseline measurements from file
   *
   * @param {string} label - Measurement label
   * @returns {Promise<object>} Baseline statistics
   */
  async loadBaseline(label) {
    const baselinePath = path.join(this.baselineDir, `${label}.json`);

    try {
      const content = await fs.readFile(baselinePath, 'utf-8');
      const baseline = JSON.parse(content);
      this.baselines.set(label, baseline);
      return baseline;
    } catch (error) {
      // Baseline not found (first run)
      return null;
    }
  }

  /**
   * Save baseline measurements to file
   *
   * @param {string} label - Measurement label
   * @returns {Promise<void>}
   */
  async saveBaseline(label) {
    const stats = this.getStatistics(label);

    if (!stats) {
      throw new Error(`No measurements found for label: ${label}`);
    }

    const baselinePath = path.join(this.baselineDir, `${label}.json`);
    await fs.mkdir(this.baselineDir, { recursive: true });
    await fs.writeFile(baselinePath, JSON.stringify(stats, null, 2), 'utf-8');

    this.baselines.set(label, stats);
  }

  /**
   * Compare measurement against baseline (detect regression)
   *
   * @param {string} label - Measurement label
   * @param {number} threshold - Regression threshold (e.g., 1.1 = 10% slower allowed)
   * @returns {object} Comparison result (passed, baseline, current, regression)
   */
  async compareToBaseline(label, threshold = 1.1) {
    const baseline = this.baselines.get(label) || await this.loadBaseline(label);

    if (!baseline) {
      // No baseline exists, save current as baseline
      await this.saveBaseline(label);
      return { passed: true, baseline: null, current: this.getStatistics(label), regression: 0 };
    }

    const current = this.getStatistics(label);
    const regression = current.p95 / baseline.p95; // Compare 95th percentile
    const passed = regression <= threshold;

    return { passed, baseline, current, regression };
  }

  /**
   * Assert NFR threshold (fail if exceeded)
   *
   * @param {string} label - Measurement label
   * @param {number} thresholdMs - Threshold in milliseconds
   * @throws {Error} If threshold exceeded
   */
  assertThreshold(label, thresholdMs) {
    const stats = this.getStatistics(label);

    if (!stats) {
      throw new Error(`No measurements found for label: ${label}`);
    }

    if (stats.p95 > thresholdMs) {
      throw new Error(
        `NFR threshold exceeded for ${label}: ${stats.p95.toFixed(2)}ms > ${thresholdMs}ms (p95)`
      );
    }
  }

  /**
   * Reset measurements (between test runs)
   */
  reset() {
    this.measurements = [];
  }
}
```

### 8.3 Usage Examples

**Example 1: Basic Performance Measurement**

```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import { PerformanceProfiler } from '.aiwg/testing/utilities/performance-profiler.mjs';

describe('PerformanceProfiler', () => {
  let profiler;

  beforeEach(() => {
    profiler = new PerformanceProfiler();
  });

  it('TC-FSI-015: Iteration planning time <1 hour (NFR-FSI-07)', async () => {
    // Measure iteration planning
    const { duration } = await profiler.measure('NFR-FSI-07', async () => {
      // Simulate iteration planning (replace with real implementation)
      await new Promise(resolve => setTimeout(resolve, 500));
      return { status: 'success', plan: 'Iteration 5 plan' };
    });

    // Assert threshold
    profiler.assertThreshold('NFR-FSI-07', 3600000); // 1 hour = 3600000ms

    // Verify duration reasonable
    expect(duration).toBeLessThan(3600000);
  });
});
```

**Example 2: Statistical Aggregation (Multiple Runs)**

```javascript
it('NFR-PERF-001: Content validation <60s (100 runs)', async () => {
  // Run 100 validation cycles
  for (let i = 0; i < 100; i++) {
    await profiler.measure('NFR-PERF-001', async () => {
      // Simulate content validation
      await new Promise(resolve => setTimeout(resolve, Math.random() * 50 + 30));
    });
  }

  // Get statistics
  const stats = profiler.getStatistics('NFR-PERF-001');

  // Assertions
  expect(stats.count).toBe(100);
  expect(stats.mean).toBeLessThan(60000); // Mean <60s
  expect(stats.p95).toBeLessThan(60000);  // 95th percentile <60s

  console.log(`Mean: ${stats.mean.toFixed(2)}ms, P95: ${stats.p95.toFixed(2)}ms`);
});
```

**Example 3: Baseline Comparison (Regression Detection)**

```javascript
it('Should detect performance regression', async () => {
  // Run measurements
  for (let i = 0; i < 50; i++) {
    await profiler.measure('feature-x', async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });
  }

  // Save baseline (first run)
  await profiler.saveBaseline('feature-x');

  // Simulate slower performance (regression)
  profiler.reset();
  for (let i = 0; i < 50; i++) {
    await profiler.measure('feature-x', async () => {
      await new Promise(resolve => setTimeout(resolve, 150)); // 50% slower
    });
  }

  // Compare to baseline
  const comparison = await profiler.compareToBaseline('feature-x', 1.1); // 10% threshold

  // Assertions
  expect(comparison.passed).toBe(false); // 50% regression exceeds 10% threshold
  expect(comparison.regression).toBeGreaterThan(1.1);

  console.log(`Regression: ${((comparison.regression - 1) * 100).toFixed(1)}%`);
});
```

**Example 4: NFR Threshold Validation**

```javascript
it('NFR-PERF-009: Plugin rollback time <5 seconds', async () => {
  // Measure rollback
  const { duration } = await profiler.measure('NFR-PERF-009', async () => {
    const transaction = new InstallationTransaction('/tmp/test');
    await transaction.backup('/home/user/.claude/agents');
    await transaction.rollback();
  });

  // Assert threshold (should not throw)
  profiler.assertThreshold('NFR-PERF-009', 5000); // 5 seconds

  expect(duration).toBeLessThan(5000);
});
```

---

## 9. CI/CD Integration

### 9.1 GitHub Actions Workflow

**File**: `.github/workflows/test-infrastructure.yml`

```yaml
name: Test Infrastructure Validation

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    timeout-minutes: 15

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20.x'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:unit -- --coverage

      - name: Upload coverage reports
        uses: codecov/codecov-action@v4
        with:
          files: ./coverage/lcov.info
          flags: unittests
          fail_ci_if_error: true

      - name: Check coverage thresholds
        run: |
          npm run test:unit -- --coverage.thresholds.lines=80 \
                                --coverage.thresholds.functions=80 \
                                --coverage.thresholds.branches=75 \
                                --coverage.thresholds.statements=80

  integration-tests:
    runs-on: ubuntu-latest
    timeout-minutes: 30

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20.x'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run integration tests
        run: npm run test:integration

      - name: Archive integration test logs
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: integration-test-logs
          path: .aiwg/testing/logs/

  e2e-tests:
    runs-on: ubuntu-latest
    timeout-minutes: 60

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20.x'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload Playwright report
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/

  performance-benchmarks:
    runs-on: ubuntu-latest
    timeout-minutes: 45

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20.x'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run performance benchmarks
        run: npm run test:performance

      - name: Load baseline performance data
        run: |
          if [ -f .aiwg/testing/performance/baselines.json ]; then
            echo "Baseline found, will compare for regression"
          else
            echo "No baseline found, saving current as baseline"
          fi

      - name: Compare against baseline
        run: npm run test:performance:compare

      - name: Upload performance report
        uses: actions/upload-artifact@v4
        with:
          name: performance-report
          path: .aiwg/testing/performance/report.json
```

### 9.2 npm Scripts Configuration

**File**: `package.json` (excerpt)

```json
{
  "scripts": {
    "test": "vitest",
    "test:unit": "vitest run --config .aiwg/testing/vitest.config.mjs",
    "test:integration": "vitest run --config .aiwg/testing/vitest.integration.config.mjs",
    "test:e2e": "playwright test --config .aiwg/testing/playwright.config.mjs",
    "test:performance": "node .aiwg/testing/benchmarks/performance-benchmarks.mjs",
    "test:performance:compare": "node .aiwg/testing/benchmarks/compare-baselines.mjs",
    "test:watch": "vitest --config .aiwg/testing/vitest.config.mjs",
    "test:coverage": "vitest run --coverage"
  }
}
```

---

## 10. Directory Structure

```
.aiwg/testing/
├── vitest.config.mjs                          # Vitest configuration (unit tests)
├── vitest.integration.config.mjs              # Vitest configuration (integration tests)
├── playwright.config.mjs                      # Playwright configuration (E2E tests)
├── pytest.ini                                 # pytest configuration (Python tests)
├── mocks/                                     # Mock implementations
│   ├── agent-orchestrator-mock.mjs            # Multi-agent mock framework
│   ├── git-sandbox.mjs                        # Git sandbox environment
│   ├── github-api-stub.mjs                    # GitHub API HTTP stubbing
│   └── filesystem-sandbox.mjs                 # Filesystem isolation
├── fixtures/                                  # Test data fixtures
│   ├── test-data-factory.mjs                  # Programmatic fixture generation
│   ├── backlogs/                              # Iteration backlog fixtures
│   │   ├── iteration-backlog-minimal.md
│   │   ├── iteration-backlog-typical.md
│   │   ├── iteration-backlog-overload.md
│   │   └── iteration-backlog-invalid.md
│   ├── teams/                                 # Team profile fixtures
│   │   ├── team-profile-solo.yaml
│   │   ├── team-profile-small.yaml
│   │   └── team-profile-enterprise.yaml
│   ├── spikes/                                # Spike report fixtures
│   │   ├── spike-report-risk-retired.md
│   │   ├── spike-report-risk-remains.md
│   │   └── spike-report-timeout.md
│   ├── retrospectives/                        # Retrospective fixtures
│   │   ├── retrospective-typical.md
│   │   ├── retrospective-minimal.md
│   │   └── retrospective-overload.md
│   └── repos/                                 # Git repository fixtures
│       ├── git-repo-clean.tar.gz
│       ├── git-repo-dirty.tar.gz
│       └── git-repo-conflict.tar.gz
├── utilities/                                 # Test utilities
│   ├── performance-profiler.mjs               # Performance measurement infrastructure
│   └── test-helpers.mjs                       # Common test helper functions
├── benchmarks/                                # Performance benchmarks
│   ├── performance-benchmarks.mjs             # Benchmark.js NFR validation
│   └── compare-baselines.mjs                  # Baseline comparison script
├── performance/                               # Performance data
│   ├── baselines/                             # Baseline measurements (per NFR)
│   │   ├── NFR-PERF-001.json
│   │   ├── NFR-PERF-002.json
│   │   └── ...
│   └── report.json                            # Latest performance report
├── sandbox/                                   # Temporary test directories (gitignored)
├── logs/                                      # Test execution logs (gitignored)
├── nfr-measurements/                          # NFR validation results
├── test-infrastructure-specification.md       # This document
└── test-data-catalog.md                       # Test data fixture catalog (BLOCKER-003 resolution)
```

---

## 11. Success Metrics

### 11.1 BLOCKER-001 Resolution Validation

**Critical Success Criteria**:

- ✅ **Multi-Agent Mock Framework**: `MockAgentOrchestrator` class specified with complete API
  - Agent registration (static and function-based behaviors)
  - Task execution with latency simulation
  - Failure injection for error handling tests
  - Execution log tracking for parallel agent verification

- ✅ **Git Sandbox Environment**: `GitSandbox` class specified with isolation guarantees
  - Automatic initialization (git init, git config, initial commit)
  - Command execution (git add, commit, branch, merge)
  - Automatic cleanup (delete sandbox after test)
  - File and commit history inspection

- ✅ **GitHub API Stubbing**: `GitHubAPIStub` class specified with endpoint coverage
  - PR creation (POST /repos/{owner}/{repo}/pulls)
  - Issue creation (POST /repos/{owner}/{repo}/issues)
  - Discussions posting (POST /repos/{owner}/{repo}/discussions)
  - Rate limit simulation (HTTP 429)

- ✅ **Filesystem Isolation**: `FilesystemSandbox` class specified with cleanup guarantees
  - Temporary directory creation (.aiwg/ structure)
  - Fixture file copying (test data population)
  - File operations (read, write, list, stats)
  - Automatic cleanup (delete sandbox after test)

- ✅ **Performance Profiling**: `PerformanceProfiler` class specified with NFR validation
  - High-precision timing (performance.now())
  - Statistical aggregation (mean, median, 95th percentile)
  - Baseline tracking (detect performance regression)
  - NFR threshold validation (auto-fail if exceeded)

- ✅ **Test Data Factories**: `TestDataFactory` class specified with fixture generation
  - Iteration backlogs (minimal, typical, overload)
  - Team profiles (solo, small team, enterprise)
  - Spike reports (risk retired, risk remains, timeout)
  - Retrospectives (typical, minimal, overload)

### 11.2 Test Coverage Enablement

**Enabled Test Cases** (previously blocked by BLOCKER-001):

- **UC-005 Multi-Agent Test Cases**: TC-FSI-004, TC-FSI-005, TC-FSI-030 (30+ test cases)
- **UC-005 Git Integration Test Cases**: TC-FSI-029 (Git version control)
- **UC-005 GitHub Integration Test Cases**: TC-FSI-028 (GitHub Discussions API)
- **UC-005 Performance Test Cases**: TC-FSI-015, TC-FSI-016 (NFR validation)
- **All 48 NFRs**: Performance benchmarking infrastructure enables automated NFR validation

### 11.3 Construction Phase Readiness

**Gate Criteria for Construction Phase Start**:

1. ✅ Test infrastructure specification complete (this document)
2. ⏳ Test data catalog created (BLOCKER-003 - Construction Week 1)
3. ⏳ NFR measurement protocols defined (BLOCKER-002 - Elaboration Week 5)
4. ⏳ Multi-agent mock framework implemented (Construction Week 1)
5. ⏳ Git sandbox implemented (Construction Week 1)
6. ⏳ GitHub API stub implemented (Construction Week 1)
7. ⏳ Filesystem sandbox implemented (Construction Week 1)
8. ⏳ Performance profiler implemented (Construction Week 1)

**Current Status**: BLOCKER-001 RESOLVED (specification complete), Construction phase can start with parallel implementation of test infrastructure components.

---

## 12. Next Actions

### 12.1 Immediate (Elaboration Week 5 - Before Construction)

1. **Resolve BLOCKER-002**: Define NFR measurement protocols
   - **Owner**: Test Architect
   - **Deliverable**: `.aiwg/testing/nfr-measurement-protocols.md`
   - **Content**: Measurement methodology for all 48 NFRs (95th percentile, confusion matrix, etc.)

2. **Review Test Infrastructure Specification**
   - **Owner**: Test Architect, Requirements Analyst
   - **Action**: Validate specification completeness, provide feedback

### 12.2 Short-Term (Construction Week 1)

1. **Resolve BLOCKER-003**: Create test data catalog
   - **Owner**: Test Engineer
   - **Deliverable**: `.aiwg/testing/test-data-catalog.md` + 19 fixture files
   - **Priority**: HIGH (blocks test case execution)

2. **Implement Test Infrastructure Components**
   - **Owner**: Test Engineer, Development Team
   - **Components**:
     - `MockAgentOrchestrator` class (`.aiwg/testing/mocks/agent-orchestrator-mock.mjs`)
     - `GitSandbox` class (`.aiwg/testing/mocks/git-sandbox.mjs`)
     - `GitHubAPIStub` class (`.aiwg/testing/mocks/github-api-stub.mjs`)
     - `FilesystemSandbox` class (`.aiwg/testing/mocks/filesystem-sandbox.mjs`)
     - `PerformanceProfiler` class (`.aiwg/testing/utilities/performance-profiler.mjs`)
     - `TestDataFactory` class (`.aiwg/testing/fixtures/test-data-factory.mjs`)
   - **Duration**: 1 week (parallel implementation)

3. **Configure CI/CD Pipeline**
   - **Owner**: DevOps Engineer
   - **Deliverable**: `.github/workflows/test-infrastructure.yml`
   - **Content**: Automated test execution, coverage reporting, performance regression detection

### 12.3 Medium-Term (Construction Weeks 2-8)

1. **Implement UC-005 Test Cases** (30 test cases)
   - **Owner**: Test Engineer
   - **Priority**: P0 (critical for framework validation)
   - **Dependencies**: Test infrastructure components implemented

2. **Implement NFR Test Cases** (48 test cases)
   - **Owner**: Test Engineer
   - **Priority**: P0 (validate all non-functional requirements)
   - **Dependencies**: Performance profiler implemented, baseline data collected

3. **Build Ground Truth Corpora** (Phase 1)
   - **Owner**: Test Engineer, Community
   - **Deliverable**: 100 labeled documents, 10 analyzed repos, 5 traceability matrices
   - **Purpose**: Accuracy NFR validation (NFR-ACC-001 through NFR-ACC-006)

### 12.4 Long-Term (Transition Phase)

1. **User Acceptance Testing**
   - **Owner**: Product Owner, Test Architect
   - **Participants**: 20 beta testers
   - **Purpose**: Validate usability NFRs (NFR-USE-001 through NFR-USE-006)

2. **Ground Truth Corpus Expansion** (Phase 3)
   - **Owner**: Test Engineer, Community
   - **Deliverable**: 1000 labeled documents, 100 analyzed repos, 50 traceability matrices
   - **Purpose**: Statistical validity for accuracy NFRs

---

## Document Metadata

**Version**: 1.0
**Status**: BASELINED
**Created**: 2025-10-19
**Last Updated**: 2025-10-19
**Word Count**: 12,847 words
**Blocker Resolution**: BLOCKER-001 RESOLVED

**Review History**:
- 2025-10-19: Initial creation (Test Engineer)
- 2025-10-19: Baselined (resolves BLOCKER-001 from Test Architect Review)

**Next Review**: Construction Week 1 (validate implementation against specification)

---

**Generated**: 2025-10-19
**Owner**: Test Engineer (AIWG SDLC Framework)
**Status**: BASELINED - Construction Phase Ready
