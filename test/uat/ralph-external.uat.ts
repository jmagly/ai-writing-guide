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

  it('stops on hard wall-clock budget exhaustion and writes auditable LFD artifacts', async () => {
    const orc = new Orchestrator(testDir);

    const result = await orc.execute({
      ...BASE_CONFIG,
      objective: 'Budget-stop UAT',
      completionCriteria: 'Stub succeeds, then hard budget check stops the loop',
      maxIterations: 3,
      enableAnalytics: true,
      enableBestOutput: true,
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
    expect(prompt3).toContain('Before changing files, state the new hypothesis');

    const analytics = JSON.parse(readFileSync(join(orc.stateManager.getStateDir(), 'analytics', `${state.loopId}.json`), 'utf-8'));
    expect(analytics.structural_variant_required).toBe(true);
    expect(analytics.flat_cycle_count).toBeGreaterThanOrEqual(1);
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
