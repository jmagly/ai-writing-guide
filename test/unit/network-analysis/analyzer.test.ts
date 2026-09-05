import { readFileSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { afterEach, describe, expect, it } from 'vitest';

import {
  DEFAULT_METADATA_FIELDS,
  analyzeOfflineCapture,
  serializePacketEvidence,
  writePacketEvidence,
  type AnalyzerProcessLimits,
  type OfflineAnalyzerHost,
} from '../../../src/network-analysis/analyzer.js';
import { validateEvidenceReferences } from '../../../src/network-analysis/citations.js';

const root = path.resolve(import.meta.dirname, '../../..');
const schema = JSON.parse(readFileSync(path.join(root, 'schemas/network-analysis/packet-evidence.v1.schema.json'), 'utf8'));
const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validate = ajv.compile(schema);
const temporaryDirectories: string[] = [];
const fixedTime = () => new Date('2026-09-05T22:00:00Z');

interface RecordedCall {
  file: string;
  args: string[];
  limits: AnalyzerProcessLimits;
}

function host(result: Awaited<ReturnType<OfflineAnalyzerHost['run']>>, calls: RecordedCall[] = []): OfflineAnalyzerHost {
  return {
    async run(file, args, limits) {
      calls.push({ file, args: [...args], limits });
      return result;
    },
  };
}

function pcapHeader(): Buffer {
  const header = Buffer.alloc(24);
  header.set([0xd4, 0xc3, 0xb2, 0xa1]);
  header.writeUInt16LE(2, 4);
  header.writeUInt16LE(4, 6);
  header.writeUInt32LE(65535, 16);
  header.writeUInt32LE(1, 20);
  return header;
}

function pcapngHeader(): Buffer {
  const header = Buffer.alloc(28);
  header.set([0x0a, 0x0d, 0x0d, 0x0a]);
  header.writeUInt32LE(28, 4);
  header.set([0x4d, 0x3c, 0x2b, 0x1a], 8);
  header.writeUInt16LE(1, 12);
  header.writeUInt16LE(0, 14);
  header.fill(0xff, 16, 24);
  header.writeUInt32LE(28, 24);
  return header;
}

function tsharkPackets(): string {
  return JSON.stringify([
    {
      _source: { layers: {
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
        'http.cookie': ['seeded-secret=do-not-emit'],
        'tcp.payload': ['7365656465642d736563726574'],
      } },
    },
    {
      _source: { layers: {
        'frame.number': ['2'],
        'frame.time_epoch': ['1788645601.5'],
        'frame.len': ['128'],
        'ipv6.src': ['2001:db8::10'],
        'ipv6.dst': ['2001:db8::20'],
        'tcp.srcport': ['443'],
        'tcp.dstport': ['55000'],
        'tcp.stream': ['1'],
        'tcp.analysis.retransmission': ['1'],
        'tcp.flags.reset': ['1'],
        'tls.handshake.type': ['1'],
        'tls.handshake.extensions_server_name': ['encrypted.fixture.example'],
        'http.request.method': ['GET'],
        'http.host': ['ipv6.fixture.example'],
        'http.response.code': ['200'],
        'tls.keylog': ['seeded-tls-secret'],
      } },
    },
  ]);
}

async function fixture(name = 'fixture.pcapng', bytes = pcapngHeader()): Promise<{ directory: string; capture: string }> {
  const directory = await mkdtemp(path.join(tmpdir(), 'aiwg-analyzer-test-'));
  temporaryDirectories.push(directory);
  const capture = path.join(directory, name);
  await writeFile(capture, bytes);
  return { directory, capture };
}

function options(capture: string) {
  return {
    capturePath: capture,
    tshark: { path: '/opt/wireshark/bin/tshark', version: '4.6.8' },
    recipe: { id: 'core-metadata', version: '1.0.0', displayFilter: 'ip || ipv6' },
    authorizationRefs: ['authorization:fixture-owner'],
    now: fixedTime,
  };
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map(directory => rm(directory, { recursive: true, force: true })));
});

