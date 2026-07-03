/**
 * Index-graph registry status + drift tests (#1624)
 *
 * @source @src/artifacts/index-status.ts
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { collectIndexStatus } from '../../../src/artifacts/index-status.js';
import { GRAPH_CONFIGS, BUILTIN_GRAPH_CONFIGS } from '../../../src/artifacts/types.js';

/** Reset the global registry to built-ins so user-graph tests don't leak. */
function resetRegistry(): void {
  for (const k of Object.keys(GRAPH_CONFIGS)) {
    if (!(k in BUILTIN_GRAPH_CONFIGS)) delete GRAPH_CONFIGS[k];
  }
}

describe('collectIndexStatus (#1624)', () => {
  let tmp: string;
  let prevXdg: string | undefined;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'aiwg-idxstatus-'));
    // Pin the framework (shared) graph's XDG location into the tmp dir so the
    // test never reads the developer's real ~/.local/share index.
    prevXdg = process.env.XDG_DATA_HOME;
    process.env.XDG_DATA_HOME = path.join(tmp, 'xdg');
    resetRegistry();
  });

  afterEach(() => {
    if (prevXdg === undefined) delete process.env.XDG_DATA_HOME;
    else process.env.XDG_DATA_HOME = prevXdg;
    resetRegistry();
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('enumerates the built-in graphs and flags missing durable indices', () => {
    const report = collectIndexStatus(tmp);
    const names = report.graphs.map((g) => g.name).sort();
    expect(names).toEqual(['codebase', 'framework', 'project', 'source']);
    // Nothing built in a fresh workspace.
    expect(report.summary.built).toBe(0);
    // project + codebase opt into default builds → flagged missing; framework
    // and source do not (defaultBuild:false) → not flagged.
    const byName = Object.fromEntries(report.graphs.map((g) => [g.name, g]));
    expect(byName.project.missing).toBe(true);
    expect(byName.codebase.missing).toBe(true);
    expect(byName.framework.missing).toBe(false);
    expect(byName.source.missing).toBe(false);
    expect(byName.project.origin).toBe('builtin');
  });

  it('reports a built graph with entry count and age', () => {
    const dir = path.join(tmp, '.aiwg', '.index', 'project');
    fs.mkdirSync(dir, { recursive: true });
    const builtAt = '2026-06-18T00:00:00.000Z';
    fs.writeFileSync(
      path.join(dir, 'metadata.json'),
      JSON.stringify({ version: '1', builtAt, buildTimeMs: 1, entries: { a: {}, b: {}, c: {} } }),
    );
    // now = builtAt + 5h
    const now = Date.parse(builtAt) + 5 * 3_600_000;
    const report = collectIndexStatus(tmp, now);
    const project = report.graphs.find((g) => g.name === 'project')!;
    expect(project.built).toBe(true);
    expect(project.entries).toBe(3);
    expect(project.ageHours).toBe(5);
    expect(project.missing).toBe(false);
    expect(report.summary.built).toBe(1);
  });

  it('collects a non-silent warning for a malformed operator graph def (#1624)', () => {
    const aiwgDir = path.join(tmp, '.aiwg');
    fs.mkdirSync(aiwgDir, { recursive: true });
    // `scanDirs` missing → parseGraphDef rejects → previously dropped silently.
    fs.writeFileSync(
      path.join(aiwgDir, 'aiwg.config'),
      JSON.stringify({ version: '1', index: { graphs: { broken: { extensions: ['.md'] } } } }),
    );
    const report = collectIndexStatus(tmp);
    expect(report.warnings.length).toBeGreaterThanOrEqual(1);
    const w = report.warnings.find((x) => x.graph === 'broken');
    expect(w).toBeTruthy();
    expect(w!.source).toBe('operator-config');
    expect(report.summary.warnings).toBeGreaterThanOrEqual(1);
  });

  it('surfaces a warning when aiwg.config itself is invalid JSON', () => {
    const aiwgDir = path.join(tmp, '.aiwg');
    fs.mkdirSync(aiwgDir, { recursive: true });
    fs.writeFileSync(path.join(aiwgDir, 'aiwg.config'), '{ not valid json ');
    const report = collectIndexStatus(tmp);
    expect(report.warnings.some((w) => w.source === 'operator-config')).toBe(true);
  });

  it('detects an orphan on-disk index dir that matches no registered graph', () => {
    const orphan = path.join(tmp, '.aiwg', '.index', 'ghost-graph');
    fs.mkdirSync(orphan, { recursive: true });
    const report = collectIndexStatus(tmp);
    expect(report.orphanIndexDirs.some((d) => d.endsWith('ghost-graph'))).toBe(true);
    expect(report.summary.orphans).toBeGreaterThanOrEqual(1);
  });

  it('does not flag the managed Fortemi Core cache namespace as an orphan', () => {
    const fortemiCache = path.join(tmp, '.aiwg', '.index', 'fortemi-core', 'project');
    fs.mkdirSync(fortemiCache, { recursive: true });
    const report = collectIndexStatus(tmp);
    expect(report.orphanIndexDirs.some((d) => d.includes('fortemi-core'))).toBe(false);
    expect(report.summary.orphans).toBe(0);
  });

  it('registers a valid operator graph and does not flag it as orphan', () => {
    const aiwgDir = path.join(tmp, '.aiwg');
    fs.mkdirSync(path.join(aiwgDir, '.index', 'refs'), { recursive: true });
    fs.writeFileSync(
      path.join(aiwgDir, 'aiwg.config'),
      JSON.stringify({ version: '1', index: { graphs: { refs: { scanDirs: ['docs/refs'] } } } }),
    );
    const report = collectIndexStatus(tmp);
    const refs = report.graphs.find((g) => g.name === 'refs');
    expect(refs).toBeTruthy();
    expect(refs!.origin).toBe('registered');
    // `refs` is registered, so its on-disk dir is NOT an orphan.
    expect(report.orphanIndexDirs.some((d) => d.endsWith('refs'))).toBe(false);
  });
});
