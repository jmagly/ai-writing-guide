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
    for (const skill of SKILLS) {
      describe(`${skill} skill`, () => {
        const skillPath = join(ADDON_PATH, 'skills', skill, 'SKILL.md');

        it('should have SKILL.md file', async () => {
          await expect(access(skillPath, constants.F_OK)).resolves.toBeUndefined();
        });

        it('should have valid frontmatter', async () => {
          const content = await readFile(skillPath, 'utf-8');
          expect(content).toMatch(/^---\n/);
          expect(content).toMatch(/name: /);
          expect(content).toMatch(/description: /);
          expect(content).toMatch(/tools: /);
        });

        it('should have Grounding Checkpoint section', async () => {
          const content = await readFile(skillPath, 'utf-8');
          expect(content).toContain('Grounding Checkpoint');
          expect(content).toContain('Archetype 1');
        });

        it('should have Uncertainty Escalation section', async () => {
          const content = await readFile(skillPath, 'utf-8');
          expect(content).toContain('Uncertainty Escalation');
          expect(content).toContain('Archetype 2');
        });

        it('should have Context Scope section', async () => {
          const content = await readFile(skillPath, 'utf-8');
          expect(content).toContain('Context Scope');
          expect(content).toContain('Archetype 3');
        });

        it('should have Recovery Protocol section', async () => {
          const content = await readFile(skillPath, 'utf-8');
          expect(content).toContain('Recovery Protocol');
          expect(content).toContain('Archetype 4');
        });

        it('should have Checkpoint Support section', async () => {
          const content = await readFile(skillPath, 'utf-8');
          expect(content).toContain('Checkpoint Support');
          expect(content).toContain('.aiwg/working/checkpoints/');
        });

        it('should have workflow steps', async () => {
          const content = await readFile(skillPath, 'utf-8');
          expect(content).toMatch(/### Step \d+:/);
        });

        it('should have code examples', async () => {
          const content = await readFile(skillPath, 'utf-8');
          expect(content).toMatch(/```(bash|python|json|markdown)/);
        });

        it('should reference research papers', async () => {
          const content = await readFile(skillPath, 'utf-8');
          expect(content).toMatch(/REF-001|REF-002/);
        });
      });
    }
  });

  describe('agent structure validation', () => {
    for (const agent of AGENTS) {
      describe(`${agent} agent`, () => {
        const agentPath = join(ADDON_PATH, 'agents', `${agent}.md`);

        it('should have agent file', async () => {
          await expect(access(agentPath, constants.F_OK)).resolves.toBeUndefined();
        });

        it('should have valid frontmatter', async () => {
          const content = await readFile(agentPath, 'utf-8');
          expect(content).toMatch(/^---\n/);
          expect(content).toMatch(/name: /);
          expect(content).toMatch(/description: /);
          expect(content).toMatch(/model: /);
          expect(content).toMatch(/tools: /);
        });

        it('should be marked as orchestrator', async () => {
          const content = await readFile(agentPath, 'utf-8');
          expect(content).toContain('orchestration: true');
        });

        it('should have decision tree', async () => {
          const content = await readFile(agentPath, 'utf-8');
          expect(content).toContain('Decision Tree');
        });

        it('should list available skills', async () => {
          const content = await readFile(agentPath, 'utf-8');
          expect(content).toContain('Available Skills');
        });

        it('should have workflow patterns', async () => {
          const content = await readFile(agentPath, 'utf-8');
          expect(content).toContain('Workflow Patterns');
        });

        it('should reference archetype mitigations', async () => {
          const content = await readFile(agentPath, 'utf-8');
          expect(content).toContain('Archetype Mitigations');
        });
      });
    }
  });

  describe('evaluation plan', () => {
    const evalPath = join(ADDON_PATH, 'EVALUATION.md');

    it('should have evaluation plan', async () => {
      await expect(access(evalPath, constants.F_OK)).resolves.toBeUndefined();
    });

    it('should define test scenarios for all skills', async () => {
      const content = await readFile(evalPath, 'utf-8');
      for (const skill of SKILLS) {
        expect(content).toContain(skill);
      }
    });

    it('should have quality gates', async () => {
      const content = await readFile(evalPath, 'utf-8');
      expect(content).toContain('Quality Gates');
    });

    it('should have compliance checklist', async () => {
      const content = await readFile(evalPath, 'utf-8');
      expect(content).toContain('Archetype Mitigation Checklist');
    });
  });
});
