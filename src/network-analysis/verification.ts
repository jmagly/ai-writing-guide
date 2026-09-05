import type { PacketEvidenceBundle } from './analyzer.js';

export const PACKET_VERIFICATION_SCHEMA = 'aiwg.sdlc.packet-verification.v1' as const;

export interface VerificationSide {
  evidence: PacketEvidenceBundle;
  buildId: string;
  environmentId: string;
  topologyFingerprint: string;
  clockOffsetMs: number | null;
}

export interface PacketVerificationConditions {
  vantagePoint: string;
  topologyAssumptions: string[];
  traffic: {
    kind: 'synthetic' | 'controlled-existing';
    scenario: string;
    isolation: string;
    capturesUnrelatedTraffic: false;
  };
  load: string;
  sampleWindowSeconds: number;
  clockAlignment: { method: string; toleranceMs: number };
}

export interface PacketVerificationReport {
  schema: typeof PACKET_VERIFICATION_SCHEMA;
  verificationId: string;
  useCase: 'defect' | 'change-validation' | 'regression' | 'performance' | 'protocol-verification' | 'troubleshooting';
  traceability: {
    requirementIds: string[];
    testIds: string[];
    defectOrChangeId: string;
    baseline: { buildId: string; bundleId: string; captureDigest: string; recipeId: string };
    candidate: { buildId: string; bundleId: string; captureDigest: string; recipeId: string };
  };
  comparability: {
    status: 'comparable' | 'partially-comparable' | 'incomparable';
    reasons: string[];
    excludedMetrics: string[];
  };
  conditions: PacketVerificationConditions & {
    environments: { baseline: string; candidate: string };
    topologyFingerprints: { baseline: string; candidate: string };
    clockOffsetsMs: { baseline: number | null; candidate: number | null };
  };
  normalization: { comparedFields: string[]; excludedVolatileFields: string[] };
  metricDifferences: Array<{ metric: string; baseline: number; candidate: number; delta: number }>;
  protocolDifferences: Array<{ protocol: string; baseline: number; candidate: number; delta: number }>;
  attachments: Array<{ side: 'baseline' | 'candidate'; bundleId: string; captureDigest: string; recipeId: string; artifactDigests: string[]; rawCaptureIncluded: false }>;
  performanceInterpretation: {
    causality: 'not-established';
    statement: string;
  };
}

const METRICS = [
  'summary.packet_count',
  'summary.endpoint_count',
  'summary.conversation_count',
  'summary.duration_seconds',
  'summary.tcp_retransmission_count',
  'summary.tcp_reset_count',
  'summary.encrypted_transport_frame_count',
] as const;

