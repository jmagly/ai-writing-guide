import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { isAbsolute, resolve, join } from 'node:path';
import { z } from 'zod';
import { importLegacyWriterProfile } from './writer-profile-legacy.js';
import { parseWriterProfile, type WriterProfile } from './writer-profile.js';
import { WriterProfileStore } from './writer-profile-store.js';

const digest = z.string().regex(/^[a-f0-9]{64}$/);
const profileId = z.string().regex(/^[a-z0-9][a-z0-9.-]{0,79}$/).refine(value => !value.includes('..'));
const hash = (text: string): string => createHash('sha256').update(text, 'utf8').digest('hex');

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .filter(([, child]) => child !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, child]) => [key, canonicalize(child)]));
  }
  return value;
}

const requestSchema = z.object({
  cwd: z.string().min(1),
  sourcePath: z.string().min(1),
  format: z.enum(['yaml', 'json']),
  scope: z.enum(['project', 'user']).default('project'),
  userConfigDir: z.string().min(1).optional(),
  profile: z.object({
    id: profileId,
    name: z.string().min(1).max(200),
    version: z.string().regex(/^\d+\.\d+\.\d+$/).default('1.0.0'),
    provenance: z.object({ source: z.string().min(1).max(2000), license: z.string().min(1).max(200) }).strict(),
  }).strict(),
}).strict();
export type WriterMigrationRequest = z.input<typeof requestSchema>;

export interface WriterMigrationPlan {
  schemaVersion: 'aiwg.writer-migration-plan.v1';
  id: string;
  planSha256: string;
  createdAt: string;
  dryRun: true;
  cwd: string;
  source: { path: string; format: 'yaml' | 'json'; sha256: string; bytes: number; legacyKind: string };
  target: { scope: 'project' | 'user'; profileId: string; userConfigDir?: string; existingProfile: { revision: number; sha256: string } | null; activatesProfile: false };
  actions: string[];
  warnings: string[];
  profileTemplate: WriterProfile;
}

export interface WriterMigrationApplyResult {
  schemaVersion: 'aiwg.writer-migration-apply.v1';
  id: string;
  appliedAt: string;
  cwd: string;
  sourceSha256: string;
  backupPath: string;
  backupSha256: string;
  profileId: string;
  scope: 'project' | 'user';
  userConfigDir?: string;
  profileRevisionBefore: number;
  profileRevisionAfter: number;
  createdProfileSha256: string;
  activatedProfile: false;
}

interface MigrationBackup {
  schemaVersion: 'aiwg.writer-migration-backup.v1';
  id: string;
  source: { path: string; format: 'yaml' | 'json'; sha256: string; rawBase64: string };
  previousProfile: { sha256: string; json: WriterProfile } | null;
}

const planSchema = z.object({
  schemaVersion: z.literal('aiwg.writer-migration-plan.v1'),
  id: z.string().regex(/^wm-[a-f0-9]{24}$/),
  planSha256: digest,
  createdAt: z.string().datetime(),
  dryRun: z.literal(true),
  cwd: z.string().min(1),
  source: z.object({ path: z.string().min(1), format: z.enum(['yaml', 'json']), sha256: digest, bytes: z.number().int().nonnegative(), legacyKind: z.string().min(1).max(80) }).strict(),
  target: z.object({
    scope: z.enum(['project', 'user']),
    profileId,
    userConfigDir: z.string().min(1).optional(),
    existingProfile: z.object({ revision: z.number().int().positive(), sha256: digest }).strict().nullable(),
    activatesProfile: z.literal(false),
  }).strict(),
  actions: z.array(z.string().min(1).max(200)).min(1),
  warnings: z.array(z.string().min(1).max(400)),
  profileTemplate: z.unknown(),
}).strict();

function planDigest(plan: Omit<WriterMigrationPlan, 'planSha256'>): string {
  return hash(JSON.stringify(canonicalize(plan)));
}

function profileDigest(profile: WriterProfile): string {
  return hash(JSON.stringify(canonicalize(profile)));
}

