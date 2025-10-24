/**
 * Content Diversification Engine
 *
 * Generates diverse variations of content using different voices, perspectives,
 * and structural approaches while maintaining authenticity and avoiding AI detection patterns.
 */

export type Voice = 'academic' | 'technical' | 'executive' | 'casual';
export type Perspective = 'first-person' | 'third-person' | 'neutral';
export type Structure = 'bullets' | 'narrative' | 'qa' | 'tutorial' | 'comparison';
export type Tone = 'formal' | 'conversational' | 'enthusiastic' | 'matter-of-fact';
export type Length = 'concise' | 'standard' | 'comprehensive';

export interface DiversificationOptions {
  voice?: Voice;
  perspective?: Perspective;
  structure?: Structure;
  tone?: Tone;
  length?: Length;
}

export interface ContentVariation {
  content: string;
  options: DiversificationOptions;
  score: {
    authenticity: number;
    diversity: number; // how different from original
  };
  changes: string[]; // description of changes made
}

export interface DiversificationResult {
  original: string;
  variations: ContentVariation[];
  metadata: {
    originalVoice: Voice | 'mixed';
    originalLength: number;
    variationsGenerated: number;
  };
}

interface VoiceCharacteristics {
  markers: RegExp[];
  vocabulary: string[];
  structurePreferences: string[];
}

/**
 * Core Content Diversification Engine
 */
export class ContentDiversifier {
  private voiceCharacteristics: Map<Voice, VoiceCharacteristics>;

  constructor() {
    this.voiceCharacteristics = this.initializeVoiceCharacteristics();
  }

  /**
   * Generate multiple variations of content with different options
   */
  async diversify(
    content: string,
    optionsList: DiversificationOptions[]
  ): Promise<DiversificationResult> {
    const originalVoice = this.detectVoice(content);
    const variations: ContentVariation[] = [];

    for (const options of optionsList) {
      const variation = await this.generateVariation(content, options);
      variations.push(variation);
    }

    return {
      original: content,
      variations,
      metadata: {
        originalVoice,
        originalLength: content.length,
        variationsGenerated: variations.length,
      },
    };
  }

  /**
   * Generate a single variation with specified options
   */
  async generateVariation(
    content: string,
    options: DiversificationOptions
  ): Promise<ContentVariation> {
    let transformed = content;
    const changes: string[] = [];

    // Apply transformations in order
    if (options.voice) {
      const currentVoice = this.detectVoice(transformed);
      transformed = this.transformVoice(transformed, currentVoice, options.voice);
      changes.push(`Voice: ${currentVoice} → ${options.voice}`);
    }

    if (options.perspective) {
      transformed = this.changePerspective(transformed, options.perspective);
      changes.push(`Perspective: → ${options.perspective}`);
    }

    if (options.structure) {
      transformed = this.restructure(transformed, options.structure);
      changes.push(`Structure: → ${options.structure}`);
    }

    if (options.tone) {
      transformed = this.adjustTone(transformed, options.tone);
      changes.push(`Tone: → ${options.tone}`);
    }

    if (options.length) {
      transformed = this.adjustLength(transformed, options.length);
      changes.push(`Length: → ${options.length}`);
    }

    // Calculate scores
    const authenticity = this.scoreAuthenticity(transformed);
    const diversity = this.scoreDiversity(content, transformed);

    return {
      content: transformed,
      options,
      score: {
        authenticity,
        diversity,
      },
      changes,
    };
  }

  /**
   * Transform content from one voice to another
   */
  transformVoice(content: string, _fromVoice: Voice | 'mixed', toVoice: Voice): string {
    switch (toVoice) {
      case 'academic':
        return this.toAcademicVoice(content);
      case 'technical':
        return this.toTechnicalVoice(content);
      case 'executive':
        return this.toExecutiveVoice(content);
      case 'casual':
        return this.toCasualVoice(content);
      default:
        return content;
    }
  }

