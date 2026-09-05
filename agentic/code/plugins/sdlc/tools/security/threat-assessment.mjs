import { createHash } from 'node:crypto';

export const THREAT_ASSESSMENT_SCHEMA_VERSION = '1';
export const THREAT_ASSESSMENT_ENGINE_VERSION = '1.0.1';

export const THREAT_SURFACES = [
  'issue-title',
  'issue-body',
  'issue-comment',
  'pull-request-title',
  'pull-request-body',
  'pull-request-diff-summary',
  'review-comment',
  'release-note',
  'handoff',
  'outbound-maintainer-comment',
];

export const SEVERITIES = ['informational', 'low', 'moderate', 'high', 'critical'];
export const ACTIONS = ['proceed', 'record', 'flag', 'require-authorization', 'reject'];

const SEVERITY_RANK = Object.fromEntries(SEVERITIES.map((name, index) => [name, index]));
const ACTION_RANK = Object.fromEntries(ACTIONS.map((name, index) => [name, index]));
const BUILTIN_PACK_PREFIX = 'aiwg:';

const BUILTIN_RULES = [
  {
    id: 'instruction-override',
    severity: 'high',
    likelihood: 4,
    impact: 4,
    taxonomy: ['ASI01', 'ASI09'],
    patterns: [
      '\\bignore (all )?(previous|prior|above) instructions\\b',
      '\\b(system|developer) (prompt|message|instructions?)\\b',
      '\\bdo not (tell|inform|notify) (the )?(maintainer|operator|user)\\b',
      '\\byou are now\\b',
    ],
  },
  {
    id: 'sensitive-file-target',
    severity: 'moderate',
    likelihood: 3,
    impact: 4,
    taxonomy: ['ASI03', 'ASI04', 'ASI05'],
    patterns: [
      '\\b(AGENTS|CLAUDE|AIWG|WARP)\\.md\\b',
      '\\b(MCP|mcp) config\\b',
      '\\.github/workflows/|\\.gitea/workflows/|workflow[s]?\\.ya?ml',
      '\\bagent definitions?\\b',
      '\\brules/RULES-INDEX\\.md\\b',
    ],
  },
  {
    id: 'third-party-execution',
    severity: 'high',
    likelihood: 4,
    impact: 4,
    taxonomy: ['ASI02', 'ASI04', 'ASI05'],
    patterns: [
      '\\bnpx\\s+[-@\\w./]+',
      '\\bnpm\\s+(install|i|exec)\\s+[-@\\w./]+',
      '\\bpipx?\\s+install\\s+[-\\w./]+',
      '\\bcargo\\s+install\\s+[-\\w./]+',
      '\\bcurl\\b[^|\\n]*\\|\\s*(sh|bash|zsh)\\b',
      '\\bbash\\s+<\\(\\s*curl\\b',
      '\\bgit\\+https?://',
    ],
  },
  {
    id: 'floating-version',
    severity: 'moderate',
    likelihood: 3,
    impact: 3,
    taxonomy: ['ASI04'],
    patterns: [
      '@latest\\b',
      'uses:\\s*[-\\w./]+@(main|master|latest|v?\\d+)\\b',
      'image:\\s*[-\\w./:]+:latest\\b',
      '\\b(unpinned|floating) (dependency|version|action|container)\\b',
    ],
  },
  {
    id: 'credential-or-env-probing',
    severity: 'high',
    likelihood: 4,
    impact: 5,
    taxonomy: ['ASI03', 'ASI09'],
    patterns: [
      '\\b(printenv|env\\s*\\||env\\s*$|process\\.env|os\\.environ)\\b',
      '\\.env\\b',
      '\\b(api[_-]?keys?|secrets?|cookies?|document\\.cookie|credentials?|authentication material)\\b',
      '\\b(?:api|access|auth(?:entication)?|bearer|session|refresh|oauth|jwt|signing|github|gitea|cloud)(?:[_-]?\\s*)tokens?\\b',
      '\\b(id_rsa|ssh keys?|gpg keys?|aws_access_key|cloud credentials?)\\b',
    ],
  },
  {
    id: 'pressure-without-evidence',
    severity: 'low',
    likelihood: 2,
    impact: 2,
    taxonomy: ['ASI09'],
    patterns: [
      '\\b(blocking release|urgent|must be done|priority:\\s*high|critical security|do this now)\\b',
      '\\bsecurity critical\\b',
    ],
  },
  {
    id: 'unverifiable-authority-claim',
    severity: 'low',
    likelihood: 2,
    impact: 3,
    taxonomy: ['ASI01', 'ASI09'],
    patterns: [
      '\\bP-\\d{4}-\\d{3,}\\b',
      '\\bpolicy\\s+[A-Z]-?\\d{3,}\\b',
      '\\bhex\\s+[0-9a-f]{6,12}\\b',
      '\\bCVE-\\d{4}-\\d{4,}\\b(?![\\s\\S]{0,160}https?://)',
      '\\b(advisory|standard|RFC)\\b(?![\\s\\S]{0,160}https?://)',
    ],
  },
  {
    id: 'security-framing-conflict',
    severity: 'moderate',
    likelihood: 3,
    impact: 4,
    taxonomy: ['ASI04', 'ASI09'],
    patterns: [
      '\\b(improve|fix|harden|secure|audit).{0,120}\\b(npx\\b|@latest\\b|curl\\b[^|\\n]*\\||printenv|\\.env)\\b',
      '\\b(security|secure).{0,120}\\b(add|install|run).{0,80}\\b(latest|remote|third[- ]party)\\b',
    ],
  },
];

