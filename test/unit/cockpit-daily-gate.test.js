import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import {
  REQUIRED_CHECKS,
  aggregateDailyGateEvidence,
  buildDailyGateReport,
  isImmutableVersionRef,
  renderDailyGateMarkdown,
  scanForSecrets,
  validateDailyGateReport,
} from '../../apps/cockpit/scripts/cockpit-daily-gate-lib.mjs';

function passingInput() {
  return {
    mode: 'live',
    started_at: '2026-07-21T20:00:00.000Z',
    finished_at: '2026-07-21T20:05:00.000Z',
    versions: {
      aiwg: { previous_stable: 'v2026.7.14', candidate: '0123456789abcdef' },
      executor: { previous_stable: 'v2026.7.9', candidate: 'abcdef0123456789' },
    },
    runtimes: [
      { runtime: 'apple', tier: 'preview', status: 'skip', evidence: 'no Apple runner assigned' },
      { runtime: 'container', tier: 'required', status: 'pass', evidence: 'managed tmux session' },
      { runtime: 'vm', tier: 'preview', status: 'blocked', evidence: 'preview capacity issue' },
      { runtime: 'host', tier: 'required', status: 'pass', evidence: 'managed tmux session' },
    ],
    checks: REQUIRED_CHECKS.map((id, index) => ({
      id,
      required: true,
      status: 'pass',
      duration_ms: index,
      evidence: `${id} evidence`,
    })),
    phases: [
      { id: 'previous_stable_smoke', status: 'pass', duration_ms: 10, evidence: 'baseline healthy' },
      { id: 'upgrade', status: 'pass', duration_ms: 20, evidence: 'candidate installed' },
      { id: 'candidate_smoke', status: 'pass', duration_ms: 30, evidence: 'candidate healthy' },
      { id: 'rollback', status: 'pass', duration_ms: 20, evidence: 'previous stable restored' },
      { id: 'rollback_smoke', status: 'pass', duration_ms: 30, evidence: 'rollback healthy' },
    ],
    blockers: ['aiwg#1732'],
    artifacts: { json: 'test-results/cockpit-daily.json', markdown: 'test-results/cockpit-daily.md' },
  };
}

