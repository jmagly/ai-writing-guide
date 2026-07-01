/**
 * Codex Plugin Bundle Generator Tests
 *
 * Tests for generatePluginBundle() in tools/agents/providers/codex.mjs.
 * Verifies that the Codex plugin bundle produces correct:
 *   - .codex-plugin/plugin.json manifest
 *   - .agents/plugins/marketplace.json
 *
 * @issue #802
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { createRequire } from 'module';

// Use dynamic import since provider is ESM
const REPO_ROOT = path.resolve(__dirname, '../../..');

async function importCodexProvider() {
  // We need the actual module — load it fresh
  const modPath = path.join(REPO_ROOT, 'tools/agents/providers/codex.mjs');
  // Use a cache-busting query to force a fresh load in the test env
  const { generatePluginBundle } = await import(/* @vite-ignore */ modPath);
  return { generatePluginBundle };
}

describe('Codex Plugin Bundle Generator', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aiwg-codex-plugin-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('generatePluginBundle', () => {
    it('should be exported from codex.mjs', async () => {
      const { generatePluginBundle } = await importCodexProvider();
      expect(typeof generatePluginBundle).toBe('function');
    });

    it('should create .codex-plugin/plugin.json at target', async () => {
      const { generatePluginBundle } = await importCodexProvider();

      generatePluginBundle(tmpDir, { dryRun: false, srcRoot: REPO_ROOT });

      const pluginJsonPath = path.join(tmpDir, 'agentic', 'code', 'plugins', 'sdlc', '.codex-plugin', 'plugin.json');
      expect(fs.existsSync(pluginJsonPath)).toBe(true);
    });

    it('plugin.json should contain required Codex manifest fields', async () => {
      const { generatePluginBundle } = await importCodexProvider();

      generatePluginBundle(tmpDir, { dryRun: false, srcRoot: REPO_ROOT });

      const pluginJsonPath = path.join(tmpDir, 'agentic', 'code', 'plugins', 'sdlc', '.codex-plugin', 'plugin.json');
      const manifest = JSON.parse(fs.readFileSync(pluginJsonPath, 'utf8'));

      expect(manifest.name).toBe('aiwg-sdlc');
      expect(manifest.version).toBeDefined();
      expect(manifest.description).toBeDefined();
      expect(manifest.description.length).toBeGreaterThan(10);
    });

    it('plugin.json should include skills path field', async () => {
      const { generatePluginBundle } = await importCodexProvider();

      generatePluginBundle(tmpDir, { dryRun: false, srcRoot: REPO_ROOT });

      const pluginJsonPath = path.join(tmpDir, 'agentic', 'code', 'plugins', 'sdlc', '.codex-plugin', 'plugin.json');
      const manifest = JSON.parse(fs.readFileSync(pluginJsonPath, 'utf8'));

      // Codex requires skills path as relative path with ./ prefix
      expect(manifest.skills).toBeDefined();
      expect(manifest.skills).toMatch(/^\.\//);
    });

    it('plugin.json should include optional author/homepage/repository/license metadata', async () => {
      const { generatePluginBundle } = await importCodexProvider();

      generatePluginBundle(tmpDir, { dryRun: false, srcRoot: REPO_ROOT });

      const pluginJsonPath = path.join(tmpDir, 'agentic', 'code', 'plugins', 'sdlc', '.codex-plugin', 'plugin.json');
      const manifest = JSON.parse(fs.readFileSync(pluginJsonPath, 'utf8'));

      expect(manifest.author).toBeDefined();
      expect(manifest.homepage).toContain('aiwg.io');
      expect(manifest.repository).toContain('github.com');
      expect(manifest.license).toBe('MIT');
      expect(Array.isArray(manifest.keywords)).toBe(true);
      expect(manifest.keywords).toContain('sdlc');
    });

    it('should create .agents/plugins/marketplace.json at target', async () => {
      const { generatePluginBundle } = await importCodexProvider();

      generatePluginBundle(tmpDir, { dryRun: false, srcRoot: REPO_ROOT });

      const marketplacePath = path.join(tmpDir, '.agents', 'plugins', 'marketplace.json');
      expect(fs.existsSync(marketplacePath)).toBe(true);
    });

    it('marketplace.json should be valid Codex marketplace format', async () => {
      const { generatePluginBundle } = await importCodexProvider();

      generatePluginBundle(tmpDir, { dryRun: false, srcRoot: REPO_ROOT });

      const marketplacePath = path.join(tmpDir, '.agents', 'plugins', 'marketplace.json');
      const marketplace = JSON.parse(fs.readFileSync(marketplacePath, 'utf8'));

      // Top-level structure
      expect(marketplace.name).toBeDefined();
      expect(marketplace.interface).toBeDefined();
      expect(marketplace.interface.displayName).toBeDefined();
      expect(Array.isArray(marketplace.plugins)).toBe(true);
      expect(marketplace.plugins.length).toBeGreaterThan(0);
    });

    it('marketplace.json plugins should have correct policy and source fields', async () => {
      const { generatePluginBundle } = await importCodexProvider();

      generatePluginBundle(tmpDir, { dryRun: false, srcRoot: REPO_ROOT });

      const marketplacePath = path.join(tmpDir, '.agents', 'plugins', 'marketplace.json');
      const marketplace = JSON.parse(fs.readFileSync(marketplacePath, 'utf8'));

      const sdlcPlugin = marketplace.plugins.find((p: { name: string }) => p.name === 'aiwg-sdlc');
      expect(sdlcPlugin).toBeDefined();

      // source.path must start with ./ (Codex requirement)
      expect(sdlcPlugin.source.path).toMatch(/^\.\//);
      expect(sdlcPlugin.source.path).toBe('./agentic/code/plugins/sdlc');
      expect(sdlcPlugin.source.source).toBe('local');

      // policy.installation must be valid value
      expect(['AVAILABLE', 'INSTALLED_BY_DEFAULT', 'NOT_AVAILABLE']).toContain(
        sdlcPlugin.policy.installation
      );
    });

    it('dry-run should not create any files', async () => {
      const { generatePluginBundle } = await importCodexProvider();

      generatePluginBundle(tmpDir, { dryRun: true, srcRoot: REPO_ROOT });

      const pluginJsonPath = path.join(tmpDir, 'agentic', 'code', 'plugins', 'sdlc', '.codex-plugin', 'plugin.json');
      const marketplacePath = path.join(tmpDir, '.agents', 'plugins', 'marketplace.json');

      expect(fs.existsSync(pluginJsonPath)).toBe(false);
      expect(fs.existsSync(marketplacePath)).toBe(false);
    });

    it('should use version from package.json when not provided in opts', async () => {
      const { generatePluginBundle } = await importCodexProvider();

      generatePluginBundle(tmpDir, { dryRun: false, srcRoot: REPO_ROOT });

      const pluginJsonPath = path.join(tmpDir, 'agentic', 'code', 'plugins', 'sdlc', '.codex-plugin', 'plugin.json');
      const manifest = JSON.parse(fs.readFileSync(pluginJsonPath, 'utf8'));

      // Version should match package.json format (not 'unknown')
      expect(manifest.version).not.toBe('unknown');
      // CalVer format YYYY.M.PATCH
      expect(manifest.version).toMatch(/^\d{4}\.\d+\.\d+/);
    });

    it('should use version from opts.version when provided', async () => {
      const { generatePluginBundle } = await importCodexProvider();

      generatePluginBundle(tmpDir, { dryRun: false, srcRoot: REPO_ROOT, version: '2026.4.99' });

      const pluginJsonPath = path.join(tmpDir, 'agentic', 'code', 'plugins', 'sdlc', '.codex-plugin', 'plugin.json');
      const manifest = JSON.parse(fs.readFileSync(pluginJsonPath, 'utf8'));

      expect(manifest.version).toBe('2026.4.99');
    });
  });
});
