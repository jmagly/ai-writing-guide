/**
 * Memory Promotion Pipeline for External Ralph Loop
 *
 * Promotes learnings from L2 (episodic/loop memory) to L3 (semantic memory).
 * Validates learnings before promotion and maintains staging area.
 *
 * Pipeline: L2 Extract → Validate → Stage → Promote → L3
 *
 * @implements @.aiwg/working/issue-ralph-external-completion.md Section L3
 * @issue #24
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';
import { LearningExtractor } from './learning-extractor.mjs';
import { SemanticMemory } from './semantic-memory.mjs';

/**
 * @typedef {Object} StagedLearning
 * @property {string} id - Staging ID
 * @property {Object} learning - Extracted learning
 * @property {string} status - pending|validated|rejected
 * @property {string} stagedAt - ISO timestamp
 * @property {string} [validatedAt] - ISO timestamp
 * @property {string} [rejectionReason] - Reason if rejected
 */

/**
 * @typedef {Object} StagingArea
 * @property {string} version - Schema version
 * @property {string} checksum - SHA-256 checksum
 * @property {string} lastUpdated - Last update timestamp
 * @property {StagedLearning[]} staged - Staged learnings
 */

const STAGING_VERSION = '1.0.0';
const DEFAULT_STAGING_PATH = join(process.cwd(), '.aiwg', 'knowledge');

export class MemoryPromotion {
  /**
   * @param {string} [knowledgeDir] - Knowledge directory
   */
  constructor(knowledgeDir = DEFAULT_STAGING_PATH) {
    this.knowledgeDir = knowledgeDir;
    this.stagingPath = join(knowledgeDir, 'staging.json');
    this.extractor = new LearningExtractor();
    this.semanticMemory = new SemanticMemory(knowledgeDir);
    this.ensureKnowledgeDir();
  }

  /**
   * Ensure knowledge directory exists
   */
  ensureKnowledgeDir() {
    if (!existsSync(this.knowledgeDir)) {
      mkdirSync(this.knowledgeDir, { recursive: true });
    }
  }

  /**
   * Calculate checksum for integrity
   * @param {StagedLearning[]} staged - Staged learnings
   * @returns {string}
   */
  calculateChecksum(staged) {
    const content = JSON.stringify(staged, null, 0);
    return createHash('sha256').update(content).digest('hex');
  }

  /**
   * Load staging area
   * @returns {StagingArea}
   */
  loadStaging() {
    if (!existsSync(this.stagingPath)) {
      return this.initializeStaging();
    }

    try {
      const content = readFileSync(this.stagingPath, 'utf8');
      const staging = JSON.parse(content);

      // Verify checksum
      const expectedChecksum = this.calculateChecksum(staging.staged);
      if (staging.checksum !== expectedChecksum) {
        console.warn('Staging checksum mismatch - reinitializing');
        return this.initializeStaging();
      }

      return staging;
    } catch (e) {
      console.error('Failed to load staging area:', e.message);
      return this.initializeStaging();
    }
  }

  /**
   * Initialize empty staging area
   * @returns {StagingArea}
   */
  initializeStaging() {
    const staging = {
      version: STAGING_VERSION,
      checksum: this.calculateChecksum([]),
      lastUpdated: new Date().toISOString(),
      staged: [],
    };

    this.saveStaging(staging);
    return staging;
  }

  /**
   * Save staging area
   * @param {StagingArea} staging
   */
  saveStaging(staging) {
    this.ensureKnowledgeDir();

    staging.lastUpdated = new Date().toISOString();
    staging.checksum = this.calculateChecksum(staging.staged);

    // Atomic write
    const tempPath = `${this.stagingPath}.tmp`;
    writeFileSync(tempPath, JSON.stringify(staging, null, 2));

    const fs = require('fs');
    fs.renameSync(tempPath, this.stagingPath);
  }

  /**
   * Extract learnings from completed loop and stage them
   * @param {Object} loopState - Completed loop state
   * @returns {{extracted: number, staged: number}}
   */
  extract(loopState) {
    // Extract learnings using LearningExtractor
    const learnings = this.extractor.extractFromLoop(loopState);

    // Stage each learning
    const staging = this.loadStaging();
    let stagedCount = 0;

    for (const learning of learnings) {
      const staged = {
        id: `stage-${Date.now()}-${stagedCount}`,
        learning,
        status: 'pending',
        stagedAt: new Date().toISOString(),
      };

      staging.staged.push(staged);
      stagedCount++;
    }

    this.saveStaging(staging);

    return {
      extracted: learnings.length,
      staged: stagedCount,
    };
  }

