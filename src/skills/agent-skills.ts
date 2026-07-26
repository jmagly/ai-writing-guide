/**
 * Agent Skills portability contract.
 *
 * This module intentionally contains no filesystem or execution behavior. It is
 * the typed boundary shared by import, validation, and provider projection.
 *
 * @implements #1875
 */

export const AGENT_SKILLS_BASELINE = {
  repository: 'agentskills/agentskills',
  revision: '38a2ff82958afee88dadf4831509e6f7e9d8ef4e',
  referenceValidatorVersion: '0.1.0',
  pinnedAt: '2026-07-25',
} as const;

export const AGENT_SKILLS_SIDECAR_SCHEMA =
  'https://aiwg.io/schemas/skills/agent-skill-sidecar.v1.schema.json';

export const STANDARD_SKILL_FIELDS = [
  'name',
  'description',
  'license',
  'compatibility',
  'metadata',
  'allowed-tools',
] as const;

export type StandardSkillField = (typeof STANDARD_SKILL_FIELDS)[number];
export type AgentSkillValidationProfile = 'strict' | 'compatible' | 'discovery';
export type AgentSkillDiagnosticDisposition = 'error' | 'warning';
export type AgentSkillTrustState = 'untrusted' | 'trusted' | 'revoked';
export type AgentSkillActivationState = 'inactive' | 'active' | 'blocked';
export type AgentSkillSourceKind = 'directory' | 'git';
export type AgentSkillProjectionStatus =
  | 'native'
  | 'projected'
  | 'degraded'
  | 'unsupported';
export type AgentSkillCollisionOrigin =
  | 'project'
  | 'user'
  | 'imported'
  | 'aiwg-managed';

export const AGENT_SKILL_VALIDATION_PROFILES = Object.freeze({
  strict: {
    recognizedAiwgFields: false,
    unknownField: 'error',
    cosmeticNameDefect: 'error',
    missingDescription: 'error',
    invalidYaml: 'error',
  },
  compatible: {
    recognizedAiwgFields: true,
    unknownField: 'error',
    cosmeticNameDefect: 'error',
    missingDescription: 'error',
    invalidYaml: 'error',
  },
  discovery: {
    recognizedAiwgFields: true,
    unknownField: 'warning',
    cosmeticNameDefect: 'warning',
    missingDescription: 'error',
    invalidYaml: 'error',
  },
} satisfies Readonly<Record<AgentSkillValidationProfile, {
  recognizedAiwgFields: boolean;
  unknownField: AgentSkillDiagnosticDisposition;
  cosmeticNameDefect: AgentSkillDiagnosticDisposition;
  missingDescription: AgentSkillDiagnosticDisposition;
  invalidYaml: AgentSkillDiagnosticDisposition;
}>>);

export const AGENT_SKILL_PROJECTION_STATUSES = [
  'native',
  'projected',
  'degraded',
  'unsupported',
] as const satisfies readonly AgentSkillProjectionStatus[];

export const AIWG_SKILL_CONTROL_FIELDS = [
  'namespace',
  'platforms',
  'commandHint',
  'triggers',
  'version',
  'ensures',
  'invariants',
  'requires',
  'tools',
  'errors',
  'kernel',
  'category',
  'script',
  'status',
  'aliases',
  'userInvocable',
  'author',
  'capabilities',
  'deprecated_names',
  'legacyName',
  'triggerPhrases',
  'autoTrigger',
  'autoTriggerConditions',
  'references',
  'inputRequirements',
  'outputFormat',
  'effort',
  'disableModelInvocation',
  'context',
  'allowedTools',
] as const;

export type AiwgSkillControlField = (typeof AIWG_SKILL_CONTROL_FIELDS)[number];

/**
 * The complete portable frontmatter defined by the pinned Agent Skills
 * baseline. `allowed-tools` remains experimental upstream.
 */
export interface AgentSkillsStandardMetadata {
  name: string;
  description: string;
  license?: string;
  compatibility?: string;
  metadata?: Record<string, string>;
  'allowed-tools'?: string;
}

export interface AgentSkillResource {
  path: string;
  digest: string;
  size: number;
}

/**
 * AIWG fields currently observed in canonical SKILL.md frontmatter, plus the
 * extension type fields used by the in-memory skill model. Values are retained
 * verbatim in the sidecar; they are not portable Agent Skills policy.
 */
export type AiwgSkillControlMetadata =
  Partial<Record<AiwgSkillControlField, unknown>>;

export interface AgentSkillUnknownField {
  key: string;
  value: unknown;
}

