/**
 * Learning Extractor for External Ralph Loop
 *
 * Extracts actionable learnings from completed loop iterations,
 * identifying successful strategies, anti-patterns, and estimates.
 *
 * @implements @.aiwg/working/issue-ralph-external-completion.md Section L3
 * @issue #24
 */

/**
 * @typedef {Object} IterationRecord
 * @property {number} number - Iteration number
 * @property {string} status - completed|failed|crashed
 * @property {number} duration - Duration in milliseconds
 * @property {Object} analysis - Output analysis result
 * @property {string[]} learnings - Extracted learnings
 * @property {string[]} filesModified - Files changed
 * @property {string} progress - Progress summary
 */

/**
 * @typedef {Object} LoopHistory
 * @property {string} loopId - Loop ID
 * @property {string} objective - Task objective
 * @property {string} status - Loop status
 * @property {number} currentIteration - Final iteration
 * @property {IterationRecord[]} iterations - All iterations
 */

/**
 * @typedef {Object} ExtractedLearning
 * @property {string} type - strategy|antipattern|estimate|convention
 * @property {string} taskType - Detected task type
 * @property {Object} content - Learning content
 * @property {number} confidence - Confidence 0.0-1.0
 * @property {string[]} sourceLoops - Source loop IDs
 * @property {number} successRate - Success rate
 */

export class LearningExtractor {
  constructor() {
    // Task type detection patterns
    this.taskPatterns = {
      'test-fix': /test|spec|jest|vitest|failing/i,
      'feature': /implement|add feature|new feature|build/i,
      'refactor': /refactor|reorganize|restructure|clean/i,
      'bug-fix': /fix|bug|error|crash|issue/i,
      'documentation': /document|readme|guide|docs/i,
      'architecture': /architecture|design|structure/i,
      'performance': /optimize|performance|speed|slow/i,
    };
  }

  /**
   * Extract all learnings from completed loop
   * @param {LoopHistory} loopHistory - Completed loop history
   * @returns {ExtractedLearning[]}
   */
  extractFromLoop(loopHistory) {
    const learnings = [];

    // Detect task type
    const taskType = this.detectTaskType(loopHistory.objective);

    // Extract strategies from successful iterations
    const strategies = this.extractStrategies(loopHistory, taskType);
    learnings.push(...strategies);

    // Extract anti-patterns from failed attempts
    const antipatterns = this.identifyAntiPatterns(loopHistory.iterations, taskType);
    learnings.push(...antipatterns);

    // Extract time/iteration estimates
    const estimates = this.extractEstimates(loopHistory, taskType);
    learnings.push(...estimates);

    // Extract project conventions from file patterns
    const conventions = this.extractConventions(loopHistory);
    learnings.push(...conventions);

    return learnings;
  }

  /**
   * Detect task type from objective
   * @param {string} objective - Task objective
   * @returns {string} Task type
   */
  detectTaskType(objective) {
    for (const [type, pattern] of Object.entries(this.taskPatterns)) {
      if (pattern.test(objective)) {
        return type;
      }
    }
    return 'general';
  }

  /**
   * Extract successful strategies
   * @param {LoopHistory} loopHistory - Loop history
   * @param {string} taskType - Task type
   * @returns {ExtractedLearning[]}
   */
  extractStrategies(loopHistory, taskType) {
    const strategies = [];

    // Look for successful patterns in completed iterations
    const successfulIterations = loopHistory.iterations.filter(
      iter => iter.status === 'completed' && iter.analysis?.progressMade
    );

    if (successfulIterations.length === 0) {
      return strategies;
    }

    // Extract common approaches from successful iterations
    const approaches = new Map();

    for (const iteration of successfulIterations) {
      // Extract approach from learnings
      if (iteration.learnings) {
        for (const learning of iteration.learnings) {
          const key = this.normalizeApproach(learning);
          if (key) {
            const count = approaches.get(key) || 0;
            approaches.set(key, count + 1);
          }
        }
      }
    }

    // Convert frequent approaches to strategies
    const totalSuccessful = successfulIterations.length;
    for (const [approach, count] of approaches.entries()) {
      if (count / totalSuccessful >= 0.5) { // Used in >50% of successful iterations
        strategies.push({
          type: 'strategy',
          taskType,
          content: {
            description: approach,
            effectiveness: count / totalSuccessful,
            iterations: count,
          },
          confidence: Math.min(count / totalSuccessful, 0.9),
          sourceLoops: [loopHistory.loopId],
          successRate: count / totalSuccessful,
        });
      }
    }

    return strategies;
  }

