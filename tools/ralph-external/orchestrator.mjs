/**
 * Orchestrator for External Ralph Loop
 *
 * Main loop logic that coordinates session launching, output analysis,
 * and state management for the external Ralph supervisor.
 *
 * @implements @.aiwg/requirements/design-ralph-external.md
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { StateManager } from './state-manager.mjs';
import { SessionLauncher } from './session-launcher.mjs';
import { OutputAnalyzer } from './output-analyzer.mjs';
import { PromptGenerator } from './prompt-generator.mjs';

/**
 * @typedef {Object} OrchestratorConfig
 * @property {string} objective - Task objective
 * @property {string} completionCriteria - Completion criteria
 * @property {number} [maxIterations=5] - Maximum external iterations
 * @property {string} [model='opus'] - Claude model
 * @property {number} [budgetPerIteration=2.0] - Budget per iteration USD
 * @property {number} [timeoutMinutes=60] - Timeout per iteration
 * @property {Object} [mcpConfig] - MCP server configuration
 * @property {string} [workingDir] - Working directory
 * @property {Object} [giteaIntegration] - Gitea issue tracking
 */

/**
 * @typedef {Object} OrchestratorResult
 * @property {boolean} success - Whether loop completed successfully
 * @property {string} reason - Reason for completion/failure
 * @property {number} iterations - Number of iterations executed
 * @property {string} loopId - Loop identifier
 */

export class Orchestrator {
  /**
   * @param {string} projectRoot - Project root directory
   */
  constructor(projectRoot) {
    this.projectRoot = projectRoot;
    this.stateManager = new StateManager(projectRoot);
    this.sessionLauncher = new SessionLauncher();
    this.outputAnalyzer = new OutputAnalyzer();
    this.promptGenerator = new PromptGenerator();
    this.aborted = false;
  }

  /**
   * Execute the external Ralph loop
   * @param {OrchestratorConfig} config
   * @returns {Promise<OrchestratorResult>}
   */
  async execute(config) {
    // Initialize state
    const state = this.stateManager.initialize({
      objective: config.objective,
      completionCriteria: config.completionCriteria,
      maxIterations: config.maxIterations || 5,
      model: config.model || 'opus',
      budgetPerIteration: config.budgetPerIteration || 2.0,
      timeoutMinutes: config.timeoutMinutes || 60,
      mcpConfig: config.mcpConfig,
      workingDir: config.workingDir || this.projectRoot,
      giteaIntegration: config.giteaIntegration,
    });

    console.log(`[External Ralph] Starting loop ${state.loopId}`);
    console.log(`[External Ralph] Objective: ${config.objective}`);
    console.log(`[External Ralph] Max iterations: ${state.maxIterations}`);

    return this.runLoop(state);
  }

  /**
   * Resume an interrupted loop
   * @param {Object} [overrides] - Configuration overrides
   * @returns {Promise<OrchestratorResult>}
   */
  async resume(overrides = {}) {
    const state = this.stateManager.load();
    if (!state) {
      throw new Error('No external Ralph loop to resume');
    }

    console.log(`[External Ralph] Resuming loop ${state.loopId}`);
    console.log(`[External Ralph] Current iteration: ${state.currentIteration}`);

    // Apply overrides
    if (overrides.maxIterations) {
      state.maxIterations = overrides.maxIterations;
    }
    if (overrides.budgetPerIteration) {
      state.config.budgetPerIteration = overrides.budgetPerIteration;
    }

    state.status = 'running';
    this.stateManager.save(state);

    return this.runLoop(state);
  }

