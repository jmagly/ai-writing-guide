#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const API_VERSION = 'flow.aiwg.io/v1alpha1';
const KIND = 'FlowDomainStaticDeploymentPlan';

function issue(code, pointer, message) {
  return { code, path: pointer, message };
}

function unique(values) {
  return new Set(values).size === values.length;
}

function originFor(deployment) {
  return `${deployment.origin.scheme}://${deployment.origin.host}:${deployment.origin.port}`;
}

function fileText(workspaceRoot, relativePath, diagnostics, pointer) {
  const absolute = path.resolve(workspaceRoot, relativePath || '');
  if (!relativePath || !absolute.startsWith(`${path.resolve(workspaceRoot)}${path.sep}`) || !fs.existsSync(absolute)) {
    diagnostics.push(issue('MISSING_TEMPLATE', pointer, `Template does not exist inside the workspace: ${relativePath || '<missing>'}`));
    return '';
  }
  return fs.readFileSync(absolute, 'utf8');
}

/**
 * Validate semantic invariants that JSON Schema cannot express: DNS label
 * depth, cross-references, port uniqueness, exact handoff routes, and template
 * agreement. This function reads templates only; it never contacts or mutates
 * DNS, Cloudflare, a deployment host, or a repository.
 */
export function validateFlowDomainStaticSitePlan(plan, { workspaceRoot = process.cwd() } = {}) {
  const diagnostics = [];
  if (!plan || typeof plan !== 'object') {
    return { valid: false, diagnostics: [issue('INVALID_PLAN', '/', 'Plan must be an object.')] };
  }
  if (plan.apiVersion !== API_VERSION) diagnostics.push(issue('INVALID_API_VERSION', '/apiVersion', `Expected ${API_VERSION}.`));
  if (plan.kind !== KIND) diagnostics.push(issue('INVALID_KIND', '/kind', `Expected ${KIND}.`));
  if (plan.metadata?.approval?.status !== 'approved') {
    diagnostics.push(issue('UNAPPROVED_PLAN', '/metadata/approval/status', 'Deployment plan must be explicitly approved.'));
  }

  const spec = plan.spec ?? {};
  const maxLabels = 3;
  if (spec.canonicalHostname !== 'flow.aiwg.io') {
    diagnostics.push(issue('UNAPPROVED_CANONICAL_HOSTNAME', '/spec/canonicalHostname', 'The approved canonical hostname is flow.aiwg.io.'));
  }
  if (spec.hostnamePolicy?.maximumLabels !== maxLabels || spec.hostnamePolicy?.fourthLevelDnsAllowed !== false) {
    diagnostics.push(issue('INVALID_HOSTNAME_POLICY', '/spec/hostnamePolicy', 'Hostname policy must forbid names deeper than flow.aiwg.io.'));
  }
  const repositories = Array.isArray(spec.repositories) ? spec.repositories : [];
  const sites = Array.isArray(spec.sites) ? spec.sites : [];
  const repositoryIds = repositories.map((repo) => repo.id);
  const siteIds = sites.map((site) => site.id);
  if (!unique(repositoryIds)) diagnostics.push(issue('DUPLICATE_REPOSITORY_ID', '/spec/repositories', 'Repository IDs must be unique.'));
  if (!unique(siteIds)) diagnostics.push(issue('DUPLICATE_SITE_ID', '/spec/sites', 'Site IDs must be unique.'));

  for (const [index, repo] of repositories.entries()) {
    const pointer = `/spec/repositories/${index}`;
    if (repo.owner !== 'roctinam') diagnostics.push(issue('UNAPPROVED_REPOSITORY_OWNER', `${pointer}/owner`, 'Repository owner must be roctinam.'));
    if (repo.visibility !== 'private') diagnostics.push(issue('PUBLIC_REPOSITORY_FORBIDDEN', `${pointer}/visibility`, 'Flow domain repositories must be private.'));
    if (!['approved-not-created', 'existing'].includes(repo.state)) diagnostics.push(issue('UNAPPROVED_REPOSITORY', `${pointer}/state`, 'Repository must be approved before bootstrap.'));
    const workflow = fileText(workspaceRoot, repo.workflowTemplate, diagnostics, `${pointer}/workflowTemplate`);
    if (workflow) {
      if (!workflow.includes('actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5')) {
        diagnostics.push(issue('UNPINNED_CHECKOUT', `${pointer}/workflowTemplate`, 'Workflow must pin actions/checkout by full commit.'));
      }
      if (!workflow.includes(repo.build.command) || !workflow.includes(repo.build.outputDirectory)) {
        diagnostics.push(issue('WORKFLOW_BUILD_MISMATCH', `${pointer}/workflowTemplate`, 'Workflow must use the approved build command and output directory.'));
      }
      if (!workflow.includes('rsync -avzn --delete') || !workflow.includes('rsync -avz --delete')) {
        diagnostics.push(issue('MISSING_DEPLOY_PREFLIGHT', `${pointer}/workflowTemplate`, 'Workflow must dry-run rsync before the mutating transfer.'));
      }
    }
  }

  const repositoryById = new Map(repositories.map((repo) => [repo.id, repo]));
  if (!sites.some((site) => site.hostname === spec.canonicalHostname)) {
    diagnostics.push(issue('CANONICAL_SITE_MISSING', '/spec/sites', 'Sites must include the approved canonical hostname.'));
  }
  const isolatedPorts = [];
  for (const [index, site] of sites.entries()) {
    const pointer = `/spec/sites/${index}`;
    const labels = String(site.hostname ?? '').split('.').filter(Boolean);
    if (labels.length > maxLabels) {
      diagnostics.push(issue('FOURTH_LEVEL_DNS_FORBIDDEN', `${pointer}/hostname`, `${site.hostname} exceeds the approved ${maxLabels}-label hostname ceiling.`));
    }
    if (!String(site.hostname ?? '').endsWith(`.${spec.hostnamePolicy?.zone}`)) {
      diagnostics.push(issue('HOSTNAME_OUTSIDE_ZONE', `${pointer}/hostname`, `Hostname must be inside ${spec.hostnamePolicy?.zone}.`));
    }
    if (!repositoryById.has(site.repository)) diagnostics.push(issue('UNKNOWN_REPOSITORY', `${pointer}/repository`, `Unknown repository ID: ${site.repository}`));
    if (site.dns?.hostname !== site.hostname || site.tunnel?.hostname !== site.hostname) {
      diagnostics.push(issue('ROUTE_HOSTNAME_MISMATCH', pointer, 'Site, DNS, and tunnel hostnames must match exactly.'));
    }
    const expectedOrigin = originFor(site.deployment);
    if (site.tunnel?.origin !== expectedOrigin) {
      diagnostics.push(issue('TUNNEL_ORIGIN_MISMATCH', `${pointer}/tunnel/origin`, `Expected ${expectedOrigin}.`));
    }

    const caddy = fileText(workspaceRoot, site.deployment?.caddyTemplate, diagnostics, `${pointer}/deployment/caddyTemplate`);
    const compose = fileText(workspaceRoot, site.deployment?.composeTemplate, diagnostics, `${pointer}/deployment/composeTemplate`);
    if (caddy && (!caddy.includes(site.hostname) || !caddy.includes(site.deployment.containerPath))) {
      diagnostics.push(issue('CADDY_TEMPLATE_MISMATCH', `${pointer}/deployment/caddyTemplate`, 'Caddy template must bind the approved hostname and container path.'));
    }
    if (compose && (!compose.includes(site.deployment.hostPath) || !compose.includes(site.deployment.containerPath))) {
      diagnostics.push(issue('COMPOSE_TEMPLATE_MISMATCH', `${pointer}/deployment/composeTemplate`, 'Compose template must bind the approved host and container paths.'));
    }

    if (site.deployment?.pattern === 'shared-serve-static') {
      if (site.deployment.origin.port !== 80) diagnostics.push(issue('SHARED_ORIGIN_PORT_MISMATCH', `${pointer}/deployment/origin/port`, 'Shared serve-static sites use common HTTP origin port 80.'));
    } else if (site.deployment?.pattern === 'per-site-container') {
      if (site.deployment.origin.host !== '127.0.0.1') diagnostics.push(issue('ISOLATED_ORIGIN_NOT_LOCALHOST', `${pointer}/deployment/origin/host`, 'Per-site containers must bind 127.0.0.1.'));
      isolatedPorts.push(site.deployment.origin.port);
    } else {
      diagnostics.push(issue('UNKNOWN_DEPLOYMENT_PATTERN', `${pointer}/deployment/pattern`, 'Choose shared-serve-static or per-site-container.'));
    }
  }
  if (!unique(isolatedPorts)) diagnostics.push(issue('DUPLICATE_ISOLATED_PORT', '/spec/sites', 'Every per-site container must use a unique localhost origin port.'));

  const registry = spec.isolatedContainerPolicy?.portRegistry ?? [];
  const registryPorts = registry.map((entry) => entry.localhostPort);
  if (!unique(registryPorts)) diagnostics.push(issue('DUPLICATE_PORT_REGISTRY_ENTRY', '/spec/isolatedContainerPolicy/portRegistry', 'Isolated port registry entries must be unique.'));
  for (const [index, entry] of registry.entries()) {
    if (entry.tunnelOrigin !== `http://127.0.0.1:${entry.localhostPort}`) {
      diagnostics.push(issue('PORT_REGISTRY_ROUTE_MISMATCH', `/spec/isolatedContainerPolicy/portRegistry/${index}`, 'Registry port and tunnel origin must match.'));
    }
  }

  const handoff = spec.operatorHandoff ?? {};
  for (const [index, site] of sites.entries()) {
    const dns = (handoff.dnsRoutes ?? []).find((route) => route.hostname === site.hostname);
    const tunnel = (handoff.tunnelRoutes ?? []).find((route) => route.hostname === site.hostname);
    const port = (handoff.originPorts ?? []).find((entry) => entry.hostname === site.hostname);
    if (!dns || JSON.stringify(dns) !== JSON.stringify(site.dns)) diagnostics.push(issue('MISSING_EXACT_DNS_HANDOFF', `/spec/sites/${index}/dns`, 'Operator handoff must repeat the exact approved DNS route.'));
    if (!tunnel || JSON.stringify(tunnel) !== JSON.stringify(site.tunnel)) diagnostics.push(issue('MISSING_EXACT_TUNNEL_HANDOFF', `/spec/sites/${index}/tunnel`, 'Operator handoff must repeat the exact approved tunnel route.'));
    if (!port || port.port !== site.deployment.origin.port) diagnostics.push(issue('MISSING_EXACT_PORT_HANDOFF', `/spec/sites/${index}/deployment/origin/port`, 'Operator handoff must list the exact origin port.'));
  }

  const requiredSecrets = spec.configuration?.requiredSecretNames ?? [];
  const optionalPurge = spec.configuration?.optionalCachePurgeSecretNames ?? [];
  if (!requiredSecrets.includes('DEPLOY_SSH_KEY')) diagnostics.push(issue('MISSING_DEPLOY_KEY_INTERFACE', '/spec/configuration/requiredSecretNames', 'DEPLOY_SSH_KEY must be documented by name.'));
  for (const name of ['CF_ZONE_ID', 'CF_CACHE_PURGE']) {
    if (!optionalPurge.includes(name)) diagnostics.push(issue('MISSING_CACHE_PURGE_INTERFACE', '/spec/configuration/optionalCachePurgeSecretNames', `${name} must be documented when cache purge is enabled.`));
  }
  if (spec.configuration?.secretValuesNeverStored !== true) diagnostics.push(issue('SECRET_VALUE_POLICY_REQUIRED', '/spec/configuration/secretValuesNeverStored', 'Plans may contain interface names, never protected values.'));

  return { valid: diagnostics.length === 0, diagnostics };
}

export function formatValidation(result) {
  if (result.valid) return 'Flow domain static deployment plan is valid.';
  return result.diagnostics.map((entry) => `${entry.code} ${entry.path}: ${entry.message}`).join('\n');
}

async function main(argv) {
  const planPath = argv[0];
  if (!planPath || argv.includes('--help') || argv.includes('-h')) {
    console.log('Usage: node tools/deploy/validate-flow-domain-static-site-plan.mjs <plan.json>');
    return planPath ? 0 : 2;
  }
  try {
    const plan = JSON.parse(fs.readFileSync(path.resolve(planPath), 'utf8'));
    const result = validateFlowDomainStaticSitePlan(plan);
    console.log(formatValidation(result));
    return result.valid ? 0 : 1;
  } catch (error) {
    console.error(`PLAN_VALIDATION_FAILED: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  process.exitCode = await main(process.argv.slice(2));
}
