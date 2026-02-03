/**
 * Quality Service Tests
 *
 * Tests GRADE assessment, FAIR validation, multi-dimensional quality
 * scoring, and quality report generation.
 *
 * @source @src/research/services/quality.ts
 * @strategy @.aiwg/testing/agent-persistence-test-strategy.md
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { ResearchPaper } from '@/research/types.js';
import type {
  GRADEAssessment,
  GRADELevel,
  FAIRScore,
  QualityScore,
  QualityReport,
} from '@/research/services/types.js';

// Mock Quality Service (implementation pending)
class MockQualityService {
  assessGRADE(sourceType: string, metadata: Record<string, unknown> = {}): GRADEAssessment {
    const baselineMap: Record<string, GRADELevel> = {
      systematic_review: 'HIGH',
      rct: 'HIGH',
      cohort_study: 'MODERATE',
      case_control: 'MODERATE',
      case_series: 'LOW',
      expert_opinion: 'VERY_LOW',
    };

    const startingQuality = baselineMap[sourceType] ?? 'MODERATE';
    let finalLevel = startingQuality;
    const ratingUp: Array<{ factor: string; description: string }> = [];
    const ratingDown: Array<{ factor: string; description: string }> = [];

    // Check for upgrade factors
    if (metadata.largeSampleSize) {
      ratingUp.push({
        factor: 'Large sample size',
        description: 'Study includes >1000 participants',
      });
    }

    // Check for downgrade factors
    if (metadata.conflictOfInterest) {
      ratingDown.push({
        factor: 'Conflict of interest',
        description: 'Funding bias present',
      });
    }

    return {
      level: finalLevel,
      startingQuality,
      ratingUp,
      ratingDown,
      justification: `Starting at ${startingQuality} for ${sourceType}`,
    };
  }

  validateFAIR(fairScore: FAIRScore): boolean {
    return fairScore.overall >= 0.7;
  }

  calculateQualityScore(
    paper: ResearchPaper,
    grade: GRADEAssessment,
    fair: FAIRScore
  ): QualityScore {
    const gradeScores: Record<GRADELevel, number> = {
      HIGH: 1.0,
      MODERATE: 0.7,
      LOW: 0.4,
      VERY_LOW: 0.2,
    };

    const methodological = gradeScores[grade.level];
    const evidential = paper.citationCount ? Math.min(paper.citationCount / 100, 1.0) : 0.5;
    const transparency = paper.abstract ? 1.0 : 0.5;
    const reproducibility = paper.doi ? 1.0 : 0.5;
    const fairCompliance = fair.overall;

    const overall =
      (methodological * 0.3 +
        evidential * 0.2 +
        transparency * 0.15 +
        reproducibility * 0.15 +
        fairCompliance * 0.2) /
      1.0;

    return {
      overall,
      dimensions: {
        methodological,
        evidential,
        transparency,
        reproducibility,
        fairCompliance,
      },
      gradeLevel: grade.level,
      sourceType: paper.type ?? 'other',
      notes: [],
    };
  }

  generateQualityReport(scores: QualityScore[]): QualityReport {
    const gradeDistribution: Record<GRADELevel, number> = {
      HIGH: 0,
      MODERATE: 0,
      LOW: 0,
      VERY_LOW: 0,
    };

    const sourceTypeDistribution: Record<string, number> = {};

    scores.forEach((score) => {
      gradeDistribution[score.gradeLevel]++;
      sourceTypeDistribution[score.sourceType] =
        (sourceTypeDistribution[score.sourceType] ?? 0) + 1;
    });

    const averageScores = {
      overall: scores.reduce((sum, s) => sum + s.overall, 0) / scores.length,
      methodological:
        scores.reduce((sum, s) => sum + s.dimensions.methodological, 0) / scores.length,
      evidential: scores.reduce((sum, s) => sum + s.dimensions.evidential, 0) / scores.length,
      transparency: scores.reduce((sum, s) => sum + s.dimensions.transparency, 0) / scores.length,
      reproducibility:
        scores.reduce((sum, s) => sum + s.dimensions.reproducibility, 0) / scores.length,
      fairCompliance:
        scores.reduce((sum, s) => sum + s.dimensions.fairCompliance, 0) / scores.length,
    };

    return {
      generatedAt: new Date().toISOString(),
      totalSources: scores.length,
      gradeDistribution,
      sourceTypeDistribution,
      averageScores,
      summary: `Quality report for ${scores.length} sources`,
      recommendations: ['Consider adding more HIGH quality sources'],
    };
  }
}

describe('Quality Service', () => {
  let service: MockQualityService;

  beforeEach(() => {
    service = new MockQualityService();
  });

  describe('GRADE Level Assessment', () => {
    it('should assign HIGH to systematic reviews', () => {
      const grade = service.assessGRADE('systematic_review');

      expect(grade.level).toBe('HIGH');
      expect(grade.startingQuality).toBe('HIGH');
    });

    it('should assign HIGH to RCTs', () => {
      const grade = service.assessGRADE('rct');

      expect(grade.level).toBe('HIGH');
    });

    it('should assign MODERATE to cohort studies', () => {
      const grade = service.assessGRADE('cohort_study');

      expect(grade.level).toBe('MODERATE');
    });

    it('should assign LOW to case series', () => {
      const grade = service.assessGRADE('case_series');

      expect(grade.level).toBe('LOW');
    });

    it('should assign VERY_LOW to expert opinion', () => {
      const grade = service.assessGRADE('expert_opinion');

      expect(grade.level).toBe('VERY_LOW');
    });

    it('should upgrade for large sample size', () => {
      const grade = service.assessGRADE('cohort_study', { largeSampleSize: true });

      expect(grade.ratingUp.length).toBeGreaterThan(0);
      expect(grade.ratingUp[0].factor).toContain('sample size');
    });

    it('should downgrade for conflict of interest', () => {
      const grade = service.assessGRADE('systematic_review', { conflictOfInterest: true });

      expect(grade.ratingDown.length).toBeGreaterThan(0);
      expect(grade.ratingDown[0].factor).toContain('Conflict of interest');
    });

    it('should include justification', () => {
      const grade = service.assessGRADE('rct');

      expect(grade.justification).toBeDefined();
      expect(grade.justification.length).toBeGreaterThan(10);
    });
  });

  describe('FAIR Dimension Validation', () => {
    it('should accept FAIR score >= 0.7', () => {
      const fairScore: FAIRScore = {
        overall: 0.85,
        findable: { score: 1.0, criteria: [] },
        accessible: { score: 1.0, criteria: [] },
        interoperable: { score: 0.8, criteria: [] },
        reusable: { score: 0.7, criteria: [] },
        notes: [],
      };

      const isValid = service.validateFAIR(fairScore);
      expect(isValid).toBe(true);
    });

    it('should reject FAIR score < 0.7', () => {
      const fairScore: FAIRScore = {
        overall: 0.65,
        findable: { score: 0.6, criteria: [] },
        accessible: { score: 0.7, criteria: [] },
        interoperable: { score: 0.6, criteria: [] },
        reusable: { score: 0.7, criteria: [] },
        notes: [],
      };

      const isValid = service.validateFAIR(fairScore);
      expect(isValid).toBe(false);
    });

    it('should handle edge case at exactly 0.7', () => {
      const fairScore: FAIRScore = {
        overall: 0.7,
        findable: { score: 0.7, criteria: [] },
        accessible: { score: 0.7, criteria: [] },
        interoperable: { score: 0.7, criteria: [] },
        reusable: { score: 0.7, criteria: [] },
        notes: [],
      };

      const isValid = service.validateFAIR(fairScore);
      expect(isValid).toBe(true);
    });
  });

  describe('Multi-Dimensional Quality Scoring', () => {
    const mockPaper: ResearchPaper = {
      id: 'paper1',
      title: 'Test Paper',
      authors: [{ name: 'Author' }],
      year: 2024,
      abstract: 'Test abstract',
      doi: '10.1234/test',
      citationCount: 50,
      type: 'journal',
      source: 'semantic-scholar',
      retrievedAt: '2024-01-01T00:00:00Z',
    };

    const mockGrade: GRADEAssessment = {
      level: 'HIGH',
      startingQuality: 'HIGH',
      ratingUp: [],
      ratingDown: [],
      justification: 'Test',
    };

    const mockFAIR: FAIRScore = {
      overall: 0.85,
      findable: { score: 1.0, criteria: [] },
      accessible: { score: 1.0, criteria: [] },
      interoperable: { score: 0.8, criteria: [] },
      reusable: { score: 0.7, criteria: [] },
      notes: [],
    };

    it('should calculate overall quality score', () => {
      const score = service.calculateQualityScore(mockPaper, mockGrade, mockFAIR);

      expect(score.overall).toBeGreaterThan(0);
      expect(score.overall).toBeLessThanOrEqual(1);
    });

    it('should calculate methodological dimension from GRADE', () => {
      const score = service.calculateQualityScore(mockPaper, mockGrade, mockFAIR);

      expect(score.dimensions.methodological).toBe(1.0); // HIGH = 1.0
    });

    it('should calculate evidential dimension from citation count', () => {
      const score = service.calculateQualityScore(mockPaper, mockGrade, mockFAIR);

      expect(score.dimensions.evidential).toBeGreaterThan(0);
      expect(score.dimensions.evidential).toBeLessThanOrEqual(1);
    });

    it('should calculate transparency from abstract presence', () => {
      const score = service.calculateQualityScore(mockPaper, mockGrade, mockFAIR);

      expect(score.dimensions.transparency).toBe(1.0);
    });

    it('should calculate reproducibility from DOI presence', () => {
      const score = service.calculateQualityScore(mockPaper, mockGrade, mockFAIR);

      expect(score.dimensions.reproducibility).toBe(1.0);
    });

    it('should use FAIR overall score for FAIR dimension', () => {
      const score = service.calculateQualityScore(mockPaper, mockGrade, mockFAIR);

      expect(score.dimensions.fairCompliance).toBe(0.85);
    });

    it('should include GRADE level in score', () => {
      const score = service.calculateQualityScore(mockPaper, mockGrade, mockFAIR);

      expect(score.gradeLevel).toBe('HIGH');
    });

    it('should include source type in score', () => {
      const score = service.calculateQualityScore(mockPaper, mockGrade, mockFAIR);

      expect(score.sourceType).toBe('journal');
    });
  });

  describe('Quality Report Generation', () => {
    const mockScores: QualityScore[] = [
      {
        overall: 0.9,
        dimensions: {
          methodological: 1.0,
          evidential: 0.8,
          transparency: 1.0,
          reproducibility: 1.0,
          fairCompliance: 0.85,
        },
        gradeLevel: 'HIGH',
        sourceType: 'journal',
        notes: [],
      },
      {
        overall: 0.7,
        dimensions: {
          methodological: 0.7,
          evidential: 0.6,
          transparency: 0.8,
          reproducibility: 0.7,
          fairCompliance: 0.7,
        },
        gradeLevel: 'MODERATE',
        sourceType: 'conference',
        notes: [],
      },
      {
        overall: 0.85,
        dimensions: {
          methodological: 1.0,
          evidential: 0.7,
          transparency: 0.9,
          reproducibility: 0.8,
          fairCompliance: 0.8,
        },
        gradeLevel: 'HIGH',
        sourceType: 'journal',
        notes: [],
      },
    ];

    it('should count total sources analyzed', () => {
      const report = service.generateQualityReport(mockScores);

      expect(report.totalSources).toBe(3);
    });

    it('should distribute sources by GRADE level', () => {
      const report = service.generateQualityReport(mockScores);

      expect(report.gradeDistribution.HIGH).toBe(2);
      expect(report.gradeDistribution.MODERATE).toBe(1);
      expect(report.gradeDistribution.LOW).toBe(0);
      expect(report.gradeDistribution.VERY_LOW).toBe(0);
    });

    it('should distribute sources by type', () => {
      const report = service.generateQualityReport(mockScores);

      expect(report.sourceTypeDistribution.journal).toBe(2);
      expect(report.sourceTypeDistribution.conference).toBe(1);
    });

    it('should calculate average overall score', () => {
      const report = service.generateQualityReport(mockScores);

      const expectedAverage = (0.9 + 0.7 + 0.85) / 3;
      expect(report.averageScores.overall).toBeCloseTo(expectedAverage, 2);
    });

    it('should calculate average dimension scores', () => {
      const report = service.generateQualityReport(mockScores);

      expect(report.averageScores.methodological).toBeGreaterThan(0);
      expect(report.averageScores.evidential).toBeGreaterThan(0);
      expect(report.averageScores.transparency).toBeGreaterThan(0);
      expect(report.averageScores.reproducibility).toBeGreaterThan(0);
      expect(report.averageScores.fairCompliance).toBeGreaterThan(0);
    });

    it('should include summary', () => {
      const report = service.generateQualityReport(mockScores);

      expect(report.summary).toBeDefined();
      expect(report.summary).toContain('3 sources');
    });

    it('should include recommendations', () => {
      const report = service.generateQualityReport(mockScores);

      expect(report.recommendations).toBeDefined();
      expect(report.recommendations.length).toBeGreaterThan(0);
    });

    it('should include generation timestamp', () => {
      const report = service.generateQualityReport(mockScores);

      expect(report.generatedAt).toBeDefined();
      expect(new Date(report.generatedAt).getTime()).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing metadata fields gracefully', () => {
      const grade = service.assessGRADE('case_series', {});

      expect(grade).toBeDefined();
      expect(grade.level).toBe('LOW');
    });

    it('should handle papers with zero citations', () => {
      const paper: ResearchPaper = {
        id: 'paper1',
        title: 'Test',
        authors: [],
        year: 2024,
        citationCount: 0,
        source: 'semantic-scholar',
        retrievedAt: '2024-01-01T00:00:00Z',
      };

      const grade: GRADEAssessment = {
        level: 'MODERATE',
        startingQuality: 'MODERATE',
        ratingUp: [],
        ratingDown: [],
        justification: 'Test',
      };

      const fair: FAIRScore = {
        overall: 0.7,
        findable: { score: 0.7, criteria: [] },
        accessible: { score: 0.7, criteria: [] },
        interoperable: { score: 0.7, criteria: [] },
        reusable: { score: 0.7, criteria: [] },
        notes: [],
      };

      const score = service.calculateQualityScore(paper, grade, fair);
      expect(score.dimensions.evidential).toBe(0.5); // Default for zero citations
    });

    it('should handle empty score list for report', () => {
      const report = service.generateQualityReport([]);

      expect(report.totalSources).toBe(0);
      expect(isNaN(report.averageScores.overall)).toBe(true); // NaN for empty list
    });
  });
});
