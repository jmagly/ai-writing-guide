/**
 * Tests for SemanticScholarClient
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SemanticScholarClient } from '../../../src/research/clients/semantic-scholar.js';
import { ResearchErrorCode } from '../../../src/research/types.js';

describe('SemanticScholarClient', () => {
  let client: SemanticScholarClient;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    client = new SemanticScholarClient({
      rateLimit: {
        maxTokens: 100,
        refillRate: 10,
        currentTokens: 100,
        lastRefill: Date.now(),
      },
    });

    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getPaperByDoi', () => {
    it('should retrieve paper by DOI', async () => {
      const mockResponse = {
        paperId: '123abc',
        title: 'Test Paper',
        abstract: 'This is a test paper',
        year: 2024,
        authors: [
          { authorId: 'author1', name: 'John Doe' },
          { authorId: 'author2', name: 'Jane Smith' },
        ],
        citationCount: 42,
        venue: 'Test Conference',
        externalIds: {
          DOI: '10.1234/test.2024',
          ArXiv: '2024.12345',
        },
        openAccessPdf: {
          url: 'https://example.com/paper.pdf',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const paper = await client.getPaperByDoi('10.1234/test.2024');

      expect(paper.id).toBe('123abc');
      expect(paper.title).toBe('Test Paper');
      expect(paper.year).toBe(2024);
      expect(paper.authors).toHaveLength(2);
      expect(paper.authors[0].name).toBe('John Doe');
      expect(paper.doi).toBe('10.1234/test.2024');
      expect(paper.arxivId).toBe('2024.12345');
      expect(paper.citationCount).toBe(42);
      expect(paper.pdfUrl).toBe('https://example.com/paper.pdf');
      expect(paper.source).toBe('semantic-scholar');
    });

    it('should handle missing optional fields', async () => {
      const mockResponse = {
        paperId: '123abc',
        title: 'Minimal Paper',
        authors: [{ name: 'John Doe' }],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const paper = await client.getPaperByDoi('10.1234/test.2024');

      expect(paper.id).toBe('123abc');
      expect(paper.title).toBe('Minimal Paper');
      expect(paper.year).toBe(0);
      expect(paper.abstract).toBeUndefined();
      expect(paper.citationCount).toBeUndefined();
      expect(paper.pdfUrl).toBeUndefined();
    });

    it('should handle null openAccessPdf', async () => {
      const mockResponse = {
        paperId: '123abc',
        title: 'Test Paper',
        authors: [{ name: 'John Doe' }],
        openAccessPdf: null,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const paper = await client.getPaperByDoi('10.1234/test.2024');

      expect(paper.pdfUrl).toBeUndefined();
    });
  });

  describe('getPaperByArxivId', () => {
    it('should retrieve paper by arXiv ID', async () => {
      const mockResponse = {
        paperId: '123abc',
        title: 'arXiv Paper',
        authors: [{ name: 'John Doe' }],
        year: 2024,
        externalIds: {
          ArXiv: '2024.12345',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const paper = await client.getPaperByArxivId('2024.12345');

      expect(paper.id).toBe('123abc');
      expect(paper.title).toBe('arXiv Paper');
      expect(paper.arxivId).toBe('2024.12345');
    });
  });

  describe('search', () => {
    it('should search papers', async () => {
      const mockResponse = {
        total: 100,
        offset: 0,
        data: [
          {
            paperId: '123',
            title: 'Paper 1',
            authors: [{ name: 'Author 1' }],
            year: 2024,
          },
          {
            paperId: '456',
            title: 'Paper 2',
            authors: [{ name: 'Author 2' }],
            year: 2023,
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await client.search('machine learning');

      expect(result.total).toBe(100);
      expect(result.papers).toHaveLength(2);
      expect(result.offset).toBe(0);
      expect(result.limit).toBe(10);
      expect(result.hasMore).toBe(true);
      expect(result.papers[0].title).toBe('Paper 1');
      expect(result.papers[1].title).toBe('Paper 2');
    });

    it('should handle pagination', async () => {
      const mockResponse = {
        total: 15,
        offset: 10,
        data: [
          {
            paperId: '789',
            title: 'Paper 11',
            authors: [{ name: 'Author 11' }],
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await client.search('test', { limit: 5, offset: 10 });

      expect(result.total).toBe(15);
      expect(result.offset).toBe(10);
      expect(result.hasMore).toBe(false); // 10 + 1 < 15, but we're at the end
    });

    it('should handle custom fields', async () => {
      const mockResponse = {
        total: 1,
        offset: 0,
        data: [
          {
            paperId: '123',
            title: 'Test Paper',
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await client.search('test', {
        fields: ['paperId', 'title'],
      });

      // Verify the URL includes the custom fields
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('fields=paperId%2Ctitle'),
        expect.any(Object)
      );
    });
  });

  describe('error handling', () => {
    it('should throw on 404', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      await expect(client.getPaperByDoi('invalid')).rejects.toMatchObject({
        code: ResearchErrorCode.RF_300,
      });
    });

    it('should throw on rate limit', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
      });

      await expect(client.getPaperByDoi('test')).rejects.toMatchObject({
        code: ResearchErrorCode.RF_103,
      });
    });
  });
});
