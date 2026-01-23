/**
 * CLI Entry Point
 *
 * Routes all CLI commands through the registry-based router.
 *
 * @implements @.aiwg/requirements/use-cases/UC-004-extension-system.md
 * @architecture @.aiwg/architecture/decisions/ADR-001-unified-extension-system.md
 * @tests @test/unit/cli/facade.test.ts
 */

// Dynamic import for router (uses tsx loader)
let runFunc = null;
async function getRouter() {
  if (!runFunc) {
    const module = await import('./router-loader.mjs');
    runFunc = module.run;
  }
  return runFunc;
}

/**
 * Main CLI entry point
 *
 * Routes commands through the registry-based router for O(1) lookup
 * and dynamic help generation.
 *
 * @param {string[]} args - Command line arguments
 * @param {object} [options] - Execution options
 * @param {string} [options.cwd] - Working directory
 *
 * @example
 * await run(['use', 'sdlc']);
 * await run(['--help']);
 * await run(['list']);
 */
export async function run(args, options = {}) {
  const router = await getRouter();
  await router(args, options);
}
