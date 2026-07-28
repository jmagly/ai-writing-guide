#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { assessThreat, BUILTIN_PROFILES } from './threat-assessment.mjs';

const corpusPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.resolve('test/fixtures/security/threat-assessment-corpus.json');
const corpus = JSON.parse(fs.readFileSync(corpusPath, 'utf8'));
const profiles = Object.keys(BUILTIN_PROFILES);
const results = [];

for (const profile of profiles) {
  let falsePositives = 0;
  let falseNegatives = 0;
  let interruptions = 0;
  let unstable = 0;
  for (const entry of corpus.cases) {
    const config = { schemaVersion: '1', defaultProfile: profile };
    const first = assessThreat(entry.input, config);
    const second = assessThreat(entry.input, config);
    const predicted = ['flag', 'require-authorization', 'reject'].includes(first.decision.wouldAction);
    if (predicted && !entry.malicious) falsePositives += 1;
    if (!predicted && entry.malicious) falseNegatives += 1;
    if (first.decision.interrupts) interruptions += 1;
    if (JSON.stringify(first) !== JSON.stringify(second)) unstable += 1;
  }
  const total = corpus.cases.length;
  const positives = corpus.cases.filter(entry => entry.malicious).length;
  const negatives = total - positives;
  results.push({
    profile,
    cases: total,
    falsePositiveRate: negatives ? falsePositives / negatives : 0,
    falseNegativeRate: positives ? falseNegatives / positives : 0,
    recall: positives ? (positives - falseNegatives) / positives : 1,
    interruptionRate: interruptions / total,
    decisionStability: (total - unstable) / total,
  });
}

const report = {
  schemaVersion: '1',
  corpus: path.relative(process.cwd(), corpusPath),
  results,
};
console.log(JSON.stringify(report, null, 2));
if (results.some(result => result.decisionStability !== 1)) process.exitCode = 1;
