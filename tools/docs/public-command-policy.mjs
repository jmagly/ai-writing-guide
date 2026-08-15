const fencedBlockPattern = /^([\t ]*)(`{3,}|~{3,})([^\n]*)\n([\s\S]*?)^\1\2\s*$/gmu;
const commandPattern = /\baiwg[\t ]+([a-z][a-z0-9-]*)\b/gu;
const executableLinePattern = /^[\t ]*(?:\$[\t ]*)?aiwg[\t ]+([a-z][a-z0-9-]*)\b/gmu;

export function commandRoot(command) {
  return command.split(/\s+/u)[0];
}

export function extractCommands(content) {
  return [...content.matchAll(commandPattern)].map((match) => match[1]);
}

export function isHistorical(relative) {
  return relative.startsWith('releases/') || relative.startsWith('blog/');
}

export function isContributor(relative) {
  return relative.startsWith('development/') || relative.startsWith('contributing/');
}

export function isAgentOrCliReference(relative, content = '') {
  if (relative.startsWith('agents/')) return true;
  if (relative.startsWith('cli/')) {
    return relative !== 'cli/README.md' && relative !== 'cli/install-and-repair.md';
  }
  return /^audience:\s*agent-operator\s*$/mu.test(content)
    && !/^publication:\s*public-/mu.test(content);
}

export function isPublicUserDocument(relative, content = '') {
  return !isHistorical(relative)
    && !isContributor(relative)
    && !isAgentOrCliReference(relative, content);
}

export function actionableAdvancedCommands(content, directTouchCommands) {
  const commands = [];
  for (const match of content.matchAll(fencedBlockPattern)) {
    const info = match[3].trim().split(/\s+/u)[0].toLowerCase();
    if (info === 'mermaid') continue;
    for (const line of match[4].matchAll(executableLinePattern)) {
      if (!directTouchCommands.includes(line[1])) commands.push(line[1]);
    }
  }
  return commands;
}

function promptForHeading(heading) {
  const goal = heading.replace(/[*_`]/gu, '').replace(/\s+/gu, ' ').trim();
  return [
    '```text',
    `Ask your agent to complete the "${goal}" procedure described here using AIWG.`,
    'Have it inspect the current state, explain the plan, ask before material',
    'changes, and report the result with verification evidence.',
    '```',
  ].join('\n');
}

function rewriteInlineAdvancedCommands(content, directTouchCommands) {
  const withoutInlineCommands = content.replace(/`aiwg[\t ]+([a-z][a-z0-9-]*)([^`]*)`/gu, (whole, root) => {
    if (directTouchCommands.includes(root)) return whole;
    if (root === 'discover') return 'the agent’s capability search';
    if (root === 'show') return 'the agent’s stable-asset loader';
    return `the agent-owned ${root} operation`;
  });
  return withoutInlineCommands.replace(/\baiwg[\t ]+([a-z][a-z0-9-]*)\b/gu, (whole, root) => {
    if (directTouchCommands.includes(root)) return whole;
    if (root === 'discover') return 'the agent capability search';
    if (root === 'show') return 'the agent stable-asset loader';
    return `the agent-owned ${root} operation`;
  });
}

export function rewritePublicUserCommands(content, directTouchCommands) {
  let heading = 'current task';
  let cursor = 0;
  let changed = false;
  let output = '';

  for (const match of content.matchAll(fencedBlockPattern)) {
    const before = content.slice(cursor, match.index);
    const headings = [...before.matchAll(/^#{2,6}\s+(.+)$/gmu)];
    if (headings.length > 0) heading = headings.at(-1)[1];
    output += before;

    const info = match[3].trim().split(/\s+/u)[0].toLowerCase();
    const executable = info === 'mermaid'
      ? []
      : [...match[4].matchAll(executableLinePattern)].map((line) => line[1]);
    const advanced = executable.some((root) => !directTouchCommands.includes(root));
    if (advanced) {
      output += promptForHeading(heading);
      changed = true;
    } else {
      output += match[0];
    }
    cursor = match.index + match[0].length;
  }

  output += content.slice(cursor);
  const rewritten = rewriteInlineAdvancedCommands(output, directTouchCommands);
  return { content: rewritten, changed: changed || rewritten !== content };
}