export function comparePacketEvidenceForVerification(input: {
  verificationId: string;
  useCase: PacketVerificationReport['useCase'];
  requirementIds: string[];
  testIds: string[];
  defectOrChangeId: string;
  executionContext: 'local' | 'ci' | 'operations';
  baseline: VerificationSide;
  candidate: VerificationSide;
  conditions: PacketVerificationConditions;
}): PacketVerificationReport {
  validateInput(input);
  const baselineRecipe = recipeId(input.baseline.evidence);
  const candidateRecipe = recipeId(input.candidate.evidence);
  const baselineContext = analysisContext(input.baseline.evidence);
  const candidateContext = analysisContext(input.candidate.evidence);
  const hardReasons: string[] = [];
  if (baselineRecipe !== candidateRecipe) hardReasons.push(`Recipe mismatch: ${baselineRecipe} vs ${candidateRecipe}.`);
  if (baselineContext.display_filter_digest !== candidateContext.display_filter_digest) hardReasons.push('Display-filter digests differ.');
  if (baselineContext.tool?.version !== candidateContext.tool?.version) hardReasons.push('TShark versions differ.');
  if (input.baseline.topologyFingerprint !== input.candidate.topologyFingerprint) hardReasons.push('Environment topology fingerprints differ.');
  if (!['completed', 'empty'].includes(input.baseline.evidence.status) || !['completed', 'empty'].includes(input.candidate.evidence.status)) {
    hardReasons.push('At least one evidence bundle is partial or unusable.');
  }
  const excludedMetrics: string[] = [];
  const clockReasons: string[] = [];
  if (input.baseline.clockOffsetMs === null || input.candidate.clockOffsetMs === null) {
    excludedMetrics.push('summary.duration_seconds');
    clockReasons.push('Clock alignment is unknown; timing comparison is excluded.');
  } else if (Math.abs(input.baseline.clockOffsetMs - input.candidate.clockOffsetMs) > input.conditions.clockAlignment.toleranceMs) {
    excludedMetrics.push('summary.duration_seconds');
    clockReasons.push('Clock-offset difference exceeds the declared tolerance; timing comparison is excluded.');
  }
  const comparableMetrics = hardReasons.length > 0 ? [] : METRICS.filter(metric => !excludedMetrics.includes(metric));
  const baselineMetrics = summaryMetrics(input.baseline.evidence);
  const candidateMetrics = summaryMetrics(input.candidate.evidence);
  const metricDifferences = comparableMetrics.flatMap(metric => {
    const baseline = baselineMetrics.get(metric);
    const candidate = candidateMetrics.get(metric);
    return typeof baseline !== 'number' || typeof candidate !== 'number'
      ? []
      : [{ metric, baseline, candidate, delta: candidate - baseline }];
  });
  const protocolDifferences = hardReasons.length > 0 ? [] : compareProtocols(baselineMetrics, candidateMetrics);
  const reasons = [...hardReasons, ...clockReasons];
  return {
    schema: PACKET_VERIFICATION_SCHEMA,
    verificationId: input.verificationId,
    useCase: input.useCase,
    traceability: {
      requirementIds: [...input.requirementIds],
      testIds: [...input.testIds],
      defectOrChangeId: input.defectOrChangeId,
      baseline: traceSide(input.baseline, baselineRecipe),
      candidate: traceSide(input.candidate, candidateRecipe),
    },
    comparability: {
      status: hardReasons.length > 0 ? 'incomparable' : excludedMetrics.length > 0 ? 'partially-comparable' : 'comparable',
      reasons,
      excludedMetrics,
    },
    conditions: {
      ...structuredClone(input.conditions),
      environments: { baseline: input.baseline.environmentId, candidate: input.candidate.environmentId },
      topologyFingerprints: { baseline: input.baseline.topologyFingerprint, candidate: input.candidate.topologyFingerprint },
      clockOffsetsMs: { baseline: input.baseline.clockOffsetMs, candidate: input.candidate.clockOffsetMs },
    },
    normalization: {
      comparedFields: [...comparableMetrics, 'summary.protocol_hierarchy'],
      excludedVolatileFields: ['capture digest', 'frame number', 'stream ID', 'absolute timestamp', 'endpoint identity', 'ephemeral port'],
    },
    metricDifferences,
    protocolDifferences,
    attachments: [attachment('baseline', input.baseline, baselineRecipe), attachment('candidate', input.candidate, candidateRecipe)],
    performanceInterpretation: {
      causality: 'not-established',
      statement: 'Differences are observations under the recorded traffic, load, topology, vantage-point, sample-window, and clock conditions; they do not establish that the build or change caused the result.',
    },
  };
}

