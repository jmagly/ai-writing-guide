import { access, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { dirname, extname, join, resolve } from 'node:path';
import { parse, stringify } from 'yaml';
import { z } from 'zod';
import { getWritingChannelPack, type WritingChannel } from '../writing/channel-packs.js';
import { WriterProfileStore } from '../writing/writer-profile-store.js';
import { compileWriterProfile } from '../writing/writer-profile.js';
import { resolveUserConfigDir } from '../config/user-config-dir.mjs';
import type { OutputModeProfile, OutputModeScope, OutputModeState, ResolvedOutputMode } from './types.js';

const MODE_ID_PATTERN = /^[a-z0-9][a-z0-9.-]*$/;
const PROTECTED = ['code', 'commands', 'citations', 'quoted-text', 'identifiers', 'machine-readable-blocks'] as const;
const STAGE_ORDER = ['semantic', 'voice', 'controlled-language', 'structure', 'presentation'] as const;

const modeIdSchema = z.string().regex(MODE_ID_PATTERN, 'must start with a lowercase letter or number and contain only lowercase letters, numbers, dots, or hyphens');
const uniqueModeIds = z.array(modeIdSchema).refine(values => new Set(values).size === values.length, 'must not contain duplicates');
const outputModeProfileSchema = z.object({
  id: modeIdSchema,
  version: z.string().min(1),
  description: z.string().min(1),
  kind: z.enum(['voice', 'controlled-language', 'structure', 'presentation']),
  stage: z.enum(STAGE_ORDER),
  order: z.number().int().optional(),
  instructions: z.string(),
  provenance: z.object({ source: z.string().min(1), license: z.string().min(1) }).strict(),
  validation: z.object({
    level: z.enum(['advisory', 'validated', 'conformance']),
    hook: z.string().min(1).optional(),
    standardVersion: z.string().min(1).optional(),
  }).strict(),
  compatible: uniqueModeIds.optional(),
  conflicts: uniqueModeIds.optional(),
  requires: uniqueModeIds.optional(),
  supersedes: uniqueModeIds.optional(),
  protectedContent: z.array(z.enum(PROTECTED)).refine(values => new Set(values).size === values.length, 'must not contain duplicates').optional(),
  contextCost: z.number().int().nonnegative().optional(),
  mergeStrategy: z.literal('weighted-voice').optional(),
}).strict().superRefine((profile, ctx) => {
  if (profile.validation.level !== 'advisory' && !profile.validation.hook) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['validation', 'hook'], message: `${profile.validation.level} modes require a validator hook` });
  }
  if (profile.validation.level === 'conformance' && !profile.validation.standardVersion) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['validation', 'standardVersion'], message: 'conformance modes require a standard version' });
  }
});

const BUILTINS: OutputModeProfile[] = [
  ...(['article', 'social', 'email', 'engineering', 'conversation'] as WritingChannel[]).map(channel => ({
    id: `channel-${channel}`, version: '1.0.0', description: `Advisory ${channel} structure pack`,
    kind: 'structure' as const, stage: 'structure' as const, order: 300,
    instructions: getWritingChannelPack(channel).instructions, provenance: { source: 'AIWG channel packs', license: 'MIT' },
    validation: { level: 'advisory' as const }, protectedContent: [...PROTECTED],
  })),
  {
    id: 'unaltered', version: '1.0.0', description: 'No-op mode; preserves the provider output path unchanged.',
    kind: 'presentation', stage: 'presentation', order: -1000, instructions: '',
    provenance: { source: 'AIWG', license: 'MIT' }, validation: { level: 'advisory' }, contextCost: 0,
    protectedContent: [...PROTECTED],
  },
  {
    id: 'wittgenstein-inspired', version: '1.0.0', description: 'Concise, proposition-oriented stylistic profile; not impersonation or attribution.',
    kind: 'voice', stage: 'voice', order: 100, instructions: 'Prefer concise propositions, clarify terms in use, and expose category errors. Do not imitate or attribute text to Ludwig Wittgenstein.',
    provenance: { source: 'AIWG original style guidance', license: 'MIT' }, validation: { level: 'advisory' }, contextCost: 48,
    protectedContent: [...PROTECTED],
  },
  {
    id: 'asd-ste', version: '1.0.0', description: 'Operator-configured ASD Simplified Technical English adapter.',
    kind: 'controlled-language', stage: 'controlled-language', order: 200,
    instructions: 'Apply only operator-supplied ASD-STE rules and approved terminology. Without licensed rules and a configured validator, describe output as advisory and never claim conformance.',
    provenance: { source: 'AIWG adapter; standard content supplied by operator', license: 'MIT adapter only' },
    validation: { level: 'advisory', standardVersion: 'operator-configured' }, contextCost: 64,
    protectedContent: [...PROTECTED],
  },
];

function profileDirs(cwd: string): Array<{ dir: string; source: ResolvedOutputMode['source'] }> {
  return [
    { dir: join(cwd, '.aiwg', 'output-modes'), source: 'project' },
    { dir: join(resolveUserConfigDir(), 'output-modes'), source: 'user' },
  ];
}

async function readable(path: string): Promise<boolean> {
  try { await access(path, constants.R_OK); return true; } catch { return false; }
}

export function validateOutputModeProfile(value: unknown, path = '<profile>'): OutputModeProfile {
  const result = outputModeProfileSchema.safeParse(value);
  if (!result.success) {
    const details = result.error.issues
      .map(issue => `${issue.path.length ? issue.path.join('.') : 'profile'}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid output mode profile at ${path}: ${details}`);
  }
  return result.data;
}