  /**
   * Main loop execution
   * @param {Object} state - Loop state
   * @returns {Promise<OrchestratorResult>}
   */
  async runLoop(state) {
    while (state.currentIteration < state.maxIterations && !this.aborted) {
      state.currentIteration++;
      // Save the updated iteration count immediately
      this.stateManager.update({ currentIteration: state.currentIteration });
      console.log(`\n[External Ralph] === Iteration ${state.currentIteration}/${state.maxIterations} ===`);

      try {
        // Generate prompt
        const promptType = state.currentIteration === 1 ? 'initial' : 'continuation';
        const lastIteration = state.iterations[state.iterations.length - 1];

        const { prompt, systemPrompt } = this.promptGenerator.build({
          type: promptType,
          objective: state.objective,
          completionCriteria: state.completionCriteria,
          iteration: state.currentIteration,
          maxIterations: state.maxIterations,
          loopId: state.loopId,
          sessionId: state.sessionId,
          learnings: state.accumulatedLearnings,
          filesModified: state.filesModified,
          previousStatus: lastIteration?.analysis?.success ? 'partial' : 'incomplete',
          previousOutput: lastIteration?.analysis?.learnings,
          lastAnalysis: lastIteration?.analysis?.nextApproach,
        });

        // Save prompt for debugging
        const promptPath = this.stateManager.getPromptPath(state.currentIteration);
        mkdirSync(dirname(promptPath), { recursive: true });
        writeFileSync(promptPath, prompt);

        // Get output paths
        const outputPaths = this.stateManager.getOutputPaths(state.currentIteration);

        // Launch session
        console.log('[External Ralph] Launching Claude session...');
        const startTime = Date.now();

        this.stateManager.setCurrentPid(null);

        const sessionResult = await this.sessionLauncher.launch({
          prompt,
          sessionId: state.sessionId,
          model: state.config.model,
          budget: state.config.budgetPerIteration,
          systemPrompt,
          mcpConfig: state.config.mcpConfig,
          workingDir: state.config.workingDir,
          stdoutPath: outputPaths.stdout,
          stderrPath: outputPaths.stderr,
          timeoutMs: state.config.timeoutMinutes * 60 * 1000,
        });

        const duration = Date.now() - startTime;
        console.log(`[External Ralph] Session completed (${Math.round(duration / 1000)}s, exit: ${sessionResult.exitCode})`);

        // Analyze output
        console.log('[External Ralph] Analyzing output...');
        const analysis = await this.outputAnalyzer.analyze({
          stdoutPath: outputPaths.stdout,
          stderrPath: outputPaths.stderr,
          exitCode: sessionResult.exitCode,
          context: {
            objective: state.objective,
            criteria: state.completionCriteria,
          },
        });

        // Save analysis
        this.stateManager.saveAnalysis(state.currentIteration, analysis);

        // Update state with iteration record
        state = this.stateManager.addIteration({
          number: state.currentIteration,
          sessionId: state.sessionId,
          promptFile: promptPath,
          stdoutFile: outputPaths.stdout,
          stderrFile: outputPaths.stderr,
          exitCode: sessionResult.exitCode,
          duration,
          status: analysis.completed ? 'completed' : 'incomplete',
          analysis,
          learnings: analysis.learnings ? [analysis.learnings] : [],
          filesModified: analysis.artifactsModified || [],
          progress: analysis.nextApproach,
        });

        console.log(`[External Ralph] Analysis: completed=${analysis.completed}, success=${analysis.success}, progress=${analysis.completionPercentage}%`);

        // Check completion
        if (analysis.completed && analysis.success) {
          state.status = 'completed';
          this.stateManager.save(state);
          await this.generateCompletionReport(state, 'success');

          return {
            success: true,
            reason: 'Task completed successfully',
            iterations: state.currentIteration,
            loopId: state.loopId,
          };
        }

        // Check if we should continue
        if (!analysis.shouldContinue) {
          state.status = 'failed';
          this.stateManager.save(state);
          await this.generateCompletionReport(state, 'blocked');

          return {
            success: false,
            reason: analysis.failureClass || 'Cannot continue',
            iterations: state.currentIteration,
            loopId: state.loopId,
          };
        }

        console.log(`[External Ralph] Will continue with: ${analysis.nextApproach}`);

      } catch (error) {
        console.error(`[External Ralph] Iteration ${state.currentIteration} error:`, error.message);

        // Save error state
        this.stateManager.addIteration({
          number: state.currentIteration,
          sessionId: state.sessionId,
          exitCode: -1,
          duration: 0,
          status: 'error',
          analysis: { error: error.message },
          learnings: [`Error: ${error.message}`],
          filesModified: [],
          progress: 'Error recovery needed',
        });

        // Continue to next iteration (crash recovery)
        console.log('[External Ralph] Will retry in next iteration');
      }
    }

    // Loop ended without success
    if (this.aborted) {
      state.status = 'aborted';
      this.stateManager.save(state);

      return {
        success: false,
        reason: 'Aborted by user',
        iterations: state.currentIteration,
        loopId: state.loopId,
      };
    }

    state.status = 'limit_reached';
    this.stateManager.save(state);
    await this.generateCompletionReport(state, 'limit');

    return {
      success: false,
      reason: 'Maximum iterations reached',
      iterations: state.currentIteration,
      loopId: state.loopId,
    };
  }

  /**
   * Generate completion report
   * @param {Object} state - Final state
   * @param {string} status - Completion status
   */
  async generateCompletionReport(state, status) {
    const reportPath = join(this.stateManager.getStateDir(), 'completion-report.md');

    const iterations = state.iterations.map((iter, idx) => {
      return `| ${idx + 1} | ${iter.status} | ${iter.duration}ms | ${iter.analysis?.completionPercentage || 0}% |`;
    }).join('\n');

    const report = `# External Ralph Loop Completion Report

## Summary

| Property | Value |
|----------|-------|
| Loop ID | ${state.loopId} |
| Status | ${status} |
| Iterations | ${state.currentIteration} |
| Start Time | ${state.startTime} |
| End Time | ${new Date().toISOString()} |

## Objective

${state.objective}

## Completion Criteria

${state.completionCriteria}

## Iterations

| # | Status | Duration | Progress |
|---|--------|----------|----------|
${iterations}

## Accumulated Learnings

${state.accumulatedLearnings || 'None recorded'}

## Files Modified

${state.filesModified.length > 0 ? state.filesModified.map(f => `- ${f}`).join('\n') : 'None recorded'}

## Final Status

**${status.toUpperCase()}**
`;

    writeFileSync(reportPath, report);
    console.log(`[External Ralph] Report saved to: ${reportPath}`);
  }

  /**
   * Abort the loop
   */
  abort() {
    this.aborted = true;
    this.sessionLauncher.kill();
    console.log('[External Ralph] Abort requested');
  }

  /**
   * Get current status
   * @returns {Object|null}
   */
  getStatus() {
    return this.stateManager.load();
  }
}

export default Orchestrator;
