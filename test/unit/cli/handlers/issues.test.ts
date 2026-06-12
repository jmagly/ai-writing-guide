import { describe, expect, it } from 'vitest';
import { allHandlers } from '../../../../src/cli/handlers/index.js';
import { issueAuditHandler, issueHandler } from '../../../../src/cli/handlers/issues.js';

describe('issueHandler', () => {
  it('exposes local issue CLI metadata', () => {
    expect(issueHandler.id).toBe('issue');
    expect(issueHandler.aliases).toEqual(['issues']);
    expect(issueHandler.category).toBe('project');
    expect(issueHandler.description).toMatch(/local issue/i);
  });

  it('is registered in the CLI handler table', () => {
    expect(allHandlers).toContain(issueHandler);
    expect(allHandlers).toContain(issueAuditHandler);
  });

  it('exposes local workflow command metadata', () => {
    expect(issueAuditHandler.id).toBe('issue-audit');
    expect(issueAuditHandler.aliases).toContain('audit-issues');
  });

  it('does not register an address-issues CLI handler (skill-only; removed)', () => {
    expect(allHandlers.some((handler) => handler.id === 'address-issues')).toBe(false);
  });
});
