#!/usr/bin/env node
/**
 * Workspace Manager
 *
 * Manages .aiwg/contrib/{feature}/ workspaces for contributor workflow.
 * Handles workspace creation, data persistence, and cleanup.
 *
 * Each workspace contains:
 * - status.json: Current contribution state
 * - pr.json: PR metadata (when created)
 * - quality.json: Quality validation results
 * - intake.md: Feature intake form
 */

import fs from 'fs';
import path from 'path';

/**
 * Workspace data schema:
 * {
 *   feature: string,
 *   status: 'initialized'|'intake-complete'|'development'|'testing'|'pr-created'|'pr-updated'|'merged'|'aborted',
 *   pr: { number: number, url: string, state: string } | null,
 *   quality: { score: number, passed: boolean, issues: Array } | null,
 *   created: string (ISO date),
 *   updated: string (ISO date),
 *   branch: string,
 *   upstream: string
 * }
 */

/**
 * Get the base .aiwg/contrib directory
 * @param {string} projectRoot - Project root directory (defaults to cwd)
 * @returns {string} Path to .aiwg/contrib
 */
function getContribDir(projectRoot = process.cwd()) {
  return path.join(projectRoot, '.aiwg', 'contrib');
}

/**
 * Get workspace path for a feature
 * @param {string} feature - Feature name
 * @param {string} projectRoot - Project root directory (defaults to cwd)
 * @returns {string} Path to workspace directory
 */
export function getWorkspacePath(feature, projectRoot = process.cwd()) {
  return path.join(getContribDir(projectRoot), feature);
}

/**
 * Initialize workspace for a new contribution
 * @param {string} feature - Feature name
 * @param {Object} options - Initialization options
 * @param {string} options.branch - Git branch name
 * @param {string} options.upstream - Upstream repository (owner/repo)
 * @param {string} options.projectRoot - Project root directory (defaults to cwd)
 * @returns {Object} { success: boolean, path: string|null, error: string|null }
 */
export function initWorkspace(feature, options = {}) {
  const { branch, upstream, projectRoot = process.cwd() } = options;

  if (!feature) {
    return {
      success: false,
      path: null,
      error: 'Feature name is required'
    };
  }

  const workspacePath = getWorkspacePath(feature, projectRoot);

  // Check if workspace already exists
  if (fs.existsSync(workspacePath)) {
    return {
      success: false,
      path: null,
      error: `Workspace already exists: ${workspacePath}`
    };
  }

  try {
    // Create workspace directory structure
    fs.mkdirSync(workspacePath, { recursive: true });

    // Initialize status data
    const statusData = {
      feature,
      status: 'initialized',
      pr: null,
      quality: null,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      branch: branch || `contrib/${feature}`,
      upstream: upstream || 'jmagly/ai-writing-guide'
    };

    // Save initial status
    fs.writeFileSync(
      path.join(workspacePath, 'status.json'),
      JSON.stringify(statusData, null, 2) + '\n',
      'utf8'
    );

    return {
      success: true,
      path: workspacePath,
      error: null
    };
  } catch (err) {
    return {
      success: false,
      path: null,
      error: `Failed to create workspace: ${err.message}`
    };
  }
}

/**
 * Save workspace data to JSON file
 * @param {string} feature - Feature name
 * @param {Object} data - Data to save
 * @param {string} filename - Filename (default: 'status.json')
 * @param {string} projectRoot - Project root directory (defaults to cwd)
 * @returns {Object} { success: boolean, error: string|null }
 */
export function saveWorkspaceData(feature, data, filename = 'status.json', projectRoot = process.cwd()) {
  const workspacePath = getWorkspacePath(feature, projectRoot);

  if (!fs.existsSync(workspacePath)) {
    return {
      success: false,
      error: `Workspace not found: ${workspacePath}`
    };
  }

  try {
    // Update timestamp
    const updatedData = {
      ...data,
      updated: new Date().toISOString()
    };

    fs.writeFileSync(
      path.join(workspacePath, filename),
      JSON.stringify(updatedData, null, 2) + '\n',
      'utf8'
    );

    return {
      success: true,
      error: null
    };
  } catch (err) {
    return {
      success: false,
      error: `Failed to save workspace data: ${err.message}`
    };
  }
}

/**
 * Load workspace data from JSON file
 * @param {string} feature - Feature name
 * @param {string} filename - Filename (default: 'status.json')
 * @param {string} projectRoot - Project root directory (defaults to cwd)
 * @returns {Object} { success: boolean, data: Object|null, error: string|null }
 */
export function loadWorkspaceData(feature, filename = 'status.json', projectRoot = process.cwd()) {
  const workspacePath = getWorkspacePath(feature, projectRoot);
  const filePath = path.join(workspacePath, filename);

  if (!fs.existsSync(filePath)) {
    return {
      success: false,
      data: null,
      error: `Workspace data not found: ${filePath}`
    };
  }

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);

    return {
      success: true,
      data,
      error: null
    };
  } catch (err) {
    return {
      success: false,
      data: null,
      error: `Failed to load workspace data: ${err.message}`
    };
  }
}

