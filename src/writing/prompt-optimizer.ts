/**
 * Prompt Optimization Engine
 *
 * Analyzes and improves prompts to reduce AI patterns and increase authentic output quality.
 * Incorporates AI Writing Guide principles to transform vague prompts into specific,
 * constraint-rich instructions that produce human-like content.
 */

export interface OptimizationResult {
  originalPrompt: string;
  optimizedPrompt: string;
  improvements: Improvement[];
  score: {
    before: number;
    after: number;
    delta: number;
  };
  reasoning: string;
}

export interface Improvement {
  type: 'specificity' | 'constraints' | 'examples' | 'voice' | 'anti_pattern';
  description: string;
  before: string;
  after: string;
  impact: 'high' | 'medium' | 'low';
}

export interface PromptAnalysis {
  score: number;
  issues: AnalysisIssue[];
  strengths: string[];
  antiPatterns: AntiPattern[];
  suggestions: string[];
}

export interface AnalysisIssue {
  severity: 'critical' | 'warning' | 'info';
  category: string;
  message: string;
  location?: string;
}

export interface AntiPattern {
  pattern: string;
  description: string;
  example: string;
  fix: string;
  locations: number[];
}

export interface OptimizationContext {
  domain?: 'technical' | 'academic' | 'executive' | 'creative';
  audience?: string;
  targetLength?: number;
  voice?: 'academic' | 'technical' | 'executive';
  constraints?: string[];
}

export interface ComparisonResult {
  differences: Difference[];
  improvement: number;
  summary: string;
}

export interface Difference {
  type: 'added' | 'removed' | 'modified';
  before?: string;
  after?: string;
  reason: string;
}

/**
 * Core Prompt Optimizer class
 */
export class PromptOptimizer {
  private bannedPhrases: Set<string>;

  constructor() {
    this.bannedPhrases = this.loadBannedPhrases();
  }

  /**
   * Core optimization - analyzes and improves a prompt
   */
  async optimize(
    prompt: string,
    context?: OptimizationContext
  ): Promise<OptimizationResult> {
    const analysis = this.analyzePrompt(prompt);
    const beforeScore = analysis.score;

    let optimized = prompt;
    const improvements: Improvement[] = [];

    // Apply optimization strategies in order
    if (this.needsSpecificity(prompt)) {
      const result = this.addSpecificity(optimized, context);
      if (result.improved) {
        improvements.push({
          type: 'specificity',
          description: 'Added specificity to vague terms',
          before: optimized,
          after: result.prompt,
          impact: 'high'
        });
        optimized = result.prompt;
      }
    }

    if (this.needsExamples(prompt)) {
      const result = this.addExamples(optimized, context?.domain);
      if (result.improved) {
        improvements.push({
          type: 'examples',
          description: 'Added concrete examples for clarity',
          before: optimized,
          after: result.prompt,
          impact: 'high'
        });
        optimized = result.prompt;
      }
    }

    if (this.needsConstraints(prompt)) {
      const constraints = this.generateConstraints(context);
      const result = this.addConstraints(optimized, constraints);
      if (result.improved) {
        improvements.push({
          type: 'constraints',
          description: 'Added AI Writing Guide constraints',
          before: optimized,
          after: result.prompt,
          impact: 'high'
        });
        optimized = result.prompt;
      }
    }

    if (context?.voice) {
      const result = this.injectVoiceGuidance(optimized, context.voice);
      if (result.improved) {
        improvements.push({
          type: 'voice',
          description: `Injected ${context.voice} voice guidance`,
          before: optimized,
          after: result.prompt,
          impact: 'medium'
        });
        optimized = result.prompt;
      }
    }

    // Remove vagueness
    const vagueResult = this.removeVagueness(optimized);
    if (vagueResult.improved) {
      improvements.push({
        type: 'specificity',
        description: 'Removed vague language',
        before: optimized,
        after: vagueResult.prompt,
        impact: 'medium'
      });
      optimized = vagueResult.prompt;
    }

    // Detect and fix anti-patterns
    const antiPatterns = this.detectAntiPatterns(optimized);
    for (const pattern of antiPatterns) {
      const fixed = this.fixAntiPattern(optimized, pattern);
      if (fixed !== optimized) {
        improvements.push({
          type: 'anti_pattern',
          description: `Removed anti-pattern: ${pattern.description}`,
          before: optimized,
          after: fixed,
          impact: 'high'
        });
        optimized = fixed;
      }
    }

    const afterScore = this.scorePromptQuality(optimized);

    return {
      originalPrompt: prompt,
      optimizedPrompt: optimized,
      improvements,
      score: {
        before: beforeScore,
        after: afterScore,
        delta: afterScore - beforeScore
      },
      reasoning: this.generateReasoning(improvements, beforeScore, afterScore)
    };
  }

