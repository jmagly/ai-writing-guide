#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const GENERATED_AT = '2026-09-05T22:30:00Z';

export async function generateFixtureCorpus(outputRoot) {
  await mkdir(outputRoot, { recursive: true });
  const dns = pcap([udpFrame(dnsQuery('fixture.example'), 53000, 53)], 1);
  const sensitiveText = 'username=synthetic-user@example.invalid&password=fixture-password&token=fixture-token&cookie=session-fixture&payload=fixture-content';
  const sensitive = pcap([udpFrame(Buffer.from(sensitiveText), 55000, 9999)], 2);
  const malformedRecord = Buffer.alloc(19);
  malformedRecord.writeUInt32LE(1788645600, 0);
  malformedRecord.writeUInt32LE(0, 4);
  malformedRecord.writeUInt32LE(128, 8);
  malformedRecord.writeUInt32LE(128, 12);
  malformedRecord.set([0xde, 0xad, 0xbe], 16);
  const files = new Map([
    ['synthetic-dns.pcap', dns],
    ['synthetic-empty.pcapng', pcapngHeader()],
    ['seeded-sensitive.pcap', sensitive],
    ['empty.pcap', Buffer.alloc(0)],
    ['truncated.pcap', pcapHeader().subarray(0, 4)],
    ['malformed-record.pcap', Buffer.concat([pcapHeader(), malformedRecord])],
    ['unsupported.bin', Buffer.from('AIWG synthetic unsupported capture fixture\n')],
    ['synthetic-dns.pcap.gz', gzipSync(dns, { level: 9, mtime: 0 })],
  ]);
  for (const [name, bytes] of files) await writeFile(path.join(outputRoot, name), bytes);
  const descriptions = {
    'synthetic-dns.pcap': 'One Ethernet/IPv4/UDP DNS query for fixture.example using documentation addresses.',
    'synthetic-empty.pcapng': 'One valid PCAPNG section header with no interfaces or packets.',
    'seeded-sensitive.pcap': 'One UDP packet containing only synthetic credential/cookie/token/payload canaries.',
    'empty.pcap': 'Zero-byte input.',
    'truncated.pcap': 'Only the four-byte PCAP magic.',
    'malformed-record.pcap': 'Valid global header followed by a record declaring more bytes than present.',
    'unsupported.bin': 'Plain text with no supported capture magic.',
    'synthetic-dns.pcap.gz': 'Deterministic gzip wrapper used to prove compressed input rejection.',
  };
  const manifest = {
    schema: 'aiwg.network-analysis.fixture-manifest.v1',
    generatedAt: GENERATED_AT,
    generator: 'test/fixtures/network-analysis/generate-fixtures.mjs',
    provenance: {
      origin: 'Generated entirely by AIWG test code; no production or third-party traffic.',
      license: 'MIT',
      addresses: ['192.0.2.10', '198.51.100.53'],
      domains: ['fixture.example', 'example.invalid'],
      sensitivity: 'synthetic-test-data',
    },
    fixtures: [...files.entries()].map(([name, bytes]) => ({
      name,
      bytes: bytes.length,
      sha256: sha256(bytes),
      description: descriptions[name],
    })),
  };
  await writeFile(path.join(outputRoot, 'manifest.v1.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  const report = {
    schema: 'aiwg.network-analysis.conformance-report.v1',
    generatedAt: GENERATED_AT,
    fixtureManifestDigest: sha256(Buffer.from(JSON.stringify(manifest))),
    mode: 'fixture',
    status: 'pass',
    releaseGate: 'npm run test:conformance',
    supportedTsharkMatrix: [
      { branch: '4.4', version: '4.4.18', goldenPolicy: 'normalized-v1' },
      { branch: '4.6', version: '4.6.8', goldenPolicy: 'normalized-v1' },
    ],
    coverage: {
      recipes: ['overview', 'endpoints-conversations', 'dns', 'tcp-health', 'tls', 'http-metadata', 'stream-selection', 'beaconing-timing', 'before-after'],
      adapters: ['research', 'forensics-security', 'sdlc-operations', 'termshark-stub'],
      negativeCases: ['empty', 'compressed', 'truncated', 'malformed', 'unsupported', 'input-limit', 'output-limit', 'timeout', 'cancellation'],
      leakageCanaries: ['credential', 'cookie', 'token', 'identifier', 'payload'],
    },
    liveTshark: { default: 'disabled', gate: 'AIWG_NETWORK_ANALYSIS_LIVE=1', acquisition: 'saved-synthetic-capture-only' },
  };
  await writeFile(path.join(outputRoot, 'conformance-report.v1.json'), `${JSON.stringify(report, null, 2)}\n`);
}

function pcap(frames, marker) {
  return Buffer.concat([pcapHeader(marker), ...frames.map((frame, index) => {
    const record = Buffer.alloc(16);
    record.writeUInt32LE(1788645600 + index, 0);
    record.writeUInt32LE(125000, 4);
    record.writeUInt32LE(frame.length, 8);
    record.writeUInt32LE(frame.length, 12);
    return Buffer.concat([record, frame]);
  })]);
}

function pcapHeader(marker = 1) {
  const header = Buffer.alloc(24);
  header.set([0xd4, 0xc3, 0xb2, 0xa1]);
  header.writeUInt16LE(2, 4);
  header.writeUInt16LE(4, 6);
  header.writeUInt32LE(marker, 8);
  header.writeUInt32LE(65535, 16);
  header.writeUInt32LE(1, 20);
  return header;
}

function pcapngHeader() {
  const header = Buffer.alloc(28);
  header.set([0x0a, 0x0d, 0x0d, 0x0a]);
  header.writeUInt32LE(28, 4);
  header.set([0x4d, 0x3c, 0x2b, 0x1a], 8);
  header.writeUInt16LE(1, 12);
  header.fill(0xff, 16, 24);
  header.writeUInt32LE(28, 24);
  return header;
}

function udpFrame(payload, sourcePort, destinationPort) {
  const ethernet = Buffer.from('0200000000020200000000010800', 'hex');
  const udp = Buffer.alloc(8);
  udp.writeUInt16BE(sourcePort, 0);
  udp.writeUInt16BE(destinationPort, 2);
  udp.writeUInt16BE(8 + payload.length, 4);
  const ip = Buffer.alloc(20);
  ip[0] = 0x45;
  ip.writeUInt16BE(20 + udp.length + payload.length, 2);
  ip.writeUInt16BE(0x240, 4);
  ip[8] = 64;
  ip[9] = 17;
  ip.set([192, 0, 2, 10], 12);
  ip.set([198, 51, 100, 53], 16);
  ip.writeUInt16BE(ipChecksum(ip), 10);
  return Buffer.concat([ethernet, ip, udp, payload]);
}

function dnsQuery(domain) {
  const labels = Buffer.concat(domain.split('.').map(label => Buffer.concat([Buffer.from([label.length]), Buffer.from(label)])));
  return Buffer.concat([Buffer.from('123401000001000000000000', 'hex'), labels, Buffer.from('0000010001', 'hex')]);
}

function ipChecksum(header) {
  let sum = 0;
  for (let index = 0; index < header.length; index += 2) sum += header.readUInt16BE(index);
  while (sum > 0xffff) sum = (sum & 0xffff) + (sum >>> 16);
  return (~sum) & 0xffff;
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await generateFixtureCorpus(path.resolve(process.argv[2] ?? path.dirname(fileURLToPath(import.meta.url))));
}
