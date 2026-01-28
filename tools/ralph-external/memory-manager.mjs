/**
 * Memory Manager for External Ralph Loop
 *
 * Implements configurable memory capacity (Ω parameter) for Ralph reflection management.
 * Maintains a sliding window of past reflections following REF-021 Reflexion research.
 *
 * @implements @agentic/code/addons/ralph/schemas/cross-task-memory.yaml
 * @research @.aiwg/research/findings/REF-021-reflexion.md
 * @issue #170
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';

/**
 * @typedef {Object} Reflection
 * @property {number} iteration - Iteration number
 * @property {string} content - Reflection content
 * @property {string} type - Reflection type: error_analysis, strategy_change, success_pattern, constraint_discovery
 * @property {string} effectiveness - Effectiveness rating: helpful, neutral, unhelpful
 * @property {string} timestamp - ISO timestamp
 */

/**
 * @typedef {Object} MemoryConfig
 * @property {number} capacity - Current memory capacity (Ω)
 * @property {Object} presets - Preset capacity values
 * @property {number} presets.simple - Simple task capacity (1)
 * @property {number} presets.moderate - Moderate task capacity (3)
 * @property {number} presets.complex - Complex task capacity (5)
 * @property {number} presets.maximum - Maximum capacity (10)
 * @property {Object} autoScaling - Auto-scaling configuration
 * @property {boolean} autoScaling.enabled - Whether auto-scaling is enabled
 * @property {string[]} autoScaling.scaleUpOn - Conditions for scaling up
 * @property {string[]} autoScaling.scaleDownOn - Conditions for scaling down
 * @property {string} reflectionsPath - Path to reflections storage
 */

/**
 * @typedef {Object} PerformanceMetrics
 * @property {number} consecutiveFailures - Consecutive failure count
 * @property {number} averageQuality - Average quality score (0-1)
 * @property {number} convergenceRate - Iterations to completion
 */

const DEFAULT_CAPACITY = 3;
const PRESETS = {
  simple: 1,
  moderate: 3,
  complex: 5,
  maximum: 10
};

const REFLECTIONS_DIR = 'reflections';
const MEMORY_CONFIG_FILE = 'memory-config.json';

export class MemoryManager {
  /**
   * @param {Object} options - Memory manager options
   * @param {string} options.stateDir - State directory (.aiwg/ralph-external)
   * @param {number} [options.capacity=3] - Initial memory capacity (Ω)
   * @param {boolean} [options.autoScaling=false] - Enable auto-scaling
   */
  constructor(options = {}) {
    if (!options.stateDir) {
      throw new Error('stateDir is required');
    }

    this.stateDir = options.stateDir;
    this.reflectionsDir = join(this.stateDir, REFLECTIONS_DIR);
    this.configPath = join(this.stateDir, MEMORY_CONFIG_FILE);

    // Initialize configuration
    this.config = this.loadOrCreateConfig({
      capacity: options.capacity || DEFAULT_CAPACITY,
      autoScaling: options.autoScaling || false
    });

    // Reflection storage
    this.allReflections = [];
    this.activeWindow = [];

    // Performance tracking for auto-scaling
    this.performanceMetrics = {
      consecutiveFailures: 0,
      averageQuality: 0,
      convergenceRate: 0
    };

    this.ensureReflectionsDir();
  }

  /**
   * Load or create memory configuration
   * @private
   * @param {Object} defaults - Default configuration
   * @returns {MemoryConfig}
   */
  loadOrCreateConfig(defaults) {
    if (existsSync(this.configPath)) {
      try {
        const data = readFileSync(this.configPath, 'utf8');
        const loaded = JSON.parse(data);
        // Merge with defaults to ensure all fields exist
        return {
          ...this.getDefaultConfig(),
          ...loaded,
          capacity: loaded.capacity || defaults.capacity
        };
      } catch (error) {
        console.warn(`Failed to load memory config, using defaults: ${error.message}`);
      }
    }

    return this.getDefaultConfig(defaults);
  }

  /**
   * Get default configuration
   * @private
   * @param {Object} overrides - Override values
   * @returns {MemoryConfig}
   */
  getDefaultConfig(overrides = {}) {
    return {
      capacity: overrides.capacity || DEFAULT_CAPACITY,
      presets: { ...PRESETS },
      autoScaling: {
        enabled: overrides.autoScaling || false,
        scaleUpOn: ['consecutive_failures', 'low_quality_scores'],
        scaleDownOn: ['high_quality_maintained', 'fast_convergence']
      },
      reflectionsPath: this.reflectionsDir
    };
  }

  /**
   * Save configuration to disk
   * @private
   */
  saveConfig() {
    try {
      const data = JSON.stringify(this.config, null, 2);
      writeFileSync(this.configPath, data, 'utf8');
    } catch (error) {
      console.error(`Failed to save memory config: ${error.message}`);
    }
  }

  /**
   * Ensure reflections directory exists
   * @private
   */
  ensureReflectionsDir() {
    if (!existsSync(this.reflectionsDir)) {
      mkdirSync(this.reflectionsDir, { recursive: true });
    }
  }

