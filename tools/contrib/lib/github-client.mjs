#!/usr/bin/env node
/**
 * GitHub Client
 *
 * Wrapper around GitHub CLI (gh) for contributor workflow operations.
 * Provides functions for fork management, PR operations, and status checks.
 *
 * All functions return structured results rather than throwing errors for
 * graceful error handling in the contributor workflow.
 */

import { execSync } from 'child_process';

/**
 * Execute gh command and return structured result
 * @param {string} command - The gh command to execute
 * @param {Object} options - Execution options
 * @returns {Object} { success: boolean, stdout: string, stderr: string, error: Error|null }
 */
function execGh(command, options = {}) {
  try {
    const stdout = execSync(command, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      ...options
    });
    return { success: true, stdout: stdout.trim(), stderr: '', error: null };
  } catch (err) {
    return {
      success: false,
      stdout: err.stdout?.toString() || '',
      stderr: err.stderr?.toString() || err.message,
      error: err
    };
  }
}

/**
 * Check if gh CLI is authenticated
 * @returns {Object} { authenticated: boolean, username: string|null, error: string|null }
 */
export function checkGhAuth() {
  const result = execGh('gh auth status 2>&1');

  if (!result.success) {
    return {
      authenticated: false,
      username: null,
      error: 'GitHub CLI not authenticated. Run: gh auth login'
    };
  }

  // Extract username from gh auth status output
  // Format: "✓ Logged in to github.com account USERNAME ..."
  const output = result.stdout || result.stderr;
  const match = output.match(/Logged in to github\.com account ([^\s]+)/);
  const username = match ? match[1] : null;

  return {
    authenticated: true,
    username,
    error: null
  };
}

/**
 * Get current GitHub username
 * @returns {Object} { success: boolean, username: string|null, error: string|null }
 */
export function getUsername() {
  const authCheck = checkGhAuth();
  if (!authCheck.authenticated) {
    return {
      success: false,
      username: null,
      error: authCheck.error
    };
  }

  return {
    success: true,
    username: authCheck.username,
    error: null
  };
}

/**
 * Fork a repository to the authenticated user's account
 * @param {string} upstream - Repository to fork in format "owner/repo"
 * @returns {Object} { success: boolean, fork: string|null, alreadyExists: boolean, error: string|null }
 */
export function forkRepo(upstream) {
  const authCheck = checkGhAuth();
  if (!authCheck.authenticated) {
    return {
      success: false,
      fork: null,
      alreadyExists: false,
      error: authCheck.error
    };
  }

  // Check if fork already exists
  const checkResult = execGh(`gh repo view ${authCheck.username}/${upstream.split('/')[1]} 2>&1`);
  if (checkResult.success) {
    return {
      success: true,
      fork: `${authCheck.username}/${upstream.split('/')[1]}`,
      alreadyExists: true,
      error: null
    };
  }

  // Create fork
  const forkResult = execGh(`gh repo fork ${upstream} --remote=false`);
  if (!forkResult.success) {
    return {
      success: false,
      fork: null,
      alreadyExists: false,
      error: `Failed to fork repository: ${forkResult.stderr}`
    };
  }

  return {
    success: true,
    fork: `${authCheck.username}/${upstream.split('/')[1]}`,
    alreadyExists: false,
    error: null
  };
}

/**
 * Create a pull request
 * @param {string} title - PR title
 * @param {string} body - PR description
 * @param {string[]} labels - Labels to add (optional)
 * @param {boolean} draft - Create as draft PR (optional)
 * @returns {Object} { success: boolean, number: number|null, url: string|null, error: string|null }
 */
export function createPR(title, body, labels = [], draft = false) {
  const authCheck = checkGhAuth();
  if (!authCheck.authenticated) {
    return {
      success: false,
      number: null,
      url: null,
      error: authCheck.error
    };
  }

  let command = `gh pr create --title "${title.replace(/"/g, '\\"')}" --body "${body.replace(/"/g, '\\"')}"`;

  if (draft) {
    command += ' --draft';
  }

  if (labels.length > 0) {
    command += ` --label "${labels.join(',')}"`;
  }

  const result = execGh(command);
  if (!result.success) {
    return {
      success: false,
      number: null,
      url: null,
      error: `Failed to create PR: ${result.stderr}`
    };
  }

  // Extract PR URL from output
  const url = result.stdout.trim();
  const numberMatch = url.match(/\/pull\/(\d+)$/);
  const number = numberMatch ? parseInt(numberMatch[1], 10) : null;

  return {
    success: true,
    number,
    url,
    error: null
  };
}

/**
 * Get PR status and reviews
 * @param {number} prNumber - PR number
 * @returns {Object} { success: boolean, status: Object|null, error: string|null }
 */
