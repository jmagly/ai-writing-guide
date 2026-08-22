import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateFlowGraph } from './validator.mjs';

const addonRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROFILE_FILES = {
  'strict-lcm': 'polyrhythmic-strict-lcm.json',
  adaptive: 'polyrhythmic-adaptive.json',
};
const SAFE_DOMAINS = new Set([
  'technical-troubleshooting',
  'conceptual-explanation',
  'practical-planning',
  'theoretical-comparison',
]);
const USER_STATES = new Set(['unknown', 'stated-novice', 'stated-practitioner']);
const HIGH_RISK = /\b(medical|healthcare|diagnos(?:e|is)|treatment|investment|financial advice|trading|credit|loan|insurance)\b/i;
const READ_TOOL_REF = 'aiwg:tool:3333333333333333';

function clone(value) {
  return structuredClone(value);
}

function loadProfile(profile) {
  const file = PROFILE_FILES[profile];
  if (!file) throw new Error(`Unknown polyrhythmic profile '${profile}'.`);
  return JSON.parse(fs.readFileSync(path.join(addonRoot, 'fixtures', file), 'utf8'));
}

function safeName(value) {
  const name = String(value ?? 'scenario').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '');
  return (`poly-${name || 'scenario'}`).slice(0, 63).replace(/-$/, '');
}

function input(node, name, value) {
  const binding = node.inputs.find((item) => item.name === name);
  if (binding) binding.value = clone(value);
}

export function validatePolyrhythmicScenario(scenario) {
  const diagnostics = [];
  if (!scenario || typeof scenario !== 'object') diagnostics.push({ code: 'SCENARIO_REQUIRED', message: 'Scenario must be an object.' });
  if (!SAFE_DOMAINS.has(scenario?.domain)) diagnostics.push({ code: 'UNSAFE_DOMAIN', message: `Domain '${scenario?.domain ?? ''}' is not an approved general pattern domain.` });
  if (!PROFILE_FILES[scenario?.profile]) diagnostics.push({ code: 'UNKNOWN_PROFILE', message: 'Profile must be strict-lcm or adaptive.' });
  if (!['agent-only', 'agent-plus-read-only-tool'].includes(scenario?.composition)) diagnostics.push({ code: 'UNKNOWN_COMPOSITION', message: 'Composition must be agent-only or agent-plus-read-only-tool.' });
  if (typeof scenario?.question !== 'string' || !scenario.question.trim()) diagnostics.push({ code: 'QUESTION_REQUIRED', message: 'A non-empty question is required.' });
  if (HIGH_RISK.test(`${scenario?.domain ?? ''} ${scenario?.question ?? ''}`) || scenario?.risk === 'high') {
    diagnostics.push({ code: 'HIGH_RISK_TEMPLATE_DENIED', message: 'Healthcare, finance, and other high-risk advice are not general polyrhythmic templates.' });
  }
  if (scenario?.statedUserState && !USER_STATES.has(scenario.statedUserState)) diagnostics.push({ code: 'INVALID_USER_STATE', message: 'User state must remain unknown or use a supported explicitly stated value.' });
  if (scenario?.claims?.some((claim) => /\b(better|smarter|more accurate|more efficient|improves quality)\b/i.test(claim))) {
    diagnostics.push({ code: 'UNSUPPORTED_PRODUCT_CLAIM', message: 'Pattern examples cannot assert quality or efficiency without benchmark evidence.' });
  }
  return { valid: diagnostics.length === 0, diagnostics };
}

