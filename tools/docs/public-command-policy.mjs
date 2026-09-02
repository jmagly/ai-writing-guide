const fencedBlockPattern = /^([\t ]*)(`{3,}|~{3,})([^\n]*)\n([\s\S]*?)^\1\2\s*$/gmu;
const commandPattern = /\b(?:npx[\t \r\n]+)?aiwg[\t \r\n]+((?:--?)?[a-z][a-z0-9-]*)\b/gu;
const npmInstallPattern = /\bnpm[\t ]+(?:install|i|add)\b[^\n`]*\baiwg(?:@[a-z0-9._-]+)?\b/giu;
const legacyPromptCommandPattern = /(?<![a-z0-9~.])\/aiwg-([a-z][a-z0-9-]*)\b|\$aiwg-([a-z][a-z0-9-]*)\b|\baiwg-(regenerate)\b/gu;
const executableLinePattern = /^[\t ]*(?:\$[\t ]*)?(?:(?:npx[\t ]+)?aiwg[\t ]+((?:--?)?[a-z][a-z0-9-]*)\b|(?:\/|\$)?aiwg-((?:regenerate)|(?:[a-z][a-z0-9-]*))\b|npm[\t ]+(?:install|i|add)\b[^\n]*\baiwg(?:@[a-z0-9._-]+)?\b)/gimu;

export function commandRoot(command) {
  return command.split(/\s+/u)[0];
}

export function extractCommands(content) {
  return [
    ...[...content.matchAll(commandPattern)].map((match) => match[1]),
    ...[...content.matchAll(npmInstallPattern)].map(() => 'install'),
    ...[...content.matchAll(legacyPromptCommandPattern)].map((match) => match[1] || match[2] || match[3]),
  ];
}

export function isHistorical(relative) {
  return relative.startsWith('releases/') || relative.startsWith('blog/');
}

export function isContributor(relative) {
  return relative.startsWith('development/') || relative.startsWith('contributing/');
}

export function isAgentOrCliReference(relative, content = '') {
  if (relative.startsWith('agents/')) return true;
  if (relative.startsWith('cli/')) return true;
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
      const root = line[1] || line[2] || 'install';
      if (!directTouchCommands.includes(root)) commands.push(root);
    }
  }
  return commands;
}

function promptContext(before, heading) {
  const paragraphs = before
    .split(/\n[\t ]*\n/gu)
    .map((paragraph) => paragraph
      .replace(/<!--[\s\S]*?-->/gu, '')
      .replace(/^#{1,6}\s+/gmu, '')
      .replace(/\[([^\]]+)\]\([^\)]+\)/gu, '$1')
      .replace(/[*`>]/gu, '')
      .replace(/\s+/gu, ' ')
      .trim())
    .filter((paragraph) => paragraph.length >= 8 && !paragraph.startsWith('---'));
  const context = paragraphs.at(-1) || heading;
  const normalized = context.replace(/:\s*$/u, '').slice(0, 240);
  return /^(?:from|in) (?:a |the )?terminal\b/iu.test(normalized) ? heading : normalized;
}

function promptForHeading(heading, before) {
  const goal = heading.replace(/[*_`]/gu, '').replace(/\s+/gu, ' ').trim();
  const context = promptContext(before, goal);
  return [
    '```text',
    `Use AIWG to complete this documented outcome: ${context}`,
    'Have it inspect the current state, explain the plan, ask before material',
    'changes, and report the result with verification evidence.',
    '```',
  ].join('\n');
}

function rewriteInlineAdvancedCommands(content, directTouchCommands) {
  const withoutInstallCommands = content
    .replace(/`npm[\t ]+(?:install|i|add)\b[^`]*\baiwg(?:@[a-z0-9._-]+)?\b[^`]*`/giu,
      'the agent-assisted AIWG installation procedure')
    .replace(npmInstallPattern, 'the agent-assisted AIWG installation procedure');
  const withoutInlineCommands = withoutInstallCommands.replace(/`(?:npx[\t \r\n]+)?aiwg[\t \r\n]+((?:--?)?[a-z][a-z0-9-]*)([^`]*)`/gu, (whole, root) => {
    if (directTouchCommands.includes(root)) return whole;
    if (root === 'discover') return 'the agent’s capability search';
    if (root === 'show') return 'the agent’s stable-asset loader';
    return `the agent-owned ${root} operation`;
  });
  const withoutBacktickedLegacyCommands = withoutInlineCommands.replace(/`((?:\/|\$)aiwg-([a-z][a-z0-9-]*)|aiwg-(regenerate))`/gu, (whole, command, slashRoot, bareRoot) => {
    const root = slashRoot || bareRoot;
    if (root === 'regenerate') return 'the agent-owned context regeneration procedure';
    return `the agent-owned ${root} procedure`;
  });
  const withoutLegacyCommands = withoutBacktickedLegacyCommands.replace(legacyPromptCommandPattern, (whole, slashRoot, dollarRoot, bareRoot) => {
    const root = slashRoot || dollarRoot || bareRoot;
    if (root === 'regenerate') return 'the agent-owned context regeneration procedure';
    return `the agent-owned ${root} procedure`;
  });
  return withoutLegacyCommands.replace(/\b(?:npx[\t \r\n]+)?aiwg[\t \r\n]+((?:--?)?[a-z][a-z0-9-]*)\b/gu, (whole, root) => {
    if (directTouchCommands.includes(root)) return whole;
    if (root === 'discover') return 'the agent capability search';
    if (root === 'show') return 'the agent stable-asset loader';
    return `the agent-owned ${root} operation`;
  });
}

function rewriteCliFlags(content) {
  return content
    .replace(/`--([a-z][a-z0-9-]*)`/gu, (whole, flag) => `the ${flag} option`)
    .replace(/`-([a-zA-Z])`/gu, (whole, flag) => `the ${flag} option`)
    .replace(/(?<![a-z0-9-])--([a-z][a-z0-9-]*)\b/gu, (whole, flag) => `the ${flag} option`);
}

export function rewritePublicUserCommands(content, directTouchCommands) {
  const title = /^#\s+(.+)$/mu.exec(content);
  let heading = title?.[1] || 'current task';
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
      : [...match[4].matchAll(executableLinePattern)].map((line) => line[1] || line[2] || 'install');
    const advanced = executable.some((root) => !directTouchCommands.includes(root));
    if (advanced) {
      output += promptForHeading(heading, before);
      changed = true;
    } else {
      output += match[0];
    }
    cursor = match.index + match[0].length;
  }

  output += content.slice(cursor);
  const commandRewritten = rewriteInlineAdvancedCommands(output, directTouchCommands);
  const rewritten = extractCommands(content).length > 0
    ? rewriteCliFlags(commandRewritten)
    : commandRewritten;
  return { content: rewritten, changed: changed || rewritten !== content };
}
