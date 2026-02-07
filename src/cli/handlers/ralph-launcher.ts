/**
 * Ralph External Process Launcher
 *
 * Spawns the external Ralph supervisor as a detached background process
 * that survives terminal closure and can be managed across sessions.
 *
 * @implements @.aiwg/working/issue-ralph-external-completion.md
 * @issue #275
 * @security docs/ralph-external-security.md
 *
 * SECURITY WARNING
 * ================
 * This module launches Claude Code sessions with --dangerously-skip-permissions.
 * Spawned sessions can read/write ANY file and execute ANY command without
 * user confirmation. Sessions run as detached daemons for extended periods
 * without human oversight.
 *
 * BEFORE USING:
 * - Read docs/ralph-external-security.md
 * - Understand all security implications
 * - Set appropriate limits (budget, iterations, timeout)
 * - Ensure clean git state for rollback capability
 * - Have monitoring and abort procedures ready
 */

import { spawn, ChildProcess } from 'child_process';
import { join } from 'path';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';

/**
 * Options for launching an external Ralph loop
 */
export interface RalphLaunchOptions {
  objective: string;
  completionCriteria: string;
  maxIterations?: number;
  model?: string;
  budget?: number;
  timeout?: number;
  mcpConfig?: string;
  giteaIssue?: boolean;
  memory?: number | string;
  crossTask?: boolean;
  enableAnalytics?: boolean;
  enableBestOutput?: boolean;
  enableEarlyStopping?: boolean;
  loopId?: string;
  force?: boolean;
  provider?: string;
}

/**
 * Result from launching a Ralph loop
 */
export interface RalphLaunchResult {
  success: boolean;
  loopId: string;
  pid: number;
  message: string;
  registryPath: string;
}

/**
 * Registry entry for a running loop
 */
export interface LoopRegistryEntry {
  loopId: string;
  pid: number;
  objective: string;
  completionCriteria: string;
  status: 'running' | 'completed' | 'failed' | 'aborted';
  startedAt: string;
  lastUpdate: string;
  iteration: number;
  maxIterations: number;
  outputFile: string;
  provider?: string;
}

/**
 * Get the path to the external Ralph orchestrator
 */
export function getOrchestratorPath(frameworkRoot: string): string {
  return join(frameworkRoot, 'tools', 'ralph-external', 'index.mjs');
}

/**
 * Get the registry directory path
 */
export function getRegistryDir(projectRoot: string): string {
  return join(projectRoot, '.aiwg', 'ralph-external');
}

/**
 * Get the registry file path
 */
export function getRegistryPath(projectRoot: string): string {
  return join(getRegistryDir(projectRoot), 'registry.json');
}

/**
 * Generate a unique loop ID
 */
export function generateLoopId(objective: string): string {
  const slug = objective
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30);
  const shortId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  return `ralph-${slug}-${shortId}`;
}

/**
 * Build command-line arguments for the external Ralph process
 */
export function buildArgs(options: RalphLaunchOptions): string[] {
  const args: string[] = [options.objective];

  args.push('--completion', options.completionCriteria);

  if (options.maxIterations) {
    args.push('--max-iterations', String(options.maxIterations));
  }
  if (options.model) {
    args.push('--model', options.model);
  }
  if (options.budget) {
    args.push('--budget', String(options.budget));
  }
  if (options.timeout) {
    args.push('--timeout', String(options.timeout));
  }
  if (options.mcpConfig) {
    args.push('--mcp-config', options.mcpConfig);
  }
  if (options.giteaIssue) {
    args.push('--gitea-issue');
  }
  if (options.memory !== undefined) {
    args.push('--memory', String(options.memory));
  }
  if (options.crossTask === false) {
    args.push('--no-cross-task');
  }
  if (options.enableAnalytics === false) {
    args.push('--no-analytics');
  }
  if (options.enableBestOutput === false) {
    args.push('--no-best-output');
  }
  if (options.enableEarlyStopping === false) {
    args.push('--no-early-stopping');
  }
  if (options.provider && options.provider !== 'claude') {
    args.push('--provider', options.provider);
  }

  return args;
}

/**
 * Launch the external Ralph process as a detached daemon
 */