const BUILTIN_PACKS = Object.freeze({
  'aiwg:prompt-injection': ['instruction-override', 'pressure-without-evidence', 'unverifiable-authority-claim'],
  'aiwg:supply-chain': ['sensitive-file-target', 'third-party-execution', 'floating-version', 'security-framing-conflict'],
  'aiwg:credential-protection': ['credential-or-env-probing'],
  'aiwg:all': BUILTIN_RULES.map(rule => rule.id),
});

export const BUILTIN_PROFILES = Object.freeze({
  trusted: {
    version: '1.0.0',
    mode: 'off',
    description: 'Explicitly disables the AIWG classifier. Independent provider/platform safeguards remain active.',
    ruleSets: [],
    thresholds: { requireAuthorization: 'critical', reject: 'critical' },
  },
  audit: {
    version: '1.0.0',
    mode: 'audit',
    description: 'Records balanced findings without interrupting work.',
    ruleSets: ['aiwg:all'],
    thresholds: { flag: 'moderate', requireAuthorization: 'high', reject: 'critical' },
  },
  balanced: {
    version: '1.0.0',
    mode: 'enforce',
    description: 'Backward-compatible default with contextual false-positive suppression.',
    ruleSets: ['aiwg:all'],
    thresholds: { flag: 'moderate', requireAuthorization: 'high', reject: 'critical' },
  },
  strict: {
    version: '1.0.0',
    mode: 'enforce',
    description: 'Requires authorization at moderate severity and rejects critical findings.',
    ruleSets: ['aiwg:all'],
    thresholds: { flag: 'low', requireAuthorization: 'moderate', reject: 'critical' },
  },
  'high-assurance': {
    version: '1.0.0',
    mode: 'enforce',
    description: 'Rejects high/critical findings and requires authorization at moderate severity.',
    ruleSets: ['aiwg:all'],
    thresholds: { flag: 'low', requireAuthorization: 'moderate', reject: 'high' },
  },
});

function stableSort(value) {
  if (Array.isArray(value)) return value.map(stableSort);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, stableSort(value[key])]));
  }
  return value;
}

