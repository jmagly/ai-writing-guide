import { describe, expect, it } from 'vitest';
import { applyOutputModes, resolveOutputModes, validateOutputModeProfile } from '../../../src/api/index.js';

describe('output-mode public API', () => {
  it('exports registry validation, resolution, and runtime application', () => {
    expect(typeof validateOutputModeProfile).toBe('function');
    expect(typeof resolveOutputModes).toBe('function');
    expect(typeof applyOutputModes).toBe('function');
  });
});
