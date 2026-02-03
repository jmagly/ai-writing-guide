/**
 * Laziness Detection Hook
 *
 * Pre-write hook that detects and blocks destructive avoidance patterns
 * including test deletion, feature removal, and coverage regression.
 *
 * @implements @.aiwg/requirements/use-cases/UC-AP-001-detect-test-deletion.md
 * @implements @.aiwg/requirements/use-cases/UC-AP-002-detect-feature-removal.md
 * @implements @.aiwg/requirements/use-cases/UC-AP-003-detect-coverage-regression.md
 * @schema @.aiwg/patterns/laziness-patterns.yaml
 * @agent @agentic/code/frameworks/sdlc-complete/agents/laziness-detector.md
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

export interface DetectedPattern {
  id: string;
  name: string;
  category: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  file: string;
  line?: number;
  match: string;
  confidence: number;
}

export interface BlockDecision {
  block: boolean;
  warn?: boolean;
  log?: boolean;
  reason?: string;
  recovery?: string;
  patterns: DetectedPattern[];
}

export interface FileChange {
  path: string;
  type: 'added' | 'modified' | 'deleted';
  diff: string;
  linesAdded: number;
  linesDeleted: number;
}

/**
 * Laziness Detection Hook
 *
 * Analyzes pending file changes for avoidance patterns.
 */
export class LazinessDetectionHook {
  private patterns: any;
  private baselineCoverage: number = 0;
  private baselineTestCount: number = 0;

  constructor(patternsPath?: string) {
    const defaultPath = path.join(
      __dirname,
      '../../.aiwg/patterns/laziness-patterns.yaml'
    );
    const patternFile = patternsPath || defaultPath;

    try {
      const content = fs.readFileSync(patternFile, 'utf8');
      this.patterns = yaml.load(content);
    } catch (error) {
      throw new Error(
        `Failed to load laziness patterns from ${patternFile}: ${error.message}`
      );
    }
  }

  /**
   * Main entry point - analyze file changes before write
   */
  public async analyze(changes: FileChange[]): Promise<BlockDecision> {
    const detectedPatterns: DetectedPattern[] = [];

    // Capture baseline metrics
    await this.captureBaseline();

    // Run pattern detection
    for (const change of changes) {
      const patterns = await this.detectPatternsInChange(change);
      detectedPatterns.push(...patterns);
    }

    // Assess overall severity
    const decision = this.makeBlockDecision(detectedPatterns);

    return decision;
  }

  /**
   * Detect patterns in a single file change
   */
  private async detectPatternsInChange(
    change: FileChange
  ): Promise<DetectedPattern[]> {
    const detected: DetectedPattern[] = [];

    // Test deletion patterns
    if (this.isTestFile(change.path)) {
      detected.push(...this.detectTestDeletion(change));
      detected.push(...this.detectTestDisabling(change));
      detected.push(...this.detectAssertionWeakening(change));
    }

    // Feature removal patterns (in source files)
    if (this.isSourceFile(change.path) && !this.isTestFile(change.path)) {
      detected.push(...this.detectFeatureRemoval(change));
      detected.push(...this.detectValidationRemoval(change));
      detected.push(...this.detectErrorHandlerDeletion(change));
      detected.push(...this.detectHardcodedBypass(change));
      detected.push(...this.detectErrorSuppression(change));
    }

    // Config changes
    if (this.isConfigFile(change.path)) {
      detected.push(...this.detectFeatureFlagDisabling(change));
    }

    return detected;
  }

  /**
   * Pattern: LP-001 - Complete Test File Deletion
   */
  private detectTestDeletion(change: FileChange): DetectedPattern[] {
    if (change.type !== 'deleted') return [];

    const deletionPercentage =
      change.linesDeleted / (change.linesAdded + change.linesDeleted);

    if (deletionPercentage > 0.9) {
      return [
        {
          id: 'LP-001',
          name: 'Complete Test File Deletion',
          category: 'test_deletion',
          severity: 'CRITICAL',
          file: change.path,
          match: `Entire test file deleted (${change.linesDeleted} lines)`,
          confidence: 1.0,
        },
      ];
    }

    return [];
  }

