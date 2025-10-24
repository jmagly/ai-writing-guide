/**
 * Example Generator
 *
 * Generates diverse examples, scenarios, and before/after pairs
 * demonstrating AI Writing Guide principles.
 */

import { ContentDiversifier, Voice, Perspective } from './content-diversifier.js';

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
 * Example Generator for diverse content demonstrations
 */
export class ExampleGenerator {
  private diversifier: ContentDiversifier;

  constructor() {
    this.diversifier = new ContentDiversifier();
  }

  /**
   * Generate before/after example pair showing AI pattern removal
   */
  async generateBeforeAfter(topic: string, voice: Voice = 'technical'): Promise<ExamplePair> {
    // Generate AI-heavy "before" content
    const before = this.generateAIContent(topic);

    // Transform to authentic "after" content
    const variation = await this.diversifier.generateVariation(before, {
      voice,
      tone: 'conversational',
      perspective: 'first-person',
    });

    // Identify specific improvements
    const improvements = this.identifyImprovements(before, variation.content);

    return {
      before,
      after: variation.content,
      changes: variation.changes,
      improvements,
    };
  }

  /**
   * Generate diverse examples demonstrating a concept
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
   * Generate code examples with varying voices
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
   * Generate scenarios from different perspectives
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
   * Generate comparison examples showing different approaches
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
   * Generate tutorial-style examples
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
   * Generate Q&A style examples
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

  // Private helper methods

  private generateAIContent(topic: string): string {
    const aiPatterns = [
      `It's important to note that ${topic} is a critical consideration in modern software development.`,
      `When we delve into the realm of ${topic}, we uncover various nuanced aspects that absolutely must be addressed.`,
      `At the end of the day, ${topic} plays a pivotal role in ensuring success and driving innovation.`,
      `It goes without saying that ${topic} requires careful consideration and robust implementation strategies.`,
      `In today's rapidly evolving landscape, ${topic} has emerged as a game-changer for organizations.`,
    ];

    return aiPatterns.join(' ');
  }

  private generateBaseContent(concept: string, voice: Voice): string {
    switch (voice) {
      case 'academic':
        return `Recent research suggests that ${concept} demonstrates significant implications for system architecture. Studies indicate various approaches merit consideration.`;

      case 'technical':
        return `${concept} affects system performance through latency reduction and throughput optimization. Implementation requires careful configuration management.`;

      case 'executive':
        return `${concept} delivers measurable ROI through efficiency gains and cost reduction. Strategic adoption enables competitive advantage.`;

      case 'casual':
        return `${concept} makes a real difference in how systems perform. It's one of those things that's worth getting right from the start.`;

      default:
        return `${concept} is an important consideration.`;
    }
  }

  private generateUseCaseContent(useCase: string, voice: Voice): string {
    const templates: Record<Voice, string> = {
      academic: `The ${useCase} use case presents opportunities for systematic investigation. Preliminary analysis suggests multiple viable approaches.`,
      technical: `Implementing ${useCase} requires attention to latency budgets and resource allocation. The system must handle edge cases gracefully.`,
      executive: `${useCase} directly impacts user satisfaction and retention metrics. Proper execution reduces support costs by 30%.`,
      casual: `${useCase} is something users run into all the time. Getting this right means fewer support tickets and happier customers.`,
    };

    return templates[voice];
  }

  private generateApproachContent(topic: string, approach: string): string {
    return `The ${approach} approach to ${topic} offers specific advantages in production environments. Implementation requires consideration of trade-offs between performance and maintainability.`;
  }

  private generateStatementsAboutTopic(topic: string, count: number): string[] {
    const statements: string[] = [
      `${topic} affects system behavior in multiple ways`,
      `Performance characteristics vary based on configuration`,
      `Implementation patterns depend on specific requirements`,
      `Trade-offs exist between different approaches`,
      `Real-world constraints influence design decisions`,
      `Production environments reveal unexpected edge cases`,
    ];

    return statements.slice(0, count);
  }

  private generateCodeExampleForVoice(_technology: string, voice: Voice): CodeExample {
    const examples: Record<Voice, { code: string; context: string }> = {
      technical: {
        code: `// Connection pooling reduces latency by 40ms
const pool = new ConnectionPool({
  max: 10,
  min: 2,
  idleTimeout: 30000,
  acquireTimeout: 5000
});

// Non-blocking operations improve throughput
async function fetchData(id: string) {
  const connection = await pool.acquire();
  try {
    return await connection.query('SELECT * FROM data WHERE id = ?', [id]);
  } finally {
    pool.release(connection);
  }
}`,
        context: 'Technical documentation explaining performance optimization with specific metrics',
      },

      academic: {
        code: `// Research suggests (Chen et al., 2023) that connection pooling
// demonstrates significant performance improvements
class ConnectionPool {
  constructor(config: PoolConfig) {
    // Implementation based on empirical analysis
    // of production workloads (N=10,000 requests)
  }

  // Async acquisition pattern follows established conventions
  async acquire(): Promise<Connection> {
    // Resource management as per literature review
  }
}`,
        context: 'Academic paper discussing connection pooling with citations and formal analysis',
      },

      casual: {
        code: `// Here's the thing - connection pools save you from
// opening/closing connections constantly. Think of it
// like keeping a few spare connections ready to go.

const pool = new ConnectionPool({
  max: 10,  // Don't go crazy here
  min: 2    // Keep at least 2 warm
});

// This pattern works well in practice
async function getData(id) {
  const conn = await pool.acquire();
  // Do your thing with the connection
  return conn.query('SELECT * FROM data WHERE id = ?', [id]);
}`,
        context: 'Blog post explaining connection pooling with conversational tone and analogies',
      },

      executive: {
        code: `// Connection pooling delivers 40% latency reduction,
// translating to $500K annual savings in infrastructure costs

const pool = new ConnectionPool({
  max: 10,           // Optimized for 10K concurrent users
  acquisitionTimeout: 5000  // 5s SLA requirement
});

// This implementation reduces P99 latency from 200ms to 120ms,
// directly improving user satisfaction scores by 15%
async function fetchData(id: string) {
  return pool.execute('SELECT * FROM data WHERE id = ?', [id]);
}`,
        context: 'Executive summary showing connection pooling with business metrics and ROI',
      },
    };

    const example = examples[voice] || examples.technical;

    return {
      code: example.code,
      language: 'typescript',
      voice,
      context: example.context,
    };
  }

  private identifyImprovements(before: string, after: string): string[] {
    const improvements: string[] = [];

    // Detect removed AI patterns
    if (before.includes('delve') && !after.includes('delve')) {
      improvements.push('Removed "delve" - typical AI filler word');
    }

    if (before.includes("it's important to note") && !after.includes("it's important to note")) {
      improvements.push('Removed "it\'s important to note" - performative phrase');
    }

    if (before.includes('absolutely') && !after.includes('absolutely')) {
      improvements.push('Removed unnecessary emphasis ("absolutely")');
    }

    if (before.includes('game-changer') && !after.includes('game-changer')) {
      improvements.push('Removed buzzword "game-changer"');
    }

    // Detect added authenticity markers
    if (!before.match(/\d+(\.\d+)?\s*(ms|MB|GB|%)/) && after.match(/\d+(\.\d+)?\s*(ms|MB|GB|%)/)) {
      improvements.push('Added specific metrics for concrete evidence');
    }

    if (!before.match(/\b(I|we)\b/) && after.match(/\b(I|we)\b/)) {
      improvements.push('Added personal perspective for authenticity');
    }

    if (!before.includes('$') && after.includes('$')) {
      improvements.push('Added concrete dollar amounts for business impact');
    }

    if ((after.match(/\./g) || []).length > (before.match(/\./g) || []).length) {
      improvements.push('Increased sentence variation for natural rhythm');
    }

    // Detect structural improvements
    const beforeSentences = before.split(/[.!?]/).filter(s => s.trim().length > 0);
    const afterSentences = after.split(/[.!?]/).filter(s => s.trim().length > 0);

    if (afterSentences.length < beforeSentences.length) {
      improvements.push('Reduced redundancy - more concise expression');
    }

    // Detect tone improvements
    if (before.match(/(must|should|need to)/gi) && !after.match(/(must|should|need to)/gi)) {
      improvements.push('Removed prescriptive language for more natural tone');
    }

    if (improvements.length === 0) {
      improvements.push('General refinement of voice and tone');
    }

    return improvements;
  }

  private identifyDemonstratedPrinciples(content: string, voice: Voice): string[] {
    const principles: string[] = [];

    // Check for voice-appropriate characteristics
    switch (voice) {
      case 'academic':
        if (content.match(/\([\w\s,&]+,\s*\d{4}\)/)) {
          principles.push('Academic citations');
        }
        if (content.match(/suggests?|appears?|may|might/i)) {
          principles.push('Appropriate hedging');
        }
        if (content.match(/furthermore|moreover|however/i)) {
          principles.push('Formal transitions');
        }
        break;

      case 'technical':
        if (content.match(/\d+(\.\d+)?\s*(ms|MB|GB|%)/)) {
          principles.push('Specific metrics');
        }
        if (content.match(/implementation|configuration|deployment/i)) {
          principles.push('Technical terminology');
        }
        if (content.match(/latency|throughput|payload/i)) {
          principles.push('Performance focus');
        }
        break;

      case 'executive':
        if (content.match(/\$[\d,]+/)) {
          principles.push('Concrete financial metrics');
        }
        if (content.match(/ROI|revenue|cost/i)) {
          principles.push('Business impact focus');
        }
        if (content.match(/recommend|strategic|priority/i)) {
          principles.push('Decision-oriented language');
        }
        break;

      case 'casual':
        if (content.match(/\b(don't|can't|it's|here's)\b/)) {
          principles.push('Conversational contractions');
        }
        if (content.match(/\b(I|we)\b/)) {
          principles.push('Personal perspective');
        }
        if (content.match(/like|think of|similar to/i)) {
          principles.push('Analogies and examples');
        }
        break;
    }

    // Check for general authenticity markers
    if (content.match(/\b(however|but|although)\b/i)) {
      principles.push('Acknowledges nuance');
    }

    if (content.match(/\b(trade-?off|constraint|limitation)\b/i)) {
      principles.push('Honest about limitations');
    }

    return principles;
  }
}
