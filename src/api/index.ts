/**
 * Supported programmatic entry points for the installed AIWG package.
 *
 * `run()` dispatches through the same router used by `bin/aiwg.mjs`. Resource
 * helpers expose the signed web-release contract without requiring callers to
 * import private `dist/` paths.
 */
export { run } from '../cli/router.js';
export * from '../resources/index.js';
export * from '../sessions/index.js';
export * from '../security/threat-assessment-config.js';
