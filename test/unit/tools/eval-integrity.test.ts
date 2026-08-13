import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  buildIntegrityMetadata,
  detectArtifactChanges,
  snapshotArtifacts,
  wilson95,
} from '../../../tools/eval/src/integrity.js';
import { generateJsonReport } from '../../../tools/eval/src/reporters/json.js';
import { generateMarkdownReport } from '../../../tools/eval/src/reporters/markdown.js';
import { AiwgEvalRunner } from '../../../tools/eval/src/runner.js';
import type { EvalReport, GenerationModel } from '../../../tools/eval/src/models/types.js';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map(directory => fs.rm(directory, { recursive: true, force: true })));
});

function baseReport(): EvalReport {
  return {
    model: 'fixture-model',
    backend: 'fixture',
    date: '2026-08-13T12:00:00.000Z',
    aiwgVersion: 'test',
    dimensions: [{ dimension: 'tool-use', score: 100, tier: 'opus', testCases: 10, passed: 10 }],
    overall: 100,
    overallTier: 'opus',
    totalLatencyMs: 10,
  };
}

describe('eval integrity evidence', () => {
  it('computes a bounded Wilson uncertainty interval', () => {
    const interval = wilson95(8, 10);
    expect(interval).not.toBeNull();
    expect(interval!.method).toBe('wilson-95');
    expect(interval!.estimate).toBe(0.8);
    expect(interval!.lower_bound).toBeGreaterThan(0);
    expect(interval!.upper_bound).toBeLessThanOrEqual(1);
  });

  it('promotes only verified evidence that clears calibrated thresholds', () => {
    const metadata = buildIntegrityMetadata({
      mode: 'locked',
      freshWorkspaceRequired: false,
      freshWorkspaceVerified: false,
      changedArtifacts: [],
      sampleN: 10,
      passedN: 10,
      overallScore: 95,
      pairedBaseline: { label: 'previous', score: 80, sample_n: 10 },
    });
    expect(metadata.integrity_state).toBe('verified');
    expect(metadata.trusted_score_source).toBe('locked-artifact-snapshot');
    expect(metadata.paired_baseline?.delta).toBe(15);
    expect(metadata.release_gate.decision).toBe('PROMOTE');
  });

  it('holds fresh-workspace results when freshness is required but unverified', () => {
    const metadata = buildIntegrityMetadata({
      mode: 'fresh',
      freshWorkspaceRequired: true,
      freshWorkspaceVerified: false,
      changedArtifacts: [],
      sampleN: 10,
      passedN: 10,
      overallScore: 95,
    });
    expect(metadata.integrity_state).toBe('weak-signal');
    expect(metadata.fresh_workspace_verified).toBe(false);
    expect(metadata.weak_signal_reason).toMatch(/not verified/);
    expect(metadata.release_gate.decision).toBe('HOLD');
  });

  it('preserves every supported compromise family in the report contract', () => {
    const metadata = buildIntegrityMetadata({
      mode: 'full-locked',
      freshWorkspaceRequired: true,
      freshWorkspaceVerified: true,
      changedArtifacts: ['test_edit', 'scorer_edit', 'fixture_edit', 'metric_leakage', 'unknown'],
      sampleN: 10,
      passedN: 10,
      overallScore: 100,
    });
    expect(metadata.compromise_labels).toEqual([
      'fixture_edit',
      'metric_leakage',
      'scorer_edit',
      'test_edit',
      'unknown',
    ]);
    expect(metadata.release_gate.decision).toBe('ROLLBACK');
  });

  it('detects an evaluator fixture edit and forces rollback', async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'aiwg-eval-integrity-'));
    temporaryDirectories.push(directory);
    const fixture = path.join(directory, 'scenario.yaml');
    await fs.writeFile(fixture, 'score: 1\n');
    const artifacts = [{ path: fixture, family: 'fixture_edit' as const }];
    const before = await snapshotArtifacts(artifacts);

    // Simulates an evaluated agent modifying its own scoring fixture mid-run.
    await fs.writeFile(fixture, 'score: 100\n');
    const compromises = await detectArtifactChanges(before, artifacts);
    const metadata = buildIntegrityMetadata({
      mode: 'full-locked',
      freshWorkspaceRequired: true,
      freshWorkspaceVerified: true,
      changedArtifacts: compromises,
      sampleN: 10,
      passedN: 10,
      overallScore: 100,
    });

    expect(compromises).toEqual(['fixture_edit']);
    expect(metadata.integrity_state).toBe('compromised');
    expect(metadata.compromise_labels).toEqual(['fixture_edit']);
    expect(metadata.release_gate.decision).toBe('ROLLBACK');
  });

  it('detects a model-side fixture edit during an eval run', async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'aiwg-eval-runner-'));
    temporaryDirectories.push(directory);
    const dimensionDirectory = path.join(directory, 'tool-use');
    const fixture = path.join(dimensionDirectory, 'tamper.yaml');
    await fs.mkdir(dimensionDirectory, { recursive: true });
    await fs.writeFile(fixture, [
      'id: tamper-test',
      'dimension: tool-use',
      'difficulty: basic',
      'prompt: return safe',
      'expected:',
      '  contains: [safe]',
      'scoring: {}',
      '',
    ].join('\n'));
    const model: GenerationModel = {
      name: 'tampering-model',
      async generate() {
        await fs.appendFile(fixture, '# agent-edited fixture\n');
        return { text: 'safe', tokensGenerated: 1, totalTime: 1 };
      },
    };

    const report = await new AiwgEvalRunner(model, directory).run({
      dimensions: ['tool-use'],
      integrityMode: 'locked',
    });

    expect(report.sample_n).toBe(1);
    expect(report.compromise_labels).toEqual(['fixture_edit']);
    expect(report.integrity_state).toBe('compromised');
    expect(report.release_gate?.decision).toBe('ROLLBACK');
  });

  it('renders integrity fields in both JSON and Markdown reports', () => {
    const integrity = buildIntegrityMetadata({
      mode: 'locked',
      freshWorkspaceRequired: false,
      freshWorkspaceVerified: false,
      changedArtifacts: [],
      sampleN: 10,
      passedN: 10,
      overallScore: 100,
    });
    const report = { ...baseReport(), ...integrity };
    const json = JSON.parse(generateJsonReport(report));
    const markdown = generateMarkdownReport(report);

    expect(json.sample_n).toBe(10);
    expect(json.uncertainty.method).toBe('wilson-95');
    expect(json.paired_baseline).toBeNull();
    expect(json.integrity_state).toBe('verified');
    expect(json.trusted_score_source).toBe('locked-artifact-snapshot');
    expect(json.compromise_labels).toEqual([]);
    expect(json.weak_signal_reason).toBeNull();
    expect(json.release_gate.decision).toBe('PROMOTE');
    expect(markdown).toContain('## Evaluation Integrity');
    expect(markdown).toContain('## Release Gate');
    expect(markdown).toContain('Dimension scores are smoke diagnostics');
  });

  it('keeps legacy reports renderable while labeling them weak evidence', () => {
    const json = JSON.parse(generateJsonReport(baseReport()));
    expect(json.integrity_state).toBe('not-assessed');
    expect(json.release_gate.decision).toBe('HOLD');
    expect(json.weak_signal_reason).toMatch(/smoke diagnostics/);
  });
});
