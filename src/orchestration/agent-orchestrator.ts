/**
 * @file agent-orchestrator.ts
 * @description Multi-agent orchestration system for collaborative SDLC artifact generation
 *
 * Implements UC-004: Multi-Agent Documentation Generation
 * - Coordinates multiple specialized agents (Primary Author + Reviewers)
 * - Manages review cycles and feedback synthesis
 * - Ensures comprehensive artifact quality through parallel review
 * - Tracks orchestration state and agent progress
 *
 * @implements NFR-PERF-004: <30s artifact generation coordination
 * @implements NFR-QUAL-001: 100% artifact completeness validation
 */

import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import path from 'path';

// ============================================================================
// Types and Interfaces
// ============================================================================

export type AgentRole = 'primary-author' | 'reviewer' | 'synthesizer';
export type AgentType =
  | 'architecture-designer'
  | 'requirements-analyst'
  | 'security-architect'
  | 'test-architect'
  | 'technical-writer'
  | 'documentation-synthesizer'
  | 'devops-engineer'
  | 'performance-engineer';

export type OrchestrationPhase = 'draft' | 'review' | 'synthesis' | 'complete' | 'failed';
export type ReviewStatus = 'approved' | 'approved-with-changes' | 'conditional' | 'rejected';

export interface AgentTask {
  agentType: AgentType;
  role: AgentRole;
  description: string;
  inputPaths: string[];
  outputPath: string;
  dependsOn?: string[]; // Task IDs this task depends on
  timeout?: number; // ms
}

export interface AgentResult {
  taskId: string;
  agentType: AgentType;
  success: boolean;
  outputPath: string;
  duration: number; // ms
  error?: string;
}

export interface ReviewResult extends AgentResult {
  status: ReviewStatus;
  comments: ReviewComment[];
  suggestions: string[];
}

export interface ReviewComment {
  severity: 'critical' | 'major' | 'minor' | 'info';
  section: string;
  comment: string;
  suggestedFix?: string;
}

export interface OrchestrationPlan {
  artifactType: string; // SAD, ADR, Test Plan, etc.
  workingDir: string;
  primaryAuthor: AgentTask;
  reviewers: AgentTask[];
  synthesizer: AgentTask;
  validation?: AgentTask;
  timeout: number; // Total orchestration timeout in ms
}

export interface OrchestrationResult {
  plan: OrchestrationPlan;
  phase: OrchestrationPhase;
  draftResult?: AgentResult;
  reviewResults: ReviewResult[];
  synthesisResult?: AgentResult;
  validationResult?: AgentResult;
  finalArtifactPath?: string;
  totalDuration: number; // ms
  success: boolean;
  error?: string;
}

export interface OrchestrationOptions {
  workingDir: string;
  parallelReviews?: boolean; // Default: true
  requireAllApprovals?: boolean; // Default: false (allow approved-with-changes)
  maxRetries?: number; // Default: 1
  enableValidation?: boolean; // Default: true
}

// ============================================================================
// Agent Orchestrator Class
// ============================================================================

export class AgentOrchestrator extends EventEmitter {
  private activeOrchestrations: Map<string, OrchestrationResult> = new Map();
  private orchestrationCounter = 0;

  constructor() {
    super();
  }

  /**
   * Generate a unique orchestration ID
   */
  private generateOrchestrationId(): string {
    return `orch-${Date.now()}-${++this.orchestrationCounter}`;
  }

