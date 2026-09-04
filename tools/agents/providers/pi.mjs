/**
 * Pi Coding Agent provider.
 *
 * Verified against earendil-works/pi commit
 * 79680533c6b898894f2d2421c7f640b212d3dfdd on 2026-09-03.
 * Pi discovers project skills in .agents/skills and .pi/skills, prompt
 * templates in .pi/prompts, and context through the root-to-cwd AGENTS chain.
 */

import path from 'path';
import fs from 'fs';
import {
  collectFrameworkArtifacts,
  createAgentsMdFromTemplate,
  deployFiles,
  deploySkillsWithKernelRouting,
  ensureDir,
  getAddonAgentFiles,
  getAddonCommandFiles,
  getAddonSkillDirs,
  normalizeDeploymentMode,
  resolveAiwgRoot,
} from './base.mjs';

export const name = 'pi';
export const aliases = ['pi-coding-agent'];

export const paths = {
  agents: '',
  commands: '.pi/prompts',
  skills: '.pi/.aiwg/skills',
  rules: '',
};

export const extensionBridge = 'agentic/code/providers/pi/aiwg-bridge.ts';

export const kernelSkillsPath = '.agents/skills';

export const support = {
  agents: 'skills',
  commands: 'native',
  skills: 'native',
  rules: 'context',
};

export const capabilities = {
  skills: true,
  rules: false,
  aggregatedOutput: false,
  yamlFormat: true,
  homeDirectoryDeploy: false,
  parallelCommandAndSkillSurfaces: true,
};

export function mapModel(originalModel) {
  return originalModel;
}

export function transformAgent(_srcPath, content) {
  return content;
}

export function transformCommand(_srcPath, content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    return `---\ndescription: AIWG prompt template\n---\n\n${content.trim()}\n`;
  }

  const frontmatter = match[1];
  const body = match[2].trim();
  const description = frontmatter.match(/^description:\s*(.+)$/m)?.[1]?.trim()
    || body.split(/\r?\n/).find(line => line.trim())?.trim()
    || 'AIWG prompt template';
  const argumentHint = frontmatter.match(/^argument-hint:\s*(.+)$/m)?.[1]?.trim();
  const piFrontmatter = [
    '---',
    `description: ${description}`,
    ...(argumentHint ? [`argument-hint: ${argumentHint}`] : []),
    '---',
  ].join('\n');
  const hasArgumentExpansion = /\$(?:@|ARGUMENTS|[1-9]\d*)|\$\{(?:@|ARGUMENTS|[1-9]\d*)(?::[^}]*)?\}/.test(body);
  const argumentBridge = argumentHint && !hasArgumentExpansion
    ? '\n\nInvocation arguments: $@'
    : '';
  return `${piFrontmatter}\n\n${body}${argumentBridge}\n`;
}

export function deployAgents() {
  // Pi has no discrete persona-file surface. Agent-to-skill projection is
  // handled by the canonical skill deployment path.
  return 0;
}

export function deployCommands(commandFiles, targetDir, opts) {
  const destDir = path.join(targetDir, paths.commands);
  ensureDir(destDir, opts.dryRun);
  return deployFiles(commandFiles, destDir, opts, transformCommand);
}

export function deploySkills(skillDirs, targetDir, opts) {
  return deploySkillsWithKernelRouting(
    skillDirs,
    path.join(targetDir, paths.skills),
    path.join(targetDir, kernelSkillsPath),
    { ...opts, copyStandardSkills: opts.copyStandardSkills === true },
  );
}

export function deployRules() {
  // Pi reads rule guidance from AGENTS.md; standalone rule projection is
  // intentionally deferred until the context deployment issue.
  return 0;
}

export function deployExtensionBridge(targetDir, opts) {
  const source = path.join(resolveAiwgRoot(opts.srcRoot) || opts.srcRoot, extensionBridge);
  if (!fs.existsSync(source)) return 0;
  const destination = path.join(targetDir, '.pi/extensions');
  ensureDir(destination, opts.dryRun);
  return deployFiles([source], destination, opts);
}

export function createAgentsMd(target, srcRoot, dryRun) {
  const aiwgRoot = resolveAiwgRoot(srcRoot) || srcRoot;
  createAgentsMdFromTemplate(target, aiwgRoot, 'pi/AGENTS.md.aiwg-template', dryRun);
}

export async function postDeploy(targetDir, opts) {
  if (opts.createAgentsMd || (!opts.commandsOnly && !opts.skillsOnly && !opts.rulesOnly)) {
    createAgentsMd(targetDir, opts.srcRoot, opts.dryRun);
  }
  if (!opts.quiet && (opts.deployCommands || opts.deploySkills || opts.commandsOnly || opts.skillsOnly)) {
    console.log('Pi project resources are trust-gated; approve the project with `/trust` (restart required) or use `pi --approve` for a reviewed one-shot run.');
  }
}

export function getFileExtension() {
  return '.md';
}

export async function deploy(opts) {
  const normalizedMode = normalizeDeploymentMode(opts.mode);
  const agentFiles = [];
  const commandFiles = [];
  const skillDirs = [];

  if (['general', 'sdlc', 'both', 'all'].includes(normalizedMode)) {
    agentFiles.push(...getAddonAgentFiles(opts.srcRoot));
    if (opts.deployCommands || opts.commandsOnly) commandFiles.push(...getAddonCommandFiles(opts.srcRoot));
    if (opts.deploySkills || opts.skillsOnly) skillDirs.push(...getAddonSkillDirs(opts.srcRoot));
  }

  const framework = collectFrameworkArtifacts(opts.srcRoot, normalizedMode, {
    includeAgents: true,
    includeCommands: opts.deployCommands || opts.commandsOnly,
    includeSkills: opts.deploySkills || opts.skillsOnly,
    includeRules: false,
  });
  agentFiles.push(...framework.agents);
  commandFiles.push(...framework.commands);
  skillDirs.push(...framework.skills);

  let count = 0;
  if (!opts.commandsOnly && !opts.skillsOnly && !opts.rulesOnly) count += deployAgents(agentFiles, opts.target, opts);
  if ((opts.deployCommands || opts.commandsOnly) && !opts.skillsOnly && !opts.rulesOnly) count += deployCommands(commandFiles, opts.target, opts);
  if ((opts.deploySkills || opts.skillsOnly) && !opts.commandsOnly && !opts.rulesOnly) count += deploySkills(skillDirs, opts.target, opts);
  if (!opts.commandsOnly && !opts.skillsOnly && !opts.rulesOnly) count += deployExtensionBridge(opts.target, opts);
  await postDeploy(opts.target, opts);
  return count;
}

export default {
  name, aliases, paths, kernelSkillsPath, support, capabilities,
  mapModel, transformAgent, transformCommand, deployAgents, deployCommands,
  deploySkills, deployRules, deployExtensionBridge, createAgentsMd, postDeploy, getFileExtension, deploy,
};
