import { createDiagnostic, SCHEMA_DIAGNOSTIC_CODES } from './diagnostics.js'
import type {
  EffectiveSchemaPolicy,
  SchemaArtifact,
  SchemaDiagnostic,
  SchemaDomainManifest,
  SchemaPolicy,
} from './types.js'

export const DEFAULT_SCHEMA_POLICY: Required<Omit<SchemaPolicy, 'exceptions'>> & {
  exceptions: []
} = {
  strict: true,
  remoteReferences: 'deny',
  compatibility: 'unknown',
  requireFixtures: false,
  requireDigest: false,
  exceptions: [],
}

export function resolveEffectivePolicy(
  repositoryPolicy: SchemaPolicy | undefined,
  domain: Pick<SchemaDomainManifest, 'domain' | 'policy'>,
  artifact: Pick<SchemaArtifact, 'policy' | 'compatibility'>,
): EffectiveSchemaPolicy {
  const layers = [repositoryPolicy, domain.policy, artifact.policy]
  const merged: SchemaPolicy = {}
  for (const layer of layers) {
    if (layer === undefined) continue
    if (layer.strict !== undefined) merged.strict = layer.strict
    if (layer.remoteReferences !== undefined) merged.remoteReferences = layer.remoteReferences
    if (layer.compatibility !== undefined) merged.compatibility = layer.compatibility
    if (layer.requireFixtures !== undefined) merged.requireFixtures = layer.requireFixtures
    if (layer.requireDigest !== undefined) merged.requireDigest = layer.requireDigest
    if (layer.exceptions !== undefined) merged.exceptions = [...(merged.exceptions ?? []), ...layer.exceptions]
  }

  if (artifact.compatibility?.mode !== undefined && artifact.policy?.compatibility === undefined) {
    merged.compatibility = artifact.compatibility.mode
  }

  return {
    strict: merged.strict ?? DEFAULT_SCHEMA_POLICY.strict,
    remoteReferences: merged.remoteReferences ?? DEFAULT_SCHEMA_POLICY.remoteReferences,
    compatibility: merged.compatibility ?? DEFAULT_SCHEMA_POLICY.compatibility,
    requireFixtures: merged.requireFixtures ?? DEFAULT_SCHEMA_POLICY.requireFixtures,
    requireDigest: merged.requireDigest ?? DEFAULT_SCHEMA_POLICY.requireDigest,
    exceptions: [...(merged.exceptions ?? [])].sort((left, right) =>
      `${left.rule}\0${left.expires}`.localeCompare(`${right.rule}\0${right.expires}`),
    ),
    provenance: [
      ...(repositoryPolicy === undefined ? [] : [{ source: 'repository' as const, value: repositoryPolicy }]),
      ...(domain.policy === undefined
        ? []
        : [{ source: 'domain' as const, domain: domain.domain, value: domain.policy }]),
      ...(artifact.policy === undefined ? [] : [{ source: 'artifact' as const, value: artifact.policy }]),
    ],
  }
}

export function diagnosePolicy(
  policy: EffectiveSchemaPolicy,
  artifactId: string,
  now = new Date(),
): SchemaDiagnostic[] {
  const diagnostics: SchemaDiagnostic[] = []
  for (const exception of policy.exceptions) {
    const expires = new Date(exception.expires)
    if (Number.isNaN(expires.getTime()) || expires.getTime() <= now.getTime()) {
      diagnostics.push(
        createDiagnostic(
          SCHEMA_DIAGNOSTIC_CODES.expiredException,
          `Policy exception ${exception.rule} expired on ${exception.expires}`,
          { artifactId, details: { rule: exception.rule, owner: exception.owner, expires: exception.expires } },
        ),
      )
    }
  }
  return diagnostics
}
