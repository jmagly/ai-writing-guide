import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  buildWorkspaceContextPack,
  CanonicalContextRepository,
  MemoryIntakeCoordinator,
} from '../../src/memory/index.js';
import {
  FilesystemDerivedOutputIndex,
  FilesystemOutputRegistrationStore,
  OutputRegistrationCoordinator,
  sha256,
} from '../../src/sessions/index.js';
import { loadConfig, runLineMemory } from '../../agentic/code/addons/line-memory/commands/line-memory.mjs';

const repositoryRoot = path.resolve(__dirname, '../..');
const fixture = JSON.parse(readFileSync(
  path.join(repositoryRoot, 'test/fixtures/compound-memory/three-session.json'),
  'utf8',
));
let root: string | null = null;

afterEach(() => {
  vi.restoreAllMocks();
  if (root) rmSync(root, { recursive: true, force: true });
  root = null;
});

describe('three-session compound-memory conformance', () => {
  it('compounds reviewed knowledge without unbounded context growth', async () => {
    root = mkdtempSync(path.join(tmpdir(), 'aiwg-compound-conformance-'));
    vi.spyOn(console, 'log').mockImplementation(() => {});

    // Session 1: preserve raw evidence, derive linked wiki knowledge, review a short fact.
    const sourcePath = path.join(root, fixture.source.path);
    mkdirSync(path.dirname(sourcePath), { recursive: true });
    writeFileSync(sourcePath, fixture.source.content);
    const intake = new MemoryIntakeCoordinator(root);
    const intakePreview = intake.preview(fixture.source.path);
    const intakeReceipt = intake.confirm(fixture.source.path, intakePreview.operationId);
    expect(readFileSync(sourcePath, 'utf8')).toBe(fixture.source.content);
    expect(readFileSync(path.join(root, intakeReceipt.rawLocator), 'utf8')).toBe(fixture.source.content);

    const wikiPath = path.join(root, fixture.wiki.path);
    mkdirSync(path.dirname(wikiPath), { recursive: true });
    writeFileSync(wikiPath, fixture.wiki.content);
    for (const fact of fixture.lineFacts) {
      const result = await runLineMemory('import', [
        fact,
        '--source-ref', intakeReceipt.rawLocator,
        '--reviewer', 'fixture-maintainer',
        '--reason', 'three-session conformance fixture',
        '--confirm', '--json',
      ], root);
      expect(result.exitCode).toBe(0);
    }

    // Session 2: retrieve both tiers under a hard budget and register derived output.
    const packs = Array.from({ length: 20 }, () => buildWorkspaceContextPack(
      root!, fixture.task, { budget: { totalCharacters: fixture.budget } },
    ));
    const pack = packs[0];
    expect(pack.items.map(item => item.tier)).toEqual(expect.arrayContaining(['line', 'wiki']));
    expect(pack.used.totalCharacters).toBeLessThanOrEqual(fixture.budget);
    expect(pack.items.some(item => item.text.includes('Unrelated visual'))).toBe(false);
    const relevant = pack.items.filter(item => /sqlite|catalog|provenance|receipt/i.test(item.text)).length;
    const precision = relevant / pack.items.length;
    const recall = Math.min(1, relevant / fixture.expectedRelevant);
    expect(precision).toBeGreaterThanOrEqual(0.9);
    expect(recall).toBeGreaterThanOrEqual(0.9);
    const p95 = packs.map(item => item.metrics.elapsedMs).sort((a, b) => a - b)[18];
    expect(p95).toBeLessThan(250);

    mkdirSync(path.join(root, 'output/reports'), { recursive: true });
    writeFileSync(path.join(root, 'output/reports/catalog.md'), '# Catalog report\n');
    const outputStore = new FilesystemOutputRegistrationStore(root);
    const outputCoordinator = new OutputRegistrationCoordinator(
      root,
      outputStore,
      new FilesystemDerivedOutputIndex(root),
    );
    const outputRequest = {
      outputPath: 'output/reports/catalog.md',
      mediaType: 'text/markdown',
      contextPack: {
        id: pack.id,
        digest: sha256(JSON.stringify(pack)),
        sources: pack.items.map(item => ({
          kind: item.tier === 'line' ? 'note' as const : 'file' as const,
          ref: item.locator,
          digest: item.digest,
          span: null,
        })),
      },
      supersedes: [],
      conflictsWith: [],
    };
    const outputPreview = outputCoordinator.preview(outputRequest);
    const outputReceipt = await outputCoordinator.register({
      request: outputRequest,
      operationId: outputPreview.operationId,
    });
    expect(outputReceipt.contextPackId).toBe(pack.id);

    // Session 3: review a durable context update and supersede a stale short fact.
    const canonical = new CanonicalContextRepository(root);
    const proposal = {
      target: 'decision' as const,
      key: 'session.catalog',
      value: 'SQLite is authoritative for imported sessions.',
      sourceRef: outputReceipt.outputLocator,
      sourceDigest: outputReceipt.outputDigest,
      reviewer: 'fixture-maintainer',
      reason: 'reviewed after derived report',
      scope: 'project',
      classification: 'internal' as const,
      reviewAt: null,
      expiresAt: null,
    };
    const contextPreview = canonical.previewUpsert(proposal);
    const contextReceipt = canonical.confirm({ preview: contextPreview, proposal });
    expect(contextReceipt.revision).toBe(1);

    const metadata = JSON.parse(readFileSync(
      path.join(root, '.aiwg/memory/line-memory.meta.json'),
      'utf8',
    ));
    const unrelated = Object.values(metadata.entries)
      .find((entry: any) => entry.value === fixture.lineFacts[1]) as any;
    const config = await loadConfig(root, { warn: false });
    const disposition = await runLineMemory('supersede', [
      unrelated.id,
      '--by', `canonical-context:${contextReceipt.entryIds[0]}`,
      '--reviewer', 'fixture-maintainer',
      '--reason', 'removed unrelated context from active facts',
      '--confirm', '--json',
    ], root);
    expect(disposition.exitCode).toBe(0);
    const finalPack = buildWorkspaceContextPack(root, fixture.task, {
      budget: { totalCharacters: fixture.budget },
    });
    expect(finalPack.id).toBe(pack.id);
    expect(finalPack.used.totalCharacters).toBeLessThanOrEqual(fixture.budget);
  });
});
