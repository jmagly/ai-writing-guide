import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

import { loadGraphIndexFile } from '../../artifacts/index-reader.js';
import type { ArtifactIndex } from '../../artifacts/types.js';
import { readAiwgConfig, type DeployedArtifactCounts } from '../../config/aiwg-config.js';
import { readUserRegistry } from '../../config/user-registry.js';
import {
  getProviderDefinition,
  normalizeProviderDefinitionId,
  resolveProviderPathValue,
} from '../../providers/provider-definitions.js';
import {
  diagnoseWorkspaceContext,
  providerContextContract,
} from '../../smiths/context-pipeline/workspace-context.js';
import { USER_SCOPE_PATHS } from '../scope-resolver.js';

export type DeploymentScope = 'project' | 'user';
export type DeploymentOutcome =
  | 'planned'
  | 'ready'
  | 'ready-restart-required'
  | 'degraded'
  | 'failed';
export type DeploymentExitClassification = 'preview' | 'success' | 'degraded' | 'failure';
export type DeploymentPhaseState = 'planned' | 'passed' | 'skipped' | 'failed';
export type DeploymentFindingSeverity = 'info' | 'advisory' | 'blocking';

export interface DeploymentPhaseResult {
  id: 'resolve' | 'deploy' | 'index' | 'context' | 'verify' | 'report';
  state: DeploymentPhaseState;
  required: boolean;
  summary: string;
  evidence?: Record<string, unknown>;
}

export interface DeploymentVerificationFinding {
  id: string;
  provider: string;
  severity: DeploymentFindingSeverity;
  message: string;
  remediation?: string;
  evidence?: Record<string, unknown>;
}

export interface ProviderDeploymentVerification {
  provider: string;
  scope: DeploymentScope;
  outcome: DeploymentOutcome;
  restartRequired: boolean;
  restartAction: string | null;
  counts: DeployedArtifactCounts & { behaviors: number };
  phases: DeploymentPhaseResult[];
  findings: DeploymentVerificationFinding[];
}

export interface UseDeploymentResult {
  schema: 'aiwg.use.result.v1';
  generatedAt: string;
  projectRoot: string;
  frameworkRoot: string;
  scope: DeploymentScope;
  requestedBundles: string[];
  dryRun: boolean;
  providers: ProviderDeploymentVerification[];
  phases: DeploymentPhaseResult[];
  findings: DeploymentVerificationFinding[];
  outcome: DeploymentOutcome;
  restartRequired: boolean;
  exitClassification: DeploymentExitClassification;
  exitCode: number;
}

export interface VerifyProviderDeploymentOptions {
  projectRoot: string;
  frameworkRoot: string;
  provider: string;
  scope: DeploymentScope;
  requestedBundles: string[];
  contextOptOut?: boolean;
  invocationStartedAt?: string;
  deploymentExitCode?: number;
  deploymentMessage?: string;
}

const RESTART_ACTIONS: Readonly<Record<string, string>> = {
  claude: 'Restart Claude Code so the running session reloads deployed agents and skills.',
  codex: 'Restart or reopen Codex in this workspace so it reloads deployed agents and skills.',
  copilot: 'Reload the VS Code window so Copilot reloads workspace agents and instructions.',
  cursor: 'Reload the Cursor workspace so it reloads agents and rules.',
  factory: 'Restart the Factory droid runtime so it reloads deployed droids.',
  opencode: 'Restart the OpenCode session so it reloads deployed agents.',
  openclaw: 'Restart OpenClaw so it reloads its home-directory registry.',
  warp: 'Open a fresh Warp tab so it reloads project context.',
  windsurf: 'Reload the Windsurf workspace so it reparses project context.',
};

const BUNDLE_INDEX_TOKENS: Readonly<Record<string, string[]>> = {
  all: [],
  sdlc: ['sdlc-complete'],
  marketing: ['marketing'],
  'media-curator': ['media-curator'],
  research: ['research-complete'],
  forensics: ['forensics-complete'],
  dfir: ['forensics-complete'],
  'security-engineering': ['security-engineering'],
  ops: ['ops-complete'],
  validation: ['validation-complete'],
  'knowledge-base': ['knowledge-base'],
};

