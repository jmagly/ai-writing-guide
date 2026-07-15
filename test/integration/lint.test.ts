/**
 * Lint Integration Tests
 *
 * End-to-end tests that run the lint system against a realistic
 * fixture corpus with the research-complete ruleset.
 *
 * @source @src/lint/cli.ts
 * @source @agentic/code/frameworks/research-complete/lint/
 * @issue #810, #811
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { resolve } from 'path';
import { discoverRulesets, loadRuleset } from '../../src/lint/loader.js';
import { runLint } from '../../src/lint/runner.js';
import { formatResult } from '../../src/lint/reporters.js';

// ── Fixture corpus ───────────────────────────────────────────────────
const FIXTURE_DIR = join(tmpdir(), `aiwg-lint-integration-${Date.now()}`);
const FINDINGS_DIR = join(FIXTURE_DIR, 'findings');
const REFERENCES_DIR = join(FIXTURE_DIR, 'documentation', 'references');

// Resolve the actual research-complete lint dir from this repo
const PROJECT_ROOT = resolve(import.meta.dirname || __dirname, '../..');
const RESEARCH_LINT_DIR = join(PROJECT_ROOT, 'agentic/code/frameworks/research-complete/lint');

beforeAll(() => {
  mkdirSync(FINDINGS_DIR, { recursive: true });
  mkdirSync(REFERENCES_DIR, { recursive: true });

  // Good REF note — all frontmatter present
  writeFileSync(join(FINDINGS_DIR, 'REF-001.md'), `---
title: Multi-Agent Orchestration Patterns
authors: Smith, J. and Jones, A.
year: 2024
publication_type: academic-paper
tags: [multi-agent, orchestration]
status: documented
grade_rating: High
documented_date: 2024-06-15
acquisition_method: automated
---

# Multi-Agent Orchestration Patterns

This paper examines orchestration patterns for multi-agent LLM systems.

## Key Findings

- Agent coordination improves task completion by 30-45%
- See also REF-002 for related benchmarks
`);

  // Good REF note with cross-reference back
  writeFileSync(join(FINDINGS_DIR, 'REF-002.md'), `---
title: Agent Coordination Benchmarks
authors: Lee, K.
year: 2023
publication_type: academic-paper
tags: [benchmarks, multi-agent]
status: quality-assessed
grade_rating: Moderate
documented_date: 2023-11-20
acquisition_method: manual
---

# Agent Coordination Benchmarks

Benchmarks for multi-agent coordination. Related to REF-001.
`);

  // Bad REF note — missing frontmatter fields
  writeFileSync(join(FINDINGS_DIR, 'REF-003.md'), `---
title: Incomplete Paper
---

# Incomplete Paper

This note is missing required frontmatter fields.
`);

  // Bad REF note — non-standard naming
  writeFileSync(join(FINDINGS_DIR, 'REF-004-extra-slug.md'), `---
title: Slugged Paper
authors: Doe, J.
year: 2024
publication_type: preprint
tags: [testing]
status: pending
---

# Slugged Paper

This file name has an extra slug that doesn't match REF-NNN format.
`);

  // REF note with broken reference
  writeFileSync(join(FINDINGS_DIR, 'REF-005.md'), `---
title: Paper With Broken Ref
authors: Test, A.
year: 2024
publication_type: documentation
tags: [references]
status: documented
grade_rating: Low
documented_date: 2024-03-01
acquisition_method: automated
---

# Paper With Broken Ref

This references REF-999 which does not exist.
`);

  // REF note with invalid status
  writeFileSync(join(FINDINGS_DIR, 'REF-006.md'), `---
title: Invalid Status Paper
authors: Bug, B.
year: 2025
publication_type: academic-paper
tags: [testing]
status: unknown-status
grade_rating: Moderate
documented_date: 2025-01-15
acquisition_method: automated
---

# Invalid Status Paper
`);

  // Canonical warehouse layout — slugged filenames and four-digit IDs
  writeFileSync(join(REFERENCES_DIR, 'REF-1000-grammar-specification.md'), '# Grammar\n');
  writeFileSync(join(REFERENCES_DIR, 'REF-1001-parser.md'), 'Builds on REF-1000.\n');
});

afterAll(() => {
  rmSync(FIXTURE_DIR, { recursive: true, force: true });
});

describe('research-complete ruleset discovery', () => {
  it('loads the research ruleset from the actual framework', async () => {
    expect(existsSync(RESEARCH_LINT_DIR)).toBe(true);

    const ruleset = await loadRuleset(RESEARCH_LINT_DIR, 'research-complete');
    expect(ruleset).not.toBeNull();
    expect(ruleset!.id).toBe('research');
    expect(ruleset!.rules.length).toBeGreaterThanOrEqual(10);
  });

  it('discovers the research ruleset via discoverRulesets', async () => {
    const rulesets = await discoverRulesets(FIXTURE_DIR, PROJECT_ROOT);
    expect(rulesets.length).toBeGreaterThanOrEqual(1);

    const research = rulesets.find(r => r.id === 'research');
    expect(research).toBeDefined();
    expect(research!.framework).toBe('research-complete');
  });
});

describe('end-to-end lint run against fixture corpus', () => {
  it('detects missing frontmatter in REF-003', async () => {
    const ruleset = await loadRuleset(RESEARCH_LINT_DIR, 'research-complete');
    const result = await runLint(FIXTURE_DIR, [ruleset!]);

    const ref003Diags = result.diagnostics.filter(d => d.file.includes('REF-003'));
    expect(ref003Diags.length).toBeGreaterThan(0);

    // Should flag missing authors, year, publication_type, tags, status
    const missingFields = ref003Diags
      .filter(d => d.message.includes('Missing required frontmatter'))
      .map(d => d.message);
    expect(missingFields.some(m => m.includes('authors'))).toBe(true);
    expect(missingFields.some(m => m.includes('year'))).toBe(true);
    expect(missingFields.some(m => m.includes('publication_type'))).toBe(true);
    expect(missingFields.some(m => m.includes('tags'))).toBe(true);
    expect(missingFields.some(m => m.includes('status'))).toBe(true);
  });

  it('detects non-standard file naming in REF-004-extra-slug', async () => {
    const ruleset = await loadRuleset(RESEARCH_LINT_DIR, 'research-complete');
    const result = await runLint(FIXTURE_DIR, [ruleset!]);

    const formatDiags = result.diagnostics.filter(
      d => d.file.includes('REF-004-extra-slug') && d.ruleId === 'research/ref-id-format'
    );
    expect(formatDiags.length).toBeGreaterThanOrEqual(1);
    expect(formatDiags[0].message).toContain('does not match');
  });

  it('detects broken REF-999 reference in REF-005', async () => {
    const ruleset = await loadRuleset(RESEARCH_LINT_DIR, 'research-complete');
    const result = await runLint(FIXTURE_DIR, [ruleset!]);

    const refDiags = result.diagnostics.filter(
      d => d.file.includes('REF-005') && d.ruleId === 'research/citation-resolves'
    );
    expect(refDiags.length).toBeGreaterThanOrEqual(1);
    expect(refDiags[0].message).toContain('REF-999');
  });

  it('resolves slugged four-digit references in a non-findings layout', async () => {
    const ruleset = await loadRuleset(RESEARCH_LINT_DIR, 'research-complete');
    const result = await runLint(FIXTURE_DIR, [ruleset!]);

    const refDiags = result.diagnostics.filter(
      d => d.file.includes('REF-1001-parser') && d.ruleId === 'research/citation-resolves'
    );
    expect(refDiags).toHaveLength(0);
  });

  it('detects invalid status value in REF-006', async () => {
    const ruleset = await loadRuleset(RESEARCH_LINT_DIR, 'research-complete');
    const result = await runLint(FIXTURE_DIR, [ruleset!]);

    const statusDiags = result.diagnostics.filter(
      d => d.file.includes('REF-006') && d.ruleId === 'research/ref-frontmatter'
    );
    expect(statusDiags.length).toBeGreaterThanOrEqual(1);
    expect(statusDiags[0].message).toContain('unknown-status');
  });

  it('produces no errors for clean REF-001 and REF-002', async () => {
    const ruleset = await loadRuleset(RESEARCH_LINT_DIR, 'research-complete');
    const result = await runLint(FIXTURE_DIR, [ruleset!]);

    const ref001Errors = result.diagnostics.filter(
      d => d.file.includes('REF-001.md') && d.severity === 'error'
    );
    const ref002Errors = result.diagnostics.filter(
      d => d.file.includes('REF-002.md') && d.severity === 'error'
    );
    expect(ref001Errors).toHaveLength(0);
    expect(ref002Errors).toHaveLength(0);
  });

  it('computes correct summary statistics', async () => {
    const ruleset = await loadRuleset(RESEARCH_LINT_DIR, 'research-complete');
    const result = await runLint(FIXTURE_DIR, [ruleset!]);

    expect(result.summary.filesChecked).toBeGreaterThanOrEqual(6);
    expect(result.summary.errors).toBeGreaterThan(0);
    expect(result.summary.passed).toBe(false);
    expect(result.rulesets).toContain('research');
  });

  it('marks result as passed with failOn=warn when only info diagnostics', async () => {
    // Create a temp dir with only clean files
    const cleanDir = join(tmpdir(), `aiwg-lint-clean-${Date.now()}`);
    const cleanFindings = join(cleanDir, 'findings');
    mkdirSync(cleanFindings, { recursive: true });

    writeFileSync(join(cleanFindings, 'REF-099.md'), `---
title: Perfect Paper
authors: Author, A.
year: 2024
publication_type: academic-paper
tags: [perfect]
status: documented
grade_rating: High
documented_date: 2024-01-01
acquisition_method: automated
---
# Perfect Paper
`);

    const ruleset = await loadRuleset(RESEARCH_LINT_DIR, 'research-complete');
    const result = await runLint(cleanDir, [ruleset!], { failOn: 'error' });

    expect(result.summary.errors).toBe(0);
    expect(result.summary.passed).toBe(true);

    rmSync(cleanDir, { recursive: true, force: true });
  });
});

describe('output formatting integration', () => {
  it('produces valid JSON output', async () => {
    const ruleset = await loadRuleset(RESEARCH_LINT_DIR, 'research-complete');
    const result = await runLint(FIXTURE_DIR, [ruleset!]);
    const json = formatResult(result, 'json');

    const parsed = JSON.parse(json);
    expect(parsed.target).toBe(FIXTURE_DIR);
    expect(parsed.diagnostics).toBeInstanceOf(Array);
    expect(parsed.summary.filesChecked).toBeGreaterThan(0);
  });

  it('produces summary output with counts', async () => {
    const ruleset = await loadRuleset(RESEARCH_LINT_DIR, 'research-complete');
    const result = await runLint(FIXTURE_DIR, [ruleset!]);
    const summary = formatResult(result, 'summary');

    expect(summary).toContain('files');
    expect(summary).toContain('error');
    expect(summary).toContain('FAIL');
  });
});
