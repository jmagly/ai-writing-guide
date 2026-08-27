import { describe, expect, it } from 'vitest'

import { componentsFromCargoLock, componentsFromLock, evaluateSocketArtifacts } from '../../../tools/release/socket-post-publish-audit.mjs'

const baseline = {
  policy: { materialScoreDrop: 0.1, blockingSeverities: ['high', 'critical'] },
  packages: {
    aiwg: { scores: { supplyChain: 0.57, quality: 1, maintenance: 0.95, vulnerability: 1, license: 0.7 } },
    '@aiwg/cli': { scores: { supplyChain: 0.57, quality: 1, maintenance: 0.95, vulnerability: 1, license: 1 } }
  },
  reviewedCapabilityAlerts: [{
    package: '*', depth: 'direct', type: 'shellAccess', classification: 'required-capability',
    rationale: 'reviewed reachable shell capability', artifactHash: 'sha256:abc',
    owner: 'maintainers', reviewedOn: '2026-08-01', expiresOn: '2026-11-01'
  }]
}

const roots = [
  { purl: 'pkg:npm/aiwg@2026.8.8', depth: 'direct' },
  { purl: 'pkg:npm/%40aiwg/cli@2026.8.8', depth: 'direct' }
]
const scores = { supplyChain: 0.57, quality: 1, maintenance: 0.95, vulnerability: 1, license: 0.7 }
const behavioralEvidence = {
  artifactHash: 'sha256:abc', file: 'dist/index.js', symbol: 'spawn', ruleId: 'socket:shell-access',
  excerpt: 'spawn(command)', confidenceRationale: 'reachable shell capability requested by the caller'
}

function rootsWith(alerts: unknown[] = [], aiwgScores = scores) {
  return [
    { inputPurl: roots[0].purl, name: 'aiwg', version: '2026.8.8', score: aiwgScores, alerts },
    { inputPurl: roots[1].purl, name: '@aiwg/cli', version: '2026.8.8', score: { ...scores, license: 1 }, alerts: [] }
  ]
}

