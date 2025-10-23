import { describe, it, expect, beforeEach } from 'vitest';
import {
  GitHubAPIStub,
  type Issue,
  type PullRequest,
  type Request
} from '../../../../src/testing/mocks/github-stub.ts';

describe('GitHubAPIStub', () => {
  let github: GitHubAPIStub;

  beforeEach(() => {
    github = new GitHubAPIStub();
  });

  describe('initialization', () => {
    it('should initialize with empty state', () => {
      const history = github.getRequestHistory();
      expect(history).toEqual([]);
    });

    it('should have default rate limit', async () => {
      const response = await github.request('/test', 'GET');
      expect(response.headers['x-ratelimit-limit']).toBe('5000');
      expect(response.headers['x-ratelimit-remaining']).toBe('4999');
    });
  });

  describe('setResponse', () => {
    it('should set custom response for endpoint', async () => {
      const mockData = { message: 'Custom response' };
      github.setResponse('/test/endpoint', 'GET', mockData);

      const response = await github.request('/test/endpoint', 'GET');

      expect(response.data).toEqual(mockData);
      expect(response.status).toBe(200);
    });

    it('should set custom status code', async () => {
      github.setResponse('/error', 'POST', { error: 'Bad Request' }, 400);

      const response = await github.request('/error', 'POST');

      expect(response.status).toBe(400);
      expect(response.data).toEqual({ error: 'Bad Request' });
    });

    it('should differentiate between methods', async () => {
      github.setResponse('/endpoint', 'GET', { method: 'get' });
      github.setResponse('/endpoint', 'POST', { method: 'post' });

      const getResponse = await github.request('/endpoint', 'GET');
      const postResponse = await github.request('/endpoint', 'POST');

      expect(getResponse.data).toEqual({ method: 'get' });
      expect(postResponse.data).toEqual({ method: 'post' });
    });

    it('should overwrite existing response', async () => {
      github.setResponse('/test', 'GET', { version: 1 });
      github.setResponse('/test', 'GET', { version: 2 });

      const response = await github.request('/test', 'GET');

      expect(response.data).toEqual({ version: 2 });
    });
  });

  describe('setRateLimit', () => {
    it('should set rate limit remaining', async () => {
      github.setRateLimit(10);

      const response = await github.request('/test', 'GET');
      expect(response.headers['x-ratelimit-remaining']).toBe('9');
    });

    it('should set rate limit reset time', async () => {
      const resetTime = Date.now() + 7200000; // 2 hours from now
      github.setRateLimit(100, resetTime);

      const response = await github.request('/test', 'GET');
      const expectedReset = Math.floor(resetTime / 1000).toString();

      expect(response.headers['x-ratelimit-reset']).toBe(expectedReset);
    });

    it('should use default reset time if not provided', async () => {
      const before = Date.now() + 3500000; // ~1 hour
      github.setRateLimit(100);
      const after = Date.now() + 3700000;

      const response = await github.request('/test', 'GET');
      const resetTime = parseInt(response.headers['x-ratelimit-reset'], 10) * 1000;

      expect(resetTime).toBeGreaterThanOrEqual(before);
      expect(resetTime).toBeLessThanOrEqual(after);
    });
  });

  describe('request', () => {
    it('should return 404 for unknown endpoint', async () => {
      const response = await github.request('/unknown', 'GET');

      expect(response.status).toBe(404);
      expect(response.data).toEqual({ message: 'Not Found' });
    });

    it('should include rate limit headers', async () => {
      const response = await github.request('/test', 'GET');

      expect(response.headers).toHaveProperty('x-ratelimit-limit');
      expect(response.headers).toHaveProperty('x-ratelimit-remaining');
      expect(response.headers).toHaveProperty('x-ratelimit-reset');
    });

    it('should decrement rate limit on each request', async () => {
      github.setRateLimit(3);

      await github.request('/test1', 'GET');
      const response2 = await github.request('/test2', 'GET');
      const response3 = await github.request('/test3', 'GET');

      expect(response2.headers['x-ratelimit-remaining']).toBe('1');
      expect(response3.headers['x-ratelimit-remaining']).toBe('0');
    });

    it('should return 403 when rate limit exceeded', async () => {
      github.setRateLimit(0);

      const response = await github.request('/test', 'GET');

      expect(response.status).toBe(403);
      expect(response.data.message).toContain('rate limit exceeded');
    });

    it('should record request in history', async () => {
      await github.request('/test', 'POST', { data: 'test' });

      const history = github.getRequestHistory();

      expect(history).toHaveLength(1);
      expect(history[0].endpoint).toBe('/test');
      expect(history[0].method).toBe('POST');
      expect(history[0].body).toEqual({ data: 'test' });
      expect(history[0].timestamp).toBeGreaterThan(0);
    });

    it('should handle requests with no body', async () => {
      await github.request('/test', 'GET');

      const history = github.getRequestHistory();

      expect(history[0].body).toBeUndefined();
    });
  });

  describe('createIssue', () => {
    it('should create issue with title only', async () => {
      const issue = await github.createIssue('Test Issue');

      expect(issue.number).toBe(1);
      expect(issue.title).toBe('Test Issue');
      expect(issue.body).toBe('');
      expect(issue.state).toBe('open');
      expect(issue.labels).toEqual([]);
      expect(issue.createdAt).toBeTruthy();
      expect(issue.updatedAt).toBeTruthy();
    });

    it('should create issue with body', async () => {
      const issue = await github.createIssue('Bug Report', 'Detailed description');

      expect(issue.title).toBe('Bug Report');
      expect(issue.body).toBe('Detailed description');
    });

    it('should create issue with labels', async () => {
      const issue = await github.createIssue('Enhancement', 'Add feature', ['enhancement', 'priority-high']);

      expect(issue.labels).toHaveLength(2);
      expect(issue.labels[0].name).toBe('enhancement');
      expect(issue.labels[1].name).toBe('priority-high');
      expect(issue.labels[0].color).toBeTruthy();
    });

    it('should increment issue numbers', async () => {
      const issue1 = await github.createIssue('First Issue');
      const issue2 = await github.createIssue('Second Issue');
      const issue3 = await github.createIssue('Third Issue');

      expect(issue1.number).toBe(1);
      expect(issue2.number).toBe(2);
      expect(issue3.number).toBe(3);
    });

    it('should record request in history', async () => {
      await github.createIssue('Test', 'Body', ['label']);

      const history = github.getRequestHistory();

      expect(history).toHaveLength(1);
      expect(history[0].endpoint).toBe('/repos/owner/repo/issues');
      expect(history[0].method).toBe('POST');
      expect(history[0].body).toEqual({
        title: 'Test',
        body: 'Body',
        labels: ['label']
      });
    });

    it('should set timestamps correctly', async () => {
      const before = Date.now();
      // Wait a tiny bit to ensure we're in the time window
      await new Promise(resolve => setTimeout(resolve, 5));
      
      const issue = await github.createIssue('Test');
      const after = Date.now();

      const createdTime = new Date(issue.createdAt).getTime();
      expect(createdTime).toBeGreaterThanOrEqual(before);
      expect(createdTime).toBeLessThanOrEqual(after);
      expect(issue.updatedAt).toBe(issue.createdAt);
    });
  });

  describe('getIssue', () => {
    it('should retrieve existing issue', async () => {
      const created = await github.createIssue('Test Issue', 'Body content');
      const retrieved = await github.getIssue(created.number);

      expect(retrieved).toEqual(created);
    });

    it('should throw error for non-existent issue', async () => {
      await expect(github.getIssue(999)).rejects.toThrow('Issue #999 not found');
    });

    it('should record request in history', async () => {
      await github.createIssue('Test');
      github.reset();
      github.getRequestHistory(); // Clear history from createIssue

      const created = await github.createIssue('Issue');
      await github.getIssue(created.number);

      const history = github.getRequestHistory();
      const getRequest = history.find(r => r.method === 'GET');

      expect(getRequest).toBeDefined();
      expect(getRequest?.endpoint).toBe(`/repos/owner/repo/issues/${created.number}`);
    });
  });

  describe('listIssues', () => {
    beforeEach(async () => {
      await github.createIssue('First Issue', '', ['bug']);
      await github.createIssue('Second Issue', '', ['enhancement']);
      await github.createIssue('Third Issue', '', ['bug', 'priority-high']);
    });

    it('should list all issues', async () => {
      const issues = await github.listIssues();

      expect(issues).toHaveLength(3);
    });

    it('should sort issues by number descending', async () => {
      const issues = await github.listIssues();

      expect(issues[0].number).toBe(3);
      expect(issues[1].number).toBe(2);
      expect(issues[2].number).toBe(1);
    });

    it('should filter by state', async () => {
      const allIssues = await github.listIssues({ state: 'all' });
      const openIssues = await github.listIssues({ state: 'open' });

      expect(allIssues).toHaveLength(3);
      expect(openIssues).toHaveLength(3);
    });

    it('should filter by single label', async () => {
      const issues = await github.listIssues({ labels: ['bug'] });

      expect(issues).toHaveLength(2);
      expect(issues.every(i => i.labels.some(l => l.name === 'bug'))).toBe(true);
    });

    it('should filter by multiple labels (AND logic)', async () => {
      const issues = await github.listIssues({ labels: ['bug', 'priority-high'] });

      expect(issues).toHaveLength(1);
      expect(issues[0].title).toBe('Third Issue');
    });

    it('should support pagination', async () => {
      const page1 = await github.listIssues({ per_page: 2, page: 1 });
      const page2 = await github.listIssues({ per_page: 2, page: 2 });

      expect(page1).toHaveLength(2);
      expect(page2).toHaveLength(1);
      expect(page1[0].number).toBe(3);
      expect(page1[1].number).toBe(2);
      expect(page2[0].number).toBe(1);
    });

    it('should use default pagination (30 per page)', async () => {
      // Create 40 issues
      for (let i = 4; i <= 40; i++) {
        await github.createIssue(`Issue ${i}`);
      }

      const page1 = await github.listIssues({ page: 1 });
      const page2 = await github.listIssues({ page: 2 });

      expect(page1).toHaveLength(30);
      expect(page2).toHaveLength(10);
    });

    it('should record request in history', async () => {
      github.reset();
      await github.listIssues({ state: 'open', labels: ['bug'] });

      const history = github.getRequestHistory();

      expect(history).toHaveLength(1);
      expect(history[0].endpoint).toBe('/repos/owner/repo/issues');
      expect(history[0].method).toBe('GET');
      expect(history[0].body).toEqual({ state: 'open', labels: ['bug'] });
    });
  });

  describe('createPullRequest', () => {
    it('should create pull request', async () => {
      const pr = await github.createPullRequest('Add feature', 'feature-branch', 'main');

      expect(pr.number).toBe(1);
      expect(pr.title).toBe('Add feature');
      expect(pr.head).toBe('feature-branch');
      expect(pr.base).toBe('main');
      expect(pr.state).toBe('open');
      expect(pr.createdAt).toBeTruthy();
    });

    it('should increment PR numbers independently', async () => {
      await github.createIssue('Issue 1');
      const pr1 = await github.createPullRequest('PR 1', 'feature-1', 'main');
      await github.createIssue('Issue 2');
      const pr2 = await github.createPullRequest('PR 2', 'feature-2', 'main');

      expect(pr1.number).toBe(1);
      expect(pr2.number).toBe(2);
    });

    it('should record request in history', async () => {
      await github.createPullRequest('Test PR', 'feature', 'main');

      const history = github.getRequestHistory();

      expect(history).toHaveLength(1);
      expect(history[0].endpoint).toBe('/repos/owner/repo/pulls');
      expect(history[0].method).toBe('POST');
      expect(history[0].body).toEqual({
        title: 'Test PR',
        head: 'feature',
        base: 'main'
      });
    });
  });

  describe('addLabel', () => {
    it('should add labels to existing issue', async () => {
      const issue = await github.createIssue('Test Issue');
      await github.addLabel(issue.number, ['bug', 'priority-high']);

      const retrieved = await github.getIssue(issue.number);

      expect(retrieved.labels).toHaveLength(2);
      expect(retrieved.labels.map(l => l.name)).toContain('bug');
      expect(retrieved.labels.map(l => l.name)).toContain('priority-high');
    });

    it('should update issue updatedAt timestamp', async () => {
      const issue = await github.createIssue('Test Issue');
      const originalUpdated = issue.updatedAt;

      // Wait a tiny bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      await github.addLabel(issue.number, ['bug']);
      const retrieved = await github.getIssue(issue.number);

      expect(retrieved.updatedAt).not.toBe(originalUpdated);
    });

    it('should not duplicate existing labels', async () => {
      const issue = await github.createIssue('Test', '', ['bug']);
      await github.addLabel(issue.number, ['bug', 'enhancement']);

      const retrieved = await github.getIssue(issue.number);
      const bugLabels = retrieved.labels.filter(l => l.name === 'bug');

      expect(bugLabels).toHaveLength(1);
      expect(retrieved.labels).toHaveLength(2);
    });

    it('should throw error for non-existent issue', async () => {
      await expect(github.addLabel(999, ['label'])).rejects.toThrow('Issue #999 not found');
    });

    it('should record request in history', async () => {
      const issue = await github.createIssue('Test');
      github.reset();
      github.getRequestHistory();

      const created = await github.createIssue('Issue');
      await github.addLabel(created.number, ['bug']);

      const history = github.getRequestHistory();
      const addLabelRequest = history.find(r => r.endpoint.includes('/labels'));

      expect(addLabelRequest).toBeDefined();
      expect(addLabelRequest?.method).toBe('POST');
      expect(addLabelRequest?.body).toEqual({ labels: ['bug'] });
    });
  });

  describe('reset', () => {
    it('should clear all issues', async () => {
      await github.createIssue('Issue 1');
      await github.createIssue('Issue 2');

      github.reset();

      const issues = await github.listIssues();
      expect(issues).toEqual([]);
    });

    it('should clear all pull requests', async () => {
      await github.createPullRequest('PR 1', 'feature', 'main');
      await github.createPullRequest('PR 2', 'hotfix', 'main');

      github.reset();

      // PRs cleared - next one should be #1
      const pr = await github.createPullRequest('New PR', 'test', 'main');
      expect(pr.number).toBe(1);
    });

    it('should clear request history', async () => {
      await github.createIssue('Test');
      await github.listIssues();

      github.reset();

      expect(github.getRequestHistory()).toEqual([]);
    });

    it('should clear custom responses', async () => {
      github.setResponse('/test', 'GET', { data: 'test' });

      github.reset();

      const response = await github.request('/test', 'GET');
      expect(response.status).toBe(404);
    });

    it('should reset rate limit', async () => {
      github.setRateLimit(10);

      github.reset();

      const response = await github.request('/test', 'GET');
      expect(response.headers['x-ratelimit-remaining']).toBe('4999');
    });

    it('should reset counters', async () => {
      await github.createIssue('Issue 1');
      await github.createIssue('Issue 2');
      await github.createPullRequest('PR 1', 'a', 'b');

      github.reset();

      const issue = await github.createIssue('New Issue');
      const pr = await github.createPullRequest('New PR', 'x', 'y');

      expect(issue.number).toBe(1);
      expect(pr.number).toBe(1);
    });

    it('should clear injected errors', async () => {
      github.injectError('/test', new Error('Test error'));

      github.reset();

      await expect(github.request('/test', 'GET')).resolves.toBeDefined();
    });
  });

  describe('getRequestHistory', () => {
    it('should return empty array initially', () => {
      const history = github.getRequestHistory();
      expect(history).toEqual([]);
    });

    it('should return copy of history array', () => {
      const history1 = github.getRequestHistory();
      history1.push({
        endpoint: '/fake',
        method: 'GET',
        timestamp: Date.now()
      });

      const history2 = github.getRequestHistory();
      expect(history2).toEqual([]);
    });

    it('should track all request types', async () => {
      await github.createIssue('Issue');
      await github.listIssues();
      await github.createPullRequest('PR', 'head', 'base');
      await github.request('/custom', 'DELETE');

      const history = github.getRequestHistory();

      expect(history).toHaveLength(4);
      expect(history[0].method).toBe('POST');
      expect(history[1].method).toBe('GET');
      expect(history[2].method).toBe('POST');
      expect(history[3].method).toBe('DELETE');
    });

    it('should include timestamps', async () => {
      const before = Date.now();
      await github.createIssue('Test');
      const after = Date.now();

      const history = github.getRequestHistory();

      expect(history[0].timestamp).toBeGreaterThanOrEqual(before);
      expect(history[0].timestamp).toBeLessThanOrEqual(after);
    });

    it('should preserve request order', async () => {
      await github.createIssue('First');
      await github.createIssue('Second');
      await github.createIssue('Third');

      const history = github.getRequestHistory();

      expect(history[0].body.title).toBe('First');
      expect(history[1].body.title).toBe('Second');
      expect(history[2].body.title).toBe('Third');
    });
  });

  describe('injectError', () => {
    it('should throw error on next request to endpoint', async () => {
      const customError = new Error('Custom API error');
      github.injectError('/test', customError);

      await expect(github.request('/test', 'GET')).rejects.toThrow('Custom API error');
    });

    it('should only affect specified endpoint', async () => {
      github.injectError('/error', new Error('Error'));

      await expect(github.request('/error', 'GET')).rejects.toThrow();
      await expect(github.request('/success', 'GET')).resolves.toBeDefined();
    });

    it('should throw before recording request', async () => {
      github.injectError('/test', new Error('Test error'));

      try {
        await github.request('/test', 'GET');
      } catch (e) {
        // Expected
      }

      const history = github.getRequestHistory();
      expect(history).toHaveLength(1); // Request is still recorded
    });

    it('should support multiple error injections', async () => {
      github.injectError('/error1', new Error('Error 1'));
      github.injectError('/error2', new Error('Error 2'));

      await expect(github.request('/error1', 'GET')).rejects.toThrow('Error 1');
      await expect(github.request('/error2', 'GET')).rejects.toThrow('Error 2');
    });
  });

  describe('injectRateLimitError', () => {
    it('should set rate limit to zero', async () => {
      github.injectRateLimitError();

      const response = await github.request('/test', 'GET');

      expect(response.status).toBe(403);
      expect(response.data.message).toContain('rate limit exceeded');
    });

    it('should affect all subsequent requests', async () => {
      github.injectRateLimitError();

      const response1 = await github.request('/test1', 'GET');
      const response2 = await github.request('/test2', 'POST');

      expect(response1.status).toBe(403);
      expect(response2.status).toBe(403);
    });

    it('should include rate limit headers', async () => {
      github.injectRateLimitError();

      const response = await github.request('/test', 'GET');

      expect(response.headers['x-ratelimit-remaining']).toBe('0');
    });
  });

  describe('integration scenarios', () => {
    it('should support complete issue workflow', async () => {
      // Create issue
      const issue = await github.createIssue('Bug: Login fails', 'Users cannot log in');
      expect(issue.number).toBe(1);
      expect(issue.state).toBe('open');

      // Add labels
      await github.addLabel(issue.number, ['bug', 'priority-high']);

      // Retrieve and verify
      const retrieved = await github.getIssue(issue.number);
      expect(retrieved.labels).toHaveLength(2);

      // List issues
      const issues = await github.listIssues({ labels: ['bug'] });
      expect(issues).toHaveLength(1);
      expect(issues[0].number).toBe(issue.number);
    });

    it('should support multiple issues and filtering', async () => {
      await github.createIssue('Bug 1', '', ['bug', 'backend']);
      await github.createIssue('Bug 2', '', ['bug', 'frontend']);
      await github.createIssue('Feature 1', '', ['enhancement', 'frontend']);
      await github.createIssue('Bug 3', '', ['bug', 'backend']);

      const allBugs = await github.listIssues({ labels: ['bug'] });
      const backendBugs = await github.listIssues({ labels: ['bug', 'backend'] });
      const frontendIssues = await github.listIssues({ labels: ['frontend'] });

      expect(allBugs).toHaveLength(3);
      expect(backendBugs).toHaveLength(2);
      expect(frontendIssues).toHaveLength(2);
    });

    it('should track all operations in history', async () => {
      await github.createIssue('Issue 1');
      const issue2 = await github.createIssue('Issue 2');
      await github.addLabel(issue2.number, ['bug']);
      await github.listIssues();
      await github.createPullRequest('PR 1', 'feature', 'main');

      const history = github.getRequestHistory();

      expect(history).toHaveLength(5);
      expect(history.filter(r => r.method === 'POST')).toHaveLength(4);
      expect(history.filter(r => r.method === 'GET')).toHaveLength(1);
    });

    it('should handle rate limiting gracefully', async () => {
      github.setRateLimit(2);

      const response1 = await github.request('/test1', 'GET');
      const response2 = await github.request('/test2', 'GET');
      const response3 = await github.request('/test3', 'GET');

      expect(response1.status).toBe(404); // Normal response
      expect(response2.status).toBe(404); // Normal response
      expect(response3.status).toBe(403); // Rate limited
    });

    it('should support custom endpoints alongside built-in methods', async () => {
      github.setResponse('/custom/endpoint', 'GET', { custom: 'data' });

      await github.createIssue('Issue');
      const customResponse = await github.request('/custom/endpoint', 'GET');
      await github.createPullRequest('PR', 'head', 'base');

      expect(customResponse.data).toEqual({ custom: 'data' });

      const history = github.getRequestHistory();
      expect(history).toHaveLength(3);
    });
  });

  describe('edge cases', () => {
    it('should handle empty label arrays', async () => {
      const issue = await github.createIssue('Test', '', []);
      expect(issue.labels).toEqual([]);
    });

    it('should handle listing issues when none exist', async () => {
      const issues = await github.listIssues();
      expect(issues).toEqual([]);
    });

    it('should handle pagination beyond available issues', async () => {
      await github.createIssue('Issue 1');

      const page2 = await github.listIssues({ page: 2, per_page: 10 });
      expect(page2).toEqual([]);
    });

    it('should handle adding empty label array', async () => {
      const issue = await github.createIssue('Test');
      await github.addLabel(issue.number, []);

      const retrieved = await github.getIssue(issue.number);
      expect(retrieved.labels).toEqual([]);
    });

    it('should normalize method to uppercase', async () => {
      github.setResponse('/test', 'GET', { data: 'get' });

      const response1 = await github.request('/test', 'GET');
      const response2 = await github.request('/test', 'get');
      const response3 = await github.request('/test', 'Get');

      // All should match the same response (normalized to uppercase)
      expect(response1.data).toEqual({ data: 'get' });
      expect(response2.data).toEqual({ data: 'get' });
      expect(response3.data).toEqual({ data: 'get' });
    });
  });
});
