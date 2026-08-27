#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { basename, dirname, relative, resolve } from 'node:path'
import { execFileSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'

const SCORE_KEYS = ['supplyChain', 'quality', 'maintenance', 'vulnerability', 'license']
const CAPABILITY_ALERTS = new Set(['shellAccess', 'filesystemAccess', 'networkAccess', 'envVars', 'urlAccess'])

function parseArgs(argv) {
  const values = {}
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index]
    if (!value.startsWith('--')) continue
    const key = value.slice(2)
    const next = argv[index + 1]
    values[key] = key === 'dependency-lock'
      ? [...(Array.isArray(values[key]) ? values[key] : values[key] ? [values[key]] : []), next]
      : next
    index += 1
  }
  return values
}

function sha256(content) {
  return createHash('sha256').update(content).digest('hex')
}

function npmPurl(name, version) {
  if (name.startsWith('@')) {
    const [scope, packageName] = name.slice(1).split('/')
    return `pkg:npm/%40${encodeURIComponent(scope)}/${encodeURIComponent(packageName)}@${encodeURIComponent(version)}`
  }
  return `pkg:npm/${encodeURIComponent(name)}@${encodeURIComponent(version)}`
}

export function componentsFromLock(lock, version, provenance = {}) {
  const rootMetadata = lock.packages?.[''] ?? {}
  const roots = new Set(provenance.releaseRoot === false
    ? (rootMetadata.name && rootMetadata.version ? [npmPurl(rootMetadata.name, rootMetadata.version)] : [])
    : [npmPurl('aiwg', version), npmPurl('@aiwg/cli', version)])
  const directNames = new Set(Object.keys({
    ...(rootMetadata.dependencies ?? {}),
    ...(rootMetadata.optionalDependencies ?? {}),
    ...(rootMetadata.peerDependencies ?? {})
  }))
  const common = { ecosystem: 'npm', ...provenance }
  const components = new Map([...roots].map(purl => [purl, { purl, depth: 'direct', dependencyPath: ['release-root', purl], ...common }]))
  for (const [location, metadata] of Object.entries(lock.packages ?? {})) {
    if (!location.includes('node_modules/') || !metadata?.version) continue
    const inferredName = location.match(/node_modules\/((?:@[^/]+\/)?[^/]+)$/)?.[1]
    const name = metadata.name ?? inferredName
    if (!name) continue
    const purl = npmPurl(name, metadata.version)
    const isTopLevel = location === `node_modules/${name}`
    const depth = roots.has(purl) || (isTopLevel && directNames.has(name)) ? 'direct' : 'transitive'
    if (!components.has(purl)) components.set(purl, {
      purl,
      depth,
      dependencyPath: [rootMetadata.name ?? 'release-root', location],
      artifactHash: metadata.integrity ?? null,
      ...common
    })
  }
  return [...components.values()]
}

export function componentsFromCargoLock(content, provenance = {}) {
  const components = []
  for (const block of content.split(/\n(?=\[\[package\]\]\n)/)) {
    const name = block.match(/^name = "([^"]+)"$/m)?.[1]
    const version = block.match(/^version = "([^"]+)"$/m)?.[1]
    if (!name || !version) continue
    components.push({
      purl: `pkg:cargo/${encodeURIComponent(name)}@${encodeURIComponent(version)}`,
      depth: 'transitive',
      dependencyPath: ['cargo-root', `${name}@${version}`],
      ecosystem: 'cargo',
      ...provenance
    })
  }
  return components
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

function firstValue(...values) {
  return values.find(value => value !== undefined && value !== null && value !== '') ?? null
}

function isBehavioral(type) {
  return /obfuscat|malware|install.?script|behavior|telemetry|network|filesystem|shell/i.test(type)
}

function normalizeEvidence(artifact, alert, component) {
  const value = alert?.value ?? {}
  return {
    artifactHash: firstValue(alert.artifactHash, value.artifactHash, artifact.integrity, artifact.hash, component?.artifactHash),
    file: firstValue(alert.file, value.file, alert.location?.file, value.location?.file),
    symbol: firstValue(alert.symbol, value.symbol, alert.location?.symbol, value.location?.symbol),
    ruleId: firstValue(alert.ruleId, value.ruleId, alert.key),
    excerpt: firstValue(alert.excerpt, value.excerpt),
    behaviorTrace: firstValue(alert.behaviorTrace, value.behaviorTrace),
    confidenceRationale: firstValue(alert.confidenceRationale, value.confidenceRationale),
    advisoryId: firstValue(alert.advisoryId, value.advisoryId, alert.cve, value.cve, alert.ghsa, value.ghsa, alert.rustsec, value.rustsec),
    advisoryUrl: firstValue(alert.url, value.url, alert.advisoryUrl, value.advisoryUrl),
    firstPatchedVersion: firstValue(alert.firstPatchedVersion, value.firstPatchedVersion, alert.fixedVersion, value.fixedVersion)
  }
}

