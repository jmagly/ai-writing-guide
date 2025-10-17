#!/usr/bin/env node
/**
 * Monitor PR Status and Reviews
 *
 * Usage:
 *   aiwg -contribute-monitor <feature-name> [--watch]
 *
 * Examples:
 *   aiwg -contribute-monitor cursor-integration
 *   aiwg -contribute-monitor cursor-integration --watch
 *
 * Features:
 * - Displays PR status, reviews, and CI/CD checks
 * - Shows review comments with file context
 * - Provides smart recommendations for next steps
 * - Watch mode refreshes every 30 seconds
 * - Graceful handling of rate limits and errors
 */

import { getPRStatus, getPRReviews, getPRReviewComments, checkRateLimit } from './lib/github-client.mjs';
import { loadWorkspaceData } from './lib/workspace-manager.mjs';

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',

  // Status colors
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

/**
 * Format timestamp to human-readable relative time
 * @param {string} timestamp - ISO timestamp
 * @returns {string} Human-readable time (e.g., "2 hours ago")
 */
function formatRelativeTime(timestamp) {
  const now = new Date();
  const then = new Date(timestamp);
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
  return then.toLocaleDateString();
}

/**
 * Format review state with color
 * @param {string} state - Review state (APPROVED, CHANGES_REQUESTED, COMMENTED, etc.)
 * @returns {string} Colored state string
 */
function formatReviewState(state) {
  switch (state) {
    case 'APPROVED':
      return `${colors.green}✓ Approved${colors.reset}`;
    case 'CHANGES_REQUESTED':
      return `${colors.red}⚠ Changes Requested${colors.reset}`;
    case 'COMMENTED':
      return `${colors.blue}💬 Commented${colors.reset}`;
    case 'DISMISSED':
      return `${colors.gray}[Dismissed]${colors.reset}`;
    default:
      return `${colors.yellow}⏳ Pending${colors.reset}`;
  }
}

/**
 * Format PR state with color
 * @param {string} state - PR state (OPEN, MERGED, CLOSED)
 * @returns {string} Colored state string
 */
function formatPRState(state) {
  switch (state) {
    case 'OPEN':
      return `${colors.green}✓ Open${colors.reset}`;
    case 'MERGED':
      return `${colors.blue}✓ Merged${colors.reset}`;
    case 'CLOSED':
      return `${colors.red}✗ Closed${colors.reset}`;
    default:
      return state;
  }
}

/**
 * Format CI/CD check status
 * @param {string} conclusion - Check conclusion (SUCCESS, FAILURE, etc.)
 * @returns {string} Colored status string
 */
function formatCheckStatus(conclusion) {
  switch (conclusion) {
    case 'SUCCESS':
      return `${colors.green}✓ Passed${colors.reset}`;
    case 'FAILURE':
      return `${colors.red}✗ Failed${colors.reset}`;
    case 'PENDING':
      return `${colors.yellow}⏳ Pending${colors.reset}`;
    case 'NEUTRAL':
      return `${colors.gray}○ Neutral${colors.reset}`;
    case 'CANCELLED':
      return `${colors.gray}⊗ Cancelled${colors.reset}`;
    case 'SKIPPED':
      return `${colors.gray}− Skipped${colors.reset}`;
    default:
      return `${colors.yellow}? ${conclusion}${colors.reset}`;
  }
}

/**
 * Aggregate review state from all reviews
 * @param {Array} reviews - Array of review objects
 * @returns {string} Aggregated state
 */
function aggregateReviewState(reviews) {
  if (!reviews || reviews.length === 0) return 'No reviews yet';

  // Get most recent review from each reviewer
  const latestReviews = new Map();
  for (const review of reviews.sort((a, b) =>
    new Date(b.submittedAt) - new Date(a.submittedAt)
  )) {
    if (!latestReviews.has(review.author.login)) {
      latestReviews.set(review.author.login, review);
    }
  }

  const states = Array.from(latestReviews.values()).map(r => r.state);

  if (states.includes('CHANGES_REQUESTED')) {
    return `${colors.red}Changes Requested${colors.reset}`;
  }
  if (states.includes('APPROVED')) {
    return `${colors.green}Approved${colors.reset}`;
  }
  if (states.includes('COMMENTED')) {
    return `${colors.blue}Commented${colors.reset}`;
  }
  return 'Pending review';
}

/**
 * Display PR status summary
 * @param {Object} prData - PR data from workspace
 * @param {Object} status - PR status from GitHub
 */
function displayPRSummary(prData, status) {
  console.log(`\n${colors.bright}${colors.cyan}PR #${prData.number}: ${status.title}${colors.reset}`);
  console.log(`${colors.gray}─────────────────────────────────────────────────────${colors.reset}`);

  // Status line
  const prState = formatPRState(status.state);
  const reviewState = aggregateReviewState(status.reviews);
  console.log(`Status: ${prState} | ${reviewState}`);

  // Additional metadata
  console.log(`URL: ${colors.blue}${prData.url}${colors.reset}`);
  console.log();
}

