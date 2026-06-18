import { describe, expect, it } from 'vitest';
import { readFile } from 'fs/promises';
import path from 'path';

const root = process.cwd();

async function read(rel: string): Promise<string> {
  return readFile(path.join(root, rel), 'utf8');
}

describe('research-brainstorming extension', () => {
  it('documents a wiki-memory research brainstorming profile', async () => {
    const manifest = JSON.parse(await read('agentic/code/extensions/research-brainstorming/manifest.json'));
    const readme = await read('agentic/code/extensions/research-brainstorming/README.md');

    expect(manifest.requires).toEqual(expect.arrayContaining([
      'research-complete',
      'knowledge-base',
      'semantic-memory',
    ]));
    expect(manifest.capabilities).toEqual(expect.arrayContaining([
      'free-form-brainstorm-capture',
      'wiki-memory-retrieval',
      'research-artifact-promotion',
    ]));
    expect(manifest.memory.topology.crossRefStyle).toBe('wikilink');
    expect(readme).toContain('Source Labels');
    expect(readme).toContain('Corpus-Root Research Repositories');
    expect(readme).toContain('documentation/references/');
  });

  it('covers loose capture without REF structure, linked retrieval, and promotion', async () => {
    const loose = await read('test/fixtures/research-brainstorming/loose-session.md');
    const retrieval = JSON.parse(await read('test/fixtures/research-brainstorming/linked-retrieval.json'));
    const promotion = await read('test/fixtures/research-brainstorming/promotion-research-task.md');
    const refPromotion = await read('test/fixtures/research-brainstorming/promotion-ref-candidate-corpus-root.md');

    expect(loose).toContain('[user-idea]');
    expect(loose).toContain('[model-suggestion]');
    expect(loose).toContain('intentionally has no `REF-*` structure');
    expect(retrieval.retrieval_command).toBe('aiwg index neighbors --graph kb --node local-first-telemetry');
    expect(retrieval.neighbor_types).toEqual(expect.arrayContaining(['concept', 'entity', 'brainstorm-note']));
    expect(promotion).toContain('Target: .aiwg/research/working/research-questions.md');
    expect(refPromotion).toContain('Layout: corpus-root');
    expect(refPromotion).toContain('citation sidecar');
    expect(refPromotion).toContain('research-quality-audit');
  });

  it('is linked from the research-complete framework manifest', async () => {
    const manifest = JSON.parse(await read('agentic/code/frameworks/research-complete/manifest.json'));
    expect(manifest.extensions['research-brainstorming'].path).toBe('agentic/code/extensions/research-brainstorming');
  });
});
