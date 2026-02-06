/**
 * Tests for ArxivClient
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ArxivClient } from '../../../src/research/clients/arxiv.js';
import { ResearchErrorCode } from '../../../src/research/types.js';

describe('ArxivClient', () => {
  let client: ArxivClient;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    client = new ArxivClient({
      rateLimit: {
        maxTokens: 3,
        refillRate: 1,
        currentTokens: 3,
        lastRefill: Date.now(),
      },
    });

    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getPaperById', () => {
    it('should retrieve paper by arXiv ID', async () => {
      const mockXml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <id>http://arxiv.org/abs/2024.12345v1</id>
    <title>Test arXiv Paper</title>
    <summary>This is a test paper from arXiv</summary>
    <published>2024-01-15T00:00:00Z</published>
    <author><name>John Doe</name></author>
    <author><name>Jane Smith</name></author>
    <link title="pdf" href="https://arxiv.org/pdf/2024.12345v1.pdf"/>
  </entry>
</feed>`;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockXml,
      });

      const paper = await client.getPaperById('2024.12345');

      expect(paper.id).toBe('2024.12345');
      expect(paper.title).toBe('Test arXiv Paper');
      expect(paper.abstract).toBe('This is a test paper from arXiv');
      expect(paper.year).toBe(2024);
      expect(paper.authors).toHaveLength(2);
      expect(paper.authors[0].name).toBe('John Doe');
      expect(paper.authors[1].name).toBe('Jane Smith');
      expect(paper.pdfUrl).toBe('https://arxiv.org/pdf/2024.12345v1.pdf');
      expect(paper.type).toBe('preprint');
      expect(paper.source).toBe('arxiv');
    });

    it('should normalize arXiv ID with version', async () => {
      const mockXml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <id>http://arxiv.org/abs/2024.12345v2</id>
    <title>Test Paper</title>
    <summary>Test summary</summary>
    <published>2024-01-15T00:00:00Z</published>
    <author><name>Author</name></author>
  </entry>
</feed>`;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockXml,
      });

      const paper = await client.getPaperById('2024.12345v2');

      expect(paper.id).toBe('2024.12345');
    });

    it('should extract DOI if present', async () => {
      const mockXml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <id>http://arxiv.org/abs/2024.12345v1</id>
    <title>Test Paper</title>
    <summary>Test summary</summary>
    <published>2024-01-15T00:00:00Z</published>
    <author><name>Author</name></author>
    <arxiv:doi xmlns:arxiv="http://arxiv.org/schemas/atom">doi:10.1234/test.2024</arxiv:doi>
  </entry>
</feed>`;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockXml,
      });

      const paper = await client.getPaperById('2024.12345');

      expect(paper.doi).toBe('10.1234/test.2024');
    });

    it('should throw when paper not found', async () => {
      const mockXml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
</feed>`;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockXml,
      });

      await expect(client.getPaperById('nonexistent')).rejects.toMatchObject({
        code: ResearchErrorCode.RF_300,
      });
    });
  });

  describe('search', () => {
    it('should search papers', async () => {
      const mockXml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <id>http://arxiv.org/abs/2024.001</id>
    <title>Paper 1</title>
    <summary>Summary 1</summary>
    <published>2024-01-01T00:00:00Z</published>
    <author><name>Author 1</name></author>
  </entry>
  <entry>
    <id>http://arxiv.org/abs/2024.002</id>
    <title>Paper 2</title>
    <summary>Summary 2</summary>
    <published>2024-01-02T00:00:00Z</published>
    <author><name>Author 2</name></author>
  </entry>
</feed>`;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockXml,
      });

      const result = await client.search('machine learning', { limit: 2 });

      expect(result.papers).toHaveLength(2);
      expect(result.papers[0].title).toBe('Paper 1');
      expect(result.papers[1].title).toBe('Paper 2');
      expect(result.limit).toBe(2);
      expect(result.hasMore).toBe(true);
    });

    it('should handle pagination', async () => {
      const mockXml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <id>http://arxiv.org/abs/2024.011</id>
    <title>Paper 11</title>
    <summary>Summary</summary>
    <published>2024-01-11T00:00:00Z</published>
    <author><name>Author</name></author>
  </entry>
</feed>`;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockXml,
      });

      const result = await client.search('test', {
        limit: 10,
        offset: 10,
      });

      expect(result.offset).toBe(10);
      expect(result.hasMore).toBe(false); // Only 1 result, less than limit
    });

    it('should handle whitespace in titles', async () => {
      const mockXml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <id>http://arxiv.org/abs/2024.001</id>
    <title>
      Multi
      Line
      Title
    </title>
    <summary>
      Multi
      Line
      Summary
    </summary>
    <published>2024-01-01T00:00:00Z</published>
    <author><name>Author</name></author>
  </entry>
</feed>`;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockXml,
      });

      const result = await client.search('test');

      expect(result.papers[0].title).toBe('Multi Line Title');
      expect(result.papers[0].abstract).toBe('Multi Line Summary');
    });
  });

  describe('error handling', () => {
    it('should throw on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(client.getPaperById('test')).rejects.toMatchObject({
        code: ResearchErrorCode.RF_200,
      });
    });

    it('should throw on timeout', async () => {
      // Create a client with a very short timeout for this test
      const timeoutClient = new ArxivClient({
        timeout: 100, // 100ms timeout
        rateLimit: {
          maxTokens: 3,
          refillRate: 1,
          currentTokens: 3,
          lastRefill: Date.now(),
        },
      });

      // Mock fetch to check abort signal and reject properly
      mockFetch.mockImplementation(
        (_url: string, options?: RequestInit) =>
          new Promise((resolve, reject) => {
            const signal = options?.signal as AbortSignal | undefined;

            if (signal) {
              signal.addEventListener('abort', () => {
                const error = new Error('The operation was aborted');
                error.name = 'AbortError';
                reject(error);
              });
            }

            // Long delay that should be interrupted by abort
            setTimeout(() => resolve({ ok: true, text: async () => '' }), 5000);
          })
      );

      await expect(timeoutClient.getPaperById('test')).rejects.toMatchObject({
        code: ResearchErrorCode.RF_104,
      });
    });
  });
});
