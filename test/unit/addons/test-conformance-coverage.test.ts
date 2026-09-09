import { describe, it, expect } from 'vitest';
// @ts-ignore Native addon runtime
import { normalizeCoverage } from '../../../agentic/code/addons/testing-quality/lib/coverage.mjs';

const opts = {
  format: 'canonical', root: '/project', provider: 'fixture', version: '1',
  inventory: { spec: { files: [{ path: 'src/a.js', isSource: true }, { path: 'src/b.js', isSource: true }, { path: 'test/a.test.js', isSource: false }] } },
};
const singleSource = { ...opts, inventory: { spec: { files: [{ path: 'src/a.js', isSource: true }] } } };
const file = (path: string, covered = 1, total = 2) => ({ path, metrics: { lines: { covered, total }, statements: { covered, total }, branches: { covered: 0, total: 1 }, functions: { covered: 1, total: 1 } } });
const loc = (line = 1) => ({ start: { line, column: 0 }, end: { line, column: 5 } });
const istanbulMap = () => ({
  'src/a.js': {
    path: 'src/a.js', statementMap: { 0: loc(), 1: loc(), 2: loc(2) }, fnMap: { 0: { decl: loc(), loc: loc() } },
    branchMap: { 0: { loc: loc(), locations: [loc(), loc()] } }, s: { 0: 0, 1: 1, 2: 0 }, f: { 0: 1 }, b: { 0: [1, 0] },
  },
});

describe('scoped coverage counters', () => {
  it('retains missing files and does not count extras toward source coverage', () => {
    const value = normalizeCoverage({ complete: true, files: [file('src/a.js'), file('vendor/c.js', 100, 100)] }, opts);
    expect(value.complete).toBe(false);
    expect(value.scope.missingFiles).toEqual(['src/b.js']);
    expect(value.scope.extraFiles).toEqual(['vendor/c.js']);
    expect(value.totals.lines).toEqual({ covered: 1, total: 2 });
  });
  it('combines counters within one source map and preserves zero branch hits', () => {
    const value = normalizeCoverage({ complete: true, files: [file('src/a.js'), file('/project/src/b.js', 2, 3)] }, opts);
    expect(value.complete).toBe(true);
    expect(value.errors).toEqual([]);
    expect(value.totals.lines).toEqual({ covered: 3, total: 5 });
    expect(value.totals.branches).toEqual({ covered: 0, total: 2 });
  });
  it.each([
    { name: 'escaped source path', raw: { complete: true, files: [file('src/a.js'), file('../outside.js')] }, code: 'INVALID_COVERAGE', message: 'Unsafe relative path: ../outside.js' },
    { name: 'impossible counters', raw: { complete: true, files: [file('src/a.js', 3, 2)] }, code: 'INVALID_COVERAGE', message: 'Invalid coverage numerator/denominator' },
    { name: 'duplicate source file', raw: { complete: true, files: [file('src/a.js'), file('src/a.js')] }, code: 'DUPLICATE_COVERAGE_FILE', message: 'src/a.js' },
    { name: 'percentage-only report', raw: { total: { lines: { pct: 100 } } }, code: 'INVALID_COVERAGE', message: 'Canonical coverage requires complete:true and files' },
    { name: 'empty report', raw: { complete: true, files: [] }, code: 'EMPTY_COVERAGE', message: 'No file-level coverage records' },
  ])('rejects $name with an attributable diagnostic', ({ raw, code, message }) => {
    const baseline = normalizeCoverage({ complete: true, files: [file('src/a.js')] }, singleSource);
    expect(baseline.complete).toBe(true);
    expect(baseline.errors).toEqual([]);
    const value = normalizeCoverage(raw, singleSource);
    expect(value.complete).toBe(false);
    expect(value.errors).toContainEqual({ code, message });
  });
  it('missing metric counters remain unknown', () => {
    const value = normalizeCoverage({ complete: true, files: [{ path: 'src/a.js', metrics: {} }, file('src/b.js')] }, opts);
    expect(value.scope.missingFiles).toEqual([]);
    expect(value.errors).toEqual([]);
    expect(value.totals.lines).toBeNull();
    expect(value.totals.statements).toBeNull();
    expect(value.totals.functions).toBeNull();
    expect(value.totals.branches).toBeNull();
  });
  it('derives unique lines and separate branch arms from Istanbul maps', () => {
    const value = normalizeCoverage(istanbulMap(), { ...singleSource, format: 'istanbul' });
    expect(value.complete).toBe(true);
    expect(value.errors).toEqual([]);
    expect(value.totals.lines).toEqual({ covered: 1, total: 2 });
    expect(value.totals.statements).toEqual({ covered: 1, total: 3 });
    expect(value.totals.branches).toEqual({ covered: 1, total: 2 });
    expect(value.totals.functions).toEqual({ covered: 1, total: 1 });
  });
  it.each([
    { name: 'Istanbul source identity mismatch', mutate: (map: ReturnType<typeof istanbulMap>) => { map['src/a.js'].path = 'src/b.js'; }, message: 'Istanbul map key and source path disagree' },
    { name: 'invalid Istanbul function location', mutate: (map: ReturnType<typeof istanbulMap>) => { map['src/a.js'].fnMap[0].loc.end.column = -1; }, message: 'Invalid Istanbul source location' },
    { name: 'Istanbul branch arm count mismatch', mutate: (map: ReturnType<typeof istanbulMap>) => { map['src/a.js'].b[0] = [1]; }, message: 'Istanbul branch locations and hits disagree' },
  ])('rejects $name with an attributable diagnostic', ({ mutate, message }) => {
    const options = { ...singleSource, format: 'istanbul' };
    const map = istanbulMap();
    expect(normalizeCoverage(map, options).complete).toBe(true);
    mutate(map);
    const value = normalizeCoverage(map, options);
    expect(value.complete).toBe(false);
    expect(value.errors).toContainEqual({ code: 'INVALID_COVERAGE', message });
  });
});
