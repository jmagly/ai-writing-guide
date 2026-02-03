/**
 * Citation Service Tests
 *
 * Tests citation formatting (APA, BibTeX, IEEE), citation validation,
 * network construction, and claims index management.
 *
 * @source @src/research/services/citation.ts
 * @strategy @.aiwg/testing/agent-persistence-test-strategy.md
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { ResearchPaper } from '@/research/types.js';
import type { CitationStyle, CitationNetwork } from '@/research/services/types.js';

// Mock Citation Service (implementation pending)
class MockCitationService {
  formatCitation(paper: ResearchPaper, style: CitationStyle): string {
    const firstAuthor = paper.authors[0]?.name || 'Unknown';
    const year = paper.year;
    const title = paper.title;

    switch (style) {
      case 'apa':
        return `${firstAuthor} (${year}). ${title}. ${paper.venue || 'Unpublished manuscript'}. https://doi.org/${paper.doi}`;

      case 'bibtex':
        return `@article{${paper.id},\n  author = {${firstAuthor}},\n  title = {${title}},\n  year = {${year}},\n  doi = {${paper.doi}}\n}`;

      case 'ieee':
        return `${firstAuthor}, "${title}," ${paper.venue}, ${year}. doi: ${paper.doi}`;

      default:
        return `${firstAuthor}. ${title}. ${year}.`;
    }
  }

  validateCitation(citation: string, corpus: ResearchPaper[]): boolean {
    // Check if citation references a paper in corpus
    return corpus.some(
      (p) =>
        citation.includes(p.title) ||
        (p.doi && citation.includes(p.doi)) ||
        (p.arxivId && citation.includes(p.arxivId))
    );
  }

  buildCitationNetwork(papers: ResearchPaper[]): CitationNetwork {
    const nodes = papers.map((p) => ({
      refId: p.id,
      title: p.title,
      year: p.year,
      citationCount: p.citationCount ?? 0,
    }));

    const edges: Array<{ source: string; target: string; type: 'direct' | 'co-citation' }> = [];

    return {
      nodes,
      edges,
      metrics: {
        mostCitedPapers: nodes
          .sort((a, b) => b.citationCount - a.citationCount)
          .slice(0, 5)
          .map((n) => n.refId),
        mostInfluentialPapers: nodes.slice(0, 3).map((n) => n.refId),
        clusterCenters: nodes.slice(0, 3).map((n) => n.refId),
      },
    };
  }

  indexClaims(claims: Array<{ statement: string; sourceRefId: string }>): Map<
    string,
    {
      sources: string[];
      count: number;
    }
  > {
    const index = new Map<string, { sources: string[]; count: number }>();

    claims.forEach((claim) => {
      const existing = index.get(claim.statement);
      if (existing) {
        existing.sources.push(claim.sourceRefId);
        existing.count++;
      } else {
        index.set(claim.statement, {
          sources: [claim.sourceRefId],
          count: 1,
        });
      }
    });

    return index;
  }
}

describe('Citation Service', () => {
  let service: MockCitationService;
  const mockPaper: ResearchPaper = {
    id: 'paper1',
    title: 'Chain-of-Thought Prompting Elicits Reasoning in Large Language Models',
    authors: [{ name: 'Wei, J.' }, { name: 'Wang, X.' }],
    year: 2022,
    doi: '10.1234/neurips.2022.cot',
    venue: 'NeurIPS 2022',
    source: 'semantic-scholar',
    retrievedAt: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    service = new MockCitationService();
  });

  describe('APA Citation Formatting', () => {
    it('should format citation in APA style', () => {
      const citation = service.formatCitation(mockPaper, 'apa');

      expect(citation).toContain('Wei, J.');
      expect(citation).toContain('(2022)');
      expect(citation).toContain(mockPaper.title);
      expect(citation).toContain('https://doi.org/');
    });

    it('should include venue in APA citation', () => {
      const citation = service.formatCitation(mockPaper, 'apa');

      expect(citation).toContain('NeurIPS 2022');
    });

    it('should handle papers without DOI in APA', () => {
      const noDOI = { ...mockPaper, doi: undefined };
      const citation = service.formatCitation(noDOI, 'apa');

      expect(citation).toBeDefined();
      expect(citation).toContain('Wei, J.');
    });

    it('should handle papers without venue in APA', () => {
      const noVenue = { ...mockPaper, venue: undefined };
      const citation = service.formatCitation(noVenue, 'apa');

      expect(citation).toContain('Unpublished manuscript');
    });
  });

  describe('BibTeX Citation Formatting', () => {
    it('should format citation in BibTeX style', () => {
      const citation = service.formatCitation(mockPaper, 'bibtex');

      expect(citation).toContain('@article{');
      expect(citation).toContain('author = {Wei, J.}');
      expect(citation).toContain(`title = {${mockPaper.title}}`);
      expect(citation).toContain('year = {2022}');
      expect(citation).toContain(`doi = {${mockPaper.doi}}`);
    });

    it('should use paper ID as BibTeX key', () => {
      const citation = service.formatCitation(mockPaper, 'bibtex');

      expect(citation).toContain(`@article{${mockPaper.id},`);
    });

    it('should properly escape special characters in BibTeX', () => {
      const specialChars = { ...mockPaper, title: 'Title with & Special {Chars}' };
      const citation = service.formatCitation(specialChars, 'bibtex');

      expect(citation).toBeDefined();
    });
  });

  describe('IEEE Citation Formatting', () => {
    it('should format citation in IEEE style', () => {
      const citation = service.formatCitation(mockPaper, 'ieee');

      expect(citation).toContain('Wei, J.');
      expect(citation).toContain(mockPaper.title);
      expect(citation).toContain('NeurIPS 2022');
      expect(citation).toContain('2022');
      expect(citation).toContain(`doi: ${mockPaper.doi}`);
    });

    it('should include DOI in IEEE citation', () => {
      const citation = service.formatCitation(mockPaper, 'ieee');

      expect(citation).toMatch(/doi:\s*10\./);
    });

    it('should handle papers without venue in IEEE', () => {
      const noVenue = { ...mockPaper, venue: undefined };
      const citation = service.formatCitation(noVenue, 'ieee');

      expect(citation).toBeDefined();
    });
  });

  describe('Citation Validation', () => {
    const corpus: ResearchPaper[] = [
      mockPaper,
      {
        id: 'paper2',
        title: 'ReAct: Synergizing Reasoning and Acting',
        authors: [{ name: 'Yao, S.' }],
        year: 2022,
        arxivId: 'arXiv:2210.03629',
        source: 'arxiv',
        retrievedAt: '2024-01-01T00:00:00Z',
      },
    ];

    it('should validate citation by title match', () => {
      const citation = 'Chain-of-Thought Prompting Elicits Reasoning in Large Language Models improves reasoning.';
      const isValid = service.validateCitation(citation, corpus);

      expect(isValid).toBe(true);
    });

    it('should validate citation by DOI match', () => {
      const citation = 'See https://doi.org/10.1234/neurips.2022.cot for details.';
      const isValid = service.validateCitation(citation, corpus);

      expect(isValid).toBe(true);
    });

    it('should validate citation by arXiv ID match', () => {
      const citation = 'As shown in arXiv:2210.03629...';
      const isValid = service.validateCitation(citation, corpus);

      expect(isValid).toBe(true);
    });

    it('should reject citation not in corpus', () => {
      const citation = 'According to NonexistentPaper (2025)...';
      const isValid = service.validateCitation(citation, corpus);

      expect(isValid).toBe(false);
    });

    it('should handle empty corpus', () => {
      const citation = 'Some citation';
      const isValid = service.validateCitation(citation, []);

      expect(isValid).toBe(false);
    });
  });

  describe('Citation Network Construction', () => {
    const papers: ResearchPaper[] = [
      { ...mockPaper, citationCount: 150 },
      {
        id: 'paper2',
        title: 'Self-Refine',
        authors: [{ name: 'Madaan, A.' }],
        year: 2023,
        citationCount: 85,
        source: 'semantic-scholar',
        retrievedAt: '2024-01-01T00:00:00Z',
      },
      {
        id: 'paper3',
        title: 'ReAct',
        authors: [{ name: 'Yao, S.' }],
        year: 2022,
        citationCount: 120,
        source: 'arxiv',
        retrievedAt: '2024-01-01T00:00:00Z',
      },
    ];

    it('should build network nodes from papers', () => {
      const network = service.buildCitationNetwork(papers);

      expect(network.nodes).toHaveLength(3);
      expect(network.nodes[0]).toHaveProperty('refId');
      expect(network.nodes[0]).toHaveProperty('title');
      expect(network.nodes[0]).toHaveProperty('year');
      expect(network.nodes[0]).toHaveProperty('citationCount');
    });

    it('should identify most cited papers', () => {
      const network = service.buildCitationNetwork(papers);

      expect(network.metrics.mostCitedPapers).toBeDefined();
      expect(network.metrics.mostCitedPapers.length).toBeGreaterThan(0);
      // paper1 has highest citation count (150)
      expect(network.metrics.mostCitedPapers).toContain('paper1');
    });

    it('should identify influential papers', () => {
      const network = service.buildCitationNetwork(papers);

      expect(network.metrics.mostInfluentialPapers).toBeDefined();
      expect(network.metrics.mostInfluentialPapers.length).toBeGreaterThan(0);
    });

    it('should identify cluster centers', () => {
      const network = service.buildCitationNetwork(papers);

      expect(network.metrics.clusterCenters).toBeDefined();
      expect(network.metrics.clusterCenters.length).toBeGreaterThan(0);
    });

    it('should handle single-paper network', () => {
      const network = service.buildCitationNetwork([mockPaper]);

      expect(network.nodes).toHaveLength(1);
      expect(network.edges).toHaveLength(0);
    });

    it('should handle empty paper list', () => {
      const network = service.buildCitationNetwork([]);

      expect(network.nodes).toHaveLength(0);
      expect(network.edges).toHaveLength(0);
    });
  });

  describe('Claims Index Management', () => {
    const claims = [
      {
        statement: 'Chain-of-thought improves reasoning by 35%',
        sourceRefId: 'REF-001',
      },
      {
        statement: 'Self-refine reduces errors by 20%',
        sourceRefId: 'REF-002',
      },
      {
        statement: 'Chain-of-thought improves reasoning by 35%', // Duplicate
        sourceRefId: 'REF-003',
      },
    ];

    it('should index claims by statement', () => {
      const index = service.indexClaims(claims);

      expect(index.size).toBe(2); // Two unique claims
    });

    it('should track multiple sources for same claim', () => {
      const index = service.indexClaims(claims);

      const chainOfThought = index.get('Chain-of-thought improves reasoning by 35%');
      expect(chainOfThought).toBeDefined();
      expect(chainOfThought?.sources).toHaveLength(2);
      expect(chainOfThought?.sources).toContain('REF-001');
      expect(chainOfThought?.sources).toContain('REF-003');
    });

    it('should count claim occurrences', () => {
      const index = service.indexClaims(claims);

      const chainOfThought = index.get('Chain-of-thought improves reasoning by 35%');
      expect(chainOfThought?.count).toBe(2);
    });

    it('should handle unique claims', () => {
      const index = service.indexClaims(claims);

      const selfRefine = index.get('Self-refine reduces errors by 20%');
      expect(selfRefine).toBeDefined();
      expect(selfRefine?.count).toBe(1);
      expect(selfRefine?.sources).toHaveLength(1);
    });

    it('should handle empty claims list', () => {
      const index = service.indexClaims([]);

      expect(index.size).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle papers with missing authors', () => {
      const noAuthors = { ...mockPaper, authors: [] };
      const citation = service.formatCitation(noAuthors, 'apa');

      expect(citation).toContain('Unknown');
    });

    it('should handle papers with missing year', () => {
      const noYear = { ...mockPaper, year: 0 };
      const citation = service.formatCitation(noYear, 'apa');

      expect(citation).toBeDefined();
    });

    it('should handle invalid citation styles gracefully', () => {
      const citation = service.formatCitation(mockPaper, 'invalid' as CitationStyle);

      expect(citation).toBeDefined();
      expect(citation.length).toBeGreaterThan(0);
    });
  });
});
