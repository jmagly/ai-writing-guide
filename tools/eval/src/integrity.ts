import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import type {
  CompromiseLabel,
  EvalIntegrityMetadata,
  IntegrityMode,
  PairedBaselineInput,
  ProtectedEvalArtifact,
  ReleaseGateDecision,
  ReleaseGateThresholds,
  UncertaintyEstimate,
} from './models/types.js';

interface SnapshotEntry {
  family: ProtectedEvalArtifact['family'];
  hash: string;
}

export type ArtifactSnapshot = Map<string, SnapshotEntry>;

export interface IntegrityEvidence {
  mode: IntegrityMode;
  freshWorkspaceRequired: boolean;
  freshWorkspaceVerified: boolean;
  changedArtifacts: CompromiseLabel[];
  sampleN: number;
  passedN: number;
  overallScore: number;
  pairedBaseline?: PairedBaselineInput;
  thresholds?: Partial<ReleaseGateThresholds>;
}

export const DEFAULT_RELEASE_THRESHOLDS: ReleaseGateThresholds = {
  promote_score: 80,
  rollback_score: 50,
  minimum_sample_n: 5,
  minimum_interval_lower_bound: 0.5,
};

async function listFiles(target: string): Promise<string[]> {
  try {
    const stat = await fs.stat(target);
    if (stat.isFile()) return [path.resolve(target)];
    if (!stat.isDirectory()) return [];
    const entries = await fs.readdir(target, { withFileTypes: true });
    const nested = await Promise.all(entries.map(entry => listFiles(path.join(target, entry.name))));
    return nested.flat().sort();
  } catch {
    return [];
  }
}

async function sha256(file: string): Promise<string> {
  return createHash('sha256').update(await fs.readFile(file)).digest('hex');
}

/** Capture protected scoring, test, and fixture artifacts before an eval run. */
export async function snapshotArtifacts(artifacts: ProtectedEvalArtifact[]): Promise<ArtifactSnapshot> {
  const snapshot: ArtifactSnapshot = new Map();
  for (const artifact of artifacts) {
    for (const file of await listFiles(artifact.path)) {
      snapshot.set(file, { family: artifact.family, hash: await sha256(file) });
    }
  }
  return snapshot;
}

/** Return compromise families whose protected files changed, disappeared, or appeared. */
export async function detectArtifactChanges(
  before: ArtifactSnapshot,
  artifacts: ProtectedEvalArtifact[],
): Promise<CompromiseLabel[]> {
  const after = await snapshotArtifacts(artifacts);
  const labels = new Set<CompromiseLabel>();
  const files = new Set([...before.keys(), ...after.keys()]);
  for (const file of files) {
    const oldEntry = before.get(file);
    const newEntry = after.get(file);
    if (!oldEntry || !newEntry || oldEntry.hash !== newEntry.hash) {
      labels.add(newEntry?.family ?? oldEntry?.family ?? 'unknown');
    }
  }
  return [...labels].sort();
}

/** Wilson score interval for a binary pass/fail sample. */
export function wilson95(passed: number, total: number): UncertaintyEstimate | null {
  if (total <= 0) return null;
  const z = 1.959963984540054;
  const estimate = passed / total;
  const denominator = 1 + (z * z) / total;
  const center = (estimate + (z * z) / (2 * total)) / denominator;
  const margin = (z / denominator) * Math.sqrt(
    (estimate * (1 - estimate)) / total + (z * z) / (4 * total * total),
  );
  return {
    method: 'wilson-95',
    confidence: 0.95,
    estimate,
    lower_bound: Math.max(0, center - margin),
    upper_bound: Math.min(1, center + margin),
  };
}

