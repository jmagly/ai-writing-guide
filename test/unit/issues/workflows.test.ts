import { mkdir, mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { main } from '../../../src/issues/cli.js';
import { auditLocalIssuesCli, planQuestionLabelUpdate } from '../../../src/issues/workflows.js';

describe('local issue workflow CLI helpers', () => {
  let root: string;
  let output: string[];

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'aiwg-local-workflows-'));
    output = [];
    vi.spyOn(console, 'log').mockImplementation((message?: unknown) => {
      output.push(String(message ?? ''));
    });
    await mkdir(root, { recursive: true });
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(root, { recursive: true, force: true });
  });

  it('audits local issues without an external tracker', async () => {
    await main(['init', '--prefix', 'AUD'], root);
    await main(['new', '--title', 'Audit me', '--body', 'ordinary issue', '--label', 'bug'], root);

    await auditLocalIssuesCli(['--provider', 'local', '--status', 'open'], root);

    expect(output.join('\n')).toContain('# Issue Audit');
    expect(output.join('\n')).toContain('AUD-0001 [open/P2] Audit me');
  });

  it('plans creation and add of question label for a new unresolved question', () => {
    expect(planQuestionLabelUpdate({
      issueLabels: ['enhancement'],
      repositoryLabels: ['enhancement'],
      unresolvedQuestionCount: 1,
    })).toMatchObject({
      label: 'question',
      createLabel: true,
      addLabel: true,
      removeLabel: false,
      keepLabel: false,
      reason: 'open-questions',
    });
  });

  it('adds existing question label for an unresolved question', () => {
    expect(planQuestionLabelUpdate({
      issueLabels: ['bug'],
      repositoryLabels: ['bug', 'question'],
      unresolvedQuestionCount: 1,
    })).toMatchObject({
      createLabel: false,
      addLabel: true,
      removeLabel: false,
      keepLabel: false,
      reason: 'open-questions',
    });
  });

  it('retains question label while multiple questions remain unresolved', () => {
    expect(planQuestionLabelUpdate({
      issueLabels: ['question'],
      repositoryLabels: ['question'],
      unresolvedQuestionCount: 2,
    })).toMatchObject({
      createLabel: false,
      addLabel: false,
      removeLabel: false,
      keepLabel: true,
      reason: 'open-questions',
    });
  });

  it('removes question label after all tracked questions are answered', () => {
    expect(planQuestionLabelUpdate({
      issueLabels: ['question', 'enhancement'],
      repositoryLabels: ['question', 'enhancement'],
      unresolvedQuestionCount: 0,
    })).toMatchObject({
      createLabel: false,
      addLabel: false,
      removeLabel: true,
      keepLabel: false,
      reason: 'answered',
    });
  });
});
