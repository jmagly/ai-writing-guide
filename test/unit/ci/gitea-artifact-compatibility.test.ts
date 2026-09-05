import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync(resolve('.gitea/workflows/ci.yml'), 'utf8');

describe('Gitea artifact compatibility', () => {
  it('uses the Node 20 v3 uploader for session performance evidence', () => {
    const evidenceStep = workflow.slice(
      workflow.indexOf('- name: Preserve session performance evidence'),
      workflow.indexOf('- name: Run tests'),
    );

    expect(evidenceStep).toContain(
      'actions/upload-artifact@c24449f33cd45d4826c6702db7e49f7cdb9b551d  # v3.2.1-node20',
    );
    expect(evidenceStep).not.toContain(
      'actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02',
    );
  });
});
