import { describe, expect, it } from 'vitest'

import { componentsFromLock, evaluateSocketArtifacts } from '../../../tools/release/socket-post-publish-audit.mjs'

const baseline = {
  policy: { materialScoreDrop: 0.1, blockingSeverities: ['high', 'critical'] },
  packages: {
    aiwg: { scores: { supplyChain: 0.57, quality: 1, maintenance: 0.95, vulnerability: 1, license: 0.7 } },
    '@aiwg/cli': { scores: { supplyChain: 0.57, quality: 1, maintenance: 0.95, vulnerability: 1, license: 1 } }
  },
  reviewedCapabilityAlerts: [{
    package: '*', depth: 'direct', type: 'shellAccess', classification: 'required-capability',
    owner: 'maintainers', reviewedOn: '2026-08-01', expiresOn: '2026-11-01'
  }]
}

const roots = [
  { purl: 'pkg:npm/aiwg@2026.8.8', depth: 'direct' },
  { purl: 'pkg:npm/%40aiwg/cli@2026.8.8', depth: 'direct' }
]
const scores = { supplyChain: 0.57, quality: 1, maintenance: 0.95, vulnerability: 1, license: 0.7 }

function rootsWith(alerts: unknown[] = [], aiwgScores = scores) {
  return [
    { inputPurl: roots[0].purl, name: 'aiwg', version: '2026.8.8', score: aiwgScores, alerts },
    { inputPurl: roots[1].purl, name: '@aiwg/cli', version: '2026.8.8', score: { ...scores, license: 1 }, alerts: [] }
  ]
}

describe('Socket post-publish audit', () => {
  it('records reviewed direct capability alerts without treating capability as a defect', () => {
    const result = evaluateSocketArtifacts({ artifacts: rootsWith([{ type: 'shellAccess', severity: 'high' }]), baseline, components: roots, now: new Date('2026-08-14T00:00:00Z') })
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
    const result = evaluateSocketArtifacts({ artifacts: rootsWith([{ type: 'shellAccess', severity: 'high' }]), baseline, components: roots, now: new Date('2026-12-01T00:00:00Z') })
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
})
