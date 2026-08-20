import { access, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { dirname, extname, join, resolve } from 'node:path';
import { parse, stringify } from 'yaml';
import type { OutputModeProfile, OutputModeScope, OutputModeState, ResolvedOutputMode } from './types.js';

const PROTECTED = ['code', 'commands', 'citations', 'quoted-text', 'identifiers', 'machine-readable-blocks'];
const STAGE_ORDER = ['semantic', 'voice', 'controlled-language', 'structure', 'presentation'];

const BUILTINS: OutputModeProfile[] = [
  {
    id: 'unaltered', version: '1.0.0', description: 'No-op mode; preserves the provider output path unchanged.',
    kind: 'presentation', stage: 'presentation', order: -1000, instructions: '',
    provenance: { source: 'AIWG', license: 'MIT' }, validation: { level: 'advisory' }, contextCost: 0,
    protectedContent: PROTECTED,
  },
  {
    id: 'wittgenstein-inspired', version: '1.0.0', description: 'Concise, proposition-oriented stylistic profile; not impersonation or attribution.',
    kind: 'voice', stage: 'voice', order: 100, instructions: 'Prefer concise propositions, clarify terms in use, and expose category errors. Do not imitate or attribute text to Ludwig Wittgenstein.',
    provenance: { source: 'AIWG original style guidance', license: 'MIT' }, validation: { level: 'advisory' }, contextCost: 48,
    protectedContent: PROTECTED,
  },
  {
    id: 'asd-ste', version: '1.0.0', description: 'Operator-configured ASD Simplified Technical English adapter.',
    kind: 'controlled-language', stage: 'controlled-language', order: 200,
    instructions: 'Apply only operator-supplied ASD-STE rules and approved terminology. Without licensed rules and a configured validator, describe output as advisory and never claim conformance.',
    provenance: { source: 'AIWG adapter; standard content supplied by operator', license: 'MIT adapter only' },
    validation: { level: 'advisory', standardVersion: 'operator-configured' }, contextCost: 64,
    protectedContent: PROTECTED,
  },
];

function profileDirs(cwd: string): Array<{ dir: string; source: ResolvedOutputMode['source'] }> {
  return [
    { dir: join(cwd, '.aiwg', 'output-modes'), source: 'project' },
    { dir: join(homedir(), '.config', 'aiwg', 'output-modes'), source: 'user' },
  ];
}

async function readable(path: string): Promise<boolean> {
  try { await access(path, constants.R_OK); return true; } catch { return false; }
}

function validateProfile(value: unknown, path: string): OutputModeProfile {
  if (!value || typeof value !== 'object') throw new Error(`Invalid output mode profile at ${path}: expected an object`);
  const p = value as Partial<OutputModeProfile>;
  for (const field of ['id', 'version', 'description', 'kind', 'stage', 'instructions', 'provenance', 'validation'] as const) {
    if (p[field] === undefined) throw new Error(`Invalid output mode profile at ${path}: missing ${field}`);
  }
  if (!['voice', 'controlled-language', 'structure', 'presentation'].includes(String(p.kind))) throw new Error(`Invalid output mode kind in ${path}: ${p.kind}`);
  if (!STAGE_ORDER.includes(String(p.stage))) throw new Error(`Invalid output mode stage in ${path}: ${p.stage}`);
  return p as OutputModeProfile;
}

async function loadDirectory(dir: string, source: ResolvedOutputMode['source']): Promise<ResolvedOutputMode[]> {
  if (!(await readable(dir))) return [];
  const result: ResolvedOutputMode[] = [];
  for (const name of (await readdir(dir)).sort()) {
    if (!['.yaml', '.yml', '.json'].includes(extname(name))) continue;
    const sourcePath = join(dir, name);
    const raw = await readFile(sourcePath, 'utf8');
    const value = extname(name) === '.json' ? JSON.parse(raw) : parse(raw);
    result.push({ ...validateProfile(value, sourcePath), source, sourcePath });
  }
  return result;
}

async function loadVoiceAdapters(frameworkRoot: string): Promise<ResolvedOutputMode[]> {
  const dir = join(frameworkRoot, 'agentic', 'code', 'addons', 'voice-framework', 'voices', 'templates');
  if (!(await readable(dir))) return [];
  const result: ResolvedOutputMode[] = [];
  for (const name of (await readdir(dir)).filter(n => /\.ya?ml$/.test(n)).sort()) {
    const sourcePath = join(dir, name);
    const voice = parse(await readFile(sourcePath, 'utf8')) as Record<string, unknown>;
    const id = String(voice.id ?? name.replace(/\.ya?ml$/, ''));
    result.push({
      id, version: String(voice.version ?? '1.0.0'), description: String(voice.description ?? `Adapted voice profile: ${id}`),
      kind: 'voice', stage: 'voice', order: 100, instructions: `Apply the existing voice profile '${id}' through voice-apply.`,
      provenance: { source: sourcePath, license: String((voice.license as string | undefined) ?? 'project license') },
      validation: { level: 'advisory' }, protectedContent: PROTECTED, contextCost: 32,
      mergeStrategy: 'weighted-voice', source: 'voice-adapter', sourcePath,
    });
  }
  return result;
}

export async function loadOutputModeRegistry(cwd: string, frameworkRoot: string): Promise<Map<string, ResolvedOutputMode>> {
  const registry = new Map<string, ResolvedOutputMode>();
  for (const profile of BUILTINS) registry.set(profile.id, { ...profile, source: 'builtin' });
  for (const profile of await loadVoiceAdapters(frameworkRoot)) if (!registry.has(profile.id)) registry.set(profile.id, profile);
  // User overrides built-ins; project overrides user.
  for (const entry of [...profileDirs(cwd)].reverse()) for (const profile of await loadDirectory(entry.dir, entry.source)) registry.set(profile.id, profile);
  return registry;
}

function statePath(cwd: string, scope: Exclude<OutputModeScope, 'invocation'>): string {
  if (scope === 'project') return join(cwd, '.aiwg', 'output-modes.yaml');
  const workspace = createHash('sha256').update(resolve(cwd)).digest('hex').slice(0, 16);
  const session = process.env.AIWG_SESSION_ID?.replace(/[^a-zA-Z0-9_.-]/g, '_') || 'default';
  return join(tmpdir(), 'aiwg-output-modes', `${workspace}-${session}.yaml`);
}

export async function readOutputModeState(cwd: string, scope: Exclude<OutputModeScope, 'invocation'>): Promise<OutputModeState> {
  const path = statePath(cwd, scope);
  if (!(await readable(path))) return { version: 1, modes: [] };
  const value = parse(await readFile(path, 'utf8')) as Partial<OutputModeState>;
  return { version: 1, modes: Array.isArray(value.modes) ? value.modes.map(String) : [] };
}

export async function writeOutputModeState(cwd: string, scope: Exclude<OutputModeScope, 'invocation'>, modes: string[]): Promise<string> {
  const path = statePath(cwd, scope);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, stringify({ version: 1, modes }), 'utf8');
  return path;
}