describe('Socket post-publish audit', () => {
  it('records reviewed direct capability alerts without treating capability as a defect', () => {
    const result = evaluateSocketArtifacts({ artifacts: rootsWith([{ type: 'shellAccess', severity: 'high', ...behavioralEvidence }]), baseline, components: roots, now: new Date('2026-08-14T00:00:00Z') })
    expect(result.status).toBe('pass')
    expect(result.findings.direct[0].review?.classification).toBe('required-capability')
  })

  it('blocks new severe transitive alerts and preserves depth', () => {
    const transitive = { purl: 'pkg:npm/example@1.0.0', depth: 'transitive' }
    const artifacts = [...rootsWith(), { inputPurl: transitive.purl, name: 'example', version: '1.0.0', alerts: [{ type: 'malware', severity: 'critical' }] }]
    const result = evaluateSocketArtifacts({ artifacts, baseline, components: [...roots, transitive], now: new Date('2026-08-14T00:00:00Z') })
    expect(result.status).toBe('fail')
    expect(result.findings.transitive[0].type).toBe('malware')
  })

  it('fails on material category regression', () => {
    const result = evaluateSocketArtifacts({ artifacts: rootsWith([], { ...scores, supplyChain: 0.46 }), baseline, components: roots, now: new Date('2026-08-14T00:00:00Z') })
    expect(result.status).toBe('fail')
    expect(result.findings.scoreRegressions[0].category).toBe('supplyChain')
  })

  it('fails closed when a scan is pending or a response is absent', () => {
    const artifacts = rootsWith([{ type: 'pendingScan', severity: 'unknown' }]).slice(0, 1)
    const result = evaluateSocketArtifacts({ artifacts, baseline, components: roots, now: new Date('2026-08-14T00:00:00Z') })
    expect(result.status).toBe('unavailable')
    expect(result.findings.unavailable.length).toBeGreaterThan(1)
  })

  it('requires expired capability reviews to be renewed', () => {
    const result = evaluateSocketArtifacts({ artifacts: rootsWith([{ type: 'shellAccess', severity: 'high', ...behavioralEvidence }]), baseline, components: roots, now: new Date('2026-12-01T00:00:00Z') })
    expect(result.status).toBe('fail')
    expect(result.findings.blocking[0].review?.expired).toBe(true)
  })

  it('builds a direct and transitive inventory from a release lockfile', () => {
    const components = componentsFromLock({ packages: {
      'node_modules/aiwg': { name: 'aiwg', version: '2026.8.8' },
      'node_modules/@aiwg/cli': { name: '@aiwg/cli', version: '2026.8.8' },
      'node_modules/chalk': { version: '4.1.2' }
    } }, '2026.8.8')
    expect(components.filter(item => item.depth === 'direct')).toHaveLength(2)
    expect(components.find(item => item.purl.includes('chalk'))?.depth).toBe('transitive')
  })

  it('binds npm components to commit and lockfile provenance', () => {
    const components = componentsFromLock({ packages: { 'node_modules/chalk': { version: '4.1.2' } } }, '2026.8.8', {
      commitSha: 'abc123', workspace: 'tools/eval', manifestPath: 'tools/eval/package.json',
      lockfilePath: 'tools/eval/package-lock.json', lockfileDigest: 'sha256:lock'
    })
    expect(components.find(item => item.purl.includes('chalk'))).toMatchObject({
      ecosystem: 'npm', commitSha: 'abc123', lockfilePath: 'tools/eval/package-lock.json', lockfileDigest: 'sha256:lock'
    })
  })

  it('inventories Rust packages from Cargo.lock with provenance', () => {
    const components = componentsFromCargoLock('[[package]]\nname = "quick-xml"\nversion = "0.41.0"\n', {
      lockfilePath: 'apps/desktop/Cargo.lock', lockfileDigest: 'sha256:cargo'
    })
    expect(components).toEqual([expect.objectContaining({
      purl: 'pkg:cargo/quick-xml@0.41.0', ecosystem: 'cargo', lockfilePath: 'apps/desktop/Cargo.lock'
    })])
  })

  it('fails behavioral findings that lack actionable evidence', () => {
    const result = evaluateSocketArtifacts({
      artifacts: rootsWith([{ type: 'obfuscatedCode', severity: 'high', key: 'obfuscation' }]), baseline, components: roots
    })
    expect(result.status).toBe('fail')
    expect(result.findings.blocking[0].evidenceErrors).toContain('missing-artifactHash')
  })

  it('downgrades code-shape-only obfuscation evidence and deduplicates affected paths', () => {
    const component = { ...roots[0], dependencyPath: ['root', 'node_modules/example'] }
    const alert = {
      type: 'obfuscatedCode', severity: 'high', key: 'shape:minified', artifactHash: 'sha256:artifact',
      file: 'dist/min.js', ruleId: 'shape:minified', excerpt: 'a=>a^b',
      confidenceRationale: 'minified distribution artifact; no malicious behavior observed'
    }
    const result = evaluateSocketArtifacts({ artifacts: rootsWith([alert, alert]), baseline, components: [component, roots[1]] })
    expect(result.findings.direct).toHaveLength(1)
    expect(result.findings.direct[0].severity).toBe('informational')
    expect(result.findings.direct[0].originalSeverity).toBe('high')
  })

  it('rejects duplicate finding IDs and CVE rows without advisory identifiers', () => {
    const alerts = [
      { id: '0.72', type: 'cve', severity: 'moderate' },
      { id: '0.72', type: 'cve', severity: 'moderate', advisoryId: 'CVE-2026-1' }
    ]
    const result = evaluateSocketArtifacts({ artifacts: rootsWith(alerts), baseline, components: roots })
    expect(result.status).toBe('fail')
    expect(result.findings.validationErrors).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: '0.72', error: 'duplicate-finding-id' }),
      expect.objectContaining({ errors: expect.arrayContaining(['missing-advisory-identifier']) })
    ]))
  })

  it('does not carry an accept-risk review across artifact hashes', () => {
    const changed = { ...behavioralEvidence, artifactHash: 'sha256:changed' }
    const result = evaluateSocketArtifacts({
      artifacts: rootsWith([{ type: 'shellAccess', severity: 'high', ...changed }]), baseline, components: roots,
      now: new Date('2026-08-14T00:00:00Z')
    })
    expect(result.status).toBe('fail')
    expect(result.findings.direct[0].review).toBeNull()
  })

  it('rejects patched-version guidance from a different major line', () => {
    const result = evaluateSocketArtifacts({
      artifacts: rootsWith([{
        id: 'nanoid-advisory', type: 'vulnerability', severity: 'high', advisoryId: 'GHSA-example',
        advisoryUrl: 'https://example.test/GHSA-example', firstPatchedVersion: '5.1.6'
      }]).map(item => item.name === 'aiwg' ? { ...item, version: '3.3.17' } : item),
      baseline, components: roots
    })
    expect(result.findings.validationErrors[0].errors).toContain('patched-version-major-mismatch')
  })
})