function evidenceErrors(type, evidence) {
  const errors = []
  if (isBehavioral(type)) {
    for (const key of ['artifactHash', 'file', 'symbol', 'ruleId', 'confidenceRationale']) {
      if (!evidence[key]) errors.push(`missing-${key}`)
    }
    if (!evidence.excerpt && !evidence.behaviorTrace) errors.push('missing-excerpt-or-behaviorTrace')
  }
  if (/^cve$/i.test(type) && !evidence.advisoryId) errors.push('missing-advisory-identifier')
  if (/cve|vulnerab|advisory/i.test(type) && !evidence.advisoryUrl) errors.push('missing-advisory-url')
  return errors
}

function semverMajor(version) {
  const match = String(version ?? '').match(/^(?:[<>=~^ ]*)(\d+)\./)
  return match ? Number(match[1]) : null
}

function reviewMatches(review, finding) {
  return review.type === finding.type &&
    (review.package === '*' || review.package === finding.package) &&
    review.depth === finding.depth &&
    (!isBehavioral(finding.type) || (
      Boolean(review.rationale) &&
      Boolean(review.artifactHash) &&
      review.artifactHash === finding.evidence.artifactHash
    ))
}

function isoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value ?? '') ? value : null
}

export function evaluateSocketArtifacts({ artifacts, baseline, components, now = new Date() }) {
  const componentsByPurl = new Map()
  for (const component of components) {
    const matches = componentsByPurl.get(component.purl) ?? []
    matches.push(component)
    componentsByPurl.set(component.purl, matches)
  }
  const componentDepth = new Map(components.map(item => [item.purl, item.depth]))
  const requested = new Set(componentDepth.keys())
  const returned = new Set()
  const findings = []
  const scoreRegressions = []
  const unavailable = []
  const validationErrors = []
  const findingKeys = new Map()
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
      const matchingComponents = componentsByPurl.get(purl) ?? []
      const component = matchingComponents[0]
      const evidence = normalizeEvidence(artifact, alert, component)
      const errors = evidenceErrors(type, evidence)
      const observedMajor = semverMajor(artifact.version)
      const patchedMajor = semverMajor(evidence.firstPatchedVersion)
      if (observedMajor !== null && patchedMajor !== null && observedMajor !== patchedMajor) errors.push('patched-version-major-mismatch')
      const originalSeverity = alertSeverity(alert)
      const rationale = evidence.confidenceRationale ?? ''
      const hasSecurityBehavior = Boolean(evidence.behaviorTrace || (
        /malicious|tamper|exfiltrat|remote execution/i.test(rationale) &&
        !/no malicious|not malicious|benign|code[- ]shape|generated|minified|test vector|ffi|platform binary/i.test(rationale)
      ))
      const severity = /obfuscat/i.test(type) && !hasSecurityBehavior ? 'informational' : originalSeverity
      const finding = {
        id: firstValue(alert.id),
        package: packageName(artifact),
        version: artifact.version ?? null,
        purl,
        depth,
        type,
        severity,
        originalSeverity: severity === originalSeverity ? null : originalSeverity,
        key: alert.key ?? null,
        provenance: matchingComponents.map(item => ({
          commitSha: item.commitSha ?? null,
          workspace: item.workspace ?? null,
          manifestPath: item.manifestPath ?? null,
          lockfilePath: item.lockfilePath ?? null,
          lockfileDigest: item.lockfileDigest ?? null,
          dependencyPath: item.dependencyPath ?? null,
          ecosystem: item.ecosystem ?? null
        })),
        evidence,
        evidenceErrors: errors,
        affectedPaths: matchingComponents.flatMap(item => item.dependencyPath ? [item.dependencyPath] : [])
      }
      if (errors.length) validationErrors.push({ purl, type, errors })
      if (finding.id && findingKeys.has(finding.id)) validationErrors.push({ id: finding.id, error: 'duplicate-finding-id' })
      if (finding.id) findingKeys.set(finding.id, true)
      const review = baseline.reviewedCapabilityAlerts.find(candidate => reviewMatches(candidate, finding))
      finding.review = review ? {
        classification: review.classification,
        rationale: review.rationale,
        artifactHash: review.artifactHash,
        owner: review.owner,
        reviewedOn: review.reviewedOn,
        expiresOn: review.expiresOn,
        expired: !isoDate(review.expiresOn) || review.expiresOn < today
      } : null
      const dedupeKey = [purl, type, evidence.ruleId ?? '', evidence.artifactHash ?? ''].join('|')
      const existing = findings.find(item => item._dedupeKey === dedupeKey)
      if (existing) {
        for (const item of matchingComponents) {
          if (!item.dependencyPath) continue
          const serialized = JSON.stringify(item.dependencyPath)
          if (!existing.affectedPaths.some(path => JSON.stringify(path) === serialized)) existing.affectedPaths.push(item.dependencyPath)
        }
      } else {
        Object.defineProperty(finding, '_dedupeKey', { value: dedupeKey, enumerable: false })
        findings.push(finding)
      }
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
    if (finding.evidenceErrors.length) return true
    if (finding.review?.expired) return true
    if (finding.review) return false
    if (finding.depth === 'direct' && CAPABILITY_ALERTS.has(finding.type)) return true
    return baseline.policy.blockingSeverities.includes(finding.severity)
  })
  const status = unavailable.length ? 'unavailable' : (blocking.length || scoreRegressions.length || validationErrors.length ? 'fail' : 'pass')
  return {
    schemaVersion: 2,
    status,
    evaluatedAt: now.toISOString(),
    summary: {
      componentsRequested: requested.size,
      componentsReturned: returned.size,
      directAlerts: findings.filter(item => item.depth === 'direct').length,
      transitiveAlerts: findings.filter(item => item.depth === 'transitive').length,
      blockingFindings: blocking.length,
      scoreRegressions: scoreRegressions.length,
      unavailable: unavailable.length,
      validationErrors: validationErrors.length
    },
    findings: {
      direct: findings.filter(item => item.depth === 'direct'),
      transitive: findings.filter(item => item.depth === 'transitive'),
      blocking,
      scoreRegressions,
      unavailable,
      validationErrors
    }
  }
}