  /**
   * Identify anti-patterns from failures
   * @param {IterationRecord[]} iterations - All iterations
   * @param {string} taskType - Task type
   * @returns {ExtractedLearning[]}
   */
  identifyAntiPatterns(iterations, taskType) {
    const antipatterns = [];

    // Look for failed attempts
    const failedIterations = iterations.filter(iter => iter.status === 'failed');

    if (failedIterations.length === 0) {
      return antipatterns;
    }

    // Detect common failure patterns
    const failurePatterns = new Map();

    for (const iteration of failedIterations) {
      // Analyze failure reasons
      if (iteration.analysis?.errors) {
        for (const error of iteration.analysis.errors) {
          const pattern = this.categorizeError(error);
          if (pattern) {
            const count = failurePatterns.get(pattern) || 0;
            failurePatterns.set(pattern, count + 1);
          }
        }
      }
    }

    // Convert frequent failures to anti-patterns
    for (const [pattern, count] of failurePatterns.entries()) {
      if (count >= 2) { // Occurred at least twice
        antipatterns.push({
          type: 'antipattern',
          taskType,
          content: {
            description: `Avoid: ${pattern}`,
            occurrences: count,
            impact: 'high',
          },
          confidence: Math.min(count / failedIterations.length, 0.8),
          sourceLoops: [],
          successRate: 0.0,
        });
      }
    }

    return antipatterns;
  }

  /**
   * Extract time/iteration estimates
   * @param {LoopHistory} loopHistory - Loop history
   * @param {string} taskType - Task type
   * @returns {ExtractedLearning[]}
   */
  extractEstimates(loopHistory, taskType) {
    const estimates = [];

    const completedIterations = loopHistory.iterations.filter(
      iter => iter.status === 'completed'
    );

    if (completedIterations.length === 0) {
      return estimates;
    }

    // Calculate average duration
    const totalDuration = completedIterations.reduce((sum, iter) => sum + iter.duration, 0);
    const avgDuration = totalDuration / completedIterations.length;

    // Calculate complexity indicator
    const complexity = this.estimateComplexity(loopHistory);

    estimates.push({
      type: 'estimate',
      taskType,
      content: {
        avgIterationTime: avgDuration,
        totalIterations: loopHistory.currentIteration,
        complexity,
        successRate: completedIterations.length / loopHistory.iterations.length,
      },
      confidence: Math.min(completedIterations.length / 5, 0.9),
      sourceLoops: [loopHistory.loopId],
      successRate: completedIterations.length / loopHistory.iterations.length,
    });

    return estimates;
  }

  /**
   * Extract project conventions from file patterns
   * @param {LoopHistory} loopHistory - Loop history
   * @returns {ExtractedLearning[]}
   */
  extractConventions(loopHistory) {
    const conventions = [];

    // Aggregate all files modified
    const allFiles = new Set();
    for (const iteration of loopHistory.iterations) {
      if (iteration.filesModified) {
        for (const file of iteration.filesModified) {
          allFiles.add(file);
        }
      }
    }

    // Detect file organization patterns
    const patterns = this.detectFilePatterns(Array.from(allFiles));

    for (const pattern of patterns) {
      conventions.push({
        type: 'convention',
        taskType: 'general',
        content: {
          pattern: pattern.description,
          examples: pattern.examples,
        },
        confidence: pattern.confidence,
        sourceLoops: [loopHistory.loopId],
        successRate: 1.0,
      });
    }

    return conventions;
  }