  /**
   * Validate a staged learning
   * @param {Object} learning - Extracted learning
   * @returns {{valid: boolean, reason?: string}}
   */
  validate(learning) {
    // Check required fields
    if (!learning.type || !learning.taskType || !learning.content) {
      return {
        valid: false,
        reason: 'Missing required fields (type, taskType, content)',
      };
    }

    // Check type is valid
    const validTypes = ['strategy', 'antipattern', 'estimate', 'convention'];
    if (!validTypes.includes(learning.type)) {
      return {
        valid: false,
        reason: `Invalid type: ${learning.type}`,
      };
    }

    // Check confidence is valid
    if (learning.confidence < 0 || learning.confidence > 1) {
      return {
        valid: false,
        reason: 'Confidence must be between 0 and 1',
      };
    }

    // Check success rate is valid
    if (learning.successRate < 0 || learning.successRate > 1) {
      return {
        valid: false,
        reason: 'Success rate must be between 0 and 1',
      };
    }

    // Minimum confidence threshold
    if (learning.confidence < 0.3) {
      return {
        valid: false,
        reason: 'Confidence too low (< 0.3)',
      };
    }

    // Anti-patterns should have low success rate
    if (learning.type === 'antipattern' && learning.successRate > 0.2) {
      return {
        valid: false,
        reason: 'Anti-patterns should have low success rate',
      };
    }

    // Strategies should have reasonable success rate
    if (learning.type === 'strategy' && learning.successRate < 0.5) {
      return {
        valid: false,
        reason: 'Strategies should have success rate >= 0.5',
      };
    }

    return { valid: true };
  }

  /**
   * Validate all pending staged learnings
   * @returns {{validated: number, rejected: number}}
   */
  validateStaged() {
    const staging = this.loadStaging();
    let validated = 0;
    let rejected = 0;

    for (const staged of staging.staged) {
      if (staged.status !== 'pending') {
        continue;
      }

      const validation = this.validate(staged.learning);

      if (validation.valid) {
        staged.status = 'validated';
        staged.validatedAt = new Date().toISOString();
        validated++;
      } else {
        staged.status = 'rejected';
        staged.rejectionReason = validation.reason;
        rejected++;
      }
    }

    this.saveStaging(staging);

    return { validated, rejected };
  }

  /**
   * Promote validated learnings to semantic memory
   * @param {Object} options - Promotion options
   * @param {boolean} options.autoValidate - Auto-validate before promotion
   * @param {boolean} options.clearAfter - Clear staging after promotion
   * @returns {{promoted: number, skipped: number}}
   */
  promote(options = {}) {
    const { autoValidate = true, clearAfter = true } = options;

    // Auto-validate if requested
    if (autoValidate) {
      this.validateStaged();
    }

    const staging = this.loadStaging();
    let promoted = 0;
    let skipped = 0;

    const validatedLearnings = staging.staged.filter(s => s.status === 'validated');

    for (const staged of validatedLearnings) {
      try {
        // Store in semantic memory
        this.semanticMemory.store(
          staged.learning.type,
          staged.learning.taskType,
          staged.learning.content,
          {
            confidence: staged.learning.confidence,
            sourceLoops: staged.learning.sourceLoops,
            successRate: staged.learning.successRate,
          }
        );

        promoted++;
      } catch (e) {
        console.error('Failed to promote learning:', e.message);
        skipped++;
      }
    }

    // Clear staged learnings if requested
    if (clearAfter) {
      staging.staged = staging.staged.filter(s => s.status !== 'validated');
      this.saveStaging(staging);
    }

    return { promoted, skipped };
  }

  /**
   * Process entire pipeline: extract → validate → promote
   * @param {Object} loopState - Completed loop state
   * @param {Object} options - Pipeline options
   * @returns {Object} Pipeline results
   */
  processPipeline(loopState, options = {}) {
    // Extract
    const extractResult = this.extract(loopState);

    // Validate
    const validateResult = this.validateStaged();

    // Promote
    const promoteResult = this.promote(options);

    return {
      extracted: extractResult.extracted,
      validated: validateResult.validated,
      rejected: validateResult.rejected,
      promoted: promoteResult.promoted,
      skipped: promoteResult.skipped,
    };
  }

  /**
   * Get staging area statistics
   * @returns {Object}
   */
  getStagingStats() {
    const staging = this.loadStaging();

    const stats = {
      total: staging.staged.length,
      pending: 0,
      validated: 0,
      rejected: 0,
    };

    for (const staged of staging.staged) {
      if (staged.status === 'pending') stats.pending++;
      else if (staged.status === 'validated') stats.validated++;
      else if (staged.status === 'rejected') stats.rejected++;
    }

    return stats;
  }

  /**
   * Clear all staging area
   */
  clearStaging() {
    const staging = this.initializeStaging();
    this.saveStaging(staging);
  }
}

export default MemoryPromotion;
