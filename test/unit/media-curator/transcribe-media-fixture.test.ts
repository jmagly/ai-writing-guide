import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const fixturePath = resolve('agentic/code/frameworks/media-curator/skills/transcribe-media/examples/sample.transcript.json');

describe('transcribe-media fixture', () => {
  it('documents the required transcript sidecar fields', () => {
    const sidecar = JSON.parse(readFileSync(fixturePath, 'utf8'));

    expect(sidecar.schema).toBe('aiwg.media.transcript.v1');
    expect(sidecar.source.path).toBeTruthy();
    expect(sidecar.source.url).toBeTruthy();
    expect(sidecar.source.sha256).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(sidecar.transcript.sha256).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(sidecar.transcript.quality.limitations.join(' ')).toMatch(/diarization|verification|illustrative/i);
    expect(sidecar.segments[0]).toMatchObject({
      id: 'seg-000001',
      start: '00:00:00.000',
      speaker: 'SPEAKER_00',
    });
    expect(sidecar.segments.every((segment: { text?: string }) => Boolean(segment.text))).toBe(true);
    expect(sidecar.provenance.wasDerivedFrom).toBe(sidecar.source.sha256);
    expect(sidecar.provenance.generatedEntity).toBe(sidecar.transcript.sha256);
  });
});
