import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { syncFortemiCoreIndex } from "../../../src/artifacts/fortemi-core-sync.js";
import type {
  ArtifactIndex,
  DependencyGraph,
  MetadataEntry,
} from "../../../src/artifacts/types.js";
import { main, runResearchQuery } from "../../../src/research/query-cli.js";

function entry(overrides: Partial<MetadataEntry>): MetadataEntry {
  return {
    path: ".aiwg/research/findings/REF-001.md",
    type: "research-ref",
    phase: "research",
    title: "REF-001 Static Retrieval Evaluation",
    name: "REF-001",
    tags: ["retrieval", "grade-high"],
    created: "2026-01-01T00:00:00.000Z",
    updated: "2026-01-02T00:00:00.000Z",
    checksum: "abcdef1234567890",
    summary: "GRADE: High. Static retrieval preserves source selection.",
    dependencies: [],
    dependents: [],
    ...overrides,
  };
}

function writeGraph(root: string, entries: MetadataEntry[]): void {
  const graphDir = path.join(root, ".aiwg", ".index", "project");
  fs.mkdirSync(graphDir, { recursive: true });
  const index: ArtifactIndex = {
    version: "1.0.0",
    builtAt: "2026-01-03T00:00:00.000Z",
    buildTimeMs: 1,
    entries: Object.fromEntries(entries.map((item) => [item.path, item])),
  };
  const graph: DependencyGraph = Object.fromEntries(
    entries.map((item) => [item.path, { upstream: [], downstream: [] }]),
  );
  fs.writeFileSync(path.join(graphDir, "metadata.json"), JSON.stringify(index));
  fs.writeFileSync(
    path.join(graphDir, "dependencies.json"),
    JSON.stringify(graph),
  );

  for (const item of entries) {
    fs.mkdirSync(path.join(root, path.dirname(item.path)), { recursive: true });
    fs.writeFileSync(
      path.join(root, item.path),
      [
        "---",
        `title: ${item.title}`,
        `tags: ${item.tags.join(", ")}`,
        "---",
        `# ${item.title}`,
        "",
        item.summary,
      ].join("\n"),
    );
  }
}

describe("research-query executable source selection", () => {
  let tmp: string;
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "aiwg-research-query-"));
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  function seed(): void {
    writeGraph(tmp, [
      entry({}),
      entry({
        path: ".aiwg/research/profiles/PROF-001.md",
        type: "research-profile",
        title: "PROF-001 Retrieval Authors",
        name: "PROF-001",
        tags: ["retrieval", "profile"],
        summary: "Profile evidence for retrieval authors.",
      }),
      entry({
        path: ".aiwg/research/findings/REF-002.md",
        title: "REF-002 Prompt Injection",
        name: "REF-002",
        tags: ["security", "grade-low"],
        summary: "GRADE: Low. Prompt injection mitigations.",
      }),
      entry({
        path: ".aiwg/requirements/UC-001.md",
        type: "use-case",
        title: "Unrelated Requirement",
        name: "UC-001",
        tags: ["requirements"],
        summary: "Not part of the research corpus.",
      }),
    ]);
  }

  it("selects matching research sources from the local artifact graph", async () => {
    seed();

    const result = await runResearchQuery(tmp, {
      question: "static retrieval source selection",
      depth: "thorough",
      maxSources: 3,
    });

    expect(result.query.backend).toBe("local");
    expect(result.sources.map((source) => source.id)).toEqual([
      "REF-001",
      "PROF-001",
    ]);
    expect(result.sources[0]).toMatchObject({
      grade: "HIGH",
      relevance: "direct",
      path: ".aiwg/research/findings/REF-001.md",
    });
  });

  it("keeps source-selection parity with the Fortemi Core static cache", async () => {
    seed();
    syncFortemiCoreIndex(tmp, {
      graph: "project",
      generatedAt: "2026-01-05T00:00:00.000Z",
    });

    const local = await runResearchQuery(tmp, {
      question: "retrieval source selection",
      depth: "quick",
    });
    const fortemi = await runResearchQuery(tmp, {
      question: "retrieval source selection",
      depth: "quick",
      backend: "fortemi-core",
    });

    expect(fortemi.query.backend).toBe("fortemi-core");
    expect(fortemi.sources.map((source) => source.id)).toEqual(
      local.sources.map((source) => source.id),
    );
  });

  it("fails explicitly when Fortemi Core source selection is requested before sync", async () => {
    seed();

    await expect(
      runResearchQuery(tmp, {
        question: "retrieval source selection",
        depth: "quick",
        backend: "fortemi-core",
      }),
    ).rejects.toThrow("aiwg index sync --backend fortemi-core");
  });

  it("emits JSON and can save a source-selection artifact", async () => {
    seed();

    await main(
      [
        "static retrieval",
        "--sources-only",
        "--json",
        "--save",
        "--max-sources",
        "1",
      ],
      tmp,
    );

    const output = JSON.parse(consoleSpy.mock.calls[0][0] as string);
    expect(output.sources).toHaveLength(1);
    expect(output.savedPath).toMatch(
      /^\.aiwg\/research\/synthesis\/query-static-retrieval-\d{4}-\d{2}-\d{2}\.md$/,
    );
    expect(fs.existsSync(path.join(tmp, output.savedPath))).toBe(true);
  });

  it("rejects missing value-bearing flags before they can alter the question", async () => {
    seed();
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });

    try {
      await expect(
        main(["retrieval", "--backend", "--json"], tmp),
      ).rejects.toThrow("process.exit");
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "--backend must be local or fortemi-core",
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
      consoleErrorSpy.mockClear();
      exitSpy.mockClear();

      await expect(
        main(["retrieval", "--depth", "--json"], tmp),
      ).rejects.toThrow("process.exit");
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "--depth must be quick or thorough",
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
      consoleErrorSpy.mockClear();
      exitSpy.mockClear();

      await expect(
        main(["retrieval", "--graph", "--json"], tmp),
      ).rejects.toThrow("process.exit");
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "--graph requires a graph name",
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
      consoleErrorSpy.mockClear();
      exitSpy.mockClear();

      await expect(
        main(["retrieval", "--max-sources", "0", "--json"], tmp),
      ).rejects.toThrow("process.exit");
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "--max-sources must be a positive integer",
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    } finally {
      exitSpy.mockRestore();
    }
  });
});
