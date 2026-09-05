import { createHash } from 'node:crypto';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { analyzeOfflineCapture, type OfflineAnalyzerHost } from '../../../src/network-analysis/analyzer.js';
import { createForensicPacketEvidenceEntry } from '../../../src/network-analysis/forensics.js';
import { createTermsharkHandoff } from '../../../src/network-analysis/termshark.js';
import { inductPacketEvidenceSource } from '../../../src/network-analysis/research.js';
import { compileAnalysisRecipe, type AnalysisRecipeDocument } from '../../../src/network-analysis/recipes.js';
import { comparePacketEvidenceForVerification } from '../../../src/network-analysis/verification.js';
import { generateFixtureCorpus } from '../../fixtures/network-analysis/generate-fixtures.mjs';

const root = path.resolve(import.meta.dirname, '../../..');
const fixtureRoot = path.join(root, 'test/fixtures/network-analysis');
const recipeRoot = path.join(root, 'agentic/code/addons/network-analysis/recipes');
const temporaryDirectories: string[] = [];
const tsharkPath = '/opt/wireshark/bin/tshark';

function digest(bytes: Buffer | string): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function options(capturePath: string, displayFilter = 'dns') {
  return {
    capturePath,
    tshark: { path: tsharkPath, version: '4.6.8' },
    recipe: { id: 'conformance', version: '1.0.0', displayFilter },
    authorizationRefs: ['authorization:synthetic-conformance'],
    now: () => new Date('2026-09-05T22:30:00Z'),
  };
}

const syntheticPacket = JSON.stringify([{ _source: { layers: {
  'frame.number': ['1'],
  'frame.time_epoch': ['1788645600.125'],
  'frame.len': ['74'],
  'ip.src': ['192.0.2.10'],
  'ip.dst': ['198.51.100.53'],
  'udp.srcport': ['53000'],
  'udp.dstport': ['53'],
  'udp.stream': ['0'],
  'dns.qry.name': ['fixture.example'],
  'dns.flags.response': ['0'],
  'http.authorization': ['Bearer fixture-token'],
  'http.cookie': ['session=fixture-cookie'],
  'tcp.payload': ['fixture-payload'],
  'tls.keylog': ['fixture-credential'],
} } }]);

const host: OfflineAnalyzerHost = { async run() { return { exitCode: 0, stdout: syntheticPacket, stderr: '' }; } };

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map(directory => rm(directory, { recursive: true, force: true })));
});

