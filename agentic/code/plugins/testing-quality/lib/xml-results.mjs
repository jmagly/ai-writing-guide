import { SaxesParser } from 'saxes';

// Producer dialects only: Maven Surefire/pytest JUnit XML and VSTest TRX.
// Never infer source files from class names, DLL storage paths or test IDs.
const MAX_BYTES = 10 * 1024 * 1024, MAX_NODES = 100000, MAX_DEPTH = 64;
function document(raw) {
  if (typeof raw !== 'string' || Buffer.byteLength(raw) > MAX_BYTES) throw new Error('XML report must be a string no larger than 10 MiB');
  if (/<!\s*(?:DOCTYPE|ENTITY)\b/i.test(raw)) throw new Error('XML DTD/entity declarations are forbidden');
  const parser = new SaxesParser({ xmlns: true });
  let root, nodes = 0;
  const stack = [];
  parser.on('error', error => { throw error; });
  parser.on('doctype', () => { throw new Error('XML DTD is forbidden'); });
  parser.on('opentag', tag => {
    if (++nodes > MAX_NODES || stack.length >= MAX_DEPTH) throw new Error('XML structure exceeds node/depth limit');
    const attrs = Object.create(null);
    for (const a of Object.values(tag.attributes)) {
      if (a.uri === 'http://www.w3.org/2000/xmlns/') continue;
      // Schema-location hints are metadata; no schema or URL is fetched.
      if (a.uri === 'http://www.w3.org/2001/XMLSchema-instance' && ['noNamespaceSchemaLocation', 'schemaLocation'].includes(a.local)) continue;
      if (a.uri) throw new Error('Namespaced report attributes are unsupported');
      attrs[a.local] = a.value;
    }
    const node = { name: tag.local, namespace: tag.uri, attrs, children: [] };
    if (stack.length) stack.at(-1).children.push(node); else root = node;
    stack.push(node);
  });
  parser.on('closetag', () => stack.pop());
  parser.write(raw).close();
  if (!root || stack.length) throw new Error('Incomplete XML document');
  return root;
}
const children = (node, name) => node.children.filter(c => c.name === name);
function one(node, name) {
  const found = children(node, name);
  if (found.length !== 1) throw new Error(`Expected exactly one ${name}`);
  return found[0];
}
function count(value, field, optional = false) {
  if (value === undefined && optional) return undefined;
  if (typeof value !== 'string' || !/^\d+$/.test(value) || !Number.isSafeInteger(Number(value))) throw new Error(`Invalid/missing XML count ${field}`);
  return Number(value);
}
function required(value, field) { if (typeof value !== 'string' || !value.trim()) throw new Error(`Missing XML ${field}`); return value; }
function seconds(value) {
  if (value === undefined) return undefined;
  if (!/^(?:\d+)(?:\.\d+)?$/.test(value) || !Number.isFinite(Number(value))) throw new Error('Invalid JUnit time');
  return Number(value) * 1000;
}
function duration(value) {
  if (value === undefined) return undefined;
  const match = /^(?:(\d+)\.)?(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,7}))?$/.exec(value);
  if (!match || Number(match[3]) > 59 || Number(match[4]) > 59) throw new Error('Invalid TRX duration');
  return ((Number(match[1] || 0) * 24 + Number(match[2])) * 3600 + Number(match[3]) * 60 + Number(match[4]) + Number(`0.${match[5] || 0}`)) * 1000;
}

