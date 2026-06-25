/**
 * Time-based media research contract (#1234 / #1475-#1478).
 *
 * These checks pin the source-level contract without requiring live media
 * acquisition, external transcription services, or a project corpus.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { load as loadYaml } from 'js-yaml';

const repo = resolve(fileURLToPath(new URL('.', import.meta.url)), '../../..');

function read(rel: string): string {
  return readFileSync(join(repo, rel), 'utf8');
}

describe('time-based media research contract', () => {
  it('registers the media REF template and media source types', () => {
    const manifest = JSON.parse(read('agentic/code/frameworks/research-complete/templates/manifest.json'));
    const templateIds = manifest.templates.map((entry: { template_id: string }) => entry.template_id);
    expect(templateIds).toContain('reference-media');
    expect(manifest.categories.induction).toContain('reference-media');

    const sourceTypes = loadYaml(
      read('agentic/code/frameworks/research-complete/config/source-types.yaml'),
    ) as { types: Record<string, { template: string; citation_format: string; acquisition: string; storage: string }> };

    for (const type of ['video', 'audio', 'podcast', 'lecture']) {
      expect(sourceTypes.types[type].template).toBe('reference-media');
      expect(sourceTypes.types[type].citation_format).toBe('timestamp-transcript');
      expect(sourceTypes.types[type].acquisition).toBe('media-curator');
    }
    expect(sourceTypes.types.video.storage).toBe('media/video');
    expect(sourceTypes.types.audio.storage).toBe('media/audio');
  });

  it('documents timestamp citation policy and citation-guard acceptance', () => {
    const policy = read('agentic/code/frameworks/sdlc-complete/rules/citation-policy.md');
    expect(policy).toContain('transcript timestamp anchors instead of page numbers');
    expect(policy).toContain('@.aiwg/research/findings/REF-123.md @ 00:12:34');
    expect(policy).toContain('timestamp exists in that transcript');
    expect(policy).toContain('quoted words match the transcript exactly');

    const guard = read('agentic/code/frameworks/sdlc-complete/skills/citation-guard/SKILL.md');
    expect(guard).toContain('timestamp citation');
    expect(guard).toContain('the timestamp exists in `segments[]`');
    expect(guard).toContain('quoted words match the transcript text exactly');
  });

  it('makes induct-media discoverable and documents storage/handoff outputs', () => {
    const skill = read('agentic/code/frameworks/research-complete/skills/induct-media/SKILL.md');
    expect(skill).toContain('name: induct-media');
    expect(skill).toContain('userInvocable: true');
    expect(skill).toContain('induct media research source');
    expect(skill).toContain('--transcript <path>');
    expect(skill).toContain('--source-url <url>');
    expect(skill).toContain('copied');
    expect(skill).toContain('lfs');
    expect(skill).toContain('object-storage');
    expect(skill).toContain('hash-only');
    expect(skill).toContain('REF-XXX-citations.md');
    expect(skill).toContain('REF-XXX-radar.md');
    expect(skill).toContain('Index/search metadata');
  });

  it('keeps generated research guidance aligned with media storage layout', () => {
    const researchManifest = JSON.parse(read('agentic/code/frameworks/research-complete/manifest.json'));
    const createdPaths = researchManifest.memory.creates.map((entry: { path: string }) => entry.path);
    expect(createdPaths).toContain('.aiwg/frameworks/research-complete/media/video/');
    expect(createdPaths).toContain('.aiwg/frameworks/research-complete/media/audio/');
    expect(createdPaths).toContain('.aiwg/frameworks/research-complete/media/transcripts/');

    const quickref = read('agentic/code/frameworks/research-complete/skills/research-quickref/SKILL.md');
    expect(quickref).toContain('Time-based media');
    expect(quickref).toContain('media/video');
    expect(quickref).toContain('media/audio');
    expect(quickref).toContain('media/transcripts');

    const handoff = read('docs/integrations/media-curator-to-research-handoff.md');
    expect(handoff).toContain('/transcribe-media');
    expect(handoff).toContain('/induct-media');
    expect(handoff).toContain('citation-guard` accepts this form');
    expect(handoff).toContain('research-query');
  });

  it('aligns the acquire → induct-media acquisition manifest contract (#1477)', () => {
    // Producer side: acquire documents the per-media manifest schema and the
    // fields induct-media consumes.
    const acquire = read('agentic/code/frameworks/media-curator/skills/acquire/SKILL.md');
    expect(acquire).toContain('aiwg.media.acquisition.v1');
    for (const field of ['title', 'source_url', 'platform', 'media_path', 'sha256', 'duration', 'license']) {
      expect(acquire).toContain(field);
    }

    // Consumer side: induct-media references the same schema name.
    const induct = read('agentic/code/frameworks/research-complete/skills/induct-media/SKILL.md');
    expect(induct).toContain('aiwg.media.acquisition.v1');
    expect(induct).toContain('aiwg.media.transcript.v1');

    // Producer fixture exists, parses, and carries the contract keys.
    const producerRaw = read('agentic/code/frameworks/media-curator/skills/acquire/examples/sample.acquisition.json');
    const producer = JSON.parse(producerRaw);
    expect(producer.schema).toBe('aiwg.media.acquisition.v1');
    for (const field of ['title', 'source_url', 'platform', 'media_path', 'sha256', 'duration', 'license']) {
      expect(producer[field]).toBeTruthy();
    }
  });

  it('ships a self-consistent induct-media worked fixture (#1477)', () => {
    const base = 'agentic/code/frameworks/research-complete/skills/induct-media/examples';
    for (const f of ['README.md', 'sample.acquisition.json', 'sample.transcript.json',
      'expected-REF-101.md', 'expected-REF-101-citations.md', 'expected-REF-101-radar.md']) {
      expect(() => read(`${base}/${f}`)).not.toThrow();
    }

    // The induct-media acquisition fixture must be byte-identical to the
    // media-curator producer fixture — no contract drift between the two skills.
    const consumerAcq = read(`${base}/sample.acquisition.json`);
    const producerAcq = read('agentic/code/frameworks/media-curator/skills/acquire/examples/sample.acquisition.json');
    expect(consumerAcq).toBe(producerAcq);

    const acq = JSON.parse(consumerAcq);
    const transcript = JSON.parse(read(`${base}/sample.transcript.json`));

    // Transcript was derived from the acquired bytes.
    expect(transcript.source.sha256).toBe(acq.sha256);

    // Every spoken-reference timestamp in the citations sidecar points at a real
    // transcript segment, and the quoted text matches that segment exactly.
    const citations = read(`${base}/expected-REF-101-citations.md`);
    const segments = transcript.segments as Array<{ start: string; text: string }>;
    const tableRows = citations
      .split('\n')
      .filter((l) => /\|\s*\d{2}:\d{2}:\d{2}\s*\|/.test(l));
    expect(tableRows.length).toBeGreaterThan(0);
    for (const row of tableRows) {
      const ts = row.match(/\b(\d{2}:\d{2}:\d{2})\b/)![1];
      const seg = segments.find((s) => s.start.startsWith(ts));
      expect(seg, `timestamp ${ts} must exist in transcript segments`).toBeTruthy();
      expect(row).toContain(seg!.text);
    }
  });
});
