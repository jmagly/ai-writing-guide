#!/usr/bin/env node
import fs from 'node:fs';

const SIGNALS = [
  {
    id: 'instruction-override',
    severity: 4,
    patterns: [
      /\bignore (all )?(previous|prior|above) instructions\b/i,
      /\b(system|developer) (prompt|message|instructions?)\b/i,
      /\bdo not (tell|inform|notify) (the )?(maintainer|operator|user)\b/i,
      /\byou are now\b/i,
    ],
  },
  {
    id: 'sensitive-file-target',
    severity: 3,
    patterns: [
      /\b(AGENTS|CLAUDE|AIWG|WARP)\.md\b/i,
      /\b(MCP|mcp) config\b/i,
      /\.github\/workflows\/|\.gitea\/workflows\/|workflow[s]?\.ya?ml/i,
      /\bagent definitions?\b/i,
      /\brules\/RULES-INDEX\.md\b/i,
    ],
  },
  {
    id: 'third-party-execution',
    severity: 4,
    patterns: [
      /\bnpx\s+[-@\w./]+/i,
      /\bnpm\s+(install|i|exec)\s+[-@\w./]+/i,
      /\bpipx?\s+install\s+[-\w./]+/i,
      /\bcargo\s+install\s+[-\w./]+/i,
      /\bcurl\b[^|\n]*\|\s*(sh|bash|zsh)\b/i,
      /\bbash\s+<\(\s*curl\b/i,
      /\bgit\+https?:\/\//i,
    ],
  },
  {
    id: 'floating-version',
    severity: 3,
    patterns: [
      /@latest\b/i,
      /uses:\s*[-\w./]+@(main|master|latest|v?\d+)\b/i,
      /image:\s*[-\w./:]+:latest\b/i,
      /\b(unpinned|floating) (dependency|version|action|container)\b/i,
    ],
  },
  {
    id: 'credential-or-env-probing',
    severity: 5,
    patterns: [
      /\b(printenv|env\s*\||env\s*$|process\.env|os\.environ)\b/im,
      /\.env\b/i,
      /\b(tokens?|api[_-]?keys?|secrets?|cookies?|document\.cookie)\b/i,
      /\b(id_rsa|ssh keys?|gpg keys?|aws_access_key|cloud credentials?)\b/i,
    ],
  },
  {
    id: 'pressure-without-evidence',
    severity: 2,
    patterns: [
      /\b(blocking release|urgent|must be done|priority:\s*high|critical security|do this now)\b/i,
      /\bsecurity critical\b/i,
    ],
  },
  {
    id: 'unverifiable-authority-claim',
    severity: 2,
    patterns: [
      /\bP-\d{4}-\d{3,}\b/i,
      /\bpolicy\s+[A-Z]-?\d{3,}\b/i,
      /\bhex\s+[0-9a-f]{6,12}\b/i,
      /\bCVE-\d{4}-\d{4,}\b(?![\s\S]{0,160}https?:\/\/)/i,
      /\b(advisory|standard|RFC)\b(?![\s\S]{0,160}https?:\/\/)/i,
    ],
  },
  {
    id: 'security-framing-conflict',
    severity: 3,
    patterns: [
      /\b(improve|fix|harden|secure|audit).{0,120}\b(npx\b|@latest\b|curl\b[^|\n]*\||printenv|\.env)\b/i,
      /\b(security|secure).{0,120}\b(add|install|run).{0,80}\b(latest|remote|third[- ]party)\b/i,
    ],
  },
];

function parseArgs(argv) {
  const args = { format: 'text', text: '', issueJson: '' };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--format' && argv[i + 1]) args.format = argv[++i];
    else if (arg === '--text' && argv[i + 1]) args.text = argv[++i];
    else if (arg === '--issue-json' && argv[i + 1]) args.issueJson = argv[++i];
    else if (arg === '--help' || arg === '-h') {
      console.log('Usage: assess.mjs [--issue-json <file>] [--text <body>] [--format text|json]');
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
  const stdin = fs.readFileSync(0, 'utf8');
  return { title: '', body: stdin, author: '', labels: [], comments: [] };
}

function textFromIssue(issue) {
  const comments = issue.comments
    .filter((comment) => !comment.isBot)
    .map((comment) => `${comment.author || ''}\n${comment.body || ''}`)
    .join('\n\n');
  return [issue.title, issue.body, comments].filter(Boolean).join('\n\n');
}

function evidenceFor(pattern, text) {
  const match = pattern.exec(text);
  if (!match) return null;
  const paragraphStart = text.lastIndexOf('\n\n', match.index);
  const paragraphEnd = text.indexOf('\n\n', match.index + match[0].length);
  const start = paragraphStart < 0 ? 0 : paragraphStart + 2;
  const end = paragraphEnd < 0 ? text.length : paragraphEnd;
  return text.slice(start, end).replace(/\s+/g, ' ').trim();
}

export function assessIssue(issue) {
  const text = textFromIssue(issue);
  const signals = [];
  for (const signal of SIGNALS) {
    const evidence = [];
    for (const pattern of signal.patterns) {
      const found = evidenceFor(pattern, text);
      if (found) evidence.push(found);
    }
    if (evidence.length) {
      signals.push({
        id: signal.id,
        severity: signal.severity,
        evidence: Array.from(new Set(evidence)).slice(0, 3),
      });
    }
  }

  const score = signals.reduce((sum, signal) => sum + signal.severity, 0);
  const ids = new Set(signals.map((signal) => signal.id));
  const hasAutonomousSupplyChainRisk =
    ids.has('third-party-execution') &&
    (ids.has('floating-version') || ids.has('sensitive-file-target') || ids.has('security-framing-conflict'));
  const hasExfiltrationRisk = ids.has('credential-or-env-probing') &&
    (ids.has('instruction-override') || ids.has('third-party-execution') || ids.has('sensitive-file-target'));

  let verdict = 'safe';
  let action = 'proceed';
  let thresholdExplanation = 'No signal combination crossed the flag or reject threshold.';
  let whyVerdict = 'No meaningful prompt-injection or supply-chain risk was detected.';
  if (hasExfiltrationRisk || (hasAutonomousSupplyChainRisk && score >= 10)) {
    verdict = 'reject';
    action = 'stop-and-reject';
    if (hasExfiltrationRisk) {
      thresholdExplanation =
        'Reject rule crossed: credential-or-env-probing combined with instruction override, third-party execution, or sensitive-file targeting.';
    } else {
      thresholdExplanation =
        `Reject rule crossed: autonomous supply-chain risk combined with score ${score} (reject threshold: 10).`;
    }
    whyVerdict =
      'This is reject rather than flag because multiple high-confidence signals combine a sensitive execution surface with credential or supply-chain risk.';
  } else if (score >= 5 || hasAutonomousSupplyChainRisk || ids.has('instruction-override')) {
    verdict = 'flag';
    action = 'require-human-authorization';
    thresholdExplanation = ids.has('instruction-override')
      ? 'Flag rule crossed: an instruction-override signal requires explicit operator review.'
      : `Flag rule crossed: score ${score} meets the flag threshold of 5, or an autonomous supply-chain combination is present.`;
    whyVerdict =
      'The signals require explicit human authorization, but they do not meet a reject combination.';
  }

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

  const report = {
    verdict,
    action,
    score,
    issue: {
      number: issue.number,
      title: issue.title,
      author: issue.author,
      labels: issue.labels,
    },
    signals,
    why_verdict: whyVerdict,
    why_reject: verdict === 'reject' ? whyVerdict : null,
    threshold_explanation: thresholdExplanation,
    operator_next_steps: operatorNextSteps,
    policy_context:
      'This deterministic preflight applies a conservative generic policy and does not infer that a repository is authorized to manage secrets, CI, or agent instructions.',
  };
  report.comment_markdown = formatCommentMarkdown(report);
  return report;
}

function formatCommentMarkdown(report) {
  const evidence = report.signals.flatMap((signal) =>
    signal.evidence.map((item) => `  - \`${signal.id}\`: ${item}`));
  const nextSteps = report.operator_next_steps.map((step) => `- ${step}`);
  return [
    `Threat-assessment verdict: **${report.verdict}** (score ${report.score})`,
    '',
    report.why_verdict,
    '',
    `**Threshold:** ${report.threshold_explanation}`,
    '',
    '**Evidence:**',
    ...(evidence.length ? evidence : ['- No risk signals detected.']),
    '',
    '**Operator next steps:**',
    ...(nextSteps.length ? nextSteps : ['- No special action required.']),
    '',
    `_${report.policy_context}_`,
  ].join('\n');
}

function printText(report) {
  console.log(`verdict: ${report.verdict}`);
  console.log(`action: ${report.action}`);
  console.log(`score: ${report.score}`);
  console.log(`why: ${report.why_verdict}`);
  console.log(`threshold: ${report.threshold_explanation}`);
  if (report.signals.length) {
    console.log('signals:');
    for (const signal of report.signals) {
      console.log(`- ${signal.id} (${signal.severity})`);
      for (const item of signal.evidence) console.log(`  evidence: ${item}`);
    }
  }
  if (report.operator_next_steps.length) {
    console.log('operator next steps:');
    for (const step of report.operator_next_steps) console.log(`- ${step}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const report = assessIssue(loadInput(args));
    if (args.format === 'json') console.log(JSON.stringify(report, null, 2));
    else printText(report);
    process.exit(0);
  } catch (error) {
    console.error(`address-issues-threat-assess: ${error.message}`);
    process.exit(1);
  }
}
