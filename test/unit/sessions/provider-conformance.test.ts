import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SESSION_PROVIDER_IDS } from '../../../src/sessions/index.js';

interface MatrixEntry {
  provider: string;
  issue: number;
  status: 'implemented' | 'manual-only' | 'degraded' | 'unsupported';
  operations: string[];
  fixtures: string;
  tests: string;
  documentation: string;
}

interface Matrix {
  contractVersion: string;
  canonicalProviderCount: number;
  providers: MatrixEntry[];
}

const root = resolve('.');
const matrixPath = resolve(root,
  'docs/planning/session-intelligence/provider-conformance-matrix.json');
const matrix = JSON.parse(readFileSync(matrixPath, 'utf8')) as Matrix;

describe('twelve-provider session release conformance', () => {
  it('maps every canonical provider exactly once to issue, status, operations, fixtures, tests, and docs', () => {
    expect(matrix.contractVersion).toBe('1.0.0');
    expect(matrix.canonicalProviderCount).toBe(12);
    expect(matrix.providers.map((entry) => entry.provider)).toEqual(SESSION_PROVIDER_IDS);
    expect(new Set(matrix.providers.map((entry) => entry.provider)).size).toBe(12);
    expect(new Set(matrix.providers.map((entry) => entry.issue)).size).toBe(12);

    for (const entry of matrix.providers) {
      expect(entry.issue).toBeGreaterThanOrEqual(1910);
      expect(entry.issue).toBeLessThanOrEqual(1921);
      expect(entry.operations).toContain('inspect');
      expect(entry.operations).toContain('stream');
      for (const path of [entry.fixtures, entry.tests, entry.documentation]) {
        expect(existsSync(resolve(root, path)), `${entry.provider}: missing ${path}`).toBe(true);
      }
      expect(statSync(resolve(root, entry.fixtures)).isDirectory()).toBe(true);
      expect(readdirSync(resolve(root, entry.fixtures)).length).toBeGreaterThan(0);
      const tests = readFileSync(resolve(root, entry.tests), 'utf8');
      expect(tests, `${entry.provider}: malformed-input gate`).toMatch(/MALFORMED_SOURCE|malformed/i);
      expect(tests, `${entry.provider}: schema-drift gate`)
        .toMatch(/UNKNOWN_SCHEMA_MAJOR|SCHEMA_DRIFT|unknown-major|drift/i);
    }
  });

  it('keeps provider fixture packs synthetic and free of live credential shapes', () => {
    for (const entry of matrix.providers) {
      for (const name of readdirSync(resolve(root, entry.fixtures))) {
        const path = resolve(root, entry.fixtures, name);
        if (!statSync(path).isFile()) continue;
        const content = readFileSync(path, 'utf8');
        expect(content, `${entry.provider}/${name}: private key`).not.toMatch(
          /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
        );
        expect(content, `${entry.provider}/${name}: AWS access key`).not.toMatch(
          /\bAKIA[0-9A-Z]{16}\b/,
        );
        expect(content, `${entry.provider}/${name}: GitHub token`).not.toMatch(
          /\bgh[pousr]_[A-Za-z0-9]{36,}\b/,
        );
        const emails = content.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [];
        expect(emails.every((email) => email.endsWith('@example.test')),
          `${entry.provider}/${name}: non-reserved email fixture`).toBe(true);
      }
    }
  });

  it('keeps the provider matrix and session gates in required CI', () => {
    const workflow = readFileSync(resolve(root, '.gitea/workflows/ci.yml'), 'utf8');
    expect(workflow).toContain('npm run test:ci');
    expect(workflow).toMatch(/name:\s+Test/);
    expect(workflow).toMatch(/name:\s+Build/);
    expect(workflow).toMatch(/needs:\s+\[test\]/);
  });
});
