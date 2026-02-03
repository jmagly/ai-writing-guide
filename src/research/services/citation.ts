/**
 * Citation service for formatting and validating citations
 *
 * @module research/services/citation
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { ResearchPaper } from '../types.js';
import { CitationStyle, CitationNetwork } from './types.js';

/**
 * Configuration for citation service
 */
export interface CitationConfig {
  /** Corpus directory for validation */
  corpusPath?: string;
  /** Claims index path */
  claimsIndexPath?: string;
}

/**
 * Citation service for managing citations and networks
 */
export class CitationService {
  private corpusPath: string;
  private claimsIndexPath: string;

  constructor(config: CitationConfig = {}) {
    this.corpusPath = config.corpusPath || '.aiwg/research/sources';
    this.claimsIndexPath = config.claimsIndexPath || '.aiwg/research/claims-index.json';
  }

  /**
   * Format citation in specified style
   */
  formatCitation(paper: ResearchPaper, style: CitationStyle = 'apa'): string {
    switch (style) {
      case 'apa':
        return this.formatAPA(paper);
      case 'bibtex':
        return this.formatBibTeX(paper);
      case 'chicago':
        return this.formatChicago(paper);
      case 'mla':
        return this.formatMLA(paper);
      case 'ieee':
        return this.formatIEEE(paper);
      default:
        return this.formatAPA(paper);
    }
  }

  /**
   * Validate that a citation exists in corpus
   */
  async validateCitation(refId: string, corpusPath?: string): Promise<boolean> {
    const path = corpusPath || this.corpusPath;

    try {
      const files = await fs.readdir(path);
      return files.some((file) => file.startsWith(refId));
    } catch (error) {
      return false;
    }
  }

  /**
   * Build citation network from papers
   */
  buildNetwork(papers: ResearchPaper[]): CitationNetwork {
    const nodes = papers.map((paper) => ({
      refId: paper.id,
      title: paper.title,
      year: paper.year,
      citationCount: paper.citationCount || 0,
    }));

    // For now, return empty edges (full implementation would extract references)
    const edges: Array<{
      source: string;
      target: string;
      type: 'direct' | 'co-citation';
    }> = [];

    // Calculate simple metrics
    const sortedByCitations = [...nodes].sort(
      (a, b) => b.citationCount - a.citationCount
    );
    const mostCitedPapers = sortedByCitations.slice(0, 5).map((n) => n.refId);

    return {
      nodes,
      edges,
      metrics: {
        mostCitedPapers,
        mostInfluentialPapers: mostCitedPapers, // Simplified
        clusterCenters: [], // Would require clustering algorithm
      },
    };
  }

  /**
   * Update claims index with new claim
   */
  async updateClaimsIndex(claim: string, sources: string[]): Promise<void> {
    let index: Record<string, string[]> = {};

    // Load existing index
    try {
      const data = await fs.readFile(this.claimsIndexPath, 'utf-8');
      index = JSON.parse(data);
    } catch (error) {
      // Index doesn't exist yet
    }

    // Update or create claim entry
    if (index[claim]) {
      // Merge sources, remove duplicates
      const merged = [...new Set([...index[claim], ...sources])];
      index[claim] = merged;
    } else {
      index[claim] = sources;
    }

    // Write back
    await fs.writeFile(
      this.claimsIndexPath,
      JSON.stringify(index, null, 2),
      'utf-8'
    );
  }