function resolveSourcePath(cwd: string, sourcePath: string): string {
  return isAbsolute(sourcePath) ? sourcePath : resolve(cwd, sourcePath);
}

function validateMigrationPlan(input: WriterMigrationPlan): WriterMigrationPlan {
  const parsed = planSchema.parse(input);
  const profile = parseWriterProfile(parsed.profileTemplate);
  const { planSha256, ...body } = parsed;
  if (planDigest({ ...body, profileTemplate: profile }) !== planSha256) throw new Error('Writer migration plan integrity mismatch');
  if (profile.id !== parsed.target.profileId) throw new Error('Writer migration plan target does not match profile template');
  if (!profile.legacy || profile.legacy.sha256 !== parsed.source.sha256 || profile.legacy.format !== parsed.source.format || profile.legacy.kind !== parsed.source.legacyKind) {
    throw new Error('Writer migration plan source does not match profile template legacy attachment');
  }
  return { ...parsed, profileTemplate: profile };
}

export async function planWriterProfileMigration(input: WriterMigrationRequest): Promise<WriterMigrationPlan> {
  const request = requestSchema.parse(input);
  const sourcePath = resolveSourcePath(request.cwd, request.sourcePath);
  const raw = await readFile(sourcePath, 'utf8');
  const legacy = importLegacyWriterProfile(raw, request.format);
  const profile = parseWriterProfile({
    schemaVersion: 1,
    id: request.profile.id,
    version: request.profile.version,
    name: request.profile.name,
    provenance: request.profile.provenance,
    samples: [],
    preferences: [],
    legacy,
  });
  const store = new WriterProfileStore({ cwd: request.cwd, scope: request.scope, userConfigDir: request.userConfigDir });
  let existingProfile: WriterMigrationPlan['target']['existingProfile'] = null;
  try {
    const current = await store.read(request.profile.id);
    existingProfile = { revision: current.revision, sha256: profileDigest(current) };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  const body: Omit<WriterMigrationPlan, 'planSha256'> = {
    schemaVersion: 'aiwg.writer-migration-plan.v1',
    id: `wm-${hash(`${sourcePath}\0${legacy.sha256}\0${request.profile.id}`).slice(0, 24)}`,
    createdAt: new Date().toISOString(),
    dryRun: true,
    cwd: request.cwd,
    source: { path: sourcePath, format: request.format, sha256: legacy.sha256, bytes: Buffer.byteLength(raw, 'utf8'), legacyKind: legacy.kind },
    target: { scope: request.scope, profileId: request.profile.id, ...(request.userConfigDir ? { userConfigDir: request.userConfigDir } : {}), existingProfile, activatesProfile: false },
    actions: ['validate legacy adapter payload', 'write private managed backup', 'create writer sidecar profile', 'leave output-mode activation unchanged'],
    warnings: [
      'Migration preserves legacy numeric fields and raw bytes; it does not infer a replacement score.',
      'External shared exports may still exist outside this local profile store and require separate operator review.',
    ],
    profileTemplate: profile,
  };
  return { ...body, planSha256: planDigest(body) };
}

async function writePrivateBackup(store: WriterProfileStore, profile: string, backup: MigrationBackup): Promise<{ path: string; sha256: string }> {
  const directory = store.managedMigrationBackupDirectory(profile);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const destination = join(directory, `${backup.id}.${randomUUID()}.json`);
  const payload = JSON.stringify(backup, null, 2) + '\n';
  const temporary = `${destination}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, payload, { mode: 0o600, flag: 'wx' });
    await rename(temporary, destination);
  } finally {
    await rm(temporary, { force: true });
  }
  return { path: destination, sha256: hash(payload) };
}

export async function applyWriterProfileMigration(input: WriterMigrationPlan): Promise<WriterMigrationApplyResult> {
  const plan = validateMigrationPlan(input);
  const raw = await readFile(plan.source.path, 'utf8');
  const legacy = importLegacyWriterProfile(raw, plan.source.format);
  if (legacy.sha256 !== plan.source.sha256 || legacy.kind !== plan.source.legacyKind || Buffer.byteLength(raw, 'utf8') !== plan.source.bytes) {
    throw new Error('Legacy profile changed after migration plan was created');
  }
  const store = new WriterProfileStore({ cwd: plan.cwd, scope: plan.target.scope, userConfigDir: plan.target.userConfigDir });
  let previous: WriterProfile | null = null;
  try {
    previous = await store.read(plan.target.profileId);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  const currentState = previous ? { revision: previous.revision, sha256: profileDigest(previous) } : null;
  if (JSON.stringify(currentState) !== JSON.stringify(plan.target.existingProfile)) throw new Error('Writer profile changed after migration plan was created');
  const backup: MigrationBackup = {
    schemaVersion: 'aiwg.writer-migration-backup.v1',
    id: plan.id,
    source: { path: plan.source.path, format: plan.source.format, sha256: plan.source.sha256, rawBase64: Buffer.from(raw, 'utf8').toString('base64') },
    previousProfile: previous ? { sha256: profileDigest(previous), json: previous } : null,
  };
  const backupRecord = await writePrivateBackup(store, plan.target.profileId, backup);
  const revisionBefore = previous?.revision ?? 0;
  let saved: WriterProfile;
  try {
    saved = await store.save(plan.profileTemplate, revisionBefore, { preserveMigrationBackups: true });
  } catch (error) {
    await rm(backupRecord.path, { force: true });
    throw error;
  }
  return {
    schemaVersion: 'aiwg.writer-migration-apply.v1',
    id: plan.id,
    appliedAt: new Date().toISOString(),
    cwd: plan.cwd,
    sourceSha256: plan.source.sha256,
    backupPath: backupRecord.path,
    backupSha256: backupRecord.sha256,
    profileId: saved.id,
    scope: plan.target.scope,
    ...(plan.target.userConfigDir ? { userConfigDir: plan.target.userConfigDir } : {}),
    profileRevisionBefore: revisionBefore,
    profileRevisionAfter: saved.revision,
    createdProfileSha256: profileDigest(saved),
    activatedProfile: false,
  };
}

export async function rollbackWriterProfileMigration(result: WriterMigrationApplyResult, options: { cwd?: string; scope?: 'project' | 'user'; userConfigDir?: string } = {}): Promise<'restored' | 'removed'> {
  const cwd = options.cwd ?? result.cwd;
  const store = new WriterProfileStore({ cwd, scope: options.scope ?? result.scope, userConfigDir: options.userConfigDir ?? result.userConfigDir });
  const allowedDirectory = store.managedMigrationBackupDirectory(result.profileId);
  if (!resolve(result.backupPath).startsWith(`${resolve(allowedDirectory)}/`)) throw new Error('Writer migration backup path is outside the managed backup directory');
  const current = await store.read(result.profileId);
  if (current.revision !== result.profileRevisionAfter || profileDigest(current) !== result.createdProfileSha256) throw new Error('Writer profile changed after migration; rollback refused');
  const payload = await readFile(result.backupPath, 'utf8');
  if (hash(payload) !== result.backupSha256) throw new Error('Writer migration backup integrity mismatch');
  let backup: MigrationBackup;
  try {
    backup = JSON.parse(payload) as MigrationBackup;
  } catch {
    throw new Error('Writer migration backup is corrupt or not JSON');
  }
  if (backup.schemaVersion !== 'aiwg.writer-migration-backup.v1' || backup.id !== result.id || backup.source.sha256 !== result.sourceSha256) throw new Error('Writer migration backup does not match apply result');
  if (backup.previousProfile) {
    const previous = parseWriterProfile(backup.previousProfile.json);
    if (profileDigest(previous) !== backup.previousProfile.sha256) throw new Error('Previous writer profile backup integrity mismatch');
    await store.save(previous, current.revision);
    return 'restored';
  }
  await store.delete(result.profileId, current.revision);
  return 'removed';
}
