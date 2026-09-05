import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { analyzeOfflineCapture, type OfflineAnalyzerHost } from '../../../src/network-analysis/analyzer.js';
import { comparePacketEvidenceForVerification, type VerificationSide } from '../../../src/network-analysis/verification.js';

const temporaryDirectories: string[] = [];

function pcapHeader(marker: number): Buffer {
  const header = Buffer.alloc(24);
  header.set([0xd4, 0xc3, 0xb2, 0xa1]);
  header.writeUInt16LE(2, 4);
  header.writeUInt16LE(4, 6);
  header.writeUInt32LE(65535, 16);
  header.writeUInt32LE(1, 20);
  header[23] = marker;
  return header;
}

async function evidence(name: string, count: number, displayFilter = 'tcp', recipeId = 'before-after'): Promise<Awaited<ReturnType<typeof analyzeOfflineCapture>>> {
  const directory = await mkdtemp(path.join(tmpdir(), 'aiwg-verification-test-'));
  temporaryDirectories.push(directory);
  const capture = path.join(directory, `${name}.pcap`);
  await writeFile(capture, pcapHeader(count));
  const packets = Array.from({ length: count }, (_, index) => ({ _source: { layers: {
    'frame.number': [String(index + 1)],
    'frame.time_epoch': [String(1788645600 + index / 10)],
    'frame.len': ['74'],
    'ip.src': [`192.0.2.${index + 1}`],
    'ip.dst': ['198.51.100.10'],
    'tcp.srcport': [String(55000 + index)],
    'tcp.dstport': ['443'],
    'tcp.stream': [String(index)],
    'tcp.analysis.retransmission': index > 0 ? ['1'] : undefined,
    'tls.handshake.type': ['1'],
  } } }));
  const host: OfflineAnalyzerHost = { async run() { return { exitCode: 0, stderr: '', stdout: JSON.stringify(packets) }; } };
  return analyzeOfflineCapture({
    capturePath: capture,
    tshark: { path: '/opt/wireshark/bin/tshark', version: '4.6.8' },
    recipe: { id: recipeId, version: '1.0.0', displayFilter },
    authorizationRefs: ['authorization:synthetic-ci'],
    now: () => new Date('2026-09-05T22:00:00Z'),
  }, host);
}

function side(evidenceBundle: Awaited<ReturnType<typeof analyzeOfflineCapture>>, buildId: string, offset: number | null = 0): VerificationSide {
  return { evidence: evidenceBundle, buildId, environmentId: 'ci-job-240', topologyFingerprint: 'sha256:synthetic-topology-v1', clockOffsetMs: offset };
}

function request(baseline: VerificationSide, candidate: VerificationSide) {
  return {
    verificationId: 'PV-240',
    useCase: 'change-validation' as const,
    requirementIds: ['REQ-NET-12'],
    testIds: ['TC-NET-44'],
    defectOrChangeId: 'CHG-240',
    executionContext: 'ci' as const,
    baseline,
    candidate,
    conditions: {
      vantagePoint: 'isolated loopback test namespace',
      topologyAssumptions: ['One synthetic client and one synthetic TLS server'],
      traffic: { kind: 'synthetic' as const, scenario: 'two deterministic TLS requests', isolation: 'dedicated network namespace', capturesUnrelatedTraffic: false as const },
      load: 'one sequential client; no background load',
      sampleWindowSeconds: 5,
      clockAlignment: { method: 'same CI host monotonic clock', toleranceMs: 10 },
    },
  };
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map(directory => rm(directory, { recursive: true, force: true })));
});

