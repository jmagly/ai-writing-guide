import { promises as fs } from 'fs';
import path from 'path';
import { parse as parseYaml } from 'yaml';
import { projectAiwgPath } from '../config/project-artifacts.js';

export const RELEASE_PLAN_DIR = path.join('.aiwg', 'releases');
export const RELEASE_PLAN_EXTENSIONS = new Set(['.json', '.yaml', '.yml']);

export type ReleaseDeliveryMode =
  | 'direct'
  | 'pr'
  | 'pr-required'
  | 'tag-only'
  | 'dispatch-only'
  | 'manual'
  | 'custom';

export interface ReleaseCommand {
  id?: string;
  run: string;
  expect_exit?: number;
  required_for_channels?: string[];
  skip_when_flag?: string;
  depends_on_channel?: Record<string, string>;
}

export interface ReleasePlan {
  version: 1;
  id: string;
  name?: string;
  target: {
    type?: string;
    name: string;
    package?: string;
    site?: string;
    plugin?: string;
    product?: string;
  };
  delivery: {
    mode: ReleaseDeliveryMode;
    overrides_project_default?: boolean;
    notes?: string;
  };
  build?: {
    commands?: ReleaseCommand[];
  };
  validation_gates?: ReleaseCommand[];
  publish_targets?: Array<Record<string, unknown>>;
  artifacts?: Record<string, unknown>;
  signing?: Record<string, unknown>;
  sbom?: Record<string, unknown>;
  provenance?: Record<string, unknown>;
  docs?: Record<string, unknown>;
  post_release_verification?: ReleaseCommand[];
  [key: string]: unknown;
}

export interface DiscoveredReleasePlan {
  path: string;
  plan: ReleasePlan;
}

export interface ReleasePlanSelection {
  activePlan: ReleasePlan;
  activePlanPath: string;
  effectiveDeliveryMode: ReleaseDeliveryMode;
  projectDeliveryMode?: string;
  report: string;
}

export class ReleasePlanError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReleasePlanError';
  }
}

export async function discoverReleasePlans(projectRoot: string): Promise<DiscoveredReleasePlan[]> {
  const releaseDir = projectAiwgPath(projectRoot, 'releases');
  let entries;
  try {
    entries = await fs.readdir(releaseDir, { withFileTypes: true });
  } catch (error: any) {
    if (error?.code === 'ENOENT') return [];
    throw error;
  }

  const candidates = entries
    .filter((entry) => entry.isFile() && RELEASE_PLAN_EXTENSIONS.has(path.extname(entry.name)))
    .map((entry) => path.join(releaseDir, entry.name))
    .sort();

  const plans: DiscoveredReleasePlan[] = [];
  for (const candidate of candidates) {
    const plan = parseReleasePlan(await fs.readFile(candidate, 'utf8'), candidate);
    plans.push({ path: candidate, plan });
  }

  const byId = new Map<string, string[]>();
  for (const { path: planPath, plan } of plans) {
    byId.set(plan.id, [...(byId.get(plan.id) ?? []), planPath]);
  }
  const duplicates = [...byId.entries()].filter(([, paths]) => paths.length > 1);
  if (duplicates.length > 0) {
    const details = duplicates
      .map(([id, paths]) => `${id}: ${paths.map((p) => path.relative(projectRoot, p)).join(', ')}`)
      .join('; ');
    throw new ReleasePlanError(
      `Conflicting release plans: duplicate plan id(s) found (${details}). Give each sidecar a unique id.`,
    );
  }

  return plans;
}

