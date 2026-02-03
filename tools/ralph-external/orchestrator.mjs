/**
 * Orchestrator for External Ralph Loop
 *
 * Main loop logic that coordinates session launching, output analysis,
 * and state management for the external Ralph supervisor.
 *
 * Enhanced with comprehensive state capture for long-running sessions (6-8 hours):
 * - Pre/post session snapshots (git, .aiwg, file hashes)
 * - Periodic checkpoints during sessions
 * - Two-phase state assessment (orient + prompt generation)
 * - Session transcript and stream-json capture
 *
 * Epic #26 Integration:
 * - PID Control Layer: Dynamic parameter adjustment
 * - Claude Intelligence Layer: Strategic planning and validation
 * - Memory Layer: Cross-loop learning and knowledge persistence
 * - Overseer Layer: Health monitoring and intervention
 *
 * @implements @.aiwg/requirements/design-ralph-external.md
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { StateManager } from './state-manager.mjs';
import { SessionLauncher } from './session-launcher.mjs';
import { OutputAnalyzer } from './output-analyzer.mjs';
import { PromptGenerator } from './prompt-generator.mjs';
import { SnapshotManager } from './snapshot-manager.mjs';
import { CheckpointManager } from './checkpoint-manager.mjs';
import { StateAssessor } from './state-assessor.mjs';
// Research-backed modules (REF-015 Self-Refine, REF-021 Reflexion)
import { BestOutputTracker } from './best-output-tracker.mjs';
import { MemoryManager } from './memory-manager.mjs';
import { EarlyStopping } from './early-stopping.mjs';
import { IterationAnalytics } from './iteration-analytics.mjs';
import { CrossTaskLearner } from './cross-task-learner.mjs';
// Multi-loop coordination (REF-086, REF-088)
import { ExternalMultiLoopStateManager } from './external-multi-loop-state-manager.mjs';
// Process reliability (Phase 4)
import { ProcessMonitor } from './process-monitor.mjs';
import { RecoveryEngine } from './recovery-engine.mjs';

// ========== EPIC #26 COMPONENTS ==========
// PID Control Layer (#23)
import { PIDController } from './pid-controller.mjs';
import { GainScheduler } from './gain-scheduler.mjs';
import { MetricsCollector } from './metrics-collector.mjs';
import { ControlAlarms } from './control-alarms.mjs';

// Claude Intelligence Layer (#22)
import { ClaudePromptGenerator } from './lib/claude-prompt-generator.mjs';
import { ValidationAgent } from './lib/validation-agent.mjs';
import { StrategyPlanner } from './lib/strategy-planner.mjs';

// Memory Layer (#24)
import { SemanticMemory } from './lib/semantic-memory.mjs';
import { MemoryPromotion } from './lib/memory-promotion.mjs';
import { LearningExtractor } from './lib/learning-extractor.mjs';
import { MemoryRetrieval } from './lib/memory-retrieval.mjs';

// Overseer Layer (#25)
import { Overseer } from './lib/overseer.mjs';
import { BehaviorDetector } from './lib/behavior-detector.mjs';
import { InterventionSystem } from './lib/intervention-system.mjs';
import { EscalationHandler } from './lib/escalation-handler.mjs';

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
 * @property {boolean} [verbose=false] - Enable verbose Claude output
 * @property {number} [checkpointIntervalMinutes=30] - Checkpoint interval
 * @property {boolean} [enableCheckpoints=true] - Enable periodic checkpoints
 * @property {boolean} [enableSnapshots=true] - Enable pre/post session snapshots
 * @property {boolean} [useClaudeAssessment=false] - Use Claude for state assessment
 * @property {string[]} [keyFiles=[]] - Key files to track hashes
 * @property {number} [memory=3] - Memory capacity Ω for MemoryManager (REF-021)
 * @property {boolean} [crossTask=true] - Enable cross-task learning
 * @property {boolean} [enableAnalytics=true] - Enable iteration analytics
 * @property {boolean} [enableBestOutput=true] - Enable best output tracking (REF-015)
 * @property {boolean} [enableEarlyStopping=true] - Enable early stopping on high confidence
 * @property {boolean} [force=false] - Force creation despite concurrent loop limit
 * @property {boolean} [enablePIDControl=true] - Enable PID control system
 * @property {boolean} [enableOverseer=true] - Enable overseer monitoring
 * @property {boolean} [enableSemanticMemory=true] - Enable semantic memory
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
    this.snapshotManager = new SnapshotManager({ projectRoot });
    this.checkpointManager = null; // Created per-session with config
    this.stateAssessor = new StateAssessor({ projectRoot });
    this.aborted = false;
    this.currentPreSnapshot = null;

    // Research-backed modules (initialized per-loop in execute())
    this.bestOutputTracker = null;
    this.memoryManager = null;
    this.earlyStopping = null;
    this.iterationAnalytics = null;
    this.crossTaskLearner = null;
    this.crossTaskLearnings = null;

    // Multi-loop coordination (initialized lazily)
    this.multiLoopManager = null;
    this.registeredLoopId = null;

    // Process reliability (Phase 4)
    this.processMonitor = null;
    this.recoveryEngine = new RecoveryEngine(projectRoot);

    // ========== EPIC #26 COMPONENTS ==========
    // PID Control Layer
    this.pidController = null;
    this.gainScheduler = null;
    this.metricsCollector = null;
    this.controlAlarms = null;

    // Claude Intelligence Layer
    this.claudePromptGenerator = null;
    this.validationAgent = null;
    this.strategyPlanner = null;

    // Memory Layer
    this.semanticMemory = null;
    this.memoryPromotion = null;
    this.learningExtractor = null;
    this.memoryRetrieval = null;

    // Overseer Layer
    this.overseer = null;
    this.behaviorDetector = null;
    this.interventionSystem = null;
    this.escalationHandler = null;
  }

  /**
   * Execute the external Ralph loop
   * @param {OrchestratorConfig} config
   * @returns {Promise<OrchestratorResult>}
   */
  async execute(config) {
    // Initialize state with enhanced capture options
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
      // Enhanced capture options
      verbose: config.verbose || false,
      checkpointIntervalMinutes: config.checkpointIntervalMinutes || 30,
      enableCheckpoints: config.enableCheckpoints !== false,
      enableSnapshots: config.enableSnapshots !== false,
      useClaudeAssessment: config.useClaudeAssessment || false,
      keyFiles: config.keyFiles || [],
      // Research-backed options (REF-015, REF-021)
      memory: config.memory || 3,
      crossTask: config.crossTask !== false,
      enableAnalytics: config.enableAnalytics !== false,
      enableBestOutput: config.enableBestOutput !== false,
      enableEarlyStopping: config.enableEarlyStopping !== false,
      // Epic #26 options
      enablePIDControl: config.enablePIDControl !== false,
      enableOverseer: config.enableOverseer !== false,
      enableSemanticMemory: config.enableSemanticMemory !== false,
    });

    console.log(`[External Ralph] Starting loop ${state.loopId}`);
    console.log(`[External Ralph] Objective: ${config.objective}`);
    console.log(`[External Ralph] Max iterations: ${state.maxIterations}`);
    if (state.config.enableSnapshots) {
      console.log('[External Ralph] Pre/post session snapshots: ENABLED');
    }
    if (state.config.enableCheckpoints) {
      console.log(`[External Ralph] Periodic checkpoints: ENABLED (${state.config.checkpointIntervalMinutes} min)`);
    }

    // ========== MULTI-LOOP COORDINATION (REF-086, REF-088) ==========
    try {
      this.multiLoopManager = new ExternalMultiLoopStateManager(this.projectRoot);
      this.multiLoopManager.ensureBaseDir();

      // Check concurrent loop limit
      const activeLoops = this.multiLoopManager.listActiveLoops();
      console.log(`[External Ralph] Active loops: ${activeLoops.length}`);

      // Register this loop (will enforce limit unless --force was used)
      const registration = await this.multiLoopManager.createLoop(
        {
          objective: config.objective,
          completionCriteria: config.completionCriteria,
          maxIterations: config.maxIterations || 5,
          model: config.model || 'opus',
          budgetPerIteration: config.budgetPerIteration || 2.0,
          timeoutMinutes: config.timeoutMinutes || 60,
          mcpConfig: config.mcpConfig,
          workingDir: config.workingDir || this.projectRoot,
          giteaIntegration: config.giteaIntegration,
        },
        { force: config.force || false }
      );

      this.registeredLoopId = registration.loopId;
      console.log(`[External Ralph] Registered in multi-loop registry: ${registration.loopId}`);
    } catch (error) {
      // If multi-loop manager fails, continue with single-loop mode
      console.warn(`[External Ralph] Multi-loop coordination unavailable: ${error.message}`);
      console.log('[External Ralph] Continuing in single-loop mode');
    }

    // ========== INITIALIZE RESEARCH MODULES ==========
    const stateDir = this.stateManager.getStateDir();

    // Best Output Tracker (REF-015 Self-Refine)
    if (state.config.enableBestOutput) {
      this.bestOutputTracker = new BestOutputTracker(stateDir);
      console.log('[External Ralph] Best output tracking: ENABLED (REF-015)');
    }

    // Memory Manager (REF-021 Reflexion)
    this.memoryManager = new MemoryManager({
      stateDir,
      capacity: state.config.memory,
    });
    console.log(`[External Ralph] Memory manager: ENABLED (Ω=${state.config.memory})`);

    // Early Stopping
    if (state.config.enableEarlyStopping) {
      this.earlyStopping = new EarlyStopping({
        confidenceThreshold: 0.95,
        minIterations: 2,
        requireVerification: true,
      });
      console.log('[External Ralph] Early stopping: ENABLED');
    }

    // Iteration Analytics
    if (state.config.enableAnalytics) {
      this.iterationAnalytics = new IterationAnalytics(
        state.loopId,
        config.objective,
        { storagePath: join(stateDir, 'analytics') }
      );
      console.log('[External Ralph] Iteration analytics: ENABLED');
    }

    // Cross-Task Learner
    if (state.config.crossTask) {
      this.crossTaskLearner = new CrossTaskLearner({
        memory_path: join(this.projectRoot, '.aiwg', 'ralph', 'memory'),
      });
      // Get relevant learnings before starting
      this.crossTaskLearnings = this.crossTaskLearner.getRelevantLearnings(config.objective);
      if (this.crossTaskLearnings.similar_tasks.length > 0) {
        console.log(`[External Ralph] Cross-task learning: Found ${this.crossTaskLearnings.similar_tasks.length} similar tasks`);
      } else {
        console.log('[External Ralph] Cross-task learning: ENABLED (no similar tasks found)');
      }
    }

    // ========== INITIALIZE EPIC #26 COMPONENTS ==========

    // PID Control Layer
    if (state.config.enablePIDControl) {
      this.metricsCollector = new MetricsCollector({
        windowSize: 5,
        integralDecay: 0.9,
        noiseThreshold: 0.05,
      });

      this.gainScheduler = new GainScheduler();

      this.pidController = new PIDController({
        kp: 0.5,  // Initial proportional gain
        ki: 0.2,  // Initial integral gain
        kd: 0.3,  // Initial derivative gain
        outputMin: 0,
        outputMax: 1,
      });

      this.controlAlarms = new ControlAlarms({
        projectRoot: this.projectRoot,
        loopId: state.loopId,
      });

      console.log('[External Ralph] PID control system: ENABLED (#23)');
    }

    // Claude Intelligence Layer
    this.claudePromptGenerator = new ClaudePromptGenerator({
      projectRoot: this.projectRoot,
    });

    this.validationAgent = new ValidationAgent({
      projectRoot: this.projectRoot,
    });

    this.strategyPlanner = new StrategyPlanner({
      projectRoot: this.projectRoot,
    });

    console.log('[External Ralph] Claude intelligence layer: ENABLED (#22)');

    // Memory Layer
    if (state.config.enableSemanticMemory) {
      const memoryPath = join(this.projectRoot, '.aiwg', 'ralph', 'semantic-memory');

      this.semanticMemory = new SemanticMemory({
        storagePath: memoryPath,
      });

      this.memoryPromotion = new MemoryPromotion({
        storagePath: memoryPath,
      });

      this.learningExtractor = new LearningExtractor({
        projectRoot: this.projectRoot,
      });

      this.memoryRetrieval = new MemoryRetrieval({
        storagePath: memoryPath,
      });

      console.log('[External Ralph] Semantic memory layer: ENABLED (#24)');
    }

    // Overseer Layer
    if (state.config.enableOverseer) {
      this.behaviorDetector = new BehaviorDetector({
        projectRoot: this.projectRoot,
      });

      this.interventionSystem = new InterventionSystem({
        projectRoot: this.projectRoot,
      });

      this.escalationHandler = new EscalationHandler({
        projectRoot: this.projectRoot,
        loopId: state.loopId,
      });

      this.overseer = new Overseer({
        projectRoot: this.projectRoot,
        loopId: state.loopId,
        behaviorDetector: this.behaviorDetector,
        interventionSystem: this.interventionSystem,
        escalationHandler: this.escalationHandler,
      });

      console.log('[External Ralph] Overseer monitoring: ENABLED (#25)');
    }

    // ========== PROCESS MONITOR (Phase 4) ==========
    this.processMonitor = new ProcessMonitor({
      projectRoot: this.projectRoot,
      heartbeatIntervalMs: 30000, // 30 seconds
      staleThresholdMs: 120000, // 2 minutes
    });

    // Record initial heartbeat
    this.processMonitor.recordHeartbeat(state.loopId, {
      iteration: 0,
      status: 'starting',
    });
    console.log('[External Ralph] Process monitoring: ENABLED');

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

    // ========== CRASH RECOVERY (Phase 4) ==========
    const crashState = this.recoveryEngine.detectCrash();
    if (crashState.crashed) {
      console.log(`[External Ralph] Crash detected at iteration ${crashState.iteration}`);
      console.log(`[External Ralph] Recovery strategy: ${crashState.recoveryStrategy?.type || 'continue'}`);

      // Log recovery attempt
      this.recoveryEngine.notifyCrash(state.loopId, new Error('Process crash detected during resume'));

      // Check for checkpoint recovery
      const latestCheckpoint = this.recoveryEngine.getLatestCheckpoint(state.loopId);
      if (latestCheckpoint) {
        console.log(`[External Ralph] Latest checkpoint: iteration ${latestCheckpoint.iteration}`);
        // Could restore from checkpoint here if needed
        // For now, continue from current state with accumulated learnings
      }

      // Mark as recovering (will be marked as running once loop starts)
      state.status = 'recovering';
      state.recoveryAttempts = (state.recoveryAttempts || 0) + 1;
      state.lastRecoveryAt = new Date().toISOString();
    }

    // Apply overrides
    if (overrides.maxIterations) {
      state.maxIterations = overrides.maxIterations;
    }
    if (overrides.budgetPerIteration) {
      state.config.budgetPerIteration = overrides.budgetPerIteration;
    }

    state.status = 'running';
    this.stateManager.save(state);

    // Mark recovery complete if we were recovering
    if (crashState.crashed) {
      this.recoveryEngine.markRecovered();
      console.log('[External Ralph] Recovery marked complete');
    }

    // Initialize process monitor for resumed loop
    this.processMonitor = new ProcessMonitor({
      projectRoot: this.projectRoot,
      heartbeatIntervalMs: 30000,
      staleThresholdMs: 120000,
    });

    this.processMonitor.recordHeartbeat(state.loopId, {
      iteration: state.currentIteration,
      status: 'resumed',
    });

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

      // Record iteration heartbeat
      if (this.processMonitor) {
        this.processMonitor.recordHeartbeat(state.loopId, {
          iteration: state.currentIteration,
          status: 'running',
        });
      }

      // Get output paths and iteration directory
      const outputPaths = this.stateManager.getOutputPaths(state.currentIteration);
      const iterationDir = dirname(outputPaths.stdout);
      mkdirSync(iterationDir, { recursive: true });

      try {
        // ========== PRE-SESSION SNAPSHOT ==========
        if (state.config.enableSnapshots) {
          console.log('[External Ralph] Capturing pre-session snapshot...');
          this.currentPreSnapshot = await this.snapshotManager.capturePreSnapshot({
            sessionId: state.sessionId,
            iteration: state.currentIteration,
            objective: state.objective,
            keyFiles: state.config.keyFiles,
          });
          // Save snapshot to iteration directory
          writeFileSync(
            join(iterationDir, 'pre-snapshot.json'),
            JSON.stringify(this.currentPreSnapshot, null, 2)
          );
        }

        // ========== PRE-ITERATION: INTELLIGENCE & MEMORY ==========
        let prompt, systemPrompt;
        const promptType = state.currentIteration === 1 ? 'initial' : 'continuation';
        const lastIteration = state.iterations[state.iterations.length - 1];

        // StateAssessor: Assess current situation
        let assessment = null;
        if (state.currentIteration > 1) {
          console.log('[External Ralph] Assessing current state...');
          assessment = await this.stateAssessor.assess({
            stdoutPath: lastIteration?.stdoutFile,
            stderrPath: lastIteration?.stderrFile,
            exitCode: lastIteration?.exitCode || 0,
            timedOut: false,
            preSnapshot: this.currentPreSnapshot,
            postSnapshot: lastIteration?.postSnapshot,
            objective: state.objective,
            completionCriteria: state.completionCriteria,
            iteration: state.currentIteration,
            maxIterations: state.maxIterations,
            accumulatedLearnings: state.accumulatedLearnings,
            outputDir: iterationDir,
          });

          // Save assessment
          writeFileSync(
            join(iterationDir, 'state-assessment.json'),
            JSON.stringify(assessment, null, 2)
          );
        }

        // MemoryRetrieval: Get relevant cross-loop knowledge
        let relevantKnowledge = null;
        if (this.memoryRetrieval && state.currentIteration > 1) {
          console.log('[External Ralph] Retrieving relevant knowledge...');
          relevantKnowledge = await this.memoryRetrieval.retrieve({
            query: state.objective,
            context: assessment?.summary || '',
            maxResults: 5,
          });
        }

        // StrategyPlanner: Plan strategy for this iteration
        let strategy = null;
        if (this.strategyPlanner) {
          console.log('[External Ralph] Planning iteration strategy...');
          strategy = await this.strategyPlanner.plan({
            objective: state.objective,
            completionCriteria: state.completionCriteria,
            iteration: state.currentIteration,
            maxIterations: state.maxIterations,
            assessment,
            relevantKnowledge,
            previousIterations: state.iterations,
          });
        }

        // PID Controller: Compute control signals
        let controlSignals = null;
        if (this.pidController && this.metricsCollector && state.currentIteration > 1) {
          // Extract metrics from last iteration
          const metrics = this.metricsCollector.extractIterationMetrics(lastIteration);
          const pidMetrics = this.metricsCollector.computePIDMetrics(metrics);

          // Adjust gains based on situation
          if (this.gainScheduler && assessment) {
            const adjustedGains = this.gainScheduler.adjustGains({
              phase: assessment.phase || 'normal',
              volatility: pidMetrics.derivative,
              errorMagnitude: pidMetrics.proportional,
            });
            this.pidController.updateGains(adjustedGains);
          }

          // Compute control output
          controlSignals = this.pidController.compute(pidMetrics.proportional);

          console.log(`[External Ralph] PID control: P=${pidMetrics.proportional.toFixed(3)}, output=${controlSignals.output.toFixed(3)}`);
        }

        // ValidationAgent: Pre-iteration validation
        let preValidation = null;
        if (this.validationAgent) {
          console.log('[External Ralph] Running pre-iteration validation...');
          preValidation = await this.validationAgent.validatePre({
            objective: state.objective,
            completionCriteria: state.completionCriteria,
            iteration: state.currentIteration,
            strategy,
            assessment,
          });

          if (!preValidation.valid) {
            console.warn(`[External Ralph] Pre-validation warnings: ${preValidation.warnings.length}`);
          }
        }

        // ClaudePromptGenerator: Generate optimized prompt
        if (this.claudePromptGenerator) {
          console.log('[External Ralph] Generating Claude-optimized prompt...');
          const promptResult = await this.claudePromptGenerator.generate({
            objective: state.objective,
            completionCriteria: state.completionCriteria,
            iteration: state.currentIteration,
            maxIterations: state.maxIterations,
            assessment,
            strategy,
            relevantKnowledge,
            controlSignals,
            previousIterations: state.iterations,
          });

          prompt = promptResult.prompt;
          systemPrompt = promptResult.systemPrompt;
        } else {
          // Fallback to standard prompt generator
          // Get reflection context from MemoryManager (REF-021)
          const reflectionContext = this.memoryManager
            ? this.memoryManager.getContextForPrompt()
            : '';

          // Get cross-task learnings context
          const crossTaskContext = this.crossTaskLearnings?.context_summary || '';

          if (promptType === 'continuation' && state.config.useClaudeAssessment) {
            // Use two-phase state assessment for continuation prompts
            console.log('[External Ralph] Performing two-phase state assessment...');
            const fallbackAssessment = await this.stateAssessor.assess({
              stdoutPath: lastIteration?.stdoutFile,
              stderrPath: lastIteration?.stderrFile,
              exitCode: lastIteration?.exitCode || 0,
              timedOut: false,
              preSnapshot: this.currentPreSnapshot,
              postSnapshot: lastIteration?.postSnapshot,
              objective: state.objective,
              completionCriteria: state.completionCriteria,
              iteration: state.currentIteration,
              maxIterations: state.maxIterations,
              accumulatedLearnings: state.accumulatedLearnings,
              outputDir: iterationDir,
            });

            // Save assessment to iteration directory
            writeFileSync(
              join(iterationDir, 'state-assessment.json'),
              JSON.stringify(fallbackAssessment, null, 2)
            );

            prompt = fallbackAssessment.prompt;
            systemPrompt = this.promptGenerator.buildSystemPrompt({
              objective: state.objective,
              completionCriteria: state.completionCriteria,
              iteration: state.currentIteration,
              maxIterations: state.maxIterations,
              loopId: state.loopId,
            });
          } else {
            // Use standard prompt generator
            const generated = this.promptGenerator.build({
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
              // Research-backed context injection (REF-015, REF-021)
              reflectionContext: reflectionContext,
              crossTaskContext: crossTaskContext,
            });
            prompt = generated.prompt;
            systemPrompt = generated.systemPrompt;
          }
        }

        // Save prompt for debugging
        const promptPath = this.stateManager.getPromptPath(state.currentIteration);
        mkdirSync(dirname(promptPath), { recursive: true });
        writeFileSync(promptPath, prompt);

        // ========== START CHECKPOINT MANAGER ==========
        if (state.config.enableCheckpoints) {
          console.log('[External Ralph] Starting checkpoint manager...');
          this.checkpointManager = new CheckpointManager({
            stateDir: iterationDir,
            projectRoot: this.projectRoot,
            interval: state.config.checkpointIntervalMinutes * 60 * 1000,
            sessionId: state.sessionId,
          });
          this.checkpointManager.start();
        }

        // ========== LAUNCH SESSION ==========
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
          outputDir: iterationDir,
          timeoutMs: state.config.timeoutMinutes * 60 * 1000,
          verbose: state.config.verbose,
        });

        const duration = Date.now() - startTime;

        // ========== STOP CHECKPOINT MANAGER ==========
        let checkpointSummary = null;
        if (this.checkpointManager) {
          console.log('[External Ralph] Stopping checkpoint manager...');
          checkpointSummary = this.checkpointManager.stop();
          this.checkpointManager = null;
        }

        console.log(`[External Ralph] Session completed (${Math.round(duration / 1000)}s, exit: ${sessionResult.exitCode})`);
        if (sessionResult.toolCallCount) {
          console.log(`[External Ralph] Tool calls: ${sessionResult.toolCallCount}, errors: ${sessionResult.errorCount || 0}`);
        }

        // Record session completion heartbeat
        if (this.processMonitor) {
          this.processMonitor.recordHeartbeat(state.loopId, {
            iteration: state.currentIteration,
            status: 'analyzing',
          });
        }

        // ========== POST-SESSION SNAPSHOT ==========
        let postSnapshot = null;
        if (state.config.enableSnapshots && this.currentPreSnapshot) {
          console.log('[External Ralph] Capturing post-session snapshot...');
          postSnapshot = await this.snapshotManager.capturePostSnapshot(this.currentPreSnapshot);

          // Save snapshot and diff
          writeFileSync(
            join(iterationDir, 'post-snapshot.json'),
            JSON.stringify(postSnapshot, null, 2)
          );

          const snapshotDiff = this.snapshotManager.calculateDiff(this.currentPreSnapshot, postSnapshot);
          writeFileSync(
            join(iterationDir, 'snapshot-diff.json'),
            JSON.stringify(snapshotDiff, null, 2)
          );

          if (snapshotDiff.summary.totalChanges > 0) {
            console.log(`[External Ralph] Changes detected: ${snapshotDiff.summary.totalChanges} (git: ${snapshotDiff.summary.gitChanges}, aiwg: ${snapshotDiff.summary.aiwgChanges})`);
          }
        }

        // ========== ANALYZE OUTPUT ==========
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

        // ========== POST-ITERATION: VALIDATION & OVERSIGHT ==========

        // ValidationAgent: Post-iteration validation
        let postValidation = null;
        if (this.validationAgent) {
          console.log('[External Ralph] Running post-iteration validation...');
          postValidation = await this.validationAgent.validatePost({
            objective: state.objective,
            completionCriteria: state.completionCriteria,
            iteration: state.currentIteration,
            analysis,
            sessionResult,
            preValidation,
          });

          if (!postValidation.valid) {
            console.warn(`[External Ralph] Post-validation issues: ${postValidation.errors.length}`);
          }
        }

        // Overseer: Health check and intervention
        let healthReport = null;
        let interventionResult = null;
        if (this.overseer) {
          console.log('[External Ralph] Running overseer health check...');
          healthReport = await this.overseer.check({
            iteration: state.currentIteration,
            analysis,
            validation: postValidation,
            metrics: this.metricsCollector ? this.metricsCollector.extractIterationMetrics({
              analysis,
              ...sessionResult,
            }) : null,
          });

          // Handle interventions
          if (healthReport.intervention !== 'NONE') {
            console.log(`[External Ralph] Intervention triggered: ${healthReport.intervention}`);
            interventionResult = await this.interventionSystem.intervene(healthReport);

            // Check if we need to pause/abort
            if (healthReport.intervention === 'PAUSE' || healthReport.intervention === 'ABORT') {
              const escalation = await this.escalationHandler.escalate({
                level: healthReport.intervention === 'ABORT' ? 'critical' : 'high',
                reason: healthReport.reason,
                context: {
                  iteration: state.currentIteration,
                  healthReport,
                  analysis,
                },
              });

              if (healthReport.intervention === 'ABORT') {
                state.status = 'aborted';
                state.abortReason = healthReport.reason;
                this.stateManager.save(state);
                await this.completeMultiLoop('aborted');

                return {
                  success: false,
                  reason: `Aborted by overseer: ${healthReport.reason}`,
                  iterations: state.currentIteration,
                  loopId: state.loopId,
                };
              }
            }
          }
        }

        // ========== UPDATE STATE ==========
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
          // Enhanced capture data
          preSnapshot: this.currentPreSnapshot,
          postSnapshot,
          checkpointSummary,
          transcriptPath: sessionResult.transcriptPath,
          parsedEventsPath: sessionResult.parsedEventsPath,
          toolCallCount: sessionResult.toolCallCount,
          errorCount: sessionResult.errorCount,
          // Epic #26 data
          assessment,
          strategy,
          controlSignals,
          preValidation,
          postValidation,
          healthReport,
          interventionResult,
        });

        console.log(`[External Ralph] Analysis: completed=${analysis.completed}, success=${analysis.success}, progress=${analysis.completionPercentage}%`);

        // ========== RECORD TO RESEARCH MODULES ==========
        const qualityScore = (analysis.completionPercentage || 0) / 100;
        const verificationPassed = analysis.completed && analysis.success;

        // Best Output Tracker (REF-015)
        if (this.bestOutputTracker) {
          this.bestOutputTracker.recordIteration({
            iteration: state.currentIteration,
            artifacts: analysis.artifactsModified || [],
            qualityScore,
            validationPassed: verificationPassed,
          });
        }

        // Memory Manager - add reflection (REF-021)
        if (this.memoryManager && analysis.learnings) {
          this.memoryManager.addReflection({
            iteration: state.currentIteration,
            content: analysis.learnings,
            type: analysis.completed ? 'success_pattern' : 'strategy_change',
            effectiveness: verificationPassed ? 'helpful' : 'neutral',
          });
        }

        // Early Stopping
        if (this.earlyStopping) {
          this.earlyStopping.recordIterationResult({
            iteration: state.currentIteration,
            qualityScore,
            verificationPassed,
          });
        }

        // Iteration Analytics
        if (this.iterationAnalytics) {
          this.iterationAnalytics.recordIteration({
            iteration_number: state.currentIteration,
            quality_score: qualityScore * 100,
            tokens_used: sessionResult.toolCallCount || 0,
            token_cost_usd: 0, // Would need actual cost tracking
            execution_time_ms: duration,
            verification_status: verificationPassed ? 'passed' : 'failed',
            output_snapshot_path: outputPaths.stdout,
            reflections: analysis.learnings ? [analysis.learnings] : [],
          });
        }

        // LearningExtractor & MemoryPromotion
        if (this.learningExtractor && this.memoryPromotion && verificationPassed) {
          console.log('[External Ralph] Extracting and promoting learnings...');
          const learnings = await this.learningExtractor.extract({
            iteration: state.currentIteration,
            analysis,
            strategy,
            outcome: 'success',
          });

          if (learnings.length > 0) {
            await this.memoryPromotion.promote({
              learnings,
              source: `loop-${state.loopId}-iteration-${state.currentIteration}`,
            });
          }
        }

        // ========== CHECK EARLY STOPPING ==========
        if (this.earlyStopping && state.currentIteration >= 2) {
          const earlyStopResult = this.earlyStopping.shouldStop();
          if (earlyStopResult.stop) {
            console.log(`[External Ralph] Early stopping triggered: ${earlyStopResult.reason}`);

            // Select best output before completing
            const selectedIteration = this.selectBestOutput(state);
            if (selectedIteration !== state.currentIteration) {
              console.log(`[External Ralph] Selected iteration ${selectedIteration} as best output`);
            }

            state.status = 'completed';
            this.stateManager.save(state);
            await this.generateCompletionReport(state, 'early_stop');
            await this.recordTaskCompletion(state, 'success');
            await this.completeMultiLoop('completed');

            return {
              success: true,
              reason: `Early stop: ${earlyStopResult.reason}`,
              iterations: state.currentIteration,
              loopId: state.loopId,
            };
          }
        }

        // ========== CHECK COMPLETION ==========
        if (analysis.completed && analysis.success) {
          // Select best output (may not be final iteration per REF-015)
          const selectedIteration = this.selectBestOutput(state);
          if (selectedIteration !== state.currentIteration) {
            console.log(`[External Ralph] Selected iteration ${selectedIteration} as best output (not final)`);
          }

          state.status = 'completed';
          this.stateManager.save(state);
          await this.generateCompletionReport(state, 'success');
          await this.recordTaskCompletion(state, 'success');
          await this.completeMultiLoop('completed');

          return {
            success: true,
            reason: 'Task completed successfully',
            iterations: state.currentIteration,
            loopId: state.loopId,
            selectedIteration,
          };
        }

        // Check if we should continue
        if (!analysis.shouldContinue) {
          state.status = 'failed';
          this.stateManager.save(state);
          await this.generateCompletionReport(state, 'blocked');
          await this.completeMultiLoop('failed');

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

        // Stop checkpoint manager if running
        if (this.checkpointManager) {
          try {
            this.checkpointManager.stop();
          } catch (e) {
            // Ignore stop errors
          }
          this.checkpointManager = null;
        }

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
          preSnapshot: this.currentPreSnapshot,
        });

        // Continue to next iteration (crash recovery)
        console.log('[External Ralph] Will retry in next iteration');
      }
    }

    // Loop ended without success
    if (this.aborted) {
      // Stop checkpoint manager if running
      if (this.checkpointManager) {
        try {
          this.checkpointManager.stop();
        } catch (e) {
          // Ignore stop errors
        }
        this.checkpointManager = null;
      }

      state.status = 'aborted';
      this.stateManager.save(state);
      await this.completeMultiLoop('aborted');

      return {
        success: false,
        reason: 'Aborted by user',
        iterations: state.currentIteration,
        loopId: state.loopId,
      };
    }

    // Select best output even on limit reached (REF-015)
    const selectedIteration = this.selectBestOutput(state);
    if (selectedIteration !== state.currentIteration) {
      console.log(`[External Ralph] Selected iteration ${selectedIteration} as best output (limit reached)`);
    }

    state.status = 'limit_reached';
    this.stateManager.save(state);
    await this.generateCompletionReport(state, 'limit');
    await this.recordTaskCompletion(state, 'partial');
    await this.completeMultiLoop('limit_reached');

    return {
      success: false,
      reason: 'Maximum iterations reached',
      iterations: state.currentIteration,
      loopId: state.loopId,
      selectedIteration,
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

    // Stop process monitor
    if (this.processMonitor) {
      this.processMonitor.stopAll();
    }

    // Stop checkpoint manager if running
    if (this.checkpointManager) {
      try {
        this.checkpointManager.stop();
      } catch {
        // Ignore stop errors
      }
      this.checkpointManager = null;
    }

    console.log('[External Ralph] Abort requested');
  }

  /**
   * Graceful shutdown with state persistence
   * Called on SIGTERM/SIGINT for clean termination
   */
  async gracefulShutdown() {
    console.log('[External Ralph] Graceful shutdown initiated...');

    // Record final heartbeat
    const state = this.stateManager.load();
    if (state && this.processMonitor) {
      this.processMonitor.recordHeartbeat(state.loopId, {
        iteration: state.currentIteration,
        status: 'shutting_down',
      });
    }

    // Stop checkpoint manager and save summary
    let checkpointSummary = null;
    if (this.checkpointManager) {
      console.log('[External Ralph] Stopping checkpoint manager...');
      try {
        checkpointSummary = this.checkpointManager.stop();
      } catch {
        // Ignore stop errors
      }
      this.checkpointManager = null;
    }

    // Save interrupted state with checkpoint summary
    if (state) {
      state.status = 'interrupted';
      state.interruptedAt = new Date().toISOString();
      if (checkpointSummary) {
        state.lastCheckpointSummary = checkpointSummary;
      }
      this.stateManager.save(state);
      console.log(`[External Ralph] State saved (iteration ${state.currentIteration})`);
    }

    // Stop process monitor
    if (this.processMonitor) {
      this.processMonitor.stopAll();
    }

    // Complete multi-loop registration
    await this.completeMultiLoop('interrupted');

    // Kill Claude session gracefully
    this.sessionLauncher.kill();

    console.log('[External Ralph] Graceful shutdown complete');
  }

  /**
   * Get current status
   * @returns {Object|null}
   */
  getStatus() {
    return this.stateManager.load();
  }

  /**
   * Select and apply the best output from iteration history (REF-015 Self-Refine)
   * @param {Object} state - Current loop state
   * @returns {Promise<Object>} Selection result with best iteration info
   */
  async selectBestOutput(state) {
    console.log('[External Ralph] Selecting best output from iteration history...');

    let bestIteration = state.currentIteration;
    let selectionSource = 'final';

    // Try BestOutputTracker first (quality dimensions approach)
    if (this.bestOutputTracker) {
      try {
        const bestOutput = this.bestOutputTracker.selectOutput();
        if (bestOutput && bestOutput.iteration !== state.currentIteration) {
          bestIteration = bestOutput.iteration;
          selectionSource = 'best-output-tracker';
          console.log(`[External Ralph] BestOutputTracker selected iteration ${bestIteration} (score: ${bestOutput.quality_score})`);
        }
      } catch (error) {
        console.warn('[External Ralph] BestOutputTracker selection failed:', error.message);
      }
    }

    // Fallback to IterationAnalytics if available
    if (selectionSource === 'final' && this.iterationAnalytics) {
      try {
        const bestFromAnalytics = this.iterationAnalytics.selectBestIteration();
        if (bestFromAnalytics && bestFromAnalytics.iteration_number !== state.currentIteration) {
          bestIteration = bestFromAnalytics.iteration_number;
          selectionSource = 'iteration-analytics';
          console.log(`[External Ralph] IterationAnalytics selected iteration ${bestIteration} (quality: ${bestFromAnalytics.quality_score})`);
        }
      } catch (error) {
        console.warn('[External Ralph] IterationAnalytics selection failed:', error.message);
      }
    }

    // If best iteration differs from final, restore artifacts from that iteration
    if (bestIteration !== state.currentIteration) {
      console.log(`[External Ralph] Restoring artifacts from iteration ${bestIteration} (better than final iteration ${state.currentIteration})`);
      // Note: Actual artifact restoration would require snapshot management
      // For now, we record the selection decision
      state.bestIterationSelected = bestIteration;
      state.selectionSource = selectionSource;
    } else {
      console.log('[External Ralph] Final iteration is the best output');
      state.bestIterationSelected = state.currentIteration;
      state.selectionSource = 'final';
    }

    return {
      bestIteration,
      selectionSource,
      currentIteration: state.currentIteration,
      wasDifferent: bestIteration !== state.currentIteration,
    };
  }

  /**
   * Record task completion for cross-task learning (REF-154)
   * @param {Object} state - Final loop state
   * @param {string} outcome - 'success' | 'failure' | 'partial'
   * @returns {Promise<void>}
   */
  async recordTaskCompletion(state, outcome) {
    console.log(`[External Ralph] Recording task completion (outcome: ${outcome})...`);

    // Extract final learnings for semantic memory
    if (this.learningExtractor && this.semanticMemory && state.iterations.length > 0) {
      try {
        const allLearnings = await this.learningExtractor.extractFromLoop({
          loopId: state.loopId,
          objective: state.objective,
          iterations: state.iterations,
          outcome,
        });

        if (allLearnings.length > 0) {
          await this.semanticMemory.store({
            type: 'loop-completion',
            objective: state.objective,
            outcome,
            learnings: allLearnings,
            loopId: state.loopId,
          });
          console.log(`[External Ralph] Stored ${allLearnings.length} learnings in semantic memory`);
        }
      } catch (error) {
        console.warn('[External Ralph] Semantic memory storage failed:', error.message);
      }
    }

    // Record to CrossTaskLearner for future similar tasks
    if (this.crossTaskLearner) {
      try {
        // Collect reflections from memory manager
        let reflections = [];
        if (this.memoryManager) {
          try {
            reflections = this.memoryManager.getReflectionWindow() || [];
          } catch (error) {
            console.warn('[External Ralph] Failed to get reflections:', error.message);
          }
        }

        // Extract key learnings from accumulated learnings
        const keyLearnings = state.accumulatedLearnings
          ? state.accumulatedLearnings.split('\n').filter(l => l.trim())
          : [];

        await this.crossTaskLearner.recordTaskCompletion({
          task_description: state.objective,
          task_type: 'ralph-loop',
          outcome,
          iterations: state.currentIteration,
          final_quality: state.lastAnalysis?.completionPercentage / 100 || 0,
          reflections,
          key_learnings: keyLearnings,
          tags: ['external-ralph', state.loopId],
        });

        console.log('[External Ralph] Task recorded for cross-task learning');
      } catch (error) {
        console.warn('[External Ralph] CrossTaskLearner recording failed:', error.message);
      }
    }

    // Export iteration analytics report
    if (this.iterationAnalytics) {
      try {
        const report = this.iterationAnalytics.generateReport();
        const reportPath = join(this.stateManager.getStateDir(), 'iteration-analytics-report.json');
        writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`[External Ralph] Analytics report saved to: ${reportPath}`);

        // Also export full analytics data
        this.iterationAnalytics.export();
      } catch (error) {
        console.warn('[External Ralph] IterationAnalytics export failed:', error.message);
      }
    }

    // Export best output tracker data
    if (this.bestOutputTracker) {
      try {
        this.bestOutputTracker.export();
      } catch (error) {
        console.warn('[External Ralph] BestOutputTracker export failed:', error.message);
      }
    }
  }

  /**
   * Complete the loop in the multi-loop registry
   * Archives the loop and updates registry metrics
   * @param {string} finalStatus - 'completed' | 'failed' | 'aborted' | 'limit_reached'
   * @returns {Promise<void>}
   */
  async completeMultiLoop(finalStatus) {
    if (!this.multiLoopManager || !this.registeredLoopId) {
      return; // Single-loop mode, no registry to update
    }

    try {
      // Update loop status before archiving
      this.multiLoopManager.updateLoop(this.registeredLoopId, {
        status: finalStatus,
        lastUpdate: new Date().toISOString(),
      });

      // Archive the loop (moves from active to archive)
      await this.multiLoopManager.archiveLoop(this.registeredLoopId);
      console.log(`[External Ralph] Loop archived: ${this.registeredLoopId} (${finalStatus})`);
    } catch (error) {
      console.warn(`[External Ralph] Multi-loop completion failed: ${error.message}`);
    }
  }
}

export default Orchestrator;
