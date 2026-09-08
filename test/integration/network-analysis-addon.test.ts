import { access, mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, inject } from 'vitest';

import { UseHandler } from '../../src/cli/handlers/use.js';

const root = path.resolve(import.meta.dirname, '../..');
const projects: string[] = [];

function context(project: string, provider: string) {
  return {
    args: ['network-analysis', '--target', project, '--provider', provider, '--copy-all'],
    rawArgs: ['network-analysis', '--target', project, '--provider', provider, '--copy-all'],
    cwd: project,
    frameworkRoot: root,
  };
}

afterEach(async () => {
  await Promise.all(projects.splice(0).map(project => rm(project, { recursive: true, force: true })));
});

describe('network-analysis addon deployment (#2272)', () => {
  const manifest = JSON.parse(readFileSync(path.join(root, 'agentic/code/addons/network-analysis/manifest.json'), 'utf8'));
  const providers = Object.keys(manifest.platform_support);

  async function findSkill(directory: string): Promise<string | undefined> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const candidate = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        const found = await findSkill(candidate);
        if (found) return found;
      } else if (entry.name === 'SKILL.md' && candidate.includes('analyze-network-capture')) {
        return candidate;
      }
    }
    return undefined;
  }

  for (const provider of ['claude', 'codex']) {
    it(`round-trips governed content for ${provider}`, async () => {
      const project = await mkdtemp(path.join(os.tmpdir(), `aiwg-network-${provider}-`));
      projects.push(project);
      const result = await new UseHandler().execute(context(project, provider));
      expect(result.exitCode, result.message).toBe(0);
      const skill = await findSkill(project);
      expect(skill, `deployed skill for ${provider}`).toBeDefined();
      await expect(access(skill!)).resolves.toBeUndefined();
      const deployed = await readFile(skill!, 'utf8');
      expect(deployed).toContain('Analyze Network Capture');
      expect(deployed).toContain('offline-only and metadata-only');
      expect(deployed).toContain('network-analysis-safety.md');
    });
  }

  it('declares the documented provider matrix without provider-specific skill forks', () => {
    expect(providers).toEqual([
      'claude', 'codex', 'cursor', 'factory', 'hermes', 'opencode',
      'openclaw', 'openhuman', 'warp', 'windsurf',
    ]);
    expect(manifest.skills).toEqual(['analyze-network-capture']);
    expect(manifest.platform_support).toEqual(
      Object.fromEntries(providers.map(provider => [provider, 'supported'])),
    );
  });

  it('ships runtime, contracts, documentation, and conformance evidence in the npm archive', () => {
    const files = new Set(inject('basePackageManifest').files.map(entry => entry.path));
    for (const required of [
      'dist/src/network-analysis/index.js',
      'dist/src/network-analysis/index.d.ts',
      'schemas/network-analysis/packet-evidence.v1.schema.json',
      'agentic/code/addons/network-analysis/README.md',
      'agentic/code/addons/network-analysis/docs/operator-guide.md',
      'docs/addons/network-analysis/integrations.md',
      'agentic/code/frameworks/forensics-complete/docs/packet-evidence-integration.md',
      'docs/frameworks/security-engineering/network-control-review.md',
      'docs/network-analysis/compatibility.md',
      'test/fixtures/network-analysis/manifest.v1.json',
      'test/fixtures/network-analysis/conformance-report.v1.json',
      'THIRD_PARTY_NOTICES.md',
    ]) expect(files.has(required), required).toBe(true);

    expect([...files].some(file => /\.(?:pcap|pcapng)(?:\.gz)?$/i.test(file))).toBe(false);
    expect([...files].some(file => /(?:^|\/)(?:tshark|capinfos|termshark)(?:\.exe)?$/i.test(file))).toBe(false);
  }, 120_000);
});