  /**
   * Batch optimization - process multiple prompts
   */
  async optimizeBatch(prompts: string[]): Promise<Map<string, OptimizationResult>> {
    const results = new Map<string, OptimizationResult>();

    // Process in parallel batches of 10
    const batchSize = 10;
    for (let i = 0; i < prompts.length; i += batchSize) {
      const batch = prompts.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(p => this.optimize(p))
      );
      batch.forEach((prompt, idx) => {
        results.set(prompt, batchResults[idx]);
      });
    }

    return results;
  }

  /**
   * Analyze prompt quality
   */
  analyzePrompt(prompt: string): PromptAnalysis {
    const issues: AnalysisIssue[] = [];
    const strengths: string[] = [];
    const antiPatterns = this.detectAntiPatterns(prompt);
    const suggestions: string[] = [];

    // Check for specificity
    if (this.isVague(prompt)) {
      issues.push({
        severity: 'critical',
        category: 'specificity',
        message: 'Prompt lacks specific details and concrete examples'
      });
      suggestions.push('Add specific topics, technologies, or concepts');
    } else {
      strengths.push('Contains specific details');
    }

    // Check for constraints
    if (!this.hasConstraints(prompt)) {
      issues.push({
        severity: 'warning',
        category: 'constraints',
        message: 'No constraints or guidelines specified'
      });
      suggestions.push('Add constraints to avoid AI patterns (word count, format, etc.)');
    } else {
      strengths.push('Includes constraints or guidelines');
    }

    // Check for examples
    if (!this.hasExamples(prompt)) {
      issues.push({
        severity: 'warning',
        category: 'examples',
        message: 'No examples provided'
      });
      suggestions.push('Add concrete examples of desired output');
    } else {
      strengths.push('Provides examples');
    }

    // Check for audience specification
    if (!this.hasAudience(prompt)) {
      issues.push({
        severity: 'info',
        category: 'audience',
        message: 'Target audience not specified'
      });
      suggestions.push('Specify target audience or expertise level');
    } else {
      strengths.push('Audience clearly defined');
    }

    // Check for format specification
    if (!this.hasFormat(prompt)) {
      issues.push({
        severity: 'info',
        category: 'format',
        message: 'Output format not specified'
      });
      suggestions.push('Specify desired format (article, report, analysis, etc.)');
    } else {
      strengths.push('Output format specified');
    }

    // Anti-pattern warnings
    if (antiPatterns.length > 0) {
      issues.push({
        severity: 'critical',
        category: 'anti_pattern',
        message: `Found ${antiPatterns.length} anti-pattern(s) that guarantee AI output`
      });
    }

    const score = this.scorePromptQuality(prompt);

    return {
      score,
      issues,
      strengths,
      antiPatterns,
      suggestions
    };
  }

  /**
   * Detect anti-patterns in prompts
   */
  detectAntiPatterns(prompt: string): AntiPattern[] {
    const patterns: AntiPattern[] = [];

    // Vague requests
    if (/^write (about|an article|a guide)/i.test(prompt)) {
      patterns.push({
        pattern: 'vague_request',
        description: 'Generic "write about" request with no specifics',
        example: 'Write about authentication',
        fix: 'Write about OAuth 2.0 authentication for mobile apps, focusing on PKCE flow',
        locations: [0]
      });
    }

    // No constraints
    if (!/(avoid|don't|never use|exclude|without)/i.test(prompt)) {
      patterns.push({
        pattern: 'no_constraints',
        description: 'No constraints or anti-patterns specified',
        example: 'Write an article',
        fix: 'Write an article that: 1) Avoids "delve into" and "it\'s important to note", 2) Includes metrics',
        locations: []
      });
    }

    // Asks for "comprehensive" or "robust"
    const badWords = ['comprehensive', 'robust', 'innovative', 'cutting-edge', 'seamless'];
    for (const word of badWords) {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const matches = Array.from(prompt.matchAll(regex));
      if (matches.length > 0) {
        patterns.push({
          pattern: 'ai_trigger_word',
          description: `Contains AI trigger word: "${word}"`,
          example: `Write a comprehensive guide`,
          fix: `Write a 1,500-word guide covering A, B, and C`,
          locations: matches.map(m => m.index || 0)
        });
      }
    }

    // Generic tone request
    if (/professional tone|formal tone|casual tone/i.test(prompt) && !/avoid|don't use/i.test(prompt)) {
      patterns.push({
        pattern: 'generic_tone',
        description: 'Generic tone request without specific guidance',
        example: 'Use a professional tone',
        fix: 'Write for senior developers. Use technical precision, acknowledge edge cases',
        locations: []
      });
    }

    return patterns;
  }

  /**
   * Score prompt quality (0-100)
   */
  scorePromptQuality(prompt: string): number {
    let score = 50; // baseline

    // Positive factors
    if (this.hasAudience(prompt)) score += 10;
    if (this.hasExamples(prompt)) score += 10;
    if (this.hasFormat(prompt)) score += 10;
    if (this.hasConstraints(prompt)) score += 10;
    if (this.hasVoiceGuidance(prompt)) score += 10;
    if (this.hasMetrics(prompt)) score += 5;
    if (this.hasSpecificTechnologies(prompt)) score += 5;

    // Negative factors
    const antiPatterns = this.detectAntiPatterns(prompt);
    score -= antiPatterns.length * 10;

    if (this.isVague(prompt)) score -= 20;
    if (this.hasBannedPhrases(prompt)) score -= 15;

    // Clamp to 0-100
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Add specificity to vague prompts
   */
  addSpecificity(prompt: string, context?: OptimizationContext): { prompt: string; improved: boolean } {
    let improved = false;
    let result = prompt;

    // Replace vague "write about X" with specific focus
    const writeAboutMatch = prompt.match(/write (about|an article about|a guide about) (\w+)/i);
    if (writeAboutMatch) {
      const topic = writeAboutMatch[2];
      const specificTopic = this.makeTopicSpecific(topic, context?.domain);
      result = prompt.replace(writeAboutMatch[0], `Write about ${specificTopic}`);
      improved = true;
    }

    // Add word count if missing
    if (!/\d+[\s-]word/i.test(result) && context?.targetLength) {
      result = `Write a ${context.targetLength}-word ${result.replace(/^write (a |an )?/i, '')}`;
      improved = true;
    }

    return { prompt: result, improved };
  }

  /**
   * Add examples to prompts
   */
  addExamples(prompt: string, domain?: string): { prompt: string; improved: boolean } {
    if (this.hasExamples(prompt)) {
      return { prompt, improved: false };
    }

    const exampleGuidance = this.generateExampleGuidance(domain);
    const result = `${prompt}\n\n${exampleGuidance}`;

    return { prompt: result, improved: true };
  }

  /**
   * Add constraints to avoid AI patterns
   */
  addConstraints(prompt: string, rules: string[]): { prompt: string; improved: boolean } {
    if (this.hasConstraints(prompt) && rules.length === 0) {
      return { prompt, improved: false };
    }

    const constraintsSection = this.formatConstraints(rules);
    const result = `${prompt}\n\n${constraintsSection}`;

    return { prompt: result, improved: true };
  }

  /**
   * Inject voice guidance for different contexts
   */
  injectVoiceGuidance(prompt: string, voice: 'academic' | 'technical' | 'executive'): { prompt: string; improved: boolean } {
    if (this.hasVoiceGuidance(prompt)) {
      return { prompt, improved: false };
    }

    const guidance = this.getVoiceGuidance(voice);
    const result = `${prompt}\n\n${guidance}`;

    return { prompt: result, improved: true };
  }

  /**
   * Remove vague language
   */
  removeVagueness(prompt: string): { prompt: string; improved: boolean } {
    let result = prompt;
    let improved = false;

    const vagueReplacements: Record<string, string> = {
      'comprehensive guide': 'guide covering [specific topics]',
      'robust solution': '[specific system description]',
      'innovative approach': '[specific method or technique]',
      'cutting-edge': 'new',
      'state-of-the-art': 'current',
      'best practices': 'specific techniques',
      'industry standard': '[name specific standard]'
    };

    for (const [vague, specific] of Object.entries(vagueReplacements)) {
      const regex = new RegExp(vague, 'gi');
      if (regex.test(result)) {
        result = result.replace(regex, specific);
        improved = true;
      }
    }

    return { prompt: result, improved };
  }

  /**
   * Compare original and optimized prompts
   */
  comparePrompts(original: string, optimized: string): ComparisonResult {
    const differences: Difference[] = [];

    // Simple diff based on line-by-line comparison
    const originalLines = original.split('\n');
    const optimizedLines = optimized.split('\n');

    const maxLines = Math.max(originalLines.length, optimizedLines.length);
    for (let i = 0; i < maxLines; i++) {
      const origLine = originalLines[i] || '';
      const optLine = optimizedLines[i] || '';

      if (origLine !== optLine) {
        if (!origLine) {
          differences.push({
            type: 'added',
            after: optLine,
            reason: 'Added new guidance'
          });
        } else if (!optLine) {
          differences.push({
            type: 'removed',
            before: origLine,
            reason: 'Removed vague language'
          });
        } else {
          differences.push({
            type: 'modified',
            before: origLine,
            after: optLine,
            reason: 'Enhanced specificity'
          });
        }
      }
    }

    const originalScore = this.scorePromptQuality(original);
    const optimizedScore = this.scorePromptQuality(optimized);
    const improvement = optimizedScore - originalScore;

    const summary = this.generateComparisonSummary(differences, improvement);

    return {
      differences,
      improvement,
      summary
    };
  }

  /**
   * Load principles from AI Writing Guide
   */
  loadPrinciplesFromGuide(_guidePath: string): void {
    // This would read from the guide files
    // For now, we use the default principles
  }

  // Private helper methods


  private loadBannedPhrases(): Set<string> {
    return new Set([
      'plays a vital role', 'plays a crucial role', 'plays a key role',
      'seamlessly', 'cutting-edge', 'state-of-the-art',
      'comprehensive', 'robust', 'innovative',
      'moreover', 'furthermore', 'additionally',
      'in conclusion', 'to summarize', 'delve into',
      'it is important to note', 'it is worth noting',
      'revolutionary', 'game-changing', 'transformative',
      'next-generation', 'best-in-class', 'industry-leading'
    ]);
  }


  private needsSpecificity(prompt: string): boolean {
    return this.isVague(prompt);
  }

  private needsExamples(prompt: string): boolean {
    return !this.hasExamples(prompt);
  }

  private needsConstraints(prompt: string): boolean {
    return !this.hasConstraints(prompt);
  }

  private isVague(prompt: string): boolean {
    const vagueIndicators = [
      /^write about \w+$/i,
      /^explain \w+$/i,
      /^describe \w+$/i,
      /write (a|an) (article|guide|document)$/i
    ];
    return vagueIndicators.some(pattern => pattern.test(prompt.trim()));
  }

  private hasConstraints(prompt: string): boolean {
    const constraintIndicators = [
      /avoid/i, /don't use/i, /never use/i, /exclude/i,
      /requirements?:/i, /constraints?:/i, /guidelines?:/i,
      /must not/i, /should not/i
    ];
    return constraintIndicators.some(pattern => pattern.test(prompt));
  }

  private hasExamples(prompt: string): boolean {
    const exampleIndicators = [
      /example:/i, /for example/i, /such as/i,
      /like this:/i, /format:/i, /structure:/i
    ];
    return exampleIndicators.some(pattern => pattern.test(prompt));
  }

  private hasAudience(prompt: string): boolean {
    const audienceIndicators = [
      /for (developers|engineers|executives|managers|students|beginners|experts)/i,
      /audience:/i, /readers?:/i, /target:/i
    ];
    return audienceIndicators.some(pattern => pattern.test(prompt));
  }

  private hasFormat(prompt: string): boolean {
    const formatIndicators = [
      /\d+[\s-]word/i, /\d+ words/i, /\d+ pages/i,
      /(article|report|guide|tutorial|analysis|summary|documentation)/i,
      /format:/i, /structure:/i
    ];
    return formatIndicators.some(pattern => pattern.test(prompt));
  }

  private hasVoiceGuidance(prompt: string): boolean {
    const voiceIndicators = [
      /technical precision/i, /acknowledge (trade-?offs|edge cases)/i,
      /include opinions?/i, /based on experience/i,
      /reference (real-world|actual) (challenges|implementation)/i
    ];
    return voiceIndicators.some(pattern => pattern.test(prompt));
  }

  private hasMetrics(prompt: string): boolean {
    return /\d+%|\d+ (ms|seconds|requests|users|bytes|MB|GB)/i.test(prompt);
  }

  private hasSpecificTechnologies(prompt: string): boolean {
    const techPattern = /\b(OAuth|JWT|REST|GraphQL|React|Node|Python|Docker|Kubernetes|AWS|Azure)\b/i;
    return techPattern.test(prompt);
  }

  private hasBannedPhrases(prompt: string): boolean {
    const lowerPrompt = prompt.toLowerCase();
    return Array.from(this.bannedPhrases).some(phrase =>
      lowerPrompt.includes(phrase.toLowerCase())
    );
  }

  private makeTopicSpecific(topic: string, _domain?: string): string {
    // Add context-specific details
    const examples: Record<string, string> = {
      authentication: 'OAuth 2.0 authentication for mobile apps, focusing on PKCE flow and token refresh strategies',
      security: 'application security focusing on OWASP Top 10 vulnerabilities with code examples',
      performance: 'backend performance optimization using caching, database indexing, and query optimization',
      testing: 'integration testing strategies for microservices with contract testing and service virtualization',
      deployment: 'CI/CD pipeline implementation with GitHub Actions, including automated testing and rollback strategies'
    };

    return examples[topic.toLowerCase()] || `${topic} (specify exact subtopic, technologies, and scope)`;
  }

  private generateConstraints(context?: OptimizationContext): string[] {
    const baseConstraints = [
      'Avoid AI detection patterns (no "delve into", "it\'s important to note", "seamlessly", etc.)',
      'Include specific metrics and performance numbers where relevant',
      'Acknowledge trade-offs and edge cases',
      'Use varied sentence structure (mix short and long sentences)',
      'Provide concrete code examples or specific implementation details'
    ];

    if (context?.domain === 'technical') {
      baseConstraints.push(
        'Reference real-world implementation challenges',
        'Include version numbers and specific tools',
        'Mention what failed or what was difficult'
      );
    }

    if (context?.domain === 'academic') {
      baseConstraints.push(
        'Cite specific sources',
        'Acknowledge limitations and counterarguments',
        'Use discipline-appropriate terminology'
      );
    }

    if (context?.domain === 'executive') {
      baseConstraints.push(
        'Start with bottom-line impact (dollars, time, risk)',
        'Avoid hedging - state positions clearly',
        'Include 2-3 specific recommendations with rationale'
      );
    }

    return baseConstraints;
  }

  private generateExampleGuidance(domain?: string): string {
    const base = 'Include concrete examples showing:\n- Specific scenario or use case\n- Expected input and output\n- Key implementation details';

    if (domain === 'technical') {
      return `${base}\n- Code snippets or architecture diagrams\n- Performance metrics and benchmarks`;
    }

    return base;
  }

  private formatConstraints(rules: string[]): string {
    if (rules.length === 0) {
      return '';
    }

    return `Requirements:\n${rules.map((r, i) => `${i + 1}. ${r}`).join('\n')}`;
  }

  private getVoiceGuidance(voice: 'academic' | 'technical' | 'executive'): string {
    const guidance: Record<string, string> = {
      academic: `Academic voice guidelines:
- Use discipline-appropriate terminology (not simplified)
- Cite specific sources and methodologies
- Acknowledge limitations and counterarguments
- Maintain formal but not stilted tone
- Avoid AI patterns like "it is worth noting"`,

      technical: `Technical voice guidelines:
- Write for senior developers/engineers
- Use technical precision and domain vocabulary
- Include opinions based on experience
- Acknowledge edge cases and failure modes
- Reference actual implementation challenges you've faced
- Avoid generic descriptions - be specific about technologies and versions`,

      executive: `Executive voice guidelines:
- Start with bottom-line impact (financial, time, risk)
- Avoid hedging - state clear positions
- Maximum brevity while maintaining completeness
- Include 2-3 specific recommendations with rationale
- No filler phrases or platitudes`
    };

    return guidance[voice] || '';
  }

  private fixAntiPattern(prompt: string, pattern: AntiPattern): string {
    // Basic fixes for common anti-patterns
    if (pattern.pattern === 'vague_request') {
      return prompt.replace(/^write (about|an article about|a guide about)/i,
        'Write a detailed technical article about');
    }

    if (pattern.pattern === 'ai_trigger_word') {
      let result = prompt;
      // Remove trigger words
      for (const word of ['comprehensive', 'robust', 'innovative', 'cutting-edge', 'seamless']) {
        result = result.replace(new RegExp(`\\b${word}\\b`, 'gi'), '');
      }
      return result.replace(/\s+/g, ' ').trim();
    }

    return prompt;
  }

  private generateReasoning(improvements: Improvement[], beforeScore: number, afterScore: number): string {
    const lines: string[] = [];

    lines.push(`Original prompt scored ${beforeScore}/100.`);

    if (improvements.length === 0) {
      lines.push('No improvements needed - prompt already well-optimized.');
      return lines.join(' ');
    }

    lines.push(`Applied ${improvements.length} optimization(s):`);

    const highImpact = improvements.filter(i => i.impact === 'high');
    const mediumImpact = improvements.filter(i => i.impact === 'medium');

    if (highImpact.length > 0) {
      lines.push(`\nHigh-impact changes (${highImpact.length}):`);
      highImpact.forEach(i => lines.push(`- ${i.description}`));
    }

    if (mediumImpact.length > 0) {
      lines.push(`\nMedium-impact changes (${mediumImpact.length}):`);
      mediumImpact.forEach(i => lines.push(`- ${i.description}`));
    }

    lines.push(`\nOptimized prompt now scores ${afterScore}/100 (+${afterScore - beforeScore} points).`);

    return lines.join('\n');
  }

  private generateComparisonSummary(differences: Difference[], improvement: number): string {
    const added = differences.filter(d => d.type === 'added').length;
    const removed = differences.filter(d => d.type === 'removed').length;
    const modified = differences.filter(d => d.type === 'modified').length;

    return `Changed ${differences.length} section(s): ${added} added, ${removed} removed, ${modified} modified. Overall improvement: ${improvement > 0 ? '+' : ''}${improvement} points.`;
  }
}

