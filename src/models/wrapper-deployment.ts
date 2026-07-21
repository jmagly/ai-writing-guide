import { promises as fs } from 'node:fs';
import path from 'node:path';
import { load as loadYaml } from 'js-yaml';
import { MODEL_WRAPPERS, type ModelRole } from './provider-models.js';

export interface WrapperDeploymentMismatch {
  wrapper: string;
  path: string;
  field: string;
  expected?: string;
  actual?: string;
  reason: string;
}

export interface WrapperDeploymentVerification {
  supported: boolean;
  valid: boolean;
  agentsPath: string | null;
  found: string[];
  missing: string[];
  mismatches: WrapperDeploymentMismatch[];
}

export interface WrapperDeploymentExpectation {
  provider?: string;
  models?: Partial<Record<ModelRole, string>>;
}

const TIERS: Record<ModelRole, string> = {
  reasoning: 'premium',
  coding: 'standard',
  efficiency: 'economy',
};
const EFFORTS: Record<ModelRole, string> = {
  reasoning: 'high',
  coding: 'medium',
  efficiency: 'low',
};
const CLAUDE_ALIASES: Record<ModelRole, string> = {
  reasoning: 'opus',
  coding: 'sonnet',
  efficiency: 'haiku',
};

async function collectFiles(root: string): Promise<string[]> {
  const files: string[] = [];
  async function walk(directory: string): Promise<void> {
    let entries;
    try { entries = await fs.readdir(directory, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      const item = path.join(directory, entry.name);
      if (entry.isDirectory()) await walk(item);
      else if (entry.isFile()) files.push(item);
    }
  }
  await walk(root);
  return files.sort();
}

function tomlFields(content: string): Record<string, unknown> {
  const fields: Record<string, string> = {};
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z0-9_.-]+)\s*=\s*"((?:\\.|[^"\\])*)"\s*$/);
    if (!match) continue;
    try { fields[match[1]] = JSON.parse(`"${match[2]}"`) as string; }
    catch { fields[match[1]] = match[2]; }
  }
  return fields;
}

function markdownFields(content: string): Record<string, unknown> | null {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) return null;
  const parsed = loadYaml(match[1]);
  return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : null;
}

function artifactFields(file: string, content: string): Record<string, unknown> | null {
  if (/\.toml$/i.test(file)) return tomlFields(content);
  if (/\.json$/i.test(file)) {
    try {
      const parsed = JSON.parse(content) as unknown;
      return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : null;
    } catch { return null; }
  }
  if (/\.(?:md|yaml|yml)$/i.test(file)) return markdownFields(content);
  return null;
}

