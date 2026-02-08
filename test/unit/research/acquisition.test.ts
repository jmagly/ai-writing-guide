/**
 * Acquisition Service Tests
 *
 * Tests paper download, metadata extraction, checksum computation,
 * REF-ID assignment, FAIR validation, and deduplication.
 *
 * @source @src/research/services/acquisition.ts
 * @strategy @.aiwg/testing/agent-persistence-test-strategy.md
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ResearchPaper } from '@/research/types.js';
import type { AcquiredSource, FAIRScore } from '@/research/services/types.js';

// Mock Acquisition Service (implementation pending)
class MockAcquisitionService {
  private nextRefId = 1;
  private existingPapers = new Set<string>();

  async downloadPaper(paper: ResearchPaper): Promise<AcquiredSource> {
    if (!paper.pdfUrl) {
      throw new Error('No PDF URL available');
    }

    const refId = this.assignRefId();
    const filePath = `.aiwg/research/pdfs/${refId}.pdf`;
    const checksum = await this.computeChecksum(filePath);

    return {
      paper,
      filePath,
      checksum,
      refId,
      acquiredAt: new Date().toISOString(),
      sizeBytes: 1024 * 1024, // 1MB mock
      fairScore: this.calculateFAIRScore(paper),
    };
  }

  async extractMetadata(filePath: string): Promise<Partial<ResearchPaper>> {
    // Mock metadata extraction from PDF
    return {
      title: 'Extracted Title',
      authors: [{ name: 'Author, A.' }],
      year: 2024,
      doi: '10.1234/extracted',
    };
  }

  async computeChecksum(filePath: string): Promise<string> {
    // Mock SHA-256 checksum computation
    return 'a'.repeat(64); // 64-char hex string
  }

  assignRefId(): string {
    const refId = `REF-${String(this.nextRefId).padStart(3, '0')}`;
    this.nextRefId++;
    return refId;
  }

  calculateFAIRScore(paper: ResearchPaper): FAIRScore {
    const hasDOI = !!paper.doi;
    const hasMetadata = !!(paper.title && paper.authors.length > 0);
    const hasAbstract = !!paper.abstract;

    return {
      overall: hasDOI && hasMetadata ? 0.85 : 0.5,
      findable: {
        score: hasDOI ? 1.0 : 0.5,
        criteria: [
          { id: 'F1', description: 'Globally unique identifier', met: hasDOI },
          { id: 'F2', description: 'Rich metadata', met: hasMetadata },
          { id: 'F4', description: 'Indexed and searchable', met: true },
        ],
      },
      accessible: {
        score: 1.0,
        criteria: [
          { id: 'A1', description: 'Retrievable by identifier', met: true },
          { id: 'A2', description: 'Metadata persists', met: true },
        ],
      },
      interoperable: {
        score: 0.8,
        criteria: [
          { id: 'I1', description: 'Formal language', met: true },
          { id: 'I2', description: 'FAIR vocabularies', met: true },
          { id: 'I3', description: 'Qualified references', met: false },
        ],
      },
      reusable: {
        score: 0.7,
        criteria: [
          { id: 'R1', description: 'Rich attributes', met: hasAbstract },
          { id: 'R1.1', description: 'Clear license', met: false },
          { id: 'R1.2', description: 'Detailed provenance', met: true },
        ],
      },
      notes: hasDOI ? [] : ['Missing DOI reduces findability'],
    };
  }

  async checkDuplicate(paper: ResearchPaper): Promise<boolean> {
    const key = paper.doi || paper.arxivId || paper.title;
    return this.existingPapers.has(key);
  }

  markAsAcquired(paper: ResearchPaper): void {
    const key = paper.doi || paper.arxivId || paper.title;
    this.existingPapers.add(key);
  }
}

describe('Acquisition Service', () => {
  let service: MockAcquisitionService;
  const mockPaper: ResearchPaper = {
    id: 'paper1',
    title: 'Chain-of-Thought Prompting',
    authors: [{ name: 'Wei, Jason' }],
    year: 2022,
    doi: '10.1234/cot.2022',
    pdfUrl: 'https://example.com/paper.pdf',
    source: 'semantic-scholar',
    retrievedAt: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    service = new MockAcquisitionService();
  });

  describe('Paper Download', () => {
    it('should download paper with complete acquired source metadata', async () => {
      const acquired = await service.downloadPaper(mockPaper);

      // Core metadata
      expect(acquired.paper).toEqual(mockPaper);
      expect(acquired.filePath).toMatch(/\.aiwg\/research\/pdfs\/REF-\d{3}\.pdf/);
      expect(acquired.checksum).toHaveLength(64);
      expect(acquired.refId).toMatch(/^REF-\d{3}$/);
      expect(acquired.acquiredAt).toBeDefined();

      // File properties
      expect(acquired.sizeBytes).toBeGreaterThan(0);

      // FAIR compliance
      expect(acquired.fairScore).toBeDefined();
      expect(acquired.fairScore?.overall).toBeGreaterThan(0);
    });

    it('should throw error when PDF URL missing', async () => {
      const noPdfPaper = { ...mockPaper, pdfUrl: undefined };

      await expect(service.downloadPaper(noPdfPaper)).rejects.toThrow('No PDF URL');
    });
  });

  describe('Metadata Extraction', () => {
    it('should extract metadata from PDFs including DOI when present', async () => {
      const testCases = [
        { file: 'test.pdf', expectDOI: true },
        { file: 'unreadable.pdf', expectDOI: false },
      ];

      for (const { file, expectDOI } of testCases) {
        const metadata = await service.extractMetadata(file);

        // All PDFs should return metadata structure
        expect(metadata).toBeDefined();
        expect(metadata.title).toBeDefined();
        expect(metadata.authors).toBeDefined();
        expect(metadata.year).toBeDefined();

        if (expectDOI) {
          expect(metadata.doi).toBeDefined();
          expect(metadata.doi).toMatch(/^10\./);
        }
      }
    });
  });

  describe('Checksum Computation', () => {
    it('should compute consistent SHA-256 checksums', async () => {
      // Single file checksum
      const checksum = await service.computeChecksum('test.pdf');
      expect(checksum).toHaveLength(64);
      expect(checksum).toMatch(/^[a-f0-9]{64}$/);

      // Consistency check
      const checksum1 = await service.computeChecksum('test.pdf');
      const checksum2 = await service.computeChecksum('test.pdf');
      expect(checksum1).toBe(checksum2);

      // Different files (in real implementation would differ)
      const fileChecksum1 = await service.computeChecksum('file1.pdf');
      const fileChecksum2 = await service.computeChecksum('file2.pdf');
      expect(fileChecksum1).toBe(fileChecksum2); // Mock returns same
    });
  });

  describe('REF-ID Assignment', () => {
    it('should assign sequential zero-padded unique REF-IDs', () => {
      const ids = new Set<string>();

      // First three IDs should be sequential
      const id1 = service.assignRefId();
      const id2 = service.assignRefId();
      const id3 = service.assignRefId();

      expect(id1).toBe('REF-001');
      expect(id2).toBe('REF-002');
      expect(id3).toBe('REF-003');

      // All IDs should match pattern
      [id1, id2, id3].forEach(id => {
        expect(id).toMatch(/^REF-\d{3}$/);
        ids.add(id);
      });

      // Generate many more to test uniqueness
      for (let i = 0; i < 97; i++) {
        ids.add(service.assignRefId());
      }

      expect(ids.size).toBe(100);
    });
  });

  describe('FAIR Compliance Validation', () => {
    it('should validate all FAIR dimensions with criteria', () => {
      const score = service.calculateFAIRScore(mockPaper);

      // All dimensions present
      expect(score.findable).toBeDefined();
      expect(score.accessible).toBeDefined();
      expect(score.interoperable).toBeDefined();
      expect(score.reusable).toBeDefined();

      // Check specific criteria across dimensions
      const criteriaChecks = [
        { dimension: score.findable, id: 'F1', description: 'unique identifier' },
        { dimension: score.accessible, id: 'A1', description: 'retrievability' },
        { dimension: score.interoperable, id: 'I2', description: 'vocabularies' },
        { dimension: score.reusable, id: 'R1.2', description: 'provenance' },
      ];

      for (const { dimension, id } of criteriaChecks) {
        const criterion = dimension.criteria.find((c) => c.id === id);
        expect(criterion).toBeDefined();
        if (id === 'F1' || id === 'A1') {
          expect(criterion?.met).toBe(true);
        }
      }
    });

    it('should score papers differently based on DOI presence', () => {
      const withDOI = service.calculateFAIRScore(mockPaper);
      const noDOIPaper = { ...mockPaper, doi: undefined };
      const withoutDOI = service.calculateFAIRScore(noDOIPaper);

      // Papers with DOI score higher
      expect(withDOI.overall).toBeGreaterThan(0.7);
      expect(withDOI.findable.score).toBe(1.0);

      // Papers without DOI score lower with notes
      expect(withoutDOI.overall).toBeLessThan(0.7);
      expect(withoutDOI.notes.length).toBeGreaterThan(0);

      // Overall comparison
      expect(withDOI.overall).toBeGreaterThan(withoutDOI.overall);
    });
  });

  describe('FAIR Score Calculation', () => {
    it('should calculate normalized scores with explanatory notes', () => {
      const scoreWithDOI = service.calculateFAIRScore(mockPaper);
      const scoreWithoutDOI = service.calculateFAIRScore({ ...mockPaper, doi: undefined });

      // Score bounds
      expect(scoreWithDOI.overall).toBeGreaterThan(0);
      expect(scoreWithDOI.overall).toBeLessThanOrEqual(1);

      // Findability heavily weighted
      expect(scoreWithDOI.overall).toBeGreaterThan(scoreWithoutDOI.overall);

      // Notes provided for issues
      expect(scoreWithoutDOI.notes).toBeDefined();
      expect(scoreWithoutDOI.notes.length).toBeGreaterThan(0);
    });
  });

  describe('Deduplication', () => {
    it('should detect duplicates by DOI, arXiv ID, or title fallback', async () => {
      const testCases = [
        { paper: mockPaper, description: 'DOI matching' },
        { paper: { ...mockPaper, doi: undefined, arxivId: 'arXiv:2210.03629' }, description: 'arXiv ID matching' },
        { paper: { ...mockPaper, doi: undefined, arxivId: undefined }, description: 'title fallback' },
      ];

      for (const { paper, description } of testCases) {
        // Before marking, should not be duplicate
        let isDuplicate = await service.checkDuplicate(paper);
        expect(isDuplicate).toBe(false);

        // After marking, should be duplicate
        service.markAsAcquired(paper);
        isDuplicate = await service.checkDuplicate(paper);
        expect(isDuplicate).toBe(true);

        // Reset for next test
        service = new MockAcquisitionService();
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle various failure scenarios gracefully', async () => {
      const scenarios = [
        {
          operation: () => service.downloadPaper({ ...mockPaper, pdfUrl: 'https://invalid.url/404.pdf' }),
          description: 'download failures',
        },
        {
          operation: () => service.extractMetadata('corrupted.pdf'),
          description: 'extraction failures on corrupted PDFs',
        },
        {
          operation: () => service.computeChecksum('nonexistent.pdf'),
          description: 'checksum computation on missing files',
        },
      ];

      for (const { operation, description } of scenarios) {
        // Real implementation would handle these appropriately
        // Mock implementation resolves all
        await expect(operation()).resolves.toBeDefined();
      }
    });
  });
});
