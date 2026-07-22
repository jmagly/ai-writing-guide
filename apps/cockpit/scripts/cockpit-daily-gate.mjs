#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  aggregateDailyGateEvidence,
  isImmutableVersionRef,
  renderDailyGateMarkdown,
  scanForSecrets,
  validateDailyGateReport,
} from './cockpit-daily-gate-lib.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const VITEST = resolve(ROOT, 'node_modules/vitest/vitest.mjs');
const REPORT_BASE = resolve(process.env.AIWG_COCKPIT_DAILY_REPORT ?? 'test-results/cockpit-daily-gate');
const JSON_REPORT = `${REPORT_BASE}.json`;
const MARKDOWN_REPORT = `${REPORT_BASE}.md`;
const startedAt = new Date().toISOString();

function requiredEnv(name) {
  const value = String(process.env[name] ?? '').trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function safeHookEnvironment(action, fromVersion, toVersion) {
  return {
    PATH: process.env.PATH,
    HOME: process.env.HOME,
    TMPDIR: process.env.TMPDIR,
    AIWG_COCKPIT_DAILY_ACTION: action,
    AIWG_COCKPIT_DAILY_FROM_VERSION: fromVersion,
    AIWG_COCKPIT_DAILY_TO_VERSION: toVersion,
    AIWG_COCKPIT_DAILY_PREVIOUS_AIWG_VERSION: process.env.AIWG_COCKPIT_DAILY_PREVIOUS_AIWG_VERSION,
    AIWG_COCKPIT_DAILY_CANDIDATE_AIWG_VERSION: process.env.AIWG_COCKPIT_DAILY_CANDIDATE_AIWG_VERSION,
    AIWG_COCKPIT_DAILY_PREVIOUS_EXECUTOR_VERSION: process.env.AIWG_COCKPIT_DAILY_PREVIOUS_EXECUTOR_VERSION,
    AIWG_COCKPIT_DAILY_CANDIDATE_EXECUTOR_VERSION: process.env.AIWG_COCKPIT_DAILY_CANDIDATE_EXECUTOR_VERSION,
    AIWG_COCKPIT_EXECUTOR_URL: process.env.AIWG_COCKPIT_EXECUTOR_URL,
    AIWG_COCKPIT_EXECUTOR_TOKEN_FILE: process.env.AIWG_COCKPIT_EXECUTOR_TOKEN_FILE,
  };
}

async function assertRegularFile(path, description, { executable = false, privateFile = false } = {}) {
  let metadata;
  try { metadata = await stat(path); }
  catch { throw new Error(`${description} is unavailable`); }
  if (!metadata.isFile()) throw new Error(`${description} must be a regular file`);
  if (process.platform !== 'win32' && executable && (metadata.mode & 0o111) === 0) {
    throw new Error(`${description} must be executable`);
  }
  if (process.platform !== 'win32' && privateFile && (metadata.mode & 0o077) !== 0) {
    throw new Error(`${description} must not be accessible by group or other users`);
  }
}

async function assertAbsent(path, description) {
  try {
    await stat(path);
  } catch (error) {
    if (error?.code === 'ENOENT') return;
    throw new Error(`unable to validate ${description}`);
  }
  throw new Error(`${description} must not exist before the gate; choose a new gate-owned scratch path`);
}

async function runProcess(command, args, options = {}) {
  const started = Date.now();
  const code = await new Promise((resolveProcess, rejectProcess) => {
    const child = spawn(command, args, {
      cwd: ROOT,
      env: options.env,
      stdio: options.stdio ?? 'inherit',
      timeout: options.timeout ?? 15 * 60_000,
    });
    child.once('error', rejectProcess);
    child.once('close', (exitCode, signal) => resolveProcess(signal ? 128 : (exitCode ?? 1)));
  });
  return { code, duration_ms: Date.now() - started };
}

async function probeAiwgVersion() {
  let output = '';
  const result = await new Promise((resolveProbe, rejectProbe) => {
    const child = spawn('aiwg', ['--version'], {
      env: { PATH: process.env.PATH, HOME: process.env.HOME },
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 15_000,
    });
    child.stdout.on('data', (chunk) => {
      if (output.length < 4096) output += String(chunk);
    });
    child.once('error', rejectProbe);
    child.once('close', (code) => resolveProbe(code ?? 1));
  });
  if (result !== 0) throw new Error('aiwg --version failed');
  const match = output.match(/v?(\d{4}\.\d{1,2}\.\d+(?:[-+][0-9A-Za-z.-]+)?)/);
  if (!match) throw new Error('aiwg --version did not return an immutable version');
  return match[1];
}

async function runHook(id, path, fromVersion, toVersion) {
  let result;
  try {
    result = await runProcess(path, [], {
      env: safeHookEnvironment(id, fromVersion, toVersion),
      stdio: 'ignore',
      timeout: 5 * 60_000,
    });
  } catch {
    result = { code: 1, duration_ms: 0 };
  }
  return {
    id,
    status: result.code === 0 ? 'pass' : 'fail',
    duration_ms: result.duration_ms,
    evidence: result.code === 0 ? `${id} hook completed` : `${id} hook failed without recording hook output`,
  };
}

async function runLivePhase(id, expectedAiwgVersion, expectedExecutorVersion, provision) {
  const reportBase = `${REPORT_BASE}.${id}`;
  const env = {
    ...process.env,
    AIWG_COCKPIT_LIVE_REQUIRED: '1',
    AIWG_COCKPIT_LIVE_MATRIX_REQUIRED: '1',
    AIWG_COCKPIT_LIVE_MATRIX_TARGETS: 'host,container',
    AIWG_COCKPIT_LIVE_PROVISION: provision ? '1' : '0',
    AIWG_COCKPIT_LIVE_PROVISION_NAME_PREFIX: process.env.AIWG_COCKPIT_LIVE_PROVISION_NAME_PREFIX
      || `cockpit-daily-${startedAt.replace(/[^0-9]/g, '').slice(0, 14)}`,
    AIWG_COCKPIT_LIVE_ALLOW_MOCK_MATRIX: '0',
    AIWG_COCKPIT_LIVE_REPORT: reportBase,
    AIWG_COCKPIT_EXECUTOR_VERSION: expectedExecutorVersion,
    AIWG_COCKPIT_DAILY_MODE: '1',
    AIWG_COCKPIT_DAILY_PHASE: id === 'candidate_smoke' ? 'candidate' : id,
  };
  let result;
  try {
    result = await runProcess(process.execPath, [VITEST, 'run', '--config', 'config/vitest.uat-cockpit-live.config.js'], {
      env,
      timeout: 20 * 60_000,
    });
  } catch {
    result = { code: 1, duration_ms: 0 };
  }
  let report;
  try {
    report = JSON.parse(await readFile(`${reportBase}.json`, 'utf8'));
  } catch {
    report = { result: 'fail', evidence: [], executor_identity: {} };
  }
  let observedAiwgVersion = '';
  try { observedAiwgVersion = await probeAiwgVersion(); } catch { /* represented as a failed phase below */ }
  const matchesExpected = observedAiwgVersion === expectedAiwgVersion.replace(/^v/, '');
  return {
    id,
    status: result.code === 0 && report.result === 'pass' && matchesExpected ? 'pass' : 'fail',
    duration_ms: result.duration_ms,
    evidence: result.code === 0 && matchesExpected
      ? `live UAT passed and aiwg --version matched ${expectedAiwgVersion}`
      : 'live UAT or exact AIWG version check failed',
    observed_aiwg_version: observedAiwgVersion,
    report,
  };
}

async function main() {
  if (process.argv.includes('--help')) {
    process.stdout.write('Run the protected Linux Cockpit daily gate. Configuration is file/env based; see docs/cockpit/daily-operator-gate.md.\n');
    return;
  }
  if (process.argv.length > 2) throw new Error('the daily gate accepts no positional arguments; use documented environment variables and file references');

  const pathInputs = {
    tokenFile: requiredEnv('AIWG_COCKPIT_EXECUTOR_TOKEN_FILE'),
    upgradeHook: requiredEnv('AIWG_COCKPIT_DAILY_UPGRADE_HOOK'),
    rollbackHook: requiredEnv('AIWG_COCKPIT_DAILY_ROLLBACK_HOOK'),
    transientHook: requiredEnv('AIWG_COCKPIT_DAILY_TRANSIENT_HOOK'),
    restartHook: requiredEnv('AIWG_COCKPIT_DAILY_EXECUTOR_RESTART_HOOK'),
    mutationFile: requiredEnv('AIWG_COCKPIT_LIVE_MUTATION_FILE'),
  };
  for (const [name, value] of Object.entries(pathInputs)) {
    if (!isAbsolute(value)) throw new Error(`${name} must be an absolute path`);
  }
  const tokenFile = resolve(pathInputs.tokenFile);
  const upgradeHook = resolve(pathInputs.upgradeHook);
  const rollbackHook = resolve(pathInputs.rollbackHook);
  const transientHook = resolve(pathInputs.transientHook);
  const restartHook = resolve(pathInputs.restartHook);
  const mutationFile = resolve(pathInputs.mutationFile);
  requiredEnv('AIWG_COCKPIT_EXECUTOR_URL');
  requiredEnv('AIWG_COCKPIT_LIVE_PROVIDER');
  const provisionImage = requiredEnv('AIWG_COCKPIT_LIVE_PROVISION_IMAGE');
  if (!/(?:@sha256:[0-9a-f]{64}|:[A-Za-z0-9][A-Za-z0-9._-]*)$/i.test(provisionImage)
    || /(?:^|:)latest$/i.test(provisionImage)) {
    throw new Error('AIWG_COCKPIT_LIVE_PROVISION_IMAGE must use an immutable non-latest tag or sha256 digest');
  }
  requiredEnv('AIWG_COCKPIT_LIVE_EXPECT_CWD_HOST');
  requiredEnv('AIWG_COCKPIT_LIVE_EXPECT_CWD_CONTAINER');
  const versions = {
    aiwg: {
      previous_stable: requiredEnv('AIWG_COCKPIT_DAILY_PREVIOUS_AIWG_VERSION').replace(/^v/, ''),
      candidate: requiredEnv('AIWG_COCKPIT_DAILY_CANDIDATE_AIWG_VERSION').replace(/^v/, ''),
    },
    executor: {
      previous_stable: requiredEnv('AIWG_COCKPIT_DAILY_PREVIOUS_EXECUTOR_VERSION'),
      candidate: requiredEnv('AIWG_COCKPIT_DAILY_CANDIDATE_EXECUTOR_VERSION'),
    },
  };
  for (const [product, refs] of Object.entries(versions)) {
    for (const [stage, value] of Object.entries(refs)) {
      if (!isImmutableVersionRef(value)) throw new Error(`${product} ${stage} must be an immutable version or commit`);
    }
    if (refs.previous_stable === refs.candidate) throw new Error(`${product} previous_stable and candidate must differ`);
  }
  for (const [stage, value] of Object.entries(versions.aiwg)) {
    if (!/^\d{4}\.\d{1,2}\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(value)) {
      throw new Error(`AIWG ${stage} must be an exact CalVer package version so aiwg --version can verify it`);
    }
  }
  if (scanForSecrets({ report: REPORT_BASE, executor_url: process.env.AIWG_COCKPIT_EXECUTOR_URL }).length) {
    throw new Error('report path or executor URL contains credential-shaped material');
  }
  await Promise.all([
    assertRegularFile(tokenFile, 'executor token file', { privateFile: true }),
    assertRegularFile(upgradeHook, 'upgrade hook', { executable: true }),
    assertRegularFile(rollbackHook, 'rollback hook', { executable: true }),
    assertRegularFile(transientHook, 'transient recovery hook', { executable: true }),
    assertRegularFile(restartHook, 'executor restart hook', { executable: true }),
    assertAbsent(mutationFile, 'mutation file'),
  ]);

  const phases = [];
  let upgradeAttempted = false;
  phases.push(await runLivePhase('previous_stable_smoke', versions.aiwg.previous_stable, versions.executor.previous_stable, false));
  if (phases.at(-1).status === 'pass') {
    upgradeAttempted = true;
    phases.push(await runHook('upgrade', upgradeHook, versions.aiwg.previous_stable, versions.aiwg.candidate));
    if (phases.at(-1).status === 'pass') {
      phases.push(await runLivePhase('candidate_smoke', versions.aiwg.candidate, versions.executor.candidate, true));
    }
  }
  if (upgradeAttempted) {
    phases.push(await runHook('rollback', rollbackHook, versions.aiwg.candidate, versions.aiwg.previous_stable));
    if (phases.at(-1).status === 'pass') {
      phases.push(await runLivePhase('rollback_smoke', versions.aiwg.previous_stable, versions.executor.previous_stable, false));
    }
  }

  const report = aggregateDailyGateEvidence({
    mode: 'live',
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    versions,
    phases,
    preview: {
      vm: { status: process.env.AIWG_COCKPIT_DAILY_VM_STATUS || 'skip', evidence: process.env.AIWG_COCKPIT_DAILY_VM_EVIDENCE || 'preview; not selected' },
      apple: { status: process.env.AIWG_COCKPIT_DAILY_APPLE_STATUS || 'skip', evidence: process.env.AIWG_COCKPIT_DAILY_APPLE_EVIDENCE || 'preview; not selected' },
    },
    blockers: (process.env.AIWG_COCKPIT_DAILY_BLOCKERS || '').split(',').map((value) => value.trim()).filter(Boolean),
    artifacts: { json: JSON_REPORT, markdown: MARKDOWN_REPORT },
  });
  const validation = validateDailyGateReport(report);
  if (!validation.ok) {
    report.result = 'fail';
    report.validation_errors = validation.errors;
  }
  await mkdir(dirname(REPORT_BASE), { recursive: true });
  await writeFile(JSON_REPORT, `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });
  await writeFile(MARKDOWN_REPORT, renderDailyGateMarkdown(report), { mode: 0o600 });
  process.stdout.write(`Cockpit daily gate: ${report.result}; reports: ${JSON_REPORT}, ${MARKDOWN_REPORT}\n`);
  if (report.result !== 'pass') process.exitCode = 1;
}

main().catch((error) => {
  process.stderr.write(`Cockpit daily gate failed: ${String(error?.message ?? error)}\n`);
  process.exitCode = 1;
});
