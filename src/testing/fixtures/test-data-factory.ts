/**
 * TestDataFactory - Generate test fixtures and synthetic data
 *
 * Provides methods to generate test fixtures from use case examples,
 * edge case data (boundary values, null, invalid), and synthetic data
 * for comprehensive test coverage.
 *
 * @module src/testing/fixtures/test-data-factory
 */

import * as crypto from 'crypto';

// ===========================
// Interfaces
// ===========================

export interface DataSchema {
  name: string;
  fields: FieldSchema[];
}

export interface FieldSchema {
  name: string;
  type: FieldType;
  constraints?: FieldConstraints;
  nullable?: boolean;
  defaultValue?: any;
}

export type FieldType =
  | 'string'
  | 'number'
  | 'integer'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'email'
  | 'url'
  | 'uuid'
  | 'enum'
  | 'array'
  | 'object';

export interface FieldConstraints {
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  enumValues?: string[];
  format?: string;
}

export interface GeneratedFixture {
  valid: Record<string, any>;
  invalid: Record<string, any>[];
  boundary: Record<string, any>[];
  nullCases: Record<string, any>[];
}

export interface FixtureOptions {
  includeInvalid?: boolean;
  includeBoundary?: boolean;
  includeNullCases?: boolean;
  seed?: number;
  count?: number;
}

// ===========================
// TestDataFactory Class
// ===========================

export class TestDataFactory {
  private seed: number;
  private rng: () => number;

  constructor(seed?: number) {
    this.seed = seed ?? Date.now();
    this.rng = this.createSeededRng(this.seed);
  }

  /**
   * Generate fixtures from a data schema
   *
   * @param schema - Data schema definition
   * @param options - Generation options
   * @returns Generated fixtures
   */
  generateFromSchema(schema: DataSchema, options: FixtureOptions = {}): GeneratedFixture {
    const opts = {
      includeInvalid: true,
      includeBoundary: true,
      includeNullCases: true,
      count: 3,
      ...options
    };

    // Generate valid fixture
    const valid = this.generateValidRecord(schema);

    // Generate invalid fixtures
    const invalid = opts.includeInvalid
      ? this.generateInvalidRecords(schema, opts.count!)
      : [];

    // Generate boundary fixtures
    const boundary = opts.includeBoundary
      ? this.generateBoundaryRecords(schema)
      : [];

    // Generate null case fixtures
    const nullCases = opts.includeNullCases
      ? this.generateNullCaseRecords(schema)
      : [];

    return { valid, invalid, boundary, nullCases };
  }

  /**
   * Generate a valid record based on schema
   *
   * @param schema - Data schema
   * @returns Valid record
   */
  generateValidRecord(schema: DataSchema): Record<string, any> {
    const record: Record<string, any> = {};

    for (const field of schema.fields) {
      record[field.name] = this.generateValidValue(field);
    }

    return record;
  }

  /**
   * Generate multiple valid records
   *
   * @param schema - Data schema
   * @param count - Number of records to generate
   * @returns Array of valid records
   */
  generateValidRecords(schema: DataSchema, count: number): Record<string, any>[] {
    const records: Record<string, any>[] = [];

    for (let i = 0; i < count; i++) {
      records.push(this.generateValidRecord(schema));
    }

    return records;
  }

  /**
   * Generate invalid records (one invalid field per record)
   *
   * @param schema - Data schema
   * @param count - Maximum number of invalid records
   * @returns Array of invalid records
   */
  generateInvalidRecords(schema: DataSchema, count: number): Record<string, any>[] {
    const records: Record<string, any>[] = [];

    for (const field of schema.fields) {
      if (records.length >= count) break;

      const record = this.generateValidRecord(schema);
      record[field.name] = this.generateInvalidValue(field);
      records.push(record);
    }

    return records;
  }

  /**
   * Generate boundary value records
   *
   * @param schema - Data schema
   * @returns Array of boundary records
   */
  generateBoundaryRecords(schema: DataSchema): Record<string, any>[] {
    const records: Record<string, any>[] = [];

    for (const field of schema.fields) {
      const boundaryValues = this.generateBoundaryValues(field);

      for (const value of boundaryValues) {
        const record = this.generateValidRecord(schema);
        record[field.name] = value;
        records.push(record);
      }
    }

    return records;
  }

  /**
   * Generate null case records (null for each nullable field)
   *
   * @param schema - Data schema
   * @returns Array of null case records
   */
  generateNullCaseRecords(schema: DataSchema): Record<string, any>[] {
    const records: Record<string, any>[] = [];

    for (const field of schema.fields) {
      if (field.nullable) {
        const record = this.generateValidRecord(schema);
        record[field.name] = null;
        records.push(record);
      }
    }

    return records;
  }

  // ===========================
  // Type-Specific Generators
  // ===========================

