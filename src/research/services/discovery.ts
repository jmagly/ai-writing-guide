/**
 * Discovery service for unified research paper search
 *
 * @module research/services/discovery
 */

import { ResearchPaper } from '../types.js';
import { SemanticScholarClient } from '../clients/semantic-scholar.js';
import { CrossRefClient } from '../clients/crossref.js';
import { ArxivClient } from '../clients/arxiv.js';
import { CacheManager } from '../cache/manager.js';
import { SearchOptionsExtended, GapReport } from './types.js';

/**
 * Configuration for discovery service
 */
export interface DiscoveryConfig {
  /** Semantic Scholar client */
  semanticScholar?: SemanticScholarClient;
  /** CrossRef client */
  crossref?: CrossRefClient;
  /** arXiv client */
  arxiv?: ArxivClient;
  /** Cache manager */
  cache?: CacheManager;
  /** Corpus path for gap analysis */
  corpusPath?: string;
}

/**
 * Discovery service for unified search across API clients
 */
export class DiscoveryService {
  private semanticScholar: SemanticScholarClient;
  private crossref: CrossRefClient;
  private arxiv: ArxivClient;
  private cache: CacheManager;
  private corpusPath: string;

  constructor(config: DiscoveryConfig = {}) {
    this.semanticScholar = config.semanticScholar || new SemanticScholarClient();
    this.crossref = config.crossref || new CrossRefClient();
    this.arxiv = config.arxiv || new ArxivClient();
    this.cache = config.cache || new CacheManager();
    this.corpusPath = config.corpusPath || '.aiwg/research/sources';
  }

