import { describe, it, expect, beforeAll } from 'vitest';
import { readFile, access, readdir } from 'fs/promises';
import { join } from 'path';
import { constants } from 'fs';

const EXTENSIONS_PATH = 'agentic/code/frameworks/sdlc-complete/extensions';

interface Extension {
  name: string;
  type: string;
  skills: string[];
  agents: string[];
}

const EXTENSIONS: Record<string, { skills: string[]; agents: string[] }> = {
  python: {
    skills: ['pytest-runner', 'venv-manager'],
    agents: ['python-quality-lead'],
  },
  javascript: {
    skills: ['vitest-runner', 'eslint-checker'],
    agents: ['js-quality-lead'],
  },
  github: {
    skills: ['repo-analyzer', 'pr-reviewer'],
    agents: ['github-integration-lead'],
  },
};

describe('SDLC Extensions', () => {
  describe('extension structure', () => {
    for (const [extName, extConfig] of Object.entries(EXTENSIONS)) {
      describe(`${extName} extension`, () => {
        const extPath = join(EXTENSIONS_PATH, extName);

        describe('extension.json', () => {
          let extensionConfig: Extension;

          beforeAll(async () => {
            const content = await readFile(join(extPath, 'extension.json'), 'utf-8');
            extensionConfig = JSON.parse(content);
          });

          it('should have valid extension metadata', () => {
            expect(extensionConfig.name).toBe(extName);
            expect(extensionConfig.type).toBeDefined();
          });

          it('should declare skills', () => {
            expect(extensionConfig.skills).toBeDefined();
            expect(Array.isArray(extensionConfig.skills)).toBe(true);
          });

          it('should declare agents', () => {
            expect(extensionConfig.agents).toBeDefined();
            expect(Array.isArray(extensionConfig.agents)).toBe(true);
          });

          it('should have research compliance', async () => {
            const content = await readFile(join(extPath, 'extension.json'), 'utf-8');
            const config = JSON.parse(content);
            expect(config.researchCompliance).toBeDefined();
            expect(config.researchCompliance['REF-001']).toBeDefined();
            expect(config.researchCompliance['REF-002']).toBeDefined();
          });
        });

        describe('skills', () => {
          for (const skill of extConfig.skills) {
            describe(`${skill}`, () => {
              const skillPath = join(extPath, 'skills', skill, 'SKILL.md');

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

              it('should have Grounding Checkpoint', async () => {
                const content = await readFile(skillPath, 'utf-8');
                expect(content).toContain('Grounding Checkpoint');
              });

              it('should have Recovery Protocol', async () => {
                const content = await readFile(skillPath, 'utf-8');
                expect(content).toContain('Recovery Protocol');
              });

              it('should have Checkpoint Support', async () => {
                const content = await readFile(skillPath, 'utf-8');
                expect(content).toContain('Checkpoint Support');
              });

              it('should have workflow steps', async () => {
                const content = await readFile(skillPath, 'utf-8');
                expect(content).toMatch(/### Step \d+:/);
              });
            });
          }
        });

        describe('agents', () => {
          for (const agent of extConfig.agents) {
            describe(`${agent}`, () => {
              const agentPath = join(extPath, 'agents', `${agent}.md`);

              it('should have agent file', async () => {
                await expect(access(agentPath, constants.F_OK)).resolves.toBeUndefined();
              });

              it('should have valid frontmatter', async () => {
                const content = await readFile(agentPath, 'utf-8');
                expect(content).toMatch(/^---\n/);
                expect(content).toMatch(/name: /);
                expect(content).toMatch(/orchestration: true/);
              });

              it('should have decision tree', async () => {
                const content = await readFile(agentPath, 'utf-8');
                expect(content).toContain('Decision Tree');
              });

              it('should have workflow patterns', async () => {
                const content = await readFile(agentPath, 'utf-8');
                expect(content).toContain('Workflow Patterns');
              });

              it('should have quality gates', async () => {
                const content = await readFile(agentPath, 'utf-8');
                expect(content).toContain('Quality Gates');
              });
            });
          }
        });
      });
    }
  });

  describe('evaluation plan', () => {
    const evalPath = join(EXTENSIONS_PATH, 'EVALUATION.md');

    it('should have evaluation plan', async () => {
      await expect(access(evalPath, constants.F_OK)).resolves.toBeUndefined();
    });

    it('should cover all extensions', async () => {
      const content = await readFile(evalPath, 'utf-8');
      for (const extName of Object.keys(EXTENSIONS)) {
        expect(content.toLowerCase()).toContain(extName);
      }
    });

    it('should have compliance validation', async () => {
      const content = await readFile(evalPath, 'utf-8');
      expect(content).toContain('Research Compliance');
    });

    it('should have test scenarios', async () => {
      const content = await readFile(evalPath, 'utf-8');
      expect(content).toContain('Test Case');
    });
  });

  describe('cross-extension consistency', () => {
    it('should have consistent skill structure across extensions', async () => {
      for (const [extName, extConfig] of Object.entries(EXTENSIONS)) {
        for (const skill of extConfig.skills) {
          const skillPath = join(EXTENSIONS_PATH, extName, 'skills', skill, 'SKILL.md');
          const content = await readFile(skillPath, 'utf-8');

          // All skills should have these sections
          expect(content).toContain('## Purpose');
          expect(content).toContain('Grounding Checkpoint');
          expect(content).toContain('Uncertainty Escalation');
          expect(content).toContain('Context Scope');
          expect(content).toContain('Recovery Protocol');
          expect(content).toContain('Checkpoint Support');
        }
      }
    });

    it('should have consistent agent structure across extensions', async () => {
      for (const [extName, extConfig] of Object.entries(EXTENSIONS)) {
        for (const agent of extConfig.agents) {
          const agentPath = join(EXTENSIONS_PATH, extName, 'agents', `${agent}.md`);
          const content = await readFile(agentPath, 'utf-8');

          // All agents should have these sections
          expect(content).toContain('## Role');
          expect(content).toContain('Available Skills');
          expect(content).toContain('Decision Tree');
          expect(content).toContain('Workflow Patterns');
          expect(content).toContain('Quality Gates');
        }
      }
    });
  });
});

describe('Python Extension specific', () => {
  const extPath = join(EXTENSIONS_PATH, 'python');

  it('should support Python-specific configuration', async () => {
    const content = await readFile(join(extPath, 'extension.json'), 'utf-8');
    const config = JSON.parse(content);

    expect(config.configuration).toBeDefined();
    expect(config.configuration.defaultTestFramework).toBe('pytest');
    expect(config.configuration.pythonVersions).toContain('3.11');
  });

  it('pytest-runner should have Python-specific commands', async () => {
    const skillPath = join(extPath, 'skills', 'pytest-runner', 'SKILL.md');
    const content = await readFile(skillPath, 'utf-8');

    expect(content).toContain('python -m pytest');
    expect(content).toContain('--cov');
    expect(content).toContain('VIRTUAL_ENV');
  });

  it('venv-manager should handle venv lifecycle', async () => {
    const skillPath = join(extPath, 'skills', 'venv-manager', 'SKILL.md');
    const content = await readFile(skillPath, 'utf-8');

    expect(content).toContain('python3 -m venv');
    expect(content).toContain('activate');
    expect(content).toContain('pip install');
  });
});

describe('JavaScript Extension specific', () => {
  const extPath = join(EXTENSIONS_PATH, 'javascript');

  it('should support JavaScript-specific configuration', async () => {
    const content = await readFile(join(extPath, 'extension.json'), 'utf-8');
    const config = JSON.parse(content);

    expect(config.configuration).toBeDefined();
    expect(config.configuration.defaultTestFramework).toBe('vitest');
    expect(config.configuration.supportedRuntimes).toContain('node');
  });

  it('vitest-runner should have Vitest-specific commands', async () => {
    const skillPath = join(extPath, 'skills', 'vitest-runner', 'SKILL.md');
    const content = await readFile(skillPath, 'utf-8');

    expect(content).toContain('npx vitest');
    expect(content).toContain('--coverage');
    expect(content).toContain('vitest.config');
  });

  it('eslint-checker should handle ESLint operations', async () => {
    const skillPath = join(extPath, 'skills', 'eslint-checker', 'SKILL.md');
    const content = await readFile(skillPath, 'utf-8');

    expect(content).toContain('npx eslint');
    expect(content).toContain('--fix');
    expect(content).toContain('eslint.config');
  });
});

describe('GitHub Extension specific', () => {
  const extPath = join(EXTENSIONS_PATH, 'github');

  it('should require gh CLI', async () => {
    const content = await readFile(join(extPath, 'extension.json'), 'utf-8');
    const config = JSON.parse(content);

    expect(config.configuration.requireGhCli).toBe(true);
  });

  it('repo-analyzer should use gh CLI commands', async () => {
    const skillPath = join(extPath, 'skills', 'repo-analyzer', 'SKILL.md');
    const content = await readFile(skillPath, 'utf-8');

    expect(content).toContain('gh repo view');
    expect(content).toContain('gh api');
    expect(content).toContain('gh auth status');
  });

  it('pr-reviewer should handle PR operations', async () => {
    const skillPath = join(extPath, 'skills', 'pr-reviewer', 'SKILL.md');
    const content = await readFile(skillPath, 'utf-8');

    expect(content).toContain('gh pr view');
    expect(content).toContain('gh pr review');
    expect(content).toContain('gh pr diff');
  });
});
