import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { formatEvidenceCitation, formatPacketCitation, parsePacketCitation, resolvePacketCitation, validateEvidenceReferences } from '../../../src/network-analysis/citations.js';

const sha256 = 'a'.repeat(64);
const contextSha256 = 'b'.repeat(64);

describe('packet citation identity', () => {
  it('checks bundle reference consistency that JSON Schema cannot express', () => {
    const bundle = JSON.parse(readFileSync(new URL('../../fixtures/network-analysis/contracts/packet-evidence.valid.json', import.meta.url), 'utf8'));
    expect(() => validateEvidenceReferences(bundle)).not.toThrow();
    const mutate = (fn: (copy: typeof bundle) => void) => {
      const copy = structuredClone(bundle);
      fn(copy);
      expect(() => validateEvidenceReferences(copy)).toThrow();
    };
    mutate(copy => { copy.capture.hashes.source.value = 'f'.repeat(64); });
    mutate(copy => { copy.artifacts[0].digest.value = 'f'.repeat(64); });
    mutate(copy => { copy.artifacts.push(copy.artifacts[0]); });
    mutate(copy => { copy.evidence_items[0].citations[0].capture_digest = `sha256:${'f'.repeat(64)}`; });
    mutate(copy => { copy.capture.analysis_contexts = []; });
    mutate(copy => { copy.evidence_items.push(copy.evidence_items[0]); });
  });
  it('converts versioned evidence locators without losing digest or stream context', () => {
    expect(formatEvidenceCitation({ capture_digest: `sha256:${sha256}`, locator: { type: 'frame', frame_number: 3 } }))
      .toBe(`pcap:sha256:${sha256}#frame=3`);
    expect(formatEvidenceCitation({ capture_digest: `sha256:${sha256}`, locator: { type: 'stream', protocol: 'udp', stream_id: 0, context_digest: `sha256:${contextSha256}` } }))
      .toBe(`pcap:sha256:${sha256}#stream=udp:0&context=${contextSha256}`);
    expect(() => formatEvidenceCitation({ capture_digest: `md5:${sha256}`, locator: { type: 'frame', frame_number: 3 } })).toThrow('SHA-256');
  });
  it('round trips and resolves a frame within the exact capture', () => {
    const locator = { captureSha256: sha256, kind: 'frame' as const, frameNumber: 2 };
    const citation = formatPacketCitation(locator);
    expect(parsePacketCitation(citation)).toEqual(locator);
    expect(resolvePacketCitation(citation, { sha256, frameCount: 2 })).toEqual(locator);
    expect(() => resolvePacketCitation(citation, { sha256, frameCount: 1 })).toThrow('absent');
    expect(() => resolvePacketCitation(citation, { sha256: contextSha256, frameCount: 2 })).toThrow('digest');
  });

  it('binds stream zero to the protocol and exact analysis context', () => {
    const locator = { captureSha256: sha256, kind: 'stream' as const, protocol: 'tcp' as const, streamId: 0, contextSha256 };
    const citation = formatPacketCitation(locator);
    const capture = { sha256, frameCount: 3, contextSha256, streams: [{ protocol: 'tcp' as const, id: 0 }] };
    expect(resolvePacketCitation(citation, capture)).toEqual(locator);
    expect(() => resolvePacketCitation(citation, { ...capture, contextSha256: sha256 })).toThrow('context');
    expect(() => resolvePacketCitation(citation, { ...capture, streams: [{ protocol: 'udp', id: 0 }] })).toThrow('absent');
  });

  it.each(['frame=0', 'frame=01', 'frame=-1', 'frame=1.2', 'frame=9007199254740992', 'frame=1&path=/tmp/a', 'frame=1\n', 'frame=1\r', 'stream=tcp:0', 'stream=icmp:0'])('rejects ambiguous or unsafe locators: %s', suffix => {
    expect(() => parsePacketCitation(`pcap:sha256:${sha256}#${suffix}`)).toThrow();
  });

  it('rejects noncanonical digests and unsafe numeric inputs', () => {
    expect(() => formatPacketCitation({ captureSha256: sha256.toUpperCase(), kind: 'frame', frameNumber: 1 })).toThrow('digest');
    expect(() => formatPacketCitation({ captureSha256: sha256 + '\n', kind: 'frame', frameNumber: 1 })).toThrow('digest');
    expect(() => formatPacketCitation({ captureSha256: sha256, kind: 'frame', frameNumber: Infinity })).toThrow('locator');
    expect(() => parsePacketCitation(`/tmp/${sha256}`)).toThrow();
  });
});