export interface AgentSkillDocument {
  standard: AgentSkillsStandardMetadata;
  body: string;
  resources: AgentSkillResource[];
  aiwg: AiwgSkillControlMetadata;
  /**
   * Unknown external fields are diagnostic evidence only. Importers must never
   * promote them to `aiwg` control metadata automatically.
   */
  unknownFields: AgentSkillUnknownField[];
}

export interface AgentSkillProvenance {
  sourceKind: AgentSkillSourceKind;
  locator: string;
  requestedRevision?: string;
  resolvedRevision?: string;
  sourceDigest: string;
  importedAt: string;
  aiwgVersion: string;
}

export interface AgentSkillSidecarV1 {
  $schema: typeof AGENT_SKILLS_SIDECAR_SCHEMA;
  schemaVersion: 1;
  aiwg: AiwgSkillControlMetadata;
  provenance: AgentSkillProvenance;
  validationProfile: AgentSkillValidationProfile;
  trust: {
    state: AgentSkillTrustState;
    activation: AgentSkillActivationState;
  };
}

export interface AgentSkillProjectionResult {
  provider: string;
  status: AgentSkillProjectionStatus;
  path?: string;
  reasons: string[];
  sourceDigest: string;
}

/**
 * Higher values win. This preserves the upstream project-over-user rule while
 * keeping explicitly imported skills ahead of AIWG's packaged defaults.
 */
export const AGENT_SKILL_COLLISION_PRECEDENCE: Readonly<
  Record<AgentSkillCollisionOrigin, number>
> = Object.freeze({
  project: 400,
  user: 300,
  imported: 200,
  'aiwg-managed': 100,
});

export function resolveAgentSkillCollision(
  origins: readonly AgentSkillCollisionOrigin[],
): AgentSkillCollisionOrigin | undefined {
  return origins.reduce<AgentSkillCollisionOrigin | undefined>((winner, origin) => {
    if (!winner) return origin;
    return AGENT_SKILL_COLLISION_PRECEDENCE[origin]
      > AGENT_SKILL_COLLISION_PRECEDENCE[winner]
      ? origin
      : winner;
  }, undefined);
}

/**
 * Return a deterministic strict projection. AIWG control fields and unknown
 * external fields have no code path into this object.
 */
export function projectStrictAgentSkill(
  document: AgentSkillDocument,
): AgentSkillsStandardMetadata {
  const { standard } = document;
  const projection: AgentSkillsStandardMetadata = {
    name: standard.name,
    description: standard.description,
  };

  if (standard.license !== undefined) projection.license = standard.license;
  if (standard.compatibility !== undefined) {
    projection.compatibility = standard.compatibility;
  }
  if (standard.metadata !== undefined) {
    projection.metadata = { ...standard.metadata };
  }
  const allowedTools =
    standard['allowed-tools'] ?? equivalentPortableAllowedTools(document.aiwg);
  if (allowedTools !== undefined) {
    projection['allowed-tools'] = allowedTools;
  }

  return projection;
}

/**
 * Only the direct AIWG `allowedTools` policy has equivalent pre-approval
 * semantics. Legacy `commandHint.allowedTools` describes command generation and
 * must not be translated to the portable field.
 */
export function equivalentPortableAllowedTools(
  aiwg: AiwgSkillControlMetadata,
): string | undefined {
  if (
    !Array.isArray(aiwg.allowedTools)
    || !aiwg.allowedTools.every((tool): tool is string => (
      typeof tool === 'string' && tool.trim().length > 0 && !/\s/.test(tool)
    ))
  ) {
    return undefined;
  }
  return aiwg.allowedTools.join(' ');
}

export function createAgentSkillSidecar(
  document: AgentSkillDocument,
  provenance: AgentSkillProvenance,
  validationProfile: AgentSkillValidationProfile,
  trust: AgentSkillSidecarV1['trust'],
): AgentSkillSidecarV1 {
  return {
    $schema: AGENT_SKILLS_SIDECAR_SCHEMA,
    schemaVersion: 1,
    aiwg: structuredClone(document.aiwg),
    provenance: structuredClone(provenance),
    validationProfile,
    trust: { ...trust },
  };
}

/**
 * Restore AIWG metadata omitted at a strict portability boundary. Portable
 * content remains authoritative for standard fields, body, and resources.
 */
export function restoreAgentSkillFromSidecar(
  standard: AgentSkillsStandardMetadata,
  body: string,
  resources: readonly AgentSkillResource[],
  sidecar: AgentSkillSidecarV1,
): AgentSkillDocument {
  return {
    standard: structuredClone(standard),
    body,
    resources: resources.map((resource) => ({ ...resource })),
    aiwg: structuredClone(sidecar.aiwg),
    unknownFields: [],
  };
}