  /**
   * Transform to academic voice
   */
  toAcademicVoice(content: string): string {
    let transformed = content;

    // Add hedging and qualifications
    transformed = transformed.replace(
      /\b(is|are|will|must|should)\b/gi,
      (match) => {
        const hedges = ['appears to be', 'suggests', 'may', 'could', 'might'];
        return Math.random() > 0.7 ? hedges[Math.floor(Math.random() * hedges.length)] : match;
      }
    );

    // Add citations and references
    const sentences = this.splitIntoSentences(transformed);
    const citationSentences = Math.floor(sentences.length * 0.3);
    const citations = ['(Smith, 2023)', '(Johnson et al., 2022)', '(Lee & Chen, 2024)', '(Anderson, 2021)'];

    for (let i = 0; i < citationSentences && i < sentences.length; i++) {
      const idx = Math.floor(Math.random() * sentences.length);
      const citation = citations[Math.floor(Math.random() * citations.length)];
      sentences[idx] = sentences[idx].replace(/\.$/, ` ${citation}.`);
    }

    transformed = sentences.join(' ');

    // Add formal transitions
    transformed = transformed.replace(
      /\. ([A-Z])/g,
      (match, letter) => {
        const transitions = [
          '. Furthermore, ',
          '. Moreover, ',
          '. However, ',
          '. Nevertheless, ',
          '. Consequently, ',
        ];
        return Math.random() > 0.7
          ? transitions[Math.floor(Math.random() * transitions.length)] + letter
          : match;
      }
    );

    // Add acknowledgment of limitations
    if (!transformed.includes('limit') && Math.random() > 0.5) {
      transformed += ' It should be noted that this approach has certain limitations that warrant further investigation.';
    }

    return transformed;
  }

  /**
   * Transform to technical voice
   */
  toTechnicalVoice(content: string): string {
    let transformed = content;

    // Add specific metrics and numbers
    transformed = transformed.replace(
      /\b(fast|slow|quick|better|improved|reduced)\b/gi,
      (match) => {
        const metrics = ['30%', '2.5x', '150ms', '40MB', '5 seconds'];
        return Math.random() > 0.6
          ? `${match} by ${metrics[Math.floor(Math.random() * metrics.length)]}`
          : match;
      }
    );

    // Add technical terminology
    const technicalTerms: Record<string, string> = {
      'data': 'payload',
      'information': 'metadata',
      'storage': 'persistence layer',
      'speed': 'latency',
      'connection': 'TCP connection',
      'code': 'implementation',
    };

    for (const [casual, technical] of Object.entries(technicalTerms)) {
      const regex = new RegExp(`\\b${casual}\\b`, 'gi');
      if (Math.random() > 0.5) {
        transformed = transformed.replace(regex, technical);
      }
    }

    // Add implementation details
    const implementationExamples = [
      ' This can be achieved through connection pooling.',
      ' The implementation leverages a non-blocking I/O model.',
      ' We utilize a LRU cache with a 10-minute TTL.',
      ' The system employs exponential backoff for retry logic.',
    ];

    if (Math.random() > 0.6) {
      const sentences = this.splitIntoSentences(transformed);
      const insertIdx = Math.floor(sentences.length / 2);
      sentences[insertIdx] += implementationExamples[Math.floor(Math.random() * implementationExamples.length)];
      transformed = sentences.join(' ');
    }

    return transformed;
  }

  /**
   * Transform to executive voice
   */
  toExecutiveVoice(content: string): string {
    let transformed = content;

    // Remove hedging - make assertions
    transformed = transformed.replace(/\b(might|could|possibly|perhaps|maybe)\b/gi, 'will');
    transformed = transformed.replace(/\b(appears to|seems to|suggests)\b/gi, 'demonstrates');

    // Add business metrics
    const businessMetrics = [
      '$500K annually',
      '30% ROI',
      '2 quarters',
      '15% market share',
      '$2M cost savings',
      '40% efficiency gain',
    ];

    transformed = transformed.replace(
      /\b(savings|revenue|cost|value|benefit)\b/gi,
      (match) => {
        return Math.random() > 0.6
          ? `${match} of ${businessMetrics[Math.floor(Math.random() * businessMetrics.length)]}`
          : match;
      }
    );

    // Add decision-focused language
    const decisionPhrases = [
      'We recommend',
      'The strategic priority is',
      'Our analysis indicates',
      'The optimal approach requires',
      'To maximize value, we should',
    ];

    const sentences = this.splitIntoSentences(transformed);
    if (sentences.length > 0) {
      const firstSentence = decisionPhrases[Math.floor(Math.random() * decisionPhrases.length)] +
        ' ' + sentences[0].toLowerCase();
      sentences[0] = firstSentence;
    }

    // Add risk/opportunity framing
    if (Math.random() > 0.5) {
      sentences.push('This approach mitigates execution risk while positioning us for Q3 growth targets.');
    }

    return sentences.join(' ');
  }