function fieldValue(fields: Record<string, unknown>, ...names: string[]): string | undefined {
  for (const name of names) {
    const value = fields[name];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

function addMismatch(
  mismatches: WrapperDeploymentMismatch[],
  wrapper: string,
  file: string,
  field: string,
  reason: string,
  expected?: string,
  actual?: string,
): void {
  mismatches.push({
    wrapper,
    path: file,
    field,
    ...(expected !== undefined ? { expected } : {}),
    ...(actual !== undefined ? { actual } : {}),
    reason,
  });
}

async function validateArtifact(
  file: string,
  role: ModelRole,
  expectation: WrapperDeploymentExpectation,
): Promise<WrapperDeploymentMismatch[]> {
  const wrapper = MODEL_WRAPPERS[role];
  const mismatches: WrapperDeploymentMismatch[] = [];
  const content = await fs.readFile(file, 'utf8');
  if (!content.trim()) {
    addMismatch(mismatches, wrapper, file, 'content', 'wrapper artifact is empty');
    return mismatches;
  }
  const fields = artifactFields(file, content);
  if (!fields) {
    addMismatch(mismatches, wrapper, file, 'format', 'wrapper artifact is malformed or has no parseable metadata');
    return mismatches;
  }

  const actualName = fieldValue(fields, 'name');
  if (actualName !== wrapper) addMismatch(
    mismatches, wrapper, file, 'name', 'wrapper identity does not match its deployed filename', wrapper, actualName,
  );

  const actualRole = fieldValue(fields, 'model-role', 'modelRole', 'aiwg-model-role');
  if (actualRole && actualRole !== role) addMismatch(
    mismatches, wrapper, file, 'model-role', 'wrapper role is stale or mismatched', role, actualRole,
  );
  const actualTier = fieldValue(fields, 'model-tier', 'modelTier', 'aiwg-model-tier');
  if (actualTier && actualTier !== TIERS[role]) addMismatch(
    mismatches, wrapper, file, 'model-tier', 'wrapper tier is stale or mismatched', TIERS[role], actualTier,
  );

  const actualModel = fieldValue(fields, 'model', 'model_hint', 'modelHint');
  const expectedModel = expectation.models?.[role];
  if (expectation.provider === 'codex') {
    if (!actualModel) addMismatch(mismatches, wrapper, file, 'model', 'Codex wrapper has no exact model pin', expectedModel);
    else if (expectedModel && actualModel !== expectedModel) addMismatch(
      mismatches, wrapper, file, 'model', 'Codex wrapper model does not match the effective catalog', expectedModel, actualModel,
    );
    const actualEffort = fieldValue(fields, 'model_reasoning_effort');
    if (actualEffort !== EFFORTS[role]) addMismatch(
      mismatches, wrapper, file, 'model_reasoning_effort', 'Codex wrapper effort does not match its role', EFFORTS[role], actualEffort,
    );
    if (!fieldValue(fields, 'developer_instructions')) addMismatch(
      mismatches, wrapper, file, 'developer_instructions', 'Codex wrapper has no bootstrap instructions', 'non-empty',
    );
  } else if (expectation.provider === 'claude') {
    const accepted = new Set([CLAUDE_ALIASES[role], expectedModel].filter(Boolean));
    if (!actualModel || !accepted.has(actualModel)) addMismatch(
      mismatches, wrapper, file, 'model', 'Claude wrapper does not carry the semantic role alias or effective model',
      [...accepted].join(' or '), actualModel,
    );
    if (!actualRole) addMismatch(mismatches, wrapper, file, 'model-role', 'Claude wrapper is missing its canonical role', role);
    if (!actualTier) addMismatch(mismatches, wrapper, file, 'model-tier', 'Claude wrapper is missing its canonical tier', TIERS[role]);
  }
  return mismatches;
}

export async function verifyModelWrapperDeployment(
  agentsPath: string | null,
  expectation: WrapperDeploymentExpectation = {},
): Promise<WrapperDeploymentVerification> {
  const expected = Object.entries(MODEL_WRAPPERS) as Array<[ModelRole, string]>;
  if (!agentsPath) return {
    supported: false,
    valid: false,
    agentsPath: null,
    found: [],
    missing: expected.map(([, wrapper]) => wrapper),
    mismatches: [],
  };
  const files = await collectFiles(agentsPath);
  const found: string[] = [];
  const missing: string[] = [];
  const mismatches: WrapperDeploymentMismatch[] = [];
  for (const [role, wrapper] of expected) {
    const matches = files.filter(file => path.basename(file).replace(/\.(?:md|toml|json|yaml|yml)$/i, '') === wrapper);
    if (matches.length === 0) {
      missing.push(wrapper);
      continue;
    }
    found.push(wrapper);
    if (matches.length > 1) addMismatch(
      mismatches, wrapper, matches[0], 'path', `multiple deployed wrapper artifacts found: ${matches.join(', ')}`,
    );
    mismatches.push(...await validateArtifact(matches[0], role, expectation));
  }
  return {
    supported: true,
    valid: missing.length === 0 && mismatches.length === 0,
    agentsPath,
    found,
    missing,
    mismatches,
  };
}
