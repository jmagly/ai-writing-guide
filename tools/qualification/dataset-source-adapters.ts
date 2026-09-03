#!/usr/bin/env node
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import {
  CsvAdapter,
  DirectoryAdapter,
  FileAdapter,
  JsonlAdapter,
  qualifyAdapter,
  request,
  type AdapterQualificationCell,
  type AdapterReadEvent,
  type DatasetSourceAdapter,
} from '../../src/dataset/index.js'

const root = resolve(import.meta.dirname, '../..')
const sources = resolve(root, 'test/fixtures/dataset/adapters/sources')
const fixture = JSON.parse(await readFile(resolve(root, 'test/fixtures/dataset/adapters/qualification-cells.json'), 'utf8')) as { fixtureRevision: string; cells: AdapterQualificationCell[] }
const adapters: Array<{ adapter: DatasetSourceAdapter; config: Record<string, unknown> }> = [
  { adapter: new FileAdapter(), config: { path: 'plain.txt' } },
  { adapter: new DirectoryAdapter(), config: { path: '.', recursive: true } },
  { adapter: new JsonlAdapter(), config: { path: 'records.jsonl' } },
  { adapter: new CsvAdapter(), config: { path: 'records.csv' } },
]

const reports = []
for (const { adapter, config } of adapters) {
  const configured = await adapter.configure(config)
  const evidence: string[] = []
  if (configured.ok) {
    const input = request(`qualification:${adapter.describe().id}`, configured.config!, { offline: true, allowedRoot: sources })
    const discovery = await adapter.discover(input)
    const events: AdapterReadEvent[] = []
    for await (const event of adapter.read(input)) events.push(event)
    if (discovery.ok && events.some(event => event.kind === 'record') && events.at(-1)?.kind === 'checkpoint') evidence.push('native filesystem discovery/read/checkpoint passed')
  }
  const cells = fixture.cells.map(cell => cell.name === 'real-source-cell' ? { ...cell, passed: evidence.length > 0, evidence } : cell)
  reports.push(await qualifyAdapter(adapter, { fixtureRevision: fixture.fixtureRevision, qualifiedAt: new Date().toISOString(), cells }))
}

if (reports.some(report => !report.qualified || !report.stableEligible)) process.exitCode = 1
process.stdout.write(`${JSON.stringify({ schemaVersion: '1', reports }, null, 2)}\n`)
