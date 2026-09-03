import type { DiagnosticSeverity, SchemaDiagnostic } from './types.js'

export const SCHEMA_DIAGNOSTIC_CODES = {
  invalidCatalog: 'SCHEMA_CATALOG_INVALID',
  invalidManifest: 'SCHEMA_MANIFEST_INVALID',
  duplicateId: 'SCHEMA_DUPLICATE_ID',
  duplicateNameVersion: 'SCHEMA_DUPLICATE_NAME_VERSION',
  duplicateAuthority: 'SCHEMA_DUPLICATE_AUTHORITY',
  missingPath: 'SCHEMA_PATH_MISSING',
  pathOutsideRoot: 'SCHEMA_PATH_OUTSIDE_ROOT',
  digestMismatch: 'SCHEMA_DIGEST_MISMATCH',
  unresolvedDependency: 'SCHEMA_DEPENDENCY_UNRESOLVED',
  undeclaredCanonical: 'SCHEMA_CANONICAL_UNREGISTERED',
  undeclaredMirror: 'SCHEMA_MIRROR_UNDECLARED',
  expiredException: 'SCHEMA_POLICY_EXCEPTION_EXPIRED',
} as const

export function createDiagnostic(
  code: string,
  message: string,
  options: {
    severity?: DiagnosticSeverity
    artifactId?: string
    path?: string
    details?: Record<string, unknown>
  } = {},
): SchemaDiagnostic {
  return {
    code,
    severity: options.severity ?? 'error',
    message,
    ...(options.artifactId === undefined ? {} : { artifactId: options.artifactId }),
    ...(options.path === undefined ? {} : { path: options.path }),
    ...(options.details === undefined ? {} : { details: options.details }),
  }
}

export function hasSchemaErrors(diagnostics: readonly SchemaDiagnostic[]): boolean {
  return diagnostics.some((diagnostic) => diagnostic.severity === 'error')
}

export class SchemaCatalogError extends Error {
  readonly diagnostics: readonly SchemaDiagnostic[]

  constructor(message: string, diagnostics: readonly SchemaDiagnostic[]) {
    super(message)
    this.name = 'SchemaCatalogError'
    this.diagnostics = diagnostics
  }
}
