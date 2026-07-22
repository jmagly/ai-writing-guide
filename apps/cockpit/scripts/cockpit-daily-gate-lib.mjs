const SCHEMA = 'aiwg.cockpit-daily-gate/v1';

export const DAILY_GATE_SCHEMA = SCHEMA;
export const REQUIRED_CHECKS = Object.freeze([
  'protected_executor_auth',
  'authorization_failures_explicit',
  'inventory_lifecycle_session_pty',
  'transient_recovery',
  'bridge_executor_restart_continuity',
  'managed_pty_working_directory',
  'upgrade_candidate_smoke',
  'rollback_smoke',
  'secret_scan',
]);
export const REQUIRED_RUNTIMES = Object.freeze(['host', 'container']);
export const PREVIEW_RUNTIMES = Object.freeze(['vm', 'apple']);
export const REQUIRED_PHASES = Object.freeze([
  'previous_stable_smoke',
  'upgrade',
  'candidate_smoke',
  'rollback',
  'rollback_smoke',
]);

const STATUS_VALUES = new Set(['pass', 'fail', 'skip', 'blocked']);
const FORBIDDEN_REFS = new Set(['', 'latest', 'main', 'master', 'head', 'unknown', 'unspecified']);
const SECRET_PATTERNS = [
  { name: 'bearer credential', expression: /\bBearer\s+[A-Za-z0-9._~+\/-]{8,}/i },
  { name: 'private key', expression: /-----BEGIN(?: [A-Z0-9]+)? PRIVATE KEY-----/i },
  { name: 'credential in URL', expression: /https?:\/\/[^\s/@:]+:[^\s/@]+@/i },
  { name: 'credential query parameter', expression: /[?&](?:access_token|api_key|authorization|password|secret|token)=[^&\s]+/i },
  { name: 'provider credential', expression: /\b(?:sk-(?:proj-)?|gh[oprsu]_)[A-Za-z0-9_-]{12,}/i },
  { name: 'AWS access key', expression: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/ },
  { name: 'JWT', expression: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/ },
  { name: 'credential file reference', expression: /["']?(?:credential|secret|token)[_-]?file["']?\s*[:=]\s*["']?[^\s,"'}]{2,}/i },
  {
    name: 'credential-valued field',
    expression: /["']?(?:access[_-]?token|api[_-]?key|authorization|client[_-]?secret|password|private[_-]?key|refresh[_-]?token)["']?\s*[:=]\s*["']?(?!\[REDACTED\]|redacted|null\b|false\b|true\b)[^\s,"'}]{4,}/i,
  },
];

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function orderedRuntimeRows(rows = []) {
  const order = [...REQUIRED_RUNTIMES, ...PREVIEW_RUNTIMES];
  return [...rows].sort((left, right) => {
    const leftIndex = order.indexOf(left?.runtime);
    const rightIndex = order.indexOf(right?.runtime);
    return (leftIndex < 0 ? order.length : leftIndex) - (rightIndex < 0 ? order.length : rightIndex);
  });
}

function orderedChecks(checks = []) {
  return [...checks].sort((left, right) => {
    const leftIndex = REQUIRED_CHECKS.indexOf(left?.id);
    const rightIndex = REQUIRED_CHECKS.indexOf(right?.id);
    if (leftIndex !== rightIndex) {
      return (leftIndex < 0 ? REQUIRED_CHECKS.length : leftIndex) - (rightIndex < 0 ? REQUIRED_CHECKS.length : rightIndex);
    }
    return String(left?.id ?? '').localeCompare(String(right?.id ?? ''));
  });
}

export function isImmutableVersionRef(value) {
  const normalized = String(value ?? '').trim();
  if (FORBIDDEN_REFS.has(normalized.toLowerCase())) return false;
  return /^v?\d{4}\.\d{1,2}\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(normalized)
    || /^[0-9a-f]{7,64}$/i.test(normalized)
    || /^sha256:[0-9a-f]{64}$/i.test(normalized);
}

export function scanForSecrets(value) {
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);
  const findings = [];
  for (const pattern of SECRET_PATTERNS) {
    if (pattern.expression.test(serialized)) findings.push(pattern.name);
  }
  return [...new Set(findings)];
}

export function buildDailyGateReport(input) {
  const runtimes = orderedRuntimeRows(input.runtimes);
  const checks = orderedChecks(input.checks);
  const requiredFailures = [
    ...REQUIRED_RUNTIMES.flatMap((runtime) => {
      const row = runtimes.find((candidate) => candidate.runtime === runtime);
      return row?.status === 'pass' ? [] : [`runtime:${runtime}:${row?.status ?? 'missing'}`];
    }),
    ...REQUIRED_CHECKS.flatMap((id) => {
      const row = checks.find((candidate) => candidate.id === id);
      return row?.status === 'pass' ? [] : [`check:${id}:${row?.status ?? 'missing'}`];
    }),
  ];
  const report = {
    schema: SCHEMA,
    issue: 1842,
    mode: input.mode ?? 'live',
    started_at: input.started_at,
    finished_at: input.finished_at,
    result: requiredFailures.length === 0 ? 'pass' : 'fail',
    versions: input.versions,
    runtimes,
    checks,
    phases: input.phases ?? [],
    blockers: input.blockers ?? [],
    required_failures: requiredFailures,
    artifacts: input.artifacts ?? {},
  };
  const findings = scanForSecrets(report);
  if (findings.length > 0) {
    report.result = 'fail';
    report.required_failures.push(...findings.map((finding) => `secret:${finding}`));
  }
  return report;
}

function evidenceRows(report) {
  return Array.isArray(report?.evidence) ? report.evidence : [];
}

function evidencePassed(report, names) {
  return names.every((name) => evidenceRows(report).some((row) => row?.name === name && row?.status === 'pass'));
}

function phaseById(phases, id) {
  return phases.find((phase) => phase?.id === id);
}

function phasePassed(phases, id) {
  const phase = phaseById(phases, id);
  return phase?.status === 'pass' && phase?.report?.result === 'pass';
}

function identityContains(report, expected) {
  const identity = { ...(report?.executor_identity ?? {}) };
  delete identity.version_hint;
  return JSON.stringify(identity).toLowerCase().includes(String(expected).toLowerCase());
}

export function aggregateDailyGateEvidence(input) {
  const phases = input.phases ?? [];
  const candidate = phaseById(phases, 'candidate_smoke')?.report;
  const baseline = phaseById(phases, 'previous_stable_smoke')?.report;
  const rollback = phaseById(phases, 'rollback_smoke')?.report;
  const runtimeStatus = (runtime) => evidencePassed(candidate, [`provision ${runtime}`, `matrix ${runtime}`]) ? 'pass' : 'fail';
  const phaseReports = phases.map((phase) => phase?.report).filter(Boolean);
  const secretFindings = scanForSecrets(phaseReports);
  const observedCandidate = phaseById(phases, 'candidate_smoke')?.observed_aiwg_version;
  const observedRollback = phaseById(phases, 'rollback_smoke')?.observed_aiwg_version;
  const authPass = candidate?.executor_auth_configured === true
    && evidencePassed(candidate, ['protected executor authorization boundary']);
  const matrixPass = evidencePassed(candidate, [
    'provision host',
    'matrix host',
    'provision container',
    'matrix container',
    'daily scoped cleanup',
  ]) && Boolean(candidate?.mutation_file);
  const restartPass = evidencePassed(candidate, [
    'daily Bridge restart continuity',
    'daily executor restart continuity',
  ]);
  const upgradePass = phasePassed(phases, 'previous_stable_smoke')
    && phaseById(phases, 'upgrade')?.status === 'pass'
    && phasePassed(phases, 'candidate_smoke')
    && observedCandidate === input.versions?.aiwg?.candidate
    && identityContains(candidate, input.versions?.executor?.candidate)
    && identityContains(baseline, input.versions?.executor?.previous_stable);
  const rollbackPass = phaseById(phases, 'rollback')?.status === 'pass'
    && phasePassed(phases, 'rollback_smoke')
    && observedRollback === input.versions?.aiwg?.previous_stable
    && identityContains(rollback, input.versions?.executor?.previous_stable);
  const status = (pass) => pass ? 'pass' : 'fail';

  return buildDailyGateReport({
    mode: input.mode ?? 'live',
    started_at: input.started_at,
    finished_at: input.finished_at,
    versions: input.versions,
    runtimes: [
      { runtime: 'host', tier: 'required', status: runtimeStatus('host'), evidence: 'candidate provision, managed PTY, workload, mutation, and scoped cleanup' },
      { runtime: 'container', tier: 'required', status: runtimeStatus('container'), evidence: 'candidate provision, managed PTY, workload, mutation, and scoped cleanup' },
      { runtime: 'vm', tier: 'preview', status: input.preview?.vm?.status ?? 'skip', evidence: input.preview?.vm?.evidence ?? 'not selected by the Linux daily gate' },
      { runtime: 'apple', tier: 'preview', status: input.preview?.apple?.status ?? 'skip', evidence: input.preview?.apple?.evidence ?? 'not selected by the Linux daily gate' },
    ],
    checks: [
      { id: 'protected_executor_auth', required: true, status: status(authPass), evidence: 'token-file custody enabled and authenticated candidate inventory passed' },
      { id: 'authorization_failures_explicit', required: true, status: status(authPass), evidence: 'unauthenticated candidate inventory returned explicit upstream 401/403' },
      { id: 'inventory_lifecycle_session_pty', required: true, status: status(matrixPass), evidence: 'host/container provision, session list/create, observer/controller attach, mutation, and cleanup' },
      { id: 'transient_recovery', required: true, status: status(evidencePassed(candidate, ['daily transient recovery'])), evidence: 'same Bridge recovered inventory, running/session projections, and SSE' },
      { id: 'bridge_executor_restart_continuity', required: true, status: status(restartPass), evidence: 'Bridge restart and executor restart both re-adopted and reattached created sessions' },
      { id: 'managed_pty_working_directory', required: true, status: status(evidencePassed(candidate, ['managed PTY working directory host', 'managed PTY working directory container'])), evidence: 'host and container PTY cwd matched explicit expected homes' },
      { id: 'upgrade_candidate_smoke', required: true, status: status(upgradePass), evidence: 'previous-stable smoke, upgrade hook, candidate smoke, and exact identity checks' },
      { id: 'rollback_smoke', required: true, status: status(rollbackPass), evidence: 'rollback hook restored previous-stable AIWG/executor identities and smoke passed' },
      { id: 'secret_scan', required: true, status: status(secretFindings.length === 0), evidence: secretFindings.length ? `findings: ${secretFindings.join(', ')}` : 'phase and aggregate evidence passed secret-pattern scanning' },
    ],
    phases: phases.map(({ report, ...phase }) => phase),
    blockers: input.blockers,
    artifacts: input.artifacts,
  });
}

export function validateDailyGateReport(report) {
  const errors = [];
  if (!isObject(report)) return { ok: false, errors: ['report must be an object'] };
  if (report.schema !== SCHEMA) errors.push(`schema must be ${SCHEMA}`);
  if (report.issue !== 1842) errors.push('issue must be 1842');
  if (report.mode !== 'live') errors.push('mode must be live; synthetic evidence cannot satisfy the daily gate');
  if (!report.started_at || !report.finished_at) errors.push('started_at and finished_at are required');

  const versions = report.versions;
  for (const product of ['aiwg', 'executor']) {
    for (const stage of ['previous_stable', 'candidate']) {
      const value = versions?.[product]?.[stage];
      if (!isImmutableVersionRef(value)) errors.push(`versions.${product}.${stage} must be an immutable version or commit`);
    }
  }

  const runtimes = Array.isArray(report.runtimes) ? report.runtimes : [];
  for (const runtime of REQUIRED_RUNTIMES) {
    const rows = runtimes.filter((candidate) => candidate?.runtime === runtime);
    if (rows.length !== 1) errors.push(`runtime ${runtime} must appear exactly once`);
    else if (rows[0].tier !== 'required' || rows[0].status !== 'pass') {
      errors.push(`required runtime ${runtime} must pass`);
    }
  }
  for (const runtime of PREVIEW_RUNTIMES) {
    const rows = runtimes.filter((candidate) => candidate?.runtime === runtime);
    if (rows.length !== 1) errors.push(`preview runtime ${runtime} must appear exactly once`);
    else if (rows[0].tier !== 'preview' || !STATUS_VALUES.has(rows[0].status)) {
      errors.push(`preview runtime ${runtime} must be explicitly reported as preview`);
    }
  }

  const checks = Array.isArray(report.checks) ? report.checks : [];
  for (const id of REQUIRED_CHECKS) {
    const rows = checks.filter((candidate) => candidate?.id === id);
    if (rows.length !== 1) errors.push(`required check ${id} must appear exactly once`);
    else if (rows[0].required !== true || rows[0].status !== 'pass') {
      errors.push(`required check ${id} must pass; skip and blocked are failures`);
    }
  }
  for (const row of [...runtimes, ...checks]) {
    if (row?.status && !STATUS_VALUES.has(row.status)) errors.push(`invalid status ${row.status}`);
    if (row?.duration_ms !== undefined && (!Number.isFinite(row.duration_ms) || row.duration_ms < 0)) {
      errors.push(`${row.id ?? row.runtime} duration_ms must be a non-negative number`);
    }
  }

  const phases = Array.isArray(report.phases) ? report.phases : [];
  for (const id of REQUIRED_PHASES) {
    const rows = phases.filter((candidate) => candidate?.id === id);
    if (rows.length !== 1) errors.push(`required phase ${id} must appear exactly once`);
    else if (rows[0].status !== 'pass') errors.push(`required phase ${id} must pass`);
  }
  for (const row of phases) {
    if (!STATUS_VALUES.has(row?.status)) errors.push(`invalid phase status ${row?.status}`);
    if (!Number.isFinite(row?.duration_ms) || row.duration_ms < 0) {
      errors.push(`${row?.id ?? 'phase'} duration_ms must be a non-negative number`);
    }
  }

  const secretFindings = scanForSecrets(report);
  for (const finding of secretFindings) errors.push(`secret-pattern scan found ${finding}`);
  if (report.result !== (errors.length === 0 ? 'pass' : 'fail')) {
    errors.push(`result must be ${errors.length === 0 ? 'pass' : 'fail'} for the supplied evidence`);
  }
  return { ok: errors.length === 0, errors };
}

export function renderDailyGateMarkdown(report) {
  const lines = [
    '# Cockpit Daily Linux Reliability Gate',
    '',
    `- Schema: \`${report.schema}\``,
    `- Issue: #${report.issue}`,
    `- Mode: ${report.mode}`,
    `- Result: **${String(report.result).toUpperCase()}**`,
    `- Started: ${report.started_at}`,
    `- Finished: ${report.finished_at}`,
    `- AIWG: ${report.versions?.aiwg?.previous_stable} → ${report.versions?.aiwg?.candidate}`,
    `- Executor: ${report.versions?.executor?.previous_stable} → ${report.versions?.executor?.candidate}`,
    '',
    '## Runtime tiers',
    '',
    '| Runtime | Tier | Status | Evidence |',
    '|---|---|---|---|',
    ...orderedRuntimeRows(report.runtimes).map((row) => `| ${row.runtime} | ${row.tier} | ${row.status} | ${row.evidence ?? ''} |`),
    '',
    '## Checks',
    '',
    '| Check | Required | Status | Duration | Evidence |',
    '|---|---:|---|---:|---|',
    ...orderedChecks(report.checks).map((row) => `| ${row.id} | ${row.required ? 'yes' : 'no'} | ${row.status} | ${row.duration_ms ?? 0} ms | ${row.evidence ?? ''} |`),
    '',
    '## Upgrade and recovery phases',
    '',
    '| Phase | Status | Duration | Evidence |',
    '|---|---|---:|---|',
    ...(report.phases ?? []).map((row) => `| ${row.id} | ${row.status} | ${row.duration_ms ?? 0} ms | ${row.evidence ?? ''} |`),
    '',
  ];
  if (report.blockers?.length) {
    lines.push('## Linked blockers', '', ...report.blockers.map((blocker) => `- ${blocker}`), '');
  }
  if (report.required_failures?.length) {
    lines.push('## Required failures', '', ...report.required_failures.map((failure) => `- ${failure}`), '');
  }
  return `${lines.join('\n')}\n`;
}
