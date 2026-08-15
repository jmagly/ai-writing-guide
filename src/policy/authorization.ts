/**
 * Provider-neutral authorization model and legacy normalization.
 *
 * The core follows NIST RBAC separation of roles and assignments. Provider
 * mappings are metadata: they must never silently broaden the core grant.
 *
 * @implements #1800
 */
import { access, copyFile, mkdir, readFile, rename } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { load as loadYaml } from 'js-yaml';
import type { AiwgConfig, WorkspaceRepoAction } from '../config/aiwg-config.js';
import { projectAiwgPath, projectControlPath } from '../config/project-artifacts.js';

export type AuthorizationEffect = 'allow' | 'deny';
export type AuthorizationSubjectKind = 'user' | 'group' | 'service' | 'workload';

export interface AuthorizationResource {
  type: string;
  /** Provider-independent display/selection value (repo slug, logical secret id). */
  value: string;
  provider?: string;
  /** Environment variable containing a provider locator. Concrete secret paths stay out of config. */
  locator_env?: string;
}

export interface PermissionDefinition {
  actions: string[];
  resource_types: string[];
  effect?: AuthorizationEffect;
  description?: string;
}

export interface RoleDefinition {
  permissions: string[];
  inherits?: string[];
  boundaries?: string[];
  description?: string;
}

export interface AuthorizationBoundary {
  permissions?: string[];
  resources?: string[];
}

export interface AuthorizationAssignment {
  id: string;
  subjects: Array<{ kind: AuthorizationSubjectKind; id: string }>;
  roles: string[];
  scope: { resources: string[] };
  conditions?: Record<string, unknown>;
  expires_at?: string;
  justification?: string;
}

export interface ProviderPermissionMapping {
  stable_id: string;
  provider_id?: string;
  principal?: string;
  scope?: string;
  actions?: string[];
  resources?: string[];
  conditions?: Record<string, unknown>;
  /** OpenBao AppRole constraints. */
  token_ttl?: string;
  token_max_ttl?: string;
  secret_id_ttl?: string;
  secret_id_num_uses?: number;
  locator_env?: string;
}

export interface AuthorizationConfig {
  version: '1';
  default_effect: 'deny';
  resources: Record<string, AuthorizationResource>;
  permissions: Record<string, PermissionDefinition>;
  roles: Record<string, RoleDefinition>;
  boundaries?: Record<string, AuthorizationBoundary>;
  assignments: AuthorizationAssignment[];
  provider_mappings?: Partial<Record<'aws_iam' | 'entra_id' | 'openbao', ProviderPermissionMapping[]>>;
}

export interface AuthorizationDiagnostic {
  severity: 'info' | 'warning' | 'error';
  code: string;
  message: string;
  source?: string;
}

export interface AuthorizationDecision {
  allowed: boolean;
  reason: string;
  matched_permissions: string[];
}

export interface ProviderExport {
  provider: 'aws_iam' | 'entra_id' | 'openbao';
  mappings: ProviderPermissionMapping[];
  diagnostics: AuthorizationDiagnostic[];
}

/**
 * Export provider mappings without inventing provider grants. Stable IDs,
 * principals, scopes, resources, actions, and conditions survive unchanged;
 * unsupported core features are reported instead of discarded silently.
 */
export function exportProviderMappings(
  model: AuthorizationConfig,
  provider: ProviderExport['provider'],
): ProviderExport {
  const diagnostics: AuthorizationDiagnostic[] = [];
  const mappings = structuredClone(model.provider_mappings?.[provider] ?? []);
  if (!mappings.length) diagnostics.push({
    severity: 'warning',
    code: 'provider-mapping-missing',
    message: `No explicit ${provider} mappings exist; no provider policy was generated.`,
  });
  if (provider === 'aws_iam' && Object.values(model.roles).some(role => role.inherits?.length)) {
    diagnostics.push({ severity: 'warning', code: 'aws-role-inheritance-loss', message: 'AWS IAM has no direct role-inheritance equivalent; inherited grants must be flattened and reviewed.' });
  }
  if (provider === 'entra_id' && Object.keys(model.boundaries ?? {}).length) {
    diagnostics.push({ severity: 'warning', code: 'entra-boundary-loss', message: 'Entra/Azure RBAC has no IAM permission-boundary equivalent; preserve narrowing with assignment scopes and conditions.' });
  }
  diagnostics.push(...validateAuthorization(model).filter(d => d.code.startsWith(provider === 'openbao' ? 'openbao-' : '__none__')));
  return { provider, mappings, diagnostics };
}

