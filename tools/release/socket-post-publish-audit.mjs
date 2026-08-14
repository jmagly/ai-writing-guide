#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const SCORE_KEYS = ['supplyChain', 'quality', 'maintenance', 'vulnerability', 'license']
const CAPABILITY_ALERTS = new Set(['shellAccess', 'filesystemAccess', 'networkAccess', 'envVars', 'urlAccess'])

function parseArgs(argv) {
  const values = {}
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index]
    if (!value.startsWith('--')) continue
    values[value.slice(2)] = argv[index + 1]
    index += 1
  }
  return values
}

function npmPurl(name, version) {
  if (name.startsWith('@')) {
    const [scope, packageName] = name.slice(1).split('/')
    return `pkg:npm/%40${encodeURIComponent(scope)}/${encodeURIComponent(packageName)}@${encodeURIComponent(version)}`
  }
  return `pkg:npm/${encodeURIComponent(name)}@${encodeURIComponent(version)}`
}

export function componentsFromLock(lock, version) {
  const roots = new Set([npmPurl('aiwg', version), npmPurl('@aiwg/cli', version)])
  const components = new Map([...roots].map(purl => [purl, { purl, depth: 'direct' }]))
  for (const [location, metadata] of Object.entries(lock.packages ?? {})) {
    if (!location.includes('node_modules/') || !metadata?.version) continue
    const inferredName = location.match(/node_modules\/((?:@[^/]+\/)?[^/]+)$/)?.[1]
    const name = metadata.name ?? inferredName
    if (!name) continue
    const purl = npmPurl(name, metadata.version)
    if (!components.has(purl)) components.set(purl, { purl, depth: roots.has(purl) ? 'direct' : 'transitive' })
  }
  return [...components.values()]
}

function alertType(alert) {
  return String(alert?.type ?? alert?.value?.type ?? alert?.key ?? 'unknown')
}

function alertSeverity(alert) {
  return String(alert?.severity ?? alert?.value?.severity ?? 'unknown').toLowerCase()
}

function artifactPurl(artifact) {
  return artifact.inputPurl ?? artifact.purl ?? (artifact.name && artifact.version ? npmPurl(artifact.name, artifact.version) : '')
}

function packageName(artifact) {
  return artifact.name ?? artifactPurl(artifact).replace(/^pkg:npm\//, '').replace(/@[^@/]+$/, '')
}

function reviewMatches(review, finding) {
  return review.type === finding.type &&
    (review.package === '*' || review.package === finding.package) &&
    review.depth === finding.depth
}

function isoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value ?? '') ? value : null
}

export function evaluateSocketArtifacts({ artifacts, baseline, components, now = new Date() }) {
  const componentDepth = new Map(components.map(item => [item.purl, item.depth]))
  const requested = new Set(componentDepth.keys())
  const returned = new Set()
  const findings = []
  const scoreRegressions = []
  const unavailable = []
  const today = now.toISOString().slice(0, 10)

  for (const artifact of artifacts) {
    if (artifact?._type === 'summary') continue
    if (artifact?._type === 'purlError') {
      unavailable.push({ purl: artifact.value?.inputPurl ?? 'unknown', reason: artifact.value?.error ?? 'purlError' })
      continue
    }
    const purl = artifactPurl(artifact)
    if (purl) returned.add(purl)
    const depth = componentDepth.get(purl) ?? (artifact.direct ? 'direct' : 'transitive')
    for (const alert of artifact.alerts ?? []) {
      const type = alertType(alert)
      if (type === 'pendingScan' || type === 'notFound') {
        unavailable.push({ purl, reason: type })
        continue
      }
      const finding = {
        package: packageName(artifact),
        version: artifact.version ?? null,
        purl,
        depth,
        type,
        severity: alertSeverity(alert),
        key: alert.key ?? null
      }
      const review = baseline.reviewedCapabilityAlerts.find(candidate => reviewMatches(candidate, finding))
      finding.review = review ? {
        classification: review.classification,
        owner: review.owner,
        reviewedOn: review.reviewedOn,
        expiresOn: review.expiresOn,
        expired: !isoDate(review.expiresOn) || review.expiresOn < today
      } : null
      findings.push(finding)
    }

    if (depth !== 'direct') continue
    const expected = baseline.packages[packageName(artifact)]?.scores
    if (!expected || !artifact.score) continue
    for (const key of SCORE_KEYS) {
      if (!Number.isFinite(expected[key]) || !Number.isFinite(artifact.score[key])) continue
      const drop = expected[key] - artifact.score[key]
      if (drop >= baseline.policy.materialScoreDrop) {
        scoreRegressions.push({ package: packageName(artifact), category: key, baseline: expected[key], current: artifact.score[key], drop })
      }
    }
  }

  for (const purl of requested) {
    if (!returned.has(purl)) unavailable.push({ purl, reason: 'missing-response' })
  }

  const blocking = findings.filter(finding => {
    if (finding.review?.expired) return true
    if (finding.review) return false
    if (finding.depth === 'direct' && CAPABILITY_ALERTS.has(finding.type)) return true
    return baseline.policy.blockingSeverities.includes(finding.severity)
  })
  const status = unavailable.length ? 'unavailable' : (blocking.length || scoreRegressions.length ? 'fail' : 'pass')
  return {
    schemaVersion: 1,
    status,
    evaluatedAt: now.toISOString(),
    summary: {
      componentsRequested: requested.size,
      componentsReturned: returned.size,
      directAlerts: findings.filter(item => item.depth === 'direct').length,
      transitiveAlerts: findings.filter(item => item.depth === 'transitive').length,
      blockingFindings: blocking.length,
      scoreRegressions: scoreRegressions.length,
      unavailable: unavailable.length
    },
    findings: {
      direct: findings.filter(item => item.depth === 'direct'),
      transitive: findings.filter(item => item.depth === 'transitive'),
      blocking,
      scoreRegressions,
      unavailable
    }
  }
}

