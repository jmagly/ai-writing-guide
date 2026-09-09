import base from './vitest.config.js';
import { artifactIndexFiles } from './test-lanes.mjs';

export default {
  ...base,
  test: {
    ...base.test,
    include: artifactIndexFiles,
    exclude: ['node_modules/**', 'dist/**'],
    pool: 'forks',
    maxWorkers: 1,
    minWorkers: 1,
    fileParallelism: false,
  },
};