function matches(pattern: string, value: string): boolean {
  if (pattern === '*') return true;
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(`^${escaped}$`).test(value);
}

function rolePermissions(
  model: AuthorizationConfig,
  roleId: string,
  seen = new Set<string>(),
): Set<string> {
  if (seen.has(roleId)) return new Set();
  seen.add(roleId);
  const role = model.roles[roleId];
  if (!role) return new Set();
  const result = new Set(role.permissions);
  for (const parent of role.inherits ?? []) {
    for (const permission of rolePermissions(model, parent, seen)) result.add(permission);
  }
  return result;
}

/** Evaluate a grant. Unknown inputs and malformed references fail closed. */
export function evaluateAuthorization(
  model: AuthorizationConfig | undefined,
  request: {
    subjects: Array<{ kind: AuthorizationSubjectKind; id: string }>;
    action: string;
    resource: string;
    context?: Record<string, unknown>;
    now?: Date;
  },
): AuthorizationDecision {
  if (!model || model.default_effect !== 'deny') {
    return { allowed: false, reason: 'missing-or-invalid-default-deny-model', matched_permissions: [] };
  }
  const matched = new Set<string>();
  let allowed = false;
  const resource = model.resources[request.resource];
  if (!resource) return { allowed: false, reason: 'unknown-resource', matched_permissions: [] };
  const permissionMatches = (permission: PermissionDefinition | undefined): boolean =>
    Boolean(permission
      && permission.actions.some(a => matches(a, request.action))
      && (permission.resource_types.includes(resource.type) || permission.resource_types.includes('*')));
  for (const assignment of model.assignments) {
    if (!assignment.subjects.some(s => request.subjects.some(r => r.kind === s.kind && r.id === s.id))) continue;
    if (!assignment.scope.resources.some(resource => matches(resource, request.resource))) continue;
    if (assignment.expires_at && (request.now ?? new Date()) >= new Date(assignment.expires_at)) continue;
    if (assignment.conditions && !Object.entries(assignment.conditions).every(([key, value]) =>
      Object.prototype.hasOwnProperty.call(request.context ?? {}, key)
      && JSON.stringify(request.context?.[key]) === JSON.stringify(value))) continue;
    for (const roleId of assignment.roles) {
      const role = model.roles[roleId];
      if (!role) continue;
      const rawPermissions = rolePermissions(model, roleId);
      // Explicit deny is evaluated before boundaries. A narrowing control may
      // never erase a deny.
      for (const permissionId of rawPermissions) {
        const permission = model.permissions[permissionId];
        if (permission?.effect === 'deny' && permissionMatches(permission)) {
          matched.add(permissionId);
          return { allowed: false, reason: `explicit-deny:${permissionId}`, matched_permissions: [...matched] };
        }
      }
      let permissions = rawPermissions;
      for (const boundaryId of role.boundaries ?? []) {
        const boundary = model.boundaries?.[boundaryId];
        permissions = new Set([...permissions].filter(p =>
          boundary?.permissions?.includes(p)
          && (!boundary.resources || boundary.resources.some(r => matches(r, request.resource)))));
      }
      for (const permissionId of permissions) {
        const permission = model.permissions[permissionId];
        if (!permissionMatches(permission)) continue;
        matched.add(permissionId);
        allowed = true;
      }
    }
  }
  return {
    allowed,
    reason: allowed ? 'role-grant' : 'default-deny',
    matched_permissions: [...matched].sort(),
  };
}