function finding(
  provider: string,
  id: string,
  severity: DeploymentFindingSeverity,
  message: string,
  remediation?: string,
  evidence?: Record<string, unknown>,
): DeploymentVerificationFinding {
  return { id, provider, severity, message, remediation, evidence };
}

async function exists(candidate: string): Promise<boolean> {
  if (!candidate) return false;
  return access(candidate).then(() => true).catch(() => false);
}

async function countEntries(candidate: string): Promise<number> {
  if (!candidate) return 0;
  try {
    return (await readdir(candidate, { withFileTypes: true }))
      .filter((entry) => !entry.name.startsWith('.'))
      .length;
  } catch {
    return 0;
  }
}

function emptyCounts(): DeployedArtifactCounts & { behaviors: number } {
  return { agents: 0, commands: 0, skills: 0, rules: 0, behaviors: 0 };
}

function phase(
  id: DeploymentPhaseResult['id'],
  state: DeploymentPhaseState,
  required: boolean,
  summary: string,
  evidence?: Record<string, unknown>,
): DeploymentPhaseResult {
  return { id, state, required, summary, evidence };
}

function classifyOutcome(
  findings: DeploymentVerificationFinding[],
  restartRequired: boolean,
): Exclude<DeploymentOutcome, 'planned'> {
  if (findings.some((item) => item.severity === 'blocking')) return 'failed';
  if (findings.some((item) => item.severity === 'advisory')) return 'degraded';
  return restartRequired ? 'ready-restart-required' : 'ready';
}

function indexContainsRequestedBundles(index: ArtifactIndex, requestedBundles: string[]): boolean {
  if (requestedBundles.includes('all')) return Object.keys(index.entries).length > 0;
  const entryPaths = Object.keys(index.entries);
  return requestedBundles.every((bundle) => {
    const tokens = BUNDLE_INDEX_TOKENS[bundle] ?? [bundle];
    return tokens.some((token) => entryPaths.some((entryPath) => entryPath.includes(token)));
  });
}

async function readManagedMarker(candidate: string): Promise<boolean> {
  try {
    return (await readFile(candidate, 'utf8')).includes('<!-- aiwg-managed -->');
  } catch {
    return false;
  }
}

async function collectRegistryFindings(
  options: VerifyProviderDeploymentOptions,
  provider: string,
  actualCounts: DeployedArtifactCounts & { behaviors: number },
): Promise<DeploymentVerificationFinding[]> {
  const findings: DeploymentVerificationFinding[] = [];
  const projectConfig = await readAiwgConfig(options.projectRoot);
  const useUserRegistry = options.scope === 'user' && provider !== 'openhuman';
  const userRegistry = useUserRegistry ? await readUserRegistry() : null;

  for (const bundle of options.requestedBundles) {
    const projectRecord = projectConfig?.installed[bundle]?.deployedTo[provider];
    const userRecord = userRegistry?.installed[bundle]?.deployedTo[provider];
    const record = useUserRegistry ? userRecord : projectRecord;
    if (!record) {
      findings.push(finding(
        provider,
        `registry-missing:${bundle}`,
        'blocking',
        `Installed-state record is missing for '${bundle}' on ${provider} at ${options.scope} scope.`,
        `Re-run aiwg use ${bundle} --provider ${provider}${options.scope === 'user' ? ' --scope user' : ''}.`,
      ));
      continue;
    }

    const comparedTypes = ['agents', 'commands', 'skills', 'rules'] as const;
    for (const type of comparedTypes) {
      const recorded = Number(record[type] ?? 0);
      if (!Number.isSafeInteger(recorded) || recorded < 0) {
        findings.push(finding(
          provider,
          `registry-count-invalid:${bundle}:${type}`,
          'blocking',
          `Installed-state count for '${bundle}' ${type} is invalid: ${String(record[type])}.`,
          `Re-run aiwg use ${bundle} --provider ${provider} to repair the managed deployment.`,
          { bundle, type, recorded: record[type] },
        ));
      }
    }

    const recordedTotal = comparedTypes.reduce((sum, type) => sum + Number(record[type] ?? 0), 0);
    const actualTotal = Object.values(actualCounts).reduce((sum, count) => sum + count, 0);
    if (recordedTotal > 0 && actualTotal === 0) {
      findings.push(finding(
        provider,
        `registry-artifacts-missing:${bundle}`,
        'blocking',
        `Installed state records artifacts for '${bundle}', but no managed artifacts were found for ${provider}.`,
        `Re-run aiwg use ${bundle} --provider ${provider} to repair the managed deployment.`,
        { bundle, recordedTotal, actualTotal },
      ));
    }

    if (useUserRegistry && !projectRecord) {
      findings.push(finding(
        provider,
        `project-registry-missing:${bundle}`,
        'advisory',
        `Project registry does not describe the additive user-scope deployment for '${bundle}'.`,
        'Run aiwg status --probe --json from the originating project to inspect both registries.',
      ));
    }
  }
  return findings;
}

