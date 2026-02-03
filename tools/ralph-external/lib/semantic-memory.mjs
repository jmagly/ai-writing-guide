/**
 * L3 Semantic Memory for External Ralph Loop
 *
 * Persistent cross-loop knowledge store that accumulates learnings across
 * multiple loop executions. Stores proven strategies, anti-patterns,
 * project conventions, and time/iteration estimates.
 *
 * Memory Levels:
 * - L1: Working Memory (Claude session) - Temporary
 * - L2: Episodic Memory (loop state) - Single loop history
 * - L3: Semantic Memory (this) - Cross-loop persistent knowledge
 *
 * @implements @.aiwg/working/issue-ralph-external-completion.md Section L3
 * @schema @agentic/code/addons/ralph/schemas/semantic-memory.yaml
 * @issue #24
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { createHash } from 'crypto';

/**
 * @typedef {Object} Learning
 * @property {string} id - Unique learning ID (learn-xxx)
 * @property {string} type - strategy|antipattern|estimate|convention
 * @property {string} taskType - test-fix|feature|refactor|bug-fix
 * @property {Object} content - Learning content (type-specific)
 * @property {number} confidence - Confidence score 0.0-1.0
 * @property {string[]} sourceLoops - Loop IDs this learning came from
 * @property {string} createdAt - ISO timestamp
 * @property {string} updatedAt - ISO timestamp
 * @property {number} useCount - Times this learning was retrieved
 * @property {number} successRate - Success rate 0.0-1.0
 */

/**
 * @typedef {Object} SemanticMemoryStore
 * @property {string} version - Schema version
 * @property {string} checksum - SHA-256 checksum for corruption detection
 * @property {string} lastUpdated - Last update timestamp
 * @property {Learning[]} learnings - All learnings
 * @property {Object} stats - Statistics
 */

const SCHEMA_VERSION = '1.0.0';
const DEFAULT_KNOWLEDGE_PATH = join(process.cwd(), '.aiwg', 'knowledge');

