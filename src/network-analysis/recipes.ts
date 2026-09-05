import semver from 'semver';

import type { OfflineAnalysisLimits, OfflineAnalysisRecipe } from './analyzer.js';

export const ANALYSIS_RECIPE_SCHEMA_VERSION = 'network-analysis.analysis-recipe/v1' as const;

export interface RecipeFieldRequest {
  name: string;
  required: boolean;
}

export interface RecipeFieldFallback {
  field: string;
  introduced_in: string;
  fallback_field?: string;
  behavior: 'use-fallback' | 'omit-optional' | 'fail-required';
  diagnostic: string;
}

export interface AnalysisRecipeDocument {
  schema_version: typeof ANALYSIS_RECIPE_SCHEMA_VERSION;
  kind: 'AnalysisRecipe';
  recipe_id: string;
  version: string;
  title: string;
  purpose: string;
  sensitivity: 'public' | 'internal' | 'confidential' | 'restricted';
  filters: {
    capture_filters: Array<{ type: 'capture_filter'; language: 'bpf' | 'libpcap'; expression: string; applied_before_capture: true }>;
    display_filters: Array<{ type: 'display_filter'; language: 'wireshark-display'; expression: string; applied_after_capture: true }>;
  };
  requested_output: {
    fields: RecipeFieldRequest[];
    statistics: Array<{ name: string; tool: string; required: boolean }>;
    artifact_media_types: string[];
    observation_policy: 'separate-observations-and-inferences';
  };
  limits: {
    max_capture_bytes: number;
    max_frames: number;
    max_duration_seconds: number;
    max_output_bytes: number;
    max_processes: number;
    payload_policy: 'none' | 'metadata-only' | 'truncated';
  };
  compatibility: {
    contract: typeof ANALYSIS_RECIPE_SCHEMA_VERSION;
    minimum_tools: Array<{ name: string; version_range: string; required: boolean }>;
    field_fallbacks?: RecipeFieldFallback[];
    unsupported_major_policy: 'fail-closed';
  };
  interpretation?: {
    observations: string[];
    heuristics: Array<{
      id: string;
      statement: string;
      method: string;
      false_positive_conditions: string[];
      attack_techniques: string[];
    }>;
  };
}

export interface CompiledAnalysisRecipe {
  recipe: OfflineAnalysisRecipe;
  limits: OfflineAnalysisLimits;
  sensitivity: AnalysisRecipeDocument['sensitivity'];
  statistics: AnalysisRecipeDocument['requested_output']['statistics'];
  interpretation: AnalysisRecipeDocument['interpretation'];
  diagnostics: string[];
  provenance: {
    recipeId: string;
    recipeVersion: string;
    toolVersion: string;
    selectedFields: string[];
    displayFilter: string;
    fallbacks: Array<{ field: string; replacement?: string }>;
  };
}

export class RecipeCompatibilityError extends Error {
  readonly diagnostics: string[];

  constructor(message: string, diagnostics: string[]) {
    super(message);
    this.name = 'RecipeCompatibilityError';
    this.diagnostics = diagnostics;
  }
}

export function compileAnalysisRecipe(
  document: AnalysisRecipeDocument,
  capability: { tsharkVersion: string; availableFields: Iterable<string> },
): CompiledAnalysisRecipe {
  assertRecipeIdentity(document);
  const diagnostics: string[] = [];
  const tshark = document.compatibility.minimum_tools.find(tool => tool.name === 'tshark');
  if (!tshark?.required) throw new RecipeCompatibilityError('Recipe must require TShark.', ['Missing required TShark compatibility entry.']);
  if (!semver.valid(capability.tsharkVersion) || !semver.satisfies(capability.tsharkVersion, tshark.version_range, { includePrerelease: true })) {
    throw new RecipeCompatibilityError(
      `TShark ${capability.tsharkVersion} is incompatible with ${document.recipe_id}.`,
      [`Install a maintained TShark matching ${tshark.version_range}; unsupported major versions fail closed.`],
    );
  }
  if (document.filters.capture_filters.length > 0) {
    throw new RecipeCompatibilityError('Offline recipes cannot apply capture filters after collection.', [
      'Select a saved capture and use only Wireshark display filters during analysis.',
    ]);
  }

  const available = new Set(capability.availableFields);
  const fallbackByField = new Map((document.compatibility.field_fallbacks ?? []).map(fallback => [fallback.field, fallback]));
  const selectedFields: string[] = [];
  const usedFallbacks: Array<{ field: string; replacement?: string }> = [];
  for (const request of document.requested_output.fields) {
    if (available.has(request.name)) {
      selectedFields.push(request.name);
      continue;
    }
    const fallback = fallbackByField.get(request.name);
    if (fallback?.behavior === 'use-fallback' && fallback.fallback_field && available.has(fallback.fallback_field)) {
      selectedFields.push(fallback.fallback_field);
      diagnostics.push(`${fallback.diagnostic} Selected ${fallback.fallback_field}.`);
      usedFallbacks.push({ field: request.name, replacement: fallback.fallback_field });
      continue;
    }
    if (!request.required && fallback?.behavior !== 'fail-required') {
      diagnostics.push(fallback?.diagnostic ?? `Optional field ${request.name} is unavailable and was omitted.`);
      usedFallbacks.push({ field: request.name });
      continue;
    }
    throw new RecipeCompatibilityError(`Required field ${request.name} is unavailable for ${document.recipe_id}.`, [
      fallback?.diagnostic ?? `Probe TShark fields and select a compatible recipe version; ${request.name} has no declared fallback.`,
    ]);
  }

  const displayFilter = document.filters.display_filters.map(filter => `(${filter.expression})`).join(' && ');
  return {
    recipe: {
      id: document.recipe_id.replace(/^analysis-recipe:/, ''),
      version: document.version,
      ...(displayFilter ? { displayFilter } : {}),
      fields: [...new Set(selectedFields)],
    },
    limits: {
      inputBytes: document.limits.max_capture_bytes,
      packets: document.limits.max_frames,
      outputBytes: document.limits.max_output_bytes,
      timeoutMs: document.limits.max_duration_seconds * 1000,
    },
    sensitivity: document.sensitivity,
    statistics: document.requested_output.statistics,
    interpretation: document.interpretation,
    diagnostics,
    provenance: {
      recipeId: document.recipe_id,
      recipeVersion: document.version,
      toolVersion: capability.tsharkVersion,
      selectedFields: [...new Set(selectedFields)],
      displayFilter,
      fallbacks: usedFallbacks,
    },
  };
}

function assertRecipeIdentity(document: AnalysisRecipeDocument): void {
  if (document.schema_version !== ANALYSIS_RECIPE_SCHEMA_VERSION || document.kind !== 'AnalysisRecipe'
    || document.compatibility.contract !== ANALYSIS_RECIPE_SCHEMA_VERSION
    || document.compatibility.unsupported_major_policy !== 'fail-closed') {
    throw new RecipeCompatibilityError('Unsupported analysis recipe contract.', ['Use network-analysis.analysis-recipe/v1; unsupported major versions fail closed.']);
  }
  if (!/^analysis-recipe:[A-Za-z0-9][A-Za-z0-9._-]*$/.test(document.recipe_id) || !semver.valid(document.version)) {
    throw new RecipeCompatibilityError('Recipe identity or version is invalid.', ['Use a scoped recipe_id and semantic version.']);
  }
}
