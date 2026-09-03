import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path'

import { createDiagnostic, hasSchemaErrors, SCHEMA_DIAGNOSTIC_CODES } from './diagnostics.js'
import { diagnosePolicy, resolveEffectivePolicy } from './policy.js'
import type {
  CompiledSchemaCatalog,
  CompiledSchemaEntry,
  SchemaArtifact,
  SchemaCatalogResult,
  SchemaCatalogSource,
  SchemaDiagnostic,
  SchemaDomainManifest,
} from './types.js'

export interface LoadSchemaCatalogOptions extends CompileSchemaCatalogOptions {
  catalogPath?: string
}

export interface CompileSchemaCatalogOptions {
  rootDir: string
  inventoryRoots?: string[]
  now?: Date
}

function parseJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8')) as unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isDomainManifest(value: unknown): value is SchemaDomainManifest {
  return (
    isRecord(value) &&
    value.schemaVersion === '1' &&
    typeof value.domain === 'string' &&
    isRecord(value.owner) &&
    typeof value.owner.id === 'string' &&
    Array.isArray(value.artifacts)
  )
}

function isCatalogSource(value: unknown): value is SchemaCatalogSource {
  return isRecord(value) && value.schemaVersion === '1' && Array.isArray(value.domains)
}

function safePath(rootDir: string, path: string): string | undefined {
  const absolute = resolve(rootDir, path)
  const rel = relative(resolve(rootDir), absolute)
  return rel === '' || (!rel.startsWith(`..${sep}`) && rel !== '..' && !isAbsolute(rel)) ? absolute : undefined
}

function sha256(path: string): string {
  return `sha256:${createHash('sha256').update(readFileSync(path)).digest('hex')}`
}

function validateArtifactShape(artifact: SchemaArtifact, domain: string): SchemaDiagnostic[] {
  const diagnostics: SchemaDiagnostic[] = []
  const required: Array<keyof SchemaArtifact> = [
    'logicalName',
    'id',
    'version',
    'format',
    'lifecycle',
    'owner',
    'authority',
  ]
  for (const field of required) {
    if (artifact[field] === undefined || artifact[field] === '') {
      diagnostics.push(
        createDiagnostic(
          SCHEMA_DIAGNOSTIC_CODES.invalidManifest,
          `Artifact in domain ${domain} is missing required field ${field}`,
          { artifactId: artifact.id },
        ),
      )
    }
  }
  if (artifact.format === 'json-schema' && !artifact.dialect) {
    diagnostics.push(
      createDiagnostic(SCHEMA_DIAGNOSTIC_CODES.invalidManifest, 'JSON Schema artifacts require a dialect', {
        artifactId: artifact.id,
      }),
    )
  }
  if (artifact.lifecycle === 'deprecated' && artifact.deprecation === undefined) {
    diagnostics.push(
      createDiagnostic(SCHEMA_DIAGNOSTIC_CODES.invalidManifest, 'Deprecated artifacts require deprecation data', {
        artifactId: artifact.id,
      }),
    )
  }
  return diagnostics
}

function walkSchemaFiles(root: string): string[] {
  if (!existsSync(root)) return []
  const result: string[] = []
  for (const entry of readdirSync(root).sort()) {
    const path = resolve(root, entry)
    const stat = statSync(path)
    if (stat.isDirectory()) result.push(...walkSchemaFiles(path))
    else if (/\.schema\.json$/u.test(entry)) result.push(path)
  }
  return result
}

function readSchemaId(path: string): string | undefined {
  try {
    const value = parseJson(path)
    return isRecord(value) && typeof value.$id === 'string' ? value.$id : undefined
  } catch {
    return undefined
  }
}

