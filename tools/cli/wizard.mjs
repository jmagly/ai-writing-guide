#!/usr/bin/env node
/**
 * MVP guided onboarding command.
 *
 * The wizard is deliberately conservative: by default it prints a guided
 * provider/project/framework/deploy/verify plan and does not write files.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const PROJECT_SIGNALS = [
  '.git',
  'package.json',
  'pyproject.toml',
  'Cargo.toml',
  'go.mod',
  'pom.xml',
  'Gemfile',
  'build.gradle',
];

const MAX_PARENT_DEPTH = 3;

const VALID_PROVIDERS = [
  'claude',
  'codex',
  'copilot',
  'cursor',
  'factory',
  'opencode',
  'openclaw',
  'warp',
  'windsurf',
  'generic',
];

const VALID_FRAMEWORKS = [
  'sdlc',
  'research',
  'marketing',
  'forensics',
  'ops',
  'security-engineering',
  'knowledge-base',
  'media-curator',
  'writing',
  'general',
];

const INTENT_CLUSTERS = [
  { match: /start|idea|build|project|requirements|intake/i, framework: 'sdlc', discover: 'intake wizard' },
  { match: /research|paper|citation|grade|literature/i, framework: 'research', discover: 'research workflow' },
  { match: /market|campaign|brand|content|audience/i, framework: 'marketing', discover: 'marketing intake' },
  { match: /incident|forensic|breach|ioc|timeline/i, framework: 'forensics', discover: 'incident timeline' },
  { match: /infra|server|ops|runbook|fleet/i, framework: 'ops', discover: 'ops runbook' },
  { match: /security|threat|crypto|secret|supply chain/i, framework: 'security-engineering', discover: 'security assessment' },
  { match: /remember|knowledge|wiki|memory|corpus/i, framework: 'knowledge-base', discover: 'memory ingest' },
  { match: /write|voice|draft|prose|copy/i, framework: 'writing', discover: 'apply voice profile' },
];

function parseArgs(args) {
  const options = {
    dryRun: false,
    json: false,
    help: false,
    provider: null,
    framework: null,
    goal: '',
    projectRoot: process.cwd(),
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--dry-run' || arg === '-n') {
      options.dryRun = true;
    } else if (arg === '--json') {
      options.json = true;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if ((arg === '--provider' || arg === '-p') && args[i + 1]) {
      options.provider = args[++i];
    } else if ((arg === '--framework' || arg === '-f') && args[i + 1]) {
      options.framework = args[++i];
    } else if ((arg === '--goal' || arg === '-g') && args[i + 1]) {
      options.goal = args[++i];
    } else if (!arg.startsWith('-')) {
      options.projectRoot = path.resolve(arg);
    }
  }

  return options;
}

function displayHelp() {
  console.log(`
AIWG - Onboarding Wizard

USAGE
  aiwg wizard [options] [project-root]

OPTIONS
  --goal <text>       Plain-language goal used to recommend a framework
  --provider <name>   Provider to target (${VALID_PROVIDERS.join(', ')})
  --framework <name>  Framework to deploy (${VALID_FRAMEWORKS.join(', ')})
  --dry-run, -n       Print the guided plan without writing files
  --json             Output the guided plan as JSON
  --help, -h         Show this help message

EXAMPLES
  aiwg wizard --dry-run --goal "help me start a project"
  aiwg wizard --provider codex --framework sdlc --dry-run
`);
}

function hasCsprojFile(dir) {
  try {
    return fs.readdirSync(dir).some((entry) => /\.csproj$/i.test(entry));
  } catch {
    return false;
  }
}

function detectProjectSignal(start) {
  let dir = path.resolve(start);
  for (let depth = 0; depth <= MAX_PARENT_DEPTH; depth++) {
    for (const signal of PROJECT_SIGNALS) {
      if (fs.existsSync(path.join(dir, signal))) {
        return { found: true, signal, foundAt: dir };
      }
    }
    if (hasCsprojFile(dir)) {
      return { found: true, signal: '*.csproj', foundAt: dir };
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return { found: false, signal: null, foundAt: null };
}

function isUnsuitableCwd(cwd, home = os.homedir()) {
  const normalized = stripTrailingSep(path.resolve(cwd));
  return normalized === stripTrailingSep(home) || normalized === '/' || normalized === '/tmp';
}

function stripTrailingSep(value) {
  return value.length > 1 && /[\\/]$/.test(value) ? value.slice(0, -1) : value;
}

function inferProvider() {
  const envProvider = process.env.AIWG_PROVIDER || process.env.CLAUDECODE_PROVIDER;
  if (envProvider && VALID_PROVIDERS.includes(envProvider)) return envProvider;
  if (process.env.CODEX_SANDBOX || process.env.CODEX_HOME) return 'codex';
  return 'generic';
}

function inferFramework(goal) {
  if (!goal) return { framework: 'sdlc', discover: 'intake wizard', reason: 'default beginner path' };
  for (const cluster of INTENT_CLUSTERS) {
    if (cluster.match.test(goal)) {
      return { framework: cluster.framework, discover: cluster.discover, reason: `matched goal phrase: ${cluster.discover}` };
    }
  }
  return { framework: 'sdlc', discover: 'aiwg steward', reason: 'no close match; start with steward/discovery' };
}

function validateSelection(name, value, allowed) {
  if (!value || allowed.includes(value)) return null;
  return {
    severity: 'error',
    message: `Unknown ${name}: ${value}`,
    action: `Choose one of: ${allowed.join(', ')}`,
  };
}

function buildWizardPlan(options) {
  const projectRoot = path.resolve(options.projectRoot);
  const projectSignal = detectProjectSignal(projectRoot);
  const inferred = inferFramework(options.goal);
  const provider = options.provider || inferProvider();
  const framework = options.framework || inferred.framework;
  const warnings = [];
  const providerError = validateSelection('provider', provider, VALID_PROVIDERS);
  const frameworkError = validateSelection('framework', framework, VALID_FRAMEWORKS);

  if (providerError) warnings.push(providerError);
  if (frameworkError) warnings.push(frameworkError);
  if (!projectSignal.found && isUnsuitableCwd(projectRoot)) {
    warnings.push({
      severity: 'warning',
      message: 'No project detected here. AIWG will deploy to the current directory.',
      action: 'Run this from your project root before deploying.',
    });
  }

  const deployCommand = `aiwg use ${framework} --provider ${provider}`;
  const verifyCommand = 'aiwg status --probe --json';
  const dryRun = options.dryRun || true;

  return {
    schema: 'aiwg.wizard.plan.v1',
    dry_run: dryRun,
    writes_files: false,
    project_root: projectRoot,
    goal: options.goal || null,
    recommendation: {
      provider,
      framework,
      reason: options.framework ? 'selected by user' : inferred.reason,
      discover_phrase: inferred.discover,
    },
    project_detection: projectSignal,
    warnings,
    steps: [
      { id: 'provider', status: providerError ? 'error' : 'ready', detail: provider },
      { id: 'project', status: projectSignal.found ? 'ready' : 'needs-review', detail: projectSignal.foundAt || projectRoot },
      { id: 'framework', status: frameworkError ? 'error' : 'ready', detail: framework },
      { id: 'deploy', status: 'pending-user-action', command: deployCommand },
      { id: 'verify', status: 'required', command: verifyCommand },
    ],
    next_actions: [
      `Run: ${deployCommand}`,
      `Then verify: ${verifyCommand}`,
    ],
  };
}

function printPlan(plan) {
  console.log('\nAIWG Onboarding Wizard');
  console.log('='.repeat(60));
  console.log('');
  console.log('Provider:  ' + plan.recommendation.provider);
  console.log('Project:   ' + (plan.project_detection.found ? `${plan.project_detection.foundAt} (${plan.project_detection.signal})` : `${plan.project_root} (no signal found)`));
  console.log('Framework: ' + plan.recommendation.framework);
  console.log('Reason:    ' + plan.recommendation.reason);
  console.log('');

  if (plan.warnings.length > 0) {
    console.log('Warnings:');
    for (const warning of plan.warnings) {
      console.log(`  ${warning.severity}: ${warning.message}`);
      console.log(`    ${warning.action}`);
    }
    console.log('');
  }

  console.log('Guided Steps:');
  for (const step of plan.steps) {
    console.log(`  ${step.id.padEnd(10)} ${step.status}${step.command ? `  ${step.command}` : `  ${step.detail}`}`);
  }
  console.log('');
  console.log('No files were written by this wizard preview.');
  console.log('Verification is required before treating setup as complete:');
  console.log('  ' + plan.steps.find((step) => step.id === 'verify').command);
  console.log('');
}

async function wizard(args) {
  const options = parseArgs(args);
  if (options.help) {
    displayHelp();
    return;
  }

  const plan = buildWizardPlan(options);
  if (options.json) {
    console.log(JSON.stringify(plan, null, 2));
  } else {
    printPlan(plan);
  }

  if (plan.warnings.some((warning) => warning.severity === 'error')) {
    process.exitCode = 1;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await wizard(process.argv.slice(2));
}

export { buildWizardPlan, detectProjectSignal, wizard };
