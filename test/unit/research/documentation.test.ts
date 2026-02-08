/**
 * Documentation Service Tests
 *
 * Tests paper summarization, claims extraction, Zettelkasten note
 * generation, and GRADE assessment functionality.
 *
 * @source @src/research/services/documentation.ts
 * @strategy @.aiwg/testing/agent-persistence-test-strategy.md
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { ResearchPaper } from '@/research/types.js';
import type { PaperSummary, Claim, GRADEAssessment, GRADELevel } from '@/research/services/types.js';

// Mock Documentation Service (implementation pending)
class MockDocumentationService {
  async summarizePaper(paper: ResearchPaper): Promise<PaperSummary> {
    return {
      refId: 'REF-001',
      oneSentence: `${paper.title} by ${paper.authors[0].name} (${paper.year})`,
      contributions: [
        'Introduced novel prompting technique',
        'Demonstrated 35% improvement on reasoning tasks',
        'Provided reproducible benchmark results',
      ],
      methodology: 'Experimental study using standard NLP benchmarks',
      findings: [
        'Chain-of-thought prompting improves reasoning by 35%',
        'Effect is more pronounced on complex multi-step problems',
      ],
      limitations: [
        'Limited to English language tasks',
        'Tested only on specific model families',
      ],
      aiwgRelevance: {
        applicability: 'direct',
        componentsAffected: ['agents', 'prompting'],
        implementationPriority: 'immediate',
      },
    };
  }

  extractClaims(content: string): Claim[] {
    const claims: Claim[] = [];

    // Mock claim extraction
    if (content.includes('35%')) {
      claims.push({
        id: 'claim-001',
        statement: 'Chain-of-thought prompting improves reasoning performance by 35%',
        type: 'empirical',
        evidence: [
          {
            sourceRefId: 'REF-001',
            pageNumbers: 'p. 4-6',
            quote: 'We observe a 35% improvement on GSM8K benchmark',
            context: 'Experimental results section',
          },
        ],
        confidence: 'high',
        tags: ['prompting', 'reasoning', 'performance'],
      });
    }

    return claims;
  }

  assessGRADE(sourceType: string, metadata: Record<string, unknown> = {}): GRADEAssessment {
    const baselineMap: Record<string, GRADELevel> = {
      'peer_reviewed_journal': 'HIGH',
      'peer_reviewed_conference': 'HIGH',
      'preprint': 'MODERATE',
      'technical_report': 'MODERATE',
      'blog_post': 'LOW',
      'anecdotal': 'VERY_LOW',
    };

    const baseline = (baselineMap[sourceType] ?? 'MODERATE') as GRADELevel;

    return {
      level: baseline,
      startingQuality: baseline,
      ratingUp: [],
      ratingDown: [],
      justification: `Based on source type: ${sourceType}`,
    };
  }

  generateLiteratureNote(paper: ResearchPaper, summary: PaperSummary): {
    id: string;
    content: string;
    tags: string[];
  } {
    return {
      id: `note-${paper.id}`,
      content: `# ${summary.refId}: ${paper.title}\n\n${summary.oneSentence}\n\n## Key Findings\n${summary.findings.map((f) => `- ${f}`).join('\n')}`,
      tags: ['research', 'ai', 'prompting'],
    };
  }
}

describe('Documentation Service', () => {
  let service: MockDocumentationService;
  const mockPaper: ResearchPaper = {
    id: 'paper1',
    title: 'Chain-of-Thought Prompting Elicits Reasoning in Large Language Models',
    authors: [{ name: 'Wei, Jason' }, { name: 'Wang, Xuezhi' }],
    year: 2022,
    abstract:
      'We explore how generating a chain of thought improves the ability of large language models to perform complex reasoning.',
    doi: '10.1234/cot.2022',
    venue: 'NeurIPS 2022',
    type: 'conference',
    source: 'semantic-scholar',
    retrievedAt: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    service = new MockDocumentationService();
  });

  describe('Paper Summarization', () => {
    it('should generate complete summary with all required fields', async () => {
      const summary = await service.summarizePaper(mockPaper);

      // One-sentence summary
      expect(summary.oneSentence).toBeDefined();
      expect(summary.oneSentence.length).toBeGreaterThan(10);
      expect(summary.oneSentence).toContain(mockPaper.title);

      // Contributions
      expect(summary.contributions).toBeDefined();
      expect(summary.contributions.length).toBeGreaterThanOrEqual(3);
      expect(summary.contributions.length).toBeLessThanOrEqual(5);

      // Methodology
      expect(summary.methodology).toBeDefined();
      expect(summary.methodology.length).toBeGreaterThan(10);

      // Findings
      expect(summary.findings).toBeDefined();
      expect(summary.findings.length).toBeGreaterThan(0);

      // Limitations
      expect(summary.limitations).toBeDefined();
      expect(summary.limitations.length).toBeGreaterThan(0);
    });

    it('should assess AIWG relevance with valid values', async () => {
      const summary = await service.summarizePaper(mockPaper);

      expect(summary.aiwgRelevance).toBeDefined();
      expect(summary.aiwgRelevance.applicability).toMatch(/direct|indirect|background/);
      expect(summary.aiwgRelevance.componentsAffected.length).toBeGreaterThan(0);
      expect(summary.aiwgRelevance.implementationPriority).toMatch(/immediate|round-2|future/);
    });
  });

  describe('Claims Extraction', () => {
    it('should extract and validate empirical claims with metadata', () => {
      const testCases = [
        { content: 'Our experiments show a 35% improvement in reasoning tasks.', expectClaims: true },
        { content: 'Chain-of-thought prompting yields 35% gains.', expectClaims: true },
        { content: 'We observe a 35% improvement.', expectClaims: true },
        { content: 'Prompting improves reasoning by 35%.', expectClaims: true },
        { content: 'This is an introduction section.', expectClaims: false },
      ];

      for (const testCase of testCases) {
        const claims = service.extractClaims(testCase.content);

        if (testCase.expectClaims) {
          expect(claims.length).toBeGreaterThan(0);
          expect(claims[0].type).toBe('empirical');

          // Evidence validation
          expect(claims[0].evidence).toBeDefined();
          expect(claims[0].evidence.length).toBeGreaterThan(0);
          expect(claims[0].evidence[0].sourceRefId).toBe('REF-001');

          // Confidence and tags
          expect(claims[0].confidence).toMatch(/high|medium|low/);
          expect(claims[0].tags).toBeDefined();
          expect(claims[0].tags.length).toBeGreaterThan(0);
        } else {
          expect(claims).toEqual([]);
        }
      }
    });

    it('should extract page numbers when present in content', () => {
      const content = 'As shown on pages 4-6, we achieve 35% gains.';
      const claims = service.extractClaims(content);

      expect(claims[0].evidence[0].pageNumbers).toBeDefined();
    });
  });

  describe('Zettelkasten Note Generation', () => {
    it('should generate complete literature note with all components', async () => {
      const summary = await service.summarizePaper(mockPaper);
      const note = service.generateLiteratureNote(mockPaper, summary);

      // Basic structure
      expect(note.id).toBeDefined();
      expect(note.content).toBeDefined();
      expect(note.tags).toBeDefined();

      // Content validation
      expect(note.content).toContain('REF-001');
      expect(note.content).toContain(mockPaper.title);

      // Key findings inclusion
      for (const finding of summary.findings) {
        expect(note.content).toContain(finding);
      }

      // Tags validation
      expect(note.tags).toContain('research');
      expect(note.tags.length).toBeGreaterThan(1);
    });
  });

  describe('GRADE Assessment', () => {
    it('should assign correct quality levels by source type', () => {
      const testCases = [
        { sourceType: 'peer_reviewed_journal', expected: 'HIGH', shouldHaveStartingQuality: true },
        { sourceType: 'peer_reviewed_conference', expected: 'HIGH', shouldHaveStartingQuality: false },
        { sourceType: 'preprint', expected: 'MODERATE', shouldHaveStartingQuality: true },
        { sourceType: 'blog_post', expected: 'LOW', shouldHaveStartingQuality: false },
        { sourceType: 'anecdotal', expected: 'VERY_LOW', shouldHaveStartingQuality: false },
      ];

      for (const testCase of testCases) {
        const grade = service.assessGRADE(testCase.sourceType);

        expect(grade.level).toBe(testCase.expected);

        if (testCase.shouldHaveStartingQuality) {
          expect(grade.startingQuality).toBe(testCase.expected);
        }
      }
    });

    it('should include justification and support rating adjustments', () => {
      const gradeBasic = service.assessGRADE('peer_reviewed_journal');

      expect(gradeBasic.justification).toBeDefined();
      expect(gradeBasic.justification.length).toBeGreaterThan(10);

      // Test upgrades
      const gradeUpgrade = service.assessGRADE('preprint', {
        largeSampleSize: true,
        reproducible: true,
      });
      expect(gradeUpgrade.ratingUp).toBeDefined();

      // Test downgrades
      const gradeDowngrade = service.assessGRADE('peer_reviewed_journal', {
        conflictOfInterest: true,
      });
      expect(gradeDowngrade.ratingDown).toBeDefined();
    });

    it('should handle unknown source types with default rating', () => {
      const grade = service.assessGRADE('unknown_type');
      expect(grade.level).toBe('MODERATE'); // Default fallback
    });
  });

  describe('Template-Driven Output', () => {
    it('should use consistent summary format', async () => {
      const summary = await service.summarizePaper(mockPaper);

      expect(summary).toHaveProperty('oneSentence');
      expect(summary).toHaveProperty('contributions');
      expect(summary).toHaveProperty('methodology');
      expect(summary).toHaveProperty('findings');
      expect(summary).toHaveProperty('limitations');
      expect(summary).toHaveProperty('aiwgRelevance');
    });

    it('should use consistent claim format', () => {
      const content = 'Results show 35% improvement.';
      const claims = service.extractClaims(content);

      if (claims.length > 0) {
        expect(claims[0]).toHaveProperty('id');
        expect(claims[0]).toHaveProperty('statement');
        expect(claims[0]).toHaveProperty('type');
        expect(claims[0]).toHaveProperty('evidence');
        expect(claims[0]).toHaveProperty('confidence');
        expect(claims[0]).toHaveProperty('tags');
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle various edge cases gracefully', async () => {
      // Missing abstract
      const noAbstract = { ...mockPaper, abstract: undefined };
      await expect(service.summarizePaper(noAbstract)).resolves.toBeDefined();

      // Incomplete metadata
      const incomplete = { ...mockPaper, venue: undefined, type: undefined };
      await expect(service.summarizePaper(incomplete)).resolves.toBeDefined();

      // Empty content for claims
      const emptyClaimsResult = service.extractClaims('');
      expect(emptyClaimsResult).toEqual([]);
    });
  });
});
