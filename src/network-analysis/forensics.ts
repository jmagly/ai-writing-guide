import { formatEvidenceCitation, validateEvidenceReferences, type EvidenceCitation } from './citations.js';
import { assertLocalOutputAllowed, type NetworkAnalysisPolicy } from './governance.js';
import type { PacketEvidenceBundle } from './analyzer.js';

export const FORENSIC_PACKET_EVIDENCE_SCHEMA = 'aiwg.forensics.packet-evidence.v1' as const;

export const ATTACK_NETWORK_TECHNIQUES = Object.freeze({
  'T1071.001': { name: 'Application Layer Protocol: Web Protocols', url: 'https://attack.mitre.org/techniques/T1071/001/' },
  'T1071.004': { name: 'Application Layer Protocol: DNS', url: 'https://attack.mitre.org/techniques/T1071/004/' },
  T1573: { name: 'Encrypted Channel', url: 'https://attack.mitre.org/techniques/T1573/' },
});

export interface ForensicPacketEvidenceEntry {
  schema: typeof FORENSIC_PACKET_EVIDENCE_SCHEMA;
  evidenceId: string;
  evidenceType: 'packet-evidence-bundle';
  caseId: string;
  bundleId: string;
  bundleStatus: string;
  captureDigest: string;
  sourceHash: { algorithm: 'sha256'; value: string };
  analysisContexts: Array<{
    contextDigest: string;
    tool: { name: string; version: string; executablePath: string };
    commandArgv: string[];
    displayFilterDigest: string;
    captureFilterDigest: string;
    configDigests: string[];
  }>;
  artifacts: Array<{ artifactId: string; mediaType: string; uri: string; digest: string }>;
  locators: Array<{ citation: string; locator: EvidenceCitation['locator'] }>;
  custody: {
    receivedAt: string;
    receivedFrom: string;
    receivedBy: string;
    storageLocation: string;
    authorizationRef: string;
    method: 'validated-bundle-handoff';
    integrity: 'sha256-verified';
  };
  handling: { payload: 'withheld'; disclosure: 'withheld'; sensitivity: 'restricted' };
}

export interface ForensicNetworkFinding {
  findingId: string;
  caseId: string;
  evidenceId: string;
  category: 'ioc' | 'timeline' | 'beaconing' | 'exfiltration' | 'lateral-movement' | 'dns' | 'tls' | 'stream-analysis' | 'network-control' | 'protocol-exposure';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'informational';
  confidence: 'confirmed' | 'high' | 'medium' | 'low';
  kind: 'observation' | 'analyst-inference';
  statement: string;
  analyst: string;
  recordedAt: string;
  falsePositiveNotes: string[];
  attack: Array<{ techniqueId: keyof typeof ATTACK_NETWORK_TECHNIQUES; name: string; url: string }>;
  citations: Array<{ citation: string; locator: EvidenceCitation['locator'] }>;
  provenance: {
    captureDigest: string;
    contexts: ForensicPacketEvidenceEntry['analysisContexts'];
  };
  contentSensitivity: 'metadata' | 'payload-sensitive';
  payloadApprovalRef?: string;
}

export function createForensicPacketEvidenceEntry(input: {
  evidence: PacketEvidenceBundle;
  evidenceId: string;
  caseId: string;
  verifiedCaptureDigest: string;
  receivedAt: string;
  receivedFrom: string;
  receivedBy: string;
  storageLocation: string;
  authorizationRef: string;
}): ForensicPacketEvidenceEntry {
  validateEvidenceReferences(input.evidence as any);
  const captureDigest = requiredString(input.evidence.capture.capture_digest, 'Capture digest');
  if (input.verifiedCaptureDigest !== captureDigest) throw new Error('Forensic handoff capture digest was not independently verified');
  for (const [label, value] of Object.entries(input).filter(([key]) => key !== 'evidence' && key !== 'verifiedCaptureDigest')) {
    requiredString(value, `Forensic ${label}`);
  }
  if (!/^E-[0-9]{3,}$/.test(input.evidenceId)) throw new Error('Forensic packet evidence requires an E-NNN evidence ID');
  const sourceHash = requiredString((input.evidence.capture.hashes as any)?.source?.value, 'Capture source hash');
  const locatorMap = new Map<string, EvidenceCitation>();
  for (const item of input.evidence.evidence_items) {
    for (const citation of item.citations as EvidenceCitation[]) locatorMap.set(formatEvidenceCitation(citation), citation);
  }
  return {
    schema: FORENSIC_PACKET_EVIDENCE_SCHEMA,
    evidenceId: input.evidenceId,
    evidenceType: 'packet-evidence-bundle',
    caseId: input.caseId,
    bundleId: input.evidence.bundle_id,
    bundleStatus: input.evidence.status,
    captureDigest,
    sourceHash: { algorithm: 'sha256', value: sourceHash },
    analysisContexts: ((input.evidence.capture.analysis_contexts ?? []) as any[]).map(context => ({
      contextDigest: requiredString(context.context_digest, 'Analysis context digest'),
      tool: {
        name: requiredString(context.tool?.name, 'Analysis tool name'),
        version: requiredString(context.tool?.version, 'Analysis tool version'),
        executablePath: requiredString(context.tool?.executable_path, 'Analysis tool path'),
      },
      commandArgv: stringArray(context.command_argv, 'Analysis command argv'),
      displayFilterDigest: requiredString(context.display_filter_digest, 'Display-filter digest'),
      captureFilterDigest: requiredString(context.capture_filter_digest, 'Capture-filter digest'),
      configDigests: stringArray(context.config_digests, 'Analysis config digests'),
    })),
    artifacts: input.evidence.artifacts.map((artifact: any) => ({
      artifactId: requiredString(artifact.artifact_id, 'Artifact ID'),
      mediaType: requiredString(artifact.media_type, 'Artifact media type'),
      uri: requiredString(artifact.uri, 'Artifact URI'),
      digest: `${requiredString(artifact.digest?.algorithm, 'Artifact digest algorithm')}:${requiredString(artifact.digest?.value, 'Artifact digest')}`,
    })),
    locators: [...locatorMap.entries()].map(([citation, value]) => ({ citation, locator: structuredClone(value.locator) })),
    custody: {
      receivedAt: input.receivedAt,
      receivedFrom: input.receivedFrom,
      receivedBy: input.receivedBy,
      storageLocation: input.storageLocation,
      authorizationRef: input.authorizationRef,
      method: 'validated-bundle-handoff',
      integrity: 'sha256-verified',
    },
    handling: { payload: 'withheld', disclosure: 'withheld', sensitivity: 'restricted' },
  };
}