function validateInput(input: Parameters<typeof comparePacketEvidenceForVerification>[0]): void {
  for (const [label, value] of Object.entries({ verification: input.verificationId, change: input.defectOrChangeId })) required(value, label);
  if (input.requirementIds.length === 0 || input.testIds.length === 0) throw new Error('Packet verification requires requirement and test identities');
  stringArray(input.requirementIds, 'Requirement IDs');
  stringArray(input.testIds, 'Test IDs');
  stringArray(input.conditions.topologyAssumptions, 'Topology assumptions');
  if (input.conditions.topologyAssumptions.length === 0) throw new Error('Packet verification requires topology assumptions');
  for (const value of [input.baseline.buildId, input.candidate.buildId, input.baseline.environmentId, input.candidate.environmentId,
    input.baseline.topologyFingerprint, input.candidate.topologyFingerprint, input.conditions.vantagePoint, input.conditions.traffic.scenario,
    input.conditions.traffic.isolation, input.conditions.load, input.conditions.clockAlignment.method]) required(value, 'Verification condition');
  if (!Number.isFinite(input.conditions.sampleWindowSeconds) || input.conditions.sampleWindowSeconds <= 0
    || !Number.isFinite(input.conditions.clockAlignment.toleranceMs) || input.conditions.clockAlignment.toleranceMs < 0) {
    throw new Error('Packet verification measurement bounds are invalid');
  }
  if (input.conditions.traffic.capturesUnrelatedTraffic !== false) throw new Error('Packet verification must exclude unrelated traffic');
  if (input.executionContext === 'ci' && input.conditions.traffic.kind !== 'synthetic') {
    throw new Error('CI packet verification requires isolated synthetic traffic');
  }
}

function analysisContext(evidence: PacketEvidenceBundle): any {
  const contexts = evidence.capture.analysis_contexts as any[];
  if (!Array.isArray(contexts) || contexts.length !== 1) throw new Error('Packet verification requires one analysis context per bundle');
  return contexts[0];
}

function recipeId(evidence: PacketEvidenceBundle): string {
  return required((evidence.provenance as any)?.recipe_id, 'Recipe identity');
}

function traceSide(side: VerificationSide, recipe: string) {
  return { buildId: side.buildId, bundleId: side.evidence.bundle_id, captureDigest: String(side.evidence.capture.capture_digest), recipeId: recipe };
}

function attachment(sideName: 'baseline' | 'candidate', side: VerificationSide, recipe: string) {
  return {
    side: sideName,
    bundleId: side.evidence.bundle_id,
    captureDigest: String(side.evidence.capture.capture_digest),
    recipeId: recipe,
    artifactDigests: side.evidence.artifacts.map((artifact: any) => `${artifact.digest.algorithm}:${artifact.digest.value}`),
    rawCaptureIncluded: false as const,
  };
}

function summaryMetrics(evidence: PacketEvidenceBundle): Map<string, number | string> {
  const summary = evidence.evidence_items.find(item => String(item.evidence_id).includes('capture-summary'));
  const fields = Array.isArray(summary?.observed_fields) ? summary.observed_fields as Array<{ name: string; value: unknown }> : [];
  const result = new Map<string, number | string>();
  for (const field of fields) {
    if (typeof field.value === 'number' || typeof field.value === 'string') result.set(field.name, field.value);
  }
  return result;
}

function compareProtocols(baseline: Map<string, number | string>, candidate: Map<string, number | string>) {
  const left = protocolCounts(baseline.get('summary.protocol_hierarchy'));
  const right = protocolCounts(candidate.get('summary.protocol_hierarchy'));
  return [...new Set([...left.keys(), ...right.keys()])].sort().map(protocol => ({
    protocol, baseline: left.get(protocol) ?? 0, candidate: right.get(protocol) ?? 0,
    delta: (right.get(protocol) ?? 0) - (left.get(protocol) ?? 0),
  }));
}

function protocolCounts(value: number | string | undefined): Map<string, number> {
  const result = new Map<string, number>();
  if (typeof value !== 'string') return result;
  for (const entry of value.split(',')) {
    const [protocol, count] = entry.split(':');
    if (protocol && Number.isFinite(Number(count))) result.set(protocol, Number(count));
  }
  return result;
}

function required(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim() || value.includes('\0')) throw new Error(`${label} is required`);
  return value;
}

function stringArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string' || !item.trim())) throw new Error(`${label} must contain non-empty strings`);
  return [...value];
}
