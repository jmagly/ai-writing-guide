import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { artifact, digest, validateContract, addonRoot } from './contracts.mjs';
import { inventoryWorkspace } from './inventory.mjs';
import { normalizeResults } from './results.mjs';
import { normalizeCoverage } from './coverage.mjs';
import { targetPath, writeNew, readBounded } from './workspace.mjs';

/** Invoke explicit argv, never shell text; bound output and the owned process group. */
export function runCommand(command, { root, maxOutputBytes = 1048576 } = {}) {
  if (!Array.isArray(command?.argv) || !command.argv.length || command.argv.some(a => typeof a !== 'string' || !a || a.includes('\0'))) throw new Error('Command requires nonempty argv strings');
  if (!Number.isInteger(command.timeoutMs) || command.timeoutMs < 1 || command.timeoutMs > 3600000) throw new Error('Command timeout must be from 1 to 3600000 ms');
  const env = command.env ?? {};
  if (Object.values(env).some(v => typeof v !== 'string')) throw new Error('Command env values must be strings');
  return new Promise(resolve => {
    const startedAt = new Date().toISOString(), start = performance.now();
    let stdout = Buffer.alloc(0), stderr = Buffer.alloc(0), bytes = 0, reason = 'exit', spawnError, settled = false, drainTimer;
    const child = spawn(command.argv[0], command.argv.slice(1), {
      cwd: root, env: { ...process.env, ...env }, shell: false,
      detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe'],
    });
    const terminate = () => {
      if (!child.pid) return;
      try {
        if (process.platform === 'win32') child.kill('SIGKILL');
        else process.kill(-child.pid, 'SIGKILL');
      } catch (error) { if (error.code !== 'ESRCH') spawnError ??= error.message; }
      // A descendant can start a new process group while retaining inherited pipes.
      // Stop waiting for those pipes after killing the group owned by this run.
      drainTimer ??= setTimeout(() => { child.stdout.destroy(); child.stderr.destroy(); }, 250);
    };
    const timer = setTimeout(() => { reason = 'timeout'; terminate(); }, command.timeoutMs);
    const collect = channel => chunk => {
      const remaining = Math.max(0, maxOutputBytes - bytes);
      const kept = chunk.subarray(0, remaining);
      if (channel === 'stdout') stdout = Buffer.concat([stdout, kept]);
      else stderr = Buffer.concat([stderr, kept]);
      bytes += chunk.length;
      if (bytes > maxOutputBytes) { reason = 'output-limit'; terminate(); }
    };
    child.stdout.on('data', collect('stdout')); child.stderr.on('data', collect('stderr'));
    child.on('error', error => { spawnError = error.message; reason = 'spawn-error'; });
    child.on('close', (exitCode, signal) => {
      if (settled) return;
      settled = true; clearTimeout(timer); clearTimeout(drainTimer);
      resolve({
        argv: [...command.argv], cwd: root,
        environment: { explicitKeys: Object.keys(env).sort(), explicitValuesHash: digest(env), platform: process.platform, arch: process.arch, node: process.version },
        startedAt, endedAt: new Date().toISOString(), durationMs: performance.now() - start,
        exitCode, signal, reason, ...(spawnError ? { error: spawnError } : {}),
        stdout: stdout.toString('utf8'), stderr: stderr.toString('utf8'), observedOutputBytes: bytes,
      });
    });
  });
}

const expand = (value, runId) => value.replaceAll('{runId}', runId);
async function adapterHash() {
  const files = ['contracts.mjs','workspace.mjs','inventory.mjs','collector.mjs','coverage.mjs','results.mjs','xml-results.mjs'];
  return digest(await Promise.all(files.map(async file => [file,digest(await fs.readFile(path.join(addonRoot,'lib',file)))])));
}
function unavailable(code, message) {
  return { cases: [], files: [], summary: { total: 0, passed: 0, failed: 0, skipped: 0 }, complete: false, errors: [{ code, message }] };
}

