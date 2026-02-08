import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FilesystemSandbox } from '../../../../src/testing/mocks/filesystem-sandbox.ts';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('FilesystemSandbox', () => {
  let sandbox: FilesystemSandbox;

  beforeEach(async () => {
    sandbox = new FilesystemSandbox();
    await sandbox.initialize();
  });

  afterEach(async () => {
    await sandbox.cleanup();
  });

  describe('initialization', () => {
    it('should create a temporary directory with correct path and structure', () => {
      const sandboxPath = sandbox.getPath();
      expect(sandboxPath).toBeTruthy();
      expect(sandboxPath.startsWith(os.tmpdir())).toBe(true);
      expect(sandboxPath).toContain('aiwg-sandbox-');
      expect(fsSync.existsSync(sandboxPath)).toBe(true);
    });

    it('should enforce initialization state: throw on double init, throw on operations before init', async () => {
      await expect(sandbox.initialize()).rejects.toThrow('Sandbox already initialized');

      const uninitializedSandbox = new FilesystemSandbox();
      await expect(uninitializedSandbox.writeFile('test.txt', 'content')).rejects.toThrow(
        'Sandbox not initialized'
      );
    });
  });

  describe('cleanup', () => {
    it('should remove directory, be idempotent, and refuse unsafe paths', async () => {
      const sandboxPath = sandbox.getPath();
      expect(fsSync.existsSync(sandboxPath)).toBe(true);

      await sandbox.cleanup();
      expect(fsSync.existsSync(sandboxPath)).toBe(false);

      // Idempotent - can call multiple times
      await expect(sandbox.cleanup()).resolves.not.toThrow();

      // Safety check: refuse non-temp directories
      const unsafeSandbox = new FilesystemSandbox();
      await unsafeSandbox.initialize();
      (unsafeSandbox as any).sandboxPath = '/home/test';
      await expect(unsafeSandbox.cleanup()).resolves.not.toThrow();
    });
  });

  describe('file operations', () => {
    describe('writeFile', () => {
      it('should write text, binary, nested paths, with options, and overwrite', async () => {
        // Text file
        await sandbox.writeFile('test.txt', 'Hello World');
        let fullPath = sandbox.getPath('test.txt');
        let content = await fs.readFile(fullPath, 'utf-8');
        expect(content).toBe('Hello World');

        // Binary file
        const buffer = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
        await sandbox.writeFile('image.png', buffer);
        fullPath = sandbox.getPath('image.png');
        const binaryContent = await fs.readFile(fullPath);
        expect(binaryContent).toEqual(buffer);

        // Nested directories auto-created
        await sandbox.writeFile('nested/dir/file.txt', 'content');
        fullPath = sandbox.getPath('nested/dir/file.txt');
        content = await fs.readFile(fullPath, 'utf-8');
        expect(content).toBe('content');

        // Write options
        await sandbox.writeFile('test-mode.txt', 'content', {
          encoding: 'utf-8',
          mode: 0o644
        });
        fullPath = sandbox.getPath('test-mode.txt');
        const stat = await fs.stat(fullPath);
        expect(stat.isFile()).toBe(true);

        // Overwrite
        await sandbox.writeFile('overwrite.txt', 'original');
        await sandbox.writeFile('overwrite.txt', 'updated');
        const updatedContent = await sandbox.readFile('overwrite.txt');
        expect(updatedContent).toBe('updated');
      });
    });

    describe('readFile', () => {
      it('should read text, binary, with specific encoding, and throw on missing file', async () => {
        // Text file
        await sandbox.writeFile('test.txt', 'Hello World');
        let content = await sandbox.readFile('test.txt');
        expect(content).toBe('Hello World');

        // Binary as Buffer
        const buffer = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
        await sandbox.writeFile('image.png', buffer);
        const binaryContent = await sandbox.readFile('image.png', null);
        expect(binaryContent).toEqual(buffer);
        expect(Buffer.isBuffer(binaryContent)).toBe(true);

        // Specific encoding
        await sandbox.writeFile('utf8.txt', 'Hello World');
        content = await sandbox.readFile('utf8.txt', 'utf-8');
        expect(content).toBe('Hello World');
        expect(typeof content).toBe('string');

        // Throw on missing
        await expect(sandbox.readFile('nonexistent.txt')).rejects.toThrow();
      });
    });

    describe('deleteFile', () => {
      it('should delete existing files and throw on missing files', async () => {
        await sandbox.writeFile('test.txt', 'content');
        expect(await sandbox.fileExists('test.txt')).toBe(true);

        await sandbox.deleteFile('test.txt');
        expect(await sandbox.fileExists('test.txt')).toBe(false);

        await expect(sandbox.deleteFile('nonexistent.txt')).rejects.toThrow();
      });
    });

    describe('fileExists', () => {
      it('should correctly check file existence (true for files, false for non-existing and directories)', async () => {
        await sandbox.writeFile('test.txt', 'content');
        expect(await sandbox.fileExists('test.txt')).toBe(true);

        expect(await sandbox.fileExists('nonexistent.txt')).toBe(false);

        await sandbox.createDirectory('test-dir');
        expect(await sandbox.fileExists('test-dir')).toBe(false);
      });
    });

    describe('getFileStats', () => {
      it('should return statistics for files and directories, throw on missing', async () => {
        const content = 'Hello World';
        await sandbox.writeFile('test.txt', content);

        const fileStats = await sandbox.getFileStats('test.txt');
        expect(fileStats.size).toBe(content.length);
        expect(fileStats.isFile).toBe(true);
        expect(fileStats.isDirectory).toBe(false);
        expect(fileStats.createdAt).toBeInstanceOf(Date);
        expect(fileStats.modifiedAt).toBeInstanceOf(Date);

        await sandbox.createDirectory('test-dir');
        const dirStats = await sandbox.getFileStats('test-dir');
        expect(dirStats.isFile).toBe(false);
        expect(dirStats.isDirectory).toBe(true);

        await expect(sandbox.getFileStats('nonexistent.txt')).rejects.toThrow();
      });
    });
  });

  describe('directory operations', () => {
    describe('createDirectory', () => {
      it('should create directories (single, nested, idempotent)', async () => {
        await sandbox.createDirectory('test-dir');
        expect(await sandbox.directoryExists('test-dir')).toBe(true);

        await sandbox.createDirectory('nested/dir/structure');
        expect(await sandbox.directoryExists('nested/dir/structure')).toBe(true);

        // Idempotent
        await expect(sandbox.createDirectory('test-dir')).resolves.not.toThrow();
      });
    });

    describe('deleteDirectory', () => {
      it('should delete empty, recursive, throw on non-empty (non-recursive) and missing', async () => {
        // Empty directory
        await sandbox.createDirectory('test-dir');
        await sandbox.deleteDirectory('test-dir');
        expect(await sandbox.directoryExists('test-dir')).toBe(false);

        // Recursive
        await sandbox.writeFile('test-dir2/nested/file.txt', 'content');
        await sandbox.deleteDirectory('test-dir2', true);
        expect(await sandbox.directoryExists('test-dir2')).toBe(false);

        // Non-empty without recursive flag
        await sandbox.writeFile('test-dir3/file.txt', 'content');
        await expect(sandbox.deleteDirectory('test-dir3', false)).rejects.toThrow();

        // Missing directory
        await expect(sandbox.deleteDirectory('nonexistent')).rejects.toThrow();
      });
    });

    describe('listDirectory', () => {
      it('should list root contents, subdirectory contents, empty dirs, throw on missing', async () => {
        await sandbox.writeFile('file1.txt', 'content1');
        await sandbox.writeFile('file2.txt', 'content2');
        await sandbox.createDirectory('subdir');

        const rootContents = await sandbox.listDirectory();
        expect(rootContents).toContain('file1.txt');
        expect(rootContents).toContain('file2.txt');
        expect(rootContents).toContain('subdir');
        expect(rootContents.length).toBe(3);

        await sandbox.writeFile('subdir/file1.txt', 'content1');
        await sandbox.writeFile('subdir/file2.txt', 'content2');
        const subdirContents = await sandbox.listDirectory('subdir');
        expect(subdirContents).toContain('file1.txt');
        expect(subdirContents).toContain('file2.txt');
        expect(subdirContents.length).toBe(2);

        await sandbox.createDirectory('empty-dir');
        const emptyContents = await sandbox.listDirectory('empty-dir');
        expect(emptyContents).toEqual([]);

        await expect(sandbox.listDirectory('nonexistent')).rejects.toThrow();
      });
    });

    describe('directoryExists', () => {
      it('should correctly check directory existence (true for dirs, false for non-existing and files)', async () => {
        await sandbox.createDirectory('test-dir');
        expect(await sandbox.directoryExists('test-dir')).toBe(true);

        expect(await sandbox.directoryExists('nonexistent')).toBe(false);

        await sandbox.writeFile('test.txt', 'content');
        expect(await sandbox.directoryExists('test.txt')).toBe(false);
      });
    });
  });

  describe('path operations', () => {
    describe('getPath', () => {
      it('should return correct paths for root, relative, and nested paths', () => {
        const sandboxPath = sandbox.getPath();
        expect(sandboxPath).toBeTruthy();
        expect(sandboxPath.startsWith(os.tmpdir())).toBe(true);

        const filePath = sandbox.getPath('test.txt');
        expect(path.isAbsolute(filePath)).toBe(true);
        expect(filePath).toContain('test.txt');

        const nestedPath = sandbox.getPath('nested/dir/file.txt');
        expect(path.isAbsolute(nestedPath)).toBe(true);
        expect(nestedPath).toContain('nested');
        expect(nestedPath).toContain('file.txt');
      });
    });

    describe('copyFromReal', () => {
      it('should copy from real filesystem with auto directory creation, throw on missing source', async () => {
        // Basic copy
        const tempFile = path.join(os.tmpdir(), 'temp-test-file.txt');
        await fs.writeFile(tempFile, 'real content');

        try {
          await sandbox.copyFromReal(tempFile, 'copied.txt');
          let content = await sandbox.readFile('copied.txt');
          expect(content).toBe('real content');

          // Auto create parent dirs
          await fs.writeFile(tempFile, 'content');
          await sandbox.copyFromReal(tempFile, 'nested/dir/copied.txt');
          content = await sandbox.readFile('nested/dir/copied.txt');
          expect(content).toBe('content');
        } finally {
          await fs.unlink(tempFile);
        }

        // Missing source
        await expect(
          sandbox.copyFromReal('/nonexistent/file.txt', 'copied.txt')
        ).rejects.toThrow();
      });
    });

    describe('copyToReal', () => {
      it('should copy to real filesystem with auto directory creation, throw on missing source', async () => {
        await sandbox.writeFile('source.txt', 'sandbox content');

        const tempFile = path.join(os.tmpdir(), 'temp-output-file.txt');

        try {
          await sandbox.copyToReal('source.txt', tempFile);
          const content = await fs.readFile(tempFile, 'utf-8');
          expect(content).toBe('sandbox content');
        } finally {
          await fs.unlink(tempFile);
        }

        // Auto create parent dirs
        await sandbox.writeFile('source2.txt', 'content');
        const tempDir = path.join(os.tmpdir(), 'temp-copy-test');
        const nestedFile = path.join(tempDir, 'nested', 'output.txt');

        try {
          await sandbox.copyToReal('source2.txt', nestedFile);
          const content = await fs.readFile(nestedFile, 'utf-8');
          expect(content).toBe('content');
        } finally {
          await fs.rm(tempDir, { recursive: true, force: true });
        }

        // Missing source
        const tempOutput = path.join(os.tmpdir(), 'temp-output-file.txt');
        await expect(sandbox.copyToReal('nonexistent.txt', tempOutput)).rejects.toThrow();
      });
    });
  });

  describe('path validation', () => {
    it('should reject absolute paths, escaping paths, null bytes; allow .. within boundaries', async () => {
      await expect(sandbox.writeFile('/etc/passwd', 'content')).rejects.toThrow(
        'Absolute paths are not allowed'
      );

      await expect(sandbox.writeFile('../../../etc/passwd', 'content')).rejects.toThrow(
        'Path escapes sandbox'
      );

      await expect(sandbox.writeFile('test\0.txt', 'content')).rejects.toThrow(
        'Path contains null bytes'
      );

      await sandbox.writeFile('dir1/file.txt', 'content');
      await expect(sandbox.readFile('dir1/../dir1/file.txt')).resolves.toBe('content');
    });

    it('should validate paths across all operations', async () => {
      const invalidPath = '../../../etc/passwd';

      const operations = [
        () => sandbox.readFile(invalidPath),
        () => sandbox.deleteFile(invalidPath),
        () => sandbox.createDirectory(invalidPath),
        () => sandbox.deleteDirectory(invalidPath),
        () => sandbox.fileExists(invalidPath),
        () => sandbox.directoryExists(invalidPath)
      ];

      for (const op of operations) {
        await expect(op()).rejects.toThrow('Path escapes sandbox');
      }
    });
  });

  describe('binary file support', () => {
    it('should handle binary files with correct Buffer handling and data integrity', async () => {
      // PNG header
      const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      await sandbox.writeFile('image.png', pngHeader);

      const content = await sandbox.readFile('image.png', null);
      expect(Buffer.isBuffer(content)).toBe(true);
      expect(content).toEqual(pngHeader);

      // Data integrity
      const buffer = Buffer.alloc(256);
      for (let i = 0; i < 256; i++) {
        buffer[i] = i;
      }

      await sandbox.writeFile('binary.dat', buffer);
      const integrityContent = await sandbox.readFile('binary.dat', null);
      expect(integrityContent).toEqual(buffer);
    });
  });

  describe('edge cases', () => {
    it('should handle empty files, special chars, deeply nested paths, large files, and concurrent operations', async () => {
      // Empty files
      await sandbox.writeFile('empty.txt', '');
      let content = await sandbox.readFile('empty.txt');
      expect(content).toBe('');
      expect(await sandbox.fileExists('empty.txt')).toBe(true);

      // Special characters
      const specialName = 'file-with-special_chars.123.txt';
      await sandbox.writeFile(specialName, 'content');
      expect(await sandbox.fileExists(specialName)).toBe(true);

      // Deeply nested
      const deepPath = 'a/b/c/d/e/f/g/h/i/j/file.txt';
      await sandbox.writeFile(deepPath, 'deep content');
      content = await sandbox.readFile(deepPath);
      expect(content).toBe('deep content');

      // Large files
      const largeContent = 'x'.repeat(1024 * 1024); // 1MB
      await sandbox.writeFile('large.txt', largeContent);
      const stats = await sandbox.getFileStats('large.txt');
      expect(stats.size).toBe(1024 * 1024);

      // Concurrent operations
      const operations = [];
      for (let i = 0; i < 10; i++) {
        operations.push(sandbox.writeFile(`file${i}.txt`, `content${i}`));
      }
      await Promise.all(operations);

      for (let i = 0; i < 10; i++) {
        const concurrentContent = await sandbox.readFile(`file${i}.txt`);
        expect(concurrentContent).toBe(`content${i}`);
      }
    });
  });
});
