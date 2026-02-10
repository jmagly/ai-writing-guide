/**
 * Example Generation System
 *
 * Automatically generates before/after examples demonstrating AI pattern removal
 * and voice transformation. Integrates with WritingValidationEngine, ContentDiversifier,
 * and PromptOptimizer to produce high-quality training examples.
 *
 * Week 6 Construction Phase Implementation
 */

import type { WritingValidationEngine, ValidationResult } from './validation-engine.js';
import { ContentDiversifier, Voice, Perspective } from './content-diversifier.js';

// New interfaces for Week 6 requirements
export interface ExampleGenerationOptions {
  domain: 'academic' | 'technical' | 'executive' | 'casual';
  patternType: 'banned-phrases' | 'formulaic-structures' | 'weak-voice' | 'all';
  count: number;
  includeAnnotations?: boolean;
}

export interface GeneratedExample {
  before: string;
  after: string;
  changes: Change[];
  reasoning: string;
  domain: string;
  score: {
    before: number;
    after: number;
    delta: number;
  };
}

export interface Change {
  type: 'banned-phrase' | 'structure' | 'voice' | 'specificity';
  original: string;
  replacement: string;
  reasoning: string;
}

export interface CorpusConfig {
  topics: string[];
  domains: ('academic' | 'technical' | 'executive' | 'casual')[];
  patternTypes: ('banned-phrases' | 'formulaic-structures' | 'weak-voice' | 'all')[];
  examplesPerTopic: number;
}

export interface ImprovementAnalysis {
  totalChanges: number;
  changesByType: Map<string, number>;
  avgScoreImprovement: number;
  topImprovements: Change[];
  keyLearnings: string[];
}

export interface ComparisonReport {
  totalExamples: number;
  avgScoreBefore: number;
  avgScoreAfter: number;
  avgDelta: number;
  commonPatterns: Map<string, number>;
  bestPerforming: GeneratedExample[];
  worstPerforming: GeneratedExample[];
  summary: string;
}

// Legacy interfaces maintained for backward compatibility
export interface ExamplePair {
  before: string;
  after: string;
  changes: string[];
  improvements: string[];
}

export interface Example {
  content: string;
  voice: Voice;
  context: string;
  demonstrates: string[];
}

export interface CodeExample {
  code: string;
  language: string;
  voice: Voice;
  context: string;
}

export interface Scenario {
  description: string;
  perspective: Perspective;
  useCase: string;
  voice: Voice;
}

/**
 * Core Example Generator class
 * Week 6: Enhanced with ValidationEngine integration and comprehensive example generation
 */
export class ExampleGenerator {
  private diversifier: ContentDiversifier;
  private validator?: WritingValidationEngine;

  constructor(validator?: WritingValidationEngine, diversifier?: ContentDiversifier) {
    this.validator = validator;
    this.diversifier = diversifier || new ContentDiversifier();
  }

  /**
   * Week 6: Generate single before/after example with validation scoring
   */
  async generateExample(
    topic: string,
    options: ExampleGenerationOptions
  ): Promise<GeneratedExample> {
    // Generate AI-heavy "before" content
    const before = this.generateBeforeContent(topic, options);

    // Validate before content (if validator available)
    const beforeValidation = this.validator
      ? await this.validator.validate(before, options.domain)
      : this.createMockValidation(before, 15);

    // Transform to authentic "after" content
    const after = await this.generateAfterContent(before, options);

    // Validate after content
    const afterValidation = this.validator
      ? await this.validator.validate(after, options.domain)
      : this.createMockValidation(after, 78);

    // Identify changes
    const changes = this.identifyChanges(before, after, beforeValidation, afterValidation, options);

    // Generate reasoning
    const reasoning = this.generateReasoningFromChanges(changes, beforeValidation, afterValidation);

    return {
      before,
      after,
      changes,
      reasoning,
      domain: options.domain,
      score: {
        before: beforeValidation.score,
        after: afterValidation.score,
        delta: afterValidation.score - beforeValidation.score
      }
    };
  }

  /**
   * Week 6: Generate multiple examples for a corpus
   */
  async generateExampleSet(
    topics: string[],
    options: ExampleGenerationOptions
  ): Promise<GeneratedExample[]> {
    const examples: GeneratedExample[] = [];

    for (const topic of topics) {
      for (let i = 0; i < options.count; i++) {
        const example = await this.generateExample(topic, options);
        examples.push(example);
      }
    }

    return examples;
  }

  /**
   * Week 6: Generate domain-specific examples
   */
  async generateAcademicExample(topic: string): Promise<GeneratedExample> {
    return this.generateExample(topic, {
      domain: 'academic',
      patternType: 'all',
      count: 1,
      includeAnnotations: true
    });
  }

  async generateTechnicalExample(topic: string): Promise<GeneratedExample> {
    return this.generateExample(topic, {
      domain: 'technical',
      patternType: 'all',
      count: 1,
      includeAnnotations: true
    });
  }

