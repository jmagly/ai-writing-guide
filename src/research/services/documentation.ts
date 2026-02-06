/**
 * Documentation service for generating structured paper summaries
 *
 * @module research/services/documentation
 */

import { ResearchPaper } from '../types.js';
import { PaperSummary, Claim, GRADEAssessment, GRADELevel, AcquiredSource } from './types.js';

/**
 * Configuration for documentation service
 */
export interface DocumentationConfig {
  /** Template directory for notes */
  templateDir?: string;
  /** Output directory for generated notes */
  outputDir?: string;
}

/**
 * Documentation service for generating summaries and notes
 */
export class DocumentationService {
  constructor(_config: DocumentationConfig = {}) {
    // Config values will be used when stub methods are fully implemented
  }

  /**
   * Generate structured summary from paper
   * Note: Full implementation would use LLM or PDF parsing
   */
  async summarize(_paperPath: string): Promise<PaperSummary> {
    // Stub implementation - full version would parse PDF
    return {
      refId: 'REF-XXX',
      oneSentence: 'Paper summary to be generated from PDF content',
      contributions: [
        'Contribution 1 (extracted from paper)',
        'Contribution 2 (extracted from paper)',
        'Contribution 3 (extracted from paper)',
      ],
      methodology: 'Methodology description extracted from paper',
      findings: [
        'Finding 1 with metrics',
        'Finding 2 with metrics',
        'Finding 3 with metrics',
      ],
      limitations: [
        'Limitation 1 acknowledged by authors',
        'Limitation 2 identified',
      ],
      aiwgRelevance: {
        applicability: 'direct',
        componentsAffected: ['agents', 'workflows'],
        implementationPriority: 'round-2',
      },
    };
  }

  /**
   * Extract claims from paper
   * Note: Full implementation would use NLP/LLM
   */
  async extractClaims(_paperPath: string): Promise<Claim[]> {
    // Stub implementation - full version would use NLP
    return [
      {
        id: 'claim-001',
        statement: 'Example claim extracted from paper',
        type: 'empirical',
        evidence: [
          {
            sourceRefId: 'REF-XXX',
            pageNumbers: '5-6',
            quote: 'Direct quote supporting claim',
            context: 'Context around the claim',
          },
        ],
        confidence: 'high',
        tags: ['tag1', 'tag2'],
      },
    ];
  }

