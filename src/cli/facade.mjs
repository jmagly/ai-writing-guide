/**
 * CLI Facade - Backward-Compatible Router Selector
 *
 * Provides backward-compatible entry point that delegates to either:
 * - New router (src/cli/router.ts) - registry-based routing (DEFAULT)
 * - Legacy router (src/cli/index.mjs) - switch/case routing (DEPRECATED)
 *
 * Controlled by AIWG_USE_NEW_ROUTER environment variable or --legacy-router flag.
 * This allows gradual migration and A/B testing of the new routing system.
 *
 * @implements @.aiwg/requirements/use-cases/UC-004-extension-system.md
 * @architecture @.aiwg/architecture/decisions/ADR-001-unified-extension-system.md
 * @tests @test/unit/cli/facade.test.ts
 * @issue #54, #55
 */

import { run as legacyRun } from './index.mjs';

// Dynamic import for new router (uses tsx loader)
let newRunFunc = null;
async function getNewRun() {
  if (!newRunFunc) {
    const module = await import('./router-loader.mjs');
    newRunFunc = module.run;
  }
  return newRunFunc;
}

/**
 * Check if new router should be used
 *
 * Priority order:
 * 1. --legacy-router flag → force legacy
 * 2. --experimental-router flag → force new (for compatibility)
 * 3. AIWG_USE_NEW_ROUTER=false → force legacy
 * 4. AIWG_USE_NEW_ROUTER=true → force new
 * 5. Default → NEW ROUTER (registry-based, issues #54/#55)
 *
 * @param {string[]} args - Command line arguments
 * @returns {boolean} true if new router should be used
 *
 * @example
 * // Via environment variable (override default)
 * process.env.AIWG_USE_NEW_ROUTER = 'false';
 * shouldUseNewRouter([]); // → false
 *
 * // Via CLI flag (force legacy)
 * shouldUseNewRouter(['--legacy-router']); // → false
 * shouldUseNewRouter(['--experimental-router']); // → true
 *
 * // Default (NEW ROUTER)
 * shouldUseNewRouter([]); // → true
 */
export function shouldUseNewRouter(args) {
  // Check CLI flags first (highest priority)
  if (args.includes('--legacy-router')) return false;
  if (args.includes('--experimental-router')) return true; // Keep for backward compat

  // Check environment variable
  const envValue = process.env.AIWG_USE_NEW_ROUTER;
  if (envValue === 'false') return false;
  if (envValue === 'true') return true;

  // Default to NEW ROUTER (registry-based)
  return true;
}

/**
 * Remove router selection flags from args
 *
 * Strips --experimental-router and --legacy-router flags so they don't
 * interfere with command argument parsing.
 *
 * @param {string[]} args - Command line arguments
 * @returns {string[]} Arguments with router flags removed
 *
 * @example
 * cleanArgs(['use', 'sdlc', '--experimental-router']);
 * // → ['use', 'sdlc']
 *
 * cleanArgs(['--help', '--legacy-router']);
 * // → ['--help']
 */
export function cleanArgs(args) {
  return args.filter(
    (arg) => arg !== '--experimental-router' && arg !== '--legacy-router'
  );
}

/**
 * Main entry point - delegates to appropriate router
 *
 * Determines which router to use and delegates execution. As of issue #55,
 * the NEW ROUTER (registry-based) is now the default for all commands.
 *
 * The legacy router (switch/case) is still available via --legacy-router
 * flag for backward compatibility and testing.
 *
 * @param {string[]} args - Command line arguments
 * @param {object} [options] - Execution options
 * @param {string} [options.cwd] - Working directory
 *
 * @example
 * // Use new router (default)
 * await run(['use', 'sdlc']);
 *
 * // Force legacy router
 * await run(['use', 'sdlc', '--legacy-router']);
 *
 * // Override via environment
 * process.env.AIWG_USE_NEW_ROUTER = 'false';
 * await run(['use', 'sdlc']);
 */
export async function run(args, options = {}) {
  const useNew = shouldUseNewRouter(args);
  const cleanedArgs = cleanArgs(args);

  if (useNew) {
    const newRun = await getNewRun();
    await newRun(cleanedArgs, options);
  } else {
    await legacyRun(cleanedArgs, options);
  }
}

// Re-export for direct access
export { legacyRun };

// Re-export new router loader
export async function newRun(args, options) {
  const runFunc = await getNewRun();
  return runFunc(args, options);
}
