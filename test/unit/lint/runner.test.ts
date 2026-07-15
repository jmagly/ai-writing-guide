/**
 * Lint Runner Tests
 *
 * Tests for the core lint execution engine — check logic,
 * file matching, and diagnostic collection.
 *
 * @source @src/lint/runner.ts
 * @issue #810
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { runLint, autoDetectRulesets } from '../../../src/lint/runner.js';
import type { LintRule, LintRuleset } from '../../../src/lint/types.js';

const TEST_DIR = join(tmpdir(), `aiwg-lint-runner-test-${Date.now()}`);

function makeRuleset(rules: LintRule[]): LintRuleset {
  return {
    id: 'test',
    name: 'Test Ruleset',
    description: 'Test',
    framework: 'test-framework',
    version: '1.0.0',
    rules,
  };
}

beforeEach(() => {
  mkdirSync(join(TEST_DIR, 'findings'), { recursive: true });
});

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

describe('frontmatter-required check', () => {
  it('reports missing required fields', async () => {
    writeFileSync(join(TEST_DIR, 'findings', 'REF-001.md'), `---
title: Test Paper
---
# Content
`);

    const ruleset = makeRuleset([{
      id: 'test/fm-required',
      name: 'FM Required',
      description: 'Test',
      severity: 'error',
      appliesTo: { glob: 'findings/REF-*.md' },
      checks: [{
        type: 'frontmatter-required',
        fields: ['title', 'authors', 'year'],
      }],
    }]);

    const result = await runLint(TEST_DIR, [ruleset]);

    expect(result.summary.filesChecked).toBeGreaterThan(0);
    // title is present, authors and year are missing
    const fmDiags = result.diagnostics.filter(d => d.ruleId === 'test/fm-required');
    expect(fmDiags.length).toBe(2);
    expect(fmDiags.some(d => d.message.includes('authors'))).toBe(true);
    expect(fmDiags.some(d => d.message.includes('year'))).toBe(true);
  });

  it('passes when all fields are present', async () => {
    writeFileSync(join(TEST_DIR, 'findings', 'REF-002.md'), `---
title: Complete Paper
authors: Smith, J.
year: 2024
---
# Content
`);

    const ruleset = makeRuleset([{
      id: 'test/fm-complete',
      name: 'FM Complete',
      description: 'Test',
      severity: 'error',
      appliesTo: { glob: 'findings/REF-*.md' },
      checks: [{
        type: 'frontmatter-required',
        fields: ['title', 'authors', 'year'],
      }],
    }]);

    const result = await runLint(TEST_DIR, [ruleset]);
    const diags = result.diagnostics.filter(d => d.ruleId === 'test/fm-complete');
    expect(diags).toHaveLength(0);
  });
});

describe('frontmatter-format check', () => {
  it('reports field values that do not match pattern', async () => {
    writeFileSync(join(TEST_DIR, 'findings', 'REF-003.md'), `---
title: Paper
status: invalid-status
---
# Content
`);

    const ruleset = makeRuleset([{
      id: 'test/fm-format',
      name: 'FM Format',
      description: 'Test',
      severity: 'warn',
      appliesTo: { glob: 'findings/REF-*.md' },
      checks: [{
        type: 'frontmatter-format',
        field: 'status',
        pattern: '^(pending|documented|integrated)$',
      }],
    }]);

    const result = await runLint(TEST_DIR, [ruleset]);
    const diags = result.diagnostics.filter(d => d.ruleId === 'test/fm-format');
    expect(diags).toHaveLength(1);
    expect(diags[0].message).toContain('invalid-status');
  });

  it('passes when field value matches pattern', async () => {
    writeFileSync(join(TEST_DIR, 'findings', 'REF-004.md'), `---
title: Paper
status: documented
---
# Content
`);

    const ruleset = makeRuleset([{
      id: 'test/fm-format-ok',
      name: 'FM Format OK',
      description: 'Test',
      severity: 'warn',
      appliesTo: { glob: 'findings/REF-*.md' },
      checks: [{
        type: 'frontmatter-format',
        field: 'status',
        pattern: '^(pending|documented|integrated)$',
      }],
    }]);

    const result = await runLint(TEST_DIR, [ruleset]);
    const diags = result.diagnostics.filter(d => d.ruleId === 'test/fm-format-ok');
    expect(diags).toHaveLength(0);
  });
});

describe('id-unique check', () => {
  it('detects duplicate identifiers across flat files', async () => {
    // Create two sets of files — REF-010 appears in two directories,
    // both matching the glob via the ** pattern
    writeFileSync(join(TEST_DIR, 'findings', 'REF-010.md'), `---
title: First
---
`);

    // Create another file with the same REF ID but different name
    // to test the id-unique basename check
    mkdirSync(join(TEST_DIR, 'other'), { recursive: true });
    writeFileSync(join(TEST_DIR, 'other', 'REF-010.md'), `---
title: Duplicate
---
`);

    // Use a broad glob that matches both directories
    const ruleset = makeRuleset([{
      id: 'test/id-unique',
      name: 'ID Unique',
      description: 'Test',
      severity: 'error',
      appliesTo: { glob: '**/REF-*.md' },
      checks: [{ type: 'id-unique' }],
    }]);

    const result = await runLint(TEST_DIR, [ruleset]);
    const diags = result.diagnostics.filter(d => d.ruleId === 'test/id-unique');
    expect(diags.length).toBeGreaterThanOrEqual(1);
    expect(diags[0].message).toContain('Duplicate');
  });
});