  /**
   * Generate Zettelkasten literature note
   */
  async generateNote(
    paper: ResearchPaper,
    summary: PaperSummary
  ): Promise<string> {
    const authors = paper.authors.map((a) => a.name).join(', ');

    const note = `# ${summary.refId}: ${paper.title}

**Authors:** ${authors}
**Year:** ${paper.year}
**Source:** ${paper.venue || 'Unknown'}
**DOI:** ${paper.doi || 'N/A'}
**arXiv:** ${paper.arxivId || 'N/A'}

## Summary

${summary.oneSentence}

## Key Contributions

${summary.contributions.map((c) => `- ${c}`).join('\n')}

## Methodology

${summary.methodology}

## Main Findings

${summary.findings.map((f) => `- ${f}`).join('\n')}

## Limitations

${summary.limitations.map((l) => `- ${l}`).join('\n')}

## AIWG Relevance

**Applicability:** ${summary.aiwgRelevance.applicability}

**Components Affected:**
${summary.aiwgRelevance.componentsAffected.map((c) => `- ${c}`).join('\n')}

**Implementation Priority:** ${summary.aiwgRelevance.implementationPriority}

## References

- Source: ${paper.source}
- Retrieved: ${paper.retrievedAt}
${paper.pdfUrl ? `- PDF: ${paper.pdfUrl}` : ''}

## Citations

To cite this paper:

\`\`\`
${this.generateCitation(paper)}
\`\`\`

## Notes

[Add personal notes and connections here]

## Tags

#research #${summary.refId.toLowerCase()} ${summary.aiwgRelevance.componentsAffected.map((c) => `#${c}`).join(' ')}
`;

    return note;
  }

  /**
   * Assess GRADE quality level
   */
  async assessGRADE(source: AcquiredSource): Promise<GRADEAssessment> {
    const paper = source.paper;

    // Determine starting quality based on study type
    const startingQuality = this.determineStartingQuality(paper);

    const ratingUp: Array<{ factor: string; description: string }> = [];
    const ratingDown: Array<{ factor: string; description: string }> = [];

    // Factors that could increase quality
    if (paper.citationCount && paper.citationCount > 100) {
      ratingUp.push({
        factor: 'Large citation count',
        description: `Highly cited (${paper.citationCount} citations) indicates impact`,
      });
    }

    // Factors that could decrease quality
    if (paper.type === 'preprint') {
      ratingDown.push({
        factor: 'Non-peer-reviewed',
        description: 'Preprint not yet peer reviewed',
      });
    }

    if (!paper.abstract) {
      ratingDown.push({
        factor: 'Missing abstract',
        description: 'Incomplete metadata reduces confidence',
      });
    }

    // Calculate final level
    let level = startingQuality;

    // Adjust based on factors (simplified)
    if (ratingDown.length > ratingUp.length) {
      level = this.downgradeLevel(level);
    } else if (ratingUp.length > 0 && ratingDown.length === 0) {
      level = this.upgradeLevel(level);
    }

    const justification = this.buildJustification(
      startingQuality,
      level,
      ratingUp,
      ratingDown
    );

    return {
      level,
      startingQuality,
      ratingUp,
      ratingDown,
      justification,
    };
  }

  /**
   * Determine starting GRADE quality based on publication type
   */
  private determineStartingQuality(paper: ResearchPaper): GRADELevel {
    if (paper.type === 'journal') {
      return 'HIGH';
    }
    if (paper.type === 'conference') {
      return 'HIGH';
    }
    if (paper.type === 'preprint') {
      return 'MODERATE';
    }
    if (paper.type === 'thesis') {
      return 'MODERATE';
    }
    return 'LOW';
  }

  /**
   * Downgrade GRADE level
   */
  private downgradeLevel(level: GRADELevel): GRADELevel {
    const levels: GRADELevel[] = ['HIGH', 'MODERATE', 'LOW', 'VERY_LOW'];
    const index = levels.indexOf(level);
    if (index < levels.length - 1) {
      return levels[index + 1];
    }
    return level;
  }

  /**
   * Upgrade GRADE level
   */
  private upgradeLevel(level: GRADELevel): GRADELevel {
    const levels: GRADELevel[] = ['HIGH', 'MODERATE', 'LOW', 'VERY_LOW'];
    const index = levels.indexOf(level);
    if (index > 0) {
      return levels[index - 1];
    }
    return level;
  }

  /**
   * Build GRADE justification text
   */
  private buildJustification(
    startingQuality: GRADELevel,
    finalLevel: GRADELevel,
    ratingUp: Array<{ factor: string; description: string }>,
    ratingDown: Array<{ factor: string; description: string }>
  ): string {
    let text = `Starting quality: ${startingQuality} (based on publication type). `;

    if (ratingUp.length > 0) {
      text += `Quality increased due to: ${ratingUp.map((r) => r.factor).join(', ')}. `;
    }

    if (ratingDown.length > 0) {
      text += `Quality decreased due to: ${ratingDown.map((r) => r.factor).join(', ')}. `;
    }

    text += `Final assessment: ${finalLevel}.`;

    return text;
  }

  /**
   * Generate citation in APA format
   */
  private generateCitation(paper: ResearchPaper): string {
    const authors = this.formatAuthorsAPA(paper.authors.map((a) => a.name));
    const year = paper.year || 'n.d.';
    const title = paper.title;
    const venue = paper.venue || '';
    const doi = paper.doi ? `https://doi.org/${paper.doi}` : '';

    let citation = `${authors} (${year}). ${title}.`;
    if (venue) {
      citation += ` ${venue}.`;
    }
    if (doi) {
      citation += ` ${doi}`;
    }

    return citation;
  }

  /**
   * Format authors in APA style
   */
  private formatAuthorsAPA(authors: string[]): string {
    if (authors.length === 0) return 'Unknown';
    if (authors.length === 1) return authors[0];
    if (authors.length === 2) return `${authors[0]} & ${authors[1]}`;

    // More than 2 authors
    const lastAuthor = authors[authors.length - 1];
    const otherAuthors = authors.slice(0, -1).join(', ');
    return `${otherAuthors}, & ${lastAuthor}`;
  }
}