  /**
   * Pattern: LP-002, LP-003 - Test Suite/Individual Test Disabling
   */
  private detectTestDisabling(change: FileChange): DetectedPattern[] {
    const detected: DetectedPattern[] = [];
    const lines = change.diff.split('\n');

    const skipPatterns = [
      /^\+.*describe\.skip\(/,
      /^\+.*it\.skip\(/,
      /^\+.*test\.skip\(/,
      /^\+.*xit\(/,
      /^\+.*xtest\(/,
      /^\+.*@Ignore/,
      /^\+.*@pytest\.mark\.skip/,
    ];

    let skipCount = 0;
    let isSuiteSkip = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      for (const pattern of skipPatterns) {
        if (pattern.test(line)) {
          skipCount++;

          // Check if it's a suite skip (describe.skip)
          if (/describe\.skip/.test(line)) {
            isSuiteSkip = true;
          }

          // Only record individual occurrences if threshold not met
          if (skipCount === 1) {
            detected.push({
              id: isSuiteSkip ? 'LP-002' : 'LP-003',
              name: isSuiteSkip
                ? 'Test Suite Disabling'
                : 'Individual Test Disabling',
              category: 'test_deletion',
              severity: isSuiteSkip ? 'HIGH' : 'MEDIUM',
              file: change.path,
              line: i + 1,
              match: line.trim(),
              confidence: 0.9,
            });
          }
        }
      }
    }

    // If multiple tests disabled, escalate severity
    if (skipCount > 3) {
      detected[0].severity = 'HIGH';
      detected[0].id = 'LP-003';
      detected[0].name = 'Multiple Individual Test Disabling';
      detected[0].match = `${skipCount} tests disabled across file`;
    }

    return detected;
  }

  /**
   * Pattern: LP-012 - Trivial Assertion Replacement
   */
  private detectAssertionWeakening(change: FileChange): DetectedPattern[] {
    const detected: DetectedPattern[] = [];
    const lines = change.diff.split('\n');

    const trivialPatterns = [
      /expect\(true\)\.toBe\(true\)/,
      /expect\(1\)\.toBe\(1\)/,
      /expect\(false\)\.toBe\(false\)/,
      /assert\(True\)/,
      /assert True/,
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith('+')) {
        for (const pattern of trivialPatterns) {
          if (pattern.test(line)) {
            detected.push({
              id: 'LP-012',
              name: 'Trivial Assertion Replacement',
              category: 'assertion_weakening',
              severity: 'CRITICAL',
              file: change.path,
              line: i + 1,
              match: line.trim(),
              confidence: 1.0,
            });
          }
        }
      }
    }

    return detected;
  }

  /**
   * Pattern: LP-005 - Feature Code Commenting
   */
  private detectFeatureRemoval(change: FileChange): DetectedPattern[] {
    const lines = change.diff.split('\n');
    let commentedLineCount = 0;
    const commentedBlocks: number[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Detect lines changed to comments
      if (line.startsWith('+') && /^\+\s*\/\//.test(line)) {
        commentedLineCount++;
        commentedBlocks.push(i + 1);
      }
    }

    if (commentedLineCount > 10) {
      return [
        {
          id: 'LP-005',
          name: 'Feature Code Commenting',
          category: 'feature_removal',
          severity: 'HIGH',
          file: change.path,
          line: commentedBlocks[0],
          match: `${commentedLineCount} lines commented out`,
          confidence: 0.85,
        },
      ];
    }

    return [];
  }

  /**
   * Pattern: LP-006 - Validation Removal
   */
  private detectValidationRemoval(change: FileChange): DetectedPattern[] {
    const detected: DetectedPattern[] = [];
    const lines = change.diff.split('\n');

    const validationPatterns = [
      /^-\s*if\s*\(!/,
      /^-\s*validate\(/,
      /^-\s*sanitize\(/,
      /^-\s*\.includes\('@'\)/,
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      for (const pattern of validationPatterns) {
        if (pattern.test(line)) {
          detected.push({
            id: 'LP-006',
            name: 'Validation Removal',
            category: 'feature_removal',
            severity: 'CRITICAL',
            file: change.path,
            line: i + 1,
            match: line.trim(),
            confidence: 0.9,
          });
        }
      }
    }

    return detected;
  }

  /**
   * Pattern: LP-007 - Error Handler Deletion
   */
  private detectErrorHandlerDeletion(change: FileChange): DetectedPattern[] {
    const detected: DetectedPattern[] = [];
    const lines = change.diff.split('\n');

    const errorPatterns = [
      /^-\s*catch\s*\(/,
      /^-\s*throw new Error/,
      /^-\s*throw\s+/,
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      for (const pattern of errorPatterns) {
        if (pattern.test(line)) {
          detected.push({
            id: 'LP-007',
            name: 'Error Handler Deletion',
            category: 'feature_removal',
            severity: 'HIGH',
            file: change.path,
            line: i + 1,
            match: line.trim(),
            confidence: 0.85,
          });
        }
      }
    }

    return detected;
  }

  /**
   * Pattern: LP-015 - Hardcoded Test Bypass
   */
  private detectHardcodedBypass(change: FileChange): DetectedPattern[] {
    const detected: DetectedPattern[] = [];
    const lines = change.diff.split('\n');

    const bypassPatterns = [
      /test@example\.com/,
      /NODE_ENV.*test/,
      /process\.env\.CI/,
      /if.*CI.*true/,
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith('+')) {
        for (const pattern of bypassPatterns) {
          if (pattern.test(line)) {
            detected.push({
              id: 'LP-015',
              name: 'Hardcoded Test Bypass',
              category: 'workaround',
              severity: 'CRITICAL',
              file: change.path,
              line: i + 1,
              match: line.trim(),
              confidence: 0.95,
            });
          }
        }
      }
    }

    return detected;
  }

  /**
   * Pattern: LP-016 - Error Suppression
   */
  private detectErrorSuppression(change: FileChange): DetectedPattern[] {
    const detected: DetectedPattern[] = [];
    const lines = change.diff.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Detect empty catch blocks or catch with ignore comment
      if (
        line.startsWith('+') &&
        (/catch\s*\([^)]+\)\s*\{\s*\}/.test(line) ||
          /catch.*\/\/\s*ignore/.test(line) ||
          /catch.*\/\*\s*ignore/.test(line))
      ) {
        detected.push({
          id: 'LP-016',
          name: 'Error Suppression',
          category: 'workaround',
          severity: 'HIGH',
          file: change.path,
          line: i + 1,
          match: line.trim(),
          confidence: 0.9,
        });
      }
    }

    return detected;
  }

  /**
   * Pattern: LP-008 - Feature Flag Disabling
   */
  private detectFeatureFlagDisabling(change: FileChange): DetectedPattern[] {
    const detected: DetectedPattern[] = [];
    const lines = change.diff.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const nextLine = lines[i + 1] || '';

      // Detect true -> false changes in config
      if (
        line.startsWith('-') &&
        /:\s*true/.test(line) &&
        nextLine.startsWith('+') &&
        /:\s*false/.test(nextLine)
      ) {
        detected.push({
          id: 'LP-008',
          name: 'Feature Flag Disabling',
          category: 'feature_removal',
          severity: 'HIGH',
          file: change.path,
          line: i + 1,
          match: `${line.trim()} -> ${nextLine.trim()}`,
          confidence: 0.9,
        });
      }
    }

    return detected;
  }

  /**
   * Make blocking decision based on detected patterns
   */
  private makeBlockDecision(patterns: DetectedPattern[]): BlockDecision {
    if (patterns.length === 0) {
      return {
        block: false,
        log: true,
        reason: 'No avoidance patterns detected',
        patterns: [],
      };
    }

    // Check for CRITICAL patterns
    const criticalPatterns = patterns.filter((p) => p.severity === 'CRITICAL');
    if (criticalPatterns.length > 0) {
      return {
        block: true,
        reason: `CRITICAL avoidance patterns detected: ${criticalPatterns.map((p) => p.name).join(', ')}`,
        recovery: 'FIX_ROOT_CAUSE',
        patterns,
      };
    }

    // Check for multiple HIGH patterns (compound avoidance)
    const highPatterns = patterns.filter((p) => p.severity === 'HIGH');
    if (highPatterns.length > 2) {
      return {
        block: true,
        reason: `Multiple HIGH-severity patterns detected (compound avoidance): ${highPatterns.map((p) => p.name).join(', ')}`,
        recovery: 'FIX_ALL_ISSUES',
        patterns,
      };
    }

    // Single HIGH pattern - block with warning
    if (highPatterns.length > 0) {
      return {
        block: true,
        warn: true,
        reason: `HIGH-severity pattern detected: ${highPatterns[0].name}`,
        recovery: 'PROVIDE_JUSTIFICATION_OR_FIX',
        patterns,
      };
    }

    // MEDIUM patterns - warn but allow
    const mediumPatterns = patterns.filter((p) => p.severity === 'MEDIUM');
    if (mediumPatterns.length > 0) {
      return {
        block: false,
        warn: true,
        reason: `MEDIUM-severity patterns detected: ${mediumPatterns.map((p) => p.name).join(', ')}`,
        patterns,
      };
    }

    // LOW patterns - log only
    return {
      block: false,
      log: true,
      reason: `LOW-severity patterns detected: ${patterns.map((p) => p.name).join(', ')}`,
      patterns,
    };
  }

  /**
   * Helper: Check if file is a test file
   */
  private isTestFile(filePath: string): boolean {
    return (
      /test.*\.(ts|js|py)$/.test(filePath) ||
      /\.test\.(ts|js|py)$/.test(filePath) ||
      /\.spec\.(ts|js|py)$/.test(filePath) ||
      /_test\.py$/.test(filePath)
    );
  }

  /**
   * Helper: Check if file is source code (not test)
   */
  private isSourceFile(filePath: string): boolean {
    return (
      /\.(ts|js|py)$/.test(filePath) &&
      !/node_modules/.test(filePath) &&
      !/\.d\.ts$/.test(filePath)
    );
  }

  /**
   * Helper: Check if file is config
   */
  private isConfigFile(filePath: string): boolean {
    return (
      /config.*\.(json|yaml|yml|ts|js)$/.test(filePath) ||
      /\.env/.test(filePath)
    );
  }

  /**
   * Capture baseline metrics for comparison
   */
  private async captureBaseline(): Promise<void> {
    // This would integrate with actual coverage tooling
    // For now, stubbed
    this.baselineCoverage = 0;
    this.baselineTestCount = 0;
  }
}

/**
 * Hook execution function
 *
 * Called by AIWG framework before file write operations.
 */
export async function executeLazinessDetectionHook(
  changes: FileChange[]
): Promise<BlockDecision> {
  const hook = new LazinessDetectionHook();
  return await hook.analyze(changes);
}