export async function selectReleasePlan(
  projectRoot: string,
  options: { planId?: string; projectDeliveryMode?: string } = {},
): Promise<ReleasePlanSelection> {
  const plans = await discoverReleasePlans(projectRoot);
  if (plans.length === 0) {
    throw new ReleasePlanError(
      `No release plans found. Create ${RELEASE_PLAN_DIR}/<plan-id>.yaml or pass a project without release-plan sidecars.`,
    );
  }

  let selected: DiscoveredReleasePlan | undefined;
  if (options.planId) {
    selected = plans.find(({ plan }) => plan.id === options.planId);
    if (!selected) {
      throw new ReleasePlanError(
        `Release plan '${options.planId}' was not found. Available plans: ${plans.map(({ plan }) => plan.id).join(', ')}.`,
      );
    }
  } else if (plans.length === 1) {
    selected = plans[0];
  } else {
    throw new ReleasePlanError(
      `Multiple release plans are available (${plans.map(({ plan }) => plan.id).join(', ')}). Select one explicitly with --plan <id>.`,
    );
  }

  return {
    activePlan: selected.plan,
    activePlanPath: selected.path,
    effectiveDeliveryMode: selected.plan.delivery.mode,
    projectDeliveryMode: options.projectDeliveryMode,
    report: renderReleasePlanActivation(selected.plan, selected.path, projectRoot, options.projectDeliveryMode),
  };
}

export function parseReleasePlan(content: string, sourcePath = '<memory>'): ReleasePlan {
  let parsed: unknown;
  if (sourcePath.endsWith('.json')) {
    parsed = JSON.parse(content);
  } else {
    parsed = parseYaml(content);
  }
  return validateReleasePlan(parsed, sourcePath);
}

export function validateReleasePlan(value: unknown, sourcePath = '<memory>'): ReleasePlan {
  if (!isRecord(value)) {
    throw new ReleasePlanError(`${sourcePath}: release plan must be an object.`);
  }
  if (value.version !== 1) {
    throw new ReleasePlanError(`${sourcePath}: release plan version must be 1.`);
  }
  if (typeof value.id !== 'string' || !/^[a-z0-9][a-z0-9._-]*$/.test(value.id)) {
    throw new ReleasePlanError(`${sourcePath}: release plan id must be a stable lowercase id.`);
  }
  if (!isRecord(value.target) || typeof value.target.name !== 'string' || value.target.name.trim() === '') {
    throw new ReleasePlanError(`${sourcePath}: release plan target.name is required.`);
  }
  if (!isRecord(value.delivery) || typeof value.delivery.mode !== 'string') {
    throw new ReleasePlanError(`${sourcePath}: release plan delivery.mode is required.`);
  }
  const allowedModes: ReleaseDeliveryMode[] = ['direct', 'pr', 'pr-required', 'tag-only', 'dispatch-only', 'manual', 'custom'];
  if (!allowedModes.includes(value.delivery.mode as ReleaseDeliveryMode)) {
    throw new ReleasePlanError(
      `${sourcePath}: release plan delivery.mode must be one of ${allowedModes.join(', ')}.`,
    );
  }

  validateCommandList(value.build && isRecord(value.build) ? value.build.commands : undefined, `${sourcePath}: build.commands`);
  validateCommandList(value.validation_gates, `${sourcePath}: validation_gates`);
  validateCommandList(value.post_release_verification, `${sourcePath}: post_release_verification`);

  return value as unknown as ReleasePlan;
}

export function buildReleasePlanExecutionFlow(plan: ReleasePlan): ReleaseCommand[] {
  return [
    ...(plan.build?.commands ?? []),
    ...(plan.validation_gates ?? []),
    ...(plan.post_release_verification ?? []),
  ];
}

export function renderReleasePlanActivation(
  plan: ReleasePlan,
  planPath: string,
  projectRoot: string,
  projectDeliveryMode?: string,
): string {
  const relativePath = path.relative(projectRoot, planPath) || planPath;
  const projectMode = projectDeliveryMode ? ` (project default: ${projectDeliveryMode})` : '';
  return [
    `Active release plan: ${plan.id}${plan.name ? ` (${plan.name})` : ''}`,
    `Plan file: ${relativePath}`,
    `Target: ${plan.target.name}`,
    `Delivery mode: ${plan.delivery.mode}${projectMode}`,
  ].join('\n');
}

function validateCommandList(value: unknown, where: string): void {
  if (value === undefined) return;
  if (!Array.isArray(value)) {
    throw new ReleasePlanError(`${where} must be an array.`);
  }
  for (const [index, command] of value.entries()) {
    if (!isRecord(command) || typeof command.run !== 'string' || command.run.trim() === '') {
      throw new ReleasePlanError(`${where}[${index}].run is required.`);
    }
  }
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