export async function verifyProviderDeployment(
  options: VerifyProviderDeploymentOptions,
): Promise<ProviderDeploymentVerification> {
  const normalized = normalizeProviderDefinitionId(options.provider) ?? options.provider;
  const definition = getProviderDefinition(normalized);
  const findings: DeploymentVerificationFinding[] = [];
  const counts = emptyCounts();
  const restartAction = RESTART_ACTIONS[normalized] ?? null;
  const restartRequired = restartAction !== null;

  if (!definition) {
    findings.push(finding(
      normalized,
      'provider-unknown',
      'blocking',
      `No provider definition is available for '${options.provider}'.`,
      'Choose a supported provider or repair the project-local provider adapter.',
    ));
  }

  if ((options.deploymentExitCode ?? 0) !== 0) {
    findings.push(finding(
      normalized,
      'deployment-command-failed',
      'blocking',
      options.deploymentMessage || `Deployment exited with code ${options.deploymentExitCode}.`,
      'Review the deployment error, correct it, and re-run the same aiwg use command.',
      { exitCode: options.deploymentExitCode },
    ));
  }

  if (!(await exists(options.projectRoot))) {
    findings.push(finding(
      normalized,
      'project-root-missing',
      'blocking',
      `Resolved project root does not exist: ${options.projectRoot}`,
      'Select an existing project root and run aiwg use again.',
    ));
  }

  if (definition) {
    const artifactPaths = options.scope === 'user'
      ? USER_SCOPE_PATHS[normalized] ?? definition.paths.artifacts
      : definition.paths.artifacts;
    for (const type of ['agents', 'commands', 'skills', 'rules', 'behaviors'] as const) {
      const resolved = resolveProviderPathValue(artifactPaths[type], options.projectRoot);
      counts[type] = await countEntries(resolved);
    }
    const resolvedSkillsPath = resolveProviderPathValue(artifactPaths.skills, options.projectRoot);
    const kernelPath = options.scope === 'user'
      ? ''
      : resolveProviderPathValue(definition.paths.kernelSkills, options.projectRoot);
    const kernelCount = await countEntries(kernelPath);
    if (kernelPath && kernelPath !== resolvedSkillsPath) counts.skills += kernelCount;
    const artifactTotal = Object.values(counts).reduce((sum, value) => sum + value, 0);
    if (artifactTotal === 0) {
      findings.push(finding(
        normalized,
        'provider-artifacts-missing',
        'blocking',
        `No deployed provider or kernel artifacts were found for ${normalized}.`,
        `Re-run aiwg use ${options.requestedBundles[0] ?? 'all'} --provider ${normalized}.`,
        { kernelPath, kernelCount, counts },
      ));
    }
  }

  findings.push(...await collectRegistryFindings(options, normalized, counts));

  const projectConfig = await readAiwgConfig(options.projectRoot);
  const projectLocalBundles = options.requestedBundles.filter((bundle) =>
    projectConfig?.installed[bundle]?.source === 'project-local');
  const frameworkBundles = options.requestedBundles.filter((bundle) => !projectLocalBundles.includes(bundle));
  const indexesToVerify: Array<{ index: ArtifactIndex | null; graph: 'framework' | 'project' | 'user'; bundles: string[] }> = [];
  if (frameworkBundles.length > 0) {
    indexesToVerify.push({
      index: loadGraphIndexFile<ArtifactIndex>(options.frameworkRoot, 'metadata.json', 'framework'),
      graph: 'framework',
      bundles: frameworkBundles,
    });
  }
  if (projectLocalBundles.length > 0) {
    const graph = options.scope === 'user' ? 'user' : 'project';
    indexesToVerify.push({
      index: loadGraphIndexFile<ArtifactIndex>(options.projectRoot, 'metadata.json', graph),
      graph,
      bundles: projectLocalBundles,
    });
  }

  for (const { index, graph, bundles } of indexesToVerify) {
    if (!index || !index.entries || Object.keys(index.entries).length === 0) {
      findings.push(finding(
        normalized,
        `index-unreadable:${graph}`,
        'blocking',
        `The ${graph} capability index is missing, unreadable, or empty.`,
        `Run aiwg index build --graph ${graph}, then re-run the same aiwg use command.`,
      ));
      continue;
    }

    const entryPaths = Object.keys(index.entries);
    const surfacePresent = graph === 'framework'
      ? indexContainsRequestedBundles(index, bundles)
      : bundles.every((bundle) => entryPaths.some((entryPath) => entryPath.includes(bundle)));
    if (!surfacePresent) {
      findings.push(finding(
        normalized,
        `index-surface-missing:${graph}`,
        'blocking',
        `The ${graph} capability index does not contain the requested bundle surface.`,
        `Rebuild the ${graph} index from the selected AIWG source and re-run aiwg use.`,
        { requestedBundles: bundles, entryCount: entryPaths.length },
      ));
    }
    if (options.invocationStartedAt) {
      const builtAt = Date.parse(index.builtAt);
      const startedAt = Date.parse(options.invocationStartedAt);
      if (!Number.isFinite(builtAt) || builtAt + 2_000 < startedAt) {
        findings.push(finding(
          normalized,
          `index-stale:${graph}`,
          'blocking',
          `The ${graph} capability index was not refreshed during this deployment.`,
          `Re-run aiwg use after correcting the ${graph} index build failure.`,
          { graph, builtAt: index.builtAt, invocationStartedAt: options.invocationStartedAt },
        ));
      }
    }
  }

  if (options.contextOptOut) {
    findings.push(finding(
      normalized,
      'context-opt-out',
      'advisory',
      'Canonical context verification was intentionally skipped by an explicit context opt-out.',
      'Run aiwg regenerate when canonical project context is desired.',
    ));
  } else {
    const contextContract = providerContextContract(normalized);
    const providerContextUnsupported = contextContract?.loadMode === 'unsupported';
    if (providerContextUnsupported) {
      findings.push(finding(
        normalized,
        'context-provider-unsupported',
        'advisory',
        `${normalized} has no verified project-local automatic context loader; canonical context remains available for audit and explicit use.`,
        'Use the provider home-scope adapter and inspect WORKSPACE.md explicitly when project context is needed.',
      ));
    }
    const requiredContext = [
      path.join(options.projectRoot, 'WORKSPACE.md'),
      path.join(options.projectRoot, 'AIWG.md'),
      path.join(options.projectRoot, '.aiwg', 'AIWG.md'),
    ];
    for (const contextPath of requiredContext) {
      if (!(await exists(contextPath))) {
        findings.push(finding(
          normalized,
          `context-missing:${path.relative(options.projectRoot, contextPath)}`,
          providerContextUnsupported ? 'advisory' : 'blocking',
          `Required canonical context file is missing: ${path.relative(options.projectRoot, contextPath)}`,
          'Re-run aiwg regenerate or the same aiwg use command.',
        ));
      }
    }
    const managedContextCount = (await Promise.all(requiredContext.map(readManagedMarker)))
      .filter(Boolean).length;
    if (managedContextCount === 0) {
      findings.push(finding(
        normalized,
        'context-unmanaged',
        'advisory',
        'Canonical context exists but no managed marker was detected; operator-owned content was preserved.',
        'Review the context graph and adopt managed markers only when appropriate.',
      ));
    }

    const diagnostics = await diagnoseWorkspaceContext(options.projectRoot);
    for (const diagnostic of diagnostics) {
      if (diagnostic.severity === 'info') continue;
      findings.push(finding(
        normalized,
        `context-diagnostic:${diagnostic.code}`,
        diagnostic.severity === 'error' ? 'blocking' : 'advisory',
        diagnostic.message,
        diagnostic.severity === 'error'
          ? 'Run aiwg regenerate after correcting the reported context graph problem.'
          : 'Review the context advisory; operator-owned files are never overwritten implicitly.',
        diagnostic.path ? { path: diagnostic.path } : undefined,
      ));
    }
  }

  const outcome = classifyOutcome(findings, restartRequired);
  const indexFailed = findings.some((item) => item.id.startsWith('index-'));
  const contextFailed = findings.some((item) => item.id.startsWith('context-') && item.severity === 'blocking');
  const deployFailed = findings.some((item) =>
    item.severity === 'blocking'
      && (item.id.startsWith('deployment-') || item.id.startsWith('provider-') || item.id.startsWith('registry-'))
  );
  const phases: DeploymentPhaseResult[] = [
    phase('resolve', 'passed', true, `Resolved ${options.projectRoot}, ${normalized}, ${options.scope} scope.`),
    phase('deploy', deployFailed ? 'failed' : 'passed', true, deployFailed ? 'Deployment invariants failed.' : 'Provider artifacts and installed state verified.', { counts }),
    phase('index', indexFailed ? 'failed' : 'passed', true, indexFailed ? 'Capability index verification failed.' : 'Capability index is readable, current, and contains the requested surface.'),
    phase('context', options.contextOptOut ? 'skipped' : contextFailed ? 'failed' : 'passed', !options.contextOptOut, options.contextOptOut ? 'Context generation was explicitly suppressed.' : contextFailed ? 'Canonical context verification failed.' : 'Canonical context and provider wiring verified.'),
    phase('verify', outcome === 'failed' ? 'failed' : 'passed', true, `${findings.filter((item) => item.severity === 'blocking').length} blocking and ${findings.filter((item) => item.severity === 'advisory').length} advisory finding(s).`),
    phase('report', 'passed', true, `Final provider outcome: ${outcome}.`),
  ];

  return {
    provider: normalized,
    scope: options.scope,
    outcome,
    restartRequired,
    restartAction,
    counts,
    phases,
    findings,
  };
}

