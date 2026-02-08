/**
 * Tests for Laziness Detection Hook
 *
 * @source @src/hooks/laziness-detection.ts
 * @requirement @.aiwg/requirements/use-cases/UC-AP-001-detect-test-deletion.md
 * @requirement @.aiwg/requirements/use-cases/UC-AP-002-detect-feature-removal.md
 * @requirement @.aiwg/requirements/use-cases/UC-AP-003-detect-coverage-regression.md
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  LazinessDetectionHook,
  FileChange,
  BlockDecision,
  DetectedPattern,
} from '@/hooks/laziness-detection';
import * as path from 'path';

describe('LazinessDetectionHook', () => {
  let hook: LazinessDetectionHook;

  beforeEach(() => {
    const patternsPath = path.join(
      __dirname,
      '../../../.aiwg/patterns/laziness-patterns.yaml'
    );
    hook = new LazinessDetectionHook(patternsPath);
  });

  describe('Pattern: LP-001 - Complete Test File Deletion', () => {
    it('should detect complete test file deletion as CRITICAL and ignore partial modifications', async () => {
      const testCases = [
        {
          name: 'complete deletion',
          change: {
            path: 'test/unit/auth/validate.test.ts',
            type: 'deleted' as const,
            diff: `
- import { validatePassword } from '@/auth/validate';
- describe('validatePassword', () => {
-   it('should require minimum 8 characters', () => {
-     expect(validatePassword('short')).toBe(false);
-   });
- });
            `.trim(),
            linesAdded: 0,
            linesDeleted: 6,
          },
          expectBlock: true,
          expectPattern: 'LP-001',
          expectSeverity: 'CRITICAL',
        },
        {
          name: 'partial modification',
          change: {
            path: 'test/unit/auth/validate.test.ts',
            type: 'modified' as const,
            diff: `
- it('old test', () => {
+ it('new test', () => {
    expect(validate()).toBe(true);
  });
            `.trim(),
            linesAdded: 1,
            linesDeleted: 1,
          },
          expectBlock: false,
          expectPattern: null,
        },
      ];

      for (const tc of testCases) {
        const decision = await hook.analyze([tc.change]);

        if (tc.expectBlock) {
          expect(decision.block).toBe(true);
          expect(decision.patterns).toHaveLength(1);
          expect(decision.patterns[0].id).toBe(tc.expectPattern);
          expect(decision.patterns[0].severity).toBe(tc.expectSeverity);
          expect(decision.patterns[0].name).toBe('Complete Test File Deletion');
          expect(decision.reason).toContain('CRITICAL avoidance patterns');
        } else {
          const deletionPattern = decision.patterns.find((p) => p.id === 'LP-001');
          expect(deletionPattern).toBeUndefined();
        }
      }
    });
  });

  describe('Pattern: LP-002 - Test Suite Disabling', () => {
    it('should detect various test suite disabling patterns as HIGH severity', async () => {
      const testCases = [
        {
          name: 'describe.skip()',
          path: 'test/integration/api/users.test.ts',
          diff: `
- describe('POST /api/users', () => {
+ describe.skip('POST /api/users', () => {
    it('should create user', async () => {
      // ...
    });
  });
          `.trim(),
        },
        {
          name: '@Ignore annotation',
          path: 'test/integration/AuthTest.java',
          diff: `
+ @Ignore
  public class AuthTest {
    // ...
  }
          `.trim(),
        },
      ];

      for (const tc of testCases) {
        const change: FileChange = {
          path: tc.path,
          type: 'modified',
          diff: tc.diff,
          linesAdded: tc.diff.split('\n').filter((l) => l.startsWith('+')).length,
          linesDeleted: tc.diff.split('\n').filter((l) => l.startsWith('-')).length,
        };

        const decision = await hook.analyze([change]);

        expect(decision.block).toBe(true);
        const pattern = decision.patterns.find((p) => p.id === 'LP-002');
        expect(pattern).toBeDefined();
        expect(pattern?.severity).toBe('HIGH');
        expect(pattern?.name).toBe('Test Suite Disabling');
      }
    });
  });

  describe('Pattern: LP-003 - Multiple Individual Test Disabling', () => {
    it('should detect multiple test disabling patterns (it.skip, xit) as HIGH severity', async () => {
      const testCases = [
        {
          name: 'multiple it.skip()',
          path: 'test/unit/validators.test.ts',
          diff: `
- it('should validate email', () => {
+ it.skip('should validate email', () => {
    // ...
  });
- it('should validate phone', () => {
+ it.skip('should validate phone', () => {
    // ...
  });
- it('should validate address', () => {
+ it.skip('should validate address', () => {
    // ...
  });
- it('should validate zip', () => {
+ it.skip('should validate zip', () => {
    // ...
  });
          `.trim(),
          expectBlock: true,
          expectMatch: '4 tests disabled',
        },
        {
          name: 'xit() syntax - single test',
          path: 'test/unit/utils.test.ts',
          diff: `
- it('should format date', () => {
+ xit('should format date', () => {
    // ...
  });
          `.trim(),
          expectBlock: null, // May or may not block - depends on pattern threshold
          expectPattern: true, // Should detect the pattern
        },
      ];

      for (const tc of testCases) {
        const change: FileChange = {
          path: tc.path,
          type: 'modified',
          diff: tc.diff,
          linesAdded: tc.diff.split('\n').filter((l) => l.startsWith('+')).length,
          linesDeleted: tc.diff.split('\n').filter((l) => l.startsWith('-')).length,
        };

        const decision = await hook.analyze([change]);

        if (tc.expectBlock !== null) {
          expect(decision.block).toBe(tc.expectBlock);
        }

        if (tc.expectPattern) {
          const pattern = decision.patterns.find(
            (p) => p.id === 'LP-003' || p.id === 'LP-002'
          );
          expect(pattern).toBeDefined();
        }

        if (tc.expectMatch) {
          const pattern = decision.patterns.find((p) => p.id === 'LP-003');
          expect(pattern?.match).toContain(tc.expectMatch);
          expect(pattern?.severity).toBe('HIGH');
        }
      }
    });
  });

  describe('Pattern: LP-012 - Trivial Assertion Replacement', () => {
    it('should detect trivial assertions across multiple languages as CRITICAL', async () => {
      const testCases = [
        {
          name: 'expect(true).toBe(true)',
          path: 'test/unit/auth/login.test.ts',
          diff: `
- expect(user.email).toBe('test@example.com');
+ expect(true).toBe(true);
          `.trim(),
        },
        {
          name: 'expect(1).toBe(1)',
          path: 'test/unit/calculation.test.ts',
          diff: `
+ expect(1).toBe(1); // Just make it pass
          `.trim(),
        },
        {
          name: 'Python assert(True)',
          path: 'test/unit/test_validation.py',
          diff: `
- assert result.is_valid == True
+ assert(True)
          `.trim(),
        },
      ];

      for (const tc of testCases) {
        const change: FileChange = {
          path: tc.path,
          type: 'modified',
          diff: tc.diff,
          linesAdded: tc.diff.split('\n').filter((l) => l.startsWith('+')).length,
          linesDeleted: tc.diff.split('\n').filter((l) => l.startsWith('-')).length,
        };

        const decision = await hook.analyze([change]);

        expect(decision.block).toBe(true);
        const pattern = decision.patterns.find((p) => p.id === 'LP-012');
        expect(pattern).toBeDefined();
        expect(pattern?.severity).toBe('CRITICAL');
        expect(pattern?.name).toBe('Trivial Assertion Replacement');
      }
    });
  });

  describe('Pattern: LP-005 - Feature Code Commenting', () => {
    it('should detect large code commenting but not small legitimate comments', async () => {
      const testCases = [
        {
          name: 'large code commenting',
          path: 'src/auth/login.ts',
          diff: `
+ // if (user.isAuthenticated) {
+ //   validateSession();
+ //   checkPermissions();
+ //   logAccess();
+ // }
+ // if (!user.email.includes('@')) {
+ //   throw new Error('Invalid email');
+ // }
+ // const sessionToken = generateToken();
+ // await database.saveSession(sessionToken);
+ // return sessionToken;
          `.trim(),
          expectBlock: true,
          expectMatch: '11 lines commented',
        },
        {
          name: 'small legitimate comment',
          path: 'src/utils/format.ts',
          diff: `
+ // TODO: Implement date formatting
  export function formatDate(date: Date): string {
    return date.toISOString();
  }
          `.trim(),
          expectBlock: false,
        },
      ];

      for (const tc of testCases) {
        const change: FileChange = {
          path: tc.path,
          type: 'modified',
          diff: tc.diff,
          linesAdded: tc.diff.split('\n').filter((l) => l.startsWith('+')).length,
          linesDeleted: 0,
        };

        const decision = await hook.analyze([change]);

        if (tc.expectBlock) {
          expect(decision.block).toBe(true);
          const pattern = decision.patterns.find((p) => p.id === 'LP-005');
          expect(pattern).toBeDefined();
          expect(pattern?.severity).toBe('HIGH');
          if (tc.expectMatch) {
            expect(pattern?.match).toContain(tc.expectMatch);
          }
        } else {
          const pattern = decision.patterns.find((p) => p.id === 'LP-005');
          expect(pattern).toBeUndefined();
        }
      }
    });
  });

  describe('Pattern: LP-006 - Validation Removal', () => {
    it('should detect validation removal patterns as CRITICAL', async () => {
      const testCases = [
        {
          name: 'input validation removal',
          path: 'src/api/users.ts',
          diff: `
- if (!email.includes('@')) {
-   throw new Error('Invalid email format');
- }
  await createUser(email);
          `.trim(),
        },
        {
          name: 'validate() function removal',
          path: 'src/forms/submit.ts',
          diff: `
- validate(userInput, schema);
  await submitForm(userInput);
          `.trim(),
        },
        {
          name: 'sanitize() removal',
          path: 'src/database/query.ts',
          diff: `
- const cleanInput = sanitize(userInput);
- await db.query(cleanInput);
+ await db.query(userInput);
          `.trim(),
        },
      ];

      for (const tc of testCases) {
        const change: FileChange = {
          path: tc.path,
          type: 'modified',
          diff: tc.diff,
          linesAdded: tc.diff.split('\n').filter((l) => l.startsWith('+')).length,
          linesDeleted: tc.diff.split('\n').filter((l) => l.startsWith('-')).length,
        };

        const decision = await hook.analyze([change]);

        expect(decision.block).toBe(true);
        const pattern = decision.patterns.find((p) => p.id === 'LP-006');
        expect(pattern).toBeDefined();
        expect(pattern?.severity).toBe('CRITICAL');
      }
    });
  });

  describe('Pattern: LP-015 - Hardcoded Test Bypass', () => {
    it('should detect hardcoded test bypasses as CRITICAL', async () => {
      const testCases = [
        {
          name: 'test@example.com bypass',
          path: 'src/auth/authenticate.ts',
          diff: `
  async function authenticateUser(email: string, password: string) {
+   // Quick fix for CI
+   if (email === 'test@example.com') {
+     return { id: '123', email, role: 'user' };
+   }
    const user = await db.users.findByEmail(email);
          `.trim(),
        },
        {
          name: 'NODE_ENV test bypass',
          path: 'src/config/settings.ts',
          diff: `
+ if (process.env.NODE_ENV === 'test') {
+   return mockConfig;
+ }
          `.trim(),
        },
      ];

      for (const tc of testCases) {
        const change: FileChange = {
          path: tc.path,
          type: 'modified',
          diff: tc.diff,
          linesAdded: tc.diff.split('\n').filter((l) => l.startsWith('+')).length,
          linesDeleted: tc.diff.split('\n').filter((l) => l.startsWith('-')).length,
        };

        const decision = await hook.analyze([change]);

        expect(decision.block).toBe(true);
        const pattern = decision.patterns.find((p) => p.id === 'LP-015');
        expect(pattern).toBeDefined();
        expect(pattern?.severity).toBe('CRITICAL');
        expect(pattern?.name).toBe('Hardcoded Test Bypass');
      }
    });
  });

  describe('Pattern: LP-016 - Error Suppression', () => {
    it('should detect error suppression patterns as HIGH severity', async () => {
      const testCases = [
        {
          name: 'empty catch block',
          path: 'src/auth/login.ts',
          diff: `
+ try {
+   validatePassword(password);
+ } catch (error) { /* ignore */ }
          `.trim(),
        },
        {
          name: 'catch with ignore comment',
          path: 'src/database/connect.ts',
          diff: `