export function getPRStatus(prNumber) {
  const authCheck = checkGhAuth();
  if (!authCheck.authenticated) {
    return {
      success: false,
      status: null,
      error: authCheck.error
    };
  }

  const result = execGh(`gh pr view ${prNumber} --json state,title,statusCheckRollup,reviews,comments`);
  if (!result.success) {
    return {
      success: false,
      status: null,
      error: `Failed to get PR status: ${result.stderr}`
    };
  }

  try {
    const status = JSON.parse(result.stdout);
    return {
      success: true,
      status,
      error: null
    };
  } catch (err) {
    return {
      success: false,
      status: null,
      error: `Failed to parse PR status: ${err.message}`
    };
  }
}

/**
 * Add comment to PR
 * @param {number} prNumber - PR number
 * @param {string} comment - Comment text
 * @returns {Object} { success: boolean, error: string|null }
 */
export function commentOnPR(prNumber, comment) {
  const authCheck = checkGhAuth();
  if (!authCheck.authenticated) {
    return {
      success: false,
      error: authCheck.error
    };
  }

  const result = execGh(`gh pr comment ${prNumber} --body "${comment.replace(/"/g, '\\"')}"`);
  if (!result.success) {
    return {
      success: false,
      error: `Failed to comment on PR: ${result.stderr}`
    };
  }

  return {
    success: true,
    error: null
  };
}

/**
 * Check if user has an open PR from their fork
 * @param {string} upstream - Upstream repository in format "owner/repo"
 * @returns {Object} { success: boolean, hasPR: boolean, pr: Object|null, error: string|null }
 */
export function checkPRExists(upstream) {
  const authCheck = checkGhAuth();
  if (!authCheck.authenticated) {
    return {
      success: false,
      hasPR: false,
      pr: null,
      error: authCheck.error
    };
  }

  const result = execGh(`gh pr list --repo ${upstream} --author ${authCheck.username} --json number,title,state,headRefName`);
  if (!result.success) {
    return {
      success: false,
      hasPR: false,
      pr: null,
      error: `Failed to check for existing PRs: ${result.stderr}`
    };
  }

  try {
    const prs = JSON.parse(result.stdout);
    const openPRs = prs.filter(pr => pr.state === 'OPEN');

    return {
      success: true,
      hasPR: openPRs.length > 0,
      pr: openPRs.length > 0 ? openPRs[0] : null,
      error: null
    };
  } catch (err) {
    return {
      success: false,
      hasPR: false,
      pr: null,
      error: `Failed to parse PR list: ${err.message}`
    };
  }
}

/**
 * Check GitHub API rate limit status
 * @returns {Object} { success: boolean, limit: number|null, remaining: number|null, reset: string|null, error: string|null }
 */
export function checkRateLimit() {
  const result = execGh('gh api rate_limit');
  if (!result.success) {
    return {
      success: false,
      limit: null,
      remaining: null,
      reset: null,
      error: `Failed to check rate limit: ${result.stderr}`
    };
  }

  try {
    const data = JSON.parse(result.stdout);
    const core = data.resources.core;

    return {
      success: true,
      limit: core.limit,
      remaining: core.remaining,
      reset: new Date(core.reset * 1000).toISOString(),
      error: null
    };
  } catch (err) {
    return {
      success: false,
      limit: null,
      remaining: null,
      reset: null,
      error: `Failed to parse rate limit data: ${err.message}`
    };
  }
}

/**
 * Get PR reviews with detailed feedback
 * @param {number} prNumber - PR number
 * @returns {Object} { success: boolean, reviews: Array|null, error: string|null }
 */
export function getPRReviews(prNumber) {
  const authCheck = checkGhAuth();
  if (!authCheck.authenticated) {
    return {
      success: false,
      reviews: null,
      error: authCheck.error
    };
  }

  const result = execGh(`gh pr view ${prNumber} --json reviews`);
  if (!result.success) {
    return {
      success: false,
      reviews: null,
      error: `Failed to get PR reviews: ${result.stderr}`
    };
  }

  try {
    const data = JSON.parse(result.stdout);
    return {
      success: true,
      reviews: data.reviews || [],
      error: null
    };
  } catch (err) {
    return {
      success: false,
      reviews: null,
      error: `Failed to parse PR reviews: ${err.message}`
    };
  }
}

/**
 * Get PR review comments (file-level comments)
 * @param {number} prNumber - PR number
 * @returns {Object} { success: boolean, comments: Array|null, error: string|null }
 */
export function getPRReviewComments(prNumber) {
  const authCheck = checkGhAuth();
  if (!authCheck.authenticated) {
    return {
      success: false,
      comments: null,
      error: authCheck.error
    };
  }

  // Use GitHub API to get review comments
  const result = execGh(`gh api repos/{owner}/{repo}/pulls/${prNumber}/comments`);
  if (!result.success) {
    return {
      success: false,
      comments: null,
      error: `Failed to get PR review comments: ${result.stderr}`
    };
  }

  try {
    const comments = JSON.parse(result.stdout);
    return {
      success: true,
      comments,
      error: null
    };
  } catch (err) {
    return {
      success: false,
      comments: null,
      error: `Failed to parse PR review comments: ${err.message}`
    };
  }
}
