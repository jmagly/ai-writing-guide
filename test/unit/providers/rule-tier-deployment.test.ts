import { mkdtemp, mkdir, writeFile, readFile, rm, access } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

import { resolve } from 'path';
import { readFileSync, existsSync } from 'fs';
import { execFileSync } from 'child_process';

// @ts-expect-error — .mjs provider module without type declarations
import {
  ruleEnforcementLevel,
  isAlwaysOnRule,
  writeOnDemandRuleIndex,
  getAddonRuleFiles,
  collectFrameworkArtifacts,
  listOnDemandRuleFiles,
  onDemandRuleNames,
  renderOnDemandRuleSection,
  interpolateContextTokens,
} from '../../../tools/agents/providers/base.mjs';
// @ts-expect-error — .mjs provider module without type declarations
import { generateAgentsMd as hermesAgentsMd } from '../../../tools/agents/providers/hermes.mjs';

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

// ---------------------------------------------------------------------------
// #1675 — on-demand index/section propagation across non-Claude providers
// ---------------------------------------------------------------------------
describe('on-demand index propagation (#1675)', () => {
  const od = ['x/zeta.md', 'a/alpha.md', 'a/alpha.md', 'm/beta.md'];

  describe('onDemandRuleNames', () => {
    it('sorts and de-duplicates basenames (sans .md)', () => {
      expect(onDemandRuleNames(od)).toEqual(['alpha', 'beta', 'zeta']);
    });
    it('drops excluded names', () => {
      expect(onDemandRuleNames(od, ['alpha'])).toEqual(['beta', 'zeta']);
    });
    it('returns [] for empty input', () => {
      expect(onDemandRuleNames([])).toEqual([]);
      expect(onDemandRuleNames(undefined)).toEqual([]);
    });
  });

  describe('renderOnDemandRuleSection', () => {
    it('renders an H2 heading, fetch fence, and one bullet per rule', () => {
      const s = renderOnDemandRuleSection(od);
      expect(s).toContain('## On-Demand Rules');
      expect(s).toContain('aiwg show rule <name>');
      expect(s).toContain('- `alpha` — `aiwg show rule alpha`');
      expect((s.match(/^- /gm) || []).length).toBe(3);
    });
    it('honors a custom heading level', () => {
      expect(renderOnDemandRuleSection(od, { heading: '### On-Demand Rules' })).toContain(
        '### On-Demand Rules',
      );
    });
    it('returns empty string when nothing remains after exclusion', () => {
      expect(renderOnDemandRuleSection(od, { exclude: ['alpha', 'beta', 'zeta'] })).toBe('');
      expect(renderOnDemandRuleSection([])).toBe('');
    });
  });

  describe('interpolateContextTokens', () => {
    it('substitutes the {{ON_DEMAND_RULES}} token', () => {
      const out = interpolateContextTokens('before\n{{ON_DEMAND_RULES}}\nafter', {
        onDemandRules: '## On-Demand Rules\n- `r` — `aiwg show rule r`',
      });
      expect(out).toContain('## On-Demand Rules');
      expect(out).not.toContain('{{ON_DEMAND_RULES}}');
    });
    it('clears the token when no on-demand rules are supplied', () => {
      expect(interpolateContextTokens('a{{ON_DEMAND_RULES}}b', {})).toBe('ab');
    });
  });

  // Source-wiring guard: every file-based provider must call the on-demand
  // index writer after deploying rules. Cheap regression guard against someone
  // dropping the wiring during a refactor.
  describe('file-based provider wiring', () => {
    const PROVIDERS = ['codex', 'factory', 'cursor', 'copilot', 'opencode', 'windsurf', 'openclaw'];
    for (const p of PROVIDERS) {
      it(`${p}.mjs imports and calls writeOnDemandRuleIndex`, () => {
        const src = readFileSync(
          resolve(REPO_ROOT, 'tools/agents/providers', `${p}.mjs`),
          'utf8',
        );
        expect(src).toContain('writeOnDemandRuleIndex');
        expect(src).toContain('listOnDemandRuleFiles');
      });
    }
  });

  // End-to-end: deploy rules-only to a temp target via the real CLI and assert
  // each provider's rule dir gets a populated RULES-ONDEMAND.md whose count
  // matches the on-demand enumerator. Two providers with different rule dirs
  // (.codex/rules vs .github/instructions) catch path mistakes.
  describe('end-to-end RULES-ONDEMAND.md emission', () => {
    const expectedCount = onDemandRuleNames(listOnDemandRuleFiles(REPO_ROOT)).length;
    const CASES: Array<[string, string]> = [
      ['codex', '.codex/rules'],
      ['copilot', '.github/instructions'],
    ];
    for (const [provider, ruleDir] of CASES) {
      it(`${provider} writes RULES-ONDEMAND.md with ${expectedCount} entries`, async () => {
        const target = await mkdtemp(join(tmpdir(), `aiwg-od-${provider}-`));
        execFileSync(
          'node',
          [
            'tools/agents/deploy-agents.mjs',
            '--source', REPO_ROOT,
            '--target', target,
            '--rules-only', '--mode', 'all',
            '--provider', provider, '--force',
          ],
          { cwd: REPO_ROOT, stdio: 'ignore' },
        );
        const indexPath = join(target, ruleDir, 'RULES-ONDEMAND.md');
        expect(existsSync(indexPath)).toBe(true);
        const body = await readFile(indexPath, 'utf8');
        expect((body.match(/^- /gm) || []).length).toBe(expectedCount);
        expect(body).toContain('aiwg show rule ');
        await rm(target, { recursive: true, force: true });
      }, 60_000);
    }
  });

  // Aggregated providers note the tier in their single bridge file.
  describe('aggregated provider bridge sections', () => {
    it('hermes generateAgentsMd embeds the on-demand section under cap', async () => {
      const target = await mkdtemp(join(tmpdir(), 'aiwg-od-hermes-'));
      hermesAgentsMd(58, 20, target, { srcRoot: REPO_ROOT, dryRun: false });
      const body = await readFile(join(target, 'AGENTS.md'), 'utf8');
      expect(body).toContain('On-Demand Rules');
      expect(body).toContain('aiwg show rule ');
      expect(body.length).toBeLessThan(19_000); // Hermes hard cap
      await rm(target, { recursive: true, force: true });
    });

    it('warp WARP.md aggregates the on-demand section', async () => {
      const target = await mkdtemp(join(tmpdir(), 'aiwg-od-warp-'));
      execFileSync(
        'node',
        ['tools/warp/setup-warp.mjs', '--source', REPO_ROOT, '--target', target, '--mode', 'all', '--force'],
        { cwd: REPO_ROOT, stdio: 'ignore' },
      );
      const body = await readFile(join(target, 'WARP.md'), 'utf8');
      expect(body).toContain('## On-Demand Rules');
      expect(body).toContain('aiwg show rule ');
      await rm(target, { recursive: true, force: true });
    }, 60_000);
  });
});
