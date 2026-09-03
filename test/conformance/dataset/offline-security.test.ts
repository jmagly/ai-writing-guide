import { describe, expect, it } from 'vitest'
import { createNetworkDenyHarness } from '../../helpers/dataset/network-deny.js'
import { withCommitFault } from '../../helpers/dataset/fault-store.js'
import { HttpAdapter } from '../../../src/dataset/adapters.js'
import { request } from '../../../src/dataset/adapter-sdk.js'

describe('dataset offline and fault harnesses', () => {
  it('proves an offline adapter refuses before any fetch attempt', async () => {
    const network = createNetworkDenyHarness()
    const adapter = new HttpAdapter(network.fetch)
    const configured = await adapter.configure({ url: 'https://allowed.example/data' })
    expect(configured.ok).toBe(true)
    const checked = await adapter.check(request('offline', configured.config!, { offline: true, allowedHosts: ['allowed.example'] }))
    expect(checked.diagnostics[0]?.code).toBe('ADAPTER_OFFLINE_PROHIBITED')
    network.assertZeroAttempts()
  })

  it('distinguishes failures immediately before and ambiguously after commit', async () => {
    let commits = 0
    await expect(withCommitFault('before-commit', async () => ++commits)).rejects.toThrow('CONFORMANCE_CRASH_BEFORE_COMMIT')
    expect(commits).toBe(0)
    await expect(withCommitFault('after-commit', async () => ++commits)).rejects.toThrow('CONFORMANCE_CRASH_AFTER_COMMIT')
    expect(commits).toBe(1)
  })
})
