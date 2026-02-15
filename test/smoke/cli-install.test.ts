/**
 * CLI Installation Smoke Tests
 *
 * Quick validation that the CLI installation is working correctly.
 * These tests verify:
 * - CLI commands are available
 * - Framework deployment works
 * - Skills are deployed correctly
 *
 * Run with: npx vitest run test/smoke/cli-install.test.ts
 * Or mark as smoke: npx vitest run --testNamePattern="smoke"
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnSync } from 'child_process';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { resolve, join } from 'path';
import { tmpdir } from 'os';

// Test configuration
const PROJECT_ROOT = resolve(__dirname, '../..');
const INSTALL_SCRIPT = join(PROJECT_ROOT, 'tools/install/install.sh');
const DEPLOY_SCRIPT = join(PROJECT_ROOT, 'tools/agents/deploy-agents.mjs');

// Temp directory for isolated testing
let testDir: string;

function runNode(args: string[], options: { cwd?: string; timeout?: number } = {}): string {
  const result = spawnSync(process.execPath, args, {
    encoding: 'utf-8',
    timeout: options.timeout ?? 30000,
    cwd: options.cwd ?? PROJECT_ROOT,
  });
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  if (result.status !== 0) {
    throw new Error(output || `Command failed with exit code ${result.status}`);
  }
  return output;
}

describe('CLI Installation Smoke Tests', () => {
  beforeAll(() => {
    testDir = resolve(tmpdir(), `aiwg-smoke-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterAll(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('smoke: installation scripts exist', () => {
    it('should have install.sh script', () => {
      expect(existsSync(INSTALL_SCRIPT)).toBe(true);
    });

    it('should have deploy-agents.mjs script', () => {
      expect(existsSync(DEPLOY_SCRIPT)).toBe(true);
    });
  });

  describe('smoke: deploy-agents.mjs executes', () => {
    it('should run without fatal errors', () => {
      // The script doesn't have a --help flag, it just runs
      // Verify it executes successfully in dry-run mode
      expect(() => runNode([DEPLOY_SCRIPT, '--dry-run'])).not.toThrow();
    });
  });

  describe('smoke: framework deployment dry-run', () => {
    it('should dry-run sdlc deployment', () => {
      expect(() => runNode([
        DEPLOY_SCRIPT,
        '--target', testDir,
        '--mode', 'sdlc',
        '--deploy-skills',
        '--dry-run',
      ])).not.toThrow();
    });

    it('should dry-run marketing deployment', () => {
      expect(() => runNode([
        DEPLOY_SCRIPT,
        '--target', testDir,
        '--mode', 'marketing',
        '--deploy-skills',
        '--dry-run',
      ])).not.toThrow();
    });

    it('should dry-run writing deployment', () => {
      expect(() => runNode([
        DEPLOY_SCRIPT,
        '--target', testDir,
        '--mode', 'general',
        '--deploy-skills',
        '--dry-run',
      ])).not.toThrow();
    });

    it('should dry-run all frameworks deployment', () => {
      expect(() => runNode([
        DEPLOY_SCRIPT,
        '--target', testDir,
        '--mode', 'all',
        '--deploy-skills',
        '--dry-run',
      ])).not.toThrow();
    });
  });

  describe('smoke: skill directories exist', () => {
    const skillsBasePath = join(PROJECT_ROOT, 'agentic/code');

    it('should have writing-quality skills', () => {
      const skillsPath = join(skillsBasePath, 'addons/writing-quality/skills');
      expect(existsSync(skillsPath)).toBe(true);
    });

    it('should have voice-framework skills', () => {
      const skillsPath = join(skillsBasePath, 'addons/voice-framework/skills');
      expect(existsSync(skillsPath)).toBe(true);

      // Check for specific voice skills
      expect(existsSync(join(skillsPath, 'voice-apply/SKILL.md'))).toBe(true);
      expect(existsSync(join(skillsPath, 'voice-create/SKILL.md'))).toBe(true);
      expect(existsSync(join(skillsPath, 'voice-blend/SKILL.md'))).toBe(true);
      expect(existsSync(join(skillsPath, 'voice-analyze/SKILL.md'))).toBe(true);
    });

    it('should have aiwg-utils skills', () => {
      const skillsPath = join(skillsBasePath, 'addons/aiwg-utils/skills');
      expect(existsSync(skillsPath)).toBe(true);
    });

    it('should have SDLC framework skills', () => {
      const skillsPath = join(skillsBasePath, 'frameworks/sdlc-complete/skills');
      expect(existsSync(skillsPath)).toBe(true);
    });

    it('should have MMK framework skills', () => {
      const skillsPath = join(skillsBasePath, 'frameworks/media-marketing-kit/skills');
      expect(existsSync(skillsPath)).toBe(true);
    });
  });

  describe('smoke: voice profile templates exist', () => {
    const voicesPath = join(
      PROJECT_ROOT,
      'agentic/code/addons/voice-framework/voices/templates'
    );

    it('should have technical-authority profile', () => {
      expect(existsSync(join(voicesPath, 'technical-authority.yaml'))).toBe(true);
    });

    it('should have friendly-explainer profile', () => {
      expect(existsSync(join(voicesPath, 'friendly-explainer.yaml'))).toBe(true);
    });

    it('should have executive-brief profile', () => {
      expect(existsSync(join(voicesPath, 'executive-brief.yaml'))).toBe(true);
    });

    it('should have casual-conversational profile', () => {
      expect(existsSync(join(voicesPath, 'casual-conversational.yaml'))).toBe(true);
    });
  });

  describe('smoke: actual deployment creates files', () => {
    let deployDir: string;

    beforeAll(() => {
      deployDir = join(testDir, 'deploy-test');
      mkdirSync(deployDir, { recursive: true });
    });

    it('should deploy writing framework files', () => {
      runNode([
        DEPLOY_SCRIPT,
        '--target', deployDir,
        '--mode', 'general',
        '--deploy-skills',
      ], { timeout: 60000 });

      // Check agents deployed
      expect(existsSync(join(deployDir, '.claude/agents'))).toBe(true);

      // Check skills deployed
      expect(existsSync(join(deployDir, '.claude/skills'))).toBe(true);

      // Check voice skills specifically
      expect(existsSync(join(deployDir, '.claude/skills/voice-apply/SKILL.md'))).toBe(true);
      expect(existsSync(join(deployDir, '.claude/skills/voice-create/SKILL.md'))).toBe(true);
    });

    it('should deploy SDLC framework files', () => {
      const sdlcDir = join(testDir, 'sdlc-test');
      mkdirSync(sdlcDir, { recursive: true });

      runNode([
        DEPLOY_SCRIPT,
        '--target', sdlcDir,
        '--mode', 'sdlc',
        '--deploy-commands',
        '--deploy-skills',
      ], { timeout: 60000 });

      // Check SDLC agents deployed
      expect(existsSync(join(sdlcDir, '.claude/agents'))).toBe(true);

      // Check SDLC commands deployed (need --deploy-commands flag)
      expect(existsSync(join(sdlcDir, '.claude/commands'))).toBe(true);

      // Check skills deployed
      expect(existsSync(join(sdlcDir, '.claude/skills'))).toBe(true);
    });
  });

  describe('smoke: provider skill support', () => {
    it('should deploy skills to Claude provider', () => {
      expect(() => runNode([
        DEPLOY_SCRIPT,
        '--target', testDir,
        '--provider', 'claude',
        '--deploy-skills',
        '--dry-run',
      ])).not.toThrow();
    });
  });
});
