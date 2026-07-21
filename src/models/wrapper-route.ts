import {
  compileModelPolicy,
  type CompiledModelPolicy,
  type ProviderModelCatalog,
} from './provider-policy.js';
import { MODEL_WRAPPERS, type ModelRole } from './provider-models.js';
import { routeModelTier } from './router.js';
import type { ModelRouteRequest, ModelRouteDecision, ModelTier } from './types.js';
import type { ResolvedRoutableCapability } from '../artifacts/capability-resolver.js';

export type RoutedCapabilityType = ResolvedRoutableCapability['type'];
export type WrapperLaunchMechanism = 'native-subagent' | 'aiwg-mc' | 'manual';

export interface WrapperRouteRequest extends ModelRouteRequest {
  provider: Parameters<typeof compileModelPolicy>[0]['provider'];
  capability: ResolvedRoutableCapability;
  assignment: string;
  launchMechanism: WrapperLaunchMechanism;
  catalog?: ProviderModelCatalog;
}

export interface WrapperRouteEnvelope {
  version: 1;
  provider: WrapperRouteRequest['provider'];
  decision: ModelRouteDecision;
  role: ModelRole | null;
  tier: ModelTier | null;
  wrapper: string | null;
  capability: ResolvedRoutableCapability;
  assignment: string;
  model: CompiledModelPolicy | null;
  launch: {
    mechanism: WrapperLaunchMechanism;
    target: string | null;
    prompt: string;
  };
}

function roleForTier(tier: ModelTier | null): ModelRole | null {
  if (tier === 'economy') return 'efficiency';
  if (tier === 'premium' || tier === 'max-quality') return 'reasoning';
  if (tier === 'standard') return 'coding';
  return null;
}

export function buildWrapperRouteEnvelope(request: WrapperRouteRequest): WrapperRouteEnvelope {
  if (!request.assignment.trim()) throw new Error('Wrapper routing requires a bounded assignment.');

  const decision = routeModelTier(request);
  const tier = decision.modelTier;
  const role = roleForTier(tier);
  const wrapper = role ? MODEL_WRAPPERS[role] : null;
  const model = role && tier
    ? compileModelPolicy({
        provider: request.provider,
        artifact: 'agent',
        policy: { role, tier: tier === 'max-quality' ? 'premium' : tier },
        ...(request.catalog ? { catalog: request.catalog } : {}),
      })
    : null;
  const prompt = wrapper
    ? [
        `Run this assignment through ${wrapper}.`,
        `Selected capability: ${request.capability.type} ${request.capability.name} (${request.capability.id}).`,
        `Load it with aiwg show ${request.capability.type === 'workflow' ? 'metadata' : request.capability.type} ${request.capability.id} after discover-first validation.`,
        `Assignment: ${request.assignment.trim()}`,
        'Return capability evidence, changed artifacts, validation results, and remaining risks.',
      ].join('\n')
    : `No model call is required. Execute the deterministic assignment: ${request.assignment.trim()}`;

  return {
    version: 1,
    provider: request.provider,
    decision,
    role,
    tier,
    wrapper,
    capability: request.capability,
    assignment: request.assignment.trim(),
    model,
    launch: {
      mechanism: request.launchMechanism,
      target: wrapper,
      prompt,
    },
  };
}
