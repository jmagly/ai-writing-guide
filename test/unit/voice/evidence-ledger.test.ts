import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { validateLedger } from '../../../agentic/code/addons/voice-framework/docs/natural-voice/validate-ledger.mjs';

const ledger = JSON.parse(readFileSync('agentic/code/addons/voice-framework/docs/natural-voice/evidence-ledger.v1.json', 'utf8'));

describe('natural voice evidence contract', () => {
  it('retains complete bounded records and explicitly unadopted additional methods', () => {
    expect(validateLedger(ledger)).toEqual([]);
  });
  it('rejects an anecdote promoted to a numerical release threshold', () => {
    const fixture = structuredClone(ledger);
    fixture.records.find(r => r.id === 'REF-2459').numericReleaseThresholdAllowed = true;
    fixture.claimPolicy.numericReleaseThresholds.push({ source: 'REF-2459', metric: 'machine-like', maximum: 4 });
    expect(validateLedger(fixture)).toContain('REF-2459: source cannot justify a numeric release threshold');
    expect(validateLedger(fixture)).toContain('This ledger has no validated release thresholds or human quality result');
  });
  it('rejects silent candidate adoption and missing evidence/version anchors', () => {
    const fixture = structuredClone(ledger);
    fixture.additionalSources[0].disposition = 'proven-default';
    fixture.records[0].record.url = fixture.records[0].record.url.replace(ledger.corpusCommit, 'main');
    fixture.records[1].verifiedLocator = '';
    const errors = validateLedger(fixture);
    expect(errors).toContain('PersonalBench: candidate cannot become a proven default');
    expect(errors).toContain('Unpinned artifact');
    expect(errors).toContain('REF-2453: missing verifiedLocator');
  });
});