describe('id-format check', () => {
  it('reports files with non-conforming names', async () => {
    writeFileSync(join(TEST_DIR, 'findings', 'REF-001-extra-slug.md'), `---
title: Slugged
---
`);

    const ruleset = makeRuleset([{
      id: 'test/id-format',
      name: 'ID Format',
      description: 'Test',
      severity: 'warn',
      appliesTo: { glob: 'findings/REF-*.md' },
      checks: [{
        type: 'id-format',
        pattern: '^REF-\\d{3}$',
      }],
    }]);

    const result = await runLint(TEST_DIR, [ruleset]);
    const diags = result.diagnostics.filter(d => d.ruleId === 'test/id-format');
    const slugDiag = diags.find(d => d.file.includes('REF-001-extra-slug'));
    expect(slugDiag).toBeDefined();
    expect(slugDiag!.message).toContain('does not match');
  });
});

describe('reference-resolves check', () => {
  function referenceRuleset(): LintRuleset {
    return makeRuleset([{
      id: 'test/citation-resolves',
      name: 'Citation Resolves',
      description: 'Test',
      severity: 'error',
      appliesTo: { glob: '**/*.md' },
      checks: [{ type: 'reference-resolves' }],
    }]);
  }

  it('resolves canonical slugged reference filenames', async () => {
    writeFileSync(join(TEST_DIR, 'findings', 'REF-089-recursive-language-models.md'), '# Paper\n');
    writeFileSync(join(TEST_DIR, 'findings', 'REF-090-synthesis.md'), 'See REF-089.\n');

    const result = await runLint(TEST_DIR, [referenceRuleset()]);

    expect(result.diagnostics).toHaveLength(0);
  });

  it('matches and resolves complete four-digit reference IDs', async () => {
    writeFileSync(join(TEST_DIR, 'findings', 'REF-1713-research-paper.md'), '# Paper\n');
    writeFileSync(join(TEST_DIR, 'findings', 'REF-1714-synthesis.md'), 'See REF-1713.\n');

    const result = await runLint(TEST_DIR, [referenceRuleset()]);

    expect(result.diagnostics).toHaveLength(0);
  });

  it('resolves references in non-findings layouts', async () => {
    const referencesDir = join(TEST_DIR, 'documentation', 'references');
    mkdirSync(referencesDir, { recursive: true });
    writeFileSync(join(referencesDir, 'REF-1000-grammar-specification.md'), '# Paper\n');
    writeFileSync(join(referencesDir, 'REF-1001-parser.md'), 'Builds on REF-1000.\n');

    const result = await runLint(TEST_DIR, [referenceRuleset()]);

    expect(result.diagnostics).toHaveLength(0);
  });

  it('still reports a complete unresolved four-digit reference ID', async () => {
    writeFileSync(join(TEST_DIR, 'findings', 'REF-1001-synthesis.md'), 'Missing REF-1713.\n');

    const result = await runLint(TEST_DIR, [referenceRuleset()]);

    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0].message).toContain("Reference 'REF-1713'");
  });

  it('does not treat citation or radar sidecars as reference documents', async () => {
    const citationsDir = join(TEST_DIR, 'documentation', 'citations');
    const radarDir = join(TEST_DIR, 'documentation', 'radar');
    mkdirSync(citationsDir, { recursive: true });
    mkdirSync(radarDir, { recursive: true });
    writeFileSync(join(citationsDir, 'REF-1713-citations.md'), '# Citation sidecar\n');
    writeFileSync(join(radarDir, 'REF-1713-radar.md'), '# Radar sidecar\n');
    writeFileSync(join(TEST_DIR, 'findings', 'REF-1001-synthesis.md'), 'Missing REF-1713.\n');

    const result = await runLint(TEST_DIR, [referenceRuleset()]);

    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0].message).toContain("Reference 'REF-1713'");
  });
});

