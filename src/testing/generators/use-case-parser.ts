/**
 * UseCaseParser - Parse use case documents to extract testable scenarios
 *
 * Parses use case markdown documents following the standard template format
 * and extracts structured test scenarios for test generation.
 *
 * @module src/testing/generators/use-case-parser
 */

import * as fs from 'fs/promises';
import * as path from 'path';

// ===========================
// Interfaces
// ===========================

export interface UseCaseStep {
  number: number;
  actor: 'user' | 'system' | 'external';
  action: string;
  expectedResult?: string;
}

export interface UseCaseScenario {
  id: string;
  name: string;
  type: 'main' | 'extension' | 'exception';
  preconditions: string[];
  steps: UseCaseStep[];
  postconditions: string[];
  extensionOf?: string;  // For extension scenarios
  triggeredAt?: number;  // Step number where extension triggers
}

export interface UseCaseDocument {
  id: string;
  title: string;
  actor: string;
  description: string;
  preconditions: string[];
  postconditions: string[];
  mainScenario: UseCaseScenario;
  extensions: UseCaseScenario[];
  exceptions: UseCaseScenario[];
  nfrs: string[];  // Referenced NFR IDs
  relatedUseCases: string[];
  priority: 'critical' | 'high' | 'medium' | 'low';
}

export interface ParseResult {
  success: boolean;
  document?: UseCaseDocument;
  errors: string[];
  warnings: string[];
}

// ===========================
// UseCaseParser Class
// ===========================

export class UseCaseParser {
  private readonly MAIN_SCENARIO_PATTERN = /^#+\s*(Main\s+)?Success\s+Scenario/im;
  private readonly EXTENSION_PATTERN = /^#+\s*Extensions?/im;
  private readonly EXCEPTION_PATTERN = /^#+\s*Exception(s|\s+Scenario)/im;
  private readonly STEP_PATTERN = /^\s*(\d+)\.\s+(?:\*\*(\w+)\*\*:?\s+)?(.+)/;
  private readonly PRECONDITION_PATTERN = /^#+\s*Pre-?conditions?/im;
  private readonly POSTCONDITION_PATTERN = /^#+\s*Post-?conditions?/im;
  private readonly NFR_REF_PATTERN = /NFR-[A-Z]+-\d+/g;
  private readonly UC_REF_PATTERN = /UC-\d+/g;

