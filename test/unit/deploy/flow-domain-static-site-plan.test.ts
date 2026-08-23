import { readFileSync } from 'node:fs';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { describe, expect, it } from 'vitest';
import { validateFlowDomainStaticSitePlan } from '../../../tools/deploy/validate-flow-domain-static-site-plan.mjs';

const ROOT = path.resolve(__dirname, '../../..');
const PLAN_PATH = path.join(ROOT, 'templates/deploy/static-site/flow.aiwg.io/deployment-plan.json');
const SCHEMA_PATH = path.join(ROOT, 'schemas/deploy/flow-domain-static-site-plan.v1.schema.json');
const readJson = (file: string) => JSON.parse(readFileSync(file, 'utf8'));
const plan = () => readJson(PLAN_PATH);

describe('Flow domain static deployment plan (#2125)', () => {
  it('passes the strict versioned schema and semantic validator', () => {
    const ajv = new Ajv2020({ allErrors: true, strict: false });
    addFormats(ajv);
    const validate = ajv.compile(readJson(SCHEMA_PATH));
    const value = plan();
    expect(validate(value), validate.errors ? JSON.stringify(validate.errors, null, 2) : '').toBe(true);
    expect(validateFlowDomainStaticSitePlan(value, { workspaceRoot: ROOT })).toEqual({ valid: true, diagnostics: [] });
    expect(readJson(path.join(ROOT, 'package.json')).files).toContain('schemas/deploy/');
  });

  it('approves one third-level canonical host and path-based graph surface', () => {
    const value = plan();
    expect(value.spec.canonicalHostname).toBe('flow.aiwg.io');
    expect(value.spec.hostnamePolicy).toMatchObject({ maximumLabels: 3, graphContentPath: '/graph/', fourthLevelDnsAllowed: false });
    expect(value.spec.sites[0].paths).toContainEqual(expect.objectContaining({ path: '/graph/' }));
    expect(value.spec.sites.every((site: {hostname: string}) => site.hostname.split('.').length <= 3)).toBe(true);
  });

  it('approves exactly one private repository without creating it', () => {
    const value = plan();
    expect(value.spec.repositories).toEqual([
      expect.objectContaining({ owner: 'roctinam', name: 'flow.aiwg.io', visibility: 'private', state: 'approved-not-created' }),
    ]);
    expect(value.spec.repositories[0].build).toEqual({ installCommand: 'npm ci', command: 'npm run build', outputDirectory: 'dist' });
    expect(value.spec.repositories[0].workflowTarget).toBe('.gitea/workflows/deploy.yml');
  });

  it('binds the selected shared tenant to its exact Caddy and volume mappings', () => {
    const value = plan();
    const site = value.spec.sites[0];
    expect(site.deployment).toMatchObject({
      pattern: 'shared-serve-static',
      hostPath: '/home/roctinam/production-deploy/flow.aiwg.io',
      containerPath: '/srv/flow.aiwg.io',
      origin: { host: '127.0.0.1', port: 80, service: 'roctinam/serve-static:static-server' },
    });
    expect(readFileSync(path.join(ROOT, site.deployment.caddyTemplate), 'utf8')).toContain('http://flow.aiwg.io');
    expect(readFileSync(path.join(ROOT, site.deployment.composeTemplate), 'utf8')).toContain('/home/roctinam/production-deploy/flow.aiwg.io:/srv/flow.aiwg.io:ro');
  });

  it('ships a pinned Gitea deployment workflow with bounded rsync and optional host purge', () => {
    const value = plan();
    const workflow = readFileSync(path.join(ROOT, value.spec.repositories[0].workflowTemplate), 'utf8');
    expect(workflow).toContain('actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5');
    expect(workflow).toContain('node:20@sha256:');
    expect(workflow).toContain('rsync -avzn --delete');
    expect(workflow).toContain('/home/roctinam/production-deploy/flow.aiwg.io/');
    expect(workflow).toContain('--data \'{"hosts":["flow.aiwg.io"]}\'');
    expect(workflow).not.toContain("if: ${{ secrets.");
    expect(workflow).toContain('Cache purge is not configured; skipping.');
    for (const name of ['DEPLOY_SSH_KEY', 'CF_ZONE_ID', 'CF_CACHE_PURGE']) expect(workflow).toContain(name);
  });

  it('documents exact DNS, tunnel, origin-port, and configuration handoff', () => {
    const value = plan();
    expect(value.spec.operatorHandoff.dnsRoutes).toEqual([value.spec.sites[0].dns]);
    expect(value.spec.operatorHandoff.tunnelRoutes).toEqual([value.spec.sites[0].tunnel]);
    expect(value.spec.operatorHandoff.originPorts).toContainEqual(expect.objectContaining({ hostname: 'flow.aiwg.io', port: 80 }));
    expect(value.spec.configuration).toEqual(expect.objectContaining({
      requiredSecretNames: ['DEPLOY_SSH_KEY'],
      optionalCachePurgeSecretNames: ['CF_ZONE_ID', 'CF_CACHE_PURGE'],
      secretValuesNeverStored: true,
    }));
  });

  it('rejects fourth-level DNS and public repository drift', () => {
    const value = plan();
    value.spec.sites[0].hostname = 'docs.graph.aiwg.io';
    value.spec.repositories[0].visibility = 'public';
    const result = validateFlowDomainStaticSitePlan(value, { workspaceRoot: ROOT });
    expect(result.valid).toBe(false);
    expect(result.diagnostics.map((entry: {code: string}) => entry.code)).toEqual(expect.arrayContaining([
      'FOURTH_LEVEL_DNS_FORBIDDEN', 'PUBLIC_REPOSITORY_FORBIDDEN', 'ROUTE_HOSTNAME_MISMATCH',
    ]));
  });

  it('rejects duplicate isolated ports and mismatched tunnel origins', () => {
    const value = plan();
    const base = structuredClone(value.spec.sites[0]);
    const isolated = (id: string, hostname: string) => ({
      ...structuredClone(base), id, hostname, repository: 'flow-site',
      dns: {...base.dns, hostname},
      deployment: {...base.deployment, pattern: 'per-site-container', origin: {...base.deployment.origin, host: '127.0.0.1', port: 8701}},
      tunnel: {hostname, origin: 'http://127.0.0.1:8799', accessPolicyReview: 'required-before-change'},
    });
    value.spec.sites = [isolated('one', 'one.aiwg.io'), isolated('two', 'two.aiwg.io')];
    const result = validateFlowDomainStaticSitePlan(value, { workspaceRoot: ROOT });
    expect(result.valid).toBe(false);
    expect(result.diagnostics.map((entry: {code: string}) => entry.code)).toEqual(expect.arrayContaining([
      'DUPLICATE_ISOLATED_PORT', 'TUNNEL_ORIGIN_MISMATCH',
    ]));
  });

  it('ships a localhost-only, pinned per-site fallback template', () => {
    const fallback = path.join(ROOT, 'templates/deploy/static-site/per-site-container');
    const compose = readFileSync(path.join(fallback, 'docker-compose.production.yml'), 'utf8');
    const workflow = readFileSync(path.join(fallback, 'gitea-deploy.yml'), 'utf8');
    expect(compose).toContain('127.0.0.1:{{ORIGIN_PORT}}:80');
    expect(compose).toContain('caddy:2-alpine@sha256:');
    expect(compose).toContain('no-new-privileges:true');
    expect(workflow).toContain('actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5');
    expect(workflow).toContain('rsync -avzn --delete');
    expect(workflow).toContain('http://127.0.0.1:{{ORIGIN_PORT}}');
  });

  it('documents both serving patterns and the no-live-mutation boundary', () => {
    const guidance = readFileSync(path.join(ROOT, 'docs/guides/flow-domain-static-deployment.md'), 'utf8');
    for (const phrase of ['shared `serve-static`', 'Per-site container fallback', 'Final operator handoff', 'does not create the repository', 'does not create the repository or change live']) {
      expect(guidance).toContain(phrase);
    }
    for (const phrase of [
      'HTTP Host Header', 'flow.aiwg.io', 'http://127.0.0.1:80',
      '<TUNNEL-UUID>.cfargotunnel.com', 'http_status:404',
      'cloudflared tunnel ingress validate', 'CF_CACHE_PURGE', 'CF_ZONE_ID',
    ]) expect(guidance).toContain(phrase);
  });
});
