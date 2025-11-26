/**
 * TestDataFactory - Generate realistic test data for all SDLC artifact types
 * Provides consistent but varied fixtures for testing AIWG components
 *
 * Features:
 * - Seeded random generation for reproducible tests
 * - Customizable data generation with options
 * - Follows AIWG template structure
 * - Supports edge cases (empty, minimum, maximum values)
 */

import { randomBytes } from 'crypto';

/**
 * Use Case artifact
 */
export interface UseCase {
  id: string;
  title: string;
  actors: string[];
  preconditions: string[];
  mainScenario: string[];
  alternateFlows: string[][];
  acceptanceCriteria: string[];
}

export interface UseCaseOptions {
  id?: string;
  title?: string;
  actors?: string[];
  scenarioStepCount?: number;
  alternateFlowCount?: number;
}

/**
 * Non-Functional Requirement (NFR) categories
 */
export type NFRCategory = 'Performance' | 'Security' | 'Reliability' | 'Usability' | 'Scalability';

/**
 * Non-Functional Requirement artifact
 */
export interface NFR {
  id: string;
  category: NFRCategory;
  description: string;
  target: string;
  measurement: string;
  priority: 'P0' | 'P1' | 'P2';
}

export interface NFROptions {
  id?: string;
  description?: string;
  priority?: 'P0' | 'P1' | 'P2';
}

/**
 * Supplemental Specification (collection of NFRs)
 */
export interface SupplementalSpec {
  id: string;
  title: string;
  nfrs: NFR[];
  createdAt: string;
}

/**
 * Architecture Decision Record (ADR)
 */
export interface ADR {
  number: number;
  title: string;
  status: 'Proposed' | 'Accepted' | 'Deprecated' | 'Superseded';
  context: string;
  decision: string;
  consequences: string[];
  alternatives: string[];
  date: string;
}

export interface ADROptions {
  number?: number;
  title?: string;
  status?: 'Proposed' | 'Accepted' | 'Deprecated' | 'Superseded';
}

/**
 * Software Architecture Document sections
 */
export type SADSection =
  | 'overview'
  | 'goals'
  | 'constraints'
  | 'principles'
  | 'components'
  | 'deployment'
  | 'security'
  | 'performance';

/**
 * Component Design artifact
 */
export interface ComponentDesign {
  name: string;
  purpose: string;
  responsibilities: string[];
  interfaces: string[];
  dependencies: string[];
}

/**
 * Test Case artifact
 */
export interface TestCase {
  id: string;
  title: string;
  preconditions: string[];
  steps: string[];
  expectedResults: string[];
  priority: 'P0' | 'P1' | 'P2';
}

export interface TestCaseOptions {
  id?: string;
  title?: string;
  priority?: 'P0' | 'P1' | 'P2';
  stepCount?: number;
}

/**
 * Test Plan artifact
 */
export interface TestPlan {
  id: string;
  title: string;
  objectives: string[];
  scope: string;
  testCases: TestCase[];
  schedule: string;
}

/**
 * Test Result artifact
 */
export interface TestResult {
  testCaseId: string;
  status: 'passed' | 'failed' | 'skipped';
  executionTime: number;
  message?: string;
  timestamp: string;
}

/**
 * Git Commit artifact
 */
export interface GitCommit {
  hash: string;
  author: string;
  email: string;
  date: string;
  message: string;
  files: string[];
}

export interface CommitOptions {
  author?: string;
  message?: string;
  fileCount?: number;
}

/**
 * Pull Request artifact
 */
export interface PullRequest {
  number: number;
  title: string;
  description: string;
  author: string;
  status: 'open' | 'merged' | 'closed';
  commits: GitCommit[];
  createdAt: string;
}

export interface PROptions {
  number?: number;
  title?: string;
  commitCount?: number;
}

/**
 * Project Intake artifact
 */
export interface ProjectIntake {
  projectName: string;
  description: string;
  stakeholders: string[];
  objectives: string[];
  constraints: string[];
  risks: string[];
}

export interface IntakeOptions {
  projectName?: string;
  stakeholderCount?: number;
}

/**
 * Risk Register artifact
 */
