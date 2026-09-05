import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { createDefaultMcpClient } from "../../src/storage/backends/fortemi.js";
import {
  qualifyFortemiDatasetLivePreflight,
  writeFortemiDatasetLiveReceipt,
} from "../../src/dataset/fortemi-live-qualification.js";

async function main(): Promise<void> {
  const url = process.env.AIWG_FORTEMI_LIVE_URL;
  if (!url) throw new Error("CONFORMANCE_LIVE_AUTHORIZATION_REQUIRED");
  if (process.env.AIWG_FORTEMI_LIVE_ALLOW_WRITE)
    throw new Error("CONFORMANCE_FORTEMI_DATASET_WRITE_UNSUPPORTED");
  const configuredTimeout = Number(
    process.env.AIWG_FORTEMI_LIVE_TIMEOUT_MS ?? 5_000,
  );
  if (!Number.isFinite(configuredTimeout))
    throw new Error("CONFORMANCE_INVALID_RESOURCE_BOUND");
  const timeoutMs = Math.max(
    250,
    Math.min(Math.trunc(configuredTimeout), 30_000),
  );
  const tokenEnv = process.env.AIWG_FORTEMI_LIVE_TOKEN
    ? "AIWG_FORTEMI_LIVE_TOKEN"
    : undefined;
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
    aiwgCommit: execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim(),
    maxDurationMs: timeoutMs,
  });
  const evidenceDirectory = process.env.AIWG_DATASET_EVIDENCE_DIR;
  if (evidenceDirectory)
    await writeFortemiDatasetLiveReceipt(
      join(
        evidenceDirectory,
        `fortemi-dataset-${receipt.receiptDigest.slice(7)}.json`,
      ),
      receipt,
    );
  process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
  if (receipt.outcome !== "supported") process.exitCode = 2;
}

try {
  await main();
} catch (error) {
  const message = error instanceof Error ? error.message : "";
  const diagnostic = /^CONFORMANCE_[A-Z0-9_,]+$/u.test(message)
    ? message
    : "CONFORMANCE_FORTEMI_DATASET_PREFLIGHT_FAILED";
  process.stderr.write(`${JSON.stringify({ outcome: "error", diagnostic })}\n`);
  process.exitCode = 1;
}
