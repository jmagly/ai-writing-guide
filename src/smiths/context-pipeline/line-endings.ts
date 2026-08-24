export type LineEnding = '\n' | '\r\n';

/** Select the majority line ending, preferring LF for ties and new files. */
export function dominantLineEnding(content: string): LineEnding {
  const crlfCount = content.match(/\r\n/g)?.length ?? 0;
  const newlineCount = content.match(/\n/g)?.length ?? 0;
  const bareLfCount = newlineCount - crlfCount;
  return crlfCount > bareLfCount ? '\r\n' : '\n';
}

/** Render generated text using the line-ending convention of existing content. */
export function withLineEnding(content: string, lineEnding: LineEnding): string {
  return content.replace(/\r?\n/g, lineEnding);
}
