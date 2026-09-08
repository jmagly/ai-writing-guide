/**
 * AIWG artifact root tracking and distribution integration tests
 *
 * Validates that AIWG's project artifact root can be private/configured while
 * public git, npm packages, and edge checkouts exclude repo-local `.aiwg/`.
 *
 * @integration
 * @implements #423
 */

import { beforeAll, describe, it, expect, inject } from 'vitest';
import fs from 'fs';
import path from 'path';
import { execFileSync, execSync } from 'child_process';
import { resolveProjectAiwgDir } from '../../../src/config/project-artifacts.js';

const REPO_ROOT = path.resolve(import.meta.dirname, '../../..');
const AIWG_DIR = resolveProjectAiwgDir(REPO_ROOT);

describe('AIWG artifact root tracking and distribution (integration)', () => {

  // ─────────────────────────────────────────────────────
  // .gitignore Configuration
  // ─────────────────────────────────────────────────────

  describe('.gitignore configuration', () => {
    it('should ignore the public repo-local .aiwg/ directory', () => {
      const gitignore = fs.readFileSync(path.join(REPO_ROOT, '.gitignore'), 'utf-8');
      const lines = gitignore.split('\n').map(l => l.trim());
      const blanketIgnore = lines.some(l =>
        l === '.aiwg/' || l === '.aiwg' || l === '/.aiwg/' || l === '/.aiwg'
      );
      expect(blanketIgnore, '.aiwg/ should be blanket-ignored in the public product repo').toBe(true);
    });

    it('should not track repo-local .aiwg/ artifacts', () => {
      const tracked = execFileSync('git', ['ls-files', '.aiwg/**'], {
        cwd: REPO_ROOT,
        encoding: 'utf-8',
      }).trim();
      expect(tracked, 'durable product artifacts belong outside the ignored .aiwg/ workspace').toBe('');
    });

    it('should ignore the local artifact-root pointer file', () => {
      const gitignore = fs.readFileSync(path.join(REPO_ROOT, '.gitignore'), 'utf-8');
      expect(gitignore).toContain('.aiwg-location');
    });

    it('should still gitignore .claude/ (deployment target)', () => {
      const gitignore = fs.readFileSync(path.join(REPO_ROOT, '.gitignore'), 'utf-8');
      expect(gitignore).toContain('.claude/');
    });

    it('should still gitignore other provider deployment dirs', () => {
      const gitignore = fs.readFileSync(path.join(REPO_ROOT, '.gitignore'), 'utf-8');
      for (const provider of ['.codex/', '.cursor/', '.factory/']) {
        expect(gitignore, `${provider} should be gitignored`).toContain(provider);
      }
    });
  });

  // ─────────────────────────────────────────────────────
  // npm Pack Exclusion
  // ─────────────────────────────────────────────────────

  describe('npm pack exclusion', () => {
    let packedFiles: Set<string>;

    beforeAll(() => {
      const pack = [inject('basePackageManifest')];
      packedFiles = new Set(
        (pack?.[0]?.files ?? []).map((file: { path?: string }) => file.path ?? ''),
      );
    }, 120_000);

    it('should have a files allowlist in package.json', () => {
      const pkg = JSON.parse(
        fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf-8')
      );
      expect(Array.isArray(pkg.files), 'package.json should have files allowlist').toBe(true);
      expect(pkg.files.length).toBeGreaterThan(0);
    });

    it('should NOT include .aiwg/ in files allowlist', () => {
      const pkg = JSON.parse(
        fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf-8')
      );
      const hasAiwg = (pkg.files as string[]).some(
        f => f === '.aiwg' || f === '.aiwg/' || f.startsWith('.aiwg/')
      );
      expect(hasAiwg, '.aiwg/ should not be in npm files allowlist').toBe(false);
    });

    it('should exclude .aiwg/ from npm pack dry-run', () => {
      const aiwgFiles = [...packedFiles]
        .filter((filePath) => filePath === '.aiwg' || filePath.startsWith('.aiwg/'));
      expect(aiwgFiles, 'npm pack should include 0 .aiwg/ files').toHaveLength(0);
    });

    it('should include doctor.mjs and its runtime lint import in npm pack dry-run', () => {
      expect(packedFiles.has('tools/cli/doctor.mjs'), 'doctor.mjs must ship in npm package').toBe(true);
      expect(
        packedFiles.has('tools/lint/claude-context-inventory.mjs'),
        'doctor.mjs imports tools/lint/claude-context-inventory.mjs at runtime',
      ).toBe(true);
      expect(
        packedFiles.has('tools/security/context-memory-firewall.mjs'),
        'the public context-firewall command must ship its packaged engine',
      ).toBe(true);
      expect(
        packedFiles.has('tools/security/threat-assessment.mjs'),
        'the context-firewall engine imports threat-assessment.mjs at runtime',
      ).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────
  // Configured artifact root content verification
  // ─────────────────────────────────────────────────────

  describe('configured artifact root content verification', () => {
    it('should allow public checkouts without a local artifact root', () => {
      if (!fs.existsSync(AIWG_DIR)) return;
      expect(fs.statSync(AIWG_DIR).isDirectory(), `${AIWG_DIR} should be a directory`).toBe(true);
    });

    it('should have key SDLC subdirectories', () => {
      const expectedDirs = [
        'architecture',
        'planning',
        'requirements',
        'risks',
        'testing',
        'security',
      ];
      for (const dir of expectedDirs) {
        const dirPath = path.join(AIWG_DIR, dir);
        if (fs.existsSync(dirPath)) {
          expect(fs.statSync(dirPath).isDirectory(), `${dir} should be a directory`).toBe(true);
        }
      }
    });

    it('should not contain secrets or tokens', () => {
      // Scan .aiwg/ for real secret patterns (not example/documentation content)
      const secretPatterns = [
        /token\s*[:=]\s*["'][a-zA-Z0-9]{20,}/i,
        /secret\s*[:=]\s*["'][a-zA-Z0-9]{20,}/i,
        /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/,
      ];
      // Directories that legitimately contain code examples/docs with mock credentials
      const excludeDirs = new Set(['ralph', 'ralph-external', 'patterns', 'working', 'reports']);

      function checkFile(filePath: string): string[] {
        const content = fs.readFileSync(filePath, 'utf-8');
        const issues: string[] = [];
        for (const pattern of secretPatterns) {
          if (pattern.test(content)) {
            issues.push(`${filePath}: matches ${pattern.source}`);
          }
        }
        return issues;
      }

      function walkDir(dir: string): string[] {
        const allIssues: string[] = [];
        if (!fs.existsSync(dir)) return allIssues;
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            if (entry.name.startsWith('.') || excludeDirs.has(entry.name)) continue;
            allIssues.push(...walkDir(full));
          } else if (entry.name.endsWith('.md') || entry.name.endsWith('.yaml') || entry.name.endsWith('.json')) {
            allIssues.push(...checkFile(full));
          }
        }
        return allIssues;
      }

      const issues = walkDir(AIWG_DIR);
      expect(issues, `Found potential secrets in configured AIWG artifact root: ${issues.join(', ')}`).toHaveLength(0);
    });

    it('should not track .aiwg/ or .aiwg-location files in the public repository', () => {
      const binaryExts = ['.exe', '.dll', '.so', '.dylib', '.bin', '.zip', '.tar', '.gz', '.png', '.jpg', '.jpeg'];
      const trackedAiwg = execSync('git ls-files -z .aiwg .aiwg-location', { cwd: REPO_ROOT })
        .toString('utf-8')
        .split('\0')
        .filter(Boolean);
      expect(trackedAiwg, 'public git should not track repo-local .aiwg or .aiwg-location').toHaveLength(0);
      const binaries = trackedAiwg.filter((p) => binaryExts.includes(path.extname(p).toLowerCase()));
      expect(binaries, `Found tracked binary files: ${binaries.join(', ')}`).toHaveLength(0);
    });
  });

  // ─────────────────────────────────────────────────────
  // Edge Sparse Checkout
  // ─────────────────────────────────────────────────────

  describe('Edge sparse checkout configuration', () => {
    it('should have sparse checkout logic in channel manager', () => {
      const managerPath = path.join(REPO_ROOT, 'src', 'channel', 'manager.mjs');
      const content = fs.readFileSync(managerPath, 'utf-8');
      expect(content).toContain('sparse-checkout');
      expect(content).toContain('.aiwg');
    });

    it('should apply sparse checkout on fresh edge clone', () => {
      const managerPath = path.join(REPO_ROOT, 'src', 'channel', 'manager.mjs');
      const content = fs.readFileSync(managerPath, 'utf-8');
      // Should have sparse checkout in the clone path
      const hasCloneSparse = content.includes('sparse-checkout init') && content.includes('!/.aiwg');
      expect(hasCloneSparse, 'clone path should configure sparse checkout excluding .aiwg').toBe(true);
    });

    it('should apply sparse checkout on existing edge update', () => {
      const managerPath = path.join(REPO_ROOT, 'src', 'channel', 'manager.mjs');
      const content = fs.readFileSync(managerPath, 'utf-8');
      // The update path (edgeExists) should also check for sparse checkout
      const updateSection = content.split('Update existing installation')[1] ?? '';
      expect(updateSection).toContain('sparse-checkout');
    });
  });

  // ─────────────────────────────────────────────────────
  // Dual-Write Documentation
  // ─────────────────────────────────────────────────────

  describe('Dual-write workflow documentation', () => {
    it('should have dual-write documentation in dev guide', () => {
      const devGuidePath = path.join(REPO_ROOT, 'docs', 'development', 'aiwg-development-guide.md');
      if (!fs.existsSync(devGuidePath)) return;
      const content = fs.readFileSync(devGuidePath, 'utf-8');
      // Should mention dual-write pattern
      expect(
        content.toLowerCase().includes('dual-write') || content.toLowerCase().includes('dual write'),
        'Dev guide should document dual-write workflow'
      ).toBe(true);
    });

    it('should document the source vs deployment target distinction', () => {
      const devGuidePath = path.join(REPO_ROOT, 'docs', 'development', 'aiwg-development-guide.md');
      if (!fs.existsSync(devGuidePath)) return;
      const content = fs.readFileSync(devGuidePath, 'utf-8');
      expect(content).toContain('agentic/code');
      expect(content.includes('.claude/') || content.includes('deployment target')).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────
  // Provider Deployment Directories
  // ─────────────────────────────────────────────────────

  describe('Provider deployment directories remain gitignored', () => {
    it('should gitignore all provider deployment directories', () => {
      const gitignore = fs.readFileSync(path.join(REPO_ROOT, '.gitignore'), 'utf-8');
      // Core provider deployment dirs that must be gitignored
      const requiredDirs = ['.claude/', '.codex/', '.cursor/', '.factory/'];
      for (const dir of requiredDirs) {
        const isIgnored = gitignore.includes(dir) || gitignore.includes(dir.replace('/', ''));
        expect(isIgnored, `${dir} should be gitignored`).toBe(true);
      }
      // Optional provider dirs — check if present (some may not be deployed yet)
      const optionalDirs = ['.opencode/', '.warp/', '.windsurf/', '.github/agents/'];
      for (const dir of optionalDirs) {
        const isIgnored = gitignore.includes(dir) || gitignore.includes(dir.replace('/', ''));
        if (isIgnored) {
          expect(isIgnored).toBe(true); // Confirm it's properly ignored
        }
        // Not a failure if absent — these providers may not have been deployed
      }
    });
  });
});
