export const THREAT_ASSESSMENT_MODES = ['off', 'audit', 'enforce'] as const;
export type ThreatAssessmentMode = typeof THREAT_ASSESSMENT_MODES[number];

export const THREAT_ASSESSMENT_SEVERITIES = [
  'informational',
  'low',
  'moderate',
  'high',
  'critical',
] as const;
export type ThreatSeverity = typeof THREAT_ASSESSMENT_SEVERITIES[number];

export const THREAT_ASSESSMENT_SURFACES = [
  'issue-title',
  'issue-body',
  'issue-comment',
  'pull-request-title',
  'pull-request-body',
  'pull-request-diff-summary',
  'review-comment',
  'release-note',
  'handoff',
  'outbound-maintainer-comment',
] as const;
export type ThreatSurface = typeof THREAT_ASSESSMENT_SURFACES[number];

export type ThreatAction = 'proceed' | 'record' | 'flag' | 'require-authorization' | 'reject';
export type ThreatStatementEffect = 'suppress' | 'set-severity';
export type ThreatSemanticContext = 'requested' | 'negative' | 'quoted' | 'documentation';

export interface ThreatPolicyThresholds {
  flag?: ThreatSeverity;
  requireAuthorization?: ThreatSeverity;
  reject?: ThreatSeverity;
}

export interface ThreatPolicyCondition {
  surface?: ThreatSurface[];
  semanticContext?: ThreatSemanticContext[];
  requestedAction?: string[];
}

export interface ThreatPolicyStatement {
  id: string;
  effect: ThreatStatementEffect;
  signals?: string[];
  when?: ThreatPolicyCondition;
  severity?: ThreatSeverity;
  reason: string;
  riskAcceptance?: {
    acceptedBy: string;
    rationale: string;
    expiresAt?: string;
  };
}

export interface ThreatRuleConfig {
  id: string;
  severity: ThreatSeverity;
  likelihood?: number;
  impact?: number;
  taxonomy?: string[];
  patterns: string[];
}

export interface ThreatRulePackConfig {
  version: string;
  description?: string;
  rules: ThreatRuleConfig[];
}

export interface ThreatProfileConfig {
  version?: string;
  extends?: string[];
  mode?: ThreatAssessmentMode;
  description?: string;
  thresholds?: ThreatPolicyThresholds;
  ruleSets?: string[];
  statements?: ThreatPolicyStatement[];
}

export interface ThreatSurfaceConfig {
  mode?: ThreatAssessmentMode;
  profile?: string;
}

export interface ThreatAssessmentConfig {
  schemaVersion?: '1';
  mode?: ThreatAssessmentMode;
  defaultProfile?: string;
  surfaces?: Partial<Record<ThreatSurface, ThreatSurfaceConfig>>;
  profiles?: Record<string, ThreatProfileConfig>;
  rulePacks?: Record<string, ThreatRulePackConfig>;
  statements?: ThreatPolicyStatement[];
}

export interface SecurityConfig {
  threatAssessment?: ThreatAssessmentConfig;
}

const BUILTIN_PROFILES = new Set(['trusted', 'audit', 'balanced', 'strict', 'high-assurance']);
const BUILTIN_RULE_PACKS = new Set([
  'aiwg:all',
  'aiwg:prompt-injection',
  'aiwg:supply-chain',
  'aiwg:credential-protection',
]);
const BUILTIN_RULE_IDS = new Set([
  'instruction-override',
  'sensitive-file-target',
  'third-party-execution',
  'floating-version',
  'credential-or-env-probing',
  'pressure-without-evidence',
  'unverifiable-authority-claim',
  'security-framing-conflict',
]);

function objectValue(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function stringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string');
}

function validateStatement(statement: unknown, where: string, errors: string[]): void {
  if (!objectValue(statement)) {
    errors.push(`${where}: must be an object`);
    return;
  }
  if (typeof statement.id !== 'string' || !/^[a-z][a-z0-9-]*$/.test(statement.id)) {
    errors.push(`${where}.id: must be a kebab-case identifier`);
  }
  if (!['suppress', 'set-severity'].includes(String(statement.effect))) {
    errors.push(`${where}.effect: must be suppress or set-severity`);
  }
  if (typeof statement.reason !== 'string' || !statement.reason.trim()) {
    errors.push(`${where}.reason: must be a non-empty string`);
  }
  if (statement.signals !== undefined && !stringArray(statement.signals)) {
    errors.push(`${where}.signals: must be an array of strings`);
  }
  if (statement.severity !== undefined
    && !THREAT_ASSESSMENT_SEVERITIES.includes(statement.severity as ThreatSeverity)) {
    errors.push(`${where}.severity: unknown severity`);
  }
  if (statement.when !== undefined && !objectValue(statement.when)) {
    errors.push(`${where}.when: must be an object`);
  }
  if (statement.riskAcceptance !== undefined) {
    if (!objectValue(statement.riskAcceptance)
      || typeof statement.riskAcceptance.acceptedBy !== 'string'
      || typeof statement.riskAcceptance.rationale !== 'string') {
      errors.push(`${where}.riskAcceptance: requires acceptedBy and rationale`);
    }
  }
  if (statement.effect === 'suppress') {
    if (!stringArray(statement.signals) || statement.signals.length === 0) {
      errors.push(`${where}.signals: suppress statements must name at least one signal`);
    }
    const when = objectValue(statement.when) ? statement.when : undefined;
    if (!when || !Object.values(when).some(value => Array.isArray(value) && value.length > 0)) {
      errors.push(`${where}.when: suppress statements require at least one narrow condition`);
    }
    if (!objectValue(statement.riskAcceptance)
      || typeof statement.riskAcceptance.acceptedBy !== 'string'
      || typeof statement.riskAcceptance.rationale !== 'string') {
      errors.push(`${where}.riskAcceptance: suppress statements require acceptedBy and rationale`);
    }
  }
  if (statement.effect === 'set-severity'
    && !THREAT_ASSESSMENT_SEVERITIES.includes(statement.severity as ThreatSeverity)) {
    errors.push(`${where}.severity: set-severity requires a known severity`);
  }
}

