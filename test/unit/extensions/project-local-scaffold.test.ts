/**
 * Unit tests for project-local scaffolding (#1050)
 *
 * @source @src/extensions/project-local-scaffold.ts
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { scaffoldProjectLocalBundle } from '../../../src/extensions/project-local-scaffold.js';
import { BundleManifestSchema } from '../../../src/extensions/manifest.js';

function tmp(): string {
  return mkdtempSync(join(tmpdir(), 'aiwg-pls-'));
}

describe('scaffoldProjectLocalBundle (#1050)', () => {
  let projectDir: string;

  beforeEach(() => { projectDir = tmp(); });
  afterEach(() => { rmSync(projectDir, { recursive: true, force: true }); });

  it('rejects invalid kebab-case names', async () => {
    await expect(
      scaffoldProjectLocalBundle({ type: 'extension', name: 'BadName', projectDir }),
    ).rejects.toThrow(/kebab-case/);
  });

  it('creates extension bundle with skill starter by default', async () => {
    const result = await scaffoldProjectLocalBundle({ type: 'extension', name: 'foo', projectDir });
    expect(result.alreadyExists).toBe(false);
    expect(result.bundlePath).toContain('.aiwg/extensions/foo');
    expect(result.filesCreated).toContain('manifest.json');
    expect(result.filesCreated).toContain('README.md');
    expect(result.filesCreated).toContain('skills/foo-skill/SKILL.md');

    const manifestRaw = readFileSync(join(result.bundlePath, 'manifest.json'), 'utf-8');
    const manifest = JSON.parse(manifestRaw);
    expect(manifest.id).toBe('foo');
    expect(manifest.type).toBe('extension');

    // Manifest must validate against the canonical schema
    const validated = BundleManifestSchema.safeParse(manifest);
    expect(validated.success).toBe(true);
  });

  it('creates addon bundle with addonConfig', async () => {
    const result = await scaffoldProjectLocalBundle({ type: 'addon', name: 'bar', projectDir });
    expect(result.bundlePath).toContain('.aiwg/addons/bar');
    const manifest = JSON.parse(readFileSync(join(result.bundlePath, 'manifest.json'), 'utf-8'));
    expect(manifest.type).toBe('addon');
    expect(manifest.addonConfig).toBeDefined();
    expect(BundleManifestSchema.safeParse(manifest).success).toBe(true);
  });

  it('creates framework bundle with frameworkConfig and src/ stub', async () => {
    const result = await scaffoldProjectLocalBundle({ type: 'framework', name: 'baz', projectDir });
    const manifest = JSON.parse(readFileSync(join(result.bundlePath, 'manifest.json'), 'utf-8'));
    expect(manifest.type).toBe('framework');
    expect(manifest.frameworkConfig).toBeDefined();
    expect(existsSync(join(result.bundlePath, 'src', '.gitkeep'))).toBe(true);
    expect(BundleManifestSchema.safeParse(manifest).success).toBe(true);
  });

  it('creates plugin bundle with pluginConfig and payload/ stub', async () => {
    const result = await scaffoldProjectLocalBundle({ type: 'plugin', name: 'qux', projectDir });
    const manifest = JSON.parse(readFileSync(join(result.bundlePath, 'manifest.json'), 'utf-8'));
    expect(manifest.type).toBe('plugin');
    expect(manifest.pluginConfig).toBeDefined();
    expect(existsSync(join(result.bundlePath, 'payload', '.gitkeep'))).toBe(true);
    expect(BundleManifestSchema.safeParse(manifest).success).toBe(true);
  });

  it('honors --starter rule', async () => {
    const result = await scaffoldProjectLocalBundle({
      type: 'extension', name: 'rl', starter: 'rule', projectDir,
    });
    expect(result.filesCreated).toContain('rules/rl.md');
    expect(result.filesCreated.find(f => f.includes('SKILL.md'))).toBeUndefined();
  });

  it('honors --starter agent', async () => {
    const result = await scaffoldProjectLocalBundle({
      type: 'extension', name: 'ag', starter: 'agent', projectDir,
    });
    expect(result.filesCreated).toContain('agents/ag.md');
  });

  it('honors --starter minimal (no starter artifact)', async () => {
    const result = await scaffoldProjectLocalBundle({
      type: 'extension', name: 'mn', starter: 'minimal', projectDir,
    });
    expect(result.filesCreated).toEqual(['manifest.json', 'README.md']);
  });

  it('refuses to overwrite an existing bundle', async () => {
    await scaffoldProjectLocalBundle({ type: 'extension', name: 'twice', projectDir });
    const second = await scaffoldProjectLocalBundle({ type: 'extension', name: 'twice', projectDir });
    expect(second.alreadyExists).toBe(true);
    expect(second.filesCreated).toEqual([]);
  });

  it('README contains the identical-form portability reminder', async () => {
    const result = await scaffoldProjectLocalBundle({ type: 'extension', name: 'rd', projectDir });
    const readme = readFileSync(join(result.bundlePath, 'README.md'), 'utf-8');
    expect(readme.toLowerCase()).toContain('identical-form');
    expect(readme).toContain('aiwg promote');
  });

  it('honors a custom description', async () => {
    const result = await scaffoldProjectLocalBundle({
      type: 'addon', name: 'desc', description: 'My custom description here', projectDir,
    });
    const manifest = JSON.parse(readFileSync(join(result.bundlePath, 'manifest.json'), 'utf-8'));
    expect(manifest.description).toBe('My custom description here');
  });
});