/**
 * Update workspace status
 * @param {string} feature - Feature name
 * @param {string} status - New status
 * @param {Object} additionalData - Additional data to merge
 * @param {string} projectRoot - Project root directory (defaults to cwd)
 * @returns {Object} { success: boolean, error: string|null }
 */
export function updateWorkspaceStatus(feature, status, additionalData = {}, projectRoot = process.cwd()) {
  const currentData = loadWorkspaceData(feature, 'status.json', projectRoot);

  if (!currentData.success) {
    return {
      success: false,
      error: currentData.error
    };
  }

  const updatedData = {
    ...currentData.data,
    status,
    ...additionalData
  };

  return saveWorkspaceData(feature, updatedData, 'status.json', projectRoot);
}

/**
 * List all active contribution workspaces
 * @param {string} projectRoot - Project root directory (defaults to cwd)
 * @returns {Object} { success: boolean, workspaces: Array|null, error: string|null }
 */
export function listWorkspaces(projectRoot = process.cwd()) {
  const contribDir = getContribDir(projectRoot);

  if (!fs.existsSync(contribDir)) {
    return {
      success: true,
      workspaces: [],
      error: null
    };
  }

  try {
    const entries = fs.readdirSync(contribDir, { withFileTypes: true });
    const workspaces = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const statusPath = path.join(contribDir, entry.name, 'status.json');
        if (fs.existsSync(statusPath)) {
          try {
            const status = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
            workspaces.push({
              feature: entry.name,
              path: path.join(contribDir, entry.name),
              status: status.status,
              pr: status.pr,
              created: status.created,
              updated: status.updated
            });
          } catch (err) {
            // Skip invalid workspace
            continue;
          }
        }
      }
    }

    return {
      success: true,
      workspaces,
      error: null
    };
  } catch (err) {
    return {
      success: false,
      workspaces: null,
      error: `Failed to list workspaces: ${err.message}`
    };
  }
}

/**
 * Clean workspace (remove all files and directory)
 * @param {string} feature - Feature name
 * @param {string} projectRoot - Project root directory (defaults to cwd)
 * @returns {Object} { success: boolean, error: string|null }
 */
export function cleanWorkspace(feature, projectRoot = process.cwd()) {
  const workspacePath = getWorkspacePath(feature, projectRoot);

  if (!fs.existsSync(workspacePath)) {
    return {
      success: false,
      error: `Workspace not found: ${workspacePath}`
    };
  }

  try {
    fs.rmSync(workspacePath, { recursive: true, force: true });

    return {
      success: true,
      error: null
    };
  } catch (err) {
    return {
      success: false,
      error: `Failed to clean workspace: ${err.message}`
    };
  }
}

/**
 * Check if workspace exists for a feature
 * @param {string} feature - Feature name
 * @param {string} projectRoot - Project root directory (defaults to cwd)
 * @returns {boolean} True if workspace exists
 */
export function workspaceExists(feature, projectRoot = process.cwd()) {
  const workspacePath = getWorkspacePath(feature, projectRoot);
  return fs.existsSync(workspacePath);
}

/**
 * Save quality report to workspace
 * @param {string} feature - Feature name
 * @param {Object} qualityData - Quality validation results
 * @param {string} projectRoot - Project root directory (defaults to cwd)
 * @returns {Object} { success: boolean, error: string|null }
 */
export function saveQualityReport(feature, qualityData, projectRoot = process.cwd()) {
  // Save to quality.json
  const saveResult = saveWorkspaceData(feature, qualityData, 'quality.json', projectRoot);

  if (!saveResult.success) {
    return saveResult;
  }

  // Update status with quality data
  return updateWorkspaceStatus(
    feature,
    qualityData.passed ? 'testing' : 'development',
    { quality: qualityData },
    projectRoot
  );
}

/**
 * Save PR metadata to workspace
 * @param {string} feature - Feature name
 * @param {Object} prData - PR metadata
 * @param {string} projectRoot - Project root directory (defaults to cwd)
 * @returns {Object} { success: boolean, error: string|null }
 */
export function savePRMetadata(feature, prData, projectRoot = process.cwd()) {
  // Save to pr.json
  const saveResult = saveWorkspaceData(feature, prData, 'pr.json', projectRoot);

  if (!saveResult.success) {
    return saveResult;
  }

  // Update status with PR data
  return updateWorkspaceStatus(
    feature,
    'pr-created',
    { pr: prData },
    projectRoot
  );
}

/**
 * Get workspace summary (useful for status display)
 * @param {string} feature - Feature name
 * @param {string} projectRoot - Project root directory (defaults to cwd)
 * @returns {Object} { success: boolean, summary: Object|null, error: string|null }
 */
export function getWorkspaceSummary(feature, projectRoot = process.cwd()) {
  const statusData = loadWorkspaceData(feature, 'status.json', projectRoot);

  if (!statusData.success) {
    return {
      success: false,
      summary: null,
      error: statusData.error
    };
  }

  const summary = {
    feature: statusData.data.feature,
    status: statusData.data.status,
    branch: statusData.data.branch,
    created: statusData.data.created,
    updated: statusData.data.updated,
    hasPR: !!statusData.data.pr,
    pr: statusData.data.pr,
    quality: statusData.data.quality
  };

  return {
    success: true,
    summary,
    error: null
  };
}
