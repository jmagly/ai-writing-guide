/**
 * @file review-synthesizer.ts
 * @description Intelligent synthesis of multiple review comments and feedback
 *
 * Consolidates feedback from multiple reviewers (security, testing, requirements, etc.)
 * into actionable changes for final artifact generation.
 *
 * @implements NFR-QUAL-001: 100% review comment traceability
 */

import type { ReviewResult, ReviewComment, ReviewStatus } from './agent-orchestrator.js';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface ConflictResolution {
  conflictType: 'contradictory' | 'overlapping' | 'priority';
  involvedReviewers: string[];
  description: string;
  resolution: string;
  reasoning: string;
}

export interface ConsolidatedComment {
  id: string;
  severity: 'critical' | 'major' | 'minor' | 'info';
  section: string;
  consolidatedText: string;
  sources: Array<{ reviewer: string; originalComment: string }>;
  actionItems: string[];
  resolved: boolean;
}

export interface SynthesisResult {
  reviewCount: number;
  approvedCount: number;
  conditionalCount: number;
  rejectedCount: number;
  overallStatus: ReviewStatus;
  consolidatedComments: ConsolidatedComment[];
  conflicts: ConflictResolution[];
  actionPlan: string[];
  synthesisQuality: number; // 0-1 score indicating synthesis confidence
}

export interface SynthesisOptions {
  prioritizeByRole?: boolean; // Security > Requirements > Testing > Style
  allowConflicts?: boolean; // Default: false (raise error on conflicts)
  minConsensusThreshold?: number; // 0-1, default: 0.5 (50% agreement required)
}

// ============================================================================
// Review Synthesizer Class
// ============================================================================

export class ReviewSynthesizer {
  private readonly rolePriorities: Map<string, number> = new Map([
    ['security-architect', 100],
    ['requirements-analyst', 90],
    ['test-architect', 80],
    ['performance-engineer', 70],
    ['architecture-designer', 60],
    ['devops-engineer', 50],
    ['technical-writer', 40],
    ['documentation-synthesizer', 30]
  ]);

  /**
   * Synthesize multiple review results into consolidated feedback
   */
  public synthesize(
    reviews: ReviewResult[],
    options: SynthesisOptions = {}
  ): SynthesisResult {
    if (reviews.length === 0) {
      throw new Error('Cannot synthesize zero reviews');
    }

    // Count review statuses
    const approvedCount = reviews.filter(r => r.status === 'approved').length;
    const conditionalCount = reviews.filter(r => r.status === 'conditional').length;
    const rejectedCount = reviews.filter(r => r.status === 'rejected').length;
    const approvedWithChangesCount = reviews.filter(r => r.status === 'approved-with-changes').length;

    // Determine overall status
    const overallStatus = this.determineOverallStatus(
      reviews,
      options.minConsensusThreshold || 0.5
    );

    // Consolidate all comments
    const consolidatedComments = this.consolidateComments(reviews, options);

    // Detect conflicts
    const conflicts = this.detectConflicts(consolidatedComments, reviews, options);

    // Generate action plan
    const actionPlan = this.generateActionPlan(consolidatedComments);

    // Calculate synthesis quality
    const synthesisQuality = this.calculateSynthesisQuality(
      reviews,
      consolidatedComments,
      conflicts
    );

    return {
      reviewCount: reviews.length,
      approvedCount: approvedCount + approvedWithChangesCount,
      conditionalCount,
      rejectedCount,
      overallStatus,
      consolidatedComments,
      conflicts,
      actionPlan,
      synthesisQuality
    };
  }

  /**
   * Determine overall review status based on individual reviews
   */
  private determineOverallStatus(
    reviews: ReviewResult[],
    consensusThreshold: number
  ): ReviewStatus {
    const statusCounts = new Map<ReviewStatus, number>();

    for (const review of reviews) {
      statusCounts.set(review.status, (statusCounts.get(review.status) || 0) + 1);
    }

    const totalReviews = reviews.length;
    const approvedCount = (statusCounts.get('approved') || 0) + (statusCounts.get('approved-with-changes') || 0);
    const rejectedCount = statusCounts.get('rejected') || 0;

    // Any rejection means conditional at minimum
    if (rejectedCount > 0) {
      return 'conditional';
    }

    // Check if we meet consensus threshold
    const approvalRate = approvedCount / totalReviews;
    if (approvalRate >= consensusThreshold) {
      // If all approved without changes, status is approved
      if (statusCounts.get('approved-with-changes') === 0) {
        return 'approved';
      }
      return 'approved-with-changes';
    }

    return 'conditional';
  }

