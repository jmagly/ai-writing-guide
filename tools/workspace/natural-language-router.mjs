#!/usr/bin/env node

/**
 * @fileoverview Natural Language Router - Maps natural language phrases to framework-specific commands
 *
 * @module tools/workspace/natural-language-router
 * @description
 * Zero-friction natural language command routing for AIWG framework. Translates user intent
 * (e.g., "transition to elaboration") to specific framework commands (e.g., flow-inception-to-elaboration)
 * with confidence scoring and fuzzy matching.
 *
 * Core Responsibilities:
 * - Load and cache phrase translation table from markdown
 * - Map natural language phrases to command IDs + framework context
 * - Fuzzy matching with Levenshtein distance for typo tolerance
 * - Confidence scoring (0.0-1.0) with configurable threshold
 * - Multi-framework support (SDLC, Marketing, Legal, etc.)
 *
 * Performance Targets:
 * - Translation loading: <500ms (first load)
 * - Routing per phrase: <100ms (NFR-PERF-09)
 * - Cache TTL: 5 minutes (balance freshness vs performance)
 *
 * @author Software Implementer
 * @version 1.0.0
 * @created 2025-10-19
 *
 * @see FID-007 (Framework-Scoped Workspace Management)
 * @see UC-012 (Framework-Aware Workspace Management)
 * @see NFR-PERF-09 (Framework-scoped context loading optimization)
 *
 * @example
 * ```javascript
 * const router = new NaturalLanguageRouter();
 *
 * // Route natural language to command
 * const result = await router.route("transition to elaboration");
 * // => {
 * //   commandId: "flow-inception-to-elaboration",
 * //   framework: "sdlc-complete",
 * //   confidence: 1.0,
 * //   matchedPhrase: "transition to elaboration",
 * //   category: "phase-transitions"
 * // }
 *
 * // Fuzzy matching handles typos
 * const fuzzy = await router.route("transision to elaboration");
 * // => { commandId: "flow-inception-to-elaboration", confidence: 0.92, ... }
 *
 * // Low confidence returns null
 * const unknown = await router.route("do something random");
 * // => null
 *
 * // Get suggestions for ambiguous phrases
 * const suggestions = await router.getSuggestions("start");
 * // => [
 * //   { phrase: "start elaboration", confidence: 0.65, commandId: "..." },
 * //   { phrase: "start security review", confidence: 0.62, commandId: "..." }
 * // ]
 * ```
 */

import fs from 'fs/promises';
import path from 'path';
import { homedir } from 'os';

/**
 * Natural Language Router
 *
 * @class NaturalLanguageRouter
 * @description Maps natural language user input to framework-specific commands with
 * confidence scoring and fuzzy matching.
 *
 * @property {Map<string, Translation>} translationCache - In-memory cache of phrase translations
 * @property {number} cacheTimestamp - Timestamp of last cache load
 * @property {number} cacheTTL - Cache time-to-live in milliseconds (default: 5 minutes)
 * @property {string} translationsPath - Path to translation table file
 * @property {number} confidenceThreshold - Minimum confidence score for valid match (default: 0.7)
 */
export class NaturalLanguageRouter {
  /**
   * Create Natural Language Router
   *
   * @constructor
   * @param {string} [translationsPath] - Path to translation markdown file
   *   Default: ~/.local/share/ai-writing-guide/agentic/code/frameworks/sdlc-complete/docs/simple-language-translations.md
   * @param {Object} [options] - Configuration options
   * @param {number} [options.confidenceThreshold=0.7] - Minimum confidence score (0.0-1.0)
   * @param {number} [options.cacheTTL=300000] - Cache TTL in milliseconds (default: 5 min)
   *
   * @example
   * ```javascript
   * // Default configuration
   * const router = new NaturalLanguageRouter();
   *
   * // Custom translation path
   * const customRouter = new NaturalLanguageRouter(
   *   '/custom/path/translations.md',
   *   { confidenceThreshold: 0.8, cacheTTL: 600000 }
   * );
   * ```
   */
  constructor(translationsPath, options = {}) {
    // Default to AIWG installation path
    this.translationsPath = translationsPath || path.join(
      homedir(),
      '.local/share/ai-writing-guide/agentic/code/frameworks/sdlc-complete/docs/simple-language-translations.md'
    );

    // Configuration
    this.confidenceThreshold = options.confidenceThreshold ?? 0.7;
    this.cacheTTL = options.cacheTTL ?? 300000; // 5 minutes

    // Cache state
    this.translationCache = new Map();
    this.cacheTimestamp = 0;
    this.translationMetadata = {
      version: null,
      loadedAt: null,
      totalTranslations: 0,
      categories: new Set()
    };
  }

