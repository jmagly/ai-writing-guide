import { describe, it, expect, beforeEach, test } from 'vitest';
import { PromptTemplateLibrary, PromptTemplate } from '../../../src/writing/prompt-templates.ts';

describe('PromptTemplateLibrary', () => {
  let library: PromptTemplateLibrary;

  beforeEach(() => {
    library = new PromptTemplateLibrary();
  });

  describe('Template Loading', () => {
    it('should load built-in templates with unique IDs and complete metadata', () => {
      const templates = library.listAll();

      expect(templates.length).toBeGreaterThan(10);

      const ids = templates.map(t => t.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);

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

    it('should load templates in all categories', () => {
      const technical = library.listByCategory('technical');
      expect(technical.length).toBeGreaterThan(5);

      const executive = library.listByCategory('executive');
      expect(executive.length).toBeGreaterThan(0);

      const academic = library.listByCategory('academic');
      expect(academic.length).toBeGreaterThan(0);

      const creative = library.listByCategory('creative');
      expect(creative.length).toBeGreaterThan(0);
    });
  });

  describe('Template Retrieval', () => {
    it('should get template by ID or return undefined', () => {
      const template = library.getTemplate('technical-deep-dive');
      expect(template).toBeDefined();
      expect(template?.id).toBe('technical-deep-dive');

      const nonExistent = library.getTemplate('non-existent');
      expect(nonExistent).toBeUndefined();
    });

    it('should list templates by category', () => {
      const technical = library.listByCategory('technical');
      expect(technical.every(t => t.category === 'technical')).toBe(true);

      const result = library.listByCategory('non-existent');
      expect(result).toEqual([]);
    });

    it('should search templates by keyword case-insensitively', () => {
      const securityResults = library.search('security');
      expect(securityResults.length).toBeGreaterThan(0);
      expect(securityResults.some(t => t.id.includes('security') || t.template.includes('security'))).toBe(true);

      const upperResults = library.search('TECHNICAL');
      expect(upperResults.length).toBeGreaterThan(0);

      const contentResults = library.search('OAuth');
      expect(contentResults.length).toBeGreaterThan(0);

      const noResults = library.search('xyzabc123notfound');
      expect(noResults).toEqual([]);
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

    it('should throw errors for missing template or variables', () => {
      expect(() => {
        library.instantiate('non-existent', {});
      }).toThrow('Template not found');

      expect(() => {
        library.instantiate('technical-deep-dive', {
          word_count: '1500'
        });
      }).toThrow('Missing template variables');
    });

    it('should replace all occurrences and handle special characters', () => {
      const multiTemplate: PromptTemplate = {
        id: 'test-multi',
        name: 'Test Multiple',
        category: 'technical',
        template: 'Write about {topic}. More about {topic}. Even more {topic}.',
        variables: ['topic'],
        example: 'test',
        principles: []
      };
      library.addTemplate(multiTemplate);

      const multiResult = library.instantiate('test-multi', { topic: 'testing' });
      const matches = multiResult.match(/testing/g);
      expect(matches?.length).toBe(3);

      const specialTemplate: PromptTemplate = {
        id: 'test-special',
        name: 'Test Special',
        category: 'technical',
        template: 'Write about {topic}',
        variables: ['topic'],
        example: 'test',
        principles: []
      };
      library.addTemplate(specialTemplate);

      const specialResult = library.instantiate('test-special', { topic: 'C++ & Rust' });
      expect(specialResult).toContain('C++ & Rust');
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
    it('should add and remove custom templates', () => {
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

      const toRemove: PromptTemplate = {
        id: 'to-remove',
        name: 'To Remove',
        category: 'technical',
        template: 'test',
        variables: [],
        example: 'test',
        principles: []
      };
      library.addTemplate(toRemove);
      expect(library.getTemplate('to-remove')).toBeDefined();

      const removed = library.removeTemplate('to-remove');
      expect(removed).toBe(true);
      expect(library.getTemplate('to-remove')).toBeUndefined();

      const removedNonExistent = library.removeTemplate('non-existent');
      expect(removedNonExistent).toBe(false);
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
    test.each([
      { id: 'technical-deep-dive', category: 'technical', contentMatch: null },
      { id: 'technical-tutorial', category: null, contentMatch: 'tutorial' },
      { id: 'architecture-analysis', category: null, contentMatch: 'architecture' },
      { id: 'executive-brief', category: 'executive', contentMatch: null },
      { id: 'academic-analysis', category: 'academic', contentMatch: null },
      { id: 'performance-report', category: null, contentMatch: 'performance' },
      { id: 'api-documentation', category: null, contentMatch: 'api' },
      { id: 'security-analysis', category: null, contentMatch: 'security' },
      { id: 'incident-postmortem', category: null, contentMatch: 'incident' },
      { id: 'code-review-guide', category: null, contentMatch: 'code review' }
    ])('should have template $id with correct properties', ({ id, category, contentMatch }) => {
      const template = library.getTemplate(id);
      expect(template).toBeDefined();

      if (category) {
        expect(template?.category).toBe(category);
      }

      if (contentMatch) {
        expect(template?.template.toLowerCase()).toContain(contentMatch);
      }
    });
  });

  describe('Template Content Quality', () => {
    it('should include AI pattern avoidance and specific examples', () => {
      const templates = library.listAll();

      const withPatternGuidance = templates.filter(t =>
        t.template.toLowerCase().includes('avoid') &&
        (t.template.toLowerCase().includes('seamless') ||
         t.template.toLowerCase().includes('comprehensive') ||
         t.template.toLowerCase().includes('robust'))
      );
      expect(withPatternGuidance.length).toBeGreaterThan(5);

      const allHaveExamples = templates.every(t => t.example.length > 10);
      expect(allHaveExamples).toBe(true);

      const allHavePrinciples = templates.every(t => t.principles.length > 0);
      expect(allHavePrinciples).toBe(true);
    });

    it('should avoid AI patterns in template text', () => {
      const templates = library.listAll();
      const aiPatterns = ['Moreover,', 'Furthermore,', 'In conclusion,'];

      templates.forEach(t => {
        aiPatterns.forEach(pattern => {
          const lowerTemplate = t.template.toLowerCase();
          const lowerPattern = pattern.toLowerCase();
          const idx = lowerTemplate.indexOf(lowerPattern);
          if (idx !== -1) {
            const preceding = lowerTemplate.slice(Math.max(0, idx - 50), idx);
            const isInstructional = preceding.includes('no ') || preceding.includes('avoid') || preceding.includes('"');
            if (!isInstructional) {
              expect(lowerTemplate).not.toContain(lowerPattern);
            }
          }
        });
      });
    });

    it('should include requirements sections and specific guidance', () => {
      const technicalTemplates = library.listByCategory('technical');
      const withRequirements = technicalTemplates.filter(t =>
        t.template.includes('Requirements:') || t.template.includes('Constraints:')
      );
      expect(withRequirements.length).toBeGreaterThan(5);

      const template = library.getTemplate('technical-deep-dive');
      expect(template?.template).toContain('Avoid');
      expect(template?.template).toContain('Include');
      expect(template?.template.toLowerCase()).not.toContain('use best practices');
    });
  });

  describe('Category Coverage', () => {
    it('should have minimum templates in each category', () => {
      const technical = library.listByCategory('technical');
      expect(technical.length).toBeGreaterThanOrEqual(7);

      const executive = library.listByCategory('executive');
      expect(executive.length).toBeGreaterThanOrEqual(2);

      const academic = library.listByCategory('academic');
      expect(academic.length).toBeGreaterThanOrEqual(1);

      const creative = library.listByCategory('creative');
      expect(creative.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Template Variables', () => {
    it('should declare all required variables with consistent naming', () => {
      const templates = library.listAll();

      const allVariablesValid = templates.every(t => {
        const placeholders = t.template.match(/\{([^}]+)\}/g) || [];
        const uniquePlaceholders = new Set(
          placeholders.map(p => p.replace(/[{}]/g, ''))
        );

        const hasRequiredVariables = t.variables.length >= uniquePlaceholders.size;
        const hasConsistentNaming = t.variables.every(v => /^[a-z_0-9]+$/.test(v));
        const hasExamples = t.example.length > 0;

        return hasRequiredVariables && hasConsistentNaming && hasExamples;
      });

      expect(allVariablesValid).toBe(true);
    });
  });

  describe('Template Completeness', () => {
    test.each([
      {
        id: 'technical-deep-dive',
        variables: ['word_count', 'topic', 'audience'],
        contentChecks: [
          { pattern: 'Requirements:', exact: true },
          { pattern: 'avoid ai detection', exact: false }
        ]
      },
      {
        id: 'executive-brief',
        variables: ['topic', 'stakeholders', 'word_count'],
        contentChecks: [
          { pattern: 'bottom-line', exact: false }
        ]
      },
      {
        id: 'academic-analysis',
        variables: ['topic', 'theoretical_framework'],
        contentChecks: [
          { pattern: 'cite', exact: false },
          { pattern: 'peer-reviewed', exact: false }
        ]
      },
      {
        id: 'security-analysis',
        variables: ['system', 'threat_model'],
        contentChecks: [
          { pattern: 'threat', exact: false },
          { pattern: 'vulnerabilit', exact: false }
        ]
      },
      {
        id: 'incident-postmortem',
        variables: ['incident_title', 'severity'],
        contentChecks: [
          { pattern: 'timeline', exact: false },
          { pattern: 'root cause', exact: false }
        ]
      }
    ])('should have complete definition for $id', ({ id, variables, contentChecks }) => {
      const template = library.getTemplate(id);

      variables.forEach(variable => {
        expect(template?.variables).toContain(variable);
      });

      contentChecks.forEach(({ pattern, exact }) => {
        if (exact) {
          expect(template?.template).toContain(pattern);
        } else {
          expect(template?.template.toLowerCase()).toContain(pattern);
        }
      });
    });
  });

  describe('Search Functionality', () => {
    it('should find templates by various criteria', () => {
      const idResults = library.search('technical');
      expect(idResults.length).toBeGreaterThan(0);
      expect(idResults.some(t => t.id.includes('technical'))).toBe(true);

      const nameResults = library.search('Deep Dive');
      expect(nameResults.length).toBeGreaterThan(0);

      const contentResults = library.search('authentication');
      expect(contentResults.length).toBeGreaterThan(0);

      const emptyResults = library.search('');
      expect(emptyResults.length).toBe(library.listAll().length);

      const whitespaceResults = library.search('  technical  ');
      expect(whitespaceResults.length).toBeGreaterThan(0);
    });
  });

  describe('List Operations', () => {
    it('should list all templates without duplicates and return different instances', () => {
      const all = library.listAll();
      const ids = all.map(t => t.id);
      const uniqueIds = new Set(ids);
      expect(ids.length).toBe(uniqueIds.size);

      const list1 = library.listAll();
      const list2 = library.listAll();
      expect(list1).not.toBe(list2);
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
    it('should emphasize key writing principles', () => {
      const templates = library.listAll();

      const withSpecificity = templates.filter(t =>
        t.principles.some(p =>
          p.toLowerCase().includes('specific') ||
          p.toLowerCase().includes('concrete') ||
          p.toLowerCase().includes('exact')
        )
      );
      expect(withSpecificity.length).toBeGreaterThan(5);

      const withExamples = templates.filter(t =>
        t.principles.some(p => p.toLowerCase().includes('example'))
      );
      expect(withExamples.length).toBeGreaterThan(3);

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
    it('should handle malformed placeholders and provide helpful errors', () => {
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

      expect(() => {
        library.instantiate('technical-deep-dive', {});
      }).toThrow(/Missing template variables/);
    });
  });

  describe('Template Reusability', () => {
    it('should allow multiple instantiations without modifying original', () => {
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
