#!/usr/bin/env node

/**
 * Agent Responsibility Linter
 *
 * Validates agent definitions against the 10 Golden Rules from the Agent Design Bible.
 *
 * Research Foundation:
 * - REF-001: Bandara et al. (2024) - Production-grade best practices
 * - REF-002: Roig (2025) - Failure archetype prevention
 *
 * Usage:
 *   node tools/linters/agent-linter.mjs [options] [paths...]
 *
 *   aiwg lint agents [--fix] [--json] [paths...]
 *
 * Options:
 *   --fix       Attempt to auto-fix simple issues
 *   --json      Output results as JSON
 *   --strict    Treat warnings as errors
 *   --verbose   Show detailed findings
 *   --help      Show help
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, basename, dirname, relative } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Default agent directories to lint
const DEFAULT_PATHS = [
  'agentic/code/frameworks/sdlc-complete/agents',
  'agentic/code/frameworks/media-marketing-kit/agents',
  '.claude/agents'
];

// Rule definitions based on Agent Design Bible
const RULES = {
  'rule-1-single-responsibility': {
    name: 'Single Responsibility',
    severity: 'error',
    description: 'Agent should have ONE clear purpose',
    check: checkSingleResponsibility
  },
  'rule-2-minimal-tools': {
    name: 'Minimal Tools',
    severity: 'warning',
    description: 'Agent should have 0-3 tools',
    check: checkMinimalTools
  },
  'rule-3-explicit-io': {
    name: 'Explicit I/O',
    severity: 'error',
    description: 'Agent should define inputs and outputs',
    check: checkExplicitIO
  },
  'rule-4-grounding': {
    name: 'Grounding Step',
    severity: 'warning',
    description: 'Agent should verify before acting (Archetype 1 prevention)',
    check: checkGrounding
  },
  'rule-5-uncertainty': {
    name: 'Uncertainty Escalation',
    severity: 'warning',
    description: 'Agent should escalate ambiguity (Archetype 2 prevention)',
    check: checkUncertainty
  },
  'rule-6-context-scope': {
    name: 'Context Scoping',
    severity: 'info',
    description: 'Agent should scope relevant context (Archetype 3 prevention)',
    check: checkContextScope
  },
  'rule-7-recovery': {
    name: 'Recovery Protocol',
    severity: 'warning',
    description: 'Agent should define error recovery (Archetype 4 prevention)',
    check: checkRecovery
  },
  'rule-8-model-tier': {
    name: 'Appropriate Model Tier',
    severity: 'info',
    description: 'Model tier should match task complexity',
    check: checkModelTier
  },
  'rule-9-parallel-ready': {
    name: 'Parallel Ready',
    severity: 'info',
    description: 'Agent should be designed for concurrent execution',
    check: checkParallelReady
  },
  'rule-10-observable': {
    name: 'Observable Execution',
    severity: 'info',
    description: 'Agent should produce traceable output',
    check: checkObservable
  }
};

// Frontmatter parser
function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return { frontmatter: {}, body: content };

  const frontmatterText = match[1];
  const frontmatter = {};
  const body = content.slice(match[0].length).trim();

  for (const line of frontmatterText.split('\n')) {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim();
      const value = line.slice(colonIndex + 1).trim();
      frontmatter[key] = value;
    }
  }

  return { frontmatter, body };
}

// Rule checker functions

function checkSingleResponsibility(frontmatter, body, filepath) {
  const findings = [];
  const description = frontmatter.description || '';

  // Check for multiple responsibilities (multiple "and" conjunctions)
  const andCount = (description.match(/\band\b/gi) || []).length;
  if (andCount > 1) {
    findings.push({
      message: `Description contains ${andCount} "and" conjunctions - may indicate multiple responsibilities`,
      line: 1,
      suggestion: 'Consider splitting into focused agents with single purposes'
    });
  }

  // Check for vague descriptions
  const vagueTerms = ['helps', 'assists', 'various', 'multiple', 'different'];
  for (const term of vagueTerms) {
    if (description.toLowerCase().includes(term)) {
      findings.push({
        message: `Description uses vague term "${term}" - be more specific`,
        line: 1,
        suggestion: 'Replace with precise action verbs (validates, generates, reviews, etc.)'
      });
    }
  }

  // Check description length
  if (description.length > 150) {
    findings.push({
      message: 'Description is too long - may indicate multiple responsibilities',
      line: 1,
      suggestion: 'Keep description under 150 characters with single clear purpose'
    });
  }

  return findings;
}

function checkMinimalTools(frontmatter, body, filepath) {
  const findings = [];
  const tools = frontmatter.tools || '';
  const toolList = tools.split(',').map(t => t.trim()).filter(t => t);

  if (toolList.length > 5) {
    findings.push({
      message: `Agent has ${toolList.length} tools - exceeds recommended maximum of 3`,
      line: 1,
      severity: 'error',
      suggestion: 'Reduce to 0-3 focused tools; consider splitting agent if more needed'
    });
  } else if (toolList.length > 3) {
    findings.push({
      message: `Agent has ${toolList.length} tools - consider reducing to 3 or fewer`,
      line: 1,
      suggestion: 'Each tool increases decision space; fewer tools = more predictable behavior'
    });
  }

  return findings;
}

function checkExplicitIO(frontmatter, body, filepath) {
  const findings = [];
  const lowerBody = body.toLowerCase();

  // Check for input definition
  const hasInputs = lowerBody.includes('## inputs') ||
                    lowerBody.includes('### inputs') ||
                    lowerBody.includes('**inputs**') ||
                    lowerBody.includes('- **required**');

  if (!hasInputs) {
    findings.push({
      message: 'Missing explicit input definition',
      suggestion: 'Add "## Inputs" section with Required/Optional/Context subsections'
    });
  }

  // Check for output definition
  const hasOutputs = lowerBody.includes('## outputs') ||
                     lowerBody.includes('### outputs') ||
                     lowerBody.includes('**outputs**') ||
                     lowerBody.includes('## output format') ||
                     lowerBody.includes('### output format');

  if (!hasOutputs) {
    findings.push({
      message: 'Missing explicit output definition',
      suggestion: 'Add "## Outputs" section with Primary/Format subsections'
    });
  }

  return findings;
}

function checkGrounding(frontmatter, body, filepath) {
  const findings = [];
  const lowerBody = body.toLowerCase();

  // Keywords indicating grounding behavior
  const groundingKeywords = [
    'verify', 'confirm', 'check', 'inspect', 'validate',
    'read first', 'before action', 'grounding', 'ground'
  ];

  const hasGrounding = groundingKeywords.some(kw => lowerBody.includes(kw));

  if (!hasGrounding) {
    findings.push({
      message: 'No grounding/verification step detected (Archetype 1 risk)',
      suggestion: 'Add step to verify assumptions before modifying external state'
    });
  }

  return findings;
}

function checkUncertainty(frontmatter, body, filepath) {
  const findings = [];
  const lowerBody = body.toLowerCase();

  // Keywords indicating uncertainty handling
  const uncertaintyKeywords = [
    'uncertainty', 'ambiguous', 'unclear', 'escalate',
    'clarification', 'ask', 'confirm with', 'if unsure'
  ];

  const hasUncertainty = uncertaintyKeywords.some(kw => lowerBody.includes(kw));

  if (!hasUncertainty) {
    findings.push({
      message: 'No uncertainty escalation defined (Archetype 2 risk)',
      suggestion: 'Add section on how to handle ambiguous or missing information'
    });
  }

  return findings;
}

function checkContextScope(frontmatter, body, filepath) {
  const findings = [];
  const lowerBody = body.toLowerCase();

  // Keywords indicating context scoping
  const scopeKeywords = [
    'relevant', 'scope', 'focus on', 'ignore', 'distractor',
    'peripheral', 'filter', 'classify'
  ];

  const hasScoping = scopeKeywords.some(kw => lowerBody.includes(kw));

  if (!hasScoping) {
    findings.push({
      message: 'No context scoping guidance (Archetype 3 risk)',
      suggestion: 'Add guidance on identifying relevant vs. irrelevant context'
    });
  }

  return findings;
}

function checkRecovery(frontmatter, body, filepath) {
  const findings = [];
  const lowerBody = body.toLowerCase();

  // Keywords indicating recovery handling
  const recoveryKeywords = [
    'error', 'recovery', 'retry', 'fail', 'exception',
    'fallback', 'escalate', 'if fails', 'when error'
  ];

  const hasRecovery = recoveryKeywords.some(kw => lowerBody.includes(kw));

  if (!hasRecovery) {
    findings.push({
      message: 'No error recovery protocol defined (Archetype 4 risk)',
      suggestion: 'Add error handling section with PAUSE-DIAGNOSE-ADAPT-RETRY-ESCALATE protocol'
    });
  }

  return findings;
}

function checkModelTier(frontmatter, body, filepath) {
  const findings = [];
  const model = (frontmatter.model || '').toLowerCase();
  const description = (frontmatter.description || '').toLowerCase();
  const tools = (frontmatter.tools || '').toLowerCase();

  if (!model) {
    findings.push({
      message: 'No model tier specified',
      suggestion: 'Add model: haiku|sonnet|opus based on task complexity'
    });
    return findings;
  }

  // Heuristics for model appropriateness
  const complexTerms = ['architecture', 'design', 'security', 'threat', 'strategy', 'complex'];
  const simpleTerms = ['validate', 'format', 'check', 'simple', 'utility'];

  const isComplex = complexTerms.some(t => description.includes(t));
  const isSimple = simpleTerms.some(t => description.includes(t));

  if (model === 'opus' && isSimple && !isComplex) {
    findings.push({
      message: 'Using opus for potentially simple task',
      suggestion: 'Consider haiku or sonnet for validation/formatting tasks'
    });
  }

  if (model === 'haiku' && isComplex) {
    findings.push({
      message: 'Using haiku for potentially complex task',
      suggestion: 'Consider sonnet or opus for architecture/security analysis'
    });
  }

  // Check if Task tool used (orchestrator) should be opus
  if (tools.includes('task') && model !== 'opus') {
    findings.push({
      message: 'Orchestrator agents (using Task tool) typically need opus tier',
      suggestion: 'Consider model: opus for multi-agent coordination'
    });
  }

  return findings;
}

function checkParallelReady(frontmatter, body, filepath) {
  const findings = [];
  const lowerBody = body.toLowerCase();

  // Check for parallel execution notes
  const parallelKeywords = [
    'parallel', 'concurrent', 'independent', 'simultaneously',
    'alongside', 'can run with'
  ];

  const hasParallelNotes = parallelKeywords.some(kw => lowerBody.includes(kw));

  // This is informational - not having it isn't necessarily bad
  if (!hasParallelNotes) {
    findings.push({
      message: 'No parallel execution guidance',
      suggestion: 'Consider adding notes on whether this agent can run concurrently with others'
    });
  }

  return findings;
}

function checkObservable(frontmatter, body, filepath) {
  const findings = [];
  const lowerBody = body.toLowerCase();

  // Keywords indicating observability
  const observableKeywords = [
    'trace', 'log', 'output', 'report', 'summary',
    'timestamp', 'duration', 'metrics'
  ];

  const hasObservability = observableKeywords.some(kw => lowerBody.includes(kw));

  if (!hasObservability) {
    findings.push({
      message: 'No observability/trace output defined',
      suggestion: 'Add guidance on what the agent should log for debugging'
    });
  }

  return findings;
}

// File discovery
function findAgentFiles(paths, cwd) {
  const files = [];

  for (const p of paths) {
    const fullPath = p.startsWith('/') ? p : join(cwd, p);

    try {
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        const entries = readdirSync(fullPath);
        for (const entry of entries) {
          if (entry.endsWith('.md') && !entry.toLowerCase().includes('readme')) {
            files.push(join(fullPath, entry));
          }
        }
      } else if (stat.isFile() && fullPath.endsWith('.md')) {
        files.push(fullPath);
      }
    } catch (e) {
      // Path doesn't exist, skip
    }
  }

  return files;
}

// Main linting function
function lintAgent(filepath) {
  const content = readFileSync(filepath, 'utf-8');
  const { frontmatter, body } = parseFrontmatter(content);

  const results = {
    file: filepath,
    name: frontmatter.name || basename(filepath, '.md'),
    findings: [],
    passed: 0,
    failed: 0,
    warnings: 0,
    info: 0
  };

  for (const [ruleId, rule] of Object.entries(RULES)) {
    const ruleFindings = rule.check(frontmatter, body, filepath);

    if (ruleFindings.length === 0) {
      results.passed++;
    } else {
      for (const finding of ruleFindings) {
        const severity = finding.severity || rule.severity;
        results.findings.push({
          rule: ruleId,
          ruleName: rule.name,
          severity,
          ...finding
        });

        if (severity === 'error') results.failed++;
        else if (severity === 'warning') results.warnings++;
        else results.info++;
      }
    }
  }

  return results;
}

// Output formatting
function formatResults(results, options = {}) {
  if (options.json) {
    return JSON.stringify(results, null, 2);
  }

  let output = '';
  let totalPassed = 0;
  let totalFailed = 0;
  let totalWarnings = 0;

  for (const result of results) {
    const relativePath = relative(process.cwd(), result.file);
    output += `\n${relativePath} (${result.name})\n`;

    if (result.findings.length === 0) {
      output += `  ✓ All ${result.passed} rules passed\n`;
    } else {
      for (const finding of result.findings) {
        const icon = finding.severity === 'error' ? '✗' :
                     finding.severity === 'warning' ? '⚠' : 'ℹ';
        output += `  ${icon} [${finding.ruleName}] ${finding.message}\n`;
        if (options.verbose && finding.suggestion) {
          output += `    → ${finding.suggestion}\n`;
        }
      }
    }

    totalPassed += result.passed;
    totalFailed += result.failed;
    totalWarnings += result.warnings;
  }

  output += `\n${'─'.repeat(60)}\n`;
  output += `Summary: ${results.length} agents, ${totalPassed} passed, `;
  output += `${totalFailed} errors, ${totalWarnings} warnings\n`;

  if (totalFailed > 0) {
    output += `\nFailed. Fix errors to pass lint check.\n`;
  } else if (totalWarnings > 0) {
    output += `\nPassed with warnings. Consider addressing them.\n`;
  } else {
    output += `\nAll checks passed!\n`;
  }

  return output;
}

// CLI
function main() {
  const args = process.argv.slice(2);
  const options = {
    json: args.includes('--json'),
    strict: args.includes('--strict'),
    verbose: args.includes('--verbose'),
    fix: args.includes('--fix'),
    help: args.includes('--help') || args.includes('-h')
  };

  if (options.help) {
    console.log(`
Agent Responsibility Linter

Validates agent definitions against the 10 Golden Rules from the Agent Design Bible.

Usage:
  node tools/linters/agent-linter.mjs [options] [paths...]

Options:
  --json      Output results as JSON
  --strict    Treat warnings as errors
  --verbose   Show suggestions for each finding
  --fix       Attempt auto-fixes (not yet implemented)
  --help      Show this help

Paths:
  Specify directories or files to lint. Defaults to:
    - agentic/code/frameworks/sdlc-complete/agents
    - agentic/code/frameworks/media-marketing-kit/agents
    - .claude/agents

Rules:
  1. Single Responsibility - One clear purpose
  2. Minimal Tools - 0-3 tools recommended
  3. Explicit I/O - Define inputs and outputs
  4. Grounding - Verify before acting (Archetype 1)
  5. Uncertainty - Escalate ambiguity (Archetype 2)
  6. Context Scope - Filter distractors (Archetype 3)
  7. Recovery - Handle errors (Archetype 4)
  8. Model Tier - Match complexity
  9. Parallel Ready - Design for concurrency
  10. Observable - Traceable execution

Research Foundation:
  - REF-001: Bandara et al. (2024) Production-Grade Agentic AI Workflows
  - REF-002: Roig (2025) How Do LLMs Fail In Agentic Scenarios?
`);
    process.exit(0);
  }

  // Filter out options from paths
  const paths = args.filter(a => !a.startsWith('--'));
  const targetPaths = paths.length > 0 ? paths : DEFAULT_PATHS;

  const cwd = process.cwd();
  const files = findAgentFiles(targetPaths, cwd);

  if (files.length === 0) {
    console.log('No agent files found to lint.');
    process.exit(0);
  }

  const results = files.map(f => lintAgent(f));
  console.log(formatResults(results, options));

  // Exit code
  const hasErrors = results.some(r => r.failed > 0);
  const hasWarnings = results.some(r => r.warnings > 0);

  if (hasErrors || (options.strict && hasWarnings)) {
    process.exit(1);
  }

  process.exit(0);
}

main();