  async generateExecutiveExample(topic: string): Promise<GeneratedExample> {
    return this.generateExample(topic, {
      domain: 'executive',
      patternType: 'all',
      count: 1,
      includeAnnotations: true
    });
  }

  async generateCasualExample(topic: string): Promise<GeneratedExample> {
    return this.generateExample(topic, {
      domain: 'casual',
      patternType: 'all',
      count: 1,
      includeAnnotations: true
    });
  }

  /**
   * Week 6: Generate pattern-specific examples
   */
  async generateBannedPhraseExample(topic: string, phrase: string): Promise<GeneratedExample> {
    const before = this.generateBeforeContentWithPhrase(topic, phrase);

    const options: ExampleGenerationOptions = {
      domain: 'technical',
      patternType: 'banned-phrases',
      count: 1,
      includeAnnotations: true
    };

    const beforeValidation = this.validator
      ? await this.validator.validate(before, options.domain)
      : this.createMockValidation(before, 12);

    const after = await this.generateAfterContent(before, options);

    const afterValidation = this.validator
      ? await this.validator.validate(after, options.domain)
      : this.createMockValidation(after, 75);

    const changes = this.identifyChanges(before, after, beforeValidation, afterValidation, options);
    const reasoning = this.generateReasoningFromChanges(changes, beforeValidation, afterValidation);

    return {
      before,
      after,
      changes,
      reasoning,
      domain: options.domain,
      score: {
        before: beforeValidation.score,
        after: afterValidation.score,
        delta: afterValidation.score - beforeValidation.score
      }
    };
  }

  async generateFormulicStructureExample(topic: string, structure: string): Promise<GeneratedExample> {
    const before = this.generateBeforeContentWithStructure(topic, structure);

    const options: ExampleGenerationOptions = {
      domain: 'technical',
      patternType: 'formulaic-structures',
      count: 1,
      includeAnnotations: true
    };

    const beforeValidation = this.validator
      ? await this.validator.validate(before, options.domain)
      : this.createMockValidation(before, 18);

    const after = await this.generateAfterContent(before, options);

    const afterValidation = this.validator
      ? await this.validator.validate(after, options.domain)
      : this.createMockValidation(after, 76);

    const changes = this.identifyChanges(before, after, beforeValidation, afterValidation, options);
    const reasoning = this.generateReasoningFromChanges(changes, beforeValidation, afterValidation);

    return {
      before,
      after,
      changes,
      reasoning,
      domain: options.domain,
      score: {
        before: beforeValidation.score,
        after: afterValidation.score,
        delta: afterValidation.score - beforeValidation.score
      }
    };
  }

  /**
   * Week 6: Batch operations - generate example corpus
   */
  async generateExampleCorpus(config: CorpusConfig): Promise<Map<string, GeneratedExample>> {
    const corpus = new Map<string, GeneratedExample>();
    let exampleId = 0;

    for (const topic of config.topics) {
      for (const domain of config.domains) {
        for (const patternType of config.patternTypes) {
          const examples = await this.generateExampleSet([topic], {
            domain,
            patternType,
            count: config.examplesPerTopic,
            includeAnnotations: true
          });

          examples.forEach(example => {
            const key = `example-${exampleId++}-${domain}-${patternType}-${topic.replace(/\s+/g, '-')}`;
            corpus.set(key, example);
          });
        }
      }
    }

    return corpus;
  }

  /**
   * Week 6: Export examples in multiple formats
   */
  async exportExamples(
    examples: GeneratedExample[],
    format: 'markdown' | 'json' | 'html'
  ): Promise<string> {
    switch (format) {
      case 'json':
        return this.exportAsJSON(examples);
      case 'html':
        return this.exportAsHTML(examples);
      case 'markdown':
      default:
        return this.exportAsMarkdown(examples);
    }
  }

  /**
   * Week 6: Analyze improvement for single example
   */
  analyzeImprovement(example: GeneratedExample): ImprovementAnalysis {
    const changesByType = new Map<string, number>();

    example.changes.forEach(change => {
      const count = changesByType.get(change.type) || 0;
      changesByType.set(change.type, count + 1);
    });

    // Sort changes by impact (heuristic: longer reasoning = higher impact)
    const topImprovements = [...example.changes]
      .sort((a, b) => b.reasoning.length - a.reasoning.length)
      .slice(0, 3);

    const keyLearnings = this.extractKeyLearnings(example);

    return {
      totalChanges: example.changes.length,
      changesByType,
      avgScoreImprovement: example.score.delta,
      topImprovements,
      keyLearnings
    };
  }

