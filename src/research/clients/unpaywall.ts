/**
 * Unpaywall API client
 *
 * @module research/clients/unpaywall
 */

import { BaseClient } from './base.js';
import {
  ClientConfig,
  ResearchPaper,
  UnpaywallResponse,
  Author,
  ResearchError,
  ResearchErrorCode,
} from '../types.js';

/**
 * Unpaywall API client
 */
export class UnpaywallClient extends BaseClient {
  private email: string;

  constructor(config?: Partial<ClientConfig> & { email?: string }) {
    const email = config?.email || 'research@example.com';

    super({
      baseUrl: 'https://api.unpaywall.org/v2',
      timeout: 30000,
      rateLimit: {
        maxTokens: 100,
        refillRate: 10, // 10 requests per second
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

    this.email = email;
  }

  /**
   * Get paper by DOI
   */
  async getPaperByDoi(doi: string): Promise<ResearchPaper> {
    if (!this.email || this.email === 'research@example.com') {
      throw new ResearchError(
        ResearchErrorCode.RF_101,
        'Email is required for Unpaywall API'
      );
    }

    const url = this.buildUrl(`/${encodeURIComponent(doi)}`, {
      email: this.email,
    });

    const response = await this.request<UnpaywallResponse>(url);
    return this.transformResponse(response);
  }

  /**
   * Check if open access PDF is available for DOI
   */
  async checkOpenAccess(doi: string): Promise<string | null> {
    try {
      const paper = await this.getPaperByDoi(doi);
      return paper.pdfUrl || null;
    } catch (error) {
      if (
        error instanceof ResearchError &&
        error.code === ResearchErrorCode.RF_300
      ) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Transform Unpaywall response to ResearchPaper
   */
  private transformResponse(response: UnpaywallResponse): ResearchPaper {
    const authors: Author[] =
      response.authors?.map((author) => {
        const name = [author.given, author.family]
          .filter(Boolean)
          .join(' ');
        return { name };
      }) || [];

    return {
      id: response.doi,
      title: response.title || '',
      authors,
      year: response.year || 0,
      doi: response.doi,
      venue: response.journal_name,
      pdfUrl:
        response.best_oa_location?.url_for_pdf ||
        response.best_oa_location?.url,
      source: 'unpaywall',
      retrievedAt: new Date().toISOString(),
    };
  }
}
