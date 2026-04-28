/**
 * Discovery Module Tests
 *
 * Covers the five test patterns required by ADR-023 §Testing Strategy:
 *   1. Discovery + validation happy path
 *   2. Schema rejection
 *   3. Detection negative (no glob matches)
 *   4. Project-local override
 *   5. Multiple frameworks return in registry order
 *
 * @source @src/contributors/discover.ts
 * @architecture @.aiwg/architecture/decisions/ADR-023-contributor-discovery-convention.md
 * @issue #938
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { discoverContributors } from '../../../src/contributors/discover.js';

/**
 * Build a temporary AIWG layout with a framework root and a project root.
 *
 *   <tmp>/aiwg/agentic/code/frameworks/<id>/...
 *   <tmp>/project/.aiwg/frameworks/registry.json
 *   <tmp>/project/.aiwg/contributors/<kind>/*.md
 */
class Fixture {
  readonly tmpRoot: string;
  readonly frameworkRoot: string;
  readonly projectRoot: string;

  constructor() {
    this.tmpRoot = mkdtempSync(path.join(tmpdir(), 'aiwg-contributors-test-'));
    this.frameworkRoot = path.join(this.tmpRoot, 'aiwg');
    this.projectRoot = path.join(this.tmpRoot, 'project');
    mkdirSync(path.join(this.frameworkRoot, 'agentic', 'code', 'frameworks'), { recursive: true });
    mkdirSync(path.join(this.frameworkRoot, 'agentic', 'code', 'addons'), { recursive: true });
    mkdirSync(path.join(this.projectRoot, '.aiwg', 'frameworks'), { recursive: true });
  }

  cleanup() {
    rmSync(this.tmpRoot, { recursive: true, force: true });
  }

  writeRegistry(ids: string[]) {
    const registry = { version: '1.0.0', created: new Date().toISOString(), frameworks: ids.map(id => ({ id })) };
    writeFileSync(path.join(this.projectRoot, '.aiwg', 'frameworks', 'registry.json'), JSON.stringify(registry));
  }

  writeFrameworkContributor(opts: {
    framework: string;
    bucket?: 'frameworks' | 'addons';
    kind: string;
    body: string;
  }) {
    const bucket = opts.bucket ?? 'frameworks';
    const dir = path.join(this.frameworkRoot, 'agentic', 'code', bucket, opts.framework, opts.kind);
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, 'contributor.md'), opts.body);
  }

  writeProjectFile(relPath: string, body: string) {
    const full = path.join(this.projectRoot, relPath);
    mkdirSync(path.dirname(full), { recursive: true });
    writeFileSync(full, body);
  }

  writeProjectLocalContributor(kind: string, name: string, body: string) {
    const dir = path.join(this.projectRoot, '.aiwg', 'contributors', kind);
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, name), body);
  }
}

const validStatusContributor = (domain: string, glob: string[]): string => `---
kind: status
domain: ${domain}
description: Reports state for ${domain}
detect:
  glob:
${glob.map(g => `    - "${g}"`).join('\n')}
  minCount: 1
---

# ${domain} status contributor body
`;

