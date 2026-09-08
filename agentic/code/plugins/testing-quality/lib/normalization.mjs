import fs from 'node:fs/promises';
import path from 'node:path';
import { artifact, digest, validateContract } from './contracts.mjs';
import { targetPath, writeNew, writeAtomic } from './workspace.mjs';

const MAX_BYTES = 4 * 1024 * 1024;
const MAX_TRANSACTION_BYTES = 2 * 1024 * 1024;
const absent = () => ({ content: null, hash: null, mode: null });
function same(a, b) { return a.hash === b.hash && a.mode === b.mode && a.content === b.content; }
async function snapshot(root, relative, maxBytes = MAX_BYTES) {
  const file = await targetPath(root, relative, { write: true });
  try {
    const stat = await fs.lstat(file);
    if (!stat.isFile() || stat.size > maxBytes) throw new Error(`Not a bounded regular file: ${relative}`);
    const bytes = await fs.readFile(file);
    const content = bytes.toString('utf8');
    if (bytes.length > maxBytes || !Buffer.from(content).equals(bytes)) throw new Error(`Only bounded UTF-8 edits supported: ${relative}`);
    return { content, hash: digest(bytes), mode: stat.mode & 0o777 };
  } catch (error) { if (error.code === 'ENOENT') return absent(); throw error; }
}
function validateState(state) {
  if (!state || !Object.hasOwn(state, 'content')) throw new Error('Invalid change state');
  if (state.content === null) {
    if (state.hash !== null || state.mode !== null) throw new Error('Invalid absent change state');
  } else if (typeof state.content !== 'string' || Buffer.byteLength(state.content) > MAX_BYTES || state.hash !== digest(state.content) || !Number.isInteger(state.mode) || state.mode < 0 || state.mode > 0o777) throw new Error('Invalid content/hash/mode in change state');
}
async function validateChanges(root, changes) {
  if (!Array.isArray(changes) || changes.length > 1000) throw new Error('Changes must be an array of at most 1000 edits');
  const seen = new Set();
  let totalBytes = 0;
  for (const change of changes) {
    const file = await targetPath(root, change.path, { write: true });
    if (seen.has(file)) throw new Error(`Duplicate path: ${change.path}`);
    for (const prior of seen) if (file.startsWith(prior + path.sep) || prior.startsWith(file + path.sep)) throw new Error('Ancestor/descendant edits conflict');
    seen.add(file); validateState(change.before); validateState(change.after);
    totalBytes += Buffer.byteLength(change.before.content ?? '') + Buffer.byteLength(change.after.content ?? '');
    if (totalBytes > MAX_TRANSACTION_BYTES) throw new Error('Transaction exceeds 2 MiB combined before/after content; split the plan');
  }
}
async function requireRoot(root, declared) {
  const actual = await fs.realpath(root);
  if (actual !== declared) throw new Error('Target root does not match plan/receipt');
  return actual;
}
function planDigest(spec) { return digest({ root: spec.root, purpose: spec.purpose, changes: spec.changes }); }

/** Capture the exact editable UTF-8 bytes and modes; never mutate target source. */
export async function createPlan(root, edits, { purpose = 'Normalize testing conformance' } = {}) {
  root = await fs.realpath(root);
  if (!Array.isArray(edits) || edits.length > 1000 || typeof purpose !== 'string') throw new Error('Invalid normalization edits or purpose');
  const changes = [];
  for (const edit of edits) {
    if (typeof edit.content !== 'string' && edit.content !== null) throw new Error('Edit content must be a string or null');
    const before = await snapshot(root, edit.path);
    const after = edit.content === null ? absent() : { content: edit.content, hash: digest(edit.content), mode: before.mode ?? 0o644 };
    changes.push({ path: edit.path, before, after });
  }
  await validateChanges(root, changes);
  const spec = { root, purpose, changes };
  return validateContract(artifact('TestNormalizationPlan', { ...spec, planHash: planDigest(spec) }), 'normalization-plan.v1');
}
async function preflight(root, changes, side) {
  for (const change of changes) if (!same(await snapshot(root, change.path), change[side])) throw new Error(`Precondition conflict (${side}): ${change.path}`);
}
async function persist(root, receipt) { await validateContract(receipt, 'normalization-receipt.v1'); await writeAtomic(root, receipt.spec.receiptPath, receipt); }
async function receiptLocation(root, relative, changes) {
  const file = await targetPath(root, relative, { write: true });
  for (const change of changes) {
    const changed = await targetPath(root, change.path, { write: true });
    if (file === changed || file.startsWith(changed + path.sep) || changed.startsWith(file + path.sep)) throw new Error('Receipt path overlaps a planned edit');
  }
}
async function mutate(root, change, from, to) {
  if (!same(await snapshot(root, change.path), change[from])) throw new Error(`Concurrent change conflict: ${change.path}`);
  const next = change[to];
  if (same(change[from], next)) return;
  const file = await targetPath(root, change.path, { write: true });
  if (next.content === null) { await fs.unlink(file); return; }
  if (change[from].content === null) {
    await writeNew(root, change.path, next.content);
    await targetPath(root, change.path, { write: true });
    await fs.chmod(file, next.mode);
  } else {
    await writeAtomic(root, change.path, next.content);
    await targetPath(root, change.path, { write: true });
    await fs.chmod(file, next.mode);
  }
}
async function runTransaction(root, receipt, from, to, terminal) {
  try {
    for (const change of receipt.spec.changes) {
      await mutate(root, change, from, to);
      receipt.spec.completed.push(change.path);
      await persist(root, receipt);
    }
    receipt.spec.status = terminal;
    await persist(root, receipt);
    return receipt;
  } catch (error) {
    receipt.spec.status = 'partial'; receipt.spec.error = error.message;
    // Reconcile actual state if a mode change or journal write failed after a mutation.
    receipt.spec.observed = [];
    for (const change of receipt.spec.changes) {
      try { receipt.spec.observed.push({ path: change.path, state: await snapshot(root, change.path) }); }
      catch (observationError) { receipt.spec.observed.push({ path: change.path, error: observationError.message }); }
    }
    try { await persist(root, receipt); } catch (journalError) { receipt.spec.journalError = journalError.message; }
    const failure = new Error(`Normalization transaction partial failure: ${error.message}`);
    failure.receipt = receipt;
    throw failure;
  }
}
async function existingReceipt(root, relative) {
  const file = await targetPath(root, relative, { write: true });
  try { return JSON.parse((await snapshot(root, relative, 16 * 1024 * 1024)).content ?? 'null'); }
  catch (error) { throw new Error(`Cannot read transaction receipt ${file}: ${error.message}`); }
}

