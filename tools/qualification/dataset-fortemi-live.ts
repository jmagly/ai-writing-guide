import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { createDefaultMcpClient } from "../../src/storage/backends/fortemi.js";
import {
  qualifyFortemiDatasetLivePreflight,
  writeFortemiDatasetLiveReceipt,
} from "../../src/dataset/fortemi-live-qualification.js";

const url = process.env.AIWG_FORTEMI_LIVE_URL;
if (!url) throw new Error("CONFORMANCE_LIVE_AUTHORIZATION_REQUIRED: set AIWG_FORTEMI_LIVE_URL for read-only discovery");
if (process.env.AIWG_FORTEMI_LIVE_ALLOW_WRITE === "1") {
  throw new Error("CONFORMANCE_FORTEMI_DATASET_WRITE_UNSUPPORTED: preflight never authorizes mutation");
}
const timeoutMs = Math.max(250, Math.min(Number(process.env.AIWG_FORTEMI_LIVE_TIMEOUT_MS ?? 5_000), 30_000));
const tokenEnv = process.env.AIWG_FORTEMI_LIVE_TOKEN ? "AIWG_FORTEMI_LIVE_TOKEN" : undefined;
const client = await createDefaultMcpClient("fortemi-dataset-live", {
  get: async () => ({
    name: "fortemi-dataset-live",
    type: "http",
    url,
    ...(tokenEnv ? { headerEnv: { Authorization: tokenEnv } } : {}),
  }),
});
const receipt = await qualifyFortemiDatasetLivePreflight({
  client,
  endpointUrl: url,
  aiwgCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  maxDurationMs: timeoutMs,
});
const evidenceDirectory = process.env.AIWG_DATASET_EVIDENCE_DIR;
if (evidenceDirectory) {
  await writeFortemiDatasetLiveReceipt(
    join(evidenceDirectory, `fortemi-dataset-${receipt.receiptDigest.slice(7)}.json`),
    receipt,
  );
}
process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
if (receipt.outcome !== "supported") process.exitCode = 2;
