/**
 * GitHubAPIStub provides mock GitHub API functionality for testing.
 *
 * Simulates GitHub API interactions without making real network requests.
 * Supports configurable responses, error injection, rate limiting, and request tracking.
 *
 * @example
 * ```typescript
 * const github = new GitHubAPIStub();
 *
 * // Create a mock issue
 * const issue = await github.createIssue('Bug: Fix login', 'Login not working');
 *
 * // Configure custom response
 * github.setResponse('/repos/owner/repo/issues', 'GET', { issues: [] });
 *
 * // Inject error for testing
 * github.injectError('/repos/owner/repo/pulls', new Error('API Error'));
 *
 * // Check request history
 * const requests = github.getRequestHistory();
 * ```
 */

export interface GitHubResponse {
  data: any;
  status: number;
  headers: Record<string, string>;
}

export interface Issue {
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed';
  labels: Label[];
  createdAt: string;
  updatedAt: string;
}

export interface PullRequest {
  number: number;
  title: string;
  head: string;
  base: string;
  state: 'open' | 'closed' | 'merged';
  createdAt: string;
  updatedAt?: string;
}

export interface Label {
  name: string;
  color: string;
  description?: string;
}

export interface Request {
  endpoint: string;
  method: string;
  body?: any;
  timestamp: number;
}

export interface IssueListOptions {
  state?: 'open' | 'closed' | 'all';
  labels?: string[];
  page?: number;
  per_page?: number;
}

interface MockResponse {
  data: any;
  statusCode: number;
}

interface InjectedError {
  error: Error;
  endpoint: string;
}

export class GitHubAPIStub {
  private responses: Map<string, MockResponse> = new Map();
  private requestHistory: Request[] = [];
  private issues: Map<number, Issue> = new Map();
  private pullRequests: Map<number, PullRequest> = new Map();
  private issueCounter: number = 1;
  private prCounter: number = 1;
  private rateLimitRemaining: number = 5000;
  private rateLimitReset: number = Date.now() + 3600000; // 1 hour from now
  private injectedErrors: InjectedError[] = [];

  /**
   * Set a custom response for a specific endpoint and method.
   *
   * @param endpoint - API endpoint path
   * @param method - HTTP method (GET, POST, PUT, DELETE, etc.)
   * @param response - Response data
   * @param statusCode - HTTP status code (default: 200)
   */
  setResponse(endpoint: string, method: string, response: any, statusCode: number = 200): void {
    const key = this.getResponseKey(endpoint, method);
    this.responses.set(key, { data: response, statusCode });
  }

  /**
   * Configure rate limit for testing rate limit handling.
   *
   * @param remaining - Number of requests remaining
   * @param resetTime - Unix timestamp when rate limit resets (default: 1 hour from now)
   */
  setRateLimit(remaining: number, resetTime?: number): void {
    this.rateLimitRemaining = remaining;
    this.rateLimitReset = resetTime ?? (Date.now() + 3600000);
  }

  /**
   * Make a simulated API request.
   *
   * @param endpoint - API endpoint path
   * @param method - HTTP method
   * @param body - Request body (optional)
   * @returns GitHub API response
   */
  async request(endpoint: string, method: string, body?: any): Promise<GitHubResponse> {
    // Record request
    this.requestHistory.push({
      endpoint,
      method,
      body,
      timestamp: Date.now()
    });

    // Check for injected errors
    const injectedError = this.injectedErrors.find(e => e.endpoint === endpoint);
    if (injectedError) {
      throw injectedError.error;
    }

    // Check rate limit
    if (this.rateLimitRemaining <= 0) {
      return {
        data: {
          message: 'API rate limit exceeded',
          documentation_url: 'https://docs.github.com/rest/overview/resources-in-the-rest-api#rate-limiting'
        },
        status: 403,
        headers: this.getRateLimitHeaders()
      };
    }

    // Decrement rate limit
    this.rateLimitRemaining--;

    // Check for custom response
    const key = this.getResponseKey(endpoint, method);
    const mockResponse = this.responses.get(key);
    if (mockResponse) {
      return {
        data: mockResponse.data,
        status: mockResponse.statusCode,
        headers: this.getRateLimitHeaders()
      };
    }

    // Default response
    return {
      data: { message: 'Not Found' },
      status: 404,
      headers: this.getRateLimitHeaders()
    };
  }

  /**
   * Create a new issue.
   *
   * @param title - Issue title
   * @param body - Issue body (optional)
   * @param labels - Label names to apply (optional)
   * @returns Created issue
   */
  async createIssue(title: string, body?: string, labels?: string[]): Promise<Issue> {
    const issueNumber = this.issueCounter++;
    const now = new Date().toISOString();

    const issue: Issue = {
      number: issueNumber,
      title,
      body: body ?? '',
      state: 'open',
      labels: (labels ?? []).map(name => ({ name, color: '0366d6' })),
      createdAt: now,
      updatedAt: now
    };

    this.issues.set(issueNumber, issue);

    // Record request
    this.requestHistory.push({
      endpoint: '/repos/owner/repo/issues',
      method: 'POST',
      body: { title, body, labels },
      timestamp: Date.now()
    });

    return issue;
  }

