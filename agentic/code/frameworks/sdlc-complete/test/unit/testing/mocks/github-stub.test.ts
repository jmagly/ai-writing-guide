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
    it('should initialize with empty state and default rate limit', async () => {
      const history = github.getRequestHistory();
      expect(history).toEqual([]);

      const response = await github.request('/test', 'GET');
      expect(response.headers['x-ratelimit-limit']).toBe('5000');
      expect(response.headers['x-ratelimit-remaining']).toBe('4999');
    });
  });

  describe('setResponse', () => {
    it('should handle custom responses with status codes and method differentiation', async () => {
      const mockData = { message: 'Custom response' };
      github.setResponse('/test/endpoint', 'GET', mockData);
      github.setResponse('/error', 'POST', { error: 'Bad Request' }, 400);
      github.setResponse('/endpoint', 'GET', { method: 'get' });
      github.setResponse('/endpoint', 'POST', { method: 'post' });

      const testResponse = await github.request('/test/endpoint', 'GET');
      expect(testResponse.data).toEqual(mockData);
      expect(testResponse.status).toBe(200);

      const errorResponse = await github.request('/error', 'POST');
      expect(errorResponse.status).toBe(400);
      expect(errorResponse.data).toEqual({ error: 'Bad Request' });

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
    it('should set rate limit with optional reset time', async () => {
      github.setRateLimit(10);
      const response1 = await github.request('/test', 'GET');
      expect(response1.headers['x-ratelimit-remaining']).toBe('9');

      const resetTime = Date.now() + 7200000;
      github.setRateLimit(100, resetTime);
      const response2 = await github.request('/test', 'GET');
      const expectedReset = Math.floor(resetTime / 1000).toString();
      expect(response2.headers['x-ratelimit-reset']).toBe(expectedReset);
    });

    it('should use default reset time if not provided', async () => {
      const before = Date.now() + 3500000;
      github.setRateLimit(100);
      const after = Date.now() + 3700000;

      const response = await github.request('/test', 'GET');
      const resetTime = parseInt(response.headers['x-ratelimit-reset'], 10) * 1000;

      expect(resetTime).toBeGreaterThanOrEqual(before);
      expect(resetTime).toBeLessThanOrEqual(after);
    });
  });

  describe('request', () => {
    it('should return 404 for unknown endpoint and include rate limit headers', async () => {
      const response = await github.request('/unknown', 'GET');

      expect(response.status).toBe(404);
      expect(response.data).toEqual({ message: 'Not Found' });
      expect(response.headers).toHaveProperty('x-ratelimit-limit');
      expect(response.headers).toHaveProperty('x-ratelimit-remaining');
      expect(response.headers).toHaveProperty('x-ratelimit-reset');
    });

    it('should decrement rate limit and return 403 when exceeded', async () => {
      github.setRateLimit(3);

      await github.request('/test1', 'GET');
      const response2 = await github.request('/test2', 'GET');
      const response3 = await github.request('/test3', 'GET');
      const response4 = await github.request('/test4', 'GET');

      expect(response2.headers['x-ratelimit-remaining']).toBe('1');
      expect(response3.headers['x-ratelimit-remaining']).toBe('0');
      expect(response4.status).toBe(403);
      expect(response4.data.message).toContain('rate limit exceeded');
    });

    it('should record request in history with correct metadata', async () => {
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
    it('should create issue with all field variations and options', async () => {
      const issue1 = await github.createIssue('Test Issue');
      expect(issue1.number).toBe(1);
      expect(issue1.title).toBe('Test Issue');
      expect(issue1.body).toBe('');
      expect(issue1.state).toBe('open');
      expect(issue1.labels).toEqual([]);
      expect(issue1.createdAt).toBeTruthy();
      expect(issue1.updatedAt).toBeTruthy();

      const issue2 = await github.createIssue('Bug Report', 'Detailed description');
      expect(issue2.title).toBe('Bug Report');
      expect(issue2.body).toBe('Detailed description');

      const issue3 = await github.createIssue('Enhancement', 'Add feature', ['enhancement', 'priority-high']);
      expect(issue3.labels).toHaveLength(2);
      expect(issue3.labels[0].name).toBe('enhancement');
      expect(issue3.labels[1].name).toBe('priority-high');
      expect(issue3.labels[0].color).toBeTruthy();
    });

    it('should increment issue numbers', async () => {
      const issue1 = await github.createIssue('First Issue');
      const issue2 = await github.createIssue('Second Issue');
      const issue3 = await github.createIssue('Third Issue');

      expect(issue1.number).toBe(1);
      expect(issue2.number).toBe(2);
      expect(issue3.number).toBe(3);
    });

    it('should record request in history and set timestamps correctly', async () => {
      const before = Date.now();
      await new Promise(resolve => setTimeout(resolve, 5));

      const issue = await github.createIssue('Test', 'Body', ['label']);
      const after = Date.now();

      const history = github.getRequestHistory();

      expect(history).toHaveLength(1);
      expect(history[0].endpoint).toBe('/repos/owner/repo/issues');
      expect(history[0].method).toBe('POST');
      expect(history[0].body).toEqual({
        title: 'Test',
        body: 'Body',
        labels: ['label']
      });

      const createdTime = new Date(issue.createdAt).getTime();
      expect(createdTime).toBeGreaterThanOrEqual(before);
      expect(createdTime).toBeLessThanOrEqual(after);
      expect(issue.updatedAt).toBe(issue.createdAt);
    });
  });

  describe('getIssue', () => {
    it('should retrieve existing issue and throw for non-existent', async () => {
      const created = await github.createIssue('Test Issue', 'Body content');
      const retrieved = await github.getIssue(created.number);

      expect(retrieved).toEqual(created);

      await expect(github.getIssue(999)).rejects.toThrow('Issue #999 not found');
    });

    it('should record request in history', async () => {
      await github.createIssue('Test');
      github.reset();

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

    it('should list all issues sorted by number descending', async () => {
      const issues = await github.listIssues();

      expect(issues).toHaveLength(3);
      expect(issues[0].number).toBe(3);
      expect(issues[1].number).toBe(2);
      expect(issues[2].number).toBe(1);
    });

    it('should filter by state and labels', async () => {
      const allIssues = await github.listIssues({ state: 'all' });
      const openIssues = await github.listIssues({ state: 'open' });
      const bugIssues = await github.listIssues({ labels: ['bug'] });
      const multiLabelIssues = await github.listIssues({ labels: ['bug', 'priority-high'] });

      expect(allIssues).toHaveLength(3);
      expect(openIssues).toHaveLength(3);
      expect(bugIssues).toHaveLength(2);
      expect(bugIssues.every(i => i.labels.some(l => l.name === 'bug'))).toBe(true);
      expect(multiLabelIssues).toHaveLength(1);
      expect(multiLabelIssues[0].title).toBe('Third Issue');
    });

    it('should support pagination with custom and default per_page', async () => {
      const page1 = await github.listIssues({ per_page: 2, page: 1 });
      const page2 = await github.listIssues({ per_page: 2, page: 2 });

      expect(page1).toHaveLength(2);
      expect(page2).toHaveLength(1);
      expect(page1[0].number).toBe(3);
      expect(page1[1].number).toBe(2);
      expect(page2[0].number).toBe(1);

      for (let i = 4; i <= 40; i++) {
        await github.createIssue(`Issue ${i}`);
      }

      const defaultPage1 = await github.listIssues({ page: 1 });
      const defaultPage2 = await github.listIssues({ page: 2 });

      expect(defaultPage1).toHaveLength(30);
      expect(defaultPage2).toHaveLength(10);
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
    it('should create pull request with correct fields', async () => {
      const pr = await github.createPullRequest('Add feature', 'feature-branch', 'main');

      expect(pr.number).toBe(1);
      expect(pr.title).toBe('Add feature');
      expect(pr.head).toBe('feature-branch');
      expect(pr.base).toBe('main');
      expect(pr.state).toBe('open');
      expect(pr.createdAt).toBeTruthy();
    });

    it('should increment PR numbers independently from issues', async () => {
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
    it('should add labels and update timestamp without duplicates', async () => {
      const issue = await github.createIssue('Test Issue');
      await github.addLabel(issue.number, ['bug', 'priority-high']);

      const retrieved = await github.getIssue(issue.number);

      expect(retrieved.labels).toHaveLength(2);
      expect(retrieved.labels.map(l => l.name)).toContain('bug');
      expect(retrieved.labels.map(l => l.name)).toContain('priority-high');

      const issueWithLabel = await github.createIssue('Test', '', ['bug']);
      await github.addLabel(issueWithLabel.number, ['bug', 'enhancement']);

      const retrievedWithLabel = await github.getIssue(issueWithLabel.number);
      const bugLabels = retrievedWithLabel.labels.filter(l => l.name === 'bug');

      expect(bugLabels).toHaveLength(1);
      expect(retrievedWithLabel.labels).toHaveLength(2);
    });

    it('should update issue updatedAt timestamp', async () => {
      const issue = await github.createIssue('Test Issue');
      const originalUpdated = issue.updatedAt;

      await new Promise(resolve => setTimeout(resolve, 10));

      await github.addLabel(issue.number, ['bug']);
      const retrieved = await github.getIssue(issue.number);

      expect(retrieved.updatedAt).not.toBe(originalUpdated);
    });

    it('should throw error for non-existent issue', async () => {
      await expect(github.addLabel(999, ['label'])).rejects.toThrow('Issue #999 not found');
    });

    it('should record request in history', async () => {
      const issue = await github.createIssue('Test');
      github.reset();

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
    it('should clear all state comprehensively', async () => {
      await github.createIssue('Issue 1');
      await github.createIssue('Issue 2');
      await github.createPullRequest('PR 1', 'feature', 'main');
      await github.createPullRequest('PR 2', 'hotfix', 'main');
      await github.listIssues();
      github.setResponse('/test', 'GET', { data: 'test' });
      github.setRateLimit(10);
      github.injectError('/test', new Error('Test error'));

      github.reset();

      expect(github.getRequestHistory()).toEqual([]);

      const issues = await github.listIssues();
      expect(issues).toEqual([]);

      const response = await github.request('/test', 'GET');
      expect(response.status).toBe(404);
      expect(response.headers['x-ratelimit-remaining']).toBe('4999');

      await expect(github.request('/test', 'GET')).resolves.toBeDefined();
    });

    it('should reset counters for issues and PRs', async () => {
      await github.createIssue('Issue 1');
      await github.createIssue('Issue 2');
      await github.createPullRequest('PR 1', 'a', 'b');

      github.reset();

      const issue = await github.createIssue('New Issue');
      const pr = await github.createPullRequest('New PR', 'x', 'y');

      expect(issue.number).toBe(1);
      expect(pr.number).toBe(1);
    });
  });

  describe('getRequestHistory', () => {
    it('should return empty array initially and return copy of history', () => {
      const history = github.getRequestHistory();
      expect(history).toEqual([]);

      const history1 = github.getRequestHistory();
      history1.push({
        endpoint: '/fake',
        method: 'GET',
        timestamp: Date.now()
      });

      const history2 = github.getRequestHistory();
      expect(history2).toEqual([]);
    });

    it('should track all request types with timestamps and preserve order', async () => {
      const before = Date.now();
      await github.createIssue('First');
      await github.listIssues();
      await github.createPullRequest('PR', 'head', 'base');
      await github.request('/custom', 'DELETE');
      await github.createIssue('Second');
      await github.createIssue('Third');
      const after = Date.now();

      const history = github.getRequestHistory();

      expect(history).toHaveLength(6);
      expect(history[0].method).toBe('POST');
      expect(history[1].method).toBe('GET');
      expect(history[2].method).toBe('POST');
      expect(history[3].method).toBe('DELETE');

      expect(history[0].timestamp).toBeGreaterThanOrEqual(before);
      expect(history[0].timestamp).toBeLessThanOrEqual(after);

      const postRequests = history.filter(r => r.endpoint === '/repos/owner/repo/issues' && r.method === 'POST');
      expect(postRequests[0].body.title).toBe('First');
      expect(postRequests[1].body.title).toBe('Second');
      expect(postRequests[2].body.title).toBe('Third');
    });
  });

  describe('injectError', () => {
    it('should throw error on specified endpoint and only affect that endpoint', async () => {
      const customError = new Error('Custom API error');
      github.injectError('/test', customError);
      github.injectError('/error', new Error('Error'));

      await expect(github.request('/test', 'GET')).rejects.toThrow('Custom API error');
      await expect(github.request('/error', 'GET')).rejects.toThrow();
      await expect(github.request('/success', 'GET')).resolves.toBeDefined();
    });

    it('should throw before recording request but still record it', async () => {
      github.injectError('/test', new Error('Test error'));

      try {
        await github.request('/test', 'GET');
      } catch (e) {
        // Expected
      }

      const history = github.getRequestHistory();
      expect(history).toHaveLength(1);
    });

    it('should support multiple error injections', async () => {
      github.injectError('/error1', new Error('Error 1'));
      github.injectError('/error2', new Error('Error 2'));

      await expect(github.request('/error1', 'GET')).rejects.toThrow('Error 1');
      await expect(github.request('/error2', 'GET')).rejects.toThrow('Error 2');
    });
  });

  describe('injectRateLimitError', () => {
    it('should set rate limit to zero and affect all subsequent requests with headers', async () => {
      github.injectRateLimitError();

      const response1 = await github.request('/test1', 'GET');
      const response2 = await github.request('/test2', 'POST');

      expect(response1.status).toBe(403);
      expect(response2.status).toBe(403);
      expect(response1.data.message).toContain('rate limit exceeded');
      expect(response1.headers['x-ratelimit-remaining']).toBe('0');
    });
  });

  describe('integration scenarios', () => {
    it('should support complete issue workflow', async () => {
      const issue = await github.createIssue('Bug: Login fails', 'Users cannot log in');
      expect(issue.number).toBe(1);
      expect(issue.state).toBe('open');

      await github.addLabel(issue.number, ['bug', 'priority-high']);

      const retrieved = await github.getIssue(issue.number);
      expect(retrieved.labels).toHaveLength(2);

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

      expect(response1.status).toBe(404);
      expect(response2.status).toBe(404);
      expect(response3.status).toBe(403);
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
    it('should handle empty label arrays and empty issue list', async () => {
      const issue1 = await github.createIssue('Test', '', []);
      expect(issue1.labels).toEqual([]);

      const issue2 = await github.createIssue('Test');
      await github.addLabel(issue2.number, []);

      const retrieved = await github.getIssue(issue2.number);
      expect(retrieved.labels).toEqual([]);

      github.reset();
      const emptyIssues = await github.listIssues();
      expect(emptyIssues).toEqual([]);
    });

    it('should handle pagination beyond available', async () => {
      await github.createIssue('Issue 1');

      const page2 = await github.listIssues({ page: 2, per_page: 10 });
      expect(page2).toEqual([]);
    });

    it('should normalize method to uppercase', async () => {
      github.setResponse('/test', 'GET', { data: 'get' });

      const response1 = await github.request('/test', 'GET');
      const response2 = await github.request('/test', 'get');
      const response3 = await github.request('/test', 'Get');

      expect(response1.data).toEqual({ data: 'get' });
      expect(response2.data).toEqual({ data: 'get' });
      expect(response3.data).toEqual({ data: 'get' });
    });
  });
});
