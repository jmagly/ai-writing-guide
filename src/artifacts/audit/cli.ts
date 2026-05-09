/**
 * `aiwg index doctor --rlm-audit` subcommand.
 *
 * Audits enriched index entries for content drift. Per-entry workflow:
 *   1. Read stored SemanticFields.
 *   2. Compute current artifact content hash.
 *   3. If hashes match: ok (or stale-age if past freshness window).
 *   4. If hashes differ: classify status as 'skip' (no recomputed input)
 *      or 'drift' (overlap/symbol thresholds exceeded).
 *
 * To classify drift the audit needs a *recomputed* enrichment for each
 * mismatching entry. Producing that requires an RLM dispatch, which lives
 * in agent skills, not the CLI. So this command operates in two passes:
 *
 *   Pass 1 (default):  Hash check only. Reports ok / stale-age / would-need-recompute.
 *   Pass 2 (--apply):  Operator supplies a directory of recomputed JSON
 *                      files (one per entry) and the audit classifies drift.
 *
 * @implements #1208
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  computeContentHash,
  list as listEnrichments,
  resolveSemanticRoot,
  get as getEnrichment,
} from '../enrichment/store.js';
import { validateEnrichmentOutput } from '../enrichment/prompt.js';
import { detectDrift } from './drift.js';
import { DEFAULT_THRESHOLDS, type AuditReport, type DriftRow, type DriftThresholds } from './types.js';
import type { SemanticFields } from '../enrichment/types.js';

export async function main(args: string[]): Promise<void> {
  if (!args.includes('--rlm-audit')) {
    printUsage();
    if (args.length > 0) process.exitCode = 1;
    return;
  }

  const filter   = flagValue(args, '--filter');
  const strict   = args.includes('--strict');
  const json     = args.includes('--json');
  const recompDir = flagValue(args, '--recomputed-dir');
  const thresholds = loadThresholds();
  const root = resolveSemanticRoot();

  // Build current-hash map for every enrichment that has a corresponding artifact
  const allSummaries = listEnrichments(root, /* currentHashes */ {});
  let summaries = allSummaries;
  if (filter) {
    const re = new RegExp(filter);
    summaries = allSummaries.filter((s) => re.test(s.artifactId));
  }

  const rows: DriftRow[] = [];
  for (const s of summaries) {
    const stored = getEnrichment(root, s.artifactId);
    let currentHash: string;
    try {
      currentHash = computeContentHash(readFileSync(s.artifactId));
    } catch {
      rows.push({
        artifactId:  s.artifactId,
        status:      'skip',
        reason:      'artifact not readable from configured path',
        storedHash:  stored.enrichedHash,
        currentHash: null,
        ageDays:     null,
      });
      continue;
    }

    let recomputed: SemanticFields | null = null;
    if (recompDir && stored.enrichedHash !== currentHash) {
      const sanitized = s.artifactId.replace(/\//g, '__');
      const candidate = join(recompDir, `${sanitized}.json`);
      if (existsSync(candidate)) {
        try {
          const raw = JSON.parse(readFileSync(candidate, 'utf-8')) as Record<string, unknown>;
          const issues = validateEnrichmentOutput(raw);
          if (issues.length === 0) {
            recomputed = {
              summary:         raw['summary'] as string,
              declaredSymbols: raw['declared_symbols'] as string[],
              citations:       raw['citations']        as string[],
              inferredTags:    raw['inferred_tags']    as string[],
              openQuestions:   raw['open_questions']   as string[],
              enrichedAt:      new Date().toISOString(),
              enrichedBy:      'audit-recompute',
              enrichedHash:    currentHash,
            };
          }
        } catch { /* leave recomputed null → status: skip */ }
      }
    }

    rows.push(
      detectDrift({
        artifactId: s.artifactId,
        stored,
        currentHash,
        recomputed,
        thresholds,
      }),
    );
  }

  const report: AuditReport = {
    total:      rows.length,
    ok:         rows.filter((r) => r.status === 'ok').length,
    drift:      rows.filter((r) => r.status === 'drift').length,
    staleAge:   rows.filter((r) => r.status === 'stale-age').length,
    skipped:    rows.filter((r) => r.status === 'skip').length,
    thresholds,
    rows,
  };

  if (json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printHumanReport(report);
  }

  if (strict && (report.drift > 0 || report.staleAge > 0)) {
    process.exitCode = 1;
  }
}

