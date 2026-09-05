import { readFileSync, readdirSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { describe, expect, it } from 'vitest';

import {
  RecipeCompatibilityError,
  compileAnalysisRecipe,
  type AnalysisRecipeDocument,
} from '../../../src/network-analysis/recipes.js';
import { analyzeOfflineCapture } from '../../../src/network-analysis/analyzer.js';

const root = path.resolve(import.meta.dirname, '../../..');
const recipeRoot = path.join(root, 'agentic/code/addons/network-analysis/recipes');
const schema = JSON.parse(readFileSync(path.join(root, 'schemas/network-analysis/analysis-recipe.v1.schema.json'), 'utf8'));
const recipeFiles = readdirSync(recipeRoot).filter(name => name.endsWith('.json')).sort();
const recipes = recipeFiles.map(name => JSON.parse(readFileSync(path.join(recipeRoot, name), 'utf8')) as AnalysisRecipeDocument);
const golden = JSON.parse(readFileSync(path.join(root, 'test/fixtures/network-analysis/recipes/golden-matrix.json'), 'utf8'));
const goldenOutputs = JSON.parse(readFileSync(path.join(root, 'test/fixtures/network-analysis/recipes/golden-output-fingerprints.json'), 'utf8'));
const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validate = ajv.compile(schema);

function fields(recipe: AnalysisRecipeDocument): string[] {
  return recipe.requested_output.fields.map(field => field.name);
}

describe('governed network analysis recipe catalog (#2273)', () => {
  it('validates every recipe and publishes the complete initial catalog', () => {
    expect(recipeFiles).toEqual([
      'beaconing-timing.json',
      'before-after.json',
      'dns.json',
      'endpoints-conversations.json',
      'http-metadata.json',
      'overview.json',
      'stream-selection.json',
      'tcp-health.json',
      'tls.json',
    ]);
    for (const recipe of recipes) {
      expect(validate(recipe), `${recipe.recipe_id}: ${JSON.stringify(validate.errors)}`).toBe(true);
      expect(recipe.inputs.live_capture.allowed).toBe(false);
      expect(recipe.filters.capture_filters).toEqual([]);
      expect(recipe.limits.payload_policy).toBe('metadata-only');
      expect(recipe.expected_output.required_citation_locators).toContain('frame');
      expect(recipe.interpretation?.observations.length).toBeGreaterThan(0);
      for (const heuristic of recipe.interpretation?.heuristics ?? []) {
        expect(heuristic.false_positive_conditions.length).toBeGreaterThan(0);
        expect(heuristic.method.length).toBeGreaterThan(20);
      }
      expect(fields(recipe).join(' ')).not.toMatch(/(?:payload|cookie|authorization|credential|password|secret|keylog|file_data|data\.data|reassembled\.data)/i);
    }
  });

  it('matches the versioned golden catalog matrix and retains ATT&CK as heuristic context', () => {
    const actual = recipes.map(recipe => ({
      recipe_id: recipe.recipe_id,
      field_count: recipe.requested_output.fields.length,
      heuristics: (recipe.interpretation?.heuristics ?? []).map(item => item.id),
      attack_techniques: [...new Set((recipe.interpretation?.heuristics ?? []).flatMap(item => item.attack_techniques))].sort(),
    }));
    expect(actual).toEqual(golden);

    const docs = readFileSync(path.join(recipeRoot, 'README.md'), 'utf8');
    for (const reference of ['T1071.004 DNS', 'T1071.001 Web Protocols', 'T1573 Encrypted Channel', 'not claims that an observed flow is malicious', 'forensics-complete/agents/network-analyst.md']) {
      expect(docs).toContain(reference);
    }
  });

  it('compiles every recipe into bounded analyzer input with exact provenance', () => {
    for (const recipe of recipes) {
      const compiled = compileAnalysisRecipe(recipe, { tsharkVersion: '4.6.8', availableFields: fields(recipe) });
      expect(compiled.recipe.id).toBe(recipe.recipe_id.replace('analysis-recipe:', ''));
      expect(compiled.recipe.version).toBe(recipe.version);
      expect(compiled.recipe.displayFilter).toBe(`(${recipe.filters.display_filters[0].expression})`);
      expect(compiled.limits).toEqual({
        inputBytes: recipe.limits.max_capture_bytes,
        packets: recipe.limits.max_frames,
        outputBytes: recipe.limits.max_output_bytes,
        timeoutMs: recipe.limits.max_duration_seconds * 1000,
      });
      expect(compiled.provenance).toEqual(expect.objectContaining({
        recipeId: recipe.recipe_id,
        recipeVersion: recipe.version,
        toolVersion: '4.6.8',
      }));
    }
  });

  it('uses only a probed declared field fallback and records it', () => {
    const overview = recipes.find(recipe => recipe.recipe_id === 'analysis-recipe:overview-v1')!;
    const available = fields(overview).filter(field => field !== '_ws.col.Protocol').concat('frame.protocols');
    const compiled = compileAnalysisRecipe(overview, { tsharkVersion: '4.4.18', availableFields: available });
    expect(compiled.recipe.fields).toContain('frame.protocols');
    expect(compiled.recipe.fields).not.toContain('_ws.col.Protocol');
    expect(compiled.diagnostics).toContain('Protocol-column labeling is unavailable; use frame.protocols and record the fallback. Selected frame.protocols.');
    expect(compiled.provenance.fallbacks).toEqual([{ field: '_ws.col.Protocol', replacement: 'frame.protocols' }]);
  });

  it('omits unavailable optional fields but fails required fields and unsupported versions closed', () => {
    const tls = recipes.find(recipe => recipe.recipe_id === 'analysis-recipe:tls-v1')!;
    const onlyRequired = fields(tls).filter(field => tls.requested_output.fields.find(request => request.name === field)?.required);
    const compiled = compileAnalysisRecipe(tls, { tsharkVersion: '4.6.8', availableFields: onlyRequired });
    expect(compiled.diagnostics.some(message => message.includes('SNI field is unavailable'))).toBe(true);

    expect(() => compileAnalysisRecipe(tls, { tsharkVersion: '4.6.8', availableFields: onlyRequired.filter(field => field !== 'frame.number') }))
      .toThrowError(RecipeCompatibilityError);
    expect(() => compileAnalysisRecipe(tls, { tsharkVersion: '5.0.0', availableFields: fields(tls) }))
      .toThrow('incompatible');
  });

  it('matches deterministic packet-evidence golden outputs for every recipe', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'aiwg-recipe-golden-'));
    try {
      const capture = path.join(directory, 'synthetic.pcap');
      const header = Buffer.alloc(24);
      header.set([0xd4, 0xc3, 0xb2, 0xa1]);
      header.writeUInt16LE(2, 4);
      header.writeUInt16LE(4, 6);
      header.writeUInt32LE(65535, 16);
      header.writeUInt32LE(1, 20);
      await writeFile(capture, header);
      const packet = JSON.stringify([{ _source: { layers: {
        'frame.number': ['1'], 'frame.time_epoch': ['1788645600.125'], 'frame.len': ['96'],
        'ip.src': ['192.0.2.10'], 'ip.dst': ['198.51.100.20'], 'tcp.srcport': ['55000'],
        'tcp.dstport': ['443'], 'tcp.stream': ['0'], 'dns.id': ['1'], 'dns.qry.name': ['fixture.example'],
        'dns.flags.response': ['0'], 'tls.handshake.type': ['1'], 'http.request.method': ['GET'],
        'http.host': ['fixture.example'], '_ws.col.Protocol': ['TLS'],
      } } }]);
      const actual = [];
      for (const recipe of recipes) {
        const compiled = compileAnalysisRecipe(recipe, { tsharkVersion: '4.6.8', availableFields: fields(recipe) });
        const bundle = await analyzeOfflineCapture({
          capturePath: capture,
          tshark: { path: '/opt/wireshark/bin/tshark', version: '4.6.8' },
          recipe: compiled.recipe,
          limits: compiled.limits,
          authorizationRefs: ['authorization:synthetic-fixture'],
          now: () => new Date('2026-09-05T22:00:00Z'),
        }, { async run() { return { exitCode: 0, stdout: packet, stderr: '' }; } });
        const context = (bundle.capture.analysis_contexts as any[])[0];
        const artifact = bundle.artifacts[0] as any;
        actual.push({
          recipe_id: recipe.recipe_id,
          bundle_id: bundle.bundle_id,
          context_digest: context.context_digest,
          artifact_digest: `sha256:${artifact.digest.value}`,
          evidence_count: bundle.evidence_items.length,
          status: bundle.status,
        });
      }
      expect(actual).toEqual(goldenOutputs);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
