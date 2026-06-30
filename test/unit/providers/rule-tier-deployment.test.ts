import { mkdtemp, mkdir, writeFile, readFile, rm, access } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

import { resolve } from 'path';
import { readFileSync } from 'fs';

// @ts-expect-error — .mjs provider module without type declarations
import {
  ruleEnforcementLevel,
  isAlwaysOnRule,
  writeOnDemandRuleIndex,
  getAddonRuleFiles,
  collectFrameworkArtifacts,
  listOnDemandRuleFiles,
} from '../../../tools/agents/providers/base.mjs';

const REPO_ROOT = resolve(__dirname, '../../..');
const levelOf = (f: string): string | null => ruleEnforcementLevel(readFileSync(f, 'utf8'));

async function tmpFile(name: string, content: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'aiwg-tier-'));
  const p = join(dir, name);
  await writeFile(p, content);
  return p;
}

describe('rule tier deployment (#1673)', () => {
  describe('ruleEnforcementLevel', () => {
    it('reads the enforcement frontmatter field (lowercased)', () => {
      expect(ruleEnforcementLevel('---\nenforcement: HIGH\n---\n# X')).toBe('high');
      expect(ruleEnforcementLevel('---\nname: y\nenforcement: medium\n---\n')).toBe('medium');
    });
    it('returns null when there is no frontmatter or no field', () => {
      expect(ruleEnforcementLevel('# No frontmatter')).toBeNull();
      expect(ruleEnforcementLevel('---\nname: y\n---\n')).toBeNull();
    });
  });

  describe('isAlwaysOnRule', () => {
    it('keeps CRITICAL and HIGH rules always-on', async () => {
      expect(isAlwaysOnRule(await tmpFile('a.md', '---\nenforcement: critical\n---\n'))).toBe(true);
      expect(isAlwaysOnRule(await tmpFile('b.md', '---\nenforcement: high\n---\n'))).toBe(true);
    });
    it('routes MEDIUM and LOW rules off the always-on set', async () => {
      expect(isAlwaysOnRule(await tmpFile('c.md', '---\nenforcement: medium\n---\n'))).toBe(false);
      expect(isAlwaysOnRule(await tmpFile('d.md', '---\nenforcement: low\n---\n'))).toBe(false);
    });
    it('defaults unlabelled and index files to always-on (never silently dropped)', async () => {
      expect(isAlwaysOnRule(await tmpFile('e.md', '# no level'))).toBe(true);
      expect(isAlwaysOnRule(await tmpFile('RULES-INDEX.md', '---\nenforcement: medium\n---\n'))).toBe(true);
      expect(isAlwaysOnRule(await tmpFile('RULES-ONDEMAND.md', '---\nenforcement: medium\n---\n'))).toBe(true);
    });
  });

  describe('writeOnDemandRuleIndex', () => {
    it('writes a managed index listing the on-demand rules with fetch hints', async () => {
      const dir = await mkdtemp(join(tmpdir(), 'aiwg-od-'));
      await mkdir(dir, { recursive: true });
      const n = writeOnDemandRuleIndex(dir, [join('x', 'diagram-generation.md'), join('y', 'activity-log.md')], {});
      expect(n).toBe(2);
      const body = await readFile(join(dir, 'RULES-ONDEMAND.md'), 'utf8');
      expect(body).toContain('aiwg:managed');
      expect(body).toContain('On-Demand Rules');
      expect(body).toContain('aiwg show rule diagram-generation');
      expect(body).toContain('aiwg show rule activity-log');
    });

    it('removes a stale index when there are no on-demand rules', async () => {
      const dir = await mkdtemp(join(tmpdir(), 'aiwg-od-'));
      await writeFile(join(dir, 'RULES-ONDEMAND.md'), 'stale');
      const n = writeOnDemandRuleIndex(dir, [], {});
      expect(n).toBe(0);
      await expect(access(join(dir, 'RULES-ONDEMAND.md'))).rejects.toThrow();
    });

    it('honors dry-run (no write)', async () => {
      const dir = await mkdtemp(join(tmpdir(), 'aiwg-od-'));
      writeOnDemandRuleIndex(dir, [join('x', 'foo.md')], { dryRun: true });
      await expect(access(join(dir, 'RULES-ONDEMAND.md'))).rejects.toThrow();
      await rm(dir, { recursive: true, force: true });
    });
  });

  // Contract guard against the real repo source: the deploy enumerators must
  // never feed MEDIUM/LOW rules into the always-on set, and the on-demand
  // enumerator must surface them. Locks the tiering behavior in CI.
  describe('deploy enumerators on real source', () => {
    it('getAddonRuleFiles yields only always-on (no medium/low) rules', () => {
      const files: string[] = getAddonRuleFiles(REPO_ROOT);
      const leaked = files.filter((f) => ['medium', 'low'].includes(levelOf(f) as string));
      expect(leaked).toEqual([]);
    });

    it('collectFrameworkArtifacts rules yield only always-on rules', () => {
      const arts = collectFrameworkArtifacts(REPO_ROOT, 'all', { includeRules: true });
      const leaked = (arts.rules as string[]).filter((f) => ['medium', 'low'].includes(levelOf(f) as string));
      expect(leaked).toEqual([]);
    });

    it('listOnDemandRuleFiles surfaces the medium/low tier and nothing always-on', () => {
      const od: string[] = listOnDemandRuleFiles(REPO_ROOT);
      expect(od.length).toBeGreaterThan(0);
      // every entry is genuinely medium/low
      expect(od.every((f) => ['medium', 'low'].includes(levelOf(f) as string))).toBe(true);
      // a known MEDIUM rule is present
      expect(od.some((f) => f.endsWith('diagram-generation.md'))).toBe(true);
    });
  });
});