/**
 * Display CI/CD check results
 * @param {Array} checks - CI/CD check results
 */
function displayCIChecks(checks) {
  if (!checks || checks.length === 0) {
    console.log(`${colors.gray}No CI/CD checks configured${colors.reset}\n`);
    return;
  }

  console.log(`${colors.bright}CI/CD Checks:${colors.reset}`);

  for (const check of checks) {
    const status = formatCheckStatus(check.conclusion || check.status);
    console.log(`  ${status} ${check.name}`);

    // Show details for failed checks
    if (check.conclusion === 'FAILURE' && check.detailsUrl) {
      console.log(`    ${colors.gray}Details: ${check.detailsUrl}${colors.reset}`);
    }
  }

  console.log();
}

/**
 * Display review comments
 * @param {Array} reviews - Review objects
 * @param {Array} comments - Review comment objects
 */
function displayReviews(reviews, comments) {
  if ((!reviews || reviews.length === 0) && (!comments || comments.length === 0)) {
    console.log(`${colors.gray}No reviews yet${colors.reset}\n`);
    return;
  }

  console.log(`${colors.bright}Reviews:${colors.reset}`);

  // Group reviews by reviewer
  const reviewsByAuthor = new Map();

  // Add top-level reviews
  if (reviews) {
    for (const review of reviews) {
      if (!reviewsByAuthor.has(review.author.login)) {
        reviewsByAuthor.set(review.author.login, []);
      }
      reviewsByAuthor.get(review.author.login).push({
        type: 'review',
        state: review.state,
        body: review.body,
        submittedAt: review.submittedAt
      });
    }
  }

  // Add file-level comments
  if (comments) {
    for (const comment of comments) {
      const author = comment.user.login;
      if (!reviewsByAuthor.has(author)) {
        reviewsByAuthor.set(author, []);
      }
      reviewsByAuthor.get(author).push({
        type: 'comment',
        body: comment.body,
        path: comment.path,
        line: comment.line || comment.original_line,
        submittedAt: comment.created_at
      });
    }
  }

  // Display reviews by author
  for (const [author, items] of reviewsByAuthor) {
    // Get latest review state
    const latestReview = items
      .filter(i => i.type === 'review')
      .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))[0];

    const state = latestReview ? formatReviewState(latestReview.state) : '';
    const time = items[0]?.submittedAt ? formatRelativeTime(items[0].submittedAt) : '';

    console.log(`\n${colors.bright}@${author}${colors.reset} ${state}`);
    if (time) {
      console.log(`${colors.gray}Posted ${time}${colors.reset}`);
    }

    // Display review body
    if (latestReview?.body) {
      console.log();
      console.log(latestReview.body.trim().split('\n').map(line => `  ${line}`).join('\n'));
    }

    // Display file comments
    const fileComments = items.filter(i => i.type === 'comment');
    if (fileComments.length > 0) {
      console.log();
      for (const comment of fileComments) {
        console.log(`  ${colors.cyan}${comment.path}${comment.line ? `:${comment.line}` : ''}${colors.reset}`);
        console.log(comment.body.trim().split('\n').map(line => `    ${line}`).join('\n'));
      }
    }
  }

  console.log();
}

/**
 * Generate smart recommendations based on PR state
 * @param {Object} status - PR status
 * @param {string} feature - Feature name
 */
function displayRecommendations(status, feature) {
  console.log(`${colors.bright}Next steps:${colors.reset}`);

  const checks = status.statusCheckRollup || [];
  const reviews = status.reviews || [];

  // Check for failing CI
  const failedChecks = checks.filter(c => c.conclusion === 'FAILURE');
  if (failedChecks.length > 0) {
    console.log(`  ${colors.red}1. Fix CI failures before review${colors.reset}`);
    for (const check of failedChecks) {
      console.log(`     ${colors.gray}${check.name}: ${check.detailsUrl}${colors.reset}`);
    }
    return;
  }

  // Check for merge conflicts (not directly available in status, but can be inferred)
  const hasChangesRequested = reviews.some(r => r.state === 'CHANGES_REQUESTED');
  if (hasChangesRequested) {
    console.log(`  ${colors.yellow}1. Address changes: ${colors.bright}aiwg -contribute-respond ${feature}${colors.reset}`);
    console.log(`  ${colors.gray}2. Discuss review: gh pr comment --body "..."${colors.reset}`);
    console.log(`  ${colors.gray}3. View online: gh pr view --web${colors.reset}`);
    return;
  }

  const hasApproval = reviews.some(r => r.state === 'APPROVED');
  if (hasApproval) {
    console.log(`  ${colors.green}✓ PR is approved! Maintainer will merge soon.${colors.reset}`);
    console.log(`  ${colors.gray}Monitor status: aiwg -contribute-monitor ${feature} --watch${colors.reset}`);
    return;
  }

  // Pending review
  console.log(`  ${colors.gray}⏳ Waiting for maintainer review${colors.reset}`);
  console.log(`  ${colors.gray}Monitor status: aiwg -contribute-monitor ${feature} --watch${colors.reset}`);
}

