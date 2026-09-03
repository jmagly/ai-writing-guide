import { randomUUID } from "node:crypto";
import { FortemiAdapter, type McpClientLike } from "./backends/fortemi.js";

export const FORTEMI_QUALIFICATION_VERSION =
  "aiwg.fortemi-live-qualification/v1" as const;
export interface FortemiQualificationReport {
  schema: typeof FORTEMI_QUALIFICATION_VERSION;
  compatible: boolean;
  mutationAttempted: boolean;
  server: { name?: string; version?: string; contractRevision?: string };
  namespace: string;
  operations: Array<{
    operation: string;
    tool: string;
    compatible: boolean;
    code: string;
    detail: string;
  }>;
}

const EXPECTED: Record<
  string,
  { tool: string; required: string[]; properties: string[] }
> = {
  read: { tool: "get_note", required: ["note_id"], properties: ["note_id"] },
  write: {
    tool: "capture_knowledge",
    required: ["note_id", "content"],
    properties: ["note_id", "content"],
  },
  update: {
    tool: "update_note",
    required: ["note_id"],
    properties: ["note_id", "content", "archived"],
  },
  list: { tool: "list_notes", required: [], properties: ["id_prefix"] },
  query: {
    tool: "search",
    required: ["query"],
    properties: ["query", "id_prefix"],
  },
};

function bounded<T>(
  work: Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<T> {
  let timer: NodeJS.Timeout;
  return Promise.race([
    work,
    new Promise<never>((_, reject) => {
      timer = setTimeout(
        () =>
          reject(
            new Error(`FORTEMI_LIVE_TIMEOUT: ${label} exceeded ${timeoutMs}ms`),
          ),
        timeoutMs,
      );
    }),
  ]).finally(() => clearTimeout(timer!));
}

/** Schema-first live qualification. No tool operation runs when preflight detects drift. */
export async function qualifyLiveFortemi(
  client: McpClientLike,
  options: {
    timeoutMs?: number;
    allowMutation?: boolean;
    contractRevision?: string;
  } = {},
): Promise<FortemiQualificationReport> {
  const timeoutMs = Math.max(250, Math.min(options.timeoutMs ?? 5_000, 30_000));
  const namespace = `aiwg-qualification-${randomUUID()}`;
  const report: FortemiQualificationReport = {
    schema: FORTEMI_QUALIFICATION_VERSION,
    compatible: false,
    mutationAttempted: false,
    server: {
      ...(client.serverVersion?.() ?? {}),
      ...(options.contractRevision
        ? { contractRevision: options.contractRevision }
        : {}),
    },
    namespace,
    operations: [],
  };
  try {
    if (!client.listTools)
      throw new Error("FORTEMI_TOOL_DISCOVERY_UNAVAILABLE");
    const discovered = await bounded(
      client.listTools(),
      timeoutMs,
      "tools/list",
    );
    const tools = new Map(
      (discovered.tools ?? []).map((tool) => [tool.name, tool]),
    );
    for (const [operation, expected] of Object.entries(EXPECTED)) {
      const tool = tools.get(expected.tool);
      const schema = tool?.inputSchema;
      const properties =
        schema?.properties && typeof schema.properties === "object"
          ? (schema.properties as Record<string, unknown>)
          : {};
      const required = Array.isArray(schema?.required)
        ? schema.required.filter(
            (value): value is string => typeof value === "string",
          )
        : [];
      const missing = expected.properties.filter(
        (name) => !(name in properties),
      );
      const missingRequired = expected.required.filter(
        (name) => !required.includes(name),
      );
      const compatible =
        Boolean(tool && schema) &&
        missing.length === 0 &&
        missingRequired.length === 0;
      report.operations.push({
        operation,
        tool: expected.tool,
        compatible,
        code: compatible
          ? "FORTEMI_TOOL_SCHEMA_COMPATIBLE"
          : tool
            ? "FORTEMI_TOOL_SCHEMA_DRIFT"
            : "FORTEMI_TOOL_MISSING",
        detail: compatible
          ? "expected adapter arguments are accepted"
          : `missing properties: ${missing.join(", ") || "none"}; not required: ${missingRequired.join(", ") || "none"}`,
      });
    }
    report.compatible = report.operations.every((item) => item.compatible);
    if (!report.compatible) return report;
    const adapter = new FortemiAdapter({
      subsystem: namespace,
      config: { type: "fortemi", mcpServer: "live-qualification" },
      clientFactory: async () => client,
    });
    await bounded(adapter.init(), timeoutMs, "adapter init");
    await bounded(adapter.read(randomUUID()), timeoutMs, "adapter read");
    await bounded(adapter.list(""), timeoutMs, "adapter list");
    await bounded(
      adapter.query(`aiwg qualification ${namespace}`),
      timeoutMs,
      "adapter query",
    );
    if (options.allowMutation) {
      report.mutationAttempted = true;
      await bounded(
        adapter.write(randomUUID(), `AIWG live qualification ${namespace}`, {
          contentType: "text/plain",
        }),
        timeoutMs,
        "adapter write",
      );
    }
    return report;
  } finally {
    await client.close?.();
  }
}
