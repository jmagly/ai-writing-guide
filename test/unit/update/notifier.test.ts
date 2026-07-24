import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(
  path.resolve(import.meta.dirname, '../../../src/update/notifier.mjs'),
  'utf8',
);

describe('update notifier remediation', () => {
  it('routes users through the canonical AIWG command', () => {
    expect(source).toContain('(run: aiwg update)');
    expect(source).not.toContain('(run: npm install');
  });
});
