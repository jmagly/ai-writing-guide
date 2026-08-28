import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('storage conformance CI gate (#2191)', () => {
  it('runs the zero-dependency storage gate after the pinned SQLite backend is available', () => {
    const workflow = readFileSync(resolve('.gitea/workflows/ci.yml'), 'utf8');
    const install = workflow.indexOf('better-sqlite3@12.8.0');
    const gate = workflow.indexOf('npm run test:conformance:storage');

    expect(install).toBeGreaterThanOrEqual(0);
    expect(gate).toBeGreaterThan(install);
    expect(workflow).toContain('Run storage backend conformance gate (#2190/#2191)');
  });

  it('keeps live server suites outside the zero-dependency main-CI step', () => {
    const workflow = readFileSync(resolve('.gitea/workflows/ci.yml'), 'utf8');
    expect(workflow).not.toContain('npm run test:conformance:storage:server');
  });
});
