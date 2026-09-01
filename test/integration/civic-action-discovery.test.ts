import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { cpSync, mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildIndex } from '../../src/artifacts/index-builder.js';
import { discoverCapability } from '../../src/artifacts/query-engine.js';

const REPO_ROOT = path.resolve(import.meta.dirname, '../..');

describe('civic-action discovery from an isolated packaged corpus', () => {
  let temporaryRoot: string;
  let corpusRoot: string;
  let originalAiwgRoot: string | undefined;
  let originalXdgDataHome: string | undefined;

  beforeAll(async () => {
    temporaryRoot = mkdtempSync(path.join(os.tmpdir(), 'aiwg-civic-discovery-'));
    corpusRoot = path.join(temporaryRoot, 'corpus');
    mkdirSync(corpusRoot, { recursive: true });
    cpSync(path.join(REPO_ROOT, 'agentic'), path.join(corpusRoot, 'agentic'), { recursive: true });
    originalAiwgRoot = process.env.AIWG_ROOT;
    originalXdgDataHome = process.env.XDG_DATA_HOME;
    process.env.AIWG_ROOT = corpusRoot;
    process.env.XDG_DATA_HOME = path.join(temporaryRoot, 'xdg-data');

    const originalLog = console.log;
    console.log = () => undefined;
    try {
      await buildIndex(corpusRoot, { graph: 'framework', force: true, explicit: true });
    } finally {
      console.log = originalLog;
    }
  }, 60_000);

  afterAll(() => {
    if (originalAiwgRoot === undefined) delete process.env.AIWG_ROOT;
    else process.env.AIWG_ROOT = originalAiwgRoot;
    if (originalXdgDataHome === undefined) delete process.env.XDG_DATA_HOME;
    else process.env.XDG_DATA_HOME = originalXdgDataHome;
    rmSync(temporaryRoot, { recursive: true, force: true });
  });

  async function discover(phrase: string, typeFilter?: string[]) {
    const captured: string[] = [];
    const originalLog = console.log;
    console.log = (...args: unknown[]) => captured.push(args.map(String).join(' '));
    try {
      await discoverCapability(corpusRoot, {
        phrase,
        graph: 'framework',
        backend: 'local',
        json: true,
        limit: 10,
        typeFilter,
      });
    } finally {
      console.log = originalLog;
    }
    return JSON.parse(captured.join(''));
  }

  it('ranks the public-records skill for the documented discovery phrase', async () => {
    const result = await discover('plan a public records request');
    expect(result.results[0]?.path).toContain(
      'agentic/code/addons/civic-action/skills/public-records-plan/SKILL.md',
    );
    const flows = await discover('public records workflow', ['flow']);
    expect(flows.results.some((item: { path: string }) =>
      item.path.includes('agentic/code/addons/civic-action/flows/public-records.yaml'))).toBe(true);
  });
});
