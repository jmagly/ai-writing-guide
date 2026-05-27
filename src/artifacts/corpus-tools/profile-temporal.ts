/**
 * profile-temporal — publication trajectory + hot-streak detection (#1501).
 *
 * Port of profiles/temporal_analysis.py (stdlib): per-year paper counts, topic
 * drift (cosine distance between consecutive-year topic vectors), hot-streak
 * detection (≥3 consecutive years with ≥1 A-grade paper, Fortunato 2018),
 * career-phase classification, and trajectory trend. Reuses the #1497 parser
 * (year + topics) + the analysis-doc GRADE reader.
 *
 * @source historical: profiles/temporal_analysis.py
 */

import { loadCorpus, loadProfiles, type RefRecord } from '../corpus-views/ref-parser.js';
import { readAnalysisGrade } from './radar-shared.js';

export interface AnnualDatum {
  year: number;
  paperCount: number;
  grades: string[];
  topTopics: string[];
  topicDrift: number | null;
  hasAGrade: boolean;
}
export interface HotStreak {
  startYear: number;
  length: number;
  active?: boolean;
}
export interface Trajectory {
  profId: string;
  annualData: AnnualDatum[];
  hotStreak: HotStreak | null;
  careerPhase: 'early' | 'mid' | 'senior' | 'unknown';
  trajectoryTrend: string;
  firstYear: number | null;
  lastYear: number | null;
  totalPapers: number;
}

function topicVector(topics: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const t of topics) counts.set(t, (counts.get(t) ?? 0) + 1);
  const mag = Math.sqrt([...counts.values()].reduce((a, b) => a + b * b, 0));
  if (mag === 0) return new Map();
  const v = new Map<string, number>();
  for (const [t, c] of counts) v.set(t, c / mag);
  return v;
}

function cosineDistance(a: Map<string, number>, b: Map<string, number>): number {
  if (!a.size || !b.size) return 0;
  const keys = new Set([...a.keys(), ...b.keys()]);
  let dot = 0;
  for (const k of keys) dot += (a.get(k) ?? 0) * (b.get(k) ?? 0);
  const m1 = Math.sqrt([...a.values()].reduce((s, x) => s + x * x, 0));
  const m2 = Math.sqrt([...b.values()].reduce((s, x) => s + x * x, 0));
  if (m1 === 0 || m2 === 0) return 0;
  return Math.round((1 - dot / (m1 * m2)) * 1e4) / 1e4;
}

function detectHotStreak(annual: AnnualDatum[]): HotStreak | null {
  let best: HotStreak | null = null;
  let start: number | null = null;
  let len = 0;
  const close = (active: boolean) => {
    if (len >= 3 && (best === null || len > best.length)) best = { startYear: start!, length: len, ...(active ? { active: true } : {}) };
  };
  for (const d of annual) {
    if (d.hasAGrade) {
      if (start === null) { start = d.year; len = 1; }
      else len++;
    } else {
      close(false);
      start = null;
      len = 0;
    }
  }
  close(true);
  return best;
}

/** Compute the temporal trajectory for one PROF-P/PROF-O profile. */
export function computeTrajectory(corpusRoot: string, profId: string, asOfYear = new Date().getUTCFullYear()): Trajectory {
  const profiles = loadProfiles(corpusRoot);
  const profile = profiles.find((p) => p.profId === profId);
  const empty: Trajectory = { profId, annualData: [], hotStreak: null, careerPhase: 'unknown', trajectoryTrend: 'insufficient data', firstYear: null, lastYear: null, totalPapers: 0 };
  if (!profile) return empty;

  const { records } = loadCorpus(corpusRoot);
  const byId = new Map<string, RefRecord>(records.map((r) => [r.refId, r]));

  const yearly = new Map<number, { grade: string; topics: string[] }[]>();
  for (const ref of profile.corpusRefs) {
    const rec = byId.get(ref);
    if (!rec || rec.year == null) continue;
    const grade = readAnalysisGrade(corpusRoot, ref);
    (yearly.get(rec.year) ?? yearly.set(rec.year, []).get(rec.year)!).push({ grade, topics: rec.topics });
  }
  if (yearly.size === 0) return empty;

  const years = [...yearly.keys()].sort((a, b) => a - b);
  const annualData: AnnualDatum[] = [];
  let prev = new Map<string, number>();
  for (const year of years) {
    const papers = yearly.get(year)!;
    const topics = papers.flatMap((p) => p.topics);
    const grades = papers.map((p) => p.grade);
    const tv = topicVector(topics);
    annualData.push({
      year,
      paperCount: papers.length,
      grades,
      topTopics: [...tv.keys()].slice(0, 3),
      topicDrift: prev.size ? cosineDistance(prev, tv) : null,
      hasAGrade: grades.some((g) => g.toUpperCase().startsWith('A')),
    });
    prev = tv;
  }

  const firstYear = years[0];
  const careerLength = asOfYear - firstYear;
  const careerPhase = careerLength <= 5 ? 'early' : careerLength <= 15 ? 'mid' : 'senior';
  const recent = annualData.slice(-3);
  const counts = recent.map((d) => d.paperCount);
  const trend = counts.length >= 2 ? (counts[counts.length - 1] > counts[0] ? 'accelerating' : counts[counts.length - 1] < counts[0] ? 'decelerating' : 'stable') : 'insufficient data';

  return {
    profId,
    annualData,
    hotStreak: detectHotStreak(annualData),
    careerPhase,
    trajectoryTrend: trend,
    firstYear,
    lastYear: years[years.length - 1],
    totalPapers: annualData.reduce((s, d) => s + d.paperCount, 0),
  };
}

/** Render a trajectory as a markdown summary + the §7 year table. */
export function renderTrajectory(t: Trajectory): string {
  if (!t.annualData.length) return `${t.profId}: no dated corpus papers.\n`;
  const hs = t.hotStreak ? `${t.hotStreak.length} years from ${t.hotStreak.startYear}${t.hotStreak.active ? ' (active)' : ''}` : 'none detected';
  const lines = [
    `# ${t.profId} — publication trajectory`,
    '',
    `Career phase: **${t.careerPhase}** · trend: **${t.trajectoryTrend}** · ${t.firstYear}–${t.lastYear} · ${t.totalPapers} papers`,
    `Hot streak: ${hs}`,
    '',
    '| Year | Papers | Top Topics | Topic Drift |',
    '|---|---:|---|---|',
  ];
  for (const d of t.annualData) {
    const drift = d.topicDrift == null ? '—' : d.topicDrift > 0.3 ? `${d.topicDrift} *(pivot)*` : String(d.topicDrift);
    lines.push(`| ${d.year} | ${d.paperCount} | ${d.topTopics.join(', ') || '—'} | ${drift} |`);
  }
  return lines.join('\n') + '\n';
}