export async function launchExternalRalph(
  frameworkRoot: string,
  projectRoot: string,
  options: RalphLaunchOptions
): Promise<RalphLaunchResult> {
  const orchestratorPath = getOrchestratorPath(frameworkRoot);

  if (!existsSync(orchestratorPath)) {
    throw new Error(`External Ralph orchestrator not found at: ${orchestratorPath}`);
  }

  const registryDir = getRegistryDir(projectRoot);
  mkdirSync(registryDir, { recursive: true });

  const loopId = options.loopId || generateLoopId(options.objective);
  const loopDir = join(registryDir, 'loops', loopId);
  mkdirSync(loopDir, { recursive: true });

  // Create output file for the detached process
  const outputFile = join(loopDir, 'daemon-output.log');

  // Build arguments
  const args = buildArgs(options);

  // Create output file descriptors
  const { openSync, closeSync } = await import('fs');
  const outFd = openSync(outputFile, 'w');

  // Spawn detached process
  const child: ChildProcess = spawn('node', [orchestratorPath, ...args], {
    detached: true,
    stdio: ['ignore', outFd, outFd],
    cwd: projectRoot,
    env: {
      ...process.env,
      RALPH_LOOP_ID: loopId,
      RALPH_DETACHED: 'true',
      ...(options.provider ? { RALPH_PROVIDER: options.provider } : {}),
    },
  });

  // Detach from parent - let it run independently
  child.unref();
  closeSync(outFd);

  const pid = child.pid;
  if (!pid) {
    throw new Error('Failed to start external Ralph process - no PID');
  }

  // Record the loop in our launcher registry (backup to the external-multi-loop-state-manager)
  const launcherRegistry = loadLauncherRegistry(projectRoot);
  launcherRegistry.loops[loopId] = {
    loopId,
    pid,
    objective: options.objective,
    completionCriteria: options.completionCriteria,
    status: 'running',
    startedAt: new Date().toISOString(),
    lastUpdate: new Date().toISOString(),
    iteration: 0,
    maxIterations: options.maxIterations || 5,
    outputFile,
    provider: options.provider,
  };
  saveLauncherRegistry(projectRoot, launcherRegistry);

  return {
    success: true,
    loopId,
    pid,
    message: `Ralph loop started (${loopId}). Check status: aiwg ralph-status`,
    registryPath: getRegistryPath(projectRoot),
  };
}

/**
 * Launcher's own registry (supplement to external-multi-loop-state-manager)
 */
export interface LauncherRegistry {
  version: string;
  loops: Record<string, LoopRegistryEntry>;
  updatedAt: string;
}

/**
 * Load the launcher registry
 */
export function loadLauncherRegistry(projectRoot: string): LauncherRegistry {
  const registryPath = join(getRegistryDir(projectRoot), 'launcher-registry.json');

  if (!existsSync(registryPath)) {
    return {
      version: '1.0.0',
      loops: {},
      updatedAt: new Date().toISOString(),
    };
  }

  try {
    return JSON.parse(readFileSync(registryPath, 'utf8'));
  } catch {
    return {
      version: '1.0.0',
      loops: {},
      updatedAt: new Date().toISOString(),
    };
  }
}

/**
 * Save the launcher registry
 */
export function saveLauncherRegistry(projectRoot: string, registry: LauncherRegistry): void {
  const registryDir = getRegistryDir(projectRoot);
  mkdirSync(registryDir, { recursive: true });

  const registryPath = join(registryDir, 'launcher-registry.json');
  registry.updatedAt = new Date().toISOString();
  writeFileSync(registryPath, JSON.stringify(registry, null, 2));
}

/**
 * Check if a process is still running
 */
export function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get status of all Ralph loops
 */
export function getLoopStatuses(projectRoot: string): LoopRegistryEntry[] {
  const registry = loadLauncherRegistry(projectRoot);
  const statuses: LoopRegistryEntry[] = [];

  for (const [loopId, entry] of Object.entries(registry.loops)) {
    // Update status based on process liveness
    if (entry.status === 'running' && !isProcessAlive(entry.pid)) {
      // Process died - mark as failed unless we can determine it completed
      const stateFile = join(getRegistryDir(projectRoot), 'loops', loopId, 'session-state.json');
      if (existsSync(stateFile)) {
        try {
          const state = JSON.parse(readFileSync(stateFile, 'utf8'));
          entry.status = state.status || 'failed';
          entry.iteration = state.currentIteration || entry.iteration;
        } catch {
          entry.status = 'failed';
        }
      } else {
        entry.status = 'failed';
      }
    }
    statuses.push(entry);
  }

  return statuses;
}

/**
 * Abort a running Ralph loop by killing its process
 */