  /**
   * Parse a use case document from file
   *
   * @param filePath - Path to use case markdown file
   * @returns Parse result with structured document
   */
  async parseFile(filePath: string): Promise<ParseResult> {

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return this.parseContent(content, path.basename(filePath));
    } catch (error: any) {
      return {
        success: false,
        errors: [`Failed to read file: ${error.message}`],
        warnings: []
      };
    }
  }

  /**
   * Parse use case content from string
   *
   * @param content - Markdown content
   * @param sourceName - Source identifier for error messages
   * @returns Parse result with structured document
   */
  parseContent(content: string, sourceName: string = 'input'): ParseResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Extract use case ID from content
    const idMatch = content.match(/UC-(\d+)/);
    const id = idMatch ? `UC-${idMatch[1]}` : this.extractIdFromFilename(sourceName);

    if (!id) {
      errors.push('Could not determine use case ID');
    }

    // Extract title from first heading
    const titleMatch = content.match(/^#\s+(.+)/m);
    const title = titleMatch ? titleMatch[1].trim() : 'Unknown Use Case';

    // Extract actor
    const actorMatch = content.match(/\*\*(?:Primary\s+)?Actor\*\*:\s*(.+)/i) ||
                      content.match(/Actor:\s*(.+)/i);
    const actor = actorMatch ? actorMatch[1].trim() : 'User';

    // Extract description
    const descMatch = content.match(/\*\*Description\*\*:\s*(.+)/i) ||
                      content.match(/^>\s*(.+)/m);
    const description = descMatch ? descMatch[1].trim() : '';

    // Extract priority
    const priorityMatch = content.match(/\*\*Priority\*\*:\s*(\w+)/i);
    const priority = this.normalizePriority(priorityMatch?.[1] || 'medium');

    // Parse preconditions
    const preconditions = this.parseBulletList(content, this.PRECONDITION_PATTERN);

    // Parse postconditions
    const postconditions = this.parseBulletList(content, this.POSTCONDITION_PATTERN);

    // Parse main scenario
    const mainScenario = this.parseMainScenario(content, id || 'UC-000');
    if (!mainScenario) {
      warnings.push('No main success scenario found');
    }

    // Parse extensions
    const extensions = this.parseExtensions(content, id || 'UC-000');

    // Parse exceptions
    const exceptions = this.parseExceptions(content, id || 'UC-000');

    // Extract NFR references
    const nfrs = this.extractReferences(content, this.NFR_REF_PATTERN);

    // Extract related use cases
    const relatedUseCases = this.extractReferences(content, this.UC_REF_PATTERN)
      .filter(ref => ref !== id);

    if (errors.length > 0) {
      return { success: false, errors, warnings };
    }

    return {
      success: true,
      document: {
        id: id!,
        title,
        actor,
        description,
        preconditions,
        postconditions,
        mainScenario: mainScenario || this.createEmptyScenario(id!, 'main'),
        extensions,
        exceptions,
        nfrs,
        relatedUseCases,
        priority
      },
      errors: [],
      warnings
    };
  }

  /**
   * Parse multiple use case files from a directory
   *
   * @param dirPath - Directory containing use case files
   * @returns Array of parse results
   */
  async parseDirectory(dirPath: string): Promise<Map<string, ParseResult>> {
    const results = new Map<string, ParseResult>();

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isFile() && entry.name.match(/UC-\d+.*\.md$/i)) {
          const filePath = path.join(dirPath, entry.name);
          const result = await this.parseFile(filePath);
          results.set(entry.name, result);
        }
      }
    } catch (error: any) {
      // Return empty map if directory doesn't exist
    }

    return results;
  }

  /**
   * Extract testable scenarios from a use case document
   *
   * @param document - Parsed use case document
   * @returns Array of all testable scenarios
   */
  extractTestableScenarios(document: UseCaseDocument): UseCaseScenario[] {
    const scenarios: UseCaseScenario[] = [];

    // Add main scenario
    scenarios.push(document.mainScenario);

    // Add extensions
    scenarios.push(...document.extensions);

    // Add exceptions
    scenarios.push(...document.exceptions);

    return scenarios;
  }

  // ===========================
  // Private Parsing Methods
  // ===========================

  private parseMainScenario(content: string, useCaseId: string): UseCaseScenario | null {
    const match = content.match(this.MAIN_SCENARIO_PATTERN);
    if (!match) return null;

    const sectionStart = match.index! + match[0].length;
    const sectionContent = this.extractSectionContent(content, sectionStart);

    const steps = this.parseSteps(sectionContent);

    return {
      id: `${useCaseId}-MSS`,
      name: 'Main Success Scenario',
      type: 'main',
      preconditions: [],
      steps,
      postconditions: []
    };
  }

  private parseExtensions(content: string, useCaseId: string): UseCaseScenario[] {
    const extensions: UseCaseScenario[] = [];
    const match = content.match(this.EXTENSION_PATTERN);

    if (!match) return extensions;

    const sectionStart = match.index! + match[0].length;
    const sectionContent = this.extractSectionContent(content, sectionStart);

    // Parse extension scenarios (e.g., "2a. User cancels...")
    const extensionPattern = /(\d+)([a-z])\.\s+(.+?)(?=\n\d+[a-z]\.|\n#+|\n\n\n|$)/gs;
    let extMatch;

    while ((extMatch = extensionPattern.exec(sectionContent)) !== null) {
      const stepNum = parseInt(extMatch[1]);
      const extId = extMatch[2];
      const extContent = extMatch[3].trim();

      // Parse extension steps
      const extSteps = this.parseExtensionSteps(extContent);

      extensions.push({
        id: `${useCaseId}-EXT-${stepNum}${extId.toUpperCase()}`,
        name: `Extension at step ${stepNum}`,
        type: 'extension',
        preconditions: [],
        steps: extSteps,
        postconditions: [],
        extensionOf: `${useCaseId}-MSS`,
        triggeredAt: stepNum
      });
    }

    return extensions;
  }

  private parseExceptions(content: string, useCaseId: string): UseCaseScenario[] {
    const exceptions: UseCaseScenario[] = [];
    const match = content.match(this.EXCEPTION_PATTERN);

    if (!match) return exceptions;

    const sectionStart = match.index! + match[0].length;
    const sectionContent = this.extractSectionContent(content, sectionStart);

    // Parse exception scenarios
    const exceptionPattern = /\*\*([^*]+)\*\*:\s*(.+?)(?=\n\*\*|\n#+|\n\n\n|$)/gs;
    let exMatch;
    let counter = 1;

    while ((exMatch = exceptionPattern.exec(sectionContent)) !== null) {
      const name = exMatch[1].trim();
      const description = exMatch[2].trim();

      exceptions.push({
        id: `${useCaseId}-EXC-${String(counter).padStart(2, '0')}`,
        name,
        type: 'exception',
        preconditions: [],
        steps: [{
          number: 1,
          actor: 'system',
          action: description
        }],
        postconditions: []
      });
      counter++;
    }

    return exceptions;
  }

  private parseSteps(content: string): UseCaseStep[] {
    const steps: UseCaseStep[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      const match = line.match(this.STEP_PATTERN);
      if (match) {
        const number = parseInt(match[1]);
        const actorHint = match[2]?.toLowerCase() || '';
        const action = match[3].trim();

        let actor: UseCaseStep['actor'] = 'system';
        if (actorHint.includes('user') || action.toLowerCase().startsWith('user')) {
          actor = 'user';
        } else if (actorHint.includes('external') || action.toLowerCase().includes('external')) {
          actor = 'external';
        }

        steps.push({ number, actor, action });
      }
    }

    return steps;
  }

  private parseExtensionSteps(content: string): UseCaseStep[] {
    const steps: UseCaseStep[] = [];
    const lines = content.split('\n');
    let stepNum = 1;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        // Determine actor from content
        let actor: UseCaseStep['actor'] = 'system';
        if (trimmed.toLowerCase().includes('user')) {
          actor = 'user';
        }

        steps.push({
          number: stepNum++,
          actor,
          action: trimmed
        });
      }
    }

    return steps;
  }

  private parseBulletList(content: string, sectionPattern: RegExp): string[] {
    const items: string[] = [];
    const match = content.match(sectionPattern);

    if (!match) return items;

    const sectionStart = match.index! + match[0].length;
    const sectionContent = this.extractSectionContent(content, sectionStart);

    // Parse bullet points
    const bulletPattern = /^\s*[-*]\s+(.+)/gm;
    let bulletMatch;

    while ((bulletMatch = bulletPattern.exec(sectionContent)) !== null) {
      items.push(bulletMatch[1].trim());
    }

    return items;
  }

  private extractSectionContent(content: string, startIndex: number): string {
    // Find next heading or end of content
    const remaining = content.substring(startIndex);
    const nextHeading = remaining.search(/\n#+\s/);

    if (nextHeading === -1) {
      return remaining;
    }

    return remaining.substring(0, nextHeading);
  }

  private extractReferences(content: string, pattern: RegExp): string[] {
    const matches = content.match(pattern) || [];
    return [...new Set(matches)];  // Deduplicate
  }

  private extractIdFromFilename(filename: string): string | null {
    const match = filename.match(/UC-(\d+)/i);
    return match ? `UC-${match[1]}` : null;
  }

  private normalizePriority(priority: string): UseCaseDocument['priority'] {
    const lower = priority.toLowerCase();
    if (lower.includes('critical') || lower === 'p0') return 'critical';
    if (lower.includes('high') || lower === 'p1') return 'high';
    if (lower.includes('low') || lower === 'p3') return 'low';
    return 'medium';
  }

  private createEmptyScenario(useCaseId: string, type: 'main' | 'extension' | 'exception'): UseCaseScenario {
    return {
      id: `${useCaseId}-${type.toUpperCase()}`,
      name: `Empty ${type} scenario`,
      type,
      preconditions: [],
      steps: [],
      postconditions: []
    };
  }
}
