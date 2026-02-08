import { describe, it, expect, beforeAll } from 'vitest';
import { readFile, access } from 'fs/promises';
import { join } from 'path';
import { constants } from 'fs';

const ADDON_PATH = 'agentic/code/addons/doc-intelligence';
const SKILLS = ['doc-scraper', 'pdf-extractor', 'llms-txt-support', 'source-unifier', 'doc-splitter'];
const AGENTS = ['doc-analyst'];

describe('doc-intelligence addon', () => {
  describe('addon.json', () => {
    let addonConfig: Record<string, unknown>;

    beforeAll(async () => {
      const content = await readFile(join(ADDON_PATH, 'addon.json'), 'utf-8');
      addonConfig = JSON.parse(content);
    });

    it('should have valid addon metadata', () => {
      expect(addonConfig.name).toBe('doc-intelligence');
      expect(addonConfig.version).toBeDefined();
      expect(addonConfig.description).toBeDefined();
    });

    it('should declare all skills', () => {
      expect(addonConfig.skills).toEqual(expect.arrayContaining(SKILLS));
    });

    it('should declare all agents', () => {
      expect(addonConfig.agents).toEqual(expect.arrayContaining(AGENTS));
    });

    it('should declare research compliance', () => {
      const compliance = addonConfig.researchCompliance as Record<string, string[]>;
      expect(compliance['REF-001']).toBeDefined();
      expect(compliance['REF-002']).toBeDefined();
    });
  });

  describe('skill structure validation', () => {
    it('should have SKILL.md files for all skills', async () => {
      await Promise.all(SKILLS.map(async (skill) => {
        const skillPath = join(ADDON_PATH, 'skills', skill, 'SKILL.md');
        await expect(access(skillPath, constants.F_OK)).resolves.toBeUndefined();
      }));
    });

    it('should have valid frontmatter in all skills', async () => {
      const requiredFields = ['name: ', 'description: ', 'tools: '];

      await Promise.all(SKILLS.map(async (skill) => {
        const skillPath = join(ADDON_PATH, 'skills', skill, 'SKILL.md');
        const content = await readFile(skillPath, 'utf-8');

        expect(content).toMatch(/^---\n/);
        requiredFields.forEach(field => {
          expect(content, `${skill} missing "${field}"`).toContain(field);
        });
      }));
    });

    it('should have all required archetype sections', async () => {
      const requiredSections = [
        { name: 'Grounding Checkpoint', marker: 'Archetype 1' },
        { name: 'Uncertainty Escalation', marker: 'Archetype 2' },
        { name: 'Context Scope', marker: 'Archetype 3' },
        { name: 'Recovery Protocol', marker: 'Archetype 4' }
      ];

      await Promise.all(SKILLS.map(async (skill) => {
        const skillPath = join(ADDON_PATH, 'skills', skill, 'SKILL.md');
        const content = await readFile(skillPath, 'utf-8');

        requiredSections.forEach(({ name, marker }) => {
          expect(content, `${skill} missing section "${name}"`).toContain(name);
          expect(content, `${skill} missing marker "${marker}"`).toContain(marker);
        });
      }));
    });

    it('should have checkpoint support section', async () => {
      await Promise.all(SKILLS.map(async (skill) => {
        const skillPath = join(ADDON_PATH, 'skills', skill, 'SKILL.md');
        const content = await readFile(skillPath, 'utf-8');

        expect(content, `${skill} missing Checkpoint Support`).toContain('Checkpoint Support');
        expect(content, `${skill} missing checkpoint path`).toContain('.aiwg/working/checkpoints/');
      }));
    });

    it('should have workflow steps, code examples, and research references', async () => {
      await Promise.all(SKILLS.map(async (skill) => {
        const skillPath = join(ADDON_PATH, 'skills', skill, 'SKILL.md');
        const content = await readFile(skillPath, 'utf-8');

        expect(content, `${skill} missing workflow steps`).toMatch(/### Step \d+:/);
        expect(content, `${skill} missing code examples`).toMatch(/```(bash|python|json|markdown)/);
        expect(content, `${skill} missing research references`).toMatch(/REF-001|REF-002/);
      }));
    });
  });

  describe('agent structure validation', () => {
    it('should have agent files', async () => {
      await Promise.all(AGENTS.map(async (agent) => {
        const agentPath = join(ADDON_PATH, 'agents', `${agent}.md`);
        await expect(access(agentPath, constants.F_OK)).resolves.toBeUndefined();
      }));
    });

    it('should have valid frontmatter and required fields', async () => {
      const requiredFields = ['name: ', 'description: ', 'model: ', 'tools: '];

      await Promise.all(AGENTS.map(async (agent) => {
        const agentPath = join(ADDON_PATH, 'agents', `${agent}.md`);
        const content = await readFile(agentPath, 'utf-8');

        expect(content, `${agent} missing frontmatter start`).toMatch(/^---\n/);
        requiredFields.forEach(field => {
          expect(content, `${agent} missing "${field}"`).toContain(field);
        });
        expect(content, `${agent} not marked as orchestrator`).toContain('orchestration: true');
      }));
    });

    it('should have required agent sections', async () => {
      const requiredSections = [
        'Decision Tree',
        'Available Skills',
        'Workflow Patterns',
        'Archetype Mitigations'
      ];

      await Promise.all(AGENTS.map(async (agent) => {
        const agentPath = join(ADDON_PATH, 'agents', `${agent}.md`);
        const content = await readFile(agentPath, 'utf-8');

        requiredSections.forEach(section => {
          expect(content, `${agent} missing section "${section}"`).toContain(section);
        });
      }));
    });
  });

  describe('evaluation plan', () => {
    const evalPath = join(ADDON_PATH, 'EVALUATION.md');

    it('should have evaluation plan', async () => {
      await expect(access(evalPath, constants.F_OK)).resolves.toBeUndefined();
    });

    it('should define test scenarios for all skills', async () => {
      const content = await readFile(evalPath, 'utf-8');

      SKILLS.forEach(skill => {
        expect(content, `EVALUATION.md missing skill "${skill}"`).toContain(skill);
      });
    });

    it('should have quality gates and compliance checklist', async () => {
      const content = await readFile(evalPath, 'utf-8');
      expect(content).toContain('Quality Gates');
      expect(content).toContain('Archetype Mitigation Checklist');
    });
  });
});