+ } catch (error) { // ignore connection errors
+   return null;
+ }
          `.trim(),
        },
      ];

      for (const tc of testCases) {
        const change: FileChange = {
          path: tc.path,
          type: 'modified',
          diff: tc.diff,
          linesAdded: tc.diff.split('\n').filter((l) => l.startsWith('+')).length,
          linesDeleted: 0,
        };

        const decision = await hook.analyze([change]);

        expect(decision.block).toBe(true);
        const pattern = decision.patterns.find((p) => p.id === 'LP-016');
        expect(pattern).toBeDefined();
        expect(pattern?.severity).toBe('HIGH');
      }
    });
  });

  describe('Pattern: LP-008 - Feature Flag Disabling', () => {
    it('should detect feature flag disabling in various formats as HIGH severity', async () => {
      const testCases = [
        {
          name: 'JSON feature flag',
          path: 'config/features.json',
          diff: `
- "authentication": true,
+ "authentication": false,
          `.trim(),
        },
        {
          name: 'YAML feature flag',
          path: 'config/features.yaml',
          diff: `
- newDashboard: true
+ newDashboard: false
          `.trim(),
        },
      ];

      for (const tc of testCases) {
        const change: FileChange = {
          path: tc.path,
          type: 'modified',
          diff: tc.diff,
          linesAdded: 1,
          linesDeleted: 1,
        };

        const decision = await hook.analyze([change]);

        expect(decision.block).toBe(true);
        const pattern = decision.patterns.find((p) => p.id === 'LP-008');
        expect(pattern).toBeDefined();
        expect(pattern?.severity).toBe('HIGH');
        expect(pattern?.name).toBe('Feature Flag Disabling');
      }
    });
  });

  describe('Compound Avoidance Detection', () => {
    it('should detect multiple patterns and escalate severity', async () => {
      const changes: FileChange[] = [
        {
          path: 'src/auth/login.ts',
          type: 'modified',
          diff: `