export function validateAuthorization(model: AuthorizationConfig | undefined): AuthorizationDiagnostic[] {
  if (!model) return [{ severity: 'warning', code: 'authorization-missing', message: 'No normalized authorization block; run steward permissions audit.' }];
  const out: AuthorizationDiagnostic[] = [];
  if (model.version !== '1') out.push({ severity: 'error', code: 'version', message: `Unsupported authorization version: ${model.version}` });
  if (model.default_effect !== 'deny') out.push({ severity: 'error', code: 'default-effect', message: 'Authorization must default to deny.' });
  for (const [id, role] of Object.entries(model.roles)) {
    for (const permission of role.permissions) if (!model.permissions[permission]) out.push({ severity: 'error', code: 'unknown-permission', message: `Role ${id} references unknown permission ${permission}.` });
    for (const parent of role.inherits ?? []) if (!model.roles[parent]) out.push({ severity: 'error', code: 'unknown-role', message: `Role ${id} inherits unknown role ${parent}.` });
    for (const boundary of role.boundaries ?? []) if (!model.boundaries?.[boundary]) out.push({ severity: 'error', code: 'unknown-boundary', message: `Role ${id} references unknown boundary ${boundary}.` });
  }
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visitRole = (id: string): void => {
    if (visiting.has(id)) {
      out.push({ severity: 'error', code: 'role-cycle', message: `Role inheritance cycle includes ${id}.` });
      return;
    }
    if (visited.has(id)) return;
    visiting.add(id);
    for (const parent of model.roles[id]?.inherits ?? []) visitRole(parent);
    visiting.delete(id);
    visited.add(id);
  };
  for (const id of Object.keys(model.roles)) visitRole(id);
  for (const assignment of model.assignments) {
    for (const role of assignment.roles) if (!model.roles[role]) out.push({ severity: 'error', code: 'unknown-role', message: `Assignment ${assignment.id} references unknown role ${role}.` });
    for (const resource of assignment.scope.resources) if (!model.resources[resource] && resource !== '*') out.push({ severity: 'error', code: 'unknown-resource', message: `Assignment ${assignment.id} references unknown resource ${resource}.` });
    if (assignment.expires_at && Number.isNaN(Date.parse(assignment.expires_at))) out.push({ severity: 'error', code: 'invalid-expiry', message: `Assignment ${assignment.id} has an invalid expires_at timestamp.` });
  }
  for (const mapping of model.provider_mappings?.openbao ?? []) {
    if (!mapping.locator_env) out.push({ severity: 'error', code: 'openbao-locator', message: `OpenBao mapping ${mapping.stable_id} must use locator_env.` });
    if (!mapping.token_ttl || !mapping.token_max_ttl || !mapping.secret_id_ttl || mapping.secret_id_num_uses === undefined) {
      out.push({ severity: 'error', code: 'openbao-constraints', message: `OpenBao mapping ${mapping.stable_id} requires bounded token and SecretID constraints.` });
    }
  }
  return out;
}

const LEGACY_MANIFESTS = [
  '.aiwg/ops/security/repo-access.manifest.yaml',
  '.aiwg/security/repo-access.manifest.yaml',
];

export async function auditLegacyPermissions(projectDir: string, config: AiwgConfig | null): Promise<AuthorizationDiagnostic[]> {
  const out = validateAuthorization(config?.authorization);
  if (!config?.authorization && config?.repos?.some(repo => repo.allowed?.length)) out.push({ severity: 'warning', code: 'legacy-repos-allowed', source: '.aiwg/aiwg.config', message: 'repos[].allowed should be normalized into authorization roles and assignments.' });
  if (!config?.authorization && Object.keys(config?.repo_maintainer?.tiers ?? {}).length) out.push({ severity: 'warning', code: 'legacy-maintainer-tiers', source: '.aiwg/aiwg.config', message: 'repo_maintainer.tiers should be represented by normalized role assignments.' });
  if (!config?.authorization && config?.delivery) out.push({ severity: 'warning', code: 'legacy-delivery-policy', source: '.aiwg/aiwg.config', message: 'delivery and signing operations should be normalized into scoped role assignments.' });
  for (const path of LEGACY_MANIFESTS) {
    try {
      await access(join(projectDir, path));
      out.push({ severity: 'warning', code: 'legacy-repo-manifest', source: path, message: 'Legacy repository permission manifest detected.' });
    } catch { /* absent */ }
  }
  return out;
}

