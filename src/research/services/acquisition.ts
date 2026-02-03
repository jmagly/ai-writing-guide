/**
 * Acquisition service for downloading and validating research papers
 *
 * @module research/services/acquisition
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { createHash } from 'crypto';
import { ResearchPaper } from '../types.js';
import { UnpaywallClient } from '../clients/unpaywall.js';
import { ArxivClient } from '../clients/arxiv.js';
import { AcquiredSource, FAIRScore } from './types.js';

/**
 * Configuration for acquisition service
 */
export interface AcquisitionConfig {
  /** Unpaywall client */
  unpaywall?: UnpaywallClient;
  /** arXiv client */
  arxiv?: ArxivClient;
  /** Download directory */
  downloadDir?: string;
  /** Timeout for downloads in ms */
  downloadTimeout?: number;
  /** Email for Unpaywall API */
  email?: string;
}

/**
 * Acquisition service for downloading research papers
 */
export class AcquisitionService {
  private unpaywall: UnpaywallClient;
  private arxiv: ArxivClient;
  private downloadDir: string;
  private downloadTimeout: number;

  constructor(config: AcquisitionConfig = {}) {
    this.unpaywall = config.unpaywall || new UnpaywallClient({ email: config.email });
    this.arxiv = config.arxiv || new ArxivClient();
    this.downloadDir = config.downloadDir || '.aiwg/research/sources';
    this.downloadTimeout = config.downloadTimeout || 300000; // 5 minutes
  }

  /**
   * Acquire a paper (download + metadata extraction)
   */
  async acquire(paper: ResearchPaper): Promise<AcquiredSource> {
    // Determine PDF URL
    let pdfUrl = paper.pdfUrl;

    if (!pdfUrl && paper.doi) {
      // Try to get open access PDF from Unpaywall
      const oaUrl = await this.unpaywall.checkOpenAccess(paper.doi);
      if (oaUrl) {
        pdfUrl = oaUrl;
      }
    }

    if (!pdfUrl) {
      throw new Error(`No PDF URL available for paper: ${paper.id}`);
    }

    // Download PDF
    const filename = this.generateFilename(paper);
    const filePath = join(this.downloadDir, filename);
    await this.ensureDir(dirname(filePath));
    await this.downloadFile(pdfUrl, filePath);

    // Compute checksum
    const checksum = await this.computeChecksum(filePath);

    // Get file size
    const stats = await fs.stat(filePath);
    const sizeBytes = stats.size;

    // Get next REF-XXX ID
    const refId = await this.assignRefId();

    // Validate FAIR compliance
    const fairScore = await this.validateFAIR({
      paper,
      filePath,
      checksum,
      refId,
      acquiredAt: new Date().toISOString(),
      sizeBytes,
    });

    const source: AcquiredSource = {
      paper,
      filePath,
      checksum,
      refId,
      acquiredAt: new Date().toISOString(),
      sizeBytes,
      fairScore,
    };

    return source;
  }

  /**
   * Compute SHA-256 checksum of a file
   */
  async computeChecksum(filePath: string): Promise<string> {
    const content = await fs.readFile(filePath);
    const hash = createHash('sha256');
    hash.update(content);
    return hash.digest('hex');
  }

  /**
   * Assign next REF-XXX identifier
   */
  async assignRefId(existingRefs?: string[]): Promise<string> {
    let refs = existingRefs;

    // If not provided, scan sources directory
    if (!refs) {
      refs = await this.scanExistingRefs();
    }

    // Extract numbers from REF-XXX format
    const refNumbers = refs
      .filter((ref) => /^REF-\d{3}$/.test(ref))
      .map((ref) => parseInt(ref.substring(4), 10))
      .filter((n) => !isNaN(n));

    // Find next available number
    const maxNumber = refNumbers.length > 0 ? Math.max(...refNumbers) : 0;
    const nextNumber = maxNumber + 1;

    // Format as REF-XXX with zero padding
    return `REF-${String(nextNumber).padStart(3, '0')}`;
  }

  /**
   * Validate FAIR compliance
   */
  async validateFAIR(source: AcquiredSource): Promise<FAIRScore> {
    const findable = this.assessFindable(source);
    const accessible = this.assessAccessible(source);
    const interoperable = this.assessInteroperable(source);
    const reusable = this.assessReusable(source);

    const overall =
      (findable.score +
        accessible.score +
        interoperable.score +
        reusable.score) / 4;

    const notes: string[] = [];

    if (findable.score < 1.0) {
      notes.push('Findability can be improved by adding more metadata');
    }
    if (accessible.score < 1.0) {
      notes.push('Accessibility requires proper file permissions');
    }
    if (interoperable.score < 1.0) {
      notes.push('Interoperability requires standard metadata format');
    }
    if (reusable.score < 1.0) {
      notes.push('Reusability requires license information');
    }

    return {
      overall,
      findable,
      accessible,
      interoperable,
      reusable,
      notes,
    };
  }

