/**
 * Unit Tests for Consolidated Rules Deployment
 *
 * Tests for the new base.mjs functions that support deploying a single
 * RULES-INDEX.md instead of 31 individual rule files.
 *
 * Issue #340 (parent #334)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Import functions under test
const REPO_ROOT = path.resolve(__dirname, '../..');

// Dynamic import helper for ESM modules
async function importBase() {
  return import(path.join(REPO_ROOT, 'tools/agents/providers/base.mjs'));
}

const TEST_BASE = path.join(os.tmpdir(), 'aiwg-consolidated-rules-tests');

describe('Consolidated Rules Functions', () => {
  let base: any;

  beforeEach(async () => {
    base = await importBase();
    fs.mkdirSync(TEST_BASE, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(TEST_BASE, { recursive: true, force: true });
  });

  // ==========================================================================
  // loadRulesManifest
  // ==========================================================================

  describe('loadRulesManifest', () => {
    it('loads manifest from real source root', () => {
      const manifest = base.loadRulesManifest(REPO_ROOT);
      expect(manifest).not.toBeNull();
      expect(manifest.version).toBe('2.0.0');
      expect(manifest.rules).toBeInstanceOf(Array);
      expect(manifest.rules.length).toBeGreaterThan(0);
    });

    it('returns null for non-existent source root', () => {
      const manifest = base.loadRulesManifest('/tmp/nonexistent-aiwg-test');
      expect(manifest).toBeNull();
    });

    it('manifest contains consolidation metadata', () => {
      const manifest = base.loadRulesManifest(REPO_ROOT);
      expect(manifest.consolidation).toBeDefined();
      expect(manifest.consolidation.strategy).toBe('index-with-links');
      expect(manifest.consolidation.indexFile).toBe('RULES-INDEX.md');
      expect(manifest.consolidation.deployIndexOnly).toBe(true);
    });

    it('manifest contains all 3 tiers', () => {
      const manifest = base.loadRulesManifest(REPO_ROOT);
      const tiers = new Set(manifest.rules.map((r: any) => r.tier));
      expect(tiers.has('core')).toBe(true);
      expect(tiers.has('sdlc')).toBe(true);
      expect(tiers.has('research')).toBe(true);
    });
  });

  // ==========================================================================
  // groupRulesByTier
  // ==========================================================================

  describe('groupRulesByTier', () => {
    it('groups rules into core, sdlc, and research', () => {
      const rules = [
        { name: 'no-attribution', tier: 'core' },
        { name: 'tao-loop', tier: 'sdlc' },
        { name: 'research-metadata', tier: 'research' },
        { name: 'anti-laziness', tier: 'core' },
      ];

      const groups = base.groupRulesByTier(rules);
      expect(groups.core).toHaveLength(2);
      expect(groups.sdlc).toHaveLength(1);
      expect(groups.research).toHaveLength(1);
    });

    it('defaults missing tier to sdlc', () => {
      const rules = [{ name: 'unknown-rule' }];
      const groups = base.groupRulesByTier(rules);
      expect(groups.sdlc).toHaveLength(1);
    });

    it('ignores unknown tier values', () => {
      const rules = [{ name: 'bad-rule', tier: 'nonexistent' }];
      const groups = base.groupRulesByTier(rules);
      expect(groups.core).toHaveLength(0);
      expect(groups.sdlc).toHaveLength(0);
      expect(groups.research).toHaveLength(0);
    });

    it('handles empty input', () => {
      const groups = base.groupRulesByTier([]);
      expect(groups.core).toHaveLength(0);
      expect(groups.sdlc).toHaveLength(0);
      expect(groups.research).toHaveLength(0);
    });

    it('groups real manifest rules correctly', () => {
      const manifest = base.loadRulesManifest(REPO_ROOT);
      const groups = base.groupRulesByTier(manifest.rules);
      // Core has 9 rules per RULES-INDEX.md
      expect(groups.core.length).toBeGreaterThanOrEqual(9);
      // SDLC has 20 rules
      expect(groups.sdlc.length).toBeGreaterThanOrEqual(20);
      // Research has 2 rules
      expect(groups.research.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ==========================================================================
  // groupByEnforcement
  // ==========================================================================

  describe('groupByEnforcement', () => {
    it('groups rules by enforcement level', () => {
      const rules = [
        { name: 'no-attribution', enforcement: 'critical' },
        { name: 'anti-laziness', enforcement: 'high' },
        { name: 'reproducibility', enforcement: 'medium' },
        { name: 'token-security', enforcement: 'critical' },
      ];

      const groups = base.groupByEnforcement(rules);
      expect(groups.critical).toHaveLength(2);
      expect(groups.high).toHaveLength(1);
      expect(groups.medium).toHaveLength(1);
    });

    it('defaults missing enforcement to medium', () => {
      const rules = [{ name: 'unknown' }];
      const groups = base.groupByEnforcement(rules);
      expect(groups.medium).toHaveLength(1);
    });

    it('is case-insensitive', () => {
      const rules = [
        { name: 'a', enforcement: 'CRITICAL' },
        { name: 'b', enforcement: 'High' },
        { name: 'c', enforcement: 'Medium' },
      ];
      const groups = base.groupByEnforcement(rules);
      expect(groups.critical).toHaveLength(1);
      expect(groups.high).toHaveLength(1);
      expect(groups.medium).toHaveLength(1);
    });

    it('handles empty input', () => {
      const groups = base.groupByEnforcement([]);
      expect(groups.critical).toHaveLength(0);
      expect(groups.high).toHaveLength(0);
      expect(groups.medium).toHaveLength(0);
    });
  });

  // ==========================================================================
  // getRulesIndexPath
  // ==========================================================================

  describe('getRulesIndexPath', () => {
    it('returns path when RULES-INDEX.md exists', () => {
      const result = base.getRulesIndexPath(REPO_ROOT);
      expect(result).not.toBeNull();
      expect(result).toContain('RULES-INDEX.md');
      expect(fs.existsSync(result)).toBe(true);
    });

    it('returns null when source root does not exist', () => {
      const result = base.getRulesIndexPath('/tmp/nonexistent-aiwg-test');
      expect(result).toBeNull();
    });

    it('returns the correct relative path', () => {
      const result = base.getRulesIndexPath(REPO_ROOT);
      const expected = path.join(REPO_ROOT, 'agentic', 'code', 'frameworks', 'sdlc-complete', 'rules', 'RULES-INDEX.md');
      expect(result).toBe(expected);
    });
  });

  // ==========================================================================
  // generateConsolidatedRulesContent
  // ==========================================================================

  describe('generateConsolidatedRulesContent', () => {
    it('returns content from RULES-INDEX.md', () => {
      const content = base.generateConsolidatedRulesContent(REPO_ROOT, 'claude');
      expect(content).not.toBeNull();
      expect(content).toContain('# AIWG Rules Index');
    });

    it('content includes all 3 tier sections', () => {
      const content = base.generateConsolidatedRulesContent(REPO_ROOT, 'claude');
      expect(content).toContain('## Core Rules');
      expect(content).toContain('## SDLC Rules');
      expect(content).toContain('## Research Rules');
    });

    it('content includes enforcement level headings', () => {
      const content = base.generateConsolidatedRulesContent(REPO_ROOT, 'claude');
      expect(content).toContain('### CRITICAL');
      expect(content).toContain('### HIGH');
      expect(content).toContain('### MEDIUM');
    });

    it('content includes @-links to full rule files', () => {
      const content = base.generateConsolidatedRulesContent(REPO_ROOT, 'claude');
      expect(content).toContain('@agentic/code/frameworks/sdlc-complete/rules/no-attribution.md');
      expect(content).toContain('@agentic/code/frameworks/sdlc-complete/rules/anti-laziness.md');
    });

    it('content includes Quick Reference table', () => {
      const content = base.generateConsolidatedRulesContent(REPO_ROOT, 'claude');
      expect(content).toContain('## Quick Reference by Context');
      expect(content).toContain('Writing code');
    });

    it('appends addon rules when provided', () => {
      const addonFiles = [
        path.join(REPO_ROOT, 'agentic', 'code', 'addons', 'voice-framework', 'rules', 'voice-rule.md'),
        path.join(REPO_ROOT, 'agentic', 'code', 'addons', 'testing', 'rules', 'test-rule.md'),
      ];
      const content = base.generateConsolidatedRulesContent(REPO_ROOT, 'claude', addonFiles);
      expect(content).toContain('## Addon Rules');
      expect(content).toContain('**voice-rule**');
      expect(content).toContain('**test-rule**');
    });

    it('does not include addon section when no addons provided', () => {
      const content = base.generateConsolidatedRulesContent(REPO_ROOT, 'claude');
      expect(content).not.toContain('## Addon Rules');
    });

    it('returns null when source root does not exist', () => {
      const content = base.generateConsolidatedRulesContent('/tmp/nonexistent-aiwg-test', 'claude');
      expect(content).toBeNull();
    });
  });

  // ==========================================================================
  // cleanupOldRuleFiles
  // ==========================================================================

  describe('cleanupOldRuleFiles', () => {
    let rulesDir: string;

    beforeEach(() => {
      rulesDir = path.join(TEST_BASE, `rules-${Date.now()}`);
      fs.mkdirSync(rulesDir, { recursive: true });
    });

    it('removes old .md files but keeps RULES-INDEX.md', () => {
      // Create test files
      fs.writeFileSync(path.join(rulesDir, 'no-attribution.md'), 'old rule');
      fs.writeFileSync(path.join(rulesDir, 'anti-laziness.md'), 'old rule');
      fs.writeFileSync(path.join(rulesDir, 'RULES-INDEX.md'), 'index content');

      const removed = base.cleanupOldRuleFiles(rulesDir);

      expect(removed).toHaveLength(2);
      expect(fs.existsSync(path.join(rulesDir, 'no-attribution.md'))).toBe(false);
      expect(fs.existsSync(path.join(rulesDir, 'anti-laziness.md'))).toBe(false);
      expect(fs.existsSync(path.join(rulesDir, 'RULES-INDEX.md'))).toBe(true);
    });

    it('does not remove non-.md files', () => {
      fs.writeFileSync(path.join(rulesDir, 'existing.mdc'), 'cursor rule');
      fs.writeFileSync(path.join(rulesDir, 'config.json'), '{}');
      fs.writeFileSync(path.join(rulesDir, 'old-rule.md'), 'old');

      const removed = base.cleanupOldRuleFiles(rulesDir);

      expect(removed).toHaveLength(1);
      expect(fs.existsSync(path.join(rulesDir, 'existing.mdc'))).toBe(true);
      expect(fs.existsSync(path.join(rulesDir, 'config.json'))).toBe(true);
    });

    it('skips directories', () => {
      fs.mkdirSync(path.join(rulesDir, 'subdir'));
      fs.writeFileSync(path.join(rulesDir, 'subdir', 'nested.md'), 'nested');

      const removed = base.cleanupOldRuleFiles(rulesDir);

      expect(removed).toHaveLength(0);
      expect(fs.existsSync(path.join(rulesDir, 'subdir', 'nested.md'))).toBe(true);
    });

    it('dry-run mode does not delete files', () => {
      fs.writeFileSync(path.join(rulesDir, 'old-rule.md'), 'old');

      const removed = base.cleanupOldRuleFiles(rulesDir, { dryRun: true });

      expect(removed).toHaveLength(1);
      expect(fs.existsSync(path.join(rulesDir, 'old-rule.md'))).toBe(true);
    });

    it('handles non-existent directory gracefully', () => {
      const removed = base.cleanupOldRuleFiles('/tmp/nonexistent-rules-dir');
      expect(removed).toHaveLength(0);
    });

    it('handles empty directory', () => {
      const removed = base.cleanupOldRuleFiles(rulesDir);
      expect(removed).toHaveLength(0);
    });

    it('handles case sensitivity for RULES-INDEX.md', () => {
      // Only exact match "RULES-INDEX.md" should be preserved
      fs.writeFileSync(path.join(rulesDir, 'RULES-INDEX.md'), 'index');
      fs.writeFileSync(path.join(rulesDir, 'rules-index.md'), 'lowercase variant');

      const removed = base.cleanupOldRuleFiles(rulesDir);

      expect(removed).toHaveLength(1);
      expect(fs.existsSync(path.join(rulesDir, 'RULES-INDEX.md'))).toBe(true);
      expect(fs.existsSync(path.join(rulesDir, 'rules-index.md'))).toBe(false);
    });
  });
});