  /**
   * Normalize approach description for grouping
   * @param {string} learning - Learning text
   * @returns {string|null} Normalized approach
   */
  normalizeApproach(learning) {
    // Extract key phrases
    const lowerLearning = learning.toLowerCase();

    // Common patterns - check for "test" and "first" together
    if (lowerLearning.includes('test-driven') || (lowerLearning.includes('test') && lowerLearning.includes('first'))) {
      return 'Test-driven development approach';
    }
    if (lowerLearning.includes('incremental') || lowerLearning.includes('step by step')) {
      return 'Incremental implementation';
    }
    if (lowerLearning.includes('refactor') && lowerLearning.includes('after')) {
      return 'Implement first, refactor after';
    }
    if (lowerLearning.includes('small change') || lowerLearning.includes('minimal')) {
      return 'Minimal changes approach';
    }

    // Return original if no pattern matches
    return learning.length > 10 ? learning.slice(0, 100) : null;
  }

  /**
   * Categorize error for anti-pattern detection
   * @param {string} error - Error message
   * @returns {string|null} Error category
   */
  categorizeError(error) {
    const lowerError = error.toLowerCase();

    if (lowerError.includes('syntax') || lowerError.includes('parse')) {
      return 'Syntax errors - check code carefully before execution';
    }
    if (lowerError.includes('undefined') || lowerError.includes('null')) {
      return 'Null/undefined errors - add validation checks';
    }
    if (lowerError.includes('timeout') || lowerError.includes('timed out')) {
      return 'Timeout errors - break into smaller steps';
    }
    if (lowerError.includes('permission') || lowerError.includes('access denied')) {
      return 'Permission errors - check file/directory permissions';
    }
    // Check for "cannot find module" or both "module" and "not found"
    if (lowerError.includes('cannot find module') || (lowerError.includes('module') && lowerError.includes('not found'))) {
      return 'Module not found - verify dependencies installed';
    }

    return error.length > 10 ? error.slice(0, 100) : null;
  }

  /**
   * Estimate task complexity
   * @param {LoopHistory} loopHistory - Loop history
   * @returns {string} low|medium|high
   */
  estimateComplexity(loopHistory) {
    const iterations = loopHistory.currentIteration;
    const filesModified = new Set();

    for (const iter of loopHistory.iterations) {
      if (iter.filesModified) {
        iter.filesModified.forEach(f => filesModified.add(f));
      }
    }

    const fileCount = filesModified.size;

    // Simple heuristic
    if (iterations <= 2 && fileCount <= 2) {
      return 'low';
    } else if (iterations <= 5 && fileCount <= 5) {
      return 'medium';
    } else {
      return 'high';
    }
  }

  /**
   * Detect file organization patterns
   * @param {string[]} files - File paths
   * @returns {Array<{description: string, examples: string[], confidence: number}>}
   */
  detectFilePatterns(files) {
    const patterns = [];

    // Test file patterns
    const testFiles = files.filter(f => f.includes('.test.') || f.includes('.spec.'));
    if (testFiles.length > 0) {
      patterns.push({
        description: 'Tests co-located with source or in test/ directory',
        examples: testFiles.slice(0, 3),
        confidence: 0.7,
      });
    }

    // TypeScript/JavaScript module patterns
    const moduleFiles = files.filter(f => f.endsWith('.mjs') || f.endsWith('.ts'));
    if (moduleFiles.length > 0) {
      patterns.push({
        description: 'ES modules (.mjs) or TypeScript (.ts)',
        examples: moduleFiles.slice(0, 3),
        confidence: 0.8,
      });
    }

    return patterns;
  }
}

export default LearningExtractor;
