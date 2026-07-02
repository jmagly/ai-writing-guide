import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '../../..');
const RULE_PATHS = [
  'agentic/code/addons/aiwg-utils/rules/delivery-policy.md',
];

describe('delivery-policy project config preflight', () => {
  it('requires .aiwg config checks before issue mutations and commit lifecycle actions', () => {
    for (const rel of RULE_PATHS) {
      const content = fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');

      expect(content).toContain('Run The Project Config Preflight Before Tracker Or Git Writes');
      expect(content).toContain('Before filing an issue, commenting on an issue, closing an issue');
      expect(content).toContain('creating a branch, committing, pushing, opening a PR');
      expect(content).toContain('Read `.aiwg/aiwg.config` from the repository root');
      expect(content).toContain('Resolve `remotes.primary`, `remotes.issue_tracker`, and `remotes.ci`');
      expect(content).toContain('Resolve `delivery.mode`, `delivery.default_branch`, signing requirements');
      expect(content).toContain('Resolve `remotes.tracker_actor` for tracker mutations');
      expect(content).toContain('stop and');
      expect(content).toContain('instead of guessing a provider');
    }
  });
});
