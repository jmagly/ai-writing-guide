import type { DatasetResult } from "./orchestration-types.js";
export function presentDatasetResult(
  result: DatasetResult,
  json = false,
): string {
  if (json) return JSON.stringify(result, null, 2) + "\n";
  if (!result.ok)
    return `${result.action} failed: ${result.diagnostics.map((v) => `${v.code}: ${v.message}`).join("; ")}\n`;
  return `${result.action} succeeded${result.backend ? ` via ${result.backend}` : ""}${result.degraded?.length ? ` (degraded: ${result.degraded.join(", ")})` : ""}\n${JSON.stringify(result.data, null, 2)}\n`;
}
