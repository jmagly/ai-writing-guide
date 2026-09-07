import { resolveOutputModes } from '../output-modes/registry.js';
import { applyOutputModes, type OutputModeRuntimeOptions, type OutputModeRuntimeResult } from '../output-modes/runtime.js';
import type { ResolvedOutputMode } from '../output-modes/types.js';

export interface WritingConsumerRequest {
  cwd: string;
  frameworkRoot: string;
  invocationModes?: string[];
  /** Exact author-preference task scope; omitted retains global preferences only. */
  task?: string;
  /** Caller-supplied labels, never inferred provider execution evidence. */
  provider: string;
  consumer: string;
  format: 'prose' | 'json' | 'tool' | 'protocol';
  runtime?: OutputModeRuntimeOptions;
}
export interface WritingConsumerResult {
  content: string;
  modes: ResolvedOutputMode[];
  instructionExport: string;
  diagnostics: string[];
  runtime?: OutputModeRuntimeResult;
  state: {
    provider: string; consumer: string; identityEvidence: 'caller-supplied';
    selected: string[]; delivered: string[]; applied: string[]; validated: string[];
    deliveredTo: 'local-transform-callback' | 'none';
    fallback: 'none' | 'unaltered';
    providerInterception: false;
  };
}

/** Shared opt-in boundary: only a participating prose callback can transform output. */
export async function applyWritingConsumer(input: string, request: WritingConsumerRequest): Promise<WritingConsumerResult> {
  if (!['prose', 'json', 'tool', 'protocol'].includes(request.format)) throw new Error('Unknown writing consumer format');
  const resolved = await resolveOutputModes(request.cwd, request.frameworkRoot, request.invocationModes ?? [], {}, { task: request.task });
  const modes = resolved.modes;
  const instructionExport = modes.length ? JSON.stringify({ schemaVersion: 1, usage: 'Selected expression instructions; apply only to prose within consumer permissions.', modes: modes.map(({ id, instructions, validation, protectedContent }) => ({ id, instructions, validation, protectedContent })) }, null, 2) : '';
  const state: WritingConsumerResult['state'] = {
    provider: request.provider, consumer: request.consumer, identityEvidence: 'caller-supplied',
    selected: modes.map(mode => mode.id), delivered: [], applied: [], validated: [],
    deliveredTo: 'none', fallback: 'none', providerInterception: false,
  };
  const result: WritingConsumerResult = { content: input, modes, instructionExport, diagnostics: [...resolved.diagnostics], state };
  if (request.format !== 'prose') {
    result.diagnostics.push('Structured output is unchanged. A participating consumer must explicitly select a prose field before applying modes.');
    return result;
  }
  if (!request.runtime) {
    if (modes.length) {
      result.diagnostics.push('This consumer has no transformation callback. Use the instruction export explicitly; selection does not intercept provider responses.');
      state.fallback = 'unaltered';
    }
    return result;
  }
  const runtime = await applyOutputModes(input, modes, request.runtime);
  result.content = runtime.content; result.runtime = runtime;
  state.delivered = [...(runtime.attempted ?? runtime.applied)];
  state.deliveredTo = state.delivered.length ? 'local-transform-callback' : 'none';
  state.applied = [...(runtime.retained ?? runtime.applied)];
  state.fallback = runtime.fallback;
  if (runtime.fallback === 'none') state.validated = state.applied.filter(id => modes.find(mode => mode.id === id)?.validation.level !== 'advisory');
  result.diagnostics.push(...runtime.diagnostics.map(diagnostic => diagnostic.message));
  return result;
}