  /**
   * Week 6: Compare multiple examples
   */
  compareExamples(examples: GeneratedExample[]): ComparisonReport {
    if (examples.length === 0) {
      return {
        totalExamples: 0,
        avgScoreBefore: 0,
        avgScoreAfter: 0,
        avgDelta: 0,
        commonPatterns: new Map(),
        bestPerforming: [],
        worstPerforming: [],
        summary: 'No examples to compare'
      };
    }

    const totalScoreBefore = examples.reduce((sum, ex) => sum + ex.score.before, 0);
    const totalScoreAfter = examples.reduce((sum, ex) => sum + ex.score.after, 0);
    const totalDelta = examples.reduce((sum, ex) => sum + ex.score.delta, 0);

    const avgScoreBefore = totalScoreBefore / examples.length;
    const avgScoreAfter = totalScoreAfter / examples.length;
    const avgDelta = totalDelta / examples.length;

    // Find common patterns
    const commonPatterns = new Map<string, number>();
    examples.forEach(ex => {
      ex.changes.forEach(change => {
        const pattern = `${change.type}: ${change.original.substring(0, 30)}`;
        const count = commonPatterns.get(pattern) || 0;
        commonPatterns.set(pattern, count + 1);
      });
    });

    // Sort examples by delta
    const sorted = [...examples].sort((a, b) => b.score.delta - a.score.delta);
    const bestPerforming = sorted.slice(0, 3);
    const worstPerforming = sorted.slice(-3).reverse();

    const summary = this.generateComparisonSummary(
      examples.length,
      avgScoreBefore,
      avgScoreAfter,
      avgDelta,
      commonPatterns
    );

    return {
      totalExamples: examples.length,
      avgScoreBefore,
      avgScoreAfter,
      avgDelta,
      commonPatterns,
      bestPerforming,
      worstPerforming,
      summary
    };
  }

  // Legacy methods maintained for backward compatibility

  /**
   * Legacy: Generate before/after example pair
   */
  async generateBeforeAfter(topic: string, voice: Voice = 'technical'): Promise<ExamplePair> {
    const before = this.generateAIContent(topic);
    const variation = await this.diversifier.generateVariation(before, {
      voice,
      tone: 'conversational',
      perspective: 'first-person',
    });

    const improvements = this.identifyImprovements(before, variation.content);

    return {
      before,
      after: variation.content,
      changes: variation.changes,
      improvements,
    };
  }

  /**
   * Legacy: Generate diverse examples demonstrating a concept
   */
  async generateDiverseExamples(concept: string, count: number): Promise<Example[]> {
    const examples: Example[] = [];
    const voices: Voice[] = ['academic', 'technical', 'executive', 'casual'];
    const contexts = [
      'research paper',
      'technical documentation',
      'business proposal',
      'blog post',
    ];

    for (let i = 0; i < count; i++) {
      const voice = voices[i % voices.length];
      const context = contexts[i % contexts.length];

      const baseContent = this.generateBaseContent(concept, voice);
      const variation = await this.diversifier.generateVariation(baseContent, {
        voice,
        tone: i % 2 === 0 ? 'conversational' : 'formal',
      });

      examples.push({
        content: variation.content,
        voice,
        context,
        demonstrates: this.identifyDemonstratedPrinciples(variation.content, voice),
      });
    }

    return examples;
  }

  /**
   * Legacy: Generate code examples with varying voices
   */
  async generateCodeExamples(
    technology: string,
    variations: number = 3
  ): Promise<CodeExample[]> {
    const examples: CodeExample[] = [];
    const voices: Voice[] = ['technical', 'academic', 'casual'];

    for (let i = 0; i < variations; i++) {
      const voice = voices[i % voices.length];
      const example = this.generateCodeExampleForVoice(technology, voice);
      examples.push(example);
    }

    return examples;
  }

  /**
   * Legacy: Generate scenarios from different perspectives
   */
  async generateScenarios(
    useCase: string,
    perspectives: Perspective[] = ['first-person', 'third-person', 'neutral']
  ): Promise<Scenario[]> {
    const scenarios: Scenario[] = [];
    const voices: Voice[] = ['technical', 'executive', 'casual'];

    for (let i = 0; i < perspectives.length; i++) {
      const perspective = perspectives[i];
      const voice = voices[i % voices.length];

      const baseContent = this.generateUseCaseContent(useCase, voice);
      const variation = await this.diversifier.generateVariation(baseContent, {
        perspective,
        voice,
      });

      scenarios.push({
        description: variation.content,
        perspective,
        useCase,
        voice,
      });
    }

    return scenarios;
  }

  /**
   * Legacy: Generate comparison examples showing different approaches
   */
  async generateComparisonExamples(
    topic: string,
    approaches: string[]
  ): Promise<{ topic: string; comparisons: Array<{ approach: string; content: string }> }> {
    const comparisons: Array<{ approach: string; content: string }> = [];

    for (const approach of approaches) {
      const content = this.generateApproachContent(topic, approach);
      const variation = await this.diversifier.generateVariation(content, {
        structure: 'narrative',
        voice: 'technical',
      });

      comparisons.push({
        approach,
        content: variation.content,
      });
    }

    return {
      topic,
      comparisons,
    };
  }

  /**
   * Legacy: Generate tutorial-style examples
   */
  async generateTutorialExample(
    task: string,
    steps: string[]
  ): Promise<{ task: string; content: string }> {
    const baseContent = steps.join('. ');
    const variation = await this.diversifier.generateVariation(baseContent, {
      structure: 'tutorial',
      voice: 'casual',
      tone: 'conversational',
    });

    return {
      task,
      content: variation.content,
    };
  }

