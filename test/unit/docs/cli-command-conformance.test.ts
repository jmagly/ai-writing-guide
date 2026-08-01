import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadRegistry } from '../../../src/extensions/loader.js';

const OPERATIONAL_DOCS = [
  'docs/providers/capability-matrix.md',
  'docs/getting-started/daemon-and-automation.md',
  'docs/addons/daemon/quickstart.md',
];

const SCHEDULER_CLAIM_DOCS = [
  ...OPERATIONAL_DOCS,
  'docs/agents/cli-reference.md',
];

function advertisedTopLevelCommands(markdown: string): Set<string> {
  const commands = new Set<string>();
  let inFence = false;

  for (const line of markdown.split(/\r?\n/u)) {
    if (/^\s*```/u.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (!inFence) continue;

    const match = line.match(/^\s*(?:\$\s*)?aiwg\s+([a-z][a-z0-9-]*)\b/u);
    if (match) commands.add(match[1]);
  }
  return commands;
}

describe('documented AIWG command conformance', () => {
  it('only advertises registered top-level commands in operational examples', async () => {
    const { registry, handlerMap } = await loadRegistry();

    for (const relativePath of OPERATIONAL_DOCS) {
      const markdown = readFileSync(resolve(process.cwd(), relativePath), 'utf8');
      for (const command of advertisedTopLevelCommands(markdown)) {
        const resolved = registry.resolveCommand(command);
        expect(resolved, `${relativePath} advertises unregistered command: aiwg ${command}`).toBeTruthy();
        expect(handlerMap.has(resolved!), `${relativePath} has no handler for: aiwg ${command}`).toBe(true);
      }
    }
  });

  it('does not present the unavailable daemon or schedule commands as runnable examples', () => {
    for (const relativePath of SCHEDULER_CLAIM_DOCS) {
      const markdown = readFileSync(resolve(process.cwd(), relativePath), 'utf8');
      const advertised = advertisedTopLevelCommands(markdown);
      expect(advertised.has('daemon'), relativePath).toBe(false);
      expect(advertised.has('schedule'), relativePath).toBe(false);
    }
  });
});