  /**
   * Assess Findable dimension
   */
  private assessFindable(source: AcquiredSource) {
    const criteria = [
      {
        id: 'F1',
        description: 'Assigned globally unique identifier (REF-XXX)',
        met: !!source.refId && /^REF-\d{3}$/.test(source.refId),
      },
      {
        id: 'F2',
        description: 'Data described with rich metadata',
        met: !!source.paper.title && source.paper.authors.length > 0,
      },
      {
        id: 'F3',
        description: 'Metadata includes identifier',
        met: !!(source.paper.doi || source.paper.arxivId),
      },
      {
        id: 'F4',
        description: 'Indexed in searchable resource',
        met: true, // Assumed for papers from APIs
      },
    ];

    const metCount = criteria.filter((c) => c.met).length;
    const score = metCount / criteria.length;

    return { score, criteria };
  }

  /**
   * Assess Accessible dimension
   */
  private assessAccessible(source: AcquiredSource) {
    const criteria = [
      {
        id: 'A1',
        description: 'Retrievable by identifier using standard protocol',
        met: !!source.filePath,
      },
      {
        id: 'A2',
        description: 'Metadata accessible even when data unavailable',
        met: true, // Paper metadata stored separately
      },
    ];

    const metCount = criteria.filter((c) => c.met).length;
    const score = metCount / criteria.length;

    return { score, criteria };
  }

  /**
   * Assess Interoperable dimension
   */
  private assessInteroperable(source: AcquiredSource) {
    const criteria = [
      {
        id: 'I1',
        description: 'Uses formal, accessible knowledge representation',
        met: true, // JSON metadata
      },
      {
        id: 'I2',
        description: 'Uses FAIR-compliant vocabularies',
        met: true, // Standard paper metadata fields
      },
      {
        id: 'I3',
        description: 'Includes qualified references to other data',
        met: !!(source.paper.doi || source.paper.arxivId),
      },
    ];

    const metCount = criteria.filter((c) => c.met).length;
    const score = metCount / criteria.length;

    return { score, criteria };
  }

  /**
   * Assess Reusable dimension
   */
  private assessReusable(source: AcquiredSource) {
    const criteria = [
      {
        id: 'R1',
        description: 'Described with accurate metadata',
        met: !!source.paper.abstract,
      },
      {
        id: 'R2',
        description: 'Detailed provenance',
        met: !!source.acquiredAt && !!source.paper.source,
      },
      {
        id: 'R3',
        description: 'Meets community standards',
        met: true, // Academic paper from recognized source
      },
    ];

    const metCount = criteria.filter((c) => c.met).length;
    const score = metCount / criteria.length;

    return { score, criteria };
  }

  /**
   * Download file from URL
   */
  private async downloadFile(url: string, destination: string): Promise<void> {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      this.downloadTimeout
    );

    try {
      const response = await fetch(url, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
      }

      const buffer = await response.arrayBuffer();
      await fs.writeFile(destination, Buffer.from(buffer));
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(
          `Download timeout after ${this.downloadTimeout}ms`
        );
      }

      throw error;
    }
  }

  /**
   * Generate filename for paper
   */
  private generateFilename(paper: ResearchPaper): string {
    // Use first author's last name if available
    let authorPart = 'unknown';
    if (paper.authors.length > 0) {
      const firstName = paper.authors[0].name;
      const parts = firstName.split(' ');
      authorPart = parts[parts.length - 1].toLowerCase();
    }

    // Use year
    const yearPart = paper.year || 'unknown';

    // Create slug from title (first 3 words)
    const titleWords = paper.title
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .slice(0, 3)
      .join('-');

    return `${authorPart}-${yearPart}-${titleWords}.pdf`;
  }

  /**
   * Scan existing REF-XXX identifiers
   */
  private async scanExistingRefs(): Promise<string[]> {
    const refs: string[] = [];

    try {
      const files = await fs.readdir(this.downloadDir);

      for (const file of files) {
        if (file.startsWith('REF-') && file.endsWith('.pdf')) {
          const refId = file.substring(0, 7); // REF-XXX
          refs.push(refId);
        }
      }
    } catch (error) {
      // Directory doesn't exist yet
    }

    return refs;
  }

  /**
   * Ensure directory exists
   */
  private async ensureDir(dir: string): Promise<void> {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw error;
      }
    }
  }
}
