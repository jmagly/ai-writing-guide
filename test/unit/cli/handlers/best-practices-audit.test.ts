/**
 * Best-Practices Audit Handler Tests
 *
 * Covers the handler-side behaviors that don't require live agent spawn:
 *   - Flag parsing (audit-specific + spawn flags)
 *   - Output path computation (default + override)
 *   - Help text rendering
 *   - Missing-target usage error
 *   - Non-spawnable provider returns guidance instead of attempting spawn
 *
 * The actual research pipeline is agent-driven and exercised via the
 * slash command at runtime — that is out of scope for unit tests.
 *
 * @source @src/cli/handlers/best-practices-audit.ts
 * @issue #943
 */

import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import {
  bestPracticesAuditHandler,
  __test__,
} from '../../../../src/cli/handlers/best-practices-audit.js';
import type { HandlerContext } from '../../../../src/cli/handlers/types.js';

const { parseAuditFlags, computeOutputPath } = __test__;

function ctx(args: string[], cwd?: string): HandlerContext {
  return {
    args,
    rawArgs: ['best-practices-audit', ...args],
    cwd: cwd ?? process.cwd(),
    signal: undefined,
  } as HandlerContext;
}

describe('parseAuditFlags', () => {
  it('extracts focus, standard, and depth from a typical invocation', () => {
    const { audit, rest } = parseAuditFlags([
      '.aiwg/architecture/SAD.md',
      '--focus',
      'security',
      '--standard',
      'OWASP',
      '--depth',
      'deep',
    ]);
    expect(audit.focus).toBe('security');
    expect(audit.standard).toBe('OWASP');
    expect(audit.depth).toBe('deep');
    // Forwarded so the slash command sees them too.
    expect(rest).toEqual([
      '.aiwg/architecture/SAD.md',
      '--focus',
      'security',
      '--standard',
      'OWASP',
      '--depth',
      'deep',
    ]);
  });

  it('rejects an invalid --depth value silently (not stored, but still forwarded)', () => {
    const { audit } = parseAuditFlags(['target', '--depth', 'extreme']);
    expect(audit.depth).toBeUndefined();
  });

  it('parses --cite-threshold as a positive integer', () => {
    const ok = parseAuditFlags(['t', '--cite-threshold', '3']);
    expect(ok.audit.citeThreshold).toBe(3);
    const bad = parseAuditFlags(['t', '--cite-threshold', '-1']);
    expect(bad.audit.citeThreshold).toBeUndefined();
    const garbage = parseAuditFlags(['t', '--cite-threshold', 'lots']);
    expect(garbage.audit.citeThreshold).toBeUndefined();
  });

  it('captures boolean flags --dissent and --validate', () => {
    const { audit } = parseAuditFlags(['t', '--dissent', '--validate']);
    expect(audit.dissent).toBe(true);
    expect(audit.validateMode).toBe(true);
  });

  it('does not forward --output to the slash command (handler computes path)', () => {
    const { audit, rest } = parseAuditFlags(['t', '--output', '/tmp/out.md']);
    expect(audit.output).toBe('/tmp/out.md');
    expect(rest).not.toContain('--output');
    expect(rest).not.toContain('/tmp/out.md');
  });
});

describe('computeOutputPath', () => {
  it('uses the override when provided (absolute)', () => {
    const out = computeOutputPath('any-target', '/tmp/explicit.md', '/proj');
    expect(out).toBe('/tmp/explicit.md');
  });

  it('resolves a relative override against the project root', () => {
    const out = computeOutputPath('any-target', 'reports/x.md', '/proj');
    expect(out).toBe('/proj/reports/x.md');
  });

  it('derives the slug from a file basename without extension', () => {
    const tmp = mkdtempSync(path.join(tmpdir(), 'audit-out-'));
    try {
      const target = path.join(tmp, 'SAD.md');
      writeFileSync(target, '# SAD');
      const out = computeOutputPath(target, undefined, tmp);
      expect(out).toMatch(/best-practices-audit-sad-\d{4}-\d{2}-\d{2}\.md$/);
      expect(out.startsWith(path.join(tmp, '.aiwg', 'reports', ''))).toBe(true);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('derives a slug from a freeform topic when the target does not exist', () => {
    const out = computeOutputPath('FastAPI dependency injection patterns', undefined, '/p');
    expect(out).toMatch(/best-practices-audit-fastapi-dependency-injection-patterns-\d{4}-\d{2}-\d{2}\.md$/);
  });

  it('falls back to "audit" slug when the topic is empty / unparseable', () => {
    const out = computeOutputPath('!!!', undefined, '/p');
    expect(out).toMatch(/best-practices-audit-audit-\d{4}-\d{2}-\d{2}\.md$/);
  });

  it('truncates very long slugs to 60 chars', () => {
    const longTopic = 'a'.repeat(120);
    const out = computeOutputPath(longTopic, undefined, '/p');
    const match = out.match(/best-practices-audit-([a-z0-9-]+)-\d{4}-\d{2}-\d{2}\.md$/);
    expect(match).not.toBeNull();
    expect(match![1].length).toBeLessThanOrEqual(60);
  });
});

describe('BestPracticesAuditHandler.execute', () => {
  it('returns help text when --help is passed', async () => {
    const result = await bestPracticesAuditHandler.execute(ctx(['--help']));
    expect(result.exitCode).toBe(0);
    expect(result.message).toMatch(/Best-Practices Audit/);
    expect(result.message).toMatch(/--cite-threshold/);
    expect(result.message).toMatch(/anti-hallucination/i);
  });

  it('errors when no target is provided', async () => {
    const result = await bestPracticesAuditHandler.execute(ctx([]));
    expect(result.exitCode).toBe(1);
    expect(result.message).toMatch(/missing <target>/);
  });

  it('returns guidance (no spawn) for IDE-integrated providers', async () => {
    // Provider 'cursor' is documented as IDE-integrated / not spawnable.
    const result = await bestPracticesAuditHandler.execute(
      ctx([
        'src/auth/',
        '--focus',
        'security',
        '--provider',
        'cursor',
      ])
    );
    expect(result.exitCode).toBe(0);
    expect(result.message).toMatch(/not spawnable/);
    expect(result.message).toMatch(/\/best-practices-audit/);
    // Output path should be surfaced even in guidance mode.
    expect(result.message).toMatch(/best-practices-audit-src-auth-\d{4}-\d{2}-\d{2}\.md/);
  });

  it('forwards audit flags into the prompt for IDE-integrated providers', async () => {
    const result = await bestPracticesAuditHandler.execute(
      ctx([
        'topic',
        '--focus',
        'security',
        '--standard',
        'OWASP',
        '--depth',
        'deep',
        '--provider',
        'cursor',
      ])
    );
    expect(result.message).toMatch(/--focus security/);
    expect(result.message).toMatch(/--standard OWASP/);
    expect(result.message).toMatch(/--depth deep/);
    // --output is added explicitly by the handler.
    expect(result.message).toMatch(/--output ".*best-practices-audit-topic/);
  });
});

describe('handler registration', () => {
  it('exposes id, aliases, and category', () => {
    expect(bestPracticesAuditHandler.id).toBe('best-practices-audit');
    expect(bestPracticesAuditHandler.aliases).toContain('best-practices-audit');
    expect(bestPracticesAuditHandler.category).toBe('orchestration');
  });
});