describe('summary and pass/fail', () => {
  it('reports passed when no errors', async () => {
    writeFileSync(join(TEST_DIR, 'findings', 'REF-050.md'), `---
title: Clean
authors: Test
---
`);

    const ruleset = makeRuleset([{
      id: 'test/clean',
      name: 'Clean Check',
      description: 'Test',
      severity: 'info',
      appliesTo: { glob: 'findings/REF-*.md' },
      checks: [{
        type: 'frontmatter-required',
        fields: ['title'],
      }],
    }]);

    const result = await runLint(TEST_DIR, [ruleset], { failOn: 'error' });
    expect(result.summary.passed).toBe(true);
  });

  it('reports failed when errors exceed failOn threshold', async () => {
    writeFileSync(join(TEST_DIR, 'findings', 'REF-051.md'), `---
---
# No title
`);

    const ruleset = makeRuleset([{
      id: 'test/fail',
      name: 'Fail Check',
      description: 'Test',
      severity: 'error',
      appliesTo: { glob: 'findings/REF-*.md' },
      checks: [{
        type: 'frontmatter-required',
        fields: ['title'],
      }],
    }]);

    const result = await runLint(TEST_DIR, [ruleset], { failOn: 'error' });
    expect(result.summary.passed).toBe(false);
    expect(result.summary.errors).toBeGreaterThan(0);
  });

  it('fails on warnings when failOn is warn', async () => {
    writeFileSync(join(TEST_DIR, 'findings', 'REF-052.md'), `---
title: Has Title
status: bad
---
`);

    const ruleset = makeRuleset([{
      id: 'test/warn-fail',
      name: 'Warn Fail',
      description: 'Test',
      severity: 'warn',
      appliesTo: { glob: 'findings/REF-*.md' },
      checks: [{
        type: 'frontmatter-format',
        field: 'status',
        pattern: '^(open|closed)$',
      }],
    }]);

    const result = await runLint(TEST_DIR, [ruleset], { failOn: 'warn' });
    expect(result.summary.passed).toBe(false);
    expect(result.summary.warnings).toBeGreaterThan(0);
  });
});

describe('autoDetectRulesets', () => {
  const researchRuleset: LintRuleset = {
    id: 'research',
    name: 'Research',
    description: '',
    framework: 'research-complete',
    version: '1.0.0',
    rules: [],
  };

  const sdlcRuleset: LintRuleset = {
    id: 'sdlc',
    name: 'SDLC',
    description: '',
    framework: 'sdlc-complete',
    version: '1.0.0',
    rules: [],
  };

  it('detects research ruleset for research paths', () => {
    const result = autoDetectRulesets('.aiwg/research/', [researchRuleset, sdlcRuleset]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('research');
  });

  it('detects sdlc ruleset for requirements paths', () => {
    const result = autoDetectRulesets('.aiwg/requirements/', [researchRuleset, sdlcRuleset]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('sdlc');
  });

  it('returns all rulesets when path does not match any pattern', () => {
    const result = autoDetectRulesets('.aiwg/misc/', [researchRuleset, sdlcRuleset]);
    expect(result).toHaveLength(2);
  });
});
