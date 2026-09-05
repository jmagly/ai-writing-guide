/** Portable packet identities. Stream identities are scoped to an analysis context. */
export type PacketCitation =
  | { captureSha256: string; kind: 'frame'; frameNumber: number }
  | { captureSha256: string; kind: 'stream'; protocol: 'tcp' | 'udp'; streamId: number; contextSha256: string };

export interface EvidenceCitation {
  capture_digest: string;
  locator:
    | { type: 'frame'; frame_number: number }
    | { type: 'stream'; protocol: 'tcp' | 'udp'; stream_id: number; context_digest: string };
}

export interface EvidenceReferences {
  capture: {
    capture_digest: string;
    hashes: { source: { value: string }; derived?: { artifact_id: string; digest: { value: string } }[] };
    analysis_contexts: { context_digest: string }[];
  };
  artifacts: { artifact_id: string; digest: { value: string } }[];
  evidence_items: { evidence_id: string; citations: EvidenceCitation[]; inference?: { inputs: string[] } }[];
  handoffs: { citations: EvidenceCitation[] }[];
}

/** Cross-reference checks after schema validation; file-byte integrity is the reader's responsibility. */
export function validateEvidenceReferences(bundle: EvidenceReferences): void {
  const sourceDigest = `sha256:${digest(bundle.capture.hashes.source.value)}`;
  if (bundle.capture.capture_digest !== sourceDigest) throw new Error('Capture identity and source hash disagree');
  const artifacts = new Map<string, string>();
  for (const artifact of bundle.artifacts) {
    if (artifacts.has(artifact.artifact_id)) throw new Error('Duplicate artifact identity');
    artifacts.set(artifact.artifact_id, digest(artifact.digest.value));
  }
  const derived = new Set<string>();
  for (const reference of bundle.capture.hashes.derived ?? []) {
    if (derived.has(reference.artifact_id)) throw new Error('Duplicate derived artifact reference');
    derived.add(reference.artifact_id);
    if (artifacts.get(reference.artifact_id) !== digest(reference.digest.value)) throw new Error('Derived artifact identity or digest disagrees');
  }
  const contexts = new Set(bundle.capture.analysis_contexts.map(context => context.context_digest));
  if (contexts.size !== bundle.capture.analysis_contexts.length) throw new Error('Duplicate analysis context identity');
  const evidenceIds = new Set(bundle.evidence_items.map(item => item.evidence_id));
  if (evidenceIds.size !== bundle.evidence_items.length) throw new Error('Duplicate evidence identity');
  for (const item of bundle.evidence_items) {
    for (const input of item.inference?.inputs ?? []) {
      if (input === item.evidence_id || !evidenceIds.has(input)) throw new Error('Inference references missing or self evidence');
    }
  }
  for (const item of [...bundle.evidence_items, ...bundle.handoffs]) {
    for (const citation of item.citations) {
      formatEvidenceCitation(citation);
      if (citation.capture_digest !== sourceDigest) throw new Error('Citation references a different capture');
      if (citation.locator.type === 'stream' && !contexts.has(citation.locator.context_digest)) {
        throw new Error('Citation references an unknown analysis context');
      }
    }
  }
}

const SHA256 = /^[a-f0-9]{64}$/;

function digest(value: string): string {
  if (typeof value !== 'string' || value.length !== 64 || !SHA256.test(value)) throw new Error('Citation requires a lowercase SHA-256 digest');
  return value;
}

function integer(value: number, minimum: number): number {
  if (!Number.isSafeInteger(value) || value < minimum) throw new Error('Invalid packet citation locator');
  return value;
}

/** Convert the versioned evidence schema's locator into its portable citation. */
export function formatEvidenceCitation(citation: EvidenceCitation): string {
  const hash = (value: string): string => {
    if (!value.startsWith('sha256:')) throw new Error('Evidence citation requires SHA-256 identity');
    return digest(value.slice(7));
  };
  const captureSha256 = hash(citation.capture_digest);
  const locator = citation.locator;
  if (locator.type === 'frame') {
    return formatPacketCitation({ captureSha256, kind: 'frame', frameNumber: locator.frame_number });
  }
  if (locator.type !== 'stream') throw new Error('Unsupported evidence locator');
  return formatPacketCitation({ captureSha256, kind: 'stream', protocol: locator.protocol, streamId: locator.stream_id, contextSha256: hash(locator.context_digest) });
}

export function formatPacketCitation(citation: PacketCitation): string {
  const base = `pcap:sha256:${digest(citation.captureSha256)}`;
  if (citation.kind === 'frame') return `${base}#frame=${integer(citation.frameNumber, 1)}`;
  if (citation.kind !== 'stream' || !['tcp', 'udp'].includes(citation.protocol)) throw new Error('Unsupported packet citation kind');
  return `${base}#stream=${citation.protocol}:${integer(citation.streamId, 0)}&context=${digest(citation.contextSha256)}`;
}

export function parsePacketCitation(value: string): PacketCitation {
  if (typeof value !== 'string' || /\s/.test(value)) throw new Error('Invalid whitespace in packet citation');
  const frame = /^pcap:sha256:([a-f0-9]{64})#frame=([1-9][0-9]*)$/.exec(value);
  if (frame) return { captureSha256: frame[1], kind: 'frame', frameNumber: integer(Number(frame[2]), 1) };
  const stream = /^pcap:sha256:([a-f0-9]{64})#stream=(tcp|udp):(0|[1-9][0-9]*)&context=([a-f0-9]{64})$/.exec(value);
  if (stream) return { captureSha256: stream[1], kind: 'stream', protocol: stream[2] as 'tcp' | 'udp', streamId: integer(Number(stream[3]), 0), contextSha256: stream[4] };
  throw new Error('Invalid packet citation; use capture digest and frame or context-bound stream identity');
}

/** Verify identity before selecting a locator; a citation is never a filesystem path. */
export function resolvePacketCitation(
  value: string,
  capture: { sha256: string; frameCount: number; contextSha256?: string; streams?: { protocol: 'tcp' | 'udp'; id: number }[] },
): PacketCitation {
  const citation = parsePacketCitation(value);
  if (citation.captureSha256 !== digest(capture.sha256)) throw new Error('Capture digest does not match citation');
  if (citation.kind === 'frame') {
    if (citation.frameNumber > integer(capture.frameCount, 0)) throw new Error('Cited frame is absent from capture');
  } else {
    if (citation.contextSha256 !== capture.contextSha256) throw new Error('Stream analysis context does not match citation');
    if (!capture.streams?.some(stream => stream.protocol === citation.protocol && stream.id === citation.streamId)) {
      throw new Error('Cited stream is absent from analysis');
    }
  }
  return citation;
}
