/**
 * CrossRef API client
 *
 * @module research/clients/crossref
 */

import { BaseClient } from './base.js';
import {
  ClientConfig,
  ResearchPaper,
  CrossRefResponse,
  SearchOptions,
  SearchResult,
  Author,
} from '../types.js';

/**
 * CrossRef API client
 */
export class CrossRefClient extends BaseClient {
  constructor(config?: Partial<ClientConfig>) {
    super({
      baseUrl: 'https://api.crossref.org',
      timeout: 30000,
      rateLimit: {
        maxTokens: 50,
        refillRate: 1, // 1 request per second (polite pool)
        currentTokens: 50,
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
    const url = this.buildUrl(`/works/${encodeURIComponent(doi)}`, {});
    const response = await this.request<{ message: CrossRefResponse }>(url);
    return this.transformResponse(response.message);
  }

  /**
   * Search papers by query
   */
  async search(
    query: string,
    options: SearchOptions = {}
  ): Promise<SearchResult> {
    const { limit = 10, offset = 0 } = options;

    const url = this.buildUrl('/works', {
      query,
      rows: limit,
      offset,
    });

    const response = await this.request<{
      message: {
        'total-results': number;
        items: CrossRefResponse[];
      };
    }>(url);

    return {
      total: response.message['total-results'],
      papers: response.message.items.map((paper) =>
        this.transformResponse(paper)
      ),
      offset,
      limit,
      hasMore: offset + response.message.items.length < response.message['total-results'],
    };
  }

  /**
   * Transform CrossRef response to ResearchPaper
   */
  private transformResponse(response: CrossRefResponse): ResearchPaper {
    const authors: Author[] =
      response.author?.map((author) => {
        const name = [author.given, author.family]
          .filter(Boolean)
          .join(' ');
        const affiliations =
          author.affiliation?.map((aff) => aff.name) || [];

        return {
          name,
          affiliations,
        };
      }) || [];

    const year =
      response.published?.['date-parts']?.[0]?.[0] || 0;

    const title = Array.isArray(response.title)
      ? response.title[0]
      : response.title || '';

    const venue = Array.isArray(response['container-title'])
      ? response['container-title'][0]
      : response['container-title'] || '';

    return {
      id: response.DOI,
      title,
      authors,
      year,
      abstract: response.abstract,
      doi: response.DOI,
      venue,
      citationCount: response['is-referenced-by-count'],
      type: this.mapType(response.type),
      source: 'crossref',
      retrievedAt: new Date().toISOString(),
    };
  }

  /**
   * Map CrossRef type to ResearchPaper type
   */
  private mapType(
    crossrefType?: string
  ): 'journal' | 'conference' | 'preprint' | 'book' | 'thesis' | 'other' {
    if (!crossrefType) return 'other';

    const type = crossrefType.toLowerCase();

    if (type.includes('journal')) return 'journal';
    if (type.includes('proceedings')) return 'conference';
    if (type.includes('posted-content')) return 'preprint';
    if (type.includes('book')) return 'book';
    if (type.includes('dissertation') || type.includes('thesis'))
      return 'thesis';

    return 'other';
  }
}