export function buildDryRunUseResult(options: {
  projectRoot: string;
  frameworkRoot: string;
  providers: string[];
  scope: DeploymentScope;
  requestedBundles: string[];
  contextOptOut?: boolean;
}): UseDeploymentResult {
  const providers = options.providers.map((provider) => {
    const normalized = normalizeProviderDefinitionId(provider) ?? provider;
    const restartAction = RESTART_ACTIONS[normalized] ?? null;
    const phases: DeploymentPhaseResult[] = [
      phase('resolve', 'planned', true, `Would resolve ${options.projectRoot}, ${normalized}, ${options.scope} scope.`),
      phase('deploy', 'planned', true, 'Would deploy the requested managed artifact surface.'),
      phase('index', 'planned', true, 'Would refresh and verify the framework capability index.'),
      phase('context', options.contextOptOut ? 'skipped' : 'planned', !options.contextOptOut, options.contextOptOut ? 'Context generation explicitly suppressed.' : 'Would generate and verify canonical context and provider wiring.'),
      phase('verify', 'planned', true, 'Would run scoped deployment verification.'),
      phase('report', 'planned', true, 'Would report a stable final outcome.'),
    ];
    return {
      provider: normalized,
      scope: options.scope,
      outcome: 'planned' as const,
      restartRequired: restartAction !== null,
      restartAction,
      counts: emptyCounts(),
      phases,
      findings: [],
    };
  });
  return {
    schema: 'aiwg.use.result.v1',
    generatedAt: new Date().toISOString(),
    projectRoot: path.resolve(options.projectRoot),
    frameworkRoot: path.resolve(options.frameworkRoot),
    scope: options.scope,
    requestedBundles: options.requestedBundles,
    dryRun: true,
    providers,
    phases: providers[0]?.phases ?? [],
    findings: [],
    outcome: 'planned',
    restartRequired: providers.some((provider) => provider.restartRequired),
    exitClassification: 'preview',
    exitCode: 0,
  };
}