export function xmlToCanonical(raw, format) {
  const root = document(raw), cases = [], files = [], errors = [];
  const issue = (code, message) => errors.push({ code, message });
  const check = (reported, actual, field, optional = false) => {
    const value = count(reported, field, optional);
    if (value !== undefined && value !== actual) issue('COUNT_MISMATCH', `${field}: reported ${value}, observed ${actual}`);
  };
  // Namespace shadowing must not smuggle foreign elements into report semantics.
  const visit = [root];
  while (visit.length) {
    const node = visit.pop();
    if (node.namespace !== root.namespace) throw new Error('Mixed XML namespaces are unsupported');
    visit.push(...node.children);
  }
  if (format === 'junit') {
    if (root.namespace || !['testsuite', 'testsuites'].includes(root.name)) throw new Error('Expected unnamespaced Maven/pytest JUnit testsuite(s)');
    const suites = root.name === 'testsuite' ? [root] : root.children;
    if (suites.some(s => s.name !== 'testsuite')) throw new Error('Unsupported JUnit suite wrapper child');
    let failureCount = 0, errorCount = 0, skipCount = 0;
    for (const suite of suites) {
      const local = []; let failures = 0, testErrors = 0, skips = 0;
      for (const node of suite.children) {
        if (['properties', 'system-out', 'system-err'].includes(node.name)) continue;
        if (node.name === 'error' || node.name === 'failure') { issue('SUITE_FAILURE', 'JUnit suite setup/teardown failure'); continue; }
        if (node.name !== 'testcase') throw new Error(`Unsupported JUnit suite child ${node.name}`);
        if (node.attrs.status !== undefined) throw new Error('JUnit status attribute dialect is unqualified; use terminal child elements');
        const unknown = node.children.filter(c => !['failure', 'error', 'skipped', 'system-out', 'system-err', 'properties'].includes(c.name));
        if (unknown.length) throw new Error(`Unsupported JUnit case state/history ${unknown[0].name}`);
        const states = node.children.filter(c => ['failure', 'error', 'skipped'].includes(c.name));
        if (new Set(states.map(s => s.name)).size > 1) issue('CONTRADICTORY_CASE', 'JUnit case has conflicting terminal states');
        const state = states.some(s => s.name === 'error') ? 'error' : states.some(s => s.name === 'failure') ? 'failure' : states.length ? 'skipped' : 'passed';
        if (state === 'failure') failures++;
        if (state === 'error') testErrors++;
        if (state === 'skipped') skips++;
        const name = [node.attrs.classname, required(node.attrs.name, 'testcase.name')].filter(Boolean).join('::');
        local.push({ file: node.attrs.file || null, name, status: ['failure','error'].includes(state) ? 'failed' : state, durationMs: seconds(node.attrs.time) });
      }
      check(suite.attrs.tests, local.length, 'testsuite.tests');
      check(suite.attrs.failures, failures, 'testsuite.failures', true);
      check(suite.attrs.errors, testErrors, 'testsuite.errors', true);
      check(suite.attrs.skipped, skips, 'testsuite.skipped', true);
      cases.push(...local); failureCount += failures; errorCount += testErrors; skipCount += skips;
    }
    if (root.name === 'testsuites') {
      check(root.attrs.tests, cases.length, 'testsuites.tests', true);
      check(root.attrs.failures, failureCount, 'testsuites.failures', true);
      check(root.attrs.errors, errorCount, 'testsuites.errors', true);
      check(root.attrs.skipped, skipCount, 'testsuites.skipped', true);
    }
  } else if (format === 'trx') {
    if (root.name !== 'TestRun' || root.namespace !== 'http://microsoft.com/schemas/VisualStudio/TeamTest/2010') throw new Error('Expected VSTest 2010 TestRun namespace');
    const results = one(root, 'Results'), summary = one(root, 'ResultSummary'), counters = one(summary, 'Counters');
    const executionIds = new Set();
    const observed = { Passed: 0, Failed: 0, Error: 0, Timeout: 0, Aborted: 0, NotExecuted: 0 };
    for (const node of results.children) {
      if (node.name !== 'UnitTestResult' || children(node, 'InnerResults').length) throw new Error('Only flat VSTest UnitTestResult records are qualified');
      const executionId = required(node.attrs.executionId, 'executionId');
      if (executionIds.has(executionId)) issue('DUPLICATE_TERMINAL', `Repeated TRX executionId ${executionId}`);
      executionIds.add(executionId);
      const outcome = required(node.attrs.outcome, 'outcome');
      if (!(outcome in observed)) throw new Error(`Unsupported/nonterminal TRX outcome ${outcome}`);
      observed[outcome]++;
      cases.push({ file: null, name: `${required(node.attrs.testId, 'testId')}::${required(node.attrs.testName, 'testName')}`, status: outcome === 'Passed' ? 'passed' : outcome === 'NotExecuted' ? 'skipped' : 'failed', durationMs: duration(node.attrs.duration) });
    }
    check(counters.attrs.total, cases.length, 'Counters.total');
    check(counters.attrs.executed, cases.length - observed.NotExecuted, 'Counters.executed');
    for (const [field, outcome] of [['passed','Passed'],['failed','Failed'],['error','Error'],['timeout','Timeout'],['aborted','Aborted'],['notExecuted','NotExecuted']]) check(counters.attrs[field], observed[outcome], `Counters.${field}`, !['passed','failed'].includes(field));
    for (const [field, value] of Object.entries(counters.attrs)) if (!['total','executed','passed','failed','error','timeout','aborted','notExecuted'].includes(field) && count(value, `Counters.${field}`) !== 0) issue('UNSUPPORTED_COUNTER', `Nonzero TRX ${field}`);
    if (!['Completed','Passed','Failed','Error','Aborted','Timeout'].includes(summary.attrs.outcome)) issue('INCOMPLETE_RUN', `TRX ResultSummary outcome ${summary.attrs.outcome}`);
    if (['Failed','Error','Aborted','Timeout'].includes(summary.attrs.outcome) && !cases.some(c => c.status === 'failed')) issue('SUITE_FAILURE', 'TRX run failed without a failed case');
    if (summary.attrs.outcome === 'Passed' && cases.some(c => c.status === 'failed')) issue('CONTRADICTORY_SUCCESS', 'TRX passing summary contains failed cases');
    if (children(summary, 'RunInfos').some(info => info.children.some(item => item.attrs.outcome && item.attrs.outcome !== 'Passed'))) issue('RUN_INFO_FAILURE', 'TRX contains nonpassing run-level diagnostics');
  } else throw new Error(`Unsupported XML format ${format}`);
  return { mode: 'execution', complete: errors.length === 0, cases, files, errors };
}
