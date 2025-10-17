#!/usr/bin/env node
/**
 * Status Contribution Tool
 *
 * Shows contribution status and next steps for AIWG contributor workflow.
 * Can list all contributions or show detailed status for a specific feature.
 *
 * Usage:
 *   aiwg -contribute-status                     # List all contributions
 *   aiwg -contribute-status cursor-integration  # Show feature details
 */

import { execSync } from 'child_process';
import {
  listWorkspaces,
  loadWorkspaceData,
  getWorkspacePath,
  workspaceExists
} from './lib/workspace-manager.mjs';
import { getPRStatus, checkGhAuth } from './lib/github-client.mjs';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Status icons
const icons = {
  success: '✓',
  warning: '⚠',
  error: '✗',
  info: 'ℹ',
  inProgress: '⏳',
  ready: '✓'
};

/**
 * Format timestamp as human-readable relative time
 * @param {string} isoDate - ISO date string
 * @returns {string} Human-readable time (e.g., "2 hours ago")
 */
function formatRelativeTime(isoDate) {
  const now = new Date();
  const date = new Date(isoDate);
  const diffMs = now - date;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) {
    return 'just now';
  } else if (diffMins < 60) {
    return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  } else if (diffDays < 30) {
    return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
  } else {
    const diffMonths = Math.floor(diffDays / 30);
    return `${diffMonths} ${diffMonths === 1 ? 'month' : 'months'} ago`;
  }
}

/**
 * Get git status for current branch
 * @param {string} projectRoot - Project root directory
 * @returns {Object} Git status information
 */