export interface RiskRegister {
  id: string;
  risks: Risk[];
  createdAt: string;
}

export interface Risk {
  id: string;
  description: string;
  impact: 'High' | 'Medium' | 'Low';
  probability: 'High' | 'Medium' | 'Low';
  mitigation: string;
}

/**
 * Iteration Plan artifact
 */
export interface IterationPlan {
  id: string;
  iteration: number;
  startDate: string;
  endDate: string;
  objectives: string[];
  stories: string[];
}

/**
 * Random Number Generator with optional seeding
 */
class SeededRandom {
  private seed: number;

  constructor(seed?: number) {
    this.seed = seed ?? this.generateSeed();
  }

  private generateSeed(): number {
    return randomBytes(4).readUInt32BE(0);
  }

  setSeed(seed: number): void {
    this.seed = seed;
  }

  next(): number {
    // Linear Congruential Generator (simple but sufficient for tests)
    this.seed = (this.seed * 1664525 + 1013904223) % 0x100000000;
    return this.seed / 0x100000000;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  pick<T>(items: T[]): T {
    return items[this.nextInt(0, items.length - 1)];
  }

  shuffle<T>(items: T[]): T[] {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}

/**
 * TestDataFactory - Main factory class for generating test data
 */
export class TestDataFactory {
  private rng: SeededRandom;

  // Sample data pools
  private readonly actors = [
    'User', 'Admin', 'Customer', 'Manager', 'System', 'Analyst',
    'Operator', 'Developer', 'Stakeholder', 'Guest'
  ];

  private readonly verbs = [
    'create', 'update', 'delete', 'view', 'manage', 'process',
    'validate', 'submit', 'approve', 'configure'
  ];

  private readonly nouns = [
    'account', 'profile', 'order', 'report', 'document', 'transaction',
    'record', 'request', 'configuration', 'notification'
  ];

  private readonly authors = [
    'Alice Johnson', 'Bob Smith', 'Carol White', 'David Brown',
    'Emma Davis', 'Frank Miller', 'Grace Wilson', 'Henry Moore'
  ];

  private readonly techTerms = [
    'authentication', 'authorization', 'caching', 'encryption',
    'microservices', 'database', 'API', 'middleware', 'repository',
    'queue', 'container', 'proxy', 'gateway', 'registry'
  ];

  constructor(seed?: number) {
    this.rng = new SeededRandom(seed);
  }

  /**
   * Set seed for reproducible random generation
   */
  seed(value: number): void {
    this.rng.setSeed(value);
  }

  /**
   * Generate random text with specified word count
   */
  generateRandomText(wordCount: number): string {
    const words = [
      'the', 'system', 'shall', 'must', 'should', 'will', 'provide',
      'enable', 'support', 'ensure', 'allow', 'process', 'validate',
      'user', 'data', 'information', 'feature', 'functionality',
      'performance', 'security', 'reliability', 'scalability'
    ];

    const result: string[] = [];
    for (let i = 0; i < wordCount; i++) {
      result.push(this.rng.pick(words));
    }

    // Capitalize first word
    if (result.length > 0) {
      result[0] = result[0].charAt(0).toUpperCase() + result[0].slice(1);
    }

    return result.join(' ') + '.';
  }

  /**
   * Generate date string (ISO 8601 format)
   */
  generateDate(daysAgo: number = 0): string {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString();
  }

  /**
   * Generate unique ID with prefix
   */
  generateId(prefix: string): string {
    const num = this.rng.nextInt(1, 999);
    return `${prefix}-${num.toString().padStart(3, '0')}`;
  }

  /**
   * Generate Use Case artifact
   */
  generateUseCase(options: UseCaseOptions = {}): UseCase {
    const verb = options.title ? '' : this.rng.pick(this.verbs);
    const noun = options.title ? '' : this.rng.pick(this.nouns);
    const scenarioStepCount = options.scenarioStepCount ?? this.rng.nextInt(3, 8);
    const alternateFlowCount = options.alternateFlowCount ?? this.rng.nextInt(0, 2);

    const id = options.id ?? this.generateId('UC');
    const title = options.title ?? `${verb.charAt(0).toUpperCase() + verb.slice(1)} ${noun}`;

    const actors = options.actors ?? [
      this.rng.pick(this.actors),
      ...(this.rng.next() > 0.5 ? [this.rng.pick(this.actors)] : [])
    ];

    const preconditions: string[] = [];
    for (let i = 0; i < this.rng.nextInt(1, 3); i++) {
      preconditions.push(`Precondition ${i + 1}: ${this.generateRandomText(5)}`);
    }

    const mainScenario: string[] = [];
    for (let i = 0; i < scenarioStepCount; i++) {
      mainScenario.push(`${i + 1}. ${this.generateRandomText(6)}`);
    }

    const alternateFlows: string[][] = [];
    for (let i = 0; i < alternateFlowCount; i++) {
      const flow: string[] = [];
      const flowSteps = this.rng.nextInt(2, 4);
      for (let j = 0; j < flowSteps; j++) {
        flow.push(`${j + 1}. ${this.generateRandomText(5)}`);
      }
      alternateFlows.push(flow);
    }

    const acceptanceCriteria: string[] = [];
    for (let i = 0; i < this.rng.nextInt(2, 4); i++) {
      acceptanceCriteria.push(`AC${i + 1}: ${this.generateRandomText(7)}`);
    }

    return {
      id,
      title,
      actors,
      preconditions,
      mainScenario,
      alternateFlows,
      acceptanceCriteria
    };
  }

  /**
   * Generate Non-Functional Requirement (NFR)
   */
  generateNFR(category: NFRCategory, options: NFROptions = {}): NFR {
    const priority = options.priority ?? this.rng.pick(['P0', 'P1', 'P2'] as const);
    const id = options.id ?? this.generateId(`NFR-${category.substring(0, 4).toUpperCase()}`);

    const descriptions: Record<NFRCategory, string[]> = {
      Performance: [
        'Response time shall not exceed 2 seconds for 95% of requests',
        'System shall support 1000 concurrent users',
        'API latency shall be under 100ms at p99'
      ],
      Security: [
        'All data transmissions shall be encrypted using TLS 1.3',
        'Authentication shall use multi-factor authentication',
        'Access logs shall be retained for 90 days'
      ],
      Reliability: [
        'System uptime shall be 99.9% measured monthly',
        'Data backups shall occur every 24 hours',
        'Failover time shall not exceed 30 seconds'
      ],
      Usability: [
        'UI shall be accessible to WCAG 2.1 Level AA standards',
        'Critical workflows shall require no more than 3 clicks',
        'Help documentation shall be available inline'
      ],
      Scalability: [
        'System shall handle 10x traffic increase without degradation',
        'Database shall support horizontal scaling',
        'Storage shall auto-scale based on usage'
      ]
    };

    const targets: Record<NFRCategory, string[]> = {
      Performance: ['< 2s response time', '1000+ concurrent users', '< 100ms p99 latency'],
      Security: ['TLS 1.3 encryption', 'MFA required', '90-day log retention'],
      Reliability: ['99.9% uptime', 'Daily backups', '< 30s failover'],
      Usability: ['WCAG 2.1 AA', '≤ 3 clicks', 'Inline help'],
      Scalability: ['10x traffic capacity', 'Horizontal scaling', 'Auto-scaling storage']
    };

    const measurements: Record<NFRCategory, string[]> = {
      Performance: ['APM monitoring', 'Load testing', 'Latency percentiles'],
      Security: ['Security audit', 'Penetration testing', 'Log analysis'],
      Reliability: ['Uptime monitoring', 'Backup verification', 'Failover testing'],
      Usability: ['Accessibility audit', 'User testing', 'Analytics tracking'],
      Scalability: ['Load testing', 'Capacity planning', 'Resource monitoring']
    };

    const description = options.description ?? this.rng.pick(descriptions[category]);
    const target = this.rng.pick(targets[category]);
    const measurement = this.rng.pick(measurements[category]);

    return {
      id,
      category,
      description,
      target,
      measurement,
      priority
    };
  }

  /**
   * Generate Supplemental Specification (collection of NFRs)
   */
  generateSupplementalSpec(nfrCount: number = 5): SupplementalSpec {
    const categories: NFRCategory[] = ['Performance', 'Security', 'Reliability', 'Usability', 'Scalability'];
    const nfrs: NFR[] = [];

    for (let i = 0; i < nfrCount; i++) {
      const category = this.rng.pick(categories);
      nfrs.push(this.generateNFR(category));
    }

    return {
      id: this.generateId('SUPP'),
      title: 'Supplemental Specification',
      nfrs,
      createdAt: this.generateDate(this.rng.nextInt(1, 30))
    };
  }

  /**
   * Generate Architecture Decision Record (ADR)
   */
  generateADR(options: ADROptions = {}): ADR {
    const number = options.number ?? this.rng.nextInt(1, 50);
    const status = options.status ?? this.rng.pick(['Proposed', 'Accepted', 'Deprecated', 'Superseded'] as const);

    const techA = this.rng.pick(this.techTerms);
    const techB = this.rng.pick(this.techTerms);
    const title = options.title ?? `Use ${techA} for ${techB}`;

    const context = `The system requires ${techA} to handle ${techB}. ${this.generateRandomText(15)}`;
    const decision = `We will adopt ${techA} as the solution for ${techB}. ${this.generateRandomText(12)}`;

    const consequences: string[] = [];
    for (let i = 0; i < this.rng.nextInt(2, 4); i++) {
      const sign = this.rng.next() > 0.5 ? 'Positive' : 'Negative';
      consequences.push(`${sign}: ${this.generateRandomText(8)}`);
    }

    const alternatives: string[] = [];
    for (let i = 0; i < this.rng.nextInt(1, 3); i++) {
      const altTech = this.rng.pick(this.techTerms);
      alternatives.push(`Alternative ${i + 1}: Use ${altTech} instead`);
    }

    return {
      number,
      title,
      status,
      context,
      decision,
      consequences,
      alternatives,
      date: this.generateDate(this.rng.nextInt(1, 90))
    };
  }

  /**
   * Generate Software Architecture Document section
   */
  generateSADSection(section: SADSection, _options: any = {}): string {
    const content: Record<SADSection, () => string> = {
      overview: () => `# Architecture Overview\n\n${this.generateRandomText(30)}\n\nThe system architecture follows ${this.rng.pick(['microservices', 'monolithic', 'serverless', 'event-driven'])} pattern.`,

      goals: () => {
        const goals = [];
        for (let i = 0; i < this.rng.nextInt(3, 5); i++) {
          goals.push(`${i + 1}. ${this.generateRandomText(10)}`);
        }
        return `# Architecture Goals\n\n${goals.join('\n')}`;
      },

      constraints: () => {
        const constraints = [];
        for (let i = 0; i < this.rng.nextInt(2, 4); i++) {
          constraints.push(`- ${this.generateRandomText(12)}`);
        }
        return `# Constraints\n\n${constraints.join('\n')}`;
      },

      principles: () => {
        const principles = ['Separation of Concerns', 'DRY', 'SOLID', 'KISS', 'YAGNI'];
        return `# Architecture Principles\n\n${this.rng.shuffle(principles).slice(0, 3).map(p => `- ${p}`).join('\n')}`;
      },

      components: () => {
        const components = [];
        for (let i = 0; i < this.rng.nextInt(3, 6); i++) {
          const name = this.rng.pick(this.techTerms);
          components.push(`## ${name}\n\n${this.generateRandomText(15)}`);
        }
        return `# Components\n\n${components.join('\n\n')}`;
      },

      deployment: () => `# Deployment\n\nThe system will be deployed using ${this.rng.pick(['Kubernetes', 'Docker Swarm', 'AWS ECS', 'Azure AKS'])}.\n\n${this.generateRandomText(20)}`,

      security: () => `# Security Architecture\n\nSecurity measures include:\n- ${this.rng.pick(['TLS 1.3', 'OAuth 2.0', 'JWT tokens', 'API keys'])}\n- ${this.rng.pick(['RBAC', 'ABAC', 'ACL', 'Policy-based'])}\n\n${this.generateRandomText(15)}`,

      performance: () => `# Performance Architecture\n\nPerformance targets:\n- Response time: < ${this.rng.nextInt(100, 3000)}ms\n- Throughput: ${this.rng.nextInt(100, 10000)} req/sec\n\n${this.generateRandomText(15)}`
    };

    return content[section]();
  }

  /**
   * Generate Component Design
   */
  generateComponentDesign(name: string): ComponentDesign {
    const responsibilities: string[] = [];
    for (let i = 0; i < this.rng.nextInt(2, 4); i++) {
      responsibilities.push(this.generateRandomText(8));
    }

    const interfaces: string[] = [];
    for (let i = 0; i < this.rng.nextInt(1, 3); i++) {
      const verb = this.rng.pick(this.verbs);
      interfaces.push(`I${verb.charAt(0).toUpperCase() + verb.slice(1)}`);
    }

    const dependencies: string[] = [];
    for (let i = 0; i < this.rng.nextInt(1, 4); i++) {
      dependencies.push(this.rng.pick(this.techTerms));
    }

    return {
      name,
      purpose: this.generateRandomText(12),
      responsibilities,
      interfaces,
      dependencies
    };
  }

  /**
   * Generate Test Case
   */
  generateTestCase(options: TestCaseOptions = {}): TestCase {
    const id = options.id ?? this.generateId('TC');
    const priority = options.priority ?? this.rng.pick(['P0', 'P1', 'P2'] as const);
    const stepCount = options.stepCount ?? this.rng.nextInt(3, 6);

    const verb = this.rng.pick(this.verbs);
    const noun = this.rng.pick(this.nouns);
    const title = options.title ?? `Test ${verb} ${noun}`;

    const preconditions: string[] = [];
    for (let i = 0; i < this.rng.nextInt(1, 3); i++) {
      preconditions.push(`Precondition: ${this.generateRandomText(6)}`);
    }

    const steps: string[] = [];
    const expectedResults: string[] = [];
    for (let i = 0; i < stepCount; i++) {
      steps.push(`Step ${i + 1}: ${this.generateRandomText(7)}`);
      expectedResults.push(`Expected: ${this.generateRandomText(6)}`);
    }

    return {
      id,
      title,
      preconditions,
      steps,
      expectedResults,
      priority
    };
  }

  /**
   * Generate Test Plan
   */
  generateTestPlan(testCaseCount: number = 5): TestPlan {
    const testCases: TestCase[] = [];
    for (let i = 0; i < testCaseCount; i++) {
      testCases.push(this.generateTestCase());
    }

    const objectives: string[] = [];
    for (let i = 0; i < this.rng.nextInt(2, 4); i++) {
      objectives.push(this.generateRandomText(10));
    }

    return {
      id: this.generateId('TP'),
      title: 'Test Plan',
      objectives,
      scope: this.generateRandomText(15),
      testCases,
      schedule: `Week ${this.rng.nextInt(1, 12)}`
    };
  }

  /**
   * Generate Test Result
   */
  generateTestResult(testCase: TestCase, passed: boolean): TestResult {
    const status = passed ? 'passed' : (this.rng.next() > 0.8 ? 'skipped' : 'failed');
    const executionTime = this.rng.nextInt(10, 5000);
    const message = status === 'failed' ? `Assertion failed: ${this.generateRandomText(5)}` : undefined;

    return {
      testCaseId: testCase.id,
      status,
      executionTime,
      message,
      timestamp: this.generateDate(0)
    };
  }

  /**
   * Generate Git Commit
   */
  generateGitCommit(options: CommitOptions = {}): GitCommit {
    const author = options.author ?? this.rng.pick(this.authors);
    const email = `${author.toLowerCase().replace(' ', '.')}@example.com`;
    const fileCount = options.fileCount ?? this.rng.nextInt(1, 5);

    const files: string[] = [];
    const extensions = ['ts', 'js', 'md', 'json', 'yaml'];
    for (let i = 0; i < fileCount; i++) {
      const dir = this.rng.pick(['src', 'test', 'docs', 'config']);
      const file = this.rng.pick(this.nouns);
      const ext = this.rng.pick(extensions);
      files.push(`${dir}/${file}.${ext}`);
    }

    const verb = this.rng.pick(['feat', 'fix', 'docs', 'refactor', 'test', 'chore']);
    const message = options.message ?? `${verb}: ${this.generateRandomText(8)}`;

    return {
      hash: randomBytes(20).toString('hex').substring(0, 40),
      author,
      email,
      date: this.generateDate(this.rng.nextInt(0, 30)),
      message,
      files
    };
  }

  /**
   * Generate Pull Request
   */
  generatePullRequest(options: PROptions = {}): PullRequest {
    const number = options.number ?? this.rng.nextInt(1, 500);
    const author = this.rng.pick(this.authors);
    const commitCount = options.commitCount ?? this.rng.nextInt(1, 5);

    const commits: GitCommit[] = [];
    for (let i = 0; i < commitCount; i++) {
      commits.push(this.generateGitCommit({ author }));
    }

    const title = options.title ?? `${this.rng.pick(['feat', 'fix', 'refactor'])}: ${this.generateRandomText(8)}`;
    const description = `${this.generateRandomText(20)}\n\n## Changes\n- ${this.generateRandomText(10)}\n- ${this.generateRandomText(10)}`;

    return {
      number,
      title,
      description,
      author,
      status: this.rng.pick(['open', 'merged', 'closed'] as const),
      commits,
      createdAt: this.generateDate(this.rng.nextInt(1, 14))
    };
  }

  /**
   * Generate Git History (multiple commits)
   */
  generateGitHistory(commitCount: number): GitCommit[] {
    const commits: GitCommit[] = [];
    for (let i = 0; i < commitCount; i++) {
      commits.push(this.generateGitCommit());
    }
    return commits;
  }

  /**
   * Generate Project Intake
   */
  generateProjectIntake(options: IntakeOptions = {}): ProjectIntake {
    const projectName = options.projectName ?? `${this.rng.pick(['E-commerce', 'Analytics', 'CRM', 'Portal'])} Platform`;
    const stakeholderCount = options.stakeholderCount ?? this.rng.nextInt(2, 5);

    const stakeholders: string[] = [];
    for (let i = 0; i < stakeholderCount; i++) {
      stakeholders.push(this.rng.pick(this.authors));
    }

    const objectives: string[] = [];
    for (let i = 0; i < this.rng.nextInt(2, 4); i++) {
      objectives.push(this.generateRandomText(12));
    }

    const constraints: string[] = [];
    for (let i = 0; i < this.rng.nextInt(1, 3); i++) {
      constraints.push(this.generateRandomText(10));
    }

    const risks: string[] = [];
    for (let i = 0; i < this.rng.nextInt(2, 4); i++) {
      risks.push(this.generateRandomText(11));
    }

    return {
      projectName,
      description: this.generateRandomText(25),
      stakeholders,
      objectives,
      constraints,
      risks
    };
  }

  /**
   * Generate Risk Register
   */
  generateRiskRegister(riskCount: number = 5): RiskRegister {
    const risks: Risk[] = [];

    for (let i = 0; i < riskCount; i++) {
      risks.push({
        id: this.generateId('RISK'),
        description: this.generateRandomText(15),
        impact: this.rng.pick(['High', 'Medium', 'Low'] as const),
        probability: this.rng.pick(['High', 'Medium', 'Low'] as const),
        mitigation: this.generateRandomText(12)
      });
    }

    return {
      id: this.generateId('RR'),
      risks,
      createdAt: this.generateDate(this.rng.nextInt(1, 30))
    };
  }

  /**
   * Generate Iteration Plan
   */
  generateIterationPlan(weekCount: number): IterationPlan {
    const iteration = this.rng.nextInt(1, 20);
    const startDate = this.generateDate(0);
    const endDate = this.generateDate(-weekCount * 7);

    const objectives: string[] = [];
    for (let i = 0; i < this.rng.nextInt(2, 4); i++) {
      objectives.push(this.generateRandomText(10));
    }

    const stories: string[] = [];
    for (let i = 0; i < this.rng.nextInt(3, 8); i++) {
      stories.push(this.generateId('US'));
    }

    return {
      id: this.generateId('ITER'),
      iteration,
      startDate,
      endDate,
      objectives,
      stories
    };
  }
}
