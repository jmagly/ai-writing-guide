import { describe, expect, it } from 'vitest';
import { evaluatePreflight } from '../../../tools/scripts/resource-preflight.mjs';

describe('build resource preflight', () => {
  it('skips when the config block is absent', () => {
    const result = evaluatePreflight({}, {
      memory_gb: 1,
      free_disk_gb: 1,
      cpus: 1,
      swap_gb: 0,
    });

    expect(result.enabled).toBe(false);
    expect(result.ok).toBe(true);
  });

  it('checks explicit configured requirements and reports each insufficient resource', () => {
    const result = evaluatePreflight({
      build: {
        resource_preflight: {
          enabled: true,
          mode: 'configured',
          requirements: {
            min_memory_gb: 16,
            min_free_disk_gb: 50,
            min_cpus: 8,
            min_swap_gb: 4,
          },
        },
      },
    }, {
      memory_gb: 8,
      free_disk_gb: 20,
      cpus: 4,
      swap_gb: 0,
    });

    expect(result.ok).toBe(false);
    expect(result.failures.map((failure) => failure.resource)).toEqual([
      'memory',
      'free disk',
      'CPU cores',
      'swap',
    ]);
  });

  it('fills omitted requirements in auto_detect mode', () => {
    const result = evaluatePreflight({
      build: {
        resource_preflight: {
          enabled: true,
          mode: 'auto_detect',
          requirements: {
            min_free_disk_gb: 10,
          },
        },
      },
    }, {
      memory_gb: 16,
      free_disk_gb: 12,
      cpus: 4,
      swap_gb: 0,
    });

    expect(result.ok).toBe(true);
    expect(result.requirements).toMatchObject({
      min_memory_gb: 8,
      min_free_disk_gb: 10,
      min_cpus: 2,
      min_swap_gb: 0,
    });
  });

  it('treats zero thresholds as disabled checks', () => {
    const result = evaluatePreflight({
      build: {
        resource_preflight: {
          enabled: true,
          mode: 'configured',
          requirements: {
            min_swap_gb: 0,
          },
        },
      },
    }, {
      memory_gb: 1,
      free_disk_gb: 1,
      cpus: 1,
    });

    expect(result.ok).toBe(true);
    expect(result.failures).toEqual([]);
  });
});
