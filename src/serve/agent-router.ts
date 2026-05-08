/**
 * Agent Router
 *
 * Capability-based and load-aware agent routing for task dispatch (#916).
 * Selects the best available agent for a task based on declared filters
 * (framework requirements, inventory, resource thresholds) and real-time
 * metrics (CPU/memory load from #911).
 *
 * Also exposes routeMission() for executor-level routing (#1179).
 */

import type { SandboxAgent } from './sandbox-registry.js';
import type { ExecutorRegistration, ExecutorFilter } from './executor-registry.js';

// ============================================================
// Types
// ============================================================

// ============================================================
// Executor-level routing (#1179)
// ============================================================

export interface ExecutorCandidate {
  executor: ExecutorRegistration;
  matchReason: string;
  rejected: Array<{ executorId: string; reason: string }>;
}

export interface ExecutorRoutingResult {
  selected?: ExecutorCandidate;
  candidates: ExecutorCandidate[];
  filter: ExecutorFilter;
}

/**
 * Select the best executor from the provided list using filter criteria.
 *
 * Default-selection policy (per ADR §3):
 *   1. Sandbox-first: prefer any executor with isolation:vm or isolation:container
 *   2. Local fallback: isolation:none or isolation:host
 *   3. 503 if no executor is connected and matching
 *
 * `long_running: true` requires the 'resumable' capability.
 *
 * Returns an ExecutorRoutingResult with the selected executor and full candidate list.
 */
export function routeMission(
  executors: ExecutorRegistration[],
  filter: ExecutorFilter,
  longRunning = false,
): ExecutorRoutingResult {
  const matched: ExecutorCandidate[] = [];
  const rejected: Array<{ executorId: string; reason: string }> = [];

  // Only consider connected executors
  const connected = executors.filter((e) => e.connected);
  const disconnected = executors.filter((e) => !e.connected);
  for (const e of disconnected) {
    rejected.push({ executorId: e.executorId, reason: 'executor not connected' });
  }

  for (const executor of connected) {
    // Pinned executor_id
    if (filter.executor_id && executor.executorId !== filter.executor_id) {
      rejected.push({ executorId: executor.executorId, reason: `executor_id does not match '${filter.executor_id}'` });
      continue;
    }
    // Long-running requires resumable
    if (longRunning && !executor.capabilities.includes('resumable')) {
      rejected.push({ executorId: executor.executorId, reason: 'long_running requires resumable capability' });
      continue;
    }
    // All requested capabilities must be present
    if (filter.capabilities && filter.capabilities.length > 0) {
      const missing = filter.capabilities.filter((c) => !executor.capabilities.includes(c));
      if (missing.length > 0) {
        rejected.push({ executorId: executor.executorId, reason: `missing capabilities: ${missing.join(', ')}` });
        continue;
      }
    }
    matched.push({
      executor,
      matchReason: 'matches all filter criteria',
      rejected,
    });
  }

  if (matched.length === 0) {
    return { selected: undefined, candidates: [], filter };
  }

  // ADR §3: sandbox-first policy — prefer vm/container isolation
  const sandboxFirst = matched.filter((c) =>
    c.executor.capabilities.some((cap) => cap === 'isolation:vm' || cap === 'isolation:container')
  );

  let selected: ExecutorCandidate;
  if (sandboxFirst.length > 0) {
    selected = { ...sandboxFirst[0]!, matchReason: 'sandbox-first (isolation:vm/container)', rejected };
  } else {
    selected = { ...matched[0]!, matchReason: 'local fallback (no vm/container executor)', rejected };
  }

  return { selected, candidates: matched, filter };
}

// ============================================================
// Agent-level routing (#916)
// ============================================================

/** Filter criteria for selecting an agent to run a task (#916). */
export interface AgentFilter {
  /** Target a specific sandbox by ID */
  sandbox_id?: string;
  /** Target a specific agent by agentId, instanceId, or logicalName (#917) */
  agent_id?: string;
  /** Target an agent by its persistent logicalName (#917) */
  agent_name?: string;
  /** Required AIWG platform (e.g. "claude") */
  platform?: string;
  /** Agent must have ALL of these frameworks installed */
  frameworks?: string[];
  /** Agent must have ALL of these named agents in its inventory */
  agents?: string[];
  /** Agent must have ALL of these named skills in its inventory */
  skills?: string[];
  /** Agent must have at least this much free memory (GB) */
  min_memory_gb?: number;
  /** Agent must have CPU percent below this threshold */
  max_cpu_percent?: number;
  /** Fallback policy when preferred agent is unavailable */
  fallback?: AgentFilterFallback;
}

export interface AgentFilterFallback {
  /** "any_with_framework" | "any" | "none" */
  strategy: 'any_with_framework' | 'any' | 'none';
  /** Seconds to wait before falling back (not implemented — for future retry loop) */
  retry_after_seconds?: number;
  max_retries?: number;
}

export interface AgentCandidate {
  sandboxId: string;
  sandboxName: string;
  agent: SandboxAgent;
  /** Why this agent was selected or rejected */
  matchReason: string;
  /** Agents that did NOT match, with rejection reasons */
  rejected?: Array<{ agentId: string; reason: string }>;
}

export interface RoutingResult {
  selected?: AgentCandidate;
  candidates: AgentCandidate[];
  filter: AgentFilter;
}

// ============================================================
// Matching logic
// ============================================================

