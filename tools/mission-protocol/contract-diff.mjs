#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const baselineFile = path.join(root, 'schemas/mission-protocol/schema-baseline-v1.json');
const candidateFile = path.join(root, 'schemas/mission-v1.schema.json');

function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

export function classifyContractChanges(previous, next, pointer = '') {
  const changes = [];
  const oldRequired = new Set(previous?.required ?? []);
  const newRequired = new Set(next?.required ?? []);
  for (const field of newRequired) if (!oldRequired.has(field)) changes.push({ kind: 'breaking', path: `${pointer}/required`, detail: `new required field '${field}'` });
  for (const field of oldRequired) if (!newRequired.has(field)) changes.push({ kind: 'additive', path: `${pointer}/required`, detail: `field '${field}' is no longer required` });
  const oldProps = previous?.properties ?? {};
  const newProps = next?.properties ?? {};
  for (const field of Object.keys(oldProps)) {
    if (!(field in newProps)) changes.push({ kind: 'breaking', path: `${pointer}/properties/${field}`, detail: 'property removed or renamed' });
    else changes.push(...classifyContractChanges(oldProps[field], newProps[field], `${pointer}/properties/${field}`));
  }
  for (const field of Object.keys(newProps)) if (!(field in oldProps)) changes.push({ kind: newRequired.has(field) ? 'breaking' : 'additive', path: `${pointer}/properties/${field}`, detail: newRequired.has(field) ? 'new required property' : 'new optional property' });
  if (previous?.type !== undefined && !same(previous.type, next?.type)) changes.push({ kind: 'breaking', path: `${pointer}/type`, detail: 'type changed' });
  if (Array.isArray(previous?.enum) && Array.isArray(next?.enum)) {
    for (const value of previous.enum) if (!next.enum.some(item => same(item, value))) changes.push({ kind: 'breaking', path: `${pointer}/enum`, detail: `enum value removed: ${JSON.stringify(value)}` });
    for (const value of next.enum) if (!previous.enum.some(item => same(item, value))) changes.push({ kind: 'additive', path: `${pointer}/enum`, detail: `enum value added: ${JSON.stringify(value)}` });
  }
  for (const constraint of ['minimum', 'minLength', 'minItems']) if (typeof previous?.[constraint] === 'number' && typeof next?.[constraint] === 'number' && next[constraint] > previous[constraint]) changes.push({ kind: 'breaking', path: `${pointer}/${constraint}`, detail: 'constraint became stricter' });
  for (const constraint of ['maximum', 'maxLength', 'maxItems', 'maxProperties']) if (typeof previous?.[constraint] === 'number' && typeof next?.[constraint] === 'number' && next[constraint] < previous[constraint]) changes.push({ kind: 'breaking', path: `${pointer}/${constraint}`, detail: 'constraint became stricter' });
  if (previous?.pattern !== undefined && previous.pattern !== next?.pattern) changes.push({ kind: 'breaking', path: `${pointer}/pattern`, detail: 'pattern changed' });
  return changes;
}

async function main() {
  const candidate = JSON.parse(await readFile(candidateFile, 'utf8'));
  if (process.argv.includes('--write-baseline')) {
    await writeFile(baselineFile, `${JSON.stringify(candidate, null, 2)}\n`);
    console.log(`Wrote ${path.relative(root, baselineFile)}`);
    return;
  }
  const baseline = JSON.parse(await readFile(baselineFile, 'utf8'));
  const changes = classifyContractChanges(baseline, candidate);
  const report = {
    schemaVersion: 'mission-contract-diff.aiwg.io/v1',
    baseline: path.relative(root, baselineFile), candidate: path.relative(root, candidateFile),
    verdict: changes.some(change => change.kind === 'breaking') ? 'breaking' : changes.length ? 'additive' : 'compatible', changes,
  };
  console.log(JSON.stringify(report, null, 2));
  if (report.verdict === 'breaking') process.exitCode = 1;
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch(error => { console.error(error.message); process.exitCode = 1; });