  /**
   * Generate a string value
   */
  generateString(minLength: number = 1, maxLength: number = 50, pattern?: string): string {
    if (pattern) {
      return this.generateFromPattern(pattern);
    }

    const length = this.randomInt(minLength, maxLength);
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';

    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(this.rng() * chars.length));
    }

    return result;
  }

  /**
   * Generate a number value
   */
  generateNumber(min: number = 0, max: number = 1000): number {
    return min + this.rng() * (max - min);
  }

  /**
   * Generate an integer value
   */
  generateInteger(min: number = 0, max: number = 1000): number {
    return Math.floor(this.generateNumber(min, max));
  }

  /**
   * Generate a boolean value
   */
  generateBoolean(): boolean {
    return this.rng() > 0.5;
  }

  /**
   * Generate a date value
   */
  generateDate(minYear: number = 2000, maxYear: number = 2030): Date {
    const year = this.randomInt(minYear, maxYear);
    const month = this.randomInt(0, 11);
    const day = this.randomInt(1, 28);
    return new Date(year, month, day);
  }

  /**
   * Generate a datetime value
   */
  generateDatetime(minYear: number = 2000, maxYear: number = 2030): Date {
    const date = this.generateDate(minYear, maxYear);
    date.setHours(this.randomInt(0, 23));
    date.setMinutes(this.randomInt(0, 59));
    date.setSeconds(this.randomInt(0, 59));
    return date;
  }

  /**
   * Generate an email address
   */
  generateEmail(): string {
    const username = this.generateString(5, 10);
    const domains = ['example.com', 'test.org', 'demo.net', 'sample.io'];
    const domain = domains[Math.floor(this.rng() * domains.length)];
    return `${username.toLowerCase()}@${domain}`;
  }

  /**
   * Generate a URL
   */
  generateUrl(): string {
    const protocols = ['http', 'https'];
    const protocol = protocols[Math.floor(this.rng() * protocols.length)];
    const domain = this.generateString(5, 15).toLowerCase();
    const tlds = ['com', 'org', 'net', 'io'];
    const tld = tlds[Math.floor(this.rng() * tlds.length)];
    return `${protocol}://${domain}.${tld}`;
  }

  /**
   * Generate a UUID
   */
  generateUuid(): string {
    return crypto.randomUUID();
  }

  /**
   * Generate an enum value
   */
  generateEnum(values: string[]): string {
    if (values.length === 0) return '';
    return values[Math.floor(this.rng() * values.length)];
  }

  /**
   * Generate an array value
   */
  generateArray<T>(generator: () => T, minLength: number = 1, maxLength: number = 5): T[] {
    const length = this.randomInt(minLength, maxLength);
    const array: T[] = [];

    for (let i = 0; i < length; i++) {
      array.push(generator());
    }

    return array;
  }

  // ===========================
  // Edge Case Generators
  // ===========================

  /**
   * Generate XSS attack payloads
   */
  generateXssPayloads(): string[] {
    return [
      '<script>alert("xss")</script>',
      '"><img src=x onerror=alert(1)>',
      "javascript:alert('xss')",
      '<svg onload=alert(1)>',
      '{{constructor.constructor("alert(1)")()}}'
    ];
  }

  /**
   * Generate SQL injection payloads
   */
  generateSqlInjectionPayloads(): string[] {
    return [
      "'; DROP TABLE users; --",
      "1' OR '1'='1",
      "1; SELECT * FROM users",
      "' UNION SELECT * FROM passwords --",
      "admin'--"
    ];
  }

  /**
   * Generate path traversal payloads
   */
  generatePathTraversalPayloads(): string[] {
    return [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\config\\sam',
      '/etc/passwd%00',
      '....//....//....//etc/passwd',
      '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc/passwd'
    ];
  }

  /**
   * Generate overflow/boundary strings
   */
  generateOverflowStrings(): string[] {
    return [
      '',  // Empty
      ' ',  // Single space
      '   ',  // Multiple spaces
      'a'.repeat(256),  // 256 chars
      'a'.repeat(1024),  // 1KB
      'a'.repeat(65536),  // 64KB
      '\x00\x00\x00',  // Null bytes
      '\n\r\t',  // Control characters
      '🎉'.repeat(100)  // Unicode emoji
    ];
  }

  // ===========================
  // Private Helper Methods
  // ===========================

  private generateValidValue(field: FieldSchema): any {
    if (field.defaultValue !== undefined) {
      return field.defaultValue;
    }

    const constraints = field.constraints || {};

    switch (field.type) {
      case 'string':
        return this.generateString(
          constraints.minLength || 1,
          constraints.maxLength || 50,
          constraints.pattern
        );
      case 'number':
        return this.generateNumber(
          constraints.min || 0,
          constraints.max || 1000
        );
      case 'integer':
        return this.generateInteger(
          constraints.min || 0,
          constraints.max || 1000
        );
      case 'boolean':
        return this.generateBoolean();
      case 'date':
        return this.generateDate().toISOString().split('T')[0];
      case 'datetime':
        return this.generateDatetime().toISOString();
      case 'email':
        return this.generateEmail();
      case 'url':
        return this.generateUrl();
      case 'uuid':
        return this.generateUuid();
      case 'enum':
        return this.generateEnum(constraints.enumValues || []);
      case 'array':
        return [];
      case 'object':
        return {};
      default:
        return null;
    }
  }

  private generateInvalidValue(field: FieldSchema): any {
    const constraints = field.constraints || {};

    switch (field.type) {
      case 'string':
        // Return string that's too long
        if (constraints.maxLength) {
          return 'x'.repeat(constraints.maxLength + 10);
        }
        return 12345;  // Wrong type
      case 'number':
      case 'integer':
        // Return out of range value
        if (constraints.max !== undefined) {
          return constraints.max + 100;
        }
        return 'not-a-number';
      case 'boolean':
        return 'not-a-boolean';
      case 'date':
      case 'datetime':
        return 'not-a-date';
      case 'email':
        return 'not-an-email';
      case 'url':
        return 'not-a-url';
      case 'uuid':
        return 'not-a-uuid';
      case 'enum':
        return 'INVALID_ENUM_VALUE';
      default:
        return undefined;
    }
  }

  private generateBoundaryValues(field: FieldSchema): any[] {
    const values: any[] = [];
    const constraints = field.constraints || {};

    switch (field.type) {
      case 'string':
        if (constraints.minLength !== undefined) {
          values.push('x'.repeat(constraints.minLength));
          if (constraints.minLength > 0) {
            values.push('x'.repeat(constraints.minLength - 1));
          }
        }
        if (constraints.maxLength !== undefined) {
          values.push('x'.repeat(constraints.maxLength));
          values.push('x'.repeat(constraints.maxLength + 1));
        }
        break;

      case 'number':
      case 'integer':
        if (constraints.min !== undefined) {
          values.push(constraints.min);
          values.push(constraints.min - 1);
        }
        if (constraints.max !== undefined) {
          values.push(constraints.max);
          values.push(constraints.max + 1);
        }
        // Zero and negative
        values.push(0, -1, -0.1);
        break;

      case 'date':
      case 'datetime':
        values.push(
          new Date('1970-01-01').toISOString(),
          new Date('2099-12-31').toISOString(),
          new Date('1900-01-01').toISOString()
        );
        break;
    }

    return values;
  }

  private generateFromPattern(pattern: string): string {
    // Simple pattern support: [a-z] for lowercase, [A-Z] for uppercase, [0-9] for digits
    let result = '';
    let i = 0;

    while (i < pattern.length) {
      if (pattern[i] === '[' && pattern.indexOf(']', i) > i) {
        const end = pattern.indexOf(']', i);
        const charClass = pattern.substring(i + 1, end);

        if (charClass === 'a-z') {
          result += String.fromCharCode(97 + Math.floor(this.rng() * 26));
        } else if (charClass === 'A-Z') {
          result += String.fromCharCode(65 + Math.floor(this.rng() * 26));
        } else if (charClass === '0-9') {
          result += String(Math.floor(this.rng() * 10));
        } else {
          result += charClass.charAt(Math.floor(this.rng() * charClass.length));
        }
        i = end + 1;
      } else {
        result += pattern[i];
        i++;
      }
    }

    return result;
  }

  private randomInt(min: number, max: number): number {
    return Math.floor(this.rng() * (max - min + 1)) + min;
  }

  private createSeededRng(seed: number): () => number {
    // Simple seeded random number generator (xorshift)
    let state = seed;

    return () => {
      state ^= state << 13;
      state ^= state >> 17;
      state ^= state << 5;
      return (state >>> 0) / 4294967296;
    };
  }
}