export function aggregateUseDeploymentResult(options: {
  projectRoot: string;
  frameworkRoot: string;
  scope: DeploymentScope;
  requestedBundles: string[];
  providers: ProviderDeploymentVerification[];
}): UseDeploymentResult {
  const findings = options.providers.flatMap((provider) => provider.findings);
  const hasFailed = options.providers.some((provider) => provider.outcome === 'failed');
  const hasDegraded = options.providers.some((provider) => provider.outcome === 'degraded');
  const restartRequired = options.providers.some((provider) => provider.restartRequired);
  const outcome: DeploymentOutcome = hasFailed
    ? 'failed'
    : hasDegraded
      ? 'degraded'
      : restartRequired
        ? 'ready-restart-required'
        : 'ready';
  const phaseIds: DeploymentPhaseResult['id'][] = ['resolve', 'deploy', 'index', 'context', 'verify', 'report'];
  const phases = phaseIds.map((id) => {
    const matching = options.providers.map((provider) => provider.phases.find((item) => item.id === id)).filter((item): item is DeploymentPhaseResult => Boolean(item));
    const state: DeploymentPhaseState = matching.some((item) => item.state === 'failed')
      ? 'failed'
      : matching.every((item) => item.state === 'skipped')
        ? 'skipped'
        : 'passed';
    return phase(
      id,
      state,
      matching.some((item) => item.required),
      `${matching.filter((item) => item.state === 'passed').length}/${matching.length} provider result(s) passed.`,
      { providers: matching.map((item, index) => ({ provider: options.providers[index]?.provider, state: item.state })) },
    );
  });
  return {
    schema: 'aiwg.use.result.v1',
    generatedAt: new Date().toISOString(),
    projectRoot: path.resolve(options.projectRoot),
    frameworkRoot: path.resolve(options.frameworkRoot),
    scope: options.scope,
    requestedBundles: options.requestedBundles,
    dryRun: false,
    providers: options.providers,
    phases,
    findings,
    outcome,
    restartRequired,
    exitClassification: hasFailed ? 'failure' : hasDegraded ? 'degraded' : 'success',
    exitCode: hasFailed ? 1 : 0,
  };
}

