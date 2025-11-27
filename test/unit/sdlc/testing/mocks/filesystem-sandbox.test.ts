import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FilesystemSandbox } from '../../../../../agentic/code/frameworks/sdlc-complete/src/testing/mocks/filesystem-sandbox.ts';
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
    it('should create a temporary directory', () => {
      const sandboxPath = sandbox.getPath();
      expect(sandboxPath).toBeTruthy();
      expect(sandboxPath.startsWith(os.tmpdir())).toBe(true);
      expect(sandboxPath).toContain('aiwg-sandbox-');
      expect(fsSync.existsSync(sandboxPath)).toBe(true);
    });

    it('should throw error if initialized twice', async () => {
      await expect(sandbox.initialize()).rejects.toThrow('Sandbox already initialized');
    });

    it('should throw error if operations called before initialization', async () => {
      const uninitializedSandbox = new FilesystemSandbox();
      await expect(uninitializedSandbox.writeFile('test.txt', 'content')).rejects.toThrow(
        'Sandbox not initialized'
      );
    });
  });

  describe('cleanup', () => {
    it('should remove the temporary directory', async () => {
      const sandboxPath = sandbox.getPath();
      expect(fsSync.existsSync(sandboxPath)).toBe(true);

      await sandbox.cleanup();
      expect(fsSync.existsSync(sandboxPath)).toBe(false);
    });

    it('should be safe to call cleanup multiple times', async () => {
      await sandbox.cleanup();
      await expect(sandbox.cleanup()).resolves.not.toThrow();
    });

    it('should refuse to cleanup non-temp directories', async () => {
      // Create a new sandbox with manipulated path (for testing safety)
      const unsafeSandbox = new FilesystemSandbox();
      await unsafeSandbox.initialize();

      // Manipulate the path to something outside temp (using object property access)
      (unsafeSandbox as any).sandboxPath = '/home/test';

      // Should fail gracefully (log error but not throw)
      await expect(unsafeSandbox.cleanup()).resolves.not.toThrow();
    });
  });

  describe('file operations', () => {
    describe('writeFile', () => {
      it('should write a text file', async () => {
        await sandbox.writeFile('test.txt', 'Hello World');

        const fullPath = sandbox.getPath('test.txt');
        const content = await fs.readFile(fullPath, 'utf-8');
        expect(content).toBe('Hello World');
      });

      it('should write a binary file', async () => {
        const buffer = Buffer.from([0x89, 0x50, 0x4e, 0x47]); // PNG header
        await sandbox.writeFile('image.png', buffer);

        const fullPath = sandbox.getPath('image.png');
        const content = await fs.readFile(fullPath);
        expect(content).toEqual(buffer);
      });

      it('should create parent directories automatically', async () => {
        await sandbox.writeFile('nested/dir/file.txt', 'content');

        const fullPath = sandbox.getPath('nested/dir/file.txt');
        const content = await fs.readFile(fullPath, 'utf-8');
        expect(content).toBe('content');
      });

      it('should support write options', async () => {
        await sandbox.writeFile('test.txt', 'content', {
          encoding: 'utf-8',
          mode: 0o644
        });

        const fullPath = sandbox.getPath('test.txt');
        const stat = await fs.stat(fullPath);
        expect(stat.isFile()).toBe(true);
      });

      it('should overwrite existing files', async () => {
        await sandbox.writeFile('test.txt', 'original');
        await sandbox.writeFile('test.txt', 'updated');

        const content = await sandbox.readFile('test.txt');
        expect(content).toBe('updated');
      });
    });

    describe('readFile', () => {
      it('should read a text file', async () => {
        await sandbox.writeFile('test.txt', 'Hello World');
        const content = await sandbox.readFile('test.txt');
        expect(content).toBe('Hello World');
      });

      it('should read a binary file as Buffer', async () => {
        const buffer = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
        await sandbox.writeFile('image.png', buffer);

        const content = await sandbox.readFile('image.png', null);
        expect(content).toEqual(buffer);
        expect(Buffer.isBuffer(content)).toBe(true);
      });

      it('should read file with specific encoding', async () => {
        await sandbox.writeFile('test.txt', 'Hello World');
        const content = await sandbox.readFile('test.txt', 'utf-8');
        expect(content).toBe('Hello World');
        expect(typeof content).toBe('string');
      });

      it('should throw error if file does not exist', async () => {
        await expect(sandbox.readFile('nonexistent.txt')).rejects.toThrow();
      });
    });

    describe('deleteFile', () => {
      it('should delete a file', async () => {
        await sandbox.writeFile('test.txt', 'content');
        expect(await sandbox.fileExists('test.txt')).toBe(true);

        await sandbox.deleteFile('test.txt');
        expect(await sandbox.fileExists('test.txt')).toBe(false);
      });

      it('should throw error if file does not exist', async () => {
        await expect(sandbox.deleteFile('nonexistent.txt')).rejects.toThrow();
      });
    });

    describe('fileExists', () => {
      it('should return true for existing file', async () => {
        await sandbox.writeFile('test.txt', 'content');
        expect(await sandbox.fileExists('test.txt')).toBe(true);
      });

      it('should return false for non-existing file', async () => {
        expect(await sandbox.fileExists('nonexistent.txt')).toBe(false);
      });

      it('should return false for directory', async () => {
        await sandbox.createDirectory('test-dir');
        expect(await sandbox.fileExists('test-dir')).toBe(false);
      });
    });

    describe('getFileStats', () => {
      it('should return file statistics', async () => {
        const content = 'Hello World';
        await sandbox.writeFile('test.txt', content);

        const stats = await sandbox.getFileStats('test.txt');
        expect(stats.size).toBe(content.length);
        expect(stats.isFile).toBe(true);
        expect(stats.isDirectory).toBe(false);
        expect(stats.createdAt).toBeInstanceOf(Date);
        expect(stats.modifiedAt).toBeInstanceOf(Date);
      });

      it('should return directory statistics', async () => {
        await sandbox.createDirectory('test-dir');

        const stats = await sandbox.getFileStats('test-dir');
        expect(stats.isFile).toBe(false);
        expect(stats.isDirectory).toBe(true);
      });

      it('should throw error if file does not exist', async () => {
        await expect(sandbox.getFileStats('nonexistent.txt')).rejects.toThrow();
      });
    });
  });

  describe('directory operations', () => {
    describe('createDirectory', () => {
      it('should create a directory', async () => {
        await sandbox.createDirectory('test-dir');
        expect(await sandbox.directoryExists('test-dir')).toBe(true);
      });

      it('should create nested directories', async () => {
        await sandbox.createDirectory('nested/dir/structure');
        expect(await sandbox.directoryExists('nested/dir/structure')).toBe(true);
      });

      it('should be idempotent (safe to call multiple times)', async () => {
        await sandbox.createDirectory('test-dir');
        await expect(sandbox.createDirectory('test-dir')).resolves.not.toThrow();
      });
    });

    describe('deleteDirectory', () => {
      it('should delete an empty directory', async () => {
        await sandbox.createDirectory('test-dir');
        await sandbox.deleteDirectory('test-dir');
        expect(await sandbox.directoryExists('test-dir')).toBe(false);
      });

      it('should delete a directory recursively', async () => {
        await sandbox.writeFile('test-dir/nested/file.txt', 'content');
        await sandbox.deleteDirectory('test-dir', true);
        expect(await sandbox.directoryExists('test-dir')).toBe(false);
      });

      it('should throw error if directory is not empty and recursive is false', async () => {
        await sandbox.writeFile('test-dir/file.txt', 'content');
        await expect(sandbox.deleteDirectory('test-dir', false)).rejects.toThrow();
      });

      it('should throw error if directory does not exist', async () => {
        await expect(sandbox.deleteDirectory('nonexistent')).rejects.toThrow();
      });
    });

    describe('listDirectory', () => {
      it('should list directory contents', async () => {
        await sandbox.writeFile('file1.txt', 'content1');
        await sandbox.writeFile('file2.txt', 'content2');
        await sandbox.createDirectory('subdir');

        const contents = await sandbox.listDirectory();
        expect(contents).toContain('file1.txt');
        expect(contents).toContain('file2.txt');
        expect(contents).toContain('subdir');
        expect(contents.length).toBe(3);
      });

      it('should list subdirectory contents', async () => {
        await sandbox.writeFile('subdir/file1.txt', 'content1');
        await sandbox.writeFile('subdir/file2.txt', 'content2');

        const contents = await sandbox.listDirectory('subdir');
        expect(contents).toContain('file1.txt');
        expect(contents).toContain('file2.txt');
        expect(contents.length).toBe(2);
      });

      it('should return empty array for empty directory', async () => {
        await sandbox.createDirectory('empty-dir');
        const contents = await sandbox.listDirectory('empty-dir');
        expect(contents).toEqual([]);
      });

      it('should throw error if directory does not exist', async () => {
        await expect(sandbox.listDirectory('nonexistent')).rejects.toThrow();
      });
    });

    describe('directoryExists', () => {
      it('should return true for existing directory', async () => {
        await sandbox.createDirectory('test-dir');
        expect(await sandbox.directoryExists('test-dir')).toBe(true);
      });

      it('should return false for non-existing directory', async () => {
        expect(await sandbox.directoryExists('nonexistent')).toBe(false);
      });

      it('should return false for file', async () => {
        await sandbox.writeFile('test.txt', 'content');
        expect(await sandbox.directoryExists('test.txt')).toBe(false);
      });
    });
  });

  describe('path operations', () => {
    describe('getPath', () => {
      it('should return sandbox root when no argument provided', () => {
        const sandboxPath = sandbox.getPath();
        expect(sandboxPath).toBeTruthy();
        expect(sandboxPath.startsWith(os.tmpdir())).toBe(true);
      });

      it('should return absolute path for relative path', () => {
        const filePath = sandbox.getPath('test.txt');
        expect(path.isAbsolute(filePath)).toBe(true);
        expect(filePath).toContain('test.txt');
      });

      it('should return absolute path for nested path', () => {
        const filePath = sandbox.getPath('nested/dir/file.txt');
        expect(path.isAbsolute(filePath)).toBe(true);
        expect(filePath).toContain('nested');
        expect(filePath).toContain('file.txt');
      });
    });

    describe('copyFromReal', () => {
      it('should copy file from real filesystem to sandbox', async () => {
        // Create a temporary file outside sandbox
        const tempFile = path.join(os.tmpdir(), 'temp-test-file.txt');
        await fs.writeFile(tempFile, 'real content');

        try {
          await sandbox.copyFromReal(tempFile, 'copied.txt');

          const content = await sandbox.readFile('copied.txt');
          expect(content).toBe('real content');
        } finally {
          // Cleanup temp file
          await fs.unlink(tempFile);
        }
      });

      it('should create parent directories automatically', async () => {
        const tempFile = path.join(os.tmpdir(), 'temp-test-file.txt');
        await fs.writeFile(tempFile, 'content');

        try {
          await sandbox.copyFromReal(tempFile, 'nested/dir/copied.txt');

          const content = await sandbox.readFile('nested/dir/copied.txt');
          expect(content).toBe('content');
        } finally {
          await fs.unlink(tempFile);
        }
      });

      it('should throw error if source file does not exist', async () => {
        await expect(
          sandbox.copyFromReal('/nonexistent/file.txt', 'copied.txt')
        ).rejects.toThrow();
      });
    });

    describe('copyToReal', () => {
      it('should copy file from sandbox to real filesystem', async () => {
        await sandbox.writeFile('source.txt', 'sandbox content');

        const tempFile = path.join(os.tmpdir(), 'temp-output-file.txt');

        try {
          await sandbox.copyToReal('source.txt', tempFile);

          const content = await fs.readFile(tempFile, 'utf-8');
          expect(content).toBe('sandbox content');
        } finally {
          // Cleanup temp file
          await fs.unlink(tempFile);
        }
      });

      it('should create parent directories automatically', async () => {
        await sandbox.writeFile('source.txt', 'content');

        const tempDir = path.join(os.tmpdir(), 'temp-copy-test');
        const tempFile = path.join(tempDir, 'nested', 'output.txt');

        try {
          await sandbox.copyToReal('source.txt', tempFile);

          const content = await fs.readFile(tempFile, 'utf-8');
          expect(content).toBe('content');
        } finally {
          // Cleanup temp directory
          await fs.rm(tempDir, { recursive: true, force: true });
        }
      });

      it('should throw error if source file does not exist', async () => {
        const tempFile = path.join(os.tmpdir(), 'temp-output-file.txt');
        await expect(sandbox.copyToReal('nonexistent.txt', tempFile)).rejects.toThrow();
      });
    });
  });

  describe('path validation', () => {
    it('should reject absolute paths', async () => {
      await expect(sandbox.writeFile('/etc/passwd', 'content')).rejects.toThrow(
        'Absolute paths are not allowed'
      );
    });

    it('should reject paths with .. that escape sandbox', async () => {
      await expect(sandbox.writeFile('../../../etc/passwd', 'content')).rejects.toThrow(
        'Path escapes sandbox'
      );
    });

    it('should reject paths with null bytes', async () => {
      await expect(sandbox.writeFile('test\0.txt', 'content')).rejects.toThrow(
        'Path contains null bytes'
      );
    });

    it('should allow .. within sandbox boundaries', async () => {
      await sandbox.writeFile('dir1/file.txt', 'content');
      await expect(sandbox.readFile('dir1/../dir1/file.txt')).resolves.toBe('content');
    });

    it('should validate paths in all operations', async () => {
      const invalidPath = '../../../etc/passwd';

      await expect(sandbox.readFile(invalidPath)).rejects.toThrow('Path escapes sandbox');
      await expect(sandbox.deleteFile(invalidPath)).rejects.toThrow('Path escapes sandbox');
      await expect(sandbox.createDirectory(invalidPath)).rejects.toThrow('Path escapes sandbox');
      await expect(sandbox.deleteDirectory(invalidPath)).rejects.toThrow('Path escapes sandbox');
      await expect(sandbox.fileExists(invalidPath)).rejects.toThrow('Path escapes sandbox');
      await expect(sandbox.directoryExists(invalidPath)).rejects.toThrow('Path escapes sandbox');
    });
  });

  describe('binary file support', () => {
    it('should handle binary files correctly', async () => {
      // Create a small binary file (fake PNG)
      const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      await sandbox.writeFile('image.png', pngHeader);

      const content = await sandbox.readFile('image.png', null);
      expect(Buffer.isBuffer(content)).toBe(true);
      expect(content).toEqual(pngHeader);
    });

    it('should preserve binary data integrity', async () => {
      const buffer = Buffer.alloc(256);
      for (let i = 0; i < 256; i++) {
        buffer[i] = i;
      }

      await sandbox.writeFile('binary.dat', buffer);
      const content = await sandbox.readFile('binary.dat', null);

      expect(content).toEqual(buffer);
    });
  });

  describe('edge cases', () => {
    it('should handle empty files', async () => {
      await sandbox.writeFile('empty.txt', '');
      const content = await sandbox.readFile('empty.txt');
      expect(content).toBe('');
      expect(await sandbox.fileExists('empty.txt')).toBe(true);
    });

    it('should handle files with special characters in names', async () => {
      const specialName = 'file-with-special_chars.123.txt';
      await sandbox.writeFile(specialName, 'content');
      expect(await sandbox.fileExists(specialName)).toBe(true);
    });

    it('should handle deeply nested paths', async () => {
      const deepPath = 'a/b/c/d/e/f/g/h/i/j/file.txt';
      await sandbox.writeFile(deepPath, 'deep content');
      const content = await sandbox.readFile(deepPath);
      expect(content).toBe('deep content');
    });

    it('should handle large files', async () => {
      const largeContent = 'x'.repeat(1024 * 1024); // 1MB
      await sandbox.writeFile('large.txt', largeContent);

      const stats = await sandbox.getFileStats('large.txt');
      expect(stats.size).toBe(1024 * 1024);
    });

    it('should handle concurrent operations', async () => {
      const operations = [];
      for (let i = 0; i < 10; i++) {
        operations.push(sandbox.writeFile(`file${i}.txt`, `content${i}`));
      }

      await Promise.all(operations);

      for (let i = 0; i < 10; i++) {
        const content = await sandbox.readFile(`file${i}.txt`);
        expect(content).toBe(`content${i}`);
      }
    });
  });
});
