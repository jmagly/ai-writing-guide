import { readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import Ajv2020 from 'ajv/dist/2020.js'
import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import yaml from 'js-yaml'
import { describe, expect, it } from 'vitest'

const ROOT = resolve('agentic/code/addons/dataset-intelligence')
const read = (path: string) => readFileSync(resolve(ROOT, path), 'utf8')
const json = (path: string) => JSON.parse(read(path))
const files = (dir: string): string[] => readdirSync(resolve(ROOT, dir)).flatMap(name => {
  const path = `${dir}/${name}`
  return statSync(resolve(ROOT, path)).isDirectory() ? files(path) : [path]
})

describe('dataset-intelligence addon', () => {
  it('declares a complete core surface with one kernel router', () => {
    const manifest = json('manifest.json')
    expect(manifest).toMatchObject({
      id: 'dataset-intelligence', type: 'addon', core: true, autoInstall: true,
      cli: { namespace: 'dataset', delegation: 'aiwg dataset', shadowRuntime: false },
    })
    expect(manifest.agents).toHaveLength(4)
    expect(manifest.skills).toHaveLength(10)
    expect(manifest.capabilities).toHaveLength(9)
    expect(manifest.flows).toHaveLength(3)
    for (const name of manifest.agents) expect(files('agents')).toContain(`agents/${name}.md`)
    for (const name of manifest.skills) expect(files('skills')).toContain(`skills/${name}/SKILL.md`)
    for (const name of manifest.rules) expect(files('rules')).toContain(`rules/${name}.md`)
    for (const name of manifest.schemas) expect(files('schemas')).toContain(`schemas/${name}.schema.json`)
    for (const name of manifest.flows) expect(files('flows')).toContain(`flows/${name}.yaml`)
    const kernelSkills = manifest.skills.filter((name: string) => read(`skills/${name}/SKILL.md`).match(/^kernel:\s*true$/m))
    expect(kernelSkills).toEqual(['dataset-intelligence'])
  })

  it('validates both governed schemas and positive/negative fixtures', () => {
    const ajv = new Ajv2020({ allErrors: true, strict: false })
    addFormats(ajv)
    for (const name of ['dataset-intake.v1', 'dataset-workflow-handoff.v1']) {
      const schema = json(`schemas/${name}.schema.json`)
      const validate = ajv.compile(schema)
      const validFixtures = name === 'dataset-intake.v1'
        ? ['dataset-intake.v1.json']
        : ['dataset-workflow-handoff.v1.json', 'dataset-workflow-cancelled.v1.json', 'dataset-workflow-degraded.v1.json', 'dataset-workflow-retired.v1.json']
      const invalid = json(`examples/invalid/${name}.json`)
      for (const fixture of validFixtures) {
        expect(validate(json(`examples/valid/${fixture}`)), `${fixture}: ${JSON.stringify(validate.errors)}`).toBe(true)
      }
      expect(validate(invalid), `${name} accepted its adversarial fixture`).toBe(false)
    }
    const catalog = JSON.parse(readFileSync(resolve('schemas/catalog/domains/dataset.json'), 'utf8'))
    const logicalNames = new Set(catalog.artifacts.map((item: any) => item.logicalName))
    expect(logicalNames).toContain('dataset.addon-intake')
    expect(logicalNames).toContain('dataset.addon-workflow-handoff')
  })

  it('validates all flow capabilities and stable-reference playbooks', () => {
    const ajv = new Ajv({ allErrors: true, strict: false })
    addFormats(ajv)
    const playbookSchema = JSON.parse(readFileSync(resolve('agentic/code/addons/aiwg-utils/workflow/schemas/workflow-playbook.schema.json'), 'utf8'))
    const capabilitySchema = JSON.parse(readFileSync(resolve('agentic/code/addons/aiwg-utils/workflow/schemas/workflow-capability.schema.json'), 'utf8'))
    const validatePlaybook = ajv.compile(playbookSchema)
    const validateCapability = ajv.compile(capabilitySchema)
    const capabilityNames = new Set(files('flows/capabilities').map(path => {
      const capability: any = yaml.load(read(path))
      expect(validateCapability(capability), `${path}: ${JSON.stringify(validateCapability.errors)}`).toBe(true)
      expect(capability.metadata.annotations.boundary).toMatch(/aiwg-dataset|human-review/)
      return capability.metadata.name
    }))
    expect(capabilityNames.size).toBe(9)
    for (const path of files('flows').filter(path => !path.includes('/capabilities/'))) {
      const playbook: any = yaml.load(read(path))
      expect(validatePlaybook(playbook), `${path}: ${JSON.stringify(validatePlaybook.errors)}`).toBe(true)
      for (const step of playbook.spec.steps) if (step.capability) expect(capabilityNames.has(step.capability)).toBe(true)
      expect(read(path)).toContain('stable-artifact-references')
    }
  })

  it('keeps execution at the shared CLI boundary and exposes lifecycle safety', () => {
    const mutationSkills = ['dataset-ingest', 'dataset-export', 'dataset-retire']
    for (const name of mutationSkills) expect(read(`skills/${name}/SKILL.md`)).toContain('aiwg dataset')
    const allGuidance = [
      ...files('agents').map(read), ...files('commands').map(read), ...files('skills').map(read),
      ...files('rules').map(read), ...files('flows').map(read),
    ].join('\n')
    expect(allGuidance).not.toMatch(/(?:curl|fetch\(|axios|sqlite3|INSERT INTO|DELETE FROM|process\.env|Deno\.env|Bun\.env)/)
    expect(allGuidance).toContain('last committed checkpoint')
    expect(allGuidance).toMatch(/cancell?ation/i)
    expect(allGuidance).toMatch(/tombstone/i)
    expect(allGuidance).toMatch(/Fortemi shard/i)
    expect(allGuidance).toMatch(/derived|regenerable/)
    expect(allGuidance).toMatch(/degrad/)
  })

  it('supports novice and domain-specific discovery without forking contracts', () => {
    const router = read('skills/dataset-intelligence/SKILL.md')
    for (const phrase of ['use this data', 'make this searchable', 'index my files', 'trace this dataset', 'sync this source', 'retire this dataset']) {
      expect(router).toContain(phrase)
    }
    for (const domain of ['SDLC', 'research', 'knowledge-base', 'media', 'marketing', 'ops', 'project-local']) {
      expect(router).toContain(domain)
    }
    const intake = json('examples/valid/dataset-intake.v1.json')
    expect(intake.source).not.toHaveProperty('credential')
    expect(intake.source).toHaveProperty('credentialRef')
  })

  it('publishes synchronized user guidance and language-map routes', () => {
    for (const path of files('docs')) {
      const relative = path.slice('docs/'.length)
      expect(readFileSync(resolve('docs/addons/dataset-intelligence', relative), 'utf8')).toBe(read(path))
    }
    const map = readFileSync(resolve('agentic/code/addons/aiwg-utils/skills/aiwg-language-map/SKILL.md'), 'utf8')
    expect(map).toContain('### Dataset intelligence, indexing & provenance')
    expect(map).toContain('`make this searchable` | dataset-intelligence')
  })
})
