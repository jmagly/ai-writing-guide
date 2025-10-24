import { describe, it, expect, beforeEach } from 'vitest';
import { PromptTemplateLibrary, PromptTemplate } from '../../../src/writing/prompt-templates.js';

describe('PromptTemplateLibrary', () => {
  let library: PromptTemplateLibrary;

  beforeEach(() => {
    library = new PromptTemplateLibrary();
  });

  describe('Template Loading', () => {
    it('should load built-in templates', () => {
      const templates = library.listAll();
      expect(templates.length).toBeGreaterThan(10);
    });

    it('should load technical templates', () => {
      const technical = library.listByCategory('technical');
      expect(technical.length).toBeGreaterThan(5);
    });

    it('should load executive templates', () => {
      const executive = library.listByCategory('executive');
      expect(executive.length).toBeGreaterThan(0);
    });

    it('should load academic templates', () => {
      const academic = library.listByCategory('academic');
      expect(academic.length).toBeGreaterThan(0);
    });

    it('should load creative templates', () => {
      const creative = library.listByCategory('creative');
      expect(creative.length).toBeGreaterThan(0);
    });

    it('should have unique template IDs', () => {
      const templates = library.listAll();
      const ids = templates.map(t => t.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have complete template metadata', () => {
      const templates = library.listAll();
      templates.forEach(t => {
        expect(t.id).toBeTruthy();
        expect(t.name).toBeTruthy();
        expect(t.category).toBeTruthy();
        expect(t.template).toBeTruthy();
        expect(Array.isArray(t.variables)).toBe(true);
        expect(t.example).toBeTruthy();
        expect(Array.isArray(t.principles)).toBe(true);
      });
    });
  });

  describe('Template Retrieval', () => {
    it('should get template by ID', () => {
      const template = library.getTemplate('technical-deep-dive');
      expect(template).toBeDefined();
      expect(template?.id).toBe('technical-deep-dive');
    });

    it('should return undefined for non-existent template', () => {
      const template = library.getTemplate('non-existent');
      expect(template).toBeUndefined();
    });

    it('should list templates by category', () => {
      const technical = library.listByCategory('technical');
      expect(technical.every(t => t.category === 'technical')).toBe(true);
    });

    it('should return empty array for non-existent category', () => {
      const result = library.listByCategory('non-existent');
      expect(result).toEqual([]);
    });

    it('should search templates by keyword', () => {
      const results = library.search('security');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(t => t.id.includes('security') || t.template.includes('security'))).toBe(true);
    });

    it('should search case-insensitively', () => {
      const results = library.search('TECHNICAL');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should search in template content', () => {
      const results = library.search('OAuth');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should return empty array for no matches', () => {
      const results = library.search('xyzabc123notfound');
      expect(results).toEqual([]);
    });
  });

  describe('Template Instantiation', () => {
    it('should instantiate templates with variables', () => {
      const result = library.instantiate('technical-deep-dive', {
        word_count: '1500',
        topic: 'OAuth 2.0 authentication',
        audience: 'senior backend developers',
        example_structure: '1. Overview\n2. Implementation\n3. Best Practices'
      });

      expect(result).toContain('1500');
      expect(result).toContain('OAuth 2.0 authentication');
      expect(result).toContain('senior backend developers');
    });

    it('should throw error for missing template', () => {
      expect(() => {
        library.instantiate('non-existent', {});
      }).toThrow('Template not found');
    });

    it('should throw error for missing variables', () => {
      expect(() => {
        library.instantiate('technical-deep-dive', {
          word_count: '1500'
          // missing other required variables
        });
      }).toThrow('Missing template variables');
    });

    it('should replace all occurrences of variable', () => {
      const template: PromptTemplate = {
        id: 'test-multi',
        name: 'Test Multiple',
        category: 'technical',
        template: 'Write about {topic}. More about {topic}. Even more {topic}.',
        variables: ['topic'],
        example: 'test',
        principles: []
      };

      library.addTemplate(template);
      const result = library.instantiate('test-multi', { topic: 'testing' });

      const matches = result.match(/testing/g);
      expect(matches?.length).toBe(3);
    });

    it('should handle special characters in values', () => {
      const template: PromptTemplate = {
        id: 'test-special',
        name: 'Test Special',
        category: 'technical',
        template: 'Write about {topic}',
        variables: ['topic'],
        example: 'test',
        principles: []
      };

      library.addTemplate(template);
      const result = library.instantiate('test-special', { topic: 'C++ & Rust' });

      expect(result).toContain('C++ & Rust');
    });

    it('should preserve template formatting', () => {
      const result = library.instantiate('technical-tutorial', {
        task: 'implement OAuth',
        audience: 'developers',
        prerequisites: 'Node.js knowledge',
        technologies: 'Node.js, Express'
      });

      expect(result).toContain('\n');
      expect(result.split('\n').length).toBeGreaterThan(5);
    });
  });

  describe('Custom Templates', () => {
    it('should add custom template', () => {
      const custom: PromptTemplate = {
        id: 'custom-test',
        name: 'Custom Test',
        category: 'technical',
        template: 'Write about {topic}',
        variables: ['topic'],
        example: 'Example topic',
        principles: ['Principle 1']
      };

      library.addTemplate(custom);
      const retrieved = library.getTemplate('custom-test');

      expect(retrieved).toEqual(custom);
    });

    it('should remove template', () => {
      const custom: PromptTemplate = {
        id: 'to-remove',
        name: 'To Remove',
        category: 'technical',
        template: 'test',
        variables: [],
        example: 'test',
        principles: []
      };

      library.addTemplate(custom);
      expect(library.getTemplate('to-remove')).toBeDefined();

      const removed = library.removeTemplate('to-remove');
      expect(removed).toBe(true);
      expect(library.getTemplate('to-remove')).toBeUndefined();
    });

    it('should return false when removing non-existent template', () => {
      const removed = library.removeTemplate('non-existent');
      expect(removed).toBe(false);
    });

    it('should overwrite existing template when adding', () => {
      const template1: PromptTemplate = {
        id: 'overwrite-test',
        name: 'Original',
        category: 'technical',
        template: 'original',
        variables: [],
        example: 'test',
        principles: []
      };

      const template2: PromptTemplate = {
        id: 'overwrite-test',
        name: 'Updated',
        category: 'executive',
        template: 'updated',
        variables: [],
        example: 'test',
        principles: []
      };

      library.addTemplate(template1);
      library.addTemplate(template2);

      const retrieved = library.getTemplate('overwrite-test');
      expect(retrieved?.name).toBe('Updated');
      expect(retrieved?.template).toBe('updated');
    });
  });

  describe('Template Structure Validation', () => {
    it('should have technical-deep-dive template', () => {
      const template = library.getTemplate('technical-deep-dive');
      expect(template).toBeDefined();
      expect(template?.category).toBe('technical');
    });

    it('should have technical-tutorial template', () => {
      const template = library.getTemplate('technical-tutorial');
      expect(template).toBeDefined();
      expect(template?.template).toContain('tutorial');
    });

    it('should have architecture-analysis template', () => {
      const template = library.getTemplate('architecture-analysis');
      expect(template).toBeDefined();
      expect(template?.template.toLowerCase()).toContain('architecture');
    });

    it('should have executive-brief template', () => {
      const template = library.getTemplate('executive-brief');
      expect(template).toBeDefined();
      expect(template?.category).toBe('executive');
    });

    it('should have academic-analysis template', () => {
      const template = library.getTemplate('academic-analysis');
      expect(template).toBeDefined();
      expect(template?.category).toBe('academic');
    });

    it('should have performance-report template', () => {
      const template = library.getTemplate('performance-report');
      expect(template).toBeDefined();
      expect(template?.template.toLowerCase()).toContain('performance');
    });

    it('should have api-documentation template', () => {
      const template = library.getTemplate('api-documentation');
      expect(template).toBeDefined();
      expect(template?.template.toLowerCase()).toContain('api');
    });

    it('should have security-analysis template', () => {
      const template = library.getTemplate('security-analysis');
      expect(template).toBeDefined();
      expect(template?.template.toLowerCase()).toContain('security');
    });

    it('should have incident-postmortem template', () => {
      const template = library.getTemplate('incident-postmortem');
      expect(template).toBeDefined();
      expect(template?.template.toLowerCase()).toContain('incident');
    });

    it('should have code-review-guide template', () => {
      const template = library.getTemplate('code-review-guide');
      expect(template).toBeDefined();
      expect(template?.template.toLowerCase()).toContain('code review');
    });
  });

  describe('Template Content Quality', () => {
    it('should include AI pattern avoidance in templates', () => {
      const templates = library.listAll();
      const withPatternGuidance = templates.filter(t =>
        t.template.toLowerCase().includes('avoid') &&
        (t.template.toLowerCase().includes('seamless') ||
         t.template.toLowerCase().includes('comprehensive') ||
         t.template.toLowerCase().includes('robust'))
      );
      expect(withPatternGuidance.length).toBeGreaterThan(5);
    });

    it('should include specific examples in templates', () => {
      const templates = library.listAll();
      templates.forEach(t => {
        expect(t.example.length).toBeGreaterThan(10);
      });
    });

    it('should include principles for each template', () => {
      const templates = library.listAll();
      templates.forEach(t => {
        expect(t.principles.length).toBeGreaterThan(0);
      });
    });

    it('should avoid AI patterns in template text', () => {
      const templates = library.listAll();
      const aiPatterns = [
        'seamlessly integrates',
        'comprehensive solution',
        'robust and scalable',
        'Moreover,',
        'Furthermore,',
        'In conclusion,'
      ];

      templates.forEach(t => {
        aiPatterns.forEach(pattern => {
          expect(t.template.toLowerCase()).not.toContain(pattern.toLowerCase());
        });
      });
    });

    it('should include requirements sections', () => {
      const technicalTemplates = library.listByCategory('technical');
      const withRequirements = technicalTemplates.filter(t =>
        t.template.includes('Requirements:') || t.template.includes('Constraints:')
      );
      expect(withRequirements.length).toBeGreaterThan(5);
    });

    it('should include specific guidance not generic', () => {
      const template = library.getTemplate('technical-deep-dive');
      expect(template?.template).toContain('Avoid');
      expect(template?.template).toContain('Include');
      expect(template?.template.toLowerCase()).not.toContain('use best practices');
    });
  });

  describe('Category Coverage', () => {
    it('should have multiple technical templates', () => {
      const technical = library.listByCategory('technical');
      expect(technical.length).toBeGreaterThanOrEqual(7);
    });

    it('should have executive templates', () => {
      const executive = library.listByCategory('executive');
      expect(executive.length).toBeGreaterThanOrEqual(2);
    });

    it('should have academic templates', () => {
      const academic = library.listByCategory('academic');
      expect(academic.length).toBeGreaterThanOrEqual(1);
    });

    it('should have creative templates', () => {
      const creative = library.listByCategory('creative');
      expect(creative.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Template Variables', () => {
    it('should declare all required variables', () => {
      const templates = library.listAll();
      templates.forEach(t => {
        const placeholders = t.template.match(/\{([^}]+)\}/g) || [];
        const uniquePlaceholders = new Set(
          placeholders.map(p => p.replace(/[{}]/g, ''))
        );

        expect(t.variables.length).toBeGreaterThanOrEqual(uniquePlaceholders.size);
      });
    });

    it('should have consistent variable naming', () => {
      const templates = library.listAll();
      templates.forEach(t => {
        t.variables.forEach(v => {
          expect(v).toMatch(/^[a-z_]+$/);
        });
      });
    });

    it('should document variable usage in examples', () => {
      const templates = library.listAll();
      templates.forEach(t => {
        expect(t.example.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Template Completeness', () => {
    it('should have complete technical-deep-dive template', () => {
      const template = library.getTemplate('technical-deep-dive');
      expect(template?.variables).toContain('word_count');
      expect(template?.variables).toContain('topic');
      expect(template?.variables).toContain('audience');
      expect(template?.template).toContain('Requirements:');
      expect(template?.template.toLowerCase()).toContain('avoid ai detection');
    });

    it('should have complete executive-brief template', () => {
      const template = library.getTemplate('executive-brief');
      expect(template?.variables).toContain('topic');
      expect(template?.variables).toContain('stakeholders');
      expect(template?.variables).toContain('word_count');
      expect(template?.template.toLowerCase()).toContain('bottom-line');
    });

    it('should have complete academic-analysis template', () => {
      const template = library.getTemplate('academic-analysis');
      expect(template?.variables).toContain('topic');
      expect(template?.variables).toContain('theoretical_framework');
      expect(template?.template.toLowerCase()).toContain('cite');
      expect(template?.template.toLowerCase()).toContain('peer-reviewed');
    });

    it('should have complete security-analysis template', () => {
      const template = library.getTemplate('security-analysis');
      expect(template?.variables).toContain('system');
      expect(template?.variables).toContain('threat_model');
      expect(template?.template.toLowerCase()).toContain('threat');
      expect(template?.template.toLowerCase()).toContain('vulnerability');
    });

    it('should have complete incident-postmortem template', () => {
      const template = library.getTemplate('incident-postmortem');
      expect(template?.variables).toContain('incident_title');
      expect(template?.variables).toContain('severity');
      expect(template?.template.toLowerCase()).toContain('timeline');
      expect(template?.template.toLowerCase()).toContain('root cause');
    });
  });

  describe('Search Functionality', () => {
    it('should find templates by partial ID match', () => {
      const results = library.search('technical');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(t => t.id.includes('technical'))).toBe(true);
    });

    it('should find templates by name', () => {
      const results = library.search('Deep Dive');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should find templates by content keywords', () => {
      const results = library.search('authentication');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should handle empty search string', () => {
      const results = library.search('');
      expect(results.length).toBe(library.listAll().length);
    });

    it('should handle whitespace in search', () => {
      const results = library.search('  technical  ');
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('List Operations', () => {
    it('should list all templates without duplicates', () => {
      const all = library.listAll();
      const ids = all.map(t => t.id);
      const uniqueIds = new Set(ids);
      expect(ids.length).toBe(uniqueIds.size);
    });

    it('should return different instances on each call', () => {
      const list1 = library.listAll();
      const list2 = library.listAll();
      expect(list1).not.toBe(list2); // Different array instances
      expect(list1.length).toBe(list2.length);
    });

    it('should handle multiple category requests', () => {
      const tech = library.listByCategory('technical');
      const exec = library.listByCategory('executive');
      const acad = library.listByCategory('academic');

      const total = tech.length + exec.length + acad.length;
      expect(total).toBeLessThanOrEqual(library.listAll().length);
    });
  });

  describe('Template Principles', () => {
    it('should emphasize specificity over vagueness', () => {
      const templates = library.listAll();
      const withSpecificity = templates.filter(t =>
        t.principles.some(p =>
          p.toLowerCase().includes('specific') ||
          p.toLowerCase().includes('concrete') ||
          p.toLowerCase().includes('exact')
        )
      );
      expect(withSpecificity.length).toBeGreaterThan(5);
    });

    it('should encourage examples in principles', () => {
      const templates = library.listAll();
      const withExamples = templates.filter(t =>
        t.principles.some(p => p.toLowerCase().includes('example'))
      );
      expect(withExamples.length).toBeGreaterThan(3);
    });

    it('should promote authentic voice', () => {
      const templates = library.listAll();
      const withAuthenticity = templates.filter(t =>
        t.principles.some(p =>
          p.toLowerCase().includes('authentic') ||
          p.toLowerCase().includes('honest') ||
          p.toLowerCase().includes('real')
        )
      );
      expect(withAuthenticity.length).toBeGreaterThan(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed variable placeholders gracefully', () => {
      const template: PromptTemplate = {
        id: 'test-malformed',
        name: 'Test',
        category: 'technical',
        template: 'Write about {topic and {more}',
        variables: ['topic', 'more'],
        example: 'test',
        principles: []
      };

      library.addTemplate(template);

      expect(() => {
        library.instantiate('test-malformed', { topic: 'test', more: 'test' });
      }).not.toThrow();
    });

    it('should provide helpful error messages', () => {
      expect(() => {
        library.instantiate('technical-deep-dive', {});
      }).toThrow(/Missing template variables/);
    });
  });

  describe('Template Reusability', () => {
    it('should allow same template to be instantiated multiple times', () => {
      const result1 = library.instantiate('technical-deep-dive', {
        word_count: '1500',
        topic: 'OAuth',
        audience: 'developers',
        example_structure: 'Structure 1'
      });

      const result2 = library.instantiate('technical-deep-dive', {
        word_count: '2000',
        topic: 'JWT',
        audience: 'engineers',
        example_structure: 'Structure 2'
      });

      expect(result1).not.toBe(result2);
      expect(result1).toContain('OAuth');
      expect(result2).toContain('JWT');
    });

    it('should not modify original template', () => {
      const original = library.getTemplate('technical-deep-dive');
      const originalTemplate = original?.template;

      library.instantiate('technical-deep-dive', {
        word_count: '1500',
        topic: 'test',
        audience: 'test',
        example_structure: 'test'
      });

      const after = library.getTemplate('technical-deep-dive');
      expect(after?.template).toBe(originalTemplate);
    });
  });
});