  /**
   * Legacy: Generate Q&A style examples
   */
  async generateQAExample(topic: string, questionCount: number = 3): Promise<string> {
    const statements = this.generateStatementsAboutTopic(topic, questionCount * 2);
    const content = statements.join(' ');

    const variation = await this.diversifier.generateVariation(content, {
      structure: 'qa',
      voice: 'casual',
    });

    return variation.content;
  }

  // Private helper methods - Week 6 additions

  private generateBeforeContent(topic: string, options: ExampleGenerationOptions): string {
    const templates = this.getBeforeTemplates(options.domain, options.patternType);
    const template = templates[Math.floor(Math.random() * templates.length)];
    return template.replace(/{topic}/g, topic);
  }

  private generateBeforeContentWithPhrase(topic: string, phrase: string): string {
    return `It is important to note that ${topic} plays a crucial role in modern development. ${phrase} is essential for success. When delving into ${topic}, one must consider various aspects. At the end of the day, ${topic} provides comprehensive solutions.`;
  }

  private generateBeforeContentWithStructure(topic: string, structure: string): string {
    if (structure === 'numbered-list') {
      return `${topic} involves several key steps. Firstly, one must understand the basics. Secondly, implementation should be carefully considered. Thirdly, testing is absolutely essential. Finally, deployment requires comprehensive planning.`;
    }
    return `${topic} is important. Moreover, it provides benefits. Furthermore, it should be considered. Additionally, implementation is crucial.`;
  }

  private async generateAfterContent(
    before: string,
    options: ExampleGenerationOptions
  ): Promise<string> {
    // Use content diversifier to transform
    const variation = await this.diversifier.generateVariation(before, {
      voice: this.mapDomainToVoice(options.domain),
      tone: 'conversational',
      perspective: 'first-person'
    });

    let after = variation.content;

    // Apply domain-specific transformations
    after = this.applyDomainTransformations(after, options.domain);

    // Remove AI patterns
    after = this.removeAIPatterns(after, options.patternType);

    // Add authenticity markers
    after = this.addAuthenticityMarkers(after, options.domain);

    // Add specificity
    after = this.addSpecificity(after, options.domain);

    return after;
  }

  private mapDomainToVoice(domain: string): Voice {
    const mapping: Record<string, Voice> = {
      academic: 'academic',
      technical: 'technical',
      executive: 'executive',
      casual: 'casual'
    };
    return mapping[domain] || 'technical';
  }

  private applyDomainTransformations(content: string, domain: string): string {
    let transformed = content;

    switch (domain) {
      case 'technical':
        transformed = transformed.replace(/\b(improved|faster|better)\b/gi, (match) => `${match} by 30%`);
        transformed = transformed.replace(/\bsystem\b/gi, 'Redis cache');
        transformed = transformed.replace(/\bmethod\b/gi, 'LRU eviction policy');
        break;

      case 'executive':
        transformed = transformed.replace(/\bsavings?\b/gi, 'savings of $500K annually');
        transformed = transformed.replace(/\bvalue\b/gi, 'ROI of 30%');
        break;

      case 'academic':
        transformed = transformed.replace(/\bit is important to note\b/gi, 'Research indicates');
        transformed = transformed.replace(/\bdelve into\b/gi, 'examine');
        break;

      case 'casual':
        if (!transformed.includes("I've") && !transformed.includes("we")) {
          transformed = `I've worked with this before. ${transformed}`;
        }
        break;
    }

    return transformed;
  }

  private removeAIPatterns(content: string, patternType: string): string {
    let cleaned = content;

    if (patternType === 'banned-phrases' || patternType === 'all') {
      const bannedPhrases: Record<string, string> = {
        'it is important to note that': '',
        'it is worth noting that': '',
        'plays a crucial role': 'matters',
        'plays a vital role': 'is essential',
        'delve into': 'examine',
        'delves into': 'examines',
        'at the end of the day': '',
        'when it comes to': 'for',
        'seamlessly': 'smoothly',
        'cutting-edge': 'new',
        'state-of-the-art': 'current',
        'comprehensive': 'complete',
        'robust': 'solid',
        'innovative': 'new',
        'it goes without saying': '',
        'absolutely essential': 'essential',
        'various aspects': 'several factors',
        'provides comprehensive solutions': 'solves problems'
      };

      for (const [phrase, replacement] of Object.entries(bannedPhrases)) {
        const regex = new RegExp(phrase, 'gi');
        cleaned = cleaned.replace(regex, replacement);
      }
    }

    if (patternType === 'formulaic-structures' || patternType === 'all') {
      cleaned = cleaned.replace(/^(Moreover|Furthermore|Additionally|Consequently),\s*/gm, '');
      cleaned = cleaned.replace(/\b(Firstly|Secondly|Thirdly|Finally),\s*/g, '');
    }

    if (patternType === 'weak-voice' || patternType === 'all') {
      cleaned = cleaned.replace(/\bone should\b/gi, 'you should');
      cleaned = cleaned.replace(/\bit (should be|must be) (noted|mentioned|considered)\b/gi, '');
      cleaned = cleaned.replace(/\bmay help to\b/gi, 'helps');
    }

    cleaned = cleaned.replace(/\s+/g, ' ').replace(/\s+\./g, '.').trim();

    return cleaned;
  }

