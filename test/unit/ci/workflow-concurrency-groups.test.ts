import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const workflows = ['ci.yml', 'docsite-build.yml', 'metadata-validation.yml'];

describe('independent push workflow concurrency', () => {
  it('does not let required workflows cancel one another for the same ref', () => {
    const groups = workflows.map((file) => {
      const source = readFileSync(resolve('.gitea/workflows', file), 'utf8');
      const match = source.match(/concurrency:\s*\n\s*group:\s*([^\n]+)/);
      expect(match, `${file} must declare a concurrency group`).not.toBeNull();
      expect(source, `${file} must cancel stale runs only within its own workflow`).toContain('cancel-in-progress: true');
      return match![1].trim();
    });

    expect(new Set(groups).size).toBe(groups.length);
  });

  it('revalidates the docsite workflow when its own definition changes', () => {
    const source = readFileSync(resolve('.gitea/workflows/docsite-build.yml'), 'utf8');
    expect(source).toContain("'.gitea/workflows/docsite-build.yml'");
  });
});
