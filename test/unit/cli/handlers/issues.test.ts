import { describe, expect, it } from 'vitest';
import { allHandlers } from '../../../../src/cli/handlers/index.js';
import { issueHandler } from '../../../../src/cli/handlers/issues.js';

describe('issueHandler', () => {
  it('exposes local issue CLI metadata', () => {
    expect(issueHandler.id).toBe('issue');
    expect(issueHandler.aliases).toEqual(['issues']);
    expect(issueHandler.category).toBe('project');
    expect(issueHandler.description).toMatch(/local issue/i);
  });

  it('is registered in the CLI handler table', () => {
    expect(allHandlers).toContain(issueHandler);
  });
});
