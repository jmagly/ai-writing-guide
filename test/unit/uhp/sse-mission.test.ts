import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseUhpEventStream } from '../../../src/uhp/sse.js';
import { projectUhpResponseToCanonicalMission, projectUhpResponseToMission, unknownUhpMissionEvidence } from '../../../src/uhp/mission.js';
import type { UhpResponse } from '../../../src/uhp/types.js';

function stream(text: string): ReadableStream<Uint8Array> {
  return new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode(text)); controller.close(); } });
}

async function collect(text: string) {
  const output = [];
  for await (const event of parseUhpEventStream(stream(text), { inactivityTimeoutMs: 1_000 })) output.push(event);
  return output;
}

describe('UHP streaming', () => {
  it('accepts unknown additive events while enforcing gapless sequence and one terminal', async () => {
    const text = await readFile(join(process.cwd(), 'test/fixtures/uhp/2026-08-11/stream.sse'), 'utf8');
    const events = await collect(text);
    expect(events.map(event => event.type)).toEqual(['response.created', 'fixture.vendor.progress', 'response.completed']);
  });

  it.each([
    ['gap', 'data: {"type":"response.created","sequence_number":0}\n\ndata: {"type":"response.completed","sequence_number":2}\n\n', 'event_sequence_gap'],
    ['duplicate terminal', 'data: {"type":"response.created","sequence_number":0}\n\ndata: {"type":"response.completed","sequence_number":1}\n\ndata: {"type":"response.failed","sequence_number":2}\n\n', 'duplicate_terminal_event'],
    ['malformed', 'data: {bad json}\n\n', 'malformed_sse'],
    ['missing terminal', 'data: {"type":"response.created","sequence_number":0}\n\n', 'missing_terminal_event'],
  ])('diagnoses %s streams', async (_name, text, code) => {
    await expect(collect(text)).rejects.toMatchObject({ code });
  });
});

describe('UHP Mission evidence adapter', () => {
  it.each([
    ['in_progress', 'running'], ['completed', 'completed'], ['failed', 'failed'],
    ['incomplete', 'incomplete'], ['cancelled', 'cancelled'],
  ])('maps %s distinctly to %s', (native, state) => {
    const response = { id: 'resp_fixture', object: 'response', created_at: 1787600000, status: native, model: 'fixture-model', metadata: { session_id: 'hsessfixture' }, output: native === 'completed' ? [] : [{ type: 'message' }] } as UhpResponse;
    const evidence = projectUhpResponseToMission('test', response);
    expect(evidence.state).toBe(state);
    expect(evidence.nativeState).toBe(native);
    expect(evidence.partialOutput).toBe(native !== 'completed');
  });

  it('preserves requested/actual identities, artifacts, and extensions', async () => {
    const response = JSON.parse(await readFile(join(process.cwd(), 'test/fixtures/uhp/2026-08-11/response.json'), 'utf8')) as UhpResponse;
    const evidence = projectUhpResponseToMission('prod', response, { input: 'x', model: 'gpt-5.5-codex', metadata: { harness_id: 'chrn_requested' } });
    expect(evidence).toMatchObject({ transport: 'uhp', endpointProfile: 'prod', responseId: 'resp_fixture', sessionId: 'hsessfixture', harness: { requested: 'chrn_requested', actual: 'chrn_fixture' }, model: { requested: 'gpt-5.5-codex', actual: 'gpt-5.6-codex' }, artifactIds: ['file_fixture'], artifacts: [{ fileId: 'file_fixture', containerId: 'cntr_fixture', filename: 'report.md' }] });
    expect(evidence.extensions.fixture_vendor_receipt).toEqual({ retained: true });
  });

  it('retains input file ids, names, media types, and original source metadata', () => {
    const response = { id: 'resp_fixture', object: 'response', created_at: 1787600000, status: 'completed', model: 'fixture', output: [], metadata: {} } as UhpResponse;
    const evidence = projectUhpResponseToMission('test', response, { input: [{ role: 'user', content: [{ type: 'input_file', file_id: 'file_input', filename: 'brief.txt', fixture_source: 'upload' }, { type: 'input_file', filename: 'inline.pdf', file_data: 'data:application/pdf;base64,AA==' }] }] });
    expect(evidence.inputFiles).toMatchObject([
      { fileId: 'file_input', filename: 'brief.txt', source: { fixture_source: 'upload' } },
      { filename: 'inline.pdf', mediaType: 'application/pdf' },
    ]);
  });

  it('represents disconnect as unknown observation, never cancellation', () => {
    expect(unknownUhpMissionEvidence('test', 'disconnected', 'resp_fixture', 4)).toMatchObject({ state: 'unknown', observationState: 'unknown', nativeState: 'unknown', responseId: 'resp_fixture', eventSequence: 4 });
  });

  it('consumes the canonical Mission adapter without losing native UHP evidence', async () => {
    const response = JSON.parse(await readFile(join(process.cwd(), 'test/fixtures/uhp/2026-08-11/response.json'), 'utf8')) as UhpResponse;
    const decoded = projectUhpResponseToCanonicalMission('prod', response, { input: 'Produce a report', model: 'requested-model' });
    expect(decoded.value).toMatchObject({
      apiVersion: 'mission.aiwg.io/v1', kind: 'Mission',
      metadata: { id: 'resp_fixture' }, spec: { objective: 'Produce a report' },
      status: { state: 'completed', terminal: true, nativeState: 'completed', artifacts: [{ id: 'file_fixture', kind: 'uhp-file' }] },
      provenance: { sourceContract: 'uhp-2026-08-11', sourceVersion: '2026-08-11', transport: 'uhp' },
    });
    expect(decoded.preservedExtensions.endpointProfile).toBe('prod');
  });
});