  /**
   * Search across all configured API clients
   */
  async search(
    query: string,
    options: SearchOptionsExtended = {}
  ): Promise<ResearchPaper[]> {
    const {
      limit = 10,
      offset = 0,
      useCache = true,
      minYear,
      maxYear,
      relevanceThreshold = 0.0,
      deduplicate = true,
    } = options;

    // Check cache
    if (useCache) {
      const cacheKey = this.cache.generateKey('discovery:search', {
        query,
        limit,
        offset,
        minYear,
        maxYear,
      });
      const cached = await this.cache.get<ResearchPaper[]>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Search all APIs in parallel
    const [ssResults, crResults, arxivResults] = await Promise.allSettled([
      this.searchSemanticScholar(query, limit, offset),
      this.searchCrossRef(query, limit, offset),
      this.searchArxiv(query, limit, offset),
    ]);

    // Collect successful results
    const allPapers: ResearchPaper[] = [];

    if (ssResults.status === 'fulfilled') {
      allPapers.push(...ssResults.value);
    }
    if (crResults.status === 'fulfilled') {
      allPapers.push(...crResults.value);
    }
    if (arxivResults.status === 'fulfilled') {
      allPapers.push(...arxivResults.value);
    }

    // Filter by year range
    let filtered = allPapers;
    if (minYear !== undefined) {
      filtered = filtered.filter((p) => p.year >= minYear);
    }
    if (maxYear !== undefined) {
      filtered = filtered.filter((p) => p.year <= maxYear);
    }

    // Deduplicate by DOI/arXiv ID/title
    if (deduplicate) {
      filtered = this.deduplicatePapers(filtered);
    }

    // Rank by relevance
    const ranked = this.rankByRelevance(filtered, query);

    // Filter by relevance threshold
    const thresholded = ranked.filter(
      (p) => this.calculateRelevance(p, query) >= relevanceThreshold
    );

    // Apply limit
    const results = thresholded.slice(0, limit);

    // Cache results
    if (useCache) {
      const cacheKey = this.cache.generateKey('discovery:search', {
        query,
        limit,
        offset,
        minYear,
        maxYear,
      });
      await this.cache.set(cacheKey, results, 'semantic-scholar');
    }

    return results;
  }

  /**
   * Analyze gaps in research corpus
   */
  async analyzeGaps(corpusRefIds: string[]): Promise<GapReport> {
    // For now, return a basic report structure
    // In a full implementation, this would analyze corpus metadata
    return {
      underrepresentedTopics: [],
      yearGaps: [],
      sourceTypeDistribution: {},
      recommendations: [
        'Corpus gap analysis requires corpus metadata',
        'Consider adding more recent publications',
        'Balance source types (journal vs conference vs preprint)',
      ],
    };
  }

  /**
   * Follow citation network starting from a paper
   */
  async followCitations(
    paperId: string,
    depth: number = 1
  ): Promise<ResearchPaper[]> {
    const results: ResearchPaper[] = [];
    const visited = new Set<string>();

    await this.followCitationsRecursive(paperId, depth, visited, results);

    return results;
  }

  /**
   * Search Semantic Scholar
   */
  private async searchSemanticScholar(
    query: string,
    limit: number,
    offset: number
  ): Promise<ResearchPaper[]> {
    try {
      const result = await this.semanticScholar.search(query, {
        limit,
        offset,
      });
      return result.papers;
    } catch (error) {
      console.warn('Semantic Scholar search failed:', error);
      return [];
    }
  }

  /**
   * Search CrossRef
   */
  private async searchCrossRef(
    query: string,
    limit: number,
    offset: number
  ): Promise<ResearchPaper[]> {
    try {
      const result = await this.crossref.search(query, { limit, offset });
      return result.papers;
    } catch (error) {
      console.warn('CrossRef search failed:', error);
      return [];
    }
  }

  /**
   * Search arXiv
   */
  private async searchArxiv(
    query: string,
    limit: number,
    offset: number
  ): Promise<ResearchPaper[]> {
    try {
      const result = await this.arxiv.search(query, { limit, offset });
      return result.papers;
    } catch (error) {
      console.warn('arXiv search failed:', error);
      return [];
    }
  }

  /**
   * Deduplicate papers by DOI, arXiv ID, or title similarity
   */
  private deduplicatePapers(papers: ResearchPaper[]): ResearchPaper[] {
    const seen = new Map<string, ResearchPaper>();

    for (const paper of papers) {
      // Use DOI as primary key
      if (paper.doi) {
        const key = `doi:${paper.doi.toLowerCase()}`;
        if (!seen.has(key)) {
          seen.set(key, paper);
        }
        continue;
      }

      // Use arXiv ID as secondary key
      if (paper.arxivId) {
        const key = `arxiv:${paper.arxivId.toLowerCase()}`;
        if (!seen.has(key)) {
          seen.set(key, paper);
        }
        continue;
      }

      // Use normalized title as fallback
      const normalizedTitle = paper.title
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      const key = `title:${normalizedTitle}`;
      if (!seen.has(key)) {
        seen.set(key, paper);
      }
    }

    return Array.from(seen.values());
  }

  /**
   * Rank papers by relevance to query
   */
  private rankByRelevance(
    papers: ResearchPaper[],
    query: string
  ): ResearchPaper[] {
    const scored = papers.map((paper) => ({
      paper,
      relevance: this.calculateRelevance(paper, query),
    }));

    scored.sort((a, b) => b.relevance - a.relevance);

    return scored.map((s) => s.paper);
  }

  /**
   * Calculate relevance score (0-1) for a paper
   */
  private calculateRelevance(paper: ResearchPaper, query: string): number {
    const queryLower = query.toLowerCase();
    const queryTerms = queryLower.split(/\s+/);

    let score = 0;

    // Title match (weight: 0.5)
    const titleLower = paper.title.toLowerCase();
    const titleMatches = queryTerms.filter((term) =>
      titleLower.includes(term)
    ).length;
    score += (titleMatches / queryTerms.length) * 0.5;

    // Abstract match (weight: 0.3)
    if (paper.abstract) {
      const abstractLower = paper.abstract.toLowerCase();
      const abstractMatches = queryTerms.filter((term) =>
        abstractLower.includes(term)
      ).length;
      score += (abstractMatches / queryTerms.length) * 0.3;
    }

    // Citation count bonus (weight: 0.2)
    if (paper.citationCount) {
      // Normalize citation count (log scale)
      const citationScore = Math.log10(paper.citationCount + 1) / 3; // Max ~3 for 1000 citations
      score += Math.min(citationScore, 1.0) * 0.2;
    }

    return Math.min(score, 1.0);
  }

  /**
   * Recursively follow citations
   */
  private async followCitationsRecursive(
    paperId: string,
    remainingDepth: number,
    visited: Set<string>,
    results: ResearchPaper[]
  ): Promise<void> {
    if (remainingDepth === 0 || visited.has(paperId)) {
      return;
    }

    visited.add(paperId);

    // For now, just stub - full implementation would query Semantic Scholar
    // citation graph API endpoint
    // This would require additional API calls to get references/citations
  }
}