  /**
   * Format citation in APA style
   */
  private formatAPA(paper: ResearchPaper): string {
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
   * Format citation in BibTeX style
   */
  private formatBibTeX(paper: ResearchPaper): string {
    const id = this.generateBibTeXId(paper);
    const authors = paper.authors.map((a) => a.name).join(' and ');
    const year = paper.year || '';
    const title = paper.title;
    const venue = paper.venue || '';
    const doi = paper.doi || '';

    const entryType = paper.type === 'journal' ? 'article' : 'inproceedings';

    let bibtex = `@${entryType}{${id},\n`;
    bibtex += `  author = {${authors}},\n`;
    bibtex += `  title = {${title}},\n`;
    bibtex += `  year = {${year}},\n`;
    if (venue) {
      const field = entryType === 'article' ? 'journal' : 'booktitle';
      bibtex += `  ${field} = {${venue}},\n`;
    }
    if (doi) {
      bibtex += `  doi = {${doi}},\n`;
    }
    bibtex += `}`;

    return bibtex;
  }

  /**
   * Format citation in Chicago style
   */
  private formatChicago(paper: ResearchPaper): string {
    const authors = this.formatAuthorsChicago(
      paper.authors.map((a) => a.name)
    );
    const year = paper.year || 'n.d.';
    const title = `"${paper.title}"`;
    const venue = paper.venue || '';
    const doi = paper.doi ? `https://doi.org/${paper.doi}` : '';

    let citation = `${authors}. ${year}. ${title}.`;
    if (venue) {
      citation += ` ${venue}.`;
    }
    if (doi) {
      citation += ` ${doi}`;
    }

    return citation;
  }

  /**
   * Format citation in MLA style
   */
  private formatMLA(paper: ResearchPaper): string {
    const authors = this.formatAuthorsMLA(paper.authors.map((a) => a.name));
    const title = `"${paper.title}"`;
    const venue = paper.venue || '';
    const year = paper.year || 'n.d.';

    let citation = `${authors}. ${title}.`;
    if (venue) {
      citation += ` ${venue},`;
    }
    citation += ` ${year}.`;

    return citation;
  }

  /**
   * Format citation in IEEE style
   */
  private formatIEEE(paper: ResearchPaper): string {
    const authors = this.formatAuthorsIEEE(paper.authors.map((a) => a.name));
    const title = `"${paper.title}"`;
    const venue = paper.venue ? `, ${paper.venue}` : '';
    const year = paper.year || 'n.d.';

    return `${authors}, ${title}${venue}, ${year}.`;
  }

  /**
   * Format authors in APA style
   */
  private formatAuthorsAPA(authors: string[]): string {
    if (authors.length === 0) return 'Unknown';
    if (authors.length === 1) return authors[0];
    if (authors.length === 2) return `${authors[0]} & ${authors[1]}`;

    const lastAuthor = authors[authors.length - 1];
    const otherAuthors = authors.slice(0, -1).join(', ');
    return `${otherAuthors}, & ${lastAuthor}`;
  }

  /**
   * Format authors in Chicago style
   */
  private formatAuthorsChicago(authors: string[]): string {
    if (authors.length === 0) return 'Unknown';
    if (authors.length === 1) return this.reverseAuthorName(authors[0]);
    if (authors.length === 2) {
      return `${this.reverseAuthorName(authors[0])} and ${authors[1]}`;
    }

    const firstAuthor = this.reverseAuthorName(authors[0]);
    const otherAuthors = authors.slice(1).join(', ');
    return `${firstAuthor}, ${otherAuthors}`;
  }

  /**
   * Format authors in MLA style
   */
  private formatAuthorsMLA(authors: string[]): string {
    if (authors.length === 0) return 'Unknown';
    if (authors.length === 1) return this.reverseAuthorName(authors[0]);
    if (authors.length === 2) {
      return `${this.reverseAuthorName(authors[0])}, and ${authors[1]}`;
    }

    const firstAuthor = this.reverseAuthorName(authors[0]);
    return `${firstAuthor}, et al.`;
  }

  /**
   * Format authors in IEEE style
   */
  private formatAuthorsIEEE(authors: string[]): string {
    if (authors.length === 0) return 'Unknown';

    const initials = authors.map((name) => {
      const parts = name.split(' ');
      if (parts.length === 1) return name;

      const lastName = parts[parts.length - 1];
      const firstInitials = parts
        .slice(0, -1)
        .map((p) => p.charAt(0) + '.')
        .join(' ');

      return `${firstInitials} ${lastName}`;
    });

    if (initials.length === 1) return initials[0];
    if (initials.length === 2) return `${initials[0]} and ${initials[1]}`;

    const lastAuthor = initials[initials.length - 1];
    const otherAuthors = initials.slice(0, -1).join(', ');
    return `${otherAuthors}, and ${lastAuthor}`;
  }

  /**
   * Reverse author name (First Last -> Last, First)
   */
  private reverseAuthorName(name: string): string {
    const parts = name.split(' ');
    if (parts.length === 1) return name;

    const lastName = parts[parts.length - 1];
    const firstName = parts.slice(0, -1).join(' ');
    return `${lastName}, ${firstName}`;
  }

  /**
   * Generate BibTeX citation ID
   */
  private generateBibTeXId(paper: ResearchPaper): string {
    const author =
      paper.authors.length > 0
        ? paper.authors[0].name.split(' ').pop()?.toLowerCase()
        : 'unknown';
    const year = paper.year || 'unknown';
    const titleWord = paper.title
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)[0];

    return `${author}${year}${titleWord}`;
  }
}
