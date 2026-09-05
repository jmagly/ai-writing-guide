import { formatEvidenceCitation, validateEvidenceReferences, type EvidenceCitation } from './citations.js';
import { assertLocalOutputAllowed, type NetworkAnalysisPolicy } from './governance.js';
import type { PacketEvidenceBundle } from './analyzer.js';

export const RESEARCH_PACKET_SOURCE_SCHEMA = 'aiwg.research.packet-evidence-source.v1' as const;

export interface PacketCollectionContext {
  owner: string;
  authorityRef: string;
  purpose: string;
  representativeness: string;
  clockSource: string;
  timezone: string;
  missingTraffic: string;
  encryptionVisibility: string;
  analystLimitations: string[];
}

export interface RawCaptureResearchApproval {
  approvalRef: string;
  approvedBy: string;
  basis: string;
  captureDigest: string;
  payloadOptIn: true;
  policy: NetworkAnalysisPolicy;
}

export interface ResearchPacketCitation {
  citation: string;
  captureDigest: string;
  locator: EvidenceCitation['locator'];
  observedAt: string | null;
  timeBasis: 'capture-frame-time-utc' | 'not-recorded';
}

export interface ResearchPacketClaim {
  claimId: string;
  kind: 'observation' | 'inference';
  statement: string;
  confidence: string;
  citations: ResearchPacketCitation[];
  inferenceInputs: string[];
}

export interface ResearchPacketEvidenceSource {
  schema: typeof RESEARCH_PACKET_SOURCE_SCHEMA;
  refId: string;
  title: string;
  sourceType: 'packet-evidence';
  scholarlyClassification: 'non-scholarly-observational-evidence';
  quality: {
    grade: 'not-applicable';
    framework: 'packet-evidence-limitations';
    reason: string;
  };
  evidenceBundle: { bundleId: string; status: string; captureDigest: string; createdAt: string };
  collection: PacketCollectionContext;
  analysisContexts: Array<{
    contextDigest: string;
    tool: { name: string; version: string; executablePath: string };
    profile: string;
    displayFilterDigest: string;
    captureFilterDigest: string;
    configDigests: string[];
    commandArgv: string[];
  }>;
  derivedArtifacts: Array<{
    artifactId: string;
    mediaType: string;
    uri: string;
    digest: { algorithm: string; value: string };
    dataHandling: {
      sensitivity: string;
      payloadContent: string;
      redaction: { state: string; method: string; redactedFields: string[] };
      retentionClass: string;
      disclosureState: string;
      allowedAudiences: string[];
    };
  }>;
  rawCapture: { included: false } | {
    included: true;
    digest: string;
    sourceUri: string;
    approvalRef: string;
    approvedBy: string;
    basis: string;
  };
  claims: ResearchPacketClaim[];
  provenance: {
    actor: string;
    activity: string;
    startedAt: string;
    endedAt: string;
    recipeId: string;
    authorizationRefs: string[];
  };
  limitations: string[];
}