/** Returns a rejection reason string, or null if the agent matches. */
export function matchAgent(
  agent: SandboxAgent & { sandboxId: string; sandboxName: string },
  filter: AgentFilter,
): string | null {
  // Direct agent targeting
  if (filter.agent_id) {
    const matches = agent.agentId === filter.agent_id
      || agent.instanceId === filter.agent_id
      || agent.logicalName === filter.agent_id;
    if (!matches) return `agentId/instanceId/logicalName does not match '${filter.agent_id}'`;
  }
  if (filter.agent_name) {
    if (agent.logicalName !== filter.agent_name) {
      return `logicalName '${agent.logicalName ?? 'none'}' does not match '${filter.agent_name}'`;
    }
  }
  if (filter.sandbox_id && agent.sandboxId !== filter.sandbox_id) {
    return `sandboxId '${agent.sandboxId}' does not match '${filter.sandbox_id}'`;
  }

  // Status check — skip disconnected/error agents
  if (agent.status === 'disconnected' || agent.status === 'error') {
    return `agent status is '${agent.status}'`;
  }

  // Framework requirements
  if (filter.frameworks && filter.frameworks.length > 0) {
    const installed = new Set(agent.aiwgFrameworks?.map((f) => f.name) ?? []);
    const missing = filter.frameworks.filter((f) => !installed.has(f));
    if (missing.length > 0) return `missing frameworks: ${missing.join(', ')}`;
  }

  // Agent inventory requirements
  if (filter.agents && filter.agents.length > 0) {
    const installed = new Set(agent.inventory?.agents.map((a) => a.name) ?? []);
    const missing = filter.agents.filter((a) => !installed.has(a));
    if (missing.length > 0) return `missing agents in inventory: ${missing.join(', ')}`;
  }

  // Skill inventory requirements
  if (filter.skills && filter.skills.length > 0) {
    const installed = new Set(agent.inventory?.skills.map((s) => s.name) ?? []);
    const missing = filter.skills.filter((s) => !installed.has(s));
    if (missing.length > 0) return `missing skills in inventory: ${missing.join(', ')}`;
  }

  // CPU load threshold
  if (filter.max_cpu_percent !== undefined && agent.latestMetrics) {
    if (agent.latestMetrics.cpu_percent > filter.max_cpu_percent) {
      return `CPU ${agent.latestMetrics.cpu_percent.toFixed(1)}% exceeds max ${filter.max_cpu_percent}%`;
    }
  }

  // Memory requirements (convert GB → bytes)
  if (filter.min_memory_gb !== undefined && agent.latestMetrics) {
    const freeBytes = agent.latestMetrics.memory_total_bytes - agent.latestMetrics.memory_used_bytes;
    const freeGB = freeBytes / (1024 ** 3);
    if (freeGB < filter.min_memory_gb) {
      return `free memory ${freeGB.toFixed(1)}GB below min ${filter.min_memory_gb}GB`;
    }
  }

  return null; // matches
}

/**
 * Score an agent for ranking (lower = better).
 * Primary: CPU percent. Secondary: memory usage percent.
 */
function agentScore(agent: SandboxAgent): number {
  const cpu = agent.latestMetrics?.cpu_percent ?? 50;
  const memPct = agent.latestMetrics && agent.latestMetrics.memory_total_bytes > 0
    ? (agent.latestMetrics.memory_used_bytes / agent.latestMetrics.memory_total_bytes) * 100
    : 50;
  return cpu * 0.7 + memPct * 0.3;
}

/**
 * Select the best agent from candidates using filter criteria.
 * Returns a RoutingResult with selected agent and full candidate list.
 */
export function routeTask(
  agents: Array<SandboxAgent & { sandboxId: string; sandboxName: string }>,
  filter: AgentFilter,
): RoutingResult {
  const matched: AgentCandidate[] = [];
  const rejected: Array<{ agentId: string; sandboxId: string; reason: string }> = [];

  for (const agent of agents) {
    const reason = matchAgent(agent, filter);
    if (reason === null) {
      matched.push({
        sandboxId: agent.sandboxId,
        sandboxName: agent.sandboxName,
        agent,
        matchReason: 'matches all filter criteria',
      });
    } else {
      rejected.push({ agentId: agent.agentId, sandboxId: agent.sandboxId, reason });
    }
  }

  // Sort matched agents by score (lower = better)
  matched.sort((a, b) => agentScore(a.agent) - agentScore(b.agent));

  // Apply fallback if no direct match
  if (matched.length === 0 && filter.fallback && filter.fallback.strategy !== 'none') {
    const relaxedFilter: AgentFilter = { ...filter };
    if (filter.fallback.strategy === 'any_with_framework') {
      // Relax: keep only framework + status requirements
      delete relaxedFilter.agents;
      delete relaxedFilter.skills;
      delete relaxedFilter.max_cpu_percent;
      delete relaxedFilter.min_memory_gb;
      delete relaxedFilter.agent_id;
      delete relaxedFilter.agent_name;
      relaxedFilter.fallback = undefined;
    } else if (filter.fallback.strategy === 'any') {
      // Relax everything except sandbox affinity
      return routeTask(agents, { sandbox_id: filter.sandbox_id });
    }
    return routeTask(agents, relaxedFilter);
  }

  const selected = matched[0];
  if (selected) {
    selected.rejected = rejected.map((r) => ({ agentId: r.agentId, reason: r.reason }));
  }

  return {
    selected,
    candidates: matched,
    filter,
  };
}