describe('Cockpit daily gate report contract', () => {
  it('keeps provider turns bounded and prevents PTY command echo from satisfying mutation proof', async () => {
    const liveUat = await readFile(new URL('../uat/cockpit-live.uat.ts', import.meta.url), 'utf8');
    expect(liveUat).toContain('AIWG_COCKPIT_LIVE_WORKLOAD_TIMEOUT_MS');
    expect(liveUat).toContain('WORKLOAD_TIMEOUT_MS || 120_000');
    expect(liveUat).toContain("shellQuote('AIWG_COCKPIT_MUTATION')");
    expect(liveUat).toContain("shellQuote('_OK')");
    expect(liveUat).not.toContain('shellQuote(MUTATION_MARKER)');
    expect(liveUat).toContain('waitForSessionAdoption');
    expect(liveUat).toContain('existing ${target} readiness');
  });

  it('accepts complete live host/container evidence and deterministically orders rows', () => {
    const report = buildDailyGateReport(passingInput());
    expect(report.result).toBe('pass');
    expect(report.runtimes.map((row) => row.runtime)).toEqual(['host', 'container', 'vm', 'apple']);
    expect(report.checks.map((row) => row.id)).toEqual(REQUIRED_CHECKS);
    expect(validateDailyGateReport(report)).toEqual({ ok: true, errors: [] });
    const markdown = renderDailyGateMarkdown(report);
    expect(markdown.indexOf('| host |')).toBeLessThan(markdown.indexOf('| container |'));
    expect(markdown).toContain('Result: **PASS**');
  });

  it.each(['skip', 'blocked', 'fail'])('fails closed when a required check is %s', (status) => {
    const input = passingInput();
    input.checks.find((row) => row.id === 'transient_recovery').status = status;
    const report = buildDailyGateReport(input);
    expect(report.result).toBe('fail');
    expect(report.required_failures).toContain(`check:transient_recovery:${status}`);
    expect(validateDailyGateReport(report).ok).toBe(false);
  });

  it('fails closed when required host or container evidence is missing', () => {
    const input = passingInput();
    input.runtimes = input.runtimes.filter((row) => row.runtime !== 'container');
    const report = buildDailyGateReport(input);
    expect(report.result).toBe('fail');
    expect(report.required_failures).toContain('runtime:container:missing');
  });

  it('keeps VM and Apple preview failures non-blocking', () => {
    const input = passingInput();
    input.runtimes.find((row) => row.runtime === 'vm').status = 'fail';
    input.runtimes.find((row) => row.runtime === 'apple').status = 'skip';
    const report = buildDailyGateReport(input);
    expect(report.result).toBe('pass');
    expect(validateDailyGateReport(report).ok).toBe(true);
  });

  it('rejects synthetic evidence and mutable or ambiguous version refs', () => {
    const input = passingInput();
    input.mode = 'synthetic';
    input.versions.executor.candidate = 'latest';
    const report = buildDailyGateReport(input);
    const validation = validateDailyGateReport(report);
    expect(validation.ok).toBe(false);
    expect(validation.errors).toContain('mode must be live; synthetic evidence cannot satisfy the daily gate');
    expect(validation.errors).toContain('versions.executor.candidate must be an immutable version or commit');
    expect(isImmutableVersionRef('main')).toBe(false);
    expect(isImmutableVersionRef('v2026.7.15')).toBe(true);
  });

  it.each([
    'Authorization: Bearer synthetic-but-secret-shaped-token',
    'https://operator:synthetic-password@example.test/health',
    'https://example.test/api?token=synthetic-value',
    'api_key=synthetic-secret-shaped-value',
    'token_file=/protected/synthetic-token',
    'AKIA1234567890ABCDEF',
    'eyJsyntheticHeader.syntheticPayload.syntheticSignature',
    '-----BEGIN PRIVATE KEY-----',
  ])('detects secret-shaped report content: %s', (value) => {
    expect(scanForSecrets({ evidence: value })).not.toEqual([]);
  });

  it('allows safe auth booleans and redaction markers', () => {
    expect(scanForSecrets({ executor_auth_configured: true, authorization: '[REDACTED]' })).toEqual([]);
  });

  it('aggregates live phase evidence and fails when a candidate daily step skipped', () => {
    const evidence = [
      'protected executor authorization boundary',
      'provision host',
      'matrix host',
      'provision container',
      'matrix container',
      'daily scoped cleanup',
      'daily transient recovery',
      'daily Bridge restart continuity',
      'daily executor restart continuity',
      'managed PTY working directory host',
      'managed PTY working directory container',
    ].map((name) => ({ name, status: 'pass', detail: 'synthetic fixture' }));
    const versions = passingInput().versions;
    const liveReport = (executorVersion, rows = evidence) => ({
      result: 'pass',
      executor_auth_configured: true,
      executor_identity: { version: executorVersion },
      mutation_file: '/tmp/synthetic-cockpit-mutation',
      evidence: rows,
    });
    const phases = [
      { id: 'previous_stable_smoke', status: 'pass', duration_ms: 10, observed_aiwg_version: versions.aiwg.previous_stable, report: liveReport(versions.executor.previous_stable) },
      { id: 'upgrade', status: 'pass', duration_ms: 10 },
      { id: 'candidate_smoke', status: 'pass', duration_ms: 10, observed_aiwg_version: versions.aiwg.candidate, report: liveReport(versions.executor.candidate) },
      { id: 'rollback', status: 'pass', duration_ms: 10 },
      { id: 'rollback_smoke', status: 'pass', duration_ms: 10, observed_aiwg_version: versions.aiwg.previous_stable, report: liveReport(versions.executor.previous_stable) },
    ];
    const passing = aggregateDailyGateEvidence({
      mode: 'live',
      started_at: '2026-07-21T20:00:00.000Z',
      finished_at: '2026-07-21T20:05:00.000Z',
      versions,
      phases,
    });
    expect(validateDailyGateReport(passing)).toEqual({ ok: true, errors: [] });

    const candidate = phases.find((phase) => phase.id === 'candidate_smoke');
    candidate.report = liveReport(versions.executor.candidate, evidence.map((row) => (
      row.name === 'daily transient recovery' ? { ...row, status: 'skip' } : row
    )));
    const failing = aggregateDailyGateEvidence({
      mode: 'live',
      started_at: '2026-07-21T20:00:00.000Z',
      finished_at: '2026-07-21T20:05:00.000Z',
      versions,
      phases,
    });
    expect(failing.result).toBe('fail');
    expect(failing.required_failures).toContain('check:transient_recovery:fail');

    candidate.report = liveReport(versions.executor.candidate);
    candidate.report.executor_identity = { version_hint: versions.executor.candidate };
    const hintOnly = aggregateDailyGateEvidence({
      mode: 'live',
      started_at: '2026-07-21T20:00:00.000Z',
      finished_at: '2026-07-21T20:05:00.000Z',
      versions,
      phases,
    });
    expect(hintOnly.required_failures).toContain('check:upgrade_candidate_smoke:fail');
  });
});