export async function verifyConfiguredDeployments(
  projectRoot: string,
  filters: { provider?: string; bundle?: string; scope?: DeploymentScope } = {},
  frameworkRoot = process.env.AIWG_ROOT || projectRoot,
): Promise<UseDeploymentResult> {
  const config = await readAiwgConfig(projectRoot);
  const providers = filters.provider
    ? [filters.provider]
    : config?.providers?.length ? config.providers : [];
  const bundles = filters.bundle ? [filters.bundle] : Object.keys(config?.installed ?? {});
  const results: ProviderDeploymentVerification[] = [];
  for (const provider of providers) {
    const providerBundles = bundles.filter((bundle) => Boolean(config?.installed[bundle]?.deployedTo[provider]));
    if (providerBundles.length === 0) continue;
    results.push(await verifyProviderDeployment({
      projectRoot,
      frameworkRoot,
      provider,
      scope: filters.scope ?? 'project',
      requestedBundles: providerBundles,
    }));
  }
  if (results.length === 0) {
    const fallback = providers[0] ?? 'generic';
    results.push({
      provider: fallback,
      scope: filters.scope ?? 'project',
      outcome: 'failed',
      restartRequired: false,
      restartAction: null,
      counts: emptyCounts(),
      phases: [phase('verify', 'failed', true, 'No installed provider deployment could be resolved.')],
      findings: [finding(fallback, 'deployment-not-configured', 'blocking', 'No installed provider deployment could be resolved.', 'Run aiwg use all --provider <provider>.')],
    });
  }
  return aggregateUseDeploymentResult({ projectRoot, frameworkRoot, scope: filters.scope ?? 'project', requestedBundles: bundles, providers: results });
}