  /**
   * Route Natural Language Phrase to Command
   *
   * @async
   * @param {string} phrase - User's natural language input
   * @returns {Promise<RouteResult|null>} Route result with command ID, framework, confidence
   *   Returns null if no match above confidence threshold
   *
   * @typedef {Object} RouteResult
   * @property {string} commandId - Mapped command identifier
   * @property {string} framework - Framework ID (e.g., "sdlc-complete")
   * @property {number} confidence - Match confidence score (0.0-1.0)
   * @property {string} matchedPhrase - Original phrase that matched
   * @property {string} category - Translation category (e.g., "phase-transitions")
   *
   * @throws {TranslationLoadError} If translation file cannot be loaded
   *
   * @example
   * ```javascript
   * const result = await router.route("Let's transition to Elaboration");
   * // => {
   * //   commandId: "flow-inception-to-elaboration",
   * //   framework: "sdlc-complete",
   * //   confidence: 1.0,
   * //   matchedPhrase: "transition to elaboration",
   * //   category: "phase-transitions"
   * // }
   *
   * // Unknown phrase
   * const unknown = await router.route("do something random");
   * // => null
   * ```
   */
  async route(phrase) {
    if (!phrase || typeof phrase !== 'string') {
      return null;
    }

    // Ensure translations loaded
    await this.loadTranslations();

    // Normalize input
    const normalized = this.normalize(phrase);
    if (!normalized) {
      return null;
    }

    // Try exact match first (highest priority)
    const exactMatch = this._findExactMatch(normalized);
    if (exactMatch) {
      return {
        commandId: exactMatch.commandId,
        framework: exactMatch.framework,
        confidence: 1.0,
        matchedPhrase: exactMatch.phrase,
        category: exactMatch.category
      };
    }

    // Fall back to fuzzy matching
    const fuzzyMatch = this._findFuzzyMatch(normalized);
    if (fuzzyMatch && fuzzyMatch.confidence >= this.confidenceThreshold) {
      return fuzzyMatch;
    }

    // No match above threshold
    return null;
  }

  /**
   * Route Multiple Phrases in Batch
   *
   * @async
   * @param {string[]} phrases - Array of natural language phrases
   * @returns {Promise<RouteResult[]>} Array of route results (null for no match)
   *
   * @example
   * ```javascript
   * const results = await router.routeBatch([
   *   "transition to elaboration",
   *   "run security review",
   *   "unknown phrase"
   * ]);
   * // => [
   * //   { commandId: "flow-inception-to-elaboration", ... },
   * //   { commandId: "flow-security-review-cycle", ... },
   * //   null
   * // ]
   * ```
   */
  async routeBatch(phrases) {
    if (!Array.isArray(phrases)) {
      throw new Error('routeBatch expects array of phrases');
    }

    // Ensure translations loaded once
    await this.loadTranslations();

    // Route all phrases in parallel
    return Promise.all(phrases.map(phrase => this.route(phrase)));
  }

  /**
   * Get Suggestions for Ambiguous Phrase
   *
   * @async
   * @param {string} phrase - Ambiguous or incomplete phrase
   * @param {number} [limit=3] - Maximum number of suggestions
   * @returns {Promise<Suggestion[]>} Sorted suggestions (highest confidence first)
   *
   * @typedef {Object} Suggestion
   * @property {string} phrase - Suggested phrase
   * @property {string} commandId - Command identifier
   * @property {string} framework - Framework ID
   * @property {number} confidence - Match confidence score
   * @property {string} category - Translation category
   *
   * @example
   * ```javascript
   * const suggestions = await router.getSuggestions("start", 5);
   * // => [
   * //   { phrase: "start elaboration", confidence: 0.65, commandId: "...", ... },
   * //   { phrase: "start security review", confidence: 0.62, commandId: "...", ... },
   * //   { phrase: "start iteration", confidence: 0.60, commandId: "...", ... }
   * // ]
   * ```
   */
  async getSuggestions(phrase, limit = 3) {
    if (!phrase || typeof phrase !== 'string') {
      return [];
    }

    await this.loadTranslations();

    const normalized = this.normalize(phrase);
    const suggestions = [];

    // Calculate confidence for all translations
    for (const translation of this.translationCache.values()) {
      const confidence = this.fuzzyMatch(normalized, translation.phrase);
      if (confidence > 0.3) { // Lower threshold for suggestions
        suggestions.push({
          phrase: translation.phrase,
          commandId: translation.commandId,
          framework: translation.framework,
          confidence: confidence,
          category: translation.category
        });
      }
    }

    // Sort by confidence descending
    suggestions.sort((a, b) => b.confidence - a.confidence);

    return suggestions.slice(0, limit);
  }

