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
    it('should detect complete test file deletion as CRITICAL', async () => {
      const change: FileChange = {
        path: 'test/unit/auth/validate.test.ts',
        type: 'deleted',
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
      };

      const decision = await hook.analyze([change]);

      expect(decision.block).toBe(true);
      expect(decision.patterns).toHaveLength(1);
      expect(decision.patterns[0].id).toBe('LP-001');
      expect(decision.patterns[0].severity).toBe('CRITICAL');
      expect(decision.patterns[0].name).toBe('Complete Test File Deletion');
      expect(decision.reason).toContain('CRITICAL avoidance patterns');
    });

    it('should not flag partial test file modifications', async () => {
      const change: FileChange = {
        path: 'test/unit/auth/validate.test.ts',
        type: 'modified',
        diff: `
- it('old test', () => {
+ it('new test', () => {
    expect(validate()).toBe(true);
  });
        `.trim(),
        linesAdded: 1,
        linesDeleted: 1,
      };

      const decision = await hook.analyze([change]);

      const deletionPattern = decision.patterns.find((p) => p.id === 'LP-001');
      expect(deletionPattern).toBeUndefined();
    });
  });

  describe('Pattern: LP-002 - Test Suite Disabling', () => {
    it('should detect describe.skip() as HIGH severity', async () => {
      const change: FileChange = {
        path: 'test/integration/api/users.test.ts',
        type: 'modified',
        diff: `
- describe('POST /api/users', () => {
+ describe.skip('POST /api/users', () => {
    it('should create user', async () => {
      // ...
    });
  });
        `.trim(),
        linesAdded: 1,
        linesDeleted: 1,
      };

      const decision = await hook.analyze([change]);

      expect(decision.block).toBe(true);
      const pattern = decision.patterns.find((p) => p.id === 'LP-002');
      expect(pattern).toBeDefined();
      expect(pattern?.severity).toBe('HIGH');
      expect(pattern?.name).toBe('Test Suite Disabling');
    });

    it('should detect @Ignore annotation', async () => {
      const change: FileChange = {
        path: 'test/integration/AuthTest.java',
        type: 'modified',
        diff: `
+ @Ignore
  public class AuthTest {
    // ...
  }
        `.trim(),
        linesAdded: 1,
        linesDeleted: 0,
      };

      const decision = await hook.analyze([change]);

      const pattern = decision.patterns.find((p) => p.id === 'LP-002');
      expect(pattern).toBeDefined();
    });
  });

  describe('Pattern: LP-003 - Multiple Individual Test Disabling', () => {
    it('should detect multiple it.skip() as HIGH severity', async () => {
      const change: FileChange = {
        path: 'test/unit/validators.test.ts',
        type: 'modified',
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
        linesAdded: 4,
        linesDeleted: 4,
      };

      const decision = await hook.analyze([change]);

      expect(decision.block).toBe(true);
      const pattern = decision.patterns.find((p) => p.id === 'LP-003');
      expect(pattern).toBeDefined();
      expect(pattern?.severity).toBe('HIGH');
      expect(pattern?.match).toContain('4 tests disabled');
    });

    it('should detect xit() syntax', async () => {
      const change: FileChange = {
        path: 'test/unit/utils.test.ts',
        type: 'modified',
        diff: `
- it('should format date', () => {
+ xit('should format date', () => {
    // ...
  });
        `.trim(),
        linesAdded: 1,
        linesDeleted: 1,
      };

      const decision = await hook.analyze([change]);

      const pattern = decision.patterns.find(
        (p) => p.id === 'LP-003' || p.id === 'LP-002'
      );
      expect(pattern).toBeDefined();
    });
  });

  describe('Pattern: LP-012 - Trivial Assertion Replacement', () => {
    it('should detect expect(true).toBe(true) as CRITICAL', async () => {
      const change: FileChange = {
        path: 'test/unit/auth/login.test.ts',
        type: 'modified',
        diff: `
- expect(user.email).toBe('test@example.com');
+ expect(true).toBe(true);
        `.trim(),
        linesAdded: 1,
        linesDeleted: 1,
      };

      const decision = await hook.analyze([change]);

      expect(decision.block).toBe(true);
      const pattern = decision.patterns.find((p) => p.id === 'LP-012');
      expect(pattern).toBeDefined();
      expect(pattern?.severity).toBe('CRITICAL');
      expect(pattern?.name).toBe('Trivial Assertion Replacement');
    });

    it('should detect expect(1).toBe(1)', async () => {
      const change: FileChange = {
        path: 'test/unit/calculation.test.ts',
        type: 'modified',
        diff: `
+ expect(1).toBe(1); // Just make it pass
        `.trim(),
        linesAdded: 1,
        linesDeleted: 0,
      };

      const decision = await hook.analyze([change]);

      const pattern = decision.patterns.find((p) => p.id === 'LP-012');
      expect(pattern).toBeDefined();
    });

    it('should detect Python assert(True)', async () => {
      const change: FileChange = {
        path: 'test/unit/test_validation.py',
        type: 'modified',
        diff: `
- assert result.is_valid == True
+ assert(True)
        `.trim(),
        linesAdded: 1,
        linesDeleted: 1,
      };

      const decision = await hook.analyze([change]);

      const pattern = decision.patterns.find((p) => p.id === 'LP-012');
      expect(pattern).toBeDefined();
    });
  });

  describe('Pattern: LP-005 - Feature Code Commenting', () => {
    it('should detect large code commenting in source files', async () => {
      const change: FileChange = {
        path: 'src/auth/login.ts',
        type: 'modified',
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
+ // Additional commented code
        `.trim(),
        linesAdded: 11,
        linesDeleted: 0,
      };

      const decision = await hook.analyze([change]);

      expect(decision.block).toBe(true);
      const pattern = decision.patterns.find((p) => p.id === 'LP-005');
      expect(pattern).toBeDefined();
      expect(pattern?.severity).toBe('HIGH');
      expect(pattern?.match).toContain('11 lines commented');
    });

    it('should not flag small code comments', async () => {
      const change: FileChange = {
        path: 'src/utils/format.ts',
        type: 'modified',
        diff: `
+ // TODO: Implement date formatting
  export function formatDate(date: Date): string {
    return date.toISOString();
  }
        `.trim(),
        linesAdded: 1,
        linesDeleted: 0,
      };

      const decision = await hook.analyze([change]);

      const pattern = decision.patterns.find((p) => p.id === 'LP-005');
      expect(pattern).toBeUndefined();
    });
  });

  describe('Pattern: LP-006 - Validation Removal', () => {
    it('should detect input validation removal as CRITICAL', async () => {
      const change: FileChange = {
        path: 'src/api/users.ts',
        type: 'modified',
        diff: `
- if (!email.includes('@')) {
-   throw new Error('Invalid email format');
- }
  await createUser(email);
        `.trim(),
        linesAdded: 0,
        linesDeleted: 3,
      };

      const decision = await hook.analyze([change]);

      expect(decision.block).toBe(true);
      const pattern = decision.patterns.find((p) => p.id === 'LP-006');
      expect(pattern).toBeDefined();
      expect(pattern?.severity).toBe('CRITICAL');
    });

    it('should detect validate() function removal', async () => {
      const change: FileChange = {
        path: 'src/forms/submit.ts',
        type: 'modified',
        diff: `
- validate(userInput, schema);
  await submitForm(userInput);
        `.trim(),
        linesAdded: 0,
        linesDeleted: 1,
      };

      const decision = await hook.analyze([change]);

      const pattern = decision.patterns.find((p) => p.id === 'LP-006');
      expect(pattern).toBeDefined();
    });

    it('should detect sanitize() removal', async () => {
      const change: FileChange = {
        path: 'src/database/query.ts',
        type: 'modified',
        diff: `
- const cleanInput = sanitize(userInput);
- await db.query(cleanInput);
+ await db.query(userInput);
        `.trim(),
        linesAdded: 1,
        linesDeleted: 2,
      };

      const decision = await hook.analyze([change]);

      const pattern = decision.patterns.find((p) => p.id === 'LP-006');
      expect(pattern).toBeDefined();
    });
  });

  describe('Pattern: LP-015 - Hardcoded Test Bypass', () => {
    it('should detect test@example.com bypass as CRITICAL', async () => {
      const change: FileChange = {
        path: 'src/auth/authenticate.ts',
        type: 'modified',
        diff: `
  async function authenticateUser(email: string, password: string) {
+   // Quick fix for CI
+   if (email === 'test@example.com') {
+     return { id: '123', email, role: 'user' };
+   }
    const user = await db.users.findByEmail(email);
        `.trim(),
        linesAdded: 4,
        linesDeleted: 0,
      };

      const decision = await hook.analyze([change]);

      expect(decision.block).toBe(true);
      const pattern = decision.patterns.find((p) => p.id === 'LP-015');
      expect(pattern).toBeDefined();
      expect(pattern?.severity).toBe('CRITICAL');
      expect(pattern?.name).toBe('Hardcoded Test Bypass');
    });

    it('should detect NODE_ENV test bypass', async () => {
      const change: FileChange = {
        path: 'src/config/settings.ts',
        type: 'modified',
        diff: `
+ if (process.env.NODE_ENV === 'test') {
+   return mockConfig;
+ }
        `.trim(),
        linesAdded: 3,
        linesDeleted: 0,
      };

      const decision = await hook.analyze([change]);

      const pattern = decision.patterns.find((p) => p.id === 'LP-015');
      expect(pattern).toBeDefined();
    });
  });

  describe('Pattern: LP-016 - Error Suppression', () => {
    it('should detect empty catch blocks as HIGH severity', async () => {
      const change: FileChange = {
        path: 'src/auth/login.ts',
        type: 'modified',
        diff: `
+ try {
+   validatePassword(password);
+ } catch (error) { /* ignore */ }
        `.trim(),
        linesAdded: 3,
        linesDeleted: 0,
      };

      const decision = await hook.analyze([change]);

      expect(decision.block).toBe(true);
      const pattern = decision.patterns.find((p) => p.id === 'LP-016');
      expect(pattern).toBeDefined();
      expect(pattern?.severity).toBe('HIGH');
    });

    it('should detect catch with ignore comment', async () => {
      const change: FileChange = {
        path: 'src/database/connect.ts',
        type: 'modified',
        diff: `
+ } catch (error) { // ignore connection errors
+   return null;
+ }
        `.trim(),
        linesAdded: 3,
        linesDeleted: 0,
      };

      const decision = await hook.analyze([change]);

      const pattern = decision.patterns.find((p) => p.id === 'LP-016');
      expect(pattern).toBeDefined();
    });
  });

  describe('Pattern: LP-008 - Feature Flag Disabling', () => {
    it('should detect feature flag true->false as HIGH severity', async () => {
      const change: FileChange = {
        path: 'config/features.json',
        type: 'modified',
        diff: `
- "authentication": true,
+ "authentication": false,
        `.trim(),
        linesAdded: 1,
        linesDeleted: 1,
      };

      const decision = await hook.analyze([change]);

      expect(decision.block).toBe(true);
      const pattern = decision.patterns.find((p) => p.id === 'LP-008');
      expect(pattern).toBeDefined();
      expect(pattern?.severity).toBe('HIGH');
      expect(pattern?.name).toBe('Feature Flag Disabling');
    });

    it('should detect YAML feature flag changes', async () => {
      const change: FileChange = {
        path: 'config/features.yaml',
        type: 'modified',
        diff: `
- newDashboard: true
+ newDashboard: false
        `.trim(),
        linesAdded: 1,
        linesDeleted: 1,
      };

      const decision = await hook.analyze([change]);

      const pattern = decision.patterns.find((p) => p.id === 'LP-008');
      expect(pattern).toBeDefined();
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
    it('should not flag legitimate test file additions', async () => {
      const change: FileChange = {
        path: 'test/unit/new-feature.test.ts',
        type: 'added',
        diff: `
+ describe('new feature', () => {
+   it('should work correctly', () => {
+     expect(newFeature()).toBe(true);
+   });
+ });
        `.trim(),
        linesAdded: 5,
        linesDeleted: 0,
      };

      const decision = await hook.analyze([change]);

      // Should not have CRITICAL/HIGH patterns for additions
      const criticalOrHigh = decision.patterns.filter(
        (p) => p.severity === 'CRITICAL' || p.severity === 'HIGH'
      );
      expect(criticalOrHigh).toHaveLength(0);
    });

    it('should not flag proper refactoring', async () => {
      const change: FileChange = {
        path: 'src/utils/formatter.ts',
        type: 'modified',
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
      };

      const decision = await hook.analyze([change]);

      // Should not block legitimate refactoring
      expect(decision.block).toBe(false);
    });

    it('should not flag documentation comments', async () => {
      const change: FileChange = {
        path: 'src/api/users.ts',
        type: 'modified',
        diff: `
+ // This function creates a new user in the database
+ // Parameters: email, password, name
+ // Returns: User object or throws error
  export async function createUser(email: string, password: string) {
        `.trim(),
        linesAdded: 3,
        linesDeleted: 0,
      };

      const decision = await hook.analyze([change]);

      // Documentation comments should not trigger LP-005
      const commentingPattern = decision.patterns.find((p) => p.id === 'LP-005');
      expect(commentingPattern).toBeUndefined();
    });
  });

  describe('Decision Logic', () => {
    it('should block on CRITICAL patterns', async () => {
      const change: FileChange = {
        path: 'test/unit/auth.test.ts',
        type: 'deleted',
        diff: '- all test content'.repeat(20),
        linesAdded: 0,
        linesDeleted: 20,
      };

      const decision = await hook.analyze([change]);

      expect(decision.block).toBe(true);
      expect(decision.recovery).toBe('FIX_ROOT_CAUSE');
    });

    it('should block on multiple HIGH patterns (compound)', async () => {
      const changes: FileChange[] = [
        {
          path: 'test/unit/test1.test.ts',
          type: 'modified',
          diff: '+ it.skip(...)',
          linesAdded: 1,
          linesDeleted: 0,
        },
        {
          path: 'test/unit/test2.test.ts',
          type: 'modified',
          diff: '+ it.skip(...)',
          linesAdded: 1,
          linesDeleted: 0,
        },
        {
          path: 'test/unit/test3.test.ts',
          type: 'modified',
          diff: '+ it.skip(...)',
          linesAdded: 1,
          linesDeleted: 0,
        },
      ];

      const decision = await hook.analyze(changes);

      // Multiple HIGH patterns should block
      expect(decision.block).toBe(true);
      expect(decision.recovery).toContain('FIX_ALL_ISSUES');
    });

    it('should warn on MEDIUM patterns without blocking', async () => {
      const change: FileChange = {
        path: 'src/utils.ts',
        type: 'modified',
        diff: `
+ // TODO: Implement this feature
+ // FIXME: Handle edge case
+ // TODO: Add validation
+ // TODO: Optimize performance
        `.trim(),
        linesAdded: 4,
        linesDeleted: 0,
      };

      const decision = await hook.analyze([change]);

      // MEDIUM patterns alone should not block
      expect(decision.block).toBe(false);
      expect(decision.warn).toBe(true);
    });

    it('should log LOW patterns without warnings', async () => {
      const change: FileChange = {
        path: 'test/unit/utils.test.ts',
        type: 'modified',
        diff: `
- it('should validate format', () => {
+ it.skip('should validate format', () => {  // Platform-specific
    // Single test disabled with clear reason
  });
        `.trim(),
        linesAdded: 1,
        linesDeleted: 1,
      };

      const decision = await hook.analyze([change]);

      // Single disabled test might be LOW/MEDIUM - should not hard block
      // (actual severity depends on pattern implementation)
      expect(decision.block).toBe(false);
      expect(decision.log).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty changes', async () => {
      const decision = await hook.analyze([]);

      expect(decision.block).toBe(false);
      expect(decision.patterns).toHaveLength(0);
      expect(decision.reason).toContain('No avoidance patterns detected');
    });

    it('should handle changes with no diff content', async () => {
      const change: FileChange = {
        path: 'src/empty.ts',
        type: 'modified',
        diff: '',
        linesAdded: 0,
        linesDeleted: 0,
      };

      const decision = await hook.analyze([change]);

      expect(decision.block).toBe(false);
    });

    it('should handle very large diffs efficiently', async () => {
      const largeDiff = Array(1000)
        .fill('+ new line')
        .join('\n');

      const change: FileChange = {
        path: 'src/large-file.ts',
        type: 'modified',
        diff: largeDiff,
        linesAdded: 1000,
        linesDeleted: 0,
      };

      const start = Date.now();
      const decision = await hook.analyze([change]);
      const duration = Date.now() - start;

      // Should complete within reasonable time (< 1 second)
      expect(duration).toBeLessThan(1000);
      expect(decision).toBeDefined();
    });
  });
});