export async function buildDeploymentStatusProbe(
  projectRoot: string,
  frameworkRoot = process.env.AIWG_ROOT || projectRoot,
): Promise<Record<string, unknown>> {
  const result = await verifyConfiguredDeployments(projectRoot, {}, frameworkRoot);
  const engaged = result.outcome === 'ready' || result.outcome === 'ready-restart-required' || result.outcome === 'degraded';
  return {
    schema: 'aiwg.status.probe.v1',
    generated_at: result.generatedAt,
    project_root: result.projectRoot,
    engaged,
    status: result.outcome === 'failed' ? 'needs-repair' : result.outcome,
    checks: {
      workspace_exists: await exists(path.join(projectRoot, '.aiwg')),
      framework_count: result.requestedBundles.length,
      provider_deployment_count: result.providers.length,
      health: result.outcome === 'failed' ? 'error' : result.outcome === 'degraded' ? 'warning' : 'healthy',
      malformed_config: result.findings.some((item) => item.id.includes('registry')),
      artifact_health: result.outcome,
      external_artifact_reachable: true,
    },
    verification: {
      required: true,
      action: engaged ? 'AIWG deployment is verified on disk.' : 'Repair the blocking deployment findings, then run this probe again.',
      command: 'aiwg status --probe --json',
      next_command: engaged ? null : 'aiwg doctor --deployment',
    },
    provider_deployments: result.providers,
    deployment_verification: result,
  };
}

export function renderUseDeploymentResult(result: UseDeploymentResult): string {
  if (result.dryRun) {
    const providers = result.providers.map((provider) => provider.provider).join(', ');
    return `Deployment preview: ${result.requestedBundles.join(', ')} for ${providers}\nNo files were changed and no verification pass is claimed.`;
  }

  const lines = [
    '',
    `AIWG deployment outcome: ${result.outcome}`,
    `Project: ${result.projectRoot}`,
    `Scope: ${result.scope}`,
  ];
  for (const provider of result.providers) {
    lines.push(`Provider ${provider.provider}: ${provider.outcome}`);
    for (const item of provider.findings.filter((candidate) => candidate.severity !== 'info')) {
      lines.push(`  ${item.severity === 'blocking' ? 'BLOCKING' : 'ADVISORY'}: ${item.message}`);
      if (item.remediation) lines.push(`    Fix: ${item.remediation}`);
    }
    if (provider.restartRequired && provider.restartAction) {
      lines.push(`  Restart required: ${provider.restartAction}`);
    }
  }
  if (result.outcome === 'ready') lines.push('AIWG is ready for this project.');
  else if (result.outcome === 'ready-restart-required') lines.push('AIWG is verified on disk; reload the provider before expecting the current session to see new assets.');
  else if (result.outcome === 'degraded') lines.push('AIWG core deployment is usable with the advisories shown above.');
  else lines.push('AIWG deployment is not ready; blocking findings must be repaired.');
  return lines.join('\n');
}
