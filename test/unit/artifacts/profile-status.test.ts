/**
 * profile-status tests (#1502) — find_stale_profiles port.
 *
 * @source @src/artifacts/corpus-tools/profile-status.ts
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { profileStatusRows, renderProfileStatus } from '../../../src/artifacts/corpus-tools/profile-status.js';

let root: string;
const TODAY = '2026-05-26';

function daysAgo(n: number): string {
  return new Date(new Date(`${TODAY}T00:00:00Z`).getTime() - n * 86_400_000).toISOString().slice(0, 10);
}

function profile(sub: string, file: string, fm: string): void {
  const full = join(root, 'documentation', 'profiles', sub, file);
  mkdirSync(join(full, '..'), { recursive: true });
  writeFileSync(full, `---\n${fm}\n---\n# Profile\n`);
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'aiwg-profstatus-'));
  // semi-annual (180), refreshed 200d ago -> overdue +20, stale.
  profile('people', 'PROF-P-lee.md', `prof-id: PROF-P-lee\nname: Lee\ntype: person\nrefresh-cadence: semi-annual\nlast-refreshed: ${daysAgo(200)}`);
  // annual, refreshed 30d ago -> not stale.
  profile('orgs', 'PROF-O-acme.md', `prof-id: PROF-O-acme\nname: ACME\ntype: org\nrefresh-cadence: annual\nlast-refreshed: ${daysAgo(30)}`);
  // on-demand -> never stale.
  profile('people', 'PROF-P-ng.md', `prof-id: PROF-P-ng\nname: Ng\ntype: person\nrefresh-cadence: on-demand\nlast-refreshed: ${daysAgo(9999)}`);
  // no last-refreshed -> skipped.
  profile('groups', 'PROF-G-team.md', `prof-id: PROF-G-team\nname: Team\ntype: group\nrefresh-cadence: quarterly`);
  // unknown cadence -> treated as annual (365); 400d ago -> overdue +35, stale.
  profile('funders', 'PROF-F-nsf.md', `prof-id: PROF-F-nsf\nname: NSF\ntype: funder\nrefresh-cadence: whenever\nlast-refreshed: ${daysAgo(400)}`);
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('profileStatusRows', () => {
  it('computes staleness with semi-annual=180 and sorts most-overdue-first', () => {
    const rows = profileStatusRows(root, { today: TODAY });
    expect(rows.map((r) => r.profId)).toEqual(['PROF-F-nsf', 'PROF-P-lee', 'PROF-O-acme', 'PROF-P-ng']);
    const lee = rows.find((r) => r.profId === 'PROF-P-lee')!;
    expect(lee.cadence).toBe('semi-annual');
    expect(lee.overdueDays).toBe(20); // 200 - 180
    expect(lee.isStale).toBe(true);
  });

  it('treats an unknown cadence as annual (365)', () => {
    const nsf = profileStatusRows(root, { today: TODAY }).find((r) => r.profId === 'PROF-F-nsf')!;
    expect(nsf.cadence).toBe('annual'); // normalized from 'whenever'
    expect(nsf.overdueDays).toBe(35); // 400 - 365
    expect(nsf.isStale).toBe(true);
  });

  it('never marks on-demand profiles stale and skips profiles without last-refreshed', () => {
    const rows = profileStatusRows(root, { today: TODAY });
    expect(rows.find((r) => r.profId === 'PROF-P-ng')!.isStale).toBe(false);
    expect(rows.some((r) => r.profId === 'PROF-G-team')).toBe(false); // no last-refreshed
  });

  it('--stale-only returns only overdue profiles', () => {
    const rows = profileStatusRows(root, { today: TODAY, staleOnly: true });
    expect(rows.map((r) => r.profId)).toEqual(['PROF-F-nsf', 'PROF-P-lee']);
  });
});

describe('renderProfileStatus', () => {
  it('renders table / csv / list', () => {
    const rows = profileStatusRows(root, { today: TODAY });
    expect(renderProfileStatus(rows, 'table')).toContain('| PROF-P-lee | person | semi-annual |');
    expect(renderProfileStatus(rows, 'csv').split('\n')[0]).toBe('prof_id,type,cadence,last_refreshed,days_since,overdue_days,is_stale');
    expect(renderProfileStatus(rows, 'list')).toContain('STALE +20d');
  });
});
