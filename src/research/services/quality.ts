/**
 * Quality service for assessing research source quality
 *
 * @module research/services/quality
 */

import { AcquiredSource, GRADELevel, FAIRScore, QualityScore, QualityReport } from './types.js';

/**
 * Configuration for quality service
 */
export interface QualityConfig {
  /** Minimum FAIR score threshold */
  minFAIRScore?: number;
  /** Minimum quality score threshold */
  minQualityScore?: number;
}

/**
 * Quality service for assessing and reporting on source quality
 */
export class QualityService {
  constructor(_config: QualityConfig = {}) {
    // Config values will be used when threshold checking is implemented
  }

  /**
   * Assess GRADE evidence quality level
   */
  assessGRADE(source: AcquiredSource): GRADELevel {
    const paper = source.paper;

    // Start with baseline based on publication type
    let level: GRADELevel = this.getBaselineGRADE(paper.type);

    // Adjust based on other factors
    if (paper.type === 'preprint' && !paper.doi) {
      level = this.downgrade(level); // Not peer-reviewed and no DOI
    }

    if (paper.citationCount && paper.citationCount > 100) {
      level = this.upgrade(level); // High citation count indicates quality
    }

    if (!paper.abstract) {
      level = this.downgrade(level); // Missing metadata
    }

    return level;
  }

  /**
   * Validate FAIR compliance
   */
  validateFAIR(source: AcquiredSource): FAIRScore {
    const findable = this.assessFindable(source);
    const accessible = this.assessAccessible(source);
    const interoperable = this.assessInteroperable(source);
    const reusable = this.assessReusable(source);

    const overall =
      (findable.score +
        accessible.score +
        interoperable.score +
        reusable.score) / 4;

    const notes: string[] = [];

    if (overall >= 0.9) {
      notes.push('Excellent FAIR compliance');
    } else if (overall >= 0.7) {
      notes.push('Good FAIR compliance with room for improvement');
    } else if (overall >= 0.5) {
      notes.push('Moderate FAIR compliance - consider enhancements');
    } else {
      notes.push('Low FAIR compliance - significant improvements needed');
    }

    return {
      overall,
      findable,
      accessible,
      interoperable,
      reusable,
      notes,
    };
  }

  /**
   * Calculate multi-dimensional quality score
   */
  calculateQualityScore(source: AcquiredSource): QualityScore {
    const gradeLevel = this.assessGRADE(source);
    const fairScore = source.fairScore || this.validateFAIR(source);

    const dimensions = {
      methodological: this.assessMethodological(source),
      evidential: this.assessEvidential(source),
      transparency: this.assessTransparency(source),
      reproducibility: this.assessReproducibility(source),
      fairCompliance: fairScore.overall,
    };

    const overall =
      (dimensions.methodological +
        dimensions.evidential +
        dimensions.transparency +
        dimensions.reproducibility +
        dimensions.fairCompliance) / 5;

    const notes: string[] = [];

    if (overall >= 0.8) {
      notes.push('High-quality source suitable for critical decisions');
    } else if (overall >= 0.6) {
      notes.push('Moderate-quality source suitable for general reference');
    } else {
      notes.push('Lower-quality source - use with caution');
    }

    return {
      overall,
      dimensions,
      gradeLevel,
      sourceType: source.paper.type || 'other',
      notes,
    };
  }