  private addAuthenticityMarkers(content: string, domain: string): string {
    let enhanced = content;

    switch (domain) {
      case 'technical':
        if (!/(bug|issue|problem|challenge|failed|broke)/i.test(enhanced)) {
          enhanced += ' This approach has edge cases with concurrent requests.';
        }
        if (!/(while|although|however)/i.test(enhanced)) {
          enhanced += ' While this improves throughput, it increases memory usage by 15%.';
        }
        break;

      case 'executive':
        if (!/(because|since|given)/i.test(enhanced)) {
          enhanced += ' We chose this path because it delivers results in 2 quarters vs 4.';
        }
        break;

      case 'academic':
        if (!/(limit|constraint|caveat)/i.test(enhanced)) {
          enhanced += ' This approach has limitations in small sample sizes.';
        }
        break;

      case 'casual':
        if (!/(I've|we've|I found)/i.test(enhanced)) {
          enhanced += " I've seen this pattern work well in production.";
        }
        break;
    }

    return enhanced;
  }

  private addSpecificity(content: string, domain: string): string {
    let specific = content;

    if (domain === 'technical') {
      specific = specific.replace(/\bthe system\b/gi, 'Redis 7.0');
      specific = specific.replace(/\bthe algorithm\b/gi, 'Dijkstra\'s algorithm');
      specific = specific.replace(/\bthe database\b/gi, 'PostgreSQL 15');
    }

    specific = specific.replace(/\b(Redis|PostgreSQL|MySQL|MongoDB|Node|React|Vue|Angular)\b/gi, (match) => {
      const versions: Record<string, string> = {
        redis: 'Redis 7.0',
        postgresql: 'PostgreSQL 15',
        mysql: 'MySQL 8.0',
        mongodb: 'MongoDB 6.0',
        node: 'Node.js 20',
        react: 'React 18',
        vue: 'Vue 3',
        angular: 'Angular 17'
      };
      return versions[match.toLowerCase()] || match;
    });

    return specific;
  }

  private identifyChanges(
    before: string,
    after: string,
    beforeValidation: ValidationResult,
    afterValidation: ValidationResult,
    options: ExampleGenerationOptions
  ): Change[] {
    const changes: Change[] = [];

    // Identify banned phrase removals
    const bannedPhraseIssues = beforeValidation.issues.filter(i => i.type === 'banned_phrase');
    bannedPhraseIssues.forEach(issue => {
      const original = issue.context || issue.message;
      changes.push({
        type: 'banned-phrase',
        original: original.substring(0, 50),
        replacement: 'Removed or replaced with specific language',
        reasoning: `Banned phrase triggers AI detection`
      });
    });

    // Pattern-specific changes (when no validator available)
    if (options.patternType === 'banned-phrases' || options.patternType === 'all') {
      const bannedPhrases = /(it is important to note|delve|crucial role|at the end of the day|seamless|comprehensive|robust)/i;
      if (bannedPhrases.test(before)) {
        changes.push({ type: 'banned-phrase', original: 'AI trigger phrases', replacement: 'Natural language', reasoning: 'Removed banned phrases' });
      }
    }

    // Identify structure changes (always check)
    if (before.includes('Firstly') || before.includes('Moreover') || before.includes('Furthermore')) {
      changes.push({
        type: 'structure',
        original: 'Formulaic transitions (Firstly, Moreover, Furthermore)',
        replacement: 'Varied sentence flow with natural transitions',
        reasoning: 'Formulaic enumeration is AI tell; natural flow reads more human'
      });
    }

    // Identify voice strengthening (always check)
    if (before.includes('one should') || before.includes('it is important to note')) {
      changes.push({
        type: 'voice',
        original: 'Passive, hedged voice',
        replacement: 'Direct, authoritative voice',
        reasoning: 'Weak voice signals AI; strong assertions show human confidence'
      });
    }

    // Identify specificity additions
    if (!before.match(/\d+(%|ms|MB|GB|K)/) && after.match(/\d+(%|ms|MB|GB|K)/)) {
      changes.push({
        type: 'specificity',
        original: 'Vague claims (no metrics)',
        replacement: 'Concrete metrics (30%, 150ms, etc.)',
        reasoning: 'Specific numbers demonstrate real-world experience'
      });
    }

    // Identify technology specificity
    if (before.includes('the system') && !after.includes('the system')) {
      changes.push({
        type: 'specificity',
        original: 'Generic "the system"',
        replacement: 'Specific technologies (Redis, PostgreSQL)',
        reasoning: 'Naming real tools shows hands-on experience'
      });
    }

    // Add authenticity marker additions
    if (afterValidation.humanMarkers.length > beforeValidation.humanMarkers.length) {
      changes.push({
        type: 'voice',
        original: 'No authenticity markers',
        replacement: 'Added opinions, trade-offs, or problem acknowledgments',
        reasoning: 'Human writers acknowledge complexity and make trade-offs'
      });
    }

    return changes;
  }

