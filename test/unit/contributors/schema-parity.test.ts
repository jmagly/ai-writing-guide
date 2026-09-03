import { readFileSync } from 'node:fs'
import Ajv2020 from 'ajv/dist/2020.js'
import { describe, expect, it } from 'vitest'
import { validateContributor } from '../../../src/contributors/validation.js'

const paths = {
  status: 'agentic/code/addons/aiwg-utils/skills/project-status/contributor.schema.json',
  research: 'agentic/code/frameworks/research-complete/skills/best-practices-audit/contributor.schema.json',
} as const
const ajv = new Ajv2020({ strict: true, allErrors: true })
const validators = Object.fromEntries(Object.entries(paths).map(([kind, path]) => [kind, ajv.compile(JSON.parse(readFileSync(path, 'utf8')))]))
const fixtures: Record<string, unknown>[] = [
  { kind: 'status', domain: 'SDLC', description: 'state', detect: { glob: ['**/*.md'] } },
  { kind: 'status', domain: '', description: 'state', detect: { glob: ['**/*.md'] } },
  { kind: 'research', domain: 'schema', description: 'research', detect: { glob: ['schemas/**'] }, focus_areas: ['governance'] },
  { kind: 'research', domain: 'schema', description: 'research', detect: { glob: [] }, focus_areas: [] },
]

describe('contributor schema projection parity', () => {
  it.each(fixtures)('keeps Zod authority and JSON Schema projection aligned for $kind', fixture => {
    const schemaResult = validators[fixture.kind]?.(fixture) ?? false
    expect(schemaResult).toBe(validateContributor(fixture).ok)
  })
})