export async function resolveOutputModes(cwd: string, frameworkRoot: string, invocation: string[] = []): Promise<{ modes: ResolvedOutputMode[]; diagnostics: string[] }> {
  const registry = await loadOutputModeRegistry(cwd, frameworkRoot);
  const project = await readOutputModeState(cwd, 'project');
  const session = await readOutputModeState(cwd, 'session');
  const selected = [...project.modes.map(id => ({ id, scope: 'project' as const })), ...session.modes.map(id => ({ id, scope: 'session' as const })), ...invocation.map(id => ({ id, scope: 'invocation' as const }))];
  const effective = new Map<string, ResolvedOutputMode>();
  const diagnostics: string[] = [];
  for (const item of selected) {
    const profile = registry.get(item.id);
    if (!profile) throw new Error(`Unknown output mode '${item.id}'. Unknown provider-native or custom modes fail safe; run 'aiwg output-mode list'.`);
    effective.set(item.id, { ...profile, scope: item.scope });
  }
  const modes = [...effective.values()].sort((a, b) => STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage) || (a.order ?? 0) - (b.order ?? 0) || a.id.localeCompare(b.id));
  for (let i = 0; i < modes.length; i++) for (let j = i + 1; j < modes.length; j++) {
    const a = modes[i], b = modes[j];
    if (a.conflicts?.includes(b.id) || b.conflicts?.includes(a.id)) throw new Error(`Output modes '${a.id}' and '${b.id}' conflict. Disable one or configure an explicit merge strategy.`);
    if (a.kind === b.kind && a.kind !== 'voice') throw new Error(`Output modes '${a.id}' and '${b.id}' share kind '${a.kind}' without a merge strategy.`);
    if (a.kind === 'voice' && b.kind === 'voice' && a.mergeStrategy !== 'weighted-voice' && b.mergeStrategy !== 'weighted-voice') throw new Error(`Voice modes '${a.id}' and '${b.id}' require an explicit weighted-voice merge strategy.`);
  }
  for (const mode of modes) for (const requirement of mode.requires ?? []) if (!effective.has(requirement)) throw new Error(`Output mode '${mode.id}' requires '${requirement}'.`);
  if (modes.length === 0) diagnostics.push('unaltered: no configured modes; no instructions or post-processing are added');
  return { modes, diagnostics };
}
