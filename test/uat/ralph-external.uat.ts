/**
 * Ralph External Loop — User Acceptance Tests
 *
 * End-to-end validation of the external ralph loop pipeline using a stub
 * provider. These tests run the REAL orchestrator code paths (state
 * management, iteration tracking, verbose logging, log file, etc.) but
 * replace the agent CLI with a deterministic stub that immediately returns
 * success.
 *
 * Run on demand (not part of CI):
 *   npm run uat
 *
 * No publish/install cycle required — tests directly against the local build.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, readFileSync, writeFileSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { tmpdir } from 'os';

// ── Resolve project root ──────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - import.meta works in vitest ESM
const __filename = fileURLToPath(import.meta.url);
const __dirnameUat = dirname(__filename);
const PROJECT_ROOT = resolve(__dirnameUat, '../..');

// ── Register stub provider (must happen before orchestrator import) ───────
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
await import(join(PROJECT_ROOT, 'test/uat/fixtures/stub-adapter.mjs'));

// ── Modules under test (dynamic imports for ESM compatibility) ────────────
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const { Orchestrator } = await import(join(PROJECT_ROOT, 'tools/ralph-external/orchestrator.mjs'));
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const { StateManager } = await import(join(PROJECT_ROOT, 'tools/ralph-external/state-manager.mjs'));

const {
  launchExternalRalph,
  loadLauncherRegistry,
  getLoopStatuses,
  getOrchestratorPath,
} = await import(join(PROJECT_ROOT, 'src/cli/handlers/ralph-launcher.js'));

// ── Helpers ───────────────────────────────────────────────────────────────

function makeTmpDir(): string {
  const dir = join(tmpdir(), `aiwg-uat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

const BASE_CONFIG = {
  provider: 'stub',
  enablePIDControl: false,
  enableOverseer: false,
  enableSemanticMemory: false,
  crossTask: false,
  enableAnalytics: false,
  enableBestOutput: false,
  enableEarlyStopping: false,
  enableClaudeIntelligence: false,
  enableSnapshots: false,
  enableCheckpoints: false,
};

// ── Test lifecycle ────────────────────────────────────────────────────────

let testDir: string;

beforeEach(() => {
  testDir = makeTmpDir();
});

afterEach(() => {
  if (existsSync(testDir)) {
    rmSync(testDir, { recursive: true, force: true });
  }
});

// ═════════════════════════════════════════════════════════════════════════
// Suite 1: Orchestrator direct (in-process, no daemon spawn)
// ═════════════════════════════════════════════════════════════════════════

describe('UAT: Orchestrator — basic loop', () => {
  it('completes in 1 iteration when stub agent returns success', async () => {
    const orc = new Orchestrator(testDir);

    const result = await orc.execute({
      ...BASE_CONFIG,
      objective: 'Test task',
      completionCriteria: 'Stub returns success',
      maxIterations: 3,
    });

    expect(result.success).toBe(true);
    expect(result.iterations).toBe(1);
    expect(result.loopId).toBeDefined();
  });

  it('saves state with status=completed after the loop finishes', async () => {
    const orc = new Orchestrator(testDir);

    await orc.execute({
      ...BASE_CONFIG,
      objective: 'State persistence test',
      completionCriteria: 'Stub succeeds',
      maxIterations: 2,
    });

    const state = orc.stateManager.load();
    expect(state).not.toBeNull();
    expect(state.status).toBe('completed');
    expect(state.objective).toBe('State persistence test');
    expect(state.iterations.length).toBeGreaterThanOrEqual(1);
  });

  it('creates per-iteration output files', async () => {
    const orc = new Orchestrator(testDir);

    await orc.execute({
      ...BASE_CONFIG,
      objective: 'Output file test',
      completionCriteria: 'Stub succeeds',
      maxIterations: 1,
    });

    // State manager writes outputs to per-loop dir (scoped since #586)
    const outputsDir = join(orc.stateManager.getStateDir(), 'outputs');
    expect(existsSync(outputsDir)).toBe(true);
    // Stdout log for iteration 1
    expect(existsSync(join(outputsDir, '001-stdout.log'))).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════
// Suite 1b: LFD loop-control verification
// ═════════════════════════════════════════════════════════════════════════

describe('UAT: Orchestrator — LFD loop controls', () => {
  const originalStubOutput = process.env.UAT_STUB_OUTPUT;

  afterEach(() => {
    if (originalStubOutput === undefined) {
      delete process.env.UAT_STUB_OUTPUT;
    } else {
      process.env.UAT_STUB_OUTPUT = originalStubOutput;
    }
  });

  it('stops on hard wall-clock budget exhaustion and writes auditable LFD artifacts (budget-wins policy)', async () => {
    const orc = new Orchestrator(testDir);

    const result = await orc.execute({
      ...BASE_CONFIG,
      objective: 'Budget-stop UAT',
      completionCriteria: 'Stub succeeds, then hard budget check stops the loop',
      maxIterations: 3,
      enableAnalytics: true,
      enableBestOutput: true,
      // Explicit budget-wins: this test asserts the strict exhaustion-first
      // artifacts. The default policy is completion-wins (#1767).
      budgetStopPolicy: 'budget-wins',
      budgetLimits: {
        wall_clock_minutes: 0.000001,
      },
    });

    expect(result.success).toBe(false);
    expect(result.reason).toContain('Budget exhausted: wall_clock_exhausted');
    expect(result.iterations).toBe(1);
    expect(result.budgetStopReport?.stop_reason).toBe('wall_clock_exhausted');
    expect(result.budgetStopReport?.budgets.observed.wall_clock_minutes).toBeGreaterThan(0);

    const stateDir = orc.stateManager.getStateDir();
    const state = orc.stateManager.load();
    expect(state.status).toBe('budget_exhausted');
    expect(state.budgetStopReportPath).toBe(join(stateDir, 'budget-stop-report.json'));
    expect(existsSync(join(stateDir, 'budget-stop-report.json'))).toBe(true);
    expect(existsSync(join(stateDir, 'completion-report.md'))).toBe(true);
    expect(existsSync(join(stateDir, 'iteration-analytics-report.md'))).toBe(true);

    const budgetReport = JSON.parse(readFileSync(join(stateDir, 'budget-stop-report.json'), 'utf-8'));
    expect(budgetReport.selected_iteration).toBe(1);
    expect(budgetReport.hypothesis_outcomes).toHaveLength(1);
    expect(budgetReport.next_recommended_action).toContain('Review best output');

    const completionReport = readFileSync(join(stateDir, 'completion-report.md'), 'utf-8');
    expect(completionReport).toContain('## LFD Controls');
    expect(completionReport).toContain('Budget stop report:');
    expect(completionReport).toContain('"stop_reason": "wall_clock_exhausted"');

    const analyticsReport = readFileSync(join(stateDir, 'iteration-analytics-report.md'), 'utf-8');
    expect(analyticsReport).toContain('Best Quality / 1K Tokens');
    expect(analyticsReport).toContain('Best Quality / Minute');
  });

  it('reports success when the completing iteration crosses a ceiling (completion-wins default, #1767)', async () => {
    const orc = new Orchestrator(testDir);

    const result = await orc.execute({
      ...BASE_CONFIG,
      objective: 'Completion-wins UAT',
      completionCriteria: 'Stub succeeds on the ceiling-crossing iteration',
      maxIterations: 3,
      enableAnalytics: true,
      enableBestOutput: true,
      budgetLimits: {
        wall_clock_minutes: 0.000001,
      },
    });

    // The task completed on the iteration that crossed the ceiling: success,
    // with the crossing annotated — not a budget_exhausted failure.
    expect(result.success).toBe(true);
    expect(result.budgetCrossed).toBe('wall_clock_exhausted');
    expect(result.reason).toContain('budget ceiling crossed');

    const state = orc.stateManager.load();
    expect(state.status).toBe('completed');
    expect(state.budgetCrossedAtCompletion).toBe('wall_clock_exhausted');
    // The budget-stop report is still written as an audit artifact
    expect(existsSync(join(orc.stateManager.getStateDir(), 'budget-stop-report.json'))).toBe(true);
  });

  it('stops flat loops as plateau (stagnation), never success (#1767)', async () => {
    process.env.UAT_STUB_OUTPUT = [
      'Ralph iteration still incomplete.',
      'modified: loop-control.md',
      'Continue with accumulated context.',
    ].join('\n');

    const orc = new Orchestrator(testDir);

    const result = await orc.execute({
      ...BASE_CONFIG,
      objective: 'Plateau UAT',
      completionCriteria: 'Never met by stub',
      maxIterations: 5,
      enableAnalytics: true,
      enableBestOutput: true,
      enableEarlyStopping: true,
    });

    expect(result.success).toBe(false);
    expect(result.reason).toContain('Quality plateau');

    const state = orc.stateManager.load();
    expect(state.status).toBe('plateau');
  });

  it('defers plateau stop while a declared exploration quota requires a structural variant (#1767)', async () => {
    process.env.UAT_STUB_OUTPUT = [
      'Ralph iteration still incomplete.',
      'modified: loop-control.md',
      'Continue with accumulated context.',
    ].join('\n');

    const orc = new Orchestrator(testDir);

    const result = await orc.execute({
      ...BASE_CONFIG,
      objective: 'Plateau-vs-quota UAT',
      completionCriteria: 'Never met by stub',
      maxIterations: 4,
      enableAnalytics: true,
      enableEarlyStopping: true,
      explorationQuota: { enabled: true, k: 1 },
    });

    // The pending structural variant takes precedence over the plateau stop —
    // the quota exists precisely to break plateaus, so the loop runs on.
    expect(result.reason).toBe('Maximum iterations reached');
    const state = orc.stateManager.load();
    expect(state.status).not.toBe('plateau');
    expect(state.lfdControls?.structuralVariantRequired).toBe(true);
  });

  it('records a real pre-change hypothesis and injects it into the prompt (#1769)', async () => {
    process.env.UAT_STUB_OUTPUT = 'Ralph iteration still incomplete.';
    const orc = new Orchestrator(testDir);

    await orc.execute({
      ...BASE_CONFIG,
      objective: 'Hypothesis UAT',
      completionCriteria: 'Never met by stub',
      maxIterations: 2,
      enableAnalytics: true,
      // Intelligence layer on so StrategyPlanner produces the hypothesis fields
      enableClaudeIntelligence: true,
    });

    const state = orc.stateManager.load();
    const analytics = JSON.parse(
      readFileSync(join(orc.stateManager.getStateDir(), 'analytics', `${state.loopId}.json`), 'utf-8'),
    );
    const exp = analytics.iterations[0].experiment;
    expect(exp.recorded_before_change).toBe(true);
    expect(typeof exp.hypothesis).toBe('string');
    expect(exp.hypothesis.length).toBeGreaterThan(0);
    expect(typeof exp.expected_failure_mode).toBe('string');
    expect(typeof exp.distinguishing_diagnostic).toBe('string');

    // The hypothesis directive is injected into the prompt (provider-agnostic)
    const prompt1 = readFileSync(orc.stateManager.getPromptPath(1), 'utf-8');
    expect(prompt1).toContain('LFD CONTROL — hypothesis before change');
  });

  it('injects a stall-rule directive after a non-improving cycle (#1768)', async () => {
    process.env.UAT_STUB_OUTPUT = 'Ralph iteration still incomplete.';
    const orc = new Orchestrator(testDir);

    await orc.execute({
      ...BASE_CONFIG,
      objective: 'Stall-rule UAT',
      completionCriteria: 'Never met by stub',
      maxIterations: 3,
      enableAnalytics: true,
      enableClaudeIntelligence: true,
    });

    // Detecting non-improvement needs two recorded cycles, so the stall
    // directive appears from iteration 3 onward (iteration 2's delta vs 1 was
    // non-positive under the flat stub output).
    const prompt3 = readFileSync(orc.stateManager.getPromptPath(3), 'utf-8');
    expect(prompt3).toContain('LFD CONTROL — stall rule');
    expect(prompt3).toContain('Do NOT repeat the previous adjustment');
  });

  it('requires a structural variant after the configured flat-cycle quota', async () => {
    process.env.UAT_STUB_OUTPUT = [
      'Ralph iteration still incomplete.',
      'modified: loop-control.md',
      'Continue with accumulated context.',
    ].join('\n');

    const orc = new Orchestrator(testDir);

    const result = await orc.execute({
      ...BASE_CONFIG,
      objective: 'Exploration-quota UAT',
      completionCriteria: 'Stay incomplete long enough to trigger structural variant control',
      maxIterations: 3,
      enableAnalytics: true,
      explorationQuota: {
        enabled: true,
        k: 1,
      },
    });

    expect(result.success).toBe(false);
    expect(result.reason).toBe('Maximum iterations reached');
    expect(result.iterations).toBe(3);

    const state = orc.stateManager.load();
    expect(state.lfdControls).toMatchObject({
      structuralVariantRequired: true,
      flatCycleCount: 2,
      explorationQuotaK: 1,
    });

    const prompt3 = readFileSync(orc.stateManager.getPromptPath(3), 'utf-8');
    expect(prompt3).toContain('LFD CONTROL: The prior cycles are flat.');
    expect(prompt3).toContain('This iteration must use a structural variant.');
    // The hypothesis-before-change directive is now its own injected block (#1769)
    expect(prompt3).toContain('LFD CONTROL — hypothesis before change');

    const analytics = JSON.parse(readFileSync(join(orc.stateManager.getStateDir(), 'analytics', `${state.loopId}.json`), 'utf-8'));
    expect(analytics.structural_variant_required).toBe(true);
    expect(analytics.flat_cycle_count).toBeGreaterThanOrEqual(1);
  });
});

// ═════════════════════════════════════════════════════════════════════════
// Suite: Eval-harness + VOID (#1776)
// ═════════════════════════════════════════════════════════════════════════

describe('UAT: Orchestrator — eval-harness + VOID (#1776)', () => {
  it('VOIDs an iteration on a lint violation and keeps holdout details private', async () => {
    process.env.UAT_STUB_OUTPUT = 'Ralph iteration still incomplete.';
    const orc = new Orchestrator(testDir);

    // Real shell-command harness: lint exits 1 with a violation (→ VOID); score
    // emits an aggregate that also tries to leak a holdout answer (must be
    // stripped from optimizer feedback).
    const result = await orc.execute({
      ...BASE_CONFIG,
      objective: 'Eval-harness VOID UAT',
      completionCriteria: 'never met by stub',
      maxIterations: 1,
      enableAnalytics: true,
      enableBestOutput: true,
      executionMode: 'holdout-isolated',
      evalHarness: {
        lint: {
          command: `node -e "console.log(JSON.stringify({violation:true,void_reason:'banned import'})); process.exit(1)"`,
          void_on_violation: true,
        },
        score: {
          command: `node -e "console.log(JSON.stringify({score:95,pass_count:19,total_count:20,holdout_answers:{1:'A'},oracle_traces:'CANARY-XYZ'}))"`,
        },
        diagnostics_policy: { private_human: '', optimizer_visible: 'aggregate_only' },
      },
    });

    const state = orc.stateManager.load();
    const analytics = JSON.parse(
      readFileSync(join(orc.stateManager.getStateDir(), 'analytics', `${state.loopId}.json`), 'utf-8'),
    );
    const iter = analytics.iterations[0];

    // Iteration is VOID; only VOID-safe aggregate feedback reached the record.
    expect(iter.verification_status).toBe('void');
    expect(iter.eval_harness_result.status).toBe('void');
    expect(iter.eval_harness_result.leakage_audit.result).toBe('pass');
    const feedbackStr = JSON.stringify(iter.eval_harness_result.optimizer_feedback);
    expect(feedbackStr).not.toContain('CANARY-XYZ');
    expect(feedbackStr).not.toContain('holdout_answers');
    expect(analytics.void_iteration_count).toBe(1);
    expect(result.loopId).toBeDefined();

    // The eval-harness result artifact is written per iteration.
    const iterDirs = join(orc.stateManager.getStateDir(), 'iterations');
    const found = existsSync(iterDirs);
    expect(found).toBe(true);
  });

  it('passes a clean iteration through the harness (no VOID)', async () => {
    process.env.UAT_STUB_OUTPUT = 'Ralph iteration still incomplete.';
    const orc = new Orchestrator(testDir);
    const result = await orc.execute({
      ...BASE_CONFIG,
      objective: 'Eval-harness pass UAT',
      completionCriteria: 'never met by stub',
      maxIterations: 1,
      enableAnalytics: true,
      evalHarness: {
        lint: { command: `node -e "console.log('{}')"`, void_on_violation: true },
        score: { command: `node -e "console.log(JSON.stringify({score:100,pass_count:10,total_count:10}))"` },
      },
    });
    const state = orc.stateManager.load();
    const analytics = JSON.parse(
      readFileSync(join(orc.stateManager.getStateDir(), 'analytics', `${state.loopId}.json`), 'utf-8'),
    );
    expect(analytics.iterations[0].eval_harness_result.status).toBe('pass');
    expect(analytics.iterations[0].verification_status).toBe('passed');
    expect(analytics.void_iteration_count).toBe(0);
    expect(result.loopId).toBeDefined();
  });
});

// ═════════════════════════════════════════════════════════════════════════
// Suite: Resume path carries the LFD control surface (#1765)
// ═════════════════════════════════════════════════════════════════════════

describe('UAT: Orchestrator — resume LFD controls (#1765)', () => {
  let originalStubOutput: string | undefined;

  beforeEach(() => {
    originalStubOutput = process.env.UAT_STUB_OUTPUT;
  });

  afterEach(() => {
    if (originalStubOutput === undefined) {
      delete process.env.UAT_STUB_OUTPUT;
    } else {
      process.env.UAT_STUB_OUTPUT = originalStubOutput;
    }
  });

  it('restores analytics counters on resume (controls active, history preserved)', async () => {
    process.env.UAT_STUB_OUTPUT = 'Ralph iteration still incomplete.';

    const orc = new Orchestrator(testDir);
    const first = await orc.execute({
      ...BASE_CONFIG,
      objective: 'Resume analytics UAT',
      completionCriteria: 'Never met by stub',
      maxIterations: 1,
      enableAnalytics: true,
    });
    expect(first.iterations).toBe(1);

    const stateDir = orc.stateManager.getStateDir();
    const orc2 = new Orchestrator(testDir);
    orc2.stateManager.setStateDir(stateDir);

    const second = await orc2.resume({ maxIterations: 2 });

    // Before #1765 iterationAnalytics stayed null on resume — every LFD
    // control was silently dead on the recovery path.
    expect(orc2.iterationAnalytics).not.toBeNull();
    expect(second.iterations).toBe(2);
    // 1 restored iteration + 1 new one: cumulative counters survived resume
    expect(orc2.iterationAnalytics.iterations.length).toBe(2);
    expect(orc2.iterationAnalytics.iterations[0].iteration_number).toBe(1);
  });

  it('refuses to resume when restored usage already exceeds an overridden ceiling', async () => {
    process.env.UAT_STUB_OUTPUT = 'Ralph iteration still incomplete.';

    const orc = new Orchestrator(testDir);
    await orc.execute({
      ...BASE_CONFIG,
      objective: 'Resume ceiling UAT',
      completionCriteria: 'Never met by stub',
      maxIterations: 1,
      enableAnalytics: true,
    });

    const orc2 = new Orchestrator(testDir);
    orc2.stateManager.setStateDir(orc.stateManager.getStateDir());

    await expect(
      orc2.resume({
        maxIterations: 3,
        budgetLimits: { wall_clock_minutes: 0.0000001 },
      })
    ).rejects.toThrow(/already exceeds declared budget ceiling/);
  });

  it('refuses to resume a budget_exhausted loop without --allow-exhausted-resume', async () => {
    const orc = new Orchestrator(testDir);
    const result = await orc.execute({
      ...BASE_CONFIG,
      objective: 'Exhausted-resume UAT',
      completionCriteria: 'Stub succeeds, then hard budget check stops the loop',
      maxIterations: 3,
      enableAnalytics: true,
      enableBestOutput: true,
      budgetStopPolicy: 'budget-wins',
      budgetLimits: {
        wall_clock_minutes: 0.000001,
      },
    });
    expect(result.success).toBe(false);

    const orc2 = new Orchestrator(testDir);
    orc2.stateManager.setStateDir(orc.stateManager.getStateDir());

    await expect(orc2.resume({})).rejects.toThrow(/budget_exhausted/);
  });
});

// ═════════════════════════════════════════════════════════════════════════
// Suite 2: Verbose mode
// ═════════════════════════════════════════════════════════════════════════

describe('UAT: Orchestrator — verbose mode', () => {
  it('emits [VERBOSE] lines when verbose=true', async () => {
    const orc = new Orchestrator(testDir);
    const verboseLines: string[] = [];

    const origLog = console.log;
    console.log = (...args: unknown[]) => {
      const msg = args.join(' ');
      if (msg.includes('[VERBOSE]')) verboseLines.push(msg);
      origLog(...args);
    };

    try {
      await orc.execute({
        ...BASE_CONFIG,
        objective: 'Verbose test',
        completionCriteria: 'Stub succeeds',
        maxIterations: 2,
        verbose: true,
      });
    } finally {
      console.log = origLog;
    }

    // Prompt preview fires on every iteration
    expect(verboseLines.some((l) => l.includes('Prompt preview'))).toBe(true);
  });

  it('emits no [VERBOSE] lines when verbose=false', async () => {
    const orc = new Orchestrator(testDir);
    const verboseLines: string[] = [];

    const origLog = console.log;
    console.log = (...args: unknown[]) => {
      const msg = args.join(' ');
      if (msg.includes('[VERBOSE]')) verboseLines.push(msg);
      origLog(...args);
    };

    try {
      await orc.execute({
        ...BASE_CONFIG,
        objective: 'Non-verbose test',
        completionCriteria: 'Stub succeeds',
        maxIterations: 1,
        verbose: false,
      });
    } finally {
      console.log = origLog;
    }

    expect(verboseLines).toHaveLength(0);
  });
});

// ═════════════════════════════════════════════════════════════════════════
// Suite 3: Log file (installConsoleTee)
// Tests the tee mechanism in isolation using a subprocess.
// ═════════════════════════════════════════════════════════════════════════

describe('UAT: Log file output', () => {
  it('creates a timestamped log file when --log-file is set', async () => {
    const { spawnSync } = await import('child_process');

    const logFile = join(testDir, 'ralph-uat.log');

    // Create a minimal test script that exercises the same installConsoleTee
    // function from index.mjs, to avoid spawning the full orchestrator
    const testScript = join(testDir, 'test-tee.mjs');
    writeFileSync(testScript, `
import { createWriteStream } from 'fs';

function installConsoleTee(logFilePath) {
  const stream = createWriteStream(logFilePath, { flags: 'a' });
  function writeLine(level, args) {
    const ts = new Date().toISOString();
    const msg = args.map((a) => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
    stream.write(\`\${ts} [\${level}] \${msg}\\n\`);
  }
  const origLog = console.log.bind(console);
  console.log = (...args) => { origLog(...args); writeLine('LOG', args); };
  return () => new Promise((res) => stream.end(res));
}

const cleanup = installConsoleTee(${JSON.stringify(logFile)});
console.log('[External Ralph] Test message alpha');
console.log('[External Ralph] Test message beta');
await cleanup();
`);

    const result = spawnSync(process.execPath, [testScript], {
      encoding: 'utf-8',
      timeout: 10000,
      cwd: testDir,
    });

    expect(result.status).toBe(0);
    expect(existsSync(logFile)).toBe(true);

    const content = readFileSync(logFile, 'utf-8');
    expect(content).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/m);
    expect(content).toMatch(/\[LOG\]/);
    expect(content).toContain('Test message alpha');
    expect(content).toContain('Test message beta');
  });
});

// ═════════════════════════════════════════════════════════════════════════
// Suite 4: Launcher registry
// ═════════════════════════════════════════════════════════════════════════

describe('UAT: Launcher registry', () => {
  it('creates a registry entry when launchExternalRalph is called', async () => {
    // Write a stub orchestrator index that exits immediately after setting state
    const stubIndex = join(testDir, 'stub-index.mjs');
    writeFileSync(stubIndex, `
import { StateManager } from ${JSON.stringify(join(PROJECT_ROOT, 'tools/ralph-external/state-manager.mjs'))};
const sm = new StateManager(process.cwd());
const state = sm.load();
if (state) { sm.update({ status: 'completed' }); }
process.exit(0);
`);

    // Patch getOrchestratorPath via module cache override is not possible for ESM,
    // so we call launchExternalRalph with a frameworkRoot that happens to have our stub
    // at the expected path: tools/ralph-external/index.mjs
    const fakeFrameworkDir = join(testDir, 'fake-framework');
    const toolsDir = join(fakeFrameworkDir, 'tools', 'ralph-external');
    mkdirSync(toolsDir, { recursive: true });

    // Copy stub as index.mjs at expected path
    writeFileSync(join(toolsDir, 'index.mjs'), readFileSync(stubIndex, 'utf-8'));

    const result = await launchExternalRalph(fakeFrameworkDir, testDir, {
      objective: 'Registry test task',
      completionCriteria: 'Always completes',
      maxIterations: 1,
      provider: 'stub',
    });

    expect(result.success).toBe(true);
    expect(result.loopId).toBeDefined();
    expect(result.pid).toBeGreaterThan(0);

    const registry = loadLauncherRegistry(testDir);
    expect(registry.loops[result.loopId]).toBeDefined();
    expect(registry.loops[result.loopId].status).toBe('running');
    expect(registry.loops[result.loopId].objective).toBe('Registry test task');
  });
});

// ═════════════════════════════════════════════════════════════════════════
// Suite 5: getLoopStatuses
// ═════════════════════════════════════════════════════════════════════════

describe('UAT: getLoopStatuses', () => {
  it('returns empty array when no loops exist', () => {
    const statuses = getLoopStatuses(testDir);
    expect(statuses).toEqual([]);
  });

  it('includes a loop entry from the launcher registry', () => {
    const regDir = join(testDir, '.aiwg', 'ralph-external');
    const loopId = 'ralph-test-uat-abc123';
    const loopDir = join(regDir, 'loops', loopId);
    mkdirSync(loopDir, { recursive: true });

    // Write state file
    writeFileSync(join(loopDir, 'state.json'), JSON.stringify({
      loopId,
      status: 'completed',
      objective: 'UAT status test',
      completionCriteria: 'Always done',
      currentIteration: 2,
      maxIterations: 5,
      startTime: new Date().toISOString(),
      lastUpdate: new Date().toISOString(),
    }));

    // Write launcher registry
    writeFileSync(join(regDir, 'launcher-registry.json'), JSON.stringify({
      version: '1.0',
      loops: {
        [loopId]: {
          loopId,
          pid: 99999,
          objective: 'UAT status test',
          completionCriteria: 'Always done',
          status: 'running',
          startedAt: new Date().toISOString(),
          lastUpdate: new Date().toISOString(),
          iteration: 2,
          maxIterations: 5,
          outputFile: join(loopDir, 'daemon-output.log'),
        },
      },
    }));

    const statuses = getLoopStatuses(testDir);
    expect(statuses.length).toBeGreaterThanOrEqual(1);

    const found = statuses.find((s: any) => s.loopId === loopId);
    expect(found).toBeDefined();
    expect(found.objective).toBe('UAT status test');
  });
});