/** Deterministically normalize current repo grants. It only copies declared legacy actions. */
export function normalizeLegacyPermissions(config: AiwgConfig): AiwgConfig {
  if (config.authorization) return config;
  const resources: AuthorizationConfig['resources'] = {};
  const permissions: AuthorizationConfig['permissions'] = {};
  const roles: AuthorizationConfig['roles'] = {};
  const assignments: AuthorizationConfig['assignments'] = [];
  for (const repo of config.repos ?? []) {
    const resourceId = `repo:${repo.name}`;
    const roleId = `legacy.repo.${repo.name}`;
    resources[resourceId] = { type: 'repo', value: repo.path, provider: repo.provider };
    const ids: string[] = [];
    for (const action of repo.allowed ?? [] as WorkspaceRepoAction[]) {
      const permissionId = `repo.${action}`;
      permissions[permissionId] ??= { actions: [action], resource_types: ['repo'], effect: 'allow' };
      ids.push(permissionId);
    }
    roles[roleId] = { permissions: [...new Set(ids)].sort(), description: 'Normalized from repos[].allowed' };
    assignments.push({ id: `legacy.${repo.name}`, subjects: [{ kind: 'workload', id: 'aiwg:workspace' }], roles: [roleId], scope: { resources: [resourceId] }, justification: 'Mechanical normalization of legacy workspace grants' });
  }
  for (const [target, tier] of Object.entries(config.repo_maintainer?.tiers ?? {})) {
    const resourceId = `repo-maintainer:${target}`;
    resources[resourceId] = { type: 'repo', value: target };
    const actions = ['read', 'write', 'commit', 'push', 'issue-comment'];
    if (tier === 'maintainer' || tier === 'admin') actions.push('service-action');
    if (tier === 'admin') actions.push('destructive');
    for (const action of actions) permissions[`repo.${action}`] ??= { actions: [action], resource_types: ['repo'] };
    const roleId = `legacy.repo-maintainer.${tier}`;
    roles[roleId] ??= { permissions: actions.map(action => `repo.${action}`), description: `Normalized ${tier} compatibility tier` };
    assignments.push({
      id: `legacy.repo-maintainer.${assignments.length}`,
      subjects: [{ kind: 'workload', id: 'aiwg:repo-maintainer' }],
      roles: [roleId],
      scope: { resources: [resourceId] },
      justification: 'Mechanical normalization of repo_maintainer.tiers',
    });
  }
  // Single-repository delivery declarations are also legacy authorization
  // inputs. Map only the operations the selected mode already authorizes.
  if (config.delivery) {
    resources['repo:local'] = { type: 'repo', value: '.' };
    const deliveryActions: string[] = ['read', 'write', 'commit'];
    if (config.delivery.mode === 'direct' || config.delivery.mode === 'feature-branch' || config.delivery.mode === 'pr-required') {
      deliveryActions.push('push');
    }
    for (const action of deliveryActions) permissions[`repo.${action}`] ??= { actions: [action], resource_types: ['repo'] };
    if (config.delivery.issue_comment_on_cycle && config.remotes?.issue_tracker) {
      resources['tracker:issues'] = { type: 'tracker', value: config.remotes.issue_tracker };
      permissions['tracker.issue-comment'] = { actions: ['issue-comment'], resource_types: ['tracker'] };
    }
    const scopedResources = ['repo:local', ...(resources['tracker:issues'] ? ['tracker:issues'] : [])];
    roles['delivery.contributor'] = {
      permissions: [...deliveryActions.map(action => `repo.${action}`), ...(permissions['tracker.issue-comment'] ? ['tracker.issue-comment'] : [])],
      description: 'Normalized from delivery and tracker policy',
    };
    assignments.push({
      id: 'delivery.address-issues',
      subjects: [{ kind: 'workload', id: 'aiwg:address-issues' }],
      roles: ['delivery.contributor'],
      scope: { resources: scopedResources },
      justification: 'Mechanical normalization of declared delivery operations',
    });
  }
  if (config.delivery?.signing?.enforce === 'commits') {
    resources['secret:commit-signing-key'] = {
      type: 'secret',
      value: 'commit-signing-key',
      provider: 'openbao',
      locator_env: 'COMMIT_SIGNING_KEY_VAULT_PATH',
    };
    permissions['secret.commit-signing-key.read'] = { actions: ['read'], resource_types: ['secret'] };
    roles['delivery.commit-signer'] = {
      permissions: ['secret.commit-signing-key.read'],
      boundaries: ['commit-signing-only'],
      description: 'Read only the commit signing key; never the release signing key',
    };
    assignments.push({
      id: 'delivery.commit-signer',
      subjects: [{ kind: 'workload', id: 'aiwg:commit-signer' }],
      roles: ['delivery.commit-signer'],
      scope: { resources: ['secret:commit-signing-key'] },
      justification: 'Normalized from commit-signing enforcement',
    });
  }
  return {
    ...config,
    authorization: {
      version: '1',
      default_effect: 'deny',
      resources,
      permissions,
      roles,
      boundaries: roles['delivery.commit-signer']
        ? { 'commit-signing-only': { permissions: ['secret.commit-signing-key.read'], resources: ['secret:commit-signing-key'] } }
        : undefined,
      assignments,
      provider_mappings: roles['delivery.commit-signer'] ? {
        openbao: [{
          stable_id: 'aiwg-commit-signer',
          provider_id: 'aiwg-commit-signer',
          actions: ['read'],
          resources: ['secret:commit-signing-key'],
          token_ttl: '5m',
          token_max_ttl: '15m',
          secret_id_ttl: '24h',
          secret_id_num_uses: 1,
          locator_env: 'COMMIT_SIGNING_KEY_VAULT_PATH',
        }],
      } : undefined,
    },
  };
}

