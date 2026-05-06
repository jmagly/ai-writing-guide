/**
 * context-pipeline discovery tests.
 *
 * Covers `discoverSection` and `discoverDeployedArtifacts` against a temporary
 * filesystem fixture that mirrors the real per-provider deploy layout.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  discoverSection,
  discoverDeployedArtifacts,
  shouldEmitContextFiles,
  AGENTS_MD_PROVIDERS,
  generateAiwgMd,
} from '../../../src/smiths/context-pipeline/index.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'aiwg-ctx-pipeline-'));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

async function writeMd(rel: string, frontmatter: Record<string, unknown>, body = '# heading\n'): Promise<void> {
  const abs = path.join(tmpDir, rel);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  const fmLines = ['---'];
  for (const [k, v] of Object.entries(frontmatter)) {
    if (Array.isArray(v)) {
      fmLines.push(`${k}: [${v.map((x) => JSON.stringify(x)).join(', ')}]`);
    } else if (typeof v === 'string') {
      fmLines.push(`${k}: "${v}"`);
    } else {
      fmLines.push(`${k}: ${v}`);
    }
  }
  fmLines.push('---', '');
  await fs.writeFile(abs, fmLines.join('\n') + body, 'utf8');
}

describe('discoverSection', () => {
  it('returns empty section when relativeDir is empty string', async () => {
    const r = await discoverSection('agents', tmpDir, '');
    expect(r.entries).toEqual([]);
    expect(r.type).toBe('agents');
  });

  it('returns empty section when directory does not exist', async () => {
    const r = await discoverSection('agents', tmpDir, '.codex/agents');
    expect(r.entries).toEqual([]);
  });

  it('discovers agent files with frontmatter metadata', async () => {
    await writeMd('.codex/agents/api-designer.md', {
      name: 'api-designer',
      description: 'Designs API contracts',
      tags: ['design', 'api'],
    });
    await writeMd('.codex/agents/security-architect.md', {
      name: 'security-architect',
      description: 'Threat modeling and release gates',
    });
    const r = await discoverSection('agents', tmpDir, '.codex/agents');
    expect(r.entries).toHaveLength(2);
    expect(r.entries[0].id).toBe('api-designer');
    expect(r.entries[0].description).toBe('Designs API contracts');
    expect(r.entries[0].tags).toEqual(['design', 'api']);
    expect(r.entries[0].path).toBe('.codex/agents/api-designer.md');
  });

  it('falls back to filename basename when frontmatter is absent', async () => {
    const dir = path.join(tmpDir, '.codex/agents');
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, 'plain.md'), '# Plain\nno frontmatter\n', 'utf8');
    const r = await discoverSection('agents', tmpDir, '.codex/agents');
    expect(r.entries).toHaveLength(1);
    expect(r.entries[0].id).toBe('plain');
    expect(r.entries[0].description).toBe('(no description)');
  });

  it('discovers skill folders by SKILL.md presence', async () => {
    await writeMd('.codex/skills/foo/SKILL.md', {
      name: 'foo',
      description: 'A foo skill',
    });
    await writeMd('.codex/skills/bar/SKILL.md', {
      name: 'bar',
      description: 'A bar skill',
    });
    const r = await discoverSection('skills', tmpDir, '.codex/skills');
    expect(r.entries).toHaveLength(2);
    const ids = r.entries.map((e) => e.id).sort();
    expect(ids).toEqual(['bar', 'foo']);
    // Path format uses forward slashes (portable across providers/OS).
    expect(r.entries[0].path).toContain('/SKILL.md');
  });

  it('skips skill folders without SKILL.md', async () => {
    await fs.mkdir(path.join(tmpDir, '.codex/skills/incomplete'), { recursive: true });
    await fs.writeFile(path.join(tmpDir, '.codex/skills/incomplete/README.md'), 'no SKILL.md here\n', 'utf8');
    const r = await discoverSection('skills', tmpDir, '.codex/skills');
    expect(r.entries).toEqual([]);
  });

  it('marks safety-critical artifacts', async () => {
    await writeMd('.codex/rules/human-authorization.md', {
      name: 'human-authorization',
      description: 'Operator approval before irreversible actions',
      'safety-critical': true,
    });
    const r = await discoverSection('rules', tmpDir, '.codex/rules');
    expect(r.entries[0].safetyCritical).toBe(true);
  });

  it('handles tags as a comma-string when frontmatter uses string syntax', async () => {
    await writeMd('.codex/agents/foo.md', {
      name: 'foo',
      description: 'A foo',
      tags: 'design, api, contracts',
    });
    const r = await discoverSection('agents', tmpDir, '.codex/agents');
    expect(r.entries[0].tags).toEqual(['design', 'api', 'contracts']);
  });

  it('emits paths with forward slashes for cross-platform AGENTS.md portability', async () => {
    await writeMd('.codex/agents/portable.md', { name: 'portable', description: 'A portable agent' });
    const r = await discoverSection('agents', tmpDir, '.codex/agents');
    // Forward-slash normalization is applied at emission time so AGENTS.md
    // is portable from a Linux deploy to a Windows reader (and vice versa).
    expect(r.entries[0].path).not.toContain('\\');
    expect(r.entries[0].path.split('/').length).toBeGreaterThanOrEqual(2);
  });
});

describe('discoverDeployedArtifacts', () => {
  it('returns the four canonical sections in agents/rules/skills/behaviors order, dropping empties', async () => {
    await writeMd('.codex/agents/api.md', { name: 'api', description: 'API agent' });
    await writeMd('.codex/skills/foo/SKILL.md', { name: 'foo', description: 'foo' });
    const sections = await discoverDeployedArtifacts(tmpDir, {
      agents: '.codex/agents',
      rules: '.codex/rules', // empty
      skills: '.codex/skills',
      behaviors: '.codex/behaviors', // empty
    });
    // Empty sections are dropped.
    expect(sections).toHaveLength(2);
    expect(sections[0].type).toBe('agents');
    expect(sections[1].type).toBe('skills');
  });

  it('returns empty array when nothing was deployed', async () => {
    const sections = await discoverDeployedArtifacts(tmpDir, {
      agents: '.codex/agents',
      rules: '.codex/rules',
      skills: '.codex/skills',
      behaviors: '.codex/behaviors',
    });
    expect(sections).toEqual([]);
  });
});

describe('provider policy', () => {
  it('emits AIWG.md/AGENTS.md for the seven AGENTS.md providers', () => {
    expect(shouldEmitContextFiles('codex')).toBe(true);
    expect(shouldEmitContextFiles('cursor')).toBe(true);
    expect(shouldEmitContextFiles('windsurf')).toBe(true);
    expect(shouldEmitContextFiles('hermes')).toBe(true);
    expect(shouldEmitContextFiles('warp')).toBe(true);
    expect(shouldEmitContextFiles('factory')).toBe(true);
    expect(shouldEmitContextFiles('opencode')).toBe(true);
    expect(AGENTS_MD_PROVIDERS.size).toBe(7);
  });

  it('does NOT emit for Claude (CLAUDE.md is native)', () => {
    expect(shouldEmitContextFiles('claude')).toBe(false);
  });

  it('does NOT emit for OpenClaw (home-dir-only deployment)', () => {
    expect(shouldEmitContextFiles('openclaw')).toBe(false);
  });

  it('does NOT emit for Copilot (uses .github/copilot-instructions.md)', () => {
    expect(shouldEmitContextFiles('copilot')).toBe(false);
  });

  it('does NOT emit for generic', () => {
    expect(shouldEmitContextFiles('generic')).toBe(false);
  });
});

describe('generateAiwgMd', () => {
  it('mirrors CLAUDE.md content with the AIWG signature inserted', async () => {
    const claudeMd = '# AIWG\n\n@AIWG.md\n\nSome project context here.\n';
    await fs.writeFile(path.join(tmpDir, 'CLAUDE.md'), claudeMd, 'utf8');
    const content = await generateAiwgMd(tmpDir);
    expect(content).toContain('# AIWG');
    expect(content).toContain('<!-- aiwg-managed -->');
    expect(content).toContain('@AIWG.md');
    expect(content).toContain('Some project context here.');
  });

  it('does not double-insert signature when CLAUDE.md already carries one', async () => {
    const claudeMd = '# AIWG\n<!-- aiwg-managed -->\nbody\n';
    await fs.writeFile(path.join(tmpDir, 'CLAUDE.md'), claudeMd, 'utf8');
    const content = await generateAiwgMd(tmpDir);
    const signatureCount = (content.match(/<!-- aiwg-managed -->/g) || []).length;
    expect(signatureCount).toBe(1);
  });

  it('falls back to a stub when CLAUDE.md is absent', async () => {
    const content = await generateAiwgMd(tmpDir);
    expect(content).toContain('# AIWG.md');
    expect(content).toContain('<!-- aiwg-managed -->');
    expect(content).toContain('CLAUDE.md was not found');
  });
});
