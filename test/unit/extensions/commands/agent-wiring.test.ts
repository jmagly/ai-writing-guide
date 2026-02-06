/**
 * Unit tests for agent schema wiring verification
 *
 * Ensures cost and reproducibility schemas are properly referenced
 * in agent definitions per the anti-pattern prevention rules.
 *
 * @source @.claude/agents/metrics-analyst.md
 * @source @.claude/agents/reliability-engineer.md
 * @source @.claude/agents/debugger.md
 * @issues #130, #112, #113, #114, #115
 */

import { describe, it, expect } from 'vitest';
import { readFile } from 'fs/promises';
import { join } from 'path';

const AGENTS_PATH = '.claude/agents';

describe('Agent Schema Wiring - Cost', () => {
  const agentPath = join(AGENTS_PATH, 'metrics-analyst.md');

  it('should have References section', async () => {
    const content = await readFile(agentPath, 'utf-8');
    expect(content).toContain('## Schema References');
  });

  it('should reference cost-tracking schema', async () => {
    const content = await readFile(agentPath, 'utf-8');
    expect(content).toContain('@agentic/code/frameworks/sdlc-complete/schemas/flows/cost-tracking.yaml');
  });

  it('should reference hitl-cost-tracking schema', async () => {
    const content = await readFile(agentPath, 'utf-8');
    expect(content).toContain('@agentic/code/frameworks/sdlc-complete/schemas/flows/hitl-cost-tracking.yaml');
  });

  it('should reference token-efficiency schema', async () => {
    const content = await readFile(agentPath, 'utf-8');
    expect(content).toContain('@agentic/code/frameworks/sdlc-complete/schemas/flows/token-efficiency.yaml');
  });

  it('should reference agent-efficiency schema', async () => {
    const content = await readFile(agentPath, 'utf-8');
    expect(content).toContain('@agentic/code/frameworks/sdlc-complete/schemas/flows/agent-efficiency.yaml');
  });

  it('should have Cost & Efficiency Tracking section', async () => {
    const content = await readFile(agentPath, 'utf-8');
    expect(content).toContain('## Cost & Efficiency Tracking');
  });
});

describe('Agent Schema Wiring - Reproducibility', () => {
  describe('reliability-engineer.md', () => {
    const agentPath = join(AGENTS_PATH, 'reliability-engineer.md');

    it('should have References section', async () => {
      const content = await readFile(agentPath, 'utf-8');
      expect(content).toContain('## Schema References');
    });

    it('should reference reproducibility-framework schema', async () => {
      const content = await readFile(agentPath, 'utf-8');
      expect(content).toContain('@agentic/code/frameworks/sdlc-complete/schemas/flows/reproducibility-framework.yaml');
    });

    it('should reference execution-mode schema', async () => {
      const content = await readFile(agentPath, 'utf-8');
      expect(content).toContain('@agentic/code/frameworks/sdlc-complete/schemas/flows/execution-mode.yaml');
    });

    it('should reference execution-snapshot schema', async () => {
      const content = await readFile(agentPath, 'utf-8');
      expect(content).toContain('@agentic/code/frameworks/sdlc-complete/schemas/flows/execution-snapshot.yaml');
    });

    it('should reference checkpoint schema', async () => {
      const content = await readFile(agentPath, 'utf-8');
      expect(content).toContain('@agentic/code/addons/ralph/schemas/checkpoint.yaml');
    });

    it('should have Reproducibility & Execution Modes section', async () => {
      const content = await readFile(agentPath, 'utf-8');
      expect(content).toContain('## Reproducibility & Execution Modes');
    });

    it('should have reproducibility checks', async () => {
      const content = await readFile(agentPath, 'utf-8');
      expect(content).toContain('Reproducibility validation');
    });
  });

  describe('debugger.md', () => {
    const agentPath = join(AGENTS_PATH, 'debugger.md');

    it('should have References section', async () => {
      const content = await readFile(agentPath, 'utf-8');
      expect(content).toContain('## Schema References');
    });

    it('should reference debug-provenance schema', async () => {
      const content = await readFile(agentPath, 'utf-8');
      expect(content).toContain('@agentic/code/frameworks/sdlc-complete/schemas/flows/debug-provenance.yaml');
    });

    it('should reference reproducibility-framework schema', async () => {
      const content = await readFile(agentPath, 'utf-8');
      expect(content).toContain('@agentic/code/frameworks/sdlc-complete/schemas/flows/reproducibility-framework.yaml');
    });

    it('should reference reliability-patterns schema', async () => {
      const content = await readFile(agentPath, 'utf-8');
      expect(content).toContain('@agentic/code/frameworks/sdlc-complete/schemas/flows/reliability-patterns.yaml');
    });

    it('should reference checkpoint schema', async () => {
      const content = await readFile(agentPath, 'utf-8');
      expect(content).toContain('@agentic/code/addons/ralph/schemas/checkpoint.yaml');
    });
  });
});
