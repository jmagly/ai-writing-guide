/**
 * radar-status + radar-report tests (#1498).
 *
 * @source @src/artifacts/corpus-tools/radar-status.ts
 * @source @src/artifacts/corpus-tools/radar-report.ts
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { radarStatusRows, renderRadarStatus } from '../../../src/artifacts/corpus-tools/radar-status.js';
import { renderRadarReport } from '../../../src/artifacts/corpus-tools/radar-report.js';

let root: string;
const TODAY = '2026-05-26';

function daysAgo(n: number): string {
  return new Date(new Date(`${TODAY}T00:00:00Z`).getTime() - n * 86_400_000).toISOString().slice(0, 10);
}

function radar(rel: string, fm: string, body = ''): void {
  const full = join(root, 'documentation', 'radar', rel);
  mkdirSync(join(full, '..'), { recursive: true });
  writeFileSync(full, `---\n${fm}\n---\n${body}`);
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'aiwg-radarrep-'));
  // Overdue: quarterly, refreshed 100d ago -> +10 overdue.
  radar(
    'REF-600-radar.md',
    `ref: REF-600\ntitle: PID\ntype: radar\nrefresh-cadence: quarterly\nlast-refreshed: ${daysAgo(100)}\ncluster: pid-control\ngrade-current: A-\ngrade-trajectory: stable`,
    '# REF-600 Radar\n\n## 1. GRADE Re-Assessment\n\n| a | b |\n|---|---|\n\n**Rationale**: replicated twice since induction.\n\n## 2. Citation Signals\n',
  );
  // Not stale: annual, refreshed 30d ago.
  radar(
    'REF-601-radar.md',
    `ref: REF-601\ntitle: Beta\ntype: radar\nrefresh-cadence: annual\nlast-refreshed: ${daysAgo(30)}\ncluster: pid-control\ngrade-current: B\ngrade-trajectory: rising`,
  );
  // Never stale: on-demand.
  radar(
    'REF-602-radar.md',
    `ref: REF-602\ntitle: Gamma\ntype: radar\nrefresh-cadence: on-demand\nlast-refreshed: ${daysAgo(9999)}\ngrade-current: D\ngrade-trajectory: declining`,
  );
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('radarStatusRows', () => {
  it('sorts most-overdue-first and computes overdue correctly', () => {
    const rows = radarStatusRows(root, { today: TODAY });
    expect(rows.map((r) => r.refId)).toEqual(['REF-600', 'REF-601', 'REF-602']);
    expect(rows[0].overdueDays).toBe(10);
    expect(rows[0].isStale).toBe(true);
    expect(rows[1].isStale).toBe(false);
    expect(rows[2].overdueDays).toBeNull(); // on-demand
  });

  it('--stale-only returns just the overdue radars', () => {
    const rows = radarStatusRows(root, { today: TODAY, staleOnly: true });
    expect(rows.map((r) => r.refId)).toEqual(['REF-600']);
  });
});

describe('renderRadarStatus', () => {
  it('renders a markdown table by default', () => {
    const out = renderRadarStatus(radarStatusRows(root, { today: TODAY }), 'table');
    expect(out).toContain('| REF | GRADE | Cadence |');
    expect(out).toContain('| REF-600 | A- | quarterly |');
  });

  it('renders csv with a header row', () => {
    const out = renderRadarStatus(radarStatusRows(root, { today: TODAY }), 'csv');
    expect(out.split('\n')[0]).toBe('ref,cadence,last_refreshed,days_since,overdue_days,is_stale,grade,trajectory,cluster');
    expect(out).toContain('REF-600,quarterly,');
  });

  it('renders a plain list with overdue tags', () => {
    const out = renderRadarStatus(radarStatusRows(root, { today: TODAY }), 'list');
    expect(out).toContain('- REF-600 [A-] quarterly');
    expect(out).toContain('OVERDUE +10d');
  });
});

describe('renderRadarReport', () => {
  it('aggregates totals, clusters, grade/trajectory, overdue, and rationale snippet', () => {
    const out = renderRadarReport(root, { today: TODAY });
    expect(out).toContain('# Radar Report 2026-05-26');
    expect(out).toContain('**Total radars**: 3');
    expect(out).toContain('**Overdue (stale)**: 1');
    expect(out).toContain('| pid-control | 2 | 1 |');
    expect(out).toContain('| (untagged) | 1 | 0 |');
    expect(out).toContain('## Overdue Refreshes');
    expect(out).toContain('| REF-600 | quarterly |');
    expect(out).toContain('- Rationale: **Rationale**: replicated twice since induction.');
  });

  it('filters to a single cluster', () => {
    const out = renderRadarReport(root, { today: TODAY, cluster: 'pid-control' });
    expect(out).toContain('cluster `pid-control`');
    expect(out).toContain('**Total radars**: 2');
    expect(out).not.toContain('REF-602');
  });

  it('returns a friendly note for an empty corpus', () => {
    const bare = mkdtempSync(join(tmpdir(), 'aiwg-radarrep-bare-'));
    try {
      expect(renderRadarReport(bare, { today: TODAY })).toBe('No radar sidecars yet.\n');
    } finally {
      rmSync(bare, { recursive: true, force: true });
    }
  });
});
