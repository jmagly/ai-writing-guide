// Public API for the project-isolation module. Consumers (use.ts) should
// import from here, not from internal files, so the module shape can evolve
// without rippling.

export { maybeWarnProjectIsolation, WARNING_TEXT, GLOBAL_INSTALL_INFO, DEFAULT_DELAY_MS } from './warning.js';
export type { WarningOptions, WarningResult } from './warning.js';
export { detectProjectSignal, isUnsuitableCwd } from './detect.js';
export type { DetectionResult } from './detect.js';
export { PROJECT_SIGNALS, CSPROJ_PATTERN, MAX_PARENT_DEPTH } from './signals.js';
