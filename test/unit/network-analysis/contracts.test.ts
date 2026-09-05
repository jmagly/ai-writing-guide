import { readFileSync } from 'node:fs';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { describe, expect, it } from 'vitest';

const root = path.resolve(__dirname, '../../..');
const schemas = {
  'packet-evidence': JSON.parse(readFileSync(path.join(root, 'schemas/network-analysis/packet-evidence.v1.schema.json'), 'utf8')),
  'analysis-recipe': JSON.parse(readFileSync(path.join(root, 'schemas/network-analysis/analysis-recipe.v1.schema.json'), 'utf8')),
};
const fixtures = {
  'packet-evidence': JSON.parse(readFileSync(path.join(root, 'test/fixtures/network-analysis/contracts/packet-evidence.valid.json'), 'utf8')),
  'packet-evidence-error': JSON.parse(readFileSync(path.join(root, 'test/fixtures/network-analysis/contracts/packet-evidence.error.valid.json'), 'utf8')),
  'analysis-recipe': JSON.parse(readFileSync(path.join(root, 'test/fixtures/network-analysis/contracts/analysis-recipe.valid.json'), 'utf8')),
};
const invalidFixtures = JSON.parse(readFileSync(path.join(root, 'test/fixtures/network-analysis/contracts/invalid.json'), 'utf8')) as {
  cases: Array<{ schema: keyof typeof schemas; code: string; value: unknown }>;
};

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validators = {
  'packet-evidence': ajv.compile(schemas['packet-evidence']),
  'analysis-recipe': ajv.compile(schemas['analysis-recipe']),
};

describe('network-analysis architecture contracts (#2270)', () => {
  it('publishes stable v1 schema identifiers and embedded examples', () => {
    expect(schemas['packet-evidence'].$id).toBe('https://aiwg.io/schemas/network-analysis/packet-evidence.v1.schema.json');
    expect(schemas['analysis-recipe'].$id).toBe('https://aiwg.io/schemas/network-analysis/analysis-recipe.v1.schema.json');
    expect(validators['packet-evidence'](schemas['packet-evidence'].examples[0]), JSON.stringify(validators['packet-evidence'].errors)).toBe(true);
    expect(validators['analysis-recipe'](schemas['analysis-recipe'].examples[0]), JSON.stringify(validators['analysis-recipe'].errors)).toBe(true);
  });

  it('accepts versioned packet evidence and analysis recipe fixtures', () => {
    expect(validators['packet-evidence'](fixtures['packet-evidence']), JSON.stringify(validators['packet-evidence'].errors)).toBe(true);
    expect(validators['analysis-recipe'](fixtures['analysis-recipe']), JSON.stringify(validators['analysis-recipe'].errors)).toBe(true);
    expect(validators['packet-evidence'](fixtures['packet-evidence-error']), JSON.stringify(validators['packet-evidence'].errors)).toBe(true);
  });

  it('binds packet citations to capture digest plus frame or stream locators', () => {
    const bundle = fixtures['packet-evidence'];
    const locators = bundle.evidence_items.flatMap((item: { citations: Array<{ capture_digest: string; locator: { type: string } }> }) => item.citations);

    expect(locators.every((citation: { capture_digest: string }) => citation.capture_digest === bundle.capture.capture_digest)).toBe(true);
    expect(locators.map((citation: { locator: { type: string } }) => citation.locator.type)).toEqual(['frame', 'stream']);
    expect(locators[1].locator).toEqual(expect.objectContaining({ protocol: 'udp', stream_id: 7, context_digest: bundle.capture.analysis_contexts[0].context_digest }));
    expect(bundle.evidence_items[0].observed_fields).toContainEqual({ name: 'frame.number', value: 42 });
    expect(bundle.capture.hashes.source.value).toBe(bundle.capture.capture_digest.replace('sha256:', ''));
    for (const derived of bundle.capture.hashes.derived) {
      const artifact = bundle.artifacts.find((item: { artifact_id: string }) => item.artifact_id === derived.artifact_id);
      expect(artifact?.digest).toEqual(derived.digest);
    }
  });

  it('keeps capture and display filters structurally distinct', () => {
    const recipe = fixtures['analysis-recipe'];

    expect(recipe.filters.capture_filters).toEqual([
      expect.objectContaining({ type: 'capture_filter', language: 'bpf', applied_before_capture: true }),
    ]);
    expect(recipe.filters.display_filters).toEqual([
      expect.objectContaining({ type: 'display_filter', language: 'wireshark-display', applied_after_capture: true }),
    ]);
  });

  it('requires provider-neutral handoff and handling metadata', () => {
    const bundle = fixtures['packet-evidence'];

    expect(bundle.capture.data_handling).toEqual(expect.objectContaining({
      sensitivity: 'restricted',
      payload_content: 'payload-present',
      redaction: expect.objectContaining({ state: 'unredacted' }),
      retention: expect.objectContaining({ class: 'case-work-product' }),
      disclosure: expect.objectContaining({ state: 'restricted' }),
    }));
    expect(bundle.handoffs).toEqual([
      expect.objectContaining({ target: 'research', interface: 'packet-evidence', requires_termshark: false }),
    ]);
  });

  it('rejects governed negative fixtures', () => {
    for (const fixture of invalidFixtures.cases) {
      const validate = validators[fixture.schema];
      expect(validate(fixture.value), fixture.code).toBe(false);
    }
  });

  it('rejects noncanonical digest strings and unsafe locator integers', () => {
    const digestWithNewline = structuredClone(fixtures['packet-evidence']);
    digestWithNewline.capture.capture_digest = `${digestWithNewline.capture.capture_digest}\n`;
    expect(validators['packet-evidence'](digestWithNewline)).toBe(false);

    const unsafeFrame = structuredClone(fixtures['packet-evidence']);
    unsafeFrame.evidence_items[0].citations[0].locator.frame_number = 9007199254740992;
    expect(validators['packet-evidence'](unsafeFrame)).toBe(false);

    const unsafeStream = structuredClone(fixtures['packet-evidence']);
    unsafeStream.evidence_items[1].citations[0].locator.stream_id = 9007199254740992;
    expect(validators['packet-evidence'](unsafeStream)).toBe(false);
  });

  it('documents architecture decision, alternatives, consequences, non-goals, and compatibility policy', () => {
    const adr = readFileSync(path.join(root, 'docs/architecture/network-analysis.md'), 'utf8');
    for (const phrase of [
      'Context',
      'Decision',
      'Alternatives Considered',
      'Consequences',
      'Explicit Non-Goals',
      'Unsupported major versions fail closed',
      'Termshark-optional',
      'context digest',
      'capture filters from display filters structurally',
    ]) {
      expect(adr).toContain(phrase);
    }
  });
});
