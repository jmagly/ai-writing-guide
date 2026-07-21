import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '../..');

const activeAssets = [
  'agentic/code/frameworks/sdlc-complete/rules/sdlc-orchestration.md',
  'agentic/code/frameworks/sdlc-complete/templates/aiwg-sections/02-orchestrator-role.md',
  'agentic/code/frameworks/sdlc-complete/templates/project/AIWG-sdlc-fragment.md',
  'agentic/code/frameworks/sdlc-complete/templates/project/AIWG.md',
  'agentic/code/addons/aiwg-utils/prompts/core/orchestrator.md',
];

function read(relativePath: string): string {
  return fs.readFileSync(path.join(REPO_ROOT, relativePath), 'utf8');
}

describe('canonical SDLC orchestration assets (#1839)', () => {
  it.each(activeAssets)('%s routes through canonical skill discovery', relativePath => {
    const content = read(relativePath);

    expect(content).toContain('sdlc-quickref');
    expect(content).toMatch(/aiwg discover/);
    expect(content).toMatch(/aiwg show skill/);
    expect(content).toMatch(/canonical skill/i);
  });

  it.each(activeAssets)('%s does not restore Claude command-first orchestration', relativePath => {
    const content = read(relativePath);

    expect(content).not.toMatch(/Read Flow Commands as Orchestration Templates/i);
    expect(content).not.toMatch(/Flow commands are located in `.claude\/commands\/flow-\*\.md`/i);
    expect(content).not.toMatch(/Launch Multi-Agent Workflows via Task Tool/i);
    expect(content).not.toMatch(/Launch agents via Task tool/i);
  });

  it('activates for canonical skill and provider-adapter surfaces', () => {
    const rule = read('agentic/code/frameworks/sdlc-complete/rules/sdlc-orchestration.md');

    expect(rule).toContain('"**/skills/sdlc-quickref/SKILL.md"');
    expect(rule).toContain('"**/skills/orchestrate-project/SKILL.md"');
    expect(rule).toContain('"**/commands/flow-*.md"');
    expect(rule).not.toContain('  - ".claude/commands/flow-*.md"');
  });

  it('keeps assembled context synchronized with its section sources', () => {
    const templateRoot = path.join(
      REPO_ROOT,
      'agentic/code/frameworks/sdlc-complete/templates'
    );
    const manifest = JSON.parse(
      fs.readFileSync(path.join(templateRoot, 'aiwg-sections/manifest.json'), 'utf8')
    );
    const assembled = manifest.sections
      .map((section: { file: string }) =>
        fs.readFileSync(path.join(templateRoot, 'aiwg-sections', section.file), 'utf8').trim()
      )
      .join('\n\n');

    expect(read('agentic/code/frameworks/sdlc-complete/templates/project/AIWG-sdlc-fragment.md'))
      .toContain(assembled);
    expect(read('agentic/code/frameworks/sdlc-complete/templates/project/AIWG.md'))
      .toContain(assembled);
  });
});
