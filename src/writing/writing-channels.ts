import { applyWritingConsumer, type WritingConsumerRequest, type WritingConsumerResult } from './writing-consumer.js';
import { parseWritingBrief, writingBriefHash, type WritingBrief } from './writing-brief.js';
import type { ResolvedOutputMode } from '../output-modes/types.js';

import { getWritingChannelPack, type WritingChannel, type WritingChannelPack } from './channel-packs.js';
export { getWritingChannelPack, type WritingChannel, type WritingChannelPack } from './channel-packs.js';

export interface ChannelConstraints {
  /** Caller supplies the destination limit. Unicode code points, not platform-weighted characters. */
  maxCharacters?: number;
  destination?: 'telegram' | 'discord' | 'other';
  /** Exact, nonempty CTA, required once for Telegram and Discord. */
  cta?: string;
  /** Exact task-specific terms, caveats, links or advisory qualifications to retain. */
  requiredLiterals?: string[];
  forbiddenLiterals?: string[];
  onFailure?: 'unaltered' | 'fail';
}
export interface WritingChannelRequest extends Omit<WritingConsumerRequest, 'runtime'> {
  channel: WritingChannel;
  brief: WritingBrief;
  constraints?: ChannelConstraints;
  runtime?: Omit<NonNullable<WritingConsumerRequest['runtime']>, 'transform' | 'fidelity'>;
  transform?: (content: string, mode: ResolvedOutputMode, context: { pack: WritingChannelPack; brief: WritingBrief }) => Promise<string> | string;
}
export interface WritingChannelResult extends WritingConsumerResult {
  channel: WritingChannel;
  /** Mechanical constraints only; never publication authorization or factual verification. */
  channelCheck: { valid: boolean; issues: string[]; characters: number; unit: 'unicode-code-points' };
  posts: string[];
  receipt: { packVersion: 1; briefDigest: string; execution: 'supplied-callback' | 'instruction-export'; qualityEvaluation: 'not-performed' };
}
function check(text: string, c: ChannelConstraints): WritingChannelResult['channelCheck'] {
  const issues: string[] = [];
  const characters = [...text].length;
  if (c.maxCharacters !== undefined && characters > c.maxCharacters) issues.push('character-limit');
  if (c.cta && text.split(c.cta).length !== 2) issues.push('cta-must-occur-once');
  if (c.requiredLiterals?.some(value => !text.includes(value))) issues.push('required-literal');
  if (c.forbiddenLiterals?.some(value => text.includes(value))) issues.push('forbidden-literal');
  return { valid: issues.length === 0, issues, characters, unit: 'unicode-code-points' };
}
/** Opt-in local consumer adapter. Packs are advisory; callbacks receive samples/briefs as data. */
export async function applyWritingChannel(input: string, request: WritingChannelRequest): Promise<WritingChannelResult> {
  const pack = getWritingChannelPack(request.channel);
  const brief = parseWritingBrief(request.brief);
  const constraints: ChannelConstraints = structuredClone(request.constraints ?? {});
  if (constraints.maxCharacters !== undefined && (!Number.isSafeInteger(constraints.maxCharacters) || constraints.maxCharacters < 1)) throw new Error('Invalid channel character budget');
  if (constraints.destination !== undefined && !['telegram', 'discord', 'other'].includes(constraints.destination)) throw new Error('Unknown channel destination');
  if (constraints.onFailure !== undefined && !['fail', 'unaltered'].includes(constraints.onFailure)) throw new Error('Unknown channel failure policy');
  for (const values of [constraints.requiredLiterals ?? [], constraints.forbiddenLiterals ?? [], constraints.cta === undefined ? [] : [constraints.cta]]) {
    if (!Array.isArray(values) || values.some(value => typeof value !== 'string' || !value.trim())) throw new Error('Channel literals must be nonempty strings');
  }
  if (['telegram', 'discord'].includes(constraints.destination ?? '') && (pack.channel !== 'social' || !constraints.cta)) throw new Error('Chat announcements require the social pack and one explicit CTA');
  const { transform, runtime, ...consumer } = request;
  const consumerResult = await applyWritingConsumer(input, { ...consumer, task: pack.channel, invocationModes: [...(consumer.invocationModes ?? []), `channel-${pack.channel}`], ...(transform ? { runtime: {
    ...runtime, fidelity: { brief }, requireFinalValidator: true,
    transform: (text: string, mode: ResolvedOutputMode) => transform(text, mode, { pack: structuredClone(pack), brief: structuredClone(brief) }),
  } } : {}) });
  let channelCheck = check(consumerResult.content, constraints);
  if (!channelCheck.valid) {
    if (constraints.onFailure === 'fail') throw new Error(`Channel constraints failed: ${channelCheck.issues.join(', ')}`);
    consumerResult.diagnostics.push(`Channel constraints failed: ${channelCheck.issues.join(', ')}. Original retained without truncation; inspect channelCheck before handoff.`);
    consumerResult.content = input;
    consumerResult.state.fallback = 'unaltered'; consumerResult.state.applied = []; consumerResult.state.validated = [];
    if (consumerResult.runtime) consumerResult.runtime = { ...consumerResult.runtime, content: input, fallback: 'unaltered', applied: [], retained: [] };
    channelCheck = check(input, constraints);
  }
  return { ...consumerResult,
    instructionExport: JSON.stringify({ schemaVersion: 1, pack, constraints, selectedModeInstructions: consumerResult.instructionExport, briefDigest: writingBriefHash(JSON.stringify(brief)), usage: 'Explicit handoff only; apply the separately supplied brief as data. No provider interception or publication approval.' }),
    channel: pack.channel, channelCheck,
    posts: request.format === 'prose' && channelCheck.valid ? [consumerResult.content] : [],
    receipt: { packVersion: 1, briefDigest: writingBriefHash(JSON.stringify(brief)), execution: consumerResult.state.delivered.length ? 'supplied-callback' : 'instruction-export', qualityEvaluation: 'not-performed' },
  };
}