/**
 * Display complete PR status
 * @param {string} feature - Feature name
 * @param {string} projectRoot - Project root directory
 * @returns {Promise<boolean>} Success status
 */
async function displayPRStatus(feature, projectRoot = process.cwd()) {
  // Load workspace data
  const workspaceResult = loadWorkspaceData(feature, 'pr.json', projectRoot);
  if (!workspaceResult.success) {
    console.error(`${colors.red}Error:${colors.reset} ${workspaceResult.error}`);
    console.error(`\nMake sure you've created a PR first: ${colors.bright}aiwg -contribute-pr ${feature}${colors.reset}`);
    return false;
  }

  const prData = workspaceResult.data;
  const prNumber = prData.number;

  // Fetch PR status
  const statusResult = getPRStatus(prNumber);
  if (!statusResult.success) {
    console.error(`${colors.red}Error:${colors.reset} ${statusResult.error}`);
    return false;
  }

  const status = statusResult.status;

  // Fetch detailed reviews
  const reviewsResult = getPRReviews(prNumber);
  if (reviewsResult.success) {
    status.reviews = reviewsResult.reviews;
  }

  // Fetch review comments
  const commentsResult = getPRReviewComments(prNumber);
  const comments = commentsResult.success ? commentsResult.comments : [];

  // Display PR summary
  displayPRSummary(prData, status);

  // Display CI/CD checks
  displayCIChecks(status.statusCheckRollup);

  // Display reviews
  displayReviews(status.reviews, comments);

  // Display recommendations
  displayRecommendations(status, feature);

  return true;
}

/**
 * Watch mode: continuously monitor PR status
 * @param {string} feature - Feature name
 * @param {string} projectRoot - Project root directory
 */
async function watchPRStatus(feature, projectRoot = process.cwd()) {
  let iteration = 0;

  // Set up Ctrl+C handler
  process.on('SIGINT', () => {
    console.log(`\n\n${colors.gray}Monitoring stopped.${colors.reset}`);
    process.exit(0);
  });

  while (true) {
    // Clear screen
    if (iteration > 0) {
      console.clear();
    }

    // Display status
    const success = await displayPRStatus(feature, projectRoot);

    if (!success) {
      console.error(`\n${colors.red}Failed to fetch PR status. Exiting watch mode.${colors.reset}`);
      process.exit(1);
    }

    // Check rate limit
    const rateLimit = checkRateLimit();
    if (rateLimit.success && rateLimit.remaining < 10) {
      console.log(`\n${colors.yellow}Warning: GitHub API rate limit low (${rateLimit.remaining}/${rateLimit.limit})${colors.reset}`);
      console.log(`${colors.gray}Resets at: ${new Date(rateLimit.reset).toLocaleTimeString()}${colors.reset}`);
    }

    // Wait message
    console.log(`\n${colors.gray}Refreshing in 30s... (Ctrl+C to exit)${colors.reset}`);

    // Wait 30 seconds
    await new Promise(resolve => setTimeout(resolve, 30000));
    iteration++;
  }
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
${colors.bright}Usage:${colors.reset}
  aiwg -contribute-monitor <feature-name> [--watch]

${colors.bright}Description:${colors.reset}
  Monitor PR status and show review comments

${colors.bright}Arguments:${colors.reset}
  feature-name          Name of the contribution (required)

${colors.bright}Options:${colors.reset}
  --watch               Continuous monitoring (refresh every 30s)
  --help, -h            Show this help message

${colors.bright}Examples:${colors.reset}
  # Check PR status once
  aiwg -contribute-monitor cursor-integration

  # Continuous monitoring (watch mode)
  aiwg -contribute-monitor cursor-integration --watch

${colors.bright}Note:${colors.reset}
  This command requires a PR to have been created first using:
    aiwg -contribute-pr <feature-name>
`);
    process.exit(0);
  }

  const feature = args[0];
  const watchMode = args.includes('--watch');

  if (watchMode) {
    await watchPRStatus(feature);
  } else {
    const success = await displayPRStatus(feature);
    process.exit(success ? 0 : 1);
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => {
    console.error(`${colors.red}Fatal error:${colors.reset} ${err.message}`);
    process.exit(1);
  });
}

export { displayPRStatus, watchPRStatus };