  /**
   * Generate aggregate quality report
   */
  generateReport(sources: AcquiredSource[]): QualityReport {
    const gradeDistribution: Record<GRADELevel, number> = {
      HIGH: 0,
      MODERATE: 0,
      LOW: 0,
      VERY_LOW: 0,
    };

    const sourceTypeDistribution: Record<string, number> = {};

    let totalMethodological = 0;
    let totalEvidential = 0;
    let totalTransparency = 0;
    let totalReproducibility = 0;
    let totalFAIR = 0;
    let totalOverall = 0;

    for (const source of sources) {
      const grade = this.assessGRADE(source);
      gradeDistribution[grade]++;

      const type = source.paper.type || 'other';
      sourceTypeDistribution[type] = (sourceTypeDistribution[type] || 0) + 1;

      const quality = this.calculateQualityScore(source);
      totalMethodological += quality.dimensions.methodological;
      totalEvidential += quality.dimensions.evidential;
      totalTransparency += quality.dimensions.transparency;
      totalReproducibility += quality.dimensions.reproducibility;
      totalFAIR += quality.dimensions.fairCompliance;
      totalOverall += quality.overall;
    }

    const count = sources.length;

    const averageScores = {
      overall: totalOverall / count,
      methodological: totalMethodological / count,
      evidential: totalEvidential / count,
      transparency: totalTransparency / count,
      reproducibility: totalReproducibility / count,
      fairCompliance: totalFAIR / count,
    };

    const summary = this.buildSummary(
      count,
      averageScores.overall,
      gradeDistribution
    );

    const recommendations = this.buildRecommendations(
      averageScores,
      gradeDistribution
    );

    return {
      generatedAt: new Date().toISOString(),
      totalSources: count,
      gradeDistribution,
      sourceTypeDistribution,
      averageScores,
      summary,
      recommendations,
    };
  }

  /**
   * Get baseline GRADE level for publication type
   */
  private getBaselineGRADE(
    type?: string
  ): GRADELevel {
    if (type === 'journal') return 'HIGH';
    if (type === 'conference') return 'HIGH';
    if (type === 'preprint') return 'MODERATE';
    if (type === 'thesis') return 'MODERATE';
    return 'LOW';
  }

  /**
   * Upgrade GRADE level
   */
  private upgrade(level: GRADELevel): GRADELevel {
    const levels: GRADELevel[] = ['HIGH', 'MODERATE', 'LOW', 'VERY_LOW'];
    const index = levels.indexOf(level);
    return index > 0 ? levels[index - 1] : level;
  }

  /**
   * Downgrade GRADE level
   */
  private downgrade(level: GRADELevel): GRADELevel {
    const levels: GRADELevel[] = ['HIGH', 'MODERATE', 'LOW', 'VERY_LOW'];
    const index = levels.indexOf(level);
    return index < levels.length - 1 ? levels[index + 1] : level;
  }

  /**
   * Assess Findable dimension
   */
  private assessFindable(source: AcquiredSource) {
    const criteria = [
      {
        id: 'F1',
        description: 'Assigned globally unique identifier',
        met: !!source.refId,
      },
      {
        id: 'F2',
        description: 'Rich metadata',
        met: !!source.paper.abstract && source.paper.authors.length > 0,
      },
      {
        id: 'F3',
        description: 'Metadata includes identifier',
        met: !!(source.paper.doi || source.paper.arxivId),
      },
      {
        id: 'F4',
        description: 'Indexed in searchable resource',
        met: true,
      },
    ];

    const score = criteria.filter((c) => c.met).length / criteria.length;
    return { score, criteria };
  }

  /**
   * Assess Accessible dimension
   */
  private assessAccessible(source: AcquiredSource) {
    const criteria = [
      {
        id: 'A1',
        description: 'Retrievable by identifier',
        met: !!source.filePath,
      },
      {
        id: 'A2',
        description: 'Metadata accessible',
        met: true,
      },
    ];

    const score = criteria.filter((c) => c.met).length / criteria.length;
    return { score, criteria };
  }

  /**
   * Assess Interoperable dimension
   */
  private assessInteroperable(source: AcquiredSource) {
    const criteria = [
      {
        id: 'I1',
        description: 'Formal knowledge representation',
        met: true,
      },
      {
        id: 'I2',
        description: 'FAIR-compliant vocabularies',
        met: true,
      },
      {
        id: 'I3',
        description: 'Qualified references',
        met: !!(source.paper.doi || source.paper.arxivId),
      },
    ];

    const score = criteria.filter((c) => c.met).length / criteria.length;
    return { score, criteria };
  }