  /**
   * Create an orchestration plan for SAD generation
   */
  public createSADPlan(options: OrchestrationOptions): OrchestrationPlan {
    const workingDir = path.join(options.workingDir, 'architecture', 'sad');

    return {
      artifactType: 'Software Architecture Document',
      workingDir,
      primaryAuthor: {
        agentType: 'architecture-designer',
        role: 'primary-author',
        description: 'Create initial SAD draft from requirements',
        inputPaths: [
          path.join(options.workingDir, 'requirements'),
          '~/.local/share/ai-writing-guide/agentic/code/frameworks/sdlc-complete/templates/analysis-design/software-architecture-doc-template.md'
        ],
        outputPath: path.join(workingDir, 'drafts', 'v0.1-primary-draft.md'),
        timeout: 300000 // 5 minutes
      },
      reviewers: [
        {
          agentType: 'security-architect',
          role: 'reviewer',
          description: 'Security architecture validation',
          inputPaths: [path.join(workingDir, 'drafts', 'v0.1-primary-draft.md')],
          outputPath: path.join(workingDir, 'reviews', 'security-review.md'),
          dependsOn: ['primary-author'],
          timeout: 120000 // 2 minutes
        },
        {
          agentType: 'test-architect',
          role: 'reviewer',
          description: 'Testability and quality attribute review',
          inputPaths: [path.join(workingDir, 'drafts', 'v0.1-primary-draft.md')],
          outputPath: path.join(workingDir, 'reviews', 'testability-review.md'),
          dependsOn: ['primary-author'],
          timeout: 120000
        },
        {
          agentType: 'requirements-analyst',
          role: 'reviewer',
          description: 'Requirements traceability validation',
          inputPaths: [
            path.join(workingDir, 'drafts', 'v0.1-primary-draft.md'),
            path.join(options.workingDir, 'requirements')
          ],
          outputPath: path.join(workingDir, 'reviews', 'requirements-review.md'),
          dependsOn: ['primary-author'],
          timeout: 120000
        },
        {
          agentType: 'technical-writer',
          role: 'reviewer',
          description: 'Clarity, consistency, and style review',
          inputPaths: [path.join(workingDir, 'drafts', 'v0.1-primary-draft.md')],
          outputPath: path.join(workingDir, 'reviews', 'style-review.md'),
          dependsOn: ['primary-author'],
          timeout: 120000
        }
      ],
      synthesizer: {
        agentType: 'documentation-synthesizer',
        role: 'synthesizer',
        description: 'Merge all review feedback into final SAD',
        inputPaths: [
          path.join(workingDir, 'drafts', 'v0.1-primary-draft.md'),
          path.join(workingDir, 'reviews')
        ],
        outputPath: path.join(options.workingDir, 'architecture', 'software-architecture-doc.md'),
        dependsOn: ['reviewers'],
        timeout: 180000 // 3 minutes
      },
      timeout: 900000 // 15 minutes total
    };
  }

  /**
   * Create an orchestration plan for ADR generation
   */
  public createADRPlan(options: OrchestrationOptions, decision: string): OrchestrationPlan {
    const workingDir = path.join(options.workingDir, 'architecture', 'adrs');
    const adrNumber = this.getNextADRNumber(workingDir);
    const filename = `ADR-${adrNumber.toString().padStart(3, '0')}-${this.slugify(decision)}.md`;

    return {
      artifactType: 'Architecture Decision Record',
      workingDir,
      primaryAuthor: {
        agentType: 'architecture-designer',
        role: 'primary-author',
        description: `Create ADR for: ${decision}`,
        inputPaths: [
          path.join(options.workingDir, 'architecture', 'software-architecture-doc.md'),
          '~/.local/share/ai-writing-guide/agentic/code/frameworks/sdlc-complete/templates/analysis-design/adr-template.md'
        ],
        outputPath: path.join(workingDir, 'drafts', `draft-${filename}`),
        timeout: 180000 // 3 minutes
      },
      reviewers: [
        {
          agentType: 'security-architect',
          role: 'reviewer',
          description: 'Security implications review',
          inputPaths: [path.join(workingDir, 'drafts', `draft-${filename}`)],
          outputPath: path.join(workingDir, 'reviews', `security-${filename}`),
          dependsOn: ['primary-author'],
          timeout: 60000 // 1 minute
        },
        {
          agentType: 'technical-writer',
          role: 'reviewer',
          description: 'Clarity and completeness review',
          inputPaths: [path.join(workingDir, 'drafts', `draft-${filename}`)],
          outputPath: path.join(workingDir, 'reviews', `style-${filename}`),
          dependsOn: ['primary-author'],
          timeout: 60000
        }
      ],
      synthesizer: {
        agentType: 'documentation-synthesizer',
        role: 'synthesizer',
        description: 'Finalize ADR with review feedback',
        inputPaths: [
          path.join(workingDir, 'drafts', `draft-${filename}`),
          path.join(workingDir, 'reviews')
        ],
        outputPath: path.join(workingDir, filename),
        dependsOn: ['reviewers'],
        timeout: 120000 // 2 minutes
      },
      timeout: 420000 // 7 minutes total
    };
  }