function getGitStatus(projectRoot = process.cwd()) {
  try {
    // Get current branch
    const branch = execSync('git rev-parse --abbrev-ref HEAD', {
      cwd: projectRoot,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();

    // Get uncommitted changes
    const statusOutput = execSync('git status --porcelain', {
      cwd: projectRoot,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
    const uncommittedCount = statusOutput ? statusOutput.split('\n').length : 0;

    // Get commits ahead/behind origin
    let aheadOrigin = 0;
    let behindOrigin = 0;
    try {
      const aheadBehindOrigin = execSync(`git rev-list --left-right --count origin/${branch}...HEAD 2>/dev/null`, {
        cwd: projectRoot,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      }).trim().split('\t');
      behindOrigin = parseInt(aheadBehindOrigin[0], 10) || 0;
      aheadOrigin = parseInt(aheadBehindOrigin[1], 10) || 0;
    } catch (err) {
      // Branch may not have remote tracking yet
    }

    // Get commits ahead/behind upstream
    let aheadUpstream = 0;
    let behindUpstream = 0;
    try {
      const aheadBehindUpstream = execSync(`git rev-list --left-right --count upstream/main...HEAD 2>/dev/null`, {
        cwd: projectRoot,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      }).trim().split('\t');
      behindUpstream = parseInt(aheadBehindUpstream[0], 10) || 0;
      aheadUpstream = parseInt(aheadBehindUpstream[1], 10) || 0;
    } catch (err) {
      // Upstream may not be configured
    }

    return {
      branch,
      uncommittedCount,
      aheadOrigin,
      behindOrigin,
      aheadUpstream,
      behindUpstream
    };
  } catch (err) {
    return {
      error: `Failed to get git status: ${err.message}`
    };
  }
}

/**
 * Get quality status color
 * @param {number} score - Quality score (0-100)
 * @returns {string} Color code
 */
function getQualityColor(score) {
  if (score >= 90) return colors.green;
  if (score >= 80) return colors.yellow;
  return colors.red;
}

/**
 * Get status label with icon
 * @param {string} status - Status value
 * @returns {string} Formatted status
 */
function getStatusLabel(status) {
  const statusMap = {
    'initialized': { icon: icons.info, color: colors.blue, label: 'Initialized' },
    'intake-complete': { icon: icons.success, color: colors.green, label: 'Intake Complete' },
    'development': { icon: icons.inProgress, color: colors.yellow, label: 'In Progress' },
    'testing': { icon: icons.inProgress, color: colors.yellow, label: 'Testing' },
    'pr-created': { icon: icons.ready, color: colors.cyan, label: 'PR Created' },
    'pr-updated': { icon: icons.ready, color: colors.cyan, label: 'PR Updated' },
    'merged': { icon: icons.success, color: colors.green, label: 'Merged' },
    'aborted': { icon: icons.error, color: colors.red, label: 'Aborted' }
  };

  const { icon, color, label } = statusMap[status] || { icon: '?', color: colors.dim, label: status };
  return `${color}${icon} ${label}${colors.reset}`;
}

/**
 * List all active contributions
 * @param {string} projectRoot - Project root directory
 */
function listAllContributions(projectRoot = process.cwd()) {
  console.log(`${colors.bright}Active Contributions${colors.reset}\n`);

  const result = listWorkspaces(projectRoot);
  if (!result.success) {
    console.error(`${colors.red}${icons.error} Error: ${result.error}${colors.reset}`);
    process.exit(1);
  }

  if (result.workspaces.length === 0) {
    console.log(`${colors.dim}No active contributions found.${colors.reset}`);
    console.log(`\nStart a new contribution: ${colors.cyan}aiwg -contribute-start <feature-name>${colors.reset}`);
    return;
  }

  // Sort by updated date (most recent first)
  const workspaces = result.workspaces.sort((a, b) => {
    return new Date(b.updated) - new Date(a.updated);
  });

  workspaces.forEach((workspace, index) => {
    console.log(`${colors.bright}${index + 1}. ${workspace.feature}${colors.reset}`);
    console.log(`   Branch: ${colors.cyan}${workspace.feature}${colors.reset}`);
    console.log(`   Status: ${getStatusLabel(workspace.status)}`);

    // Show quality score if available
    const qualityData = loadWorkspaceData(workspace.feature, 'quality.json', projectRoot);
    if (qualityData.success && qualityData.data.score !== undefined) {
      const scoreColor = getQualityColor(qualityData.data.score);
      console.log(`   Quality: ${scoreColor}${qualityData.data.score}/100${colors.reset}`);
    }

    // Show PR info if available
    if (workspace.pr) {
      console.log(`   PR: ${colors.blue}#${workspace.pr.number}${colors.reset} (${workspace.pr.state})`);
    } else {
      console.log(`   PR: ${colors.dim}Not created${colors.reset}`);
    }

    console.log(`   Last updated: ${colors.dim}${formatRelativeTime(workspace.updated)}${colors.reset}`);
    console.log('');
  });

  console.log(`${colors.dim}Use: ${colors.cyan}aiwg -contribute-status <feature>${colors.dim} for details${colors.reset}`);
}

/**
 * Show detailed status for a specific feature
 * @param {string} feature - Feature name
 * @param {string} projectRoot - Project root directory
 */
async function showFeatureStatus(feature, projectRoot = process.cwd()) {
  // Check if workspace exists
  if (!workspaceExists(feature, projectRoot)) {
    console.error(`${colors.red}${icons.error} Error: Contribution workspace not found for '${feature}'${colors.reset}`);
    console.log(`\nAvailable contributions:`);
    listAllContributions(projectRoot);
    process.exit(1);
  }

  // Load workspace data
  const statusData = loadWorkspaceData(feature, 'status.json', projectRoot);
  if (!statusData.success) {
    console.error(`${colors.red}${icons.error} Error: ${statusData.error}${colors.reset}`);
    process.exit(1);
  }

  const status = statusData.data;
  const workspacePath = getWorkspacePath(feature, projectRoot);

  // Header
  console.log(`${colors.bright}Feature: ${feature}${colors.reset}`);
  console.log(`Branch: ${colors.cyan}${status.branch}${colors.reset}`);
  console.log(`Workspace: ${colors.dim}${workspacePath}${colors.reset}\n`);

  // Git Status
  console.log(`${colors.bright}Git Status:${colors.reset}`);
  const gitStatus = getGitStatus(projectRoot);

  if (gitStatus.error) {
    console.log(`${colors.red}${icons.error} ${gitStatus.error}${colors.reset}\n`);
  } else {
    // Uncommitted changes
    if (gitStatus.uncommittedCount > 0) {
      console.log(`${colors.yellow}${icons.warning} Uncommitted: ${gitStatus.uncommittedCount} files modified${colors.reset}`);
    } else {
      console.log(`${colors.green}${icons.success} Working directory clean${colors.reset}`);
    }

    // Ahead/behind origin
    if (gitStatus.aheadOrigin > 0) {
      console.log(`${colors.blue}${icons.info} Ahead of origin: ${gitStatus.aheadOrigin} commits${colors.reset}`);
    }
    if (gitStatus.behindOrigin > 0) {
      console.log(`${colors.yellow}${icons.warning} Behind origin: ${gitStatus.behindOrigin} commits (push recommended)${colors.reset}`);
    }

    // Ahead/behind upstream
    if (gitStatus.behindUpstream > 0) {
      console.log(`${colors.yellow}${icons.warning} Behind upstream: ${gitStatus.behindUpstream} commits (rebase recommended)${colors.reset}`);
    }

    console.log('');
  }

  // Quality Status
  const qualityData = loadWorkspaceData(feature, 'quality.json', projectRoot);
  if (qualityData.success) {
    console.log(`${colors.bright}Quality Status:${colors.reset}`);
    const quality = qualityData.data;
    const scoreColor = getQualityColor(quality.score);

    console.log(`Score: ${scoreColor}${quality.score}/100${colors.reset} ${quality.score >= 80 ? '(READY for PR)' : '(needs improvement)'}`);
    console.log(`Last validated: ${colors.dim}${formatRelativeTime(quality.updated || status.updated)}${colors.reset}\n`);
  } else {
    console.log(`${colors.bright}Quality Status:${colors.reset}`);
    console.log(`${colors.dim}Not validated yet${colors.reset}\n`);
  }

  // PR Status
  console.log(`${colors.bright}PR Status:${colors.reset}`);
  if (status.pr) {
    const prNumber = status.pr.number;
    console.log(`${colors.blue}#${prNumber}${colors.reset}: ${status.pr.title || 'Pull Request'}`);

    // Try to fetch live PR status
    const authCheck = checkGhAuth();
    if (authCheck.authenticated) {
      const prStatus = getPRStatus(prNumber);
      if (prStatus.success) {
        const state = prStatus.status.state;
        const stateColor = state === 'OPEN' ? colors.green : state === 'MERGED' ? colors.magenta : colors.red;
        console.log(`Status: ${stateColor}${state}${colors.reset}`);

        // Show reviews
        if (prStatus.status.reviews && prStatus.status.reviews.length > 0) {
          const approvals = prStatus.status.reviews.filter(r => r.state === 'APPROVED').length;
          const changesRequested = prStatus.status.reviews.filter(r => r.state === 'CHANGES_REQUESTED').length;

          if (changesRequested > 0) {
            console.log(`Reviews: ${colors.red}${changesRequested} changes requested${colors.reset}`);
          } else if (approvals > 0) {
            console.log(`Reviews: ${colors.green}${approvals} approved${colors.reset}`);
          } else {
            console.log(`Reviews: ${colors.dim}${prStatus.status.reviews.length} pending${colors.reset}`);
          }
        }

        // Show CI status
        if (prStatus.status.statusCheckRollup && prStatus.status.statusCheckRollup.length > 0) {
          const checks = prStatus.status.statusCheckRollup;
          const passing = checks.filter(c => c.conclusion === 'SUCCESS').length;
          const failing = checks.filter(c => c.conclusion === 'FAILURE').length;
          const pending = checks.filter(c => !c.conclusion).length;

          if (failing > 0) {
            console.log(`CI: ${colors.red}${failing} failing${colors.reset}`);
          } else if (pending > 0) {
            console.log(`CI: ${colors.yellow}${pending} in progress${colors.reset}`);
          } else if (passing > 0) {
            console.log(`CI: ${colors.green}Passing${colors.reset}`);
          }
        }
      }
    }

    console.log('');
  } else {
    console.log(`${colors.dim}Not created${colors.reset}\n`);
  }

  // Next Steps
  console.log(`${colors.bright}Next steps:${colors.reset}`);
  const recommendations = getRecommendations(status, gitStatus, qualityData.data);
  recommendations.forEach((rec, index) => {
    console.log(`${index + 1}. ${rec}`);
  });
}

/**
 * Get smart recommendations based on current status
 * @param {Object} status - Workspace status
 * @param {Object} gitStatus - Git status
 * @param {Object} quality - Quality data
 * @returns {string[]} List of recommendations
 */
function getRecommendations(status, gitStatus, quality) {
  const recommendations = [];

  // Check uncommitted changes
  if (!gitStatus.error && gitStatus.uncommittedCount > 0) {
    recommendations.push(`${colors.yellow}Commit changes before creating PR${colors.reset}`);
  }

  // Check behind upstream
  if (!gitStatus.error && gitStatus.behindUpstream > 0) {
    recommendations.push(`${colors.cyan}Sync with upstream: aiwg -contribute-sync ${status.feature}${colors.reset}`);
  }

  // Check quality score
  if (quality && quality.score < 80) {
    recommendations.push(`${colors.yellow}Run aiwg -contribute-test to improve quality (current: ${quality.score}/100)${colors.reset}`);
  }

  // Check PR status
  if (status.pr) {
    // PR exists
    const prNumber = status.pr.number;
    const authCheck = checkGhAuth();
    if (authCheck.authenticated) {
      const prStatus = getPRStatus(prNumber);
      if (prStatus.success && prStatus.status.reviews) {
        const changesRequested = prStatus.status.reviews.filter(r => r.state === 'CHANGES_REQUESTED').length;
        if (changesRequested > 0) {
          recommendations.push(`${colors.red}Address PR feedback: aiwg -contribute-respond ${status.feature}${colors.reset}`);
        }
      }
    }

    // Check if behind origin (changes need to be pushed)
    if (!gitStatus.error && gitStatus.aheadOrigin > 0) {
      recommendations.push(`${colors.blue}Push updates to PR: git push origin ${status.branch}${colors.reset}`);
    }
  } else {
    // No PR yet
    if (quality && quality.score >= 80 && !gitStatus.error && gitStatus.uncommittedCount === 0) {
      recommendations.push(`${colors.green}Ready to create PR: aiwg -contribute-pr ${status.feature}${colors.reset}`);
    } else if (!quality) {
      recommendations.push(`${colors.cyan}Validate quality: aiwg -contribute-test ${status.feature}${colors.reset}`);
    }
  }

  // Default if no specific recommendations
  if (recommendations.length === 0) {
    recommendations.push(`${colors.green}Continue development or run aiwg -contribute-status for updates${colors.reset}`);
  }

  return recommendations;
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);
  const feature = args[0];
  const projectRoot = process.cwd();

  if (!feature) {
    // List all contributions
    listAllContributions(projectRoot);
  } else {
    // Show feature details
    showFeatureStatus(feature, projectRoot);
  }
}

// Run main
main();