export function abortLoop(projectRoot: string, loopId?: string): { success: boolean; message: string } {
  const registry = loadLauncherRegistry(projectRoot);

  // If no loopId specified, find the most recent running loop
  if (!loopId) {
    const runningLoops = Object.values(registry.loops)
      .filter((l) => l.status === 'running' && isProcessAlive(l.pid))
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

    if (runningLoops.length === 0) {
      return { success: false, message: 'No running Ralph loops found' };
    }
    loopId = runningLoops[0].loopId;
  }

  const entry = registry.loops[loopId];
  if (!entry) {
    return { success: false, message: `Loop not found: ${loopId}` };
  }

  if (!isProcessAlive(entry.pid)) {
    entry.status = 'aborted';
    saveLauncherRegistry(projectRoot, registry);
    return { success: true, message: `Loop ${loopId} was already stopped` };
  }

  try {
    process.kill(entry.pid, 'SIGTERM');
    entry.status = 'aborted';
    entry.lastUpdate = new Date().toISOString();
    saveLauncherRegistry(projectRoot, registry);
    return { success: true, message: `Aborted loop ${loopId} (PID: ${entry.pid})` };
  } catch (error) {
    return {
      success: false,
      message: `Failed to kill process ${entry.pid}: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Resume an interrupted Ralph loop
 */
export async function resumeLoop(
  frameworkRoot: string,
  projectRoot: string,
  loopId?: string,
  overrides?: { maxIterations?: number }
): Promise<RalphLaunchResult> {
  const orchestratorPath = getOrchestratorPath(frameworkRoot);

  if (!existsSync(orchestratorPath)) {
    throw new Error(`External Ralph orchestrator not found at: ${orchestratorPath}`);
  }

  // Build resume arguments
  const args = ['--resume'];
  if (overrides?.maxIterations) {
    args.push('--max-iterations', String(overrides.maxIterations));
  }

  const registryDir = getRegistryDir(projectRoot);
  mkdirSync(registryDir, { recursive: true });

  // Find loop to resume
  const registry = loadLauncherRegistry(projectRoot);
  let targetLoopId = loopId;

  if (!targetLoopId) {
    // Find most recent non-running loop
    const resumable = Object.values(registry.loops)
      .filter((l) => l.status !== 'running' || !isProcessAlive(l.pid))
      .sort((a, b) => new Date(b.lastUpdate).getTime() - new Date(a.lastUpdate).getTime());

    if (resumable.length === 0) {
      throw new Error('No loops available to resume');
    }
    targetLoopId = resumable[0].loopId;
  }

  const entry = registry.loops[targetLoopId];
  if (!entry) {
    throw new Error(`Loop not found: ${targetLoopId}`);
  }

  const loopDir = join(registryDir, 'loops', targetLoopId);
  const outputFile = join(loopDir, 'daemon-output.log');

  // Create output file descriptor
  const { openSync, closeSync } = await import('fs');
  const outFd = openSync(outputFile, 'a'); // Append mode for resume

  // Spawn detached process
  const child: ChildProcess = spawn('node', [orchestratorPath, ...args], {
    detached: true,
    stdio: ['ignore', outFd, outFd],
    cwd: projectRoot,
    env: {
      ...process.env,
      RALPH_LOOP_ID: targetLoopId,
      RALPH_DETACHED: 'true',
    },
  });

  child.unref();
  closeSync(outFd);

  const pid = child.pid;
  if (!pid) {
    throw new Error('Failed to start external Ralph process - no PID');
  }

  // Update registry
  entry.pid = pid;
  entry.status = 'running';
  entry.lastUpdate = new Date().toISOString();
  if (overrides?.maxIterations) {
    entry.maxIterations = overrides.maxIterations;
  }
  saveLauncherRegistry(projectRoot, registry);

  return {
    success: true,
    loopId: targetLoopId,
    pid,
    message: `Resumed Ralph loop (${targetLoopId}). Check status: aiwg ralph-status`,
    registryPath: getRegistryPath(projectRoot),
  };
}

/**
 * Clean up completed/failed loops from registry
 */
export function cleanupRegistry(projectRoot: string, keepDays: number = 7): number {
  const registry = loadLauncherRegistry(projectRoot);
  const cutoff = Date.now() - keepDays * 24 * 60 * 60 * 1000;
  let cleaned = 0;

  for (const [loopId, entry] of Object.entries(registry.loops)) {
    if (entry.status !== 'running') {
      const lastUpdate = new Date(entry.lastUpdate).getTime();
      if (lastUpdate < cutoff) {
        delete registry.loops[loopId];
        cleaned++;
      }
    }
  }

  if (cleaned > 0) {
    saveLauncherRegistry(projectRoot, registry);
  }

  return cleaned;
}