export async function collectEvidence(root, protocol, { mode = 'execution', lane = 'all', outputDir, inventory } = {}) {
  if (!['execution', 'discovery'].includes(mode)) throw new Error('Collection mode must be execution or discovery');
  root = await fs.realpath(root);
  const runId = crypto.randomUUID();
  const directory = outputDir ?? `.aiwg/testing/conformance/runs/${runId}`;
  await targetPath(root, `${directory}/receipt.json`, { write: true });
  const selected = protocol.spec.lanes.filter(l => lane === 'all' || l.id === lane);
  if (!selected.length) throw new Error(`Unknown or empty lane selection: ${lane}`);
  const before = await inventoryWorkspace(root, protocol);
  if (inventory && inventory.spec.snapshotHash !== before.spec.snapshotHash) throw new Error('Input inventory is stale; rediscover the current target before collecting');
  await writeNew(root, `${directory}/inventory.json`, before);
  const lanes = [], diagnostics = [];
  for (const definition of selected) {
    const recipe = mode === 'execution' ? definition : definition.discovery;
    if (!recipe) {
      lanes.push({ id: definition.id, runner: definition.runner, required: definition.required, mode,
        normalized: unavailable('DISCOVERY_UNCONFIGURED', 'Configure an authoritative discovery adapter; source globs are not runner discovery.'), diagnostics: [] });
      continue;
    }
    const command = { ...recipe.command, argv: recipe.command.argv.map(a => expand(a, runId)) };
    let resultPath;
    const coveragePath = mode === 'execution' && definition.coverage ? expand(definition.coverage.path, runId) : null;
    if (coveragePath) {
      const file = await targetPath(root,coveragePath,{write:true});
      try { await fs.lstat(file); throw new Error(`Refusing existing coverage report: ${coveragePath}. Use {runId}.`); }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
      await fs.mkdir(path.dirname(file),{recursive:true});
    }
    if (recipe.result.path) {
      resultPath = expand(recipe.result.path, runId);
      const file = await targetPath(root, resultPath, { write: true });
      try {
        await fs.lstat(file);
        throw new Error(`Refusing to overwrite an existing result: ${resultPath}. Use {runId} in its path and command.`);
      } catch (error) { if (error.code !== 'ENOENT') throw error; }
      await fs.mkdir(path.dirname(file), { recursive: true });
    }
    const version = definition.versionCommand
      ? await runCommand({ argv: definition.versionCommand, timeoutMs: Math.min(recipe.command.timeoutMs, 10000) }, { root, maxOutputBytes: 8192 })
      : null;
    const processResult = await runCommand(command, { root, maxOutputBytes: protocol.spec.policy.maxOutputBytes });
    const stdoutPath = `${directory}/${definition.id}-${mode}.stdout.log`;
    const stderrPath = `${directory}/${definition.id}-${mode}.stderr.log`;
    await writeNew(root, stdoutPath, processResult.stdout); await writeNew(root, stderrPath, processResult.stderr);
    let raw, reportPath = stdoutPath, reportOrigin = 'stdout', normalized;
    const laneDiagnostics = [];
    try {
      if (resultPath) {
        const result = await readBounded(root, resultPath, protocol.spec.policy.maxOutputBytes);
        raw = result.data.toString('utf8'); reportOrigin = 'result-file';
        reportPath = `${directory}/${definition.id}-${mode}.report`;
        await writeNew(root, reportPath, raw);
      } else raw = processResult.stdout;
      normalized = normalizeResults(raw, { format: recipe.result.format, laneId: definition.id, root, mode });
    } catch (error) {
      normalized = unavailable('RESULT_UNREADABLE', error.message);
    }
    if (processResult.reason !== 'exit') laneDiagnostics.push({ code: 'PROCESS_INCOMPLETE', message: processResult.reason });
    // Nonzero exit in an executed failed-test report is genuine failure evidence,
    // while a green/empty report with failed process status is contradictory.
    if (processResult.exitCode !== 0 && !normalized.summary.failed && !normalized.files.some(f => f.status === 'failed')) laneDiagnostics.push({ code: 'PROCESS_REPORT_CONTRADICTION', message: 'Process did not succeed but report does not retain a failing test/suite.' });
    const { stdout, stderr, ...processMetadata } = processResult;
    const record = {
      id: definition.id, runner: definition.runner, required: definition.required, mode,
      process: processMetadata, version,
      stdout: { path: stdoutPath, hash: digest(stdout) }, stderr: { path: stderrPath, hash: digest(stderr) },
      normalized, diagnostics: laneDiagnostics,
    };
    if (raw !== undefined) record.report = { path: reportPath, hash: digest(raw), size: Buffer.byteLength(raw), format: recipe.result.format, origin: reportOrigin };
    if (coveragePath) {
      try {
        const coverage = await readBounded(root,coveragePath,protocol.spec.policy.maxOutputBytes);
        const retained = `${directory}/${definition.id}-coverage.report`;
        await writeNew(root,retained,coverage.data.toString('utf8'));
        record.coverage = {report:{path:retained,hash:coverage.hash},normalized:normalizeCoverage(coverage.data.toString('utf8'),{...definition.coverage,root,inventory:before})};
      } catch (error) { laneDiagnostics.push({code:'COVERAGE_UNREADABLE',message:error.message}); }
    }
    lanes.push(record);
  }
  const after = await inventoryWorkspace(root, protocol);
  const sourceStable = before.spec.snapshotHash === after.spec.snapshotHash;
  if (!sourceStable) diagnostics.push({ code: 'SOURCE_CHANGED_DURING_RUN', message: 'Test/source/configuration scope changed while collecting; receipt is not contemporaneous evidence of a stable snapshot.' });
  const spec = { root, adapterHash: await adapterHash(), protocolHash: digest(protocol), snapshotHash: before.spec.snapshotHash, afterSnapshotHash: after.spec.snapshotHash,
    inventoryPath: `${directory}/inventory.json`, runId, mode, sourceStable, lanes, diagnostics };
  const receipt = artifact('TestRunReceipt', { ...spec, receiptHash: digest(spec) }, { name: protocol.metadata.name });
  await validateContract(receipt,'test-run-receipt.v1');
  await writeNew(root, `${directory}/receipt.json`, receipt);
  return receipt;
}

