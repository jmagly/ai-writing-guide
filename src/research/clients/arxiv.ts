/**
 * arXiv API client
 *
 * @module research/clients/arxiv
 */

import { BaseClient } from './base.js';
import {
  ClientConfig,
  ResearchPaper,
  SearchOptions,
  SearchResult,
  Author,
  ResearchError,
  ResearchErrorCode,
} from '../types.js';

/**
 * arXiv API client
 */
export class ArxivClient extends BaseClient {
  constructor(config?: Partial<ClientConfig>) {
    super({
      baseUrl: 'http://export.arxiv.org/api',
      timeout: 30000,
      rateLimit: {
        maxTokens: 3,
        refillRate: 1 / 3, // 1 request per 3 seconds
        currentTokens: 3,
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
   * Get paper by arXiv ID
   */
  async getPaperById(arxivId: string): Promise<ResearchPaper> {
    // Normalize arXiv ID (remove version if present)
    const normalizedId = arxivId.replace(/v\d+$/, '');

    const url = this.buildUrl('/query', {
      id_list: normalizedId,
      max_results: 1,
    });

    const xmlText = await this.requestXml(url);
    const papers = this.parseAtomFeed(xmlText);

    if (papers.length === 0) {
      throw new ResearchError(
        ResearchErrorCode.RF_300,
        `arXiv paper not found: ${arxivId}`
      );
    }

    return papers[0];
  }

  /**
   * Search papers by query
   */
  async search(
    query: string,
    options: SearchOptions = {}
  ): Promise<SearchResult> {
    const { limit = 10, offset = 0 } = options;

    const url = this.buildUrl('/query', {
      search_query: query,
      start: offset,
      max_results: limit,
    });

    const xmlText = await this.requestXml(url);
    const papers = this.parseAtomFeed(xmlText);

    // arXiv doesn't provide total count, so we estimate
    const hasMore = papers.length === limit;

    return {
      total: hasMore ? offset + limit + 1 : offset + papers.length,
      papers,
      offset,
      limit,
      hasMore,
    };
  }

  /**
   * Request XML from arXiv API
   */
  private async requestXml(url: string): Promise<string> {
    await this.rateLimiter.acquire();

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      this.config.timeout
    );

    try {
      const response = await fetch(url, {
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new ResearchError(
          ResearchErrorCode.RF_200,
          `arXiv API error: ${response.status}`
        );
      }

      return await response.text();
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ResearchError(
          ResearchErrorCode.RF_104,
          `Request timeout after ${this.config.timeout}ms`,
          error
        );
      }

      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Parse Atom XML feed from arXiv
   */
  private parseAtomFeed(xmlText: string): ResearchPaper[] {
    // Simple XML parsing for arXiv Atom feed
    const papers: ResearchPaper[] = [];

    // Extract entries
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
    const entries = xmlText.match(entryRegex) || [];

    for (const entry of entries) {
      papers.push(this.parseEntry(entry));
    }

    return papers;
  }

  /**
   * Parse a single entry from the feed
   */
  private parseEntry(entry: string): ResearchPaper {
    const extractTag = (tag: string): string => {
      const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
      const match = entry.match(regex);
      return match ? match[1].trim() : '';
    };

    const extractAllTags = (tag: string): string[] => {
      const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'gi');
      const matches = entry.match(regex) || [];
      return matches.map((m) => {
        const contentMatch = m.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
        return contentMatch ? contentMatch[1].trim() : '';
      });
    };

    const id = extractTag('id');
    const arxivId = id.split('/').pop()?.replace(/v\d+$/, '') || '';

    const title = extractTag('title').replace(/\s+/g, ' ');
    const summary = extractTag('summary').replace(/\s+/g, ' ');
    const published = extractTag('published');
    const year = parseInt(published.substring(0, 4), 10) || 0;

    const authorNames = extractAllTags('name');
    const authors: Author[] = authorNames.map((name) => ({ name }));

    // Extract DOI if present
    const doiMatch = entry.match(/doi:([^\s<]+)/i);
    const doi = doiMatch ? doiMatch[1] : undefined;

    // Extract PDF link
    const pdfLinkMatch = entry.match(/<link[^>]*title="pdf"[^>]*href="([^"]+)"/i);
    const pdfUrl = pdfLinkMatch ? pdfLinkMatch[1] : undefined;

    return {
      id: arxivId,
      title,
      authors,
      year,
      abstract: summary,
      arxivId,
      doi,
      pdfUrl,
      type: 'preprint',
      source: 'arxiv',
      retrievedAt: new Date().toISOString(),
    };
  }
}