  /**
   * Transform to casual voice
   */
  toCasualVoice(content: string): string {
    let transformed = content;

    // Add contractions
    const contractions: Record<string, string> = {
      'do not': "don't",
      'does not': "doesn't",
      'will not': "won't",
      'cannot': "can't",
      'it is': "it's",
      'that is': "that's",
      'we are': "we're",
      'you are': "you're",
      'they are': "they're",
    };

    for (const [formal, casual] of Object.entries(contractions)) {
      const regex = new RegExp(`\\b${formal}\\b`, 'gi');
      transformed = transformed.replace(regex, casual);
    }

    // Add conversational phrases
    const conversationalStarts = [
      "Here's the thing - ",
      "Look, ",
      "The reality is ",
      "Here's what matters: ",
      "Bottom line? ",
    ];

    const sentences = this.splitIntoSentences(transformed);
    if (sentences.length > 1 && Math.random() > 0.6) {
      const idx = Math.floor(Math.random() * Math.min(2, sentences.length));
      sentences[idx] = conversationalStarts[Math.floor(Math.random() * conversationalStarts.length)] +
        sentences[idx].toLowerCase();
    }

    // Add personal examples
    if (Math.random() > 0.6) {
      const personalExamples = [
        "I've seen this pattern in production systems before.",
        "We ran into this exact issue last quarter.",
        "This reminds me of a project we did in 2022.",
      ];
      sentences.push(personalExamples[Math.floor(Math.random() * personalExamples.length)]);
    }

    // Add analogies
    if (Math.random() > 0.5) {
      const analogies = [
        "Think of it like a conveyor belt - things need to move at a steady pace.",
        "It's similar to how a restaurant kitchen handles orders during rush hour.",
        "You can think of this as the difference between a highway and city streets.",
      ];
      sentences.splice(
        Math.floor(sentences.length / 2),
        0,
        analogies[Math.floor(Math.random() * analogies.length)]
      );
    }

    return sentences.join(' ');
  }

  /**
   * Change perspective of content
   */
  changePerspective(content: string, perspective: Perspective): string {
    switch (perspective) {
      case 'first-person':
        return this.toFirstPerson(content);
      case 'third-person':
        return this.toThirdPerson(content);
      case 'neutral':
        return this.toNeutral(content);
      default:
        return content;
    }
  }

  /**
   * Convert to first-person perspective
   */
  toFirstPerson(content: string): string {
    let transformed = content;

    // Replace third-person with first-person
    transformed = transformed.replace(/\bone\b/gi, 'I');
    transformed = transformed.replace(/\bthe (user|developer|reader)\b/gi, 'I');
    transformed = transformed.replace(/\bwe can\b/gi, 'I can');

    // Add personal statements
    if (!transformed.includes(' I ') && Math.random() > 0.5) {
      const sentences = this.splitIntoSentences(transformed);
      sentences[0] = "In my experience, " + sentences[0].toLowerCase();
      transformed = sentences.join(' ');
    }

    return transformed;
  }

  /**
   * Convert to third-person perspective
   */
  toThirdPerson(content: string): string {
    let transformed = content;

    // Replace first-person with third-person
    transformed = transformed.replace(/\bI\b/g, 'one');
    transformed = transformed.replace(/\bmy\b/gi, 'their');
    transformed = transformed.replace(/\bwe\b/gi, 'they');
    transformed = transformed.replace(/\bour\b/gi, 'their');

    return transformed;
  }

  /**
   * Convert to neutral perspective
   */
  toNeutral(content: string): string {
    let transformed = content;

    // Remove personal pronouns
    transformed = transformed.replace(/\b(I|we|you|my|our|your)\b/gi, (match) => {
      const replacements: Record<string, string> = {
        'I': 'the system',
        'we': 'the approach',
        'you': 'users',
        'my': 'the',
        'our': 'the',
        'your': 'user',
      };
      return replacements[match.toLowerCase()] || match;
    });

    // Add passive voice
    transformed = transformed.replace(/\b(can|will|should) (\w+)/g, '$2 can be');

    return transformed;
  }