  /**
   * Set memory capacity (Ω parameter)
   * @param {number|string} capacity - Capacity value or preset name
   * @returns {number} Actual capacity set
   */
  setCapacity(capacity) {
    let actualCapacity;

    if (typeof capacity === 'string') {
      // Use preset
      const preset = capacity.toLowerCase();
      if (!(preset in this.config.presets)) {
        throw new Error(`Unknown preset: ${capacity}. Valid: simple, moderate, complex, maximum`);
      }
      actualCapacity = this.config.presets[preset];
    } else if (typeof capacity === 'number') {
      if (capacity < 0) {
        throw new Error('Capacity must be non-negative');
      }
      if (capacity > this.config.presets.maximum) {
        console.warn(`Capacity ${capacity} exceeds maximum ${this.config.presets.maximum}, capping`);
        actualCapacity = this.config.presets.maximum;
      } else {
        actualCapacity = Math.floor(capacity);
      }
    } else {
      throw new Error('Capacity must be a number or preset name');
    }

    const previousCapacity = this.config.capacity;
    this.config.capacity = actualCapacity;
    this.saveConfig();

    // Trim active window if capacity decreased
    if (actualCapacity < this.activeWindow.length) {
      this.updateActiveWindow();
    }

    console.log(`Memory capacity changed: ${previousCapacity} → ${actualCapacity} (Ω=${actualCapacity})`);
    return actualCapacity;
  }

  /**
   * Get current memory capacity
   * @returns {number}
   */
  getCapacity() {
    return this.config.capacity;
  }

  /**
   * Add a reflection to memory
   * @param {Reflection} reflection - Reflection to add
   */
  addReflection(reflection) {
    // Validate reflection
    if (!reflection.iteration || !reflection.content || !reflection.type) {
      throw new Error('Reflection must have iteration, content, and type');
    }

    // Add timestamp if not present
    if (!reflection.timestamp) {
      reflection.timestamp = new Date().toISOString();
    }

    // Store in all reflections (permanent)
    this.allReflections.push(reflection);

    // Update active window (sliding)
    this.updateActiveWindow();

    // Persist to disk
    this.saveReflection(reflection);
  }

  /**
   * Update active window to maintain capacity constraint
   * @private
   */
  updateActiveWindow() {
    const capacity = this.config.capacity;

    if (capacity === 0) {
      this.activeWindow = [];
    } else if (this.allReflections.length <= capacity) {
      this.activeWindow = [...this.allReflections];
    } else {
      // Keep most recent Ω reflections
      this.activeWindow = this.allReflections.slice(-capacity);
    }
  }

  /**
   * Get active reflections (within sliding window)
   * @returns {Reflection[]}
   */
  getActiveReflections() {
    return [...this.activeWindow];
  }

  /**
   * Get all reflections (entire history)
   * @returns {Reflection[]}
   */
  getAllReflections() {
    return [...this.allReflections];
  }

  /**
   * Get reflections filtered by type
   * @param {string} type - Reflection type
   * @returns {Reflection[]}
   */
  getReflectionsByType(type) {
    return this.activeWindow.filter(r => r.type === type);
  }

  /**
   * Get reflections filtered by effectiveness
   * @param {string} effectiveness - Effectiveness rating
   * @returns {Reflection[]}
   */
  getReflectionsByEffectiveness(effectiveness) {
    return this.activeWindow.filter(r => r.effectiveness === effectiveness);
  }

  /**
   * Save reflection to disk
   * @private
   * @param {Reflection} reflection
   */
  saveReflection(reflection) {
    try {
      const filename = `reflection-${reflection.iteration}.json`;
      const filepath = join(this.reflectionsDir, filename);
      const data = JSON.stringify(reflection, null, 2);
      writeFileSync(filepath, data, 'utf8');
    } catch (error) {
      console.error(`Failed to save reflection ${reflection.iteration}: ${error.message}`);
    }
  }

  /**
   * Load all reflections from disk
   */
  loadReflections() {
    if (!existsSync(this.reflectionsDir)) {
      return;
    }

    try {
      const files = readdirSync(this.reflectionsDir)
        .filter(f => f.startsWith('reflection-') && f.endsWith('.json'))
        .sort(); // Ensure chronological order

      this.allReflections = files.map(file => {
        const filepath = join(this.reflectionsDir, file);
        const data = readFileSync(filepath, 'utf8');
        return JSON.parse(data);
      });

      this.updateActiveWindow();
      console.log(`Loaded ${this.allReflections.length} reflections (active window: ${this.activeWindow.length})`);
    } catch (error) {
      console.error(`Failed to load reflections: ${error.message}`);
    }
  }

  /**
   * Update performance metrics (for auto-scaling)
   * @param {PerformanceMetrics} metrics
   */
  updatePerformanceMetrics(metrics) {
    this.performanceMetrics = {
      ...this.performanceMetrics,
      ...metrics
    };

    if (this.config.autoScaling.enabled) {
      this.evaluateAutoScaling();
    }
  }

