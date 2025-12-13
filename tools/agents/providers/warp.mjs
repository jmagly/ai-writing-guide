/**
 * Warp Terminal Provider
 *
 * Aggregates all agents and commands into a single WARP.md file.
 * Delegates to external setup-warp.mjs script.
 *
 * Deployment paths:
 *   - Output: WARP.md (single aggregated file)
 *
 * Special features:
 *   - Aggregated output (all content in one file)
 *   - Section preservation (user vs AIWG managed sections)
 *   - Backup creation with timestamp
 *   - CLAUDE.md symlink support
 */

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { initializeFrameworkWorkspace } from './base.mjs';

// ============================================================================
// Provider Configuration
// ============================================================================

export const name = 'warp';
export const aliases = [];

export const paths = {
  agents: null,  // Aggregated into WARP.md
  commands: null,  // Aggregated into WARP.md
  skills: null,
  rules: null
};

export const capabilities = {
  skills: false,
  rules: false,
  aggregatedOutput: true,  // All content in single file
  yamlFormat: false
};

// ============================================================================
// Content Transformation (handled by external script)
// ============================================================================

export function transformAgent(srcPath, content, opts) {
  return content;
}

export function transformCommand(srcPath, content, opts) {
  return content;
}

// ============================================================================
// Model Mapping (not applicable for Warp)
// ============================================================================

export function mapModel(shorthand, modelCfg, modelsConfig) {
  return shorthand;
}

// ============================================================================
// Deployment Functions
// ============================================================================

/**
 * Deploy via external setup-warp.mjs script
 */
export async function deployWarp(targetDir, srcRoot, opts) {
  const scriptPath = path.join(srcRoot, 'tools', 'warp', 'setup-warp.mjs');

  if (!fs.existsSync(scriptPath)) {
    console.warn(`Warp setup script not found at ${scriptPath}`);
    return;
  }

  console.log('Delegating to setup-warp.mjs...');

  return new Promise((resolve, reject) => {
    const args = ['--target', targetDir, '--source', srcRoot];
    if (opts.dryRun) args.push('--dry-run');
    if (opts.force) args.push('--force');
    if (opts.mode) args.push('--mode', opts.mode);

    const child = spawn('node', [scriptPath, ...args], {
      stdio: 'inherit',
      cwd: srcRoot
    });

    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`setup-warp.mjs exited with code ${code}`));
    });

    child.on('error', reject);
  });
}

// ============================================================================
// AGENTS.md (not used for Warp - content goes in WARP.md)
// ============================================================================

export function createAgentsMd(target, srcRoot, dryRun) {
  console.log('Warp uses WARP.md instead of AGENTS.md');
}

// ============================================================================
// Post-Deployment
// ============================================================================

export async function postDeploy(targetDir, opts) {
  initializeFrameworkWorkspace(targetDir, opts.mode, opts.dryRun);
}

// ============================================================================
// File Extension
// ============================================================================

export function getFileExtension(type) {
  return '.md';
}

// ============================================================================
// Main Deploy Function
// ============================================================================

export async function deploy(opts) {
  const {
    srcRoot,
    target,
    mode,
    dryRun
  } = opts;

  console.log(`\n=== Warp Terminal Provider ===`);
  console.log(`Target: ${target}`);
  console.log(`Mode: ${mode}`);

  // Warp aggregates everything into WARP.md
  console.log('\nGenerating WARP.md...');
  await deployWarp(target, srcRoot, opts);

  // Post-deployment
  await postDeploy(target, opts);

  console.log('\n=== Warp deployment complete ===\n');
}

// ============================================================================
// Default Export
// ============================================================================

export default {
  name,
  aliases,
  paths,
  capabilities,
  transformAgent,
  transformCommand,
  mapModel,
  deployWarp,
  createAgentsMd,
  postDeploy,
  getFileExtension,
  deploy
};