export class SemanticMemory {
  /**
   * @param {string} [knowledgeDir] - Knowledge directory (defaults to .aiwg/knowledge)
   */
  constructor(knowledgeDir = DEFAULT_KNOWLEDGE_PATH) {
    this.knowledgeDir = knowledgeDir;
    this.storePath = join(knowledgeDir, 'ralph-learnings.json');
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
   * Calculate checksum of learnings for corruption detection
   * @param {Learning[]} learnings - Learnings array
   * @returns {string} SHA-256 checksum
   */
  calculateChecksum(learnings) {
    const content = JSON.stringify(learnings, null, 0);
    return createHash('sha256').update(content).digest('hex');
  }

  /**
   * Load semantic memory store with corruption detection
   * @returns {SemanticMemoryStore}
   */
  load() {
    if (!existsSync(this.storePath)) {
      // Initialize empty store
      return this.initializeStore();
    }

    try {
      const content = readFileSync(this.storePath, 'utf8');
      const store = JSON.parse(content);

      // Verify checksum
      const expectedChecksum = this.calculateChecksum(store.learnings);
      if (store.checksum !== expectedChecksum) {
        throw new Error('Checksum mismatch - data may be corrupted');
      }

      return store;
    } catch (e) {
      if (e.message.includes('Checksum mismatch')) {
        // Attempt recovery from backup if available
        const backupPath = `${this.storePath}.bak`;
        if (existsSync(backupPath)) {
          try {
            const backupContent = readFileSync(backupPath, 'utf8');
            const backupStore = JSON.parse(backupContent);

            // Verify backup checksum
            const backupChecksum = this.calculateChecksum(backupStore.learnings);
            if (backupStore.checksum === backupChecksum) {
              console.warn('Recovered from backup due to checksum mismatch');
              this.save(backupStore);
              return backupStore;
            }
          } catch (backupError) {
            console.error('Backup also corrupted:', backupError.message);
          }
        }
        throw new Error(`Knowledge store corrupted and backup recovery failed: ${e.message}`);
      }
      throw new Error(`Failed to load semantic memory: ${e.message}`);
    }
  }

  /**
   * Initialize empty store
   * @returns {SemanticMemoryStore}
   */
  initializeStore() {
    const store = {
      version: SCHEMA_VERSION,
      checksum: this.calculateChecksum([]),
      lastUpdated: new Date().toISOString(),
      learnings: [],
      stats: {
        totalLearnings: 0,
        byType: {
          strategy: 0,
          antipattern: 0,
          estimate: 0,
          convention: 0,
        },
        byTaskType: {},
      },
    };

    this.save(store);
    return store;
  }

  /**
   * Save semantic memory store atomically with backup
   * @param {SemanticMemoryStore} store
   */
  save(store) {
    this.ensureKnowledgeDir();

    // Update timestamp and stats
    store.lastUpdated = new Date().toISOString();
    store.stats.totalLearnings = store.learnings.length;

    // Recalculate type counts
    store.stats.byType = {
      strategy: 0,
      antipattern: 0,
      estimate: 0,
      convention: 0,
    };
    store.stats.byTaskType = {};

    for (const learning of store.learnings) {
      store.stats.byType[learning.type] = (store.stats.byType[learning.type] || 0) + 1;
      store.stats.byTaskType[learning.taskType] = (store.stats.byTaskType[learning.taskType] || 0) + 1;
    }

    // Calculate checksum
    store.checksum = this.calculateChecksum(store.learnings);

    // Create backup of existing store
    if (existsSync(this.storePath)) {
      const backupPath = `${this.storePath}.bak`;
      try {
        const currentContent = readFileSync(this.storePath, 'utf8');
        writeFileSync(backupPath, currentContent);
      } catch (e) {
        console.warn('Failed to create backup:', e.message);
      }
    }

    // Write atomically (temp file then rename)
    const tempPath = `${this.storePath}.tmp`;
    writeFileSync(tempPath, JSON.stringify(store, null, 2));

    // Atomic rename
    const fs = require('fs');
    fs.renameSync(tempPath, this.storePath);
  }

  /**
   * Store a new learning
   * @param {string} type - Learning type
   * @param {string} taskType - Task type
   * @param {Object} content - Learning content
   * @param {Object} metadata - Additional metadata
   * @returns {Learning}
   */
  store(type, taskType, content, metadata = {}) {
    const store = this.load();

    const learning = {
      id: `learn-${randomUUID().split('-')[0]}`,
      type,
      taskType,
      content,
      confidence: metadata.confidence || 0.5,
      sourceLoops: metadata.sourceLoops || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      useCount: 0,
      successRate: metadata.successRate || 0.0,
    };

    store.learnings.push(learning);
    this.save(store);

    return learning;
  }

  /**
   * Retrieve learning by ID
   * @param {string} id - Learning ID
   * @returns {Learning|null}
   */
  retrieve(id) {
    const store = this.load();
    const learning = store.learnings.find(l => l.id === id);

    if (learning) {
      // Increment use count
      learning.useCount++;
      learning.updatedAt = new Date().toISOString();
      this.save(store);
    }

    return learning || null;
  }

  /**
   * Query learnings by pattern
   * @param {Object} pattern - Query pattern
   * @param {string} [pattern.type] - Learning type filter
   * @param {string} [pattern.taskType] - Task type filter
   * @param {number} [pattern.minConfidence] - Minimum confidence
   * @param {number} [pattern.minSuccessRate] - Minimum success rate
   * @param {number} [pattern.limit] - Maximum results
   * @returns {Learning[]}
   */
  query(pattern = {}) {
    const store = this.load();
    let results = store.learnings;

    // Apply filters
    if (pattern.type) {
      results = results.filter(l => l.type === pattern.type);
    }

    if (pattern.taskType) {
      results = results.filter(l => l.taskType === pattern.taskType);
    }

    if (pattern.minConfidence !== undefined) {
      results = results.filter(l => l.confidence >= pattern.minConfidence);
    }

    if (pattern.minSuccessRate !== undefined) {
      results = results.filter(l => l.successRate >= pattern.minSuccessRate);
    }

    // Sort by confidence * successRate * useCount (weighted relevance)
    results.sort((a, b) => {
      const scoreA = a.confidence * (a.successRate || 0.5) * Math.log10(a.useCount + 1);
      const scoreB = b.confidence * (b.successRate || 0.5) * Math.log10(b.useCount + 1);
      return scoreB - scoreA;
    });

    // Apply limit
    if (pattern.limit) {
      results = results.slice(0, pattern.limit);
    }

    return results;
  }

  /**
   * Update learning metadata
   * @param {string} id - Learning ID
   * @param {Partial<Learning>} updates - Fields to update
   * @returns {Learning|null}
   */
  update(id, updates) {
    const store = this.load();
    const learning = store.learnings.find(l => l.id === id);

    if (!learning) {
      return null;
    }

    // Apply updates (prevent changing immutable fields)
    const immutableFields = ['id', 'createdAt', 'sourceLoops'];
    for (const [key, value] of Object.entries(updates)) {
      if (!immutableFields.includes(key)) {
        learning[key] = value;
      }
    }

    learning.updatedAt = new Date().toISOString();
    this.save(store);

    return learning;
  }

  /**
   * Delete learning by ID
   * @param {string} id - Learning ID
   * @returns {boolean} True if deleted
   */
  delete(id) {
    const store = this.load();
    const index = store.learnings.findIndex(l => l.id === id);

    if (index === -1) {
      return false;
    }

    store.learnings.splice(index, 1);
    this.save(store);

    return true;
  }

  /**
   * Get statistics about stored knowledge
   * @returns {Object}
   */
  getStats() {
    const store = this.load();
    return {
      ...store.stats,
      totalSize: store.learnings.length,
      lastUpdated: store.lastUpdated,
      averageConfidence: store.learnings.reduce((sum, l) => sum + l.confidence, 0) / (store.learnings.length || 1),
      averageSuccessRate: store.learnings.reduce((sum, l) => sum + l.successRate, 0) / (store.learnings.length || 1),
      mostUsedLearning: store.learnings.reduce((max, l) => l.useCount > max.useCount ? l : max, { useCount: 0 }),
    };
  }

  /**
   * Verify store integrity
   * @returns {{valid: boolean, error?: string}}
   */
  verify() {
    try {
      const store = this.load();
      const expectedChecksum = this.calculateChecksum(store.learnings);

      if (store.checksum !== expectedChecksum) {
        return {
          valid: false,
          error: 'Checksum mismatch - data may be corrupted',
        };
      }

      return { valid: true };
    } catch (e) {
      return {
        valid: false,
        error: e.message,
      };
    }
  }

  /**
   * Clear all learnings (DANGEROUS - for testing only)
   */
  clear() {
    const store = this.initializeStore();
    this.save(store);
  }
}

export default SemanticMemory;
