/**
 * Memory Retrieval for External Ralph Loop
 *
 * Retrieves relevant knowledge from L3 semantic memory for prompt generation.
 * Ranks learnings by relevance, recency, and effectiveness.
 *
 * @implements @.aiwg/working/issue-ralph-external-completion.md Section L3
 * @issue #24
 */

import { SemanticMemory } from './semantic-memory.mjs';

/**
 * @typedef {Object} RetrievalContext
 * @property {string} objective - Task objective
 * @property {string} taskType - Detected task type
 * @property {string[]} [filePatterns] - File patterns being worked on
 * @property {string[]} [errorPatterns] - Error patterns encountered
 * @property {number} [iteration] - Current iteration number
 */

/**
 * @typedef {Object} RelevantKnowledge
 * @property {Object[]} strategies - Relevant strategies
 * @property {Object[]} antipatterns - Relevant anti-patterns
 * @property {Object[]} estimates - Relevant estimates
 * @property {Object[]} conventions - Relevant conventions
 * @property {string} summary - Formatted summary for prompt
 */

export class MemoryRetrieval {
  /**
   * @param {string} [knowledgeDir] - Knowledge directory
   */
  constructor(knowledgeDir) {
    this.semanticMemory = new SemanticMemory(knowledgeDir);

    // Task type detection patterns (similar to LearningExtractor)
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
   * Detect task type from objective
   * @param {string} objective - Task objective
   * @returns {string}
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
   * Get relevant knowledge for current context
   * @param {RetrievalContext} context - Retrieval context
   * @returns {RelevantKnowledge}
   */
  getRelevantKnowledge(context) {
    const taskType = context.taskType || this.detectTaskType(context.objective);

    // Query for strategies
    const strategies = this.semanticMemory.query({
      type: 'strategy',
      taskType,
      minConfidence: 0.5,
      minSuccessRate: 0.6,
      limit: 3,
    });

    // Query for anti-patterns
    const antipatterns = this.getAntiPatterns(context);

    // Query for estimates
    const estimates = this.semanticMemory.query({
      type: 'estimate',
      taskType,
      minConfidence: 0.4,
      limit: 2,
    });

    // Query for conventions
    const conventions = this.semanticMemory.query({
      type: 'convention',
      minConfidence: 0.5,
      limit: 3,
    });

    // Generate formatted summary
    const summary = this.formatSummary({
      strategies,
      antipatterns,
      estimates,
      conventions,
    });

    return {
      strategies,
      antipatterns,
      estimates,
      conventions,
      summary,
    };
  }

  /**
   * Get anti-patterns relevant to context
   * @param {RetrievalContext} context - Retrieval context
   * @returns {Object[]}
   */
  getAntiPatterns(context) {
    const taskType = context.taskType || this.detectTaskType(context.objective);

    // Query all anti-patterns for this task type
    const allAntipatterns = this.semanticMemory.query({
      type: 'antipattern',
      taskType,
      minConfidence: 0.4,
    });

    // If we have error patterns, boost matching anti-patterns
    if (context.errorPatterns && context.errorPatterns.length > 0) {
      // Score anti-patterns by error pattern match
      const scored = allAntipatterns.map(ap => {
        let score = ap.confidence;

        for (const errorPattern of context.errorPatterns) {
          const apDesc = ap.content.description.toLowerCase();
          if (apDesc.includes(errorPattern.toLowerCase())) {
            score += 0.3; // Boost for error match
          }
        }

        return { ...ap, score };
      });

      // Sort by score and return top matches
      scored.sort((a, b) => b.score - a.score);
      return scored.slice(0, 5);
    }

    // Otherwise return top anti-patterns by confidence
    return allAntipatterns.slice(0, 5);
  }

  /**
   * Get file organization conventions
   * @param {string[]} filePatterns - File patterns
   * @returns {Object[]}
   */
  getFileConventions(filePatterns) {
    const conventions = this.semanticMemory.query({
      type: 'convention',
      minConfidence: 0.5,
      limit: 5,
    });

    // Filter to relevant conventions if file patterns provided
    if (filePatterns && filePatterns.length > 0) {
      return conventions.filter(conv => {
        const examples = conv.content.examples || [];
        return examples.some(ex =>
          filePatterns.some(pattern => ex.includes(pattern))
        );
      });
    }

    return conventions;
  }

  /**
   * Get time/iteration estimates
   * @param {string} taskType - Task type
   * @param {string} complexity - low|medium|high
   * @returns {Object|null}
   */
  getEstimate(taskType, complexity = 'medium') {
    const estimates = this.semanticMemory.query({
      type: 'estimate',
      taskType,
      minConfidence: 0.4,
      limit: 5,
    });

    if (estimates.length === 0) {
      return null;
    }

    // Find estimate matching complexity
    const matching = estimates.find(
      est => est.content.complexity === complexity
    );

    if (matching) {
      return matching;
    }

    // Return highest confidence estimate if no complexity match
    return estimates[0];
  }

  /**
   * Format knowledge summary for prompt injection
   * @param {Object} knowledge - Retrieved knowledge
   * @returns {string}
   */
  formatSummary(knowledge) {
    const sections = [];

    // Strategies section
    if (knowledge.strategies.length > 0) {
      sections.push('## Proven Strategies\n');
      for (const strategy of knowledge.strategies) {
        sections.push(
          `- ${strategy.content.description} ` +
          `(effectiveness: ${(strategy.content.effectiveness * 100).toFixed(0)}%)\n`
        );
      }
    }

    // Anti-patterns section
    if (knowledge.antipatterns.length > 0) {
      sections.push('\n## Anti-Patterns to Avoid\n');
      for (const ap of knowledge.antipatterns) {
        sections.push(`- ${ap.content.description}\n`);
      }
    }

    // Estimates section
    if (knowledge.estimates.length > 0) {
      sections.push('\n## Time/Iteration Estimates\n');
      for (const est of knowledge.estimates) {
        const avgTime = Math.round(est.content.avgIterationTime / 1000);
        sections.push(
          `- Similar tasks: ~${est.content.totalIterations} iterations, ` +
          `~${avgTime}s per iteration\n`
        );
      }
    }

    // Conventions section
    if (knowledge.conventions.length > 0) {
      sections.push('\n## Project Conventions\n');
      for (const conv of knowledge.conventions) {
        sections.push(`- ${conv.content.pattern}\n`);
        if (conv.content.examples && conv.content.examples.length > 0) {
          sections.push(`  Examples: ${conv.content.examples.join(', ')}\n`);
        }
      }
    }

    if (sections.length === 0) {
      return '## Knowledge Base\n\nNo relevant learnings found for this task type.\n';
    }

    return '## Knowledge Base (from previous loops)\n\n' + sections.join('');
  }

  /**
   * Calculate relevance score for a learning
   * @param {Object} learning - Learning object
   * @param {RetrievalContext} context - Context
   * @returns {number} Relevance score 0-1
   */
  calculateRelevance(learning, context) {
    let score = learning.confidence * 0.4; // Base confidence

    // Task type match
    const taskType = context.taskType || this.detectTaskType(context.objective);
    if (learning.taskType === taskType) {
      score += 0.3;
    }

    // Success rate contribution
    score += learning.successRate * 0.2;

    // Recency bonus (favor recent learnings)
    const ageMs = Date.now() - new Date(learning.updatedAt).getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    const recencyBonus = Math.max(0, (90 - ageDays) / 90) * 0.1;
    score += recencyBonus;

    return Math.min(score, 1.0);
  }

  /**
   * Get top learnings ranked by relevance
   * @param {RetrievalContext} context - Context
   * @param {number} limit - Maximum learnings
   * @returns {Object[]}
   */
  getTopLearnings(context, limit = 10) {
    const store = this.semanticMemory.load();

    // Score all learnings
    const scored = store.learnings.map(learning => ({
      ...learning,
      relevance: this.calculateRelevance(learning, context),
    }));

    // Sort by relevance
    scored.sort((a, b) => b.relevance - a.relevance);

    return scored.slice(0, limit);
  }
}

export default MemoryRetrieval;
