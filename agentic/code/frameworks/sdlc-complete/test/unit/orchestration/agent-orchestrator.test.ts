/**
 * @file agent-orchestrator.test.ts
 * @description Comprehensive test suite for multi-agent orchestration system
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AgentOrchestrator, type OrchestrationPlan, type OrchestrationOptions } from '../../../src/orchestration/agent-orchestrator.ts';
import { ReviewSynthesizer } from '../../../src/orchestration/review-synthesizer.ts';

describe('AgentOrchestrator', () => {
  let orchestrator: AgentOrchestrator;

  beforeEach(() => {
    orchestrator = new AgentOrchestrator();
  });

  // ============================================================================
  // Plan Creation Tests
  // ============================================================================

  describe('SAD Plan Creation', () => {
    it('should create a complete SAD orchestration plan', () => {
      const options: OrchestrationOptions = {
        workingDir: '/test/project'
      };

      const plan = orchestrator.createSADPlan(options);

      expect(plan.artifactType).toBe('Software Architecture Document');
      expect(plan.primaryAuthor.agentType).toBe('architecture-designer');
      expect(plan.primaryAuthor.role).toBe('primary-author');
      expect(plan.reviewers).toHaveLength(4);
      expect(plan.synthesizer.agentType).toBe('documentation-synthesizer');
      expect(plan.timeout).toBeGreaterThan(0);
    });

    it('should include all required reviewers for SAD', () => {
      const plan = orchestrator.createSADPlan({ workingDir: '/test' });

      const reviewerTypes = plan.reviewers.map(r => r.agentType);
      expect(reviewerTypes).toContain('security-architect');
      expect(reviewerTypes).toContain('test-architect');
      expect(reviewerTypes).toContain('requirements-analyst');
      expect(reviewerTypes).toContain('technical-writer');
    });

    it('should set correct dependencies for SAD workflow', () => {
      const plan = orchestrator.createSADPlan({ workingDir: '/test' });

      // All reviewers depend on primary author
      for (const reviewer of plan.reviewers) {
        expect(reviewer.dependsOn).toContain('primary-author');
      }

      // Synthesizer depends on reviewers
      expect(plan.synthesizer.dependsOn).toContain('reviewers');
    });

    it('should set correct output paths for SAD', () => {
      const plan = orchestrator.createSADPlan({ workingDir: '/test/project' });

      expect(plan.primaryAuthor.outputPath).toContain('architecture/sad/drafts');
      expect(plan.synthesizer.outputPath).toContain('architecture/software-architecture-doc.md');

      for (const reviewer of plan.reviewers) {
        expect(reviewer.outputPath).toContain('architecture/sad/reviews');
      }
    });
  });

  describe('ADR Plan Creation', () => {
    it('should create ADR plan with decision context', () => {
      const decision = 'Use PostgreSQL for primary database';
      const plan = orchestrator.createADRPlan({ workingDir: '/test' }, decision);

      expect(plan.artifactType).toBe('Architecture Decision Record');
      expect(plan.primaryAuthor.description).toContain(decision);
    });

    it('should generate ADR filename with number and slug', () => {
      const decision = 'Use GraphQL API Gateway';
      const plan = orchestrator.createADRPlan({ workingDir: '/test' }, decision);

      expect(plan.primaryAuthor.outputPath).toMatch(/ADR-\d{3}-use-graphql-api-gateway\.md/);
    });

    it('should include minimal reviewers for ADR (faster than SAD)', () => {
      const plan = orchestrator.createADRPlan({ workingDir: '/test' }, 'Use Redis');

      expect(plan.reviewers.length).toBeLessThan(4);
      expect(plan.reviewers.length).toBeGreaterThanOrEqual(2);
    });

    it('should have shorter timeout for ADR than SAD', () => {
      const sadPlan = orchestrator.createSADPlan({ workingDir: '/test' });
      const adrPlan = orchestrator.createADRPlan({ workingDir: '/test' }, 'Decision');

      expect(adrPlan.timeout).toBeLessThan(sadPlan.timeout);
    });
  });

  describe('Master Test Plan Creation', () => {
    it('should create test plan with all necessary reviewers', () => {
      const plan = orchestrator.createTestPlanPlan({ workingDir: '/test' });

      expect(plan.artifactType).toBe('Master Test Plan');
      expect(plan.primaryAuthor.agentType).toBe('test-architect');

      const reviewerTypes = plan.reviewers.map(r => r.agentType);
      expect(reviewerTypes).toContain('requirements-analyst');
      expect(reviewerTypes).toContain('security-architect');
      expect(reviewerTypes).toContain('performance-engineer');
    });

    it('should include requirements coverage validation', () => {
      const plan = orchestrator.createTestPlanPlan({ workingDir: '/test' });

      const requirementsReviewer = plan.reviewers.find(r =>
        r.agentType === 'requirements-analyst'
      );

      expect(requirementsReviewer).toBeDefined();
      expect(requirementsReviewer?.description).toContain('coverage');
    });
  });

  // ============================================================================
  // Orchestration Execution Tests
  // ============================================================================

  describe('Orchestration Execution', () => {
    it('should execute SAD orchestration successfully', async () => {
      const plan = orchestrator.createSADPlan({ workingDir: '/test' });

      const result = await orchestrator.executeOrchestration(plan);

      expect(result.success).toBe(true);
      expect(result.phase).toBe('complete');
      expect(result.draftResult).toBeDefined();
      expect(result.reviewResults.length).toBe(4);
      expect(result.synthesisResult).toBeDefined();
      expect(result.finalArtifactPath).toBeDefined();
    });

    it('should execute reviews in parallel by default', async () => {
      const plan = orchestrator.createSADPlan({ workingDir: '/test' });
      const startTime = Date.now();

      const result = await orchestrator.executeOrchestration(plan, {
        workingDir: '/test',
        parallelReviews: true
      });

      const duration = Date.now() - startTime;

      expect(result.success).toBe(true);
      // Parallel execution should be faster than sequential (allow headroom for CI/slow systems)
      expect(duration).toBeLessThan(10000);
    });

    it('should track active orchestrations', async () => {
      const plan = orchestrator.createADRPlan({ workingDir: '/test' }, 'Decision');

      const executionPromise = orchestrator.executeOrchestration(plan);

      // Check active orchestrations mid-execution
      const active = orchestrator.getActiveOrchestrations();
      expect(active.size).toBe(1);

      await executionPromise;

      // Should be empty after completion
      expect(orchestrator.getActiveOrchestrations().size).toBe(0);
    });

    it('should emit orchestration events', async () => {
      const plan = orchestrator.createADRPlan({ workingDir: '/test' }, 'Decision');

      const events: string[] = [];
      orchestrator.on('orchestration:start', () => events.push('start'));
      orchestrator.on('phase:start', () => events.push('phase'));
      orchestrator.on('orchestration:complete', () => events.push('complete'));

      await orchestrator.executeOrchestration(plan);

      expect(events).toContain('start');
      expect(events).toContain('phase');
      expect(events).toContain('complete');
    });

    it('should handle orchestration cancellation', async () => {
      const plan = orchestrator.createSADPlan({ workingDir: '/test' });
      const cancelled: string[] = [];
      orchestrator.on('orchestration:cancelled', ({ orchestrationId }) => {
        cancelled.push(orchestrationId);
      });

      const executionPromise = orchestrator.executeOrchestration(plan);

      const active = orchestrator.getActiveOrchestrations();
      const orchestrationId = active.keys().next().value;
      expect(orchestrationId).toBeDefined();
      expect(orchestrator.cancelOrchestration(orchestrationId!)).toBe(true);
      expect(cancelled).toEqual([orchestrationId]);
      expect(orchestrator.getActiveOrchestrations().size).toBe(0);

      const result = await executionPromise;
      expect(result.success).toBe(false);
      expect(result.phase).toBe('failed');
      expect(result.error).toBe('Cancelled by user');
      expect(orchestrator.cancelOrchestration(orchestrationId!)).toBe(false);
    });
  });

  describe('Review Phase', () => {
    it('should collect review results from all reviewers', async () => {
      const plan = orchestrator.createSADPlan({ workingDir: '/test' });

      const result = await orchestrator.executeOrchestration(plan);

      expect(result.reviewResults).toHaveLength(plan.reviewers.length);

      for (const review of result.reviewResults) {
        expect(review.success).toBe(true);
        expect(review.status).toMatch(/approved|approved-with-changes|conditional/);
        expect(review.comments).toBeDefined();
        expect(review.suggestions).toBeDefined();
      }
    });

    it('should generate mock comments based on reviewer type', async () => {
      const plan = orchestrator.createSADPlan({ workingDir: '/test' });
      vi.spyOn(Math, 'random').mockReturnValue(0.4);

      const result = await orchestrator.executeOrchestration(plan);

      const securityReview = result.reviewResults.find(r =>
        r.agentType === 'security-architect'
      );

      expect(securityReview).toBeDefined();
      expect(securityReview?.status).toBe('approved-with-changes');
      expect(securityReview?.comments).toContainEqual(expect.objectContaining({
        section: 'Security Architecture',
        comment: 'Consider adding authentication details'
      }));
    });

    it('should allow approved-with-changes when all approvals are not required', async () => {
      const plan = orchestrator.createSADPlan({ workingDir: '/test' });
      vi.spyOn(Math, 'random').mockReturnValue(0.4);

      const result = await orchestrator.executeOrchestration(plan, {
        workingDir: '/test',
        requireAllApprovals: false
      });

      expect(result.success).toBe(true);
      expect(result.reviewResults).toHaveLength(4);
      expect(result.reviewResults.every(review => review.status === 'approved-with-changes')).toBe(true);
    });
  });

  describe('Performance Requirements (NFR-PERF-004)', () => {
    it('should complete orchestration in <30s for single artifact', async () => {
      const plan = orchestrator.createADRPlan({ workingDir: '/test' }, 'Decision');

      const startTime = Date.now();
      const result = await orchestrator.executeOrchestration(plan);
      const duration = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(30000); // <30s (NFR-PERF-004)
    });

    it('should track orchestration duration accurately', async () => {
      const plan = orchestrator.createADRPlan({ workingDir: '/test' }, 'Decision');

      const result = await orchestrator.executeOrchestration(plan);

      expect(result.totalDuration).toBeGreaterThan(0);
      expect(result.totalDuration).toBeLessThan(result.plan.timeout);
    });
  });

  describe('Error Handling', () => {
    it('should handle failed draft generation', async () => {
      const plan = orchestrator.createSADPlan({ workingDir: '/test' });

      // Mock failure by setting impossible timeout
      plan.primaryAuthor.timeout = 0;

      const result = await orchestrator.executeOrchestration(plan);

      expect(result.success).toBe(false);
      expect(result.phase).toBe('failed');
      expect(result.draftResult).toMatchObject({
        success: false,
        error: 'Task timeout must be positive: 0'
      });
      expect(result.error).toBe('Draft generation failed: Task timeout must be positive: 0');
    });

    it('should emit failure events on error', async () => {
      const plan = orchestrator.createSADPlan({ workingDir: '/test' });
      plan.primaryAuthor.timeout = 0;

      const failures: Array<{ phase: string; error?: string }> = [];
      orchestrator.on('orchestration:failed', ({ result }) => {
        failures.push({ phase: result.phase, error: result.error });
      });

      const result = await orchestrator.executeOrchestration(plan);

      expect(result.success).toBe(false);
      expect(failures).toEqual([{
        phase: 'failed',
        error: 'Draft generation failed: Task timeout must be positive: 0'
      }]);
    });
  });
});

// ============================================================================
// Review Synthesizer Tests
// ============================================================================

describe('ReviewSynthesizer', () => {
  let synthesizer: ReviewSynthesizer;

  beforeEach(() => {
    synthesizer = new ReviewSynthesizer();
  });

  describe('Basic Synthesis', () => {
    it('should synthesize single review', () => {
      const reviews = [
        {
          taskId: 'task-1',
          agentType: 'security-architect' as const,
          success: true,
          outputPath: '/test/review.md',
          duration: 1000,
          status: 'approved' as const,
          comments: [],
          suggestions: ['Add security section']
        }
      ];

      const synthesis = synthesizer.synthesize(reviews);

      expect(synthesis.reviewCount).toBe(1);
      expect(synthesis.approvedCount).toBe(1);
      expect(synthesis.overallStatus).toBe('approved');
    });

    it('should handle empty review list', () => {
      expect(() => synthesizer.synthesize([])).toThrow('Cannot synthesize zero reviews');
    });
  });

  describe('Status Determination', () => {
    it('should set overall status to approved for all approved reviews', () => {
      const reviews = [
        {
          taskId: 'task-1',
          agentType: 'security-architect' as const,
          success: true,
          outputPath: '/test/review1.md',
          duration: 1000,
          status: 'approved' as const,
          comments: [],
          suggestions: []
        },
        {
          taskId: 'task-2',
          agentType: 'test-architect' as const,
          success: true,
          outputPath: '/test/review2.md',
          duration: 1000,
          status: 'approved' as const,
          comments: [],
          suggestions: []
        }
      ];

      const synthesis = synthesizer.synthesize(reviews);

      expect(synthesis.overallStatus).toBe('approved');
    });

    it('should set status to approved-with-changes when changes requested', () => {
      const reviews = [
        {
          taskId: 'task-1',
          agentType: 'security-architect' as const,
          success: true,
          outputPath: '/test/review1.md',
          duration: 1000,
          status: 'approved-with-changes' as const,
          comments: [
            {
              severity: 'minor' as const,
              section: 'Security',
              comment: 'Add authentication details'
            }
          ],
          suggestions: []
        }
      ];

      const synthesis = synthesizer.synthesize(reviews);

      expect(synthesis.overallStatus).toBe('approved-with-changes');
    });

    it('should set status to conditional for rejections', () => {
      const reviews = [
        {
          taskId: 'task-1',
          agentType: 'security-architect' as const,
          success: true,
          outputPath: '/test/review.md',
          duration: 1000,
          status: 'rejected' as const,
          comments: [
            {
              severity: 'critical' as const,
              section: 'Security',
              comment: 'Missing security architecture'
            }
          ],
          suggestions: []
        }
      ];

      const synthesis = synthesizer.synthesize(reviews);

      expect(synthesis.overallStatus).toBe('conditional');
      expect(synthesis.rejectedCount).toBe(1);
    });
  });

  describe('Comment Consolidation', () => {
    it('should consolidate comments by section', () => {
      const reviews = [
        {
          taskId: 'task-1',
          agentType: 'security-architect' as const,
          success: true,
          outputPath: '/test/review1.md',
          duration: 1000,
          status: 'approved-with-changes' as const,
          comments: [
            {
              severity: 'major' as const,
              section: 'Security Architecture',
              comment: 'Add authentication flow'
            }
          ],
          suggestions: []
        },
        {
          taskId: 'task-2',
          agentType: 'test-architect' as const,
          success: true,
          outputPath: '/test/review2.md',
          duration: 1000,
          status: 'approved-with-changes' as const,
          comments: [
            {
              severity: 'minor' as const,
              section: 'Security Architecture',
              comment: 'Include security testing strategy'
            }
          ],
          suggestions: []
        }
      ];

      const synthesis = synthesizer.synthesize(reviews);

      expect(synthesis.consolidatedComments.length).toBeGreaterThan(0);

      const securityComments = synthesis.consolidatedComments.filter(c =>
        c.section.includes('security')
      );
      expect(securityComments.length).toBeGreaterThan(0);
    });

    it('should prioritize critical severity comments', () => {
      const reviews = [
        {
          taskId: 'task-1',
          agentType: 'security-architect' as const,
          success: true,
          outputPath: '/test/review.md',
          duration: 1000,
          status: 'conditional' as const,
          comments: [
            {
              severity: 'critical' as const,
              section: 'Security',
              comment: 'Critical security flaw'
            },
            {
              severity: 'minor' as const,
              section: 'Style',
              comment: 'Minor style issue'
            }
          ],
          suggestions: []
        }
      ];

      const synthesis = synthesizer.synthesize(reviews);

      // Critical comments should appear first
      const firstComment = synthesis.consolidatedComments[0];
      expect(firstComment.severity).toBe('critical');
    });

    it('should reject contradictory feedback by default', () => {
      const reviews = [
        {
          taskId: 'task-1', agentType: 'security-architect' as const, success: true,
          outputPath: '/test/review1.md', duration: 1000, status: 'approved-with-changes' as const,
          comments: [{ severity: 'major' as const, section: 'Security', comment: 'Add authentication', suggestedFix: 'Add authentication' }], suggestions: []
        },
        {
          taskId: 'task-2', agentType: 'technical-writer' as const, success: true,
          outputPath: '/test/review2.md', duration: 1000, status: 'approved-with-changes' as const,
          comments: [{ severity: 'major' as const, section: 'Security', comment: 'Remove authentication', suggestedFix: 'Remove authentication' }], suggestions: []
        }
      ];

      expect(() => synthesizer.synthesize(reviews)).toThrow(
        'Contradictory review conflicts detected: Contradictory feedback on security'
      );
    });

    it('should return explicitly allowed conflicts using reviewer-role priority', () => {
      const reviews = [
        {
          taskId: 'task-1', agentType: 'security-architect' as const, success: true,
          outputPath: '/test/review1.md', duration: 1000, status: 'approved-with-changes' as const,
          comments: [{ severity: 'major' as const, section: 'Security', comment: 'Add authentication', suggestedFix: 'Add authentication' }], suggestions: []
        },
        {
          taskId: 'task-2', agentType: 'technical-writer' as const, success: true,
          outputPath: '/test/review2.md', duration: 1000, status: 'approved-with-changes' as const,
          comments: [{ severity: 'critical' as const, section: 'Security', comment: 'Remove authentication', suggestedFix: 'Remove authentication' }], suggestions: []
        }
      ];

      const synthesis = synthesizer.synthesize(reviews, { allowConflicts: true });
      expect(synthesis.conflicts).toHaveLength(1);
      expect(synthesis.conflicts[0].resolution).toBe(
        'Follow security-architect recommendation: Add authentication'
      );
    });

    it('should resolve explicitly allowed conflicts by severity when role priority is disabled', () => {
      const reviews = [
        {
          taskId: 'task-1', agentType: 'security-architect' as const, success: true,
          outputPath: '/test/review1.md', duration: 1000, status: 'approved-with-changes' as const,
          comments: [{ severity: 'minor' as const, section: 'Security', comment: 'Add authentication', suggestedFix: 'Add authentication' }], suggestions: []
        },
        {
          taskId: 'task-2', agentType: 'technical-writer' as const, success: true,
          outputPath: '/test/review2.md', duration: 1000, status: 'approved-with-changes' as const,
          comments: [{ severity: 'critical' as const, section: 'Security', comment: 'Remove authentication', suggestedFix: 'Remove authentication' }], suggestions: []
        }
      ];

      const synthesis = synthesizer.synthesize(reviews, {
        allowConflicts: true,
        prioritizeByRole: false
      });
      expect(synthesis.conflicts[0].resolution).toBe(
        'Prioritize higher severity: Remove authentication'
      );
    });
  });

  describe('Action Plan Generation', () => {
    it('should generate action plan from comments', () => {
      const reviews = [
        {
          taskId: 'task-1',
          agentType: 'security-architect' as const,
          success: true,
          outputPath: '/test/review.md',
          duration: 1000,
          status: 'approved-with-changes' as const,
          comments: [
            {
              severity: 'critical' as const,
              section: 'Security',
              comment: 'Add authentication',
              suggestedFix: 'Implement JWT authentication'
            }
          ],
          suggestions: []
        }
      ];

      const synthesis = synthesizer.synthesize(reviews);

      expect(synthesis.actionPlan.length).toBeGreaterThan(0);
      expect(synthesis.actionPlan.join(' ')).toContain('CRITICAL');
    });

    it('should group actions by severity', () => {
      const reviews = [
        {
          taskId: 'task-1',
          agentType: 'test-architect' as const,
          success: true,
          outputPath: '/test/review.md',
          duration: 1000,
          status: 'approved-with-changes' as const,
          comments: [
            {
              severity: 'critical' as const,
              section: 'Testing',
              comment: 'Critical test gap'
            },
            {
              severity: 'major' as const,
              section: 'Testing',
              comment: 'Major test improvement'
            },
            {
              severity: 'minor' as const,
              section: 'Style',
              comment: 'Minor style fix'
            }
          ],
          suggestions: []
        }
      ];

      const synthesis = synthesizer.synthesize(reviews);

      expect(synthesis.actionPlan).toEqual([
        'CRITICAL ITEMS (must fix):',
        '  - [testing] Address: Critical test gap',
        'MAJOR ITEMS (should fix):',
        '  - [testing] Address: Major test improvement',
        'MINOR ITEMS (optional):',
        '  - [style] Address: Minor style fix'
      ]);
    });
  });

  describe('Synthesis Quality Score (NFR-QUAL-001)', () => {
    it('should calculate high quality score for all approvals', () => {
      const reviews = [
        {
          taskId: 'task-1',
          agentType: 'security-architect' as const,
          success: true,
          outputPath: '/test/review.md',
          duration: 1000,
          status: 'approved' as const,
          comments: [],
          suggestions: []
        }
      ];

      const synthesis = synthesizer.synthesize(reviews);

      expect(synthesis.synthesisQuality).toBeGreaterThan(0.8);
      expect(synthesis.synthesisQuality).toBeLessThanOrEqual(1.0);
    });

    it('should reduce quality score for rejections', () => {
      const reviews = [
        {
          taskId: 'task-1',
          agentType: 'security-architect' as const,
          success: true,
          outputPath: '/test/review.md',
          duration: 1000,
          status: 'rejected' as const,
          comments: [
            {
              severity: 'critical' as const,
              section: 'Security',
              comment: 'Major security issues'
            }
          ],
          suggestions: []
        }
      ];

      const synthesis = synthesizer.synthesize(reviews);

      expect(synthesis.synthesisQuality).toBeLessThan(0.8);
    });
  });

  describe('Report Generation', () => {
    it('should generate markdown synthesis report', () => {
      const reviews = [
        {
          taskId: 'task-1',
          agentType: 'security-architect' as const,
          success: true,
          outputPath: '/test/review.md',
          duration: 1000,
          status: 'approved-with-changes' as const,
          comments: [
            {
              severity: 'major' as const,
              section: 'Security',
              comment: 'Add security section'
            }
          ],
          suggestions: ['Add threat model']
        }
      ];

      const synthesis = synthesizer.synthesize(reviews);
      const report = synthesizer.generateReport(synthesis);

      expect(report).toContain('# Review Synthesis Report');
      expect(report).toContain('## Overall Status');
      expect(report).toContain('## Action Plan');
      expect(report).toContain('Quality Score');
    });

    it('should include detailed feedback in report', () => {
      const reviews = [
        {
          taskId: 'task-1',
          agentType: 'security-architect' as const,
          success: true,
          outputPath: '/test/review.md',
          duration: 1000,
          status: 'approved-with-changes' as const,
          comments: [
            {
              severity: 'critical' as const,
              section: 'Security Architecture',
              comment: 'Missing authentication flow'
            }
          ],
          suggestions: []
        }
      ];

      const synthesis = synthesizer.synthesize(reviews);
      const report = synthesizer.generateReport(synthesis);

      expect(report).toContain('## Detailed Feedback');
      expect(report.toLowerCase()).toContain('security');
      expect(report).toContain('CRITICAL');
    });
  });
});