  /**
   * Create an orchestration plan for Master Test Plan generation
   */
  public createTestPlanPlan(options: OrchestrationOptions): OrchestrationPlan {
    const workingDir = path.join(options.workingDir, 'testing');

    return {
      artifactType: 'Master Test Plan',
      workingDir,
      primaryAuthor: {
        agentType: 'test-architect',
        role: 'primary-author',
        description: 'Create Master Test Plan from requirements and SAD',
        inputPaths: [
          path.join(options.workingDir, 'requirements'),
          path.join(options.workingDir, 'architecture', 'software-architecture-doc.md'),
          '~/.local/share/ai-writing-guide/agentic/code/frameworks/sdlc-complete/templates/testing-qa/master-test-plan-template.md'
        ],
        outputPath: path.join(workingDir, 'drafts', 'v0.1-master-test-plan.md'),
        timeout: 300000 // 5 minutes
      },
      reviewers: [
        {
          agentType: 'requirements-analyst',
          role: 'reviewer',
          description: 'Requirements coverage validation',
          inputPaths: [
            path.join(workingDir, 'drafts', 'v0.1-master-test-plan.md'),
            path.join(options.workingDir, 'requirements')
          ],
          outputPath: path.join(workingDir, 'reviews', 'requirements-coverage-review.md'),
          dependsOn: ['primary-author'],
          timeout: 120000
        },
        {
          agentType: 'security-architect',
          role: 'reviewer',
          description: 'Security testing strategy review',
          inputPaths: [path.join(workingDir, 'drafts', 'v0.1-master-test-plan.md')],
          outputPath: path.join(workingDir, 'reviews', 'security-testing-review.md'),
          dependsOn: ['primary-author'],
          timeout: 120000
        },
        {
          agentType: 'performance-engineer',
          role: 'reviewer',
          description: 'Performance testing strategy review',
          inputPaths: [path.join(workingDir, 'drafts', 'v0.1-master-test-plan.md')],
          outputPath: path.join(workingDir, 'reviews', 'performance-testing-review.md'),
          dependsOn: ['primary-author'],
          timeout: 120000
        }
      ],
      synthesizer: {
        agentType: 'documentation-synthesizer',
        role: 'synthesizer',
        description: 'Finalize Master Test Plan with all feedback',
        inputPaths: [
          path.join(workingDir, 'drafts', 'v0.1-master-test-plan.md'),
          path.join(workingDir, 'reviews')
        ],
        outputPath: path.join(workingDir, 'master-test-plan.md'),
        dependsOn: ['reviewers'],
        timeout: 180000
      },
      timeout: 840000 // 14 minutes total
    };
  }

