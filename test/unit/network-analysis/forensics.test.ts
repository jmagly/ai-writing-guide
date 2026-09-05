import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { analyzeOfflineCapture, type OfflineAnalyzerHost, type PacketEvidenceBundle } from '../../../src/network-analysis/analyzer.js';
import type { EvidenceCitation } from '../../../src/network-analysis/citations.js';
import {
  appendPacketEvidenceToForensicManifest,
  createForensicNetworkFinding,
  createForensicPacketEvidenceEntry,
} from '../../../src/network-analysis/forensics.js';
import { DEFAULT_NETWORK_ANALYSIS_POLICY } from '../../../src/network-analysis/governance.js';

const temporaryDirectories: string[] = [];

function pcapHeader(): Buffer {
  const header = Buffer.alloc(24);
  header.set([0xd4, 0xc3, 0xb2, 0xa1]);
  header.writeUInt16LE(2, 4);
  header.writeUInt16LE(4, 6);
  header.writeUInt32LE(65535, 16);
  header.writeUInt32LE(1, 20);
  return header;
}

async function evidenceFixture(): Promise<PacketEvidenceBundle> {
  const directory = await mkdtemp(path.join(tmpdir(), 'aiwg-forensic-packet-test-'));
  temporaryDirectories.push(directory);
  const capture = path.join(directory, 'preserved.pcap');
  await writeFile(capture, pcapHeader());
  const host: OfflineAnalyzerHost = {
    async run() {
      return {
        exitCode: 0,
        stderr: '',
        stdout: JSON.stringify([{ _source: { layers: {
          'frame.number': ['12'],
          'frame.time_epoch': ['1788645600'],
          'frame.len': ['90'],
          'ip.src': ['192.0.2.12'],
          'ip.dst': ['198.51.100.53'],
          'udp.srcport': ['53000'],
          'udp.dstport': ['53'],
          'udp.stream': ['2'],
          'dns.qry.name': ['periodic.example'],
        } } }]),
      };
    },
  };
  return analyzeOfflineCapture({
    capturePath: capture,
    tshark: { path: '/opt/wireshark/bin/tshark', version: '4.6.8' },
    recipe: { id: 'dns', version: '1.0.0', displayFilter: 'dns' },
    authorizationRefs: ['authorization:INC-240'],
    now: () => new Date('2026-09-05T22:00:00Z'),
  }, host);
}

function entryFor(evidence: PacketEvidenceBundle) {
  return createForensicPacketEvidenceEntry({
    evidence,
    evidenceId: 'E-240',
    caseId: 'INC-240',
    verifiedCaptureDigest: String(evidence.capture.capture_digest),
    receivedAt: '2026-09-05T22:10:00Z',
    receivedFrom: 'custodian:network-team',
    receivedBy: 'analyst:case-owner',
    storageLocation: '.aiwg/forensics/evidence/INC-240/E-240',
    authorizationRef: 'authorization:INC-240',
  });
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map(directory => rm(directory, { recursive: true, force: true })));
});

