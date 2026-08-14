#!/usr/bin/env node

import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

const EXPECTED_BROWSER_CACHE_TTL = 0

function describeErrors (payload, secret) {
  const entries = [...(payload?.errors ?? []), ...(payload?.messages ?? [])]
  const message = entries.map(entry => entry?.message ?? String(entry)).join('; ') || 'success was not true'
  return secret ? message.replaceAll(secret, '<redacted>') : message
}

export async function ensureCloudflareBrowserCachePolicy ({
  zoneId,
  token,
  fetchImpl = globalThis.fetch
} = {}) {
  if (!/^[a-f0-9]{32}$/i.test(zoneId ?? '')) {
    throw new Error('CLOUDFLARE_ZONE_ID must be a 32-character hexadecimal zone identifier')
  }
  if (!token) throw new Error('CLOUDFLARE_API_TOKEN is required')
  if (typeof fetchImpl !== 'function') throw new Error('a Fetch-compatible implementation is required')

  const endpoint = `https://api.cloudflare.com/client/v4/zones/${zoneId}/settings/browser_cache_ttl`
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  const request = async (method, body) => {
    const response = await fetchImpl(endpoint, {
      method,
      headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) })
    })
    let payload
    try {
      payload = await response.json()
    } catch {
      throw new Error(`Cloudflare Browser Cache TTL ${method} returned HTTP ${response.status} with non-JSON content`)
    }
    if (!response.ok || payload?.success !== true) {
      throw new Error(`Cloudflare Browser Cache TTL ${method} failed (HTTP ${response.status}): ${describeErrors(payload, token)}`)
    }
    return payload.result
  }

  const before = await request('GET')
  if (before?.value !== EXPECTED_BROWSER_CACHE_TTL) {
    await request('PATCH', { value: EXPECTED_BROWSER_CACHE_TTL })
  }
  const after = await request('GET')
  if (after?.value !== EXPECTED_BROWSER_CACHE_TTL) {
    throw new Error(`Cloudflare Browser Cache TTL remained ${String(after?.value)} instead of Respect Existing Headers`)
  }
  return { changed: before?.value !== EXPECTED_BROWSER_CACHE_TTL, value: after.value }
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : ''
if (invokedPath === import.meta.url) {
  try {
    const result = await ensureCloudflareBrowserCachePolicy({
      zoneId: process.env.CLOUDFLARE_ZONE_ID,
      token: process.env.CLOUDFLARE_API_TOKEN
    })
    console.log(`Cloudflare Browser Cache TTL respects origin headers${result.changed ? ' (updated)' : ' (already configured)'}`)
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}
