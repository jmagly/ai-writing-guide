import fs from 'node:fs/promises';
import path from 'node:path';
import { artifact, addonRoot, digest, validateContract } from './contracts.mjs';
import { targetPath, readBounded, writeNew } from './workspace.mjs';
import { listProfiles } from './profiles.mjs';
import { createPlan } from './normalization.mjs';

const MAX_SOURCE = 1024 * 1024;
const TOKEN = /\{\{\s*([A-Za-z][A-Za-z0-9_]*)\s*(?:\|\s*(json))?\s*\}\}/g;
const FORBIDDEN_NAMES = new Set(['__proto__', 'prototype', 'constructor']);
function tokens(value) {
  const found = [...value.matchAll(TOKEN)];
  const rest = value.replace(TOKEN, '');
  if (rest.includes('{{') || rest.includes('}}')) throw new Error('Unsupported template expression; only declared variable substitution is allowed');
  return found;
}
async function strictRead(root, relative) {
  await targetPath(root, relative, { write: true }); // Reject symlinks for template sources too.
  const { data } = await readBounded(root, relative, MAX_SOURCE);
  const content = data.toString('utf8');
  if (!Buffer.from(content).equals(data)) throw new Error('Template source must be UTF-8');
  return { content, hash: digest(data) };
}
function typeCheck(def, value) {
  const type = def.type === 'path' ? 'string' : def.type;
  if (typeof value !== type || (type === 'number' && !Number.isFinite(value))) throw new Error(`Variable ${def.name} requires ${def.type}`);
  if (def.type === 'path' && (!value || value.includes('\\') || path.isAbsolute(value) || /^[A-Za-z]:/.test(value) || value.includes('\0') || value.split('/').some(p => !p || p === '.' || p === '..'))) throw new Error(`Variable ${def.name} must be a safe target-relative path`);
}
async function validateTemplate(root, value) {
  await validateContract(value, 'custom-template.v1');
  const defs = new Map();
  for (const def of value.spec.variables) {
    if (FORBIDDEN_NAMES.has(def.name) || defs.has(def.name)) throw new Error(`Duplicate or reserved variable: ${def.name}`);
    defs.set(def.name, def);
    if (Object.hasOwn(def, 'default')) typeCheck(def, def.default);
  }
  const seen = new Set();
  let bytes = 0;
  for (const file of value.spec.files) {
    bytes += Buffer.byteLength(file.content);
    if (bytes > MAX_SOURCE) throw new Error('Template rendered source content exceeds 1 MiB');
    for (const token of tokens(file.path)) {
      if (!defs.has(token[1]) || defs.get(token[1]).type !== 'path' || token[2]) throw new Error(`Destination substitutions require a declared path variable: ${token[1]}`);
    }
    for (const token of tokens(file.content)) if (!defs.has(token[1])) throw new Error(`Undeclared template variable: ${token[1]}`);
    // Validate static portions using a safe placeholder; render-time checks validate values too.
    const destination = file.path.replace(TOKEN, (_, name) => `template-variable-${name}`);
    const actual = await targetPath(root, destination, { write: true });
    if (seen.has(actual)) throw new Error(`Duplicate template destination: ${file.path}`);
    seen.add(actual);
  }
  return value;
}

export async function listTemplates({ platform } = {}) {
  const profiles = await listProfiles();
  if (platform && !profiles.some(p => p.id === platform)) throw new Error(`Unknown template platform: ${platform}`);
  const entries = [];
  for (const profile of profiles.filter(p => !platform || p.id === platform)) {
    for (const entry of profile.templates ?? []) {
      const id = `${profile.id}:${path.basename(entry.source, path.extname(entry.source)).toLowerCase()}`;
      await targetPath(addonRoot, entry.source, { write: true });
      const stat = await fs.stat(path.join(addonRoot, entry.source));
      if (!stat.isFile() || stat.size > MAX_SOURCE) throw new Error(`Invalid bundled template: ${entry.source}`);
      if (entries.some(e => e.id === id)) throw new Error(`Duplicate bundled template id: ${id}`);
      entries.push({ id, platform: profile.id, source: entry.source, destination: entry.destination, purpose: entry.purpose, status: profile.status });
    }
  }
  return entries.sort((a, b) => a.id.localeCompare(b.id));
}

/** Develop a self-contained artifact from a target-local JSON spec or artifact. */
export async function developTemplate(root, { source, output } = {}) {
  if (!source) throw new Error('Template development requires source JSON');
  const raw = await strictRead(root, source);
  let definition;
  try { definition = JSON.parse(raw.content); } catch (error) { throw new Error(`Invalid template JSON: ${error.message}`); }
  const value = definition?.kind ? definition : artifact('TestNormalizationTemplate', definition);
  await validateTemplate(root, value);
  // No external files are loaded by a developed template: contents are embedded.
  if (output) await writeNew(root, output, value);
  return value;
}
function render(value, defs, values, forPath = false) {
  tokens(value);
  return value.replace(TOKEN, (_, name, encoding) => {
    const def = defs.get(name);
    if (!def) throw new Error(`Undeclared template variable: ${name}`);
    if (!Object.hasOwn(values, name)) throw new Error(`Missing template variable: ${name}`);
    if (forPath && (def.type !== 'path' || encoding)) throw new Error('Destination requires path variable');
    return encoding === 'json' ? JSON.stringify(values[name]) : String(values[name]);
  });
}

/** Return a complete normalization plan; this function never changes target files. */
export async function deployTemplate(root, { platform, template, source, variables = {} } = {}) {
  if (!variables || typeof variables !== 'object' || Array.isArray(variables)) throw new Error('Template variables must be an object');
  let edits; let purpose;
  if (source) {
    const value = await developTemplate(root, { source });
    if (platform && value.spec.platform !== platform) throw new Error('Custom template platform mismatch');
    if (template && value.spec.id !== template) throw new Error('Custom template id mismatch');
    const defs = new Map(value.spec.variables.map(def => [def.name, def]));
    const values = Object.create(null);
    for (const name of Object.keys(variables)) if (!defs.has(name) || FORBIDDEN_NAMES.has(name)) throw new Error(`Unknown template variable: ${name}`);
    for (const def of defs.values()) {
      if (Object.hasOwn(variables, def.name)) values[def.name] = variables[def.name];
      else if (Object.hasOwn(def, 'default')) values[def.name] = def.default;
      else if (def.required) throw new Error(`Missing required template variable: ${def.name}`);
      if (Object.hasOwn(values, def.name)) typeCheck(def, values[def.name]);
    }
    edits = value.spec.files.map(file => ({ path: render(file.path, defs, values, true), content: render(file.content, defs, values) }));
    purpose = `Deploy custom testing template ${value.spec.id}: ${value.spec.description}`;
  } else {
    if (Object.keys(variables).length) throw new Error('Bundled example templates do not declare variables; develop a custom template first');
    const entries = await listTemplates({ platform });
    const entry = entries.find(item => item.id === template);
    if (!entry) throw new Error(`Unknown template id: ${template}; use templates --action list`);
    const raw = await strictRead(addonRoot, entry.source);
    edits = [{ path: entry.destination, content: raw.content }];
    purpose = `Deploy reviewed example ${entry.id}: ${entry.purpose}`;
  }
  return createPlan(root, edits, { purpose });
}
