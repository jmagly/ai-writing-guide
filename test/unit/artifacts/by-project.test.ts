/**
 * Cross-project "Referenced By" parsing + by-project / project-impact views (#1495).
 *
 * @source @src/artifacts/corpus-views/ref-parser.ts
 * @source @src/artifacts/corpus-views/renderers.ts
 */

import { describe, it, expect } from 'vitest';
import { extractReferencedByProjects } from '../../../src/artifacts/corpus-views/ref-parser.js';
import { SUPPORTED_VIEWS, renderView } from '../../../src/artifacts/corpus-views/renderers.js';

const SECTION = (rows: string[]): string =>
  ['# REF-001: Doc', '', '## Referenced By', '', '| Project | Context | Date Added |', '|---|---|---|', ...rows, '', '## Notes', 'other'].join('\n');

describe('extractReferencedByProjects (#1495)', () => {
  it('extracts markdown-link project names from the Project column', () => {
    const text = SECTION([
      '| [ai-writing-guide](https://git.example/aiwg) | foundation | 2026-01-24 |',
      '| matric-memory | memory research | 2026-02-01 |',
    ]);
    expect(extractReferencedByProjects(text)).toEqual(['ai-writing-guide', 'matric-memory']);
  });

  it('rolls per-issue rows up to the consuming repo (#NNN suffix dropped)', () => {
    const text = SECTION([
      '| fortemi/fortemi#436 | x | 2026-01-01 |',
      '| fortemi/fortemi#441 | y | 2026-01-02 |',
    ]);
    expect(extractReferencedByProjects(text)).toEqual(['fortemi/fortemi']);
  });

  it('strips trailing parentheticals', () => {
    const text = SECTION(['| research-papers (warehouse) | x | 2026-01-01 |']);
    expect(extractReferencedByProjects(text)).toEqual(['research-papers']);
  });

  it('filters non-project noise (comments, placeholders, REF-refs, cluster phrases, long strings)', () => {
    const text = SECTION([
      '| <!-- project link --> | x | y |',
      '| TBD | x | y |',
      '| _(none yet)_ | x | y |',
      '| (induction) | x | y |',
      '| REF-183 | x | y |',
      '| Long-context evaluation cluster (REF-571 to REF-578) | x | y |',
      '| ai-writing-guide | real | 2026-01-01 |',
    ]);
    expect(extractReferencedByProjects(text)).toEqual(['ai-writing-guide']);
  });

  it('returns empty when there is no Referenced By section', () => {
    expect(extractReferencedByProjects('# REF-002\n\n## Summary\nno referenced-by here\n')).toEqual([]);
  });

  it('de-duplicates repeated projects', () => {
    const text = SECTION([
      '| aiwg | a | 2026-01-01 |',
      '| aiwg | b | 2026-02-01 |',
    ]);
    expect(extractReferencedByProjects(text)).toEqual(['aiwg']);
  });
});

describe('by-project / project-impact views registered (#1495)', () => {
  it('both views are in SUPPORTED_VIEWS and render without throwing', () => {
    expect(SUPPORTED_VIEWS).toContain('by-project');
    expect(SUPPORTED_VIEWS).toContain('project-impact');
    const ctx = { records: [], corpusRoot: '/x', generated: '2026-01-01', checksum: 'abc' };
    expect(() => renderView('by-project', ctx)).not.toThrow();
    const impact = renderView('project-impact', ctx);
    expect(impact).toContain('Cross-Project Impact');
    expect(impact).toContain('| Rank | REF | Projects | Consuming projects |');
  });
});
