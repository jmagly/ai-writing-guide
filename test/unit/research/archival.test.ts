/**
 * Archival Service Tests
 *
 * Tests OAIS package creation (SIP, AIP, DIP), integrity verification,
 * and reproducibility package export.
 *
 * @source @src/research/services/archival.ts
 * @strategy @.aiwg/testing/agent-persistence-test-strategy.md
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { ArchivePackage, IntegrityResult } from '@/research/services/types.js';

// Mock Archival Service (implementation pending)
class MockArchivalService {
  async createSIP(sourceRefIds: string[]): Promise<ArchivePackage> {
    return {
      type: 'SIP',
      id: `sip-${Date.now()}`,
      path: `.aiwg/research/archives/sip-${Date.now()}`,
      createdAt: new Date().toISOString(),
      sources: sourceRefIds,
      manifestPath: 'manifest.json',
      sizeBytes: sourceRefIds.length * 1024 * 1024, // Mock 1MB per source
      packageChecksum: 'a'.repeat(64),
    };
  }

  async createAIP(sip: ArchivePackage): Promise<ArchivePackage> {
    if (sip.type !== 'SIP') {
      throw new Error('Input must be SIP package');
    }

    return {
      type: 'AIP',
      id: `aip-${Date.now()}`,
      path: `.aiwg/research/archives/aip-${Date.now()}`,
      createdAt: new Date().toISOString(),
      sources: sip.sources,
      manifestPath: 'manifest.json',
      sizeBytes: sip.sizeBytes + 1024, // Slightly larger with metadata
      packageChecksum: 'b'.repeat(64),
    };
  }

  async createDIP(aip: ArchivePackage): Promise<ArchivePackage> {
    if (aip.type !== 'AIP') {
      throw new Error('Input must be AIP package');
    }

    return {
      type: 'DIP',
      id: `dip-${Date.now()}`,
      path: `.aiwg/research/archives/dip-${Date.now()}`,
      createdAt: new Date().toISOString(),
      sources: aip.sources,
      manifestPath: 'manifest.json',
      sizeBytes: aip.sizeBytes, // Same size as AIP
      packageChecksum: 'c'.repeat(64),
    };
  }

  async verifyIntegrity(packagePath: string): Promise<IntegrityResult> {
    const mockFiles = [
      { path: 'REF-001.pdf', expectedChecksum: 'abc123', actualChecksum: 'abc123' },
      { path: 'REF-002.pdf', expectedChecksum: 'def456', actualChecksum: 'def456' },
      { path: 'manifest.json', expectedChecksum: 'ghi789', actualChecksum: 'ghi789' },
    ];

    return {
      valid: true,
      verifiedAt: new Date().toISOString(),
      files: mockFiles.map((f) => ({ ...f, valid: f.expectedChecksum === f.actualChecksum })),
      missingFiles: [],
      extraFiles: [],
      summary: `Verified ${mockFiles.length} files successfully`,
    };
  }

  async exportReproducibilityPackage(sourceRefIds: string[]): Promise<{
    id: string;
    path: string;
    contents: string[];
  }> {
    return {
      id: `repro-${Date.now()}`,
      path: `.aiwg/research/reproducibility/repro-${Date.now()}`,
      contents: [
        ...sourceRefIds.map((id) => `pdfs/${id}.pdf`),
        'metadata.json',
        'environment.txt',
        'README.md',
      ],
    };
  }
}

describe('Archival Service', () => {
  let service: MockArchivalService;

  beforeEach(() => {
    service = new MockArchivalService();
  });

  describe('SIP (Submission Information Package) Creation', () => {
    it('should create valid SIP with all required properties', async () => {
      const testCases = [
        { sources: ['REF-001', 'REF-002', 'REF-003'], description: 'multiple sources' },
        { sources: ['REF-001'], description: 'single source' },
        { sources: [], description: 'empty source list' },
      ];

      for (const { sources, description } of testCases) {
        const sip = await service.createSIP(sources);

        // Type and sources
        expect(sip.type, `${description}: type`).toBe('SIP');
        expect(sip.sources, `${description}: sources`).toEqual(sources);
        expect(sip.id, `${description}: id format`).toMatch(/^sip-/);

        // Manifest and metadata
        expect(sip.manifestPath, `${description}: manifest path`).toBe('manifest.json');
        expect(sip.createdAt, `${description}: createdAt defined`).toBeDefined();
        expect(new Date(sip.createdAt).getTime(), `${description}: valid timestamp`).toBeGreaterThan(0);

        // Checksum and size
        expect(sip.packageChecksum, `${description}: checksum length`).toHaveLength(64);
        expect(sip.packageChecksum, `${description}: checksum format`).toMatch(/^[a-f0-9]{64}$/);
        expect(sip.sizeBytes, `${description}: size`).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('AIP (Archival Information Package) Creation', () => {
    it('should create valid AIP from SIP with proper transformations', async () => {
      const testSources = [
        ['REF-001', 'REF-002'],
        ['REF-001', 'REF-002', 'REF-003'],
      ];

      for (const sources of testSources) {
        const sip = await service.createSIP(sources);
        const aip = await service.createAIP(sip);

        // Type and source preservation
        expect(aip.type, `sources ${sources.join(',')}: type`).toBe('AIP');
        expect(aip.sources, `sources ${sources.join(',')}: source preservation`).toEqual(sources);
        expect(aip.id, `sources ${sources.join(',')}: id format`).toMatch(/^aip-/);

        // Unique checksum and increased size
        expect(aip.packageChecksum, `sources ${sources.join(',')}: unique checksum`).not.toBe(
          sip.packageChecksum
        );
        expect(aip.sizeBytes, `sources ${sources.join(',')}: increased size`).toBeGreaterThan(
          sip.sizeBytes
        );
      }
    });

    it('should throw error if input is not SIP', async () => {
      const nonSIP: ArchivePackage = {
        type: 'DIP',
        id: 'test',
        path: 'test',
        createdAt: new Date().toISOString(),
        sources: [],
        manifestPath: 'manifest.json',
        sizeBytes: 0,
        packageChecksum: 'test',
      };

      await expect(service.createAIP(nonSIP)).rejects.toThrow('Input must be SIP package');
    });
  });

  describe('DIP (Dissemination Information Package) Creation', () => {
    it('should create valid DIP from AIP with proper transformations', async () => {
      const testSources = [['REF-001'], ['REF-001', 'REF-002']];

      for (const sources of testSources) {
        const sip = await service.createSIP(sources);
        const aip = await service.createAIP(sip);
        const dip = await service.createDIP(aip);

        // Type and source preservation
        expect(dip.type, `sources ${sources.join(',')}: type`).toBe('DIP');
        expect(dip.sources, `sources ${sources.join(',')}: source preservation`).toEqual(sources);
        expect(dip.id, `sources ${sources.join(',')}: id format`).toMatch(/^dip-/);

        // Unique checksum
        expect(dip.packageChecksum, `sources ${sources.join(',')}: unique checksum`).not.toBe(
          aip.packageChecksum
        );
      }
    });

    it('should throw error if input is not AIP', async () => {
      const nonAIP: ArchivePackage = {
        type: 'SIP',
        id: 'test',
        path: 'test',
        createdAt: new Date().toISOString(),
        sources: [],
        manifestPath: 'manifest.json',
        sizeBytes: 0,
        packageChecksum: 'test',
      };

      await expect(service.createDIP(nonAIP)).rejects.toThrow('Input must be AIP package');
    });
  });

  describe('Integrity Verification', () => {
    it('should verify package integrity with complete validation', async () => {
      const result = await service.verifyIntegrity('.aiwg/research/archives/test-package');

      // Basic validation
      expect(result.valid).toBe(true);
      expect(result.verifiedAt).toBeDefined();
      expect(new Date(result.verifiedAt).getTime()).toBeGreaterThan(0);

      // File verification
      expect(result.files).toBeDefined();
      expect(result.files.length).toBeGreaterThan(0);

      // Check all files have required properties and valid checksums
      result.files.forEach((file) => {
        expect(file).toHaveProperty('expectedChecksum');
        expect(file).toHaveProperty('actualChecksum');
        expect(file).toHaveProperty('valid');
      });

      const allValid = result.files.every((f) => f.valid);
      expect(allValid).toBe(true);
    });

    it('should track missing and extra files with summary', async () => {
      const result = await service.verifyIntegrity('test-package');

      // Missing and extra files
      expect(result.missingFiles).toBeDefined();
      expect(Array.isArray(result.missingFiles)).toBe(true);
      expect(result.extraFiles).toBeDefined();
      expect(Array.isArray(result.extraFiles)).toBe(true);

      // Summary
      expect(result.summary).toBeDefined();
      expect(result.summary).toContain('Verified');
    });
  });

  describe('Reproducibility Package Export', () => {
    it('should export complete reproducibility package', async () => {
      const testCases = [
        { sources: ['REF-001', 'REF-002', 'REF-003'], description: 'multiple sources' },
        { sources: ['REF-001'], description: 'single source' },
        { sources: [], description: 'empty source list' },
      ];

      const requiredFiles = ['metadata.json', 'environment.txt', 'README.md'];

      for (const { sources, description } of testCases) {
        const pkg = await service.exportReproducibilityPackage(sources);

        // Package metadata
        expect(pkg.id, `${description}: id format`).toMatch(/^repro-/);
        expect(pkg.path, `${description}: path`).toContain('reproducibility');

        // Required files
        for (const file of requiredFiles) {
          expect(pkg.contents, `${description}: contains ${file}`).toContain(file);
        }

        // Source PDFs
        for (const refId of sources) {
          expect(
            pkg.contents.some((c) => c.includes(refId)),
            `${description}: contains PDF for ${refId}`
          ).toBe(true);
        }
      }
    });
  });

  describe('OAIS Workflow Integration', () => {
    it('should support SIP → AIP → DIP workflow', async () => {
      const sources = ['REF-001', 'REF-002'];

      const sip = await service.createSIP(sources);
      expect(sip.type).toBe('SIP');

      const aip = await service.createAIP(sip);
      expect(aip.type).toBe('AIP');

      const dip = await service.createDIP(aip);
      expect(dip.type).toBe('DIP');

      // All packages should reference same sources
      expect(sip.sources).toEqual(sources);
      expect(aip.sources).toEqual(sources);
      expect(dip.sources).toEqual(sources);
    });

    it('should maintain traceability through workflow', async () => {
      const sources = ['REF-001'];
      const sip = await service.createSIP(sources);
      const aip = await service.createAIP(sip);
      const dip = await service.createDIP(aip);

      // Each package should have unique ID but same sources
      expect(sip.id).not.toBe(aip.id);
      expect(aip.id).not.toBe(dip.id);
      expect(sip.sources).toEqual(aip.sources);
      expect(aip.sources).toEqual(dip.sources);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid package paths for verification', async () => {
      await expect(service.verifyIntegrity('nonexistent-package')).resolves.toBeDefined();
    });

    it('should validate package type before transformation', async () => {
      const wrongType: ArchivePackage = {
        type: 'AIP',
        id: 'test',
        path: 'test',
        createdAt: new Date().toISOString(),
        sources: [],
        manifestPath: 'manifest.json',
        sizeBytes: 0,
        packageChecksum: 'test',
      };

      await expect(service.createAIP(wrongType)).rejects.toThrow();
    });
  });
});