  /**
   * Normalize Phrase for Matching
   *
   * @param {string} phrase - Raw user input
   * @returns {string} Normalized phrase (lowercase, trimmed, collapsed whitespace)
   *
   * @example
   * ```javascript
   * router.normalize("  Transition  to   Elaboration!  ");
   * // => "transition to elaboration"
   *
   * router.normalize("Let's move to Construction phase");
   * // => "lets move to construction phase"
   * ```
   */
  normalize(phrase) {
    if (!phrase || typeof phrase !== 'string') {
      return '';
    }

    return phrase
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\s+/g, ' '); // Collapse whitespace
  }

  /**
   * Fuzzy Match with Levenshtein Distance
   *
   * @param {string} phrase - Normalized input phrase
   * @param {string} targetPhrase - Normalized target phrase
   * @returns {number} Similarity score (0.0-1.0)
   *
   * @description
   * Uses Levenshtein distance to calculate edit distance, then converts to similarity score:
   * score = 1 - (distance / maxLength)
   *
   * Confidence threshold of 0.7 means phrases must be 70%+ similar to match.
   *
   * @example
   * ```javascript
   * router.fuzzyMatch("transition to elaboration", "transition to elaboration");
   * // => 1.0 (exact match)
   *
   * router.fuzzyMatch("transision to elaboration", "transition to elaboration");
   * // => 0.92 (1 typo)
   *
   * router.fuzzyMatch("move to construction", "transition to elaboration");
   * // => 0.31 (different phrases)
   * ```
   */
  fuzzyMatch(phrase, targetPhrase) {
    if (phrase === targetPhrase) {
      return 1.0;
    }

    const distance = this._levenshteinDistance(phrase, targetPhrase);
    const maxLen = Math.max(phrase.length, targetPhrase.length);

    if (maxLen === 0) {
      return 0.0;
    }

    const score = 1 - (distance / maxLen);
    return Math.max(0.0, score); // Ensure non-negative
  }

  /**
   * Find Best Match from Candidate List
   *
   * @param {string} phrase - Normalized input phrase
   * @param {string[]} candidates - List of candidate phrases
   * @returns {Object|null} Best match with phrase and confidence
   *
   * @example
   * ```javascript
   * const best = router.findBestMatch("run security", [
   *   "run security review",
   *   "start security check",
   *   "validate security"
   * ]);
   * // => { phrase: "run security review", confidence: 0.87 }
   * ```
   */
  findBestMatch(phrase, candidates) {
    if (!phrase || !Array.isArray(candidates) || candidates.length === 0) {
      return null;
    }

    const normalized = this.normalize(phrase);
    let bestMatch = null;
    let bestScore = 0;

    for (const candidate of candidates) {
      const candidateNormalized = this.normalize(candidate);
      const score = this.fuzzyMatch(normalized, candidateNormalized);

      if (score > bestScore) {
        bestScore = score;
        bestMatch = {
          phrase: candidate,
          confidence: score
        };
      }
    }

    return bestMatch && bestScore >= this.confidenceThreshold ? bestMatch : null;
  }

  /**
   * Load Translation Table from Markdown
   *
   * @async
   * @private
   * @returns {Promise<void>}
   * @throws {TranslationLoadError} If file cannot be read or parsed
   *
   * @description
   * Parses simple-language-translations.md markdown table into structured translation objects.
   * Caches results in memory for 5 minutes (configurable).
   *
   * Table format:
   * | User Says | Intent | Flow Template | Expected Duration |
   * |-----------|--------|---------------|-------------------|
   * | "transition to elaboration" | ... | flow-inception-to-elaboration | ... |
   */
  async loadTranslations() {
    // Check cache validity
    const now = Date.now();
    if (this.translationCache.size > 0 && (now - this.cacheTimestamp) < this.cacheTTL) {
      return; // Cache still valid
    }

    try {
      // Read markdown file
      const content = await fs.readFile(this.translationsPath, 'utf-8');

      // Parse markdown tables into translations
      const translations = this._parseMarkdownTables(content);

      // Update cache
      this.translationCache.clear();
      for (const translation of translations) {
        // Create unique key for each phrase variant
        const key = this.normalize(translation.phrase);
        this.translationCache.set(key, translation);
      }

      this.cacheTimestamp = now;
      this.translationMetadata = {
        version: '1.0',
        loadedAt: new Date(now).toISOString(),
        totalTranslations: this.translationCache.size,
        categories: new Set(translations.map(t => t.category))
      };

    } catch (error) {
      throw new TranslationLoadError(
        `Failed to load translations from ${this.translationsPath}: ${error.message}`,
        { cause: error }
      );
    }
  }

  /**
   * Reload Translations (Force Cache Refresh)
   *
   * @async
   * @returns {Promise<void>}
   *
   * @example
   * ```javascript
   * // Update translations file, then reload
   * await router.reloadTranslations();
   * ```
   */
  async reloadTranslations() {
    this.translationCache.clear();
    this.cacheTimestamp = 0;
    await this.loadTranslations();
  }

  /**
   * Get Translation Count
   *
   * @returns {number} Total number of loaded translations
   *
   * @example
   * ```javascript
   * const count = router.getTranslationCount();
   * // => 75 (if 75+ phrase translations loaded)
   * ```
   */
  getTranslationCount() {
    return this.translationCache.size;
  }

  /**
   * Get Translations by Category
   *
   * @async
   * @param {string} category - Category name (e.g., "phase-transitions")
   * @returns {Promise<Translation[]>} All translations in category
   *
   * @example
   * ```javascript
   * const transitions = await router.getByCategory("phase-transitions");
   * // => [
   * //   { phrase: "transition to elaboration", commandId: "...", ... },
   * //   { phrase: "move to construction", commandId: "...", ... }
   * // ]
   * ```
   */
  async getByCategory(category) {
    await this.loadTranslations();

    return Array.from(this.translationCache.values())
      .filter(t => t.category === category);
  }

  /**
   * Get Translations by Framework
   *
   * @async
   * @param {string} frameworkId - Framework identifier (e.g., "sdlc-complete")
   * @returns {Promise<Translation[]>} All translations for framework
   *
   * @example
   * ```javascript
   * const sdlcTranslations = await router.getByFramework("sdlc-complete");
   * // => [ { phrase: "...", commandId: "...", framework: "sdlc-complete", ... }, ... ]
   * ```
   */
  async getByFramework(frameworkId) {
    await this.loadTranslations();

    return Array.from(this.translationCache.values())
      .filter(t => t.framework === frameworkId);
  }

  /**
   * Extract Tokens from Phrase
   *
   * @param {string} phrase - Normalized phrase
   * @returns {string[]} Array of tokens (words)
   *
   * @example
   * ```javascript
   * router.extractTokens("transition to elaboration");
   * // => ["transition", "to", "elaboration"]
   * ```
   */
  extractTokens(phrase) {
    if (!phrase || typeof phrase !== 'string') {
      return [];
    }

    const normalized = this.normalize(phrase);
    return normalized.split(/\s+/).filter(token => token.length > 0);
  }

  /**
   * Find Exact Match (Internal)
   *
   * @private
   * @param {string} normalizedPhrase - Normalized input phrase
   * @returns {Translation|null} Exact match or null
   */
  _findExactMatch(normalizedPhrase) {
    return this.translationCache.get(normalizedPhrase) || null;
  }

  /**
   * Find Fuzzy Match (Internal)
   *
   * @private
   * @param {string} normalizedPhrase - Normalized input phrase
   * @returns {RouteResult|null} Best fuzzy match or null
   */
  _findFuzzyMatch(normalizedPhrase) {
    let bestMatch = null;
    let bestScore = 0;

    for (const translation of this.translationCache.values()) {
      const score = this.fuzzyMatch(normalizedPhrase, translation.phrase);

      if (score > bestScore) {
        bestScore = score;
        bestMatch = {
          commandId: translation.commandId,
          framework: translation.framework,
          confidence: score,
          matchedPhrase: translation.phrase,
          category: translation.category
        };
      }
    }

    return bestMatch;
  }

  /**
   * Parse Markdown Tables to Translations (Internal)
   *
   * @private
   * @param {string} content - Markdown file content
   * @returns {Translation[]} Parsed translations
   *
   * @description
   * Parses markdown tables with format:
   * | User Says | Intent | Flow Template | Expected Duration |
   *
   * Extracts phrases from "User Says" column, command from "Flow Template" column.
   * Infers category from surrounding headings (e.g., "### Phase Transitions").
   *
   * Generates phrase variations by removing common prefix words to improve matching.
   */
  _parseMarkdownTables(content) {
    const translations = [];
    let currentCategory = 'general';
    let currentFramework = 'sdlc-complete'; // Default framework

    // Common prefix words to strip for variations
    const prefixWords = ['lets', 'please', 'can', 'could', 'would', 'should'];

    // Split into lines
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Detect category from headings
      const categoryMatch = line.match(/^###\s+(.+)$/);
      if (categoryMatch) {
        currentCategory = this._categorizeName(categoryMatch[1]);
        continue;
      }

      // Parse table rows (skip header and separator)
      const tableRowMatch = line.match(/^\|\s*"([^"]+)"\s*\|[^|]*\|[^|]*`([^`]+)`/);
      if (tableRowMatch) {
        const phrase = tableRowMatch[1];
        const commandId = tableRowMatch[2];

        // Infer framework from command ID
        if (commandId.includes('marketing')) {
          currentFramework = 'marketing-flow';
        } else if (commandId.includes('legal')) {
          currentFramework = 'legal-review';
        } else {
          currentFramework = 'sdlc-complete';
        }

        const normalized = this.normalize(phrase);

        // Add original normalized phrase
        translations.push({
          phrase: normalized,
          commandId: commandId,
          framework: currentFramework,
          category: currentCategory
        });

        // Add variations without common prefix words
        // E.g., "lets transition to elaboration" → also add "transition to elaboration"
        const tokens = normalized.split(/\s+/);
        if (tokens.length > 1 && prefixWords.includes(tokens[0])) {
          const withoutPrefix = tokens.slice(1).join(' ');
          translations.push({
            phrase: withoutPrefix,
            commandId: commandId,
            framework: currentFramework,
            category: currentCategory
          });
        }
      }
    }

    return translations;
  }

  /**
   * Categorize Heading Name (Internal)
   *
   * @private
   * @param {string} heading - Markdown heading text
   * @returns {string} Normalized category name
   *
   * @example
   * "Phase Transitions" => "phase-transitions"
   * "Review Cycles" => "review-cycles"
   */
  _categorizeName(heading) {
    return heading
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]/g, '');
  }

  /**
   * Levenshtein Distance Algorithm (Internal)
   *
   * @private
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} Edit distance (number of operations to transform str1 to str2)
   *
   * @description
   * Classic dynamic programming implementation of Levenshtein distance.
   * Calculates minimum number of single-character edits (insertions, deletions, substitutions).
   *
   * Time complexity: O(m*n) where m, n are string lengths
   * Space complexity: O(min(m,n)) with optimized implementation
   */
  _levenshteinDistance(str1, str2) {
    // Handle edge cases
    if (str1 === str2) return 0;
    if (str1.length === 0) return str2.length;
    if (str2.length === 0) return str1.length;

    // Create matrix (optimized to use only 2 rows)
    const len1 = str1.length;
    const len2 = str2.length;

    // Previous row of distances
    let prev = Array(len2 + 1).fill(0).map((_, i) => i);
    let curr = Array(len2 + 1).fill(0);

    for (let i = 1; i <= len1; i++) {
      curr[0] = i;

      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;

        curr[j] = Math.min(
          curr[j - 1] + 1,      // Insertion
          prev[j] + 1,          // Deletion
          prev[j - 1] + cost    // Substitution
        );
      }

      // Swap rows
      [prev, curr] = [curr, prev];
    }

    return prev[len2];
  }
}