export function inductPacketEvidenceSource(input: {
  refId: string;
  title: string;
  evidence: PacketEvidenceBundle;
  collection: PacketCollectionContext;
  rawCaptureApproval?: RawCaptureResearchApproval;
}): ResearchPacketEvidenceSource {
  validateResearchInput(input);
  validateEvidenceReferences(input.evidence as any);
  const captureDigest = String(input.evidence.capture.capture_digest);
  const rawCapture = rawCaptureDecision(input.evidence, input.rawCaptureApproval);
  const timestamps = frameTimestampIndex(input.evidence);
  const analysisContexts = ((input.evidence.capture.analysis_contexts ?? []) as any[]).map(context => ({
    contextDigest: requiredString(context.context_digest, 'Analysis context digest'),
    tool: {
      name: requiredString(context.tool?.name, 'Analysis tool name'),
      version: requiredString(context.tool?.version, 'Analysis tool version'),
      executablePath: requiredString(context.tool?.executable_path, 'Analysis tool path'),
    },
    profile: requiredString(context.profile, 'Analysis profile'),
    displayFilterDigest: requiredString(context.display_filter_digest, 'Display-filter digest'),
    captureFilterDigest: requiredString(context.capture_filter_digest, 'Capture-filter digest'),
    configDigests: stringArray(context.config_digests, 'Config digests'),
    commandArgv: stringArray(context.command_argv, 'Analysis argv'),
  }));
  const claims = input.evidence.evidence_items.map((item, index) => researchClaim(item, index, timestamps));
  const provenance = input.evidence.provenance as any;
  const limitations = [
    `Capture analysis status: ${input.evidence.status}`,
    `Representativeness: ${input.collection.representativeness}`,
    `Clock source: ${input.collection.clockSource}; source timezone: ${input.collection.timezone}`,
    `Missing traffic: ${input.collection.missingTraffic}`,
    `Encryption visibility: ${input.collection.encryptionVisibility}`,
    ...input.collection.analystLimitations.map(value => `Analyst limitation: ${value}`),
  ];
  return {
    schema: RESEARCH_PACKET_SOURCE_SCHEMA,
    refId: input.refId,
    title: input.title.trim(),
    sourceType: 'packet-evidence',
    scholarlyClassification: 'non-scholarly-observational-evidence',
    quality: {
      grade: 'not-applicable',
      framework: 'packet-evidence-limitations',
      reason: 'GRADE study ratings do not apply to a collected network trace; assess authority, integrity, scope, and limitations instead.',
    },
    evidenceBundle: {
      bundleId: input.evidence.bundle_id,
      status: input.evidence.status,
      captureDigest,
      createdAt: input.evidence.created_at,
    },
    collection: structuredClone(input.collection),
    analysisContexts,
    derivedArtifacts: input.evidence.artifacts.map(sanitizeDerivedArtifact),
    rawCapture,
    claims,
    provenance: {
      actor: requiredString(provenance.actor, 'Provenance actor'),
      activity: requiredString(provenance.activity, 'Provenance activity'),
      startedAt: requiredString(provenance.started_at, 'Provenance start'),
      endedAt: requiredString(provenance.ended_at, 'Provenance end'),
      recipeId: requiredString(provenance.recipe_id, 'Provenance recipe'),
      authorizationRefs: stringArray(provenance.authorization_refs, 'Authorization references'),
    },
    limitations,
  };
}

function sanitizeDerivedArtifact(artifact: any): ResearchPacketEvidenceSource['derivedArtifacts'][number] {
  const handling = artifact.data_handling;
  return {
    artifactId: requiredString(artifact.artifact_id, 'Derived artifact ID'),
    mediaType: requiredString(artifact.media_type, 'Derived artifact media type'),
    uri: requiredString(artifact.uri, 'Derived artifact URI'),
    digest: {
      algorithm: requiredString(artifact.digest?.algorithm, 'Derived artifact digest algorithm'),
      value: requiredString(artifact.digest?.value, 'Derived artifact digest value'),
    },
    dataHandling: {
      sensitivity: requiredString(handling?.sensitivity, 'Derived artifact sensitivity'),
      payloadContent: requiredString(handling?.payload_content, 'Derived artifact payload declaration'),
      redaction: {
        state: requiredString(handling?.redaction?.state, 'Derived artifact redaction state'),
        method: requiredString(handling?.redaction?.method, 'Derived artifact redaction method'),
        redactedFields: stringArray(handling?.redaction?.redacted_fields, 'Derived artifact redacted fields'),
      },
      retentionClass: requiredString(handling?.retention?.class, 'Derived artifact retention class'),
      disclosureState: requiredString(handling?.disclosure?.state, 'Derived artifact disclosure state'),
      allowedAudiences: stringArray(handling?.disclosure?.allowed_audiences, 'Derived artifact allowed audiences'),
    },
  };
}

