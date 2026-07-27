import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(import.meta.dirname, '../../..');
const docs = path.join(root, 'docs');

describe('documentation audience boundary', () => {
  it('keeps agent references indexed with stable metadata', () => {
    const agentRoot = path.join(docs, 'agents');
    const markdownFiles = (directory: string): string[] =>
      readdirSync(directory).flatMap((entry) => {
        const absolute = path.join(directory, entry);
        if (statSync(absolute).isDirectory()) return markdownFiles(absolute);
        return entry.endsWith('.md') ? [absolute] : [];
      });
    const files = markdownFiles(agentRoot);
    expect(files).toContain(path.join(agentRoot, 'README.md'));
    expect(files).toContain(path.join(agentRoot, 'cli-reference.md'));
    expect(files).toContain(path.join(agentRoot, 'CLI_USAGE.md'));
    expect(files).toContain(path.join(agentRoot, 'providers', 'README.md'));
    for (const file of files) {
      const content = readFileSync(file, 'utf8');
      expect(content).toMatch(/^---\n[\s\S]*audience: agent-operator/m);
      expect(content).toMatch(/^publication: agent-reference$/m);
      expect(content).toMatch(/^stable_id: aiwg\.agent-reference\./m);
    }
  });

  it('teaches the preferred complete deployment across public provider quickstarts', () => {
    const quickstarts = readdirSync(path.join(docs, 'integrations'))
      .filter((entry) => entry.endsWith('-quickstart.md'));
    expect(quickstarts.length).toBeGreaterThan(0);
    for (const entry of quickstarts) {
      const content = readFileSync(path.join(docs, 'integrations', entry), 'utf8');
      expect(content).toMatch(/aiwg use all --provider [a-z-]+/);
      expect(content).toContain('aiwg-regenerate');
    }
  });

  it('excludes the agent corpus from the public build source', () => {
    const output = path.join(root, 'dist', 'test-public-docs-source');
    execFileSync(process.execPath, ['tools/docs/build-public-source.mjs', output], {
      cwd: root,
      stdio: 'pipe',
    });
    expect(existsSync(path.join(output, 'agents'))).toBe(false);
    const manifest = JSON.parse(readFileSync(path.join(output, '_manifest.json'), 'utf8'));
    expect(manifest.order.some((entry: string) => entry === 'agents' || entry.startsWith('agents/'))).toBe(false);
  });

  it('retains the agent corpus in the npm package allowlist', () => {
    const packageJson = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
    expect(packageJson.files).toContain('docs/');
  });

  it('keeps all onboarding surfaces classified and removes command-first public entry points', () => {
    const output = path.join(root, 'dist', 'test-docs-audience-audit.json');
    execFileSync(process.execPath, ['tools/docs/audit-audiences.mjs', output], {
      cwd: root,
      stdio: 'pipe',
    });
    const audit = JSON.parse(readFileSync(output, 'utf8'));
    expect(audit.totals.onboardingNeedsReview).toBe(0);
    expect(audit.beforeAfter.current.homepageCommandChecklistItems).toBe(0);
    expect(audit.beforeAfter.current.publicCliNavigationEntries).toBe(0);
    expect(audit.beforeAfter.current.coreJourneyCommandMentions)
      .toBeLessThan(audit.beforeAfter.baseline.coreJourneyCommandMentions);
  });
});
