/**
 * Executor Conformance Suite — Runner
 *
 * Vitest-driven runner that exercises any registered executor against
 * executor.aiwg.io/v1. See docs/contracts/conformance.md for usage.
 *
 * Modes:
 *   Fixture mode (default / CI): replays recorded fixtures via in-process
 *     ExecutorRegistry calls. Zero network I/O, fully deterministic.
 *   Live mode (AIWG_CONFORMANCE_LIVE=1): drives a real executor over its
 *     registered REST + WS endpoints.
 *
 * Target executor:
 *   --executor <id>  or  AIWG_CONFORMANCE_EXECUTOR_ID env var
 *
 * Conformance levels:
 *   Core      — always required
 *   HITL      — if executor advertises 'hitl' capability
 *   Resumable — if executor advertises 'resumable' capability
 *
 * @issue #1183
 * @see docs/contracts/conformance.md
 * @see schemas/executor-v1.json
 */

import { describe, it, beforeAll, afterAll } from 'vitest';
import { IS_LIVE_MODE, getExecutorId, loadFixture, createRegistryForTest, FakeWsConn } from './client.mjs';

// ── Run-time config ──────────────────────────────────────────────────────────

const EXECUTOR_ID = getExecutorId();

console.log(`\n[conformance] mode=${IS_LIVE_MODE ? 'LIVE' : 'fixture'} executor=${EXECUTOR_ID}\n`);

// ── Capability detection ─────────────────────────────────────────────────────

/**
 * Resolve which capability tiers to run.
 * In fixture mode, derive from the register-happy fixture.
 * In live mode, call GET /api/v1/executors to discover real capabilities.
 */
async function resolveCapabilities() {
  if (IS_LIVE_MODE) {
    // Live: query the running AIWG serve to find the registered executor
    const serveBase = process.env.AIWG_SERVE_URL ?? 'http://127.0.0.1:7337';
    const res = await fetch(`${serveBase}/api/v1/executors`);
    if (!res.ok) throw new Error(`GET /api/v1/executors failed: ${res.status}`);
    const body = await res.json();
    const executor = body.executors?.find(e => e.executor_id === EXECUTOR_ID);
    if (!executor) throw new Error(`Executor ${EXECUTOR_ID} not found in registry`);
    return new Set(executor.capabilities ?? []);
  }

  // Fixture mode: read from register-happy fixture
  const fixture = loadFixture('register-happy');
  return new Set(fixture.request.body.capabilities ?? []);
}

// ── Shared test context ──────────────────────────────────────────────────────

export let capabilities = new Set();

export function capabilityTierEnabled(tier) {
  if (tier === 'Core') return true;
  if (tier === 'HITL') return capabilities.has('hitl');
  if (tier === 'Resumable') return capabilities.has('resumable');
  return false;
}

// ── Top-level suite ──────────────────────────────────────────────────────────

describe('executor.aiwg.io/v1 Conformance Suite', () => {
  beforeAll(async () => {
    capabilities = await resolveCapabilities();

    const tiers = ['Core'];
    if (capabilities.has('hitl'))      tiers.push('HITL');
    if (capabilities.has('resumable')) tiers.push('Resumable');

    console.log(`[conformance] Enabled tiers: ${tiers.join(', ')}`);
    console.log(`[conformance] Capabilities: ${[...capabilities].join(', ')}`);
  });

  afterAll(() => {
    const passing = [];
    const skipped = [];

    if (capabilityTierEnabled('Core'))      passing.push('Core');
    else                                    skipped.push('Core');
    if (capabilityTierEnabled('HITL'))      passing.push('HITL');
    else                                    skipped.push('HITL');
    if (capabilityTierEnabled('Resumable')) passing.push('Resumable');
    else                                    skipped.push('Resumable');

    console.log(`\n[conformance] REPORT`);
    console.log(`  Levels run:    ${passing.join(', ') || 'none'}`);
    console.log(`  Levels skipped: ${skipped.join(', ') || 'none'} (capability not advertised)`);
  });

  // Each category imports its own describe block.
  // Runner is the vitest entry point; vitest discovers and runs all
  // *.test.mjs in sub-directories when the config includes the pattern.
});