export function compileSchemaCatalog(
  source: SchemaCatalogSource,
  manifests: readonly SchemaDomainManifest[],
  options: CompileSchemaCatalogOptions,
): SchemaCatalogResult {
  const rootDir = resolve(options.rootDir)
  const diagnostics: SchemaDiagnostic[] = []
  const entries: CompiledSchemaEntry[] = []
  const ids = new Map<string, string>()
  const names = new Map<string, string>()
  const authorities = new Map<string, string>()
  const declaredPaths = new Map<string, { id: string; projection: boolean }>()

  for (const manifest of [...manifests].sort((a, b) => a.domain.localeCompare(b.domain))) {
    for (const artifact of [...manifest.artifacts].sort((a, b) =>
      `${a.logicalName}\0${a.version}\0${a.id}`.localeCompare(`${b.logicalName}\0${b.version}\0${b.id}`),
    )) {
      diagnostics.push(...validateArtifactShape(artifact, manifest.domain))
      const nameVersion = `${artifact.logicalName}@${artifact.version}`
      if (ids.has(artifact.id)) {
        diagnostics.push(createDiagnostic(SCHEMA_DIAGNOSTIC_CODES.duplicateId, `Duplicate schema id ${artifact.id}`, { artifactId: artifact.id, details: { firstDomain: ids.get(artifact.id), secondDomain: manifest.domain } }))
      } else ids.set(artifact.id, manifest.domain)
      if (names.has(nameVersion)) {
        diagnostics.push(createDiagnostic(SCHEMA_DIAGNOSTIC_CODES.duplicateNameVersion, `Duplicate schema name and version ${nameVersion}`, { artifactId: artifact.id }))
      } else names.set(nameVersion, artifact.id)

      let digest = artifact.digest
      if (artifact.authority.kind === 'canonical') {
        const canonicalPath = artifact.authority.path
        if (!canonicalPath) {
          diagnostics.push(createDiagnostic(SCHEMA_DIAGNOSTIC_CODES.invalidManifest, 'Canonical authority requires a path', { artifactId: artifact.id }))
        } else {
          const absolute = safePath(rootDir, canonicalPath)
          if (!absolute) diagnostics.push(createDiagnostic(SCHEMA_DIAGNOSTIC_CODES.pathOutsideRoot, `Authority path escapes repository root: ${canonicalPath}`, { artifactId: artifact.id, path: canonicalPath }))
          else if (!existsSync(absolute)) diagnostics.push(createDiagnostic(SCHEMA_DIAGNOSTIC_CODES.missingPath, `Authority path does not exist: ${canonicalPath}`, { artifactId: artifact.id, path: canonicalPath }))
          else {
            const normalized = relative(rootDir, absolute).split(sep).join('/')
            const previous = authorities.get(normalized)
            if (previous) diagnostics.push(createDiagnostic(SCHEMA_DIAGNOSTIC_CODES.duplicateAuthority, `Canonical path ${normalized} is claimed by ${previous} and ${artifact.id}`, { artifactId: artifact.id, path: normalized }))
            else authorities.set(normalized, artifact.id)
            declaredPaths.set(normalized, { id: artifact.id, projection: false })
            const actual = sha256(absolute)
            if (digest && digest !== actual) diagnostics.push(createDiagnostic(SCHEMA_DIAGNOSTIC_CODES.digestMismatch, `Digest mismatch for ${normalized}`, { artifactId: artifact.id, path: normalized, details: { declared: digest, actual } }))
            digest = actual
          }
        }
      }

      for (const projection of artifact.projections ?? []) {
        const absolute = safePath(rootDir, projection.path)
        if (!absolute) diagnostics.push(createDiagnostic(SCHEMA_DIAGNOSTIC_CODES.pathOutsideRoot, `Projection path escapes repository root: ${projection.path}`, { artifactId: artifact.id, path: projection.path }))
        else if (!existsSync(absolute)) diagnostics.push(createDiagnostic(SCHEMA_DIAGNOSTIC_CODES.missingPath, `Projection path does not exist: ${projection.path}`, { artifactId: artifact.id, path: projection.path }))
        else {
          const normalized = relative(rootDir, absolute).split(sep).join('/')
          declaredPaths.set(normalized, { id: artifact.id, projection: true })
          if (projection.digest && projection.digest !== sha256(absolute)) diagnostics.push(createDiagnostic(SCHEMA_DIAGNOSTIC_CODES.digestMismatch, `Projection digest mismatch for ${normalized}`, { artifactId: artifact.id, path: normalized }))
        }
      }

      const effectivePolicy = resolveEffectivePolicy(source.policy, manifest, artifact)
      diagnostics.push(...diagnosePolicy(effectivePolicy, artifact.id, options.now))
      if (effectivePolicy.requireDigest && artifact.digest === undefined) {
        diagnostics.push(createDiagnostic(SCHEMA_DIAGNOSTIC_CODES.invalidManifest, 'Effective policy requires a declared digest', { artifactId: artifact.id }))
      }
      entries.push({ artifact, domain: manifest.domain, ...(digest === undefined ? {} : { digest }), effectivePolicy })
    }
  }

  for (const entry of entries) {
    for (const dependency of entry.artifact.dependencies ?? []) {
      if (!ids.has(dependency.id)) diagnostics.push(createDiagnostic(SCHEMA_DIAGNOSTIC_CODES.unresolvedDependency, `Unresolved dependency ${dependency.id}`, { artifactId: entry.artifact.id, details: { dependency: dependency.id } }))
    }
  }

  for (const inventoryRoot of options.inventoryRoots ?? []) {
    const absoluteRoot = safePath(rootDir, inventoryRoot)
    if (!absoluteRoot) {
      diagnostics.push(createDiagnostic(SCHEMA_DIAGNOSTIC_CODES.pathOutsideRoot, `Inventory root escapes repository root: ${inventoryRoot}`, { path: inventoryRoot }))
      continue
    }
    for (const file of walkSchemaFiles(absoluteRoot)) {
      const normalized = relative(rootDir, file).split(sep).join('/')
      if (!declaredPaths.has(normalized)) {
        const schemaId = readSchemaId(file)
        const canonical = schemaId === undefined ? undefined : entries.find((entry) => entry.artifact.id === schemaId)
        diagnostics.push(
          createDiagnostic(
            canonical ? SCHEMA_DIAGNOSTIC_CODES.undeclaredMirror : SCHEMA_DIAGNOSTIC_CODES.undeclaredCanonical,
            canonical
              ? `Schema file shares ${schemaId} but is not declared as a mirror: ${normalized}`
              : `Schema file is not registered: ${normalized}`,
            { path: normalized, ...(schemaId === undefined ? {} : { details: { schemaId } }) },
          ),
        )
      }
    }
  }

  entries.sort((a, b) => `${a.artifact.id}\0${a.artifact.version}`.localeCompare(`${b.artifact.id}\0${b.artifact.version}`))
  const catalog: CompiledSchemaCatalog = { schemaVersion: '1', entries, domains: [...new Set(manifests.map((manifest) => manifest.domain))].sort() }
  return { catalog, diagnostics, valid: !hasSchemaErrors(diagnostics) }
}

