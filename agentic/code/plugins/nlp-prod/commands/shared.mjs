import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const PATTERNS = new Set([
  'simple-chain',
  'embedded-agent',
  'state-machine',
  'rag-pipeline',
  'eval-loop',
  'dynamic-prompt',
]);

const addonRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function result(exitCode, message) {
  return message ? { exitCode, message } : { exitCode };
}

export function option(args, name, fallback) {
  const index = args.indexOf(name);
  if (index < 0) return fallback;
  if (!args[index + 1] || args[index + 1].startsWith('--')) {
    throw new Error(`${name} requires a value.`);
  }
  return args[index + 1];
}

export function positionals(args, valueOptions = []) {
  const consumesValue = new Set(valueOptions);
  const values = [];
  for (let index = 0; index < args.length; index++) {
    if (consumesValue.has(args[index])) {
      index++;
      continue;
    }
    if (!args[index].startsWith('--')) values.push(args[index]);
  }
  return values;
}

export function resolveWithinProject(cwd, candidate, label = 'Path') {
  if (!candidate || path.isAbsolute(candidate) || candidate.includes('\0')) {
    throw new Error(`${label} must be a project-relative path.`);
  }
  const root = path.resolve(cwd);
  const resolved = path.resolve(root, candidate);
  const relative = path.relative(root, resolved);
  if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error(`${label} must remain inside the project.`);
  }
  return resolved;
}

export function pipelinePath(cwd, candidate) {
  return resolveWithinProject(cwd, candidate, 'Pipeline path');
}

export async function requirePipeline(cwd, candidate) {
  const resolved = pipelinePath(cwd, candidate);
  try {
    await fs.access(path.join(resolved, 'pipeline.config.yaml'));
  } catch {
    throw new Error(`Pipeline config not found: ${path.relative(cwd, resolved)}/pipeline.config.yaml`);
  }
  return resolved;
}

export async function copyPattern(pattern, destination) {
  if (!PATTERNS.has(pattern)) throw new Error(`Unknown pipeline pattern: ${pattern}`);
  const source = path.join(addonRoot, 'templates', pattern);
  await fs.cp(source, destination, { recursive: true, errorOnExist: true, force: false });
}

export async function findPipelines(cwd) {
  const found = [];
  async function walk(directory) {
    let entries;
    try {
      entries = await fs.readdir(directory, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'prod') continue;
      const child = path.join(directory, entry.name);
      try {
        await fs.access(path.join(child, 'pipeline.config.yaml'));
        found.push(child);
      } catch {
        await walk(child);
      }
    }
  }
  await walk(path.resolve(cwd));
  return found.sort();
}

export async function countJsonLines(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return content.split(/\r?\n/).filter(line => line.trim()).length;
  } catch {
    return 0;
  }
}