  private generateReasoningFromChanges(
    changes: Change[],
    beforeValidation: ValidationResult,
    afterValidation: ValidationResult
  ): string {
    const lines: string[] = [];

    lines.push(`Original content scored ${beforeValidation.score}/100 (AI-detected).`);
    lines.push(`Improved content scores ${afterValidation.score}/100 (human-like).`);
    lines.push(`Delta: +${afterValidation.score - beforeValidation.score} points.\n`);

    if (changes.length > 0) {
      lines.push(`Applied ${changes.length} transformations:\n`);

      const bannedPhraseChanges = changes.filter(c => c.type === 'banned-phrase');
      if (bannedPhraseChanges.length > 0) {
        lines.push(`**Banned Phrase Removal (${bannedPhraseChanges.length}):**`);
        lines.push('Removed AI trigger phrases that guarantee detection.\n');
      }

      const structureChanges = changes.filter(c => c.type === 'structure');
      if (structureChanges.length > 0) {
        lines.push(`**Structure Breaking (${structureChanges.length}):**`);
        lines.push('Removed formulaic transitions and list-like enumeration.\n');
      }

      const voiceChanges = changes.filter(c => c.type === 'voice');
      if (voiceChanges.length > 0) {
        lines.push(`**Voice Strengthening (${voiceChanges.length}):**`);
        lines.push('Transformed weak/passive voice to direct assertions.\n');
      }

      const specificityChanges = changes.filter(c => c.type === 'specificity');
      if (specificityChanges.length > 0) {
        lines.push(`**Specificity Enhancement (${specificityChanges.length}):**`);
        lines.push('Added concrete metrics, specific technologies, and real-world details.\n');
      }
    }

    return lines.join('\n');
  }

  private extractKeyLearnings(example: GeneratedExample): string[] {
    const learnings: string[] = [];

    if (example.score.delta > 50) {
      learnings.push('High score improvement (+50+) achieved through multiple complementary changes');
    }

    const bannedPhraseCount = example.changes.filter(c => c.type === 'banned-phrase').length;
    if (bannedPhraseCount > 2) {
      learnings.push(`Removed ${bannedPhraseCount} banned phrases - these are instant AI tells`);
    }

    const hasSpecificity = example.changes.some(c => c.type === 'specificity');
    if (hasSpecificity) {
      learnings.push('Adding specific metrics and technologies significantly improves authenticity');
    }

    const hasStructure = example.changes.some(c => c.type === 'structure');
    if (hasStructure) {
      learnings.push('Breaking formulaic structures (lists, transitions) is critical');
    }

    if (example.score.after >= 75) {
      learnings.push('Final score 75+ indicates human-like quality');
    }

    return learnings;
  }

