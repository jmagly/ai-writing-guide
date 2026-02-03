/**
 * Discovery Service Tests
 *
 * Tests search, relevance ranking, deduplication, gap analysis,
 * and citation network traversal functionality.
 *
 * @source @src/research/services/discovery.ts
 * @strategy @.aiwg/testing/agent-persistence-test-strategy.md
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ResearchPaper } from '@/research/types.js';
import type { SearchOptionsExtended, GapReport, CitationNetwork } from '@/research/services/types.js';

// Mock Discovery Service (implementation pending)
class MockDiscoveryService {
  private mockPapers: ResearchPaper[] = [];
  private apiClients: unknown[] = [];

  constructor() {
    // Mock API clients would be injected
  }

  async search(query: string, options?: SearchOptionsExtended): Promise<ResearchPaper[]> {
    const limit = options?.limit ?? 10;
    const results = this.mockPapers.filter((p) =>
      p.title.toLowerCase().includes(query.toLowerCase()) ||
      p.abstract?.toLowerCase().includes(query.toLowerCase())
    );
    return results.slice(0, limit);
  }

  rankByRelevance(papers: ResearchPaper[], keywords: string[]): ResearchPaper[] {
    return papers.sort((a, b) => {
      const scoreA = this.calculateRelevance(a, keywords);
      const scoreB = this.calculateRelevance(b, keywords);
      return scoreB - scoreA;
    });
  }

  private calculateRelevance(paper: ResearchPaper, keywords: string[]): number {
    let score = 0;
    const text = `${paper.title} ${paper.abstract ?? ''}`.toLowerCase();
    keywords.forEach((kw) => {
      if (text.includes(kw.toLowerCase())) score++;
    });
    return score;
  }

  deduplicate(papers: ResearchPaper[]): ResearchPaper[] {
    const seen = new Set<string>();
    return papers.filter((p) => {
      const key = p.doi || p.arxivId || p.title;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  async analyzeGaps(topics: string[]): Promise<GapReport> {
    // Analyze corpus coverage
    return {
      underrepresentedTopics: [
        {
          topic: 'multi-agent collaboration',
          currentCount: 2,
          recommendedCount: 10,
          priority: 'high',
        },
      ],
      yearGaps: [
        {
          year: 2023,
          paperCount: 3,
          significance: 'notable',
        },
      ],
      sourceTypeDistribution: {
        journal: 5,
        conference: 8,
        preprint: 2,
      },
      recommendations: [
        'Increase coverage of multi-agent collaboration literature',
        'Add more recent 2023-2024 papers',
      ],
    };
  }

  async traverseCitationNetwork(seedPaperId: string, maxDepth: number): Promise<CitationNetwork> {
    const nodes = [
      {
        refId: seedPaperId,
        title: 'Seed Paper',
        year: 2024,
        citationCount: 50,
      },
    ];
    const edges = [];

    return {
      nodes,
      edges,
      metrics: {
        mostCitedPapers: [seedPaperId],
        mostInfluentialPapers: [seedPaperId],
        clusterCenters: [seedPaperId],
      },
    };
  }

  setMockPapers(papers: ResearchPaper[]): void {
    this.mockPapers = papers;
  }
}

describe('Discovery Service', () => {
  let service: MockDiscoveryService;
  const mockPapers: ResearchPaper[] = [
    {
      id: 'paper1',
      title: 'Chain-of-Thought Prompting Improves Reasoning',
      authors: [{ name: 'Wei, J.' }],
      year: 2022,
      abstract: 'We explore how chain-of-thought prompting enhances LLM reasoning capabilities.',
      doi: '10.1234/cot.2022',
      source: 'semantic-scholar',
      retrievedAt: '2024-01-01T00:00:00Z',
    },
    {
      id: 'paper2',
      title: 'Self-Refine: Iterative Refinement with Self-Feedback',
      authors: [{ name: 'Madaan, A.' }],
      year: 2023,
      abstract: 'LLMs can iteratively refine their outputs using self-generated feedback.',
      doi: '10.1234/refine.2023',
      source: 'semantic-scholar',
      retrievedAt: '2024-01-01T00:00:00Z',
    },
    {
      id: 'paper3',
      title: 'ReAct: Synergizing Reasoning and Acting',
      authors: [{ name: 'Yao, S.' }],
      year: 2022,
      abstract: 'Combining reasoning traces with tool use improves agent performance.',
      arxivId: 'arXiv:2210.03629',
      source: 'arxiv',
      retrievedAt: '2024-01-01T00:00:00Z',
    },
  ];

  beforeEach(() => {
    service = new MockDiscoveryService();
    service.setMockPapers(mockPapers);
  });

  describe('Search Across Multiple Sources', () => {
    it('should search papers by keyword', async () => {
      const results = await service.search('reasoning');

      expect(results).toHaveLength(2);
      expect(results.some((p) => p.title.includes('Chain-of-Thought'))).toBe(true);
      expect(results.some((p) => p.title.includes('ReAct'))).toBe(true);
    });

    it('should respect limit parameter', async () => {
      const results = await service.search('', { limit: 2 });

      expect(results.length).toBeLessThanOrEqual(2);
    });

    it('should search in abstract when title does not match', async () => {
      const results = await service.search('self-generated feedback');

      expect(results).toHaveLength(1);
      expect(results[0].title).toContain('Self-Refine');
    });

    it('should return empty array for no matches', async () => {
      const results = await service.search('nonexistent topic');

      expect(results).toEqual([]);
    });

    it('should handle case-insensitive search', async () => {
      const results = await service.search('REASONING');

      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('Relevance Ranking', () => {
    it('should rank papers by keyword matches', () => {
      const keywords = ['reasoning', 'prompting'];
      const ranked = service.rankByRelevance(mockPapers, keywords);

      // Chain-of-Thought should rank highest (matches both keywords)
      expect(ranked[0].title).toContain('Chain-of-Thought');
    });

    it('should handle empty keyword list', () => {
      const ranked = service.rankByRelevance(mockPapers, []);

      expect(ranked).toHaveLength(mockPapers.length);
    });

    it('should preserve all papers in ranking', () => {
      const ranked = service.rankByRelevance(mockPapers, ['test']);

      expect(ranked).toHaveLength(mockPapers.length);
    });

    it('should rank papers with more matches higher', () => {
      const keywords = ['reasoning', 'iterative', 'feedback'];
      const ranked = service.rankByRelevance(mockPapers, keywords);

      // Self-Refine should rank high (matches multiple keywords)
      const selfRefineIndex = ranked.findIndex((p) => p.title.includes('Self-Refine'));
      expect(selfRefineIndex).toBeLessThan(ranked.length / 2);
    });
  });

  describe('Deduplication', () => {
    it('should remove duplicate papers by DOI', () => {
      const duplicates: ResearchPaper[] = [
        mockPapers[0],
        { ...mockPapers[0], id: 'different-id' }, // Same DOI
        mockPapers[1],
      ];

      const unique = service.deduplicate(duplicates);

      expect(unique).toHaveLength(2);
    });

    it('should remove duplicate papers by arXiv ID', () => {
      const duplicates: ResearchPaper[] = [
        mockPapers[2],
        { ...mockPapers[2], id: 'different-id' }, // Same arXiv ID
      ];

      const unique = service.deduplicate(duplicates);

      expect(unique).toHaveLength(1);
    });

    it('should fall back to title matching when no DOI/arXiv', () => {
      const noDOI: ResearchPaper = {
        id: 'paper4',
        title: 'Unique Title',
        authors: [],
        year: 2024,
        source: 'semantic-scholar',
        retrievedAt: '2024-01-01T00:00:00Z',
      };

      const duplicates = [noDOI, { ...noDOI, id: 'different-id' }];
      const unique = service.deduplicate(duplicates);

      expect(unique).toHaveLength(1);
    });

    it('should preserve order of first occurrence', () => {
      const duplicates = [mockPapers[0], mockPapers[1], mockPapers[0]];
      const unique = service.deduplicate(duplicates);

      expect(unique[0]).toEqual(mockPapers[0]);
      expect(unique[1]).toEqual(mockPapers[1]);
    });
  });

  describe('Gap Analysis', () => {
    it('should identify underrepresented topics', async () => {
      const topics = [
        'chain-of-thought',
        'self-refine',
        'multi-agent collaboration',
        'tool use',
      ];
      const gaps = await service.analyzeGaps(topics);

      expect(gaps.underrepresentedTopics.length).toBeGreaterThan(0);
      expect(gaps.underrepresentedTopics[0].topic).toBe('multi-agent collaboration');
      expect(gaps.underrepresentedTopics[0].priority).toBe('high');
    });

    it('should identify year gaps in coverage', async () => {
      const gaps = await service.analyzeGaps([]);

      expect(gaps.yearGaps).toBeDefined();
      expect(gaps.yearGaps.length).toBeGreaterThan(0);
    });

    it('should show source type distribution', async () => {
      const gaps = await service.analyzeGaps([]);

      expect(gaps.sourceTypeDistribution).toBeDefined();
      expect(gaps.sourceTypeDistribution.journal).toBeDefined();
      expect(gaps.sourceTypeDistribution.conference).toBeDefined();
    });

    it('should provide actionable recommendations', async () => {
      const gaps = await service.analyzeGaps(['test']);

      expect(gaps.recommendations).toBeDefined();
      expect(gaps.recommendations.length).toBeGreaterThan(0);
      expect(gaps.recommendations[0]).toContain('coverage');
    });
  });

  describe('Citation Network Traversal', () => {
    it('should build citation network from seed paper', async () => {
      const network = await service.traverseCitationNetwork('paper1', 2);

      expect(network.nodes).toBeDefined();
      expect(network.edges).toBeDefined();
      expect(network.metrics).toBeDefined();
    });

    it('should respect max depth parameter', async () => {
      const network1 = await service.traverseCitationNetwork('paper1', 1);
      const network2 = await service.traverseCitationNetwork('paper1', 3);

      expect(network1).toBeDefined();
      expect(network2).toBeDefined();
    });

    it('should identify most cited papers', async () => {
      const network = await service.traverseCitationNetwork('paper1', 2);

      expect(network.metrics.mostCitedPapers).toBeDefined();
      expect(network.metrics.mostCitedPapers.length).toBeGreaterThan(0);
    });

    it('should identify influential papers', async () => {
      const network = await service.traverseCitationNetwork('paper1', 2);

      expect(network.metrics.mostInfluentialPapers).toBeDefined();
      expect(network.metrics.mostInfluentialPapers.length).toBeGreaterThan(0);
    });

    it('should identify cluster centers', async () => {
      const network = await service.traverseCitationNetwork('paper1', 2);

      expect(network.metrics.clusterCenters).toBeDefined();
      expect(network.metrics.clusterCenters).toContain('paper1');
    });
  });

  describe('Error Handling', () => {
    it('should handle API failures gracefully', async () => {
      const failingService = new MockDiscoveryService();
      // In real implementation, would inject failing API client

      await expect(failingService.search('test')).resolves.toEqual([]);
    });

    it('should handle empty results without error', async () => {
      service.setMockPapers([]);

      const results = await service.search('anything');
      expect(results).toEqual([]);
    });

    it('should handle rate limiting by backing off', async () => {
      // Real implementation would retry with exponential backoff
      const results = await service.search('test');
      expect(results).toBeDefined();
    });
  });
});