describe('discoverContributors — kind: status', () => {
  let fx: Fixture;

  beforeEach(() => {
    fx = new Fixture();
  });

  afterEach(() => {
    fx.cleanup();
  });

  /**
   * Pattern 1: discovery + validation happy path.
   *
   * One framework ships a valid contributor; project has matching files;
   * the record comes back with frontmatter intact and origin stamped.
   */
  it('returns a valid contributor with origin stamped (happy path)', async () => {
    fx.writeRegistry(['sdlc-complete']);
    fx.writeFrameworkContributor({
      framework: 'sdlc-complete',
      kind: 'status',
      body: validStatusContributor('SDLC', ['.aiwg/requirements/*.md']),
    });
    fx.writeProjectFile('.aiwg/requirements/UC-001.md', '# UC-001');

    const result = await discoverContributors('status', {
      frameworkRoot: fx.frameworkRoot,
      projectRoot: fx.projectRoot,
    });

    expect(result.records).toHaveLength(1);
    expect(result.skipped).toHaveLength(0);
    const r = result.records[0];
    expect(r.origin).toBe('sdlc-complete');
    expect(r.data.kind).toBe('status');
    expect(r.data.domain).toBe('SDLC');
    expect(r.body).toContain('SDLC status contributor body');
  });

  /**
   * Pattern 2: schema rejection.
   *
   * A contributor with malformed frontmatter (missing required field) is
   * skipped with reason `schema-violation` — discovery does not abort.
   * A second valid contributor still appears in the records.
   */
  it('skips a schema-violating contributor without aborting discovery', async () => {
    fx.writeRegistry(['bad-framework', 'good-framework']);
    fx.writeFrameworkContributor({
      framework: 'bad-framework',
      kind: 'status',
      // Missing required `domain` field.
      body: `---
kind: status
description: malformed
detect:
  glob:
    - "**/*"
---
`,
    });
    fx.writeFrameworkContributor({
      framework: 'good-framework',
      kind: 'status',
      body: validStatusContributor('Good', ['**/*']),
    });
    // Detection target so good-framework's globs match.
    fx.writeProjectFile('marker.md', 'present');

    const result = await discoverContributors('status', {
      frameworkRoot: fx.frameworkRoot,
      projectRoot: fx.projectRoot,
    });

    expect(result.records).toHaveLength(1);
    expect(result.records[0].origin).toBe('good-framework');
    expect(result.skipped).toHaveLength(1);
    expect(result.skipped[0].origin).toBe('bad-framework');
    expect(result.skipped[0].reason).toBe('schema-violation');
    // Surface the missing-field message so debugging from logs is feasible.
    expect(result.skipped[0].message).toMatch(/domain/);
  });

  /**
   * Pattern 3: detection negative.
   *
   * The contributor is valid but its globs match no files — the contributor
   * is silently filtered out (origin: detection-no-match) so an installed-
   * but-unused framework does not pollute the report.
   */
  it('filters out a contributor whose globs match nothing', async () => {
    fx.writeRegistry(['unused-framework']);
    fx.writeFrameworkContributor({
      framework: 'unused-framework',
      kind: 'status',
      body: validStatusContributor('Unused', ['this/glob/will/not/match/*.xyz']),
    });

    const result = await discoverContributors('status', {
      frameworkRoot: fx.frameworkRoot,
      projectRoot: fx.projectRoot,
    });

    expect(result.records).toHaveLength(0);
    expect(result.skipped).toHaveLength(1);
    expect(result.skipped[0].reason).toBe('detection-no-match');
  });

  /**
   * Pattern 4: project-local override.
   *
   * A contributor at `.aiwg/contributors/status/local.md` is discovered with
   * origin `project-local`, in addition to any framework-shipped contributors.
   */
  it('discovers project-local contributors with origin: project-local', async () => {
    fx.writeRegistry([]);
    fx.writeProjectLocalContributor(
      'status',
      'custom.md',
      validStatusContributor('Project-custom', ['*.md'])
    );
    fx.writeProjectFile('marker.md', 'present');

    const result = await discoverContributors('status', {
      frameworkRoot: fx.frameworkRoot,
      projectRoot: fx.projectRoot,
    });

    expect(result.records).toHaveLength(1);
    expect(result.records[0].origin).toBe('project-local');
    expect(result.records[0].data.domain).toBe('Project-custom');
  });

  /**
   * Pattern 5: multiple frameworks return in registry order.
   *
   * Three frameworks each ship a contributor and have matching files; the
   * records come back in the same order as the registry. Project-local
   * contributors come last per ADR-023 §Discovery Algorithm.
   */
  it('preserves registry order, with project-local appearing last', async () => {
    fx.writeRegistry(['alpha', 'beta', 'gamma']);
    for (const id of ['alpha', 'beta', 'gamma']) {
      fx.writeFrameworkContributor({
        framework: id,
        kind: 'status',
        body: validStatusContributor(id, ['marker.md']),
      });
    }
    fx.writeProjectLocalContributor(
      'status',
      'local.md',
      validStatusContributor('local-domain', ['marker.md'])
    );
    fx.writeProjectFile('marker.md', 'present');

    const result = await discoverContributors('status', {
      frameworkRoot: fx.frameworkRoot,
      projectRoot: fx.projectRoot,
    });

    expect(result.records.map(r => r.origin)).toEqual(['alpha', 'beta', 'gamma', 'project-local']);
  });
});

describe('discoverContributors — kind resolution edge cases', () => {
  let fx: Fixture;

  beforeEach(() => {
    fx = new Fixture();
  });

  afterEach(() => {
    fx.cleanup();
  });

  it('resolves an addon contributor (not just framework)', async () => {
    fx.writeRegistry(['my-addon']);
    fx.writeFrameworkContributor({
      framework: 'my-addon',
      bucket: 'addons',
      kind: 'status',
      body: validStatusContributor('Addon-domain', ['*.md']),
    });
    fx.writeProjectFile('a.md', 'x');

    const result = await discoverContributors('status', {
      frameworkRoot: fx.frameworkRoot,
      projectRoot: fx.projectRoot,
    });

    expect(result.records).toHaveLength(1);
    expect(result.records[0].origin).toBe('my-addon');
  });

  it('returns empty result when registry is missing and no project-local', async () => {
    // No registry written, no project-local contributors.
    const result = await discoverContributors('status', {
      frameworkRoot: fx.frameworkRoot,
      projectRoot: fx.projectRoot,
    });

    expect(result.records).toHaveLength(0);
    expect(result.skipped).toHaveLength(0);
  });

  it('skips a framework whose registry id has no source path on disk', async () => {
    fx.writeRegistry(['nonexistent-framework']);
    // No source path created — discovery should silently skip rather than
    // emit a skip entry, because this is "framework not present" not
    // "contributor failed". No record, no skip.
    const result = await discoverContributors('status', {
      frameworkRoot: fx.frameworkRoot,
      projectRoot: fx.projectRoot,
    });

    expect(result.records).toHaveLength(0);
    expect(result.skipped).toHaveLength(0);
  });
});
