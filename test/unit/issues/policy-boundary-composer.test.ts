import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  executeIssuePlan,
  planIssueDraft,
} from '../../../tools/issues/policy-boundary-composer.mjs';

const SELF_REJECTION_FIXTURE = JSON.parse(readFileSync(fileURLToPath(
  new URL('../../fixtures/issues/policy-boundary-self-rejection.json', import.meta.url),
), 'utf8'));

function adapter(route, options = {}) {
  const issues = [];
  let createCalls = 0;
  let updateFailed = false;
  return {
    route,
    issues,
    async findByMarker(marker) {
      return issues.find((issue) => issue.body.includes(marker)) ?? null;
    },
    async create(draft) {
      createCalls += 1;
      if (options.failAtCall === createCalls) throw new Error(`${route} simulated write failure`);
      const issue = {
        id: `${route}-${issues.length + 1}`,
        reference: route === 'local' ? `ISSUE-${issues.length + 1}` : `#${issues.length + 1}`,
        ...draft,
      };
      issues.push(issue);
      return issue;
    },
    async update(issue, patch) {
      if (options.failUpdateOnce && !updateFailed) {
        updateFailed = true;
        throw new Error(`${route} simulated linking failure`);
      }
      Object.assign(issue, patch);
    },
  };
}

describe('policy-boundary-aware issue composition (#2072)', () => {
  it('keeps safe drafts atomic', () => {
    const plan = planIssueDraft({
      title: 'Improve empty-state copy',
      body: 'Clarify the empty-state explanation and add review criteria.',
      labels: ['documentation'],
    });
    expect(plan.disposition).toBe('single');
    expect(plan.segments).toHaveLength(1);
    expect(plan.segments[0].labels).toEqual(['documentation']);
  });

  it('preserves the existing authorization gate for flagged drafts', async () => {
    const plan = planIssueDraft({
      title: 'Refresh provider instructions',
      body: 'Update AGENTS.md for the new project bootstrap.',
    });
    expect(plan.disposition).toBe('authorization-required');
    const target = adapter('gitea');
    expect(await executeIssuePlan(plan, target)).toMatchObject({ status: 'authorization-required', created: [] });
    expect(target.issues).toHaveLength(0);
  });

  it('segments the original self-rejection class with complete coverage and labels', () => {
    const plan = planIssueDraft(SELF_REJECTION_FIXTURE);
    expect(plan.disposition).toBe('split-authorization-required');
    expect(plan.blockingRule).toBe('mandatory:supply-chain-execution-combination');
    expect(plan.segments.map((segment) => segment.segmentKey)).toEqual([
      'acquisition-documentation',
      'protected-instruction-surface',
    ]);
    expect(plan.segments.every((segment) => segment.assessment.decision.action !== 'reject')).toBe(true);
    expect(plan.segments.every((segment) => segment.labels.includes('priority:P1-high'))).toBe(true);
    const combined = plan.segments.map((segment) => segment.body).join('\n');
    expect(combined).toContain('npm install -g aiwg');
    expect(combined).toContain('AGENTS.md');
    expect(combined).toContain('Package setup is documented.');
    expect(combined).toContain('Provider wiring is current.');
  });

  it('blocks a rejected draft that cannot be separated without rewriting intent', () => {
    const plan = planIssueDraft({
      title: 'Combined setup mutation',
      body: 'Run npm install -g aiwg and then rewrite AGENTS.md in the same indivisible operation.',
    });
    expect(plan.disposition).toBe('blocked');
    expect(plan.segments).toHaveLength(0);
    expect(plan.blockingRule).toBe('mandatory:supply-chain-execution-combination');
    expect(plan.suggestedSegments).toHaveLength(2);
  });

  it.each(['gitea', 'github', 'local'])('creates and cross-links split issues through the %s route', async (route) => {
    const plan = planIssueDraft(SELF_REJECTION_FIXTURE);
    const target = adapter(route);
    const result = await executeIssuePlan(plan, target, { authorizationDigest: plan.digest });
    expect(result.status).toBe('created');
    expect(target.issues).toHaveLength(2);
    expect(target.issues[0].body).toContain(target.issues[1].reference);
    expect(target.issues[1].body).toContain(`Depends on: ${target.issues[0].reference}`);
    expect(target.issues.every((issue) => issue.labels.includes('documentation'))).toBe(true);
  });

  it('recovers a partial split by marker without duplicating the first issue', async () => {
    const plan = planIssueDraft(SELF_REJECTION_FIXTURE);
    const target = adapter('gitea', { failAtCall: 2 });
    const first = await executeIssuePlan(plan, target, { authorizationDigest: plan.digest });
    expect(first).toMatchObject({ status: 'partial', nextSegment: 1 });
    expect(first.recovery.digest).toBe(plan.digest);
    expect(target.issues).toHaveLength(1);

    const resumed = await executeIssuePlan(plan, target, { authorizationDigest: plan.digest });
    expect(resumed.status).toBe('created');
    expect(target.issues).toHaveLength(2);
    expect(new Set(target.issues.map((issue) => issue.marker)).size).toBe(2);
  });

  it('recovers a post-create linking failure without creating more issues', async () => {
    const plan = planIssueDraft(SELF_REJECTION_FIXTURE);
    const target = adapter('github', { failUpdateOnce: true });
    const first = await executeIssuePlan(plan, target, { authorizationDigest: plan.digest });
    expect(first).toMatchObject({ status: 'partial', recovery: { stage: 'linking' } });
    expect(target.issues).toHaveLength(2);
    const resumed = await executeIssuePlan(plan, target, { authorizationDigest: plan.digest });
    expect(resumed.status).toBe('created');
    expect(target.issues).toHaveLength(2);
  });
});