/**
 * Include the first historical YAML repo manifest in normalization. Invalid or
 * broad-by-default manifests abort; they are never partially imported.
 */
export async function normalizeProjectPermissions(
  projectDir: string,
  config: AiwgConfig,
): Promise<AiwgConfig> {
  if (config.authorization) return config;
  let source = config;
  if (!config.repos?.length) {
    for (const manifestPath of LEGACY_MANIFESTS) {
      try {
        const raw = loadYaml(await readFile(join(projectDir, manifestPath), 'utf8')) as Record<string, unknown>;
        if ((raw.defaultPolicy ?? raw.default_policy ?? 'deny') !== 'deny') {
          throw new Error(`${manifestPath} must default to deny`);
        }
        if (!Array.isArray(raw.repos)) throw new Error(`${manifestPath} requires repos: []`);
        const repos = raw.repos.map((entry, index) => {
          if (!entry || typeof entry !== 'object') throw new Error(`${manifestPath} repos[${index}] must be an object`);
          const value = entry as Record<string, unknown>;
          const actions = value.allowed ?? value.actions ?? value.permissions;
          if (typeof value.name !== 'string' || typeof value.path !== 'string' || !Array.isArray(actions)) {
            throw new Error(`${manifestPath} repos[${index}] requires name, path, and actions`);
          }
          for (const action of actions) {
            if (typeof action !== 'string' || !['read', 'write', 'commit', 'push', 'issue-comment', 'service-action', 'destructive'].includes(action)) {
              throw new Error(`${manifestPath} repos[${index}] has invalid action ${String(action)}`);
            }
          }
          const absolute = isAbsolute(value.path) ? resolve(value.path) : resolve(projectDir, value.path);
          return {
            name: value.name,
            path: relative(projectDir, absolute) || '.',
            allowed: actions as WorkspaceRepoAction[],
            provider: ['gitea', 'github', 'gitlab'].includes(String(value.provider))
              ? value.provider as 'gitea' | 'github' | 'gitlab'
              : undefined,
            notes: typeof value.notes === 'string' ? value.notes : undefined,
          };
        });
        source = { ...config, repos };
        break;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue;
        throw error;
      }
    }
  }
  const normalized = normalizeLegacyPermissions(source);
  return source === config ? normalized : { ...normalized, repos: config.repos };
}

/** Archive migrated standalone manifests so subsequent audits are clean. */
export async function archiveLegacyPermissionManifests(projectDir: string): Promise<string[]> {
  const archived: string[] = [];
  for (const path of LEGACY_MANIFESTS) {
    try {
      const target = `${path}.migrated.bak`;
      await rename(join(projectDir, path), join(projectDir, target));
      archived.push(target);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }
  return archived;
}

export async function backupConfig(projectDir: string): Promise<string> {
  const source = projectControlPath(projectDir, 'aiwg.config');
  const backupDir = projectAiwgPath(projectDir, 'backups');
  await mkdir(backupDir, { recursive: true });
  const content = await readFile(source);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const target = join(backupDir, `aiwg.config.permissions-${stamp}.bak`);
  await copyFile(source, target);
  // Ensure the source remained readable before the caller atomically replaces it.
  if (!content.length) throw new Error('Refusing to migrate an empty aiwg.config');
  return target;
}
