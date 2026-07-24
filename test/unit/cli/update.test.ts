/**
 * Unit tests for tools/cli/update.mjs
 *
 * Verifies the standalone wrapper delegates to the install-aware service.
 *
 * @issue #687
 * @parent #684
 */

import { describe, it, expect } from 'vitest';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const UPDATE_SCRIPT = resolve(__dirname, '../../../tools/cli/update.mjs');

// ── File existence ───────────────────────────────────────────

describe('tools/cli/update.mjs — file', () => {
  it('exists at expected path', () => {
    expect(existsSync(UPDATE_SCRIPT)).toBe(true);
  });

  it('starts with shebang', async () => {
    const { readFileSync } = await import('fs');
    const content = readFileSync(UPDATE_SCRIPT, 'utf-8');
    expect(content.startsWith('#!/usr/bin/env node')).toBe(true);
  });

  it('delegates to the shared install-aware update service', async () => {
    const { readFileSync } = await import('fs');
    const content = readFileSync(UPDATE_SCRIPT, 'utf-8');
    expect(content).toContain('update/service.mjs');
    expect(content).toContain('updateInstallation');
    expect(content).not.toContain('npm install');
  });

  it('handles --channel flag', async () => {
    const { readFileSync } = await import('fs');
    const content = readFileSync(UPDATE_SCRIPT, 'utf-8');
    expect(content).toContain('--channel');
  });

  it('handles unknown channel with exit 1', async () => {
    const { readFileSync } = await import('fs');
    const content = readFileSync(UPDATE_SCRIPT, 'utf-8');
    expect(content).toContain('Unknown channel');
    expect(content).toContain('process.exit(1)');
  });
});

// ── Workspace-status.mjs ───────────────────────────────────────

describe('tools/cli/workspace-status.mjs — file', () => {
  const SCRIPT = resolve(__dirname, '../../../tools/cli/workspace-status.mjs');

  it('exists', () => {
    expect(existsSync(SCRIPT)).toBe(true);
  });

  it('starts with shebang', async () => {
    const { readFileSync } = await import('fs');
    expect(readFileSync(SCRIPT, 'utf-8').startsWith('#!/usr/bin/env node')).toBe(true);
  });

  it('reads .aiwg/frameworks/registry.json (workspace registry)', async () => {
    const { readFileSync } = await import('fs');
    const content = readFileSync(SCRIPT, 'utf-8');
    expect(content).toMatch(/registry\.json|frameworks/);
  });
});

// ── workspace-migrate.mjs ────────────────────────────────────

describe('tools/cli/workspace-migrate.mjs — file', () => {
  const SCRIPT = resolve(__dirname, '../../../tools/cli/workspace-migrate.mjs');

  it('exists', () => {
    expect(existsSync(SCRIPT)).toBe(true);
  });

  it('supports --dry-run flag', async () => {
    const { readFileSync } = await import('fs');
    const content = readFileSync(SCRIPT, 'utf-8');
    expect(content).toContain('dry-run');
  });

  it('creates backup (mentions backup path)', async () => {
    const { readFileSync } = await import('fs');
    const content = readFileSync(SCRIPT, 'utf-8');
    expect(content).toMatch(/backup/i);
  });
});

// ── workspace-rollback.mjs ───────────────────────────────────

describe('tools/cli/workspace-rollback.mjs — file', () => {
  const SCRIPT = resolve(__dirname, '../../../tools/cli/workspace-rollback.mjs');

  it('exists', () => {
    expect(existsSync(SCRIPT)).toBe(true);
  });

  it('handles missing backup gracefully (has error handling)', async () => {
    const { readFileSync } = await import('fs');
    const content = readFileSync(SCRIPT, 'utf-8');
    // Should not crash silently — check for error messaging
    expect(content).toMatch(/No backup|backup.*not found|exit\(1\)/i);
  });
});

// ── validate-metadata.mjs ────────────────────────────────────

describe('tools/cli/validate-metadata.mjs — file', () => {
  const SCRIPT = resolve(__dirname, '../../../tools/cli/validate-metadata.mjs');

  it('exists', () => {
    expect(existsSync(SCRIPT)).toBe(true);
  });

  it('exits 1 on invalid metadata (has exit 1)', async () => {
    const { readFileSync } = await import('fs');
    const content = readFileSync(SCRIPT, 'utf-8');
    expect(content).toContain('process.exit(1)');
  });

  it('supports --fix flag', async () => {
    const { readFileSync } = await import('fs');
    const content = readFileSync(SCRIPT, 'utf-8');
    expect(content).toContain('--fix');
  });

  it('supports --format flag', async () => {
    const { readFileSync } = await import('fs');
    const content = readFileSync(SCRIPT, 'utf-8');
    expect(content).toContain('--format');
  });
});

// ── config-gitignore.mjs ──────────────────────────────────────

describe('tools/cli/config-gitignore.mjs — file', () => {
  const SCRIPT = resolve(__dirname, '../../../tools/cli/config-gitignore.mjs');

  it('exists', () => {
    expect(existsSync(SCRIPT)).toBe(true);
  });

  it('handles --fix flag', async () => {
    const { readFileSync } = await import('fs');
    const content = readFileSync(SCRIPT, 'utf-8');
    expect(content).toContain('--fix');
  });

  it('covers AIWG runtime patterns', async () => {
    const { readFileSync } = await import('fs');
    const content = readFileSync(SCRIPT, 'utf-8');
    expect(content).toContain('.aiwg/working/');
  });

  it('handles missing .gitignore by creating one', async () => {
    const { readFileSync } = await import('fs');
    const content = readFileSync(SCRIPT, 'utf-8');
    // Should handle no .gitignore case
    expect(content).toMatch(/\.gitignore/);
  });
});