describe('forensics and security packet-evidence integration (#2276)', () => {
  it('adds a validated packet bundle to an existing manifest without changing older entries', async () => {
    const evidence = await evidenceFixture();
    const original = structuredClone(evidence);
    const entry = entryFor(evidence);
    const legacy = { caseId: 'INC-240', evidenceItems: [{ evidenceId: 'E-001', type: 'disk-image' }], owner: 'case-owner' };
    const manifest = appendPacketEvidenceToForensicManifest(legacy, entry);

    expect(manifest.evidenceItems[0]).toEqual(legacy.evidenceItems[0]);
    expect(manifest.evidenceItems[1]).toMatchObject({
      evidenceId: 'E-240',
      evidenceType: 'packet-evidence-bundle',
      custody: { integrity: 'sha256-verified', method: 'validated-bundle-handoff' },
      handling: { payload: 'withheld', disclosure: 'withheld' },
    });
    expect(entry.analysisContexts[0]).toMatchObject({
      tool: { version: '4.6.8', executablePath: '/opt/wireshark/bin/tshark' },
      displayFilterDigest: expect.stringMatching(/^sha256:/),
      commandArgv: expect.arrayContaining(['-Y', 'dns']),
    });
    expect(entry.locators.some(locator => locator.citation.includes('#stream=udp:2&context='))).toBe(true);
    expect(evidence).toEqual(original);
  });

  it('requires independent capture identity and unique evidence IDs', async () => {
    const evidence = await evidenceFixture();
    expect(() => createForensicPacketEvidenceEntry({
      evidence,
      evidenceId: 'E-240',
      caseId: 'INC-240',
      verifiedCaptureDigest: `sha256:${'f'.repeat(64)}`,
      receivedAt: '2026-09-05T22:10:00Z', receivedFrom: 'a', receivedBy: 'b', storageLocation: '/case', authorizationRef: 'auth',
    })).toThrow('independently verified');
    const entry = entryFor(evidence);
    expect(() => appendPacketEvidenceToForensicManifest({ evidenceItems: [entry] }, entry)).toThrow('Duplicate');
  });

  it('records analyst findings with severity, confidence, ATT&CK context, false positives, and stable provenance', async () => {
    const evidence = await evidenceFixture();
    const entry = entryFor(evidence);
    const citation = (evidence.evidence_items[1].citations as EvidenceCitation[])[0];
    const finding = createForensicNetworkFinding(entry, {
      findingId: 'F-240',
      category: 'dns',
      severity: 'medium',
      confidence: 'low',
      kind: 'analyst-inference',
      statement: 'The periodic DNS observation may warrant correlation with endpoint telemetry.',
      analyst: 'analyst:case-owner',
      recordedAt: '2026-09-05T22:20:00Z',
      falsePositiveNotes: ['Scheduled service discovery can produce regular DNS queries.'],
      attackTechniques: ['T1071.004'],
      citations: [citation],
    });
    expect(finding).toMatchObject({
      severity: 'medium', confidence: 'low', kind: 'analyst-inference',
      attack: [{ techniqueId: 'T1071.004', name: 'Application Layer Protocol: DNS' }],
      provenance: { captureDigest: entry.captureDigest, contexts: entry.analysisContexts },
    });
    expect(finding.citations[0].citation).toMatch(/^pcap:sha256:/);
  });

  it('rejects unregistered locators and unsupported ATT&CK mappings', async () => {
    const evidence = await evidenceFixture();
    const entry = entryFor(evidence);
    const invented: EvidenceCitation = { capture_digest: entry.captureDigest, locator: { type: 'frame', frame_number: 999 } };
    const base = {
      findingId: 'F-241', category: 'dns' as const, severity: 'low' as const, confidence: 'low' as const,
      kind: 'analyst-inference' as const, statement: 'Candidate behavior.', analyst: 'analyst:x', recordedAt: '2026-09-05T22:20:00Z',
      falsePositiveNotes: ['Benign behavior is possible.'], citations: [invented],
    };
    expect(() => createForensicNetworkFinding(entry, base)).toThrow('absent from the evidence manifest');
    const citation = (evidence.evidence_items[1].citations as EvidenceCitation[])[0];
    expect(() => createForensicNetworkFinding(entry, { ...base, citations: [citation], attackTechniques: ['T9999' as any] }))
      .toThrow('Unsupported ATT&CK');
  });

  it('keeps payload-sensitive findings behind explicit local policy', async () => {
    const evidence = await evidenceFixture();
    const entry = entryFor(evidence);
    const citation = (evidence.evidence_items[1].citations as EvidenceCitation[])[0];
    const base = {
      findingId: 'F-242', category: 'stream-analysis' as const, severity: 'informational' as const, confidence: 'confirmed' as const,
      kind: 'observation' as const, statement: 'Authorized payload observation.', analyst: 'analyst:x', recordedAt: '2026-09-05T22:20:00Z',
      falsePositiveNotes: ['Content interpretation remains protocol-dependent.'], citations: [citation], contentSensitivity: 'payload-sensitive' as const,
    };
    expect(() => createForensicNetworkFinding(entry, base)).toThrow('explicit approval');
    expect(() => createForensicNetworkFinding(entry, {
      ...base,
      payloadAuthorization: { approvalRef: 'approval:payload-240', policy: DEFAULT_NETWORK_ANALYSIS_POLICY, payloadOptIn: true },
    })).toThrow('explicit policy');
    expect(createForensicNetworkFinding(entry, {
      ...base,
      payloadAuthorization: {
        approvalRef: 'approval:payload-240',
        policy: { ...DEFAULT_NETWORK_ANALYSIS_POLICY, payloadAccess: 'explicit-opt-in' },
        payloadOptIn: true,
      },
    }).payloadApprovalRef).toBe('approval:payload-240');
  });
});