async function loadDirectory(dir: string, source: ResolvedOutputMode['source']): Promise<ResolvedOutputMode[]> {
  if (!(await readable(dir))) return [];
  const result: ResolvedOutputMode[] = [];
  const seen = new Map<string, string>();
  for (const name of (await readdir(dir)).sort()) {
    if (!['.yaml', '.yml', '.json'].includes(extname(name))) continue;
    const sourcePath = join(dir, name);
    const raw = await readFile(sourcePath, 'utf8');
    const value = extname(name) === '.json' ? JSON.parse(raw) : parse(raw);
    const profile = validateOutputModeProfile(value, sourcePath);
    const previous = seen.get(profile.id);
    if (previous) throw new Error(`Duplicate output mode '${profile.id}' in ${previous} and ${sourcePath}. Keep one definition per scope.`);
    seen.set(profile.id, sourcePath);
    result.push({ ...profile, source, sourcePath });
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
      validation: { level: 'advisory' }, protectedContent: [...PROTECTED], contextCost: 32,
      mergeStrategy: 'weighted-voice', source: 'voice-adapter', sourcePath,
    });
  }
  return result;
}

async function loadWriterAdapters(cwd: string, scope: 'project' | 'user'): Promise<ResolvedOutputMode[]> {
  const store = new WriterProfileStore({ cwd, scope });
  const result: ResolvedOutputMode[] = [];
  for (const id of await store.list()) {
    const compiled = compileWriterProfile(await store.read(id));
    result.push({ ...validateOutputModeProfile(compiled.profile), source: scope, sourcePath: join(store.directory, `${id}.json`) });
  }
  return result;
}

export async function loadOutputModeRegistry(cwd: string, frameworkRoot: string): Promise<Map<string, ResolvedOutputMode>> {
  const registry = new Map<string, ResolvedOutputMode>();
  for (const profile of BUILTINS) registry.set(profile.id, { ...profile, source: 'builtin' });
  for (const profile of await loadVoiceAdapters(frameworkRoot)) if (!registry.has(profile.id)) registry.set(profile.id, profile);
  // User overrides built-ins; project overrides user.
  for (const entry of [...profileDirs(cwd)].reverse()) {
    const profiles = await loadDirectory(entry.dir, entry.source);
    const writers = await loadWriterAdapters(cwd, entry.source as 'project' | 'user');
    const ids = new Set(profiles.map(profile => profile.id));
    for (const writer of writers) if (ids.has(writer.id)) throw new Error(`Duplicate output mode '${writer.id}' from a writer sidecar and a mode file in the same scope.`);
    for (const profile of [...profiles, ...writers]) registry.set(profile.id, profile);
  }
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
  if (!value || value.version !== 1 || !Array.isArray(value.modes) || value.modes.some(mode => typeof mode !== 'string' || !MODE_ID_PATTERN.test(mode))) {
    throw new Error(`Invalid output mode state at ${path}: expected version 1 and an array of valid mode IDs.`);
  }
  return { version: 1, modes: [...new Set(value.modes)] };
}

export async function writeOutputModeState(cwd: string, scope: Exclude<OutputModeScope, 'invocation'>, modes: string[]): Promise<string> {
  const path = statePath(cwd, scope);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, stringify({ version: 1, modes }), 'utf8');
  return path;
}

export interface OutputModeStateOverrides {
  project?: string[];
  session?: string[];
}

export async function resolveOutputModes(
  cwd: string,
  frameworkRoot: string,
  invocation: string[] = [],
  overrides: OutputModeStateOverrides = {},
): Promise<{ modes: ResolvedOutputMode[]; diagnostics: string[] }> {
  const registry = await loadOutputModeRegistry(cwd, frameworkRoot);
  const project = overrides.project ?? (await readOutputModeState(cwd, 'project')).modes;
  const session = overrides.session ?? (await readOutputModeState(cwd, 'session')).modes;
  for (const [scope, modes] of [['project', project], ['session', session], ['invocation', invocation]] as const) {
    if (!Array.isArray(modes) || modes.some(id => typeof id !== 'string' || !MODE_ID_PATTERN.test(id))) {
      throw new Error(`Invalid ${scope} output mode selection: expected valid mode IDs.`);
    }
  }
  const selected = [...project.map(id => ({ id, scope: 'project' as const })), ...session.map(id => ({ id, scope: 'session' as const })), ...invocation.map(id => ({ id, scope: 'invocation' as const }))];
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
    const writerSelected = a.id.startsWith('writer-') || b.id.startsWith('writer-');
    const missingMerge = writerSelected
      ? a.mergeStrategy !== 'weighted-voice' || b.mergeStrategy !== 'weighted-voice'
      : a.mergeStrategy !== 'weighted-voice' && b.mergeStrategy !== 'weighted-voice';
    if (a.kind === 'voice' && b.kind === 'voice' && missingMerge) throw new Error(`Voice modes '${a.id}' and '${b.id}' require an explicit weighted-voice merge strategy.`);
  }
  for (const mode of modes) for (const requirement of mode.requires ?? []) if (!effective.has(requirement)) throw new Error(`Output mode '${mode.id}' requires '${requirement}'.`);
  if (modes.length === 0) diagnostics.push('unaltered: no configured modes; no instructions or post-processing are added');
  return { modes, diagnostics };
}