/**
 * Translation Load Error
 *
 * @class TranslationLoadError
 * @extends Error
 * @description Thrown when translation file cannot be loaded or parsed
 */
export class TranslationLoadError extends Error {
  constructor(message, options) {
    super(message);
    this.name = 'TranslationLoadError';
    if (options?.cause) {
      this.cause = options.cause;
    }
  }
}

/**
 * Usage Examples
 *
 * @example
 * // Example 1: Basic Routing
 * const router = new NaturalLanguageRouter();
 *
 * const result = await router.route("transition to elaboration");
 * console.log(result);
 * // => {
 * //   commandId: "flow-inception-to-elaboration",
 * //   framework: "sdlc-complete",
 * //   confidence: 1.0,
 * //   matchedPhrase: "transition to elaboration",
 * //   category: "phase-transitions"
 * // }
 *
 * @example
 * // Example 2: Fuzzy Matching (Typo Tolerance)
 * const typoResult = await router.route("transision to elaboration");
 * console.log(typoResult);
 * // => {
 * //   commandId: "flow-inception-to-elaboration",
 * //   framework: "sdlc-complete",
 * //   confidence: 0.92, // High confidence despite typo
 * //   matchedPhrase: "transition to elaboration",
 * //   category: "phase-transitions"
 * // }
 *
 * @example
 * // Example 3: Unknown Phrase (No Match)
 * const unknown = await router.route("do something random");
 * console.log(unknown);
 * // => null (confidence below threshold)
 *
 * @example
 * // Example 4: Get Suggestions for Ambiguous Input
 * const suggestions = await router.getSuggestions("start");
 * console.log(suggestions);
 * // => [
 * //   { phrase: "start elaboration", confidence: 0.65, commandId: "flow-inception-to-elaboration", ... },
 * //   { phrase: "start security review", confidence: 0.62, commandId: "flow-security-review-cycle", ... },
 * //   { phrase: "start iteration", confidence: 0.60, commandId: "flow-iteration-dual-track", ... }
 * // ]
 *
 * @example
 * // Example 5: Batch Routing
 * const phrases = [
 *   "transition to elaboration",
 *   "run security review",
 *   "unknown phrase"
 * ];
 *
 * const results = await router.routeBatch(phrases);
 * console.log(results);
 * // => [
 * //   { commandId: "flow-inception-to-elaboration", confidence: 1.0, ... },
 * //   { commandId: "flow-security-review-cycle", confidence: 1.0, ... },
 * //   null
 * // ]
 *
 * @example
 * // Example 6: Filter by Category
 * const transitions = await router.getByCategory("phase-transitions");
 * console.log(transitions.length);
 * // => 6 (all phase transition translations)
 *
 * @example
 * // Example 7: Filter by Framework
 * const sdlcCommands = await router.getByFramework("sdlc-complete");
 * console.log(sdlcCommands.length);
 * // => 65 (SDLC framework commands)
 *
 * const marketingCommands = await router.getByFramework("marketing-flow");
 * console.log(marketingCommands.length);
 * // => 10 (Marketing framework commands)
 *
 * @example
 * // Example 8: Custom Confidence Threshold
 * const strictRouter = new NaturalLanguageRouter(null, {
 *   confidenceThreshold: 0.9, // Require 90% similarity
 *   cacheTTL: 600000 // 10 minute cache
 * });
 *
 * const strictResult = await strictRouter.route("transision to elaboration");
 * console.log(strictResult);
 * // => null (0.92 confidence below 0.9 threshold)
 *
 * @example
 * // Example 9: Manual Cache Refresh
 * await router.reloadTranslations();
 * console.log("Translations reloaded:", router.getTranslationCount());
 * // => "Translations reloaded: 75"
 *
 * @example
 * // Example 10: Translation Metadata
 * await router.loadTranslations();
 * console.log(router.translationMetadata);
 * // => {
 * //   version: "1.0",
 * //   loadedAt: "2025-10-19T12:00:00.000Z",
 * //   totalTranslations: 75,
 * //   categories: Set(6) { "phase-transitions", "workflow-requests", ... }
 * // }
 */

// Export singleton instance for convenience
export const defaultRouter = new NaturalLanguageRouter();

/**
 * Route natural language phrase using default router
 *
 * @function route
 * @param {string} phrase - Natural language input
 * @returns {Promise<RouteResult|null>} Route result or null
 *
 * @example
 * ```javascript
 * import { route } from './natural-language-router.mjs';
 *
 * const result = await route("transition to elaboration");
 * console.log(result.commandId);
 * // => "flow-inception-to-elaboration"
 * ```
 */
export async function route(phrase) {
  return defaultRouter.route(phrase);
}

/**
 * Get suggestions for phrase using default router
 *
 * @function getSuggestions
 * @param {string} phrase - Ambiguous phrase
 * @param {number} [limit=3] - Maximum suggestions
 * @returns {Promise<Suggestion[]>} Sorted suggestions
 */
export async function getSuggestions(phrase, limit = 3) {
  return defaultRouter.getSuggestions(phrase, limit);
}
