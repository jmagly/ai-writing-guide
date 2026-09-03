import { describe, expect, it } from 'vitest'
import { analyzeBackwardCompatibility, analyzeCompatibilityChain } from '../../../src/schema/index.js'

describe('schema compatibility', () => {
  it('flags narrowing changes as breaking', () => {
    const result = analyzeBackwardCompatibility(
      { type: 'object', properties: { a: { type: 'string' } }, additionalProperties: true },
      { type: 'object', required: ['a'], properties: { a: { type: 'string' } }, additionalProperties: false },
    )
    expect(result.status).toBe('breaking')
    expect(result.reasons).toContain('required property added: a')
  })

  it('evaluates every adjacent baseline in a chain', () => {
    expect(analyzeCompatibilityChain([{ type: 'string' }, { type: 'number' }, { type: 'number' }]).map(item => item.status)).toEqual(['breaking', 'compatible'])
  })
})