  /**
   * Evaluate whether to auto-scale capacity
   * @private
   */
  evaluateAutoScaling() {
    const { consecutiveFailures, averageQuality, convergenceRate } = this.performanceMetrics;
    const { scaleUpOn, scaleDownOn } = this.config.autoScaling;
    const currentCapacity = this.config.capacity;

    // Check scale-up conditions
    if (scaleUpOn.includes('consecutive_failures') && consecutiveFailures >= 3) {
      if (currentCapacity < this.config.presets.maximum) {
        const newCapacity = Math.min(currentCapacity + 1, this.config.presets.maximum);
        console.log(`Auto-scaling UP: ${consecutiveFailures} consecutive failures → capacity ${newCapacity}`);
        this.setCapacity(newCapacity);
        return;
      }
    }

    if (scaleUpOn.includes('low_quality_scores') && averageQuality < 0.5 && averageQuality > 0) {
      if (currentCapacity < this.config.presets.maximum) {
        const newCapacity = Math.min(currentCapacity + 1, this.config.presets.maximum);
        console.log(`Auto-scaling UP: low quality (${averageQuality.toFixed(2)}) → capacity ${newCapacity}`);
        this.setCapacity(newCapacity);
        return;
      }
    }

    // Check scale-down conditions
    if (scaleDownOn.includes('high_quality_maintained') && averageQuality >= 0.9) {
      if (currentCapacity > this.config.presets.simple && consecutiveFailures === 0) {
        const newCapacity = Math.max(currentCapacity - 1, this.config.presets.simple);
        console.log(`Auto-scaling DOWN: high quality maintained (${averageQuality.toFixed(2)}) → capacity ${newCapacity}`);
        this.setCapacity(newCapacity);
        return;
      }
    }

    if (scaleDownOn.includes('fast_convergence') && convergenceRate <= 3 && convergenceRate > 0) {
      if (currentCapacity > this.config.presets.simple) {
        const newCapacity = Math.max(currentCapacity - 1, this.config.presets.simple);
        console.log(`Auto-scaling DOWN: fast convergence (${convergenceRate} iterations) → capacity ${newCapacity}`);
        this.setCapacity(newCapacity);
        return;
      }
    }
  }

  /**
   * Enable auto-scaling
   */
  enableAutoScaling() {
    this.config.autoScaling.enabled = true;
    this.saveConfig();
    console.log('Auto-scaling enabled');
  }

  /**
   * Disable auto-scaling
   */
  disableAutoScaling() {
    this.config.autoScaling.enabled = false;
    this.saveConfig();
    console.log('Auto-scaling disabled');
  }

  /**
   * Get memory statistics
   * @returns {Object}
   */
  getStatistics() {
    return {
      capacity: this.config.capacity,
      totalReflections: this.allReflections.length,
      activeReflections: this.activeWindow.length,
      autoScalingEnabled: this.config.autoScaling.enabled,
      performanceMetrics: { ...this.performanceMetrics },
      reflectionsByType: {
        error_analysis: this.allReflections.filter(r => r.type === 'error_analysis').length,
        strategy_change: this.allReflections.filter(r => r.type === 'strategy_change').length,
        success_pattern: this.allReflections.filter(r => r.type === 'success_pattern').length,
        constraint_discovery: this.allReflections.filter(r => r.type === 'constraint_discovery').length
      },
      reflectionsByEffectiveness: {
        helpful: this.allReflections.filter(r => r.effectiveness === 'helpful').length,
        neutral: this.allReflections.filter(r => r.effectiveness === 'neutral').length,
        unhelpful: this.allReflections.filter(r => r.effectiveness === 'unhelpful').length
      }
    };
  }

  /**
   * Clear all reflections (for testing or reset)
   */
  clear() {
    this.allReflections = [];
    this.activeWindow = [];
    console.log('Memory cleared');
  }

  /**
   * Get formatted context for prompt injection
   * @returns {string}
   */
  getContextForPrompt() {
    if (this.activeWindow.length === 0) {
      return '';
    }

    const lines = [
      '## Reflection Memory (Recent Learnings)',
      '',
      `Active memory window: ${this.activeWindow.length} of ${this.allReflections.length} total reflections (Ω=${this.config.capacity})`,
      ''
    ];

    this.activeWindow.forEach((reflection, index) => {
      lines.push(`### Reflection ${index + 1} (Iteration ${reflection.iteration})`);
      lines.push(`**Type**: ${reflection.type}`);
      lines.push(`**Effectiveness**: ${reflection.effectiveness}`);
      lines.push('');
      lines.push(reflection.content);
      lines.push('');
    });

    return lines.join('\n');
  }
}

/**
 * Create a MemoryManager with preset capacity
 * @param {string} stateDir - State directory
 * @param {string} preset - Preset name: simple, moderate, complex, maximum
 * @returns {MemoryManager}
 */
export function createMemoryManager(stateDir, preset = 'moderate') {
  const capacity = PRESETS[preset];
  if (capacity === undefined) {
    throw new Error(`Unknown preset: ${preset}. Valid: simple, moderate, complex, maximum`);
  }

  return new MemoryManager({
    stateDir,
    capacity
  });
}