describe('network-analysis release conformance v1 (#2281)', () => {
  it('reproduces the licensed synthetic corpus byte-for-byte and verifies its manifest', async () => {
    const manifest = JSON.parse(await readFile(path.join(fixtureRoot, 'manifest.v1.json'), 'utf8'));
    expect(manifest.provenance).toMatchObject({ license: 'MIT', sensitivity: 'synthetic-test-data' });
    expect(manifest.provenance.origin).toContain('no production or third-party traffic');
    for (const fixture of manifest.fixtures) {
      const bytes = await readFile(path.join(fixtureRoot, fixture.name));
      expect(bytes.length, fixture.name).toBe(fixture.bytes);
      expect(digest(bytes), fixture.name).toBe(fixture.sha256);
      expect(bytes.length, fixture.name).toBeLessThan(256);
    }

    const generated = await mkdtemp(path.join(tmpdir(), 'aiwg-network-fixture-regenerate-'));
    temporaryDirectories.push(generated);
    await generateFixtureCorpus(generated);
    for (const name of (await readdir(generated)).sort()) {
      expect(await readFile(path.join(generated, name)), name).toEqual(await readFile(path.join(fixtureRoot, name)));
    }
  });

  it('publishes a machine-readable release receipt for every recipe, adapter, negative class, and version branch', async () => {
    const report = JSON.parse(await readFile(path.join(fixtureRoot, 'conformance-report.v1.json'), 'utf8'));
    expect(report).toMatchObject({
      schema: 'aiwg.network-analysis.conformance-report.v1', status: 'pass', releaseGate: 'npm run test:conformance',
      supportedTsharkMatrix: [{ branch: '4.4' }, { branch: '4.6' }],
      liveTshark: { default: 'disabled', acquisition: 'saved-synthetic-capture-only' },
    });
    expect(report.coverage.recipes).toHaveLength(9);
    expect(report.coverage.adapters).toEqual(['research', 'forensics-security', 'sdlc-operations', 'termshark-stub']);
    expect(report.coverage.negativeCases).toEqual(expect.arrayContaining(['empty', 'compressed', 'truncated', 'malformed', 'unsupported', 'input-limit', 'output-limit', 'timeout', 'cancellation']));
  });

  it('compiles every recipe deterministically across supported TShark branches', async () => {
    const names = (await readdir(recipeRoot)).filter(name => name.endsWith('.json')).sort();
    for (const name of names) {
      const recipe = JSON.parse(await readFile(path.join(recipeRoot, name), 'utf8')) as AnalysisRecipeDocument;
      const available = recipe.requested_output.fields.map(field => field.name);
      const oldStable = compileAnalysisRecipe(recipe, { tsharkVersion: '4.4.18', availableFields: available });
      const current = compileAnalysisRecipe(recipe, { tsharkVersion: '4.6.8', availableFields: available });
      expect({ recipe: oldStable.recipe, limits: oldStable.limits }).toEqual({ recipe: current.recipe, limits: current.limits });
    }
  });

  it('covers malformed/resource failures without hanging and excludes seeded secrets by default', async () => {
    const cases = [
      ['empty.pcap', 'CAPTURE_EMPTY'],
      ['truncated.pcap', 'CAPTURE_TRUNCATED'],
      ['unsupported.bin', 'CAPTURE_UNSUPPORTED'],
    ] as const;
    for (const [name, code] of cases) {
      const result = await analyzeOfflineCapture(options(path.join(fixtureRoot, name)), host);
      expect(result.errors[0].code).toBe(code);
    }
    await expect(analyzeOfflineCapture(options(path.join(fixtureRoot, 'synthetic-dns.pcap.gz')), host)).rejects.toThrow('Compressed');
    await expect(analyzeOfflineCapture({ ...options(path.join(fixtureRoot, 'synthetic-dns.pcap')), limits: { inputBytes: 24 } }, host)).rejects.toThrow('exceeds');
    const malformed = await analyzeOfflineCapture(options(path.join(fixtureRoot, 'malformed-record.pcap')), {
      async run() { return { exitCode: 2, stdout: '', stderr: 'tshark: malformed packet record' }; },
    });
    expect(malformed.errors[0].code).toBe('TSHARK_FAILED');

    for (const condition of [{ timedOut: true }, { outputLimited: true }, { cancelled: true }]) {
      const result = await analyzeOfflineCapture(options(path.join(fixtureRoot, 'synthetic-dns.pcap')), {
        async run() { return { exitCode: null, stdout: syntheticPacket, stderr: '', ...condition }; },
      });
      expect(result.status).toBe('partial');
    }
    const sensitive = await analyzeOfflineCapture(options(path.join(fixtureRoot, 'seeded-sensitive.pcap')), host);
    expect(JSON.stringify(sensitive)).not.toMatch(/fixture-token|fixture-cookie|fixture-payload|fixture-credential|fixture-password|synthetic-user@example\.invalid/i);
    const emittedFields = sensitive.evidence_items.flatMap(item => (item.observed_fields as Array<{ name: string }> ?? []).map(field => field.name));
    expect(emittedFields).not.toEqual(expect.arrayContaining(['http.authorization', 'http.cookie', 'tcp.payload', 'tls.keylog']));
  });

  it('exercises every framework adapter with one sanitized evidence bundle', async () => {
    const capture = path.join(fixtureRoot, 'synthetic-dns.pcap');
    const evidence = await analyzeOfflineCapture(options(capture), host);
    const collection = {
      owner: 'team:fixture', authorityRef: 'authorization:synthetic-conformance', purpose: 'adapter conformance',
      representativeness: 'one generated DNS packet', clockSource: 'fixed generator epoch', timezone: 'UTC',
      missingTraffic: 'none expected in the generated packet', encryptionVisibility: 'not applicable to DNS fixture',
      analystLimitations: ['single synthetic frame'],
    };
    expect(inductPacketEvidenceSource({ refId: 'REF-999', title: 'Synthetic DNS', evidence, collection }).rawCapture).toEqual({ included: false });
    const forensic = createForensicPacketEvidenceEntry({
      evidence, evidenceId: 'E-999', caseId: 'INC-999', verifiedCaptureDigest: String(evidence.capture.capture_digest),
      receivedAt: '2026-09-05T22:30:00Z', receivedFrom: 'generator', receivedBy: 'conformance', storageLocation: 'fixture-corpus',
      authorizationRef: 'authorization:synthetic-conformance',
    });
    expect(forensic.locators.length).toBeGreaterThan(0);
    const side = { evidence, buildId: 'build:fixture', environmentId: 'fixture', topologyFingerprint: 'fixture-v1', clockOffsetMs: 0 };
    expect(comparePacketEvidenceForVerification({
      verificationId: 'PV-999', useCase: 'protocol-verification', requirementIds: ['REQ-999'], testIds: ['TC-999'],
      defectOrChangeId: 'FIXTURE-999', executionContext: 'ci', baseline: side, candidate: side,
      conditions: {
        vantagePoint: 'generated frame', topologyAssumptions: ['single fixture path'],
        traffic: { kind: 'synthetic', scenario: 'one DNS query', isolation: 'fixture bytes only', capturesUnrelatedTraffic: false },
        load: 'one packet', sampleWindowSeconds: 1, clockAlignment: { method: 'same fixture epoch', toleranceMs: 0 },
      },
    }).comparability.status).toBe('comparable');
    const configRoot = await mkdtemp(path.join(tmpdir(), 'aiwg-termshark-conformance-'));
    temporaryDirectories.push(configRoot);
    const context = (evidence.capture.analysis_contexts as any[])[0];
    const handoff = await createTermsharkHandoff({
      evidence, capturePath: capture, contextDigest: context.context_digest, displayFilter: 'dns', tsharkPath,
      configRoot, profile: { name: 'default' }, termshark: { status: 'missing', path: null, version: null, diagnostics: ['fixture missing'] },
      now: () => new Date('2026-09-05T22:30:00Z'),
    });
    expect(handoff.status).toBe('unavailable');
  });
});

describe.skipIf(process.env.AIWG_NETWORK_ANALYSIS_LIVE !== '1')('gated installed-TShark conformance', () => {
  it('reads only the saved synthetic DNS fixture', async () => {
    const executable = process.env.AIWG_NETWORK_ANALYSIS_TSHARK;
    if (!executable || !path.isAbsolute(executable)) throw new Error('AIWG_NETWORK_ANALYSIS_TSHARK must be an absolute path');
    const result = await analyzeOfflineCapture({
      ...options(path.join(fixtureRoot, 'synthetic-dns.pcap')),
      tshark: { path: executable, version: process.env.AIWG_NETWORK_ANALYSIS_TSHARK_VERSION ?? '4.6.8' },
    });
    expect(['completed', 'empty']).toContain(result.status);
  });
});
