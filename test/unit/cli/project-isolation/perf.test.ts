// Performance gate for project-signal detection (NFR-PERF-01). Detection
// must complete in <50ms in a project root. The test runs 50 iterations
// and asserts the median; this keeps the bound honest while tolerating
// the occasional CI runner hiccup.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { detectProjectSignal } from '../../../../src/cli/project-isolation/detect.js';

describe('detectProjectSignal performance (NFR-PERF-01)', () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'aiwg-perf-'));
    // Realistic project root: .git + package.json present.
    mkdirSync(join(root, '.git'));
    writeFileSync(join(root, 'package.json'), '{}');
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('median detection completes in <50ms (warm cache, project root cwd)', () => {
    // Warm-up
    for (let i = 0; i < 5; i++) detectProjectSignal(root);

    const samples: number[] = [];
    for (let i = 0; i < 50; i++) {
      const t0 = performance.now();
      detectProjectSignal(root);
      samples.push(performance.now() - t0);
    }
    samples.sort((a, b) => a - b);
    const median = samples[Math.floor(samples.length / 2)] ?? 0;
    expect(median).toBeLessThan(50);
  });
});