  /**
   * Get an issue by number.
   *
   * @param number - Issue number
   * @returns Issue data
   * @throws Error if issue not found
   */
  async getIssue(number: number): Promise<Issue> {
    // Record request
    this.requestHistory.push({
      endpoint: `/repos/owner/repo/issues/${number}`,
      method: 'GET',
      timestamp: Date.now()
    });

    const issue = this.issues.get(number);
    if (!issue) {
      throw new Error(`Issue #${number} not found`);
    }

    return issue;
  }

  /**
   * List issues with optional filtering.
   *
   * @param options - Filter options
   * @returns Array of issues
   */
  async listIssues(options: IssueListOptions = {}): Promise<Issue[]> {
    // Record request
    this.requestHistory.push({
      endpoint: '/repos/owner/repo/issues',
      method: 'GET',
      body: options,
      timestamp: Date.now()
    });

    let issueList = Array.from(this.issues.values());

    // Filter by state
    if (options.state && options.state !== 'all') {
      issueList = issueList.filter(issue => issue.state === options.state);
    }

    // Filter by labels
    if (options.labels && options.labels.length > 0) {
      issueList = issueList.filter(issue => {
        const issueLabels = issue.labels.map(l => l.name);
        return options.labels!.every(label => issueLabels.includes(label));
      });
    }

    // Sort by number (descending)
    issueList.sort((a, b) => b.number - a.number);

    // Pagination
    const page = options.page ?? 1;
    const perPage = options.per_page ?? 30;
    const startIndex = (page - 1) * perPage;
    const endIndex = startIndex + perPage;

    return issueList.slice(startIndex, endIndex);
  }

  /**
   * Create a new pull request.
   *
   * @param title - PR title
   * @param head - Head branch name
   * @param base - Base branch name
   * @returns Created pull request
   */
  async createPullRequest(title: string, head: string, base: string): Promise<PullRequest> {
    const prNumber = this.prCounter++;
    const now = new Date().toISOString();

    const pr: PullRequest = {
      number: prNumber,
      title,
      head,
      base,
      state: 'open',
      createdAt: now
    };

    this.pullRequests.set(prNumber, pr);

    // Record request
    this.requestHistory.push({
      endpoint: '/repos/owner/repo/pulls',
      method: 'POST',
      body: { title, head, base },
      timestamp: Date.now()
    });

    return pr;
  }

  /**
   * Add labels to an issue.
   *
   * @param issueNumber - Issue number
   * @param labels - Label names to add
   * @throws Error if issue not found
   */
  async addLabel(issueNumber: number, labels: string[]): Promise<void> {
    // Record request
    this.requestHistory.push({
      endpoint: `/repos/owner/repo/issues/${issueNumber}/labels`,
      method: 'POST',
      body: { labels },
      timestamp: Date.now()
    });

    const issue = this.issues.get(issueNumber);
    if (!issue) {
      throw new Error(`Issue #${issueNumber} not found`);
    }

    // Add new labels (avoid duplicates)
    const existingLabels = new Set(issue.labels.map(l => l.name));
    for (const labelName of labels) {
      if (!existingLabels.has(labelName)) {
        issue.labels.push({ name: labelName, color: '0366d6' });
      }
    }

    issue.updatedAt = new Date().toISOString();
  }

  /**
   * Reset the stub to initial state.
   * Clears all issues, pull requests, responses, and request history.
   */
  reset(): void {
    this.responses.clear();
    this.requestHistory = [];
    this.issues.clear();
    this.pullRequests.clear();
    this.issueCounter = 1;
    this.prCounter = 1;
    this.rateLimitRemaining = 5000;
    this.rateLimitReset = Date.now() + 3600000;
    this.injectedErrors = [];
  }

  /**
   * Get the history of all requests made to the stub.
   *
   * @returns Array of requests in chronological order
   */
  getRequestHistory(): Request[] {
    return [...this.requestHistory];
  }

  /**
   * Inject an error for a specific endpoint.
   * The next request to this endpoint will throw the specified error.
   *
   * @param endpoint - API endpoint path
   * @param error - Error to throw
   */
  injectError(endpoint: string, error: Error): void {
    this.injectedErrors.push({ endpoint, error });
  }

  /**
   * Inject a rate limit error.
   * Sets rate limit to 0, causing subsequent requests to return 403.
   */
  injectRateLimitError(): void {
    this.rateLimitRemaining = 0;
  }

  /**
   * Generate a unique key for response mapping.
   */
  private getResponseKey(endpoint: string, method: string): string {
    return `${method.toUpperCase()}:${endpoint}`;
  }

  /**
   * Generate rate limit headers.
   */
  private getRateLimitHeaders(): Record<string, string> {
    return {
      'x-ratelimit-limit': '5000',
      'x-ratelimit-remaining': this.rateLimitRemaining.toString(),
      'x-ratelimit-reset': Math.floor(this.rateLimitReset / 1000).toString()
    };
  }
}