function researchClaim(item: Record<string, unknown>, index: number, timestamps: Map<number, string>): ResearchPacketClaim {
  const basis = requiredString(item.basis, `Evidence item ${index + 1} basis`);
  if (basis !== 'observation' && basis !== 'inference') throw new Error(`Evidence item ${index + 1} must distinguish observation from inference`);
  const citations = (item.citations as EvidenceCitation[]).map(citation => {
    const frame = citation.locator.type === 'frame' ? citation.locator.frame_number : frameForStream(item.citations as EvidenceCitation[]);
    const observedAt = frame === null ? null : timestamps.get(frame) ?? null;
    return {
      citation: formatEvidenceCitation(citation),
      captureDigest: citation.capture_digest,
      locator: structuredClone(citation.locator),
      observedAt,
      timeBasis: observedAt === null ? 'not-recorded' as const : 'capture-frame-time-utc' as const,
    };
  });
  return {
    claimId: requiredString(item.evidence_id, `Evidence item ${index + 1} ID`),
    kind: basis,
    statement: requiredString(item.statement, `Evidence item ${index + 1} statement`),
    confidence: requiredString(item.confidence, `Evidence item ${index + 1} confidence`),
    citations,
    inferenceInputs: basis === 'inference' ? stringArray((item.inference as any)?.inputs, 'Inference inputs') : [],
  };
}

function rawCaptureDecision(evidence: PacketEvidenceBundle, approval: RawCaptureResearchApproval | undefined): ResearchPacketEvidenceSource['rawCapture'] {
  if (!approval) return { included: false };
  const captureDigest = String(evidence.capture.capture_digest);
  if (!approval.approvalRef.trim() || !approval.approvedBy.trim() || !approval.basis.trim() || approval.captureDigest !== captureDigest) {
    throw new Error('Raw capture research inclusion requires an exact, complete approval record');
  }
  assertLocalOutputAllowed(approval.policy, { content: ['metadata', 'raw-packets'], payloadOptIn: approval.payloadOptIn });
  return {
    included: true,
    digest: captureDigest,
    sourceUri: requiredString(evidence.capture.source_uri, 'Capture source URI'),
    approvalRef: approval.approvalRef,
    approvedBy: approval.approvedBy,
    basis: approval.basis,
  };
}

function frameTimestampIndex(evidence: PacketEvidenceBundle): Map<number, string> {
  const result = new Map<number, string>();
  for (const item of evidence.evidence_items) {
    const fields = Array.isArray(item.observed_fields) ? item.observed_fields as Array<{ name?: unknown; value?: unknown }> : [];
    const frame = Number(fields.find(field => field.name === 'frame.number')?.value);
    const epoch = Number(fields.find(field => field.name === 'frame.time_epoch')?.value);
    if (Number.isSafeInteger(frame) && frame > 0 && Number.isFinite(epoch) && epoch >= 0) {
      result.set(frame, new Date(epoch * 1000).toISOString());
    }
  }
  return result;
}

function frameForStream(citations: EvidenceCitation[]): number | null {
  const frame = citations.find(citation => citation.locator.type === 'frame');
  return frame?.locator.type === 'frame' ? frame.locator.frame_number : null;
}

function validateResearchInput(input: {
  refId: string;
  title: string;
  evidence: PacketEvidenceBundle;
  collection: PacketCollectionContext;
}): void {
  if (!/^REF-[0-9]{3,}$/.test(input.refId)) throw new Error('Packet evidence research source requires a REF-NNN identifier');
  requiredString(input.title, 'Research source title');
  if (input.evidence.kind !== 'PacketEvidenceBundle' || input.evidence.status === 'error') {
    throw new Error('Research induction requires a usable PacketEvidenceBundle');
  }
  for (const [label, value] of Object.entries({
    owner: input.collection.owner,
    authority: input.collection.authorityRef,
    purpose: input.collection.purpose,
    representativeness: input.collection.representativeness,
    clock: input.collection.clockSource,
    timezone: input.collection.timezone,
    missingTraffic: input.collection.missingTraffic,
    encryption: input.collection.encryptionVisibility,
  })) requiredString(value, `Collection ${label}`);
  if (!Array.isArray(input.collection.analystLimitations) || input.collection.analystLimitations.length === 0) {
    throw new Error('At least one analyst limitation is required');
  }
  stringArray(input.collection.analystLimitations, 'Analyst limitations');
}

function requiredString(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim() || value.includes('\0')) throw new Error(`${label} is required`);
  return value;
}

function stringArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string' || !item.trim() || item.includes('\0'))) {
    throw new Error(`${label} must contain non-empty strings`);
  }
  return [...value];
}
