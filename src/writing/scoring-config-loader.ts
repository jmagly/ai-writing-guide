/**
 * Scoring Configuration Loader
 *
 * Loads validation scoring weights and thresholds from the writing-quality addon.
 * Provides typed access to scoring parameters with documented defaults.
 *
 * @source @agentic/code/addons/writing-quality/validation/scoring-config.json
 */

import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface AuthenticityConfig {
  humanMarkerWeight: number;
  aiTellPenalty: number;
  baseScore: number;
}

export interface IssueScoringConfig {
  criticalPenalty: number;
  warningPenalty: number;
  aiPatternMultiplier: number;
  aiPatternNormalizer: number;
}

export interface MarkerWeightsConfig {
  strong: number;
  moderate: number;
  weak: number;
}

export interface VoiceDetectionConfig {
  mixedVoiceThreshold: number;
  defaultMixedConfidence: number;
  markerWeights: MarkerWeightsConfig;
}

export interface ThresholdsConfig {
  passScore: number;
  lowScoreWarning: number;
  highAIPatternWarning: number;
}

export interface ScoringConfig {
  authenticity: AuthenticityConfig;
  issueScoring: IssueScoringConfig;
  voiceDetection: VoiceDetectionConfig;
  thresholds: ThresholdsConfig;
}

/**
 * Default scoring configuration values
 * These match the original hardcoded values and are used as fallback
 */
const DEFAULTS: ScoringConfig = {
  authenticity: {
    humanMarkerWeight: 10,
    aiTellPenalty: 15,
    baseScore: 30,
  },
  issueScoring: {
    criticalPenalty: 10,
    warningPenalty: 3,
    aiPatternMultiplier: 0.5,
    aiPatternNormalizer: 20,
  },
  voiceDetection: {
    mixedVoiceThreshold: 1.5,
    defaultMixedConfidence: 50,
    markerWeights: {
      strong: 3,
      moderate: 2,
      weak: 1,
    },
  },
  thresholds: {
    passScore: 70,
    lowScoreWarning: 50,
    highAIPatternWarning: 30,
  },
};

let cachedConfig: ScoringConfig | null = null;

/**
 * Known locations for scoring configuration
 */
function getConfigPaths(): string[] {
  return [
    // Project-level override
    join(process.cwd(), 'scoring-config.json'),
    join(process.cwd(), '.aiwg', 'scoring-config.json'),
    // Writing-quality addon location (relative to this file when installed)
    join(__dirname, '..', '..', 'agentic', 'code', 'addons', 'writing-quality', 'validation', 'scoring-config.json'),
    // Writing-quality addon location (from repo root)
    join(process.cwd(), 'agentic', 'code', 'addons', 'writing-quality', 'validation', 'scoring-config.json'),
  ];
}

/**
 * Parse raw JSON config into typed values
 */
function parseConfig(content: string): Partial<ScoringConfig> {
  const raw = JSON.parse(content);
  return {
    authenticity: raw.authenticity ? {
      humanMarkerWeight: raw.authenticity.humanMarkerWeight?.value ?? raw.authenticity.humanMarkerWeight,
      aiTellPenalty: raw.authenticity.aiTellPenalty?.value ?? raw.authenticity.aiTellPenalty,
      baseScore: raw.authenticity.baseScore?.value ?? raw.authenticity.baseScore,
    } : undefined,
    issueScoring: raw.issueScoring ? {
      criticalPenalty: raw.issueScoring.criticalPenalty?.value ?? raw.issueScoring.criticalPenalty,
      warningPenalty: raw.issueScoring.warningPenalty?.value ?? raw.issueScoring.warningPenalty,
      aiPatternMultiplier: raw.issueScoring.aiPatternMultiplier?.value ?? raw.issueScoring.aiPatternMultiplier,
      aiPatternNormalizer: raw.issueScoring.aiPatternNormalizer?.value ?? raw.issueScoring.aiPatternNormalizer,
    } : undefined,
    voiceDetection: raw.voiceDetection ? {
      mixedVoiceThreshold: raw.voiceDetection.mixedVoiceThreshold?.value ?? raw.voiceDetection.mixedVoiceThreshold,
      defaultMixedConfidence: raw.voiceDetection.defaultMixedConfidence?.value ?? raw.voiceDetection.defaultMixedConfidence,
      markerWeights: {
        strong: raw.voiceDetection.markerWeights?.strong?.value ?? raw.voiceDetection.markerWeights?.strong ?? DEFAULTS.voiceDetection.markerWeights.strong,
        moderate: raw.voiceDetection.markerWeights?.moderate?.value ?? raw.voiceDetection.markerWeights?.moderate ?? DEFAULTS.voiceDetection.markerWeights.moderate,
        weak: raw.voiceDetection.markerWeights?.weak?.value ?? raw.voiceDetection.markerWeights?.weak ?? DEFAULTS.voiceDetection.markerWeights.weak,
      },
    } : undefined,
    thresholds: raw.thresholds ? {
      passScore: raw.thresholds.passScore?.value ?? raw.thresholds.passScore,
      lowScoreWarning: raw.thresholds.lowScoreWarning?.value ?? raw.thresholds.lowScoreWarning,
      highAIPatternWarning: raw.thresholds.highAIPatternWarning?.value ?? raw.thresholds.highAIPatternWarning,
    } : undefined,
  };
}

/**
 * Deep merge config with defaults
 */
function mergeConfig(defaults: ScoringConfig, overrides: Partial<ScoringConfig>): ScoringConfig {
  return {
    authenticity: {
      ...defaults.authenticity,
      ...overrides.authenticity,
    },
    issueScoring: {
      ...defaults.issueScoring,
      ...overrides.issueScoring,
    },
    voiceDetection: {
      ...defaults.voiceDetection,
      ...overrides.voiceDetection,
      markerWeights: {
        ...defaults.voiceDetection.markerWeights,
        ...overrides.voiceDetection?.markerWeights,
      },
    },
    thresholds: {
      ...defaults.thresholds,
      ...overrides.thresholds,
    },
  };
}

/**
 * Load scoring configuration asynchronously
 * Searches known locations and merges with defaults
 */
export async function loadScoringConfig(): Promise<ScoringConfig> {
  if (cachedConfig) {
    return cachedConfig;
  }

  for (const configPath of getConfigPaths()) {
    if (existsSync(configPath)) {
      try {
        const content = await readFile(configPath, 'utf-8');
        cachedConfig = mergeConfig(DEFAULTS, parseConfig(content));
        return cachedConfig;
      } catch {
        // Try next location
        continue;
      }
    }
  }

  // No config found, use defaults
  cachedConfig = DEFAULTS;
  return cachedConfig;
}

/**
 * Get scoring config synchronously
 * Returns cached config or defaults if not yet loaded
 */
export function getScoringConfig(): ScoringConfig {
  return cachedConfig || DEFAULTS;
}

/**
 * Clear cached configuration
 * Useful for testing or when config file has changed
 */
export function clearScoringConfigCache(): void {
  cachedConfig = null;
}

/**
 * Get default scoring configuration
 * Useful for documentation or reset functionality
 */
export function getDefaultScoringConfig(): ScoringConfig {
  return { ...DEFAULTS };
}
