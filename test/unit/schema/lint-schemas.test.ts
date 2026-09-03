import { afterEach, describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const projectRoot = resolve(import.meta.dirname, '../../..')
const temporaryDirectories: string[] = []

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true })
  }
})

describe('schema lint control-plane report', () => {
  it('keeps the generated repository catalog deterministic and current', () => {
    expect(() => execFileSync(process.execPath, ['tools/scripts/build-schema-catalog.mjs', '--check'], { cwd: projectRoot, stdio: 'pipe' })).not.toThrow()
  })

  it('uses the composed catalog, denies network resolution, and emits deterministic inventory fields', () => {
    const directory = mkdtempSync(join(tmpdir(), 'aiwg-schema-lint-'))
    temporaryDirectories.push(directory)
    const reportPath = join(directory, 'report.json')

    execFileSync(process.execPath, ['tools/scripts/lint-schemas.mjs', '--report-json', reportPath], {
      cwd: projectRoot,
      stdio: 'pipe',
    })

    const report = JSON.parse(readFileSync(reportPath, 'utf8'))
    expect(report.inventoryMode).toBe('catalog')
    expect(report.networkResolution).toBe('deny')
    expect(report.policy.strictDefault).toBe(true)
    expect(report.resources.length).toBeGreaterThan(0)
    expect(report.resources.every((resource: { compiled: boolean }) => resource.compiled)).toBe(true)
    expect(report.discoveredResources).toEqual([...report.discoveredResources].sort())
    expect(report.diagnostics.some((item: { code: string }) => item.code === 'SCHEMA_CATALOG_MISSING')).toBe(false)
  })

  it('governs exceptions and dependency resolution as security policy', () => {
    const exceptions = JSON.parse(readFileSync(join(projectRoot, 'schemas/policy/strict-exceptions.json'), 'utf8'))
    for (const exception of exceptions.exceptions) {
      expect(exception).toEqual(expect.objectContaining({
        resource: expect.any(String),
        rule: expect.any(String),
        owner: expect.any(String),
        rationale: expect.any(String),
        approvedBy: expect.any(String),
        expires: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      }))
    }

    const lock = JSON.parse(readFileSync(join(projectRoot, 'schemas/policy/dependency-lock.json'), 'utf8'))
    expect(lock.networkResolution).toBe('deny')
    for (const dependency of lock.dependencies) {
      expect(dependency).toEqual(expect.objectContaining({
        uri: expect.any(String), dialect: expect.any(String), source: expect.any(String),
        version: expect.any(String), sha256: expect.stringMatching(/^sha256:[a-f0-9]{64}$/),
      }))
    }
  })

  it('documents every required schema execution threat', () => {
    const threatModel = readFileSync(join(projectRoot, 'docs/security/schema-execution-threat-model.md'), 'utf8')
    for (const threat of [
      'Reference substitution', 'Namespace collision', 'Malicious regex', 'Resource exhaustion',
      'Diagnostic leakage', 'Projection tampering', 'Undeclared-schema bypass',
    ]) {
      expect(threatModel).toContain(threat)
    }
  })
})
