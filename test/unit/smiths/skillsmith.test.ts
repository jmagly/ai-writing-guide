/**
 * SkillSmith Tests
 *
 * @module test/unit/smiths/skillsmith
 */

import { describe, it, expect } from 'vitest';
import { generateSkill, deploySkill } from '../../../src/smiths/skillsmith/generator.js';
import { PlatformSkillResolver } from '../../../src/smiths/skillsmith/platform-resolver.js';
import type { SkillOptions } from '../../../src/smiths/skillsmith/types.js';

describe('SkillSmith', () => {
  describe('PlatformSkillResolver', () => {
    it('should validate correct skill names', () => {
      const valid = ['test-skill', 'my-skill', 'skill-123', 'ab'];
      valid.forEach((name) => {
        const result = PlatformSkillResolver.validateSkillName(name);
        expect(result.valid).toBe(true);
      });
    });

    it('should reject invalid skill names', () => {
      const invalid = [
        '',
        'a',
        '-invalid',
        'invalid-',
        'UPPERCASE',
        'with_underscore',
        'with space',
        '--double',
      ];
      invalid.forEach((name) => {
        const result = PlatformSkillResolver.validateSkillName(name);
        expect(result.valid).toBe(false);
      });
    });

    it('should get correct base directory for platforms', () => {
      expect(PlatformSkillResolver.getBaseDir('claude', '/project')).toBe(
        '/project/.claude/skills'
      );
      expect(PlatformSkillResolver.getBaseDir('factory', '/project')).toBe(
        '/project/.factory/skills'
      );
      expect(PlatformSkillResolver.getBaseDir('cursor', '/project')).toBe(
        '/project/.cursor/skills'
      );
    });

    it('should identify platforms with native skill support', () => {
      expect(PlatformSkillResolver.supportsSkills('claude')).toBe(true);
      expect(PlatformSkillResolver.supportsSkills('generic')).toBe(true);
      expect(PlatformSkillResolver.supportsSkills('factory')).toBe(false);
      expect(PlatformSkillResolver.supportsSkills('cursor')).toBe(false);
    });

    it('should provide alternative strategies for non-skill platforms', () => {
      expect(PlatformSkillResolver.getAlternativeStrategy('factory')).toBe('command');
      expect(PlatformSkillResolver.getAlternativeStrategy('cursor')).toBe('command');
      expect(PlatformSkillResolver.getAlternativeStrategy('copilot')).toBe('none');
    });
  });

  describe('generateSkill', () => {
    it('should generate basic skill', async () => {
      const options: SkillOptions = {
        name: 'test-skill',
        description: 'A test skill',
        platform: 'claude',
        projectPath: '/test',
      };

      const skill = await generateSkill(options);

      expect(skill.name).toBe('test-skill');
      expect(skill.platform).toBe('claude');
      expect(skill.content).toContain('name: test-skill');
      expect(skill.content).toContain('description: A test skill');
      expect(skill.content).toContain('# Test Skill Skill');
      expect(skill.content).toContain('## Trigger Phrases');
    });

    it('should include trigger phrases', async () => {
      const options: SkillOptions = {
        name: 'voice-apply',
        description: 'Apply voice profiles',
        platform: 'claude',
        projectPath: '/test',
        triggerPhrases: ['apply voice', 'use voice', 'write in voice'],
      };

      const skill = await generateSkill(options);

      expect(skill.content).toContain('"apply voice"');
      expect(skill.content).toContain('"use voice"');
      expect(skill.content).toContain('"write in voice"');
    });

    it('should include tools in frontmatter', async () => {
      const options: SkillOptions = {
        name: 'code-analyzer',
        description: 'Analyze code quality',
        platform: 'claude',
        projectPath: '/test',
        tools: ['Read', 'Write', 'Glob', 'Grep'],
      };

      const skill = await generateSkill(options);

      expect(skill.content).toContain('tools: Read, Write, Glob, Grep');
      expect(skill.content).toContain('## Tools Used');
    });

    it('should generate references when requested', async () => {
      const options: SkillOptions = {
        name: 'test-skill',
        description: 'A test skill',
        platform: 'claude',
        projectPath: '/test',
        createReferences: true,
      };

      const skill = await generateSkill(options);

      expect(skill.references).toBeDefined();
      expect(skill.references!.length).toBeGreaterThan(0);
      expect(skill.references!.some((r) => r.filename === 'usage-examples.md')).toBe(
        true
      );
      expect(skill.references!.some((r) => r.filename === 'configuration.md')).toBe(
        true
      );
    });

    it('should set version', async () => {
      const options: SkillOptions = {
        name: 'test-skill',
        description: 'A test skill',
        platform: 'claude',
        projectPath: '/test',
        version: '2.0.0',
      };

      const skill = await generateSkill(options);

      expect(skill.version).toBe('2.0.0');
      expect(skill.content).toContain('version: 2.0.0');
    });

    it('should reject invalid skill names', async () => {
      const options: SkillOptions = {
        name: 'Invalid_Name',
        description: 'Invalid',
        platform: 'claude',
        projectPath: '/test',
      };

      await expect(generateSkill(options)).rejects.toThrow('Invalid skill name');
    });
  });

  describe('deploySkill', () => {
    it('should handle dry run', async () => {
      const skill = await generateSkill({
        name: 'test-skill',
        description: 'Test',
        platform: 'claude',
        projectPath: '/test',
      });

      const result = await deploySkill(skill, '/test', true);

      expect(result.success).toBe(true);
      expect(result.filesCreated.length).toBe(0);
    });
  });
});