  /**
   * Restructure content into different format
   */
  restructure(content: string, structure: Structure): string {
    switch (structure) {
      case 'bullets':
        return this.toBulletPoints(content);
      case 'narrative':
        return this.toNarrative(content);
      case 'qa':
        return this.toQA(content);
      case 'tutorial':
        return this.toTutorial(content);
      case 'comparison':
        return this.toComparison(content);
      default:
        return content;
    }
  }

  /**
   * Convert to bullet point format
   */
  toBulletPoints(content: string): string {
    const sentences = this.splitIntoSentences(content);
    const bullets = sentences.map(sentence => `- ${sentence.trim()}`);
    return bullets.join('\n');
  }

  /**
   * Convert to narrative format
   */
  toNarrative(content: string): string {
    const lines = content.split('\n').filter(line => line.trim());
    let narrative = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].replace(/^[-*]\s*/, '').trim();

      if (i === 0) {
        narrative += line + '. ';
      } else {
        const transitions = ['Additionally', 'Furthermore', 'Next', 'Then', 'Moreover', 'Also'];
        const transition = transitions[Math.floor(Math.random() * transitions.length)];
        narrative += `${transition}, ${line.toLowerCase()}. `;
      }
    }

    return narrative.trim();
  }

  /**
   * Convert to Q&A format
   */
  toQA(content: string): string {
    const sentences = this.splitIntoSentences(content);
    let qa = '';

    for (let i = 0; i < sentences.length; i += 2) {
      const statement = sentences[i];

      // Generate question from statement
      const question = this.statementToQuestion(statement);
      qa += `Q: ${question}\n`;

      // Use statement as answer
      const answer = sentences[i] + (sentences[i + 1] ? ' ' + sentences[i + 1] : '');
      qa += `A: ${answer}\n\n`;
    }

    return qa.trim();
  }

  /**
   * Convert to tutorial format
   */
  toTutorial(content: string): string {
    const sentences = this.splitIntoSentences(content);
    let tutorial = '## Step-by-Step Guide\n\n';

    sentences.forEach((sentence, idx) => {
      tutorial += `### Step ${idx + 1}\n\n${sentence}\n\n`;
    });

    return tutorial;
  }

  /**
   * Convert to comparison format
   */
  toComparison(content: string): string {
    const sentences = this.splitIntoSentences(content);
    const midpoint = Math.floor(sentences.length / 2);

    let comparison = '## Approach A\n\n';
    for (let i = 0; i < midpoint; i++) {
      comparison += `- ${sentences[i]}\n`;
    }

    comparison += '\n## Approach B\n\n';
    for (let i = midpoint; i < sentences.length; i++) {
      comparison += `- ${sentences[i]}\n`;
    }

    return comparison;
  }

  /**
   * Adjust tone of content
   */
  adjustTone(content: string, tone: Tone): string {
    switch (tone) {
      case 'formal':
        return this.toFormal(content);
      case 'conversational':
        return this.toConversational(content);
      case 'enthusiastic':
        return this.toEnthusiastic(content);
      case 'matter-of-fact':
        return this.toMatterOfFact(content);
      default:
        return content;
    }
  }

  /**
   * Convert to formal tone
   */
  toFormal(content: string): string {
    let transformed = content;

    // Expand contractions
    const expansions: Record<string, string> = {
      "don't": 'do not',
      "doesn't": 'does not',
      "won't": 'will not',
      "can't": 'cannot',
      "it's": 'it is',
      "that's": 'that is',
      "we're": 'we are',
    };

    for (const [contraction, expansion] of Object.entries(expansions)) {
      const regex = new RegExp(contraction, 'gi');
      transformed = transformed.replace(regex, expansion);
    }

    // Remove casual phrases
    transformed = transformed.replace(/\b(just|really|very|pretty)\b/gi, '');
    transformed = transformed.replace(/\s+/g, ' ');

    return transformed;
  }

  /**
   * Convert to conversational tone
   */
  toConversational(content: string): string {
    let transformed = content;

    // Add conversational markers
    const markers = ['Well, ', 'So, ', 'Now, ', 'You see, '];
    const sentences = this.splitIntoSentences(transformed);

    if (sentences.length > 0 && Math.random() > 0.5) {
      sentences[0] = markers[Math.floor(Math.random() * markers.length)] + sentences[0].toLowerCase();
    }

    // Add questions
    if (Math.random() > 0.6) {
      const questions = ['Make sense?', 'Follow me?', 'See what I mean?', 'Right?'];
      sentences.push(questions[Math.floor(Math.random() * questions.length)]);
    }

    return sentences.join(' ');
  }

  /**
   * Convert to enthusiastic tone
   */
  toEnthusiastic(content: string): string {
    let transformed = content;

    // Add exclamation points
    transformed = transformed.replace(/\./g, (match) => {
      return Math.random() > 0.7 ? '!' : match;
    });

    // Add enthusiastic modifiers
    transformed = transformed.replace(
      /\b(good|great|nice|effective|useful)\b/gi,
      (match) => {
        const enthusiastic = ['amazing', 'fantastic', 'excellent', 'outstanding', 'brilliant'];
        return Math.random() > 0.6
          ? enthusiastic[Math.floor(Math.random() * enthusiastic.length)]
          : match;
      }
    );

    return transformed;
  }

  /**
   * Convert to matter-of-fact tone
   */
  toMatterOfFact(content: string): string {
    let transformed = content;

    // Remove exclamation points
    transformed = transformed.replace(/!/g, '.');

    // Remove qualifiers
    transformed = transformed.replace(/\b(very|really|extremely|quite|rather)\b/gi, '');

    // Remove emphatic words
    transformed = transformed.replace(/\b(clearly|obviously|certainly|definitely)\b/gi, '');

    // Clean up spacing
    transformed = transformed.replace(/\s+/g, ' ');

    return transformed;
  }

  /**
   * Adjust length of content
   */
  adjustLength(content: string, length: Length): string {
    switch (length) {
      case 'concise':
        return this.toConcise(content);
      case 'comprehensive':
        return this.toComprehensive(content);
      case 'standard':
      default:
        return content;
    }
  }

  /**
   * Shorten content
   */
  toConcise(content: string): string {
    const sentences = this.splitIntoSentences(content);
    const targetLength = Math.ceil(sentences.length * 0.6);

    // Keep most important sentences (first and last are usually key)
    const kept = [
      sentences[0],
      ...sentences.slice(1, -1).slice(0, targetLength - 2),
      sentences[sentences.length - 1],
    ];

    return kept.join(' ');
  }

  /**
   * Expand content
   */
  toComprehensive(content: string): string {
    const sentences = this.splitIntoSentences(content);
    const expanded: string[] = [];

    for (const sentence of sentences) {
      expanded.push(sentence);

      // Add elaboration
      if (Math.random() > 0.5) {
        const elaborations = [
          'This approach offers several advantages.',
          'Let me explain this in more detail.',
          'Consider the implications of this carefully.',
          'This is particularly important in practice.',
        ];
        expanded.push(elaborations[Math.floor(Math.random() * elaborations.length)]);
      }

      // Add examples
      if (Math.random() > 0.7) {
        expanded.push('For example, in a typical production environment, this pattern reduces latency by 25%.');
      }
    }

    return expanded.join(' ');
  }

  /**
   * Generate before/after example pair
   */
  async generateBeforeAfter(topic: string): Promise<{ before: string; after: string }> {
    // Generate AI-heavy "before" content
    const before = this.generateAIHeavyContent(topic);

    // Transform to authentic "after" content
    const after = await this.generateVariation(before, {
      voice: 'technical',
      tone: 'conversational',
      structure: 'narrative',
    });

    return {
      before,
      after: after.content,
    };
  }

  /**
   * Generate diverse scenarios for a concept
   */
  async generateDiverseScenarios(concept: string, count: number): Promise<string[]> {
    const scenarios: string[] = [];
    const baseContent = `${concept} is an important consideration in software development.`;

    const voiceOptions: Voice[] = ['academic', 'technical', 'executive', 'casual'];

    for (let i = 0; i < count; i++) {
      const voice = voiceOptions[i % voiceOptions.length];
      const variation = await this.generateVariation(baseContent, {
        voice,
        perspective: i % 2 === 0 ? 'first-person' : 'neutral',
        tone: i % 2 === 0 ? 'conversational' : 'formal',
      });
      scenarios.push(variation.content);
    }

    return scenarios;
  }

  // Private helper methods

  private initializeVoiceCharacteristics(): Map<Voice, VoiceCharacteristics> {
    const characteristics = new Map<Voice, VoiceCharacteristics>();

    characteristics.set('academic', {
      markers: [/\([\w\s,&]+,\s*\d{4}\)/, /suggests that/, /appears to/, /research indicates/i],
      vocabulary: ['furthermore', 'moreover', 'nevertheless', 'consequently', 'empirical'],
      structurePreferences: ['formal transitions', 'citations', 'hedging'],
    });

    characteristics.set('technical', {
      markers: [/\d+(\.\d+)?\s*(ms|MB|GB|%)/, /implementation/, /latency/, /throughput/i],
      vocabulary: ['payload', 'metadata', 'optimization', 'configuration', 'deployment'],
      structurePreferences: ['metrics', 'code examples', 'specifications'],
    });

    characteristics.set('executive', {
      markers: [/\$[\d,]+[KM]?/, /ROI/, /\d+%\s*(increase|decrease|improvement)/, /strategic/i],
      vocabulary: ['strategic', 'leverage', 'optimize', 'maximize', 'stakeholder'],
      structurePreferences: ['business impact', 'recommendations', 'decisions'],
    });

    characteristics.set('casual', {
      markers: [/\b(don't|can't|won't|it's)\b/, /here's/i, /\bI\b/, /you know/i],
      vocabulary: ["here's", 'basically', 'pretty', 'just', 'really'],
      structurePreferences: ['contractions', 'personal examples', 'analogies'],
    });

    return characteristics;
  }

  private detectVoice(content: string): Voice | 'mixed' {
    const scores = new Map<Voice, number>();

    for (const [voice, characteristics] of this.voiceCharacteristics.entries()) {
      let score = 0;

      for (const marker of characteristics.markers) {
        const matches = content.match(marker);
        if (matches) {
          score += matches.length;
        }
      }

      for (const term of characteristics.vocabulary) {
        const regex = new RegExp(`\\b${term}\\b`, 'gi');
        const matches = content.match(regex);
        if (matches) {
          score += matches.length;
        }
      }

      scores.set(voice, score);
    }

    const sortedScores = Array.from(scores.entries()).sort((a, b) => b[1] - a[1]);

    // If top score is significantly higher, return that voice
    if (sortedScores[0][1] > sortedScores[1][1] * 1.5) {
      return sortedScores[0][0];
    }

    return 'mixed';
  }

  private scoreAuthenticity(content: string): number {
    let score = 50; // baseline

    // Positive markers
    if (content.match(/\d+(\.\d+)?\s*(ms|MB|GB|%|seconds)/)) score += 10; // specific metrics
    if (content.match(/\$[\d,]+/)) score += 10; // concrete numbers
    if (content.match(/\b(I|we)\b/)) score += 5; // personal voice
    if (content.match(/\b(However|But|Although)\b/)) score += 5; // acknowledges nuance

    // Negative markers
    if (content.includes('delve')) score -= 20;
    if (content.includes('leverage') && !content.includes('executive')) score -= 10;
    if (content.match(/it's important to note/i)) score -= 15;

    return Math.max(0, Math.min(100, score));
  }

  private scoreDiversity(original: string, variation: string): number {
    // Simple edit distance-based diversity score
    const distance = this.levenshteinDistance(original, variation);
    const maxLength = Math.max(original.length, variation.length);
    return Math.round((distance / maxLength) * 100);
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  private splitIntoSentences(content: string): string[] {
    // Split on sentence boundaries
    const sentences = content
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    return sentences.map(s => {
      // Ensure sentence ends with period
      if (!s.match(/[.!?]$/)) {
        return s + '.';
      }
      return s;
    });
  }

  private statementToQuestion(statement: string): string {
    // Simple heuristic to convert statement to question
    const lower = statement.toLowerCase();

    if (lower.includes('is ')) {
      return statement.replace(/(\w+)\s+is\s+/i, 'What is $1?');
    }

    if (lower.includes('can ')) {
      return statement.replace(/(\w+)\s+can\s+/i, 'How can $1?');
    }

    if (lower.includes('should ')) {
      return statement.replace(/(\w+)\s+should\s+/i, 'Why should $1?');
    }

    return `What about ${statement.toLowerCase()}`;
  }

  private generateAIHeavyContent(topic: string): string {
    // Generate content with typical AI patterns
    const aiPhrases = [
      `It's important to note that ${topic} plays a crucial role in modern development.`,
      `When delving into ${topic}, one must consider various aspects and nuances.`,
      `At the end of the day, ${topic} is absolutely essential for success.`,
      `It goes without saying that ${topic} should be carefully considered.`,
    ];

    return aiPhrases.join(' ');
  }
}