  /**
   * Consolidate comments from multiple reviewers
   */
  private consolidateComments(
    reviews: ReviewResult[],
    _options: SynthesisOptions
  ): ConsolidatedComment[] {
    const commentGroups = new Map<string, ReviewComment[]>();

    // Group comments by section
    for (const review of reviews) {
      for (const comment of review.comments) {
        const section = this.normalizeSection(comment.section);
        if (!commentGroups.has(section)) {
          commentGroups.set(section, []);
        }
        commentGroups.get(section)!.push({
          ...comment,
          // @ts-ignore - add reviewer metadata
          _reviewer: review.agentType
        });
      }
    }

    // Consolidate comments within each section
    const consolidated: ConsolidatedComment[] = [];
    let commentCounter = 0;

    for (const [section, comments] of commentGroups.entries()) {
      // Group similar comments
      const similarGroups = this.groupSimilarComments(comments);

      for (const group of similarGroups) {
        consolidated.push({
          id: `comment-${++commentCounter}`,
          severity: this.determineMostSevereSeverity(group),
          section,
          consolidatedText: this.mergeCommentTexts(group),
          sources: group.map(c => ({
            // @ts-ignore
            reviewer: c._reviewer as string,
            originalComment: c.comment
          })),
          actionItems: this.extractActionItems(group),
          resolved: false
        });
      }
    }

    // Sort by severity (critical first)
    return consolidated.sort((a, b) => {
      const severityOrder = { critical: 0, major: 1, minor: 2, info: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  /**
   * Normalize section names for grouping
   */
  private normalizeSection(section: string): string {
    return section
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-');
  }

  /**
   * Group similar comments together
   */
  private groupSimilarComments(comments: ReviewComment[]): ReviewComment[][] {
    if (comments.length === 0) return [];
    if (comments.length === 1) return [comments];

    const groups: ReviewComment[][] = [];
    const used = new Set<number>();

    for (let i = 0; i < comments.length; i++) {
      if (used.has(i)) continue;

      const group = [comments[i]];
      used.add(i);

      // Find similar comments
      for (let j = i + 1; j < comments.length; j++) {
        if (used.has(j)) continue;

        if (this.areCommentsSimilar(comments[i], comments[j])) {
          group.push(comments[j]);
          used.add(j);
        }
      }

      groups.push(group);
    }

    return groups;
  }

  /**
   * Check if two comments are similar enough to consolidate
   */
  private areCommentsSimilar(a: ReviewComment, b: ReviewComment): boolean {
    // Simple keyword-based similarity (in production, use Levenshtein distance or NLP)
    const aWords = new Set(a.comment.toLowerCase().split(/\s+/));
    const bWords = new Set(b.comment.toLowerCase().split(/\s+/));

    const intersection = new Set([...aWords].filter(w => bWords.has(w)));
    const union = new Set([...aWords, ...bWords]);

    const similarity = intersection.size / union.size;

    return similarity > 0.4; // 40% word overlap
  }

  /**
   * Determine the most severe severity from a group
   */
  private determineMostSevereSeverity(
    comments: ReviewComment[]
  ): 'critical' | 'major' | 'minor' | 'info' {
    const severities = comments.map(c => c.severity);

    if (severities.includes('critical')) return 'critical';
    if (severities.includes('major')) return 'major';
    if (severities.includes('minor')) return 'minor';
    return 'info';
  }

  /**
   * Merge comment texts from similar comments
   */
  private mergeCommentTexts(comments: ReviewComment[]): string {
    if (comments.length === 1) {
      return comments[0].comment;
    }

    // Find common theme
    const allText = comments.map(c => c.comment).join(' ');
    const words = allText.toLowerCase().split(/\s+/);
    const wordFreq = new Map<string, number>();

    for (const word of words) {
      if (word.length > 3) { // Ignore short words
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
      }
    }

    // Get top keywords
    /* const _topKeywords = Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([word]) => word); */

    // Build consolidated text
    const reviewerCount = comments.length;
    const consolidatedText = `${reviewerCount} reviewers noted: ${comments[0].comment}`;

    if (comments.length > 1) {
      const additionalComments = comments.slice(1).map(c => c.comment).join('; ');
      return `${consolidatedText} Additional feedback: ${additionalComments}`;
    }

    return consolidatedText;
  }

  /**
   * Extract action items from comments
   */
  private extractActionItems(comments: ReviewComment[]): string[] {
    const actions: string[] = [];

    for (const comment of comments) {
      if (comment.suggestedFix) {
        actions.push(comment.suggestedFix);
      } else {
        // Generate action from comment
        actions.push(`Address: ${comment.comment}`);
      }
    }

    return Array.from(new Set(actions)); // Deduplicate
  }

  /**
   * Detect conflicts between reviewer comments
   */
  private detectConflicts(
    consolidatedComments: ConsolidatedComment[],
    _reviews: ReviewResult[],
    options: SynthesisOptions
  ): ConflictResolution[] {
    const conflicts: ConflictResolution[] = [];

    // Check for contradictory comments
    for (let i = 0; i < consolidatedComments.length; i++) {
      for (let j = i + 1; j < consolidatedComments.length; j++) {
        const commentA = consolidatedComments[i];
        const commentB = consolidatedComments[j];

        // Same section, different actions
        if (commentA.section === commentB.section &&
            this.areActionsContradictory(commentA.actionItems, commentB.actionItems)) {

          const conflict: ConflictResolution = {
            conflictType: 'contradictory',
            involvedReviewers: [
              ...commentA.sources.map(s => s.reviewer),
              ...commentB.sources.map(s => s.reviewer)
            ],
            description: `Contradictory feedback on ${commentA.section}`,
            resolution: this.resolveContradiction(commentA, commentB, options),
            reasoning: 'Prioritized by reviewer role and severity'
          };

          conflicts.push(conflict);
        }
      }
    }

    return conflicts;
  }

  /**
   * Check if action items contradict each other
   */
  private areActionsContradictory(actionsA: string[], actionsB: string[]): boolean {
    // Simple keyword-based contradiction detection
    const contradictoryPairs = [
      ['add', 'remove'],
      ['include', 'exclude'],
      ['use', "don't use"],
      ['enable', 'disable']
    ];

    for (const actionA of actionsA) {
      for (const actionB of actionsB) {
        for (const [wordA, wordB] of contradictoryPairs) {
          if (actionA.toLowerCase().includes(wordA) &&
              actionB.toLowerCase().includes(wordB)) {
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * Resolve contradiction between two comments
   */
  private resolveContradiction(
    commentA: ConsolidatedComment,
    commentB: ConsolidatedComment,
    options: SynthesisOptions
  ): string {
    // If prioritizing by role, use role hierarchy
    if (options.prioritizeByRole !== false) {
      const priorityA = Math.max(...commentA.sources.map(s =>
        this.rolePriorities.get(s.reviewer) || 0
      ));
      const priorityB = Math.max(...commentB.sources.map(s =>
        this.rolePriorities.get(s.reviewer) || 0
      ));

      if (priorityA > priorityB) {
        return `Follow ${commentA.sources[0].reviewer} recommendation: ${commentA.actionItems[0]}`;
      } else {
        return `Follow ${commentB.sources[0].reviewer} recommendation: ${commentB.actionItems[0]}`;
      }
    }

    // Otherwise, prioritize by severity
    const severityOrder = { critical: 0, major: 1, minor: 2, info: 3 };
    if (severityOrder[commentA.severity] < severityOrder[commentB.severity]) {
      return `Prioritize higher severity: ${commentA.actionItems[0]}`;
    } else {
      return `Prioritize higher severity: ${commentB.actionItems[0]}`;
    }
  }

  /**
   * Generate action plan from consolidated comments
   */
  private generateActionPlan(comments: ConsolidatedComment[]): string[] {
    const plan: string[] = [];

    // Group by severity
    const critical = comments.filter(c => c.severity === 'critical');
    const major = comments.filter(c => c.severity === 'major');
    const minor = comments.filter(c => c.severity === 'minor');

    // Critical items first
    if (critical.length > 0) {
      plan.push('CRITICAL ITEMS (must fix):');
      for (const comment of critical) {
        plan.push(`  - [${comment.section}] ${comment.actionItems[0]}`);
      }
    }

    // Major items
    if (major.length > 0) {
      plan.push('MAJOR ITEMS (should fix):');
      for (const comment of major) {
        plan.push(`  - [${comment.section}] ${comment.actionItems[0]}`);
      }
    }

    // Minor items
    if (minor.length > 0) {
      plan.push('MINOR ITEMS (optional):');
      for (const comment of minor) {
        plan.push(`  - [${comment.section}] ${comment.actionItems[0]}`);
      }
    }

    return plan;
  }

  /**
   * Calculate synthesis quality score
   */
  private calculateSynthesisQuality(
    reviews: ReviewResult[],
    consolidatedComments: ConsolidatedComment[],
    conflicts: ConflictResolution[]
  ): number {
    let score = 1.0;

    // Penalize for rejections
    const rejectedCount = reviews.filter(r => r.status === 'rejected').length;
    score -= rejectedCount * 0.2;

    // Penalize for conflicts
    score -= conflicts.length * 0.1;

    // Penalize for too many critical comments
    const criticalCount = consolidatedComments.filter(c => c.severity === 'critical').length;
    score -= criticalCount * 0.05;

    // Bonus for high consensus
    const approvedCount = reviews.filter(r =>
      r.status === 'approved' || r.status === 'approved-with-changes'
    ).length;
    const consensusRate = approvedCount / reviews.length;
    score += (consensusRate - 0.5) * 0.2; // Bonus if >50% approval

    return Math.max(0, Math.min(1, score)); // Clamp to [0, 1]
  }

  /**
   * Generate synthesis report (markdown format)
   */
  public generateReport(synthesis: SynthesisResult): string {
    const lines: string[] = [];

    lines.push('# Review Synthesis Report\n');
    lines.push(`**Generated**: ${new Date().toISOString()}\n`);
    lines.push(`**Quality Score**: ${(synthesis.synthesisQuality * 100).toFixed(1)}%\n`);

    // Overall Status
    lines.push('## Overall Status\n');
    lines.push(`- **Status**: ${synthesis.overallStatus.toUpperCase()}`);
    lines.push(`- **Reviews**: ${synthesis.reviewCount}`);
    lines.push(`- **Approved**: ${synthesis.approvedCount}`);
    lines.push(`- **Conditional**: ${synthesis.conditionalCount}`);
    lines.push(`- **Rejected**: ${synthesis.rejectedCount}\n`);

    // Action Plan
    if (synthesis.actionPlan.length > 0) {
      lines.push('## Action Plan\n');
      lines.push(synthesis.actionPlan.join('\n'));
      lines.push('');
    }

    // Consolidated Comments
    if (synthesis.consolidatedComments.length > 0) {
      lines.push('## Detailed Feedback\n');
      for (const comment of synthesis.consolidatedComments) {
        lines.push(`### [${comment.severity.toUpperCase()}] ${comment.section}\n`);
        lines.push(`**ID**: ${comment.id}`);
        lines.push(`**Comment**: ${comment.consolidatedText}`);
        lines.push(`**Sources**: ${comment.sources.map(s => s.reviewer).join(', ')}`);
        lines.push(`**Action Items**:`);
        for (const action of comment.actionItems) {
          lines.push(`  - ${action}`);
        }
        lines.push('');
      }
    }

    // Conflicts
    if (synthesis.conflicts.length > 0) {
      lines.push('## Conflicts Detected\n');
      for (const conflict of synthesis.conflicts) {
        lines.push(`### ${conflict.conflictType.toUpperCase()} Conflict\n`);
        lines.push(`**Reviewers**: ${conflict.involvedReviewers.join(', ')}`);
        lines.push(`**Description**: ${conflict.description}`);
        lines.push(`**Resolution**: ${conflict.resolution}`);
        lines.push(`**Reasoning**: ${conflict.reasoning}\n`);
      }
    }

    return lines.join('\n');
  }
}

export default ReviewSynthesizer;
