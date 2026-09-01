const SCHEMA = 'aiwg.civic.gate-result.v1';

function finding(code, severity, message, evidence = [], safeAlternative = '') {
  return { code, severity, message, evidence, safe_alternative: safeAlternative };
}

function report(gate, artifactId, findings, now = new Date()) {
  const status = findings.some((item) => item.severity === 'block')
    ? 'block'
    : findings.some((item) => item.severity === 'warn') ? 'warn' : 'pass';
  return {
    schema: SCHEMA,
    gate,
    artifact_id: artifactId || 'unknown-artifact',
    status,
    checked_at: now.toISOString(),
    findings,
    review: { required: true, reviewer: null, decision: 'pending', decided_at: null },
  };
}

function required(value, path, findings) {
  if (value === undefined || value === null || value === '') {
    findings.push(finding('REQUIRED_FIELD_MISSING', 'block', `Required field is missing: ${path}`, [path], 'Complete the versioned artifact and rerun the gate.'));
    return false;
  }
  return true;
}

export function evaluateSourceRegistry(value, options = {}) {
  const findings = [];
  required(value?.source_id, '/source_id', findings);
  required(value?.canonical_url, '/canonical_url', findings);
  required(value?.owner, '/owner', findings);
  required(value?.acquisition?.cadence, '/acquisition/cadence', findings);
  required(value?.citation?.format, '/citation/format', findings);

  if (value?.acquisition?.decision === 'prohibited') {
    findings.push(finding('ACQUISITION_PROHIBITED', 'block', 'The reviewed acquisition decision prohibits this method.', ['/acquisition/decision'], 'Use the documented public-record alternative or skip the source.'));
  } else if (value?.acquisition?.decision === 'public_record_alternative') {
    findings.push(finding('PUBLIC_RECORD_ALTERNATIVE_REQUIRED', 'block', 'Automated acquisition is replaced by a public-record request.', ['/acquisition/decision'], 'Prepare a draft request for named-human review and manual submission.'));
  } else if (value?.acquisition?.decision === 'uncertain') {
    findings.push(finding('ACQUISITION_UNCERTAIN', 'block', 'The acquisition method has not received a permissive decision.', ['/acquisition/decision'], 'Resolve terms, authority, and jurisdiction before acquisition.'));
  } else if (value?.acquisition?.decision === 'likely_allowed') {
    findings.push(finding('ACQUISITION_LIKELY_ALLOWED', 'warn', 'The acquisition decision is provisional.', ['/acquisition/decision'], 'Record a named-human disposition or obtain an allowed decision.'));
  }

  if (value?.access?.control_bypass_requested === true) {
    findings.push(finding('ACCESS_CONTROL_BYPASS', 'block', 'Access-control bypass is non-overridable.', ['/access/control_bypass_requested'], 'Use an official API/export, an authorized account, or a lawfully supplied copy.'));
  }
  if (!['authorized', 'not_required'].includes(value?.access?.authorization_state)) {
    findings.push(finding('AUTHORIZATION_UNRESOLVED', 'block', 'Source authorization is not established.', ['/access/authorization_state'], 'Resolve authorization with a named human reviewer.'));
  }
  if (!['allowed', 'not_applicable'].includes(value?.access?.robots_state)) {
    findings.push(finding('ROBOTS_NOT_ALLOWED', 'block', 'Robots state does not permit automated acquisition.', ['/access/robots_state'], 'Use manual review or an official export; robots permission is not legal authorization.'));
  }
  if (value?.access?.access_state !== 'allowed') {
    findings.push(finding('ACCESS_NOT_ALLOWED', 'block', 'Automated source access has not been approved.', ['/access/access_state'], 'Use the declared manual-only path or resolve the source review.'));
  }
  if (!['allowed', 'not_applicable'].includes(value?.rights?.terms_state)) {
    findings.push(finding('TERMS_NOT_ALLOWED', 'block', 'Terms state does not permit the proposed automated use.', ['/rights/terms_state'], 'Obtain a reviewed permission decision or use a link/hash-only workflow.'));
  }
  if (value?.rights?.publication_state !== 'allowed') {
    findings.push(finding('PUBLICATION_RIGHTS_NOT_ALLOWED', 'block', 'Retrieval permission does not establish publication permission.', ['/rights/publication_state'], 'Keep the source restricted or obtain publication review.'));
  }
  if (value?.review?.state !== 'approved' || !value?.review?.reviewer) {
    findings.push(finding('SOURCE_REVIEW_PENDING', 'block', 'A named human has not approved this source version.', ['/review'], 'Complete the source review against the exact registry version.'));
  }
  const now = options.now ?? new Date();
  const expires = value?.review?.expires_at ? new Date(value.review.expires_at) : null;
  if (expires && (!Number.isFinite(expires.getTime()) || expires <= now)) {
    findings.push(finding('SOURCE_REVIEW_EXPIRED', 'block', 'The source approval has expired.', ['/review/expires_at'], 'Revalidate current terms, access, rights, and jurisdiction.'));
  }
  if (['expired', 'unavailable'].includes(value?.freshness?.state) && value?.freshness?.safety_critical) {
    findings.push(finding('SAFETY_SOURCE_EXPIRED', 'block', 'Safety-critical content is expired or unavailable.', ['/freshness'], 'Do not present it as current; revalidate the authoritative source.'));
  } else if (['due', 'stale', 'expired', 'unknown', 'unavailable'].includes(value?.freshness?.state)) {
    findings.push(finding('SOURCE_FRESHNESS_UNCERTAIN', 'warn', 'Source freshness requires visible review.', ['/freshness/state'], 'Revalidate or display the last-verified time and limitation.'));
  }
  const observed = value?.empty_result?.observed_records;
  const minimum = value?.empty_result?.minimum_records;
  if (Number.isInteger(observed) && Number.isInteger(minimum) && observed < minimum) {
    const severity = value?.empty_result?.policy === 'warn' ? 'warn' : value?.empty_result?.policy === 'accept_if_authoritative_empty' ? 'record' : 'block';
    findings.push(finding('EMPTY_RESULT_THRESHOLD', severity, `Observed ${observed} record(s), below the declared minimum ${minimum}.`, ['/empty_result'], 'Verify an authoritative empty result, use the last-good copy, or stop publication.'));
  }
  if (Number.isInteger(observed) && observed !== (value?.retrievals?.length ?? 0)) {
    findings.push(finding('RETRIEVAL_COUNT_MISMATCH', 'block', 'Observed-record and retrieval counts differ.', ['/empty_result/observed_records', '/retrievals'], 'Reconcile the versioned retrieval inventory.'));
  }
  for (const [index, retrieval] of (value?.retrievals ?? []).entries()) required(retrieval?.content_hash, `/retrievals/${index}/content_hash`, findings);
  if (value?.fallback?.strategy === 'last_good_copy' && !value?.fallback?.last_good_copy_hash) {
    findings.push(finding('SOURCE_LAST_GOOD_COPY_MISSING', 'block', 'The selected fallback has no last-good-copy hash.', ['/fallback'], 'Capture an immutable last-good copy or select another reviewed fallback.'));
  }
  return report('source-compliance', value?.source_id, findings, now);
}

