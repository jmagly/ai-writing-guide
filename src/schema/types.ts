export type SchemaFormat =
  | 'json-schema'
  | 'yaml-schema'
  | 'zod'
  | 'typescript-validator'
  | 'sql'
  | 'frontmatter'
  | 'protocol'
  | 'other'

export type SchemaLifecycle = 'experimental' | 'proposed' | 'active' | 'deprecated' | 'retired'
export type SchemaStability = 'unstable' | 'preview' | 'stable'
export type CompatibilityMode = 'backward' | 'forward' | 'full' | 'breaking' | 'none' | 'unknown'
export type DiagnosticSeverity = 'error' | 'warning' | 'info'

export interface SchemaOwner {
  id: string
  contact?: string
}

export interface SchemaPolicyException {
  rule: string
  rationale: string
  owner: string
  approvedBy?: string
  expires: string
}

export interface SchemaPolicy {
  strict?: boolean
  remoteReferences?: 'deny' | 'locked' | 'allow'
  compatibility?: CompatibilityMode
  requireFixtures?: boolean
  requireDigest?: boolean
  exceptions?: SchemaPolicyException[]
}

export interface SchemaDependency {
  id: string
  version?: string
  digest?: string
  optional?: boolean
}

export interface SchemaConsumer {
  id: string
  boundary?: string
  path?: string
  notes?: string
}

export interface SchemaFixtures {
  valid?: string[]
  invalid?: string[]
}

export interface SchemaProjection {
  kind: 'mirror' | 'validator' | 'types' | 'bundle' | 'documentation' | 'other'
  path: string
  digest?: string
  generated?: boolean
}

export interface SchemaDeprecation {
  replacement?: string
  migration?: string
  supportUntil: string
}

export interface SchemaArtifact {
  logicalName: string
  id: string
  version: string
  format: SchemaFormat
  dialect?: string
  lifecycle: SchemaLifecycle
  stability?: SchemaStability
  owner: SchemaOwner
  authority: {
    kind: 'canonical' | 'external'
    path?: string
    uri?: string
  }
  policy?: SchemaPolicy
  compatibility?: {
    mode: CompatibilityMode
    baseline?: string
  }
  dependencies?: SchemaDependency[]
  consumers?: SchemaConsumer[]
  fixtures?: SchemaFixtures
  projections?: SchemaProjection[]
  digest?: string
  aliases?: string[]
  supersedes?: string[]
  deprecation?: SchemaDeprecation
  publication?: {
    public?: boolean
    uri?: string
  }
}

export interface SchemaDomainManifest {
  schemaVersion: '1'
  domain: string
  owner: SchemaOwner
  policy?: SchemaPolicy
  artifacts: SchemaArtifact[]
}

export interface SchemaCatalogSource {
  schemaVersion: '1'
  generatedAt?: string
  policy?: SchemaPolicy
  domains: Array<string | SchemaDomainManifest>
}

export interface PolicyProvenance {
  source: 'repository' | 'domain' | 'artifact'
  domain?: string
  value: SchemaPolicy
}

export interface EffectiveSchemaPolicy extends Required<Omit<SchemaPolicy, 'exceptions'>> {
  exceptions: SchemaPolicyException[]
  provenance: PolicyProvenance[]
}

export interface CompiledSchemaEntry {
  artifact: SchemaArtifact
  domain: string
  digest?: string
  effectivePolicy: EffectiveSchemaPolicy
}

export interface CompiledSchemaCatalog {
  schemaVersion: '1'
  entries: CompiledSchemaEntry[]
  domains: string[]
}

export interface SchemaDiagnostic {
  code: string
  severity: DiagnosticSeverity
  message: string
  artifactId?: string
  path?: string
  details?: Record<string, unknown>
}

export interface SchemaCatalogResult {
  catalog?: CompiledSchemaCatalog
  diagnostics: SchemaDiagnostic[]
  valid: boolean
}
