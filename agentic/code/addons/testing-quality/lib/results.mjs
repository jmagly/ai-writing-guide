import { xmlToCanonical } from './xml-results.mjs';
import path from 'node:path';

/** Normalize runner evidence, never source-inventory guesses.
 * IDs encode [laneId, relativeFileOrNull, fullName] as a JSON array (unambiguous
 * escaping). Null file means the reporter did not supply a source path; package
 * or suite names remain in the full name and are never fabricated as file paths.
 * complete describes structurally complete evidence, NOT successful tests.
 */
export function normalizeResults(raw, { format = 'canonical', laneId = 'default', root = process.cwd(), mode = 'execution' } = {}) {
  const out = { cases: [], files: [], summary: { total: 0, passed: 0, failed: 0, skipped: 0 }, errors: [], complete: false };
  const error = (code, message) => out.errors.push({ code, message });
  const statuses = new Set(['passed', 'failed', 'skipped', 'unknown']);
  const aliases = { pass: 'passed', fail: 'failed', error: 'failed', xfailed: 'skipped', xpassed: 'passed', pending: 'skipped', todo: 'skipped', disabled: 'skipped', success: 'passed', ok: 'passed', ignored: 'skipped' };
  const fileMap = new Map();
  const ids = new Set();
  function fileName(value) {
    if (value == null || value === '') return null;
    if (typeof value !== 'string' || value.includes('\0')) { error('INVALID_PATH', 'Reporter file path must be a string without NUL'); return null; }
    const portable = value.replaceAll('\\', '/');
    if (portable.split('/').includes('..') || /^[A-Za-z]:/.test(portable)) { error('OUTSIDE_ROOT', `Unsafe or foreign file path: ${value}`); return null; }
    const relative = path.relative(path.resolve(root), path.resolve(root, portable));
    if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) { error('OUTSIDE_ROOT', `Reporter file is outside target root: ${value}`); return null; }
    return relative.split(path.sep).join('/');
  }
  function status(value) {
    const normalized = aliases[value] || value;
    if (!statuses.has(normalized)) { error('INVALID_STATUS', `Unknown reporter status: ${String(value)}`); return 'unknown'; }
    return mode === 'discovery' ? 'unknown' : normalized;
  }
  function addFile(file, state) {
    const normalized = fileName(file);
    if (!normalized) return;
    const next = status(state);
    const previous = fileMap.get(normalized);
    // Aggregate case evidence conservatively. Explicit suite failures survive.
    const rank = { failed: 4, unknown: 3, passed: 2, skipped: 1 };
    if (!previous || rank[next] > rank[previous]) fileMap.set(normalized, next);
  }
  function addCase(file, name, state, durationMs) {
    if (typeof name !== 'string' || !name.trim()) { error('INVALID_CASE', 'Test case needs a nonempty full name'); return; }
    const normalized = fileName(file);
    const id = JSON.stringify([laneId, normalized, name]);
    if (ids.has(id)) { error('DUPLICATE_CASE', `Duplicate terminal result: ${name}`); return; }
    ids.add(id);
    const item = { id, file: normalized, name, status: status(state) };
    if (durationMs != null) {
      if (typeof durationMs !== 'number' || !Number.isFinite(durationMs) || durationMs < 0) error('INVALID_DURATION', `Invalid duration for ${name}`);
      else item.durationMs = durationMs;
    }
    out.cases.push(item);
    if (normalized) addFile(normalized, item.status);
  }
  function countCheck(value, actual, label) {
    if (value != null && (!Number.isInteger(value) || value !== actual)) error('COUNT_MISMATCH', `${label}: reported ${value}, normalized ${actual}`);
  }
  let data;
  try {
    if (!['execution', 'discovery'].includes(mode)) throw new Error('mode must be execution or discovery');
    if (['junit', 'trx'].includes(format)) {
      if (mode !== 'execution') throw new Error('JUnit/TRX execution reports cannot establish runner discovery');
      return normalizeResults(xmlToCanonical(raw, format), { format: 'canonical', laneId, root, mode });
    }
    if (!['canonical', 'vitest', 'jest', 'pytest', 'pytest-json', 'pytest-json-report', 'go', 'go-json', 'cargo', 'cargo-json', 'tap', 'node-tap'].includes(format)) {
      error('MISSING_ADAPTER', `Unsupported format ${format}; provide a documented adapter or canonical reporter JSON`);
      return out;
    }
    if (raw == null || (typeof raw === 'string' && !raw.trim())) throw new Error('Empty reporter input');
    if (['go', 'go-json', 'cargo', 'cargo-json', 'tap', 'node-tap'].includes(format)) data = raw;
    else data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const vitestList = format === 'vitest' && mode === 'discovery' && Array.isArray(data);
    if (['canonical', 'vitest', 'jest', 'pytest', 'pytest-json', 'pytest-json-report'].includes(format) && (!data || typeof data !== 'object' || (Array.isArray(data) && !vitestList))) throw new Error('Expected reporter object');
    if (vitestList) {
      // Real `vitest list --json` collection. Preserve the reporter delimiter;
      // execution uses the same ancestor/title join, never lossy replacement.
      for (const c of data) {
        if (typeof c?.file !== 'string' || typeof c?.name !== 'string') throw new Error('Vitest list entries require file and name');
        addCase(c.file, c.name, 'unknown');
      }
    } else
    if (format === 'canonical') {
      if (!Array.isArray(data.cases) || !Array.isArray(data.files)) throw new Error('Canonical report requires cases and files arrays');
      if (data.complete !== true) error('INCOMPLETE_REPORT', 'Canonical evidence must explicitly declare complete:true');
      if (mode === 'execution' && data.mode === 'discovery') error('DISCOVERY_ONLY', 'Discovery evidence cannot prove execution');
      for (const c of data.cases) addCase(c.file, c.name, c.status, c.durationMs);
      for (const f of data.files) {
        const normalized = fileName(f.path);
        if (mode === 'execution' && ['passed', 'pass'].includes(f.status) && out.cases.some(c => c.file === normalized && c.status === 'failed')) error('CONTRADICTORY_SUITE', `Passing file contains failing case: ${f.path}`);
        addFile(f.path, f.status);
      }
      for (const e of data.errors || []) error(e.code || 'UPSTREAM_ERROR', e.message || 'Upstream reporter error');
      if (data.summary && mode === 'execution') for (const key of ['total', 'passed', 'failed', 'skipped']) countCheck(data.summary[key], key === 'total' ? out.cases.length : out.cases.filter(c => c.status === key).length, `summary.${key}`);
    } else if (format === 'vitest' || format === 'jest') {
      if (!Array.isArray(data.testResults)) throw new Error('Expected testResults array; file listings are not execution reports');
      if (mode === 'execution' && (data.mode === 'discovery' || data.wasInterrupted || data.wouldRun || data.collectTests)) error('DISCOVERY_OR_INTERRUPTED', 'Collected, would-run or interrupted output cannot prove completed execution');
      for (const suite of data.testResults) {
        if (!Array.isArray(suite.assertionResults)) { error('MISSING_CASES', 'Suite lacks assertionResults'); continue; }
        for (const c of suite.assertionResults) addCase(suite.name, format === 'vitest' && Array.isArray(c.ancestorTitles) && typeof c.title === 'string' ? [...c.ancestorTitles, c.title].join(' > ') : c.fullName || [...(c.ancestorTitles || []), c.title || ''].join(' '), c.status, c.duration);
        addFile(suite.name, suite.status || (suite.message ? 'failed' : 'unknown'));
        if (suite.status === 'passed' && suite.assertionResults.some(c => ['failed', 'fail'].includes(c.status))) error('CONTRADICTORY_SUITE', `Passing suite contains failing case: ${suite.name}`);
      }
      if (mode === 'execution') {
        if (format === 'jest') countCheck(data.numTotalTestSuites, data.testResults.length, 'numTotalTestSuites');
        else {
          // Vitest counts file suites AND nested describe suites. Its flattened
          // testResults array contains only files, so these are different units.
          // Empty/duplicate-named describe groups cannot be reconstructed from
          // assertion ancestorTitles; validate retained aggregates without guessing.
          const suiteKeys = ['numTotalTestSuites', 'numPassedTestSuites', 'numFailedTestSuites', 'numPendingTestSuites'];
          for (const key of suiteKeys) if (data[key] != null && (!Number.isInteger(data[key]) || data[key] < 0)) error('COUNT_MISMATCH', `${key}: expected a nonnegative integer`);
          const total = data.numTotalTestSuites;
          const visibleSuites = data.testResults.reduce((count, suite) => {
            const ancestors = new Set();
            for (const assertion of suite.assertionResults ?? []) if (Array.isArray(assertion.ancestorTitles)) {
              for (let depth = 1; depth <= assertion.ancestorTitles.length; depth++) ancestors.add(JSON.stringify(assertion.ancestorTitles.slice(0, depth)));
            }
            return count + 1 + ancestors.size;
          }, 0);
          if (Number.isInteger(total) && total < visibleSuites) error('COUNT_MISMATCH', 'numTotalTestSuites is smaller than the visible file and describe population');
          if (suiteKeys.every(key => Number.isInteger(data[key]))) countCheck(total, data.numPassedTestSuites + data.numFailedTestSuites + data.numPendingTestSuites, 'suite status totals');
          for (const key of suiteKeys.slice(1)) if (Number.isInteger(total) && Number.isInteger(data[key]) && data[key] > total) error('COUNT_MISMATCH', `${key} exceeds numTotalTestSuites`);
          const failedFiles = data.testResults.filter(suite => suite.status === 'failed' || suite.message || suite.assertionResults?.some(c => ['failed', 'fail'].includes(c.status))).length;
          if (Number.isInteger(data.numFailedTestSuites) && data.numFailedTestSuites < failedFiles) error('COUNT_MISMATCH', 'numFailedTestSuites omits reported file failures');
          if (data.success === true && data.numFailedTestSuites > 0) error('CONTRADICTORY_SUCCESS', 'success:true contradicts failed suite count');
        }
        countCheck(data.numTotalTests, out.cases.length, 'numTotalTests');
        countCheck(data.numPassedTests, out.cases.filter(c => c.status === 'passed').length, 'numPassedTests');
        countCheck(data.numFailedTests, out.cases.filter(c => c.status === 'failed').length, 'numFailedTests');
        if (data.success === false && !out.cases.some(c => c.status === 'failed') && ![...fileMap.values()].includes('failed')) error('CONTRADICTORY_FAILURE', 'Runner success:false has no retained failing case/suite');
        if (data.numUnhandledErrors != null && (!Number.isInteger(data.numUnhandledErrors) || data.numUnhandledErrors !== 0)) error('UNHANDLED_ERRORS', 'Runner retains unhandled errors');
        if (data.success === true && (out.cases.some(c => c.status === 'failed') || [...fileMap.values()].includes('failed'))) error('CONTRADICTORY_SUCCESS', 'success:true contradicts failing results');
      }
    } else if (format === 'pytest' || format === 'pytest-json' || format === 'pytest-json-report') {
      if (!Array.isArray(data.tests) || !Number.isInteger(data.exitcode) || !data.summary) throw new Error('pytest-json-report requires tests, summary and exitcode');
      for (const c of data.tests) {
        const parts = String(c.nodeid || '').split('::');
        addCase(parts[0], c.nodeid, c.outcome, c.duration == null ? undefined : c.duration * 1000);
        if (c.outcome === 'passed' && ['setup', 'call', 'teardown'].some(phase => c[phase]?.outcome === 'failed')) error('CONTRADICTORY_CASE', 'pytest passing case retains a failed phase');
      }
      for (const c of data.collectors || []) if (c.outcome === 'failed') { addFile(String(c.nodeid || '').split('::')[0], 'failed'); error('COLLECTION_FAILURE', c.longrepr || 'pytest collection failed'); }
      if (![0, 1].includes(data.exitcode)) error('PYTEST_INCOMPLETE', `pytest exited ${data.exitcode}; no complete execution claim`);
      if (mode === 'execution') {
        countCheck(data.summary.total, out.cases.length, 'summary.total');
        for (const key of ['passed', 'failed', 'skipped']) countCheck(data.summary[key], out.cases.filter(c => c.status === key).length, `summary.${key}`);
        if (data.exitcode === 1 && !out.cases.some(c => c.status === 'failed')) error('CONTRADICTORY_FAILURE', 'pytest failed exit has no retained failed case');
        if (data.exitcode === 0 && out.cases.some(c => c.status === 'failed')) error('CONTRADICTORY_SUCCESS', 'pytest exit 0 contradicts failed tests');
      }
    } else if (['go', 'go-json', 'cargo', 'cargo-json'].includes(format)) {
      const events = typeof data === 'string' ? data.trim().split(/\r?\n/).map(line => JSON.parse(line)) : data;
      if (!Array.isArray(events)) throw new Error('Expected newline-delimited runtime JSON events');
      const go = format.startsWith('go');
      const open = new Set(); const ended = new Set(); let terminals = 0; let suiteStart = 0; let suiteCount;
      for (const e of events) {
        if (go) {
          if (!e || typeof e.Package !== 'string' || typeof e.Action !== 'string') throw new Error('Not go test -json runtime events');
          const key = `${e.Package}::${e.Test || ''}`;
          if (['start', 'run'].includes(e.Action)) open.add(key);
          else if (['pass', 'fail', 'skip'].includes(e.Action)) {
            if (e.Action !== 'skip' && !open.has(key)) error('MISSING_START', `Go terminal lacks start/run event: ${key}`);
            if (ended.has(key)) error('DUPLICATE_TERMINAL', `Duplicate Go terminal: ${key}`);
            ended.add(key); open.delete(key);
            if (e.Test) addCase(null, key, e.Action === 'skip' ? 'skipped' : e.Action, e.Elapsed == null ? undefined : e.Elapsed * 1000);
            else { terminals++; if (e.Action === 'fail') error('PACKAGE_FAILURE', `Go package failed: ${e.Package}`); }
          } else if (!['output', 'pause', 'cont', 'bench'].includes(e.Action)) error('UNKNOWN_EVENT', `Unknown Go action: ${e.Action}`);
        } else {
          if (e.reason || !['suite', 'test'].includes(e.type)) throw new Error('Cargo build JSON is not test evidence; provide libtest runtime JSON');
          if (e.type === 'suite' && e.event === 'started') {
            if (!Number.isInteger(e.test_count) || e.test_count < 0) error('INVALID_SUITE_COUNT', 'Cargo runtime suite requires a nonnegative test_count');
            if (open.has('suite')) error('UNFINISHED_SUITE', 'Cargo suite started before prior suite ended');
            suiteStart = out.cases.length; suiteCount = e.test_count; open.add('suite');
          }
          else if (e.type === 'suite' && ['ok', 'failed'].includes(e.event)) {
            if (!open.has('suite')) error('MISSING_SUITE_START', 'Cargo runtime suite terminal has no start event');
            open.delete('suite'); terminals++;
            countCheck(suiteCount, out.cases.length - suiteStart, 'cargo.test_count');
            if (mode === 'execution') for (const [field, state] of [['passed', 'passed'], ['failed', 'failed'], ['ignored', 'skipped']]) countCheck(e[field], out.cases.slice(suiteStart).filter(c => c.status === state).length, `cargo.${field}`);
            if (e.event === 'failed') error('SUITE_FAILURE', 'Cargo test suite failed');
          } else if (e.type === 'test' && e.event === 'started') open.add(e.name);
          else if (e.type === 'test' && ['ok', 'failed', 'ignored'].includes(e.event)) { if (e.event !== 'ignored' && !open.has(e.name)) error('MISSING_START', `Cargo terminal lacks test started event: ${e.name}`); open.delete(e.name); addCase(null, e.name, e.event, e.exec_time == null ? undefined : e.exec_time * 1000); }
          else error('UNKNOWN_EVENT', `Unsupported Cargo test event: ${e.event}`);
        }
      }
      if (open.size || !terminals) error('TRUNCATED_STREAM', 'Runtime stream lacks terminal package/suite events or has unfinished tests');
    } else if (['tap', 'node-tap'].includes(format)) {
      if (typeof data !== 'string') throw new Error('TAP input must be text');
      const contexts = new Map([[0, { names: [], results: [], plan: null }]]);
      const subNames = new Map();
      for (const line of data.split(/\r?\n/)) {
        if (/^\s*Bail out!/i.test(line)) error('TAP_BAILOUT', line.trim());
        const indent = line.match(/^ */)[0].length;
        const sub = line.match(/^\s*# Subtest: (.+)$/);
        if (sub) { subNames.set(indent, sub[1]); continue; }
        const terminal = line.match(/^\s*(not ok|ok)\s+(\d+)(?:\s+-)?\s*(.*)$/);
        const plan = line.match(/^\s*1\.\.(\d+)(?:\s+#.*)?$/);
        if (!terminal && !plan) continue;
        if (!contexts.has(indent)) {
          contexts.set(indent, { names: [...subNames].filter(([i]) => i < indent).sort(([a], [b]) => a-b).map(([,n]) => n), results: [], plan: null });
        }
        const ctx = contexts.get(indent);
        if (plan) { if (ctx.plan !== null) error('DUPLICATE_PLAN', 'Duplicate TAP plan'); ctx.plan = Number(plan[1]); continue; }
        const name = terminal[3].replace(/\s+#\s*(SKIP|TODO)\b.*$/i, '');
        const state = /#\s*(SKIP|TODO)\b/i.test(terminal[3]) ? 'skipped' : terminal[1] === 'ok' ? 'passed' : 'failed';
        const children = [...contexts.keys()].filter(i => i > indent).sort((a,b) => b-a);
        let childCount = 0;
        for (const level of children) {
          const child = contexts.get(level);
          if (child.plan === null || child.plan !== child.results.length) error('TAP_PLAN_MISMATCH', `Incomplete nested TAP plan under ${name}`);
          childCount += child.results.length; contexts.delete(level);
        }
        ctx.results.push(Number(terminal[2]));
        if (ctx.results.at(-1) !== ctx.results.length) error('TAP_NUMBER_MISMATCH', 'TAP test numbering is incomplete or duplicated');
        if (!childCount) addCase(null, [...ctx.names, name].join(' > '), state);
        else if (state === 'skipped') error('TAP_SKIPPED_PARENT', 'Skipped TAP parent contradicts retained child execution');
        else if (state === 'failed') error('TAP_SUITE_FAILURE', `TAP parent failed: ${name}`);
        for (const level of subNames.keys()) if (level >= indent) subNames.delete(level);
      }
      for (const ctx of contexts.values()) if (ctx.plan === null || ctx.plan !== ctx.results.length) error('TAP_PLAN_MISMATCH', 'Missing or mismatched TAP plan; output may be truncated');
    } else error('MISSING_ADAPTER', `Unsupported format ${format}; provide a documented adapter or canonical reporter JSON`);
  } catch (e) { error('MALFORMED_REPORT', e.message); }
  out.files = [...fileMap].map(([path, status]) => ({ path, status }));
  out.summary.total = out.cases.length;
  for (const c of out.cases) if (c.status in out.summary) out.summary[c.status]++;
  if (!out.cases.length && !out.files.length) error('EMPTY_REPORT', 'No test or suite evidence; empty output cannot prove conformance');
  if (mode === 'execution' && out.cases.some(c => c.status === 'unknown')) error('UNKNOWN_EXECUTION', 'One or more execution statuses are unknown');
  if (mode === 'execution' && out.files.some(f => f.status === 'unknown')) error('UNKNOWN_EXECUTION', 'One or more file execution statuses are unknown');
  out.complete = out.errors.length === 0;
  return out;
}