  /**
   * Execute an orchestration plan
   * This simulates agent execution - in production, this would dispatch to actual agent Task tool
   */
  public async executeOrchestration(
    plan: OrchestrationPlan,
    options: OrchestrationOptions = { workingDir: '.' }
  ): Promise<OrchestrationResult> {
    const orchestrationId = this.generateOrchestrationId();
    const startTime = Date.now();

    const result: OrchestrationResult = {
      plan,
      phase: 'draft',
      reviewResults: [],
      totalDuration: 0,
      success: false
    };

    this.activeOrchestrations.set(orchestrationId, result);
    this.emit('orchestration:start', { orchestrationId, plan });

    try {
      // Phase 1: Draft Generation (Primary Author)
      result.phase = 'draft';
      this.emit('phase:start', { orchestrationId, phase: 'draft', task: plan.primaryAuthor });

      const draftResult = await this.executeAgentTask(plan.primaryAuthor);
      result.draftResult = draftResult;

      if (!draftResult.success) {
        throw new Error(`Draft generation failed: ${draftResult.error}`);
      }

      this.emit('phase:complete', { orchestrationId, phase: 'draft', result: draftResult });

      // Phase 2: Parallel Review
      result.phase = 'review';
      this.emit('phase:start', { orchestrationId, phase: 'review', tasks: plan.reviewers });

      const reviewResults = options.parallelReviews !== false
        ? await Promise.all(plan.reviewers.map(reviewer => this.executeReviewTask(reviewer)))
        : await this.executeReviewsSequentially(plan.reviewers);

      result.reviewResults = reviewResults;

      // Check review approvals
      const rejectedReviews = reviewResults.filter(r => r.status === 'rejected');
      if (rejectedReviews.length > 0 && options.requireAllApprovals) {
        throw new Error(`Rejected by reviewers: ${rejectedReviews.map(r => r.agentType).join(', ')}`);
      }

      this.emit('phase:complete', { orchestrationId, phase: 'review', results: reviewResults });

      // Phase 3: Synthesis
      result.phase = 'synthesis';
      this.emit('phase:start', { orchestrationId, phase: 'synthesis', task: plan.synthesizer });

      const synthesisResult = await this.executeAgentTask(plan.synthesizer);
      result.synthesisResult = synthesisResult;

      if (!synthesisResult.success) {
        throw new Error(`Synthesis failed: ${synthesisResult.error}`);
      }

      result.finalArtifactPath = synthesisResult.outputPath;

      this.emit('phase:complete', { orchestrationId, phase: 'synthesis', result: synthesisResult });

      // Phase 4: Validation (optional)
      if (plan.validation && options.enableValidation !== false) {
        this.emit('phase:start', { orchestrationId, phase: 'validation', task: plan.validation });

        const validationResult = await this.executeAgentTask(plan.validation);
        result.validationResult = validationResult;

        if (!validationResult.success) {
          throw new Error(`Validation failed: ${validationResult.error}`);
        }

        this.emit('phase:complete', { orchestrationId, phase: 'validation', result: validationResult });
      }

      // Complete
      result.phase = 'complete';
      result.success = true;
      result.totalDuration = Date.now() - startTime;

      this.emit('orchestration:complete', { orchestrationId, result });

      return result;

    } catch (error) {
      result.phase = 'failed';
      result.success = false;
      result.error = error instanceof Error ? error.message : String(error);
      result.totalDuration = Date.now() - startTime;

      this.emit('orchestration:failed', { orchestrationId, result, error });

      return result;

    } finally {
      this.activeOrchestrations.delete(orchestrationId);
    }
  }