  /**
   * Assess Reusable dimension
   */
  private assessReusable(source: AcquiredSource) {
    const criteria = [
      {
        id: 'R1',
        description: 'Accurate metadata',
        met: !!source.paper.abstract,
      },
      {
        id: 'R2',
        description: 'Detailed provenance',
        met: !!source.acquiredAt,
      },
      {
        id: 'R3',
        description: 'Meets community standards',
        met: true,
      },
    ];

    const score = criteria.filter((c) => c.met).length / criteria.length;
    return { score, criteria };
  }

  /**
   * Assess methodological quality
   */
  private assessMethodological(source: AcquiredSource): number {
    let score = 0.5; // Base score

    if (source.paper.type === 'journal' || source.paper.type === 'conference') {
      score += 0.3; // Peer-reviewed
    }

    if (source.paper.abstract && source.paper.abstract.length > 100) {
      score += 0.1; // Substantial abstract
    }

    if (source.paper.venue) {
      score += 0.1; // Published in venue
    }

    return Math.min(score, 1.0);
  }

  /**
   * Assess evidential quality
   */
  private assessEvidential(source: AcquiredSource): number {
    let score = 0.5; // Base score

    if (source.paper.citationCount) {
      // Log scale for citation count
      const citationScore = Math.log10(source.paper.citationCount + 1) / 3;
      score += Math.min(citationScore, 0.3);
    }

    if (source.paper.year && source.paper.year >= new Date().getFullYear() - 5) {
      score += 0.2; // Recent publication
    }

    return Math.min(score, 1.0);
  }

  /**
   * Assess transparency
   */
  private assessTransparency(source: AcquiredSource): number {
    let score = 0.5; // Base score

    if (source.paper.doi) {
      score += 0.2; // Has DOI
    }

    if (source.paper.pdfUrl) {
      score += 0.2; // Accessible PDF
    }

    if (source.paper.authors.length > 0) {
      score += 0.1; // Author information
    }

    return Math.min(score, 1.0);
  }

  /**
   * Assess reproducibility
   */
  private assessReproducibility(source: AcquiredSource): number {
    let score = 0.5; // Base score

    if (source.checksum) {
      score += 0.2; // File integrity
    }

    if (source.paper.source) {
      score += 0.2; // Source tracked
    }

    if (source.acquiredAt) {
      score += 0.1; // Acquisition metadata
    }

    return Math.min(score, 1.0);
  }

  /**
   * Build summary text
   */
  private buildSummary(
    count: number,
    averageOverall: number,
    gradeDistribution: Record<GRADELevel, number>
  ): string {
    const highCount = gradeDistribution.HIGH;
    const percentage = ((averageOverall * 100) | 0);

    return `Analyzed ${count} sources with average quality score of ${percentage}%. ${highCount} sources rated as HIGH quality.`;
  }

  /**
   * Build recommendations
   */
  private buildRecommendations(
    averageScores: Record<string, number>,
    gradeDistribution: Record<GRADELevel, number>
  ): string[] {
    const recommendations: string[] = [];

    if (averageScores.methodological < 0.7) {
      recommendations.push(
        'Consider increasing proportion of peer-reviewed sources'
      );
    }

    if (averageScores.fairCompliance < 0.7) {
      recommendations.push(
        'Improve FAIR compliance by ensuring all sources have DOIs or persistent identifiers'
      );
    }

    if (averageScores.reproducibility < 0.7) {
      recommendations.push(
        'Enhance reproducibility by maintaining complete acquisition metadata'
      );
    }

    if (gradeDistribution.VERY_LOW > 0) {
      recommendations.push(
        'Review VERY_LOW quality sources and consider replacement with higher-quality alternatives'
      );
    }

    return recommendations;
  }
}
