import { describe, it, expect } from 'vitest';
import { readFile, access } from 'fs/promises';
import { join } from 'path';
import { constants } from 'fs';

const SKILL_PATH = 'agentic/code/addons/aiwg-utils/skills/aiwg-guide';
const SKILL_FILE = join(SKILL_PATH, 'SKILL.md');
const ADDON_MANIFEST = 'agentic/code/addons/aiwg-utils/manifest.json';
const SKILLS_MANIFEST = 'agentic/code/addons/aiwg-utils/skills/manifest.json';

describe('aiwg-guide skill (#616)', () => {
  describe('skill file structure', () => {
    it('should exist at the expected path', async () => {
      await expect(access(SKILL_FILE, constants.F_OK)).resolves.toBeUndefined();
    });

    it('should have valid YAML frontmatter with required fields', async () => {
      const content = await readFile(SKILL_FILE, 'utf-8');
      expect(content).toMatch(/^---\n/);
      expect(content).toMatch(/\n---\n/);
      expect(content).toMatch(/description:/);
      expect(content).toMatch(/platforms:/);
      expect(content).toContain('claude-code');
    });

    it('should follow standard section ordering', async () => {
      const content = await readFile(SKILL_FILE, 'utf-8');
      const sections = [
        '## Triggers',
        '## Trigger Patterns Reference',
        '## Behavior',
        '## Examples',
        '## References',
      ];
      let lastIndex = -1;
      for (const section of sections) {
        const index = content.indexOf(section);
        expect(index, `missing section: ${section}`).toBeGreaterThan(lastIndex);
        lastIndex = index;
      }
    });

    it('should have numbered examples with User/Extraction/Action/Response', async () => {
      const content = await readFile(SKILL_FILE, 'utf-8');
      expect(content).toMatch(/### Example 1:/);
      expect(content).toMatch(/### Example 2:/);
      expect(content).toMatch(/\*\*User\*\*:/);
      expect(content).toMatch(/\*\*Extraction\*\*:/);
      expect(content).toMatch(/\*\*Action\*\*:/);
      expect(content).toMatch(/\*\*Response\*\*:/);
    });

    it('should use @$AIWG_ROOT/ reference convention', async () => {
      const content = await readFile(SKILL_FILE, 'utf-8');
      const refs = content.match(/@\$AIWG_ROOT\//g) || [];
      expect(refs.length).toBeGreaterThanOrEqual(3);
      // Must not use old .claude/ references
      expect(content).not.toMatch(/@\.claude\//);
    });
  });

  describe('default mode (what\'s new)', () => {
    it('should document version detection via aiwg version', async () => {
      const content = await readFile(SKILL_FILE, 'utf-8');
      expect(content).toContain('aiwg version');
    });

    it('should reference docs/releases/ for release announcements', async () => {
      const content = await readFile(SKILL_FILE, 'utf-8');
      expect(content).toContain('docs/releases/');
      expect(content).toMatch(/v\{version\}-announcement\.md/);
    });

    it('should define fallback behavior when announcement not found', async () => {
      const content = await readFile(SKILL_FILE, 'utf-8');
      expect(content).toMatch(/fallback/i);
      expect(content).toContain('CHANGELOG.md');
    });
  });

  describe('contextual help mode', () => {
    it('should define prioritized documentation sources', async () => {
      const content = await readFile(SKILL_FILE, 'utf-8');
      expect(content).toContain('docs/cli/reference.md');
      expect(content).toContain('docs/extensions/');
      expect(content).toContain('capability-matrix');
    });
  });

  describe('steward handoff', () => {
    it('should define handoff detection patterns in behavior', async () => {
      const content = await readFile(SKILL_FILE, 'utf-8');
      expect(content).toContain('aiwg list');
      expect(content).toContain('aiwg doctor');
      expect(content).toContain('aiwg status');
    });

    it('should describe transparent handoff', async () => {
      const content = await readFile(SKILL_FILE, 'utf-8');
      expect(content).toMatch(/transparent/i);
    });
  });

  describe('addon manifest registration', () => {
    it('should be listed in addon manifest skills array', async () => {
      const content = await readFile(ADDON_MANIFEST, 'utf-8');
      const manifest = JSON.parse(content);
      expect(manifest.skills).toContain('aiwg-guide');
    });

    it('should be registered in skills manifest with triggers', async () => {
      const content = await readFile(SKILLS_MANIFEST, 'utf-8');
      const manifest = JSON.parse(content);
      const entry = manifest.skills.find(
        (s: { name: string }) => s.name === 'aiwg-guide'
      );
      expect(entry).toBeDefined();
      expect(entry.description).toBeDefined();
      expect(entry.triggers).toBeDefined();
      expect(entry.triggers.length).toBeGreaterThan(0);
    });
  });
});