export function buildPolyrhythmicGraph(scenario) {
  const checked = validatePolyrhythmicScenario(scenario);
  if (!checked.valid) {
    const error = new Error(checked.diagnostics.map((item) => `${item.code}: ${item.message}`).join('; '));
    error.code = checked.diagnostics[0].code;
    error.diagnostics = checked.diagnostics;
    throw error;
  }
  const graph = loadProfile(scenario.profile);
  graph.metadata.name = safeName(scenario.id);
  graph.metadata.labels['composition.aiwg.io/domain'] = scenario.domain;
  graph.metadata.annotations = {
    'composition.aiwg.io/user-state-source': scenario.classificationEvidence?.some((item) => item.source === 'user-stated') ? 'user-stated' : 'unknown',
  };
  const problem = graph.spec.nodes.find((node) => node.id === 'problem-mode');
  const user = graph.spec.nodes.find((node) => node.id === 'user-mode');
  input(problem, 'question', scenario.question);
  input(problem, 'evidence', scenario.evidence ?? []);
  input(user, 'question', scenario.question);
  input(user, 'classification-evidence', scenario.classificationEvidence ?? []);
  const stated = scenario.classificationEvidence?.some((item) => item.source === 'user-stated')
    ? scenario.statedUserState ?? 'unknown'
    : 'unknown';
  input(user, 'stated-user-state', stated);

  if (scenario.composition === 'agent-plus-read-only-tool') {
    problem.kind = 'tool';
    problem.ref = READ_TOOL_REF;
    problem.description = 'Read supplied evidence without mutation, then emit the typed problem-mode beat contract.';
    problem.capabilities = ['read-evidence'];
    problem.permissions = ['filesystem:read'];
    graph.spec.permissions = ['filesystem:read'];
    graph.spec.capabilities = [{ id: 'read-evidence', permissions: ['filesystem:read'], sideEffectMode: 'none' }];
    graph.spec.candidates.push({ id: READ_TOOL_REF, kind: 'tool' });
  }
  const validation = validateFlowGraph(graph);
  if (!validation.valid) throw new Error(`Generated pattern is invalid: ${JSON.stringify(validation.diagnostics)}`);
  return graph;
}

export function synthesizePolyrhythmicResult({ problemEvidence, userEvidence, userState }) {
  const problem = problemEvidence.at(-1) ?? {};
  const user = userEvidence.at(-1) ?? {};
  const conflict = Boolean(problem.conclusion && user.conclusion && problem.conclusion !== user.conclusion);
  return {
    answer: conflict
      ? 'The tracks conflict; preserve both findings and request a decision or more evidence.'
      : problem.answer ?? user.answer ?? 'The available evidence supports a bounded response.',
    decisionSummary: conflict ? 'conflicting-track-results' : 'tracks-compatible',
    evidenceSummary: {
      problemBeats: problemEvidence.length,
      userBeats: userEvidence.length,
      conflict,
    },
    userState: USER_STATES.has(userState) ? userState : 'unknown',
  };
}

/** Deterministic adapter used by conformance examples, not a quality benchmark. */
export function createPolyrhythmicConformanceAdapter(options = {}) {
  const convergeAt = options.convergeAt ?? 2;
  return {
    id: 'polyrhythmic-conformance',
    async invokeNode(request) {
      const { node, iteration, inputs, activation } = request;
      if (options.failBeat && options.failBeat.nodeId === node.id && options.failBeat.iteration === iteration) {
        const error = new Error('injected beat failure');
        error.code = 'INJECTED_BEAT_FAILURE';
        throw error;
      }
      const confidence = iteration >= convergeAt ? 0.9 : 0.4;
      if (node.id === 'problem-mode') {
        return {
          outputs: {
            'beat-evidence': [{ track: 'problem-mode', phase: node.phase, activation, iteration, status: 'executed', evidence: inputs.evidence, conclusion: options.problemConclusion ?? 'compatible' }],
            confidence,
          },
          usage: { tokens: 20, costUsd: options.costPerBeat ?? 0.01, timeMs: 5 },
        };
      }
      if (node.id === 'user-mode') {
        return {
          outputs: {
            'beat-evidence': [{ track: 'user-mode', phase: node.phase, activation, iteration, status: 'executed', evidence: inputs['classification-evidence'], conclusion: options.userConclusion ?? 'compatible' }],
            classification: USER_STATES.has(inputs['stated-user-state']) ? inputs['stated-user-state'] : 'unknown',
            confidence,
          },
          usage: { tokens: 20, costUsd: options.costPerBeat ?? 0.01, timeMs: 5 },
        };
      }
      return {
        outputs: {
          result: synthesizePolyrhythmicResult({
            problemEvidence: inputs['problem-evidence'],
            userEvidence: inputs['user-evidence'],
            userState: inputs['user-state'],
          }),
        },
        usage: { tokens: 10, costUsd: 0.005, timeMs: 3 },
      };
    },
    async parallelDispatch(requests, invokeNode) {
      return Promise.all(requests.map((request) => invokeNode(request)));
    },
  };
}

export const polyrhythmicProfiles = Object.freeze(Object.keys(PROFILE_FILES));
export const polyrhythmicSafeDomains = Object.freeze([...SAFE_DOMAINS]);
