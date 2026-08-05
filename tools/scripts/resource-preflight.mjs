#!/usr/bin/env node
import { readFileSync, statfsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { resolveProjectAiwgDir } from '../../src/config/project-artifacts-runtime.mjs';

const BYTES_PER_GB = 1024 ** 3;

const DEFAULT_AUTO_REQUIREMENTS = {
  min_memory_gb: 8,
  min_free_disk_gb: 5,
  min_cpus: 2,
  min_swap_gb: 0,
};

const REQUIREMENT_LABELS = {
  min_memory_gb: 'memory',
  min_free_disk_gb: 'free disk',
  min_cpus: 'CPU cores',
  min_swap_gb: 'swap',
};

const HOST_KEYS = {
  min_memory_gb: 'memory_gb',
  min_free_disk_gb: 'free_disk_gb',
  min_cpus: 'cpus',
  min_swap_gb: 'swap_gb',
};

function parseArgs(argv) {
  const args = { projectDir: process.cwd(), profile: 'default' };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--project') {
      args.projectDir = argv[++i] ?? args.projectDir;
    } else if (arg === '--profile') {
      args.profile = argv[++i] ?? args.profile;
    }
  }
  args.projectDir = resolve(args.projectDir);
  return args;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function readProjectConfig(projectDir) {
  const configPath = join(resolveProjectAiwgDir(projectDir), 'aiwg.config');
  try {
    return { config: readJson(configPath), configPath };
  } catch (error) {
    if (error && error.code === 'ENOENT') return { config: null, configPath };
    throw new Error(`Unable to read ${configPath}: ${error.message}`);
  }
}

function readSwapGb() {
  if (process.platform === 'linux') {
    try {
      const meminfo = readFileSync('/proc/meminfo', 'utf8');
      const match = meminfo.match(/^SwapTotal:\s+(\d+)\s+kB$/m);
      if (match) return Number(match[1]) / 1024 / 1024;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function detectHostResources(projectDir) {
  const disk = statfsSync(projectDir);
  return {
    memory_gb: os.totalmem() / BYTES_PER_GB,
    free_disk_gb: (Number(disk.bavail) * Number(disk.bsize)) / BYTES_PER_GB,
    cpus: os.cpus().length,
    swap_gb: readSwapGb(),
  };
}

function formatValue(value, unit) {
  if (value === undefined || Number.isNaN(value)) return 'unknown';
  if (unit === 'count') return String(Math.floor(value));
  return `${value.toFixed(1)} GB`;
}

function normalizeMode(rawMode) {
  if (rawMode === undefined || rawMode === null) return 'configured';
  if (rawMode === 'configured' || rawMode === 'auto_detect') return rawMode;
  throw new Error(`build.resource_preflight.mode must be "configured" or "auto_detect" (got ${JSON.stringify(rawMode)})`);
}

function normalizeRequirements(preflight) {
  const mode = normalizeMode(preflight.mode);
  const explicit = preflight.requirements ?? {};
  if (typeof explicit !== 'object' || Array.isArray(explicit)) {
    throw new Error('build.resource_preflight.requirements must be an object when provided');
  }

  const base = mode === 'auto_detect' ? DEFAULT_AUTO_REQUIREMENTS : {};
  const requirements = { ...base };
  for (const key of Object.keys(REQUIREMENT_LABELS)) {
    if (explicit[key] === undefined) continue;
    const value = Number(explicit[key]);
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`build.resource_preflight.requirements.${key} must be a non-negative number`);
    }
    requirements[key] = value;
  }
  return { mode, requirements };
}

function evaluatePreflight(config, hostResources) {
  const preflight = config?.build?.resource_preflight;
  if (!preflight || preflight.enabled !== true) {
    return { enabled: false, ok: true, failures: [], mode: 'disabled', requirements: {} };
  }

  const { mode, requirements } = normalizeRequirements(preflight);
  const failures = [];
  for (const [requirementKey, expected] of Object.entries(requirements)) {
    if (expected <= 0) continue;
    const hostKey = HOST_KEYS[requirementKey];
    const actual = hostResources[hostKey];
    if (actual === undefined || Number.isNaN(actual)) {
      failures.push({
        resource: REQUIREMENT_LABELS[requirementKey],
        expected,
        actual,
        unit: requirementKey === 'min_cpus' ? 'count' : 'gb',
        reason: 'not detectable on this host',
      });
      continue;
    }
    if (actual < expected) {
      failures.push({
        resource: REQUIREMENT_LABELS[requirementKey],
        expected,
        actual,
        unit: requirementKey === 'min_cpus' ? 'count' : 'gb',
        reason: 'below threshold',
      });
    }
  }

  return {
    enabled: true,
    ok: failures.length === 0,
    failures,
    mode,
    requirements,
  };
}

function printResult(result, { profile, configPath }) {
  if (!result.enabled) {
    console.log(`[build-preflight] skipped: build.resource_preflight.enabled is not true (${configPath})`);
    return;
  }

  const checked = Object.keys(result.requirements);
  if (checked.length === 0) {
    console.log(`[build-preflight] ${profile}: enabled in configured mode; no explicit requirements set`);
    return;
  }

  if (result.ok) {
    console.log(`[build-preflight] ${profile}: host resources satisfy ${result.mode} requirements`);
    return;
  }

  console.error(`[build-preflight] ${profile}: host resource preflight failed`);
  for (const failure of result.failures) {
    const unit = failure.unit === 'count' ? 'count' : 'gb';
    console.error(
      `  - ${failure.resource}: actual ${formatValue(failure.actual, unit)}, expected >= ${formatValue(failure.expected, unit)} (${failure.reason})`,
    );
  }
}

function main() {
  if (process.env.AIWG_BUILD_PREFLIGHT_DONE === '1') return;
  if (process.env.AIWG_BUILD_PREFLIGHT === '0' || process.env.AIWG_BUILD_PREFLIGHT === 'false') {
    console.log('[build-preflight] skipped by AIWG_BUILD_PREFLIGHT=0');
    return;
  }

  const args = parseArgs(process.argv.slice(2));
  const { config, configPath } = readProjectConfig(args.projectDir);
  const hostResources = detectHostResources(args.projectDir);
  const result = evaluatePreflight(config, hostResources);
  printResult(result, { profile: args.profile, configPath });
  if (!result.ok) process.exitCode = 1;
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : '';
if (invokedPath === fileURLToPath(import.meta.url)) {
  main();
}

export {
  DEFAULT_AUTO_REQUIREMENTS,
  detectHostResources,
  evaluatePreflight,
  normalizeRequirements,
};
