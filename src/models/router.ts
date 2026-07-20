/**
 * Provider-neutral model-tier routing primitive.
 *
 * This is deliberately a policy decision helper, not a provider switcher.
 * Callers use it to decide whether a task stays on the current/default
 * model, escalates to a capable work tier, or requires explicit premium
 * confirmation before routing.
 *
 * @implements #1185
 */

import type {
  ModelRouteDecision,
  ModelRouteRequest,
  ModelTier,
  RuntimeModelTier,
} from './types.js';

const RUNTIME_TO_MODEL_TIER: Record<RuntimeModelTier, ModelTier | null> = {
  0: null,
  1: 'economy',
  2: 'standard',
  3: 'premium',
};

function clampRuntimeTier(tier: RuntimeModelTier | undefined, fallback: RuntimeModelTier): RuntimeModelTier {
  return tier === 0 || tier === 1 || tier === 2 || tier === 3 ? tier : fallback;
}

export function routeModelTier(request: ModelRouteRequest = {}): ModelRouteDecision {
  const defaultTier = clampRuntimeTier(request.defaultTier, 1);
  const maxAutoTier = clampRuntimeTier(
    request.maxAutoTier,
    request.unattended ? 1 : 2,
  );

  let tier: RuntimeModelTier = defaultTier;
  let source: ModelRouteDecision['source'] = 'default';
  const rationale: string[] = [];

  if (request.deterministic) {
    tier = 0;
    source = 'deterministic';
    rationale.push('deterministic tool/cache/existing answer is sufficient');
  } else if (request.requestedPremium) {
    tier = 3;
    source = 'request';
    rationale.push('premium tier was explicitly requested');
  } else if (request.highImpact) {
    tier = 3;
    source = 'impact';
    rationale.push('high-impact domain requires supervised premium routing');
  } else if (request.complex) {
    tier = Math.max(defaultTier, 2) as RuntimeModelTier;
    source = 'complexity';
    rationale.push('complex or multi-step work needs a capable work tier');
  } else if (request.routine) {
    tier = Math.min(defaultTier, 1) as RuntimeModelTier;
    source = 'default';
    rationale.push('routine work stays at the default/cheap tier');
  } else {
    rationale.push('no escalation signal present');
  }

  const requiresConfirmation = tier === 3 || tier > maxAutoTier;
  if (requiresConfirmation) {
    rationale.push(
      tier === 3
        ? 'Tier 3 requires explicit human confirmation'
        : `policy permits auto-routing only through Tier ${maxAutoTier}`,
    );
  }

  const summaryRequired = tier > defaultTier;

  return {
    tier,
    modelTier: RUNTIME_TO_MODEL_TIER[tier],
    requiresConfirmation,
    summaryRequired,
    source: requiresConfirmation && tier > maxAutoTier ? 'policy' : source,
    rationale,
  };
}
