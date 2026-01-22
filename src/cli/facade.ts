/**
 * CLI Facade - Backward-Compatible Router Selector
 *
 * Provides backward-compatible entry point that delegates to either:
 * - Legacy router (src/cli/index.mjs) - current behavior
 * - New router (src/cli/router.ts) - registry-based routing
 *
 * Controlled by AIWG_USE_NEW_ROUTER environment variable or --experimental-router flag.
 * This allows gradual migration and A/B testing of the new routing system.
 *
 * @implements @.aiwg/requirements/use-cases/UC-004-extension-system.md
 * @architecture @.aiwg/architecture/decisions/ADR-001-unified-extension-system.md
 * @tests @test/unit/cli/facade.test.ts
 * @issue #33
 */

import { run as legacyRun } from './index.mjs';
import { run as newRun } from './router.js';

/**
 * Check if new router should be used
 *
 * Priority order:
 * 1. --legacy-router flag → force legacy
 * 2. --experimental-router flag → force new
 * 3. AIWG_USE_NEW_ROUTER=false → force legacy
 * 4. AIWG_USE_NEW_ROUTER=true → force new
 * 5. Default → legacy (backward compatibility)
 *
 * @param args - Command line arguments
 * @returns true if new router should be used
 *
 * @example
 * ```typescript
 * // Via environment variable
 * process.env.AIWG_USE_NEW_ROUTER = 'true';
 * shouldUseNewRouter([]); // → true
 *
 * // Via CLI flag
 * shouldUseNewRouter(['--experimental-router']); // → true
 * shouldUseNewRouter(['--legacy-router']); // → false
 *
 * // Default (backward compatible)
 * shouldUseNewRouter([]); // → false
 * ```
 */
export function shouldUseNewRouter(args: string[]): boolean {
  // Check CLI flags first (highest priority)
  if (args.includes('--legacy-router')) return false;
  if (args.includes('--experimental-router')) return true;

  // Check environment variable
  const envValue = process.env.AIWG_USE_NEW_ROUTER;
  if (envValue === 'false') return false;
  if (envValue === 'true') return true;

  // Default to legacy for backward compatibility
  return false;
}

/**
 * Remove router selection flags from args
 *
 * Strips --experimental-router and --legacy-router flags so they don't
 * interfere with command argument parsing.
 *
 * @param args - Command line arguments
 * @returns Arguments with router flags removed
 *
 * @example
 * ```typescript
 * cleanArgs(['use', 'sdlc', '--experimental-router']);
 * // → ['use', 'sdlc']
 *
 * cleanArgs(['--help', '--legacy-router']);
 * // → ['--help']
 * ```
 */
export function cleanArgs(args: string[]): string[] {
  return args.filter(
    (arg) => arg !== '--experimental-router' && arg !== '--legacy-router'
  );
}

/**
 * Main entry point - delegates to appropriate router
 *
 * Determines which router to use and delegates execution. This allows
 * gradual migration from the monolithic router to the registry-based router
 * without breaking existing functionality.
 *
 * @param args - Command line arguments
 * @param options - Execution options
 *
 * @example
 * ```typescript
 * // Use legacy router (default)
 * await run(['use', 'sdlc']);
 *
 * // Force new router
 * await run(['use', 'sdlc', '--experimental-router']);
 *
 * // Use new router via environment
 * process.env.AIWG_USE_NEW_ROUTER = 'true';
 * await run(['use', 'sdlc']);
 * ```
 */
export async function run(
  args: string[],
  options?: { cwd?: string }
): Promise<void> {
  const useNew = shouldUseNewRouter(args);
  const cleanedArgs = cleanArgs(args);

  if (useNew) {
    await newRun(cleanedArgs, options);
  } else {
    await legacyRun(cleanedArgs, options);
  }
}

// Re-export both routers for direct access
export { legacyRun, newRun };
