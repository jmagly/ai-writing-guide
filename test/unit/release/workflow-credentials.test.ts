import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

const root = path.resolve(import.meta.dirname, '../../..');
const workflows = [
  ['gitea-release.yml', 'create-release', 'ci/vault-fetch.gitea-release.spec'],
  ['upload-release-sigs.yml', 'mirror-signed-assets', 'ci/vault-fetch.upload-release-sigs.spec'],
] as const;

for (const [file, jobId, spec] of workflows) {
  describe(`${file} release credential gate`, () => {
    const workflow = parse(readFileSync(path.join(root, '.gitea/workflows', file), 'utf8'));
    const job = workflow.jobs[jobId];
    const guard = job.steps.find((step: { name: string }) => step.name === 'Require release bootstrap credentials');

    it('runs a required credential check instead of silently skipping the release job', () => {
      expect(job.if).toBeUndefined();
      expect(guard).toBeDefined();
      expect(guard.if).toBeUndefined();
      expect(guard['continue-on-error']).toBeUndefined();
      expect(job.steps[0]).toBe(guard);
      expect(guard.env).toEqual({
        VAULT_CI_ROLE_ID: '${{ secrets.VAULT_CI_ROLE_ID }}',
        VAULT_CI_SECRET_ID: '${{ secrets.VAULT_CI_SECRET_ID }}',
      });
    });

    it.each([
      { label: 'neither credential', role: '', secret: '', status: 1 },
      { label: 'role only', role: 'fixture-role-do-not-print', secret: '', status: 1 },
      { label: 'secret only', role: '', secret: 'fixture-secret-do-not-print', status: 1 },
      { label: 'both credentials', role: 'fixture-role-do-not-print', secret: 'fixture-secret-do-not-print', status: 0 },
    ])('fails closed without logging values: $label', ({ role, secret, status }) => {
      const result = spawnSync('bash', ['-c', guard.run], {
        env: { PATH: '/usr/bin:/bin', VAULT_CI_ROLE_ID: role, VAULT_CI_SECRET_ID: secret },
        encoding: 'utf8', timeout: 5_000,
      });
      expect(result.error).toBeUndefined();
      expect(result.status).toBe(status);
      const output = result.stdout + result.stderr;
      expect(output).not.toContain('fixture-role-do-not-print');
      expect(output).not.toContain('fixture-secret-do-not-print');
      if (status === 1) {
        expect(output).toContain('VAULT_CI_ROLE_ID');
        expect(output).toContain('VAULT_CI_SECRET_ID');
      } else expect(output).toBe('');
    });

    it('retains the scoped vault fetch and signed-tag verification', () => {
      const fetch = job.steps.find((step: { run?: string }) => step.run === `bash ci/vault-fetch.sh --spec ${spec}`);
      expect(fetch).toBeDefined();
      expect(fetch.env.VAULT_CI_ROLE_ID).toBe('${{ secrets.VAULT_CI_ROLE_ID }}');
      expect(fetch.env.VAULT_CI_SECRET_ID).toBe('${{ secrets.VAULT_CI_SECRET_ID }}');
      const signed = job.steps.findIndex((step: { run?: string }) => step.run?.includes('bash tools/ci/verify-signed-tag.sh'));
      expect(signed).toBeGreaterThan(0);
      if (file === 'gitea-release.yml') {
        const publish = job.steps.findIndex((step: { name: string }) => step.name === 'Create or reuse Gitea release');
        expect(publish).toBeGreaterThan(signed);
      }
    });
  });
}
