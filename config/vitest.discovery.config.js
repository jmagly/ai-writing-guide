import base from './vitest.config.js';
import { discoveryFiles } from './test-lanes.mjs';
export default {
  ...base,
  test: { ...base.test, include: discoveryFiles, exclude: [], maxWorkers: 1, minWorkers: 1, fileParallelism: false },
};
