export interface NetworkDenyHarness {
  readonly attempts: number
  fetch: typeof globalThis.fetch
  assertZeroAttempts(): void
}

export function createNetworkDenyHarness(): NetworkDenyHarness {
  let attempts = 0
  return {
    get attempts() { return attempts },
    fetch: async () => { attempts += 1; throw new Error('NETWORK_ATTEMPTED_OFFLINE') },
    assertZeroAttempts() { if (attempts !== 0) throw new Error(`NETWORK_ATTEMPTED_OFFLINE: ${attempts} call(s)`) },
  }
}
