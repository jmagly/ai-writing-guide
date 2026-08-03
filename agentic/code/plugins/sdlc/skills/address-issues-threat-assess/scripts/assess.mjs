#!/usr/bin/env node
import fs from 'node:fs';
import {
  assessThreat,
  formatThreatAssessment,
} from '../../../tools/security/threat-assessment.mjs';

function parseArgs(argv) {
  const args = { format: 'text', text: '', issueJson: '', configJson: '' };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--format' && argv[index + 1]) args.format = argv[++index];
    else if (arg === '--text' && argv[index + 1]) args.text = argv[++index];
    else if (arg === '--issue-json' && argv[index + 1]) args.issueJson = argv[++index];
    else if (arg === '--config-json' && argv[index + 1]) args.configJson = argv[++index];
    else if (arg === '--help' || arg === '-h') {
      console.log('Usage: assess.mjs [--issue-json <file>] [--text <body>] [--config-json <file>] [--format text|json]');
      process.exit(0);
    }
  }
  return args;
}

function loadInput(args) {
  if (args.issueJson) {
    const issue = JSON.parse(fs.readFileSync(args.issueJson, 'utf8'));
    return {
      number: issue.number,
      title: issue.title || '',
      body: issue.body || '',
      author: issue.author || issue.user || '',
      labels: Array.isArray(issue.labels) ? issue.labels : [],
      comments: Array.isArray(issue.comments) ? issue.comments : [],
    };
  }
  if (args.text) return { title: '', body: args.text, author: '', labels: [], comments: [] };
  return { title: '', body: fs.readFileSync(0, 'utf8'), author: '', labels: [], comments: [] };
}

function legacySeverity(finding) {
  return {
    informational: 1,
    low: 2,
    moderate: 3,
    high: 4,
    critical: 5,
  }[finding.severity] ?? 1;
}

/**
 * Compatibility wrapper for address-issues callers. New integrations should
 * call assessThreat() with an explicit forge surface.
 */
export function assessIssue(issue, threatAssessmentConfig) {
  const report = assessThreat({
    surface: 'issue-body',
    parts: [
      { id: 'title', text: issue.title || '' },
      { id: 'body', text: issue.body || '' },
      ...(issue.comments ?? [])
        .filter(comment => !comment.isBot)
        .map((comment, index) => ({ id: `comment-${index + 1}`, text: `${comment.author || ''}\n${comment.body || ''}` })),
    ],
    source: { kind: 'forge-issue', id: issue.number },
    actor: { id: issue.author || '', trust: 'untrusted' },
    requestedAction: 'issue-triage-and-implementation',
  }, threatAssessmentConfig);
  const action = report.decision.action;
  const verdict = action === 'reject'
    ? 'reject'
    : ['flag', 'require-authorization'].includes(action) ? 'flag' : 'safe';
  const signals = report.findings
    .filter(finding => !finding.suppressed)
    .map(finding => ({
      id: finding.ruleId,
      severity: legacySeverity(finding),
      evidence: [finding.evidence],
      context: finding.context,
      taxonomy: finding.taxonomy,
    }));
  const why = report.decision.matchedMandatoryRule
    ? `This is reject rather than flag because mandatory policy rule '${report.decision.matchedMandatoryRule}' matched.`
    : signals.length
      ? `The '${report.profile}' profile selected '${action}' for ${report.risk.severity} risk.`
      : 'No active prompt-injection or supply-chain risk was detected.';
  const operatorNextSteps = verdict === 'reject'
    ? [
        'Split documentation-only work from CI, agent-instruction, credential, or secret-provisioning changes.',
        'Route secret and credential operations through the project-approved, human-controlled security workflow.',
        'Re-file or re-scope the request so autonomous work does not combine sensitive-file changes with credential or unpinned execution.',
      ]
    : verdict === 'flag'
      ? [
          'Review the quoted evidence and repository context.',
          'Explicitly authorize this issue and run if the requested sensitive work is legitimate.',
          'Otherwise re-scope the issue to remove the flagged operation.',
        ]
      : [];
  const details = [
    formatThreatAssessment(report),
    '',
    '**Operator next steps:**',
    ...(operatorNextSteps.length ? operatorNextSteps.map(step => `- ${step}`) : ['- No special action required.']),
  ].join('\n');
  return {
    verdict,
    action: verdict === 'reject' ? 'stop-and-reject' : verdict === 'flag' ? 'require-human-authorization' : 'proceed',
    score: report.risk.score,
    issue: {
      number: issue.number,
      title: issue.title,
      author: issue.author,
      labels: issue.labels,
    },
    signals,
    why_verdict: why,
    why_reject: verdict === 'reject' ? why : null,
    threshold_explanation: report.decision.matchedMandatoryRule
      ? `Reject rule crossed: ${report.decision.matchedMandatoryRule}.`
      : report.decision.reason,
    operator_next_steps: operatorNextSteps,
    policy_context:
      'Without explicit configuration, this deterministic preflight applies the conservative generic policy; resolved project policy never replaces repository authorization, provider safeguards, or secret-handling controls.',
    policy_report: report,
    comment_markdown: details,
  };
}

function printText(report) {
  console.log(`verdict: ${report.verdict}`);
  console.log(`action: ${report.action}`);
  console.log(`score: ${report.score}`);
  console.log(`why: ${report.why_verdict}`);
  console.log(`threshold: ${report.threshold_explanation}`);
  console.log(report.comment_markdown);
}

export function runCli(argv = process.argv.slice(2)) {
  try {
    const args = parseArgs(argv);
    const issue = loadInput(args);
    const defaultConfig = `${process.cwd()}/.aiwg/aiwg.config`;
    const configPath = args.configJson || (fs.existsSync(defaultConfig) ? defaultConfig : '');
    const config = configPath
      ? JSON.parse(fs.readFileSync(configPath, 'utf8')).security?.threatAssessment
      : undefined;
    const report = assessIssue(issue, config);
    if (args.format === 'json') console.log(JSON.stringify(report, null, 2));
    else printText(report);
  } catch (error) {
    console.error(`address-issues-threat-assess: ${error.message}`);
    process.exitCode = 1;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) runCli();