export function loadSchemaCatalog(options: LoadSchemaCatalogOptions): SchemaCatalogResult {
  const rootDir = resolve(options.rootDir)
  const catalogPath = resolve(rootDir, options.catalogPath ?? 'schemas/catalog/catalog.json')
  const diagnostics: SchemaDiagnostic[] = []
  if (!existsSync(catalogPath)) {
    diagnostics.push(createDiagnostic(SCHEMA_DIAGNOSTIC_CODES.missingPath, `Catalog does not exist: ${relative(rootDir, catalogPath)}`, { path: relative(rootDir, catalogPath) }))
    return { diagnostics, valid: false }
  }

  let source: unknown
  try { source = parseJson(catalogPath) } catch (error) {
    diagnostics.push(createDiagnostic(SCHEMA_DIAGNOSTIC_CODES.invalidCatalog, `Cannot parse catalog: ${error instanceof Error ? error.message : String(error)}`, { path: relative(rootDir, catalogPath) }))
    return { diagnostics, valid: false }
  }
  if (!isCatalogSource(source)) {
    diagnostics.push(createDiagnostic(SCHEMA_DIAGNOSTIC_CODES.invalidCatalog, 'Catalog must use schemaVersion 1 and contain a domains array', { path: relative(rootDir, catalogPath) }))
    return { diagnostics, valid: false }
  }

  const manifests: SchemaDomainManifest[] = []
  for (const item of source.domains) {
    let candidate: unknown = item
    let path: string | undefined
    if (typeof item === 'string') {
      path = resolve(dirname(catalogPath), item)
      if (!safePath(rootDir, relative(rootDir, path))) {
        diagnostics.push(createDiagnostic(SCHEMA_DIAGNOSTIC_CODES.pathOutsideRoot, `Domain manifest escapes repository root: ${item}`, { path: item }))
        continue
      }
      if (!existsSync(path)) {
        diagnostics.push(createDiagnostic(SCHEMA_DIAGNOSTIC_CODES.missingPath, `Domain manifest does not exist: ${item}`, { path: item }))
        continue
      }
      try { candidate = parseJson(path) } catch (error) {
        diagnostics.push(createDiagnostic(SCHEMA_DIAGNOSTIC_CODES.invalidManifest, `Cannot parse domain manifest ${item}: ${error instanceof Error ? error.message : String(error)}`, { path: item }))
        continue
      }
    }
    if (!isDomainManifest(candidate)) {
      diagnostics.push(createDiagnostic(SCHEMA_DIAGNOSTIC_CODES.invalidManifest, 'Domain manifest must use schemaVersion 1 and contain domain, owner, and artifacts', path ? { path: relative(rootDir, path) } : {}))
      continue
    }
    manifests.push(candidate)
  }

  const result = compileSchemaCatalog(source, manifests, options)
  return { catalog: result.catalog, diagnostics: [...diagnostics, ...result.diagnostics], valid: diagnostics.length === 0 && result.valid }
}

/** Serialize compiler output without timestamps or filesystem-specific data. */
export function serializeCompiledSchemaCatalog(catalog: CompiledSchemaCatalog): string {
  return `${JSON.stringify(catalog, null, 2)}\n`
}