+ if (email === 'test@example.com') {
+   return { id: '123', email, role: 'user' };
+ }
- if (!user) {
-   throw new Error('User not found');
- }
+ if (!user) return null;
          `.trim(),
          linesAdded: 4,
          linesDeleted: 3,
        },
        {
          path: 'test/unit/auth/login.test.ts',
          type: 'modified',
          diff: `
- expect(user.email).toBe('test@example.com');
+ expect(true).toBe(true);
- it('should reject invalid password', async () => {
-   await expect(authenticate('test@example.com', 'wrong'))
-     .rejects.toThrow();
- });
          `.trim(),
          linesAdded: 1,
          linesDeleted: 5,
        },
      ];

      const decision = await hook.analyze(changes);

      expect(decision.block).toBe(true);
      expect(decision.patterns.length).toBeGreaterThan(1);
      expect(decision.reason).toContain('CRITICAL');

      // Should detect multiple patterns
      const patternIds = decision.patterns.map((p) => p.id);
      expect(patternIds).toContain('LP-015'); // Hardcoded bypass
      expect(patternIds).toContain('LP-012'); // Trivial assertion
    });
  });

  describe('False Positive Prevention', () => {
    it('should not flag legitimate code changes', async () => {
      const testCases = [
        {
          name: 'test file addition',
          change: {
            path: 'test/unit/new-feature.test.ts',
            type: 'added' as const,
            diff: `
