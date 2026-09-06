import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('research and planning contracts', () => {
  it('covers packets, budgets, resets, persistence, and provider adapters', () => {
    const doc = read('docs/context-engineering-contract.md');
    for (const value of ['Research induction', 'Research synthesis', 'Issue planning', 'SDLC planning', '70%', '85%', '95%', 'Claude Code', 'Codex', 'Generic fallback', 'artifact corpus']) expect(doc).toContain(value);
  });

  it('defines pass, fail, missing, and documentary checks in the schema', () => {
    const schema = JSON.parse(read('agentic/code/frameworks/sdlc-complete/schemas/verification-contract.schema.json'));
    expect(schema.required).toEqual(['expected_artifacts', 'checks', 'completion_evidence']);
    expect(schema.properties.checks.minItems).toBe(1);
    expect(schema.properties.checks.items.properties.kind.enum).toEqual(['command', 'documentary', 'review']);
    expect(schema.properties.completion_evidence.items.properties.status.enum).toEqual(['pass', 'fail', 'missing']);
  });

  it('covers decision dimensions, human roles, and four scenarios', () => {
    const doc = read('docs/autonomy-and-human-roles.md');
    for (const value of ['ambiguity', 'reversibility', 'architectural consequence', 'familiarity', 'testability', 'data sensitivity', 'external side effects', 'Autonomous', 'Supervised', 'Interactive', 'Human-owned', 'Director', 'Operator', 'Reviewer', 'generated index', 'cross-service architecture', 'research synthesis', 'Publishing, deploying']) expect(doc).toContain(value);
  });

  it('links contracts from research, planning, model routing, and loops', () => {
    expect(read('agentic/code/frameworks/research-complete/skills/induct-research/SKILL.md')).toContain('verification contract');
    expect(read('agentic/code/frameworks/sdlc-complete/skills/issue-planner/SKILL.md')).toContain('autonomy and human roles');
    expect(read('docs/models/hybrid-architectures.md')).toContain('autonomy classification');
    expect(read('agentic/code/addons/agent-loop/README.md')).toContain('cannot override human-owned');
  });
});