function releaseGate(
  integrity: Omit<EvalIntegrityMetadata, 'release_gate'>,
  score: number,
  partialThresholds?: Partial<ReleaseGateThresholds>,
): ReleaseGateDecision {
  const thresholds = { ...DEFAULT_RELEASE_THRESHOLDS, ...partialThresholds };
  const reasons: string[] = [];

  if (integrity.integrity_state === 'compromised' || score < thresholds.rollback_score) {
    if (integrity.integrity_state === 'compromised') reasons.push('protected evaluation artifacts changed during the run');
    if (score < thresholds.rollback_score) reasons.push(`overall score ${score} is below rollback threshold ${thresholds.rollback_score}`);
    return { decision: 'ROLLBACK', reasons, thresholds };
  }

  if (integrity.integrity_state !== 'verified') reasons.push(`integrity state is ${integrity.integrity_state}, not verified`);
  if (integrity.sample_n < thresholds.minimum_sample_n) reasons.push(`sample_n ${integrity.sample_n} is below minimum ${thresholds.minimum_sample_n}`);
  if (!integrity.uncertainty) reasons.push('uncertainty is unavailable');
  else if (integrity.uncertainty.lower_bound < thresholds.minimum_interval_lower_bound) {
    reasons.push(
      `uncertainty lower bound ${integrity.uncertainty.lower_bound.toFixed(3)} is below ${thresholds.minimum_interval_lower_bound}`,
    );
  }
  if (score < thresholds.promote_score) reasons.push(`overall score ${score} is below promote threshold ${thresholds.promote_score}`);

  return reasons.length
    ? { decision: 'HOLD', reasons, thresholds }
    : { decision: 'PROMOTE', reasons: ['verified evidence satisfies calibrated release thresholds'], thresholds };
}

export function buildIntegrityMetadata(evidence: IntegrityEvidence): EvalIntegrityMetadata {
  const compromiseLabels = [...new Set(evidence.changedArtifacts)].sort();
  const freshnessMissing = evidence.freshWorkspaceRequired && !evidence.freshWorkspaceVerified;
  let integrityState: EvalIntegrityMetadata['integrity_state'];
  if (compromiseLabels.length) integrityState = 'compromised';
  else if (evidence.mode === 'standard') integrityState = 'not-assessed';
  else if (freshnessMissing) integrityState = 'weak-signal';
  else integrityState = 'verified';

  const weakReasons: string[] = [];
  if (evidence.mode === 'standard') weakReasons.push('strict integrity mode was not requested; scores are smoke diagnostics');
  if (freshnessMissing) weakReasons.push('fresh workspace was required but not verified');
  if (compromiseLabels.length) weakReasons.push(`detected protected artifact changes: ${compromiseLabels.join(', ')}`);

  const base: Omit<EvalIntegrityMetadata, 'release_gate'> = {
    sample_n: evidence.sampleN,
    uncertainty: wilson95(evidence.passedN, evidence.sampleN),
    paired_baseline: evidence.pairedBaseline
      ? {
          label: evidence.pairedBaseline.label ?? 'baseline',
          baseline_score: evidence.pairedBaseline.score,
          current_score: evidence.overallScore,
          delta: evidence.overallScore - evidence.pairedBaseline.score,
          sample_n: evidence.pairedBaseline.sample_n ?? null,
        }
      : null,
    integrity_mode: evidence.mode,
    fresh_workspace_required: evidence.freshWorkspaceRequired,
    fresh_workspace_verified: evidence.freshWorkspaceVerified,
    integrity_state: integrityState,
    trusted_score_source: integrityState === 'verified'
      ? evidence.mode === 'full-locked' ? 'full-locked-workspace'
        : evidence.mode === 'locked' ? 'locked-artifact-snapshot'
          : 'fresh-workspace'
      : 'local-unverified',
    compromise_labels: compromiseLabels,
    weak_signal_reason: weakReasons.length ? weakReasons.join('; ') : null,
  };
  return { ...base, release_gate: releaseGate(base, evidence.overallScore, evidence.thresholds) };
}

export function legacyIntegrityMetadata(report: { overall: number }): EvalIntegrityMetadata {
  return buildIntegrityMetadata({
    mode: 'standard',
    freshWorkspaceRequired: false,
    freshWorkspaceVerified: false,
    changedArtifacts: [],
    sampleN: 0,
    passedN: 0,
    overallScore: report.overall,
  });
}
