import fs from 'node:fs/promises';
import { artifact, digest, validateContract } from './contracts.mjs';
import { inventoryWorkspace } from './inventory.mjs';
import { verifyReceipt } from './collector.mjs';

const REVIEW_FIELDS = ['sut', 'claim', 'oracle', 'validity', 'isolation', 'determinism', 'normalization', 'maintainability', 'scope'];
const sameSet = (a, b) => a.length === b.length && new Set(a).size === a.length && [...a].sort().every((v, i) => v === [...b].sort()[i]);

/** Assess only current source-bound evidence. Missing evidence is an explicit gate,
 * never a passing default. Source review remains a declared human/agent judgment,
 * not an automated proof of semantic correctness or an authenticated identity.
 */
export async function assessConformance(root, protocol, { inventory, evidence = [], reviews, previous } = {}) {
  root = await fs.realpath(root);
  await validateContract(protocol, 'conformance-protocol.v1');
  const current = await inventoryWorkspace(root, protocol);
  const gates = [];
  const gate = (id, status, message, references = []) => gates.push({ id, status, message, references });
  const protocolHash = digest(protocol), snapshotHash = current.spec.snapshotHash;
  gate('inventory', current.spec.complete ? 'passed' : 'unknown', current.spec.complete ? 'Current test, source and configuration scope was inventoried.' : 'Inventory scope has unresolved diagnostics.', current.spec.diagnostics.map(d => `${d.code}: ${d.path || d.message}`));
  if (inventory && (inventory.spec?.snapshotHash !== snapshotHash || inventory.spec?.protocolHash !== protocolHash || inventory.spec?.root !== root)) gate('supplied-inventory', 'unknown', 'Supplied inventory is stale or belongs to a different root/protocol. Current source was independently scanned.');
  const receipts = Array.isArray(evidence) ? evidence : [];
  if (!Array.isArray(evidence)) gate('evidence-input', 'unknown', 'Evidence must be an array of source-bound TestRunReceipt artifacts.');
  const trusted = [];
  const controlReceipts = [];
  for (const [index, receipt] of receipts.entries()) {
    if (receipt?.kind === 'TestNegativeControlReceipt') { controlReceipts.push(receipt); continue; }
    let errors;
    try { errors = await verifyReceipt(root, protocol, receipt, { inventory: current }); }
    catch (error) { errors = [{ code: 'INVALID_RECEIPT', message: error.message }]; }
    if (errors.length) gate(`receipt-${index}`, 'unknown', 'Receipt failed current-source or raw-evidence verification.', errors.map(e => `${e.code}: ${e.message}`));
    else if (!Array.isArray(receipt.spec.lanes) || !['execution', 'discovery'].includes(receipt.spec.mode)) gate(`receipt-${index}`, 'unknown', 'Receipt has no valid lane collection mode.');
    else if (receipt.spec.diagnostics?.length) gate(`receipt-${index}`, 'unknown', 'Collection receipt retains unresolved diagnostics.', receipt.spec.diagnostics.map(e => `${e.code}: ${e.message}`));
    else trusted.push(receipt);
  }
  const boundLane = (definition, mode) => {
    const candidates = trusted.flatMap(r => r.spec.mode === mode ? r.spec.lanes.filter(l => l.id === definition.id).map(l => ({ lane: l, receipt: r })) : []);
    if (candidates.length !== 1) {
      gate(`${definition.id}-${mode}`, 'unknown', candidates.length ? 'Multiple current receipts make lane selection ambiguous; supply one selected run per lane/mode.' : 'No verified current receipt supplies this lane/mode.');
      return null;
    }
    const { lane, receipt } = candidates[0];
    const recipe = mode === 'execution' ? definition : definition.discovery;
    const argv = recipe?.command.argv.map(a => a.replaceAll('{runId}', receipt.spec.runId));
    if (!recipe || !lane.process || lane.mode !== mode || lane.runner !== definition.runner || lane.process.cwd !== root || digest(lane.process.argv) !== digest(argv) || lane.process.environment?.explicitValuesHash !== digest(recipe.command.env || {}) || !lane.report || lane.report.format !== recipe.result.format) {
      gate(`${definition.id}-${mode}`, 'unknown', 'Receipt does not bind the configured lane command, environment, reporter and execution mode.');
      return null;
    }
    if (lane.process.reason !== 'exit' || lane.process.signal || lane.diagnostics?.length) {
      gate(`${definition.id}-${mode}`, 'unknown', 'Runner did not complete cleanly or retained collection diagnostics.');
      return null;
    }
    return lane;
  };
  const required = protocol.spec.lanes.filter(l => l.required);
  const verifiedExecutions = new Map();
  const verifiedDiscoveries = new Map();
  if (!required.length) gate('required-lanes', 'unknown', 'No required lanes are defined; optional observations cannot certify the testing regime.');
  for (const definition of required) {
    const execution = boundLane(definition, 'execution');
    if (execution) {
      verifiedExecutions.set(definition.id, execution);
      const n = execution.normalized;
      if (n.summary.failed || n.files.some(f => f.status === 'failed') || execution.process.exitCode !== 0) gate(`${definition.id}-execution`, 'failed', 'Required lane contains failed test/suite or a failed process exit.');
      else if (!n.complete || !n.cases.length || !n.summary.passed || n.cases.some(c => c.status === 'unknown') || n.files.some(f => f.status === 'unknown')) gate(`${definition.id}-execution`, 'unknown', 'Required lane lacks complete evidence of executed passing cases.');
      else if (!protocol.spec.policy.allowSkipped && (n.summary.skipped || n.files.some(f => f.status === 'skipped'))) gate(`${definition.id}-execution`, 'failed', 'Required lane skips are disallowed by protocol.');
      else gate(`${definition.id}-execution`, 'passed', 'Required lane executed with complete passing evidence under the configured skip policy.', n.cases.map(c => c.id));
    }
    if (protocol.spec.policy.requireDiscovery) {
      const discovery = boundLane(definition, 'discovery');
      if (discovery) {
        if (discovery.normalized.complete && discovery.process.exitCode === 0) verifiedDiscoveries.set(definition.id, discovery);
        if (!discovery.normalized.complete || discovery.process.exitCode !== 0) gate(`${definition.id}-discovery`, 'unknown', 'Runner discovery did not produce a complete registration result.');
        else if (!execution) gate(`${definition.id}-reconciliation`, 'unknown', 'Execution evidence is required to reconcile registered files/cases.');
        else {
          const expected = current.spec.files.filter(f => f.role === 'test' && f.lanes.includes(definition.id)).map(f => f.path);
          const registered = discovery.normalized.files.map(f => f.path);
          const executed = execution.normalized.files.map(f => f.path);
          const missingLocation = [...discovery.normalized.cases, ...execution.normalized.cases].some(c => !c.file);
          if (missingLocation || !sameSet(expected, registered) || !sameSet(registered, executed)) gate(`${definition.id}-file-reconciliation`, 'unknown', 'Candidate, registered and executed file scopes differ or reporter source locations are unavailable.', [...new Set([...expected, ...registered, ...executed])]);
          else gate(`${definition.id}-file-reconciliation`, 'passed', 'Every declared candidate file in the required lane is both registered and represented in execution.', expected);
          if (!sameSet(discovery.normalized.cases.map(c => c.id), execution.normalized.cases.map(c => c.id))) gate(`${definition.id}-case-reconciliation`, 'unknown', 'Registered and executed case identities differ; parameterized expansion and omissions need explicit reconciliation.');
          else if (!discovery.normalized.cases.length) gate(`${definition.id}-case-reconciliation`, 'unknown', 'Discovery did not enumerate registered cases.');
          else gate(`${definition.id}-case-reconciliation`, 'passed', 'Registered and executed cases reconcile by lane/file/full-name identity.');
        }
      }
    } else gate(`${definition.id}-discovery-policy`, 'passed', 'Protocol explicitly does not require runner discovery; no discovery assurance is claimed.');
  }
  // Every source candidate must belong to a required lane, not merely an optional
  // diagnostic lane; otherwise a green required subset would overstate assurance.
  const requiredIds = new Set(required.map(l => l.id));
  const outside = current.spec.files.filter(f => f.role === 'test' && !f.lanes.some(l => requiredIds.has(l)));
  gate('required-file-scope', outside.length ? 'unknown' : 'passed', outside.length ? 'Some candidate test files are not covered by any required lane.' : 'All candidate test files have a required lane.', outside.map(f => f.path));

  const reviewed = new Map();
  if (protocol.spec.policy.requireReview || protocol.spec.obligations?.length) {
    const reviewArtifacts = reviews == null ? [] : Array.isArray(reviews) ? reviews : [reviews];
    for (const [index, review] of reviewArtifacts.entries()) {
      try {
        await validateContract(review, 'test-review.v1');
        if (review.spec.root !== root || review.spec.protocolHash !== protocolHash || review.spec.snapshotHash !== snapshotHash) throw new Error('Review is not bound to the current root, protocol and source snapshot');
        for (const record of review.spec.files) {
          if (reviewed.has(record.path)) throw new Error(`Duplicate review for ${record.path}`);
          reviewed.set(record.path, record);
        }
      } catch (error) { gate(`review-artifact-${index}`, 'unknown', error.message); }
    }
    const tests = current.spec.files.filter(f => f.role === 'test');
    for (const file of tests) {
      const record = reviewed.get(file.path);
      if (!record || record.hash !== file.hash) gate(`review:${file.path}`, 'unknown', 'A current source-hash-bound substantive review is required for every test file; a sample alone is insufficient.');
      else if (REVIEW_FIELDS.some(field => /^(?:todo|tbd|n\/?a|unknown|unreviewed|placeholder)(?:\b|$)/i.test(record[field].trim()))) gate(`review:${file.path}`, 'unknown', 'Review contains unresolved placeholder dimensions.');
      else if (record.verdict === 'failed' || record.findings.some(f => f.status === 'open')) gate(`review:${file.path}`, 'failed', 'Review retains a failed verdict or unresolved quality findings.');
      else if (record.verdict !== 'passed') gate(`review:${file.path}`, 'unknown', 'Review verdict remains unknown.');
      else gate(`review:${file.path}`, 'passed', 'All review dimensions have current source-bound judgments and no unresolved findings.', [file.hash]);
    }
    const paths = new Set(tests.map(f => f.path));
    for (const file of reviewed.keys()) if (!paths.has(file)) gate(`review-outside:${file}`, 'unknown', 'Review names a file outside the current test scope.');
  } else gate('review-policy', 'passed', 'Protocol explicitly does not require semantic source review; runtime success does not establish oracle quality.');
  for (const obligation of protocol.spec.obligations || []) {
    const problems = [];
    if (new Set(protocol.spec.obligations.map(o => o.id)).size !== protocol.spec.obligations.length) problems.push('Protocol obligation IDs are duplicated.');
    const claimed = new Set();
    for (const laneId of obligation.lanes) {
      const execution = verifiedExecutions.get(laneId), discovery = verifiedDiscoveries.get(laneId);
      if (!execution || !discovery) { problems.push(`Missing required verified discovery/execution lane ${laneId}.`); continue; }
      for (const id of obligation.testIds) {
        const c = execution.normalized.cases.find(c => c.id === id);
        if (!c) continue;
        claimed.add(id);
        if (c.status !== 'passed') problems.push(`Obligation case is not passed: ${id}`);
        if (!discovery.normalized.cases.some(c => c.id === id)) problems.push(`Obligation case was not registered: ${id}`);
        const review = reviewed.get(c.file);
        const source = current.spec.files.find(f => f.path === c.file && f.role === 'test');
        if (!review || !source || review.hash !== source.hash || review.verdict !== 'passed' || review.findings.some(f => f.status === 'open') || !review.obligationIds?.includes(obligation.id) || !obligation.assertions.every(assertion => review.assertions?.includes(assertion)) || !review.sut.toLowerCase().includes(obligation.sut.toLowerCase()) || !review.scope.toLowerCase().includes(obligation.boundary.toLowerCase())) problems.push(`Current source review must trace ${obligation.id}, its assertions, SUT ${obligation.sut} and boundary ${obligation.boundary}: ${c.file}`);
      }
    }
    for (const id of obligation.testIds) if (!claimed.has(id)) problems.push(`Obligation references missing/mismatched case ID ${id}.`);
    gate(`obligation:${obligation.id}`, problems.length ? 'unknown' : 'passed', problems.length ? 'Behavioral obligation does not fully trace to registered/executed cases and current semantic review.' : 'Declared behavioral obligation traces to passed cases and current SUT/boundary review.', problems.length ? problems : obligation.testIds);
  }
  if (protocol.spec.policy.requireNegativeControls) {
    const verified = [];
    for (const [index, receipt] of controlReceipts.entries()) {
      try {
        const { verifyControls } = await import('./controls.mjs');
        const errors = await verifyControls(root, protocol, receipt, { inventory: current });
        if (errors.length || !receipt.spec.sourceRestored) gate(`control-receipt-${index}`, 'unknown', 'Negative-control receipt failed source/raw/restoration verification.', errors.map(e => `${e.code}: ${e.message}`));
        else verified.push(...receipt.spec.controls);
      } catch (error) { gate(`control-receipt-${index}`, 'unknown', `Negative-control verification unavailable: ${error.message}`); }
    }
    let count = 0;
    for (const definition of required) {
      if (!definition.negativeControls?.length) gate(`${definition.id}-negative-controls`, 'unknown', 'Required lane has no declared source-changing negative control.');
      for (const control of definition.negativeControls || []) {
        count++;
        const matches = verified.filter(c => c.laneId === definition.id && c.controlId === control.id);
        if (matches.length !== 1) gate(`control:${definition.id}:${control.id}`, 'unknown', 'Exactly one verified result is required for each configured negative control.');
        else {
          const result = matches[0];
          const matchingTargets = sameSet(result.testIds, control.testIds);
          gate(`control:${definition.id}:${control.id}`, !matchingTargets ? 'unknown' : result.status === 'killed' ? 'passed' : result.status === 'survived' ? 'failed' : 'unknown', !matchingTargets ? 'Control target case IDs differ from protocol.' : result.status === 'killed' ? 'Verified source-changing control caused the target cases to fail and restoration passed.' : result.status === 'survived' ? 'Target tests passed despite the configured source fault.' : 'Control sensitivity or restoration remains unverified.');
        }
      }
    }
    if (!count) gate('negative-controls', 'unknown', 'Verified source-changing negative-control receipts are required. Ordinary failed runs and declared control recipes do not prove sensitivity.');
  }
  else gate('negative-controls-policy', 'passed', 'Protocol explicitly does not require negative controls; mutation sensitivity is unverified.');
  const coverage = Object.keys(protocol.spec.policy.coverageThresholds);
  if (coverage.length) {
    const coverageLanes = required.filter(l => l.coverage);
    if (!coverageLanes.length) gate('coverage', 'unknown', 'Coverage thresholds require at least one required lane with a verified complete source map; no coverage collection is configured.', coverage);
    for (const definition of coverageLanes) {
      const normalized = verifiedExecutions.get(definition.id)?.coverage?.normalized;
      if (!normalized?.complete || normalized.errors?.length || normalized.scope?.missingFiles?.length || normalized.scope?.extraFiles?.length) gate(`${definition.id}-coverage`, 'unknown', 'Coverage evidence is missing, incomplete or does not reconcile to the current source denominator.');
      else for (const metric of coverage) {
        const value = normalized.totals?.[metric];
        if (!value || !Number.isFinite(value.covered) || !Number.isFinite(value.total) || value.total <= 0 || value.covered < 0 || value.covered > value.total) gate(`${definition.id}-coverage-${metric}`, 'unknown', 'Coverage numerator/denominator is missing or invalid.');
        else {
          const percentage = value.covered / value.total * 100;
          const threshold = protocol.spec.policy.coverageThresholds[metric];
          gate(`${definition.id}-coverage-${metric}`, percentage >= threshold ? 'passed' : 'failed', `${metric}: ${value.covered}/${value.total} = ${percentage.toFixed(4)}%; required ${threshold}%.`);
        }
      }
    }
  }
  else gate('coverage-policy', 'passed', 'Protocol defines no coverage thresholds; no measured coverage conclusion is claimed.');
  let comparison;
  if (previous) {
    try {
      await validateContract(previous, 'test-conformance-assessment.v1');
      if (previous.spec.root !== root) throw new Error('Baseline belongs to another target root');
      const before = new Map(previous.spec.gates.map(g => [g.id, g.status]));
      const after = new Map(gates.map(g => [g.id, g.status]));
      comparison = { baselineSnapshotHash: previous.spec.snapshotHash, protocolChanged: previous.spec.protocolHash !== protocolHash, new: [], resolved: [], unchanged: [], regressed: [], changed: [], removed: [] };
      for (const g of gates) {
        if (g.status === 'passed') { if (before.has(g.id) && before.get(g.id) !== 'passed') comparison.resolved.push(g.id); }
        else if (!before.has(g.id)) comparison.new.push(g.id);
        else if (before.get(g.id) === 'passed') comparison.regressed.push(g.id);
        else if (before.get(g.id) === g.status) comparison.unchanged.push(g.id);
        else comparison.changed.push(g.id);
      }
      for (const [id, status] of before) if (status !== 'passed' && !after.has(id)) comparison.removed.push(id);
    } catch (error) { gate('baseline', 'unknown', `Baseline cannot be compared: ${error.message}`); }
  }
  const summary = { total: gates.length, passed: gates.filter(g => g.status === 'passed').length, failed: gates.filter(g => g.status === 'failed').length, unknown: gates.filter(g => g.status === 'unknown').length };
  const result = artifact('TestConformanceAssessment', {
    root, protocolHash, snapshotHash, status: summary.failed ? 'nonconformant' : summary.unknown ? 'unknown' : 'conformant', gates, summary,
    ...(comparison ? { comparison } : {}),
    limitations: ['Conformance is relative to the declared protocol scope and policies.', 'Source-review judgments are declared by the recorded reviewer; this tool does not authenticate reviewer identity or prove all possible program behavior.', 'Static candidates and passing tests do not establish mutation sensitivity, live-provider qualification or unmeasured coverage.'],
  }, { name: protocol.metadata.name });
  await validateContract(result, 'test-conformance-assessment.v1');
  return result;
}
