/**
 * Semantic Scholar API client
 *
 * @module research/clients/semantic-scholar
 */

import { BaseClient } from './base.js';
import {
  ClientConfig,
  ResearchPaper,
  SemanticScholarResponse,
  SearchOptions,
  SearchResult,
  Author,
} from '../types.js';

/**
 * Semantic Scholar API client
 */
export class SemanticScholarClient extends BaseClient {
  constructor(config?: Partial<ClientConfig>) {
    super({
      baseUrl: 'https://api.semanticscholar.org/graph/v1',
      timeout: 30000,
      rateLimit: {
        maxTokens: 100,
        refillRate: 1, // 1 request per second
        currentTokens: 100,
        lastRefill: Date.now(),
      },
      retry: {
        maxRetries: 3,
        initialDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2,
      },
      ...config,
    });
  }

  /**
   * Get paper by DOI
   */
  async getPaperByDoi(doi: string): Promise<ResearchPaper> {
    const fields = [
      'paperId',
      'title',
      'abstract',
      'year',
      'authors',
      'citationCount',
      'venue',
      'externalIds',
      'openAccessPdf',
    ];

    const url = this.buildUrl(`/paper/DOI:${encodeURIComponent(doi)}`, {
      fields: fields.join(','),
    });

    const response = await this.request<SemanticScholarResponse>(url);
    return this.transformResponse(response);
  }

  /**
   * Get paper by arXiv ID
   */
  async getPaperByArxivId(arxivId: string): Promise<ResearchPaper> {
    const fields = [
      'paperId',
      'title',
      'abstract',
      'year',
      'authors',
      'citationCount',
      'venue',
      'externalIds',
      'openAccessPdf',
    ];

    const url = this.buildUrl(`/paper/ARXIV:${encodeURIComponent(arxivId)}`, {
      fields: fields.join(','),
    });

    const response = await this.request<SemanticScholarResponse>(url);
    return this.transformResponse(response);
  }

  /**
   * Search papers by query
   */
  async search(
    query: string,
    options: SearchOptions = {}
  ): Promise<SearchResult> {
    const {
      limit = 10,
      offset = 0,
      fields = [
        'paperId',
        'title',
        'abstract',
        'year',
        'authors',
        'citationCount',
        'venue',
        'externalIds',
        'openAccessPdf',
      ],
    } = options;

    const url = this.buildUrl('/paper/search', {
      query,
      limit,
      offset,
      fields: fields.join(','),
    });

    const response = await this.request<{
      total: number;
      offset: number;
      data: SemanticScholarResponse[];
    }>(url);

    return {
      total: response.total,
      papers: response.data.map((paper) => this.transformResponse(paper)),
      offset: response.offset,
      limit,
      hasMore: response.offset + limit < response.total,
    };
  }

  /**
   * Transform Semantic Scholar response to ResearchPaper
   */
  private transformResponse(response: SemanticScholarResponse): ResearchPaper {
    const authors: Author[] = (response.authors || []).map((author) => ({
      name: author.name,
      id: author.authorId,
    }));

    return {
      id: response.paperId,
      title: response.title,
      authors,
      year: response.year || 0,
      abstract: response.abstract,
      doi: response.externalIds?.DOI,
      arxivId: response.externalIds?.ArXiv,
      venue: response.venue,
      citationCount: response.citationCount,
      pdfUrl: response.openAccessPdf?.url,
      source: 'semantic-scholar',
      retrievedAt: new Date().toISOString(),
    };
  }
}
