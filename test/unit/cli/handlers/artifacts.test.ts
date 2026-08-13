import { describe, expect, it } from 'vitest';
import type { HandlerContext } from '../../../../src/cli/handlers/types.js';
import { artifactsHandler } from '../../../../src/cli/handlers/artifacts.js';

function ctx(args: string[] = []): HandlerContext {
  return {
    args,
    rawArgs: ['artifacts', ...args],
    cwd: process.cwd(),
    frameworkRoot: process.cwd(),
    dryRun: args.includes('--dry-run'),
  };
}

describe('artifactsHandler', () => {
  it('exposes artifact-root relocation metadata', () => {
    expect(artifactsHandler.id).toBe('artifacts');
    expect(artifactsHandler.aliases).toContain('artifact');
    expect(artifactsHandler.category).toBe('index');
  });

  it('shows help', async () => {
    const result = await artifactsHandler.execute(ctx(['--help']));
    expect(result.exitCode).toBe(0);
    expect(result.message).toContain('aiwg artifacts move --to <path>');
    expect(result.message).toContain('aiwg artifacts attach --to <existing-path>');
    expect(result.message).toContain('aiwg artifacts repair --dry-run');
  });

  it('requires --to for move', async () => {
    const result = await artifactsHandler.execute(ctx(['move']));
    expect(result.exitCode).toBe(1);
    expect(result.message).toContain('--to <path> is required');
  });
});
