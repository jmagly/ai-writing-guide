import { describe, expect, it, vi } from 'vitest'

import { ensureCloudflareBrowserCachePolicy } from '../../../tools/deploy/configure-cloudflare-zone-policy.mjs'

const zoneId = '4a083217a179165f76bd82e15a1e8fe7'
const token = 'test-value-that-must-never-appear-in-errors'
const response = (value, { ok = true, status = 200, success = true, errors = [] } = {}) => ({
  ok,
  status,
  json: async () => ({ success, errors, result: { value } })
})

describe('Cloudflare zone cache policy', () => {
  it('leaves Respect Existing Headers unchanged', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(response(0))
      .mockResolvedValueOnce(response(0))

    await expect(ensureCloudflareBrowserCachePolicy({ zoneId, token, fetchImpl }))
      .resolves.toEqual({ changed: false, value: 0 })
    expect(fetchImpl).toHaveBeenCalledTimes(2)
    expect(fetchImpl.mock.calls.map(([, options]) => options.method)).toEqual(['GET', 'GET'])
  })

  it('updates an overriding Browser Cache TTL and verifies the result', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(response(14_400))
      .mockResolvedValueOnce(response(0))
      .mockResolvedValueOnce(response(0))

    await expect(ensureCloudflareBrowserCachePolicy({ zoneId, token, fetchImpl }))
      .resolves.toEqual({ changed: true, value: 0 })
    expect(fetchImpl).toHaveBeenCalledTimes(3)
    expect(fetchImpl.mock.calls[1][1]).toMatchObject({ method: 'PATCH', body: '{"value":0}' })
  })

  it('reports API failures without leaking the token', async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(response(null, {
      ok: false,
      status: 403,
      success: false,
      errors: [{ message: `forbidden for ${token}` }]
    }))

    const failure = ensureCloudflareBrowserCachePolicy({ zoneId, token, fetchImpl })
    await expect(failure).rejects.toThrow('GET failed (HTTP 403): forbidden for <redacted>')
    await expect(failure).rejects.not.toThrow(token)
  })

  it('rejects malformed configuration before making a request', async () => {
    const fetchImpl = vi.fn()
    await expect(ensureCloudflareBrowserCachePolicy({ zoneId: 'wrong-zone', token, fetchImpl }))
      .rejects.toThrow('32-character hexadecimal zone identifier')
    expect(fetchImpl).not.toHaveBeenCalled()
  })
})