export async function applyPlan(root, plan, { receiptPath } = {}) {
  await validateContract(plan, 'normalization-plan.v1');
  if (plan?.kind !== 'TestNormalizationPlan' || !plan.spec || plan.spec.planHash !== planDigest(plan.spec)) throw new Error('Invalid plan or plan hash');
  root = await requireRoot(root, plan.spec.root);
  await validateChanges(root, plan.spec.changes);
  receiptPath ??= `.aiwg/testing/conformance/transactions/${plan.spec.planHash}.json`;
  await receiptLocation(root, receiptPath, plan.spec.changes);
  const previous = await existingReceipt(root, receiptPath);
  if (previous) {
    if (previous.kind !== 'TestNormalizationReceipt' || previous.spec?.root !== root || previous.spec.planHash !== plan.spec.planHash || digest(previous.spec.changes) !== digest(plan.spec.changes) || previous.spec.status !== 'applied') throw new Error('Existing receipt does not represent this applied plan; inspect transaction before retry');
    await preflight(root, plan.spec.changes, 'after');
    return previous;
  }
  await preflight(root, plan.spec.changes, 'before');
  const receipt = artifact('TestNormalizationReceipt', { root, purpose: plan.spec.purpose, planHash: plan.spec.planHash, changes: plan.spec.changes, status: 'applying', completed: [], receiptPath });
  await writeNew(root, receiptPath, receipt); // Durable journal precedes every target mutation.
  return runTransaction(root, receipt, 'before', 'after', 'applied');
}

export async function rollbackPlan(root, sourceReceipt, { receiptPath } = {}) {
  await validateContract(sourceReceipt, 'normalization-receipt.v1');
  if (sourceReceipt?.kind !== 'TestNormalizationReceipt' || !sourceReceipt.spec || sourceReceipt.spec.status !== 'applied' || sourceReceipt.spec.planHash !== planDigest(sourceReceipt.spec)) throw new Error('Rollback requires a completed apply receipt');
  root = await requireRoot(root, sourceReceipt.spec.root);
  await validateChanges(root, sourceReceipt.spec.changes);
  receiptPath ??= `.aiwg/testing/conformance/transactions/${sourceReceipt.spec.planHash}.rollback.json`;
  if (receiptPath === sourceReceipt.spec.receiptPath) throw new Error('Rollback journal must not overwrite apply receipt');
  await receiptLocation(root, receiptPath, sourceReceipt.spec.changes);
  const previous = await existingReceipt(root, receiptPath);
  if (previous) {
    if (previous.kind !== 'TestNormalizationReceipt' || previous.spec?.root !== root || previous.spec.planHash !== sourceReceipt.spec.planHash || digest(previous.spec.changes) !== digest(sourceReceipt.spec.changes) || previous.spec.status !== 'rolled-back') throw new Error('Rollback journal conflict');
    await preflight(root, sourceReceipt.spec.changes, 'before');
    return previous;
  }
  await preflight(root, sourceReceipt.spec.changes, 'after');
  const receipt = artifact('TestNormalizationReceipt', { root, purpose: sourceReceipt.spec.purpose, planHash: sourceReceipt.spec.planHash, changes: sourceReceipt.spec.changes, status: 'rolling-back', completed: [], receiptPath });
  await writeNew(root, receiptPath, receipt);
  return runTransaction(root, receipt, 'after', 'before', 'rolled-back');
}
