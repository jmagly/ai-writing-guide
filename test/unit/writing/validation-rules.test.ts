/**
 * Tests for ValidationRuleLoader
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ValidationRuleLoader, ValidationRule, RuleSet } from '../../../src/writing/validation-rules.ts';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('ValidationRuleLoader', () => {
  let loader: ValidationRuleLoader;
  let testDir: string;

  beforeEach(() => {
    // Create temp directory for test files
    testDir = join(tmpdir(), `aiwg-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    mkdirSync(join(testDir, 'validation'), { recursive: true });
    mkdirSync(join(testDir, 'patterns'), { recursive: true });
    mkdirSync(join(testDir, 'core'), { recursive: true });

    loader = new ValidationRuleLoader(testDir);
  });

  describe('Default Rules', () => {
    it('should provide default banned phrases', () => {
      const ruleSet = loader.getDefaultRules();

      expect(ruleSet.bannedPhrases.length).toBeGreaterThan(0);
      expect(ruleSet.bannedPhrases.some(r => r.message.includes('seamlessly'))).toBe(true);
    });

    it('should provide default AI patterns', () => {
      const ruleSet = loader.getDefaultRules();

      expect(ruleSet.aiPatterns.length).toBeGreaterThan(0);
      expect(ruleSet.aiPatterns.some(r => r.id.includes('moreover'))).toBe(true);
    });

    it('should provide default authenticity markers', () => {
      const ruleSet = loader.getDefaultRules();

      expect(ruleSet.authenticityMarkers.length).toBeGreaterThan(0);
    });

    it('should provide default structural patterns', () => {
      const ruleSet = loader.getDefaultRules();

      expect(ruleSet.structuralPatterns.length).toBeGreaterThan(0);
    });
  });

  describe('Markdown Parsing', () => {
    it('should parse banned phrases from markdown', async () => {
      const markdown = `# Banned Patterns

## Critical Banned Phrases

- seamlessly
- cutting-edge
- state-of-the-art
`;

      writeFileSync(join(testDir, 'validation/banned-patterns.md'), markdown);

      const rules = await loader.loadFromMarkdown(join(testDir, 'validation/banned-patterns.md'));

      expect(rules.length).toBeGreaterThan(0);
      expect(rules.some(r => r.pattern.toString().includes('seamlessly'))).toBe(true);
    });

    it('should extract severity from file context', async () => {
      const markdown = `# Banned Patterns

## Critical Phrases

- revolutionary
`;

      writeFileSync(join(testDir, 'validation/banned-patterns.md'), markdown);

      const rules = await loader.loadFromMarkdown(join(testDir, 'validation/banned-patterns.md'));

      expect(rules[0].severity).toBe('critical');
    });

    it('should skip example lines', async () => {
      const markdown = `# Patterns

## Examples

- ❌ Bad example
- ✅ Good example
- actual banned phrase
`;

      writeFileSync(join(testDir, 'test.md'), markdown);

      const rules = await loader.loadFromMarkdown(join(testDir, 'test.md'));

      // Should only have "actual banned phrase"
      expect(rules.length).toBe(1);
      expect(rules[0].pattern.toString()).toContain('actual banned phrase');
    });

    it('should parse structural patterns from markdown', async () => {
      const markdown = `# Patterns

## Structure

❌ "The system is fast, reliable, and secure" ✅ Use 2 or 4 items
`;

      writeFileSync(join(testDir, 'test.md'), markdown);

      const rules = await loader.loadFromMarkdown(join(testDir, 'test.md'));

      expect(rules.length).toBeGreaterThan(0);
      expect(rules.some(r => r.type === 'formulaic_structure')).toBe(true);
    });

    it('should extract suggestions from markdown', async () => {
      const markdown = `# Patterns

## Examples

❌ "comprehensive solution" ✅ "specific description"
`;

      writeFileSync(join(testDir, 'test.md'), markdown);

      const rules = await loader.loadFromMarkdown(join(testDir, 'test.md'));

      const ruleWithSuggestion = rules.find(r => r.suggestion);
      expect(ruleWithSuggestion?.suggestion).toBeDefined();
    });
  });

  describe('Rule Merging', () => {
    it('should merge two rule sets without duplicates', () => {
      const rules1: ValidationRule[] = [
        {
          id: 'rule1',
          type: 'banned_phrase',
          pattern: /test/gi,
          severity: 'critical',
          message: 'Test 1'
        }
      ];

      const rules2: ValidationRule[] = [
        {
          id: 'rule2',
          type: 'banned_phrase',
          pattern: /test2/gi,
          severity: 'warning',
          message: 'Test 2'
        }
      ];

      const merged = loader.mergeRules(rules1, rules2);

      expect(merged.length).toBe(2);
      expect(merged.map(r => r.id)).toContain('rule1');
      expect(merged.map(r => r.id)).toContain('rule2');
    });

    it('should not duplicate rules with same ID', () => {
      const rules1: ValidationRule[] = [
        {
          id: 'rule1',
          type: 'banned_phrase',
          pattern: /test/gi,
          severity: 'critical',
          message: 'Test 1'
        }
      ];

      const rules2: ValidationRule[] = [
        {
          id: 'rule1',
          type: 'banned_phrase',
          pattern: /test/gi,
          severity: 'critical',
          message: 'Test 1 duplicate'
        }
      ];

      const merged = loader.mergeRules(rules1, rules2);

      expect(merged.length).toBe(1);
    });
  });

  describe('Context Filtering', () => {
    it('should filter rules by context', () => {
      const rules: ValidationRule[] = [
        {
          id: 'academic',
          type: 'banned_phrase',
          pattern: /test/gi,
          severity: 'warning',
          message: 'Academic only',
          contexts: ['academic']
        },
        {
          id: 'all',
          type: 'banned_phrase',
          pattern: /test2/gi,
          severity: 'warning',
          message: 'All contexts'
        },
        {
          id: 'technical',
          type: 'banned_phrase',
          pattern: /test3/gi,
          severity: 'warning',
          message: 'Technical only',
          contexts: ['technical']
        }
      ];

      const academicRules = loader.filterByContext(rules, 'academic');

      expect(academicRules.length).toBe(2); // academic + all
      expect(academicRules.map(r => r.id)).toContain('academic');
      expect(academicRules.map(r => r.id)).toContain('all');
      expect(academicRules.map(r => r.id)).not.toContain('technical');
    });

    it('should include rules without context specification', () => {
      const rules: ValidationRule[] = [
        {
          id: 'no_context',
          type: 'banned_phrase',
          pattern: /test/gi,
          severity: 'warning',
          message: 'No context specified'
        }
      ];

      const filtered = loader.filterByContext(rules, 'technical');

      expect(filtered.length).toBe(1);
    });
  });

  describe('Pattern Creation', () => {
    it('should create word boundary patterns', async () => {
      const markdown = `# Test

- seamlessly
`;

      writeFileSync(join(testDir, 'test.md'), markdown);
      const rules = await loader.loadFromMarkdown(join(testDir, 'test.md'));

      // Pattern should match "seamlessly" but not "seam" or "lessly"
      expect('text seamlessly integration'.match(rules[0].pattern)).toBeTruthy();
      expect('seamless'.match(rules[0].pattern)).toBeFalsy();
    });

    it('should handle alternative patterns with slash', async () => {
      const markdown = `# Test

- vital/crucial/key role
`;

      writeFileSync(join(testDir, 'test.md'), markdown);
      const rules = await loader.loadFromMarkdown(join(testDir, 'test.md'));

      const pattern = rules[0].pattern;

      expect('vital role'.match(pattern)).toBeTruthy();
      expect('crucial role'.match(pattern)).toBeTruthy();
      expect('key role'.match(pattern)).toBeTruthy();
    });
  });

  describe('Full Rule Set Loading', () => {
    it('should load complete rule set from guide', async () => {
      // Create minimal guide structure
      writeFileSync(
        join(testDir, 'validation/banned-patterns.md'),
        `# Banned Patterns\n\n- seamlessly\n- cutting-edge`
      );

      writeFileSync(
        join(testDir, 'patterns/common-ai-tells.md'),
        `# AI Tells\n\n## Transitions\n\n- Moreover,`
      );

      writeFileSync(
        join(testDir, 'core/sophistication-guide.md'),
        `# Sophistication\n\nSome content about writing well.`
      );

      const ruleSet = await loader.loadRuleSet();

      expect(ruleSet.bannedPhrases.length).toBeGreaterThan(0);
      expect(ruleSet.aiPatterns.length).toBeGreaterThan(0);
      expect(ruleSet.authenticityMarkers.length).toBeGreaterThan(0);
    });

    it('should cache rule set after first load', async () => {
      writeFileSync(
        join(testDir, 'validation/banned-patterns.md'),
        `# Banned Patterns\n\n- test phrase`
      );

      const ruleSet1 = await loader.loadRuleSet();
      const ruleSet2 = await loader.loadRuleSet();

      // Should return same instance (cached)
      expect(ruleSet1).toBe(ruleSet2);
    });

    it('should handle missing files gracefully', async () => {
      // Don't create any files
      const ruleSet = await loader.loadRuleSet();

      // Should still return valid rule set (possibly empty or with defaults)
      expect(ruleSet).toBeDefined();
      expect(ruleSet.bannedPhrases).toBeDefined();
      expect(ruleSet.aiPatterns).toBeDefined();
      expect(ruleSet.authenticityMarkers).toBeDefined();
    });
  });

  describe('ID Generation', () => {
    it('should generate consistent IDs from phrases', async () => {
      const markdown = `# Test

- seamlessly integrates
- Seamlessly Integrates
`;

      writeFileSync(join(testDir, 'test.md'), markdown);
      const rules = await loader.loadFromMarkdown(join(testDir, 'test.md'));

      // IDs should be lowercase and normalized
      expect(rules[0].id).toMatch(/seamlessly_integrates/);
    });

    it('should handle special characters in ID generation', async () => {
      const markdown = `# Test

- state-of-the-art
`;

      writeFileSync(join(testDir, 'test.md'), markdown);
      const rules = await loader.loadFromMarkdown(join(testDir, 'test.md'));

      expect(rules[0].id).toBeDefined();
      expect(rules[0].id).toMatch(/state_of_the_art/);
    });

    it('should truncate long IDs', async () => {
      const longPhrase = 'a'.repeat(100);
      const markdown = `# Test\n\n- ${longPhrase}`;

      writeFileSync(join(testDir, 'test.md'), markdown);
      const rules = await loader.loadFromMarkdown(join(testDir, 'test.md'));

      expect(rules[0].id.length).toBeLessThanOrEqual(70); // Prefix + 50 chars
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty markdown files', async () => {
      writeFileSync(join(testDir, 'empty.md'), '');

      const rules = await loader.loadFromMarkdown(join(testDir, 'empty.md'));

      expect(rules).toEqual([]);
    });

    it('should handle markdown with only headers', async () => {
      const markdown = `# Title\n\n## Section\n\n### Subsection`;

      writeFileSync(join(testDir, 'headers.md'), markdown);
      const rules = await loader.loadFromMarkdown(join(testDir, 'headers.md'));

      expect(rules).toEqual([]);
    });

    it('should handle non-existent files', async () => {
      const rules = await loader.loadFromMarkdown(join(testDir, 'does-not-exist.md'));

      expect(rules).toEqual([]);
    });

    it('should handle malformed markdown gracefully', async () => {
      const markdown = `# Test\n\n- incomplete pattern [missing bracket`;

      writeFileSync(join(testDir, 'malformed.md'), markdown);

      // Should not throw
      const rules = await loader.loadFromMarkdown(join(testDir, 'malformed.md'));

      expect(rules).toBeDefined();
    });
  });
});