+ describe('new feature', () => {
+   it('should work correctly', () => {
+     expect(newFeature()).toBe(true);
+   });
+ });
            `.trim(),
            linesAdded: 5,
            linesDeleted: 0,
          },
          expectNoCriticalOrHigh: true,
        },
        {
          name: 'proper refactoring',
          change: {
            path: 'src/utils/formatter.ts',
            type: 'modified' as const,
            diff: `
- function formatDate(date) {
-   return date.toISOString();
- }
+ const formatDate = (date: Date): string => {
+   return date.toISOString();
+ };
            `.trim(),
            linesAdded: 3,
            linesDeleted: 3,
          },
          expectNoBlock: true,
        },
        {
          name: 'documentation comments',
          change: {
            path: 'src/api/users.ts',
            type: 'modified' as const,
            diff: `
+ // This function creates a new user in the database
+ // Parameters: email, password, name
+ // Returns: User object or throws error
  export async function createUser(email: string, password: string) {
            `.trim(),
            linesAdded: 3,
            linesDeleted: 0,
          },
          expectNoLP005: true,
        },
      ];

      for (const tc of testCases) {
        const decision = await hook.analyze([tc.change]);

        if (tc.expectNoCriticalOrHigh) {
          const criticalOrHigh = decision.patterns.filter(
            (p) => p.severity === 'CRITICAL' || p.severity === 'HIGH'
          );
          expect(criticalOrHigh).toHaveLength(0);
        }

        if (tc.expectNoBlock) {
          expect(decision.block).toBe(false);
        }

        if (tc.expectNoLP005) {
          const commentingPattern = decision.patterns.find((p) => p.id === 'LP-005');
          expect(commentingPattern).toBeUndefined();
        }
      }
    });
  });

  describe('Decision Logic', () => {
    it('should block on CRITICAL patterns and multiple HIGH patterns', async () => {
      const testCases = [
        {
          name: 'single CRITICAL pattern',
          changes: [
            {
              path: 'test/unit/auth.test.ts',
              type: 'deleted' as const,
              diff: '- all test content'.repeat(20),
              linesAdded: 0,
              linesDeleted: 20,
            },
          ],
          expectBlock: true,
          expectRecovery: 'FIX_ROOT_CAUSE',
        },
        {
          name: 'multiple HIGH patterns',
          changes: [
            {
              path: 'test/unit/test1.test.ts',
              type: 'modified' as const,
              diff: '+ it.skip(...)',
              linesAdded: 1,
              linesDeleted: 0,
            },
            {
              path: 'test/unit/test2.test.ts',
              type: 'modified' as const,
              diff: '+ it.skip(...)',
              linesAdded: 1,
              linesDeleted: 0,
            },
            {
              path: 'test/unit/test3.test.ts',
              type: 'modified' as const,
              diff: '+ it.skip(...)',
              linesAdded: 1,
              linesDeleted: 0,
            },
          ],
          expectBlock: true,
          expectRecoveryContains: 'FIX_ALL_ISSUES',
        },
      ];

      for (const tc of testCases) {
        const decision = await hook.analyze(tc.changes);

        expect(decision.block).toBe(tc.expectBlock);
        if (tc.expectRecovery) {
          expect(decision.recovery).toBe(tc.expectRecovery);
        }
        if (tc.expectRecoveryContains) {
          expect(decision.recovery).toContain(tc.expectRecoveryContains);
        }
      }
    });

    it('should warn on MEDIUM patterns and log LOW patterns without blocking', async () => {
      const testCases = [
        {
          name: 'MEDIUM patterns',
          change: {
            path: 'src/utils.ts',
            type: 'modified' as const,
            diff: `
+ // TODO: Implement this feature
+ // FIXME: Handle edge case
+ // TODO: Add validation
+ // TODO: Optimize performance
            `.trim(),
            linesAdded: 4,
            linesDeleted: 0,
          },
          expectBlock: false,
          expectWarn: true,
        },
        {
          name: 'LOW patterns',
          change: {
            path: 'test/unit/utils.test.ts',
            type: 'modified' as const,
            diff: `
- it('should validate format', () => {
+ it.skip('should validate format', () => {  // Platform-specific
    // Single test disabled with clear reason
  });
            `.trim(),
            linesAdded: 1,
            linesDeleted: 1,
          },
          expectBlock: false,
          expectLog: true,
        },
      ];

      for (const tc of testCases) {
        const decision = await hook.analyze([tc.change]);

        expect(decision.block).toBe(tc.expectBlock);
        if (tc.expectWarn) {
          expect(decision.warn).toBe(true);
        }
        if (tc.expectLog) {
          expect(decision.log).toBe(true);
        }
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty changes, no diff content, and large diffs efficiently', async () => {
      const testCases = [
        {
          name: 'empty changes',
          changes: [],
          expectBlock: false,
          expectPatternsCount: 0,
          expectReasonContains: 'No avoidance patterns detected',
        },
        {
          name: 'no diff content',
          changes: [
            {
              path: 'src/empty.ts',
              type: 'modified' as const,
              diff: '',
              linesAdded: 0,
              linesDeleted: 0,
            },
          ],
          expectBlock: false,
        },
        {
          name: 'large diff',
          changes: [
            {
              path: 'src/large-file.ts',
              type: 'modified' as const,
              diff: Array(1000).fill('+ new line').join('\n'),
              linesAdded: 1000,
              linesDeleted: 0,
            },
          ],
          expectPerformance: true,
        },
      ];

      for (const tc of testCases) {
        const start = Date.now();
        const decision = await hook.analyze(tc.changes);
        const duration = Date.now() - start;

        expect(decision.block).toBe(tc.expectBlock ?? false);

        if (tc.expectPatternsCount !== undefined) {
          expect(decision.patterns).toHaveLength(tc.expectPatternsCount);
        }

        if (tc.expectReasonContains) {
          expect(decision.reason).toContain(tc.expectReasonContains);
        }

        if (tc.expectPerformance) {
          // Should complete within reasonable time (< 1 second)
          expect(duration).toBeLessThan(1000);
          expect(decision).toBeDefined();
        }
      }
    });
  });
});
