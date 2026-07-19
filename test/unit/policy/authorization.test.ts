import { describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  evaluateAuthorization,
  exportProviderMappings,
  normalizeLegacyPermissions,
  normalizeProjectPermissions,
  validateAuthorization,
  type AuthorizationConfig,
} from '../../../src/policy/authorization.js';

function model(): AuthorizationConfig {
  return {
    version: '1',
    default_effect: 'deny',
    resources: {
      'repo:aiwg': { type: 'repo', value: 'roctinam/aiwg' },
      'repo:other': { type: 'repo', value: 'roctinam/other' },
    },
    permissions: {
      read: { actions: ['read'], resource_types: ['repo'] },
      write: { actions: ['write'], resource_types: ['repo'] },
      'deny-write': { actions: ['write'], resource_types: ['repo'], effect: 'deny' },
    },
    roles: {
      reader: { permissions: ['read'] },
      writer: { permissions: ['write'], inherits: ['reader'], boundaries: ['aiwg-only'] },
      blocked: { permissions: ['deny-write'] },
    },
    boundaries: { 'aiwg-only': { permissions: ['read', 'write'], resources: ['repo:aiwg'] } },
    assignments: [{
      id: 'agent',
      subjects: [{ kind: 'workload', id: 'aiwg:agent' }],
      roles: ['writer', 'blocked'],
      scope: { resources: ['repo:*'] },
    }],
  };
}

describe('normalized authorization evaluator', () => {
  it('defaults to deny for unknown subjects, actions, and resources', () => {
    expect(evaluateAuthorization(model(), {
      subjects: [{ kind: 'workload', id: 'unknown' }], action: 'read', resource: 'repo:aiwg',
    }).allowed).toBe(false);
  });

  it('supports inherited permissions and boundary intersection', () => {
    expect(evaluateAuthorization(model(), {
      subjects: [{ kind: 'workload', id: 'aiwg:agent' }], action: 'read', resource: 'repo:aiwg',
    }).allowed).toBe(true);
    expect(evaluateAuthorization(model(), {
      subjects: [{ kind: 'workload', id: 'aiwg:agent' }], action: 'read', resource: 'repo:other',
    }).allowed).toBe(false);
  });

  it('gives explicit deny precedence over allow', () => {
    const decision = evaluateAuthorization(model(), {
      subjects: [{ kind: 'workload', id: 'aiwg:agent' }], action: 'write', resource: 'repo:aiwg',
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe('explicit-deny:deny-write');
  });

  it('fails closed for unmet conditions and expired assignments', () => {
    const value = model();
    value.assignments[0]!.conditions = { tenant: 'one' };
    expect(evaluateAuthorization(value, {
      subjects: [{ kind: 'workload', id: 'aiwg:agent' }], action: 'read', resource: 'repo:aiwg',
    }).allowed).toBe(false);
    value.assignments[0]!.conditions = undefined;
    value.assignments[0]!.expires_at = '2020-01-01T00:00:00Z';
    expect(evaluateAuthorization(value, {
      subjects: [{ kind: 'workload', id: 'aiwg:agent' }], action: 'read', resource: 'repo:aiwg',
      now: new Date('2026-01-01T00:00:00Z'),
    }).allowed).toBe(false);
  });

  it('requires bounded OpenBao mappings using environment locators', () => {
    const invalid = model();
    invalid.provider_mappings = { openbao: [{ stable_id: 'commit-signer' }] };
    expect(validateAuthorization(invalid).map(d => d.code)).toEqual(
      expect.arrayContaining(['openbao-locator', 'openbao-constraints']),
    );
  });

  it('preserves provider-native identity fields and reports lossy concepts', () => {
    const value = model();
    value.provider_mappings = {
      aws_iam: [{ stable_id: 'writer', provider_id: 'arn:example', principal: 'svc', scope: '/project', actions: ['write'], resources: ['repo:aiwg'], conditions: { tenant: 'one' } }],
    };
    const exported = exportProviderMappings(value, 'aws_iam');
    expect(exported.mappings).toEqual(value.provider_mappings.aws_iam);
    expect(exported.diagnostics.map(d => d.code)).toContain('aws-role-inheritance-loss');
  });
});

describe('legacy normalization', () => {
  it('is deterministic, idempotent, and does not expand repos[].allowed', () => {
    const legacy = {
      version: '1' as const,
      providers: ['codex'],
      installed: {},
      scripts: {},
      repos: [{ name: 'api', path: './api', allowed: ['read', 'commit'] as const }],
    };
    const first = normalizeLegacyPermissions(legacy);
    const second = normalizeLegacyPermissions(first);
    expect(second).toBe(first);
    expect(Object.keys(first.authorization?.permissions ?? {})).toEqual(['repo.read', 'repo.commit']);
    expect(first.authorization?.default_effect).toBe('deny');
  });

  it('imports historical YAML action fields without retaining a new legacy repos block', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'aiwg-auth-migrate-'));
    try {
      await mkdir(join(dir, '.aiwg', 'security'), { recursive: true });
      await writeFile(join(dir, '.aiwg', 'security', 'repo-access.manifest.yaml'), [
        'version: "1"',
        'default_policy: deny',
        'repos:',
        '  - name: api',
        '    path: ./api',
        '    permissions: [read, push]',
      ].join('\n'));
      const legacy = { version: '1' as const, providers: ['codex'], installed: {}, scripts: {} };
      const normalized = await normalizeProjectPermissions(dir, legacy);
      expect(normalized.repos).toBeUndefined();
      expect(Object.keys(normalized.authorization?.permissions ?? {})).toEqual(['repo.read', 'repo.push']);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