/** Re-hash source and raw artifacts; do not promote arbitrary imported JSON. */
export async function verifyReceipt(root, protocol, receipt, { inventory } = {}) {
  const errors = [];
  try { await validateContract(receipt,'test-run-receipt.v1'); }
  catch (error) { return [{code:'INVALID_RECEIPT',message:error.message}]; }
  const { receiptHash, ...bound } = receipt.spec;
  if (receipt.spec.adapterHash !== await adapterHash()) errors.push({code:'ADAPTER_CHANGED',message:'Evidence adapter code changed or was not bound at collection time.'});
  if (digest(bound) !== receiptHash) errors.push({ code: 'RECEIPT_TAMPERED', message: 'Receipt digest does not match its payload.' });
  root = await fs.realpath(root);
  const current = inventory ?? await inventoryWorkspace(root, protocol);
  if (receipt.spec.root !== root || receipt.spec.protocolHash !== digest(protocol) || receipt.spec.snapshotHash !== current.spec.snapshotHash || !receipt.spec.sourceStable) errors.push({ code: 'STALE_RECEIPT', message: 'Root, protocol, source snapshot or during-run stability does not match.' });
  for (const lane of receipt.spec.lanes ?? []) {
    for (const reference of [lane.stdout, lane.stderr, lane.report, lane.coverage?.report].filter(Boolean)) {
      try {
        const { hash } = await readBounded(root, reference.path, protocol.spec.policy.maxOutputBytes);
        if (hash !== reference.hash) errors.push({ code: 'REPORT_TAMPERED', lane: lane.id, path: reference.path, message: 'Raw evidence changed after collection.' });
      } catch (error) { errors.push({ code: 'EVIDENCE_UNREADABLE', lane: lane.id, message: error.message }); }
    }
    if (lane.coverage) {
      try {
        const definition = protocol.spec.lanes.find(l => l.id === lane.id);
        if (!definition?.coverage) throw new Error('Coverage was not configured for this lane');
        const {data} = await readBounded(root,lane.coverage.report.path,protocol.spec.policy.maxOutputBytes);
        const normalized = normalizeCoverage(data.toString('utf8'),{...definition.coverage,root,inventory:current});
        if (digest(normalized) !== digest(lane.coverage.normalized)) throw new Error('Coverage normalization does not match retained report');
      } catch (error) { errors.push({code:'COVERAGE_MISMATCH',lane:lane.id,message:error.message}); }
    }
    if (lane.report) {
      try {
        const { data } = await readBounded(root, lane.report.path, protocol.spec.policy.maxOutputBytes);
        const normalized = normalizeResults(data.toString('utf8'), { format: lane.report.format, laneId: lane.id, root, mode: receipt.spec.mode });
        if (digest(normalized) !== digest(lane.normalized)) errors.push({ code: 'NORMALIZATION_MISMATCH', lane: lane.id, message: 'Stored normalized results do not match the retained raw report.' });
      } catch (error) { errors.push({ code: 'NORMALIZATION_UNAVAILABLE', lane: lane.id, message: error.message }); }
    }
  }
  return errors;
}
