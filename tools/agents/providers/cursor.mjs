/**
 * Cursor IDE Provider
 *
 * Deploys commands as Cursor rules in MDC format. Delegates to external script.
 *
 * Deployment paths:
 *   - Rules: .cursor/rules/
 *
 * Special features:
 *   - MDC format (.mdc extension)
 *   - Glob pattern attachment
 *   - $ARGUMENTS -> [arguments] conversion
 *   - Delegates to deploy-rules-cursor.mjs
 */

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import {
  ensureDir,
  createAgentsMdFromTemplate,
  initializeFrameworkWorkspace
} from './base.mjs';

// ============================================================================
// Provider Configuration
// ============================================================================

export const name = 'cursor';
export const aliases = [];

export const paths = {
  agents: null,  // Cursor doesn't have discrete agents
  commands: null,  // Commands become rules
  skills: null,
  rules: '.cursor/rules/'
};

export const capabilities = {
  skills: false,
  rules: true,  // Rules-focused provider
  aggregatedOutput: false,
  yamlFormat: false
};

// ============================================================================
// Content Transformation (handled by external script)
// ============================================================================

/**
 * Transform not needed - Cursor uses external deploy script
 */
export function transformAgent(srcPath, content, opts) {
  return content;
}

export function transformCommand(srcPath, content, opts) {
  return content;
}

// ============================================================================
// Model Mapping (not applicable for Cursor)
// ============================================================================

export function mapModel(shorthand, modelCfg, modelsConfig) {
  return shorthand;
}

// ============================================================================
// Deployment Functions
// ============================================================================

/**
 * Deploy rules via external script
 */
export async function deployRules(targetDir, srcRoot, opts) {
  const scriptPath = path.join(srcRoot, 'tools', 'rules', 'deploy-rules-cursor.mjs');

  if (!fs.existsSync(scriptPath)) {
    console.warn(`Cursor rules deployment script not found at ${scriptPath}`);
    return;
  }

  console.log('Delegating rules deployment to deploy-rules-cursor.mjs...');

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
      else reject(new Error(`deploy-rules-cursor.mjs exited with code ${code}`));
    });

    child.on('error', reject);
  });
}

// ============================================================================
// AGENTS.md
// ============================================================================

export function createAgentsMd(target, srcRoot, dryRun) {
  createAgentsMdFromTemplate(target, srcRoot, 'cursor/AGENTS.md.aiwg-template', dryRun);
}

// ============================================================================
// Post-Deployment
// ============================================================================

export async function postDeploy(targetDir, opts) {
  initializeFrameworkWorkspace(targetDir, opts.mode, opts.dryRun);

  if (opts.createAgentsMd) {
    createAgentsMd(targetDir, opts.srcRoot, opts.dryRun);
  }
}

// ============================================================================
// File Extension
// ============================================================================

export function getFileExtension(type) {
  return '.mdc';
}

// ============================================================================
// Main Deploy Function
// ============================================================================

export async function deploy(opts) {
  const {
    srcRoot,
    target,
    mode,
    dryRun,
    createAgentsMd: shouldCreateAgentsMd
  } = opts;

  console.log(`\n=== Cursor IDE Provider ===`);
  console.log(`Target: ${target}`);
  console.log(`Mode: ${mode}`);

  // Cursor primarily deploys rules (converted from commands)
  console.log('\nDeploying rules...');
  await deployRules(target, srcRoot, opts);

  // Post-deployment
  await postDeploy(target, { ...opts, createAgentsMd: shouldCreateAgentsMd });

  console.log('\n=== Cursor deployment complete ===\n');
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
  deployRules,
  createAgentsMd,
  postDeploy,
  getFileExtension,
  deploy
};
