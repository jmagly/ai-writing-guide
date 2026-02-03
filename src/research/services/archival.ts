/**
 * Archival service for OAIS-compliant packaging
 *
 * @module research/services/archival
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { createHash } from 'crypto';
import { AcquiredSource, ArchivePackage, IntegrityResult } from './types.js';

/**
 * Configuration for archival service
 */
export interface ArchivalConfig {
  /** Archive directory */
  archiveDir?: string;
  /** Package format version */
  formatVersion?: string;
}

/**
 * Archival service for OAIS package management
 */
export class ArchivalService {
  private archiveDir: string;
  private formatVersion: string;

  constructor(config: ArchivalConfig = {}) {
    this.archiveDir = config.archiveDir || '.aiwg/research/archives';
    this.formatVersion = config.formatVersion || '1.0';
  }

  /**
   * Create OAIS archive package
   */
  async createPackage(
    sources: AcquiredSource[],
    type: 'SIP' | 'AIP' | 'DIP'
  ): Promise<ArchivePackage> {
    const id = this.generatePackageId(type);
    const packagePath = join(this.archiveDir, type.toLowerCase(), id);

    // Create package directory
    await this.ensureDir(packagePath);

    // Create subdirectories
    await this.ensureDir(join(packagePath, 'data'));
    await this.ensureDir(join(packagePath, 'metadata'));

    // Copy source files and metadata
    const refIds: string[] = [];
    const manifestEntries: Array<{
      refId: string;
      originalPath: string;
      packagePath: string;
      checksum: string;
      sizeBytes: number;
    }> = [];

    for (const source of sources) {
      refIds.push(source.refId);

      // Copy PDF to package
      const destPath = join(packagePath, 'data', `${source.refId}.pdf`);
      await fs.copyFile(source.filePath, destPath);

      // Create metadata file
      const metadataPath = join(
        packagePath,
        'metadata',
        `${source.refId}.json`
      );
      await fs.writeFile(
        metadataPath,
        JSON.stringify(
          {
            paper: source.paper,
            refId: source.refId,
            acquiredAt: source.acquiredAt,
            originalChecksum: source.checksum,
          },
          null,
          2
        ),
        'utf-8'
      );

      manifestEntries.push({
        refId: source.refId,
        originalPath: source.filePath,
        packagePath: destPath,
        checksum: source.checksum,
        sizeBytes: source.sizeBytes,
      });
    }

    // Create manifest
    const manifestPath = join(packagePath, 'manifest.json');
    const manifest = {
      packageId: id,
      packageType: type,
      formatVersion: this.formatVersion,
      createdAt: new Date().toISOString(),
      sourceCount: sources.length,
      entries: manifestEntries,
    };

    await fs.writeFile(
      manifestPath,
      JSON.stringify(manifest, null, 2),
      'utf-8'
    );

    // Calculate total size
    let totalSize = 0;
    for (const entry of manifestEntries) {
      totalSize += entry.sizeBytes;
    }

    // Compute package checksum
    const packageChecksum = await this.computeDirectoryChecksum(packagePath);

    const archivePackage: ArchivePackage = {
      type,
      id,
      path: packagePath,
      createdAt: new Date().toISOString(),
      sources: refIds,
      manifestPath,
      sizeBytes: totalSize,
      packageChecksum,
    };

    return archivePackage;
  }

  /**
   * Verify integrity of archive package
   */
  async verifyIntegrity(packagePath: string): Promise<IntegrityResult> {
    const manifestPath = join(packagePath, 'manifest.json');

    // Load manifest
    let manifest: {
      entries: Array<{
        refId: string;
        packagePath: string;
        checksum: string;
      }>;
    };

    try {
      const data = await fs.readFile(manifestPath, 'utf-8');
      manifest = JSON.parse(data);
    } catch (error) {
      return {
        valid: false,
        verifiedAt: new Date().toISOString(),
        files: [],
        missingFiles: [],
        extraFiles: [],
        summary: 'Failed to load manifest',
      };
    }

    const fileResults: Array<{
      path: string;
      expectedChecksum: string;
      actualChecksum: string;
      valid: boolean;
    }> = [];

    const missingFiles: string[] = [];
    const expectedFiles = new Set<string>();

    // Verify each file in manifest
    for (const entry of manifest.entries) {
      expectedFiles.add(entry.packagePath);

      try {
        const actualChecksum = await this.computeChecksum(entry.packagePath);
        const valid = actualChecksum === entry.checksum;

        fileResults.push({
          path: entry.packagePath,
          expectedChecksum: entry.checksum,
          actualChecksum,
          valid,
        });
      } catch (error) {
        missingFiles.push(entry.packagePath);
        fileResults.push({
          path: entry.packagePath,
          expectedChecksum: entry.checksum,
          actualChecksum: '',
          valid: false,
        });
      }
    }

    // Check for extra files
    const actualFiles = await this.listFilesRecursive(
      join(packagePath, 'data')
    );
    const extraFiles = actualFiles.filter((f) => !expectedFiles.has(f));

    const allValid =
      fileResults.every((f) => f.valid) &&
      missingFiles.length === 0 &&
      extraFiles.length === 0;

    const summary = allValid
      ? 'Package integrity verified'
      : `Integrity check failed: ${fileResults.filter((f) => !f.valid).length} invalid, ${missingFiles.length} missing, ${extraFiles.length} extra`;

    return {
      valid: allValid,
      verifiedAt: new Date().toISOString(),
      files: fileResults,
      missingFiles,
      extraFiles,
      summary,
    };
  }

  /**
   * Export reproducibility package for workflow
   */
  async exportReproducibilityPackage(workflowId: string): Promise<string> {
    const exportPath = join(
      this.archiveDir,
      'reproducibility',
      `${workflowId}-${Date.now()}.zip`
    );

    await this.ensureDir(dirname(exportPath));

    // Create a simple marker file (full implementation would create ZIP)
    await fs.writeFile(
      exportPath.replace('.zip', '.txt'),
      `Reproducibility package for workflow ${workflowId}\nCreated: ${new Date().toISOString()}`,
      'utf-8'
    );

    return exportPath;
  }

  /**
   * Compute checksum of file
   */
  private async computeChecksum(filePath: string): Promise<string> {
    const content = await fs.readFile(filePath);
    const hash = createHash('sha256');
    hash.update(content);
    return hash.digest('hex');
  }

  /**
   * Compute checksum of directory contents
   */
  private async computeDirectoryChecksum(dirPath: string): Promise<string> {
    const files = await this.listFilesRecursive(dirPath);
    files.sort(); // Ensure consistent ordering

    const hash = createHash('sha256');

    for (const file of files) {
      const content = await fs.readFile(file);
      hash.update(content);
    }

    return hash.digest('hex');
  }

  /**
   * List all files recursively
   */
  private async listFilesRecursive(dirPath: string): Promise<string[]> {
    const files: string[] = [];

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dirPath, entry.name);

        if (entry.isDirectory()) {
          const subFiles = await this.listFilesRecursive(fullPath);
          files.push(...subFiles);
        } else {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Directory doesn't exist
    }

    return files;
  }

  /**
   * Generate package ID
   */
  private generatePackageId(type: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `${type.toLowerCase()}-${timestamp}`;
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