  private generateComparisonSummary(
    total: number,
    avgBefore: number,
    avgAfter: number,
    avgDelta: number,
    commonPatterns: Map<string, number>
  ): string {
    const lines: string[] = [];

    lines.push(`Analyzed ${total} examples:`);
    lines.push(`- Average "before" score: ${avgBefore.toFixed(1)}/100`);
    lines.push(`- Average "after" score: ${avgAfter.toFixed(1)}/100`);
    lines.push(`- Average improvement: +${avgDelta.toFixed(1)} points\n`);

    if (commonPatterns.size > 0) {
      const topPatterns = Array.from(commonPatterns.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

      lines.push('Most common issues:');
      topPatterns.forEach(([pattern, count]) => {
        lines.push(`- ${pattern} (${count} occurrences)`);
      });
    }

    return lines.join('\n');
  }

  private getBeforeTemplates(domain: string, patternType: string): string[] {
    const templates: Record<string, string[]> = {
      'technical-banned-phrases': [
        'It is important to note that {topic} plays a crucial role in modern development. When delving into {topic}, one must consider various aspects. At the end of the day, seamless integration is absolutely essential.',
        '{topic} provides a comprehensive and robust solution. It is worth noting that this cutting-edge approach leverages state-of-the-art techniques. Various aspects should be carefully considered.',
      ],
      'technical-formulaic-structures': [
        '{topic} involves several key considerations. Firstly, architecture must be carefully planned. Secondly, implementation requires attention to detail. Thirdly, testing is essential. Finally, deployment should be comprehensive.',
        'There are three main approaches to {topic}. Moreover, each approach has distinct advantages. Furthermore, selection depends on requirements. Additionally, trade-offs must be considered.',
      ],
      'technical-weak-voice': [
        'One should consider {topic} carefully. It must be noted that proper implementation may help to achieve desired results. The system can serve to improve performance significantly.',
      ],
      'academic-banned-phrases': [
        'It is important to note that {topic} plays a vital role in contemporary research. When delving into {topic}, researchers must consider comprehensive methodologies. At the end of the day, robust analysis is essential.',
      ],
      'executive-banned-phrases': [
        'It is important to note that {topic} plays a crucial role in strategic planning. Delving into {topic} reveals comprehensive opportunities. At the end of the day, seamless execution delivers robust ROI.',
      ],
      'casual-banned-phrases': [
        'It is important to note that {topic} is pretty crucial. When you delve into {topic}, you need to consider various things. At the end of the day, seamless integration is really important.',
      ]
    };

    const key = `${domain}-${patternType}`;
    if (templates[key]) {
      return templates[key];
    }

    const domainTemplates: string[] = [];
    for (const [templateKey, templateList] of Object.entries(templates)) {
      if (templateKey.startsWith(domain) || patternType === 'all') {
        domainTemplates.push(...templateList);
      }
    }

    return domainTemplates.length > 0 ? domainTemplates : templates['technical-banned-phrases'];
  }

  private exportAsMarkdown(examples: GeneratedExample[]): string {
    const lines: string[] = [];

    lines.push('# AIWG - Example Corpus\n');
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push(`Total Examples: ${examples.length}\n`);
    lines.push('---\n');

    examples.forEach((example, idx) => {
      lines.push(`## Example ${idx + 1}: ${example.domain}\n`);
      lines.push(`### Before (Score: ${example.score.before}/100)\n`);
      lines.push(example.before + '\n');
      lines.push(`### After (Score: ${example.score.after}/100)\n`);
      lines.push(example.after + '\n');
      lines.push('### Changes Applied\n');
      example.changes.forEach((change, changeIdx) => {
        lines.push(`${changeIdx + 1}. **${change.type}**: ${change.reasoning}`);
      });
      lines.push('\n### Score Improvement\n');
      lines.push(`- Delta: +${example.score.delta} points\n`);
      lines.push('---\n');
    });

    return lines.join('\n');
  }

  private exportAsJSON(examples: GeneratedExample[]): string {
    return JSON.stringify({
      generated: new Date().toISOString(),
      totalExamples: examples.length,
      examples
    }, null, 2);
  }

  private exportAsHTML(examples: GeneratedExample[]): string {
    const html: string[] = [];
    html.push('<!DOCTYPE html><html><head><title>Examples</title></head><body>');
    html.push(`<h1>AIWG Examples (${examples.length})</h1>`);
    examples.forEach((ex, idx) => {
      html.push(`<div class="example"><h2>Example ${idx + 1}</h2>`);
      html.push(`<h3>Before (${ex.score.before})</h3><p>${this.escapeHtml(ex.before)}</p>`);
      html.push(`<h3>After (${ex.score.after})</h3><p>${this.escapeHtml(ex.after)}</p></div>`);
    });
    html.push('</body></html>');
    return html.join('\n');
  }

  private escapeHtml(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  private createMockValidation(content: string, score: number): ValidationResult {
    return {
      score,
      issues: [],
      summary: {
        totalIssues: 0,
        criticalCount: 0,
        warningCount: 0,
        infoCount: 0,
        authenticityScore: score,
        aiPatternScore: 100 - score,
        wordCount: content.split(/\s+/).length,
        sentenceCount: content.split(/[.!?]+/).length
      },
      suggestions: [],
      humanMarkers: [],
      aiTells: []
    };
  }

  // Legacy private methods

  private generateAIContent(topic: string): string {
    const aiPatterns = [
      `It's important to note that ${topic} is a critical consideration in modern software development.`,
      `When we delve into the realm of ${topic}, we uncover various nuanced aspects that absolutely must be addressed.`,
      `At the end of the day, ${topic} plays a pivotal role in ensuring success and driving innovation.`,
    ];
    return aiPatterns.join(' ');
  }

  private generateBaseContent(concept: string, voice: Voice): string {
    switch (voice) {
      case 'academic':
        return `Recent research suggests that ${concept} demonstrates significant implications for system architecture.`;
      case 'technical':
        return `${concept} affects system performance through latency reduction and throughput optimization.`;
      case 'executive':
        return `${concept} delivers measurable ROI through efficiency gains and cost reduction.`;
      case 'casual':
        return `${concept} makes a real difference in how systems perform.`;
      default:
        return `${concept} is an important consideration.`;
    }
  }

  private generateUseCaseContent(useCase: string, voice: Voice): string {
    const templates: Record<Voice, string> = {
      academic: `The ${useCase} use case presents opportunities for systematic investigation.`,
      technical: `Implementing ${useCase} requires attention to latency budgets and resource allocation.`,
      executive: `${useCase} directly impacts user satisfaction and retention metrics.`,
      casual: `${useCase} is something users run into all the time.`,
    };
    return templates[voice];
  }

  private generateApproachContent(topic: string, approach: string): string {
    return `The ${approach} approach to ${topic} offers specific advantages in production environments.`;
  }

  private generateStatementsAboutTopic(topic: string, count: number): string[] {
    const statements = [
      `${topic} affects system behavior in multiple ways.`,
      `Performance characteristics vary based on configuration.`,
      `Implementation patterns depend on specific requirements.`,
      `Error handling requires careful consideration.`,
      `${topic} best practices evolve with technology.`,
      `Testing approaches should cover edge cases.`,
      `Documentation helps maintain ${topic} implementations.`,
      `Monitoring ${topic} provides valuable insights.`,
    ];
    return statements.slice(0, count);
  }

  private generateCodeExampleForVoice(_technology: string, voice: Voice): CodeExample {
    const examples: Record<Voice, { code: string; context: string }> = {
      technical: {
        code: `// Connection pooling for high throughput\nconst pool = new ConnectionPool({ max: 10 });`,
        context: 'Technical documentation',
      },
      academic: {
        code: `// Research suggests (Chen et al., 2023)\nclass ConnectionPool {}`,
        context: 'Academic paper',
      },
      casual: {
        code: `// Here's the thing - keep a few connections ready\nconst pool = new ConnectionPool();`,
        context: 'Blog post',
      },
      executive: {
        code: `// 40% latency reduction = $500K savings\nconst pool = new ConnectionPool();`,
        context: 'Executive summary',
      },
    };
    const example = examples[voice] || examples.technical;
    return { code: example.code, language: 'typescript', voice, context: example.context };
  }

  private identifyImprovements(before: string, after: string): string[] {
    const improvements: string[] = [];

    // Check for removed AI patterns
    if (before.includes('delve') && !after.includes('delve')) {
      improvements.push('Removed "delve" - typical AI filler word');
    }
    if (before.includes('It is important to note') && !after.includes('It is important to note')) {
      improvements.push('Removed "It is important to note" AI pattern');
    }

    // Check for added metrics
    if (!before.match(/\d+(ms|%|KB|MB|GB|\$)/) && after.match(/\d+(ms|%|KB|MB|GB|\$)/)) {
      improvements.push('Added specific metrics');
    }

    // Check for added personal perspective
    if (!before.match(/\bI\s+(believe|think|found|recommend)\b/i) && after.match(/\bI\s+(believe|think|found|recommend)\b/i)) {
      improvements.push('Added personal perspective');
    }
    if (!before.match(/\bI've\b|\bwe\b/i) && after.match(/\bI've\b|\bwe\b/i)) {
      improvements.push('Added personal perspective through contractions');
    }

    // Check for reduced redundancy (shorter content with same meaning)
    const beforeWordCount = before.split(/\s+/).length;
    const afterWordCount = after.split(/\s+/).length;
    if (beforeWordCount > afterWordCount * 1.5) {
      improvements.push('Made content more concise by removing redundancy');
    }

    return improvements.length > 0 ? improvements : ['General refinement'];
  }

  private identifyDemonstratedPrinciples(content: string, voice: Voice): string[] {
    const principles: string[] = [];

    // Academic principles
    if (voice === 'academic' && content.match(/\(\w+,\s*\d{4}\)/)) {
      principles.push('Academic citations');
    }

    // Technical principles
    if (voice === 'technical' && content.match(/\d+ms|\d+%/)) {
      principles.push('Specific technical metrics');
    }

    // Executive/business principles
    if (voice === 'executive') {
      if (content.match(/\$[\d,]+[KM]?|\d+%\s*(ROI|savings|cost)/i)) {
        principles.push('Financial metrics for business decision');
      }
      if (content.match(/annual|quarterly|ROI/i)) {
        principles.push('Business-oriented timeframes');
      }
    }

    // Casual principles
    if (voice === 'casual') {
      if (content.match(/\bI've\b|\bwe've\b|\bhere's\b|\bthat's\b/i)) {
        principles.push('Natural contraction usage');
      }
      if (content.match(/\bI\s+(think|believe|found|saw|seen)\b/i)) {
        principles.push('Personal experience sharing');
      }
      if (content.match(/the thing is|here's the thing/i)) {
        principles.push('Conversational analogy pattern');
      }
    }

    // General authenticity markers (apply to all voices)
    if (content.match(/\bhowever\b|\balthough\b|\bwhile\b/i)) {
      principles.push('Nuanced perspective with qualifiers');
    }
    if (content.match(/\btrade-?off|limitation|constraint|caveat/i)) {
      principles.push('Acknowledges limitations');
    }

    return principles;
  }

  /**
   * Generate diverse scenarios with specific count
   */
  async generateDiverseScenarios(
    useCase: string,
    count: number
  ): Promise<Scenario[]> {
    const scenarios: Scenario[] = [];
    const perspectives: Perspective[] = ['first-person', 'third-person', 'neutral'];
    const voices: Voice[] = ['technical', 'executive', 'casual', 'academic'];

    for (let i = 0; i < count; i++) {
      const perspective = perspectives[i % perspectives.length];
      const voice = voices[i % voices.length];

      const baseContent = this.generateUseCaseContent(useCase, voice);
      const variation = await this.diversifier.generateVariation(baseContent, {
        perspective,
        voice,
      });

      scenarios.push({
        description: variation.content,
        perspective,
        useCase,
        voice,
      });
    }

    return scenarios;
  }
}
