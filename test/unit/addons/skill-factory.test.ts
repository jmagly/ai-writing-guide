import { describe, it, expect, beforeAll } from 'vitest';
import { readFile, access } from 'fs/promises';
import { join } from 'path';
import { constants } from 'fs';

const ADDON_PATH = 'agentic/code/addons/skill-factory';
const SKILLS = ['skill-builder', 'skill-enhancer', 'quality-checker', 'skill-packager'];
const AGENTS = ['skill-architect'];

describe('skill-factory addon', () => {
  describe('addon.json', () => {
    let addonConfig: Record<string, unknown>;

    beforeAll(async () => {
      const content = await readFile(join(ADDON_PATH, 'addon.json'), 'utf-8');
      addonConfig = JSON.parse(content);
    });

    it('should have complete and valid addon metadata', () => {
      expect(addonConfig.name).toBe('skill-factory');
      expect(addonConfig.version).toBeDefined();
      expect(addonConfig.description).toBeDefined();
      expect(addonConfig.skills).toEqual(expect.arrayContaining(SKILLS));
      expect(addonConfig.agents).toEqual(expect.arrayContaining(AGENTS));

      const compliance = addonConfig.researchCompliance as Record<string, string[]>;
      expect(compliance['REF-001']).toBeDefined();
      expect(compliance['REF-002']).toBeDefined();
    });
  });

  describe('skill structure validation', () => {
    it('all skills should exist and have valid structure', async () => {
      for (const skill of SKILLS) {
        const skillPath = join(ADDON_PATH, 'skills', skill, 'SKILL.md');
        await expect(access(skillPath, constants.F_OK)).resolves.toBeUndefined();
      }
    });

    it('all skills should have complete frontmatter and required sections', async () => {
      const requiredFrontmatter = [/name: /, /description: /, /tools: /];
      const requiredSections = [
        'Purpose',
        'BP-4',
        'Grounding Checkpoint',
        'Archetype 1',
        'Uncertainty Escalation',
        'Archetype 2',
        'Context Scope',
        'Archetype 3',
        'Recovery Protocol',
        'Archetype 4',
        'Checkpoint Support',
        '.aiwg/working/checkpoints/',
        'Configuration',
        'REF-001'
      ];

      for (const skill of SKILLS) {
        const skillPath = join(ADDON_PATH, 'skills', skill, 'SKILL.md');
        const content = await readFile(skillPath, 'utf-8');

        expect(content, `${skill}: missing frontmatter start`).toMatch(/^---\n/);

        for (const pattern of requiredFrontmatter) {
          expect(content, `${skill}: missing ${pattern}`).toMatch(pattern);
        }

        for (const section of requiredSections) {
          expect(content, `${skill}: missing "${section}"`).toContain(section);
        }

        expect(content, `${skill}: missing workflow steps`).toMatch(/### Step \d+:/);
        expect(content, `${skill}: missing code block`).toMatch(/```json/);
        expect(content, `${skill}: missing troubleshooting`).toMatch(/Troubleshooting|Troubleshoot/i);
        expect(content, `${skill}: missing research refs`).toMatch(/REF-001|REF-002/);
      }
    });
  });

  describe('agent structure validation', () => {
    it('all agents should exist and have complete structure', async () => {
      for (const agent of AGENTS) {
        const agentPath = join(ADDON_PATH, 'agents', `${agent}.md`);
        await expect(access(agentPath, constants.F_OK)).resolves.toBeUndefined();

        const content = await readFile(agentPath, 'utf-8');

        expect(content, `${agent}: missing frontmatter start`).toMatch(/^---\n/);
        expect(content, `${agent}: missing name`).toMatch(/name: /);
        expect(content, `${agent}: missing description`).toMatch(/description: /);
        expect(content, `${agent}: missing model`).toMatch(/model: /);
        expect(content, `${agent}: missing tools`).toMatch(/tools: /);
        expect(content, `${agent}: missing orchestration flag`).toContain('orchestration: true');
        expect(content, `${agent}: missing decision tree`).toContain('Decision Tree');
        expect(content, `${agent}: missing available skills`).toContain('Available Skills');

        for (const skill of SKILLS) {
          expect(content, `${agent}: missing skill reference ${skill}`).toContain(skill);
        }

        expect(content, `${agent}: missing workflow patterns`).toContain('Workflow Patterns');
        expect(content, `${agent}: missing quality gates`).toContain('Quality Gates');
        expect(content, `${agent}: missing example orchestration`).toContain('Example Orchestration');
        expect(content, `${agent}: missing archetype mitigations`).toContain('Archetype Mitigations');
      }
    });
  });

  describe('pipeline integration', () => {
    it('should define correct skill order in orchestrator', async () => {
      const agentPath = join(ADDON_PATH, 'agents', 'skill-architect.md');
      const content = await readFile(agentPath, 'utf-8');

      const buildIndex = content.indexOf('skill-builder');
      const enhanceIndex = content.indexOf('skill-enhancer');
      const checkIndex = content.indexOf('quality-checker');
      const packageIndex = content.indexOf('skill-packager');

      expect(buildIndex).toBeGreaterThan(-1);
      expect(enhanceIndex).toBeGreaterThan(-1);
      expect(checkIndex).toBeGreaterThan(-1);
      expect(packageIndex).toBeGreaterThan(-1);
    });
  });

  describe('evaluation plan', () => {
    const evalPath = join(ADDON_PATH, 'EVALUATION.md');

    it('should have evaluation plan with all required sections', async () => {
      await expect(access(evalPath, constants.F_OK)).resolves.toBeUndefined();

      const content = await readFile(evalPath, 'utf-8');

      for (const skill of SKILLS) {
        expect(content, `missing ${skill} in eval plan`).toContain(skill);
      }

      expect(content, 'missing end-to-end test').toContain('End-to-End Pipeline Test');
      expect(content, 'missing quality gates').toContain('Quality Gates');
      expect(content, 'missing archetype checklist').toContain('Archetype Mitigation Checklist');
    });
  });
});
