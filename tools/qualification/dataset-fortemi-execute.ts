import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { FortemiDatasetExecutionClient, fortemiDatasetRequestDigest } from "../../src/dataset/fortemi-dataset-execution.js";
import { canonicalFortemiDatasetJson, verifyFortemiDatasetRunReceipt } from "../../src/dataset/fortemi-run-receipt.js";

async function main(): Promise<void> {
  const requestPath = process.env.AIWG_DATASET_REQUEST_FILE;
  const mcpRoot = process.env.AIWG_FORTEMI_MCP_ROOT;
  const apiUrl = process.env.AIWG_FORTEMI_LIVE_URL;
  if (!requestPath || !mcpRoot || !apiUrl) throw new Error("CONFORMANCE_DATASET_CONFIGURATION_REQUIRED");
  const request = JSON.parse(await readFile(requestPath, "utf8")) as Record<string, unknown>;
  const mutate = process.argv.includes("--execute");
  const digest = fortemiDatasetRequestDigest(request);
  if (mutate && (process.env.AIWG_FORTEMI_LIVE_ALLOW_WRITE !== "true" || process.env.AIWG_DATASET_APPROVED_DIGEST !== digest)) throw new Error("CONFORMANCE_LIVE_AUTHORIZATION_REQUIRED");
  const evidence = process.env.AIWG_DATASET_EVIDENCE_DIR;
  if (mutate && !evidence) throw new Error("CONFORMANCE_DATASET_EVIDENCE_REQUIRED");

  async function connect(): Promise<{ sdk: Client; client: FortemiDatasetExecutionClient }> {
    const sdk = new Client({ name: "aiwg-dataset-qualification", version: "1.0.1" });
    const env: Record<string, string> = {
      PATH: process.env.PATH || "", MCP_TRANSPORT: "stdio", MCP_TOOL_MODE: "core", FORTEMI_URL: apiUrl!,
    };
    if (process.env.AIWG_FORTEMI_LIVE_TOKEN) env.FORTEMI_API_KEY = process.env.AIWG_FORTEMI_LIVE_TOKEN;
    await sdk.connect(new StdioClientTransport({ command: process.execPath, args: [join(resolve(mcpRoot!), "index.js")], cwd: resolve(mcpRoot!), env, stderr: "ignore" }));
    return { sdk, client: new FortemiDatasetExecutionClient({ callTool: (name, args) => sdk.callTool({ name, arguments: args }) }) };
  }

  let connection = await connect();
  try {
    const preview = await connection.client.preview(request);
    if (!mutate) {
      process.stdout.write(`${JSON.stringify({ accepted: preview.accepted, requestDigest: preview.requestDigest, diagnostics: preview.diagnostics }, null, 2)}\n`);
      if (preview.accepted !== true) process.exitCode = 2;
      return;
    }
    const receipt = await connection.client.execute(request, digest);
    if (!["committed", "degraded"].includes(receipt.state)) throw new Error("CONFORMANCE_DATASET_EXECUTION_UNRESOLVED");
    await mkdir(evidence!, { recursive: true, mode: 0o700 });
    const prefix = join(evidence!, `dataset-${receipt.runId}`);
    await writeFile(`${prefix}.receipt.json`, `${JSON.stringify(receipt, null, 2)}\n`, { flag: "wx", mode: 0o600 });
    const replay = await connection.client.execute(request, digest);
    if (canonicalFortemiDatasetJson(replay) !== canonicalFortemiDatasetJson(receipt)) throw new Error("CONFORMANCE_DATASET_REPLAY_MISMATCH");
    await connection.client.checkpoint(receipt.runId);
    const resumed = await connection.client.retry(receipt.runId, "resume");
    if (resumed.receiptDigest !== receipt.receiptDigest) throw new Error("CONFORMANCE_DATASET_RESUME_MISMATCH");
    // A fresh MCP process must recover the same receipt from the storage journal.
    await connection.sdk.close();
    connection = await connect();
    const recovered = await connection.client.execute(request, digest);
    if (canonicalFortemiDatasetJson(recovered) !== canonicalFortemiDatasetJson(receipt)) throw new Error("CONFORMANCE_DATASET_DURABLE_REPLAY_MISMATCH");
    const archive = await connection.client.archive(receipt.runId);
    const archivedAgain = await connection.client.archive(receipt.runId);
    if (archive.complete !== true || canonicalFortemiDatasetJson(archive) !== canonicalFortemiDatasetJson(archivedAgain)) throw new Error("CONFORMANCE_DATASET_ARCHIVE_INCOMPLETE");
    const report = { contract: "aiwg.fortemi-dataset-execution-qualification/v1", requestDigest: digest, receiptDigest: receipt.receiptDigest,
      namespaceId: receipt.namespaceId, runId: receipt.runId, independentVerification: verifyFortemiDatasetRunReceipt(receipt),
      replay: true, resumed: true, durableReplay: true, archive, profile: "live-remote-persistence", maturity: "alpha" };
    await writeFile(`${prefix}.qualification.json`, `${JSON.stringify(report, null, 2)}\n`, { flag: "wx", mode: 0o600 });
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } finally {
    await connection.sdk.close();
  }
}

main().catch(error => {
  const code = error instanceof Error && /^CONFORMANCE_[A-Z0-9_]+$/.test(error.message) ? error.message : "CONFORMANCE_DATASET_QUALIFICATION_FAILED";
  process.stderr.write(`${JSON.stringify({ outcome: "failed", diagnostic: code })}\n`);
  process.exitCode = 1;
});
