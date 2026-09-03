import { relative, resolve, sep } from 'node:path'

import type { CompiledSchemaCatalog, CompiledSchemaEntry, EffectiveSchemaPolicy } from './types.js'

export interface SchemaGraphNode {
  id: string
  logicalName: string
  version: string
  domain: string
}

export interface SchemaGraphEdge {
  from: string
  to: string
  kind: 'depends-on' | 'supersedes'
}

export interface SchemaGraph {
  nodes: SchemaGraphNode[]
  edges: SchemaGraphEdge[]
}

export class SchemaResolver {
  readonly catalog: CompiledSchemaCatalog
  readonly rootDir?: string
  private readonly index = new Map<string, CompiledSchemaEntry>()

  constructor(catalog: CompiledSchemaCatalog, options: { rootDir?: string } = {}) {
    this.catalog = catalog
    this.rootDir = options.rootDir === undefined ? undefined : resolve(options.rootDir)
    for (const entry of catalog.entries) {
      this.index.set(entry.artifact.id, entry)
      this.index.set(`${entry.artifact.logicalName}@${entry.artifact.version}`, entry)
      // The unqualified logical name resolves to the last deterministically
      // ordered revision. Callers requiring reproducibility should use id or
      // name@version.
      this.index.set(entry.artifact.logicalName, entry)
      for (const alias of entry.artifact.aliases ?? []) this.index.set(alias, entry)
      if (entry.artifact.authority.path) {
        const normalized = entry.artifact.authority.path.split('\\').join('/')
        this.index.set(normalized, entry)
        if (this.rootDir) this.index.set(relative(this.rootDir, resolve(this.rootDir, normalized)).split(sep).join('/'), entry)
      }
    }
  }

  list(options: { domain?: string; lifecycle?: string; format?: string } = {}): CompiledSchemaEntry[] {
    return this.catalog.entries.filter((entry) =>
      (options.domain === undefined || entry.domain === options.domain) &&
      (options.lifecycle === undefined || entry.artifact.lifecycle === options.lifecycle) &&
      (options.format === undefined || entry.artifact.format === options.format),
    )
  }

  resolve(query: string): CompiledSchemaEntry | undefined {
    return this.index.get(query) ?? this.index.get(query.split('\\').join('/'))
  }

  require(query: string): CompiledSchemaEntry {
    const entry = this.resolve(query)
    if (!entry) throw new Error(`Unknown schema: ${query}`)
    return entry
  }

  policy(query: string): EffectiveSchemaPolicy {
    return this.require(query).effectivePolicy
  }

  graph(query?: string, options: { direction?: 'dependencies' | 'dependents' | 'both' } = {}): SchemaGraph {
    const direction = options.direction ?? 'both'
    const allEdges: SchemaGraphEdge[] = []
    for (const entry of this.catalog.entries) {
      for (const dependency of entry.artifact.dependencies ?? []) allEdges.push({ from: entry.artifact.id, to: dependency.id, kind: 'depends-on' })
      for (const superseded of entry.artifact.supersedes ?? []) allEdges.push({ from: entry.artifact.id, to: superseded, kind: 'supersedes' })
    }
    const selected = query === undefined ? new Set(this.catalog.entries.map((entry) => entry.artifact.id)) : this.collectConnected(this.require(query).artifact.id, allEdges, direction)
    return {
      nodes: this.catalog.entries.filter((entry) => selected.has(entry.artifact.id)).map((entry) => ({ id: entry.artifact.id, logicalName: entry.artifact.logicalName, version: entry.artifact.version, domain: entry.domain })).sort((a, b) => a.id.localeCompare(b.id)),
      edges: allEdges.filter((edge) => selected.has(edge.from) && selected.has(edge.to)).sort((a, b) => `${a.from}\0${a.to}\0${a.kind}`.localeCompare(`${b.from}\0${b.to}\0${b.kind}`)),
    }
  }

  private collectConnected(seed: string, edges: readonly SchemaGraphEdge[], direction: 'dependencies' | 'dependents' | 'both'): Set<string> {
    const result = new Set([seed])
    const queue = [seed]
    while (queue.length) {
      const current = queue.shift()
      if (!current) continue
      for (const edge of edges) {
        const next = edge.from === current && direction !== 'dependents' ? edge.to : edge.to === current && direction !== 'dependencies' ? edge.from : undefined
        if (next && !result.has(next)) { result.add(next); queue.push(next) }
      }
    }
    return result
  }
}