export function evaluateMeeting(ledger, reconciliation, options = {}) {
  const findings = [];
  required(ledger?.ledger_id, '/ledger_id', findings);
  required(ledger?.source_media_hash, '/source_media_hash', findings);
  if (ledger?.meeting_id !== reconciliation?.meeting_id) {
    findings.push(finding('MEETING_ID_MISMATCH', 'block', 'Ledger and reconciliation refer to different meetings.', ['/meeting_id'], 'Supply artifacts for the same meeting.'));
  }
  for (const [index, motion] of (ledger?.motions ?? []).entries()) {
    const path = `/motions/${index}`;
    if (!motion.source_cue_ids?.length) findings.push(finding('MOTION_SOURCE_MISSING', 'block', 'Motion lacks a source cue.', [path], 'Link the exact transcript/media selector.'));
    if (motion.verification_state === 'conflict' || motion.verification_state === 'unresolvable') findings.push(finding('VOTE_CONFLICT', 'block', 'Vote evidence is conflicted or unresolvable.', [path], 'Preserve the conflict and obtain human verification.'));
    if (!['human_verified', 'corroborated'].includes(motion.verification_state) || !motion.verified_by) findings.push(finding('VOTE_NOT_HUMAN_VERIFIED', 'block', 'Vote is not verified by a named human.', [path], 'Verify the source media or corroborating official record.'));
    if (motion.announced_result && motion.calculated_result && motion.announced_result !== motion.calculated_result) findings.push(finding('VOTE_TOTAL_MISMATCH', 'block', 'Announced and calculated results differ.', [path], 'Record the conflict; do not auto-correct either source.'));
    for (const [voteIndex, vote] of (motion.vote_entries ?? []).entries()) {
      if (['absent', 'abstain', 'recused', 'yes', 'no'].includes(vote.choice) && !vote.source_cue_id) findings.push(finding('VOTE_INFERRED_WITHOUT_SOURCE', 'block', 'A member choice lacks a source cue.', [`${path}/vote_entries/${voteIndex}`], 'Use unknown until explicit evidence is linked.'));
    }
  }
  for (const [index, comparison] of (reconciliation?.comparisons ?? []).entries()) {
    if (['mismatch', 'ambiguous', 'human_review_required'].includes(comparison.relation) && comparison.decision === 'pending') findings.push(finding('RECONCILIATION_PENDING', comparison.materiality === 'material' ? 'block' : 'warn', 'A reconciliation difference remains pending.', [`/comparisons/${index}`], 'Have a human accept, correct, or annotate the difference.'));
  }
  if (reconciliation?.human_review?.state !== 'approved' || !reconciliation?.human_review?.reviewer) findings.push(finding('MEETING_REVIEW_PENDING', 'block', 'A named human has not approved the reconciliation.', ['/human_review'], 'Complete review of votes, speakers, source boundaries, and minutes state.'));
  return report('meeting-reconciliation', ledger?.ledger_id, findings, options.now ?? new Date());
}

