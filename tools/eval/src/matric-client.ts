import { createClient } from '@matric/eval-client';

/** Load the optional standard-benchmark client only when those benchmarks are requested. */
export function createMatricClient() {
  return createClient();
}