function reportMarkdown(report, version, organization = 'AIWG') {
  const rows = [
    '# Socket post-publish audit', '',
    `- Release: \`${version}\``,
    `- Organization: ${organization}`,
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
  if (report.findings.validationErrors.length) {
    rows.push('## Export validation errors', '')
    for (const item of report.findings.validationErrors) rows.push(`- ${JSON.stringify(item)}`)
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
    const commitSha = args.commit ?? execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
    components = []
    for (const [lockIndex, lockArg] of args['dependency-lock'].entries()) {
      const lockPath = resolve(lockArg)
      const content = await readFile(lockPath, 'utf8')
      const lockfilePath = relative(process.cwd(), lockPath)
      const provenance = {
        commitSha,
        workspace: relative(process.cwd(), dirname(lockPath)) || '.',
        manifestPath: relative(process.cwd(), resolve(dirname(lockPath), lockPath.endsWith('Cargo.lock') ? 'Cargo.toml' : 'package.json')),
        lockfilePath,
        lockfileDigest: `sha256:${sha256(content)}`,
        releaseRoot: lockIndex === 0
      }
      components.push(...(lockPath.endsWith('Cargo.lock')
        ? componentsFromCargoLock(content, provenance)
        : componentsFromLock(JSON.parse(content), version, provenance)))
    }
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
  await writeFile(resolve(outputDir, 'socket-audit.md'), reportMarkdown(report, version, args.organization ?? baseline.organization ?? process.env.SOCKET_ORG_SLUG ?? 'AIWG'))
  console.log(`Socket post-publish audit: ${report.status} (${report.summary.directAlerts} direct, ${report.summary.transitiveAlerts} transitive alerts)`)
  if (report.status !== 'pass') process.exitCode = report.status === 'unavailable' ? 2 : 1
}

if (import.meta.url === pathToFileURL(resolve(process.argv[1] ?? basename(import.meta.url))).href) {
  main().catch(error => {
    console.error(`Socket post-publish audit failed: ${error instanceof Error ? error.message : String(error)}`)
    process.exitCode = 2
  })
}
