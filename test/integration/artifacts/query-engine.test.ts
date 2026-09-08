/**
 * Bounded artifact query integration: real documents, index builder and local
 * query engine. Full-corpus discovery qualification runs in ci:fortemi-index.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { buildIndex } from '../../../src/artifacts/index-builder.js';
import { queryIndex } from '../../../src/artifacts/query-engine.js';

// Representative documents are deliberately small and self-contained. The
// authentication title must outrank the security document's summary-only match.
const DOCUMENTS: Record<string, string> = {
  '.aiwg/requirements/UC-001-authentication.md': `---
title: Authentication
tags: [authentication, test]
---
# Authentication

Authentication test scenarios verify that valid credentials establish a session.

## Acceptance criteria

- Valid credentials grant access.
- Invalid credentials are rejected without creating a session.
`,
  '.aiwg/requirements/UC-002-report-export.md': `---
title: Report export
tags: [test]
---
# Report export

A test verifies that exported reports contain the requested date range.

## Acceptance criteria

- Exported rows match the selected reporting interval.
`,
  '.aiwg/security/SEC-001-session-policy.md': `---
title: Session policy
tags: [test]
---
# Session policy

Authentication sessions expire after inactivity; test renewal and revocation.

## Controls

- Expired sessions cannot access protected resources.
`,
  '.aiwg/architecture/ADR-001-testing.md': `---
title: Test architecture
tags: [test]
---
# Test architecture

Use isolated fixtures to test the artifact index without external services.

## Decision

Each workspace owns its documents and generated index.
`,
};

const ARTIFACT_ENV_KEYS = [
  'AIWG_ARTIFACTS_PATH',
  'AIWG_PROJECT_ARTIFACTS_PATH',
  'AIWG_PROJECT_AIWG_DIR',
] as const;

async function withArtifactEnvCleared<T>(callback: () => Promise<T>): Promise<T> {
  const previous = Object.fromEntries(
    ARTIFACT_ENV_KEYS.map((key) => [key, process.env[key]]),
  ) as Record<(typeof ARTIFACT_ENV_KEYS)[number], string | undefined>;
  for (const key of ARTIFACT_ENV_KEYS) delete process.env[key];
  try {
    return await callback();
  } finally {
    for (const key of ARTIFACT_ENV_KEYS) {
      const value = previous[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

describe('Artifact Query Engine (integration)', () => {
  let tmpDir: string;

  beforeAll(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aiwg-query-'));
    for (const [relativePath, content] of Object.entries(DOCUMENTS)) {
      const file = path.join(tmpDir, relativePath);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, content);
    }

    await withArtifactEnvCleared(async () => {
      await buildIndex(tmpDir, { force: true });
    });
  }, 30_000);

  afterAll(() => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  /**
   * Helper: capture JSON output from queryIndex
   */
  async function captureQuery(
    params: Parameters<typeof queryIndex>[1]
  ): Promise<{ results: Array<{ path: string; type: string; phase: string; score: number; title: string }>; total: number }> {
    const logs: string[] = [];
    const origLog = console.log;
    console.log = (...args: unknown[]) => logs.push(args.map(String).join(' '));
    try {
      await withArtifactEnvCleared(async () => {
        await queryIndex(tmpDir, params, { json: true, backend: 'local' });
      });
    } finally {
      console.log = origLog;
    }
    return JSON.parse(logs.join(''));
  }

  it('ranks the exact authentication title above a summary-only match', async () => {
    const result = await captureQuery({ text: 'authentication' });
    expect(result.total).toBe(2);
    expect(result.results.map(entry => entry.path)).toEqual([
      '.aiwg/requirements/UC-001-authentication.md',
      '.aiwg/security/SEC-001-session-policy.md',
    ]);
    expect(result.results[0].score).toBeGreaterThan(result.results[1].score);
    expect(result.results[1].score).toBeGreaterThan(0);
  });

  it('filters use cases and returns both known requirements', async () => {
    const result = await captureQuery({ type: 'use-case' });
    expect(result.total).toBe(2);
    expect(result.results.map(entry => entry.path).sort()).toEqual([
      '.aiwg/requirements/UC-001-authentication.md',
      '.aiwg/requirements/UC-002-report-export.md',
    ]);
    expect(result.results.map(entry => entry.type)).toEqual(['use-case', 'use-case']);
  });

  it('filters the security phase to its known policy artifact', async () => {
    const result = await captureQuery({ phase: 'security' });
    expect(result.total).toBe(1);
    expect(result.results).toEqual([
      expect.objectContaining({
        path: '.aiwg/security/SEC-001-session-policy.md',
        phase: 'security', title: 'Session policy',
      }),
    ]);
  });

  it('returns no matches for a term absent from the populated index', async () => {
    const populated = await captureQuery({});
    expect(populated.total).toBe(4);
    const result = await captureQuery({ text: 'xyzzy_zzqwkjhg_nonexistent_42' });
    expect(result.total).toBe(0);
    expect(result.results).toEqual([]);
  });

  it('limits a four-result query to the top three ranked artifacts', async () => {
    const all = await captureQuery({ text: 'test' });
    expect(all.total).toBe(4);
    expect(all.results).toHaveLength(4);
    const limited = await captureQuery({ text: 'test', limit: 3 });
    expect(limited.total).toBe(3);
    expect(limited.results).toEqual(all.results.slice(0, 3));
  });

  it('builds a searchable index containing exactly the four input artifacts', async () => {
    const startedAt = performance.now();
    const result = await captureQuery({});
    expect(result.total).toBe(4);
    expect(result.results.map(entry => entry.path).sort()).toEqual(Object.keys(DOCUMENTS).sort());
    expect(result.results.map(entry => entry.title).sort()).toEqual([
      'Authentication', 'Report export', 'Session policy', 'Test architecture',
    ]);
    // Supplementary bound for this four-document fixture, not corpus performance.
    expect(performance.now() - startedAt).toBeLessThan(5_000);
  });
});