function stableHash(value) {
  return createHash('sha256').update(JSON.stringify(stableSort(value))).digest('hex');
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function validatePattern(pattern, where, errors) {
  if (typeof pattern !== 'string' || pattern.length === 0 || pattern.length > 500) {
    errors.push(`${where}: must be a non-empty regex string no longer than 500 characters`);
    return;
  }
  try {
    new RegExp(pattern, 'imu');
  } catch (error) {
    errors.push(`${where}: invalid regular expression (${error.message})`);
  }
  if (/\\[1-9]/.test(pattern) || /\(\?<([=!])/.test(pattern)
    || /\([^)]*[+*][^)]*\)[+*{]/.test(pattern) || /(?:\.\*){2,}/.test(pattern)) {
    errors.push(`${where}: unsafe regex construct (backreference, lookbehind, or nested unbounded quantifier)`);
  }
}

function validateStatement(statement, where, errors) {
  if (!isObject(statement)) {
    errors.push(`${where}: must be an object`);
    return;
  }
  if (typeof statement.id !== 'string' || !/^[a-z][a-z0-9-]*$/.test(statement.id)) {
    errors.push(`${where}.id: must be a kebab-case identifier`);
  }
  if (!['suppress', 'set-severity'].includes(statement.effect)) {
    errors.push(`${where}.effect: must be suppress or set-severity`);
  }
  if (typeof statement.reason !== 'string' || !statement.reason.trim()) {
    errors.push(`${where}.reason: must be a non-empty string`);
  }
  if (statement.signals !== undefined
    && (!Array.isArray(statement.signals) || !statement.signals.every(signal => typeof signal === 'string'))) {
    errors.push(`${where}.signals: must be an array of strings`);
  }
  if (statement.effect === 'suppress') {
    if (!statement.signals?.length) errors.push(`${where}.signals: suppress statements must name at least one signal`);
    const when = statement.when;
    if (!isObject(when) || !Object.values(when).some(value => Array.isArray(value) && value.length)) {
      errors.push(`${where}.when: suppress statements require at least one narrow condition`);
    }
    if (!isObject(statement.riskAcceptance)
      || typeof statement.riskAcceptance.acceptedBy !== 'string'
      || typeof statement.riskAcceptance.rationale !== 'string') {
      errors.push(`${where}.riskAcceptance: suppress statements require acceptedBy and rationale`);
    }
  }
  if (statement.effect === 'set-severity' && !SEVERITIES.includes(statement.severity)) {
    errors.push(`${where}.severity: set-severity requires a known severity`);
  }
}

export function validateThreatAssessmentConfig(value) {
  const errors = [];
  if (value === undefined || value === null) return errors;
  if (!isObject(value)) return ['security.threatAssessment: must be an object'];
  if (value.schemaVersion !== undefined && value.schemaVersion !== '1') {
    errors.push("security.threatAssessment.schemaVersion: must be '1'");
  }
  if (value.mode !== undefined && !['off', 'audit', 'enforce'].includes(value.mode)) {
    errors.push('security.threatAssessment.mode: must be off, audit, or enforce');
  }
  if (value.defaultProfile !== undefined && typeof value.defaultProfile !== 'string') {
    errors.push('security.threatAssessment.defaultProfile: must be a string');
  }
  if (value.surfaces !== undefined) {
    if (!isObject(value.surfaces)) errors.push('security.threatAssessment.surfaces: must be an object');
    else {
      for (const [surface, entry] of Object.entries(value.surfaces)) {
        if (!THREAT_SURFACES.includes(surface)) {
          errors.push(`security.threatAssessment.surfaces.${surface}: unknown surface`);
          continue;
        }
        if (!isObject(entry)) {
          errors.push(`security.threatAssessment.surfaces.${surface}: must be an object`);
          continue;
        }
        if (entry.mode !== undefined && !['off', 'audit', 'enforce'].includes(entry.mode)) {
          errors.push(`security.threatAssessment.surfaces.${surface}.mode: must be off, audit, or enforce`);
        }
      }
    }
  }
  if (value.rulePacks !== undefined) {
    if (!isObject(value.rulePacks)) errors.push('security.threatAssessment.rulePacks: must be an object');
    else {
      for (const [name, pack] of Object.entries(value.rulePacks)) {
        const where = `security.threatAssessment.rulePacks.${name}`;
        if (name.startsWith(BUILTIN_PACK_PREFIX)) errors.push(`${where}: project rule packs cannot shadow aiwg: built-ins`);
        if (!isObject(pack) || !Array.isArray(pack.rules)) {
          errors.push(`${where}.rules: must be an array`);
          continue;
        }
        if (typeof pack.version !== 'string' || !pack.version.trim()) {
          errors.push(`${where}.version: must be a non-empty string`);
        }
        const ids = new Set();
        pack.rules.forEach((rule, index) => {
          const ruleWhere = `${where}.rules[${index}]`;
          if (!isObject(rule)) {
            errors.push(`${ruleWhere}: must be an object`);
            return;
          }
          if (typeof rule.id !== 'string' || !/^[a-z][a-z0-9-]*$/.test(rule.id)) {
            errors.push(`${ruleWhere}.id: must be a kebab-case identifier`);
          } else if (BUILTIN_RULES.some(builtin => builtin.id === rule.id)) {
            errors.push(`${ruleWhere}.id: cannot shadow built-in rule '${rule.id}'`);
          } else if (ids.has(rule.id)) {
            errors.push(`${ruleWhere}.id: duplicate '${rule.id}'`);
          } else ids.add(rule.id);
          if (!SEVERITIES.includes(rule.severity)) errors.push(`${ruleWhere}.severity: unknown severity`);
          for (const dimension of ['likelihood', 'impact']) {
            if (rule[dimension] !== undefined
              && (!Number.isInteger(rule[dimension]) || rule[dimension] < 1 || rule[dimension] > 5)) {
              errors.push(`${ruleWhere}.${dimension}: must be an integer from 1 to 5`);
            }
          }
          if (!Array.isArray(rule.patterns) || rule.patterns.length === 0) {
            errors.push(`${ruleWhere}.patterns: must be a non-empty array`);
          } else rule.patterns.forEach((pattern, patternIndex) =>
            validatePattern(pattern, `${ruleWhere}.patterns[${patternIndex}]`, errors));
        });
      }
    }
  }
  const profiles = value.profiles ?? {};
  if (!isObject(profiles)) errors.push('security.threatAssessment.profiles: must be an object');
  else {
    const visit = (name, stack = []) => {
      if (stack.includes(name)) {
        errors.push(`security.threatAssessment.profiles.${name}.extends: cyclic inheritance (${[...stack, name].join(' -> ')})`);
        return;
      }
      const profile = profiles[name];
      if (!isObject(profile)) return;
      const parents = profile.extends ?? [];
      if (!Array.isArray(parents)) {
        errors.push(`security.threatAssessment.profiles.${name}.extends: must be an array`);
        return;
      }
      for (const parent of parents) {
        if (!(parent in profiles) && !(parent in BUILTIN_PROFILES) && !String(parent).startsWith('aiwg:')) {
          errors.push(`security.threatAssessment.profiles.${name}.extends: unknown profile '${parent}'`);
        }
        const local = String(parent).replace(/^aiwg:/, '');
        if (local in profiles) visit(local, [...stack, name]);
      }
    };
      for (const [name, profile] of Object.entries(profiles)) {
      const where = `security.threatAssessment.profiles.${name}`;
      if (!isObject(profile)) {
        errors.push(`${where}: must be an object`);
        continue;
      }
      if (name in BUILTIN_PROFILES || name.startsWith(BUILTIN_PACK_PREFIX)) {
        errors.push(`${where}: project profiles cannot shadow built-in profiles`);
      }
      if (profile.mode !== undefined && !['off', 'audit', 'enforce'].includes(profile.mode)) {
        errors.push(`${where}.mode: must be off, audit, or enforce`);
      }
      if (profile.version !== undefined && (typeof profile.version !== 'string' || !profile.version.trim())) {
        errors.push(`${where}.version: must be a non-empty string`);
      }
      if (profile.ruleSets !== undefined) {
        if (!Array.isArray(profile.ruleSets) || !profile.ruleSets.every(pack => typeof pack === 'string')) {
          errors.push(`${where}.ruleSets: must be an array of strings`);
        } else {
          for (const pack of profile.ruleSets) {
            if (!BUILTIN_PACKS[pack] && !value.rulePacks?.[pack]) {
              errors.push(`${where}.ruleSets: unavailable rule pack '${pack}'`);
            }
          }
        }
      }
      if (profile.statements !== undefined) {
        if (!Array.isArray(profile.statements)) errors.push(`${where}.statements: must be an array`);
        else profile.statements.forEach((statement, index) =>
          validateStatement(statement, `${where}.statements[${index}]`, errors));
      }
      for (const [threshold, severity] of Object.entries(profile.thresholds ?? {})) {
        if (!['flag', 'requireAuthorization', 'reject'].includes(threshold) || !SEVERITIES.includes(severity)) {
          errors.push(`${where}.thresholds.${threshold}: must use a known action threshold and severity`);
        }
      }
      visit(name);
    }
  }
  const defaultName = value.defaultProfile ?? 'balanced';
  if (!(defaultName in BUILTIN_PROFILES) && !(defaultName in profiles)) {
    errors.push(`security.threatAssessment.defaultProfile: unknown profile '${defaultName}'`);
  }
  if (value.statements !== undefined) {
    if (!Array.isArray(value.statements)) errors.push('security.threatAssessment.statements: must be an array');
    else value.statements.forEach((statement, index) =>
      validateStatement(statement, `security.threatAssessment.statements[${index}]`, errors));
  }
  return Array.from(new Set(errors));
}

function mergeProfile(base, extension) {
  return {
    ...base,
    ...extension,
    thresholds: { ...(base.thresholds ?? {}), ...(extension.thresholds ?? {}) },
    ruleSets: extension.ruleSets ?? base.ruleSets ?? [],
    statements: [...(base.statements ?? []), ...(extension.statements ?? [])],
  };
}

function resolveProfile(name, config, stack = []) {
  const builtinName = String(name).replace(/^aiwg:/, '');
  if (BUILTIN_PROFILES[builtinName]) return structuredClone(BUILTIN_PROFILES[builtinName]);
  if (stack.includes(name)) throw new Error(`Cyclic threat-assessment profile inheritance: ${[...stack, name].join(' -> ')}`);
  const raw = config.profiles?.[name];
  if (!raw) throw new Error(`Unknown threat-assessment profile '${name}'`);
  let resolved = {};
  for (const parent of raw.extends ?? ['aiwg:balanced']) {
    resolved = mergeProfile(resolved, resolveProfile(parent, config, [...stack, name]));
  }
  return mergeProfile(resolved, raw);
}

export function resolveThreatAssessmentPolicy(rawConfig, surface) {
  const config = rawConfig ?? {};
  const errors = validateThreatAssessmentConfig(config);
  if (errors.length) throw new Error(`Invalid threat-assessment configuration:\n${errors.join('\n')}`);
  if (!THREAT_SURFACES.includes(surface)) throw new Error(`Unknown threat-assessment surface '${surface}'`);
  const surfaceConfig = config.surfaces?.[surface] ?? {};
  const profileName = surfaceConfig.profile ?? config.defaultProfile ?? 'balanced';
  const profile = resolveProfile(profileName, config);
  const mode = surfaceConfig.mode ?? config.mode ?? profile.mode ?? 'enforce';
  return {
    schemaVersion: config.schemaVersion ?? '1',
    mode,
    profileName,
    profile,
    surface,
    config,
    provenance: rawConfig
      ? { source: '.aiwg/aiwg.config', path: 'security.threatAssessment' }
      : { source: 'aiwg-default', path: 'aiwg:balanced' },
  };
}

function normalizeParts(input) {
  if (Array.isArray(input.parts)) {
    return input.parts.map((part, index) => ({
      id: part.id ?? `part-${index + 1}`,
      text: String(part.text ?? ''),
      context: part.context,
    }));
  }
  return [{ id: 'content', text: String(input.content ?? ''), context: input.semanticContext }];
}

function paragraphAt(text, index, length) {
  const startBreak = text.lastIndexOf('\n\n', index);
  const endBreak = text.indexOf('\n\n', index + length);
  const start = startBreak < 0 ? 0 : startBreak + 2;
  const end = endBreak < 0 ? text.length : endBreak;
  return { text: text.slice(start, end).replace(/\s+/g, ' ').trim(), start, end };
}

function inferContext(text, index, explicit) {
  if (explicit) return explicit;
  const before = text.slice(Math.max(0, index - 120), index).toLowerCase();
  const lineStart = text.lastIndexOf('\n', index) + 1;
  const line = text.slice(lineStart, index).trimStart();
  if (/^(>|```)/.test(line) || /(?:quoted|example|evidence|documentation)\s*[:\-]?\s*$/i.test(before)) return 'quoted';
  if (/(?:must not|do not|never|avoid|prevent|forbid|out[- ]of[- ]scope|warning against|without)\b[^.!?\n]{0,100}$/i.test(before)) {
    return 'negative';
  }
  return 'requested';
}

function configuredRules(policy) {
  const ruleIds = new Set();
  const rules = [...BUILTIN_RULES];
  for (const packName of policy.profile.ruleSets ?? ['aiwg:all']) {
    if (BUILTIN_PACKS[packName]) {
      BUILTIN_PACKS[packName].forEach(id => ruleIds.add(id));
      continue;
    }
    const pack = policy.config.rulePacks?.[packName];
    if (!pack) throw new Error(`Unavailable threat-assessment rule pack '${packName}'`);
    for (const rule of pack.rules) {
      if (rules.some(candidate => candidate.id === rule.id)) {
        throw new Error(`Custom rule '${rule.id}' conflicts with a built-in rule`);
      }
      rules.push({
        likelihood: 3,
        impact: Math.max(1, SEVERITY_RANK[rule.severity] + 1),
        taxonomy: [],
        ...rule,
        provenance: `project:${packName}`,
      });
      ruleIds.add(rule.id);
    }
  }
  return rules.filter(rule => ruleIds.has(rule.id));
}

function statementMatches(statement, finding, input) {
  if (statement.signals?.length && !statement.signals.includes(finding.ruleId)) return false;
  const when = statement.when ?? {};
  if (when.surface?.length && !when.surface.includes(input.surface)) return false;
  if (when.semanticContext?.length && !when.semanticContext.includes(finding.context)) return false;
  if (when.requestedAction?.length && !when.requestedAction.includes(input.requestedAction)) return false;
  return true;
}

function applyStatements(findings, statements, input) {
  return findings.map(finding => {
    let result = { ...finding, matchedStatements: [] };
    for (const statement of statements ?? []) {
      if (!statementMatches(statement, result, input)) continue;
      result.matchedStatements.push(statement.id);
      if (statement.effect === 'suppress') result = { ...result, suppressed: true, suppressionReason: statement.reason };
      if (statement.effect === 'set-severity' && SEVERITIES.includes(statement.severity)) {
        result = { ...result, severity: statement.severity };
      }
    }
    return result;
  });
}

function severityFromRisk(likelihood, impact) {
  const product = likelihood * impact;
  if (product >= 20) return 'critical';
  if (product >= 12) return 'high';
  if (product >= 6) return 'moderate';
  if (product >= 3) return 'low';
  return 'informational';
}

function actionForSeverity(severity, thresholds) {
  const rank = SEVERITY_RANK[severity];
  let action = 'proceed';
  if (thresholds.flag && rank >= SEVERITY_RANK[thresholds.flag]) action = 'flag';
  if (thresholds.requireAuthorization && rank >= SEVERITY_RANK[thresholds.requireAuthorization]) {
    action = 'require-authorization';
  }
  if (thresholds.reject && rank >= SEVERITY_RANK[thresholds.reject]) action = 'reject';
  return action;
}

function mandatoryAction(activeFindings) {
  const ids = new Set(activeFindings.map(finding => finding.ruleId));
  const credentialCombination = ids.has('credential-or-env-probing')
    && (ids.has('instruction-override') || ids.has('third-party-execution') || ids.has('sensitive-file-target'));
  const supplyChainCombination = ids.has('third-party-execution')
    && (ids.has('floating-version') || ids.has('sensitive-file-target') || ids.has('security-framing-conflict'));
  if (credentialCombination || supplyChainCombination) {
    return {
      action: 'reject',
      ruleId: credentialCombination ? 'mandatory:credential-exfiltration-combination' : 'mandatory:supply-chain-execution-combination',
    };
  }
  return null;
}

export function assessThreat(input, rawConfig) {
  if (!isObject(input)) throw new Error('Threat-assessment input must be an object');
  if (typeof input.content !== 'string' && !Array.isArray(input.parts)) {
    throw new Error('Threat-assessment input requires string content or a parts array');
  }
  const surface = input.surface;
  const policy = resolveThreatAssessmentPolicy(rawConfig, surface);
  const base = {
    schemaVersion: THREAT_ASSESSMENT_SCHEMA_VERSION,
    engineVersion: THREAT_ASSESSMENT_ENGINE_VERSION,
    policyVersion: policy.schemaVersion,
    profileVersion: policy.profile.version ?? policy.schemaVersion,
    policyHash: stableHash({ config: policy.config, profile: policy.profile, surface, mode: policy.mode }),
    mode: policy.mode,
    profile: policy.profileName,
    surface,
    source: input.source ?? { kind: 'unknown' },
    actor: input.actor ?? { trust: 'unknown' },
    requestedAction: input.requestedAction ?? 'consume-as-data',
    policyProvenance: policy.provenance,
  };
  if (policy.mode === 'off') {
    return {
      ...base,
      assessed: false,
      findings: [],
      risk: { score: 0, severity: 'informational', likelihood: 0, impact: 0 },
      decision: { action: 'proceed', wouldAction: 'proceed', interrupts: false, reason: 'AIWG assessment is explicitly off.' },
    };
  }

  const findings = [];
  for (const part of normalizeParts(input)) {
    for (const rule of configuredRules(policy)) {
      for (const patternText of rule.patterns) {
        const pattern = new RegExp(patternText, 'imu');
        const match = pattern.exec(part.text);
        if (!match) continue;
        const paragraph = paragraphAt(part.text, match.index, match[0].length);
        const context = inferContext(part.text, match.index, part.context);
        findings.push({
          ruleId: rule.id,
          ruleProvenance: rule.provenance ?? 'aiwg:builtin',
          severity: rule.severity ?? severityFromRisk(rule.likelihood, rule.impact),
          likelihood: rule.likelihood,
          impact: rule.impact,
          taxonomy: rule.taxonomy ?? [],
          partId: part.id,
          context,
          evidence: paragraph.text,
          suppressed: ['negative', 'quoted', 'documentation'].includes(context),
          suppressionReason: ['negative', 'quoted', 'documentation'].includes(context)
            ? `balanced contextual suppression: ${context} content is evidence/documentation, not a requested action`
            : undefined,
          matchedStatements: [],
        });
        break;
      }
    }
  }

  const statements = [...(policy.config.statements ?? []), ...(policy.profile.statements ?? [])];
  const evaluated = applyStatements(findings, statements, input);
  const active = evaluated.filter(finding => !finding.suppressed);
  const likelihood = active.reduce((max, finding) => Math.max(max, finding.likelihood ?? 0), 0);
  const impact = active.reduce((max, finding) => Math.max(max, finding.impact ?? 0), 0);
  const score = active.reduce((sum, finding) => sum + (finding.likelihood ?? 0) * (finding.impact ?? 0), 0);
  const severity = active.reduce(
    (highest, finding) => SEVERITY_RANK[finding.severity] > SEVERITY_RANK[highest] ? finding.severity : highest,
    'informational',
  );
  let wouldAction = actionForSeverity(severity, policy.profile.thresholds ?? BUILTIN_PROFILES.balanced.thresholds);
  const mandatory = mandatoryAction(active);
  if (mandatory && ACTION_RANK[mandatory.action] > ACTION_RANK[wouldAction]) wouldAction = mandatory.action;
  const action = policy.mode === 'audit' ? (active.length ? 'record' : 'proceed') : wouldAction;
  return {
    ...base,
    assessed: true,
    findings: evaluated,
    risk: { score, severity, likelihood, impact },
    decision: {
      action,
      wouldAction,
      interrupts: policy.mode === 'enforce' && ['flag', 'require-authorization', 'reject'].includes(action),
      reason: mandatory?.ruleId ?? (active.length ? `profile threshold selected '${wouldAction}'` : 'no active findings'),
      matchedMandatoryRule: mandatory?.ruleId,
    },
  };
}

export function formatThreatAssessment(report) {
  const active = report.findings.filter(finding => !finding.suppressed);
  const suppressed = report.findings.filter(finding => finding.suppressed);
  const lines = [
    `Threat-assessment policy: **${report.profile}** / **${report.mode}**`,
    `Decision: **${report.decision.action}** (severity ${report.risk.severity}; would ${report.decision.wouldAction})`,
    '',
    `Policy: schema ${report.policyVersion}, profile ${report.profileVersion}, engine ${report.engineVersion}, hash \`${report.policyHash.slice(0, 12)}\``,
    `Surface: \`${report.surface}\`; source: \`${report.policyProvenance.source}\``,
  ];
  if (active.length) {
    lines.push('', '**Active findings:**');
    for (const finding of active) {
      lines.push(`- \`${finding.ruleId}\` (${finding.severity}; ${finding.context}): ${finding.evidence}`);
    }
  }
  if (suppressed.length) {
    lines.push('', '**Contextual findings (non-blocking):**');
    for (const finding of suppressed) {
      lines.push(`- \`${finding.ruleId}\` (${finding.context}): ${finding.evidence}`);
    }
  }
  lines.push('', '_AIWG policy selection does not disable or replace independent provider, platform, authorization, secret-scanning, or repository-action safeguards._');
  return lines.join('\n');
}
