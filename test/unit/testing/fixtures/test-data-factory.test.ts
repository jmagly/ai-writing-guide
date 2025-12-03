/**
 * Tests for TestDataFactory
 *
 * @module test/unit/testing/fixtures/test-data-factory.test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  TestDataFactory,
  DataSchema,
  CommonSchemas
} from '../../../../src/testing/fixtures/test-data-factory.js';

describe('TestDataFactory', () => {
  let factory: TestDataFactory;

  beforeEach(() => {
    factory = new TestDataFactory(12345); // Fixed seed for deterministic tests
  });

  describe('Type Generators', () => {
    describe('generateString', () => {
      it('should generate string within length bounds', () => {
        const result = factory.generateString(5, 10);

        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThanOrEqual(5);
        expect(result.length).toBeLessThanOrEqual(10);
      });

      it('should generate string with default length', () => {
        const result = factory.generateString();

        expect(result.length).toBeGreaterThanOrEqual(1);
        expect(result.length).toBeLessThanOrEqual(50);
      });

      it('should generate string from pattern', () => {
        const result = factory.generateString(1, 10, '[A-Z][a-z][0-9]');

        expect(result).toMatch(/^[A-Z][a-z][0-9]$/);
      });
    });

    describe('generateNumber', () => {
      it('should generate number within range', () => {
        const result = factory.generateNumber(10, 20);

        expect(result).toBeGreaterThanOrEqual(10);
        expect(result).toBeLessThanOrEqual(20);
      });

      it('should generate number with default range', () => {
        const result = factory.generateNumber();

        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThanOrEqual(1000);
      });
    });

    describe('generateInteger', () => {
      it('should generate integer within range', () => {
        const result = factory.generateInteger(1, 10);

        expect(Number.isInteger(result)).toBe(true);
        expect(result).toBeGreaterThanOrEqual(1);
        expect(result).toBeLessThanOrEqual(10);
      });
    });

    describe('generateBoolean', () => {
      it('should generate boolean value', () => {
        const result = factory.generateBoolean();

        expect(typeof result).toBe('boolean');
      });
    });

    describe('generateDate', () => {
      it('should generate date within year range', () => {
        const result = factory.generateDate(2020, 2025);

        expect(result instanceof Date).toBe(true);
        expect(result.getFullYear()).toBeGreaterThanOrEqual(2020);
        expect(result.getFullYear()).toBeLessThanOrEqual(2025);
      });
    });

    describe('generateDatetime', () => {
      it('should generate datetime with time components', () => {
        const result = factory.generateDatetime();

        expect(result instanceof Date).toBe(true);
        expect(result.getHours()).toBeDefined();
        expect(result.getMinutes()).toBeDefined();
      });
    });

    describe('generateEmail', () => {
      it('should generate valid email format', () => {
        const result = factory.generateEmail();

        expect(result).toMatch(/^[a-z0-9]+@[a-z]+\.[a-z]+$/i);
      });
    });

    describe('generateUrl', () => {
      it('should generate valid URL format', () => {
        const result = factory.generateUrl();

        expect(result).toMatch(/^https?:\/\/[a-z0-9]+\.[a-z]+$/i);
      });
    });

    describe('generateUuid', () => {
      it('should generate valid UUID format', () => {
        const result = factory.generateUuid();

        expect(result).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        );
      });
    });

    describe('generateEnum', () => {
      it('should generate value from enum list', () => {
        const values = ['red', 'green', 'blue'];
        const result = factory.generateEnum(values);

        expect(values).toContain(result);
      });

      it('should return empty string for empty enum', () => {
        const result = factory.generateEnum([]);

        expect(result).toBe('');
      });
    });

    describe('generateArray', () => {
      it('should generate array with specified generator', () => {
        const result = factory.generateArray(() => 'item', 3, 5);

        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThanOrEqual(3);
        expect(result.length).toBeLessThanOrEqual(5);
        expect(result.every(item => item === 'item')).toBe(true);
      });
    });
  });

  describe('Schema-based Generation', () => {
    describe('generateFromSchema', () => {
      it('should generate fixtures from simple schema', () => {
        const schema: DataSchema = {
          name: 'SimpleObject',
          fields: [
            { name: 'name', type: 'string', constraints: { minLength: 1, maxLength: 50 } },
            { name: 'age', type: 'integer', constraints: { min: 0, max: 100 } }
          ]
        };

        const result = factory.generateFromSchema(schema);

        expect(result.valid).toBeDefined();
        expect(typeof result.valid.name).toBe('string');
        expect(typeof result.valid.age).toBe('number');
      });

      it('should generate invalid fixtures', () => {
        const schema: DataSchema = {
          name: 'Test',
          fields: [
            { name: 'email', type: 'email' },
            { name: 'count', type: 'integer', constraints: { max: 100 } }
          ]
        };

        const result = factory.generateFromSchema(schema);

        expect(result.invalid.length).toBeGreaterThan(0);
      });

      it('should generate boundary fixtures', () => {
        const schema: DataSchema = {
          name: 'Test',
          fields: [
            { name: 'value', type: 'integer', constraints: { min: 0, max: 100 } }
          ]
        };

        const result = factory.generateFromSchema(schema);

        expect(result.boundary.length).toBeGreaterThan(0);
        expect(result.boundary.some(b => b.value === 0)).toBe(true);
        expect(result.boundary.some(b => b.value === 100)).toBe(true);
      });

      it('should generate null case fixtures for nullable fields', () => {
        const schema: DataSchema = {
          name: 'Test',
          fields: [
            { name: 'optionalField', type: 'string', nullable: true },
            { name: 'requiredField', type: 'string', nullable: false }
          ]
        };

        const result = factory.generateFromSchema(schema);

        expect(result.nullCases.length).toBe(1);
        expect(result.nullCases[0].optionalField).toBeNull();
      });

      it('should respect options to disable fixture types', () => {
        const schema: DataSchema = {
          name: 'Test',
          fields: [{ name: 'value', type: 'integer' }]
        };

        const result = factory.generateFromSchema(schema, {
          includeInvalid: false,
          includeBoundary: false,
          includeNullCases: false
        });

        expect(result.invalid.length).toBe(0);
        expect(result.boundary.length).toBe(0);
        expect(result.nullCases.length).toBe(0);
      });
    });

    describe('generateValidRecord', () => {
      it('should generate valid record from schema', () => {
        const schema: DataSchema = {
          name: 'User',
          fields: [
            { name: 'id', type: 'uuid' },
            { name: 'email', type: 'email' },
            { name: 'active', type: 'boolean', defaultValue: true }
          ]
        };

        const result = factory.generateValidRecord(schema);

        expect(result.id).toBeDefined();
        expect(result.email).toMatch(/@/);
        expect(result.active).toBe(true);
      });
    });

    describe('generateValidRecords', () => {
      it('should generate multiple valid records', () => {
        const schema: DataSchema = {
          name: 'Item',
          fields: [{ name: 'name', type: 'string' }]
        };

        const results = factory.generateValidRecords(schema, 5);

        expect(results.length).toBe(5);
        results.forEach(record => {
          expect(typeof record.name).toBe('string');
        });
      });
    });

    describe('generateInvalidRecords', () => {
      it('should generate records with one invalid field each', () => {
        const schema: DataSchema = {
          name: 'Test',
          fields: [
            { name: 'text', type: 'string', constraints: { maxLength: 10 } },
            { name: 'number', type: 'integer', constraints: { max: 50 } }
          ]
        };

        const results = factory.generateInvalidRecords(schema, 5);

        expect(results.length).toBeGreaterThan(0);
        expect(results.length).toBeLessThanOrEqual(5);
      });
    });

    describe('generateBoundaryRecords', () => {
      it('should generate boundary values for string fields', () => {
        const schema: DataSchema = {
          name: 'Test',
          fields: [
            { name: 'text', type: 'string', constraints: { minLength: 5, maxLength: 10 } }
          ]
        };

        const results = factory.generateBoundaryRecords(schema);

        const lengths = results.map(r => r.text.length);
        expect(lengths).toContain(5);  // minLength
        expect(lengths).toContain(10); // maxLength
        expect(lengths).toContain(4);  // minLength - 1
        expect(lengths).toContain(11); // maxLength + 1
      });

      it('should generate boundary values for numeric fields', () => {
        const schema: DataSchema = {
          name: 'Test',
          fields: [
            { name: 'value', type: 'integer', constraints: { min: 10, max: 100 } }
          ]
        };

        const results = factory.generateBoundaryRecords(schema);

        const values = results.map(r => r.value);
        expect(values).toContain(10);   // min
        expect(values).toContain(100);  // max
        expect(values).toContain(9);    // min - 1
        expect(values).toContain(101);  // max + 1
      });
    });
  });

  describe('Edge Case Generators', () => {
    describe('generateXssPayloads', () => {
      it('should return XSS attack strings', () => {
        const payloads = factory.generateXssPayloads();

        expect(payloads.length).toBeGreaterThan(0);
        expect(payloads.some(p => p.includes('<script>'))).toBe(true);
        expect(payloads.some(p => p.includes('onerror'))).toBe(true);
      });
    });

    describe('generateSqlInjectionPayloads', () => {
      it('should return SQL injection strings', () => {
        const payloads = factory.generateSqlInjectionPayloads();

        expect(payloads.length).toBeGreaterThan(0);
        expect(payloads.some(p => p.includes('DROP TABLE'))).toBe(true);
        expect(payloads.some(p => p.includes("'"))).toBe(true);
      });
    });

    describe('generatePathTraversalPayloads', () => {
      it('should return path traversal strings', () => {
        const payloads = factory.generatePathTraversalPayloads();

        expect(payloads.length).toBeGreaterThan(0);
        expect(payloads.some(p => p.includes('../'))).toBe(true);
        expect(payloads.some(p => p.includes('etc/passwd'))).toBe(true);
      });
    });

    describe('generateOverflowStrings', () => {
      it('should return overflow test strings', () => {
        const payloads = factory.generateOverflowStrings();

        expect(payloads.length).toBeGreaterThan(0);
        expect(payloads).toContain('');  // Empty string
        expect(payloads.some(p => p.length > 1000)).toBe(true);  // Long string
      });
    });
  });

  describe('CommonSchemas', () => {
    it('should have user schema', () => {
      expect(CommonSchemas.user).toBeDefined();
      expect(CommonSchemas.user.name).toBe('User');
      expect(CommonSchemas.user.fields.length).toBeGreaterThan(0);
    });

    it('should have project schema', () => {
      expect(CommonSchemas.project).toBeDefined();
      expect(CommonSchemas.project.name).toBe('Project');
    });

    it('should have testCase schema', () => {
      expect(CommonSchemas.testCase).toBeDefined();
      expect(CommonSchemas.testCase.name).toBe('TestCase');
    });

    it('should be usable with factory', () => {
      const result = factory.generateFromSchema(CommonSchemas.user);

      expect(result.valid.id).toBeDefined();
      expect(result.valid.email).toMatch(/@/);
      expect(typeof result.valid.active).toBe('boolean');
    });
  });

  describe('Deterministic Generation', () => {
    it('should produce same results with same seed', () => {
      const factory1 = new TestDataFactory(99999);
      const factory2 = new TestDataFactory(99999);

      const result1 = factory1.generateString(10, 10);
      const result2 = factory2.generateString(10, 10);

      expect(result1).toBe(result2);
    });

    it('should produce different results with different seeds', () => {
      const factory1 = new TestDataFactory(11111);
      const factory2 = new TestDataFactory(22222);

      const result1 = factory1.generateString(20, 20);
      const result2 = factory2.generateString(20, 20);

      expect(result1).not.toBe(result2);
    });
  });

  describe('Field Type Handling', () => {
    it('should handle all field types', () => {
      const schema: DataSchema = {
        name: 'AllTypes',
        fields: [
          { name: 'string', type: 'string' },
          { name: 'number', type: 'number' },
          { name: 'integer', type: 'integer' },
          { name: 'boolean', type: 'boolean' },
          { name: 'date', type: 'date' },
          { name: 'datetime', type: 'datetime' },
          { name: 'email', type: 'email' },
          { name: 'url', type: 'url' },
          { name: 'uuid', type: 'uuid' },
          { name: 'enum', type: 'enum', constraints: { enumValues: ['a', 'b'] } },
          { name: 'array', type: 'array' },
          { name: 'object', type: 'object' }
        ]
      };

      const result = factory.generateValidRecord(schema);

      expect(typeof result.string).toBe('string');
      expect(typeof result.number).toBe('number');
      expect(Number.isInteger(result.integer)).toBe(true);
      expect(typeof result.boolean).toBe('boolean');
      expect(result.email).toMatch(/@/);
      expect(result.url).toMatch(/^https?:\/\//);
      expect(result.uuid).toMatch(/^[0-9a-f-]{36}$/i);
      expect(['a', 'b']).toContain(result.enum);
      expect(Array.isArray(result.array)).toBe(true);
      expect(typeof result.object).toBe('object');
    });
  });
});