/**
 * Fail-closed validation for project threat-assessment policy. The evaluator
 * performs the same checks at runtime; config loading validates first so a
 * malformed policy never degrades into the default or off mode.
 */
export function validateThreatAssessmentConfig(value: unknown): string[] {
  const errors: string[] = [];
  if (value === undefined || value === null) return errors;
  if (!objectValue(value)) return ['security.threatAssessment: must be an object'];
  if (value.schemaVersion !== undefined && value.schemaVersion !== '1') {
    errors.push("security.threatAssessment.schemaVersion: must be '1'");
  }
  if (value.mode !== undefined
    && !THREAT_ASSESSMENT_MODES.includes(value.mode as ThreatAssessmentMode)) {
    errors.push('security.threatAssessment.mode: must be off, audit, or enforce');
  }
  if (value.defaultProfile !== undefined && typeof value.defaultProfile !== 'string') {
    errors.push('security.threatAssessment.defaultProfile: must be a string');
  }

  if (value.surfaces !== undefined) {
    if (!objectValue(value.surfaces)) errors.push('security.threatAssessment.surfaces: must be an object');
    else {
      for (const [surface, entry] of Object.entries(value.surfaces)) {
        const where = `security.threatAssessment.surfaces.${surface}`;
        if (!THREAT_ASSESSMENT_SURFACES.includes(surface as ThreatSurface)) {
          errors.push(`${where}: unknown surface`);
        }
        if (!objectValue(entry)) {
          errors.push(`${where}: must be an object`);
          continue;
        }
        if (entry.mode !== undefined
          && !THREAT_ASSESSMENT_MODES.includes(entry.mode as ThreatAssessmentMode)) {
          errors.push(`${where}.mode: must be off, audit, or enforce`);
        }
        if (entry.profile !== undefined && typeof entry.profile !== 'string') {
          errors.push(`${where}.profile: must be a string`);
        }
      }
    }
  }

  const rulePacks = objectValue(value.rulePacks) ? value.rulePacks : {};
  if (value.rulePacks !== undefined && !objectValue(value.rulePacks)) {
    errors.push('security.threatAssessment.rulePacks: must be an object');
  }
  for (const [name, pack] of Object.entries(rulePacks)) {
    const where = `security.threatAssessment.rulePacks.${name}`;
    if (name.startsWith('aiwg:')) errors.push(`${where}: cannot shadow a built-in rule pack`);
    if (!objectValue(pack) || !Array.isArray(pack.rules)) {
      errors.push(`${where}.rules: must be an array`);
      continue;
    }
    if (typeof pack.version !== 'string' || !pack.version.trim()) {
      errors.push(`${where}.version: must be a non-empty string`);
    }
    const ids = new Set<string>();
    pack.rules.forEach((rule, index) => {
      const ruleWhere = `${where}.rules[${index}]`;
      if (!objectValue(rule)) {
        errors.push(`${ruleWhere}: must be an object`);
        return;
      }
      if (typeof rule.id !== 'string' || !/^[a-z][a-z0-9-]*$/.test(rule.id)) {
        errors.push(`${ruleWhere}.id: must be a kebab-case identifier`);
      } else if (BUILTIN_RULE_IDS.has(rule.id)) {
        errors.push(`${ruleWhere}.id: cannot shadow built-in rule '${rule.id}'`);
      } else if (ids.has(rule.id)) {
        errors.push(`${ruleWhere}.id: duplicate '${rule.id}'`);
      } else ids.add(rule.id);
      if (!THREAT_ASSESSMENT_SEVERITIES.includes(rule.severity as ThreatSeverity)) {
        errors.push(`${ruleWhere}.severity: unknown severity`);
      }
      for (const dimension of ['likelihood', 'impact'] as const) {
        const dimensionValue = rule[dimension];
        if (dimensionValue !== undefined
          && (!Number.isInteger(dimensionValue) || Number(dimensionValue) < 1 || Number(dimensionValue) > 5)) {
          errors.push(`${ruleWhere}.${dimension}: must be an integer from 1 to 5`);
        }
      }
      if (!stringArray(rule.patterns) || rule.patterns.length === 0) {
        errors.push(`${ruleWhere}.patterns: must be a non-empty array of strings`);
      } else {
        rule.patterns.forEach((pattern, patternIndex) => {
          const patternWhere = `${ruleWhere}.patterns[${patternIndex}]`;
          if (!pattern || pattern.length > 500) {
            errors.push(`${patternWhere}: must be 1-500 characters`);
            return;
          }
          try {
            new RegExp(pattern, 'imu');
          } catch (error) {
            errors.push(`${patternWhere}: invalid regular expression (${(error as Error).message})`);
          }
          if (/\\[1-9]/.test(pattern) || /\(\?<([=!])/.test(pattern)
            || /\([^)]*[+*][^)]*\)[+*{]/.test(pattern) || /(?:\.\*){2,}/.test(pattern)) {
            errors.push(`${patternWhere}: unsafe regex construct (backreference, lookbehind, or nested unbounded quantifier)`);
          }
        });
      }
    });
  }

  const profiles = objectValue(value.profiles) ? value.profiles : {};
  if (value.profiles !== undefined && !objectValue(value.profiles)) {
    errors.push('security.threatAssessment.profiles: must be an object');
  }
  const visit = (name: string, stack: string[]): void => {
    if (stack.includes(name)) {
      errors.push(`security.threatAssessment.profiles.${name}.extends: cyclic inheritance (${[...stack, name].join(' -> ')})`);
      return;
    }
    const profile = profiles[name];
    if (!objectValue(profile)) return;
    const parents = profile.extends ?? [];
    if (!stringArray(parents)) {
      errors.push(`security.threatAssessment.profiles.${name}.extends: must be an array of strings`);
      return;
    }
    for (const rawParent of parents) {
      const parent = rawParent.replace(/^aiwg:/, '');
      if (!BUILTIN_PROFILES.has(parent) && !(parent in profiles)) {
        errors.push(`security.threatAssessment.profiles.${name}.extends: unknown profile '${rawParent}'`);
      } else if (parent in profiles) visit(parent, [...stack, name]);
    }
  };
  for (const [name, profile] of Object.entries(profiles)) {
    const where = `security.threatAssessment.profiles.${name}`;
    if (BUILTIN_PROFILES.has(name) || name.startsWith('aiwg:')) {
      errors.push(`${where}: cannot shadow a built-in profile`);
    }
    if (!objectValue(profile)) {
      errors.push(`${where}: must be an object`);
      continue;
    }
    if (profile.mode !== undefined
      && !THREAT_ASSESSMENT_MODES.includes(profile.mode as ThreatAssessmentMode)) {
      errors.push(`${where}.mode: must be off, audit, or enforce`);
    }
    if (profile.version !== undefined && (typeof profile.version !== 'string' || !profile.version.trim())) {
      errors.push(`${where}.version: must be a non-empty string`);
    }
    if (profile.ruleSets !== undefined && !stringArray(profile.ruleSets)) {
      errors.push(`${where}.ruleSets: must be an array of strings`);
    } else {
      for (const pack of (profile.ruleSets ?? []) as string[]) {
        if (!BUILTIN_RULE_PACKS.has(pack) && !(pack in rulePacks)) {
          errors.push(`${where}.ruleSets: unavailable rule pack '${pack}'`);
        }
      }
    }
    if (profile.thresholds !== undefined) {
      if (!objectValue(profile.thresholds)) errors.push(`${where}.thresholds: must be an object`);
      else {
        for (const [action, severity] of Object.entries(profile.thresholds)) {
          if (!['flag', 'requireAuthorization', 'reject'].includes(action)
            || !THREAT_ASSESSMENT_SEVERITIES.includes(severity as ThreatSeverity)) {
            errors.push(`${where}.thresholds.${action}: unknown threshold or severity`);
          }
        }
      }
    }
    if (profile.statements !== undefined) {
      if (!Array.isArray(profile.statements)) errors.push(`${where}.statements: must be an array`);
      else profile.statements.forEach((statement, index) =>
        validateStatement(statement, `${where}.statements[${index}]`, errors));
    }
    visit(name, []);
  }
  if (value.statements !== undefined) {
    if (!Array.isArray(value.statements)) errors.push('security.threatAssessment.statements: must be an array');
    else value.statements.forEach((statement, index) =>
      validateStatement(statement, `security.threatAssessment.statements[${index}]`, errors));
  }
  const defaultProfile = typeof value.defaultProfile === 'string' ? value.defaultProfile : 'balanced';
  if (!BUILTIN_PROFILES.has(defaultProfile) && !(defaultProfile in profiles)) {
    errors.push(`security.threatAssessment.defaultProfile: unknown profile '${defaultProfile}'`);
  }
  return Array.from(new Set(errors));
}

export function defaultThreatAssessmentConfig(): ThreatAssessmentConfig {
  return {
    schemaVersion: '1',
    mode: 'enforce',
    defaultProfile: 'balanced',
  };
}
