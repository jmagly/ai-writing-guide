import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import { parseDocument } from 'yaml';
import crypto from 'node:crypto';

export const API_VERSION = 'testing.aiwg.io/v1';
export const TOOL_VERSION = '2.0.0';
const validators = new Map();

export function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  return value;
}
export const digest = value => crypto.createHash('sha256').update(typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(stable(value))).digest('hex');
export function artifact(kind, spec, { name = kind, now = new Date().toISOString() } = {}) {
  return { apiVersion: API_VERSION, kind, metadata: { name, createdAt: now, toolVersion: TOOL_VERSION }, spec };
}

export async function validateContract(value, schemaName) {
  if (!/^[a-z0-9.-]+$/.test(schemaName)) throw new Error('Invalid schema name');
  let validate = validators.get(schemaName);
  if (!validate) {
    const schema = JSON.parse(await fs.readFile(new URL(`../schemas/${schemaName}.schema.json`, import.meta.url), 'utf8'));
    // No unavailable-validator or compilation-error fallback: either is fatal.
    const ajv = new Ajv({ allErrors: true, strict: true });
    const seen = new Set([schema.$id]);
    async function dependencies(node) {
      if (!node || typeof node !== 'object') return;
      if (typeof node.$ref === 'string' && !node.$ref.startsWith('#')) {
        const id = node.$ref.split('#')[0];
        if (!seen.has(id)) {
          const match = /^https:\/\/aiwg\.io\/schemas\/testing\/([a-z0-9.-]+\.schema\.json)$/.exec(id);
          if (!match) throw new Error(`Schema reference is outside the offline testing contract catalog: ${id}`);
          seen.add(id);
          const dependency = JSON.parse(await fs.readFile(new URL(`../schemas/${match[1]}`,import.meta.url),'utf8'));
          if (dependency.$id !== id) throw new Error(`Schema identity mismatch: ${id}`);
          await dependencies(dependency); ajv.addSchema(dependency);
        }
      }
      for (const child of Object.values(node)) if (child && typeof child === 'object') await dependencies(child);
    }
    await dependencies(schema);
    validate = ajv.compile(schema);
    validators.set(schemaName, validate);
  }
  if (!validate(value)) throw new Error(`Invalid ${schemaName}: ${JSON.stringify(validate.errors)}`);
  return value;
}

export async function readDocument(file) {
  const stat = await fs.stat(file);
  if (!stat.isFile() || stat.size > 16 * 1024 * 1024) throw new Error('Document must be a file no larger than 16 MiB');
  const source = await fs.readFile(file, 'utf8');
  const doc = parseDocument(source, { uniqueKeys: true });
  if (doc.errors.length) throw new Error(`Cannot parse ${file}: ${doc.errors.map(e => e.message).join('; ')}`);
  return doc.toJS({ maxAliasCount: 50 });
}

export function checkPattern(pattern) {
  if (!pattern || pattern.startsWith('/') || pattern.includes('\\') || /^[A-Za-z]:/.test(pattern) || pattern.split('/').includes('..') || pattern.includes('\0')) throw new Error(`Pattern must stay relative to the target root: ${pattern}`);
  return pattern;
}

export async function loadProtocol(file) {
  const protocol = await validateContract(await readDocument(file), 'conformance-protocol.v1');
  const { spec } = protocol;
  const ids = values => {
    const seen = new Set();
    for (const { id } of values) {
      if (seen.has(id)) throw new Error(`Duplicate id: ${id}`);
      seen.add(id);
    }
  };
  ids(spec.areas); ids(spec.lanes);
  for (const file of spec.configFiles ?? []) checkPattern(file);
  for (const group of [spec.source, spec.tests, ...spec.areas, ...spec.lanes]) {
    for (const p of [...group.include, ...(group.exclude ?? [])]) checkPattern(p);
  }
  for (const lane of spec.lanes) {
    if (lane.coverage) checkPattern(lane.coverage.path);
    ids(lane.negativeControls ?? []);
    for (const result of [lane.result, lane.discovery?.result, ...(lane.negativeControls ?? []).map(c => c.result)].filter(Boolean)) if (result.path) checkPattern(result.path);
    for (const control of lane.negativeControls ?? []) checkPattern(control.changePlan);
  }
  return protocol;
}

export const addonRoot = fileURLToPath(new URL('../', import.meta.url));