export function appendPacketEvidenceToForensicManifest<T extends { evidenceItems?: unknown[] }>(
  manifest: T,
  entry: ForensicPacketEvidenceEntry,
): T & { evidenceItems: unknown[] } {
  const existing = manifest.evidenceItems ?? [];
  if (existing.some((item: any) => item?.evidenceId === entry.evidenceId)) throw new Error(`Duplicate forensic evidence ID ${entry.evidenceId}`);
  return { ...structuredClone(manifest), evidenceItems: [...structuredClone(existing), structuredClone(entry)] };
}

export function createForensicNetworkFinding(
  evidence: ForensicPacketEvidenceEntry,
  input: {
    findingId: string;
    category: ForensicNetworkFinding['category'];
    severity: ForensicNetworkFinding['severity'];
    confidence: ForensicNetworkFinding['confidence'];
    kind: ForensicNetworkFinding['kind'];
    statement: string;
    analyst: string;
    recordedAt: string;
    falsePositiveNotes: string[];
    attackTechniques?: Array<keyof typeof ATTACK_NETWORK_TECHNIQUES>;
    citations: EvidenceCitation[];
    contentSensitivity?: ForensicNetworkFinding['contentSensitivity'];
    payloadAuthorization?: { approvalRef: string; policy: NetworkAnalysisPolicy; payloadOptIn: true };
  },
): ForensicNetworkFinding {
  if (!/^F-[0-9]{3,}$/.test(input.findingId)) throw new Error('Forensic finding requires an F-NNN identifier');
  requiredString(input.statement, 'Finding statement');
  requiredString(input.analyst, 'Finding analyst');
  requiredString(input.recordedAt, 'Finding timestamp');
  stringArray(input.falsePositiveNotes, 'False-positive notes');
  if (input.falsePositiveNotes.length === 0) throw new Error('Forensic finding requires false-positive notes');
  const available = new Map(evidence.locators.map(locator => [locator.citation, locator]));
  const citations = input.citations.map(citation => {
    const formatted = formatEvidenceCitation(citation);
    if (citation.capture_digest !== evidence.captureDigest || !available.has(formatted)) {
      throw new Error('Forensic finding citation is absent from the evidence manifest');
    }
    return structuredClone(available.get(formatted)!);
  });
  if (citations.length === 0) throw new Error('Forensic finding requires at least one stable packet citation');
  const attack = (input.attackTechniques ?? []).map(techniqueId => {
    const technique = ATTACK_NETWORK_TECHNIQUES[techniqueId];
    if (!technique) throw new Error(`Unsupported ATT&CK network technique ${techniqueId}`);
    return { techniqueId, ...technique };
  });
  const contentSensitivity = input.contentSensitivity ?? 'metadata';
  if (contentSensitivity === 'payload-sensitive') {
    if (!input.payloadAuthorization?.approvalRef.trim()) throw new Error('Payload-sensitive finding requires an explicit approval reference');
    assertLocalOutputAllowed(input.payloadAuthorization.policy, { content: ['metadata', 'payload'], payloadOptIn: input.payloadAuthorization.payloadOptIn });
  }
  return {
    findingId: input.findingId,
    caseId: evidence.caseId,
    evidenceId: evidence.evidenceId,
    category: input.category,
    severity: input.severity,
    confidence: input.confidence,
    kind: input.kind,
    statement: input.statement,
    analyst: input.analyst,
    recordedAt: input.recordedAt,
    falsePositiveNotes: [...input.falsePositiveNotes],
    attack,
    citations,
    provenance: { captureDigest: evidence.captureDigest, contexts: structuredClone(evidence.analysisContexts) },
    contentSensitivity,
    ...(input.payloadAuthorization ? { payloadApprovalRef: input.payloadAuthorization.approvalRef } : {}),
  };
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
