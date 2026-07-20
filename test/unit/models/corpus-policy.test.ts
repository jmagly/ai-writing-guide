import fs from 'node:fs';
import path from 'node:path';
import { globSync } from 'glob';
import { load as loadYaml } from 'js-yaml';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../../..');
const allowlist = JSON.parse(fs.readFileSync(
  path.join(ROOT, 'agentic/code/providers/premium-model-allowlist.v1.json'),
  'utf8',
));
const evaluations = JSON.parse(fs.readFileSync(
  path.join(ROOT, 'agentic/code/providers/model-policy-evaluations.v1.json'),
  'utf8',
));
const agentFiles = globSync([
  'agentic/code/{frameworks,addons,extensions}/*/agents/*.md',
  'agentic/code/frameworks/*/extensions/*/agents/*.md',
  'agentic/code/plugins/*/agents/*.md',
], { cwd: ROOT, absolute: true, nodir: true }).filter(file => !file.endsWith('.soul.md'));
const skillFiles = globSync([
  'agentic/code/{frameworks,addons,extensions}/*/skills/*/SKILL.md',
  'agentic/code/frameworks/*/extensions/*/skills/*/SKILL.md',
  'agentic/code/plugins/*/skills/*/SKILL.md',
], { cwd: ROOT, absolute: true, nodir: true }).filter(file => /^\s+model:/m.test(fs.readFileSync(file, 'utf8')));

interface Policy {
  kind: 'agent' | 'skill';
  name: string;
  role: string;
  tier: string;
  model: string;
  rationale?: string;
  file: string;
}
function parse(file: string, kind: 'agent' | 'skill'): Policy | null {
  const raw = fs.readFileSync(file, 'utf8');
  const match = raw.match(/^---\n([\s\S]*?)\n---/);
  const name = kind === 'agent' ? path.basename(file, '.md') : path.basename(path.dirname(file));
  if (!match) {
    expect(allowlist.exemptions[`${kind}s`][name], `${name} must have an approved exemption`)
      .toBeTruthy();
    return null;
  }
  const metadata = loadYaml(match[1]) as Record<string, any>;
  const source = kind === 'skill' ? metadata.commandHint : metadata;
  return {
    kind,
    name,
    role: source?.modelRole ?? source?.['model-role'],
    tier: source?.modelTier ?? source?.['model-tier'],
    model: source?.model,
    rationale: source?.modelRationale ?? source?.['model-rationale'],
    file,
  };
}
const policies = [
  ...agentFiles.map(file => parse(file, 'agent')),
  ...skillFiles.map(file => parse(file, 'skill')),
].filter((value): value is Policy => value !== null);

describe('cheap-first canonical corpus policy', () => {
  it('inventories each unique artifact once and keeps duplicate policy consistent', () => {
    expect(policies.length).toBeGreaterThan(300);
    const unique = new Map<string, Policy>();
    for (const policy of policies) {
      const key = `${policy.kind}:${policy.name}`;
      const previous = unique.get(key);
      if (previous) {
        expect(
          { role: policy.role, tier: policy.tier, model: policy.model, rationale: policy.rationale },
          `${key} differs between ${previous.file} and ${policy.file}`,
        ).toEqual({
          role: previous.role,
          tier: previous.tier,
          model: previous.model,
          rationale: previous.rationale,
        });
      } else unique.set(key, policy);
    }
    expect(unique.size).toBeGreaterThan(300);
  });

  it('gives every governed artifact valid provider-neutral policy', () => {
    for (const policy of policies) {
      expect(['reasoning', 'coding', 'efficiency'], policy.file).toContain(policy.role);
      expect(['economy', 'standard', 'premium'], policy.file).toContain(policy.tier);
      expect(['haiku', 'sonnet', 'opus'], policy.file).toContain(policy.model);
      expect(policy.model, policy.file).not.toMatch(/(?:claude-|gpt-|^[^/]+\/[^/]+)/i);
    }
  });

  it('keeps a strict majority and at least 60% of defaults at economy', () => {
    const unique = new Map(policies.map(policy => [`${policy.kind}:${policy.name}`, policy]));
    const economy = [...unique.values()].filter(policy => policy.tier === 'economy').length;
    const share = economy / unique.size;
    expect(share).toBeGreaterThan(0.5);
    expect(share).toBeGreaterThanOrEqual(0.6);
  });

  it('restricts premium policy to the reviewed rationale allowlist', () => {
    for (const policy of policies.filter(value => value.tier === 'premium')) {
      const rationale = allowlist[`${policy.kind}s`][policy.name];
      expect(rationale, `${policy.kind}:${policy.name} is not allowlisted`).toBeTruthy();
      expect(policy.rationale).toBe(rationale);
    }
  });

  it('records passing representative evaluations for all three tiers', () => {
    expect(evaluations.method).toContain('Deterministic representative-fixture rubric');
    expect(new Set(evaluations.cases.map((item: any) => item.tier))).toEqual(
      new Set(['economy', 'standard', 'premium']),
    );
    const unique = new Map(policies.map(policy => [`${policy.kind}:${policy.name}`, policy]));
    for (const evaluation of evaluations.cases) {
      expect(evaluation.score).toBeGreaterThanOrEqual(evaluations.threshold);
      expect(evaluation.checks.length).toBeGreaterThanOrEqual(4);
      expect(unique.get(`${evaluation.kind}:${evaluation.artifact}`)?.tier).toBe(evaluation.tier);
    }
  });
});
