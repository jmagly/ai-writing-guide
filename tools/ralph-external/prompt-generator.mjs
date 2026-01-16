/**
 * Prompt Generator for External Ralph Loop
 *
 * Builds context-aware prompts for Claude Code sessions with
 * template rendering and variable substitution.
 *
 * @implements @.aiwg/requirements/design-ralph-external.md
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = join(__dirname, 'templates');

/**
 * @typedef {Object} PromptContext
 * @property {'initial'|'continuation'|'resume'} type - Prompt type
 * @property {string} objective - Task objective
 * @property {string} completionCriteria - Completion criteria
 * @property {number} iteration - Current iteration number
 * @property {number} maxIterations - Maximum iterations
 * @property {string} loopId - Loop identifier
 * @property {string} sessionId - Session identifier
 * @property {string} [learnings] - Accumulated learnings
 * @property {string[]} [filesModified] - Files modified so far
 * @property {string} [previousStatus] - Status of previous iteration
 * @property {string} [previousOutput] - Summary of previous output
 * @property {string} [lastAnalysis] - Last analysis result summary
 * @property {number} [timeRemaining] - Minutes remaining
 * @property {number} [budgetRemaining] - Budget remaining in USD
 */

/**
 * Template variable pattern: {{variableName}}
 */
const TEMPLATE_VAR_PATTERN = /\{\{(\w+)\}\}/g;

/**
 * Load template from file
 * @param {string} name - Template name (without extension)
 * @returns {string}
 */
function loadTemplate(name) {
  const path = join(TEMPLATES_DIR, `${name}.md`);
  if (!existsSync(path)) {
    throw new Error(`Template not found: ${name}`);
  }
  return readFileSync(path, 'utf8');
}

/**
 * Render template with variables
 * @param {string} template - Template string
 * @param {Object} variables - Variable values
 * @returns {string}
 */
function renderTemplate(template, variables) {
  return template.replace(TEMPLATE_VAR_PATTERN, (match, varName) => {
    if (varName in variables) {
      const value = variables[varName];
      return value !== null && value !== undefined ? String(value) : '';
    }
    // Leave unmatched variables as-is for debugging
    return match;
  });
}

/**
 * Build initial prompt for first iteration
 * @param {PromptContext} context
 * @returns {string}
 */
function buildInitialPrompt(context) {
  const template = loadTemplate('initial');
  return renderTemplate(template, {
    objective: context.objective,
    completionCriteria: context.completionCriteria,
    iteration: context.iteration,
    maxIterations: context.maxIterations,
    loopId: context.loopId,
    sessionId: context.sessionId,
    timeRemaining: context.timeRemaining || 'unlimited',
    budgetRemaining: context.budgetRemaining || 'unlimited',
  });
}

/**
 * Build continuation prompt for subsequent iterations
 * @param {PromptContext} context
 * @returns {string}
 */
function buildContinuationPrompt(context) {
  const template = loadTemplate('continue');
  return renderTemplate(template, {
    objective: context.objective,
    completionCriteria: context.completionCriteria,
    iteration: context.iteration,
    maxIterations: context.maxIterations,
    loopId: context.loopId,
    sessionId: context.sessionId,
    previousStatus: context.previousStatus || 'unknown',
    previousOutput: context.previousOutput || 'No previous output available',
    learnings: context.learnings || 'No learnings yet',
    filesModified: context.filesModified?.join('\n- ') || 'None',
    lastAnalysis: context.lastAnalysis || 'No analysis available',
    timeRemaining: context.timeRemaining || 'unlimited',
    budgetRemaining: context.budgetRemaining || 'unlimited',
  });
}

/**
 * Build resume prompt for recovering from crash
 * @param {PromptContext} context
 * @returns {string}
 */
function buildResumePrompt(context) {
  // Use continuation template for resume, with special handling
  const template = loadTemplate('continue');
  return renderTemplate(template, {
    objective: context.objective,
    completionCriteria: context.completionCriteria,
    iteration: context.iteration,
    maxIterations: context.maxIterations,
    loopId: context.loopId,
    sessionId: context.sessionId,
    previousStatus: 'CRASHED/INTERRUPTED - Resuming',
    previousOutput: context.previousOutput || 'Session was interrupted',
    learnings: context.learnings || 'Check matric-memory for state',
    filesModified: context.filesModified?.join('\n- ') || 'Unknown - check git status',
    lastAnalysis: context.lastAnalysis || 'Session interrupted before analysis',
    timeRemaining: context.timeRemaining || 'unlimited',
    budgetRemaining: context.budgetRemaining || 'unlimited',
  });
}

/**
 * Build system prompt injection
 * @param {PromptContext} context
 * @returns {string}
 */
function buildSystemPrompt(context) {
  const template = loadTemplate('system');
  return renderTemplate(template, {
    loopId: context.loopId,
    iteration: context.iteration,
    maxIterations: context.maxIterations,
  });
}

export class PromptGenerator {
  /**
   * Build prompt based on type
   * @param {PromptContext} context
   * @returns {{prompt: string, systemPrompt: string}}
   */
  build(context) {
    let prompt;

    switch (context.type) {
      case 'initial':
        prompt = buildInitialPrompt(context);
        break;
      case 'continuation':
        prompt = buildContinuationPrompt(context);
        break;
      case 'resume':
        prompt = buildResumePrompt(context);
        break;
      default:
        throw new Error(`Unknown prompt type: ${context.type}`);
    }

    const systemPrompt = buildSystemPrompt(context);

    return { prompt, systemPrompt };
  }

  /**
   * Build analysis prompt for output analyzer
   * @param {Object} params
   * @param {string} params.stdout - Session stdout
   * @param {string} params.stderr - Session stderr
   * @param {number} params.exitCode - Exit code
   * @param {string} params.objective - Original objective
   * @param {string} params.criteria - Completion criteria
   * @returns {string}
   */
  buildAnalysisPrompt({ stdout, stderr, exitCode, objective, criteria }) {
    return `# Analyze Claude Code Session Output

## Original Task
${objective}

## Completion Criteria
${criteria}

## Session Metadata
- Exit code: ${exitCode}
- Exit status: ${exitCode === 0 ? 'SUCCESS' : 'ERROR'}

## stdout (captured output)
\`\`\`
${stdout}
\`\`\`

${stderr ? `## stderr (if any)
\`\`\`
${stderr}
\`\`\`
` : ''}

## Analysis Required

Analyze this output and provide a JSON response:

\`\`\`json
{
  "completed": boolean,       // Did the task complete fully?
  "success": boolean|null,    // Was the completion successful? null if incomplete
  "failureClass": string|null, // One of: completion_criteria_failed, context_exhausted, budget_exceeded, crash, user_abort, internal_loop_limit, null
  "completionPercentage": number, // 0-100 estimated progress
  "shouldContinue": boolean,  // Should we try another iteration?
  "learnings": string,        // Key insights for next iteration
  "artifactsModified": string[], // Files that were changed
  "blockers": string[],       // Things preventing completion
  "nextApproach": string      // Suggested approach for continuation
}
\`\`\`

Look for:
1. Explicit completion markers: \`{"ralph_external_completion": true}\`
2. Test results, build output, verification commands
3. Error messages and their meaning
4. Progress indicators and remaining work`;
  }
}

export default PromptGenerator;
