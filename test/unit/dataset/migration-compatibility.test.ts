import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  preventPrivacyDowngrade, projectLedgerToDependencyGraph, projectMarketplaceProvenance,
  projectMentionEdge, projectResearchProvenance, projectSdlcTraceLink,
} from '../../../src/dataset/projections.js'

const fixture = JSON.parse(readFileSync(resolve('test/fixtures/dataset/migration/compatibility-cases.json'), 'utf8'))

describe('dataset compatibility migration evidence', () => {
  it('preserves identities while reporting research and marketplace attribute loss', () => {
    const research = projectResearchProvenance(fixture.research, fixture.context)
    expect(research.value.some((event: any) => event.record.id === 'paper:1')).toBe(true)
    expect(research.loss.items.map(item => item.path)).toContain('/entity/attributes')
    expect(research.loss.items.every(item => item.sourcePrivacy === 'confidential')).toBe(true)

    const marketplace = projectMarketplaceProvenance(fixture.marketplace, fixture.context)
    expect(marketplace.value.some((event: any) => event.record.id === 'package:1')).toBe(true)
    expect(marketplace.loss.items.map(item => item.path)).toContain('/entities/*/attributes')
  })

  it('retains mention evidence and declares dependency graph qualifier loss', () => {
    const mention = projectMentionEdge(fixture.mention, { ...fixture.context, runId: 'run:migration' })
    expect(mention.value.find((event: any) => event.record.recordType === 'evidence')?.record).toMatchObject({
      method: 'mention', confidence: 0.9, privacy: 'confidential', runId: 'run:migration',
    })
    const graph = projectLedgerToDependencyGraph(mention.value)
    expect(graph.value['src/a.ts'].upstream).toEqual([{ path: 'docs/r.md', type: 'mentions' }])
    expect(graph.loss.lossless).toBe(false)
    expect(graph.loss.items[0].reason).toContain('drops basis, evidence, run, field, privacy, and retention')
  })

  it('does not upgrade a run-less verified SDLC link or lower privacy', () => {
    const sdlc = projectSdlcTraceLink(fixture.sdlc, fixture.context)
    expect(sdlc.loss.items.some(item => item.path === '/runId')).toBe(true)
    const assertion: any = sdlc.value.at(-1)?.record
    expect(assertion.basis).toBe('inferred')
    expect(() => preventPrivacyDowngrade('restricted', 'internal')).toThrow(/PRIVACY_DOWNGRADE/)
  })
})