function reportMarkdown(report, version) {
  const rows = [
    '# Socket post-publish audit', '',
    `- Release: \`${version}\``,
    `- Status: **${report.status.toUpperCase()}**`,
    `- Evaluated: ${report.evaluatedAt}`, '',
    '| Evidence | Count |', '| --- | ---: |',
    `| Components requested | ${report.summary.componentsRequested} |`,
    `| Components returned | ${report.summary.componentsReturned} |`,
    `| Direct alerts | ${report.summary.directAlerts} |`,
    `| Transitive alerts | ${report.summary.transitiveAlerts} |`,
    `| Blocking findings | ${report.summary.blockingFindings} |`,
    `| Material score regressions | ${report.summary.scoreRegressions} |`,
    `| Unavailable/incomplete results | ${report.summary.unavailable} |`, ''
  ]
  if (report.status === 'unavailable') rows.push('The scanner did not return complete evidence. This run is not a clean result and must be retried or investigated.', '')
  if (report.findings.blocking.length) {
    rows.push('## Blocking findings', '')
    for (const finding of report.findings.blocking) rows.push(`- \`${finding.depth}\` \`${finding.package}\`: ${finding.type} (${finding.severity})`)
    rows.push('')
  }
  if (report.findings.scoreRegressions.length) {
    rows.push('## Material score changes', '')
    for (const item of report.findings.scoreRegressions) rows.push(`- \`${item.package}\` ${item.category}: ${item.baseline} → ${item.current}`)
    rows.push('', 'A score change triggers review; it does not by itself authorize removing supported capability.', '')
  }
  return `${rows.join('\n')}\n`
}

async function fetchArtifacts({ components, token, orgSlug, fetchImpl = fetch }) {
  const all = []
  for (let offset = 0; offset < components.length; offset += 100) {
    const batch = components.slice(offset, offset + 100)
    const url = new URL(`https://api.socket.dev/v0/orgs/${encodeURIComponent(orgSlug)}/purl`)
    url.search = new URLSearchParams({ alerts: 'true', poll: 'true', timeoutSec: '300', summary: 'true' }).toString()
    let response
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      response = await fetchImpl(url, {
        method: 'POST',
        headers: { authorization: `Basic ${Buffer.from(`${token}:`).toString('base64')}`, 'content-type': 'application/json', accept: 'application/x-ndjson' },
        body: JSON.stringify({ components: batch.map(({ purl }) => ({ purl })) })
      })
      if (response.ok || (response.status !== 429 && response.status < 500)) break
      await new Promise(resolveDelay => setTimeout(resolveDelay, attempt * 1000))
    }
    if (!response?.ok) throw new Error(`Socket API request failed with HTTP ${response?.status ?? 'unknown'}`)
    const text = await response.text()
    for (const line of text.split(/\r?\n/)) {
      if (!line.trim()) continue
      try { all.push(JSON.parse(line)) } catch { throw new Error('Socket API returned malformed NDJSON') }
    }
  }
  return all
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const version = args.version
  if (!version) throw new Error('--version is required')
  const baselinePath = resolve(args.baseline ?? 'ci/socket-score-baseline.json')
  const outputDir = resolve(args['output-dir'] ?? 'test-results/socket-post-publish')
  const baseline = JSON.parse(await readFile(baselinePath, 'utf8'))
  let components = [
    { purl: npmPurl('aiwg', version), depth: 'direct' },
    { purl: npmPurl('@aiwg/cli', version), depth: 'direct' }
  ]
  if (args['dependency-lock']) {
    components = componentsFromLock(JSON.parse(await readFile(resolve(args['dependency-lock']), 'utf8')), version)
  }

  let artifacts
  let fetchError = null
  try {
    if (args.input) {
      const input = await readFile(resolve(args.input), 'utf8')
      artifacts = input.split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line))
    } else {
      const token = process.env.SOCKET_API_TOKEN
      const orgSlug = process.env.SOCKET_ORG_SLUG
      if (!token || !orgSlug) throw new Error('Socket audit credentials are unavailable')
      artifacts = await fetchArtifacts({ components, token, orgSlug })
    }
  } catch (error) {
    fetchError = error instanceof Error ? error.message : String(error)
    artifacts = []
  }

  const report = evaluateSocketArtifacts({ artifacts, baseline, components })
  if (fetchError) report.findings.unavailable.unshift({ purl: '*', reason: fetchError })
  if (fetchError) {
    report.status = 'unavailable'
    report.summary.unavailable = report.findings.unavailable.length
  }
  await mkdir(outputDir, { recursive: true })
  await writeFile(resolve(outputDir, 'socket-audit.json'), `${JSON.stringify(report, null, 2)}\n`)
  await writeFile(resolve(outputDir, 'socket-audit.md'), reportMarkdown(report, version))
  console.log(`Socket post-publish audit: ${report.status} (${report.summary.directAlerts} direct, ${report.summary.transitiveAlerts} transitive alerts)`)
  if (report.status !== 'pass') process.exitCode = report.status === 'unavailable' ? 2 : 1
}

if (import.meta.url === pathToFileURL(resolve(process.argv[1] ?? basename(import.meta.url))).href) {
  main().catch(error => {
    console.error(`Socket post-publish audit failed: ${error instanceof Error ? error.message : String(error)}`)
    process.exitCode = 2
  })
}
