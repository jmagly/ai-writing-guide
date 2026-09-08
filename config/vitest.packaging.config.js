import base from './vitest.config.js';
import { packagingFiles } from './test-lanes.mjs';
export default {
  ...base,
  test: {
    ...base.test,
    include: packagingFiles,
    exclude: ['node_modules/**', 'dist/**'],
    pool: 'forks', maxWorkers: 1, minWorkers: 1, fileParallelism: false,
    globalSetup: ['./test/helpers/base-package-setup.mjs'],
  },
};
