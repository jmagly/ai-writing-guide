import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { analyzeOfflineCapture, type OfflineAnalyzerHost, type PacketEvidenceBundle } from '../../../src/network-analysis/analyzer.js';
import { DEFAULT_NETWORK_ANALYSIS_POLICY } from '../../../src/network-analysis/governance.js';
import { inductPacketEvidenceSource, type PacketCollectionContext } from '../../../src/network-analysis/research.js';

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
  const directory = await mkdtemp(path.join(tmpdir(), 'aiwg-research-packet-test-'));
  temporaryDirectories.push(directory);
  const capture = path.join(directory, 'source.pcap');
  await writeFile(capture, pcapHeader());
  const host: OfflineAnalyzerHost = {
    async run() {
      return {
        exitCode: 0,
        stderr: '',
        stdout: JSON.stringify([{ _source: { layers: {
          'frame.number': ['9'],
          'frame.time_epoch': ['1788645600.125'],
          'frame.len': ['66'],
          'ip.src': ['192.0.2.9'],
          'ip.dst': ['198.51.100.9'],
          'tcp.srcport': ['55000'],
          'tcp.dstport': ['443'],
          'tcp.stream': ['4'],
          'tls.handshake.type': ['1'],
        } } }]),
      };
    },
  };
  return analyzeOfflineCapture({
    capturePath: capture,
    tshark: { path: '/opt/wireshark/bin/tshark', version: '4.6.8' },
    recipe: { id: 'research-evidence', version: '1.0.0', displayFilter: 'tcp' },
    authorizationRefs: ['authorization:collection-9'],
    actor: 'agent:test-analyzer',
    now: () => new Date('2026-09-05T22:00:00Z'),
  }, host);
}

const collection: PacketCollectionContext = {
  owner: 'team:network-research',
  authorityRef: 'authorization:collection-9',
  purpose: 'Controlled service behavior study',
  representativeness: 'One staging client and service during a 60-second run',
  clockSource: 'Host NTP; offset not independently measured',
  timezone: 'America/New_York',
  missingTraffic: 'No capture-drop counters were available',
  encryptionVisibility: 'TLS metadata visible; application content unavailable',
  analystLimitations: ['Single network vantage point', 'No production population'],
};

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map(directory => rm(directory, { recursive: true, force: true })));
});

describe('research packet-evidence induction (#2275)', () => {
  it('classifies packet evidence outside scholarly GRADE and excludes raw capture by default', async () => {
    const evidence = await evidenceFixture();
    (evidence.artifacts[0] as any).privatePayload = 'must-not-propagate';
    const source = inductPacketEvidenceSource({ refId: 'REF-240', title: 'Controlled TLS trace', evidence, collection });

    expect(source).toMatchObject({
      sourceType: 'packet-evidence',
      scholarlyClassification: 'non-scholarly-observational-evidence',
      quality: { grade: 'not-applicable', framework: 'packet-evidence-limitations' },
      rawCapture: { included: false },
    });
    expect(source.limitations).toEqual(expect.arrayContaining([
      expect.stringContaining('Representativeness:'),
      expect.stringContaining('Missing traffic:'),
      expect.stringContaining('Encryption visibility:'),
    ]));
    expect(JSON.stringify(source)).not.toContain('must-not-propagate');
  });

  it('preserves stable frame/stream citations, timestamps, and tool/filter provenance', async () => {
    const evidence = await evidenceFixture();
    const source = inductPacketEvidenceSource({ refId: 'REF-241', title: 'Citation check', evidence, collection });
    const frameClaim = source.claims.find(claim => claim.citations.some(citation => citation.locator.type === 'stream'))!;
    expect(frameClaim.kind).toBe('observation');
    expect(frameClaim.citations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        citation: expect.stringMatching(/^pcap:sha256:[a-f0-9]{64}#frame=9$/),
        observedAt: '2026-09-05T22:00:00.125Z',
        timeBasis: 'capture-frame-time-utc',
      }),
      expect.objectContaining({
        citation: expect.stringMatching(/#stream=tcp:4&context=[a-f0-9]{64}$/),
        observedAt: '2026-09-05T22:00:00.125Z',
      }),
    ]));
    expect(source.analysisContexts[0]).toMatchObject({
      tool: { name: 'tshark', version: '4.6.8', executablePath: '/opt/wireshark/bin/tshark' },
      displayFilterDigest: expect.stringMatching(/^sha256:/),
      captureFilterDigest: expect.stringMatching(/^sha256:/),
    });
  });

  it('keeps inferred behavior separate and linked to observed input evidence', async () => {
    const evidence = await evidenceFixture();
    const observed = evidence.evidence_items[1] as any;
    evidence.evidence_items.push({
      evidence_id: 'evidence:inference-periodic-client',
      basis: 'inference',
      statement: 'The selected client may be using a periodic connection pattern.',
      confidence: 'low',
      citations: structuredClone(observed.citations),
      inference: { inputs: [observed.evidence_id] },
    });
    const source = inductPacketEvidenceSource({ refId: 'REF-242', title: 'Inference check', evidence, collection });
    expect(source.claims.at(-1)).toMatchObject({
      kind: 'inference',
      inferenceInputs: [observed.evidence_id],
      statement: expect.stringContaining('may be'),
    });
  });

  it('requires an exact policy approval before recording raw capture inclusion', async () => {
    const evidence = await evidenceFixture();
    const captureDigest = String(evidence.capture.capture_digest);
    const baseApproval = {
      approvalRef: 'approval:research-raw-9',
      approvedBy: 'operator:case-owner',
      basis: 'Local restricted corpus requires packet-level reproduction',
      captureDigest,
      payloadOptIn: true as const,
    };
    expect(() => inductPacketEvidenceSource({
      refId: 'REF-243', title: 'Denied raw inclusion', evidence, collection,
      rawCaptureApproval: { ...baseApproval, policy: DEFAULT_NETWORK_ANALYSIS_POLICY },
    })).toThrow('explicit policy');

    const source = inductPacketEvidenceSource({
      refId: 'REF-243', title: 'Approved raw inclusion', evidence, collection,
      rawCaptureApproval: {
        ...baseApproval,
        policy: { ...DEFAULT_NETWORK_ANALYSIS_POLICY, payloadAccess: 'explicit-opt-in' },
      },
    });
    expect(source.rawCapture).toEqual(expect.objectContaining({
      included: true,
      digest: captureDigest,
      approvalRef: 'approval:research-raw-9',
    }));

    expect(() => inductPacketEvidenceSource({
      refId: 'REF-244', title: 'Wrong capture', evidence, collection,
      rawCaptureApproval: { ...baseApproval, captureDigest: `sha256:${'f'.repeat(64)}`, policy: { ...DEFAULT_NETWORK_ANALYSIS_POLICY, payloadAccess: 'explicit-opt-in' } },
    })).toThrow('exact, complete approval');
  });
});