describe('SDLC and operations packet verification (#2277)', () => {
  it('links requirement, test, build, bundle, and recipe while normalizing volatile fields', async () => {
    const baseline = side(await evidence('baseline', 1), 'build:before');
    const candidate = side(await evidence('candidate', 2), 'build:after');
    const report = comparePacketEvidenceForVerification(request(baseline, candidate));

    expect(report.comparability.status).toBe('comparable');
    expect(report.traceability).toMatchObject({
      requirementIds: ['REQ-NET-12'], testIds: ['TC-NET-44'], defectOrChangeId: 'CHG-240',
      baseline: { buildId: 'build:before', recipeId: 'analysis-recipe:before-after-1.0.0' },
      candidate: { buildId: 'build:after', recipeId: 'analysis-recipe:before-after-1.0.0' },
    });
    expect(report.metricDifferences).toContainEqual({ metric: 'summary.packet_count', baseline: 1, candidate: 2, delta: 1 });
    expect(report.metricDifferences).toContainEqual({ metric: 'summary.tcp_retransmission_count', baseline: 0, candidate: 1, delta: 1 });
    expect(report.attachments.every(item => item.rawCaptureIncluded === false)).toBe(true);
    expect(JSON.stringify(report)).not.toMatch(/192\.0\.2\.|198\.51\.100\.|5500[0-9]/);
    expect(report.performanceInterpretation.causality).toBe('not-established');
  });

  it('reports recipe, filter, tool, topology, or incomplete-bundle comparisons as incomparable', async () => {
    const baseline = side(await evidence('baseline-mismatch', 1), 'build:before');
    const candidate = side(await evidence('candidate-mismatch', 1, 'udp', 'other-recipe'), 'build:after');
    candidate.topologyFingerprint = 'sha256:different-topology';
    const report = comparePacketEvidenceForVerification(request(baseline, candidate));
    expect(report.comparability.status).toBe('incomparable');
    expect(report.comparability.reasons).toEqual(expect.arrayContaining([
      expect.stringContaining('Recipe mismatch'),
      'Display-filter digests differ.',
      'Environment topology fingerprints differ.',
    ]));
    expect(report.metricDifferences).toEqual([]);
    expect(report.protocolDifferences).toEqual([]);
  });

  it('excludes timing and records partial comparability when clocks are not aligned', async () => {
    const baseline = side(await evidence('baseline-clock', 1), 'build:before', null);
    const candidate = side(await evidence('candidate-clock', 1), 'build:after', 0);
    const report = comparePacketEvidenceForVerification(request(baseline, candidate));
    expect(report.comparability).toMatchObject({ status: 'partially-comparable', excludedMetrics: ['summary.duration_seconds'] });
    expect(report.conditions.clockOffsetsMs).toEqual({ baseline: null, candidate: 0 });
    expect(report.metricDifferences.some(item => item.metric === 'summary.duration_seconds')).toBe(false);
  });

  it('requires isolated synthetic traffic for CI verification', async () => {
    const baseline = side(await evidence('baseline-ci', 1), 'build:before');
    const candidate = side(await evidence('candidate-ci', 1), 'build:after');
    const unsafe = request(baseline, candidate);
    unsafe.conditions.traffic.kind = 'controlled-existing' as any;
    expect(() => comparePacketEvidenceForVerification(unsafe)).toThrow('isolated synthetic traffic');
    unsafe.conditions.traffic.kind = 'synthetic';
    unsafe.conditions.traffic.capturesUnrelatedTraffic = true as any;
    expect(() => comparePacketEvidenceForVerification(unsafe)).toThrow('exclude unrelated traffic');
  });

  it.each([
    ['defect', 'DEF-240'],
    ['change-validation', 'CHG-240'],
  ] as const)('supports a traceable %s verification record', async (useCase, identity) => {
    const baseline = side(await evidence(`baseline-${useCase}`, 1), 'build:before');
    const candidate = side(await evidence(`candidate-${useCase}`, 1), 'build:after');
    const report = comparePacketEvidenceForVerification({ ...request(baseline, candidate), useCase, defectOrChangeId: identity });
    expect(report).toMatchObject({ useCase, traceability: { defectOrChangeId: identity } });
  });
});
