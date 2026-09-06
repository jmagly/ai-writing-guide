import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** Validate evidence policy; optionally verify every pinned artifact against a corpus checkout. */
export function validateLedger(ledger, corpusRoot) {
  const errors = [];
  const expected = Array.from({ length: 8 }, (_, i) => `REF-${2452 + i}`);
  if (ledger.schemaVersion !== 1 || !/^\d+\.\d+\.\d+$/.test(ledger.ledgerVersion ?? '')) errors.push('Unsupported ledger version');
  if (!/^[a-f0-9]{40}$/.test(ledger.corpusCommit ?? '')) errors.push('Missing corpus commit');
  const ids = ledger.records?.map(r => r.id) ?? [];
  if (ids.length !== 8 || expected.some(id => !ids.includes(id))) errors.push('Eight unique inducted records required');
  if (ledger.claimPolicy?.sourceGradeIsProductConfidence !== false || ledger.claimPolicy?.detectorDefinesNaturalness !== false) errors.push('Evidence and quality policies must remain separate');
  if (ledger.claimPolicy?.numericReleaseThresholds?.length !== 0 || ledger.claimPolicy?.humanQualityValidated !== false) errors.push('This ledger has no validated release thresholds or human quality result');
  const checkArtifact = a => {
    if (!a || !/^[a-f0-9]{64}$/.test(a.sha256 ?? '') || a.url !== `https://git.integrolabs.net/section9/research-papers/src/commit/${ledger.corpusCommit}/${a.path}`) {
      errors.push('Unpinned artifact'); return;
    }
    if (corpusRoot) {
      try {
        const bytes = execFileSync('git', ['-C', corpusRoot, 'show', `${ledger.corpusCommit}:${a.path}`], { maxBuffer: 64 * 1024 * 1024 });
        if (createHash('sha256').update(bytes).digest('hex') !== a.sha256) errors.push(`Hash mismatch: ${a.path}`);
      } catch { errors.push(`Missing pinned artifact: ${a.path}`); }
    }
  };
  checkArtifact(ledger.synthesis);
  for (const r of ledger.records ?? []) {
    for (const key of ['sourceVersion', 'corpusGrade', 'evidenceClass', 'productClaimConfidence', 'verifiedLocator', 'supportedInference', 'boundary', 'disposition', 'modelProviderScope']) {
      if (typeof r[key] !== 'string' || !r[key].trim()) errors.push(`${r.id}: missing ${key}`);
    }
    if (!r.primaryUrls?.length || r.primaryUrls.some(u => !URL.canParse(u) || !u.startsWith('https://'))) errors.push(`${r.id}: primary URL required`);
    if (r.numericReleaseThresholdAllowed !== false) errors.push(`${r.id}: source cannot justify a numeric release threshold`);
    if (r.experiment?.status !== 'not-run' || !r.experiment?.design) errors.push(`${r.id}: experiment is unrun`);
    checkArtifact(r.record);
    if (!r.sourceArtifacts?.length) errors.push(`${r.id}: no source artifacts`);
    r.sourceArtifacts?.forEach(checkArtifact);
  }
  if (ledger.additionalSources?.length !== 3) errors.push('Three additional source dispositions required');
  for (const r of ledger.additionalSources ?? []) {
    if (r.disposition !== 'defer-method-adoption' || r.numericReleaseThresholdAllowed !== false || r.experiment?.status !== 'not-run') errors.push(`${r.id}: candidate cannot become a proven default`);
    if (!r.primaryUrl?.endsWith(r.sourceVersion) || !r.assessment || !r.acquisition?.scope || !/^[a-f0-9]{64}$/.test(r.acquisition?.sha256 ?? '')) errors.push(`${r.id}: acquisition/version assessment required`);
  }
  return errors;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const ledger = JSON.parse(readFileSync(new URL('./evidence-ledger.v1.json', import.meta.url), 'utf8'));
  const errors = validateLedger(ledger, process.argv[2]);
  if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
  else console.log(`Evidence ledger valid${process.argv[2] ? '; all pinned corpus hashes verified' : '; corpus bytes not checked (pass checkout path to verify)'}. No human quality claim validated.`);
}
