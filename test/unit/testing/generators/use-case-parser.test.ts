/**
 * Tests for UseCaseParser
 *
 * @module test/unit/testing/generators/use-case-parser.test
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { UseCaseParser } from '../../../../src/testing/generators/use-case-parser.js';

describe('UseCaseParser', () => {
  let parser: UseCaseParser;
  let testDir: string;

  beforeEach(async () => {
    parser = new UseCaseParser();
    testDir = path.join(os.tmpdir(), `use-case-parser-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('parseContent', () => {
    it('should parse a basic use case document', () => {
      const content = `
# UC-001: User Login

**Primary Actor**: User
**Description**: User logs into the system

## Preconditions

- User has an account
- System is available

## Main Success Scenario

1. User navigates to login page
2. User enters credentials
3. System validates credentials
4. System redirects to dashboard

## Postconditions

- User is authenticated
- Session is created
`;

      const result = parser.parseContent(content, 'UC-001.md');

      expect(result.success).toBe(true);
      expect(result.document?.id).toBe('UC-001');
      expect(result.document?.title).toBe('UC-001: User Login');
      expect(result.document?.actor).toBe('User');
      expect(result.document?.preconditions).toHaveLength(2);
      expect(result.document?.postconditions).toHaveLength(2);
      expect(result.document?.mainScenario.steps).toHaveLength(4);
    });

    it('should extract use case ID from content', () => {
      const content = `
# UC-042: Create Project

## Main Success Scenario

1. User creates project
`;

      const result = parser.parseContent(content);

      expect(result.success).toBe(true);
      expect(result.document?.id).toBe('UC-042');
    });

    it('should extract use case ID from filename', () => {
      const content = `
# Create Project

## Main Success Scenario

1. User creates project
`;

      const result = parser.parseContent(content, 'UC-055-create-project.md');

      expect(result.success).toBe(true);
      expect(result.document?.id).toBe('UC-055');
    });

    it('should parse preconditions', () => {
      const content = `
# UC-001

## Preconditions

- First precondition
- Second precondition
- Third precondition

## Main Success Scenario

1. Step one
`;

      const result = parser.parseContent(content);

      expect(result.document?.preconditions).toHaveLength(3);
      expect(result.document?.preconditions[0]).toBe('First precondition');
    });

    it('should parse postconditions', () => {
      const content = `
# UC-001

## Main Success Scenario

1. Step one

## Postconditions

- First postcondition
- Second postcondition
`;

      const result = parser.parseContent(content);

      expect(result.document?.postconditions).toHaveLength(2);
    });

    it('should parse main success scenario steps', () => {
      const content = `
# UC-001

## Main Success Scenario

1. User enters username
2. System validates input
3. **User** clicks submit
4. System processes request
`;

      const result = parser.parseContent(content);

      const steps = result.document?.mainScenario.steps;
      expect(steps).toHaveLength(4);
      expect(steps?.[0].number).toBe(1);
      expect(steps?.[0].action).toBe('User enters username');
      expect(steps?.[0].actor).toBe('user');
      expect(steps?.[1].actor).toBe('system');
    });

    it('should parse extensions', () => {
      const content = `
# UC-001

## Main Success Scenario

1. User enters data
2. System validates
3. System saves

## Extensions

2a. Validation fails
   System displays error message
   User corrects input
   Return to step 2

3a. Save fails
   System logs error
   System notifies user
`;

      const result = parser.parseContent(content);

      expect(result.document?.extensions).toHaveLength(2);
      expect(result.document?.extensions[0].id).toBe('UC-001-EXT-2A');
      expect(result.document?.extensions[0].triggeredAt).toBe(2);
      expect(result.document?.extensions[1].id).toBe('UC-001-EXT-3A');
    });

    it('should parse exception scenarios', () => {
      const content = `
# UC-001

## Main Success Scenario

1. User logs in

## Exceptions

**Network Error**: Connection lost, display offline message
**Authentication Failed**: Invalid credentials, show error
`;

      const result = parser.parseContent(content);

      expect(result.document?.exceptions).toHaveLength(2);
      expect(result.document?.exceptions[0].name).toBe('Network Error');
      expect(result.document?.exceptions[0].type).toBe('exception');
    });

    it('should extract NFR references', () => {
      const content = `
# UC-001

This use case must satisfy NFR-PERF-001 and NFR-SEC-002.

## Main Success Scenario

1. User performs action (must meet NFR-USAB-003)
`;

      const result = parser.parseContent(content);

      expect(result.document?.nfrs).toContain('NFR-PERF-001');
      expect(result.document?.nfrs).toContain('NFR-SEC-002');
      expect(result.document?.nfrs).toContain('NFR-USAB-003');
    });

    it('should extract related use cases', () => {
      const content = `
# UC-001

Related: UC-002, UC-003

## Main Success Scenario

1. See UC-004 for details
`;

      const result = parser.parseContent(content);

      expect(result.document?.relatedUseCases).toContain('UC-002');
      expect(result.document?.relatedUseCases).toContain('UC-003');
      expect(result.document?.relatedUseCases).toContain('UC-004');
      expect(result.document?.relatedUseCases).not.toContain('UC-001'); // Self excluded
    });

    it('should normalize priority', () => {
      const testCases = [
        { input: 'Critical', expected: 'critical' },
        { input: 'P0', expected: 'critical' },
        { input: 'High', expected: 'high' },
        { input: 'P1', expected: 'high' },
        { input: 'Low', expected: 'low' },
        { input: 'P3', expected: 'low' },
        { input: 'Medium', expected: 'medium' },
        { input: 'Unknown', expected: 'medium' }
      ];

      for (const tc of testCases) {
        const content = `
# UC-001

**Priority**: ${tc.input}

## Main Success Scenario

1. Step
`;
        const result = parser.parseContent(content);
        expect(result.document?.priority).toBe(tc.expected);
      }
    });

    it('should warn when main scenario is missing', () => {
      const content = `
# UC-001

No scenario defined here.
`;

      const result = parser.parseContent(content);

      expect(result.success).toBe(true);
      expect(result.warnings).toContain('No main success scenario found');
    });

    it('should handle empty content', () => {
      const result = parser.parseContent('', 'UC-001.md');

      expect(result.success).toBe(true);
      expect(result.document?.id).toBe('UC-001');
      expect(result.document?.mainScenario.steps).toHaveLength(0);
    });
  });

  describe('parseFile', () => {
    it('should parse a use case file', async () => {
      const content = `
# UC-010: File Upload

**Actor**: User

## Main Success Scenario

1. User selects file
2. System uploads file
3. System confirms upload
`;

      await fs.writeFile(path.join(testDir, 'UC-010.md'), content);

      const result = await parser.parseFile(path.join(testDir, 'UC-010.md'));

      expect(result.success).toBe(true);
      expect(result.document?.id).toBe('UC-010');
    });

    it('should return error for non-existent file', async () => {
      const result = await parser.parseFile(path.join(testDir, 'non-existent.md'));

      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('Failed to read file');
    });
  });

  describe('parseDirectory', () => {
    it('should parse all use case files in directory', async () => {
      const uc1 = `# UC-001\n\n## Main Success Scenario\n\n1. Step 1`;
      const uc2 = `# UC-002\n\n## Main Success Scenario\n\n1. Step 1`;
      const other = `# README\n\nNot a use case`;

      await fs.writeFile(path.join(testDir, 'UC-001.md'), uc1);
      await fs.writeFile(path.join(testDir, 'UC-002.md'), uc2);
      await fs.writeFile(path.join(testDir, 'README.md'), other);

      const results = await parser.parseDirectory(testDir);

      expect(results.size).toBe(2);
      expect(results.has('UC-001.md')).toBe(true);
      expect(results.has('UC-002.md')).toBe(true);
      expect(results.has('README.md')).toBe(false);
    });

    it('should return empty map for non-existent directory', async () => {
      const results = await parser.parseDirectory(path.join(testDir, 'non-existent'));

      expect(results.size).toBe(0);
    });
  });

  describe('extractTestableScenarios', () => {
    it('should extract all scenarios from document', () => {
      const content = `
# UC-001

## Main Success Scenario

1. Main step

## Extensions

2a. Extension step

## Exceptions

**Error**: Error handling
`;

      const result = parser.parseContent(content);
      const scenarios = parser.extractTestableScenarios(result.document!);

      expect(scenarios).toHaveLength(3); // main + 1 extension + 1 exception
      expect(scenarios[0].type).toBe('main');
      expect(scenarios[1].type).toBe('extension');
      expect(scenarios[2].type).toBe('exception');
    });
  });

  describe('Actor Detection', () => {
    it('should detect user actor from step content', () => {
      const content = `
# UC-001

## Main Success Scenario

1. User clicks button
2. User enters data
`;

      const result = parser.parseContent(content);
      const steps = result.document?.mainScenario.steps;

      expect(steps?.[0].actor).toBe('user');
      expect(steps?.[1].actor).toBe('user');
    });

    it('should detect system actor from step content', () => {
      const content = `
# UC-001

## Main Success Scenario

1. System validates input
2. System displays message
`;

      const result = parser.parseContent(content);
      const steps = result.document?.mainScenario.steps;

      expect(steps?.[0].actor).toBe('system');
      expect(steps?.[1].actor).toBe('system');
    });

    it('should detect actor from bold markup', () => {
      const content = `
# UC-001

## Main Success Scenario

1. **User** performs action
2. **System** responds
`;

      const result = parser.parseContent(content);
      const steps = result.document?.mainScenario.steps;

      expect(steps?.[0].actor).toBe('user');
      expect(steps?.[1].actor).toBe('system');
    });
  });
});