export function evaluatePublication(packet, options = {}) {
  const findings = [];
  required(packet?.artifact_id, '/artifact_id', findings);
  required(packet?.artifact_hash, '/artifact_hash', findings);
  if (!packet?.sections?.length) {
    findings.push(finding('CONTENT_EMPTY', 'block', 'Publication contains no declared content sections.', ['/sections'], 'Supply the reviewed content sections and rerun the gate.'));
  }
  for (const [index, section] of (packet?.sections ?? []).entries()) {
    if (!Number.isFinite(section.content_length) || section.content_length <= 0) findings.push(finding('SECTION_EMPTY', 'block', `Publication section is empty: ${section.id ?? index}`, [`/sections/${index}`], 'Remove the empty section or provide reviewed content.'));
    if (section.required && Number.isInteger(section.record_count) && Number.isInteger(section.minimum_count) && section.record_count < section.minimum_count) findings.push(finding('SECTION_MINIMUM_COUNT_UNMET', 'block', `Required section is below its minimum record count: ${section.id ?? index}`, [`/sections/${index}`], 'Restore the minimum cited records or withhold the section.'));
    if (section.required && ['expired', 'unavailable'].includes(section.freshness_state)) findings.push(finding('SECTION_SOURCE_EXPIRED', 'block', `Required section has expired or unavailable evidence: ${section.id ?? index}`, [`/sections/${index}`], 'Refresh the section or use a reviewed last-good copy with visible limitations.'));
    else if (section.required && ['due', 'stale', 'unknown'].includes(section.freshness_state)) findings.push(finding('SECTION_FRESHNESS_REVIEW', 'warn', `Required section needs freshness review: ${section.id ?? index}`, [`/sections/${index}`], 'Revalidate or record a visible named-human disposition.'));
  }
  for (const [index, link] of (packet?.links ?? []).entries()) {
    if (!Number.isInteger(link.http_status) || link.http_status >= 400) findings.push(finding(link.material ? 'MATERIAL_LINK_BROKEN' : 'LINK_UNVERIFIED', link.material ? 'block' : 'warn', `Link is unavailable or unverified: ${link.url ?? '(missing URL)'}`, [`/links/${index}`], 'Repair, replace, archive, or visibly qualify the link.'));
  }
  for (const [index, claim] of (packet?.claims ?? []).entries()) {
    const path = `/claims/${index}`;
    if (claim.material && !claim.citations?.length) findings.push(finding('MATERIAL_CLAIM_UNCITED', 'block', 'A material claim lacks a source selector.', [path], 'Add a resolvable source/retrieval selector or remove/qualify the claim.'));
    if (claim.material && ['expired', 'unavailable'].includes(claim.freshness_state)) findings.push(finding('MATERIAL_SOURCE_EXPIRED', 'block', 'A material claim relies on expired or unavailable evidence.', [path], 'Revalidate the source or qualify/remove the claim.'));
    else if (claim.material && ['due', 'stale', 'unknown'].includes(claim.freshness_state)) findings.push(finding('MATERIAL_SOURCE_STALE', 'warn', 'A material claim relies on evidence requiring freshness review.', [path], 'Revalidate or record a visible human disposition.'));
    if (!['official_record', 'reported_allegation', 'verified_fact', 'analysis', 'opinion', 'unknown_or_disputed'].includes(claim.status)) findings.push(finding('CLAIM_STATUS_INVALID', 'block', 'Claim epistemic status is missing or invalid.', [path], 'Classify the claim without promoting it by model confidence.'));
    if (claim.status === 'reported_allegation' && !claim.attributed) findings.push(finding('ALLEGATION_UNATTRIBUTED', 'block', 'An allegation is not attributed.', [path], 'Attribute precisely, preserve dispute/response, and avoid conclusory presentation.'));
  }
  for (const [index, gate] of (packet?.upstream_gates ?? []).entries()) {
    if (gate.status === 'block') findings.push(finding('UPSTREAM_GATE_BLOCKED', 'block', `Upstream gate is blocked: ${gate.gate_id}`, [`/upstream_gates/${index}`], 'Remediate the original blocking result; do not downgrade it.'));
    if (gate.status === 'warn') findings.push(finding('UPSTREAM_GATE_WARNING', 'warn', `Upstream gate requires disposition: ${gate.gate_id}`, [`/upstream_gates/${index}`], 'Record a named human disposition before publication.'));
  }
  if (packet?.structured_data?.status === 'fail') findings.push(finding('STRUCTURED_DATA_INVALID', 'block', 'Structured-data validation failed.', ['/structured_data'], 'Correct the declared format and rerun its validator.'));
  else if (!['pass', 'not_applicable'].includes(packet?.structured_data?.status)) findings.push(finding('STRUCTURED_DATA_PENDING', 'block', 'Structured-data validation is incomplete.', ['/structured_data'], 'Complete or explicitly mark the check not applicable.'));
  if (packet?.privacy?.status !== 'pass') findings.push(finding('PRIVACY_REVIEW_INCOMPLETE', 'block', 'Privacy/minimization review has not passed.', ['/privacy'], 'Review personal data, redactions, safety, retention, and public-interest necessity.'));
  if (packet?.accessibility?.automated_status === 'fail') findings.push(finding('ACCESSIBILITY_KNOWN_FAILURE', 'block', 'Automated accessibility testing found a known failure.', ['/accessibility/automated_status'], 'Remediate the failure and rerun the complete process.'));
  if (packet?.accessibility?.manual_status !== 'pass') findings.push(finding('ACCESSIBILITY_MANUAL_REVIEW_REQUIRED', 'block', 'Required manual accessibility evaluation is incomplete.', ['/accessibility/manual_status'], 'Complete scoped manual evaluation; an automated pass is not conformance.'));
  if (['withheld', 'canceled'].includes(packet?.publication_state)) findings.push(finding('PUBLICATION_STATE_BLOCKED', 'block', 'The artifact is withheld or canceled.', ['/publication_state'], 'Use a later approved usable version.'));
  if (packet?.correction?.open_blocking === true) findings.push(finding('CORRECTION_UNRESOLVED', 'block', 'A blocking correction remains unresolved.', ['/correction'], 'Complete the append-only correction and rerun all affected gates.'));
  if (packet?.correction?.pending_reindex_targets > 0) findings.push(finding('CORRECTION_REINDEX_PENDING', 'block', 'Required owned correction/reindex propagation remains pending.', ['/correction/pending_reindex_targets'], 'Update owned downstream targets and attach completion evidence.'));
  if (!['available', 'first_publication'].includes(packet?.deployment?.last_good_copy_state)) findings.push(finding('LAST_GOOD_COPY_MISSING', 'block', 'No verified last-good-copy or first-publication state is declared.', ['/deployment/last_good_copy_state'], 'Capture a rollback copy or explicitly review first-publication rollback behavior.'));
  if (packet?.deployment?.verification_state !== 'pass') findings.push(finding('DEPLOYMENT_VERIFICATION_PENDING', 'block', 'Vendor-neutral publication verification has not passed.', ['/deployment/verification_state'], 'Run the configured static/CMS verification adapter and retain its receipt.'));
  if (packet?.deployment?.live_page_state !== 'pass') findings.push(finding('LIVE_PAGE_VERIFICATION_PENDING', 'block', 'The deployed page has not passed live verification.', ['/deployment/live_page_state'], 'Verify the live URL, content hash, and required sections.'));
  for (const field of ['sitemap_state', 'reindex_state', 'cache_state']) {
    if (!['pass', 'not_applicable'].includes(packet?.deployment?.[field])) findings.push(finding(`DEPLOYMENT_${field.toUpperCase()}_PENDING`, 'block', `${field.replaceAll('_', ' ')} is incomplete.`, [`/deployment/${field}`], 'Complete the adapter handoff or document that it is not applicable.'));
  }
  const review = packet?.human_review;
  if (review?.state !== 'approved' || !review?.reviewer || review?.artifact_hash !== packet?.artifact_hash) findings.push(finding('HUMAN_PUBLICATION_APPROVAL_MISSING', 'block', 'A named human has not approved the exact artifact hash.', ['/human_review'], 'Review the underlying sources and approve the exact version.'));
  return report('publication', packet?.artifact_id, findings, options.now ?? new Date());
}

export function exitCodeFor(reportValue) {
  return reportValue.status === 'block' ? 1 : 0;
}
