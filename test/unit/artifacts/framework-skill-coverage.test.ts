/**
 * Framework skill discovery coverage tests.
 *
 * Guards the contract that every canonical SKILL.md under the built-in AIWG
 * frameworks/addons/extensions corpus is present in the framework discovery
 * graph, while nested support files under a skill directory are not advertised
 * as standalone skills.
 */

import { describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildIndex } from '../../../src/artifacts/index-builder.js';
import type { ArtifactIndex } from '../../../src/artifacts/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../../..');

function walk(dir: string, predicate: (file: string) => boolean): string[] {
  const out: string[] = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walk(full, predicate));
    } else if (entry.isFile() && predicate(full)) {
      out.push(path.relative(REPO_ROOT, full).replace(/\\/g, '/'));
    }
  }
  return out;
}

describe('framework graph skill coverage', () => {
  it('indexes every canonical framework/addon/extension SKILL.md as a skill', async () => {
    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aiwg-skill-coverage-'));
    try {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const consoleErrSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      await buildIndex(REPO_ROOT, {
        graph: 'framework',
        force: true,
        explicit: true,
        outputDir,
      });
      consoleSpy.mockRestore();
      consoleErrSpy.mockRestore();

      const indexPath = path.join(outputDir, '.aiwg', '.index', 'framework', 'metadata.json');
      const index: ArtifactIndex = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
      const indexedSkillPaths = new Set(
        Object.values(index.entries)
          .filter(entry => entry.type === 'skill')
          .map(entry => entry.path),
      );

      const roots = [
        'agentic/code/frameworks',
        'agentic/code/addons',
        'agentic/code/extensions',
        'agentic/code/agents',
        'agentic/code/behaviors',
      ];
      const canonicalSkills = roots.flatMap(root =>
        walk(path.join(REPO_ROOT, root), file => path.basename(file) === 'SKILL.md'),
      );
      const missing = canonicalSkills.filter(file => !indexedSkillPaths.has(file));

      expect(missing).toEqual([]);
    } finally {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });

  it('does not advertise nested skill support markdown as standalone skills', async () => {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'aiwg-skill-support-'));
    try {
      const skillDir = path.join(
        tmpRoot,
        'agentic',
        'code',
        'addons',
        'demo-addon',
        'skills',
        'demo-skill',
      );
      fs.mkdirSync(path.join(skillDir, 'references'), { recursive: true });
      fs.writeFileSync(
        path.join(skillDir, 'SKILL.md'),
        '---\nname: demo-skill\ndescription: Demo skill\n---\n\n# Demo Skill\n',
        'utf8',
      );
      fs.writeFileSync(
        path.join(skillDir, 'references', 'guide.md'),
        '# Support Guide\n\nThis is reference material.\n',
        'utf8',
      );

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const consoleErrSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      await buildIndex(tmpRoot, {
        graph: 'framework',
        force: true,
        explicit: true,
        outputDir: tmpRoot,
      });
      consoleSpy.mockRestore();
      consoleErrSpy.mockRestore();

      const indexPath = path.join(
        tmpRoot,
        '.aiwg',
        '.index',
        'framework',
        'metadata.json',
      );
      const index: ArtifactIndex = JSON.parse(fs.readFileSync(indexPath, 'utf8'));

      expect(index.entries['agentic/code/addons/demo-addon/skills/demo-skill/SKILL.md']?.type)
        .toBe('skill');
      expect(index.entries['agentic/code/addons/demo-addon/skills/demo-skill/references/guide.md']?.type)
        .not.toBe('skill');
    } finally {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  });
});
