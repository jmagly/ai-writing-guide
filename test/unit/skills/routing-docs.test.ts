import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const repo = resolve(__dirname, '../../..');
function read(rel: string): string {
  return readFileSync(resolve(repo, rel), 'utf8');
}

describe('routing documentation regressions', () => {
  it('agent-loop documents Codex native /goal routing and external-loop boundary', () => {
    const skill = read('agentic/code/addons/agent-loop/skills/agent-loop/SKILL.md');
    expect(skill).toContain('Codex with native `/goal`');
    expect(skill).toContain('/goal "<task>; completion: <measurable criterion>"');
    expect(skill).toContain('External crash-resilient loops stay AIWG-native');
    expect(existsSync(resolve(repo, '.aiwg/research/codex-goal-integration.md'))).toBe(true);
    expect(existsSync(resolve(repo, '.aiwg/architecture/adr-codex-goal-routing.md'))).toBe(true);
  });

  it('aiwg-pr is explicitly AIWG-specific and has a discoverable delivery alias', () => {
    const skill = read('agentic/code/addons/aiwg-utils/skills/aiwg-pr/SKILL.md');
    expect(skill).toContain('Do not use `aiwg-pr` for ordinary repository pull request work');
    expect(skill).toContain('`aiwg-delivery-pr` is the explicit alias');
    const alias = read('agentic/code/addons/aiwg-utils/skills/aiwg-delivery-pr/SKILL.md');
    expect(alias).toContain('not a generic repository PR guide');
    const quickref = read('agentic/code/addons/aiwg-utils/skills/aiwg-utils-quickref/SKILL.md');
    expect(quickref).toContain('"open a PR for this repo"');
    expect(quickref).toContain('`aiwg-pr`');
  });
});