  /**
   * Execute a single agent task (simulated)
   * In production, this would call the Claude Code Task tool with appropriate subagent_type
   */
  private async executeAgentTask(task: AgentTask): Promise<AgentResult> {
    const startTime = Date.now();
    const taskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Simulate agent execution time
      await this.delay(Math.min(task.timeout || 60000, 1000)); // 1s for tests, would be longer in production

      // Simulate success
      return {
        taskId,
        agentType: task.agentType,
        success: true,
        outputPath: task.outputPath,
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        taskId,
        agentType: task.agentType,
        success: false,
        outputPath: task.outputPath,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Execute a review task (simulated)
   */
  private async executeReviewTask(task: AgentTask): Promise<ReviewResult> {
    const baseResult = await this.executeAgentTask(task);

    // Simulate review outcomes
    const statuses: ReviewStatus[] = ['approved', 'approved-with-changes', 'conditional'];
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];

    return {
      ...baseResult,
      status: randomStatus,
      comments: this.generateMockComments(task.agentType, randomStatus),
      suggestions: this.generateMockSuggestions(task.agentType)
    };
  }

  /**
   * Execute reviews sequentially
   */
  private async executeReviewsSequentially(reviewers: AgentTask[]): Promise<ReviewResult[]> {
    const results: ReviewResult[] = [];
    for (const reviewer of reviewers) {
      const result = await this.executeReviewTask(reviewer);
      results.push(result);
    }
    return results;
  }

  /**
   * Generate mock review comments (for testing/simulation)
   */
  private generateMockComments(agentType: AgentType, status: ReviewStatus): ReviewComment[] {
    if (status === 'approved') return [];

    const comments: ReviewComment[] = [];

    switch (agentType) {
      case 'security-architect':
        comments.push({
          severity: 'major',
          section: 'Security Architecture',
          comment: 'Consider adding authentication details',
          suggestedFix: 'Add section on JWT token handling and session management'
        });
        break;
      case 'test-architect':
        comments.push({
          severity: 'minor',
          section: 'Testing Strategy',
          comment: 'Add performance test scenarios',
          suggestedFix: 'Include load testing targets (e.g., 1000 concurrent users)'
        });
        break;
      case 'requirements-analyst':
        comments.push({
          severity: 'major',
          section: 'Requirements Traceability',
          comment: 'Missing UC-003 mapping',
          suggestedFix: 'Add traceability link to UC-003 in Component Design section'
        });
        break;
      case 'technical-writer':
        comments.push({
          severity: 'minor',
          section: 'Style and Clarity',
          comment: 'Use consistent heading levels',
          suggestedFix: 'Convert all subsections to use ### for consistency'
        });
        break;
    }

    return comments;
  }

  /**
   * Generate mock suggestions (for testing/simulation)
   */
  private generateMockSuggestions(agentType: AgentType): string[] {
    const suggestions: Record<AgentType, string[]> = {
      'security-architect': ['Add threat modeling section', 'Include security compliance matrix'],
      'test-architect': ['Add regression test strategy', 'Include test automation framework details'],
      'requirements-analyst': ['Add NFR traceability matrix', 'Link to user story mapping'],
      'technical-writer': ['Add table of contents', 'Include glossary of terms'],
      'architecture-designer': ['Add deployment view', 'Include technology stack rationale'],
      'documentation-synthesizer': ['Consolidate duplicate sections', 'Add executive summary'],
      'devops-engineer': ['Add CI/CD pipeline diagram', 'Include deployment runbook reference'],
      'performance-engineer': ['Add performance targets', 'Include capacity planning details']
    };

    return suggestions[agentType] || [];
  }

  /**
   * Get next ADR number from directory
   */
  private getNextADRNumber(adrDir: string): number {
    try {
      // This would scan the directory in production
      // For now, return a mock number
      return 1;
    } catch {
      return 1;
    }
  }

  /**
   * Convert decision text to URL-friendly slug
   */
  private slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Delay helper for simulation
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get active orchestrations count
   */
  public getActiveOrchestrations(): Map<string, OrchestrationResult> {
    return new Map(this.activeOrchestrations);
  }

  /**
   * Cancel an active orchestration
   */
  public cancelOrchestration(orchestrationId: string): boolean {
    const orchestration = this.activeOrchestrations.get(orchestrationId);
    if (!orchestration) return false;

    orchestration.phase = 'failed';
    orchestration.error = 'Cancelled by user';
    this.activeOrchestrations.delete(orchestrationId);

    this.emit('orchestration:cancelled', { orchestrationId });

    return true;
  }
}

export default AgentOrchestrator;
