/** DeepSeek Harness deployment adapter. */
import path from 'path';
import fs from 'fs';
import {
  collectFrameworkArtifacts,
  createAgentsMdFromTemplate,
  deployFiles,
  deploySkillDir,
  ensureDir,
  getAddonSkillDirs,
  normalizeDeploymentMode,
  resolveAiwgRoot,
} from './base.mjs';

export const name = 'deepseek-harness';
export const aliases = ['dsh'];
export const paths = { agents: '', commands: '', skills: '.agents/skills', rules: '' };
export const kernelSkillsPath = '.agents/skills';
export const support = { agents: 'skills', commands: 'skills', skills: 'native', rules: 'context' };
export const capabilities = { skills: true, rules: false, aggregatedOutput: false, yamlFormat: true, homeDirectoryDeploy: false };
export const mapModel = model => model;
export const transformAgent = (_path, content) => content;
export const transformCommand = (_path, content) => content;
export const deployAgents = () => 0;
export const deployCommands = () => 0;
export const deployRules = () => 0;

export function deploySkills(skillDirs, targetDir, opts) {
  const destination = path.join(targetDir, kernelSkillsPath);
  ensureDir(destination, opts.dryRun);
  const unique = [...new Set(skillDirs)];
  for (const skillDir of unique) deploySkillDir(skillDir, destination, opts);
  return unique.length;
}

export function createAgentsMd(target, srcRoot, dryRun) {
  createAgentsMdFromTemplate(target, resolveAiwgRoot(srcRoot) || srcRoot, 'deepseek-harness/AGENTS.md.aiwg-template', dryRun);
}

export function deployCordisPatch(target, opts) {
  const source = path.join(resolveAiwgRoot(opts.srcRoot) || opts.srcRoot, 'agentic/code/providers/deepseek-harness/aiwg.cordis.patch.yml');
  if (!fs.existsSync(source)) return 0;
  const destination = path.join(target, '.dsh');
  ensureDir(destination, opts.dryRun);
  return deployFiles([source], destination, { ...opts, force: opts.force }, (_src, content) => content);
}

export async function postDeploy(target, opts) {
  if (opts.createAgentsMd || (!opts.commandsOnly && !opts.skillsOnly && !opts.rulesOnly)) createAgentsMd(target, opts.srcRoot, opts.dryRun);
  if (!opts.quiet) console.log('DeepSeek Harness: runtime credentials remain environment-only; use a reviewed ephemeral route patch.');
}

export function getFileExtension() { return '.md'; }

export async function deploy(opts) {
  const mode = normalizeDeploymentMode(opts.mode);
  const skillDirs = [...getAddonSkillDirs(opts.srcRoot)];
  skillDirs.push(...collectFrameworkArtifacts(opts.srcRoot, mode, { includeAgents: false, includeCommands: false, includeSkills: true, includeRules: false }).skills);
  let count = 0;
  if (!opts.commandsOnly && !opts.rulesOnly) count += deploySkills(skillDirs, opts.target, opts);
  if (!opts.commandsOnly && !opts.skillsOnly && !opts.rulesOnly) count += deployCordisPatch(opts.target, opts).filter(action => action.type === 'deploy').length;
  await postDeploy(opts.target, opts);
  return count;
}

export default { name, aliases, paths, kernelSkillsPath, support, capabilities, mapModel, transformAgent, transformCommand, deployAgents, deployCommands, deploySkills, deployRules, createAgentsMd, deployCordisPatch, postDeploy, getFileExtension, deploy };
