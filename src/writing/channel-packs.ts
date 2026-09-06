export type WritingChannel = 'article' | 'social' | 'email' | 'engineering' | 'conversation';
export interface WritingChannelPack { version: 1; channel: WritingChannel; instructions: string; status: 'advisory' }
const instructions: Record<WritingChannel, string> = {
  article: 'Develop the reader task with supported detail. Use headings when useful. End when the task is answered; no required recap, rhetorical quiz, contrast formula or signature phrase.',
  social: 'Produce one self-contained announcement. Put its engagement CTA in that same post. Keep limitations beside the relevant action. If the destination budget cannot fit essential content, fail instead of truncating or splitting.',
  email: 'Make the purpose and requested action clear. Preserve the factual brief and relevant limitations. A greeting, signoff or summary is optional unless the author requests it.',
  engineering: 'Preserve technical terms, commands, identifiers, standards qualifications and uncertainty. Controlled-language guidance is advisory unless an independently validated mode explicitly requires it. Concision must retain necessary detail.',
  conversation: 'Answer the reader directly in complete thoughts. Length follows the task; retain caveats and detail needed for decisions. Do not force fragments, ban uncertainty or truncate to the first paragraph.',
};
export function getWritingChannelPack(channel: WritingChannel): WritingChannelPack {
  if (!Object.hasOwn(instructions, channel)) throw new Error('Unknown writing channel');
  return { version: 1, channel, instructions: instructions[channel], status: 'advisory' };
}
