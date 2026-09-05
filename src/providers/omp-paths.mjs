import { homedir } from 'node:os';
import path from 'node:path';
import { existsSync } from 'node:fs';

/** OMP 18.1.10 profile contract; independent of original Pi configuration. */
export function normalizeOmpProfile(value) {
  const name = value?.trim();
  if (!name || name === 'default') return undefined;
  if (!/^[a-z0-9][a-z0-9._-]{0,63}$/.test(name) || name.endsWith('.')
    || /^(?:con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\..*)?$/i.test(name)) {
    throw new Error('Invalid OMP profile: use 1–64 lowercase letters, digits, dots, hyphens or underscores; reserved device names are forbidden');
  }
  return name;
}

/** Resolve without reading credentials or importing the OMP runtime. */
export function resolveOmpPaths({ env = process.env, home = homedir(), cwd = process.cwd(),
  platform = process.platform, exists = existsSync } = {}) {
  const profile = normalizeOmpProfile(env.OMP_PROFILE !== undefined ? env.OMP_PROFILE : env.PI_PROFILE);
  const directory = env.PI_CONFIG_DIR || '.omp';
  const base = path.join(home, directory);
  const configRoot = profile ? path.join(base, 'profiles', profile) : base;
  const defaultAgent = path.join(configRoot, 'agent');
  const agentDir = !profile && env.PI_CODING_AGENT_DIR
    ? path.resolve(cwd, env.PI_CODING_AGENT_DIR) : defaultAgent;
  const xdg = (variable) => {
    if (!['linux', 'darwin'].includes(platform) || agentDir !== defaultAgent || !env[variable]) return undefined;
    const root = path.join(env[variable], 'omp');
    const candidate = profile ? path.join(root, 'profiles', profile) : root;
    return exists(candidate) ? candidate : undefined;
  };
  const dataDir = xdg('XDG_DATA_HOME') || agentDir;
  const stateDir = xdg('XDG_STATE_HOME') || agentDir;
  const cacheDir = xdg('XDG_CACHE_HOME') || agentDir;
  const resourceDirs = { agents: path.join(defaultAgent, 'agents'), skills: path.join(agentDir, 'skills'), commands: path.join(agentDir, 'prompts'), rules: path.join(agentDir, 'rules'), behaviors: path.join(agentDir, 'extensions') };
  return { profile, configRoot, agentDir, resourceDirs, projectDir: path.join(cwd, '.omp'),
    dataDir, stateDir, cacheDir, sessionsDir: path.join(dataDir, 'sessions') };
}
