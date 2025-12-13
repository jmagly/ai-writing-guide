/**
 * AgentSmith - Agent Generation with Platform-Aware Deployment
 *
 * Generates custom agents following the 10 Golden Rules and deploys them
 * to platform-specific locations with proper format transformations.
 *
 * @module smiths/agentsmith
 */

export * from './types.js';
export * from './generator.js';

// Re-export commonly used types from agents module
export type { Platform as AgentPlatform } from '../../agents/types.js';
