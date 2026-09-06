import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { diagnoseWriting, diagnoseWritingBatch, type DiagnosticOptions } from '../../../src/writing/contextual-diagnostics.js';

interface Label { start: number; end: number; text: string; ruleId: string; expectedDiagnostic: boolean; resolution: string }
interface Fixture { id: string; language: string; context: string; content: string; options: DiagnosticOptions; labels: Label[]; priorDocuments?: Array<{ id: string; content: string }> }
interface Counts { cases: number; positiveLabels: number; negativeLabels: number; tp: number; fp: number; fn: number }
const fixtures = JSON.parse(readFileSync('test/fixtures/writing/contextual-diagnostics.v1.json', 'utf8')) as { cases: Fixture[] };
const key = (item: { ruleId: string; start: number; end: number }) => `${item.ruleId}:${item.start}:${item.end}`;

function evaluate() {
  const groups = new Map<string, Counts>();
  const mismatches: string[] = [];
  for (const f of fixtures.cases) {
    const result = f.priorDocuments
      ? diagnoseWritingBatch([...f.priorDocuments, { id: f.id, content: f.content }], f.options).get(f.id)!
      : diagnoseWriting(f.content, f.options);
    const expected = new Map(f.labels.filter(l => l.expectedDiagnostic).map(l => [key(l), l]));
    const actual = new Map(result.diagnostics.map(d => [key(d), d]));
    const tp = [...actual.keys()].filter(k => expected.has(k)).length;
    const fp = actual.size - tp;
    const fn = expected.size - tp;
    for (const group of ['all', `language:${f.language}`, `context:${f.context}`, `language-context:${f.language}/${f.context}`]) {
      const counts = groups.get(group) ?? { cases: 0, positiveLabels: 0, negativeLabels: 0, tp: 0, fp: 0, fn: 0 };
      counts.cases++; counts.positiveLabels += expected.size; counts.negativeLabels += f.labels.filter(l => !l.expectedDiagnostic).length;
      counts.tp += tp; counts.fp += fp; counts.fn += fn; groups.set(group, counts);
    }
    for (const l of f.labels) {
      if (f.content.slice(l.start, l.end) !== l.text) mismatches.push(`${f.id}: invalid label ${key(l)}`);
      const found = actual.get(key(l));
      if (l.expectedDiagnostic && (!found || found.resolution !== l.resolution)) mismatches.push(`${f.id}: missing/wrong resolution ${key(l)}`);
      if (!l.expectedDiagnostic && found) mismatches.push(`${f.id}: unexpected ${key(l)}`);
    }
    if (actual.size !== result.diagnostics.length) mismatches.push(`${f.id}: duplicate finding`);
    for (const d of result.diagnostics) {
      if (!expected.has(key(d))) mismatches.push(`${f.id}: unlabelled finding ${key(d)}`);
      if (f.content.slice(d.start, d.end) !== d.text) mismatches.push(`${f.id}: invalid returned span`);
    }
    if (f.language === 'fr' && !result.notices.some(n => n.includes('No built-in phrase rules'))) mismatches.push(`${f.id}: missing language limitation`);
    if (result.publicationGate !== false) mismatches.push(`${f.id}: unexpected publication gate`);
  }
  const metrics = Object.fromEntries([...groups].map(([group, c]) => [group, { ...c, precision: c.tp + c.fp ? c.tp / (c.tp + c.fp) : null, recall: c.tp + c.fn ? c.tp / (c.tp + c.fn) : null }]));
  return { metrics, mismatches };
}

describe('developer-labeled contextual diagnostic fixture evaluation', () => {
  it('reports exact-span precision/recall by language and context without population claims', () => {
    const report = evaluate();
    console.log(`CONTEXTUAL_DIAGNOSTIC_FIXTURE_METRICS ${JSON.stringify(report.metrics)}`);
    expect(report.mismatches).toEqual([]);
  });
  it('uses null for undefined denominators in all-negative protected contexts', () => {
    const { metrics } = evaluate();
    expect(metrics['context:code'].precision).toBeNull();
    expect(metrics['context:code'].recall).toBeNull();
    expect(metrics['context:quote'].positiveLabels).toBe(0);
    expect(new Set(fixtures.cases.map(f => f.id)).size).toBe(fixtures.cases.length);
  });
});