describe('bounded offline network analyzer (#2280)', () => {
  it('normalizes IPv4/IPv6 metadata deterministically into schema-valid evidence', async () => {
    const { capture } = await fixture();
    const calls: RecordedCall[] = [];
    const analyzerHost = host({ exitCode: 0, stdout: tsharkPackets(), stderr: '' }, calls);
    const first = await analyzeOfflineCapture(options(capture), analyzerHost);
    const second = await analyzeOfflineCapture(options(capture), analyzerHost);

    expect(validate(first), JSON.stringify(validate.errors)).toBe(true);
    expect(() => validateEvidenceReferences(first as any)).not.toThrow();
    expect(first).toEqual(second);
    expect(first.status).toBe('completed');
    expect(first.evidence_items).toHaveLength(3);
    expect(JSON.stringify(first)).toContain('192.0.2.10');
    expect(JSON.stringify(first)).toContain('2001:db8::10');
    expect(JSON.stringify(first)).not.toMatch(/seeded-secret|seeded-tls-secret|tcp\.payload|http\.cookie|tls\.keylog/);
    expect(calls[0].file).toBe('/opt/wireshark/bin/tshark');
    expect(calls[0].args[calls[0].args.indexOf('-r') + 1]).toContain('aiwg-network-analysis-');
    expect(calls[0].args[calls[0].args.indexOf('-r') + 1]).not.toBe(capture);
    expect(calls[0].limits.maxBufferBytes).toBe(32 * 1024 * 1024);
    expect((first.capture.analysis_contexts as any[])[0].command_argv).toContain('-Y');
    expect(JSON.stringify((first.capture.analysis_contexts as any[])[0].command_argv)).toContain('pcap:sha256:');
    expect(first.evidence_items[0]).toEqual(expect.objectContaining({
      statement: 'Observed 2 selected frame(s), 4 endpoint(s), and 2 transport conversation(s).',
      observed_fields: expect.arrayContaining([
        { name: 'summary.protocol_hierarchy', value: 'DNS:1,HTTP:1,IPv4:1,IPv6:1,TCP:1,TLS:1,UDP:1' },
        { name: 'summary.tcp_retransmission_count', value: 1 },
        { name: 'summary.tcp_reset_count', value: 1 },
        { name: 'summary.encrypted_transport_frame_count', value: 1 },
      ]),
    }));
    expect((first.evidence_items[1].citations as any[])[1].locator).toMatchObject({ type: 'stream', protocol: 'udp', stream_id: 0 });
    expect((first.evidence_items[2].citations as any[])[1].locator).toMatchObject({ type: 'stream', protocol: 'tcp', stream_id: 1 });
    expect(await readFile(capture)).toEqual(pcapngHeader());
  });

  it('passes hostile-looking display filters as one literal argument and blocks secret fields', async () => {
    const { capture } = await fixture('fixture.pcap', pcapHeader());
    const calls: RecordedCall[] = [];
    const filter = 'tcp.port == 443; touch /tmp/never-created';
    const request = { ...options(capture), recipe: { id: 'filter-check', version: '1.0.0', displayFilter: filter, fields: ['frame.number', 'tcp.stream'] } };
    await analyzeOfflineCapture(request, host({ exitCode: 0, stdout: '[]', stderr: '' }, calls));
    expect(calls[0].args.filter(value => value === filter)).toHaveLength(1);
    expect(calls[0].args[calls[0].args.indexOf('-Y') + 1]).toBe(filter);
    await expect(analyzeOfflineCapture({ ...request, recipe: { ...request.recipe, fields: ['frame.number', 'http.authorization'] } }, host({ exitCode: 0, stdout: '[]', stderr: '' })))
      .rejects.toThrow('not permitted');
  });

  it('returns deterministic schema-valid errors for empty, truncated, malformed, and unsupported captures', async () => {
    const cases = [
      ['empty.pcapng', Buffer.alloc(0), 'CAPTURE_EMPTY'],
      ['truncated.pcap', Buffer.from([0xd4, 0xc3, 0xb2, 0xa1]), 'CAPTURE_TRUNCATED'],
      ['unsupported.bin', Buffer.from('not a capture'), 'CAPTURE_UNSUPPORTED'],
    ] as const;
    for (const [name, bytes, code] of cases) {
      const { capture } = await fixture(name, bytes);
      const result = await analyzeOfflineCapture(options(capture), host({ exitCode: 0, stdout: '[]', stderr: '' }));
      expect(validate(result), `${name}: ${JSON.stringify(validate.errors)}`).toBe(true);
      expect(result.status).toBe('error');
      expect(result.errors[0].code).toBe(code);
    }

    const { capture } = await fixture('malformed.pcap');
    const malformed = await analyzeOfflineCapture(options(capture), host({ exitCode: 2, stdout: '', stderr: 'tshark: truncated packet data' }));
    expect(validate(malformed), JSON.stringify(validate.errors)).toBe(true);
    expect(malformed.errors[0]).toMatchObject({ code: 'TSHARK_FAILED', severity: 'error' });
  });

  it('rejects compressed and oversized files before invoking TShark', async () => {
    const compressed = await fixture('capture.pcap.gz', pcapHeader());
    const compressedCalls: RecordedCall[] = [];
    await expect(analyzeOfflineCapture(options(compressed.capture), host({ exitCode: 0, stdout: '[]', stderr: '' }, compressedCalls)))
      .rejects.toThrow('Compressed capture input is not accepted');
    expect(compressedCalls).toHaveLength(0);

    const oversized = await fixture('oversized.pcap', Buffer.concat([pcapHeader(), Buffer.alloc(16)]));
    const oversizedCalls: RecordedCall[] = [];
    await expect(analyzeOfflineCapture({ ...options(oversized.capture), limits: { inputBytes: 24 } }, host({ exitCode: 0, stdout: '[]', stderr: '' }, oversizedCalls)))
      .rejects.toThrow('exceeds the configured');
    expect(oversizedCalls).toHaveLength(0);

    const link = path.join(oversized.directory, 'linked.pcap');
    await symlink(oversized.capture, link);
    await expect(analyzeOfflineCapture(options(link), host({ exitCode: 0, stdout: '[]', stderr: '' })))
      .rejects.toThrow('regular non-symlink');
  });

  it('fails the result when the source changes during analysis', async () => {
    const { capture } = await fixture();
    const mutatingHost: OfflineAnalyzerHost = {
      async run() {
        await writeFile(capture, Buffer.concat([pcapngHeader(), Buffer.from('changed')]));
        return { exitCode: 0, stdout: tsharkPackets(), stderr: '' };
      },
    };
    const result = await analyzeOfflineCapture(options(capture), mutatingHost);
    expect(validate(result), JSON.stringify(validate.errors)).toBe(true);
    expect(result.status).toBe('error');
    expect(result.evidence_items).toHaveLength(0);
    expect(result.errors[0].code).toBe('CAPTURE_ANALYSIS_FAILED');
  });

  it.each([
    ['cancelled', { cancelled: true }, 'ANALYSIS_CANCELLED'],
    ['timed out', { timedOut: true }, 'ANALYSIS_TIMEOUT'],
    ['output limited', { outputLimited: true }, 'ANALYSIS_OUTPUT_LIMIT'],
  ])('preserves auditable partial results when %s', async (_label, condition, code) => {
    const { capture } = await fixture();
    const result = await analyzeOfflineCapture(options(capture), host({ exitCode: null, stdout: tsharkPackets(), stderr: '', ...condition }));
    expect(validate(result), JSON.stringify(validate.errors)).toBe(true);
    expect(result.status).toBe('partial');
    expect(result.evidence_items).toHaveLength(3);
    expect(result.errors[0].code).toBe(code);
  });

  it('recovers complete packet objects from output truncated at the resource limit', async () => {
    const { capture } = await fixture();
    const truncated = tsharkPackets().slice(0, tsharkPackets().indexOf('},{') + 2);
    const result = await analyzeOfflineCapture(options(capture), host({
      exitCode: null,
      stdout: truncated,
      stderr: '',
      outputLimited: true,
    }));
    expect(validate(result), JSON.stringify(validate.errors)).toBe(true);
    expect(result.status).toBe('partial');
    expect(result.evidence_items).toHaveLength(2);
    expect(result.errors[0]).toMatchObject({ code: 'ANALYSIS_OUTPUT_LIMIT' });
  });

  it('writes JSON, JSONL, and Markdown exclusively below an authorized real output root', async () => {
    const { directory, capture } = await fixture();
    const bundle = await analyzeOfflineCapture(options(capture), host({ exitCode: 0, stdout: tsharkPackets(), stderr: '' }));
    const outputRoot = path.join(directory, 'output');
    await mkdir(outputRoot);
    for (const format of ['json', 'jsonl', 'markdown'] as const) {
      const outputPath = path.join(outputRoot, `evidence.${format === 'markdown' ? 'md' : format}`);
      const written = await writePacketEvidence(bundle, { root: outputRoot, path: outputPath, format });
      expect(written.identity.byteLength).toBeGreaterThan(0);
      expect(written.path).toBe(outputPath);
    }
    await expect(writePacketEvidence(bundle, { root: outputRoot, path: path.join(directory, 'escape.json'), format: 'json' }))
      .rejects.toThrow('below the allowed root');
    const hostileName = path.join(outputRoot, 'evidence;touch-never.json');
    await expect(writePacketEvidence(bundle, { root: outputRoot, path: hostileName, format: 'json' })).resolves.toMatchObject({ path: hostileName });
    await expect(writePacketEvidence(bundle, { root: outputRoot, path: hostileName, format: 'json' })).rejects.toThrow('already exists');
    expect(serializePacketEvidence(bundle, 'jsonl').split('\n')).toHaveLength(2);
    expect(serializePacketEvidence(bundle, 'markdown')).toContain('# Packet evidence');
  });

  it('keeps the default field set metadata-only', () => {
    expect(DEFAULT_METADATA_FIELDS).toContain('frame.number');
    expect(DEFAULT_METADATA_FIELDS).toContain('tls.handshake.type');
    expect(DEFAULT_METADATA_FIELDS.join(' ')).not.toMatch(/payload|cookie|authorization|secret|keylog|raw/i);
  });
});
