import { readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import yaml from 'js-yaml'
import { describe, expect, it } from 'vitest'

const ROOT = resolve('agentic/code/addons/schema-governance')
const read = (path: string) => readFileSync(resolve(ROOT, path), 'utf8')
const files = (dir: string): string[] => readdirSync(resolve(ROOT, dir)).flatMap(name => {
  const path = `${dir}/${name}`
  return statSync(resolve(ROOT, path)).isDirectory() ? files(path) : [path]
})

describe('schema-governance addon', () => {
  it('ships every declared reusable surface and installs as a core default', () => {
    const manifest = JSON.parse(read('manifest.json'))
    expect(manifest).toMatchObject({ id: 'schema-governance', type: 'addon', core: true, autoInstall: true })
    for (const name of manifest.agents) expect(files('agents')).toContain(`agents/${name}.md`)
    for (const name of manifest.skills) expect(files('skills')).toContain(`skills/${name}/SKILL.md`)
    for (const name of manifest.rules) expect(files('rules')).toContain(`rules/${name}.md`)
    for (const name of manifest.flows) expect(files('flows')).toContain(`flows/${name}.yaml`)
    for (const name of manifest.templates) expect(files('templates')).toContain(`templates/${name}.md`)
    for (const name of manifest.commands) expect(files('commands')).toContain(`commands/${name}.md`)
  })

  it('validates its playbooks and capability references', () => {
    const ajv = new Ajv({ allErrors: true, strict: false })
    addFormats(ajv)
    const playbookSchema = JSON.parse(readFileSync(resolve('agentic/code/addons/aiwg-utils/workflow/schemas/workflow-playbook.schema.json'), 'utf8'))
    const capabilitySchema = JSON.parse(readFileSync(resolve('agentic/code/addons/aiwg-utils/workflow/schemas/workflow-capability.schema.json'), 'utf8'))
    const validatePlaybook = ajv.compile(playbookSchema)
    const validateCapability = ajv.compile(capabilitySchema)
    const capabilityNames = new Set(files('flows/capabilities').map(path => {
      const value: any = yaml.load(read(path))
      expect(validateCapability(value), `${path}: ${JSON.stringify(validateCapability.errors)}`).toBe(true)
      return value.metadata.name
    }))
    for (const path of files('flows').filter(path => !path.includes('/capabilities/'))) {
      const value: any = yaml.load(read(path))
      expect(validatePlaybook(value), `${path}: ${JSON.stringify(validatePlaybook.errors)}`).toBe(true)
      for (const step of value.spec.steps) expect(capabilityNames.has(step.capability)).toBe(true)
    }
  })

  it('makes schema creation the SDLC default rather than an expert-only option', () => {
    const intake = read('skills/schema-intake/SKILL.md')
    expect(intake).toContain('required by default')
    expect(intake).toContain('ephemeral internal values')
    const discovery = readFileSync(resolve('agentic/code/frameworks/sdlc-complete/skills/flow-discovery-track/SKILL.md'), 'utf8')
    expect(discovery).toContain('First invoke schema-intake')
    const handoff = readFileSync(resolve('agentic/code/frameworks/sdlc-complete/flows/handoff-checklist-template.md'), 'utf8')
    expect(handoff).toContain('canonical cataloged schema')
    const languageMap = readFileSync(resolve('agentic/code/addons/aiwg-utils/skills/aiwg-language-map/SKILL.md'), 'utf8')
    expect(languageMap).toContain('### Schemas & data contracts')
    expect(languageMap).toContain('`define data shape` | schema-governance')
  })
})
