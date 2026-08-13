/**
 * JSON report output
 */

import type { EvalReport } from '../models/types.js';
import { legacyIntegrityMetadata } from '../integrity.js';

export function generateJsonReport(report: EvalReport): string {
  const integrity = report.integrity_state ? {} : legacyIntegrityMetadata(report);
  return JSON.stringify({ ...report, ...integrity }, null, 2);
}