// ===========================
// Pre-configured Schemas
// ===========================

export const CommonSchemas = {
  user: {
    name: 'User',
    fields: [
      { name: 'id', type: 'uuid' as FieldType },
      { name: 'email', type: 'email' as FieldType },
      { name: 'name', type: 'string' as FieldType, constraints: { minLength: 2, maxLength: 100 } },
      { name: 'age', type: 'integer' as FieldType, constraints: { min: 0, max: 150 }, nullable: true },
      { name: 'active', type: 'boolean' as FieldType, defaultValue: true },
      { name: 'createdAt', type: 'datetime' as FieldType }
    ]
  },

  project: {
    name: 'Project',
    fields: [
      { name: 'id', type: 'uuid' as FieldType },
      { name: 'name', type: 'string' as FieldType, constraints: { minLength: 1, maxLength: 200 } },
      { name: 'description', type: 'string' as FieldType, constraints: { maxLength: 1000 }, nullable: true },
      { name: 'status', type: 'enum' as FieldType, constraints: { enumValues: ['active', 'archived', 'draft'] } },
      { name: 'priority', type: 'integer' as FieldType, constraints: { min: 1, max: 5 } }
    ]
  },

  testCase: {
    name: 'TestCase',
    fields: [
      { name: 'id', type: 'string' as FieldType, constraints: { pattern: 'TC-[0-9][0-9][0-9]' } },
      { name: 'name', type: 'string' as FieldType, constraints: { minLength: 5, maxLength: 200 } },
      { name: 'priority', type: 'enum' as FieldType, constraints: { enumValues: ['critical', 'high', 'medium', 'low'] } },
      { name: 'automated', type: 'boolean' as FieldType, defaultValue: false },
      { name: 'estimatedDuration', type: 'integer' as FieldType, constraints: { min: 0 }, nullable: true }
    ]
  }
};
