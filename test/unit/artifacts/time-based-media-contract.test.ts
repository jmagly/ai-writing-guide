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
});