function loadThresholds(): DriftThresholds {
  // Try .aiwg/index/audit.config.yaml → fall back to defaults
  const path = join(process.cwd(), '.aiwg', 'index', 'audit.config.yaml');
  if (!existsSync(path)) return DEFAULT_THRESHOLDS;
  try {
    const yamlMod = require('js-yaml');
    const raw = (yamlMod.load(readFileSync(path, 'utf-8')) ?? {}) as Record<string, unknown>;
    const div = (raw['divergence'] ?? {}) as Record<string, unknown>;
    return {
      keywordOverlapMin:    typeof div['keyword_overlap_min']    === 'number' ? div['keyword_overlap_min']    as number : DEFAULT_THRESHOLDS.keywordOverlapMin,
      symbolChangeCritical: typeof div['symbol_change_critical'] === 'boolean' ? div['symbol_change_critical'] as boolean : DEFAULT_THRESHOLDS.symbolChangeCritical,
      freshnessMaxDays:     typeof div['freshness_max_days']     === 'number' ? div['freshness_max_days']     as number : DEFAULT_THRESHOLDS.freshnessMaxDays,
    };
  } catch {
    return DEFAULT_THRESHOLDS;
  }
}

function printHumanReport(r: AuditReport): void {
  console.log(`Audited ${r.total} enriched entries`);
  console.log(`  ok:        ${r.ok}`);
  console.log(`  drift:     ${r.drift}`);
  console.log(`  stale-age: ${r.staleAge}`);
  console.log(`  skipped:   ${r.skipped}`);
  console.log('');
  if (r.drift === 0 && r.staleAge === 0) return;

  console.log(`Thresholds: overlap ≥${(r.thresholds.keywordOverlapMin * 100).toFixed(0)}%, freshness ≤${r.thresholds.freshnessMaxDays}d`);
  console.log('');
  for (const row of r.rows) {
    if (row.status === 'ok' || row.status === 'skip') continue;
    const icon = row.status === 'drift' ? '⚠' : '⏰';
    console.log(`${icon} ${row.artifactId}`);
    console.log(`    ${row.reason}`);
    if (row.symbolDelta && (row.symbolDelta.added.length > 0 || row.symbolDelta.removed.length > 0)) {
      if (row.symbolDelta.added.length > 0)   console.log(`    + ${row.symbolDelta.added.join(', ')}`);
      if (row.symbolDelta.removed.length > 0) console.log(`    - ${row.symbolDelta.removed.join(', ')}`);
    }
    if (row.remediation) {
      console.log(`    fix: ${row.remediation}`);
    }
    console.log('');
  }
}

function flagValue(args: string[], flag: string): string | undefined {
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] ? args[i + 1] : undefined;
}

function printUsage(): void {
  console.log('aiwg index doctor --rlm-audit [options]');
  console.log('');
  console.log('Audits enriched index entries for content drift against the stored');
  console.log('semantic summary and declared-symbol set.');
  console.log('');
  console.log('Options:');
  console.log('  --filter <regex>             Restrict audit to artifact IDs matching regex');
  console.log('  --recomputed-dir <path>      Directory of recomputed enrichment JSONs');
  console.log('  --strict                     Exit non-zero on any drift or stale-age');
  console.log('  --json                       Emit JSON report');
  console.log('');
  console.log('Threshold config: .aiwg/index/audit.config.yaml');
}
